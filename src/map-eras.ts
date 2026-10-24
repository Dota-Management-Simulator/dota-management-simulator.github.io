import type { SeasonPatch } from "./patches";

type Point = [number, number];
/** Valve map art as published by OpenDota (odota/web, public/assets/images/dota2/map). */
export interface MapEra {
  id: string;
  version: string;
  title: string;
  /** First campaign composite that uses this map. */
  firstPatch: string;
  image: string;
  /** Where the art sits in battle coordinates so its lanes meet the engine's lanes. */
  box: [x: number, y: number, width: number, height: number];
  /** One pit, or a day pit and a night pit. */
  roshan: { day: Point; night?: Point; cycleFrom?: number };
  river: Point[];
  trails: Point[][];
  frontier: boolean;
  changes: string[];
  source: string;
}

const OLD_BOX: MapEra["box"] = [23.5, -12, 770, 830];
const NEW_BOX: MapEra["box"] = [59, 62, 681, 681];
const liquipedia = (version: string) => `https://liquipedia.net/dota2/Version_${version}`;

// Shared jungle routes. Rivers and pits differ per era; these follow the
// open ground that every pre-7.33 map keeps between the lanes.
const radiantTrails: Point[][] = [
  [[90, 330], [160, 340], [230, 330], [270, 250]],
  [[90, 500], [170, 500], [250, 480], [300, 430], [340, 330]],
  [[260, 540], [350, 540], [420, 520], [470, 520], [530, 550], [600, 560], [680, 580], [710, 580]],
  [[300, 710], [330, 650], [400, 630], [470, 620], [540, 640], [600, 660], [660, 650], [710, 640]],
  [[420, 520], [400, 630]],
  [[530, 550], [540, 640]],
  [[460, 455], [470, 520]],
];
const direTrails: Point[][] = trailsMirror(radiantTrails);
function trailsMirror(trails: Point[][]): Point[][] {
  return trails.map(t => t.map(([x, y]): Point => [800 - x, 800 - y]));
}
// Outer land from New Frontiers: a ring outside the lanes, joined to each lane.
const frontierTrails: Point[][] = [
  [[-35, -35], [835, -35], [835, 835], [-35, 835], [-35, -35]],
  [[-35, -35], [90, 90]], [[835, 835], [710, 710]],
  [[-35, 220], [90, 220]], [[-35, 480], [90, 480]], [[835, 580], [710, 580]], [[835, 320], [710, 320]],
  [[290, 835], [290, 710]], [[510, 835], [510, 710]], [[510, -35], [510, 90]], [[290, -35], [290, 90]],
];

const classicRiver: Point[] = [[90, 258], [180, 252], [270, 240], [300, 285], [350, 350], [400, 405], [465, 458], [535, 495], [610, 532], [665, 546], [710, 546]];
const journeyRiver: Point[] = [[90, 252], [180, 256], [250, 272], [300, 320], [350, 368], [400, 405], [460, 450], [530, 490], [600, 530], [660, 550], [710, 548]];
const reworkRiver: Point[] = [[90, 240], [170, 236], [240, 242], [272, 292], [330, 335], [365, 372], [400, 408], [460, 460], [520, 496], [585, 522], [625, 542], [710, 552]];
const frontiersRiver: Point[] = [[90, 276], [200, 290], [270, 330], [340, 372], [400, 420], [450, 452], [520, 480], [600, 500], [710, 510]];
const watersRiver: Point[] = [[90, 290], [180, 300], [240, 275], [265, 295], [300, 332], [360, 390], [420, 450], [480, 490], [530, 505], [560, 512], [640, 502], [710, 505]];

export const mapEras: MapEra[] = [
  { id: "pre682", version: "6.70–6.81", title: "The classic map", firstPatch: "2011.1", image: "dota-maps/detailed_pre682.webp", box: OLD_BOX,
    roshan: { day: [590, 505] }, river: classicRiver, trails: [...radiantTrails, ...direTrails], frontier: false,
    changes: ["The DotA layout: three lanes, one river and Roshan's pit on the Dire side of the bottom river."], source: liquipedia("6.81") },
  { id: "682", version: "6.82", title: "Jungles reshaped", firstPatch: "2015.1", image: "dota-maps/detailed_682.webp", box: OLD_BOX,
    roshan: { day: [590, 505] }, river: classicRiver, trails: [...radiantTrails, ...direTrails], frontier: false,
    changes: ["Terrain update: jungle paths, cliffs and camp areas are redrawn on both sides.", "Roshan stays in the bottom river pit."], source: liquipedia("6.82") },
  { id: "686", version: "6.86", title: "Bounty runes", firstPatch: "2016.1", image: "dota-maps/detailed_686.webp", box: OLD_BOX,
    roshan: { day: [590, 505] }, river: classicRiver, trails: [...radiantTrails, ...direTrails], frontier: false,
    changes: ["Bounty Runes appear in the jungles.", "Further jungle and side-lane terrain adjustments."], source: liquipedia("6.86") },
  { id: "700", version: "7.00", title: "The New Journey map", firstPatch: "2017.1", image: "dota-maps/detailed_700.webp", box: OLD_BOX,
    roshan: { day: [282, 298] }, river: journeyRiver, trails: [...radiantTrails, ...direTrails], frontier: false,
    changes: ["Roshan's pit moves to the top river.", "Shrines are added to each jungle.", "Ancient camps double and the high-ground approaches change."], source: liquipedia("7.00") },
  { id: "707", version: "7.07", title: "Dueling Fates terrain", firstPatch: "2018.1", image: "dota-maps/detailed_707.webp", box: OLD_BOX,
    roshan: { day: [282, 298] }, river: journeyRiver, trails: [...radiantTrails, ...direTrails], frontier: false,
    changes: ["Jungle terrain and camp positions are adjusted around the top-river Roshan pit."], source: liquipedia("7.07") },
  { id: "720", version: "7.20", title: "The 7.20 map rework", firstPatch: "2019.1", image: "dota-maps/detailed_720.webp", box: OLD_BOX,
    roshan: { day: [293, 297] }, river: reworkRiver, trails: [...radiantTrails, ...direTrails], frontier: false,
    changes: ["Towers, runes, lanes, both primary and secondary jungles and the Roshan pit are reworked.", "Radiant and Dire become less symmetrical."], source: liquipedia("7.20") },
  { id: "723", version: "7.23", title: "Outlanders", firstPatch: "2020.1", image: "dota-maps/detailed_723.webp", box: OLD_BOX,
    roshan: { day: [293, 297] }, river: reworkRiver, trails: [...radiantTrails, ...direTrails], frontier: false,
    changes: ["Outposts are added to the map.", "Jungle terrain is redrawn on both sides."], source: liquipedia("7.23") },
  { id: "732", version: "7.32", title: "Late classic boundary", firstPatch: "2022.2", image: "dota-maps/detailed_732.webp", box: OLD_BOX,
    roshan: { day: [293, 297] }, river: reworkRiver, trails: [...radiantTrails, ...direTrails], frontier: false,
    changes: ["Jungle camp and terrain adjustments; the last map before New Frontiers."], source: liquipedia("7.32") },
  { id: "733", version: "7.33", title: "New Frontiers", firstPatch: "2023.1", image: "dota-maps/detailed_733.webp", box: NEW_BOX,
    roshan: { day: [790, 790], night: [10, 10] }, river: frontiersRiver, trails: [...radiantTrails, ...direTrails, ...frontierTrails], frontier: true,
    changes: ["The map grows about 40% on all four edges; lane distances stay the same.", "Roshan leaves the river for two corner pits: bottom-right by day, top-left by night.", "Twin Gates, Tormentors, Lotus Pools and Wisdom Runes arrive."], source: liquipedia("7.33") },
  { id: "738", version: "7.38", title: "Wandering Waters", firstPatch: "2025.1", image: "dota-maps/detailed_738.webp", box: NEW_BOX,
    roshan: { day: [530, 505], night: [265, 295], cycleFrom: 900 }, river: watersRiver, trails: [...radiantTrails, ...direTrails, ...frontierTrails], frontier: true,
    changes: ["Roshan returns to the river with two pits by the Power Rune spots. He starts in the bottom pit and, from 15:00, walks to the top pit at night and the bottom pit by day.", "New streams in the jungles carry heroes toward their safe lane.", "Tormentors move and Wisdom Runes become shrines."], source: liquipedia("7.38") },
  { id: "740", version: "7.40", title: "Narrow jungles", firstPatch: "2026.1", image: "dota-maps/detailed_740.webp", box: NEW_BOX,
    roshan: { day: [530, 505], night: [265, 295], cycleFrom: 900 }, river: watersRiver, trails: [...radiantTrails, ...direTrails, ...frontierTrails], frontier: true,
    changes: ["Wisdom Rune areas sink into low ground.", "Extra trees narrow side-lane and jungle paths.", "Each base gains a Defender's Gate."], source: liquipedia("7.40") },
];

const patchOrder = (id: string) => { const [y, p] = id.split(".").map(Number); return y * 10 + p; };
export function mapEraForPatch(patch?: Pick<SeasonPatch, "id">): MapEra {
  if (!patch) return mapEras[0];
  const at = patchOrder(patch.id);
  return [...mapEras].reverse().find(era => patchOrder(era.firstPatch) <= at) ?? mapEras[0];
}
/** The map that arrives with this composite, if it is new. */
export function mapChangeForPatch(patch: Pick<SeasonPatch, "id">): MapEra | undefined {
  const era = mapEraForPatch(patch);
  return era.firstPatch === patch.id ? era : undefined;
}
/** Roshan's pit at a match clock; pits switch every five minutes (day first). */
export function roshanPit(era: MapEra, clock: number): Point {
  const night = era.roshan.night;
  if (!night || clock < (era.roshan.cycleFrom ?? 0)) return era.roshan.day;
  return Math.floor(clock / 300) % 2 ? night : era.roshan.day;
}
