import { useState } from "react";
import { Search } from "lucide-react";
import { getHeroPool, heroEra, heroRoles } from "./heroes";

export default function HeroPool({ year }: { year: number }) {
  const [search, setSearch] = useState("");
  const [role, setRole] = useState("all");
  const heroes = getHeroPool(year);
  const filtered = heroes.filter(
    (h) =>
      h.name.toLowerCase().includes(search.toLowerCase()) &&
      (role === "all" || h.roles.includes(Number(role))),
  );
  return (
    <section className="panel hero-pool-panel">
      <div className="section-title">
        <div>
          <h2>The classic hero pool</h2>
          <p>
            46 TI1-contested heroes · modern names · prototype abilities and
            balance
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
            aria-label="Search classic heroes"
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
              <small>
                {h.attribute} · {h.ranged ? "Ranged" : "Melee"} · {h.ability}
              </small>
            </span>
          </div>
        ))}
      </div>
      {!filtered.length && (
        <p className="hero-pool-empty">No heroes match these filters.</p>
      )}
      <p className="match-footnote">
        {year === 2011
          ? "The 2011 campaign excludes later releases such as Ember Spirit, Oracle, and Earth Spirit."
          : "Later seasons currently retain this classic pool until additional era data is added."}{" "}
        Position preferences and combat archetypes are illustrative; this is not
        a recreation of patch 6.72.
      </p>
    </section>
  );
}
