"use client";
import { useEffect, useState, useCallback } from "react";
import { X } from "lucide-react";
import { api, fmt, M, In, Btn, Card, useAct, Msg } from "./ui";
export default function TradeTab({ sym, setSym, mk, tk, me, hide, chart, reload }) {
  const [f, setF] = useState({ side: "buy", type: "market" }), set = (k) => (e) => setF((x) => ({ ...x, [k]: e.target.value }));
  const [bk, setBk] = useState({ asks: [], bids: [] }), [od, setOd] = useState({ open: [], done: [] }), [msg, act] = useAct(reload);
  const poll = useCallback(() => { api(`book?s=${sym}`).then(setBk).catch(() => {}); api("orders").then(setOd).catch(() => {}); }, [sym]);
  useEffect(() => { poll(); const t = setInterval(poll, 5000); return () => clearInterval(t); }, [poll]);
  const go = async (a, body, ok) => { await act(a, body, ok); poll(); };
  const bal = me?.u.bal || {}, buy = f.side === "buy", limit = f.type === "limit", have = bal[buy ? "USDT" : sym] || 0, total = (+f.price || 0) * (+f.qty || 0);
  const row = ([p, q], c) => <button key={p} onClick={() => setF((x) => ({ ...x, type: "limit", price: String(p) }))} className="flex w-full justify-between rounded px-2 py-1 text-sm transition hover:bg-white/5"><span className={c}>{fmt(p, 8)}</span><span className="text-white/60">{fmt(q, 8)}</span></button>;
  const place = () => limit
    ? go("order", { s: sym, side: f.side, price: f.price, qty: f.qty }, (r) => (r.filled >= +f.qty ? "Order filled." : r.filled > 0 ? "Partly filled. The rest is open in the order book." : "Order placed. It fills when someone matches your price."))
    : go("trade", { s: sym, side: f.side, amt: f.amt }, (r) => `Order filled at ${fmt(r.p)} USDT`);
  return (<div className="grid gap-4 md:grid-cols-5"><div className="space-y-4 md:col-span-3">{chart}
    <Card><div className="mb-2 text-sm text-white/60">Open orders</div>{!od.open.length && <div className="py-4 text-center text-white/50">No open orders. Place a limit order and it will show up here.</div>}
      {od.open.map((o) => <div key={o.id} className="flex items-center gap-3 border-b border-white/5 py-2.5 text-sm last:border-0"><span className={`w-10 font-semibold ${o.side === "buy" ? "text-emerald-400" : "text-rose-400"}`}>{o.side === "buy" ? "Buy" : "Sell"}</span><span className="flex-1">{o.s}: {fmt(o.qty - o.filled, 8)} at {fmt(o.price, 8)}<div className="text-xs text-white/40">{fmt(o.filled, 8)} of {fmt(o.qty, 8)} filled</div></span><button aria-label="Cancel order" onClick={() => go("cancel", { id: o.id }, () => "Order cancelled")} className="rounded-lg bg-white/5 p-2 transition hover:bg-rose-500/20"><X size={16} /></button></div>)}
      {od.done.length > 0 && <><div className="mb-1 mt-4 text-sm text-white/60">Order history</div>{od.done.map((o) => <div key={o.id} className="flex justify-between gap-3 py-1.5 text-xs text-white/50"><span>{o.side === "buy" ? "Buy" : "Sell"} {o.s} {fmt(o.qty, 8)} at {fmt(o.price, 8)}</span><span className="shrink-0">{o.status === "filled" ? "Filled" : `Cancelled, ${fmt(o.filled, 8)} filled`}</span></div>)}</>}</Card></div>
    <div className="space-y-4 md:col-span-2"><Card className="space-y-3"><Msg m={msg} />
      <div className="grid grid-cols-2 gap-2">{["buy", "sell"].map((s) => <button key={s} onClick={() => setF((x) => ({ ...x, side: s }))} className={`rounded-xl py-2.5 font-semibold capitalize transition ${f.side === s ? (s === "buy" ? "bg-emerald-500 text-black" : "bg-rose-500") : "bg-white/5"}`}>{s} {sym}</button>)}</div>
      <div className="grid grid-cols-2 gap-2">{[["market", "Market"], ["limit", "Limit"]].map(([k, n]) => <button key={k} onClick={() => setF((x) => ({ ...x, type: k }))} className={`rounded-lg py-2 text-sm transition ${f.type === k ? "bg-white/15" : "bg-white/5 text-white/50"}`}>{n}</button>)}</div>
      <select value={sym} onChange={(e) => setSym(e.target.value)} className="w-full rounded-xl bg-[#17122a] px-3.5 py-3 ring-1 ring-white/10">{mk.t.map((x) => <option key={x.s}>{x.s}</option>)}</select>
      {limit ? <><In type="number" placeholder="Price (USDT)" value={f.price || ""} onChange={set("price")} /><In type="number" placeholder={`Amount (${sym})`} value={f.qty || ""} onChange={set("qty")} /></> : <In type="number" placeholder={buy ? "Amount to spend (USDT)" : `Amount to sell (${sym})`} value={f.amt || ""} onChange={set("amt")} />}
      <div className="text-sm text-white/60">Available: {M(hide, fmt(have, 8))} {buy ? "USDT" : sym}{limit ? (total > 0 ? ` - Order total ${fmt(total, 4)} USDT, fee 0.1%` : "") : tk && f.amt > 0 ? ` - You get about ${fmt(buy ? (f.amt / tk.p) * 0.999 : f.amt * tk.p * 0.999, 6)} ${buy ? sym : "USDT"} after the 0.1% fee` : ""}</div>
      <Btn c={buy ? "bg-emerald-500 text-black" : "bg-rose-500"} onClick={place}>{limit ? `Place ${f.side} order` : `${buy ? "Buy" : "Sell"} ${sym} at market`}</Btn></Card>
      <Card><div className="mb-2 text-sm text-white/60">Order book, {sym}/USDT</div><div className="flex justify-between px-2 text-xs text-white/40"><span>Price (USDT)</span><span>Amount ({sym})</span></div>
        {!bk.asks.length && !bk.bids.length && <div className="py-4 text-center text-white/50">No resting orders yet. Place a limit order to start the book.</div>}
        {[...bk.asks].reverse().map((r) => row(r, "text-rose-400"))}<div className="my-1 border-y border-white/10 px-2 py-1.5 text-center text-lg font-semibold">{tk ? fmt(tk.p) : "-"}</div>{bk.bids.map((r) => row(r, "text-emerald-400"))}</Card></div></div>);
}
