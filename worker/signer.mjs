// Withdrawal signer: sends USDT (BEP-20) for withdrawals an admin approved. Needs HOT_WALLET_PRIVATE_KEY. Run exactly ONE instance: npm run worker:signer
import { MongoClient } from "mongodb";
import { JsonRpcProvider, Wallet, Contract, parseUnits, formatUnits } from "ethers";
const USDT = "0x55d398326f99059fF775485246999027B3197955", MIN_GAS = 0.002, sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const c = await new MongoClient(process.env.MONGODB_URI).connect(), d = c.db("voidkin"), W = d.collection("withdrawals");
const rpc = new JsonRpcProvider(process.env.BSC_RPC), hot = new Wallet(process.env.HOT_WALLET_PRIVATE_KEY, rpc);
const t = new Contract(USDT, ["function transfer(address,uint256) returns (bool)", "function balanceOf(address) view returns (uint256)"], hot);
console.log("Signer online. Hot wallet:", hot.address);
let last = 0;
for (;;) {
  try {
    const usdt = +formatUnits(await t.balanceOf(hot.address), 18), bnb = +formatUnits(await rpc.getBalance(hot.address), 18);
    if (Date.now() - last > 30000) { last = Date.now(); await d.collection("counters").updateOne({ _id: "reserve" }, { $set: { usdt, bnb, address: hot.address, at: new Date() } }, { upsert: true }); }
    const w = await W.findOne({ status: "approved" }, { sort: { at: 1 } });
    if (!w) { await sleep(5000); continue; }
    const net = w.net ?? w.amt - 1;
    if (usdt < net || bnb < MIN_GAS) { console.log(`Waiting for hot wallet funds (need ${net} USDT and ${MIN_GAS} BNB)`); await sleep(20000); continue; }
    if (!(await W.updateOne({ _id: w._id, status: "approved" }, { $set: { status: "sending" } })).modifiedCount) continue;
    let tx;
    try { tx = await t.transfer(w.address, parseUnits(String(net), 18)); }
    catch (e) { await W.updateOne({ _id: w._id }, { $set: { status: "approved", err: e.shortMessage || e.message } }); await sleep(15000); continue; }
    await W.updateOne({ _id: w._id }, { $set: { status: "sent", hash: tx.hash } });
    const r = await tx.wait(1); await W.updateOne({ _id: w._id }, { $set: { status: r.status === 1 ? "confirmed" : "failed" } });
  } catch (e) { console.error(e.message); await sleep(8000); }
}
