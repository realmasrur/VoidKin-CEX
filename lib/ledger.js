export const PAIRS = ["BTC", "ETH", "BNB", "SOL", "XRP", "DOGE"];
export const ASSETS = ["USDT", ...PAIRS];
export const r8 = (x) => Math.round(x * 1e8) / 1e8;
export const price = async (s) => +(await fetch(`https://data-api.binance.vision/api/v3/ticker/price?symbol=${s}USDT`, { cache: "no-store" }).then((r) => r.json())).price;
// from=null mints from the system (deposits, fees' counterpart); to=null sends to the system (fees, withdrawals, trade legs)
export async function move(s, d, from, to, asset, amt, type, meta = {}) {
  const u = d.collection("users");
  if (from) {
    const r = await u.updateOne({ _id: from, ["bal." + asset]: { $gte: amt } }, { $inc: { ["bal." + asset]: -amt } }, { session: s });
    if (!r.modifiedCount) throw new Error(`Not enough ${asset} available`);
  }
  if (to) await u.updateOne({ _id: to }, { $inc: { ["bal." + asset]: amt } }, { session: s });
  await d.collection("tx").insertOne({ type, asset, amt, from, to, meta, at: new Date() }, { session: s });
}
