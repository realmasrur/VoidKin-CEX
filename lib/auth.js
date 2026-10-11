import Google from "next-auth/providers/google";
import { randomInt } from "crypto";
import { HDNodeWallet } from "ethers";
import { db } from "./db";
const addrFor = (i) => HDNodeWallet.fromExtendedKey(process.env.MASTER_XPUB).deriveChild(i).address;
async function ensureUser(u) {
  const d = await db(), c = d.collection("users");
  await c.createIndex({ uid: 1 }, { unique: true }); await c.createIndex({ email: 1 }, { unique: true }); await c.createIndex({ addrL: 1 });
  if (await c.findOne({ email: u.email })) return;
  const { seq } = await d.collection("counters").findOneAndUpdate({ _id: "addr" }, { $inc: { seq: 1 } }, { upsert: true, returnDocument: "after" });
  const addr = addrFor(seq);
  for (let i = 0; i < 12; i++) {
    try { await c.insertOne({ email: u.email, name: u.name, image: u.image, uid: String(100000 + randomInt(900000)), addr, addrL: addr.toLowerCase(), bal: {}, createdAt: new Date() }); return; }
    catch (e) { if (e.code !== 11000) throw e; if (await c.findOne({ email: u.email })) return; }
  }
  throw new Error("Could not allocate a user ID");
}
export const authOptions = {
  providers: [Google({ clientId: process.env.GOOGLE_CLIENT_ID, clientSecret: process.env.GOOGLE_CLIENT_SECRET })],
  session: { strategy: "jwt" },
  callbacks: {
    async signIn({ user }) { await ensureUser(user); return true; },
    async jwt({ token }) {
      if (!token.uid) { const u = await (await db()).collection("users").findOne({ email: token.email }); token.uid = u?.uid; token.id = String(u?._id); }
      return token;
    },
    async session({ session, token }) { session.user.uid = token.uid; session.user.id = token.id; return session; },
  },
};
