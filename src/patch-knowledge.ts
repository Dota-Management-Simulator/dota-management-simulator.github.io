import type { Campaign } from "./game";
import { campaignPatch, patchAxes } from "./patches";
import type { PatchAxis, SeasonPatch } from "./patches";
import { staffCatalog } from "./staff";
import { heroTargetWinRate } from "./hero-balance";

export interface PatchObserver { teamKey: string; staffIds: string[]; heroSamples?: Record<string, number>; researchPatchId?: string }
export interface Estimate { low: number; high: number; width: number }
export interface PatchReport {
  patchId: string;
  axes: Record<PatchAxis, Estimate & { staffNames: string[] }>;
  heroes: { id: string; winRate: Estimate }[];
  totalHeroes: number;
}
const hash = (text: string) => [...text].reduce((n, ch) => Math.imul(n ^ ch.charCodeAt(0), 16777619) >>> 0, 2166136261);
const BASE_AXIS_SPREAD = 35;
// Mix the full seed before drawing an offset so similar team/axis IDs do not
// produce correlated placements within their ranges.
function rangeHash(seed: string): number {
  let n = hash(seed);
  n = Math.imul(n ^ (n >>> 16), 0x85ebca6b);
  n = Math.imul(n ^ (n >>> 13), 0xc2b2ae35);
  return (n ^ (n >>> 16)) >>> 0;
}

export function managedPatchObserver(c: Campaign, patchId = campaignPatch(c).id): PatchObserver {
  return { teamKey: c.world?.managedTeamId ?? c.settings.historicalTeamId ?? c.settings.team, staffIds: c.staffIds,
    heroSamples: c.scrims?.research[patchId], researchPatchId: patchId };
}

/** A stable broad read, then incremental debriefs. Never expose an exact target. */
export function heroKnowledgeEstimate(patch: SeasonPatch, observer: PatchObserver, id: string, scouted = false): Estimate {
  const truth = heroTargetWinRate(patch, id);
  const seed = `${observer.teamKey}:${patch.id}`;
  const narrow = estimate(truth, 4, `${seed}:hero:${id}`, 4);
  const minLow = Math.max(0, Math.ceil(truth + 4 - 16));
  const maxLow = Math.min(84, Math.floor(truth - 4));
  let n = hash(`${seed}:catalog:${id}`);
  n = Math.imul(n ^ (n >>> 16), 0x85ebca6b);
  let low = minLow + ((n ^ (n >>> 13)) >>> 0) % (maxLow - minLow + 1), high = low + 16;
  const samples = Math.max(0, observer.researchPatchId && observer.researchPatchId !== patch.id ? 0 : observer.heroSamples?.[id] ?? 0);
  // Broad reports converge towards the existing specialist read over 24 maps.
  const width = Math.max(4, 16 - Math.floor(samples / 2));
  for (let size = 16; size > width; size--) {
    if (low < narrow.low && (high <= narrow.high || rangeHash(`${seed}:learn:${id}:${size}`) % 2 === 0)) low++;
    else high--;
  }
  return scouted ? narrow : { low, high, width: high - low };
}

/** Each smaller interval is nested inside the previous one, always retaining
 * truth. The midpoint need not equal the truth. Reloads and hires cannot
 * reroll a report or intersect independent intervals to expose exact values. */
function estimate(value: number, width: number, seed: string, base = BASE_AXIS_SPREAD): Estimate {
  // Sample every legal integer lower bound, including truth at either endpoint.
  // Sampling before clamping would overweight ranges against 0 or 100.
  const minLow = Math.max(0, Math.ceil(value - base));
  const maxLow = Math.min(Math.floor(value), 100 - base);
  let low = minLow + Math.floor(rangeHash(seed) / 0x100000000 * (maxLow - minLow + 1));
  let high = low + base;
  for (let size = base; size > width; size--) {
    const trimLow = low + 1 <= value && (high - 1 < value || rangeHash(`${seed}:${size}`) % 2 === 0);
    if (trimLow) low++; else high--;
  }
  return { low, high, width: high - low };
}

export function patchReport(patch: SeasonPatch, observer: PatchObserver): PatchReport {
  const staff = staffCatalog.filter(s => observer.staffIds.includes(s.id));
  const seed = `${observer.teamKey}:${patch.id}`;
  const axes = Object.fromEntries(patchAxes.map(({ key }) => {
    const specialists = staff.filter(s => s.coverage[key] != null);
    const width = Math.min(BASE_AXIS_SPREAD, ...specialists.map(s => s.coverage[key]!));
    return [key, { ...estimate(patch.axes[key], width, `${seed}:${key}`),
      staffNames: specialists.filter(s => s.coverage[key] === width).map(s => s.name) }];
  })) as PatchReport["axes"];
  const count = Math.min(patch.heroes.length, 2 + staff.reduce((n, s) => n + s.extraHeroes, 0));
  const heroes = [...patch.heroes].sort((a, b) => hash(`${seed}:${a.id}`) - hash(`${seed}:${b.id}`) || a.id.localeCompare(b.id))
    .slice(0, count).map(h => ({ id: h.id, winRate: heroKnowledgeEstimate(patch, observer, h.id, true) }));
  // Only heroes actually seen in at least two practice maps enter coach decisions.
  for (const [id, samples] of Object.entries(observer.researchPatchId && observer.researchPatchId !== patch.id ? {} : observer.heroSamples ?? {})) if (samples >= 2 && !heroes.some(h => h.id === id)) heroes.push({ id, winRate: heroKnowledgeEstimate(patch, observer, id) });
  return { patchId: patch.id, axes, heroes, totalHeroes: new Set([...patch.heroes.map(h => h.id), ...heroes.map(h => h.id)]).size };
}

/** A decision model only. Combat must keep using the original patch. */
export function perceivedPatch(patch: SeasonPatch, observer: PatchObserver): SeasonPatch {
  const report = patchReport(patch, observer);
  return { ...patch, axes: Object.fromEntries(patchAxes.map(({ key }) => [key, (report.axes[key].low + report.axes[key].high) / 2])) as SeasonPatch["axes"],
    heroBalance: report.heroes.map(h => ({ id: h.id, targetWinRate: (h.winRate.low + h.winRate.high) / 2, priority: Math.max(0, (h.winRate.low + h.winRate.high) / 2 - 50), basis: "team-estimate" })),
    heroes: report.heroes.map(h => ({ id: h.id, bonus: Math.max(0, (h.winRate.low + h.winRate.high) / 2 - 50), evidence: null })) };
}
