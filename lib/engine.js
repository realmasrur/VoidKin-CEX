import { ObjectId } from "mongodb";
import { r8 } from "./ledger";
const FEE = 0.001;
let ix;
export const ensureIdx = (d) => (ix ||= Promise.all([d.collection("orders").createIndex({ s: 1, side: 1, status: 1, price: 1, at: 1 }), d.collection("orders").createIndex({ user: 1, status: 1, at: -1 })]));
const rec = (d, se, asset, amt, from, to, meta) => d.collection("tx").insertOne({ type: "trade", asset, amt, from, to, meta, at: new Date() }, { session: se });
// Limit order with price-time priority. Funds are locked first; fills happen at the resting (maker) price. Run inside a transaction.
export async function place(se, d, me, { sym, side, price, qty }) {
  const U = d.collection("users"), O = d.collection("orders"), buy = side === "buy", la = buy ? "USDT" : sym, lamt = buy ? r8(price * qty) : qty;
  if (!(await U.updateOne({ _id: me, ["bal." + la]: { $gte: lamt } }, { $inc: { ["bal." + la]: -lamt, ["lock." + la]: lamt } }, { session: se })).modifiedCount) throw new Error(`Not enough ${la} available`);
  const { insertedId } = await O.insertOne({ user: me, s: sym, side, price, qty, filled: 0, status: "open", at: new Date() }, { session: se });
  const opp = buy ? { side: "sell", price: { $lte: price } } : { side: "buy", price: { $gte: price } };
  const makers = await O.find({ s: sym, status: "open", user: { $ne: me }, ...opp }, { session: se }).sort({ price: buy ? 1 : -1, at: 1 }).toArray();
  let filled = 0;
  for (const m of makers) {
    const n = r8(Math.min(qty - filled, m.qty - m.filled)); if (n <= 0) break;
    const p = m.price, B = buy ? { id: me, limit: price } : { id: m.user, limit: m.price }, S = buy ? m.user : me, meta = { s: sym, side, p, limit: true };
    await U.updateOne({ _id: B.id }, { $inc: { "lock.USDT": -r8(n * B.limit), "bal.USDT": r8(n * (B.limit - p)), ["bal." + sym]: r8(n * (1 - FEE)) } }, { session: se });
    await U.updateOne({ _id: S }, { $inc: { ["lock." + sym]: -n, "bal.USDT": r8(n * p * (1 - FEE)) } }, { session: se });
    await rec(d, se, "USDT", r8(n * p), B.id, null, meta); await rec(d, se, sym, r8(n * (1 - FEE)), null, B.id, meta);
    await rec(d, se, sym, n, S, null, meta); await rec(d, se, "USDT", r8(n * p * (1 - FEE)), null, S, meta);
    await d.collection("trades").insertOne({ s: sym, p, q: n, side, at: new Date() }, { session: se });
    const mf = r8(m.filled + n); await O.updateOne({ _id: m._id }, { $set: { filled: mf, status: mf >= m.qty ? "filled" : "open" } }, { session: se });
    filled = r8(filled + n);
  }
  await O.updateOne({ _id: insertedId }, { $set: { filled, status: filled >= qty ? "filled" : "open" } }, { session: se });
  return { filled };
}
export async function cancel(se, d, me, id) {
  const o = await d.collection("orders").findOneAndUpdate({ _id: new ObjectId(id), user: me, status: "open" }, { $set: { status: "cancelled" } }, { session: se });
  if (!o) throw new Error("Order not found or already closed");
  const rem = r8(o.qty - o.filled), a = o.side === "buy" ? "USDT" : o.s, amt = o.side === "buy" ? r8(o.price * rem) : rem;
  await d.collection("users").updateOne({ _id: me }, { $inc: { ["lock." + a]: -amt, ["bal." + a]: amt } }, { session: se });
}
export async function book(d, sym) {
  const lv = (side, dir) => d.collection("orders").aggregate([{ $match: { s: sym, side, status: "open" } }, { $group: { _id: "$price", q: { $sum: { $subtract: ["$qty", "$filled"] } } } }, { $sort: { _id: dir } }, { $limit: 12 }]).toArray();
  const [a, b] = await Promise.all([lv("sell", 1), lv("buy", -1)]);
  return { asks: a.map((x) => [x._id, r8(x.q)]), bids: b.map((x) => [x._id, r8(x.q)]) };
}
