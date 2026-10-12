"use client";
import { useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import _ from "lodash";
import { ArrowDownLeft, ArrowUpRight, Plus, Eye, EyeOff, ChevronLeft, ChevronRight, Search } from "lucide-react";
import { COINS, ASSETS } from "@/lib/ledger";
import { api, fmt, M, portfolio, Coin, In, Btn, Card, Copyable } from "./ui";
const Row = ({ a, b, strong }) => <div className="flex justify-between gap-4 py-2.5 text-sm"><span className="text-ink/50">{a}</span><span className={`text-right ${strong ? "font-bold" : "font-medium"}`}>{b}</span></div>;
const Pill = ({ I, children, ...p }) => <button {...p} className="flex h-12 items-center gap-2 rounded-full bg-white/10 px-5 text-sm font-medium text-white ring-1 ring-white/15 transition hover:bg-white/15 active:scale-95"><I size={16} />{children}</button>;

export default function WalletTab({ me, user, px, chg, hide, setHide, reload, go, openPair }) {
  const [flow, setFlow] = useState(null), [step, setStep] = useState(0), [coin, setCoin] = useState(null), [chain, setChain] = useState(null);
  const [q, setQ] = useState(""), [addr, setAddr] = useState(""), [amt, setAmt] = useState(""), [err, setErr] = useState(""), [busy, setBusy] = useState(false), [code, setCode] = useState("");
  const bal = me?.u.bal || {}, lock = me?.u.lock || {}, price = (a) => (a === "USDT" ? 1 : px[a] || 0), total = portfolio(bal, px, lock);
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

  if (!flow) {
    const rows = _.orderBy(ASSETS, [(a) => price(a) * ((bal[a] || 0) + (lock[a] || 0)), (a) => (a === "USDT" ? 1 : 0)], ["desc", "desc"]);
    const [ip, dp] = total.toFixed(2).split(".");
    return (<div className="space-y-6">
      <div className="overflow-hidden rounded-[32px] bg-gradient-to-b from-[#3b3b42] via-[#15151a] to-black p-5 text-white">
        <div className="flex items-center justify-between">
          <button aria-label="Open profile" onClick={() => go("me")} className="h-11 w-11 overflow-hidden rounded-full bg-white/15 ring-2 ring-white/20">{user.image ? <img src={user.image} referrerPolicy="no-referrer" alt="" className="h-full w-full object-cover" /> : <span className="font-bold">{(user.name || "V")[0]}</span>}</button>
          <div className="rounded-full bg-white/10 px-3.5 py-1.5 text-xs font-medium text-white/80">Spot wallet</div>
          <button aria-label={hide ? "Show balances" : "Hide balances"} onClick={() => setHide(!hide)} className="grid h-11 w-11 place-items-center rounded-full bg-white/10 ring-1 ring-white/15">{hide ? <EyeOff size={18} /> : <Eye size={18} />}</button></div>
        <div className="mt-9 text-center"><div className="text-sm text-white/50">Total balance</div>
          <div className="mt-1 text-5xl font-bold tracking-tight">{hide ? "••••••" : <>${Number(ip).toLocaleString()}<span className="text-white/35">.{dp}</span></>}</div>
          <div className="mt-2 text-sm text-white/50">{hide ? "••••" : `≈ ${px.BTC ? (total / px.BTC).toFixed(6) : "0"} BTC`}</div></div>
        <div className="mt-9 flex items-center justify-center gap-3"><Pill I={ArrowDownLeft} onClick={() => reset("deposit")}>Deposit</Pill>
          <button aria-label="Trade" onClick={() => go("trade")} className="grid h-14 w-14 place-items-center rounded-full bg-white text-ink transition active:scale-95"><Plus size={26} /></button>
          <Pill I={ArrowUpRight} onClick={() => reset("withdraw")}>Withdraw</Pill></div>
        <div className="mt-7 flex justify-center"><span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-xs text-white/80"><span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />Live prices</span></div></div>
      <div><div className="mb-3 flex items-baseline justify-between"><h2 className="text-lg font-bold">Portfolio</h2><span className="text-sm text-ink/45">{ASSETS.length} assets</span></div>
        <div className="space-y-2">{rows.map((a) => { const have = (bal[a] || 0) + (lock[a] || 0), c = chg[a];
          return <button key={a} onClick={() => a !== "USDT" && openPair(a)} className="flex w-full items-center gap-3 rounded-3xl bg-mist p-4 text-left transition active:scale-[.99]"><Coin s={a} size={40} />
            <div className="min-w-0 flex-1"><div className="font-bold">{COINS[a].name}</div><div className="text-xs text-ink/45">{M(hide, `${fmt(have, 8)} ${a}`)}{(lock[a] || 0) > 0 && <span className="text-amber-600"> {M(hide, `(${fmt(lock[a], 8)} in orders)`)}</span>}</div></div>
            <div className="text-right"><div className="font-bold">{M(hide, "$" + fmt(price(a) * have))}</div>{a !== "USDT" && c !== undefined && <div className={`text-xs font-semibold ${c >= 0 ? "text-up" : "text-down"}`}>{c >= 0 ? "+" : ""}{c.toFixed(2)}%</div>}</div></button>; })}</div></div></div>);
  }

  const titles = flow === "deposit" ? ["Select coin to deposit", "Select network", `Deposit ${coin}`] : ["Select coin to withdraw", "Select network", `Withdraw ${coin}`, "Confirm withdrawal", ""];
  const list = _.filter(ASSETS, (a) => _.includes((a + COINS[a].name).toLowerCase(), q.toLowerCase()));
  return (<div className="space-y-5">
    <div className="flex items-center gap-3">{step < 4 && <button aria-label="Back" onClick={() => (step === 0 ? reset() : setStep(step - 1))} className="rounded-full bg-mist p-2.5"><ChevronLeft size={18} /></button>}<h2 className="text-xl font-bold">{titles[step]}</h2></div>
    <div key={step} className="rise">
      {step === 0 && <div className="space-y-3"><div className="relative"><Search size={16} className="absolute left-4 top-4 text-ink/35" /><In className="pl-11" placeholder="Search coin" value={q} onChange={(e) => setQ(e.target.value)} /></div>
        <div className="space-y-1">{list.map((a) => { const open = COINS[a].chains.length > 0; return <button key={a} disabled={!open} onClick={() => { setCoin(a); setStep(1); }} className="flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left transition enabled:hover:bg-mist disabled:opacity-40"><Coin s={a} size={36} /><div className="flex-1"><div className="font-bold">{a}</div><div className="text-xs text-ink/45">{COINS[a].name}</div></div>
          {open ? <span className="text-sm text-ink/50">{flow === "withdraw" ? M(hide, fmt(bal[a] || 0, 8)) : ""}</span> : <span className="text-xs text-ink/45">Not open yet</span>}{open && <ChevronRight size={16} className="text-ink/30" />}</button>; })}
          {!list.length && <div className="py-8 text-center text-ink/45">No coin matches your search.</div>}</div></div>}
      {step === 1 && <div className="space-y-2">{COINS[coin].chains.map((c) => <button key={c.id} onClick={() => { setChain(c); setStep(2); }} className="flex w-full items-center gap-3 rounded-3xl bg-mist p-4 text-left transition active:scale-[.99]"><div className="flex-1"><div className="font-bold">{c.name}</div><div className="text-xs text-ink/45">{flow === "deposit" ? `Arrives after ${c.conf} confirmations` : `Network fee ${c.fee} ${coin}, minimum ${c.min} ${coin}`}</div></div><ChevronRight size={16} className="text-ink/30" /></button>)}</div>}
      {step === 2 && flow === "deposit" && <div className="space-y-4"><div className="rounded-3xl bg-mist p-6 text-center"><div className="mx-auto w-fit rounded-2xl bg-white p-3 ring-1 ring-line"><QRCodeSVG value={me.u.addr} size={176} level="M" /></div><div className="mt-4 text-sm text-ink/50">{coin} deposit address on {chain.name}</div></div>
        <Copyable text={me.u.addr} /><div className="rounded-2xl bg-amber-50 p-4 text-sm text-amber-800">Send only {coin} on {chain.name} to this address. Other coins or networks cannot be recovered. Minimum deposit is {chain.dmin} {coin}; smaller amounts are not credited. Deposits are credited after {chain.conf} confirmations.</div></div>}
      {step === 2 && flow === "withdraw" && <div className="space-y-3"><In placeholder={`${chain.name} address (0x...)`} value={addr} onChange={(e) => setAddr(e.target.value.trim())} />
        <div className="relative"><In type="number" placeholder={`Amount (min ${chain.min})`} value={amt} onChange={(e) => setAmt(e.target.value)} /><button onClick={() => setAmt(String(bal[coin] || 0))} className="absolute right-4 top-3.5 text-sm font-bold text-kin">Max</button></div>
        {me?.u.twofa ? <In inputMode="numeric" maxLength={6} placeholder="Authenticator code (6 digits)" value={code} onChange={(e) => setCode(e.target.value)} /> : <div className="rounded-2xl bg-amber-50 p-4 text-sm text-amber-800">Turn on two-factor authentication in Profile, then Settings, to withdraw.</div>}
        <div className="divide-y divide-line rounded-3xl bg-mist px-5"><Row a="Available" b={`${M(hide, fmt(bal[coin] || 0, 8))} ${coin}`} /><Row a="Network fee" b={`${fee} ${coin}`} /><Row a="You will receive" b={`${fmt(net, 8)} ${coin}`} strong /></div>
        {err && <div className="text-sm font-medium text-down">{err}</div>}<Btn disabled={!me?.u.twofa} onClick={review}>Continue</Btn></div>}
      {step === 3 && <div className="space-y-3"><div className="divide-y divide-line rounded-3xl bg-mist px-5"><Row a="Coin" b={coin} /><Row a="Network" b={chain.name} /><Row a="Address" b={<span className="break-all">{addr}</span>} /><Row a="Amount" b={`${fmt(+amt, 8)} ${coin}`} /><Row a="Network fee" b={`${fee} ${coin}`} /><Row a="You will receive" b={`${fmt(net, 8)} ${coin}`} strong /></div>
        {err && <div className="text-sm font-medium text-down">{err}</div>}<Btn disabled={busy} onClick={submit}>{busy ? "Submitting..." : "Confirm withdrawal"}</Btn></div>}
      {step === 4 && <div className="space-y-4 py-8 text-center"><svg viewBox="0 0 52 52" className="mx-auto h-24 w-24"><circle cx="26" cy="26" r="24" fill="#0ea66b1a" /><path className="draw" d="M15 27l8 8 14-16" fill="none" stroke="#0ea66b" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" /></svg>
        <div className="text-2xl font-bold">Withdrawal submitted</div><div className="mx-auto max-w-xs text-sm text-ink/55">{fmt(net, 8)} {coin} will be sent to {addr.slice(0, 8)}...{addr.slice(-6)} after review. Track it in your history.</div><Btn onClick={() => reset()}>Done</Btn></div>}
    </div></div>);
}
