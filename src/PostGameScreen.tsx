import { patchLabel } from "./patch-label";
import { Fragment, useEffect, useId, useRef, useState } from "react";
import type { KeyboardEvent } from "react";
import { ArrowLeft, ArrowRight, Trophy } from "lucide-react";
import { matchClock } from "./battle";
import type { PlayerScore, Side } from "./battle";
import type { ScoreboardGame, ScoreboardResult, ScoreboardSeries } from "./scoreboards";
import { HeroToken } from "./HeroToken";
import { heroMedia } from "./hero-media";
import { heroRoles } from "./heroes";
import TeamBadge from "./TeamBadge";
import { teamIdForName } from "./team-logos";
import ItemInventory, { ItemArt } from "./ItemInventory";
import { itemForPatch } from "./items";
import { patchById } from "./patches";
import { DraftRecordView } from "./DraftRecord";
import { strategyById } from "./tactics";
import { talentTiers } from "./talents";
import { RecordedPlayerIdentity } from './PlayerIdentity';
import ResourceGraph from "./ResourceGraph";
import { breakdownMetrics, postGameEra, scoreMetric, teamMetricShare } from "./post-game";
import type { BreakdownMetric } from "./post-game";
import { CurrentMatchHeader, CurrentOverview, CurrentPerformance, CurrentBreakdowns } from "./CurrentPostGame";
import "./post-game.css";

const sides = [0, 1] as const;
const sideName = (side: Side) => side === 0 ? "Radiant" : "Dire";
const number = (value: number | null | undefined) => value == null ? "—" : Math.round(value).toLocaleString();
const compact = (value: number | null | undefined) => value == null ? "—" : Math.abs(value) >= 1000 ? `${(value / 1000).toFixed(1)}k` : number(value);
const kda = (p: PlayerScore) => `${p.kills} / ${p.deaths} / ${p.assists}`;

interface Props {
  result: ScoreboardResult;
  onClose: () => void;
  managedTeamId?: string;
  closeLabel?: string;
  perspective?: Side | null;
  teamIds?: [string | undefined, string | undefined];
  mapOnly?: boolean;
  playedAt?: string;
  initialGame?: number;
  headingId?: string;
}

export default function PostGameScreen(props: Props) {
  const series = props.result.series;
  if (!series?.games.length) return <div className="text-modal">
    <div className="eyebrow">ARCHIVED RESULT</div><h2 id="modal-title">{props.result.event}</h2>
    <div className="result-score">{props.result.score}</div>
    <p>This archive has no recorded maps. Detailed scoreboards are available for newly played games.</p>
    <button className="button secondary full" onClick={props.onClose}>{props.closeLabel ?? "Back to management"}<ArrowRight size={15}/></button>
  </div>;
  return <PostGameReport key={`${props.result.eventId}-${series.seed ?? "archive"}-${props.playedAt ?? props.result.playedAt ?? ""}`} {...props} series={series}/>;
}

type Section = "overview" | "scoreboard" | "graphs" | "performance" | "breakdowns" | "items" | "draft";
const sections: { id: Section; label: string }[] = [
  { id: "overview", label: "Overview" }, { id: "scoreboard", label: "Scoreboard" },
  { id: "graphs", label: "Graphs" }, { id: "breakdowns", label: "Breakdowns" },
  { id: "items", label: "Items" }, { id: "draft", label: "Draft & calls" },
];

function PostGameReport({ result, series, onClose, managedTeamId, closeLabel = "Back to management", perspective = 0, teamIds, mapOnly = false, playedAt, initialGame = 0, headingId = "modal-title" }: Props & { series: ScoreboardSeries }) {
  const era = postGameEra(result.year, series.patch?.id, playedAt ?? result.playedAt);
  const current = era.id === "analytics" || era.id === "future";
  const tabs = current ? [...sections.slice(0, 3), { id: "performance" as const, label: "Performance" }, ...sections.slice(3)] : sections;
  const [selected, setSelected] = useState(Math.max(0, Math.min(series.games.length - 1, initialGame)));
  const [section, setSection] = useState<Section>(era.lineup ? "overview" : "scoreboard");
  const [playerId, setPlayerId] = useState(series.games[selected].players[0]?.id ?? "");
  const [itemPlayerId, setItemPlayerId] = useState("all");
  const [analysisGroup, setAnalysisGroup] = useState(0), [compareId, setCompareId] = useState("");
  const [motion, setMotion] = useState(() => !window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  const heading = useRef<HTMLHeadingElement>(null);
  const tabId = useId();
  useEffect(() => { heading.current?.focus(); }, []);
  useEffect(() => {
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    const changed = () => { if (preference.matches) setMotion(false); };
    preference.addEventListener("change", changed);
    return () => preference.removeEventListener("change", changed);
  }, []);
  const game = series.games[selected];
  const patch = patchById(series.patch?.id);
  const drawn = series.winner === null;
  const neutral = perspective === null;
  const won = !drawn && !neutral && series.winner === perspective;
  const teamId = (side: Side) => teamIds?.[side] ?? (side === 0 ? managedTeamId : managedTeamId ? teamIdForName(series.teams[side], result.year) : undefined);
  const inspect = (p: PlayerScore) => { setPlayerId(p.id); setSection("breakdowns"); };
  const changeGame = (index: number) => {
    setSelected(index);
    setPlayerId(previous => series.games[index].players.some(p => p.id === previous) ? previous : series.games[index].players[0]?.id ?? "");
    setItemPlayerId(previous => previous === "all" || series.games[index].players.some(p => p.id === previous) ? previous : "all");
  };
  const navigateTabs = (e: KeyboardEvent<HTMLElement>) => {
    const index = tabs.findIndex(s => s.id === section);
    const next = e.key === "ArrowRight" ? (index + 1) % tabs.length : e.key === "ArrowLeft" ? (index + tabs.length - 1) % tabs.length : e.key === "Home" ? 0 : e.key === "End" ? tabs.length - 1 : null;
    if (next === null) return;
    e.preventDefault(); setSection(tabs[next].id);
    e.currentTarget.querySelectorAll<HTMLButtonElement>('[role="tab"]')[next]?.focus();
  };
  const navigation = <nav className="post-tabs" role="tablist" aria-label="Post-game breakdown" onKeyDown={navigateTabs}>{tabs.map(s => <button key={s.id} id={`${tabId}-${s.id}`} role="tab" aria-label={s.label} aria-selected={section === s.id} aria-controls={`${tabId}-panel`} tabIndex={section === s.id ? 0 : -1} onClick={() => setSection(s.id)}>{s.label}</button>)}</nav>;
  return <div className={`series-results post-game post-game-${era.id}${current ? " post-current" : ""}`} data-post-game-era={era.id}>
    {current && navigation}
    {current ? <CurrentMatchHeader game={game} teams={series.teams} event={result.event} headingId={headingId} heading={heading}/> : <header className="post-header">
      <div className="post-breadcrumb"><span>DOTA 2 <b>/</b> MATCH DETAILS</span><span>{era.title} · {result.year}</span></div>
      <div className="post-event">{result.event}{series.patch && ` · Patch ${patchLabel(series.patch)}`}</div>
      <div className={`post-victory post-side-${game.winner}`}>
        <div className="post-victory-mark"><Trophy size={27}/></div>
        <div><div className="post-side-label">{sideName(game.winner)} victory</div><h2 id={headingId} ref={heading} tabIndex={-1}>{series.teams[game.winner]}</h2></div>
        <div className="post-final-score"><span>{game.kills[0]}</span><small>{matchClock(game.duration)}<em>FINAL SCORE</em></small><span>{game.kills[1]}</span></div>
      </div>
      <div className="post-series-line">
        <span>{mapOnly ? "MAP COMPLETE" : drawn ? "SERIES DRAW" : neutral ? "SERIES COMPLETE" : won ? "SERIES VICTORY" : "SERIES DEFEAT"} <b>·</b> {series.teams[0]} {series.score.join(" – ")} {series.teams[1]}{!mapOnly && ` · BO${series.bestOf ?? 3}`}</span>
        {(result.prize > 0 || result.points > 0) && <strong>{result.prize > 0 ? `+$${result.prize.toLocaleString()}` : ""}{result.points > 0 ? ` +${result.points} points` : ""}</strong>}
      </div>
    </header>}
    {series.games.length > 1 && <div className="post-map-tabs" role="group" aria-label="Select game">{series.games.map((g, i) => <button key={i} aria-pressed={selected === i} onClick={() => changeGame(i)}>Game {i + 1}<small>{neutral ? sideName(g.winner) : g.winner === perspective ? "WIN" : "LOSS"} · {matchClock(g.duration)}</small></button>)}</div>}
    <div className="post-body">
      {!current && navigation}
      <section id={`${tabId}-panel`} role="tabpanel" aria-labelledby={`${tabId}-${section}`} tabIndex={0} className="post-content" key={`${selected}-${section}`}>
        {section === "overview" && current && <CurrentOverview game={game} teams={series.teams} inspect={inspect} motion={motion} setMotion={setMotion}/>}
        {section === "overview" && !current && <>
          <div className="post-section-title"><h3>Match overview</h3><span>SELECT A HERO TO INSPECT</span></div>
          <div className={`post-lineups ${era.lineup ? "" : "post-classic-lineups"}`}>{sides.map(side => <section className={`post-team post-side-${side}`} key={side}>
            <header><TeamBadge teamId={teamId(side)} name={series.teams[side]} year={result.year} size="small"/><div><small>{sideName(side)}{game.winner === side ? " · VICTORY" : ""}</small><h3>{series.teams[side]}</h3></div><strong>{game.kills[side]}</strong></header>
            <div className="post-hero-cards">{game.players.filter(p => p.team === side).map(p => <button key={p.id} className="post-hero-card" aria-label={`View ${p.player} breakdown, ${p.hero}`} onClick={() => inspect(p)}>
              <HeroArtwork player={p} render={era.lineup}/><span className="post-card-level">{p.level}</span>
              <div className="post-card-caption"><small>{p.hero}</small><strong>{p.player}</strong><span>{kda(p)}</span><em>{compact(p.netWorth ?? p.gold)} {p.netWorth == null ? "GOLD" : "NET WORTH"}</em></div>
            </button>)}</div>
          </section>)}</div>
          <div className="post-objectives"><Fact label="Duration" value={matchClock(game.duration)}/><Fact label="Towers destroyed" value={game.towers?.join(" – ")}/><Fact label="Roshan kills" value={game.roshanKills?.join(" – ")}/><Fact label="Game ended" value={game.ancientHealth ? game.overtime ? "Overtime siege" : "Ancient destroyed" : undefined}/></div>
          <div className="post-overview-actions"><button onClick={() => setSection("scoreboard")}>Full scoreboard <ArrowRight size={14}/></button><button onClick={() => setSection("graphs")}>Explore game flow <ArrowRight size={14}/></button></div>
        </>}
        {section === "scoreboard" && <PostScoreboard game={game} series={series} inspect={inspect} current={current}/>}
        {section === "performance" && <CurrentPerformance game={game} series={series} inspect={inspect}/>}
        {section === "graphs" && <><div className="post-section-title"><h3>Game flow</h3><span>RECORDED TEAM TOTALS</span></div>{game.timeline?.length ? <div className="match-graphs"><ResourceGraph timeline={game.timeline} resource="gold" teams={series.teams}/><ResourceGraph timeline={game.timeline} resource="xp" teams={series.teams}/></div> : <Empty>Resource timelines were not retained for this match.</Empty>}<p className="post-note">Inspect the graph with the pointer or timeline slider. Positive advantage favors {series.teams[0]}. Individual player timelines were not recorded.</p></>}
        {section === "breakdowns" && (current ? <CurrentBreakdowns game={game} series={series} playerId={playerId} setPlayerId={setPlayerId} group={analysisGroup} setGroup={setAnalysisGroup} compareId={compareId} setCompareId={setCompareId} showItems={id => { setItemPlayerId(id); setSection("items"); }}/> : <Breakdowns game={game} series={series} playerId={playerId} setPlayerId={setPlayerId}/>)}
        {section === "items" && <ItemBreakdown game={game} patchId={series.patch?.id} playerId={itemPlayerId} setPlayerId={setItemPlayerId} current={current}/>}
        {section === "draft" && <><div className="post-section-title"><h3>Draft & tactical calls</h3></div>{game.draft ? <DraftRecordView draft={game.draft} teams={series.teams}/> : <Empty>The pick/ban sequence was not recorded for this match.</Empty>}{game.tacticalEvents?.length ? <ol className="post-event-list" tabIndex={0} aria-label="Recorded match events">{game.tacticalEvents.map((e, i) => <li key={i}><time>{matchClock(e.time)}</time><div><strong>{series.teams[e.side]} · {strategyById(e.strategyId)?.name ?? e.strategyId}</strong><p>{e.message}</p><small>{e.status} · {e.source}</small></div></li>)}</ol> : <Empty>No tactical decisions were retained for this match.</Empty>}</>}
      </section>
    </div>
    <footer className="post-footer"><p>{current && <><span className="current-footer-result">{mapOnly ? "MAP COMPLETE" : drawn ? "SERIES DRAW" : neutral ? "SERIES COMPLETE" : won ? "SERIES VICTORY" : "SERIES DEFEAT"} · {series.teams[0]} {series.score.join(" – ")} {series.teams[1]}{!mapOnly && ` · BO${series.bestOf ?? 3}`}</span><br/></>}Game {selected + 1} of {series.games.length} · {patch?.versions ?? series.patch?.versions ?? "Legacy match"}{series.advantage?.some(Boolean) ? ` · Includes ${series.advantage.join("–")} default advantage; only played maps shown.` : ""}{current && (result.prize > 0 || result.points > 0) ? ` · +$${result.prize.toLocaleString()} · +${result.points} points` : ""}</p><button className="post-continue" onClick={onClose}>{closeLabel}<ArrowRight size={16}/></button></footer>
    <details className="post-data-note"><summary>About these match statistics</summary><p>These are recorded simulation results. GPM excludes the 600 starting gold; gold and XP rates use match-clock minutes. Missing archive data appears as —. Wards, damage by spell/target, cosmetics and Dota Plus progression are not recorded. Denies and buybacks are available for new matches; older archives retain unknown values. Hero artwork uses the current Valve renders. The era layouts and extra analysis navigation are manager adaptations.</p></details>
  </div>;
}

function Empty({ children }: { children: React.ReactNode }) { return <p className="post-empty">{children}</p>; }
function Fact({ label, value }: { label: string; value?: string | number | null }) { return <div className="post-fact"><small>{label}</small><strong>{value ?? "—"}</strong></div>; }

function HeroArtwork({ player, render = false }: { player: PlayerScore; render?: boolean }) {
  const media = heroMedia(player.heroId, import.meta.env.BASE_URL);
  const [failed, setFailed] = useState(false);
  const path = render ? media?.poster : media?.portrait;
  return <span className={`post-hero-art ${render ? "is-render" : ""}`}>{path && !failed ? <img src={path} alt="" loading="lazy" onError={() => setFailed(true)}/> : <HeroToken score={player}/>}</span>;
}

type Sort = "role" | "kills" | "deaths" | "assists" | "netWorth" | "gpm" | "xpm" | "lastHits" | "denies" | "buybacks" | "heroDamage" | "buildingDamage" | "healing";
function PostScoreboard({ game, series, inspect, current }: { game: ScoreboardGame; series: ScoreboardSeries; inspect: (p: PlayerScore) => void; current: boolean }) {
  const [sort, setSort] = useState<Sort>("role"), [ascending, setAscending] = useState(true);
  const columns: { key: Sort; label: string; title?: string }[] = [{ key: "role", label: "Player / Hero" }, { key: "kills", label: "K" }, { key: "deaths", label: "D" }, { key: "assists", label: "A" }, { key: "netWorth", label: "Net worth" }, ...(current ? [
    { key: "lastHits" as const, label: "LH" }, { key: "gpm" as const, label: "GPM" }, { key: "xpm" as const, label: "XPM" },
    { key: "heroDamage" as const, label: "DMG", title: "Hero damage" }, { key: "buildingDamage" as const, label: "BLD", title: "Building damage" }, { key: "healing" as const, label: "HEAL", title: "Healing" },
  ] : [{ key: "gpm" as const, label: "GPM" }, { key: "xpm" as const, label: "XPM" }, { key: "lastHits" as const, label: "LH" }]), {key:'denies',label:'DN',title:'Creep denies'}, {key:'buybacks',label:'BB',title:'Buybacks'}];
  const value = (p: PlayerScore) => sort === "gpm" || sort === "xpm" ? scoreMetric(p, game, sort) : p[sort] ?? null;
  const order = (a: PlayerScore, b: PlayerScore) => { const av = value(a), bv = value(b); return av === null ? bv === null ? 0 : 1 : bv === null ? -1 : (av - bv) * (ascending ? 1 : -1); };
  return <><div className="post-section-title"><h3>Scoreboard</h3><span>CLICK A PLAYER FOR THEIR BREAKDOWN</span></div><div className="post-scoreboards">{sides.map(side => <section className={`post-scoreboard post-side-${side}`} key={side}>
    <header><h3>{current ? `The ${sideName(side)}` : sideName(side)} <small>{series.teams[side]}</small></h3><span>{game.winner === side ? "VICTORY" : "DEFEAT"}</span><strong>{game.kills[side]}</strong></header>
    <div className="post-table-scroll" role="region" aria-label={`${series.teams[side]} scoreboard; scroll for more columns`} tabIndex={0}><table><thead><tr>{columns.map((c, index) => <Fragment key={c.key}>{current && index === 5 && <th scope="col">Items</th>}<th scope="col" aria-sort={sort === c.key ? ascending ? "ascending" : "descending" : "none"}><button title={c.title} onClick={() => { setSort(c.key); setAscending(sort === c.key ? !ascending : c.key === "role"); }}>{c.label}{sort === c.key ? ascending ? " ↑" : " ↓" : ""}</button></th></Fragment>)}{!current && <th scope="col">Items</th>}</tr></thead><tbody>{game.players.filter(p => p.team === side).slice().sort(order).map(p => {
      const items = <td className="current-score-items"><ItemInventory player={p} patch={patchById(series.patch?.id)} time={game.duration} compact/></td>;
      return <tr key={p.id}><td><button className="post-player-button" onClick={() => inspect(p)}>{current ? <span className="current-score-portrait"><HeroArtwork player={p}/></span> : <HeroToken score={p}/>}<span><strong>{p.player}</strong><small>{p.hero} · LV {p.level}</small></span></button></td><td>{p.kills}</td><td>{p.deaths}</td><td>{p.assists}</td><td className="post-gold">{number(p.netWorth)}</td>{current && items}{current && <td>{p.lastHits}</td>}<td>{number(scoreMetric(p, game, "gpm"))}</td><td>{number(scoreMetric(p, game, "xpm"))}</td>{current ? <><td>{number(p.heroDamage)}</td><td>{number(p.buildingDamage)}</td><td>{number(p.healing)}</td></> : <td>{p.lastHits}</td>}<td>{number(p.denies)}</td><td>{number(p.buybacks)}</td>{!current&&items}</tr>;
    })}</tbody></table></div>
  </section>)}</div><p className="post-note">Click a column heading to sort each team. GPM = earned gold per match minute. LH includes neutral last hits; DN = creep denies; BB = buybacks. Older archives show — for unrecorded counts.</p></>;
}

function Breakdowns({ game, series, playerId, setPlayerId }: { game: ScoreboardGame; series: ScoreboardSeries; playerId: string; setPlayerId: (id: string) => void }) {
  const [metric, setMetric] = useState<BreakdownMetric>("heroDamage");
  const player = game.players.find(p => p.id === playerId) ?? game.players[0];
  const [compareId, setCompareId] = useState("");
  if (!player) return <Empty>No player statistics were recorded.</Empty>;
  const opponent = game.players.find(p => p.id === compareId && p.id !== player.id) ?? game.players.find(p => p.team !== player.team && p.role === player.role);
  const index = game.players.indexOf(player);
  const rows = game.players.map(p => ({ player: p, value: scoreMetric(p, game, metric) })).sort((a, b) => a.value === null ? 1 : b.value === null ? -1 : b.value - a.value);
  const max = Math.max(1, ...rows.map(r => r.value ?? 0));
  const label = breakdownMetrics.find(m => m.id === metric)!.label;
  const selectedShare = teamMetricShare(player, game, metric);
  return <><div className="post-section-title"><h3>Player breakdown</h3><span>RECORDED PERFORMANCE</span></div>
    <div className="post-player-picker" role="group" aria-label="Select player">{game.players.map(p => <button className={`post-side-${p.team}`} key={p.id} aria-pressed={p.id === player.id} title={`${p.player} · ${p.hero}`} aria-label={`Inspect ${p.player}, ${p.hero}`} onClick={() => setPlayerId(p.id)}><HeroToken score={p}/><small>{p.player}</small></button>)}</div>
    <div className="post-player-controls"><button aria-label="Previous player" onClick={() => setPlayerId(game.players[(index + game.players.length - 1) % game.players.length].id)}><ArrowLeft size={16}/></button><label>Player<select value={player.id} onChange={e => setPlayerId(e.target.value)}>{game.players.map(p => <option key={p.id} value={p.id}>{p.player} · {p.hero}</option>)}</select></label><button aria-label="Next player" onClick={() => setPlayerId(game.players[(index + 1) % game.players.length].id)}><ArrowRight size={16}/></button><label>Compare with<select value={game.players.some(p => p.id === compareId && p.id !== player.id) ? compareId : ""} onChange={e => setCompareId(e.target.value)}><option value="">Same position opponent</option>{game.players.filter(p => p.id !== player.id).map(p => <option key={p.id} value={p.id}>{p.player} · {p.hero}</option>)}</select></label></div>
    <div className={`post-player-profile post-side-${player.team}`}><HeroArtwork key={player.heroId} player={player} render/><div><small>{sideName(player.team)} · {series.teams[player.team]} · {heroRoles[player.role]}</small><h3>{player.hero}</h3><strong>{player.player}</strong><p>{kda(player)} <span>· Level {player.level}</span></p><ItemInventory player={player} patch={patchById(series.patch?.id)} time={game.duration} compact/></div></div>
    <div className="post-comparison-scroll" role="region" aria-label="Player statistics comparison" tabIndex={0}><table className="post-comparison"><thead><tr><th scope="col">Statistic</th><th scope="col">{player.player}</th><th scope="col">{opponent?.player ?? "No comparison"}</th></tr></thead><tbody>{breakdownMetrics.map(m => { const own = scoreMetric(player, game, m.id), rival = opponent ? scoreMetric(opponent, game, m.id) : null; return <tr key={m.id}><th scope="row">{m.label}</th><td className={own !== null && rival !== null && own > rival ? "post-best" : ""}>{number(own)}{m.id === "participation" && own !== null ? "%" : ""}</td><td className={own !== null && rival !== null && rival > own ? "post-best" : ""}>{number(rival)}{m.id === "participation" && rival !== null ? "%" : ""}</td></tr>; })}<tr><th scope="row">Total gold / XP</th><td>{number(player.gold)} / {number(player.xp)}</td><td>{opponent ? `${number(opponent.gold)} / ${number(opponent.xp)}` : "—"}</td></tr><tr><th scope="row">Lane at 10:00</th><td>{player.laneOutcome ?? "—"}</td><td>{opponent?.laneOutcome ?? "—"}</td></tr></tbody></table></div>
    <RecordedPlayerIdentity player={player}/>
    {!player.playerIdentity&&player.talents && <p className="post-note">Talents: {talentTiers.filter(t => player.talents?.[t.level] != null).map(t => `Level ${t.level}: ${t.choices[player.talents![t.level]!].name}`).join(" · ") || "None learned"}</p>}
    <div className="post-metric-heading"><label>Compare all players<select value={metric} onChange={e => setMetric(e.target.value as BreakdownMetric)}>{breakdownMetrics.map(m => <option key={m.id} value={m.id}>{m.label}</option>)}</select></label><span>{selectedShare !== null && !["gpm", "xpm", "participation"].includes(metric) ? `${Math.round(selectedShare)}% of team's ${label.toLowerCase()}` : label}</span></div>
    <div className="post-metric-bars">{rows.map(r => <button className={`post-metric-row post-side-${r.player.team}`} key={r.player.id} aria-pressed={r.player.id === player.id} onClick={() => setPlayerId(r.player.id)}><HeroToken score={r.player}/><span>{r.player.player}<small>{r.player.hero}</small></span><span className="post-bar"><i style={{ width: `${(r.value ?? 0) / max * 100}%` }}/></span><strong>{compact(r.value)}{metric === "participation" && r.value !== null ? "%" : ""}</strong></button>)}</div>
    <p className="post-note">— means not recorded. Damage is effective hero/building damage; healing is effective healing. Per-spell, per-target and physical/magical/pure splits are unavailable.</p>
  </>;
}

function ItemBreakdown({ game, patchId, playerId, setPlayerId, current }: { game: ScoreboardGame; patchId?: string; playerId: string; setPlayerId: (id: string) => void; current: boolean }) {
  const patch = patchById(patchId);
  const players = game.players.filter(p => playerId === "all" || p.id === playerId);
  const events = game.itemEvents?.filter(e => playerId === "all" || e.playerId === playerId);
  const history = events?.length ? <ol className="post-event-list" tabIndex={0} aria-label="Recorded item events">{events.map((e, i) => <li key={i}><time>{matchClock(e.time)}</time><div><strong>{game.players.find(p => p.id === e.playerId)?.player ?? "Unknown player"} · {itemForPatch(e.item, patch).name}</strong><p>{e.kind}{e.gold != null ? ` · ${number(e.gold)} gold` : ""}</p></div></li>)}</ol> : <Empty>{game.itemEvents ? "No item events for this selection." : "Item progression was not retained for this match."}</Empty>;
  return <><div className="post-section-title"><h3>Items & progression</h3><label>Show player<select value={playerId} onChange={e => setPlayerId(e.target.value)}><option value="all">All players</option>{game.players.map(p => <option key={p.id} value={p.id}>{p.player} · {p.hero}</option>)}</select></label></div>
    <div className="post-item-players">{players.map(p => <div className={`post-item-player post-side-${p.team}`} key={p.id}><HeroToken score={p}/><div><strong>{p.player}</strong><small>{p.hero}</small></div><ItemInventory player={p} patch={patch} time={game.duration} compact/><span>{number(p.spendableGold)}<small>UNSPENT GOLD</small></span></div>)}</div>
    {current && game.itemEvents && <><h3 className="post-list-title">Item progression by player</h3><div className="current-item-timelines">{players.map(p => <section key={p.id} className={`current-item-timeline post-side-${p.team}`}><button onClick={() => setPlayerId(playerId === p.id ? "all" : p.id)} title={`Filter item history for ${p.player}`}><HeroToken score={p}/><span>{p.player}<small>{p.hero}</small></span></button><div className="current-item-track" tabIndex={0} role="region" aria-label={`${p.player} item progression; scroll for more items`}>{game.itemEvents!.filter(e => e.playerId === p.id).length ? game.itemEvents!.filter(e => e.playerId === p.id).map((e, i) => { const item = itemForPatch(e.item, patch); return <div className={`current-item-event is-${e.kind}`} key={i} title={`${matchClock(e.time)} · ${item.name} · ${e.kind}${e.gold == null ? "" : ` · ${number(e.gold)} gold`}`}><time>{matchClock(e.time)}</time><span><ItemArt id={e.item} label={item.short}/></span><small>{e.kind}</small><b>{item.name}</b></div>; }) : <p>No item events recorded.</p>}</div></section>)}</div></>}
    {current ? <details className="current-item-log"><summary>Purchase, sale & dropped item history</summary>{history}</details> : <><h3 className="post-list-title">Purchase, sale & dropped item history</h3>{history}</>}
  </>;
}
