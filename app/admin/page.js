"use client";
import { useEffect, useState, useCallback } from "react";
import { api, fmt, Card, Btn, In, useAct, Msg } from "../ui";
export default function Admin() {
  const [s, setS] = useState(null), [err, setErr] = useState(""), [uid, setUid] = useState("");
  const load = useCallback(() => api("adminSummary").then(setS).catch((e) => setErr(e.message)), []);
  const [msg, run] = useAct(load);
  useEffect(() => { load(); const t = setInterval(load, 15000); return () => clearInterval(t); }, [load]);
  if (err) return <main className="grid min-h-screen place-items-center px-6 text-center text-white/60">{err === "Not found" || /sign in/i.test(err) ? "This page isn't available for your account. Sign in with an admin email." : err}</main>;
  if (!s) return <main className="grid min-h-screen place-items-center text-white/50">Loading...</main>;
  const r = s.reserve, off = !r || Date.now() - new Date(r.at) > 120000;
  return (<main className="mx-auto max-w-4xl space-y-4 px-4 py-6">
    <div className="flex items-center justify-between"><h1 className="text-2xl font-bold">VOIDKIN admin</h1><a href="/" className="text-sm text-kin">Back to app</a></div><Msg m={msg} />
    <div className="grid gap-4 sm:grid-cols-3">
      <Card><div className="text-sm text-white/50">Users</div><div className="text-3xl font-bold">{s.users}</div></Card>
      <Card><div className="text-sm text-white/50">Hot wallet USDT / BNB gas</div><div className="text-xl font-bold">{r ? `${fmt(r.usdt)} / ${fmt(r.bnb, 4)}` : "-"}</div><div className={`text-xs ${off ? "text-rose-300" : "text-emerald-300"}`}>{off ? "Signer is offline" : "Signer online"}</div></Card>
      <Card><div className="text-sm text-white/50">Hedge orders waiting</div><div className="text-3xl font-bold">{s.openHedges}</div></Card></div>
    <Card><div className="mb-2 text-sm text-white/60">Owed to users (sum of all balances)</div><div className="grid grid-cols-2 gap-2 sm:grid-cols-4">{Object.entries(s.liab).map(([a, v]) => <div key={a} className="rounded-xl bg-white/5 p-3"><div className="text-xs text-white/50">{a}</div><div className="font-semibold">{fmt(v, 8)}</div></div>)}</div></Card>
    <Card><div className="mb-2 text-sm text-white/60">Withdrawals</div>{!s.wd.length && <div className="py-4 text-center text-white/50">Nothing waiting for review.</div>}
      {s.wd.map((w) => <div key={w.id} className="border-b border-white/5 py-3 text-sm last:border-0"><div className="flex justify-between gap-3"><span>ID {w.uid} <span className="text-white/40">{w.email}</span></span><span className="font-semibold">{fmt(w.net, 8)} USDT</span></div>
        <div className="break-all text-xs text-white/50">{w.address} - {w.status}{w.err ? ` - ${w.err}` : ""}</div>
        {w.status === "pending" && <div className="mt-2 grid grid-cols-2 gap-2"><Btn onClick={() => run("adminWd", { id: w.id, op: "approve" }, () => "Approved. The signer will send it.")}>Approve</Btn><Btn c="bg-rose-500/20 text-rose-300" onClick={() => run("adminWd", { id: w.id, op: "reject" }, () => "Rejected and refunded.")}>Reject and refund</Btn></div>}</div>)}</Card>
    <Card className="space-y-3"><div className="font-semibold">Freeze or unfreeze an account</div><In inputMode="numeric" maxLength={6} placeholder="6-digit user ID" value={uid} onChange={(e) => setUid(e.target.value)} />
      <div className="grid grid-cols-2 gap-2"><Btn c="bg-rose-500/20 text-rose-300" onClick={() => run("adminFreeze", { uid, frozen: true }, () => `Account ${uid} frozen`)}>Freeze</Btn><Btn c="bg-white/10" onClick={() => run("adminFreeze", { uid, frozen: false }, () => `Account ${uid} unfrozen`)}>Unfreeze</Btn></div></Card>
    <Card><div className="mb-2 text-sm text-white/60">Recent admin actions</div>{!s.audit?.length && <div className="text-white/50">None yet.</div>}{s.audit?.map((a, i) => <div key={i} className="border-b border-white/5 py-2 text-xs text-white/60 last:border-0">{new Date(a.at).toLocaleString()} - {a.by} - {a.act} {a.b?.uid || a.b?.op || ""}</div>)}</Card></main>);
}
