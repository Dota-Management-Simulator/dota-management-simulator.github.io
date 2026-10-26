import { useState } from "react";
import type { Campaign, Player } from "./game";
import { money, releasePlayer, releasePlayerBlocker } from "./game";
import { campaignWeek, releaseCost } from "./contracts";
import { sourceFor } from "./history";
import { playerTournamentLock } from "./tournament-locks";
import { playerTalkBlocker, talkToPlayer, welfareAssessment, welfareStatus } from "./player-welfare";
import "./player-welfare.css";

export default function PlayerWelfarePanel({ campaign, player, onChange }: { campaign: Campaign; player: Player; onChange: (c: Campaign) => void }) {
  const [confirmKick, setConfirmKick] = useState(false);
  const managed = campaign.roster.includes(player.id);
  const { preferences: p, record, workload, form, concerns, relations } = welfareAssessment(campaign, player);
  const releaseBlock = managed ? releasePlayerBlocker(campaign, player.id) : null;
  const talkBlock = playerTalkBlocker(campaign, player.id);
  const noticeLeft = record.noticeAt === undefined ? null : Math.max(0, record.noticeAt + 2 - campaignWeek(campaign));
  const lock = playerTournamentLock(campaign, player.id);
  const lastDeparture = campaign.welfare?.departures.filter(d => d.playerId === player.id).at(-1);
  return <section className="welfare-panel" aria-label="Player expectations and team relations">
    <div className="welfare-heading"><h3>Expectations & team relations</h3>{managed && <strong className={`welfare-status ${record.noticeAt !== undefined ? "urgent" : ""}`}>{welfareStatus(campaign, player.id)} · {record.satisfaction}% satisfaction</strong>}</div>
    <p className="field-note">Simulated personality and demands. Historical roster observations only make a small adjustment to patience.</p>
    <dl className="welfare-expectations">
      <div><dt>Competitive ambition</dt><dd>At least {p.winRate}% wins over the last 20 competitive maps; assessed after 6 maps.</dd></div>
      <div><dt>Free time</dt><dd>At most {p.maxHours}h training + scrims + media and at least {p.restDays} days off each week.</dd></div>
      <div><dt>Practice preference</dt><dd>{p.practice === "scrims" ? `Scrims first: at least ${p.scrimHours}h of attended scrims in a training week.` : p.practice === "training" ? "Individual training: at least as many training hours as scrim hours." : "Flexible mix of training and scrims."}</dd></div>
      <div><dt>Patience</dt><dd>{p.demanding ? "Needs close attention" : "More patient"} · at least {p.patience} unhappy weeks before notice, then 2 weekly reviews to improve.</dd></div>
    </dl>
    {managed && <>
      <p className="welfare-current">Weekly plan: {workload.trainingHours.toFixed(1)}h training · {workload.mediaHours}h media · {workload.restDays} days off. Attended scrims in the last 7 days: {workload.scrimHours.toFixed(1)}h. {form.played < 6 ? `${form.played}/6 competitive maps before win-rate assessment.` : `${form.winRate}% wins in ${form.played} competitive maps.`}</p>
      {campaignWeek(campaign) - record.joinedAt < 2 && <p className="field-note">Settling in: the first two weeks allow time to arrange the schedule.</p>}
      {noticeLeft !== null && <p className="welfare-warning" role="status">{noticeLeft ? `Has given notice. Improve the underlying concerns within ${noticeLeft} weekly ${noticeLeft === 1 ? "review" : "reviews"}.` : lock ? "Departure pending: will finish the registered tournament first." : "Departure is due at the next weekly review."} A meeting alone does not withdraw notice.</p>}
      {concerns.length ? <ul className="welfare-concerns">{concerns.map(issue => <li key={issue.text}>{issue.text}</li>)}</ul> : <p>No unmet expectations in the current review.</p>}
      <details><summary>Teammate relationships</summary><p className="field-note">Simulated working relationships. Clashing styles cause tension during overload, exhaustion or poor results; recovery and mediation ease it.</p><ul>{relations.map(other => <li key={other.id}>{other.name}: {Math.round(other.tension)}/100 tension · {other.clash ? "clashing styles" : "compatible styles"}</li>)}</ul></details>
      <div className="welfare-actions"><button className="button secondary small-button" disabled={!!talkBlock} onClick={() => onChange(talkToPlayer(campaign, player.id))}>Meet & mediate</button>{talkBlock && <span className="field-note">{talkBlock}</span>}</div>
      <p className="field-note">Meetings ease tension and add 8 satisfaction, once per four weeks. Fix schedules, results, morale or the lineup for lasting improvement. Training days have no assigned weekdays; days off use the larger of training-day and scrim-day counts.</p>
      {confirmKick ? <div className="welfare-kick" role="group" aria-label={`Confirm kicking ${player.name}`}><strong>Kick {player.name}?</strong><p>Pay {money(releaseCost(campaign, player.id))} in early release. The {player.role.toLowerCase()} position becomes vacant and competition requires a replacement.</p><div className="welfare-actions"><button className="button danger" disabled={!!releaseBlock} onClick={() => { onChange(releasePlayer(campaign, player.id)); setConfirmKick(false); }}>Confirm kick</button><button className="button secondary" onClick={() => setConfirmKick(false)}>Keep player</button></div></div> : <button className="button secondary small-button" disabled={!!releaseBlock} onClick={() => setConfirmKick(true)}>Kick player · {money(releaseCost(campaign, player.id))}</button>}
      {releaseBlock && <p className="field-note">{releaseBlock}</p>}
    </>}
    {!managed && lastDeparture && <p className="field-note">{lastDeparture.kind === "quit" ? "Quit" : "Kicked"} · {lastDeparture.at}. {lastDeparture.reason}</p>}
    {!!p.movement.observations && <details><summary>Historical roster context through {p.movement.through}</summary><p>{p.movement.changes} individual organization changes between consecutive unambiguous annual observations ({p.movement.observations} snapshots). Whole-core moves and ambiguous years are excluded. This is partial coverage and does not establish why a player moved.</p><p>{p.movement.sources.slice(0, 5).map(id => { const source = sourceFor(id); return source ? <a key={id} href={source.url} target="_blank" rel="noreferrer">{source.title ?? id} ↗ </a> : null; })}</p></details>}
  </section>;
}
