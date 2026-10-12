import { getServerSession } from "next-auth";
import { ObjectId } from "mongodb";
import { randomBytes } from "crypto";
import { authOptions } from "@/lib/auth";
import { db, tx } from "@/lib/db";
import { move, r8, price, PAIRS, ASSETS, COINS } from "@/lib/ledger";
import { place, cancel as cancelOrder, book as getBook, ensureIdx } from "@/lib/engine";
import { newSecret, check, seal, open } from "@/lib/totp";
import { limit as rateLimit } from "@/lib/rate";
const fail = (m) => { throw new Error(m); };
const ADMINS = (process.env.ADMIN_EMAILS || "").split(",").map((x) => x.trim().toLowerCase()).filter(Boolean), isAdmin = (e) => ADMINS.includes(String(e).toLowerCase());
const num = (v, min = 0.00000001) => { const n = r8(+v); return n >= min ? n : fail("Enter a valid amount"); };
async function owed(U) { const out = {}; for (const f of ["bal", "lock"]) for (const x of await U.aggregate([{ $project: { b: { $objectToArray: "$" + f } } }, { $unwind: "$b" }, { $group: { _id: "$b.k", s: { $sum: "$b.v" } } }]).toArray()) out[x._id] = r8((out[x._id] || 0) + x.s); return out; }
const H = {
  async market({ q }) {
    const base = "https://data-api.binance.vision/api/v3", s = q.get("s");
    const t = await fetch(`${base}/ticker/24hr?symbols=${encodeURIComponent(JSON.stringify(PAIRS.map((p) => p + "USDT")))}`, { cache: "no-store" }).then((r) => r.json());
    const k = s && PAIRS.includes(s) ? await fetch(`${base}/klines?symbol=${s}USDT&interval=${["15m", "1h", "4h", "1d"].includes(q.get("i")) ? q.get("i") : "15m"}&limit=96`).then((r) => r.json()) : null;
    return { t: t.map((x) => ({ s: x.symbol.slice(0, -4), p: +x.lastPrice, c: +x.priceChangePercent, v: +x.quoteVolume })), k: k && k.map((x) => +x[4]) };
  },
  async me({ me, d, email }) {
    const u = await d.collection("users").findOne({ _id: me });
    const t = await d.collection("tx").find({ $or: [{ from: me }, { to: me }] }).sort({ at: -1 }).limit(100).toArray();
    const p = await d.collection("packets").find({ by: me }).sort({ at: -1 }).limit(15).toArray();
    const st = Object.fromEntries((await d.collection("tx").aggregate([{ $match: { $or: [{ from: me }, { to: me }], type: { $in: ["deposit", "withdraw"] }, asset: "USDT" } }, { $group: { _id: "$type", s: { $sum: "$amt" } } }]).toArray()).map((x) => [x._id, x.s]));
    return { st, admin: isAdmin(email), u: { uid: u.uid, name: u.name, email: u.email, since: u.createdAt, bal: u.bal, addr: u.addr, frozen: !!u.frozen, lock: u.lock || {}, twofa: !!u.totp?.on }, t: t.map((x) => ({ type: x.type, asset: x.asset, amt: x.amt, meta: x.meta, at: x.at, in: String(x.to) === String(me) })), p: p.map((x) => ({ code: x.code, asset: x.asset, total: x.total, left: x.left, n: x.n, leftN: x.leftN })) };
  },
  async trade({ me, b }) {
    if (!PAIRS.includes(b.s) || !["buy", "sell"].includes(b.side)) fail("Invalid market");
    const a = num(b.amt), p = await price(b.s);
    await tx(async (se, d) => {
      if (b.side === "buy") { await move(se, d, me, null, "USDT", a, "trade", { s: b.s, side: "buy", p }); await move(se, d, null, me, b.s, r8((a / p) * 0.999), "trade", { s: b.s, side: "buy", p }); }
      else { await move(se, d, me, null, b.s, a, "trade", { s: b.s, side: "sell", p }); await move(se, d, null, me, "USDT", r8(a * p * 0.999), "trade", { s: b.s, side: "sell", p }); }
      await d.collection("hedges").insertOne({ s: b.s, side: b.side, qty: b.side === "buy" ? r8(a / p) : a, p, status: "open", at: new Date() }, { session: se });
    });
    return { ok: true, p };
  },
  async pay({ me, uid, b }) {
    const a = num(b.amt); if (!ASSETS.includes(b.asset)) fail("Unknown asset");
    await tx(async (se, d) => {
      const to = await d.collection("users").findOne({ uid: String(b.uid).trim() }, { session: se });
      if (!to) fail("No VOIDKIN user has that ID"); if (to._id.equals(me)) fail("You can't pay your own ID");
      await move(se, d, me, to._id, b.asset, a, "kinpay", { from: uid, to: to.uid, note: String(b.note || "").slice(0, 60) });
    });
    return { ok: true };
  },
  async withdraw({ me, b, d }) {
    const wu = await d.collection("users").findOne({ _id: me });
    if (!wu.totp?.on) fail("Turn on two-factor authentication in Settings before withdrawing");
    const st = check(open(wu.totp.s), b.code); if (st === null || st <= (wu.totp.last || 0)) fail("Enter a valid 6-digit code from your authenticator app");
    await d.collection("users").updateOne({ _id: me }, { $set: { "totp.last": st } });
    if (b.asset !== "USDT" || b.chain !== "BSC") fail("That coin or network is not open for withdrawal yet"); const a = num(b.amt, COINS.USDT.chains[0].min); if (!/^0x[a-fA-F0-9]{40}$/.test(b.address)) fail("Enter a valid BNB Smart Chain address");
    await tx(async (se, d) => {
      await move(se, d, me, null, "USDT", a, "withdraw", { address: b.address, fee: COINS.USDT.chains[0].fee });
      await d.collection("withdrawals").insertOne({ user: me, address: b.address, asset: "USDT", chain: "BSC", amt: a, fee: COINS.USDT.chains[0].fee, net: r8(a - COINS.USDT.chains[0].fee), status: "pending", at: new Date() }, { session: se });
    });
    return { ok: true };
  },
  async packet({ me, uid, b }) {
    const total = num(b.total), n = parseInt(b.count); if (!ASSETS.includes(b.asset)) fail("Unknown asset");
    if (!(n >= 1 && n <= 100) || total / n < 0.01) fail("Use 1-100 packets, at least 0.01 each");
    const code = randomBytes(4).toString("hex").toUpperCase();
    await tx(async (se, d) => {
      await move(se, d, me, null, b.asset, total, "rp_create", { code });
      await d.collection("packets").insertOne({ code, by: me, byUid: uid, asset: b.asset, total, left: total, n, leftN: n, mode: b.mode === "equal" ? "equal" : "random", claims: [], at: new Date() }, { session: se });
    });
    return { code };
  },
  async adminSummary({ d }) {
    const U = d.collection("users");
    const wd = await d.collection("withdrawals").find({ status: { $in: ["pending", "approved", "sending", "sent"] } }).sort({ at: 1 }).limit(50).toArray();
    const us = await U.find({ _id: { $in: wd.map((w) => w.user) } }).project({ uid: 1, email: 1 }).toArray(), by = Object.fromEntries(us.map((x) => [String(x._id), x]));
    return { audit: (await d.collection("audit").find().sort({ at: -1 }).limit(15).toArray()).map((x) => ({ by: x.by, act: x.act, b: x.b, at: x.at })), users: await U.countDocuments(), liab: await owed(U), reserve: await d.collection("counters").findOne({ _id: "reserve" }), openHedges: await d.collection("hedges").countDocuments({ status: "open" }),
      wd: wd.map((w) => ({ id: String(w._id), uid: by[String(w.user)]?.uid, email: by[String(w.user)]?.email, address: w.address, amt: w.amt, net: w.net ?? w.amt - 1, status: w.status, err: w.err, at: w.at })) };
  },
  async adminWd({ b, d }) {
    const _id = new ObjectId(b.id);
    if (b.op === "approve") { const r = await d.collection("withdrawals").updateOne({ _id, status: "pending" }, { $set: { status: "approved", approvedAt: new Date() } }); if (!r.modifiedCount) fail("Already handled"); return { ok: true }; }
    if (b.op !== "reject") fail("Unknown action");
    await tx(async (se, d) => { const w = await d.collection("withdrawals").findOneAndUpdate({ _id, status: "pending" }, { $set: { status: "rejected" } }, { session: se }); if (!w) fail("Already handled"); await move(se, d, null, w.user, w.asset, w.amt, "refund", { id: b.id }); });
    return { ok: true };
  },
  async adminFreeze({ b, d }) {
    const r = await d.collection("users").updateOne({ uid: String(b.uid).trim() }, { $set: { frozen: !!b.frozen } });
    if (!r.matchedCount) fail("No user with that ID"); return { ok: true };
  },
  async order({ me, b, d }) {
    if (!PAIRS.includes(b.s) || !["buy", "sell"].includes(b.side)) fail("Invalid market");
    const pr = num(b.price), qty = num(b.qty); if (pr * qty < 5) fail("Orders must be worth at least 5 USDT");
    const mkt = await price(b.s); if (Math.abs(pr / mkt - 1) > 0.2) fail("Price must be within 20% of the market price");
    await ensureIdx(d);
    return tx((se, db) => place(se, db, me, { sym: b.s, side: b.side, price: pr, qty }));
  },
  async cancel({ me, b }) { await tx((se, db) => cancelOrder(se, db, me, b.id)); return { ok: true }; },
  async book({ q }) { const s = q.get("s"); if (!PAIRS.includes(s)) fail("Invalid market"); return getBook(await db(), s); },
  async orders({ me, d }) {
    const O = d.collection("orders"), pick = (x) => ({ id: String(x._id), s: x.s, side: x.side, price: x.price, qty: x.qty, filled: x.filled, status: x.status });
    return { open: (await O.find({ user: me, status: "open" }).sort({ at: -1 }).limit(50).toArray()).map(pick), done: (await O.find({ user: me, status: { $ne: "open" } }).sort({ at: -1 }).limit(20).toArray()).map(pick) };
  },
  async twofa({ me, b, d }) {
    const U = d.collection("users"), u = await U.findOne({ _id: me });
    if (b.op === "setup") {
      if (u.totp?.on) fail("Two-factor authentication is already on");
      const sec = newSecret(); await U.updateOne({ _id: me }, { $set: { totp: { s: seal(sec), on: false, last: 0 } } });
      return { secret: sec, uri: `otpauth://totp/VOIDKIN:${encodeURIComponent(u.email)}?secret=${sec}&issuer=VOIDKIN` };
    }
    if (!u.totp?.s) fail("Start two-factor setup first");
    const st = check(open(u.totp.s), b.code); if (st === null || st <= (u.totp.last || 0)) fail("That code is not valid. Check your authenticator app and try again.");
    if (b.op === "enable") { await U.updateOne({ _id: me }, { $set: { "totp.on": true, "totp.last": st } }); return { ok: true }; }
    if (b.op === "disable") { if (!u.totp.on) fail("Two-factor authentication is not on"); await U.updateOne({ _id: me }, { $unset: { totp: "" } }); return { ok: true }; }
    fail("Unknown action");
  },
  async delete({ me, b, d }) {
    if (b.confirm !== "DELETE") fail("Type DELETE to confirm");
    const u = await d.collection("users").findOne({ _id: me });
    if (Object.values(u.bal || {}).some((v) => v > 0.00000001)) fail("Withdraw or spend all balances before deleting your account");
    if (Object.values(u.lock || {}).some((v) => v > 0.00000001)) fail("Cancel your open orders first");
    if (await d.collection("withdrawals").findOne({ user: me, status: "pending" })) fail("You have a withdrawal in progress");
    if (await d.collection("packets").findOne({ by: me, leftN: { $gt: 0 } })) fail("You have an unclaimed red packet");
    await d.collection("users").deleteOne({ _id: me });
    return { ok: true };
  },
  async claim({ me, uid, b }) {
    return tx(async (se, d) => {
      const P = d.collection("packets"), p = await P.findOne({ code: String(b.code || "").trim().toUpperCase() }, { session: se });
      if (!p) fail("No packet with that code"); if (p.leftN < 1) fail("This packet has been fully claimed");
      if (p.claims.some((c) => c.u.equals(me))) fail("You already claimed this packet");
      const cap = r8(p.left - (p.leftN - 1) * 0.01);
      const a = p.leftN === 1 ? r8(p.left) : p.mode === "equal" ? r8(p.total / p.n) : r8(Math.min(cap, Math.max(0.01, Math.random() * 2 * (p.left / p.leftN))));
      await P.updateOne({ _id: p._id }, { $inc: { left: -a, leftN: -1 }, $push: { claims: { u: me, uid, a } } }, { session: se });
      await move(se, d, null, me, p.asset, a, "rp_claim", { code: p.code, by: p.byUid });
      return { amt: a, asset: p.asset };
    });
  },
};
async function run(req, ctx, method) {
  try {
    const { act } = await ctx.params, h = H[act]; if (!h) fail("Not found");
    const q = new URL(req.url).searchParams;
    if (act === "market") return Response.json(await h({ q }));
    const ses = await getServerSession(authOptions); if (!ses?.user?.id) return Response.json({ error: "Sign in to continue" }, { status: 401 });
    const b = method === "POST" ? await req.json() : {};
    const d = await db(), me = new ObjectId(ses.user.id), email = ses.user.email;
    await rateLimit(d, "u" + ses.user.id, 120, 60);
    if (["withdraw", "twofa"].includes(act)) await rateLimit(d, "s" + ses.user.id + act, 10, 3600);
    if (act.startsWith("admin") && !isAdmin(email)) fail("Not found");
    if (act.startsWith("admin") && method === "POST") await d.collection("audit").insertOne({ by: email, act, b, at: new Date() });
    if (["trade", "pay", "withdraw", "packet", "claim", "order", "cancel"].includes(act) && (await d.collection("users").findOne({ _id: me }, { projection: { frozen: 1 } }))?.frozen) fail("Your account is frozen. Contact support.");
    return Response.json(await h({ me, uid: ses.user.uid, email, d, b, q }));
  } catch (e) { return Response.json({ error: e.message }, { status: 400 }); }
}
export const GET = (r, c) => run(r, c, "GET");
export const POST = (r, c) => run(r, c, "POST");
