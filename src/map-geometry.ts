import type { MapEra } from "./map-eras";

export type MapPoint = [number, number];
/** Coordinates are percentages of the actual image, never of a guessed lane square.
 * Building anchors: odota/web BuildingMap/buildingData{,733}.ts. Routes, river
 * centres and camps are traced against each bundled Valve overview. */
export function artPoint(era: Pick<MapEra, "box">, [x, y]: MapPoint): MapPoint {
  return [era.box[0] + x * era.box[2] / 100, era.box[1] + y * era.box[3] / 100];
}

/** OpenDota anchors are CSS icon origins. These offsets were checked against
 * the lane strips in the bundled overviews; SVG markers use their centre. */
export function buildingPoint(era: Pick<MapEra, "box">, [x,y]: MapPoint): MapPoint {
  return artPoint(era,[x+2.5,y+3.5]);
}

export interface MapGeometry {
  bases: MapPoint[];
  lanes: MapPoint[][];
  /** side -> lane -> tier 1, 2, 3 */
  towers: MapPoint[][][];
  camps: MapPoint[];
  river: MapPoint[];
  trails: MapPoint[][];
}

const classicTowers: MapPoint[][][] = [
  [[[8,35],[8,51],[7,68]], [[38,54],[27,63],[18,71]], [[78,83],[46,85],[23,83.5]]],
  [[[15,10],[44,10],[70,11]], [[53,44],[63,34],[73,24]], [[86,60],[86,45],[86,28]]],
];
const modernTowers: MapPoint[][][] = [
  [[[9.5,36],[9,53],[8,68]], [[38,54],[27.5,63],[18.5,71.5]], [[75,82],[46,85],[23,83.5]]],
  [[[18,12],[49,11],[70,12.5]], [[51,43.5],[64,33],[73,24]], [[84,60],[85,45],[85.5,28]]],
];

// River and junctions differ even when the outer lanes have not moved.
const rivers: Record<string, MapPoint[]> = {
  pre682: [[9,32],[20,32],[30,33],[39,43],[44,53],[54,58],[64,63],[77,68],[91,68]],
  "682": [[9,32],[25,32],[36,37],[42,47],[50,55],[63,60],[75,65],[91,68]],
  "686": [[9,32],[25,32],[36,37],[42,47],[50,55],[63,60],[75,65],[91,68]],
  "700": [[9,32],[25,33],[36,38],[42,49],[50,55],[64,61],[77,67],[91,68]],
  "707": [[9,32],[25,33],[36,38],[42,49],[50,55],[64,61],[77,67],[91,68]],
  "720": [[9,32],[24,32],[31,28],[37,36],[42,48],[50,55],[64,61],[77,67],[91,68]],
  "723": [[9,32],[25,34],[34,37],[42,48],[50,55],[63,60],[74,65],[91,68]],
  "732": [[9,32],[25,34],[34,37],[42,48],[50,55],[63,60],[74,65],[91,68]],
  "733": [[9,34],[23,36],[33,44],[44,52],[52,58],[64,62],[77,68],[92,69]],
  "738": [[8,32],[20,32],[29,36],[38,44],[47,52],[55,57],[66,65],[77,68],[92,69]],
  "740": [[8,32],[20,32],[29,36],[38,44],[47,52],[55,57],[66,65],[77,68],[92,69]],
};
const campSites: Record<string, MapPoint[]> = {
  "733": [[23,54],[41,62],[57,78],[35,75],[70,79],[19,43], [76,49],[60,39],[45,22],[65,23],[31,20],[79,41]],
  "738": [[23,55],[40,73],[55,76],[20,80],[69,82],[35,62], [77,45],[55,26],[40,23],[76,21],[31,19],[66,38]],
  "740": [[23,55],[40,73],[55,76],[20,80],[69,82],[35,62], [77,45],[55,26],[40,23],[76,21],[31,19],[66,38]],
};
// Explicit open ramps/junctions, rather than a mirrored square jungle network.
const earlyTrails: MapPoint[][] = [
  [[8,52],[16,56],[24,59],[30,55],[34,49],[38,44]],
  [[8,37],[19,39],[26,40],[32,45],[34,49]],
  [[24,59],[29,65],[35,71],[43,74],[52,74],[62,76],[72,76],[84,76]],
  [[35,71],[40,63],[46,59],[52,62],[60,65],[67,70],[72,76]],
  [[44,83],[43,74]], [[65,83],[62,76]],
  [[16,11],[19,20],[27,23],[34,23],[40,20],[50,19],[59,24],[64,29],[64,34]],
  [[19,20],[19,28],[25,32]], [[34,23],[34,29],[36,34]],
  [[50,19],[51,31],[48,38],[48,44]],
  [[64,34],[70,40],[79,43],[86,45]],
  [[53,49],[62,45],[70,45],[79,51],[79,59],[86,60]],
];
const lateTrails: MapPoint[][] = [
  [[9,53],[16,56],[23,55],[28,60],[32,66],[38,69],[44,69],[50,65],[55,62],[62,63],[68,70],[76,73],[84,74]],
  [[9,37],[20,39],[24,44],[23,55]], [[28,60],[34,55],[38,54]],
  [[32,66],[35,75],[46,77],[57,78],[70,79],[75,82]],
  [[44,69],[46,77]], [[57,78],[62,71],[62,63]],
  [[18,12],[20,21],[29,24],[36,23],[45,22],[54,20],[62,24],[64,33]],
  [[20,21],[19,30],[23,36]], [[36,23],[34,31],[33,38]],
  [[54,20],[55,30],[51,43.5]], [[64,33],[66,38],[76,39],[84,45]],
  [[55,51],[64,48],[76,49],[81,56],[84,60]], [[76,39],[76,49]],
];

const cache = new Map<string, MapGeometry>();
export function geometryForEra(era: MapEra): MapGeometry {
  const cached = cache.get(era.id);
  if (cached) return cached;
  const convert = (p: MapPoint) => artPoint(era, p);
  const towers = (era.frontier ? modernTowers : classicTowers).map(side => side.map(lane => lane.map(p=>buildingPoint(era,p))));
  // New Frontiers pulls the outer safe-lane bends away from the jungles.
  if (era.frontier) {
    towers[0][2][0]=convert([77.5,89]);
    towers[1][2][0]=convert([91,63.5]);
    towers[1][2][1]=convert([91,48.5]);
  }
  const bases = ([[7,85],[86,10.5]] as MapPoint[]).map(convert);
  const t = towers[0], d = towers[1];
  const lanes = [
    [bases[0],t[0][2],t[0][1],t[0][0],convert([12,25]),convert([14,16]),d[0][0],d[0][1],d[0][2],bases[1]],
    [bases[0],t[1][2],t[1][1],t[1][0],convert(era.id === "733" ? [49,53] : [48,52]),d[1][0],d[1][1],d[1][2],bases[1]],
    [bases[0],t[2][2],t[2][1],t[2][0],convert([87,84]),convert([91,71]),d[2][0],d[2][1],d[2][2],bases[1]],
  ];
  const river = rivers[era.id].map(convert);
  const trails = (era.frontier ? lateTrails : earlyTrails).map(line => line.map(convert));
  if (era.frontier) {
    // The source overviews crop the expansion. Connect its correctly placed
    // corner pits to the visible lane exits without stretching the centre.
    trails.push([convert([10,25]),[-35,170],[-35,-35],[170,-35],convert([18,12])],
      [convert([84,78]),[835,630],[835,835],[630,835],convert([75,82])],
      [convert([9,53]),[-35,480]], [convert([84,45]),[835,320]]);
  }
  for (const pit of [era.roshan.day, era.roshan.night]) if (pit) {
    const junctions = [...river, ...trails.flat()];
    const nearest = junctions.reduce((a,b) => Math.hypot(a[0]-pit[0],a[1]-pit[1]) < Math.hypot(b[0]-pit[0],b[1]-pit[1]) ? a : b);
    trails.push([nearest,pit]);
  }
  const centralCamps = campSites[era.id] ?? [];
  const camps = era.frontier ? [
    ...[centralCamps[0],centralCamps[1],centralCamps[2],centralCamps[6],centralCamps[7],centralCamps[8]].map(convert),
    ...([[-35,480],[-35,220],[290,-35],[835,320],[835,580],[510,835]] as MapPoint[]),
  ] : [];
  for (const camp of camps) {
    const nearest = trails.flat().reduce((a,b) => Math.hypot(a[0]-camp[0],a[1]-camp[1]) < Math.hypot(b[0]-camp[0],b[1]-camp[1]) ? a : b);
    trails.push([nearest,camp]);
  }
  const result = { bases, towers, lanes, camps, river, trails };
  cache.set(era.id,result);
  return result;
}
