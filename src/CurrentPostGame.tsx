import { useEffect, useRef, useState } from "react";
import type { RefObject } from "react";
import { Pause, Play } from "lucide-react";
import type { PlayerScore } from "./battle";
import { matchClock } from "./battle";
import type { ScoreboardGame, ScoreboardSeries } from "./scoreboards";
import { heroMedia } from "./hero-media";
import { HeroToken } from "./HeroToken";
import { breakdownMetrics, scoreMetric, teamMetricShare } from "./post-game";
import type { BreakdownMetric } from "./post-game";
import ItemInventory from "./ItemInventory";
import { patchById } from "./patches";
import { heroRoles } from "./heroes";
import { talentTiers } from "./talents";
import { RecordedPlayerIdentity } from './PlayerIdentity';
import "./post-game-current.css";

const sides = [0, 1] as const;
const amount = (n: number | null | undefined) => n == null ? "—" : Math.round(n).toLocaleString();

/** Current-client composition follows the dated 2026 overview capture in
 * docs/post-game.md: one ten-player strip, top tabs, and an unframed result. */
export function CurrentMatchHeader({ game, headingId, heading, event, teams }: {
  game: ScoreboardGame; headingId: string; heading: RefObject<HTMLHeadingElement | null>;
  event: string; teams: [string, string];
}) {
  return <header className={`current-match-header post-side-${game.winner} ${game.winner === 1 ? "is-dire" : ""}`}>
    <h2 id={headingId} ref={heading} tabIndex={-1}>{game.winner === 0 ? "Radiant" : "Dire"} Victory</h2>
    <div className="current-match-score"><strong>{game.kills[0]}</strong><div><small>CAPTAIN’S MODE</small><span>DURATION</span><time>{matchClock(game.duration)}</time></div><strong>{game.kills[1]}</strong></div>
    <p className="current-match-context">{teams[game.winner]} · {event}</p>
  </header>;
}

export function CurrentOverview({ game, teams, inspect, motion, setMotion }: {
  game: ScoreboardGame; teams: [string, string]; inspect: (p: PlayerScore) => void;
  motion: boolean; setMotion: (value: boolean) => void;
}) {
  const [visible, setVisible] = useState(!document.hidden);
  useEffect(() => {
    const visibility = () => setVisible(!document.hidden);
    document.addEventListener("visibilitychange", visibility);
    return () => document.removeEventListener("visibilitychange", visibility);
  }, []);
  return <div className="current-overview">
    <div className="current-lineup-scroll" role="region" aria-label="Hero lineups; scroll to inspect all ten players" tabIndex={0}>
      <div className="current-lineups">{sides.map(side => <section key={side} className={`current-lineup-team post-side-${side}`} aria-label={`${side === 0 ? "Radiant" : "Dire"}: ${teams[side]}`}>
        <div className="current-hero-slats">{game.players.filter(p => p.team === side).map(p => <button className="current-hero-slat" key={p.id} title={`${p.player} · ${p.hero} · Level ${p.level}`} aria-label={`View ${p.player} breakdown, ${p.hero}`} onClick={() => inspect(p)}>
          <CurrentHeroRender key={p.heroId} player={p} motion={motion && visible}/>
          <span className="current-slat-shade"/><span className="current-slat-name">{p.player}</span>
          <span className="current-slat-totals"><span className="current-slat-level">LV {p.level}</span><span className="current-slat-gold" title={p.netWorth == null ? "Total earned gold" : "Net worth"}><i aria-hidden="true"/>{amount(p.netWorth ?? p.gold)}</span><strong>{p.kills} / {p.deaths} / {p.assists}</strong></span>
        </button>)}</div>
        <div className="current-lineup-caption"><span>{side === 0 ? "THE RADIANT" : "THE DIRE"}</span><strong>{teams[side]}</strong></div>
      </section>)}</div>
    </div>
    <div className="current-overview-tools"><span>Select a hero to view their breakdown</span><button onClick={() => setMotion(!motion)} aria-pressed={motion} aria-label={motion ? "Pause hero animations" : "Play hero animations"}>{motion ? <Pause size={12}/> : <Play size={12}/>} {motion ? "Pause models" : "Animate models"}</button></div>
  </div>;
}

const analysisGroups = [
  { label: "Combat", metrics: ["heroDamage", "buildingDamage", "healing", "participation", "buybacks"] },
  { label: "Economy", metrics: ["netWorth", "gpm", "xpm", "lastHits", "denies"] },
] as const;

/** Compact archive totals, deliberately without the client's per-source matrix:
 * saved scoreboards do not retain damage targets or individual spell damage. */
export function CurrentBreakdowns({ game, series, playerId, setPlayerId, group, setGroup, compareId, setCompareId, showItems }: {
  game: ScoreboardGame; series: ScoreboardSeries; playerId: string; setPlayerId: (id: string) => void;
  group: number; setGroup: (group: number) => void; compareId: string; setCompareId: (id: string) => void;
  showItems: (id: string) => void;
}) {
  const player = game.players.find(p => p.id === playerId) ?? game.players[0];
  if (!player) return <p className="post-empty">No player statistics were recorded.</p>;
  const rival = game.players.find(p => p.id === compareId && p.id !== player.id) ?? game.players.find(p => p.team !== player.team && p.role === player.role);
  const category = analysisGroups[group] ?? analysisGroups[0];
  return <div className="current-breakdowns">
    <div className="current-player-strip" role="group" aria-label="Select player">{sides.map(side => <div key={side} className={`current-player-side post-side-${side}`}>{game.players.filter(p => p.team === side).map(p => <button key={p.id} aria-label={`Inspect ${p.player}, ${p.hero}`} aria-pressed={player.id === p.id} onClick={() => setPlayerId(p.id)} title={`${p.player} · ${p.hero}`}><CurrentPortrait player={p}/><span>{p.player}</span></button>)}</div>)}</div>
    <div className="current-analysis-toolbar"><div role="group" aria-label="Breakdown category">{analysisGroups.map((g, i) => <button key={g.label} aria-pressed={group === i} onClick={() => setGroup(i)}>{g.label}</button>)}</div><label>Compare with<select value={game.players.some(p => p.id === compareId && p.id !== player.id) ? compareId : ""} onChange={e => setCompareId(e.target.value)}><option value="">Same position opponent</option>{game.players.filter(p => p.id !== player.id).map(p => <option key={p.id} value={p.id}>{p.player} · {p.hero}</option>)}</select></label></div>
    <div className="current-analysis-layout">
      <aside className={`current-analysis-hero post-side-${player.team}`}><div className="current-analysis-render"><CurrentHeroRender key={player.heroId} player={player} motion={false}/></div><small>{player.team === 0 ? "THE RADIANT" : "THE DIRE"} · {heroRoles[player.role]}</small><h3>{player.hero}</h3><strong>{player.player}</strong><p>{player.kills} / {player.deaths} / {player.assists}<span>LV {player.level}</span></p><ItemInventory player={player} patch={patchById(series.patch?.id)} time={game.duration} compact/><button className="current-items-link" onClick={() => showItems(player.id)}>Item progression →</button></aside>
      <section className="current-analysis-totals" aria-label={`${category.label} comparison`}>
        <header><div className={`post-side-${player.team}`}><strong>{player.player}</strong><small>{series.teams[player.team]}</small></div><span>{category.label.toUpperCase()}</span><div className={`post-side-${rival?.team ?? 1}`}><strong>{rival?.player ?? "No comparison"}</strong><small>{rival?.hero ?? "—"}</small></div></header>
        {category.metrics.map(id => {
          const own = scoreMetric(player, game, id), other = rival ? scoreMetric(rival, game, id) : null;
          const max = Math.max(1, own ?? 0, other ?? 0);
          const share = ["heroDamage", "buildingDamage", "healing", "netWorth", "lastHits", "denies", "buybacks"].includes(id) ? teamMetricShare(player, game, id) : null;
          const label = breakdownMetrics.find(m => m.id === id)!.label;
          return <div key={id} className="current-analysis-row"><div><b>{amount(own)}{id === "participation" && own != null ? "%" : ""}</b><span>{label}<small>{share == null ? "" : `${Math.round(share)}% of team total`}</small></span><b>{amount(other)}{id === "participation" && other != null ? "%" : ""}</b></div><div className="current-comparison-bars"><span className={`post-side-${player.team}`}><i style={{ width: `${(own ?? 0) / max * 100}%` }}/></span><span className={`post-side-${rival?.team ?? 1}`}><i style={{ width: `${(other ?? 0) / max * 100}%` }}/></span></div></div>;
        })}
        {group === 1 && <p className="post-note">Lane at 10:00: {player.player} · {player.laneOutcome ?? "—"} / {rival?.player ?? "No comparison"} · {rival?.laneOutcome ?? "—"}</p>}
        <RecordedPlayerIdentity player={player}/>
        {!player.playerIdentity&&player.talents && <p className="post-note">Talents: {talentTiers.filter(t => player.talents?.[t.level] != null).map(t => `Level ${t.level}: ${t.choices[player.talents![t.level]!].name}`).join(" · ") || "None learned"}</p>}
        <p className="post-note">Recorded totals · — means not recorded. Damage by spell, damage type and target is not retained in these match archives.</p>
      </section>
    </div>
  </div>;
}

function CurrentPortrait({ player }: { player: PlayerScore }) {
  const [failed, setFailed] = useState(false);
  const media = heroMedia(player.heroId, import.meta.env.BASE_URL);
  return <span className="current-picker-portrait">{media && !failed ? <img src={media.portrait} alt="" onError={() => setFailed(true)}/> : <HeroToken score={player}/>}</span>;
}

function CurrentHeroRender({ player, motion }: { player: PlayerScore; motion: boolean }) {
  const media = heroMedia(player.heroId, import.meta.env.BASE_URL);
  const stage = useRef<HTMLSpanElement>(null), video = useRef<HTMLVideoElement>(null);
  const [inView, setInView] = useState(false), [videoFailed, setVideoFailed] = useState(false), [imageFailed, setImageFailed] = useState(false);
  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting), { threshold: 0.1 });
    if (stage.current) observer.observe(stage.current);
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    const element = video.current;
    if (!element) return;
    if (motion && inView) void element.play().catch(error => { if (error.name !== "AbortError") setVideoFailed(true); });
    else element.pause();
    return () => element.pause();
  }, [motion, inView, videoFailed]);
  return <span className="current-hero-render" ref={stage}>
    {media && !imageFailed ? <img src={media.poster} alt="" onError={() => setImageFailed(true)}/> : <HeroToken score={player}/>}
    {media && motion && inView && !videoFailed && <video ref={video} src={media.video} poster={imageFailed ? undefined : media.poster} muted loop playsInline preload="none" aria-hidden="true" onError={() => setVideoFailed(true)}/>}
  </span>;
}

export function CurrentPerformance({ game, series, inspect }: {
  game: ScoreboardGame; series: ScoreboardSeries; inspect: (p: PlayerScore) => void;
}) {
  const [metric, setMetric] = useState<BreakdownMetric>("heroDamage");
  const values = game.players.map(p => scoreMetric(p, game, metric));
  const max = Math.max(1, ...values.map(v => v ?? 0));
  return <section className="current-performance"><div className="post-section-title"><h3>Performance</h3><label>Compare performance<select value={metric} onChange={e => setMetric(e.target.value as BreakdownMetric)}>{breakdownMetrics.map(m => <option key={m.id} value={m.id}>{m.label}</option>)}</select></label></div>
    <div className="current-performance-teams">{sides.map(side => <section className={`post-side-${side}`} key={side}><h3>{series.teams[side]}</h3>{game.players.filter(p => p.team === side).map(p => { const value = scoreMetric(p, game, metric); return <button key={p.id} className="current-performance-player" onClick={() => inspect(p)}><HeroToken score={p}/><span><strong>{p.player}</strong><small>{p.hero}</small></span><b>{amount(value)}{metric === "participation" && value != null ? "%" : ""}</b><i><span style={{ width: `${(value ?? 0) / max * 100}%` }}/></i></button>; })}</section>)}</div>
    <p className="post-note">Recorded match totals. Select a player for comparisons and their detailed breakdown.</p>
  </section>;
}
