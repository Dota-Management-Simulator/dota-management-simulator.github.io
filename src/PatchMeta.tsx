import { useState } from "react";
import { Sparkles } from "lucide-react";
import type { Campaign } from "./game";
import { campaignHeroPoolThrough, campaignPatch, patchAxes, patchById, patchForSeason, heroTags } from "./patches";
import { getHeroPool, heroById, heroRoles } from "./heroes";
import { heroIconFor } from "./hero-icons";
import HeroPool from "./HeroPool";
import "./patches.css";
import { managedPatchObserver, patchReport } from "./patch-knowledge";
import { calibrationForPatch } from "./hero-balance";
import PatchNotes from "./PatchNotes";

export default function PatchMeta({ campaign, onStaff, onPlayer, initialPatchId }: { campaign: Campaign; onStaff: () => void; onPlayer: (id: string) => void; initialPatchId?: string }) {
  const active = campaignPatch(campaign);
  const [preview, setPreview] = useState<{ year: number; phase: 1 | 2 } | undefined>(() => {
    const requested = patchById(initialPatchId);
    return requested && requested.id <= active.id ? { year: requested.year, phase: requested.phase as 1 | 2 } : undefined;
  });
  const patch = preview ? patchForSeason(preview.year, preview.phase) : active;
  const current = patch.id === active.id;
  const report = patchReport(patch, managedPatchObserver(campaign));
  const calibration = calibrationForPatch(patch);
  const through = campaignHeroPoolThrough(campaign);
  const eligible = new Set(getHeroPool(campaign.year, through).map(h => h.id));
  const next = patchForSeason(patch.phase === 1 ? patch.year : patch.year + 1, patch.phase === 1 ? 2 : 1);
  return <>
    <div className="panel patch-browser">
      <label>Season <select aria-label="Browse patch season" value={patch.year} onChange={e => setPreview({ year: Number(e.target.value), phase: Number(e.target.value) === active.year && patch.phase > active.phase ? active.phase as 1 | 2 : patch.phase as 1 | 2 })}>
        {Array.from({ length: active.year - 2010 }, (_,i) => <option key={i} value={2011+i}>{2011+i}{2011+i > 2026 ? " · generated" : ""}</option>)}
      </select></label>
      <div role="group" aria-label="Patch phase" className="patch-phase">
        {([1,2] as const).map(phase => <button key={phase} disabled={patch.year === active.year && phase > active.phase} aria-pressed={patch.phase === phase} className="button secondary" onClick={() => setPreview({ year: patch.year, phase })}>{phase === 1 ? "1 · After shuffle" : "2 · Road to TI"}</button>)}
      </div>
      {!current && <button className="text-link" onClick={() => setPreview(undefined)}>Back to current patch {active.id}</button>}
    </div>
    <PatchNotes key={patch.id} patch={patch} campaign={campaign} onPlayer={onPlayer} />
    <details className="patch-research-details"><summary>Detailed staff research & historical sources</summary>
    <div className="patch-header panel">
      <div className="patch-version">{patch.id}</div>
      <div><div className="eyebrow">{current ? "CURRENT PATCH" : "EARLIER PATCH"} · YOUR TEAM’S READ</div>
        <h2>{patch.name}</h2><p>{campaign.settings.team}’s research into this balance cycle. The ranges and shortlist below are your current scouting assessment.</p>
        <p className="patch-lineage">{patch.generated ? patch.versions : `Real versions: ${patch.versions}`}</p>
      </div><Sparkles className="patch-spark" size={40} />
    </div>
    <div className="panel patch-timing">
      <p><strong>Your information is incomplete.</strong> These ranges contain the patch’s fixed strengths. Your staff narrow specific fields and uncover favored heroes; your auto-draft uses this report. Every team has its own research.</p>
      <button className="text-link" onClick={onStaff}>Improve research with support staff →</button>
      <p><strong>Two patches per TI season.</strong> The opening patch follows the previous TI’s roster shuffle; the second changes the race toward TI. A tournament keeps the patch from its opening date for every team and series.</p>
      <p>{campaign.calendar ? `Proxy drop: ${patch.startsOn}. Next: ${next.id} · ${next.startsOn}.` : "Weekly calendar: opening patch at week 1, second at week 9; next season’s opening follows the week 17 shuffle."} Composite dates compress several real updates and can differ from their historical release dates.</p>
      {current && campaign.calendar?.runs.some(r => r.state === "playing" && r.patchId && r.patchId !== active.id) && <p>An active event is still playing its pinned earlier patch. Its matches use that event’s patch.</p>}
    </div>
    <div className="two-col patch-layout">
      <section className="panel"><div className="section-title"><div><h2>What this patch rewards</h2><p>Scouted ranges · 0–100 scale · no exact ratings revealed.</p></div></div>
        <div className="patch-attributes">{patchAxes.map(axis => {
          const read = report.axes[axis.key];
          return <div className="patch-attribute" key={axis.key}>
          <div><strong>{axis.name}</strong><span>{read.low}–{read.high}<small> / 100</small></span></div>
          <div className="patch-meter patch-range" role="img" aria-label={`${axis.name}: estimated ${read.low} to ${read.high} out of 100; ${read.width}-point spread`}><span style={{ left: `${read.low}%`, width: `${read.width}%` }} /></div>
          <div className="attribute-scale"><span>{axis.low}</span><span>{axis.high}</span></div>
          <p className="patch-confidence">{read.width}-point spread · {read.staffNames.join(", ") || "Team observation · no specialist"}</p><p>{axis.effect}</p>
        </div>; })}</div>
      </section>
      <div><section className="panel"><div className="section-title"><div><h2>Scouted favorites</h2><p>{report.heroes.length} of {report.totalHeroes} discovered · estimated strength with equal teams</p></div></div>
        <div className="meta-heroes">{report.heroes.map(entry => {
          const hero = heroById(entry.id)!; const icon = heroIconFor(hero.id);
          const unlocked = eligible.has(hero.id);
          return <div className={`meta-hero patch-hero ${!unlocked ? "patch-hero-locked" : ""}`} key={hero.id}>
            <span className="match-hero-token">{icon && <img src={`${import.meta.env.BASE_URL}${icon.path}`} alt="" loading="lazy" />}</span>
            <div><strong>{hero.name}</strong><small>{hero.roles.map(r=>heroRoles[r]).join(" / ")} · {heroTags(hero).join(" / ")}</small><small>{unlocked ? "Available in your campaign" : `Available after ${hero.releasedYear} shuffle`}</small>
            </div><span className="meta-strength">{entry.winRate.low}–{entry.winRate.high}%<small>EST. WIN RATE</small></span>
          </div>;
        })}</div>
        {report.heroes.length < report.totalHeroes && <p className="patch-undiscovered">{report.totalHeroes - report.heroes.length} favored {report.totalHeroes - report.heroes.length === 1 ? "hero" : "heroes"} still undiscovered. An analyst, strategy scout or hero specialist can expand your shortlist.</p>}
        <p className="match-footnote">A top hero aims for at most 58% with equal teams. Your estimate can extend beyond the true rate. Player skill, drafts and opponents still change actual results. Creativity leaves room for off-meta picks; hero unlocks stay unchanged.</p>
      </section>
      <section className="panel patch-evidence"><h2>Historical basis</h2>
        <p>{patch.heroStatistics ? <>Hero pick/win counts: <a href={patch.heroStatistics.url} target="_blank" rel="noreferrer">{patch.heroStatistics.label} ↗</a>. {patch.heroStatistics.note}</> : "Hero strengths are provisional era estimates; no verified pick/win sample is attached to this phase."}</p>
        <p>{calibration ? `${(calibration.trainMaps + calibration.validationMaps).toLocaleString()} equal-team simulations used for engine calibration. These are simulated results, separate from the historical observations.` : "This phase has no completed engine calibration attached yet."}</p>
        <p>{patch.generated ? "Fictional future balance." : patch.evidence === "limited" ? "Limited early archive: this phase is provisional." : `${patch.sourceCount} Valve patch notes and announcements recovered for this phase.`}</p>
        {patch.limitations.map(note => <p key={note}>{note}</p>)}
        {!!patch.sources.length && <details><summary>Sources and real release dates</summary><ul>{patch.sources.map(source => <li key={`${source.url}:${source.date}`}><a href={source.url} target="_blank" rel="noreferrer">{source.label} ↗</a> · {source.date}</li>)}</ul></details>}
      </section></div>
    </div>
    </details>
    <details className="patch-research-details"><summary>Browse your current hero pool</summary>
    <HeroPool year={campaign.year} week={campaign.week} throughYear={through} report={patchReport(active, managedPatchObserver(campaign))} />
    </details>
  </>;
}
