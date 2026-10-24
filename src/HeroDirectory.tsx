import { useState } from "react";
import { Search } from "lucide-react";
import type { Campaign } from "./game";
import { campaignHeroPoolThrough, campaignPatch, heroTags } from "./patches";
import { getHeroPool, heroRoles } from "./heroes";
import { managedPatchObserver } from "./patch-knowledge";
import { heroScoutReport } from "./hero-scouting";
import { heroIconFor } from "./hero-icons";
import RangeBars from "./RangeBars";
import "./heroes.css";

export default function Heroes({ campaign, onStaff, onPatch }: { campaign: Campaign; onStaff: () => void; onPatch: () => void }) {
  const [search, setSearch] = useState("");
  const [role, setRole] = useState("all");
  const [sort, setSort] = useState("name");
  const patch = campaignPatch(campaign);
  const pool = getHeroPool(campaign.year, campaignHeroPoolThrough(campaign), patch);
  const report = heroScoutReport(patch, managedPatchObserver(campaign), pool);
  const filtered = report.filter(({ hero }) => hero.name.toLowerCase().includes(search.trim().toLowerCase()) && (role === "all" || hero.roles.includes(Number(role))))
    .sort((a, b) => (sort === "strength" ? (b.winRate.low + b.winRate.high) - (a.winRate.low + a.winRate.high) : 0) || a.hero.name.localeCompare(b.hero.name));
  return <section className="panel heroes-panel">
    <div className="section-title"><div><h2>Heroes · patch {patch.id}</h2><p>{pool.length} available heroes · {patch.name}</p></div><button className="text-link" onClick={onPatch}>Patch notes →</button></div>
    <div className="heroes-explainer"><p>Estimated strength with equal teams, shown as win-rate ranges on a shared 0–100% scale. Broad observations begin with a 16-point spread. Scrim debriefs slowly narrow played heroes towards a 4-point read; staff can discover favorites sooner. Overlapping bars leave the ranking uncertain.</p><p>These are game balance estimates. Player skill, drafts and opponents affect actual results. Practice observations are specific to this patch.</p><button className="text-link" onClick={onStaff}>Improve scouting with staff →</button></div>
    <div className="hero-pool-filters">
      <div className="search-field"><Search size={16} /><input aria-label="Search heroes" placeholder="Find a hero…" value={search} onChange={e => setSearch(e.target.value)} /></div>
      <select aria-label="Filter heroes by position" value={role} onChange={e => setRole(e.target.value)}><option value="all">All positions</option>{heroRoles.map((name, i) => <option value={i} key={name}>{name}</option>)}</select>
      <select aria-label="Sort heroes" value={sort} onChange={e => setSort(e.target.value)}><option value="name">Name A–Z</option><option value="strength">Estimated strength</option></select>
      <span>{filtered.length} {filtered.length === 1 ? "hero" : "heroes"}</span>
    </div>
    <div className="heroes-list">{filtered.map(({ hero, winRate, scouted, samples }) => {
      const icon = heroIconFor(hero.id);
      return <article className="hero-strength-row" key={hero.id}>
        <div className="hero-strength-identity"><span className="match-hero-token">{icon && <img src={`${import.meta.env.BASE_URL}${icon.path}`} alt="" loading="lazy" />}</span><div><h3>{hero.name}</h3><p>{hero.roles.map(r => heroRoles[r]).join(" / ")} · {heroTags(hero).join(" / ")}</p><small>{samples ? `${samples} scrim ${samples === 1 ? "map" : "maps"} · ${samples < 4 ? "Early" : samples < 12 ? "Developing" : "Established"} read · ${winRate.width}-point spread` : scouted ? "Scouted favorite · 4-point spread" : "Broad observation · 16-point spread"}</small></div></div>
        <RangeBars label={`${hero.name} estimated win rate`} current={winRate} unit="%" lowLabel="0%" highLabel="100%" />
      </article>;
    })}</div>
    {!filtered.length && <p className="hero-pool-empty">No heroes match these filters.</p>}
  </section>;
}
