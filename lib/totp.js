import { createHmac, createCipheriv, createDecipheriv, randomBytes } from "crypto";
const A = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
export const newSecret = () => { let bits = ""; for (const x of randomBytes(20)) bits += x.toString(2).padStart(8, "0"); let out = ""; for (let i = 0; i < bits.length; i += 5) out += A[parseInt(bits.slice(i, i + 5).padEnd(5, "0"), 2)]; return out; };
const dec32 = (s) => { let bits = ""; for (const c of s) bits += A.indexOf(c).toString(2).padStart(5, "0"); const o = []; for (let i = 0; i + 8 <= bits.length; i += 8) o.push(parseInt(bits.slice(i, i + 8), 2)); return Buffer.from(o); };
export const code = (secret, step) => { const c = Buffer.alloc(8); c.writeBigUInt64BE(BigInt(step)); const h = createHmac("sha1", dec32(secret)).update(c).digest(), o = h[19] & 15; return String((h.readUInt32BE(o) & 0x7fffffff) % 1e6).padStart(6, "0"); };
// Returns the matching 30s step (so a code can't be reused) or null.
export const check = (secret, token) => { const t = Math.floor(Date.now() / 30000); if (!/^\d{6}$/.test(String(token))) return null; for (const d of [-1, 0, 1]) if (code(secret, t + d) === String(token)) return t + d; return null; };
const key = () => Buffer.from(process.env.TOTP_KEY, "hex");
export const seal = (s) => { const iv = randomBytes(12), c = createCipheriv("aes-256-gcm", key(), iv), e = Buffer.concat([c.update(s, "utf8"), c.final()]); return [iv, c.getAuthTag(), e].map((x) => x.toString("hex")).join("."); };
export const open = (v) => { const [iv, tag, e] = v.split(".").map((x) => Buffer.from(x, "hex")), d = createDecipheriv("aes-256-gcm", key(), iv); d.setAuthTag(tag); return Buffer.concat([d.update(e), d.final()]).toString("utf8"); };
