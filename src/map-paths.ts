import { geometryForEra } from "./map-geometry";
import { mapEras } from "./map-eras";
import type { MapEra } from "./map-eras";

type Point = [number, number];
const CELL = 10, ORIGIN = -90, SIZE = 98; // covers -90..890, the frontier bounds plus a margin
const LANE_WIDTH = 30, TRAIL_WIDTH = 17, SPACING = 70;

/** Walkable corridors and shortest routes for one map era. Heroes walk
 * straight when the line between two points stays on open ground; otherwise
 * they follow trail nodes. Deterministic and RNG-free. */
export class MapPaths {
  readonly nodes: Point[] = [];
  readonly walkable = new Uint8Array(SIZE * SIZE);
  private next: Int16Array;
  private dist: Float32Array;
  private cellNode = new Int16Array(SIZE * SIZE).fill(-2);
  private entries?: Int16Array;

  constructor(readonly era: MapEra) {
    const geometry = geometryForEra(era);
    const lines = [...geometry.lanes, geometry.river, ...geometry.trails];
    const edges: [number, number][] = [], laneEdges = new Set<string>();
    const nodeAt = ([x, y]: Point) => {
      const found = this.nodes.findIndex(n => Math.hypot(n[0] - x, n[1] - y) < 14);
      if (found >= 0) return found;
      this.nodes.push([x, y]);
      return this.nodes.length - 1;
    };
    for (const line of lines) {
      let previous = -1;
      for (let i = 0; i < line.length; i++) {
        const points = i ? densify(line[i - 1], line[i]) : [line[0]];
        for (const p of points) {
          const id = nodeAt(p);
          if (previous >= 0 && previous !== id) { edges.push([previous, id]); if (geometry.lanes.includes(line) || line === geometry.river) laneEdges.add(`${previous}:${id}`); }
          previous = id;
        }
      }
    }
    // Join loose trail ends to the closest node they can reach.
    for (const line of lines) for (const end of [line[0], line.at(-1)!]) {
      const id = nodeAt(end);
      if (edges.filter(e => e.includes(id)).length > 1) continue;
      let best = -1, gap = 60;
      this.nodes.forEach((n, j) => {
        const d = Math.hypot(n[0] - end[0], n[1] - end[1]);
        if (j !== id && d < gap && !edges.some(e => e.includes(id) && e.includes(j))) { gap = d; best = j; }
      });
      if (best >= 0) edges.push([id, best]);
    }
    for (const [a, b] of edges) this.paint(this.nodes[a], this.nodes[b], laneEdges.has(`${a}:${b}`) ? LANE_WIDTH : TRAIL_WIDTH);
    for (const base of geometry.bases) this.paint(base, base, 95);
    for (const pit of [era.roshan.day, era.roshan.night]) if (pit) this.paint(pit, pit, 45);
    // Join nearby visible nodes, including crossings within corridor segments.
    // Without this, a geometrically connected ramp can be disconnected in the graph.
    for (let a = 0; a < this.nodes.length; a++) for (let b = a + 1; b < this.nodes.length; b++) {
      const pa=this.nodes[a], pb=this.nodes[b];
      if (Math.hypot(pa[0]-pb[0],pa[1]-pb[1]) < 85 && this.clear(pa[0],pa[1],pb[0],pb[1])) edges.push([a,b]);
    }
    // All-pairs next hop; maps have roughly two hundred nodes.
    const n = this.nodes.length;
    this.dist = new Float32Array(n * n).fill(Infinity);
    this.next = new Int16Array(n * n).fill(-1);
    for (let i = 0; i < n; i++) { this.dist[i * n + i] = 0; this.next[i * n + i] = i; }
    for (const [a, b] of edges) {
      const d = Math.hypot(this.nodes[a][0] - this.nodes[b][0], this.nodes[a][1] - this.nodes[b][1]);
      if (d < this.dist[a * n + b]) { this.dist[a * n + b] = this.dist[b * n + a] = d; this.next[a * n + b] = b; this.next[b * n + a] = a; }
    }
    for (let k = 0; k < n; k++) for (let i = 0; i < n; i++) {
      const ik = this.dist[i * n + k];
      if (ik === Infinity) continue;
      for (let j = 0; j < n; j++) {
        const d = ik + this.dist[k * n + j];
        if (d < this.dist[i * n + j]) { this.dist[i * n + j] = d; this.next[i * n + j] = this.next[i * n + k]; }
      }
    }
  }
  private paint(a: Point, b: Point, radius: number) {
    const lo = (v: number) => Math.max(0, Math.floor((v - radius - ORIGIN) / CELL));
    const hi = (v: number) => Math.min(SIZE - 1, Math.ceil((v + radius - ORIGIN) / CELL));
    for (let cy = lo(Math.min(a[1], b[1])); cy <= hi(Math.max(a[1], b[1])); cy++)
      for (let cx = lo(Math.min(a[0], b[0])); cx <= hi(Math.max(a[0], b[0])); cx++) {
        const x = ORIGIN + (cx + .5) * CELL, y = ORIGIN + (cy + .5) * CELL;
        if (segmentDistance(x, y, a, b) <= radius) this.walkable[cy * SIZE + cx] = 1;
      }
  }
  private cell(x: number, y: number) {
    const cx = Math.floor((x - ORIGIN) / CELL), cy = Math.floor((y - ORIGIN) / CELL);
    return cx < 0 || cy < 0 || cx >= SIZE || cy >= SIZE ? -1 : cy * SIZE + cx;
  }
  isWalkable(x: number, y: number) { const c = this.cell(x, y); return c >= 0 && this.walkable[c] === 1; }
  /** True when the straight line stays on open ground. A hero pushed off a
   * path may cross blocked cells only until it is back on open ground. */
  clear(ax: number, ay: number, bx: number, by: number) {
    // Visit every grid cell the segment touches (Amanatides–Woo traversal).
    let cx = Math.floor((ax - ORIGIN) / CELL), cy = Math.floor((ay - ORIGIN) / CELL);
    const dx = bx - ax, dy = by - ay, sx = Math.sign(dx), sy = Math.sign(dy);
    const tdx = dx ? CELL / Math.abs(dx) : Infinity, tdy = dy ? CELL / Math.abs(dy) : Infinity;
    let tx = dx ? ((sx > 0 ? cx + 1 : cx) * CELL + ORIGIN - ax) / dx : Infinity;
    let ty = dy ? ((sy > 0 ? cy + 1 : cy) * CELL + ORIGIN - ay) / dy : Infinity;
    const open = (x: number, y: number) => x >= 0 && y >= 0 && x < SIZE && y < SIZE && this.walkable[y * SIZE + x] === 1;
    let escaping = !open(cx, cy);
    while (Math.min(tx, ty) < 1) {
      if (tx < ty) { cx += sx; tx += tdx; } else { cy += sy; ty += tdy; }
      if (open(cx, cy)) escaping = false;
      else if (!escaping) return false;
    }
    return true;
  }
  /** Closest node reachable in a straight line, cached per grid cell. */
  private anchor(x: number, y: number) {
    const c = this.cell(x, y);
    if (c >= 0 && this.cellNode[c] !== -2) {
      const cached = this.cellNode[c], n = this.nodes[cached];
      if (this.clear(x, y, n[0], n[1])) return cached;
      return this.nearestVisible(x, y);
    }
    const id = this.nearestVisible(c >= 0 ? ORIGIN + ((c % SIZE) + .5) * CELL : x, c >= 0 ? ORIGIN + (Math.floor(c / SIZE) + .5) * CELL : y);
    if (c >= 0) this.cellNode[c] = id;
    const n = this.nodes[id];
    return this.clear(x, y, n[0], n[1]) ? id : this.nearestVisible(x, y);
  }
  private nearestVisible(cx: number, cy: number) {
    let best = -1, bestD = Infinity, fallback = 0, fallbackD = Infinity;
    this.nodes.forEach((n, i) => {
      const d = Math.hypot(n[0] - cx, n[1] - cy);
      if (d < fallbackD) { fallbackD = d; fallback = i; }
      if (d < bestD && this.clear(cx, cy, n[0], n[1])) { bestD = d; best = i; }
    });
    return best >= 0 ? best : fallback;
  }
  /** The point to walk toward next on the way from a to b. */
  waypoint(ax: number, ay: number, bx: number, by: number): Point {
    if (Math.hypot(bx - ax, by - ay) < 30 || this.clear(ax, ay, bx, by)) return [bx, by];
    const n = this.nodes.length, goal = this.anchor(bx, by);
    const entry = this.entry(ax, ay, goal);
    if (entry < 0) return [bx, by]; // disconnected: never strand a hero
    const p = this.nodes[entry];
    if (Math.hypot(p[0] - ax, p[1] - ay) < 1) {
      const step = this.next[entry * n + goal];
      return step === entry ? [bx, by] : this.nodes[step];
    }
    return p;
  }
  /** The visible node with the shortest walk-plus-route to the goal. Taking it
   * always lowers the remaining distance, so heroes never turn back and forth. */
  private entry(ax: number, ay: number, goal: number) {
    const n = this.nodes.length, c = this.cell(ax, ay);
    if (c >= 0) {
      this.entries ??= new Int16Array(SIZE * SIZE * n).fill(-2);
      let cached = this.entries[c * n + goal];
      if (cached === -2) {
        cached = this.bestEntry(ORIGIN + ((c % SIZE) + .5) * CELL, ORIGIN + (Math.floor(c / SIZE) + .5) * CELL, goal);
        this.entries[c * n + goal] = cached;
      }
      if (cached >= 0 && this.clear(ax, ay, this.nodes[cached][0], this.nodes[cached][1])) return cached;
    }
    return this.bestEntry(ax, ay, goal);
  }
  private bestEntry(ax: number, ay: number, goal: number) {
    const n = this.nodes.length, order: [number, number][] = [];
    for (let i = 0; i < n; i++) {
      const route = this.dist[i * n + goal];
      if (route !== Infinity) order.push([Math.hypot(this.nodes[i][0] - ax, this.nodes[i][1] - ay) + route, i]);
    }
    // Ties go to the node further along the route.
    order.sort((a, b) => a[0] - b[0] || this.dist[a[1] * n + goal] - this.dist[b[1] * n + goal]);
    for (const [, i] of order) if (this.clear(ax, ay, this.nodes[i][0], this.nodes[i][1])) return i;
    return order[0]?.[1] ?? -1;
  }
  routeLength(a: Point, b: Point) {
    const n = this.nodes.length;
    return this.dist[this.anchor(a[0], a[1]) * n + this.anchor(b[0], b[1])];
  }
}

function densify(a: Point, b: Point): Point[] {
  const d = Math.hypot(b[0] - a[0], b[1] - a[1]), parts = Math.max(1, Math.ceil(d / SPACING));
  return Array.from({ length: parts }, (_, i) => [a[0] + (b[0] - a[0]) * (i + 1) / parts, a[1] + (b[1] - a[1]) * (i + 1) / parts] as Point);
}
function segmentDistance(x: number, y: number, a: Point, b: Point) {
  const dx = b[0] - a[0], dy = b[1] - a[1], len = dx * dx + dy * dy;
  const t = len ? Math.max(0, Math.min(1, ((x - a[0]) * dx + (y - a[1]) * dy) / len)) : 0;
  return Math.hypot(x - a[0] - dx * t, y - a[1] - dy * t);
}

const cache = new Map<string, MapPaths>();
export function pathsForEra(era: MapEra) {
  let paths = cache.get(era.id);
  if (!paths) { paths = new MapPaths(era); cache.set(era.id, paths); }
  return paths;
}
export const MAP_PATHS_VERSION = `map-paths-v2-art-coordinates:${mapEras.map(e => e.id).join(",")}`;
