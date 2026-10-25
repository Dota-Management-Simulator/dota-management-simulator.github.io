import { useState } from "react";
import { ChevronLeft, ChevronRight, List, X } from "lucide-react";
import type { Page } from "./game";
import { money } from "./game";
import { formatDate } from "./tournaments";
import type { TiMenu } from "./menu-ti";
import TeamBadge from "./TeamBadge";
import ClientModal from "./ClientModal";
import "./compendium-2013.css";

const art = (name: string) => `${import.meta.env.BASE_URL}dota-menu/${name}`;
export default function Compendium2013({ ti, onClose, onPage }: { ti: TiMenu; onClose: () => void; onPage: (page: Page) => void }) {
  const [spread, setSpread] = useState(0);
  const names = ["The International", "Table of contents", "The teams", "The prize pool"];
  const page = (target: Page) => { onClose(); onPage(target); };
  return <ClientModal label="The International 2013 Compendium" className="compendium13-modal" onClose={onClose}>
    <button className="compendium13-close" onClick={onClose} aria-label="Close the Compendium"><X size={22} /></button>
    <div className={`compendium13-book spread-${spread}`} aria-live="polite">
      <div className="compendium13-page">
        {spread === 0 ? <div className="compendium13-inside" aria-hidden="true" />
          : spread === 1 ? <><h2><small>Table of</small>Contents</h2><h3>The event</h3><button className="compendium13-entry" onClick={() => page("calendar")}><span>04</span>Venue & schedule</button><button className="compendium13-entry" onClick={() => setSpread(2)}><span>05</span>Teams</button><h3>Tournament</h3><button className="compendium13-entry" onClick={() => page("standings")}><span>12</span>TI race & standings</button><button className="compendium13-entry" onClick={() => page("next-series")}><span>14</span>Prepare your next series</button><button className="compendium13-entry" onClick={() => page("history")}><span>16</span>Match history & replays</button></>
          : spread === 2 ? <><h2>The teams</h2><ol className="compendium13-teams">{ti.teams.slice(0, 8).map(team => <li key={team.id} className={team.managed ? "is-managed" : ""}><TeamBadge teamId={team.id} name={team.name} year={2013} size="small" />{team.name}</li>)}</ol></>
          : <><h2>The prize pool</h2><strong className="compendium13-total">{money(ti.event.pool)}</strong><p className="compendium13-caption">TOTAL TOURNAMENT PRIZE POOL</p><ol className="compendium13-prizes">{ti.event.prizes.filter(prize => prize.usd > 0).map(prize => <li key={prize.from}><span>{prize.from === prize.to ? prize.from : `${prize.from}–${prize.to}`}</span><strong>{money(prize.usd)}</strong></li>)}</ol></>}
      </div>
      <div className="compendium13-page">
        {spread === 0 ? <div className="compendium13-title"><img src={art("dota-symbol.png")} alt="" /><h2>The International</h2><span>DOTA 2 CHAMPIONSHIPS</span><em>★ ★ ★ ★ ★</em><div className="compendium13-band"><p>The top {ti.teams.length === 16 ? "sixteen" : ti.teams.length} teams in the world<br />compete for the Dota 2 championship</p><small>{ti.year === 2013 ? <>Main event August 7–11, 2013<br />Benaroya Hall, home of the Seattle Symphony<br />Seattle, Washington, USA</> : <>{formatDate(ti.event.start)} – {formatDate(ti.event.end)}<br />{ti.event.location}</>}</small></div><button onClick={() => setSpread(1)}>Open the contents <ChevronRight size={16} /></button></div>
          : spread === 1 ? <><h3>Championship</h3><button className="compendium13-entry" onClick={() => page("arcade")}><span>22</span>All-Star match</button><h3>Prize pool</h3><button className="compendium13-entry" onClick={() => setSpread(3)}><span>24</span>Current amount & distribution</button><h3>Your club</h3><button className="compendium13-entry" onClick={() => page("roster")}><span>28</span>Player profiles</button><button className="compendium13-entry" onClick={() => page("world")}><span>30</span>Team directory</button><p className="compendium13-note">Follow the field and your club’s season in this Compendium.</p></>
          : spread === 2 ? <><h2>The field</h2><ol className="compendium13-teams" start={9}>{ti.teams.slice(8).map(team => <li key={team.id} className={team.managed ? "is-managed" : ""}><TeamBadge teamId={team.id} name={team.name} year={2013} size="small" />{team.name}</li>)}</ol><button className="compendium13-link" onClick={() => page("world")}>Explore teams</button></>
          : <><h2>Your road</h2><p className="compendium13-road">{ti.managedEntered ? "Your club is in the field. Prepare your five for The International." : "Follow the championship field and your club’s season."}</p><button className="compendium13-link" onClick={() => page("calendar")}>Season calendar</button><button className="compendium13-link" onClick={() => page("standings")}>TI race & standings</button><button className="compendium13-link" onClick={() => page("next-series")}>Scout next series</button></>}
      </div>
    </div>
    <nav className="compendium13-nav" aria-label="Compendium pages"><button disabled={spread === 0} onClick={() => setSpread(spread - 1)} aria-label="Previous page"><ChevronLeft /></button><button onClick={() => setSpread(1)} aria-label="Contents"><List /></button><span>{names[spread]}</span><button onClick={onClose}>Close</button><button disabled={spread === 3} onClick={() => setSpread(spread + 1)} aria-label="Next page"><ChevronRight /></button></nav>
  </ClientModal>;
}
