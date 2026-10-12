"use client";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { QRCodeSVG } from "qrcode.react";
import _ from "lodash";
import { ArrowDownToLine, ArrowUpFromLine, ChevronLeft, ChevronRight, Search } from "lucide-react";
import { COINS, ASSETS } from "@/lib/ledger";
import { api, fmt, M, portfolio, Coin, In, Btn, Card, Copyable } from "./ui";
const slide = { initial: { opacity: 0, x: 24 }, animate: { opacity: 1, x: 0 }, exit: { opacity: 0, x: -24 }, transition: { duration: 0.2 } };
const Row = ({ a, b, strong }) => <div className="flex justify-between gap-4 py-2 text-sm"><span className="text-white/60">{a}</span><span className={strong ? "font-semibold" : ""}>{b}</span></div>;

export default function WalletTab({ me, px, hide, reload }) {
  const [flow, setFlow] = useState(null), [step, setStep] = useState(0), [coin, setCoin] = useState(null), [chain, setChain] = useState(null);
  const [q, setQ] = useState(""), [addr, setAddr] = useState(""), [amt, setAmt] = useState(""), [err, setErr] = useState(""), [busy, setBusy] = useState(false), [code, setCode] = useState("");
  const bal = me?.u.bal || {}, price = (a) => (a === "USDT" ? 1 : px[a] || 0);
  const reset = (f = null) => { setFlow(f); setStep(0); setCoin(null); setChain(null); setAddr(""); setAmt(""); setErr(""); setQ(""); setCode(""); };
  const fee = chain?.fee ?? 0, net = Math.max(0, (+amt || 0) - fee);
  const review = () => {
    if (!/^0x[a-fA-F0-9]{40}$/.test(addr)) return setErr("Enter a valid BNB Smart Chain address");
    if (!(+amt >= chain.min)) return setErr(`Minimum withdrawal is ${chain.min} ${coin}`);
    if (+amt > (bal[coin] || 0)) return setErr("That is more than your available balance");
    if (!/^\d{6}$/.test(code)) return setErr("Enter the 6-digit code from your authenticator app");
    setErr(""); setStep(3);
  };
  const submit = async () => { setBusy(true); setErr(""); try { await api("withdraw", { asset: coin, chain: chain.id, address: addr, amt, code }); reload(); setStep(4); } catch (e) { setErr(e.message); } setBusy(false); };

  if (!flow) return (<div className="space-y-4">
    <Card className="bg-gradient-to-br from-kin/30 to-transparent">
      <div className="text-sm text-white/60">Estimated balance</div>
      <div className="mt-1 text-4xl font-bold">{M(hide, fmt(portfolio(bal, px, me?.u.lock)))} <span className="text-lg text-white/50">USDT</span></div>
      <div className="mt-5 grid grid-cols-2 gap-3"><Btn onClick={() => reset("deposit")}>Deposit</Btn><Btn c="bg-white/10" onClick={() => reset("withdraw")}>Withdraw</Btn></div></Card>
    <Card><div className="mb-2 text-sm text-white/60">Your assets</div>
      {ASSETS.map((a) => <div key={a} className="flex items-center gap-3 border-b border-white/5 py-3 last:border-0"><Coin s={a} /><div className="flex-1"><div className="font-semibold">{a}</div><div className="text-xs text-white/50">{COINS[a].name}</div></div>
        <div className="text-right"><div>{M(hide, fmt((bal[a] || 0) + (me?.u.lock?.[a] || 0), 8))}</div>{(me?.u.lock?.[a] || 0) > 0 && <div className="text-xs text-amber-300">{M(hide, fmt(me.u.lock[a], 8))} in open orders</div>}<div className="text-xs text-white/50">{M(hide, "≈ " + fmt(price(a) * ((bal[a] || 0) + (me?.u.lock?.[a] || 0))) + " USDT")}</div></div></div>)}</Card></div>);

  const titles = flow === "deposit" ? ["Select coin to deposit", "Select network", `Deposit ${coin}`] : ["Select coin to withdraw", "Select network", `Withdraw ${coin}`, "Confirm withdrawal", ""];
  const list = _.filter(ASSETS, (a) => _.includes((a + COINS[a].name).toLowerCase(), q.toLowerCase()));
  return (<div className="mx-auto max-w-lg space-y-4">
    <div className="flex items-center gap-2">{step < 4 && <button aria-label="Back" onClick={() => (step === 0 ? reset() : setStep(step - 1))} className="rounded-xl bg-white/5 p-2.5 ring-1 ring-white/10"><ChevronLeft size={18} /></button>}<h2 className="text-lg font-semibold">{titles[step]}</h2></div>
    <AnimatePresence mode="wait"><motion.div key={step} {...slide}>
      {step === 0 && <Card className="space-y-3"><div className="relative"><Search size={16} className="absolute left-3.5 top-4 text-white/40" /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search coin" className="w-full rounded-xl bg-white/5 py-3 pl-10 pr-3 outline-none ring-1 ring-white/10 focus:ring-2 focus:ring-kin" /></div>
        {list.map((a) => { const open = COINS[a].chains.length > 0; return <button key={a} disabled={!open} onClick={() => { setCoin(a); setStep(1); }} className="flex w-full items-center gap-3 rounded-xl px-2 py-3 text-left transition enabled:hover:bg-white/5 disabled:opacity-40"><Coin s={a} /><div className="flex-1"><div className="font-semibold">{a}</div><div className="text-xs text-white/50">{COINS[a].name}</div></div>
          {open ? <span className="text-sm text-white/60">{flow === "withdraw" ? M(hide, fmt(bal[a] || 0, 8)) : ""}</span> : <span className="text-xs text-white/50">Not open yet</span>}{open && <ChevronRight size={16} className="text-white/40" />}</button>; })}
        {!list.length && <div className="py-6 text-center text-white/50">No coin matches your search.</div>}</Card>}
      {step === 1 && <Card className="space-y-2">{COINS[coin].chains.map((c) => <button key={c.id} onClick={() => { setChain(c); setStep(2); }} className="flex w-full items-center gap-3 rounded-xl bg-white/5 p-4 text-left ring-1 ring-white/10 transition hover:ring-kin"><div className="flex-1"><div className="font-semibold">{c.name}</div><div className="text-xs text-white/50">{flow === "deposit" ? `Arrives after ${c.conf} confirmations` : `Network fee ${c.fee} ${coin}, minimum ${c.min} ${coin}`}</div></div><ChevronRight size={16} className="text-white/40" /></button>)}</Card>}
      {step === 2 && flow === "deposit" && <Card className="space-y-4 text-center"><div className="mx-auto w-fit rounded-2xl bg-white p-3"><QRCodeSVG value={me.u.addr} size={176} level="M" /></div>
        <div className="text-sm text-white/60">{coin} deposit address on {chain.name}</div><Copyable text={me.u.addr} />
        <div className="rounded-xl bg-amber-400/10 p-3 text-left text-sm text-amber-200 ring-1 ring-amber-400/20">Send only {coin} on {chain.name} to this address. Other coins or networks cannot be recovered. Minimum deposit is {chain.dmin} {coin}; smaller amounts are not credited. Deposits are credited after {chain.conf} confirmations.</div></Card>}
      {step === 2 && flow === "withdraw" && <Card className="space-y-3"><In placeholder={`${chain.name} address (0x...)`} value={addr} onChange={(e) => setAddr(e.target.value.trim())} />
        <div className="relative"><In type="number" placeholder={`Amount (min ${chain.min})`} value={amt} onChange={(e) => setAmt(e.target.value)} /><button onClick={() => setAmt(String(bal[coin] || 0))} className="absolute right-3 top-3 text-sm font-semibold text-kin">Max</button></div>
        {me?.u.twofa ? <In inputMode="numeric" maxLength={6} placeholder="Authenticator code (6 digits)" value={code} onChange={(e) => setCode(e.target.value)} /> : <div className="rounded-xl bg-amber-400/10 p-3 text-sm text-amber-200 ring-1 ring-amber-400/20">Turn on two-factor authentication in Profile, then Settings, to withdraw.</div>}<div className="divide-y divide-white/5"><Row a="Available" b={`${M(hide, fmt(bal[coin] || 0, 8))} ${coin}`} /><Row a="Network fee" b={`${fee} ${coin}`} /><Row a="You will receive" b={`${fmt(net, 8)} ${coin}`} strong /></div>
        {err && <div className="text-sm text-rose-300">{err}</div>}<Btn disabled={!me?.u.twofa} onClick={review}>Continue</Btn></Card>}
      {step === 3 && <Card className="space-y-3"><div className="divide-y divide-white/5"><Row a="Coin" b={coin} /><Row a="Network" b={chain.name} /><Row a="Address" b={<span className="break-all text-right">{addr}</span>} /><Row a="Amount" b={`${fmt(+amt, 8)} ${coin}`} /><Row a="Network fee" b={`${fee} ${coin}`} /><Row a="You will receive" b={`${fmt(net, 8)} ${coin}`} strong /></div>
        {err && <div className="text-sm text-rose-300">{err}</div>}<Btn disabled={busy} onClick={submit}>{busy ? "Submitting..." : "Confirm withdrawal"}</Btn></Card>}
      {step === 4 && <Card className="space-y-4 py-8 text-center"><svg viewBox="0 0 52 52" className="mx-auto h-20 w-20"><circle cx="26" cy="26" r="24" fill="none" stroke="#2ee59d33" strokeWidth="3" /><motion.path d="M15 27l8 8 14-16" fill="none" stroke="#2ee59d" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.5, delay: 0.1 }} /></svg>
        <div className="text-xl font-semibold">Withdrawal submitted</div><div className="text-sm text-white/60">{fmt(net, 8)} {coin} is on its way to {addr.slice(0, 8)}...{addr.slice(-6)} after review. Track it in your history.</div><Btn onClick={() => reset()}>Done</Btn></Card>}
    </motion.div></AnimatePresence></div>);
}
