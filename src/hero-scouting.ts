import type { Hero } from "./heroes";
import type { SeasonPatch } from "./patches";
import { heroKnowledgeEstimate, patchReport } from "./patch-knowledge";
import type { PatchObserver } from "./patch-knowledge";

/** UI-only general observations. These never enter drafting or combat inputs. */
export function heroScoutReport(patch: SeasonPatch, observer: PatchObserver, heroes: Hero[]) {
  const known = patchReport(patch, observer).heroes;
  return heroes.map(hero => {
    const scouted = known.find(entry => entry.id === hero.id);
    return { hero, winRate: scouted?.winRate ?? heroKnowledgeEstimate(patch, observer, hero.id), scouted: !!scouted };
  });
}
