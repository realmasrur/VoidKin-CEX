let ttl;
export async function limit(d, key, max, secs) {
  const R = d.collection("rate"); ttl ||= R.createIndex({ exp: 1 }, { expireAfterSeconds: 0 });
  const id = `${key}:${Math.floor(Date.now() / (secs * 1000))}`;
  const r = await R.findOneAndUpdate({ _id: id }, { $inc: { n: 1 }, $setOnInsert: { exp: new Date(Date.now() + secs * 2000) } }, { upsert: true, returnDocument: "after" });
  if (r.n > max) throw new Error("Too many requests. Wait a moment and try again.");
}
