import { useMemo, useState } from "react";
import type { ReactNode } from "react";
import { BarChart3, Trophy } from "lucide-react";
import type { Campaign } from "./game";
import { matchClock } from "./battle";
import { heroIconFor } from "./hero-icons";
import { performanceGroups, playerPerformance, summarizePerformance } from "./performance";
import type { PerformanceGame } from "./performance";
import "./performance.css";

const number = (n: number | null, digits = 0) => n == null ? "—" : n.toLocaleString("en-US", { maximumFractionDigits: digits, minimumFractionDigits: digits });
const percent = (n: number | null) => n == null ? "—" : `${number(n)}%`;
const count = (n: number, word: string, plural = `${word}s`) => `${n} ${n === 1 ? word : plural}`;

function HeroName({ id, name }: { id: string; name: string }) {
  const icon = heroIconFor(id);
  const [failed, setFailed] = useState(false);
  return <span className="performance-hero">{icon && !failed && <img src={`${import.meta.env.BASE_URL}${icon.path}`} alt="" onError={() => setFailed(true)} />}<span>{name}</span></span>;
}

function Metric({ label, value, note }: { label: string; value: string; note: string }) {
  return <div className="performance-metric"><dt>{label}</dt><dd>{value}</dd><small>{note}</small></div>;
}

function MapHistory({ games }: { games: PerformanceGame[] }) {
  return <div className="performance-table-scroll" tabIndex={0} role="region" aria-label="Per-game performance, scroll for more statistics">
    <table className="performance-table performance-maps"><caption className="sr-only">Recorded games in this event</caption><thead><tr>
      <th scope="col">Game / opponent</th><th scope="col">Hero</th><th scope="col">Rating</th><th scope="col">K / D / A</th><th scope="col">GPM</th><th scope="col">XPM</th><th scope="col">Hero dmg</th><th scope="col">Lane</th>
    </tr></thead><tbody>{games.map(row => {
      const s = summarizePerformance([row]);
      return <tr key={row.key}><th scope="row"><span className={`performance-result ${row.won ? "won" : "lost"}`}>{row.won ? "W" : "L"}</span> {row.opponent}<small>{row.at.includes("-W") ? row.stage : `${row.at.slice(0, 10)} · ${row.stage}`} · Game {row.game} · {matchClock(row.duration)} · {row.team}</small></th>
        <td><HeroName id={row.score.heroId} name={row.score.hero} /></td><td>{number(row.rating, 1)}</td><td>{row.score.kills} / {row.score.deaths} / {row.score.assists}</td>
        <td>{number(s.gpm)}</td><td>{number(s.xpm)}</td><td>{number(s.heroDamage.average)}</td><td>{row.score.laneOutcome ?? "—"}</td></tr>;
    })}</tbody></table>
  </div>;
}

export default function PlayerPerformance({ campaign, playerId }: { campaign: Campaign; playerId: string }) {
  const all = useMemo(() => playerPerformance(campaign, playerId), [campaign, playerId]);
  const [season, setSeason] = useState("all");
  const [event, setEvent] = useState("all");
  const [hero, setHero] = useState("all");
  const [sort, setSort] = useState("games");
  const seasons = [...new Set(all.map(row => row.year))];
  const seasonRows = all.filter(row => season === "all" || String(row.year) === season);
  const events = performanceGroups(seasonRows, "eventKey");
  const heroOptions = performanceGroups(all, "heroId").sort((a, b) => a.games[0].score.hero.localeCompare(b.games[0].score.hero));
  const rows = seasonRows.filter(row => (event === "all" || row.eventKey === event) && (hero === "all" || row.score.heroId === hero));
  const s = summarizePerformance(rows);
  const heroes = performanceGroups(rows, "heroId").sort((a, b) => {
    const field = sort as "games" | "rating" | "winRate" | "gpm";
    return b.summary[field] - a.summary[field] || a.games[0].score.hero.localeCompare(b.games[0].score.hero);
  });
  const eventRows = performanceGroups(rows, "eventKey");
  const coverage = (games: number) => `${games} of ${rows.length} recorded maps`;

  return <section className="player-performance" aria-label="Player performance">
    <div className="performance-title"><BarChart3 size={21} /><div><h3>Performance</h3><p>Career averages · event history · hero records</p></div></div>
    {!all.length ? <div className="performance-empty"><Trophy size={29} /><h4>No recorded games yet</h4><p>Completed matches will build this player's event ratings, averages and hero record here. Historical biographies and results without scoreboards do not create match statistics.</p></div> : <>
      <div className="performance-filters">
        <label>Season<select value={season} onChange={e => { setSeason(e.target.value); setEvent("all"); }}><option value="all">All seasons</option>{seasons.map(year => <option key={year} value={year}>{year}</option>)}</select></label>
        <label>Event<select value={event} onChange={e => setEvent(e.target.value)}><option value="all">All events</option>{events.map(group => <option key={group.key} value={group.key}>{group.games[0].event} · {group.games[0].year}</option>)}</select></label>
        <label>Hero<select value={hero} onChange={e => setHero(e.target.value)}><option value="all">All heroes</option>{heroOptions.map(group => <option key={group.key} value={group.key}>{group.games[0].score.hero}</option>)}</select></label>
      </div>
      {!rows.length ? <div className="performance-empty"><h4>No games match these filters</h4><p>Choose another season, event or hero.</p><button className="button secondary" onClick={() => { setSeason("all"); setEvent("all"); setHero("all"); }}>Clear filters</button></div> : <>
        <div className="performance-overview">
          <div className="performance-rating"><strong>{number(s.rating, 1)}<small> / 10</small></strong><span>Performance rating</span><small>Role-relative · {count(s.games, "map")}</small></div>
          <div className="performance-record"><strong>{percent(s.winRate)} win rate</strong><span>{count(s.wins, "win")} · {count(s.games - s.wins, "loss", "losses")} · {count(eventRows.length, "event")}</span><div className="performance-form" aria-label="Most recent recorded games, newest first">{rows.slice(0, 10).map(row => <span key={row.key} className={`performance-result ${row.won ? "won" : "lost"}`} title={`${row.event} · ${row.score.hero} · ${number(row.rating, 1)}`}>{row.won ? "W" : "L"}</span>)}</div></div>
        </div>
        <dl className="performance-metrics">
          <Metric label="GPM" value={number(s.gpm)} note="Earned gold / match minute" />
          <Metric label="XPM" value={number(s.xpm)} note="Experience / match minute" />
          <Metric label="KDA ratio" value={number(s.kda, 2)} note={`${number(s.kills, 1)} / ${number(s.deaths, 1)} / ${number(s.assists, 1)} average`} />
          <Metric label="Kill participation" value={percent(s.participation)} note="Average share of team kills" />
          <Metric label="Avg hero damage" value={number(s.heroDamage.average)} note={coverage(s.heroDamage.games)} />
          <Metric label="Hero damage / min" value={number(s.heroDamage.perMinute)} note="Measured maps only" />
          <Metric label="Avg healing" value={number(s.healing.average)} note={coverage(s.healing.games)} />
          <Metric label="Avg building damage" value={number(s.buildingDamage.average)} note={coverage(s.buildingDamage.games)} />
          <Metric label="Last hits / min" value={number(s.lastHitsPerMinute, 1)} note={`${number(s.lastHits, 1)} per map`} />
          <Metric label="Laning win rate" value={percent(s.laneWinRate)} note={`${s.laneGames} measured · ${s.laneDraws} drawn`} />
          <Metric label="Wards placed" value="—" note="Not simulated" />
          <Metric label="Dewards" value="—" note="Not simulated" />
        </dl>
        <div className="performance-subheading"><h4>Hero performances</h4><label>Sort by <select aria-label="Sort hero performances" value={sort} onChange={e => setSort(e.target.value)}><option value="games">Most played</option><option value="rating">Rating</option><option value="winRate">Win rate</option><option value="gpm">GPM</option></select></label></div>
        <div className="performance-table-scroll" tabIndex={0} role="region" aria-label="Hero performance statistics, scroll for more statistics"><table className="performance-table"><caption className="sr-only">Hero performances for selected filters</caption><thead><tr><th scope="col">Hero</th><th scope="col">Maps</th><th scope="col">Win %</th><th scope="col">Rating</th><th scope="col">KDA</th><th scope="col">GPM</th><th scope="col">XPM</th><th scope="col">Dmg / min</th><th scope="col">Lane win %</th></tr></thead><tbody>{heroes.map(group => <tr key={group.key}><th scope="row"><HeroName id={group.key} name={group.games[0].score.hero} /></th><td>{group.summary.games}</td><td>{percent(group.summary.winRate)}</td><td>{number(group.summary.rating, 1)}</td><td>{number(group.summary.kda, 2)}</td><td>{number(group.summary.gpm)}</td><td>{number(group.summary.xpm)}</td><td>{number(group.summary.heroDamage.perMinute)}</td><td>{percent(group.summary.laneWinRate)}</td></tr>)}</tbody></table></div>
        <div className="performance-subheading"><h4>Event history</h4><span>{count(eventRows.length, "event")}</span></div>
        <div className="performance-events">{eventRows.map(group => {
          const r = group.games[0], summary = group.summary;
          return <details key={group.key}><summary><span className="performance-event-name"><strong>{r.event}</strong><small>{r.year} · {count(summary.games, "map")} · {summary.wins}W / {summary.games - summary.wins}L</small></span><span className="performance-event-stats"><strong>{number(summary.rating, 1)}<small> rating</small></strong><small>{number(summary.gpm)} GPM · {number(summary.kda, 2)} KDA</small></span></summary><MapHistory games={group.games} /></details>;
        })}</div>
      </>}
    </>}
    <details className="performance-explainer"><summary>How stats and ratings work</summary>
      <p>Only completed games with saved scoreboards count, including AI matches and opponents. Ongoing tournaments count their completed series. Unplayed, forfeited/default wins and historical references add no maps. Older AI series without archived scoreboards have no player stats.</p>
      <p>GPM excludes the engine's 600 starting gold. GPM, XPM and damage/min use total resources divided by the total match minutes in their measured sample. KDA is total kills plus assists divided by deaths (minimum 1). Kill participation is averaged per map.</p>
      <p>The illustrative 1–10 rating compares KDA, earned gold + XP, kill participation and measured damage/healing with the opposing player in the same position, plus a small result bonus. Supports receive less economy weight. It measures this match's performance, separate from player attributes. Small samples can be misleading.</p>
      <p>Laning compares combined earned gold + XP of each assigned lane at 10:00. A lead above 5% wins; within 5% is a draw. Lane partners share the result, and games ending before 10:00 have no lane result. This is the lane engine's resource measure, rather than a full Dota laning model.</p>
      <p>Damage counts effective hero/building damage without overkill. Healing counts restored HP from abilities, including self-heals, excluding passive regeneration. Older games keep missing telemetry as —; zero means a measured zero. Coverage is shown for each new metric. Wards and dewards are not simulated yet.</p>
    </details>
  </section>;
}

export function PlayerProfileTabs({ campaign, playerId, children }: { campaign: Campaign; playerId: string; children: ReactNode }) {
  const [performance, setPerformance] = useState(false);
  return <><div className="profile-section-switch" role="group" aria-label="Player profile sections"><button type="button" aria-pressed={!performance} onClick={() => setPerformance(false)}>Profile & contract</button><button type="button" aria-pressed={performance} onClick={() => setPerformance(true)}><BarChart3 size={15} />Performance</button></div>
    <div hidden={performance}>{children}</div>{performance && <PlayerPerformance campaign={campaign} playerId={playerId} />}</>;
}
