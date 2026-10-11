"use client";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import _ from "lodash";
import { signOut } from "next-auth/react";
import { Settings, Send, Gift, History, ChevronLeft, ChevronRight, Trash2, LogOut } from "lucide-react";
import { api, fmt, M, portfolio, label, TX, In, Sel, Btn, Card, Copyable, useAct, Msg } from "./ui";
const FILTERS = [["all", "All"], ["trade", "Trades"], ["deposit", "Deposits"], ["withdraw", "Withdrawals"], ["kinpay", "KIN Pay"], ["rp", "Red packets"]];
const Sub = ({ title, back, children }) => <div className="mx-auto max-w-lg space-y-4"><div className="flex items-center gap-2"><button aria-label="Back" onClick={back} className="rounded-xl bg-white/5 p-2.5 ring-1 ring-white/10"><ChevronLeft size={18} /></button><h2 className="text-lg font-semibold">{title}</h2></div>{children}</div>;
const Item = ({ I, t, d, ...p }) => <button {...p} className="flex w-full items-center gap-4 rounded-2xl bg-white/[.04] p-4 text-left ring-1 ring-white/10 transition hover:bg-white/[.07]"><span className="rounded-xl bg-kin/20 p-3 text-kin"><I size={20} /></span><span className="flex-1"><div className="font-semibold">{t}</div><div className="text-sm text-white/50">{d}</div></span><ChevronRight size={18} className="text-white/40" /></button>;

function Pay({ me, reload }) {
  const [f, setF] = useState({ asset: "USDT" }), set = (k) => (e) => setF((s) => ({ ...s, [k]: e.target.value })), [msg, run] = useAct(reload), bal = me?.u.bal || {};
  return <Card className="space-y-3"><In inputMode="numeric" maxLength={6} placeholder="Recipient's 6-digit ID" value={f.to || ""} onChange={set("to")} /><div className="grid grid-cols-2 gap-2"><Sel value={f.asset} onChange={set("asset")} /><In type="number" placeholder="Amount" value={f.amt || ""} onChange={set("amt")} /></div><In placeholder="Note (optional)" maxLength={60} value={f.note || ""} onChange={set("note")} />
    <div className="text-sm text-white/60">Available: {fmt(bal[f.asset] || 0, 8)} {f.asset}. Transfers between VOIDKIN users are instant and free.</div><Msg m={msg} /><Btn onClick={() => run("pay", { uid: f.to, asset: f.asset, amt: f.amt, note: f.note }, () => `Sent ${f.amt} ${f.asset} to ${f.to}`)}>Send payment</Btn></Card>;
}
function Packets({ me, reload }) {
  const [f, setF] = useState({ asset: "USDT", mode: "random", count: 1 }), set = (k) => (e) => setF((s) => ({ ...s, [k]: e.target.value })), [msg, run] = useAct(reload);
  return <div className="space-y-4"><Msg m={msg} />
    <Card className="space-y-3"><div className="font-semibold">Open a red packet</div><In placeholder="Enter packet code" value={f.code || ""} onChange={set("code")} /><Btn onClick={() => run("claim", { code: f.code }, (r) => `You received ${fmt(r.amt, 8)} ${r.asset}`)}>Open packet</Btn></Card>
    <Card className="space-y-3"><div className="font-semibold">Create a red packet</div><div className="grid grid-cols-2 gap-2"><Sel value={f.asset} onChange={set("asset")} /><In type="number" placeholder="Total amount" value={f.total || ""} onChange={set("total")} /></div>
      <div className="grid grid-cols-2 gap-2"><In type="number" min="1" max="100" placeholder="Number of packets" value={f.count} onChange={set("count")} /><select value={f.mode} onChange={set("mode")} className="rounded-xl bg-[#17122a] px-3.5 py-3 ring-1 ring-white/10"><option value="random">Random split</option><option value="equal">Equal split</option></select></div>
      <Btn onClick={() => run("packet", { asset: f.asset, total: f.total, count: f.count, mode: f.mode }, (r) => `Packet ${r.code} created. Share the code so people can open it.`)}>Create packet</Btn></Card>
    <Card><div className="mb-2 text-sm text-white/60">Packets you created</div>{!me?.p.length && <div className="py-4 text-center text-white/50">Create a packet and share its code in any chat.</div>}{me?.p.map((p) => <div key={p.code} className="mb-3 space-y-1"><Copyable text={p.code} label={`${p.code} - tap to copy`} /><div className="px-1 text-xs text-white/50">{p.n - p.leftN} of {p.n} opened, {fmt(p.left, 8)} of {fmt(p.total, 8)} {p.asset} left</div></div>)}</Card></div>;
}
function Hist({ me, hide }) {
  const [f, setF] = useState("all"), rows = _.filter(me?.t || [], (t) => f === "all" || t.type.startsWith(f)), days = _.groupBy(rows, (t) => new Date(t.at).toLocaleDateString(undefined, { dateStyle: "medium" }));
  return <div className="space-y-4"><div className="flex gap-2 overflow-x-auto pb-1">{FILTERS.map(([k, n]) => <button key={k} onClick={() => setF(k)} className={`shrink-0 rounded-full px-4 py-2 text-sm transition ${f === k ? "bg-kin" : "bg-white/5 text-white/60"}`}>{n}</button>)}</div>
    {!rows.length && <Card className="py-10 text-center text-white/50">No activity here yet.</Card>}
    {_.map(days, (list, day) => <Card key={day}><div className="mb-1 text-sm text-white/50">{day}</div>{list.map((t, i) => { const I = TX[t.type][1]; return <div key={i} className="flex items-center gap-3 border-b border-white/5 py-3 text-sm last:border-0"><span className="rounded-xl bg-white/5 p-2.5"><I size={16} /></span><div className="flex-1"><div>{label(t)}</div><div className="text-xs text-white/40">{new Date(t.at).toLocaleTimeString([], { timeStyle: "short" })}</div></div><span className={t.in ? "text-emerald-400" : "text-rose-400"}>{M(hide, `${t.in ? "+" : "-"}${fmt(t.amt, 8)} ${t.asset}`)}</span></div>; })}</Card>)}</div>;
}
function Cfg({ user, me, hide, setHide }) {
  const [open, setOpen] = useState(false), [txt, setTxt] = useState(""), [err, setErr] = useState(""), u = me?.u;
  const del = async () => { try { await api("delete", { confirm: txt }); signOut({ callbackUrl: "/" }); } catch (e) { setErr(e.message); } };
  const R = ({ a, b }) => <div className="flex justify-between gap-4 py-2.5 text-sm"><span className="text-white/60">{a}</span><span className="break-all text-right">{b}</span></div>;
  return <div className="space-y-4"><Card className="divide-y divide-white/5"><R a="Name" b={u?.name} /><R a="Email" b={u?.email} /><R a="User ID" b={u?.uid} /><R a="Member since" b={u?.since ? new Date(u.since).toLocaleDateString(undefined, { dateStyle: "long" }) : ""} /></Card>
    <Card><button onClick={() => setHide(!hide)} className="flex w-full items-center justify-between"><span className="text-left"><div className="font-semibold">Hide balances</div><div className="text-sm text-white/50">Mask amounts across the app</div></span><span className={`flex h-7 w-12 items-center rounded-full p-1 transition ${hide ? "bg-kin" : "bg-white/15"}`}><motion.span layout transition={{ type: "spring", stiffness: 500, damping: 30 }} className={`h-5 w-5 rounded-full bg-white ${hide ? "ml-auto" : ""}`} /></span></button></Card>
    <Btn c="bg-white/10" onClick={() => signOut({ callbackUrl: "/" })}><span className="flex items-center justify-center gap-2"><LogOut size={16} />Sign out</span></Btn>
    <Btn c="bg-rose-500/15 text-rose-300 ring-1 ring-rose-500/30" onClick={() => setOpen(true)}><span className="flex items-center justify-center gap-2"><Trash2 size={16} />Delete account</span></Btn>
    <AnimatePresence>{open && <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-30 grid place-items-end bg-black/70 p-4 sm:place-items-center" onClick={() => setOpen(false)}>
      <motion.div initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 40, opacity: 0 }} onClick={(e) => e.stopPropagation()} className="w-full max-w-sm space-y-3 rounded-3xl bg-[#14102a] p-6 ring-1 ring-white/10">
        <div className="text-lg font-semibold">Delete your account?</div><div className="text-sm text-white/60">This permanently removes your account and your ID {u?.uid}. You need a zero balance, no withdrawal in progress and no unopened red packets. Your deposit address stops working, so do not send funds to it afterwards.</div>
        <In placeholder="Type DELETE to confirm" value={txt} onChange={(e) => setTxt(e.target.value)} />{err && <div className="text-sm text-rose-300">{err}</div>}
        <Btn c="bg-rose-500" disabled={txt !== "DELETE"} onClick={del}>Delete my account</Btn><Btn c="bg-white/10" onClick={() => setOpen(false)}>Keep my account</Btn></motion.div></motion.div>}</AnimatePresence></div>;
}
export default function ProfileTab({ user, me, px, hide, setHide, reload }) {
  const [view, setView] = useState("home"), st = me?.st || {}, u = me?.u, back = () => setView("home");
  const stat = (n, v) => <div className="rounded-2xl bg-white/[.04] p-3.5 ring-1 ring-white/10"><div className="text-xs text-white/50">{n}</div><div className="mt-1 truncate font-semibold">{M(hide, fmt(v))}</div></div>;
  const views = { pay: ["KIN Pay", <Pay me={me} reload={reload} />], packets: ["Red packets", <Packets me={me} reload={reload} />], history: ["History", <Hist me={me} hide={hide} />], settings: ["Settings", <Cfg user={user} me={me} hide={hide} setHide={setHide} />] };
  return <AnimatePresence mode="wait"><motion.div key={view} initial={{ opacity: 0, x: view === "home" ? -20 : 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.18 }}>
    {view !== "home" ? <Sub title={views[view][0]} back={back}>{views[view][1]}</Sub> :
      <div className="mx-auto max-w-lg space-y-5"><div className="relative flex flex-col items-center pt-2 text-center">
        <button aria-label="Settings" onClick={() => setView("settings")} className="absolute right-0 top-0 rounded-xl bg-white/5 p-3 ring-1 ring-white/10 transition hover:bg-white/10"><Settings size={18} /></button>
        {user.image ? <img src={user.image} referrerPolicy="no-referrer" alt="" className="h-24 w-24 rounded-full ring-4 ring-kin/40" /> : <div className="grid h-24 w-24 place-items-center rounded-full bg-kin text-3xl font-bold">{(user.name || "V")[0]}</div>}
        <div className="mt-3 text-xl font-bold">{user.name}</div><div className="mt-2 w-44"><Copyable text={user.uid} label={`ID ${user.uid}`} /></div></div>
        <div className="grid grid-cols-3 gap-3">{stat("Portfolio (USDT)", portfolio(u?.bal || {}, px))}{stat("Deposited", st.deposit || 0)}{stat("Withdrawn", st.withdraw || 0)}</div>
        <div className="space-y-3"><Item I={Send} t="KIN Pay" d="Send money to any VOIDKIN ID" onClick={() => setView("pay")} /><Item I={Gift} t="Red packets" d="Create one or open a code" onClick={() => setView("packets")} /><Item I={History} t="History" d="Trades, deposits, withdrawals and transfers" onClick={() => setView("history")} /></div></div>}
  </motion.div></AnimatePresence>;
}
