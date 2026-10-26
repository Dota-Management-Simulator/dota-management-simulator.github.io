import { useState } from "react";
import { money } from "./game";
import type { Campaign } from "./game";
import { financeForecast } from "./finance-forecast";
import "./management-planning.css";

export default function FinanceForecast({ campaign: c, onTraining }: { campaign: Campaign; onTraining: () => void }) {
  const [weeks, setWeeks] = useState(8);
  const [upfront, setUpfront] = useState(0);
  const [weekly, setWeekly] = useState(0);
  const rows = financeForecast(c, weeks, upfront, weekly);
  const baseline = financeForecast(c, weeks);
  const firstDebt = c.cash - upfront < 0 ? "Immediately after proposed spending" : rows.find(r => r.balance < 0)?.label;
  const minimum = Math.min(c.cash - upfront, ...rows.map(r => r.balance));
  const drop = rows.find((row, i) => i > 0 && row.income < rows[i - 1].income);
  return <section className="panel planning-panel" aria-labelledby="forecast-title">
    <div className="planning-heading"><div><span className="eyebrow">BUDGET PLANNING</span><h2 id="forecast-title">Cash-flow forecast</h2><p>Can the squad afford preparation without relying on prize money?</p></div>
      <button className="button secondary small-button" onClick={onTraining}>Plan a bootcamp</button></div>
    <div className="planning-controls"><label>Horizon<select value={weeks} onChange={e => setWeeks(Number(e.target.value))}>{[4, 8, 12, 18].map(n => <option key={n} value={n}>{n} weeks</option>)}</select></label>
      <label>Proposed upfront spend ($)<input type="number" min="0" max="1000000000" value={upfront} onChange={e => setUpfront(Math.max(0, Math.min(1e9, Number(e.target.value) || 0)))} /></label>
      <label>Extra weekly expense ($)<input type="number" min="0" max="1000000000" value={weekly} onChange={e => setWeekly(Math.max(0, Math.min(1e9, Number(e.target.value) || 0)))} /></label>
      <button className="button secondary small-button" onClick={() => { setUpfront(0); setWeekly(0); }}>Reset scenario</button></div>
    <div className="planning-summary" aria-live="polite"><span>Closing cash <strong>{money(rows.at(-1)!.balance)}</strong></span><span>Lowest cash <strong>{money(minimum)}</strong></span><span className={firstDebt ? "planning-warning" : ""}>{firstDebt ? `First debt: ${firstDebt}` : `Cash stays non-negative for ${weeks} weeks`}</span></div>
    {drop && <p className="planning-warning">Sponsor income falls to {money(drop.income)} at {drop.label}. The forecast includes this expiry.</p>}
    <p>Preview only: scenarios spend no money. Holds roster, wages, staff and legacy sponsors constant; fixed sponsor deals expire on their saved terms. Player wages continue after expiry. Excludes prizes, new signings/deals, departures and camp refunds. Existing camp reservations are already paid from your balance.</p>
    <div className="planning-scroll" role="region" aria-label="Weekly cash-flow projection" tabIndex={0}><table className="planning-table"><caption>Baseline versus proposed spending · USD · game economy estimates</caption>
      <thead><tr><th scope="col">Weekly settlement</th><th scope="col">Sponsors</th><th scope="col">Payroll</th><th scope="col">Extra</th><th scope="col">Baseline cash</th><th scope="col">Scenario cash</th></tr></thead>
      <tbody>{rows.map((row, i) => <tr key={row.offset}><th scope="row">{row.label}</th><td data-label="Sponsors">{money(row.income)}</td><td data-label="Payroll">{money(row.payroll)}</td><td data-label="Extra">{money(row.extra)}</td><td data-label="Baseline cash">{money(baseline[i].balance)}</td><td data-label="Scenario cash" className={row.balance < 0 ? "planning-warning" : ""}>{money(row.balance)}</td></tr>)}</tbody>
    </table></div>
  </section>;
}
