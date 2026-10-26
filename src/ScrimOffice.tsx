import { patchLabel } from "./patch-label";
import { useEffect, useState } from "react";
import { CalendarDays, FlaskConical } from "lucide-react";
import type { Campaign, Result } from "./game";
import type { BattleConfig } from "./battle";
import { cancelScrim, prepareScrim, respondToScrim, scheduleScrim, scrimOpponents, scrimPlayBlocker, scrimSlotBlocker, settleScrim } from "./scrims";
import { scrimFocuses, scrimHours } from "./scrim-state";
import type { ScrimFocus } from "./scrim-state";
import { campaignPatch } from "./patches";
import { heroById } from "./heroes";
import { heroScoutReport } from "./hero-scouting";
import { managedPatchObserver } from "./patch-knowledge";
import DraftSeries from "./DraftSeries";
import { SeriesResults } from "./MatchExperience";
import RangeBars from "./RangeBars";
import TeamBadge from "./TeamBadge";
import "./scrims.css";

export default function ScrimOffice({ campaign, onChange, onBusy, onCalendar }: { campaign: Campaign; onChange: (c: Campaign) => void; onBusy: (busy: boolean) => void; onCalendar: () => void }) {
  const opponents = scrimOpponents(campaign);
  const [opponent, setOpponent] = useState(opponents[0]?.id ?? "");
  const [at, setAt] = useState(() => new Date(Date.parse(campaign.calendar?.now ?? `${campaign.year}-01-01`) + 86400000).toISOString().slice(0, 10) + "T12:00");
  const [bestOf, setBestOf] = useState<1 | 2 | 3>(2);
  const [focus, setFocus] = useState<ScrimFocus>("balanced");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [playing, setPlaying] = useState<{ id: string; config: BattleConfig } | null>(null);
  const [resultId, setResultId] = useState<string | null>(null);
  useEffect(() => { onBusy(!!playing); return () => onBusy(false); }, [!!playing, onBusy]);
  const action = (fn: () => Campaign, message = "") => {
    try { const next = fn(); onChange(next); setError(""); setNotice(message); return next; }
    catch (e) { setError(e instanceof Error ? e.message : "Could not update the scrim."); }
  };
  const start = (id: string) => {
    try {
      const next = prepareScrim(campaign, id);
      setPlaying({ id, config: next.scrims!.sessions.find(s => s.id === id)!.config! });
      setError("");
    } catch (e) { setError(e instanceof Error ? e.message : "Could not start scrim."); }
  };
  if (playing) return <section className="scrim-office"><p className="scrim-private"><FlaskConical size={17} /> Private practice · {scrimFocuses[campaign.scrims!.sessions.find(s => s.id === playing.id)!.focus].name} · no competition rewards</p>
    <DraftSeries key={playing.id} campaign={campaign} config={playing.config} preparation={campaign.draftPreparation} managedTeamId={campaign.world?.managedTeamId}
      onPreparation={draftPreparation => onChange({ ...campaign, draftPreparation })}
      onTactics={tacticalPreparation => onChange({ ...campaign, tacticalPreparation })}
      onCancel={() => setPlaying(null)} onComplete={simulation => {
        // Pre-match configuration is held in memory, never written to the save.
        const pinned = { ...campaign, scrims: { ...campaign.scrims!, sessions: campaign.scrims!.sessions.map(s => s.id === playing.id ? { ...s, config: playing.config } : s) } };
        if (action(() => settleScrim(pinned, playing.id, simulation.summary))) { setResultId(playing.id); setPlaying(null); return true; }
        return false;
      }} />{error && <p role="alert">{error}</p>}</section>;
  const result = campaign.scrims?.sessions.find(s => s.id === resultId);
  if (result?.series) {
    const view: Result = { eventId: result.id, event: `Private scrim · ${scrimFocuses[result.focus].name}`, year: new Date(result.at).getUTCFullYear(), week: campaign.week, won: result.series.winner === 0, prize: 0, points: 0, opponent: result.opponent, score: result.series.score.join("–"), series: result.series };
    return <section className="scrim-office"><ScrimReview campaign={campaign} id={result.id} /><SeriesResults result={view} playedAt={result.at} managedTeamId={campaign.world?.managedTeamId} closeLabel="Back to scrims" onClose={() => setResultId(null)} /></section>;
  }
  const sessions = campaign.scrims?.sessions ?? [];
  const requests = sessions.filter(s => s.status === "requested");
  const scheduled = sessions.filter(s => s.status === "scheduled").sort((a, b) => Date.parse(a.at) - Date.parse(b.at));
  const history = sessions.filter(s => !["requested", "scheduled"].includes(s.status)).slice().reverse();
  const iso = at ? `${at}:00Z` : "";
  const blocker = scrimSlotBlocker(campaign, opponent, iso, bestOf);
  const focusSelect = <label>Practice focus<select value={focus} onChange={e => setFocus(e.target.value as ScrimFocus)}>{Object.entries(scrimFocuses).map(([id, f]) => <option key={id} value={id}>{f.name}</option>)}</select></label>;
  return <div className="scrim-office">
    <section className="panel scrim-intro"><div className="section-title"><div><h2><FlaskConical size={22} /> Practice with a purpose</h2><p>Test drafts, live calls and item builds against another club.</p></div><button className="text-link" onClick={onCalendar}>Season calendar →</button></div>
      <p>Each played map costs 5 energy and gives small focus and Confidence gains to the participants. Debriefs slowly narrow your current-patch estimates for heroes on both teams. Two observations let your coach consider a hero; 24 reach a four-point read. A scrim win is evidence from practice, never a guaranteed ranking.</p>
      <p className="field-note">One session per 24 hours. Book up to 28 days ahead; UTC times reserve {scrimHours(bestOf)} hours for BO{bestOf}. BO2 always plays two maps and can end 1–1. Private results stay outside career statistics, tournament form, standings and prize money. Weekly training and payroll continue normally.</p>
    </section>
    {!campaign.calendar ? <section className="panel"><h2>A dated diary is needed</h2><p>Open Season calendar to review switching this legacy campaign to dated scheduling.</p><button className="button primary" onClick={onCalendar}>Open calendar</button></section> : <>
    <section className="panel"><div className="section-title"><div><h2>Schedule a scrim</h2><p>Bookings and request decisions leave the clock and player ratings unchanged.</p></div></div>
      <form className="scrim-form" onSubmit={e => { e.preventDefault(); action(() => scheduleScrim(campaign, opponent, iso, bestOf, focus), "Scrim scheduled. Continue will stop at its start time."); }}>
        <label>Opponent<select value={opponent} onChange={e => setOpponent(e.target.value)}>{opponents.map(t => <option key={t.id} value={t.id}>{t.name} · {t.region}</option>)}</select></label>
        <label>Start time (UTC)<input type="datetime-local" required value={at} min={campaign.calendar.now.slice(0, 16)} max={new Date(Date.parse(campaign.calendar.now) + 28 * 86400000).toISOString().slice(0, 16)} onChange={e => setAt(e.target.value)} /></label>
        <label>Series length<select value={bestOf} onChange={e => setBestOf(Number(e.target.value) as 1 | 2 | 3)}><option value={1}>BO1 · one map</option><option value={2}>BO2 · two maps</option><option value={3}>BO3 · first to two</option></select></label>
        {focusSelect}<button className="button primary" type="submit" disabled={!!blocker}><CalendarDays size={16} /> Schedule scrim</button>
      </form>{blocker && <p className="field-note">{blocker}</p>}
    </section>
    <section className="panel"><div className="section-title"><div><h2>Incoming requests · {requests.length}</h2><p>Simulated clubs offer practice once a week when a slot is available.</p></div></div>
      {!requests.length && <p className="muted">No open requests. New offers arrive as the calendar moves forward.</p>}
      {requests.map(s => { const reason = scrimSlotBlocker(campaign, s.opponentId, s.at, s.bestOf, s.id); return <article className="scrim-row" key={s.id}><TeamBadge teamId={s.opponentId} name={s.opponent} year={campaign.year} size="small" /><div><h3>{s.opponent}</h3><p>{displayTime(s.at)} · BO{s.bestOf} · expires at start</p><small>{reason ?? `Accept with focus: ${scrimFocuses[focus].name}`}</small></div><div className="scrim-actions"><button className="button secondary small-button" disabled={!!reason} onClick={() => action(() => respondToScrim(campaign, s.id, true, focus), "Request accepted. Your scrim is on the diary.")}>Accept request</button><button className="text-link" onClick={() => action(() => respondToScrim(campaign, s.id, false))}>Decline</button></div></article>; })}
    </section>
    <section className="panel"><div className="section-title"><div><h2>Scheduled sessions · {scheduled.length}</h2><p>Continue pauses for each accepted scrim.</p></div></div>
      {!scheduled.length && <p className="muted">Your practice diary is open.</p>}
      {scheduled.map(s => { const reason = scrimPlayBlocker(campaign, s); return <article className="scrim-row" key={s.id}><TeamBadge teamId={s.opponentId} name={s.opponent} year={campaign.year} size="small" /><div><h3>{s.opponent}</h3><p>{displayTime(s.at)} · BO{s.bestOf} · {scrimFocuses[s.focus].name}</p><small>{reason ?? "Ready to draft and practice"}</small></div><div className="scrim-actions"><button className="button primary small-button" disabled={!!reason} onClick={() => start(s.id)}>Play scrim</button><button className="text-link" onClick={() => action(() => cancelScrim(campaign, s.id), "Scrim cancelled. The date is available again.")}>Cancel scrim</button></div></article>; })}
    </section></>}
    {notice && <p role="status" className="scrim-notice">{notice}</p>}{error && <p role="alert">{error}</p>}
    <section className="panel"><h2>Practice history</h2>{!history.length && <p className="muted">Completed sessions and handled requests will appear here.</p>}{history.map(s => <article className="scrim-row" key={s.id}><div><h3>{s.opponent} {s.series && `· ${s.series.score.join("–")}`}</h3><p>{displayTime(s.at)} · BO{s.bestOf} · {s.status}</p></div>{s.series && <button className="text-link" onClick={() => setResultId(s.id)}>Review scrim</button>}</article>)}</section>
  </div>;
}

const displayTime = (at: string) => `${at.slice(0, 16).replace("T", " ")} UTC`;
function ScrimReview({ campaign, id }: { campaign: Campaign; id: string }) {
  const s = campaign.scrims!.sessions.find(s => s.id === id)!;
  const patch = campaignPatch(campaign);
  const pool = (s.review?.heroes ?? []).flatMap(id => { const hero = heroById(id); return hero ? [hero] : []; });
  const report = heroScoutReport(patch, managedPatchObserver(campaign), pool);
  return <section className="panel scrim-review"><div className="eyebrow">PRIVATE PRACTICE DEBRIEF</div><h2>What the squad learned</h2><p>{s.series!.games.length} maps · {scrimFocuses[s.focus].name} · match patch {patchLabel(s.series!.patch)}. Both wins and losses provide practice.</p>
    <div className="scrim-gains">{s.review?.players.map(p => <div key={p.id}><strong>{p.name}</strong><span>+{p.training.toFixed(2)} focus skills · +{p.confidence.toFixed(2)} Confidence</span><small>{p.energy} energy</small></div>)}</div>
    {patch.id === s.series!.patch?.id ? <><h3>Hero observations · patch {patchLabel(patch)}</h3><p className="field-note">Confidence reflects accumulated debriefs. These are gradual scouting reads; this series’ win rate alone cannot establish equal-team strength.</p><div className="scrim-hero-reads">{report.map(row => <div key={row.hero.id}><strong>{row.hero.name}</strong><small>{row.samples} practice {row.samples === 1 ? "map" : "maps"} · {row.samples < 4 ? "Early" : row.samples < 12 ? "Developing" : "Established"} read</small><RangeBars label={row.hero.name} current={row.winRate} unit="%" /></div>)}</div></> : <p>These observations belong to patch {patchLabel(s.series!.patch)}; the current patch has its own research.</p>}
  </section>;
}
