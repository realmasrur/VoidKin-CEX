"use client";
import { useState } from "react";
import _ from "lodash";
import { signOut } from "next-auth/react";
import { QRCodeSVG } from "qrcode.react";
import { BadgeCheck, Settings, Send, Gift, History, ChevronLeft, ChevronRight, Trash2, LogOut, ShieldCheck, Wallet, ArrowDownToLine, ArrowUpFromLine } from "lucide-react";
import { api, fmt, M, portfolio, label, TX, In, Btn, Card, Copyable, Sheet, Verified, useAct, Msg } from "./ui";
import Pay from "./Pay";
import Packets from "./Packets";
const FILTERS = [["all", "All"], ["trade", "Trades"], ["deposit", "Deposits"], ["withdraw", "Withdrawals"], ["kinpay", "KIN Pay"], ["rp", "Red packets"]];
const Sub = ({ title, back, children }) => <div className="space-y-5"><div className="flex items-center gap-3"><button aria-label="Back" onClick={back} className="rounded-full bg-mist p-2.5"><ChevronLeft size={18} /></button><h2 className="text-xl font-bold">{title}</h2></div>{children}</div>;
const Group = ({ title, children }) => <div><div className="mb-2 px-1 text-sm font-semibold text-ink/40">{title}</div><div className="divide-y divide-line overflow-hidden rounded-3xl bg-mist">{children}</div></div>;
const Item = ({ I, t, d, badge, ...p }) => <button {...p} className="flex w-full items-center gap-4 px-4 py-3.5 text-left transition hover:bg-line/60"><span className="rounded-xl bg-white p-2.5"><I size={18} /></span><span className="flex-1"><div className="font-semibold">{t}</div><div className="text-xs text-ink/45">{d}</div></span>{badge}<ChevronRight size={18} className="text-ink/30" /></button>;

function Hist({ me, hide }) {
  const [f, setF] = useState("all"), rows = _.filter(me?.t || [], (t) => f === "all" || t.type.startsWith(f)), days = _.groupBy(rows, (t) => new Date(t.at).toLocaleDateString(undefined, { dateStyle: "medium" }));
  return <div className="space-y-4"><div className="no-scrollbar flex gap-2 overflow-x-auto">{FILTERS.map(([k, n]) => <button key={k} onClick={() => setF(k)} className={`shrink-0 rounded-full px-4 py-2 text-sm font-semibold transition ${f === k ? "bg-ink text-white" : "bg-mist text-ink/60"}`}>{n}</button>)}</div>
    {!rows.length && <Card className="py-10 text-center text-ink/45">No activity here yet.</Card>}
    {_.map(days, (list, day) => <div key={day}><div className="mb-2 px-1 text-sm font-semibold text-ink/40">{day}</div><div className="divide-y divide-line rounded-3xl bg-mist px-4">{list.map((t, i) => { const I = TX[t.type][1]; return <div key={i} className="flex items-center gap-3 py-3.5"><span className="rounded-xl bg-white p-2.5"><I size={16} /></span><div className="flex-1"><div className="text-sm font-semibold">{label(t)}</div><div className="text-xs text-ink/45">{new Date(t.at).toLocaleTimeString([], { timeStyle: "short" })}</div></div><span className={`text-sm font-bold ${t.in ? "text-up" : "text-ink"}`}>{M(hide, `${t.in ? "+" : "-"}${fmt(t.amt, 8)} ${t.asset}`)}</span></div>; })}</div></div>)}</div>;
}
function TwoFA({ me, reload }) {
  const [s, setS] = useState(null), [code, setCode] = useState(""), [msg, run, setMsg] = useAct(reload), on = me?.u.twofa;
  const start = async () => { try { setS(await api("twofa", { op: "setup" })); setMsg(null); } catch (e) { setMsg({ ok: false, t: e.message }); } };
  const done = async (op) => { const r = await run("twofa", { op, code }, () => (op === "enable" ? "Two-factor authentication is on." : "Two-factor authentication is off.")); if (r) { setS(null); setCode(""); } };
  return <Card className="space-y-3"><div className="flex items-center justify-between gap-3"><div><div className="font-semibold">Two-factor authentication</div><div className="text-sm text-ink/50">{on ? "On. Required for every withdrawal." : "Required to withdraw. Use an authenticator app."}</div></div>{!on && !s && <button onClick={start} className="shrink-0 rounded-xl bg-ink px-4 py-2 text-sm font-semibold text-white">Turn on</button>}</div>
    {s && <div className="space-y-3 text-center"><div className="mx-auto w-fit rounded-2xl bg-white p-3 ring-1 ring-line"><QRCodeSVG value={s.uri} size={160} /></div><div className="text-sm text-ink/55">Scan with Google Authenticator or Authy, or type this key in by hand.</div><Copyable text={s.secret} className="bg-white" /></div>}
    {(s || on) && <><In inputMode="numeric" maxLength={6} placeholder="6-digit code" value={code} onChange={(e) => setCode(e.target.value)} className="bg-white" /><Btn c={on ? "bg-white text-ink ring-1 ring-line" : "bg-ink text-white"} onClick={() => done(on ? "disable" : "enable")}>{on ? "Turn off" : "Confirm and turn on"}</Btn></>}<Msg m={msg} /></Card>;
}
function Cfg({ me, hide, setHide, reload }) {
  const [open, setOpen] = useState(false), [txt, setTxt] = useState(""), [err, setErr] = useState(""), u = me?.u;
  const del = async () => { try { await api("delete", { confirm: txt }); signOut({ callbackUrl: "/" }); } catch (e) { setErr(e.message); } };
  const R = ({ a, b }) => <div className="flex justify-between gap-4 py-3 text-sm"><span className="text-ink/50">{a}</span><span className="break-all text-right font-medium">{b}</span></div>;
  return <div className="space-y-4"><div className="divide-y divide-line rounded-3xl bg-mist px-5"><R a="Name" b={u?.name} /><R a="Email" b={u?.email} /><R a="User ID" b={u?.uid} /><R a="Verification" b={u?.verified ? "Verified" : "Not verified"} /><R a="Member since" b={u?.since ? new Date(u.since).toLocaleDateString(undefined, { dateStyle: "long" }) : ""} /></div>
    <TwoFA me={me} reload={reload} />
    <Card><button onClick={() => setHide(!hide)} className="flex w-full items-center justify-between"><span className="text-left"><div className="font-semibold">Hide balances</div><div className="text-sm text-ink/50">Mask amounts across the app</div></span><span className={`flex h-7 w-12 items-center rounded-full p-1 transition ${hide ? "bg-ink" : "bg-line"}`}><span className={`h-5 w-5 rounded-full bg-white shadow transition-all ${hide ? "ml-auto" : ""}`} /></span></button></Card>
    {me?.admin && <a href="/admin" className="block rounded-2xl bg-kin/10 py-3.5 text-center font-semibold text-kin">Admin panel</a>}
    <Btn c="bg-mist text-ink" onClick={() => signOut({ callbackUrl: "/" })}><span className="flex items-center justify-center gap-2"><LogOut size={16} />Sign out</span></Btn>
    <Btn c="bg-down/10 text-down" onClick={() => setOpen(true)}><span className="flex items-center justify-center gap-2"><Trash2 size={16} />Delete account</span></Btn>
    <Sheet open={open} onClose={() => setOpen(false)} title="Delete your account?"><div className="space-y-3"><div className="text-sm text-ink/60">This permanently removes your account and your ID {u?.uid}. You need a zero balance, no withdrawal in progress, no open orders and no unopened red packets. Your deposit address stops working, so do not send funds to it afterwards.</div>
      <In placeholder="Type DELETE to confirm" value={txt} onChange={(e) => setTxt(e.target.value)} />{err && <div className="text-sm font-medium text-down">{err}</div>}<Btn c="bg-down text-white" disabled={txt !== "DELETE"} onClick={del}>Delete my account</Btn><Btn c="bg-mist text-ink" onClick={() => setOpen(false)}>Keep my account</Btn></div></Sheet></div>;
}
export default function ProfileTab({ user, me, px, hide, setHide, reload }) {
  const [view, setView] = useState("home"), [vs, setVs] = useState(false), st = me?.st || {}, u = me?.u, back = () => setView("home");
  const views = { pay: ["KIN Pay", <Pay me={me} reload={reload} />], packets: ["Red packets", <Packets me={me} reload={reload} />], history: ["History", <Hist me={me} hide={hide} />], settings: ["Settings", <Cfg me={me} hide={hide} setHide={setHide} reload={reload} />] };
  const stat = (I, n, v) => <div className="rounded-3xl bg-mist p-4"><I size={16} className="text-ink/40" /><div className="mt-3 text-xs text-ink/45">{n}</div><div className="mt-0.5 truncate font-bold">{M(hide, "$" + fmt(v))}</div></div>;
  if (view !== "home") return <Sub title={views[view][0]} back={back}>{views[view][1]}</Sub>;
  return (<div className="space-y-6">
    <div className="flex items-center justify-between"><h1 className="text-2xl font-bold">Profile</h1><button aria-label="Settings" onClick={() => setView("settings")} className="rounded-full bg-mist p-3"><Settings size={18} /></button></div>
    <div className="flex items-center gap-4 rounded-3xl bg-mist p-5">{user.image ? <img src={user.image} referrerPolicy="no-referrer" alt="" className="h-16 w-16 rounded-full object-cover" /> : <div className="grid h-16 w-16 place-items-center rounded-full bg-ink text-2xl font-bold text-white">{(user.name || "V")[0]}</div>}
      <div className="min-w-0 flex-1"><div className="flex items-center gap-1.5 text-lg font-bold"><span className="truncate">{user.name}</span>{u?.verified && <Verified size={18} />}</div><div className="truncate text-sm text-ink/50">{user.email}</div><div className="mt-2 w-36"><Copyable text={user.uid} label={`ID ${user.uid}`} className="bg-white py-2" /></div></div></div>
    <div className="grid grid-cols-3 gap-3">{stat(Wallet, "Portfolio", portfolio(u?.bal || {}, px, u?.lock))}{stat(ArrowDownToLine, "Deposited", st.deposit || 0)}{stat(ArrowUpFromLine, "Withdrawn", st.withdraw || 0)}</div>
    <Group title="Payments"><Item I={Send} t="KIN Pay" d="Send money to any VOIDKIN ID" onClick={() => setView("pay")} /><Item I={Gift} t="Red packets" d="Create one or open a code" onClick={() => setView("packets")} /></Group>
    <Group title="Account"><Item I={BadgeCheck} t="Verification" d={u?.verified ? "Your account is verified" : "Not verified yet"} badge={u?.verified ? <span className="mr-1"><Verified size={22} /></span> : null} onClick={() => setVs(true)} /><Item I={History} t="History" d="Trades, deposits, withdrawals and transfers" onClick={() => setView("history")} />
      <Item I={ShieldCheck} t="Security" d="Two-factor authentication" badge={<span className={`mr-1 rounded-full px-2.5 py-1 text-xs font-semibold ${u?.twofa ? "bg-up/10 text-up" : "bg-down/10 text-down"}`}>{u?.twofa ? "On" : "Off"}</span>} onClick={() => setView("settings")} />
      <Item I={Settings} t="Settings" d="Account details, privacy and sign out" onClick={() => setView("settings")} /></Group>
    <Sheet open={vs} onClose={() => setVs(false)} title="Verified badge"><div className="space-y-4 text-center"><img src="/verified.png" alt="" className="mx-auto h-20 w-20" /><div className="text-lg font-bold">{u?.verified ? "Your account is verified" : "Your account is not verified yet"}</div><div className="text-sm text-ink/55">Verified accounts show a gold badge next to their name. For now the VOIDKIN team grants the badge. More ways to get verified are coming.</div><Btn onClick={() => setVs(false)}>Got it</Btn></div></Sheet></div>);
}
