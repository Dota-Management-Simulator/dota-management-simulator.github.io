import type { Campaign } from "./game";
import { heroById } from "./heroes";
import { heroIconFor } from "./hero-icons";
import { patchAxes, patchForSeason } from "./patches";
import type { SeasonPatch } from "./patches";
import { managedPatchObserver, patchReport } from "./patch-knowledge";
import { frontiersEnabled, milestoneForPatch, patchHeroArrivals, talentsEnabled } from "./patch-milestones";
import { PatchTrailer } from "./PatchArrival";
import { simplifiedHeroNote } from "./patch-notes";

export default function PatchNotes({ patch, campaign, onPlayer }: { patch: SeasonPatch; campaign: Campaign; onPlayer: (id: string) => void }) {
  const previous = patch.id === "2011.1" ? undefined : patchForSeason(patch.phase === 1 ? patch.year - 1 : patch.year, patch.phase === 1 ? 2 : 1);
  const report = patchReport(patch, managedPatchObserver(campaign));
  const oldReport = previous && patchReport(previous, managedPatchObserver(campaign));
  const arrivals = patchHeroArrivals(patch);
  const milestone = milestoneForPatch(patch.id);
  return <article className="panel patch-notes" aria-label="Patch notes">
    <div className="eyebrow">PATCH {patch.id} · UPDATE SUMMARY</div>
    <h2>{patch.name}</h2><p className="patch-notes-lead">{patch.description}</p>
    <p>{patch.generated ? "Fictional future balance." : `Includes ${patch.versions}.`} {previous ? `Changes from ${previous.id} are summarized below.` : "The opening rules of the campaign are summarized below."} These notes describe the simulator; exact Dota spells and items are not reproduced.</p>
    {milestone && <section className="patch-milestone-note"><h3>{milestone.version} · {milestone.title}</h3><p>{milestone.summary}</p>
      <p>Historical release: {milestone.releasedOn}. This campaign introduces it with composite {patch.id} on {patch.startsOn}; the season calendar compresses real updates.</p>
      <PatchTrailer milestone={milestone} />
    </section>}
    <section><h3>New heroes · {arrivals.length ? arrivals.length : "no additions"}</h3>
      <p>{arrivals.length ? "This opening patch adds the previous calendar year's Dota 2 releases in one batch. All are eligible for auto-drafting from this composite onward." : "The existing hero pool carries forward. Releases enter with the next season's opening composite, alongside the post-TI shuffle."}</p>
      {!!arrivals.length && <div className="patch-arrivals">{arrivals.map(hero => { const icon = heroIconFor(hero.id); return <span key={hero.id}>{icon && <img src={`${import.meta.env.BASE_URL}${icon.path}`} alt="" loading="lazy" />}<strong>{hero.name}</strong></span>; })}</div>}
    </section>
    <section><h3>Gameplay changes</h3><p>Comparisons below are your team's early read. Overlapping ranges can still hide the direction of a change.</p><ul className="patch-change-list">{patchAxes.map(axis => {
      const read = report.axes[axis.key];
      const old = oldReport?.axes[axis.key];
      const delta = old ? (read.low + read.high - old.low - old.high) / 2 : 0;
      const direction = !old ? `Opening read: ${read.low + read.high >= 100 ? axis.high.toLowerCase() : axis.low.toLowerCase()}` : Math.abs(delta) <= 3 ? "Looks similar to the previous patch" : `Early read: leans more toward ${delta > 0 ? axis.high.toLowerCase() : axis.low.toLowerCase()}`;
      return <li key={axis.key}><strong>{axis.name}</strong><span>{direction}. {axis.effect}</span><small>Current estimate {read.low}–{read.high}{old ? `; previous ${old.low}–${old.high}` : ""} / 100.</small></li>;
    })}
      <li><strong>{frontiersEnabled(patch) ? "Expanded battlefield" : "Classic battlefield"}</strong><span>{frontiersEnabled(patch) ? "40% more playable area; twelve shared neutral camps. Farming earns gold and XP but costs travel and lane pressure. Lanes and bases retain their positions." : "Three lanes and the original map boundary. Neutral farm camps arrive with New Frontiers (2023.1)."}</span></li>
      <li><strong>{talentsEnabled(patch) ? "Player talents enabled" : "Player talents not yet introduced"}</strong><span>{talentsEnabled(patch) ? "One choice at levels 10/15/20/25. Configure each player's tree in their profile; bonuses activate independently in each map." : "Talent trees unlock with The New Journey (2017.1)."}</span></li>
    </ul>
      {talentsEnabled(patch) && <div className="patch-player-links">{campaign.roster.map(id => <button key={id} className="button secondary" onClick={() => onPlayer(id)}>{campaign.players.find(p => p.id === id)?.name} · talents</button>)}</div>}
    </section>
    <section><h3>Hero changes · your simplified scouting report</h3><p>Equal-team strength estimates for discovered favorites. These are simulated balance outlooks, separate from real spell changes. Staff can discover more heroes and narrow uncertainty.</p>
      <ul className="patch-change-list">{report.heroes.map(entry => {
        const hero = heroById(entry.id)!;
        const previousRead = previous && patchReport(previous, managedPatchObserver(campaign)).heroes.find(h => h.id === hero.id);
        const evidence = patch.heroes.find(h => h.id === hero.id)?.evidence;
        const direction = !previousRead ? "New to this patch's discovered shortlist" : entry.winRate.low > previousRead.winRate.high ? "Stronger outlook" : entry.winRate.high < previousRead.winRate.low ? "Weaker outlook" : "Overlapping outlook; no clear buff or nerf established";
        return <li key={hero.id}><strong>{hero.name}</strong><span>{direction}. Estimated win rate {entry.winRate.low}–{entry.winRate.high}%{previousRead ? `, previously ${previousRead.winRate.low}–${previousRead.winRate.high}%` : ""} with equal teams.</span>
          {evidence && <small>Original Dota {evidence.version}: {simplifiedHeroNote(evidence.note)} <a href={evidence.url} target="_blank" rel="noreferrer">Source ↗</a></small>}
          <small>Simulator: generic {hero.ability === "heal" ? "healing" : hero.ability === "area" ? "area damage" : hero.ability === "stun" ? "control" : "burst damage"} archetype and overall hero strength; exact source spell changes are not reproduced.</small></li>;
      })}</ul>
    </section>
    <footer><strong>Applies to both teams.</strong> Tournaments pin their opening patch, hero pool and milestone rules. Saved results remain unchanged. Research ranges are uncertain; this summary does not reveal hidden balance coefficients.</footer>
  </article>;
}
