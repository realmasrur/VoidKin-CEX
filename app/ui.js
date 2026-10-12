"use client";
import { useState } from "react";
import { motion } from "framer-motion";
import _ from "lodash";
import { Copy, Check, ArrowDownToLine, ArrowUpFromLine, ArrowLeftRight, Send, Gift } from "lucide-react";
import { ASSETS } from "@/lib/ledger";
export const api = (a, body) => fetch("/api/" + a, body ? { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) } : {}).then(async (r) => { const j = await r.json(); if (!r.ok) throw new Error(j.error); return j; });
export const fmt = (n, d = 2) => (+n).toLocaleString(undefined, { maximumFractionDigits: n < 1 ? 6 : d });
export const M = (hide, v) => (hide ? "••••" : v);
export const portfolio = (bal, px, lock = {}) => _.sumBy(ASSETS, (a) => (a === "USDT" ? 1 : px[a] || 0) * ((bal[a] || 0) + (lock[a] || 0)));
export const Coin = ({ s, size = 32 }) => <img src={`https://cdn.jsdelivr.net/gh/spothq/cryptocurrency-icons@master/svg/color/${s.toLowerCase()}.svg`} width={size} height={size} alt={s} className="shrink-0 rounded-full" onError={(e) => (e.currentTarget.style.visibility = "hidden")} />;
const field = "w-full rounded-xl bg-white/5 px-3.5 py-3 outline-none ring-1 ring-white/10 transition focus:ring-2 focus:ring-kin";
export const In = (p) => <input {...p} className={field} />;
export const Sel = (p) => <select {...p} className={field + " bg-[#17122a]"}>{ASSETS.map((a) => <option key={a}>{a}</option>)}</select>;
export const Btn = ({ c = "bg-kin", ...p }) => <motion.button whileTap={{ scale: 0.97 }} {...p} className={`w-full rounded-xl py-3.5 font-semibold transition hover:brightness-110 disabled:opacity-40 ${c}`} />;
export const Card = ({ children, className = "" }) => <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className={`rounded-2xl bg-white/[.04] p-5 ring-1 ring-white/10 ${className}`}>{children}</motion.div>;
export function Copyable({ text, label }) {
  const [ok, setOk] = useState(false);
  return <button onClick={() => { navigator.clipboard.writeText(text); setOk(true); setTimeout(() => setOk(false), 1200); }} className="flex w-full items-center justify-between gap-3 rounded-xl bg-white/5 px-3.5 py-3 text-left ring-1 ring-white/10 transition hover:ring-kin"><span className="min-w-0 break-all text-sm">{label || text}</span>{ok ? <Check size={16} className="shrink-0 text-emerald-400" /> : <Copy size={16} className="shrink-0 text-white/50" />}</button>;
}
export function useAct(reload) {
  const [msg, setMsg] = useState(null);
  const run = async (a, body, ok) => { try { const r = await api(a, body); setMsg({ ok: true, t: ok(r) }); reload(); return r; } catch (e) { setMsg({ ok: false, t: e.message }); } };
  return [msg, run, setMsg];
}
export const Msg = ({ m }) => m ? <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} className={`rounded-xl px-4 py-3 text-sm ring-1 ${m.ok ? "bg-emerald-500/10 text-emerald-300 ring-emerald-500/30" : "bg-rose-500/10 text-rose-300 ring-rose-500/30"}`}>{m.t}</motion.div> : null;
export const TX = { deposit: ["Deposit", ArrowDownToLine], withdraw: ["Withdrawal", ArrowUpFromLine], trade: ["Trade", ArrowLeftRight], kinpay: ["KIN Pay", Send], rp_create: ["Red packet created", Gift], rp_claim: ["Red packet received", Gift], faucet: ["Test funds", Gift], refund: ["Withdrawal refunded", ArrowDownToLine] };
export const label = (t) => t.type === "kinpay" ? (t.in ? `KIN Pay from ${t.meta.from}` : `KIN Pay to ${t.meta.to}`) : t.type === "trade" ? `${t.meta.s} trade, ${t.in ? "received" : "paid"}` : TX[t.type][0];
