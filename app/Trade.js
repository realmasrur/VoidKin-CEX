"use client";
import { useEffect, useRef, useState, useCallback } from "react";
import { ChevronDown, X } from "lucide-react";
import { api, fmt, vol, M, Coin, Btn, Card, Seg, Sheet, useAct, Msg } from "./ui";

function Chart({ k, up }) {
  const [h, setH] = useState(null);
  if (!k?.length) return <div className="h-48 animate-pulse rounded-2xl bg-mist" />;
  const mn = Math.min(...k), mx = Math.max(...k), W = 600, H = 190, c = up ? "#0ea66b" : "#e5484d";
  const y = (v) => H - ((v - mn) / (mx - mn || 1)) * (H - 28) - 14, x = (i) => (i / (k.length - 1)) * W;
  const pts = k.map((v, i) => `${x(i)},${y(v)}`).join(" "), i = h ?? k.length - 1;
  const move = (cx, el) => { const r = el.getBoundingClientRect(); setH(Math.max(0, Math.min(k.length - 1, Math.round(((cx - r.left) / r.width) * (k.length - 1))))); };
  return (<div className="relative"><div className="absolute left-0 top-0 text-xs font-medium text-ink/50">{fmt(k[i])}</div>
    <svg viewBox={`0 0 ${W} ${H}`} className="h-48 w-full cursor-crosshair pt-4" onMouseMove={(e) => move(e.clientX, e.currentTarget)} onTouchMove={(e) => move(e.touches[0].clientX, e.currentTarget)} onMouseLeave={() => setH(null)} onTouchEnd={() => setH(null)}>
      <defs><linearGradient id="cg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={c} stopOpacity=".22" /><stop offset="1" stopColor={c} stopOpacity="0" /></linearGradient></defs>
      {[0.25, 0.5, 0.75].map((f) => <line key={f} x1="0" x2={W} y1={H * f} y2={H * f} stroke="#0000000a" />)}
      <polygon points={`0,${H} ${pts} ${W},${H}`} fill="url(#cg)" /><polyline points={pts} fill="none" stroke={c} strokeWidth="2" vectorEffect="non-scaling-stroke" strokeLinejoin="round" />
      {h !== null && <g><line x1={x(h)} x2={x(h)} y1="0" y2={H} stroke="#0c0c0f33" /><circle cx={x(h)} cy={y(k[h])} r="4" fill="#fff" stroke={c} strokeWidth="2" /></g>}</svg></div>);
}
const Num = ({ v, on, ph, suffix, off }) => <div className="relative"><input type="number" inputMode="decimal" disabled={off} placeholder={ph} value={v} onChange={(e) => on(e.target.value)} className="w-full rounded-xl bg-mist py-3 pl-3 pr-14 text-sm font-semibold outline-none ring-1 ring-transparent transition placeholder:font-medium placeholder:text-ink/35 focus:bg-white focus:ring-ink disabled:text-ink/40" /><span className="absolute right-3 top-3.5 text-xs font-medium text-ink/40">{suffix}</span></div>;
const flo = (v) => String(Math.floor(v * 1e8) / 1e8);

export default function TradeTab({ sym, setSym, mk, iv, setIv, me, hide, reload }) {
  const [f, setF] = useState({ side: "buy", type: "limit", price: "", qty: "", amt: "" }), [sheet, setSheet] = useState(false), [ot, setOt] = useState("open");
  const [bk, setBk] = useState({ asks: [], bids: [] }), [od, setOd] = useState({ open: [], done: [] }), [msg, act] = useAct(reload);
  const tk = mk.t.find((x) => x.s === sym), up = (tk?.c ?? 0) >= 0, tkRef = useRef(tk); tkRef.current = tk;
  useEffect(() => { setF((x) => ({ ...x, price: tkRef.current ? String(tkRef.current.p) : "", qty: "", amt: "" })); }, [sym]);
  useEffect(() => { if (tk) setF((x) => (x.price ? x : { ...x, price: String(tk.p) })); }, [!!tk]);
  const poll = useCallback(() => { api(`book?s=${sym}`).then(setBk).catch(() => {}); api("orders").then(setOd).catch(() => {}); }, [sym]);
  useEffect(() => { poll(); const t = setInterval(poll, 5000); return () => clearInterval(t); }, [poll]);
  const go = async (a, body, ok) => { await act(a, body, ok); poll(); };
  const bal = me?.u.bal || {}, buy = f.side === "buy", limit = f.type === "limit", have = bal[buy ? "USDT" : sym] || 0, price = limit ? +f.price || 0 : tk?.p || 0;
  const set = (k) => (v) => setF((x) => ({ ...x, [k]: v }));
  const pct = (p) => { const x = have * p; if (limit) set("qty")(flo(buy ? (price ? x / price : 0) : x)); else set("amt")(flo(x)); };
  const total = limit ? price * (+f.qty || 0) : buy ? +f.amt || 0 : (+f.amt || 0) * price;
  const place = () => limit
    ? go("order", { s: sym, side: f.side, price: f.price, qty: f.qty }, (r) => (r.filled >= +f.qty ? "Order filled." : r.filled > 0 ? "Partly filled. The rest is open in the order book." : "Order placed. It fills when someone matches your price."))
    : go("trade", { s: sym, side: f.side, amt: f.amt }, (r) => `Order filled at ${fmt(r.p)} USDT`);
  const asks = bk.asks.slice(0, 7), bids = bk.bids.slice(0, 7), mxq = Math.max(1e-9, ...asks.map((r) => r[1]), ...bids.map((r) => r[1]));
  const bookRow = ([p, q], a) => <button key={(a ? "a" : "b") + p} onClick={() => setF((x) => ({ ...x, type: "limit", price: String(p) }))} className="relative flex w-full justify-between overflow-hidden px-1.5 py-[3px] text-[11px] tabular-nums"><span className={`absolute inset-y-0 right-0 ${a ? "bg-down/10" : "bg-up/10"}`} style={{ width: `${(q / mxq) * 100}%` }} /><span className={`relative font-semibold ${a ? "text-down" : "text-up"}`}>{fmt(p, 8)}</span><span className="relative text-ink/55">{fmt(q, 4)}</span></button>;
  return (<div className="space-y-4">
    <Card c="bg-white ring-1 ring-line" className="space-y-3">
      <div className="flex items-start justify-between"><button onClick={() => setSheet(true)} className="flex items-center gap-2 rounded-full bg-mist py-1.5 pl-1.5 pr-3 font-bold"><Coin s={sym} size={28} />{sym}/USDT<ChevronDown size={16} className="text-ink/45" /></button><div className="text-right text-xs text-ink/45">24h volume<div className="text-sm font-semibold text-ink">{tk ? vol(tk.v) : "-"}</div></div></div>
      <div className="flex items-end gap-3"><div className={`text-4xl font-bold tracking-tight ${up ? "text-up" : "text-down"}`}>{tk ? fmt(tk.p) : "-"}</div>{tk && <div className={`mb-1.5 rounded-md px-2 py-0.5 text-sm font-semibold ${up ? "bg-up/10 text-up" : "bg-down/10 text-down"}`}>{up ? "+" : ""}{tk.c.toFixed(2)}%</div>}</div>
      <Chart k={mk.k} up={up} /><Seg id="iv" value={iv} onChange={setIv} options={[["15m", "15m"], ["1h", "1h"], ["4h", "4h"], ["1d", "1d"]]} /></Card>
    <div className="grid grid-cols-5 gap-3">
      <div className="col-span-3 space-y-2.5"><Msg m={msg} />
        <div className="grid grid-cols-2 gap-1.5">{["buy", "sell"].map((s) => <button key={s} onClick={() => set("side")(s)} className={`rounded-xl py-2.5 text-sm font-bold capitalize transition ${f.side === s ? (s === "buy" ? "bg-up text-white" : "bg-down text-white") : "bg-mist text-ink/45"}`}>{s}</button>)}</div>
        <div className="flex gap-4 px-1 text-sm font-semibold">{[["limit", "Limit"], ["market", "Market"]].map(([k, n]) => <button key={k} onClick={() => set("type")(k)} className={`border-b-2 pb-1 transition ${f.type === k ? "border-ink text-ink" : "border-transparent text-ink/40"}`}>{n}</button>)}</div>
        {limit ? <Num v={f.price} on={set("price")} ph="Price" suffix="USDT" /> : <div className="rounded-xl bg-mist px-3 py-3 text-sm font-medium text-ink/40">Market price</div>}
        {limit ? <Num v={f.qty} on={set("qty")} ph="Amount" suffix={sym} /> : <Num v={f.amt} on={set("amt")} ph={buy ? "Total" : "Amount"} suffix={buy ? "USDT" : sym} />}
        <div className="grid grid-cols-4 gap-1.5">{[0.25, 0.5, 0.75, 1].map((p) => <button key={p} onClick={() => pct(p)} className="rounded-lg bg-mist py-1.5 text-[11px] font-semibold text-ink/55 transition hover:bg-line">{p * 100}%</button>)}</div>
        <div className="space-y-1 text-xs text-ink/50"><div className="flex justify-between"><span>Available</span><span className="font-medium text-ink">{M(hide, fmt(have, 8))} {buy ? "USDT" : sym}</span></div><div className="flex justify-between"><span>{limit ? "Order total" : buy ? "Spend" : "Est. receive"}</span><span className="font-medium text-ink">{total > 0 ? fmt(total, 4) : "-"} USDT</span></div><div className="flex justify-between"><span>Fee</span><span className="font-medium text-ink">0.1%</span></div></div>
        <Btn c={buy ? "bg-up text-white" : "bg-down text-white"} onClick={place}>{buy ? "Buy" : "Sell"} {sym}</Btn></div>
      <div className="col-span-2"><div className="mb-1 flex justify-between px-1.5 text-[10px] text-ink/40"><span>Price</span><span>{sym}</span></div>
        {!asks.length && !bids.length && <div className="rounded-xl bg-mist px-2 py-6 text-center text-[11px] text-ink/45">No resting orders yet. Place a limit order to start the book.</div>}
        {[...asks].reverse().map((r) => bookRow(r, true))}<div className={`my-1 border-y border-line px-1.5 py-1.5 text-center text-sm font-bold ${up ? "text-up" : "text-down"}`}>{tk ? fmt(tk.p) : "-"}</div>{bids.map((r) => bookRow(r, false))}</div></div>
    <Card className="space-y-3"><Seg id="ot" value={ot} onChange={setOt} options={[["open", `Open orders (${od.open.length})`], ["done", "History"]]} />
      {ot === "open" && <div>{!od.open.length && <div className="py-6 text-center text-sm text-ink/45">No open orders. Limit orders you place wait here until they fill.</div>}
        {od.open.map((o) => <div key={o.id} className="flex items-center gap-3 border-b border-line py-2.5 text-sm last:border-0"><span className={`w-10 font-bold ${o.side === "buy" ? "text-up" : "text-down"}`}>{o.side === "buy" ? "Buy" : "Sell"}</span><span className="flex-1 font-medium">{o.s} {fmt(o.qty - o.filled, 8)} at {fmt(o.price, 8)}<div className="text-xs font-normal text-ink/45">{fmt(o.filled, 8)} of {fmt(o.qty, 8)} filled</div></span><button aria-label="Cancel order" onClick={() => go("cancel", { id: o.id }, () => "Order cancelled")} className="rounded-full bg-white p-2 transition hover:bg-down/10"><X size={16} /></button></div>)}</div>}
      {ot === "done" && <div>{!od.done.length && <div className="py-6 text-center text-sm text-ink/45">Filled and cancelled orders show up here.</div>}
        {od.done.map((o) => <div key={o.id} className="flex justify-between gap-3 border-b border-line py-2.5 text-xs last:border-0"><span className="font-medium">{o.side === "buy" ? "Buy" : "Sell"} {o.s} {fmt(o.qty, 8)} at {fmt(o.price, 8)}</span><span className={`shrink-0 font-semibold ${o.status === "filled" ? "text-up" : "text-ink/45"}`}>{o.status === "filled" ? "Filled" : `Cancelled, ${fmt(o.filled, 8)} filled`}</span></div>)}</div>}</Card>
    <Sheet open={sheet} onClose={() => setSheet(false)} title="Select market"><div className="space-y-1">{mk.t.map((x) => <button key={x.s} onClick={() => { setSym(x.s); setSheet(false); }} className={`flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left transition ${sym === x.s ? "bg-mist" : "hover:bg-mist"}`}><Coin s={x.s} size={36} /><span className="flex-1 font-bold">{x.s}<span className="font-medium text-ink/40">/USDT</span></span><span className="text-right"><div className="font-semibold">{fmt(x.p)}</div><div className={`text-xs font-semibold ${x.c >= 0 ? "text-up" : "text-down"}`}>{x.c >= 0 ? "+" : ""}{x.c.toFixed(2)}%</div></span></button>)}</div></Sheet></div>);
}
