import { MongoClient } from "mongodb";
const p = (global._m ||= new MongoClient(process.env.MONGODB_URI).connect());
export const db = async () => (await p).db("voidkin");
export async function tx(fn) {
  const c = await p, s = c.startSession();
  try { let out; await s.withTransaction(async () => { out = await fn(s, c.db("voidkin")); }); return out; }
  finally { await s.endSession(); }
}
