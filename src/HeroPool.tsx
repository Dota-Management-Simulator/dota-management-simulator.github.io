import { useState } from "react";
import { Search } from "lucide-react";
import { getHeroPool, heroEra, heroRoles, heroUnlockYear, heroReleases, heroesArrivingIn } from "./heroes";
import type { PatchReport } from "./patch-knowledge";

export default function HeroPool({ year, week, throughYear, report }: { year: number; week: number; throughYear?: number; report?: PatchReport }) {
  const [search, setSearch] = useState("");
  const [role, setRole] = useState("all");
  const through = throughYear ?? heroUnlockYear(year, week);
  const heroes = getHeroPool(year, through);
  const arriving = through < year ? heroesArrivingIn(year) : [];
  const filtered = heroes.filter(
    (h) =>
      h.name.toLowerCase().includes(search.toLowerCase()) &&
      (role === "all" || h.roles.includes(Number(role))),
  );
  return (
    <section className="panel hero-pool-panel">
      <div className="section-title">
        <div>
          <h2>Your season's hero pool</h2>
          <p>
            {heroes.length} heroes · {through < 2011 ? "TI1 opening pool" : `Release batches through ${through}`} · modern names
          </p>
        </div>
        <a
          className="text-link"
          href={heroEra.source}
          target="_blank"
          rel="noreferrer"
        >
          TI1 source ↗
        </a>
      </div>
      <div className="hero-pool-filters">
        <div className="search-field">
          <Search size={16} />
          <input
            aria-label="Search heroes"
            placeholder="Find a hero…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select
          aria-label="Filter heroes by position"
          value={role}
          onChange={(e) => setRole(e.target.value)}
        >
          <option value="all">All positions</option>
          {heroRoles.map((r, i) => (
            <option value={i} key={r}>
              {r}
            </option>
          ))}
        </select>
        <span>
          {filtered.length} {filtered.length === 1 ? "hero" : "heroes"}
        </span>
      </div>
      <div className="classic-heroes">
        {filtered.map((h) => (
          <div key={h.id} className="classic-hero">
            <span
              className={`match-hero-token attr-${h.attribute.toLowerCase()}`}
            >
              {h.name
                .split(" ")
                .map((s) => s[0])
                .slice(0, 2)
                .join("")}
            </span>
            <span>
              <strong>{h.name}</strong>
              {report?.heroes.some(entry => entry.id === h.id) && <small className="patch-pool-bonus">Scouted favorite · patch {report.patchId}</small>}
              <small>
                {h.attribute} · {h.ranged ? "Ranged" : "Melee"} · {h.releasedYear ? `Patch ${h.releasedYear + 1}.1` : "TI1 opening"}
              </small>
            </span>
          </div>
        ))}
      </div>
      {!filtered.length && (
        <p className="hero-pool-empty">No heroes match these filters.</p>
      )}
      <p className="match-footnote">
        {arriving.length ? `${arriving.length} more heroes enter with patch ${year + 1}.1 at the post-TI shuffle. ` : ""}
        Dota 2 release-year additions enter together after TI, including releases later in that calendar year. This game rule does not follow Captain's Mode eligibility. Position preferences, attributes and combat archetypes are illustrative.
      </p>
      <p className="match-footnote"><a className="text-link" href={heroReleases.sources[0].url} target="_blank" rel="noreferrer">Hero release chronology ↗</a> · Coverage through 2026; no additional 2026 release recorded as of October 21.</p>
    </section>
  );
}
