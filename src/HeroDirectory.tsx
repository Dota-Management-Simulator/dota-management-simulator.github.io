import { patchLabel } from "./patch-label";
import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Search } from "lucide-react";
import type { Campaign } from "./game";
import { campaignHeroPoolThrough, campaignPatch, heroTags } from "./patches";
import { getHeroPool, heroRoles } from "./heroes";
import { managedPatchObserver } from "./patch-knowledge";
import { heroScoutReport } from "./hero-scouting";
import { heroMedia } from "./hero-media";
import RangeBars from "./RangeBars";
import HeroModel from "./HeroModel";
import { heroAbilities, abilitySummary } from './combat-model';
import "./heroes.css";

function Portrait({ id }: { id: string }) {
  const media = heroMedia(id, import.meta.env.BASE_URL);
  const [failed, setFailed] = useState(false);
  return media ? <img src={failed ? media.icon : media.portrait} alt="" loading="lazy" onError={() => { if (!failed) setFailed(true); }} className={failed ? "hero-portrait-fallback" : ""} /> : null;
}

export default function Heroes({ campaign, onStaff, onPatch }: { campaign: Campaign; onStaff: () => void; onPatch: () => void }) {
  const [search, setSearch] = useState("");
  const [role, setRole] = useState("all");
  const [sort, setSort] = useState("name");
  const [selectedId, setSelectedId] = useState("anti_mage");
  const [motion, setMotion] = useState(() => !window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  const showcase = useRef<HTMLDivElement>(null);
  const patch = campaignPatch(campaign);
  const pool = getHeroPool(campaign.year, campaignHeroPoolThrough(campaign), patch);
  const report = heroScoutReport(patch, managedPatchObserver(campaign), pool);
  const selected = report.find(item => item.hero.id === selectedId) ?? report[0];
  const filtered = report.filter(({ hero }) => hero.name.toLowerCase().includes(search.trim().toLowerCase()) && (role === "all" || hero.roles.includes(Number(role))))
    .sort((a, b) => (sort === "strength" ? (b.scouted||b.samples>0?b.winRate.low+b.winRate.high:0)-(a.scouted||a.samples>0?a.winRate.low+a.winRate.high:0) : 0) || a.hero.name.localeCompare(b.hero.name));
  useEffect(() => {
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    const changed = () => { if (preference.matches) setMotion(false); };
    preference.addEventListener("change", changed);
    return () => preference.removeEventListener("change", changed);
  }, []);
  function selectHero(id: string) {
    setSelectedId(id);
    if (window.matchMedia("(max-width: 900px)").matches) showcase.current?.scrollIntoView({ block: "start", behavior: "instant" });
  }
  function step(direction: number) {
    const index = filtered.findIndex(item => item.hero.id === selected?.hero.id);
    const nextIndex = index < 0 ? (direction > 0 ? 0 : filtered.length - 1) : (index + direction + filtered.length) % filtered.length;
    const next = filtered[nextIndex];
    if (next) setSelectedId(next.hero.id);
  }
  return <section className="panel heroes-panel">
    <div className="section-title"><div><h2>Heroes · patch {patchLabel(patch)}</h2><p>{pool.length} available heroes · {patch.name}</p></div><button className="text-link" onClick={onPatch}>Patch notes →</button></div>
    <div className="hero-browser">
      {selected && <div className="hero-showcase" ref={showcase}>
        <div className="hero-showcase-title"><div><span>THE HERO ROSTER</span><h3 aria-live="polite">{selected.hero.name}</h3></div><div className="hero-browse-arrows"><button aria-label="Previous hero" disabled={!filtered.length} onClick={() => step(-1)}><ChevronLeft size={19} /></button><button aria-label="Next hero" disabled={!filtered.length} onClick={() => step(1)}><ChevronRight size={19} /></button></div></div>
        <HeroModel key={selected.hero.id} hero={selected.hero} motion={motion} onMotion={setMotion} />
        <div className="hero-showcase-report">
          <div className="hero-showcase-roles">{selected.hero.roles.map(r => <span key={r}>{heroRoles[r]}</span>)}</div>
          <p className="hero-showcase-tags">{heroTags(selected.hero).join(" · ")}</p>
          <details className="hero-kit-guide"><summary>Spells &amp; how they play</summary>{heroAbilities(selected.hero.id,patch).filter(a=>!a.hidden||a.granted).map(a=><p key={a.id}><strong>{a.name}{a.granted?` (${a.granted})`:''}</strong> · {abilitySummary(a)}</p>)}</details>
          <div className="hero-scout-heading"><strong>PATCH {patchLabel(patch)} · SCOUTING OUTLOOK</strong><span>{selected.samples ? `${selected.samples} scrim ${selected.samples === 1 ? "map" : "maps"}` : selected.scouted ? "Scouted favorite" : "Not researched"}</span></div>
          {(selected.scouted||selected.samples>0)?<><RangeBars label={`${selected.hero.name} estimated win rate`} current={selected.winRate} unit="%" lowLabel="0%" highLabel="100%" /><p className="hero-scout-note">Estimated strength with equal teams · {selected.winRate.width}-point spread. Overlapping ranges leave the ranking uncertain.</p></>:<p className="hero-scout-note">No strength estimate yet. Public patch notes describe the changes; staff research or scrims provide an interpretation.</p>}
          <button className="text-link" onClick={onStaff}>Improve scouting with staff →</button>
        </div>
        <small className="hero-art-credit">Hero artwork & animation © Valve. Current appearances; era roles and availability follow your campaign.</small>
      </div>}
      <div className="hero-roster-browser">
        <div className="hero-roster-heading"><div><h3>Choose your hero</h3><p>Select a portrait to inspect their model and scouting report.</p></div><span aria-live="polite">{filtered.length} / {pool.length}</span></div>
        <div className="hero-pool-filters">
          <div className="search-field"><Search size={16} /><input aria-label="Search heroes" placeholder="Find a hero…" value={search} onChange={e => setSearch(e.target.value)} /></div>
          <select aria-label="Filter heroes by position" value={role} onChange={e => setRole(e.target.value)}><option value="all">All positions</option>{heroRoles.map((name, i) => <option value={i} key={name}>{name}</option>)}</select>
          <select aria-label="Sort heroes" value={sort} onChange={e => setSort(e.target.value)}><option value="name">Name A–Z</option><option value="strength">Estimated strength</option></select>
        </div>
        <div className="hero-portrait-grid" aria-label="Available heroes">{filtered.map(({ hero, winRate, scouted, samples }) => <button className={`hero-portrait-card ${selected?.hero.id === hero.id ? "is-selected" : ""}`} key={hero.id} aria-label={`Select ${hero.name}`} aria-pressed={selected?.hero.id === hero.id} onClick={() => selectHero(hero.id)}>
          <span className="hero-portrait-art"><Portrait id={hero.id} />{(scouted || samples > 0) && <span className="hero-portrait-read">{samples > 0 ? "PRACTICED" : "SCOUTED"}</span>}</span>
          <strong>{hero.name}</strong><span className="hero-card-roles">{hero.roles.map(r => heroRoles[r]).join(" / ")}</span>
          {(scouted||samples>0)?<><span className="hero-card-estimate">{winRate.low}–{winRate.high}% <span>estimated</span></span><span className="hero-card-range" role="img" aria-label={`${hero.name} estimated win rate: ${winRate.low} to ${winRate.high}% out of 100`}><span style={{ left: `${winRate.low}%`, width: `${winRate.width}%` }} /></span></>:<span className="hero-card-estimate">Not researched</span>}
        </button>)}</div>
        {!filtered.length && <div className="hero-pool-empty"><p>No heroes match these filters.</p><button onClick={() => { setSearch(""); setRole("all"); }}>Clear filters</button></div>}
        <details className="heroes-explainer"><summary>About these scouting estimates</summary><p>Unresearched heroes have no displayed strength rating. Practice observations begin with a 16-point spread and debriefs narrow played heroes towards a 4-point read; staff can discover favorites sooner. Observations are specific to this patch.</p><p>These are game balance estimates. Player skill, drafts and opponents affect actual results.</p></details>
      </div>
    </div>
  </section>;
}
