import { useEffect, useRef, useState } from "react";
import { ArrowRight, CalendarDays, Trophy } from "lucide-react";
import type { Campaign, Result } from "./game";
import { money } from "./game";
import { activeTournament, commitTournamentRun, nextTournamentCommitment, settleTournamentMatch, tournamentBattleConfig, tournamentTeamTemplate, withTournamentStrength } from "./historical-game";
import { fixtureTeams, formatDate, formatPrize, groupStandings, nextTournamentFixture, pinTournamentRun, tournamentById, tournamentForRun } from "./tournaments";
import type { HistoricalTournament, TournamentRun } from "./tournament-types";
import type { SimulatedSeries } from "./battle";
import type { TournamentWorkerInput } from "./tournament.worker";
import { MatchViewer, SeriesResults } from "./MatchExperience";
import TeamBadge from "./TeamBadge";
import TournamentCalendarBoard from "./TournamentCalendarBoard";
import { advanceManagerWeek } from "./office";
import "./tournaments.css";
import TournamentSources from "./TournamentSources";
import TournamentOutlook from "./TournamentOutlook";

function EventFacts({ event }: { event: HistoricalTournament }) {
  return <details className="tournament-facts"><summary>Format, prize distribution & source</summary>
    <p>{formatDate(event.start)} – {formatDate(event.end)} · {event.location} · {event.teams.length} teams</p>
    <div className="tournament-format">{event.format}</div>
    {event.prizes.length > 0 && <table><caption>{money(event.pool)} total prize pool</caption><thead><tr><th>Placement</th><th>Prize per team</th></tr></thead><tbody>{event.prizes.map(p => <tr key={`${p.from}-${p.to}`}><th scope="row">{p.from === p.to ? p.from : `${p.from}–${p.to}`}</th><td>{formatPrize(p.usd)}</td></tr>)}</tbody></table>}
    {event.poolNote && <p className="field-note">{event.poolNote}</p>}
    <TournamentSources event={event} />
    <p className="field-note">Tournament windows and verified series times follow the historical schedule. Where a match date could not be recovered, its playable date is marked as an estimate. Opponents, advancement and finishing places follow your campaign results.</p>
  </details>;
}

export function TournamentHistory({ campaign, eventId, onClose }: { campaign: Campaign; eventId: string; onClose: () => void }) {
  const run = campaign.calendar?.runs.find(r => r.eventId === eventId);
  const event = run ? tournamentForRun(run) : tournamentById(eventId);
  const [selected, setSelected] = useState<string | null>(null);
  if (!event || !run) return <div className="text-modal"><h2 id="modal-title">Tournament archive unavailable</h2><button className="button secondary" onClick={onClose}>Back</button></div>;
  const match = run.matches.find(m => m.id === selected);
  if (match?.series) return <SeriesResults key={match.id} result={{ eventId: match.id, event: `${event.name} · ${run.fixtures.find(f => f.id === match.id)?.stage}`, year: event.year, week: 0, won: match.series.winner === 0, prize: 0, points: 0, opponent: match.series.teams[1], score: match.series.score.join(" – "), series: match.series }} managedTeamId={campaign.world?.managedTeamId} onClose={() => setSelected(null)} />;
  return <div className="tournament-history"><div className="eyebrow">TOURNAMENT RESULTS · {event.year}</div><h2 id="modal-title">{event.name}</h2>
    <TournamentStandings event={event} run={run} onSeries={setSelected} />
    <TournamentOutlook campaign={campaign} run={run} at={campaign.calendar!.now} />
    <EventFacts event={event} />
    <button className="button secondary full" onClick={onClose}>Back to management</button></div>;
}

function TournamentStandings({ event, run, onSeries }: { event: HistoricalTournament; run: TournamentRun; onSeries?: (id: string) => void }) {
  const name = (key: string) => run.teams.find(t => t.id === key)?.name ?? key;
  const place = run.placements.find(p => p.team === run.managed);
  const standings = (group: string) => {
    const rows = groupStandings(run, group);
    const order = run.groupOrder[group];
    return order ? rows.sort((a, b) => order.indexOf(a.team) - order.indexOf(b.team)) : rows;
  };
  return <>
    {place && <div className="qualification-banner"><Trophy size={26} /><div><strong>{place.from === 1 ? "Tournament champions" : `${place.from === place.to ? place.from : `${place.from}–${place.to}`} place`}</strong><p>{money(place.prize)} gross prize · player shares use the registered contracts.</p></div></div>}
    <div className="tournament-groups">{event.groups.map(group => <section className="tournament-group" key={group.id}><h3>{group.name}</h3><table><thead><tr><th>Team</th><th>Series</th><th>Maps</th><th>Pts</th></tr></thead><tbody>{standings(group.id).map(row => <tr key={row.team} className={row.team === run.managed ? "managed-row" : ""}><th scope="row">{name(row.team)}</th><td>{row.wins}–{row.draws}–{row.losses}</td><td>{row.gamesWon}–{row.gamesLost}</td><td>{row.points}</td></tr>)}</tbody></table></section>)}</div>
    <details className="tournament-fixtures" open><summary>Matches · {run.matches.length} completed</summary><div>{run.matches.map(match => { const fixture = run.fixtures.find(f => f.id === match.id)!;return <div className={`tournament-match ${match.teams.includes(run.managed) ? "managed-row" : ""}`} key={match.id}><span><small>{fixture.stage} · BO{fixture.bestOf}</small>{name(match.teams[0])} <strong>{match.score.join(" – ")}</strong> {name(match.teams[1])}</span>{match.series && onSeries && <button className="text-link" onClick={() => onSeries(match.id)}>Scoreboards</button>}</div>;})}</div></details>
    {run.state === "complete" && <details className="tournament-fixtures"><summary>Final placements</summary><table><thead><tr><th>Place</th><th>Team</th><th>Prize</th></tr></thead><tbody>{[...run.placements].sort((a, b) => a.from - b.from).map(p => <tr key={p.team} className={p.team === run.managed ? "managed-row" : ""}><td>{p.from === p.to ? p.from : `${p.from}–${p.to}`}</td><th scope="row">{name(p.team)}</th><td>{formatPrize(p.prize)}</td></tr>)}</tbody></table></details>}
  </>;
}

export default function HistoricalCalendar({ campaign, onChange, onHistory, focusEventId, focusRequest, onBusyChange }: { campaign: Campaign; onChange: (c: Campaign) => void; onHistory: (result: Result) => void; focusEventId?: string; focusRequest?: number; onBusyChange?: (busy: boolean) => void }) {
  const [activeId, setActiveId] = useState<string | undefined>();
  const [error, setError] = useState("");
  const [advanceNotice, setAdvanceNotice] = useState("");
  const [computing, setComputing] = useState(false);
  const [progress, setProgress] = useState("");
  const [simulation, setSimulation] = useState<SimulatedSeries | null>(null);
  useEffect(() => { onBusyChange?.(computing || simulation !== null); }, [computing, simulation, onBusyChange]);
  useEffect(() => () => onBusyChange?.(false), [onBusyChange]);
  const worker = useRef<Worker | null>(null);
  const latestCampaign = useRef(campaign);
  latestCampaign.current = campaign;
  const latestChange = useRef(onChange);
  latestChange.current = onChange;
  const playing = campaign.calendar!.runs.filter(r => r.state === "playing");
  const commitment = nextTournamentCommitment(campaign);
  const run = playing.find(r => r.eventId === activeId) ?? playing.find(r => r.eventId === commitment?.eventId) ?? activeTournament(campaign);
  const event = run ? tournamentForRun(run) : undefined;
  const fixture = run ? nextTournamentFixture(run) : undefined;
  const readyTeams = run && fixture ? fixtureTeams(run, fixture) : null;
  const managedReady = !!(readyTeams && run && readyTeams.includes(run.managed));
  const earlierCommitment = commitment && fixture && commitment.eventId !== run?.eventId && Date.parse(commitment.at) < Date.parse(fixture.at) ? commitment : null;
  const otherCommitment = run ? nextTournamentCommitment({ ...campaign, calendar: { ...campaign.calendar!, runs: campaign.calendar!.runs.filter(other => other.eventId !== run.eventId) } }) : null;
  useEffect(() => { if (focusEventId && campaign.calendar!.runs.some(r => r.eventId === focusEventId && r.state === "playing")) setActiveId(focusEventId); }, [focusEventId, focusRequest]);
  useEffect(() => () => { worker.current?.terminate(); }, []);
  useEffect(() => {
    if (!run || managedReady || worker.current || error || earlierCommitment) return;
    const nextWorker = new Worker(new URL("./tournament.worker.ts", import.meta.url), { type: "module" });
    worker.current = nextWorker; setComputing(true); setProgress("Simulating the other tournament matches…");
    const templates: TournamentWorkerInput["templates"] = {};
    for (const team of run.teams) {
      templates[team.id] = tournamentTeamTemplate(campaign, run, team.id);
    }
    const fail = (message: string) => { nextWorker.terminate(); worker.current = null; setComputing(false); setError(message); };
    nextWorker.onmessage = ({ data: message }) => {
      if (worker.current !== nextWorker) return;
      if (message.type === "progress") setProgress(`${message.played} other series completed. Every map uses the lane engine.`);
      else if (message.type === "complete") {
        nextWorker.terminate(); worker.current = null; setComputing(false);
        try { latestChange.current(commitTournamentRun(latestCampaign.current, message.run)); } catch (e) { setError(e instanceof Error ? e.message : "Could not record tournament progress."); }
      } else if (message.type === "error") fail(message.message);
    };
    nextWorker.onerror = () => fail("The tournament worker could not finish. Your saved progress is unchanged.");
    nextWorker.postMessage({ run: withTournamentStrength(pinTournamentRun(run)), templates, year: event!.year, heroPoolThroughYear: Math.min(2026, Math.max(2010, ...campaign.calendar!.shuffledYears)), through: otherCommitment?.at } satisfies TournamentWorkerInput);
    return () => { if (worker.current === nextWorker) { nextWorker.terminate(); worker.current = null; } };
  }, [run, managedReady, error, earlierCommitment?.eventId, otherCommitment?.at]); // Progress messages do not restart a batch.

  const startSeries = (skip: boolean) => {
    if (!run || !fixture || worker.current || !managedReady || earlierCommitment) return;
    setError(""); setComputing(true); setProgress(`Simulating ${fixture.stage} · BO${fixture.bestOf}…`);
    const nextWorker = new Worker(new URL("./battle.worker.ts", import.meta.url), { type: "module" });
    worker.current = nextWorker;
    nextWorker.onmessage = ({ data: message }) => {
      if (worker.current !== nextWorker) return;
      if (message.type === "progress") setProgress(`${message.games} maps completed · BO${fixture.bestOf}`);
      else if (message.type === "complete") {
        nextWorker.terminate(); worker.current = null; setComputing(false);
        if (skip) finishSeries(message.simulation);
        else setSimulation(message.simulation);
      } else if (message.type === "error") { nextWorker.terminate(); worker.current = null; setComputing(false); setError(message.message); }
    };
    nextWorker.onerror = () => { nextWorker.terminate(); worker.current = null; setComputing(false); setError("The match worker could not finish. Retry from your last saved series."); };
    nextWorker.postMessage(tournamentBattleConfig(campaign, run, fixture));
  };
  const finishSeries = (result: SimulatedSeries) => {
    if (!run || !fixture) return;
    try { onChange(settleTournamentMatch(latestCampaign.current, run.eventId, fixture.id, result.summary)); setSimulation(null); }
    catch (e) { setError(e instanceof Error ? e.message : "Could not record this series."); }
  };
  if (simulation && run) return <section className="panel tournament-viewer"><MatchViewer key={`${run.eventId}-${fixture?.id}`} simulation={simulation} year={event!.year} managedTeamId={campaign.world?.managedTeamId} onFinish={() => finishSeries(simulation)} /></section>;
  return <div className="historical-calendar">
    <div className="qualification-banner"><CalendarDays size={28} /><div><strong>{formatDate(campaign.calendar!.now, campaign.calendar!.nowHasTime)}</strong><p>Real tournament dates. Weekly advances stop at invited or reserved openings and scheduled series. Lineups remain committed through their tournament run.</p>{advanceNotice && <p role="status">{advanceNotice}</p>}</div><button className="button secondary small-button" disabled={computing} onClick={() => { const next = advanceManagerWeek(campaign); setAdvanceNotice(next.calendar!.now === campaign.calendar!.now ? "A decision is due: play your next series, or open your invited/reserved event below to enter or decline it." : `Advanced to ${formatDate(next.calendar!.now)}. Club updates are in your inbox.`); onChange(next); }}>Advance up to 7 days</button></div>
    {playing.length > 1 && <label className="tournament-run-selector">Active tournament<select value={run?.eventId} disabled={computing || !!simulation} onChange={e => { setActiveId(e.target.value); setError(""); }}>{playing.map(r => <option key={r.eventId} value={r.eventId}>{tournamentById(r.eventId)?.name ?? r.eventId}</option>)}</select></label>}
    {error && <div role="alert" className="muted-callout"><p>{error}</p><button className="button secondary small-button" onClick={() => setError("")}>Retry</button></div>}
    {run && event && <section className="panel tournament-active"><div className="eyebrow">IN PROGRESS · REGISTERED LINEUP</div><h2>{event.name}</h2>
      {computing ? <p role="status" aria-live="polite">{progress}</p> : managedReady && fixture ? <>
        <p>{fixture.stage} · {fixture.label} · BO{fixture.bestOf} · {formatDate(fixture.at, fixture.timeVerified)}{!fixture.timeVerified && (fixture.dateVerified ? " · Start time not recorded" : " · Estimated match date")}</p>
        <div className="tournament-next-match">{readyTeams!.map((key, i) => { const team = run.teams.find(t => t.id === key)!; return <span key={key}>{i === 1 && <small>vs</small>}<TeamBadge teamId={team.clubId} name={team.name} year={event.year} />{team.name}</span>; })}</div>
        {fixture.advantage?.some(Boolean) && <p>Starting score: {fixture.advantage.join(" – ")} · historical upper-bracket advantage</p>}
        {earlierCommitment && <p>Play the earlier commitment at {tournamentById(earlierCommitment.eventId)?.name} first. <button className="text-link" onClick={() => setActiveId(earlierCommitment.eventId)}>Switch to next scheduled event</button></p>}
        <div className="tournament-actions"><button className="button primary" disabled={!!earlierCommitment} onClick={() => startSeries(false)}>Play & watch series <ArrowRight size={16} /></button><button className="button secondary" disabled={!!earlierCommitment} onClick={() => startSeries(true)}>Simulate series & skip playback</button></div>
      </> : earlierCommitment ? <p>Play the earlier commitment at {tournamentById(earlierCommitment.eventId)?.name} before continuing this bracket.</p> : <p>Preparing the next stage…</p>}
      <p className="field-note">Progress is saved after every series. Reloading during a match returns to that series. Players whose terms expire stay on the same pay and registered prize share until this run ends. Unscouted opponents use clearly labeled placeholder players.</p>
      <TournamentOutlook campaign={campaign} run={run} at={fixture?.at ?? campaign.calendar!.now} />
      <TournamentStandings event={event} run={run} /><EventFacts event={event} />
    </section>}
    <TournamentCalendarBoard campaign={campaign} onChange={next => {
      const entered = next.calendar?.runs.find(r => r.state === "playing" && !campaign.calendar!.runs.some(old => old.eventId === r.eventId));
      if (entered) setActiveId(entered.eventId);
      onChange(next);
    }} onHistory={onHistory} busy={computing} focusEventId={playing.some(r => r.eventId === focusEventId) ? undefined : focusEventId} focusRequest={focusRequest} />
  </div>;
}
