"use client";
import { useState } from "react";
import { motion } from "framer-motion";
import _ from "lodash";
import { Check } from "lucide-react";
import { fmt, CoinPicker, In, Btn, Card, useAct, Msg } from "./ui";
export default function Pay({ me, reload }) {
  const [f, setF] = useState({ asset: "USDT" }), [msg, run, setMsg] = useAct(reload), [done, setDone] = useState(null);
  const bal = me?.u.bal || {}, set = (k) => (e) => setF((s) => ({ ...s, [k]: e.target.value }));
  const recents = _.uniq((me?.t || []).filter((t) => t.type === "kinpay" && !t.in).map((t) => t.meta.to)).slice(0, 5);
  const send = async () => { const r = await run("pay", { uid: f.to, asset: f.asset, amt: f.amt, note: f.note }, () => ""); if (r) { setMsg(null); setDone({ ...f }); } };
  if (done) return (<Card className="space-y-4 py-10 text-center"><motion.div initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: "spring", stiffness: 300, damping: 16 }} className="mx-auto grid h-20 w-20 place-items-center rounded-full bg-up/10 text-up"><Check size={38} strokeWidth={3} /></motion.div>
    <div className="text-2xl font-bold">Payment sent</div><div className="text-ink/55">{done.amt} {done.asset} was sent to ID {done.to}.</div><Btn onClick={() => { setDone(null); setF({ asset: f.asset }); }}>Send another</Btn></Card>);
  return (<div className="space-y-4">
    <div className="rounded-3xl bg-mist px-5 py-8 text-center"><div className="text-sm text-ink/50">Amount</div>
      <input type="number" inputMode="decimal" placeholder="0" value={f.amt || ""} onChange={set("amt")} className="mt-2 w-full bg-transparent text-center text-5xl font-bold outline-none placeholder:text-ink/20" />
      <div className="mt-2 text-sm text-ink/50">Available {fmt(bal[f.asset] || 0, 8)} {f.asset}</div></div>
    <CoinPicker value={f.asset} onChange={(a) => setF((s) => ({ ...s, asset: a }))} />
    <In inputMode="numeric" maxLength={6} placeholder="Recipient's 6-digit ID" value={f.to || ""} onChange={set("to")} />
    {recents.length > 0 && <div className="flex flex-wrap items-center gap-2 text-sm"><span className="text-ink/45">Recent</span>{recents.map((r) => <button key={r} onClick={() => setF((s) => ({ ...s, to: r }))} className="rounded-full bg-mist px-3.5 py-1.5 font-semibold transition hover:bg-line">{r}</button>)}</div>}
    <In placeholder="Add a note (optional)" maxLength={60} value={f.note || ""} onChange={set("note")} />
    <Msg m={msg} /><Btn onClick={send}>Send {f.amt ? `${f.amt} ${f.asset}` : "payment"}</Btn>
    <div className="text-center text-xs text-ink/45">Transfers between VOIDKIN users are instant and free.</div></div>);
}
