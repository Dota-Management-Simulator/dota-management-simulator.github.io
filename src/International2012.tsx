import { useState } from "react";
import { ChevronRight } from "lucide-react";
import type { Page } from "./game";
import { money } from "./game";
import type { TiMenu } from "./menu-ti";
import { formatDate } from "./tournaments";
import TeamBadge from "./TeamBadge";
import "./international-2012.css";

const sections = [["location", "Location"], ["about", "About"], ["media", "Media"], ["prelims", "Prelims"], ["main", "Main event"]] as const;
type Section = typeof sections[number][0];
const locations = [["event", "The event"], ["attendance", "Attendance"], ["faq", "F.A.Q."]] as const;

/** TI2's embedded event site, with campaign information and management actions. */
export default function International2012({ ti, onPage }: { ti: TiMenu; onPage: (page: Page) => void }) {
  const [section, setSection] = useState<Section>("location");
  const [location, setLocation] = useState<typeof locations[number][0]>("event");
  const action = (label: string, page: Page) => <button className="ti2-action" onClick={() => onPage(page)}>{label}<ChevronRight size={12} /></button>;
  const dates = `${formatDate(ti.event.start)} – ${formatDate(ti.event.end)}`;
  const entry = ti.managedEntered ? "Your club is in the field for The International." : "Your club is not in this year's International field.";
  return <div className="client-international ti2-international">
    <div className="client-international-head" role="img" aria-label="The International · Dota 2 Championships, 2012" />
    <nav aria-label="International sections">{sections.map(([id, label]) => <button key={id} aria-pressed={section === id} className={section === id ? "is-active" : ""} onClick={() => setSection(id)}>{label}</button>)}</nav>
    {section === "location" ? <>
      <nav className="ti2-location-tabs" aria-label="Location sections">{locations.map(([id, label]) => <button key={id} aria-pressed={location === id} className={location === id ? "is-active" : ""} onClick={() => setLocation(id)}>{label}</button>)}</nav>
      {location === "event" ? <div className="ti2-event">
        <img src={`${import.meta.env.BASE_URL}dota-menu/ti2012-seattle.jpg`} alt="The International 2012 · Seattle skyline and Space Needle" />
        <p>Full tournament · {dates}<br />{ti.event.location}</p>
        {action("Season calendar", "calendar")}
      </div> : location === "attendance" ? <article className="ti2-content"><h2>Your club at The International</h2><p>{entry}</p><p>{ti.event.location}<br />{dates}</p>{action("Review the event", "calendar")}{action("Prepare your squad", "roster")}</article>
        : <article className="ti2-content"><h2>Following the tournament</h2><h3>Where are the schedule and results?</h3><p>The season calendar holds your campaign's fixtures and tournament bracket. Completed series appear in match history.</p>{action("Season calendar", "calendar")}{action("Match history", "history")}<h3>Who is taking part?</h3><p>The Main event section lists this campaign's International field.</p><button className="ti2-action" onClick={() => setSection("main")}>View the field<ChevronRight size={12} /></button></article>}
    </> : section === "about" ? <article className="ti2-content ti2-about"><h2>The International 2012</h2><strong>{money(ti.event.pool)}</strong><small>PRIZE POOL</small><p>{ti.teams.length} teams · {ti.event.location}<br />{dates}</p><p>{entry}</p>{action("TI race & standings", "standings")}</article>
      : section === "media" ? <article className="ti2-content"><h2>Match coverage</h2><p>Follow your campaign's completed series, drafts and available replays in match history.</p>{action("Match history", "history")}</article>
        : section === "prelims" ? <article className="ti2-content"><h2>Preliminary stage</h2><p>{ti.event.format}</p><p>{dates}</p>{action("Schedule & tournament bracket", "calendar")}{action("Scout your next series", "next-series")}</article>
          : <article className="ti2-content"><h2>The International field</h2><p>{entry}</p><ul className="ti2-field">{ti.teams.map(team => <li key={team.id} className={team.managed ? "is-managed" : ""}><TeamBadge teamId={team.id} name={team.name} year={2012} size="small" /><span>{team.name}{team.managed && <small>Your club</small>}</span></li>)}</ul>{action("Schedule & tournament bracket", "calendar")}</article>}
  </div>;
}
