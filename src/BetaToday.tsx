import { BookOpen, ChevronRight, Dumbbell, Users } from "lucide-react";
import type { Campaign, Page } from "./game";
import { average, money, teamPlayers } from "./game";
import { campaignMenu } from "./menu-eras";
import { managerCompetition } from "./manager-view";
import { formatDate, historicalTournaments, utcTime } from "./tournaments";

/** The original beta through May 23, 2012. Today feature and match rail, with real campaign data
 * in place of the original client's public matchmaking feed. */
export default function BetaToday({ campaign, onPage, onCompetition, onUpdates }: {
  campaign: Campaign; onPage: (page: Page) => void; onCompetition: () => void; onUpdates: () => void;
}) {
  const { patch } = campaignMenu(campaign);
  const day = (campaign.calendar?.now ?? patch.startsOn).slice(0, 10);
  const ti = historicalTournaments.filter(event => event.kind === "ti" && event.end >= day).sort((a, b) => a.start.localeCompare(b.start))[0];
  const competition = managerCompetition(campaign);
  const tiPatch = patch.id !== "2011.1";
  const roster = teamPlayers(campaign);
  const energy = average(roster.map(player => player.energy));
  const days = ti ? Math.max(0, Math.ceil((utcTime(ti.start) - utcTime(day)) / 86400000)) : null;
  const recent = campaign.results.filter(result => !result.skipped).slice(-3).reverse();
  return <div className="beta-today-layout">
    {tiPatch && <aside className="beta-matchmaking" aria-label="Club matchmaking and preparation">
      <h2>Matchmaking</h2>
      <div className="beta-region"><small>HOME REGION</small><strong>{campaign.settings.region}</strong><span>Campaign competition region</span><button onClick={() => onPage("calendar")}>Season calendar <ChevronRight size={12} /></button></div>
      <div className="beta-preparation"><small>STARTING FIVE</small><strong>{roster.filter(player => player.energy >= 60).length}<span> / {roster.length}</span></strong><span>Players at 60%+ energy</span><button onClick={() => onPage("roster")}>Manage squad <ChevronRight size={12} /></button></div>
      <div className="beta-preparation"><small>SQUAD READINESS</small><strong>{energy}<span> / 100</span></strong><meter value={energy} min={0} max={100} aria-label="Average squad readiness" /><button onClick={() => onPage("training")}>Training & recovery <ChevronRight size={12} /></button></div>
      <button className="beta-matchmaking-action" onClick={onCompetition}>{competition?.opponent ? "Match centre" : "Review tournament"}</button>
      <button className="beta-private-games" onClick={() => onPage("scrims")}>Private games · Scrims</button>
    </aside>}
    <section className="beta-feature">
      <header><h2>Today in Dota</h2><nav aria-label="Today shortcuts"><button onClick={onUpdates}>Update notes</button><button onClick={() => onPage("inbox")}>Club news</button></nav></header>
      <button className="beta-ti-feature" onClick={() => onPage("calendar")} aria-label={`${ti?.name ?? "The International"} · Open season calendar`}>
        <span>{ti ? `${formatDate(ti.start)} – ${formatDate(ti.end)}` : "The International"}</span>
        <small>{ti?.location ?? "The first championship"}</small>
      </button>
      <article className="beta-dispatch"><span className="beta-dispatch-label">CURRENT UPDATE · {patch.versions}</span><h3>{patch.name}</h3><p>{patch.description}</p><button onClick={() => onPage("patch")}>Read patch notes <ChevronRight size={13} /></button></article>
      {tiPatch && <nav className="beta-shortcut-tiles" aria-label="Beta feature shortcuts">
        <button onClick={onUpdates}><BookOpen aria-hidden="true" /><span>Update notes</span></button>
        <button onClick={() => onPage("roster")}><Users aria-hidden="true" /><span>Your squad</span></button>
        <button onClick={() => onPage("training")}><Dumbbell aria-hidden="true" /><span>Training</span></button>
      </nav>}
      <div className="beta-feature-footer"><span>{days === null ? "The first season" : days > 0 ? `${days} days until The International` : day <= (ti?.end ?? "") ? "The International is underway" : "The International has concluded"}</span><button onClick={() => onPage("heroes")}>Explore heroes <ChevronRight size={12} /></button></div>
    </section>
    <aside className="beta-match-rail" aria-label="Campaign matches">
      <h2>Next series</h2><button className="beta-next-series" onClick={onCompetition}><small>{competition?.name ?? "Your season"}</small><strong>{competition?.opponent ?? "No opponent scheduled"}</strong><span>{competition?.stage ?? "Review invitations in the calendar"}</span>{competition?.at && <time>{formatDate(competition.at)}</time>}<b>{competition?.opponent ? "Match centre" : "Season calendar"} <ChevronRight size={12} /></b></button>
      <h2>Recent events</h2><div className="beta-recent-events">{recent.length ? recent.map((result, index) => <button key={`${result.eventId}-${index}`} onClick={() => onPage("history")}><span>{result.event}</span><strong>{result.won ? "Won" : "Not won"}</strong></button>) : <p>No completed events.<br />Your story starts here.</p>}</div>
      {ti && <button className="beta-ti-prize" onClick={() => onPage("standings")}><strong>{money(ti.pool)}</strong><small>THE INTERNATIONAL PRIZE POOL</small><span>TI race & standings <ChevronRight size={12} /></span></button>}
    </aside>
  </div>;
}
