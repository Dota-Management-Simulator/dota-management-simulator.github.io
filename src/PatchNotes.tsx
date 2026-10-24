import type { Campaign } from "./game";
import { heroById } from "./heroes";
import { heroIconFor } from "./hero-icons";
import { patchAxes, patchForSeason } from "./patches";
import type { SeasonPatch } from "./patches";
import { managedPatchObserver, patchReport } from "./patch-knowledge";
import { frontiersEnabled, milestoneForPatch, patchHeroArrivals, talentsEnabled } from "./patch-milestones";
import { PatchMedia } from "./PatchArrival";
import { simplifiedHeroNote } from "./patch-notes";
import { captainsRulesFor } from "./captains-mode";
import RangeBars from "./RangeBars";
import { mapChangeForPatch, mapEraForPatch } from "./map-eras";

export default function PatchNotes({ patch, campaign, onPlayer }: { patch: SeasonPatch; campaign: Campaign; onPlayer: (id: string) => void }) {
  const previous = patch.id === "2011.1" ? undefined : patchForSeason(patch.phase === 1 ? patch.year - 1 : patch.year, patch.phase === 1 ? 2 : 1);
  const report = patchReport(patch, managedPatchObserver(campaign));
  const oldReport = previous && patchReport(previous, managedPatchObserver(campaign));
  const arrivals = patchHeroArrivals(patch);
  const milestone = milestoneForPatch(patch.id);
  const map = mapEraForPatch(patch), newMap = mapChangeForPatch(patch);
  return <article className="panel patch-notes" aria-label="Patch notes">
    <div className="eyebrow">PATCH {patch.id} · UPDATE SUMMARY</div>
    <h2>{patch.name}</h2><p className="patch-notes-lead">{patch.description}</p>
    <p>{patch.generated ? "Fictional future balance." : `Includes ${patch.versions}.`} {previous ? `Changes from ${previous.id} are summarized below.` : "The opening rules of the campaign are summarized below."} These notes describe the simulator; exact Dota spells and items are not reproduced.</p>
    {milestone && <section className="patch-milestone-note"><h3>{milestone.version} · {milestone.title}</h3><p>{milestone.summary}</p>
      <p>Historical release: {milestone.releasedOn}. This campaign introduces it with composite {patch.id} on {patch.startsOn}; the season calendar compresses real updates.</p>
    </section>}
    <PatchMedia key={patch.id} patch={patch} />
    <section><h3>Captain’s Mode · {captainsRulesFor(patch).version}</h3>
      <p>{previous&&captainsRulesFor(previous).id!==captainsRulesFor(patch).id?"Draft rules change with this composite. ":"Current draft rules: "}{captainsRulesFor(patch).summary}</p>
      <p>Choose before each map: follow your saved preparation through a fast pick/ban sequence, or draft for your team. Both coaches use their own uncertain patch report. Real changes within a composite arrive together with that composite; pick/ban countdown timers are not simulated.</p>
      <a className="text-link" href={captainsRulesFor(patch).source} target="_blank" rel="noreferrer">Draft rules source ↗</a>
    </section>
    <section className="patch-map-note"><h3>Map · {newMap ? `new in ${map.version}` : `${map.version} map carries forward`}</h3>
      <div className="patch-map-body"><img src={`${import.meta.env.BASE_URL}${map.image}`} alt={`The ${map.version} Dota map`} loading="lazy" width="160" height="160" />
        <div><strong>{map.title}</strong>
          {newMap ? <ul>{map.changes.map(change => <li key={change}>{change}</li>)}</ul> : <p>No map changes in this composite. Matches still use the {map.version} layout from composite {map.firstPatch}.</p>}
          <p>Heroes follow this map's lanes, river and jungle trails instead of walking through trees. Roshan uses this era's {map.roshan.night ? "two pits" : "pit"}. The path network is a simplified approximation of the real terrain.</p>
          <a className="text-link" href={map.source} target="_blank" rel="noreferrer">Patch {map.version} notes ↗</a></div></div>
    </section>
    <section><h3>New heroes · {arrivals.length ? arrivals.length : "no additions"}</h3>
      <p>{arrivals.length ? "This opening patch adds the previous calendar year's Dota 2 releases in one batch. All are eligible for auto-drafting from this composite onward." : "The existing hero pool carries forward. Releases enter with the next season's opening composite, alongside the post-TI shuffle."}</p>
      {!!arrivals.length && <div className="patch-arrivals">{arrivals.map(hero => { const icon = heroIconFor(hero.id); return <span key={hero.id}>{icon && <img src={`${import.meta.env.BASE_URL}${icon.path}`} alt="" loading="lazy" />}<strong>{hero.name}</strong></span>; })}</div>}
    </section>
    <section><h3>Gameplay changes</h3><p>Comparisons below are your team's early read. Overlapping ranges can still hide the direction of a change.</p><ul className="patch-change-list">{patchAxes.map(axis => {
      const read = report.axes[axis.key];
      const old = oldReport?.axes[axis.key];
      const delta = old ? (read.low + read.high - old.low - old.high) / 2 : 0;
      const direction = !old ? `Opening read: ${read.low + read.high >= 100 ? axis.high.toLowerCase() : axis.low.toLowerCase()}` : Math.abs(delta) <= 3 ? "Looks similar to the previous patch" : `Early read: leans more toward ${delta > 0 ? axis.high.toLowerCase() : axis.low.toLowerCase()}`;
      return <li key={axis.key}><strong>{axis.name}</strong><span>{direction}. {axis.effect}</span><div className="patch-change-ranges"><RangeBars label={axis.name} current={read} previous={old} lowLabel={`0 · ${axis.low}`} highLabel={`${axis.high} · 100`} /></div></li>;
    })}
      <li><strong>{frontiersEnabled(patch) ? "Expanded battlefield" : "Classic battlefield"}</strong><span>{frontiersEnabled(patch) ? "40% more playable area; twelve shared neutral camps. Farming earns gold and XP but costs travel and lane pressure. Lanes and bases retain their positions." : "Three lanes and the original map boundary. Neutral farm camps arrive with New Frontiers (2023.1)."}</span></li>
      <li><strong>{talentsEnabled(patch) ? "Player talents enabled" : "Player talents not yet introduced"}</strong><span>{talentsEnabled(patch) ? "One choice at levels 10/15/20/25. Configure each player's tree in their profile; bonuses activate independently in each map." : "Talent trees unlock with The New Journey (2017.1)."}</span></li>
    </ul>
      {talentsEnabled(patch) && <div className="patch-player-links">{campaign.roster.map(id => <button key={id} className="button secondary" onClick={() => onPlayer(id)}>{campaign.players.find(p => p.id === id)?.name} · talents</button>)}</div>}
    </section>
    <section><h3>Hero changes · your simplified scouting report</h3><p>Equal-team strength estimates for discovered favorites. These are simulated balance outlooks, separate from real spell changes. Staff can discover more heroes and narrow uncertainty.</p>
      <ul className="patch-change-list">{report.heroes.map(entry => {
        const hero = heroById(entry.id)!;
        const previousRead = oldReport?.heroes.find(h => h.id === hero.id);
        const evidence = patch.heroes.find(h => h.id === hero.id)?.evidence;
        const direction = !previousRead ? "New to this patch's discovered shortlist" : entry.winRate.low > previousRead.winRate.high ? "Stronger outlook" : entry.winRate.high < previousRead.winRate.low ? "Weaker outlook" : "Overlapping outlook; no clear buff or nerf established";
        return <li key={hero.id}><strong>{hero.name}</strong><span>{direction}. Estimated win rate {entry.winRate.low}–{entry.winRate.high}%{previousRead ? `, previously ${previousRead.winRate.low}–${previousRead.winRate.high}%` : ""} with equal teams.</span>
          <div className="patch-change-ranges"><RangeBars label={`${hero.name} estimated win rate`} current={entry.winRate} previous={previousRead?.winRate} unit="%" lowLabel="0%" highLabel="100%" /></div>
          {evidence && <small>Original Dota {evidence.version}: {simplifiedHeroNote(evidence.note)} <a href={evidence.url} target="_blank" rel="noreferrer">Source ↗</a></small>}
          <small>Simulator: generic {hero.ability === "heal" ? "healing" : hero.ability === "area" ? "area damage" : hero.ability === "stun" ? "control" : "burst damage"} archetype and overall hero strength; exact source spell changes are not reproduced.</small></li>;
      })}</ul>
    </section>
    <footer><strong>Applies to both teams.</strong> Tournaments pin their opening patch, hero pool and milestone rules. Saved results remain unchanged. Research ranges are uncertain; this summary does not reveal hidden balance coefficients.</footer>
  </article>;
}
