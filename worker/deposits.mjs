// Deposit watcher: credits USDT (BEP-20) sent to users' deposit addresses after 12 confirmations. Run as a separate Render/Railway/Fly worker: npm run worker
import { MongoClient } from "mongodb";
import { JsonRpcProvider, id } from "ethers";
const USDT = "0x55d398326f99059fF775485246999027B3197955", TOPIC = id("Transfer(address,address,uint256)"), CONF = 12, STEP = 2000, MIN = +process.env.MIN_DEPOSIT || 5;
const c = await new MongoClient(process.env.MONGODB_URI).connect(), d = c.db("voidkin"), rpc = new JsonRpcProvider(process.env.BSC_RPC);
let cur = (await d.collection("counters").findOne({ _id: "bscCursor" }))?.n ?? (await rpc.getBlockNumber()) - CONF;
for (;;) {
  try {
    const head = (await rpc.getBlockNumber()) - CONF, to = Math.min(head, cur + STEP);
    if (to > cur) {
      const logs = await rpc.getLogs({ address: USDT, topics: [TOPIC], fromBlock: cur + 1, toBlock: to });
      const dest = [...new Set(logs.map((l) => "0x" + l.topics[2].slice(26)))];
      const users = dest.length ? await d.collection("users").find({ addrL: { $in: dest } }).toArray() : [];
      const by = Object.fromEntries(users.map((u) => [u.addrL, u]));
      for (const l of logs) {
        const u = by["0x" + l.topics[2].slice(26)]; if (!u) continue;
        const amt = Number(BigInt(l.data) / 10n ** 10n) / 1e8, s = c.startSession();
        try {
          await s.withTransaction(async () => {
            await d.collection("deposits").insertOne({ _id: `${l.transactionHash}:${l.index}`, user: u._id, amt, credited: amt >= MIN, at: new Date() }, { session: s });
            if (amt < MIN) return;
            await d.collection("users").updateOne({ _id: u._id }, { $inc: { "bal.USDT": amt } }, { session: s });
            await d.collection("tx").insertOne({ type: "deposit", asset: "USDT", amt, from: null, to: u._id, meta: { hash: l.transactionHash }, at: new Date() }, { session: s });
          });
        } catch (e) { if (e.code !== 11000) throw e; } finally { await s.endSession(); }
      }
      cur = to; await d.collection("counters").updateOne({ _id: "bscCursor" }, { $set: { n: cur } }, { upsert: true });
    } else await new Promise((r) => setTimeout(r, 5000));
  } catch (e) { console.error(e.message); await new Promise((r) => setTimeout(r, 8000)); }
}
