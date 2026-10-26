import { patchLabel } from "./patch-label";
import { useMemo, useState } from "react";
import { Search, Trophy } from "lucide-react";
import type { Campaign } from "./game";
import { matchClock } from "./battle";
import { campaignMatchHistory } from "./match-history";
import type { MatchKind } from "./match-history";
import PostGameScreen from "./PostGameScreen";
import { HeroToken } from "./HeroToken";
import TeamBadge from "./TeamBadge";
import "./match-history.css";

const kindName: Record<MatchKind, string> = { tournament: "Tournament", practice: "Practice", exhibition: "Exhibition" };

export default function MatchHistory({ campaign, playerId }: { campaign: Campaign; playerId?: string }) {
  const history = useMemo(() => campaignMatchHistory(campaign, playerId), [campaign, playerId]);
  const [kind, setKind] = useState("all"), [year, setYear] = useState("all"), [event, setEvent] = useState("all"), [query, setQuery] = useState("");
  const [selected, setSelected] = useState<string | null>(null);
  const [limit, setLimit] = useState(30);
  const viewed = history.find(row => row.key === selected);
  const options = history.filter(row => (kind === "all" || row.kind === kind) && (year === "all" || String(row.year) === year));
  const events = [...new Map(options.map(row => [row.eventKey, row.event])).entries()];
  const rows = options.filter(row => (event === "all" || row.eventKey === event) && `${row.event} ${row.opponent} ${row.stage} ${row.player?.hero ?? ""}`.toLowerCase().includes(query.trim().toLowerCase()));
  const reset = () => { setKind("all"); setYear("all"); setEvent("all"); setQuery(""); setLimit(30); };
  if (viewed) return <div className="profile-match-review"><PostGameScreen result={viewed.result} playedAt={viewed.at} initialGame={viewed.game ?? 0} headingId={playerId ? `profile-match-${playerId}` : undefined} perspective={viewed.perspective} teamIds={viewed.teamIds} closeLabel="Back to match history" onClose={() => setSelected(null)}/></div>;
  return <section className="profile-match-history" aria-label="Match history">
    <div className="history-title"><div><h3>Match history</h3><p>Every recorded map, with its match type and tournament.</p></div><Trophy size={22}/></div>
    <div className="history-type-tabs" role="group" aria-label="Match type">{["all", "tournament", "practice", "exhibition"].map(type => <button key={type} aria-pressed={kind === type} onClick={() => { setKind(type); setEvent("all"); setLimit(30); }}>{type === "all" ? "All matches" : kindName[type as MatchKind]}<small>{history.filter(row => type === "all" || row.kind === type).length}</small></button>)}</div>
    <div className="history-filters"><label>Season<select value={year} onChange={e => { setYear(e.target.value); setEvent("all"); setLimit(30); }}><option value="all">All seasons</option>{[...new Set(history.map(row => row.year))].map(y => <option key={y}>{y}</option>)}</select></label><label>Tournament / event<select value={event} onChange={e => { setEvent(e.target.value); setLimit(30); }}><option value="all">All events</option>{events.map(([id, name]) => <option key={id} value={id}>{name}</option>)}</select></label><label className="history-search"><span><Search size={13}/>Search matches</span><input value={query} onChange={e => { setQuery(e.target.value); setLimit(30); }} placeholder="Opponent, tournament or hero"/></label></div>
    {!rows.length ? <div className="history-empty"><p>{history.length ? "No matches match these filters." : "Completed tournament games and practice scrims will appear here. Unplayed fixtures do not create match records."}</p>{history.length > 0 && <button className="button secondary" onClick={reset}>Clear match filters</button>}</div> : <>
      <p className="history-count">{rows.length} records · {rows.filter(r => r.game !== null).length} maps{playerId ? " · Recorded player appearances" : " · Your club across lineups"}</p>
      <div className="history-matches">{rows.slice(0, limit).map(row => <article key={row.key} className={`history-match kind-${row.kind}`}>
        <span className={`history-outcome outcome-${row.outcome}`}>{row.outcome}</span>
        <div className="history-opponent"><strong>{row.opponent}</strong><small>{row.at.includes("-W") ? `${row.year} · ${row.stage}` : row.at.slice(0, 10)}{row.game !== null ? ` · Game ${row.game + 1}` : " · Series summary"}{row.duration != null ? ` · ${matchClock(row.duration)}` : ""}</small></div>
        <div className="history-event"><span className={`history-kind kind-${row.kind}`}>{kindName[row.kind]}</span><strong>{row.event}</strong><small>{row.stage}{row.result.series?.patch ? ` · Patch ${patchLabel(row.result.series.patch)}` : ""}</small></div>
        {row.player && <div className="history-player"><HeroToken score={row.player}/><span>{row.player.hero}<small>{row.player.kills} / {row.player.deaths} / {row.player.assists}</small></span></div>}
        <div className="history-detail">{row.game !== null ? <button className="button secondary small-button" aria-label={`Open ${kindName[row.kind].toLowerCase()} vs ${row.opponent}, ${row.event}, game ${row.game + 1}`} onClick={() => setSelected(row.key)}>Match details</button> : <small>{row.result.score} · Details not retained</small>}</div>
      </article>)}</div>
      {rows.length > limit && <button className="button secondary full" onClick={() => setLimit(n => n + 30)}>Show more matches · {rows.length - limit} remaining</button>}
    </>}
    <p className="history-footnote">Practice scrims have no tournament and stay separate from competitive career statistics. Old summaries retain their recorded scores; unavailable maps and replays are not recreated.</p>
  </section>;
}

export function ClubProfile({ campaign }: { campaign: Campaign }) {
  return <div className="club-profile"><section className="panel club-profile-heading"><TeamBadge teamId={campaign.world?.managedTeamId} name={campaign.settings.team} year={campaign.year} size="large"/><div><div className="eyebrow">MY PROFILE</div><h2>{campaign.settings.team}</h2><p>{campaign.settings.region} · {campaign.year} season</p></div></section><div className="panel"><MatchHistory campaign={campaign}/></div></div>;
}
