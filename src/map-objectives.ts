import type { ReplayFrame, ReplayUnit, Side } from "./battle";
import type { MapEra } from "./map-eras";
import { buildingPoint, geometryForEra } from "./map-geometry";

export interface MapStructure {
  id: string;
  kind: "tower" | "ancient" | "melee-barracks" | "ranged-barracks";
  team: Side;
  lane?: number;
  tier?: number;
  x: number;
  y: number;
  name: string;
  /** Only real snapshot entities have health; layout markers never invent it. */
  unit?: ReplayUnit;
}

const laneNames = ["Top", "Mid", "Bottom"];
const sideNames = ["Radiant", "Dire"];
const bases = [[90, 710], [710, 90]];
// OpenDota BuildingMap's art-relative anchors (classic and 7.33+).
// Tracked entities retain their simulation coordinates so attacks stay legible.
// https://github.com/odota/web/tree/master/src/components/Match/BuildingMap
const layout = [
  { kind: "tower", tier: 3, lane: 0, points: [[7, 68], [70, 11]], modern: [[8, 68], [70, 12.5]] },
  { kind: "tower", tier: 3, lane: 1, points: [[18, 71], [73, 24]], modern: [[18.5, 71.5], [73, 24]] },
  { kind: "tower", tier: 3, lane: 2, points: [[23, 83.5], [86, 28]], modern: [[23, 83.5], [85.5, 28]] },
  { kind: "tower", tier: 4, points: [[8, 79], [81, 13]] },
  { kind: "tower", tier: 4, points: [[12, 82], [84, 16]] },
  { kind: "ranged-barracks", lane: 0, points: [[5.5, 70.5], [74, 8]], modern: [[6.5, 70.5], [74, 10]] },
  { kind: "melee-barracks", lane: 0, points: [[9.5, 70.5], [74, 12]], modern: [[10.5, 70.5], [74, 14]] },
  { kind: "ranged-barracks", lane: 1, points: [[15, 70.5], [74.5, 19.5]], modern: [[15, 72], [74.5, 19.5]] },
  { kind: "melee-barracks", lane: 1, points: [[18, 73], [77.5, 22]], modern: [[18, 74.5], [77.5, 22]] },
  { kind: "ranged-barracks", lane: 2, points: [[20, 80.5], [84.5, 24]], modern: [[20, 80.5], [84, 24]] },
  { kind: "melee-barracks", lane: 2, points: [[20, 84.5], [88.5, 24]], modern: [[20, 84.5], [88, 24]] },
] satisfies { kind: MapStructure["kind"]; tier?: number; lane?: number; points: number[][]; modern?: number[][] }[];

function towerLane(unit: ReplayUnit): number {
  // The engine's two outer towers sit on the three shared lane paths.
  const distances = [Math.min(Math.abs(unit.x - 90), Math.abs(unit.y - 90)),
    Math.abs(unit.x + unit.y - 800) / Math.SQRT2,
    Math.min(Math.abs(unit.x - 710), Math.abs(unit.y - 710))];
  return distances.indexOf(Math.min(...distances));
}

/** Presentation only, for live frames and old replays alike. */
export function mapStructures(frame: ReplayFrame, era?: MapEra): MapStructure[] {
  const result: MapStructure[] = [];
  for (const team of [0, 1] as const) {
    const ancient = frame.units.find(u => u.team === team && u.kind === "base");
    if (ancient) result.push({ id: `ancient-${team}`, kind: "ancient", team,
      x: ancient.x, y: ancient.y, name: `${sideNames[team]} Ancient`, unit: ancient });
    for (let lane = 0; lane < 3; lane++) {
      const towers = frame.units.filter(u => u.team === team && u.kind === "tower" && (u.lane ?? towerLane(u)) === lane)
        .sort((a, b) => Math.hypot(b.x - bases[team][0], b.y - bases[team][1]) - Math.hypot(a.x - bases[team][0], a.y - bases[team][1]));
      towers.forEach((unit, i) => result.push({ id: `tower-${unit.id}`, kind: "tower", team, lane, tier: unit.tier ?? i + 1,
        x: unit.x, y: unit.y, name: `${sideNames[team]} ${laneNames[lane]} Tier ${unit.tier ?? i + 1} tower`, unit }));
    }
    layout.forEach((entry, i) => {
      const [px, py] = (era?.frontier && entry.modern ? entry.modern : entry.points)[team];
      const point = era && entry.kind === "tower" && entry.tier === 3
        ? geometryForEra(era).towers[team][entry.lane!][2]
        : buildingPoint(era ?? { box: [23.5, -12, 770, 830] }, [px,py]);
      const label = entry.kind === "tower" ? `Tier ${entry.tier} tower`
        : entry.kind === "melee-barracks" ? "Melee barracks" : "Ranged barracks";
      result.push({ id: `layout-${team}-${i}`, kind: entry.kind, team, lane: entry.lane, tier: entry.tier,
        x: point[0], y: point[1],
        name: `${sideNames[team]} ${entry.lane == null ? "" : `${laneNames[entry.lane]} `}${label}` });
    });
  }
  return result;
}

export function structureIcon(structure: MapStructure): string {
  const side = structure.team ? "badguys" : "goodguys";
  const kind = structure.kind === "ancient" ? "fort" : structure.kind === "tower" ? "tower" : "rax";
  return `dota-maps/${side}_${kind}${structure.lane === 1 ? "_angle" : ""}.png`;
}

export interface TormentorSite {
  id: string;
  x: number;
  y: number;
  side: Side;
  /** Expected site, not a claim that a simulated Tormentor is alive. */
  current: boolean;
  spawnAt: number;
}

/** Composite gates follow the versions included in each patch, not wall time. */
export function tormentorSites(patchId: string | undefined, clock: number): TormentorSite[] {
  if (!patchId || Number(patchId) < 2023.1) return [];
  if (Number(patchId) < 2025.1) return [
    { id: "radiant-offlane", x: -25, y: 510, side: 0, current: clock >= 1200, spawnAt: 1200 },
    { id: "dire-offlane", x: 825, y: 290, side: 1, current: clock >= 1200, spawnAt: 1200 },
  ];
  const spawnAt = Number(patchId) < 2025.2 ? 900 : 1200;
  const at = Math.max(spawnAt, clock);
  const night = Math.floor(at / 300) % 2 === 1;
  // Match the displayed 7.38/7.40 terrain, rather than borrowing positions
  // from a later map merely because its notes are in the same composite.
  const side: Side = night ? 0 : 1;
  const point = side ? [-25,-25] : [825,825];
  return [{ id: "rotating", x: point[0], y: point[1], side, current: clock >= spawnAt, spawnAt }];
}
