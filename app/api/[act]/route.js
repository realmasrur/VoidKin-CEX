import { getServerSession } from "next-auth";
import { ObjectId } from "mongodb";
import { randomBytes } from "crypto";
import { authOptions } from "@/lib/auth";
import { db, tx } from "@/lib/db";
import { move, r8, price, PAIRS, ASSETS } from "@/lib/ledger";
const fail = (m) => { throw new Error(m); };
const num = (v, min = 0.00000001) => { const n = r8(+v); return n >= min ? n : fail("Enter a valid amount"); };
const H = {
  async market({ q }) {
    const base = "https://data-api.binance.vision/api/v3", s = q.get("s");
    const t = await fetch(`${base}/ticker/24hr?symbols=${encodeURIComponent(JSON.stringify(PAIRS.map((p) => p + "USDT")))}`, { cache: "no-store" }).then((r) => r.json());
    const k = s && PAIRS.includes(s) ? await fetch(`${base}/klines?symbol=${s}USDT&interval=${["15m", "1h", "4h", "1d"].includes(q.get("i")) ? q.get("i") : "15m"}&limit=96`).then((r) => r.json()) : null;
    return { t: t.map((x) => ({ s: x.symbol.slice(0, -4), p: +x.lastPrice, c: +x.priceChangePercent, v: +x.quoteVolume })), k: k && k.map((x) => +x[4]) };
  },
  async me({ me, d }) {
    const u = await d.collection("users").findOne({ _id: me });
    const t = await d.collection("tx").find({ $or: [{ from: me }, { to: me }] }).sort({ at: -1 }).limit(40).toArray();
    const p = await d.collection("packets").find({ by: me }).sort({ at: -1 }).limit(15).toArray();
    return { u: { uid: u.uid, name: u.name, bal: u.bal, addr: u.addr }, t: t.map((x) => ({ type: x.type, asset: x.asset, amt: x.amt, meta: x.meta, at: x.at, in: String(x.to) === String(me) })), p: p.map((x) => ({ code: x.code, asset: x.asset, total: x.total, left: x.left, n: x.n, leftN: x.leftN })) };
  },
  async trade({ me, b }) {
    if (!PAIRS.includes(b.s) || !["buy", "sell"].includes(b.side)) fail("Invalid market");
    const a = num(b.amt), p = await price(b.s);
    await tx(async (se, d) => {
      if (b.side === "buy") { await move(se, d, me, null, "USDT", a, "trade", { s: b.s, side: "buy", p }); await move(se, d, null, me, b.s, r8((a / p) * 0.999), "trade", { s: b.s, side: "buy", p }); }
      else { await move(se, d, me, null, b.s, a, "trade", { s: b.s, side: "sell", p }); await move(se, d, null, me, "USDT", r8(a * p * 0.999), "trade", { s: b.s, side: "sell", p }); }
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
  async withdraw({ me, b }) {
    const a = num(b.amt, 10); if (!/^0x[a-fA-F0-9]{40}$/.test(b.address)) fail("Enter a valid BNB Smart Chain address");
    await tx(async (se, d) => {
      await move(se, d, me, null, "USDT", a, "withdraw", { address: b.address });
      await d.collection("withdrawals").insertOne({ user: me, address: b.address, asset: "USDT", chain: "BSC", amt: a, status: "pending", at: new Date() }, { session: se });
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
    return Response.json(await h({ me: new ObjectId(ses.user.id), uid: ses.user.uid, d: await db(), b, q }));
  } catch (e) { return Response.json({ error: e.message }, { status: 400 }); }
}
export const GET = (r, c) => run(r, c, "GET");
export const POST = (r, c) => run(r, c, "POST");
      
