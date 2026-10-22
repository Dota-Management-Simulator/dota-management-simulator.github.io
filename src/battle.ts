import { getHeroPool } from "./heroes";
import type { Hero } from "./heroes";

export type Side = 0 | 1;
export interface BattlePlayer {
  id: string;
  name: string;
  role: number;
  skills: Record<string, number>;
  energy: number;
  happiness: number;
}
export interface BattleConfig {
  seed: number;
  year: number;
  heroPoolThroughYear?: number;
  teams: [string, string];
  players: [BattlePlayer[], BattlePlayer[]];
  bonuses: [number, number];
  seriesFormat?: { bestOf: 1 | 2 | 3 | 5 | 7; advantage?: [number, number] };
  captureReplay?: boolean;
}
export interface PlayerScore {
  id: string;
  player: string;
  heroId: string;
  hero: string;
  team: Side;
  role: number;
  level: number;
  kills: number;
  deaths: number;
  assists: number;
  gold: number;
  xp: number;
  lastHits: number;
  /** Optional for scoreboards saved before performance telemetry existed. */
  heroDamage?: number;
  buildingDamage?: number;
  healing?: number;
  laneOutcome?: "win" | "draw" | "loss";
}
export interface ResourcePoint {
  time: number;
  gold: [number, number];
  xp: [number, number];
}
export interface GameSummary {
  winner: Side;
  duration: number;
  kills: [number, number];
  towers: [number, number];
  players: PlayerScore[];
  timeline: ResourcePoint[];
  overtime: boolean;
  ancientHealth: [number, number];
}
export interface SeriesSummary {
  engine: "lane-siege-v1";
  seed: number;
  teams: [string, string];
  winner: Side | null;
  bestOf?: number;
  advantage?: [number, number];
  score: [number, number];
  games: GameSummary[];
}
export interface ReplayUnit {
  id: number;
  kind: "hero" | "creep" | "tower" | "base";
  heroId?: string;
  team: Side;
  x: number;
  y: number;
  hp: number;
  max: number;
  name: string;
}
export interface ReplayFrame {
  time: number;
  kills: [number, number];
  units: ReplayUnit[];
  players: PlayerScore[];
}
export interface SimulatedSeries {
  summary: SeriesSummary;
  frames: ReplayFrame[][];
}

type Point = [number, number];
export const LANES: Point[][] = [
  [
    [90, 710],
    [90, 90],
    [710, 90],
  ],
  [
    [90, 710],
    [250, 550],
    [400, 400],
    [550, 250],
    [710, 90],
  ],
  [
    [90, 710],
    [710, 710],
    [710, 90],
  ],
];
export const BASES: Point[] = [
  [90, 710],
  [710, 90],
];
const GAME_CLOCK = 6;
const DT = 0.2;
const limit = (v: number, min: number, max: number) =>
  Math.min(max, Math.max(min, v));
export function seededRandom(seed: number) {
  let state = seed >>> 0;
  return () => {
    state += 0x6d2b79f5;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
export function matchClock(seconds: number) {
  return `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, "0")}`;
}

interface Unit {
  id: number;
  kind: ReplayUnit["kind"];
  team: Side;
  lane: number;
  x: number;
  y: number;
  hp: number;
  max: number;
  damage: number;
  range: number;
  rate: number;
  speed: number;
  cd: number;
  stun: number;
  dead: boolean;
  wait: number;
  route: Point[];
  waypoint: number;
  hero?: Hero;
  player?: BattlePlayer;
  level: number;
  experience: number;
  totalXp: number;
  gold: number;
  kills: number;
  deaths: number;
  assists: number;
  lastHits: number;
  strength: number;
  agility: number;
  intelligence: number;
  power: number;
  respawn: number;
  retreat: boolean;
  abilityCd: number;
  contributions: Map<number, number>;
  heroDamage: number;
  buildingDamage: number;
  healing: number;
  laneOutcome?: PlayerScore["laneOutcome"];
}
const distance = (a: { x: number; y: number }, b: { x: number; y: number }) =>
  Math.hypot(a.x - b.x, a.y - b.y);

// Adapted from the user's Lane Siege: entity-level lane movement and combat,
// with gold, assist attribution, bounded overtime, and separate replay capture.
export class LaneBattle {
  units: Unit[] = [];
  time = 0;
  winner: Side | null = null;
  kills: [number, number] = [0, 0];
  timeline: ResourcePoint[] = [];
  frames: ReplayFrame[] = [];
  private nextWave = 2;
  private nextSample = 0;
  private nextFrame = 0;
  private serial = 0;
  private lanesMeasured = false;
  private random: () => number;
  constructor(
    public config: BattleConfig,
    gameIndex = 0,
  ) {
    this.random = seededRandom(config.seed + gameIndex * 7919);
    const pool = getHeroPool(config.year, config.heroPoolThroughYear).slice();
    for (const team of [0, 1] as Side[]) {
      const base = BASES[team];
      this.add({ team, kind: "base", x: base[0], y: base[1], hp: 4500 });
      for (let lane = 0; lane < 3; lane++)
        for (const fraction of [0.2, 0.4]) {
          const [x, y] = this.lanePoint(lane, team ? 1 - fraction : fraction);
          this.add({
            team,
            lane,
            kind: "tower",
            x,
            y,
            hp: 1800,
            damage: 95,
            range: 135,
            rate: 1,
          });
        }
      config.players[team].forEach((player, role) => {
        const candidates = pool.filter((h) => h.roles.includes(role));
        const choices = candidates.length ? candidates : pool;
        const hero = choices[Math.floor(this.random() * choices.length)];
        pool.splice(pool.indexOf(hero), 1); // No duplicates across either draft.
        const s = player.skills;
        const skill =
          ((s.laning ?? 70) +
            (s.teamfights ?? 70) +
            (s.skirmish ?? 70) +
            (s.stability ?? 70)) /
          4;
        const form =
          1 + (this.random() - 0.5) * (1 - (s.stability ?? 70) / 130) * 0.35;
        const power = limit(
          // Keep the new 15–40 starting range above the safety floor so
          // development changes combat power throughout the early game.
          (0.4 + skill * 0.008 + config.bonuses[team]) *
            (0.8 + player.energy / 500) *
            (0.9 + player.happiness / 1000) *
            form,
          0.35,
          2.2,
        );
        const lane = [2, 1, 0, 0, 2][role];
        const unit = this.add({
          team,
          kind: "hero",
          hero,
          player,
          lane: team ? 2 - lane : lane,
          x: base[0] + role * 5,
          y: base[1] - role * 5,
          range: hero.ranged ? 150 : 42,
          rate: hero.attribute === "Agility" ? 0.9 : 1.15,
          speed: 102 + (s.intuition ?? 70) / 8,
          strength: hero.attribute === "Strength" ? 25 : 19,
          agility: hero.attribute === "Agility" ? 24 : 15,
          intelligence: hero.attribute === "Intelligence" ? 25 : 16,
          power,
          abilityCd: 2 + this.random() * 8,
          gold: 600,
        });
        this.recalculate(unit);
        unit.hp = unit.max;
      });
    }
    this.capture(true);
  }
  private add(values: Partial<Unit> & Pick<Unit, "team" | "kind" | "x" | "y">) {
    const u: Unit = {
      id: this.serial++,
      lane: 1,
      hp: 220,
      max: values.hp || 220,
      damage: 0,
      range: 22,
      rate: 1,
      speed: 0,
      cd: 0,
      stun: 0,
      dead: false,
      wait: 0,
      route: [],
      waypoint: 1,
      level: 1,
      experience: 0,
      totalXp: 0,
      gold: 0,
      kills: 0,
      deaths: 0,
      assists: 0,
      lastHits: 0,
      heroDamage: 0,
      buildingDamage: 0,
      healing: 0,
      strength: 0,
      agility: 0,
      intelligence: 0,
      power: 1,
      respawn: 0,
      retreat: false,
      abilityCd: 0,
      contributions: new Map(),
      ...values,
    };
    this.units.push(u);
    return u;
  }
  private lanePoint(lane: number, fraction: number): Point {
    const path = LANES[lane];
    const lengths = path
      .slice(1)
      .map((p, i) => Math.hypot(p[0] - path[i][0], p[1] - path[i][1]));
    let remaining = lengths.reduce((a, b) => a + b, 0) * fraction;
    for (let i = 0; i < lengths.length; i++) {
      if (remaining <= lengths[i] || i === lengths.length - 1) {
        const k = Math.min(1, remaining / lengths[i]);
        return [
          path[i][0] + (path[i + 1][0] - path[i][0]) * k,
          path[i][1] + (path[i + 1][1] - path[i][1]) * k,
        ];
      }
      remaining -= lengths[i];
    }
    return path[0];
  }
  private recalculate(u: Unit) {
    if (!u.hero) return;
    const primary =
      u.hero.attribute === "Strength"
        ? u.strength
        : u.hero.attribute === "Agility"
          ? u.agility
          : u.intelligence;
    u.damage = (25 + primary + u.gold * 0.0018) * u.power;
    u.max = (200 + u.strength * 22) * u.power + u.gold * 0.013;
  }
  private spawn() {
    const siege = 1 + Math.max(0, this.time - 240) / 200;
    for (const team of [0, 1] as Side[])
      for (let lane = 0; lane < 3; lane++) {
        const route = LANES[lane].map((p) => [...p] as Point);
        if (team) route.reverse();
        for (let i = 0; i < 4; i++)
          this.add({
            kind: "creep",
            team,
            lane,
            x: route[0][0],
            y: route[0][1],
            hp: (i < 3 ? 220 : 140) * siege,
            damage: (i < 3 ? 14 : 18) * siege,
            range: i < 3 ? 22 : 90,
            rate: 0.9,
            speed: 45,
            route,
            wait: i * 0.7,
          });
      }
  }
  private canTarget(u: Unit, e: Unit) {
    if (e.dead || e.team === u.team || e.wait > 0) return false;
    // An Ancient is exposed once either lane has lost both towers.
    if (
      e.kind === "base" &&
      [0, 1, 2].every((lane) =>
        this.units.some(
          (t) =>
            t.kind === "tower" &&
            !t.dead &&
            t.team === e.team &&
            t.lane === lane,
        ),
      )
    )
      return false;
    return true;
  }
  private nearest(u: Unit, radius: number) {
    let best: Unit | undefined;
    let d = radius;
    for (const e of this.units) {
      if (!this.canTarget(u, e)) continue;
      const gap =
        distance(u, e) - (e.kind === "base" ? 26 : e.kind === "hero" ? 10 : 6);
      if (gap < d) {
        d = gap;
        best = e;
      }
    }
    return best;
  }
  private move(u: Unit, x: number, y: number) {
    const d = Math.hypot(x - u.x, y - u.y);
    if (d < 1) return;
    const step = Math.min(d, u.speed * DT);
    u.x += ((x - u.x) / d) * step;
    u.y += ((y - u.y) / d) * step;
  }
  private gainXp(u: Unit, value: number) {
    if (!u.player) return;
    const gain = value * 2.2 * (0.8 + (u.player.skills.farming ?? 70) / 350);
    u.experience += gain;
    u.totalXp += gain;
    while (u.level < 25 && u.experience >= 80 * u.level) {
      u.experience -= 80 * u.level;
      u.level++;
      u.strength += u.hero?.attribute === "Strength" ? 3.3 : 2;
      u.agility += u.hero?.attribute === "Agility" ? 3.2 : 1.8;
      u.intelligence += u.hero?.attribute === "Intelligence" ? 3.2 : 1.5;
      const old = u.max;
      this.recalculate(u);
      u.hp = Math.min(u.max, u.hp + u.max - old + u.max * 0.08);
    }
  }
  private damage(source: Unit, target: Unit, value: number) {
    if (target.dead || this.winner !== null) return;
    // Count effective damage, excluding overkill. Telemetry never consumes RNG.
    const effective = Math.max(0, Math.min(target.hp, value));
    if (source.kind === "hero") {
      if (target.kind === "hero") source.heroDamage += effective;
      if (target.kind === "tower" || target.kind === "base") source.buildingDamage += effective;
    }
    target.hp -= value;
    if (source.kind === "hero" && target.kind === "hero")
      target.contributions.set(source.id, this.time);
    if (target.hp <= 0) this.die(target, source);
  }
  private die(target: Unit, source: Unit) {
    if (target.dead) return;
    target.dead = true;
    target.hp = 0;
    if (target.kind === "base") {
      this.winner = (1 - target.team) as Side;
      return;
    }
    const allies = this.units.filter(
      (u) => u.kind === "hero" && u.team === source.team,
    );
    if (target.kind === "hero") {
      target.deaths++;
      target.respawn = 6 + target.level * 2;
      this.kills[source.team]++;
      const involved = allies.filter(
        (u) => this.time - (target.contributions.get(u.id) ?? -1000) <= 12,
      );
      const killer =
        source.kind === "hero"
          ? source
          : involved.sort(
              (a, b) =>
                (target.contributions.get(b.id) || 0) -
                (target.contributions.get(a.id) || 0),
            )[0];
      if (killer) {
        killer.kills++;
        killer.gold += 200 + target.level * 10;
      }
      for (const hero of involved)
        if (hero !== killer) {
          hero.assists++;
          hero.gold += 75;
        }
      target.contributions.clear();
    } else if (target.kind === "tower") {
      for (const hero of allies) hero.gold += 150;
      if (source.kind === "hero") source.gold += 75;
    } else {
      const farmer =
        source.kind === "hero"
          ? source
          : allies
              .filter((u) => !u.dead && distance(u, target) < 210)
              .sort(
                (a, b) =>
                  (b.player?.skills.farming ?? 50) /
                    Math.max(30, distance(b, target)) -
                  (a.player?.skills.farming ?? 50) /
                    Math.max(30, distance(a, target)),
              )[0];
      if (farmer) {
        farmer.lastHits++;
        farmer.gold += 35 * (0.8 + (farmer.player?.skills.farming ?? 70) / 250);
      }
    }
    const xp =
      target.kind === "hero"
        ? 180 + target.level * 30
        : target.kind === "tower"
          ? 200
          : 55;
    const nearby = allies.filter((u) => !u.dead && distance(u, target) < 350);
    for (const h of nearby) this.gainXp(h, xp / Math.max(1, nearby.length));
  }
  private attack(u: Unit, target: Unit) {
    if (u.cd > 0) return;
    u.cd = (u.rate * 100) / (100 + u.agility);
    const armor = target.agility / 6;
    let value = u.damage * (1 - (0.06 * armor) / (1 + 0.06 * armor));
    if (u.player && target.kind === "creep")
      value *= 0.7 + (u.player.skills.laning ?? 70) / 150;
    this.damage(u, target, value);
  }
  private cast(u: Unit, target: Unit) {
    if (!u.hero) return;
    const execution = 0.7 + (u.player?.skills.teamfights ?? 70) / 200;
    if (u.hero.ability === "nuke")
      this.damage(u, target, (u.damage * 2 + u.level * 8) * execution);
    else if (u.hero.ability === "stun") {
      target.stun = 1.6;
      this.damage(u, target, u.damage * execution);
    } else if (u.hero.ability === "area") {
      for (const e of this.units)
        if (this.canTarget(u, e) && distance(e, target) < 90)
          this.damage(u, e, u.damage * 1.35 * execution);
    } else
      for (const ally of this.units)
        if (
          ally.kind === "hero" &&
          !ally.dead &&
          ally.team === u.team &&
          distance(ally, u) < 200
        ) {
          u.healing += Math.max(0, Math.min(ally.max - ally.hp, (90 + u.level * 12) * execution));
          ally.hp = Math.min(
            ally.max,
            ally.hp + (90 + u.level * 12) * execution,
          );
        }
    u.abilityCd = 9 + this.random() * 3;
  }
  step() {
    if (this.winner !== null) return; // Team zero is a valid winner.
    this.time += DT;
    if (this.time >= this.nextWave) {
      this.nextWave += 25;
      this.spawn();
    }
    for (const u of this.units) {
      if (this.winner !== null) break;
      if (u.kind === "hero") {
        u.gold +=
          DT * GAME_CLOCK * (0.8 + (u.player?.skills.farming ?? 70) / 100);
        this.recalculate(u);
      }
      if (u.dead) {
        if (u.kind === "hero") {
          u.respawn -= DT;
          if (u.respawn <= 0) {
            u.dead = false;
            u.hp = u.max;
            u.x = BASES[u.team][0];
            u.y = BASES[u.team][1];
            u.retreat = false;
            u.contributions.clear();
          }
        }
        continue;
      }
      if (u.wait > 0) {
        u.wait -= DT;
        continue;
      }
      u.cd -= DT;
      u.abilityCd -= DT;
      if (u.stun > 0) {
        u.stun -= DT;
        continue;
      }
      if (u.kind === "base") continue;
      if (u.kind === "tower") {
        const target = this.nearest(u, u.range);
        if (target) this.attack(u, target);
        continue;
      }
      if (u.kind === "creep") {
        const target = this.nearest(u, 100);
        if (target) {
          if (
            distance(u, target) - (target.kind === "base" ? 26 : 6) <=
            u.range
          )
            this.attack(u, target);
          else this.move(u, target.x, target.y);
        } else {
          const point = u.route[u.waypoint];
          this.move(u, point[0], point[1]);
          if (
            Math.hypot(point[0] - u.x, point[1] - u.y) < 8 &&
            u.waypoint < u.route.length - 1
          )
            u.waypoint++;
        }
        continue;
      }
      const home = { x: BASES[u.team][0], y: BASES[u.team][1] };
      u.hp = Math.min(
        u.max,
        u.hp +
          (distance(u, home) < 100 ? u.max * 0.12 : 2 + 0.1 * u.strength) * DT,
      );
      if (u.hp < u.max * (0.24 + (u.player?.skills.intuition ?? 70) / 1000))
        u.retreat = true;
      if (u.hp > u.max * 0.85) u.retreat = false;
      if (u.retreat) {
        this.move(u, home.x, home.y);
        continue;
      }
      const target = this.nearest(u, u.range + 60);
      if (target) {
        if (u.abilityCd <= 0 && distance(u, target) < u.range + 30)
          this.cast(u, target);
        if (!target.dead) {
          if (
            distance(u, target) - (target.kind === "base" ? 26 : 10) <=
            u.range
          )
            this.attack(u, target);
          else this.move(u, target.x, target.y);
        }
        continue;
      }
      const creeps = this.units.filter(
        (c) =>
          c.kind === "creep" &&
          !c.dead &&
          c.team === u.team &&
          c.lane === u.lane &&
          c.wait <= 0,
      );
      let leader: Unit | undefined;
      let most = -Infinity;
      for (const creep of creeps) {
        const point = creep.route[creep.waypoint];
        const progress =
          creep.waypoint * 1000 -
          Math.hypot(point[0] - creep.x, point[1] - creep.y);
        if (progress > most) {
          most = progress;
          leader = creep;
        }
      }
      if (leader) {
        if (distance(u, leader) > 45) this.move(u, leader.x, leader.y);
      } else {
        const point = this.lanePoint(u.lane, u.team ? 0.8 : 0.2);
        this.move(u, point[0], point[1]);
      }
    }
    this.units = this.units.filter(
      (u) =>
        !u.dead || u.kind === "hero" || u.kind === "base" || u.kind === "tower",
    );
    // A bounded, visible overtime rule: siege attrition attacks both Ancients.
    if (this.time > 540 && this.winner === null) {
      const bases = this.units.filter((u) => u.kind === "base");
      for (const base of bases) {
        const enemy = (1 - base.team) as Side;
        const pressure =
          this.units.filter(
            (u) => u.team === enemy && u.kind === "hero" && !u.dead,
          ).length +
          this.units.filter(
            (u) => u.team === base.team && u.kind === "tower" && u.dead,
          ).length *
            2;
        base.hp = Math.max(0, base.hp - DT * (4 + pressure));
      }
      const fallen = bases.filter((b) => b.hp <= 0);
      if (fallen.length) {
        const loser =
          fallen.length === 1
            ? fallen[0]
            : bases
                .slice()
                .sort(
                  (a, b) =>
                    this.resourceTotal(a.team, "gold") -
                    this.resourceTotal(b.team, "gold"),
                )[0];
        loser.dead = true;
        this.winner = (1 - loser.team) as Side;
      }
    }
    if (!this.lanesMeasured && this.time * GAME_CLOCK >= 600) {
      this.lanesMeasured = true;
      const heroes = this.units.filter(u => u.kind === "hero");
      for (const hero of heroes) {
        const value = (team: Side) => heroes.filter(u => u.team === team && u.lane === hero.lane)
          .reduce((sum, u) => sum + Math.max(0, u.gold - 600) + u.totalXp, 0);
        const own = value(hero.team), enemy = value((1 - hero.team) as Side);
        // Assigned lane totals at 10:00, including both partners in side lanes.
        hero.laneOutcome = own > enemy * 1.05 ? "win" : enemy > own * 1.05 ? "loss" : "draw";
      }
    }
    this.capture(this.winner !== null);
  }
  private resourceTotal(team: Side, key: "gold" | "totalXp") {
    return this.units
      .filter((u) => u.kind === "hero" && u.team === team)
      .reduce((s, u) => s + Math.round(u[key]), 0);
  }
  private score(): PlayerScore[] {
    return this.units
      .filter((u) => u.kind === "hero")
      .map((u) => ({
        id: u.player!.id,
        player: u.player!.name,
        heroId: u.hero!.id,
        hero: u.hero!.name,
        team: u.team,
        role: u.player!.role,
        level: u.level,
        kills: u.kills,
        deaths: u.deaths,
        assists: u.assists,
        gold: Math.round(u.gold),
        xp: Math.round(u.totalXp),
        lastHits: u.lastHits,
        heroDamage: Math.round(u.heroDamage),
        buildingDamage: Math.round(u.buildingDamage),
        healing: Math.round(u.healing),
        ...(u.laneOutcome ? { laneOutcome: u.laneOutcome } : {}),
      }));
  }
  private capture(final = false) {
    const time = Math.round(this.time * GAME_CLOCK);
    if (final || this.time >= this.nextSample) {
      if (this.timeline.at(-1)?.time !== time)
        this.timeline.push({
          time,
          gold: [this.resourceTotal(0, "gold"), this.resourceTotal(1, "gold")],
          xp: [
            this.resourceTotal(0, "totalXp"),
            this.resourceTotal(1, "totalXp"),
          ],
        });
      this.nextSample = this.time + 5;
    }
    if (this.config.captureReplay !== false && (final || this.time >= this.nextFrame)) {
      if (this.frames.at(-1)?.time !== time)
        this.frames.push({
          time,
          kills: [...this.kills],
          players: this.score(),
          units: this.units
            .filter((u) => u.wait <= 0)
            .map((u) => ({
              id: u.id,
              kind: u.kind,
              team: u.team,
              x: Math.round(u.x),
              y: Math.round(u.y),
              hp: Math.round(u.hp),
              max: Math.round(u.max),
              name: u.hero?.name || u.kind,
              ...(u.hero ? { heroId: u.hero.id } : {}),
            })),
        });
      this.nextFrame = this.time + 3;
    }
  }
  run() {
    while (this.winner === null && this.time < 1800) this.step();
    if (this.winner === null)
      throw new Error(
        "The lane simulation did not finish. No campaign changes were applied.",
      );
    return this.summary();
  }
  summary(): GameSummary {
    if (this.winner === null) throw new Error("Game is still running");
    return {
      winner: this.winner,
      duration: Math.round(this.time * GAME_CLOCK),
      kills: [...this.kills],
      towers: ([0, 1] as Side[]).map(
        (t) =>
          this.units.filter((u) => u.kind === "tower" && u.team !== t && u.dead)
            .length,
      ) as [number, number],
      players: this.score(),
      timeline: this.timeline,
      overtime: this.time > 540,
      ancientHealth: ([0, 1] as Side[]).map((t) =>
        Math.max(
          0,
          Math.round(
            this.units.find((u) => u.kind === "base" && u.team === t)!.hp,
          ),
        ),
      ) as [number, number],
    };
  }
}
export function simulateBestOfThree(
  config: BattleConfig,
  onProgress?: (games: number) => void,
): SimulatedSeries {
  return simulateSeries({ ...config, seriesFormat: { bestOf: 3 } }, onProgress);
}

/** BO2 plays both maps and can draw; odd series stop at the winning score.
 * Default wins are recorded separately and never fabricate game statistics. */
export function simulateSeries(
  config: BattleConfig,
  onProgress?: (games: number) => void,
): SimulatedSeries {
  const { bestOf = 3, advantage = [0, 0] } = config.seriesFormat ?? {};
  if (![1, 2, 3, 5, 7].includes(bestOf) || advantage.some(n => !Number.isInteger(n) || n < 0) || (bestOf === 2 && advantage.some(Boolean)))
    throw new Error("Invalid series format");
  const target = Math.floor(bestOf / 2) + 1;
  if (Math.max(...advantage) >= target) throw new Error("Invalid starting advantage");
  const score: [number, number] = [...advantage];
  const games: GameSummary[] = [];
  const frames: ReplayFrame[][] = [];
  while (bestOf === 2 ? games.length < 2 : Math.max(...score) < target) {
    const battle = new LaneBattle(config, games.length);
    const result = battle.run();
    games.push(result);
    frames.push(battle.frames);
    score[result.winner]++;
    onProgress?.(games.length);
  }
  return {
    summary: {
      engine: "lane-siege-v1",
      seed: config.seed,
      teams: config.teams,
      winner: score[0] === score[1] ? null : score[0] > score[1] ? 0 : 1,
      bestOf,
      ...(advantage.some(Boolean) ? { advantage } : {}),
      score,
      games,
    },
    frames,
  };
}
