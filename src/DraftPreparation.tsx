import { useId, useState } from "react";
import type { DraftPreparation as Preparation } from "./draft";
import { heroById, heroRoles } from "./heroes";
import type { Hero } from "./heroes";
import { heroMedia } from "./hero-media";
import { HeroName } from "./DraftRecord";
import "./draft-preparation.css";

function Portrait({ id }: { id: string }) {
  const media = heroMedia(id, import.meta.env.BASE_URL);
  const [failed, setFailed] = useState(false);
  return media ? <img src={failed ? media.icon : media.portrait} alt="" loading="lazy" className={failed ? "is-fallback" : undefined} onError={() => { if (!failed) setFailed(true); }} /> : null;
}

export default function DraftPreparation({ pool, preparation: prep, onChange, onSave }: {
  pool: Hero[];
  preparation: Preparation;
  onChange: (preparation: Preparation) => void;
  onSave: () => void;
}) {
  const [target, setTarget] = useState<number | "bans">(0);
  const [query, setQuery] = useState("");
  const [saved, setSaved] = useState("");
  const searchId = useId();
  const banning = target === "bans";
  const selected = banning ? prep.bans : prep.preferred[target];
  const available = pool.filter(hero => banning || hero.roles.includes(target));
  const filtered = available.filter(hero => hero.name.toLowerCase().includes(query.trim().toLowerCase()))
    .sort((a, b) => a.name.localeCompare(b.name));
  const choose = (id: string) => {
    if (banning) {
      onChange({ ...prep, bans: prep.bans.includes(id) ? prep.bans.filter(hero => hero !== id) : [...prep.bans, id].slice(0, 6) });
    } else {
      onChange({ ...prep, preferred: prep.preferred.map((ids, role) => role === target ? (ids.includes(id) ? [] : [id]) : ids) });
    }
  };
  return <div className="draft-preparation">
    <div className="prep-heading"><div><h3>Draft preparation</h3><p>Choose a position, then click a hero portrait to set your preference.</p></div>
      <label>Approach<select value={prep.approach} onChange={event => onChange({ ...prep, approach: event.target.value as Preparation["approach"] })}>
        {(["balanced", "teamfight", "push", "pickoff", "scaling"] as const).map(value => <option key={value} value={value}>{value[0].toUpperCase() + value.slice(1)}</option>)}
      </select></label>
    </div>
    <div className="prep-slots" role="group" aria-label="Preferred heroes by position">
      {heroRoles.map((name, role) => {
        const id = prep.preferred[role][0];
        const unavailable = id && !pool.some(hero => hero.id === id && hero.roles.includes(role));
        return <button type="button" key={name} className={`prep-slot ${target === role ? "is-active" : ""}`} aria-pressed={target === role}
          aria-label={`${name} preferred hero: ${id ? heroById(id)?.name ?? id : "Coach’s choice"}`} onClick={() => { setTarget(role); setQuery(""); }}>
          <span className="prep-slot-role">{name}</span><span className="prep-slot-art">{id ? <Portrait key={id} id={id} /> : <span className="prep-slot-empty">+</span>}</span>
          <strong>{id ? heroById(id)?.name ?? id : "Coach’s choice"}</strong><small>{unavailable ? "Unavailable here" : target === role ? "Selecting this position" : "Choose hero"}</small>
        </button>;
      })}
    </div>
    <div className="prep-ban-bar"><button type="button" className={`prep-ban-target ${banning ? "is-active" : ""}`} aria-pressed={banning} onClick={() => { setTarget("bans"); setQuery(""); }}>Priority bans <span>{prep.bans.length} / 6</span></button>
      <div className="draft-ban-chips" aria-label="Priority bans">{prep.bans.length ? prep.bans.map(id => <button type="button" className="prep-ban-chip" key={id} aria-label={`Remove ${heroById(id)?.name ?? id} from priority bans`} onClick={() => onChange({ ...prep, bans: prep.bans.filter(hero => hero !== id) })}><HeroName id={id} /><span aria-hidden="true">×</span></button>) : <span className="field-note">Select priority bans to choose threats from the grid.</span>}</div>
    </div>
    <div className="prep-picker">
      <div className="prep-picker-toolbar"><div><h4>{banning ? "Choose priority bans" : `Choose ${heroRoles[target].toLowerCase()} preference`}</h4><p aria-live="polite">{filtered.length} heroes · {banning ? `${prep.bans.length} of 6 bans selected` : "Era-eligible heroes for this position"}</p></div>
        <label htmlFor={searchId}>Search heroes<input id={searchId} type="search" placeholder="Find a hero…" value={query} onChange={event => setQuery(event.target.value)} /></label>
        {!banning && <button type="button" className="prep-coach-choice" aria-pressed={!selected.length} onClick={() => onChange({ ...prep, preferred: prep.preferred.map((ids, role) => role === target ? [] : ids) })}>Coach’s choice</button>}
      </div>
      {banning && prep.bans.length === 6 && <p className="prep-limit" role="status">All six ban slots are filled. Remove a selected ban to choose another.</p>}
      <div key={target} className={`prep-hero-grid ${banning ? "is-banning" : ""}`} role="group" aria-label={banning ? "Choose priority bans" : `${heroRoles[target]} hero choices`}>
        {filtered.map(hero => {
          const active = selected.includes(hero.id);
          const banned = prep.bans.includes(hero.id);
          return <button type="button" className={`prep-hero-card ${active ? "is-selected" : ""}`} key={hero.id} aria-label={`${banning ? "Priority ban" : `${heroRoles[target]} preference`}: ${hero.name}`} aria-pressed={active}
            disabled={banning && !active && prep.bans.length >= 6} onClick={() => choose(hero.id)}>
            <span className="prep-hero-art"><Portrait id={hero.id} />{(active || banned) && <span className={`prep-hero-mark ${banned ? "is-ban" : ""}`}>{banned ? "BAN" : "✓ PREFERRED"}</span>}</span>
            <strong>{hero.name}</strong><small>{hero.roles.map(role => heroRoles[role]).join(" / ")}</small>
          </button>;
        })}
      </div>
      {!filtered.length && <div className="prep-no-results"><p>No heroes match “{query}” for {banning ? "priority bans" : heroRoles[target].toLowerCase()}.</p><button type="button" className="text-link" onClick={() => setQuery("")}>Clear search</button></div>}
    </div>
    <div className="prep-save"><button type="button" className="button secondary small-button" onClick={() => { onSave(); setSaved(JSON.stringify(prep)); }}>Save preparation</button><span role="status">{saved === JSON.stringify(prep) ? "Preparation saved" : ""}</span></div>
    <p className="field-note">Preferences guide the coach. Bans, role fit and availability can force another pick. Both teams work from their own uncertain patch research.</p>
  </div>;
}
