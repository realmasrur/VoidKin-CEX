// Hedge worker: nets users' buys/sells and mirrors the difference on Binance so the platform holds what users own. npm run worker:hedge
import { MongoClient } from "mongodb";
import { createHmac } from "crypto";
const API = process.env.BINANCE_API || "https://api.binance.com", LIVE = process.env.HEDGE_LIVE === "1", sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const c = await new MongoClient(process.env.MONGODB_URI).connect(), d = c.db("voidkin"), H = d.collection("hedges"), K = d.collection("counters");
const get = (p) => fetch(API + p).then((r) => r.json());
async function order(symbol, side, quantity) {
  const q = new URLSearchParams({ symbol, side, type: "MARKET", quantity: String(quantity), timestamp: Date.now(), recvWindow: 5000 }).toString();
  const sig = createHmac("sha256", process.env.BINANCE_SECRET).update(q).digest("hex");
  const r = await fetch(`${API}/api/v3/order?${q}&signature=${sig}`, { method: "POST", headers: { "X-MBX-APIKEY": process.env.BINANCE_KEY } }), j = await r.json();
  if (!r.ok) throw new Error(j.msg || "Binance rejected the order");
  return String(j.orderId);
}
console.log(LIVE ? "Hedge worker LIVE" : "Hedge worker in dry-run mode (HEDGE_LIVE is not 1)");
for (;;) {
  try {
    const open = await H.find({ status: "open" }).toArray();
    for (const s of [...new Set(open.map((h) => h.s))]) {
      const rows = open.filter((h) => h.s === s), res = (await K.findOne({ _id: "hedgeRes" }))?.[s] || 0;
      const net = rows.reduce((a, h) => a + (h.side === "buy" ? h.qty : -h.qty), 0) + res;
      const info = (await get(`/api/v3/exchangeInfo?symbol=${s}USDT`)).symbols[0], lot = info.filters.find((f) => f.filterType === "LOT_SIZE"), nt = info.filters.find((f) => ["NOTIONAL", "MIN_NOTIONAL"].includes(f.filterType));
      const step = +lot.stepSize, dec = Math.max(0, Math.round(-Math.log10(step))), px = +(await get(`/api/v3/ticker/price?symbol=${s}USDT`)).price;
      const qty = +(Math.floor(Math.abs(net) / step + 1e-9) * step).toFixed(dec);
      if (qty < +lot.minQty || qty * px < +(nt?.minNotional || 5)) continue; // too small: keep netting
      const id = LIVE ? await order(s + "USDT", net > 0 ? "BUY" : "SELL", qty) : "dry-run";
      await H.updateMany({ _id: { $in: rows.map((h) => h._id) } }, { $set: { status: "done", order: id, doneAt: new Date() } });
      await K.updateOne({ _id: "hedgeRes" }, { $set: { [s]: +(net - Math.sign(net) * qty).toFixed(8) } }, { upsert: true });
      console.log(`${net > 0 ? "BUY" : "SELL"} ${qty} ${s} -> ${id}`);
    }
  } catch (e) { console.error(e.message); }
  await sleep(10000);
}
