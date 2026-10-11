"use client";
import { useEffect, useState, useCallback } from "react";
import { signIn, useSession } from "next-auth/react";
import { motion, AnimatePresence } from "framer-motion";
import _ from "lodash";
import { BarChart3, ArrowLeftRight, Wallet, User, Eye, EyeOff } from "lucide-react";
import { api, fmt, M, Coin, In, Btn, Card, useAct, Msg } from "./ui";
import WalletTab from "./Wallet";
import ProfileTab from "./Profile";
const TABS = [["market", "Market", BarChart3], ["trade", "Trade", ArrowLeftRight], ["wallet", "Wallet", Wallet], ["me", "Profile", User]];

function Chart({ k, up }) {
  const [h, setH] = useState(null);
  if (!k?.length) return <div className="h-56 animate-pulse rounded-xl bg-white/5" />;
  const mn = Math.min(...k), mx = Math.max(...k), W = 600, H = 200, c = up ? "#2ee59d" : "#ff5470";
  const y = (v) => H - ((v - mn) / (mx - mn || 1)) * (H - 24) - 12, x = (i) => (i / (k.length - 1)) * W;
  const pts = k.map((v, i) => `${x(i)},${y(v)}`).join(" "), i = h ?? k.length - 1;
  return (<div className="relative"><div className="absolute left-0 top-0 text-sm text-white/60">{fmt(k[i])} USDT</div>
    <svg viewBox={`0 0 ${W} ${H}`} className="h-56 w-full cursor-crosshair pt-5" onMouseMove={(e) => { const r = e.currentTarget.getBoundingClientRect(); setH(Math.max(0, Math.min(k.length - 1, Math.round(((e.clientX - r.left) / r.width) * (k.length - 1))))); }} onMouseLeave={() => setH(null)}>
      <defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={c} stopOpacity=".35" /><stop offset="1" stopColor={c} stopOpacity="0" /></linearGradient></defs>
      <polygon points={`0,${H} ${pts} ${W},${H}`} fill="url(#g)" /><polyline points={pts} fill="none" stroke={c} strokeWidth="2" vectorEffect="non-scaling-stroke" />
      {h !== null && <g><line x1={x(h)} x2={x(h)} y1="0" y2={H} stroke="#fff3" /><circle cx={x(h)} cy={y(k[h])} r="4" fill={c} /></g>}</svg></div>);
}
function Landing() {
  return (<main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center px-6 text-center">
    <motion.img initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} src="/logo.jpg" alt="VOIDKIN" className="mb-8 h-28 w-28 rounded-3xl mix-blend-screen" />
    <h1 className="text-4xl font-bold tracking-tight">VOIDKIN</h1><p className="mt-3 text-white/60">Trade spot markets, pay anyone by their 6-digit ID, and send red packets to your people.</p>
    <button onClick={() => signIn("google")} className="mt-10 w-full rounded-xl bg-white py-3.5 font-semibold text-black transition active:scale-[.98] hover:bg-white/90">Continue with Google</button></main>);
}
function App({ user }) {
  const [tab, setTab] = useState("market"), [sym, setSym] = useState("BTC"), [iv, setIv] = useState("15m"), [mk, setMk] = useState({ t: [], k: null }), [me, setMe] = useState(null), [hide, setHideS] = useState(false), [f, setF] = useState({ side: "buy" });
  const loadMe = useCallback(() => api("me").then(setMe).catch(() => {}), []), [msg, act, setMsg] = useAct(loadMe);
  const setHide = (v) => { setHideS(v); localStorage.setItem("vk-hide", v ? "1" : "0"); };
  useEffect(() => setHideS(localStorage.getItem("vk-hide") === "1"), []);
  useEffect(() => { loadMe(); const t = setInterval(loadMe, 10000); return () => clearInterval(t); }, [loadMe]);
  useEffect(() => { const go = () => api(`market?s=${sym}&i=${iv}`).then(setMk).catch(() => {}); go(); const t = setInterval(go, 5000); return () => clearInterval(t); }, [sym, iv]);
  const px = _.fromPairs(mk.t.map((x) => [x.s, x.p])), bal = me?.u.bal || {}, tk = mk.t.find((x) => x.s === sym), up = (tk?.c ?? 0) >= 0;
  const chartBlock = <Card><div className="mb-3 flex items-end justify-between"><div className="flex items-center gap-3"><Coin s={sym} size={36} /><div><div className="text-sm text-white/60">{sym}/USDT</div><div className="text-3xl font-bold">{tk ? fmt(tk.p) : "-"}</div></div></div><div className={up ? "text-emerald-400" : "text-rose-400"}>{tk ? `${up ? "+" : ""}${tk.c.toFixed(2)}%` : ""}</div></div>
    <Chart k={mk.k} up={up} /><div className="mt-3 flex gap-2">{["15m", "1h", "4h", "1d"].map((x) => <button key={x} onClick={() => setIv(x)} className={`rounded-lg px-3 py-1.5 text-sm transition ${iv === x ? "bg-kin" : "bg-white/5 hover:bg-white/10"}`}>{x}</button>)}</div></Card>;
  const go = (id) => { setTab(id); setMsg(null); };
  return (<div className="mx-auto max-w-5xl px-4 pb-36 pt-5 md:pb-10">
    <header className="mb-6 flex items-center gap-3"><img src="/logo.jpg" alt="" className="h-10 w-10 rounded-xl mix-blend-screen" /><div className="text-xl font-bold">VOIDKIN</div>
      <button aria-label={hide ? "Show balances" : "Hide balances"} onClick={() => setHide(!hide)} className="ml-auto rounded-xl bg-white/5 p-3 ring-1 ring-white/10 transition hover:bg-white/10">{hide ? <EyeOff size={18} /> : <Eye size={18} />}</button></header>
    <nav className="fixed inset-x-4 bottom-[calc(env(safe-area-inset-bottom)+14px)] z-20 mx-auto flex max-w-md items-stretch rounded-[28px] bg-[#130e26]/90 p-2 shadow-2xl shadow-black/60 ring-1 ring-white/10 backdrop-blur-xl md:static md:mb-6 md:max-w-none md:justify-start md:gap-2 md:rounded-2xl md:bg-transparent md:p-0 md:shadow-none md:ring-0">
      {TABS.map(([id, n, I]) => { const on = tab === id; return <button key={id} onClick={() => go(id)} className={`relative flex h-16 flex-1 flex-col items-center justify-center gap-1 rounded-3xl transition-colors md:h-auto md:flex-none md:flex-row md:gap-2 md:rounded-xl md:px-5 md:py-2.5 ${on ? "text-white" : "text-white/45 hover:text-white/80"}`}>
        {on && <motion.span layoutId="pill" transition={{ type: "spring", stiffness: 420, damping: 32 }} className="absolute inset-0 rounded-3xl bg-kin shadow-lg shadow-kin/40 md:rounded-xl" />}
        <motion.span animate={{ y: on ? -1 : 0, scale: on ? 1.12 : 1 }} transition={{ type: "spring", stiffness: 400, damping: 18 }} className="relative"><I size={24} strokeWidth={on ? 2.3 : 1.8} /></motion.span><span className="relative text-xs font-medium">{n}</span></button>; })}</nav>
    <div className="mb-4"><Msg m={msg} /></div>
    <AnimatePresence mode="wait"><motion.div key={tab} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.18 }}>
      {tab === "market" && <div className="grid gap-4 md:grid-cols-5"><div className="md:col-span-3">{chartBlock}</div>
        <Card className="md:col-span-2"><div className="mb-2 text-sm text-white/60">Markets (USDT)</div>{mk.t.map((x) => <button key={x.s} onClick={() => setSym(x.s)} className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 transition ${sym === x.s ? "bg-kin/20" : "hover:bg-white/5"}`}><Coin s={x.s} /><span className="flex-1 text-left font-semibold">{x.s}</span><span className="text-right"><div>{fmt(x.p)}</div><div className={`text-xs ${x.c >= 0 ? "text-emerald-400" : "text-rose-400"}`}>{x.c >= 0 ? "+" : ""}{x.c.toFixed(2)}%</div></span></button>)}</Card></div>}
      {tab === "trade" && <div className="grid gap-4 md:grid-cols-5"><div className="md:col-span-3">{chartBlock}</div>
        <Card className="space-y-3 md:col-span-2"><div className="grid grid-cols-2 gap-2">{["buy", "sell"].map((s) => <button key={s} onClick={() => setF((x) => ({ ...x, side: s }))} className={`rounded-xl py-2.5 font-semibold capitalize transition ${f.side === s ? (s === "buy" ? "bg-emerald-500 text-black" : "bg-rose-500") : "bg-white/5"}`}>{s} {sym}</button>)}</div>
          <select value={sym} onChange={(e) => setSym(e.target.value)} className="w-full rounded-xl bg-[#17122a] px-3.5 py-3 ring-1 ring-white/10">{mk.t.map((x) => <option key={x.s}>{x.s}</option>)}</select>
          <In type="number" placeholder={f.side === "buy" ? "Amount to spend (USDT)" : `Amount to sell (${sym})`} value={f.amt || ""} onChange={(e) => setF((x) => ({ ...x, amt: e.target.value }))} />
          <div className="text-sm text-white/60">Available: {M(hide, fmt(bal[f.side === "buy" ? "USDT" : sym] || 0, 8))} {f.side === "buy" ? "USDT" : sym}{tk && f.amt > 0 && <> - You get about {fmt(f.side === "buy" ? (f.amt / tk.p) * 0.999 : f.amt * tk.p * 0.999, 6)} {f.side === "buy" ? sym : "USDT"} after the 0.1% fee</>}</div>
          <Btn c={f.side === "buy" ? "bg-emerald-500 text-black" : "bg-rose-500"} onClick={() => act("trade", { s: sym, side: f.side, amt: f.amt }, (r) => `Order filled at ${fmt(r.p)} USDT`)}>{f.side === "buy" ? "Buy" : "Sell"} {sym} at market</Btn></Card></div>}
      {tab === "wallet" && <WalletTab me={me} px={px} hide={hide} reload={loadMe} />}
      {tab === "me" && <ProfileTab user={user} me={me} px={px} hide={hide} setHide={setHide} reload={loadMe} />}
    </motion.div></AnimatePresence></div>);
}
export default function Page() {
  const { data, status } = useSession();
  if (status === "loading") return <div className="grid min-h-screen place-items-center"><img src="/logo.jpg" alt="" className="h-16 w-16 animate-pulse rounded-2xl mix-blend-screen" /></div>;
  return data?.user?.uid ? <App user={data.user} /> : <Landing />;
}
