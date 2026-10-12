"use client";
import { useEffect, useState, useCallback } from "react";
import { signIn, useSession } from "next-auth/react";
import { motion } from "framer-motion";
import _ from "lodash";
import { Wallet, BarChart3, ArrowLeftRight, User, Send, Gift } from "lucide-react";
import { api, fmt, vol, Coin, In } from "./ui";
import WalletTab from "./Wallet";
import TradeTab from "./Trade";
import ProfileTab from "./Profile";
const TABS = [["wallet", "Wallet", Wallet], ["market", "Market", BarChart3], ["trade", "Trade", ArrowLeftRight], ["me", "Profile", User]];

function Landing() {
  const feats = [[ArrowLeftRight, "Spot trading with live prices and an order book"], [Send, "KIN Pay: send money to any 6-digit ID"], [Gift, "Red packets for friends and groups"]];
  return (<main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-6">
    <img src="/logo.jpg" alt="VOIDKIN" className="rise h-24 w-24 self-start" />
    <h1 className="mt-6 text-4xl font-extrabold tracking-tight">Trade, pay and gift crypto.</h1><p className="mt-3 text-ink/55">One simple wallet for spot trading, instant transfers between friends, and red packets.</p>
    <div className="mt-8 space-y-3">{feats.map(([I, t]) => <div key={t} className="flex items-center gap-3 text-sm font-medium"><span className="rounded-xl bg-mist p-2.5"><I size={18} /></span>{t}</div>)}</div>
    <button onClick={() => signIn("google")} className="mt-10 w-full rounded-2xl bg-ink py-4 font-semibold text-white transition active:scale-[.98] hover:opacity-90">Continue with Google</button></main>);
}
function MarketTab({ mk, openPair }) {
  const [f, setF] = useState("all"), [q, setQ] = useState("");
  const base = f === "up" ? _.orderBy(_.filter(mk.t, (x) => x.c >= 0), "c", "desc") : f === "down" ? _.orderBy(_.filter(mk.t, (x) => x.c < 0), "c", "asc") : f === "vol" ? _.orderBy(mk.t, "v", "desc") : mk.t;
  const rows = _.filter(base, (x) => x.s.toLowerCase().includes(q.toLowerCase()));
  return (<div className="space-y-4"><h1 className="text-2xl font-bold">Markets</h1>
    <In placeholder="Search coin" value={q} onChange={(e) => setQ(e.target.value)} />
    <div className="no-scrollbar flex gap-2 overflow-x-auto">{[["all", "All"], ["up", "Gainers"], ["down", "Losers"], ["vol", "Volume"]].map(([k, n]) => <button key={k} onClick={() => setF(k)} className={`shrink-0 rounded-full px-4 py-2 text-sm font-semibold transition ${f === k ? "bg-ink text-white" : "bg-mist text-ink/60"}`}>{n}</button>)}</div>
    <div className="space-y-2">{!mk.t.length && [0, 1, 2, 3].map((i) => <div key={i} className="h-[72px] animate-pulse rounded-3xl bg-mist" />)}
      {rows.map((x) => <button key={x.s} onClick={() => openPair(x.s)} className="flex w-full items-center gap-3 rounded-3xl bg-mist p-4 text-left transition active:scale-[.99]"><Coin s={x.s} size={40} /><div className="flex-1"><div className="font-bold">{x.s}<span className="font-medium text-ink/40">/USDT</span></div><div className="text-xs text-ink/45">Volume {vol(x.v)}</div></div>
        <div className="text-right"><div className="font-bold">{fmt(x.p)}</div><div className={`mt-0.5 inline-block rounded-md px-1.5 py-0.5 text-xs font-semibold ${x.c >= 0 ? "bg-up/10 text-up" : "bg-down/10 text-down"}`}>{x.c >= 0 ? "+" : ""}{x.c.toFixed(2)}%</div></div></button>)}
      {mk.t.length > 0 && !rows.length && <div className="py-10 text-center text-ink/45">No coin matches your search.</div>}</div></div>);
}
function App({ user }) {
  const [tab, setTab] = useState("wallet"), [sym, setSym] = useState("BTC"), [iv, setIv] = useState("1h"), [mk, setMk] = useState({ t: [], k: null }), [me, setMe] = useState(null), [hide, setHideS] = useState(false);
  const loadMe = useCallback(() => api("me").then(setMe).catch(() => {}), []);
  const setHide = (v) => { setHideS(v); localStorage.setItem("vk-hide", v ? "1" : "0"); };
  useEffect(() => setHideS(localStorage.getItem("vk-hide") === "1"), []);
  useEffect(() => { loadMe(); const t = setInterval(loadMe, 10000); return () => clearInterval(t); }, [loadMe]);
  useEffect(() => { const go = () => api(`market?s=${sym}&i=${iv}`).then(setMk).catch(() => {}); go(); const t = setInterval(go, 5000); return () => clearInterval(t); }, [sym, iv]);
  const px = _.fromPairs(mk.t.map((x) => [x.s, x.p])), chg = _.fromPairs(mk.t.map((x) => [x.s, x.c])), openPair = (s) => { setSym(s); setTab("trade"); };
  return (<div className="mx-auto max-w-xl px-4 pb-36 pt-5">
    <header className="mb-5 flex items-center gap-2.5"><img src="/logo.jpg" alt="" className="h-9 w-9" /><div className="text-lg font-extrabold tracking-tight">VOIDKIN</div></header>
    {me?.u.frozen && <div className="mb-4 rounded-2xl bg-down/10 px-4 py-3 text-sm font-medium text-down">Your account is frozen. Trading, transfers and withdrawals are paused. Contact support to resolve it.</div>}
    <div key={tab} className="rise">
      {tab === "wallet" && <WalletTab me={me} user={user} px={px} chg={chg} hide={hide} setHide={setHide} reload={loadMe} go={setTab} openPair={openPair} />}
      {tab === "market" && <MarketTab mk={mk} openPair={openPair} />}
      {tab === "trade" && <TradeTab sym={sym} setSym={setSym} mk={mk} iv={iv} setIv={setIv} me={me} hide={hide} reload={loadMe} />}
      {tab === "me" && <ProfileTab user={user} me={me} px={px} hide={hide} setHide={setHide} reload={loadMe} />}
    </div>
    <nav className="fixed bottom-[calc(env(safe-area-inset-bottom)+14px)] left-1/2 z-30 flex -translate-x-1/2 gap-1 rounded-full bg-ink p-1.5 shadow-2xl shadow-black/25">
      {TABS.map(([id, n, I]) => { const on = tab === id; return <button key={id} onClick={() => setTab(id)} className={`relative flex h-14 w-[74px] flex-col items-center justify-center gap-0.5 rounded-full text-[11px] font-semibold transition-colors ${on ? "text-ink" : "text-white/55 hover:text-white"}`}>
        {on && <motion.span layoutId="nav" transition={{ type: "spring", stiffness: 420, damping: 32 }} className="absolute inset-0 rounded-full bg-white" />}<I size={20} strokeWidth={on ? 2.4 : 1.9} className="relative" /><span className="relative">{n}</span></button>; })}</nav></div>);
}
export default function Page() {
  const { data, status } = useSession();
  if (status === "loading") return <div className="grid min-h-screen place-items-center"><img src="/logo.jpg" alt="" className="h-16 w-16 animate-pulse" /></div>;
  return data?.user?.uid ? <App user={data.user} /> : <Landing />;
}
