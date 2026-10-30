import { useEffect, useState } from "react";
import type { Campaign } from "./game";
import { money } from "./game";
import { bookCamp, cancelCamp, campAttendance, campBlocker, campFee } from "./bootcamp";
import { financeForecast } from "./finance-forecast";
import "./management-planning.css";

export default function BootcampPlanner({ campaign: c, onChange }: {
  campaign: Campaign; onChange: (change: (c: Campaign) => Campaign) => void;
}) {
  const [weeks, setWeeks] = useState(1);
  const [message, setMessage] = useState("");
  useEffect(() => setMessage(""), [c.week, c.year]);
  const rows = campAttendance(c);
  const blocker = campBlocker(c, weeks);
  const reserved = c.bootcamp ? c.bootcamp.remaining * c.bootcamp.playerIds.length * (c.bootcamp.fee ?? 500) : 0;
  const nextCash = financeForecast(c, 1, c.bootcamp ? 0 : c.roster.length * campFee(c) * weeks)[0].balance;
  return <section className="panel planning-panel" aria-labelledby="bootcamp-title">
    <div className="planning-heading"><div><span className="eyebrow">PREPARATION</span><h2 id="bootcamp-title">Squad bootcamp</h2>
      <p>Develop your chosen training focus faster. Arrive fresh enough to use it.</p></div>
      <strong>{c.bootcamp ? `${c.bootcamp.remaining} paid ${c.bootcamp.remaining === 1 ? "week" : "weeks"} left` : "1–3 weeks"}</strong></div>
    <p>+35% attribute and playstyle development from each player’s current focus, for 6 extra energy per week. No extra practice hours; contract limits and Rest still apply.</p>
    <ul className="planning-attendance">{rows.map(row => <li key={row.id}><strong>{row.name}</strong><span>{row.reason ?? row.preview}</span></li>)}</ul>
    <p className={nextCash < 0 ? "planning-warning" : ""}>Cash after {c.bootcamp ? "next payroll" : "booking and next payroll"}: {money(nextCash)}.{nextCash < 0 ? " This plan risks debt and its happiness penalty. Review Finances before booking." : ""}</p>
    {c.bootcamp ? <div className="planning-actions"><p>{money(reserved)} reserved for unelapsed weeks. Skipped places are refunded each week; replacement signings need a new camp.</p>
      <button className="button secondary" onClick={() => { onChange(cancelCamp); setMessage(`Camp cancelled. ${money(reserved)} refunded.`); }}>Cancel & refund {money(reserved)}</button></div>
      : <div className="planning-actions"><label>Duration<select aria-label="Bootcamp duration" value={weeks} onChange={e => setWeeks(Number(e.target.value))}>
        {[1, 2, 3].map(n => <option key={n} value={n}>{n} {n === 1 ? "week" : "weeks"}</option>)}</select></label>
        <p>{money(campFee(c))} per booked player per week · {money(c.roster.length * campFee(c) * weeks)} prepaid.</p>
        <button className="button primary" disabled={!!blocker} onClick={() => { onChange(current => bookCamp(current, weeks)); setMessage("Camp booked. Training begins at the next weekly settlement."); }}>Book bootcamp · {money(c.roster.length * campFee(c) * weeks)}</button>
        {blocker && <p className="planning-warning">{blocker}</p>}</div>}
    <p role="status" aria-live="polite">{message}</p>
    {c.lastCampReport && <details className="planning-report"><summary>Last camp week · {c.lastCampReport.year}, week {c.lastCampReport.week} · {c.lastCampReport.attended} attended · {money(c.lastCampReport.refunded)} refunded</summary>
      <p>Extra gains versus ordinary practice, after attribute caps. Energy reflects that training settlement, before later matches.</p>
      <ul className="planning-attendance">{c.lastCampReport.players.map(row => <li key={row.id}><strong>{row.name}</strong><span>{row.outcome}</span></li>)}</ul></details>}
  </section>;
}
