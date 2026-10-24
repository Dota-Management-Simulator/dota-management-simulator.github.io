import { useEffect, useRef, useState } from "react";
import { Bot, Star, Tv } from "lucide-react";
import type { Campaign, Result } from "./game";
import type { BattleConfig, SimulatedSeries } from "./battle";
import { BOT_TEAM, BOT_WINDOW, botChallengeBlocker, openAiShowmatches, prepareBotChallenge, settleBotChallenge } from "./bot-challenge";
import { ALL_STAR_SOURCE, allStarBlocker, allStarEvent, allStarMatch, prepareAllStar, settleAllStar } from "./all-star";
import type { AllStarMatch } from "./all-star";
import DraftSeries from "./DraftSeries";
import { MatchViewer, SeriesResults } from "./MatchExperience";
import { formatDate } from "./tournaments";
import "./event-modes.css";

type Playing = { kind: "bots"; config: BattleConfig } | { kind: "all-star"; config: BattleConfig; match: AllStarMatch; watch?: SimulatedSeries };

/** Arcade: exhibitions that never move the clock. */
export default function EventModes({ campaign, onChange, onBusy }: { campaign: Campaign; onChange: (c: Campaign) => void; onBusy: (busy: boolean) => void }) {
  const [playing, setPlaying] = useState<Playing | null>(null);
  const [review, setReview] = useState<{ result: Result; spectator: boolean } | null>(null);
  const [error, setError] = useState("");
  const worker = useRef<Worker | null>(null);
  useEffect(() => { onBusy(!!playing); return () => onBusy(false); }, [!!playing, onBusy]);
  useEffect(() => () => worker.current?.terminate(), []);

  const settle = (fn: () => Campaign, result: Result, spectator = false) => {
    try { onChange(fn()); setError(""); setReview({ result, spectator }); }
    catch (e) { setError(e instanceof Error ? e.message : "Could not record the result."); }
    setPlaying(null);
  };
  const start = (fn: () => Playing) => { try { setPlaying(fn()); setError(""); } catch (e) { setError(e instanceof Error ? e.message : "Could not start the match."); } };
  const result = (event: string, config: BattleConfig, simulation: SimulatedSeries, perspective = true): Result => {
    const s = simulation.summary;
    return { eventId: `exhibition-${s.seed}`, event, year: campaign.year, week: campaign.week, won: perspective && s.winner === 0, prize: 0, points: 0, opponent: config.teams[1], score: s.score.join("–"), series: s };
  };
  /** Spectators get the full simulated BO1 in the replay viewer. */
  const watch = (match: AllStarMatch, config: BattleConfig) => {
    const w = new Worker(new URL("./battle.worker.ts", import.meta.url), { type: "module" });
    worker.current = w;
    setPlaying({ kind: "all-star", config, match });
    w.onmessage = ({ data }) => {
      if (worker.current !== w) return;
      if (data.type === "complete") { w.terminate(); worker.current = null; setPlaying({ kind: "all-star", config, match, watch: data.simulation }); }
      else if (data.type === "error") { w.terminate(); worker.current = null; setPlaying(null); setError(data.message); }
    };
    w.postMessage({ ...config, captureReplay: true });
  };

  if (review) return <section className="event-modes"><SeriesResults result={review.result} perspective={review.spectator ? null : 0} managedTeamId={campaign.world?.managedTeamId} closeLabel="Back to Arcade" onClose={() => setReview(null)} /></section>;
  if (playing?.kind === "bots") return <section className="event-modes"><p className="event-modes-banner"><Bot size={17} /> Exhibition vs {BOT_TEAM} · no time passes · no rewards</p>
    <DraftSeries key={playing.config.seed} campaign={campaign} config={playing.config} preparation={campaign.draftPreparation} managedTeamId={campaign.world?.managedTeamId}
      onPreparation={draftPreparation => onChange({ ...campaign, draftPreparation })} onTactics={tacticalPreparation => onChange({ ...campaign, tacticalPreparation })}
      onCancel={() => setPlaying(null)} onComplete={simulation => settle(() => settleBotChallenge(campaign, playing.config, simulation.summary), result(`Exhibition · ${BOT_TEAM}`, playing.config, simulation))} />
    {error && <p role="alert">{error}</p>}</section>;
  if (playing?.kind === "all-star") {
    const { config, match } = playing;
    const label = `${match.year} All-Star match`;
    if (match.managedSide === 0) return <section className="event-modes"><p className="event-modes-banner"><Star size={17} /> {label} · you coach {config.teams[0]} · no time passes</p>
      <DraftSeries key={config.seed} campaign={campaign} config={config} preparation={campaign.draftPreparation} managedTeamId={campaign.world?.managedTeamId}
        onPreparation={draftPreparation => onChange({ ...campaign, draftPreparation })} onTactics={tacticalPreparation => onChange({ ...campaign, tacticalPreparation })}
        onCancel={() => setPlaying(null)} onComplete={simulation => settle(() => settleAllStar(campaign, config, simulation.summary), result(label, config, simulation))} />
      {error && <p role="alert">{error}</p>}</section>;
    if (!playing.watch) return <section className="event-modes"><p className="event-modes-banner" role="status"><Tv size={17} /> Simulating the {label}…</p></section>;
    const simulation = playing.watch;
    return <section className="event-modes"><p className="event-modes-banner"><Tv size={17} /> {label} · spectating</p>
      <MatchViewer simulation={simulation} year={campaign.year} onFinish={() => settle(() => settleAllStar(campaign, config, simulation.summary), result(label, config, simulation, false), true)} /></section>;
  }

  const botBlocker = botChallengeBlocker(campaign);
  const attempts = campaign.botChallenges?.attempts ?? [];
  const wins = attempts.filter(a => a.won).length;
  const event = allStarEvent(campaign);
  const match = event ? allStarMatch(campaign, event) : undefined;
  const starBlocker = allStarBlocker(campaign);
  const played = Object.entries(campaign.allStars ?? {});
  const name = (id: string) => campaign.players.find(p => p.id === id)?.name ?? id;

  return <div className="event-modes">
    <section className="panel event-mode is-bots">
      <div className="section-title"><div><h2><Bot size={22} /> Challenge OpenAI Five</h2>
        <p>Open {formatDate(BOT_WINDOW.from)} – {formatDate(BOT_WINDOW.to)}. Challenges are exhibitions: no time passes and nothing about your club changes.</p></div></div>
      <p>The bots read the true patch: every hero's real strength and every patch axis you only see as a range. They draft almost greedily from that knowledge and play a fixed aggressive script, early ganks into deathball pushes. They match your starters' mechanics plus one point and never read your preparation. Ban their best heroes, draft to survive the early game, and plan for a long one: TI8's two pro teams beat them after the bots led for 20 to 35 minutes.</p>
      <div className="event-mode-record"><span><b>{attempts.length}</b>challenges</span><span><b>{wins}</b>wins</span><span><b>{campaign.botChallenges?.firstWinAt ? formatDate(campaign.botChallenges.firstWinAt.slice(0, 10)) : "—"}</b>first win</span></div>
      <div className="event-mode-actions">
        <button className="button primary" disabled={!!botBlocker} onClick={() => start(() => ({ kind: "bots", config: prepareBotChallenge(campaign, 1) }))}>Challenge · BO1</button>
        <button className="button secondary" disabled={!!botBlocker} onClick={() => start(() => ({ kind: "bots", config: prepareBotChallenge(campaign, 3) }))}>Challenge · BO3</button>
      </div>{botBlocker && <p className="field-note">{botBlocker}</p>}
      {attempts.length > 0 && <ol className="event-mode-history">{attempts.slice(-5).reverse().map(a => <li key={a.id}><strong>{a.won ? "Won" : "Lost"} {a.score.join("–")}</strong> BO{a.bestOf} · patch {a.patchId} · {formatDate(a.at.slice(0, 10))}</li>)}</ol>}
      <details><summary>The real OpenAI Five timeline</summary><ul className="event-mode-timeline">{openAiShowmatches.map(m => <li key={m.date + m.title}><strong>{formatDate(m.date)}{m.checked ? "" : " (day unchecked)"}</strong> {m.title}. {m.detail} <a href={m.source} target="_blank" rel="noreferrer">Source</a></li>)}</ul></details>
    </section>

    <section className="panel event-mode is-all-star">
      <div className="section-title"><div><h2><Star size={22} /> The International All-Star match</h2>
        <p>One fan-voted BO1 at each International that held one, from the first day until two weeks after the final. If one of your players is voted in, you coach their team. Otherwise you watch.</p></div></div>
      {match ? <div className="all-star-teams">{match.teams.map((team, i) => <div key={team.name} className={i === 0 && match.managedSide === 0 ? "is-coached" : ""}><h3>{team.name}{i === 0 && match.managedSide === 0 && <small> · you coach</small>}</h3>
        <ol>{team.players.map(id => <li key={id} className={campaign.roster.includes(id) ? "is-yours" : ""}>{name(id)}</li>)}</ol></div>)}</div>
        : <p className="muted">{starBlocker}</p>}
      {match && <div className="event-mode-actions"><button className="button primary" disabled={!!starBlocker} onClick={() => start(() => {
        const { match, config } = prepareAllStar(campaign);
        if (match.managedSide !== 0) { watch(match, config); return { kind: "all-star", config, match }; }
        return { kind: "all-star", config, match };
      })}>{match.managedSide === 0 ? `Coach ${match.teams[0].name}` : "Watch the All-Star match"}</button></div>}
      {match && starBlocker && <p className="field-note">{starBlocker}</p>}
      {played.length > 0 && <ol className="event-mode-history">{played.map(([id, r]) => <li key={id}><strong>{r.teams[0]} {r.score.join("–")} {r.teams[1]}</strong> {formatDate(r.at.slice(0, 10))}{r.coached ? " · coached" : " · watched"}</li>)}</ol>}
      <p className="field-note">Years: 2012–2019, 2021 and 2022. <a href={ALL_STAR_SOURCE} target="_blank" rel="noreferrer">AFK Gaming</a> reported TI 2023 as the first without an All-Star match. Exact match days and later years are unchecked.</p>
    </section>
    {error && <p role="alert">{error}</p>}
  </div>;
}
