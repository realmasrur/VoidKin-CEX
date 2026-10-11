"use client";
import { useEffect, useState, useCallback } from "react";
import { signIn, signOut, useSession } from "next-auth/react";
import { BarChart3, ArrowLeftRight, Wallet, Send, Gift, Copy, LogOut, Check, ArrowDownToLine, ArrowUpFromLine } from "lucide-react";
const api = (a, body) => fetch("/api/" + a, body ? { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) } : {}).then(async (r) => { const j = await r.json(); if (!r.ok) throw new Error(j.error); return j; });
const fmt = (n, d = 2) => (+n).toLocaleString(undefined, { maximumFractionDigits: n < 1 ? 6 : d });
const ASSETS = ["USDT", "BTC", "ETH", "BNB", "SOL", "XRP", "DOGE"];
const TABS = [["market", "Market", BarChart3], ["trade", "Trade", ArrowLeftRight], ["wallet", "Wallet", Wallet], ["pay", "KIN Pay", Send], ["packets", "Red packets", Gift]];
const In = (p) => <input {...p} className="w-full rounded-xl bg-white/5 px-3.5 py-3 outline-none ring-1 ring-white/10 transition focus:ring-2 focus:ring-kin" />;
const Sel = (p) => <select {...p} className="w-full rounded-xl bg-[#17122a] px-3.5 py-3 outline-none ring-1 ring-white/10 transition focus:ring-2 focus:ring-kin">{ASSETS.map((a) => <option key={a}>{a}</option>)}</select>;
const Btn = ({ c = "bg-kin", ...p }) => <button {...p} className={`w-full rounded-xl py-3 font-semibold transition active:scale-[.98] hover:brightness-110 disabled:opacity-50 ${c}`} />;
const Card = ({ children, className = "" }) => <div className={`pop rounded-2xl bg-white/[.04] p-5 ring-1 ring-white/10 ${className}`}>{children}</div>;

function Chart({ k, up }) {
  const [h, setH] = useState(null);
  if (!k?.length) return <div className="h-56 animate-pulse rounded-xl bg-white/5" />;
  const mn = Math.min(...k), mx = Math.max(...k), W = 600, H = 200, c = up ? "#2ee59d" : "#ff5470";
  const y = (v) => H - ((v - mn) / (mx - mn || 1)) * (H - 24) - 12, x = (i) => (i / (k.length - 1)) * W;
  const pts = k.map((v, i) => `${x(i)},${y(v)}`).join(" "), i = h ?? k.length - 1;
  return (<div className="relative">
    <div className="absolute left-0 top-0 text-sm text-white/60">{fmt(k[i])} USDT</div>
    <svg viewBox={`0 0 ${W} ${H}`} className="h-56 w-full cursor-crosshair pt-5" onMouseMove={(e) => { const r = e.currentTarget.getBoundingClientRect(); setH(Math.max(0, Math.min(k.length - 1, Math.round(((e.clientX - r.left) / r.width) * (k.length - 1))))); }} onMouseLeave={() => setH(null)}>
      <defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={c} stopOpacity=".35" /><stop offset="1" stopColor={c} stopOpacity="0" /></linearGradient></defs>
      <polygon points={`0,${H} ${pts} ${W},${H}`} fill="url(#g)" /><polyline points={pts} fill="none" stroke={c} strokeWidth="2" vectorEffect="non-scaling-stroke" />
      {h !== null && <g><line x1={x(h)} x2={x(h)} y1="0" y2={H} stroke="#fff3" /><circle cx={x(h)} cy={y(k[h])} r="4" fill={c} /></g>}
    </svg></div>);
}
function Copyable({ text, label }) {
  const [ok, setOk] = useState(false);
  return <button onClick={() => { navigator.clipboard.writeText(text); setOk(true); setTimeout(() => setOk(false), 1200); }} className="flex w-full items-center justify-between gap-3 rounded-xl bg-white/5 px-3.5 py-3 text-left ring-1 ring-white/10 transition hover:ring-kin"><span className="min-w-0 break-all text-sm">{label || text}</span>{ok ? <Check size={16} className="shrink-0 text-emerald-400" /> : <Copy size={16} className="shrink-0 text-white/50" />}</button>;
}
const label = (t) => ({ kinpay: "KIN Pay", trade: "Trade", deposit: "Deposit", withdraw: "Withdrawal", rp_create: "Red packet created", rp_claim: "Red packet received" }[t.type] + (t.type === "kinpay" ? (t.in ? ` from ${t.meta.from}` : ` to ${t.meta.to}`) : ""));

function Landing() {
  return (<main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center px-6 text-center">
    <img src="/logo.jpg" alt="VOIDKIN" className="pop mb-8 h-28 w-28 rounded-3xl mix-blend-screen" />
    <h1 className="pop text-4xl font-bold tracking-tight">VOIDKIN</h1>
    <p className="pop mt-3 text-white/60">Trade spot markets, pay anyone by their 6-digit ID, and send red packets to your people.</p>
    <button onClick={() => signIn("google")} className="pop mt-10 w-full rounded-xl bg-white py-3.5 font-semibold text-black transition active:scale-[.98] hover:bg-white/90">Continue with Google</button>
  </main>);
}

function App({ user }) {
  const [tab, setTab] = useState("market"), [sym, setSym] = useState("BTC"), [iv, setIv] = useState("15m"), [mk, setMk] = useState({ t: [], k: null }), [me, setMe] = useState(null), [msg, setMsg] = useState(null);
  const [f, setF] = useState({ side: "buy", asset: "USDT", mode: "random", count: 1 }), set = (k) => (e) => setF((s) => ({ ...s, [k]: e.target.value }));
  const loadMe = useCallback(() => api("me").then(setMe).catch(() => {}), []);
  useEffect(() => { loadMe(); const t = setInterval(loadMe, 10000); return () => clearInterval(t); }, [loadMe]);
  useEffect(() => { const go = () => api(`market?s=${sym}&i=${iv}`).then(setMk).catch(() => {}); go(); const t = setInterval(go, 5000); return () => clearInterval(t); }, [sym, iv]);
  const act = async (a, body, ok) => { try { const r = await api(a, body); setMsg({ ok: true, t: ok(r) }); loadMe(); } catch (e) { setMsg({ ok: false, t: e.message }); } };
  const bal = me?.u.bal || {}, tk = mk.t.find((x) => x.s === sym), up = (tk?.c ?? 0) >= 0;
  const chartBlock = <Card><div className="mb-3 flex items-end justify-between"><div><div className="text-sm text-white/60">{sym}/USDT</div><div className="text-3xl font-bold">{tk ? fmt(tk.p) : "-"}</div></div><div className={up ? "text-emerald-400" : "text-rose-400"}>{tk ? `${up ? "+" : ""}${tk.c.toFixed(2)}%` : ""}</div></div>
    <Chart k={mk.k} up={up} /><div className="mt-3 flex gap-2">{["15m", "1h", "4h", "1d"].map((x) => <button key={x} onClick={() => setIv(x)} className={`rounded-lg px-3 py-1.5 text-sm transition ${iv === x ? "bg-kin" : "bg-white/5 hover:bg-white/10"}`}>{x}</button>)}</div></Card>;
  return (<div className="mx-auto max-w-5xl px-4 pb-28 pt-5 md:pb-10">
    <header className="mb-6 flex items-center gap-3"><img src="/logo.jpg" alt="" className="h-10 w-10 rounded-xl mix-blend-screen" /><div className="text-xl font-bold">VOIDKIN</div>
      <div className="ml-auto flex items-center gap-1"><div className="w-40"><Copyable text={user.uid} label={`Your ID ${user.uid}`} /></div><button aria-label="Sign out" onClick={() => signOut()} className="rounded-xl bg-white/5 p-3 ring-1 ring-white/10 transition hover:bg-white/10"><LogOut size={16} /></button></div></header>
    <nav className="fixed inset-x-0 bottom-0 z-10 flex justify-around border-t border-white/10 bg-[#0d0a1a]/95 p-2 backdrop-blur md:static md:mb-6 md:justify-start md:gap-2 md:border-0 md:bg-transparent md:p-0">
      {TABS.map(([id, n, I]) => <button key={id} onClick={() => { setTab(id); setMsg(null); }} className={`flex items-center gap-2 rounded-xl px-3 py-2 text-sm transition md:px-4 ${tab === id ? "bg-kin" : "text-white/60 hover:bg-white/5"}`}><I size={16} /><span className="hidden sm:inline">{n}</span></button>)}</nav>
    {msg && <div className={`pop mb-4 rounded-xl px-4 py-3 text-sm ring-1 ${msg.ok ? "bg-emerald-500/10 ring-emerald-500/30 text-emerald-300" : "bg-rose-500/10 ring-rose-500/30 text-rose-300"}`}>{msg.t}</div>}

    {tab === "market" && <div className="grid gap-4 md:grid-cols-5"><div className="md:col-span-3">{chartBlock}</div>
      <Card className="md:col-span-2"><div className="mb-2 text-sm text-white/60">Markets (USDT)</div>{mk.t.map((x) => <button key={x.s} onClick={() => setSym(x.s)} className={`flex w-full items-center justify-between rounded-xl px-3 py-3 transition ${sym === x.s ? "bg-kin/20" : "hover:bg-white/5"}`}><span className="font-semibold">{x.s}</span><span className="text-right"><div>{fmt(x.p)}</div><div className={`text-xs ${x.c >= 0 ? "text-emerald-400" : "text-rose-400"}`}>{x.c >= 0 ? "+" : ""}{x.c.toFixed(2)}%</div></span></button>)}</Card></div>}

    {tab === "trade" && <div className="grid gap-4 md:grid-cols-5"><div className="md:col-span-3">{chartBlock}</div>
      <Card className="space-y-3 md:col-span-2"><div className="grid grid-cols-2 gap-2">{["buy", "sell"].map((s) => <button key={s} onClick={() => setF((x) => ({ ...x, side: s }))} className={`rounded-xl py-2.5 font-semibold capitalize transition ${f.side === s ? (s === "buy" ? "bg-emerald-500 text-black" : "bg-rose-500") : "bg-white/5"}`}>{s} {sym}</button>)}</div>
        <select value={sym} onChange={(e) => setSym(e.target.value)} className="w-full rounded-xl bg-[#17122a] px-3.5 py-3 ring-1 ring-white/10">{mk.t.map((x) => <option key={x.s}>{x.s}</option>)}</select>
        <In type="number" placeholder={f.side === "buy" ? "Amount to spend (USDT)" : `Amount to sell (${sym})`} value={f.amt || ""} onChange={set("amt")} />
        <div className="text-sm text-white/60">Available: {fmt(bal[f.side === "buy" ? "USDT" : sym] || 0, 8)} {f.side === "buy" ? "USDT" : sym}{tk && f.amt > 0 && <> - You get about {fmt(f.side === "buy" ? (f.amt / tk.p) * 0.999 : f.amt * tk.p * 0.999, 6)} {f.side === "buy" ? sym : "USDT"} after the 0.1% fee</>}</div>
        <Btn c={f.side === "buy" ? "bg-emerald-500 text-black" : "bg-rose-500"} onClick={() => act("trade", { s: sym, side: f.side, amt: f.amt }, (r) => `Order filled at ${fmt(r.p)} USDT`)}>{f.side === "buy" ? "Buy" : "Sell"} {sym} at market</Btn></Card></div>}

    {tab === "wallet" && <div className="grid gap-4 md:grid-cols-2"><Card><div className="mb-3 text-sm text-white/60">Balances</div>{ASSETS.map((a) => <div key={a} className="flex justify-between border-b border-white/5 py-2.5 last:border-0"><span>{a}</span><span>{fmt(bal[a] || 0, 8)}</span></div>)}</Card>
      <div className="space-y-4"><Card className="space-y-3"><div className="flex items-center gap-2 font-semibold"><ArrowDownToLine size={18} />Deposit USDT</div><div className="text-sm text-white/60">Send USDT on BNB Smart Chain (BEP-20) only. Funds appear after 12 network confirmations.</div>{me && <Copyable text={me.u.addr} />}</Card>
        <Card className="space-y-3"><div className="flex items-center gap-2 font-semibold"><ArrowUpFromLine size={18} />Withdraw USDT</div><In placeholder="BNB Smart Chain address (0x...)" value={f.addr || ""} onChange={set("addr")} /><In type="number" placeholder="Amount (minimum 10 USDT)" value={f.wamt || ""} onChange={set("wamt")} /><Btn onClick={() => act("withdraw", { address: f.addr, amt: f.wamt }, () => "Withdrawal requested. It is sent after review.")}>Request withdrawal</Btn></Card></div></div>}

    {tab === "pay" && <div className="grid gap-4 md:grid-cols-2"><Card className="space-y-3"><div className="font-semibold">Send with KIN Pay</div><In inputMode="numeric" maxLength={6} placeholder="Recipient's 6-digit ID" value={f.to || ""} onChange={set("to")} /><div className="grid grid-cols-2 gap-2"><Sel value={f.asset} onChange={set("asset")} /><In type="number" placeholder="Amount" value={f.pamt || ""} onChange={set("pamt")} /></div><In placeholder="Note (optional)" maxLength={60} value={f.note || ""} onChange={set("note")} />
      <div className="text-sm text-white/60">Available: {fmt(bal[f.asset] || 0, 8)} {f.asset}. Transfers between VOIDKIN users are instant and free.</div><Btn onClick={() => act("pay", { uid: f.to, asset: f.asset, amt: f.pamt, note: f.note }, () => `Sent ${f.pamt} ${f.asset} to ${f.to}`)}>Send payment</Btn></Card>
      <Card><div className="mb-2 text-sm text-white/60">Recent activity</div>{!me?.t.length && <div className="py-6 text-center text-white/50">Nothing yet. Deposit USDT or ask a friend to send you some with your ID.</div>}{me?.t.map((t, i) => <div key={i} className="flex justify-between border-b border-white/5 py-2.5 text-sm last:border-0"><span>{label(t)}<div className="text-xs text-white/40">{new Date(t.at).toLocaleString()}</div></span><span className={t.in ? "text-emerald-400" : "text-rose-400"}>{t.in ? "+" : "-"}{fmt(t.amt, 8)} {t.asset}</span></div>)}</Card></div>}

    {tab === "packets" && <div className="grid gap-4 md:grid-cols-2"><div className="space-y-4"><Card className="space-y-3"><div className="font-semibold">Receive a red packet</div><In placeholder="Enter packet code" value={f.code || ""} onChange={set("code")} /><Btn onClick={() => act("claim", { code: f.code }, (r) => `You received ${fmt(r.amt, 8)} ${r.asset}`)}>Open packet</Btn></Card>
      <Card className="space-y-3"><div className="font-semibold">Create a red packet</div><div className="grid grid-cols-2 gap-2"><Sel value={f.asset} onChange={set("asset")} /><In type="number" placeholder="Total amount" value={f.total || ""} onChange={set("total")} /></div><div className="grid grid-cols-2 gap-2"><In type="number" min="1" max="100" placeholder="Number of packets" value={f.count} onChange={set("count")} /><select value={f.mode} onChange={set("mode")} className="rounded-xl bg-[#17122a] px-3.5 py-3 ring-1 ring-white/10"><option value="random">Random split</option><option value="equal">Equal split</option></select></div>
        <Btn onClick={() => act("packet", { asset: f.asset, total: f.total, count: f.count, mode: f.mode }, (r) => `Packet ${r.code} created. Share the code to let people claim it.`)}>Create packet</Btn></Card></div>
      <Card><div className="mb-2 text-sm text-white/60">Packets you created</div>{!me?.p.length && <div className="py-6 text-center text-white/50">Create a packet and share its code in any chat.</div>}{me?.p.map((p) => <div key={p.code} className="mb-2 space-y-1"><Copyable text={p.code} label={`${p.code} - tap to copy`} /><div className="px-1 text-xs text-white/50">{p.n - p.leftN} of {p.n} claimed - {fmt(p.left, 8)} of {fmt(p.total, 8)} {p.asset} left</div></div>)}</Card></div>}
  </div>);
}
export default function Page() {
  const { data, status } = useSession();
  if (status === "loading") return <div className="grid min-h-screen place-items-center"><img src="/logo.jpg" alt="" className="h-16 w-16 animate-pulse rounded-2xl mix-blend-screen" /></div>;
  return data?.user?.uid ? <App user={data.user} /> : <Landing />;
}
