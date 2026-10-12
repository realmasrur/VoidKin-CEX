"use client";
import { useState } from "react";
import { motion } from "framer-motion";
import _ from "lodash";
import { Copy, Check, X, ArrowDownToLine, ArrowUpFromLine, ArrowLeftRight, Send, Gift } from "lucide-react";
import { ASSETS } from "@/lib/ledger";
export const api = (a, body) => fetch("/api/" + a, body ? { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) } : {}).then(async (r) => { const j = await r.json(); if (!r.ok) throw new Error(j.error); return j; });
export const fmt = (n, d = 2) => (+n).toLocaleString(undefined, { maximumFractionDigits: n < 1 ? 6 : d });
export const vol = (v) => (v >= 1e9 ? (v / 1e9).toFixed(2) + "B" : v >= 1e6 ? (v / 1e6).toFixed(1) + "M" : fmt(v, 0));
export const M = (hide, v) => (hide ? "••••" : v);
export const portfolio = (bal, px, lock = {}) => _.sumBy(ASSETS, (a) => (a === "USDT" ? 1 : px[a] || 0) * ((bal[a] || 0) + (lock[a] || 0)));
export const Coin = ({ s, size = 32 }) => <img src={`https://cdn.jsdelivr.net/gh/spothq/cryptocurrency-icons@master/svg/color/${s.toLowerCase()}.svg`} width={size} height={size} alt={s} className="shrink-0 rounded-full" onError={(e) => (e.currentTarget.style.visibility = "hidden")} />;
const field = "w-full rounded-2xl bg-mist px-4 py-3.5 text-[15px] outline-none ring-1 ring-transparent transition placeholder:text-ink/35 focus:bg-white focus:ring-ink";
export const In = ({ className = "", ...p }) => <input {...p} className={`${field} ${className}`} />;
export const Btn = ({ c = "bg-ink text-white", ...p }) => <motion.button whileTap={{ scale: 0.98 }} {...p} className={`w-full rounded-2xl py-3.5 text-[15px] font-semibold transition hover:opacity-90 disabled:opacity-35 ${c}`} />;
export const Card = ({ children, className = "", c = "bg-mist" }) => <div className={`rise rounded-3xl p-5 ${c} ${className}`}>{children}</div>;
export const Seg = ({ id, value, onChange, options, className = "" }) => <div className={`flex rounded-2xl bg-mist p-1 ${className}`}>{options.map(([k, n]) => <button key={k} onClick={() => onChange(k)} className={`relative flex-1 rounded-xl py-2 text-sm font-semibold transition-colors ${value === k ? "text-ink" : "text-ink/45"}`}>{value === k && <motion.span layoutId={id} transition={{ type: "spring", stiffness: 500, damping: 36 }} className="absolute inset-0 rounded-xl bg-white shadow-sm" />}<span className="relative">{n}</span></button>)}</div>;
export const Sheet = ({ open, onClose, title, children }) => open ? <div className="fade fixed inset-0 z-40 flex items-end justify-center bg-black/30 md:items-center" onClick={onClose}>
  <div onClick={(e) => e.stopPropagation()} className="sheetup max-h-[85vh] w-full max-w-md overflow-y-auto rounded-t-[32px] bg-white p-5 pb-8 md:rounded-[32px]">
    <div className="mb-4 flex items-center justify-between"><div className="text-lg font-bold">{title}</div><button aria-label="Close" onClick={onClose} className="rounded-full bg-mist p-2"><X size={16} /></button></div>{children}</div></div> : null;
export const CoinPicker = ({ value, onChange }) => <div className="no-scrollbar -mx-1 flex gap-2 overflow-x-auto px-1 py-1">{ASSETS.map((a) => <button key={a} onClick={() => onChange(a)} className={`flex shrink-0 items-center gap-2 rounded-full py-2 pl-2 pr-4 text-sm font-semibold transition ${value === a ? "bg-ink text-white" : "bg-mist text-ink/70"}`}><Coin s={a} size={22} />{a}</button>)}</div>;
export function Copyable({ text, label, className = "" }) {
  const [ok, setOk] = useState(false);
  return <button onClick={() => { navigator.clipboard.writeText(text); setOk(true); setTimeout(() => setOk(false), 1200); }} className={`flex w-full items-center justify-between gap-3 rounded-2xl bg-mist px-4 py-3 text-left transition hover:bg-line ${className}`}><span className="min-w-0 break-all text-sm font-medium">{label || text}</span>{ok ? <Check size={16} className="shrink-0 text-up" /> : <Copy size={16} className="shrink-0 text-ink/40" />}</button>;
}
export function useAct(reload) {
  const [msg, setMsg] = useState(null);
  const run = async (a, body, ok) => { try { const r = await api(a, body); setMsg({ ok: true, t: ok(r) }); reload(); return r; } catch (e) { setMsg({ ok: false, t: e.message }); } };
  return [msg, run, setMsg];
}
export const Msg = ({ m }) => m ? <div className={`rise rounded-2xl px-4 py-3 text-sm font-medium ${m.ok ? "bg-up/10 text-up" : "bg-down/10 text-down"}`}>{m.t}</div> : null;
export const Verified = ({ size = 16 }) => <img src="/verified.png" width={size} height={size} alt="Verified" title="Verified account" className="inline-block shrink-0" />;
export const TX = { deposit: ["Deposit", ArrowDownToLine], withdraw: ["Withdrawal", ArrowUpFromLine], trade: ["Trade", ArrowLeftRight], kinpay: ["KIN Pay", Send], rp_create: ["Red packet created", Gift], rp_claim: ["Red packet received", Gift], faucet: ["Test funds", Gift], refund: ["Withdrawal refunded", ArrowDownToLine] };
export const label = (t) => t.type === "kinpay" ? (t.in ? `KIN Pay from ${t.meta.from}` : `KIN Pay to ${t.meta.to}`) : t.type === "trade" ? `${t.meta.s} trade, ${t.in ? "received" : "paid"}` : TX[t.type][0];
