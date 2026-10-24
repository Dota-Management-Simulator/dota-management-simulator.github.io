import { getHeroPool } from "./heroes";
import type { Hero } from "./heroes";
import { axisFactor, draftWeight, heroPatchBonus, heroTags, patchById } from "./patches";
import type { SeasonPatch } from "./patches";
import { perceivedPatch } from "./patch-knowledge";
import type { PatchObserver } from "./patch-knowledge";
import { oppositionStaff } from "./staff";
import { frontiersEnabled, talentsEnabled } from "./patch-milestones";
import { createFarmCamps } from "./battle-map";
import type { FarmCamp } from "./battle-map";
import { mapEraForPatch, roshanPit } from "./map-eras";
import type { MapEra } from "./map-eras";
import { pathsForEra } from "./map-paths";
import type { MapPaths } from "./map-paths";
import { talentBonuses } from "./talents";
import type { TalentPlan } from "./talents";
import { autoDraftMap } from "./draft";
import type { CompletedDraft, DraftPreparation } from "./draft";
import { automaticBuild, bkbProtection, itemCatalog, itemForPatch } from "./items";
import type { ItemId, ItemSnapshot, ItemEvent, MatchItem } from "./items";
import { automaticTactics, normalizeTactics, phaseAt, strategyById, strategyUnlocked } from "./tactics";
import type { ActivePlay, DroppedItem, RoshanState, Strategy, TacticalEvent, TacticalOrder, TacticalPreparation, TacticalSnapshot } from "./tactics";

export type Side = 0 | 1;
export interface BattlePlayer {
  id: string;
  name: string;
  role: number;
  skills: Record<string, number>;
  heroExperience?: Record<string, number>;
  energy: number;
  happiness: number;
  talents?: TalentPlan;
}
export interface BattleConfig {
  seed: number;
  year: number;
  heroPoolThroughYear?: number;
  /** Absent on older saved preparations: retain the original neutral engine. */
  patchId?: string;
  patchObservers?: [PatchObserver, PatchObserver];
  teams: [string, string];
  players: [BattlePlayer[], BattlePlayer[]];
  bonuses: [number, number];
  seriesFormat?: { bestOf: 1 | 2 | 3 | 5 | 7; advantage?: [number, number] };
  captureReplay?: boolean;
  /** Offline calibration and future manual drafts use the same combat path. */
  draft?: [string[], string[]];
  draftRecord?: CompletedDraft;
  draftPreparations?: [DraftPreparation|undefined,DraftPreparation|undefined];
  tacticalPreparations?: [TacticalPreparation | undefined, TacticalPreparation | undefined];
  captureTimeline?: boolean;
}
export interface PlayerScore extends ItemSnapshot {
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
  neutralLastHits?: number;
  neutralDeaths?: number;
  talents?: TalentPlan;
}
export interface ResourcePoint {
  time: number;
  gold: [number, number];
  netWorth?: [number, number];
  xp: [number, number];
}
export interface GameSummary {
  tacticalEvents?: TacticalEvent[];
  itemEvents?: ItemEvent[];
  roshanKills?: [number, number];
  draft?: CompletedDraft;
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
  patch?: { id: string; name: string; versions: string };
  mapLayout?: "frontiers";
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
  roshan?: RoshanState;
  droppedItems?: DroppedItem[];
  time: number;
  kills: [number, number];
  units: ReplayUnit[];
  players: PlayerScore[];
  camps?: FarmCamp[];
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
  inventory: ItemId[];
  purchasedItems: ItemId[];
  spent: number;
  itemPriority?: ItemId;
  itemPrioritySource?: "manager" | "bot";
  itemCooldowns: Partial<Record<ItemId, number>>;
  bkbUntil: number;
  aegisUntil: number;
  lastDamagedAt: number;
  reviveAt?: Point;
  homeLane: number;
  neutralDeaths: number;
  regroupUntil: number;
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
  farmCamp?: number;
  neutralLastHits: number;
}
const distance = (a: { x: number; y: number }, b: { x: number; y: number }) =>
  Math.hypot(a.x - b.x, a.y - b.y);

// Adapted from the user's Lane Siege: entity-level lane movement and combat,
// with gold, assist attribution, bounded overtime, and separate replay capture.
export class LaneBattle {
  roshan: RoshanState = { x: 330, y: 405, hp: 4800, max: 4800, respawnAt: 0, kills: [0, 0] };
  droppedItems: DroppedItem[] = [];
  tacticalEvents: TacticalEvent[] = [];
  itemEvents: ItemEvent[] = [];
  private preparations: [TacticalPreparation, TacticalPreparation];
  private plays: [ActivePlay | undefined, ActivePlay | undefined] = [undefined, undefined];
  private playCooldowns: [Record<string, number>, Record<string, number>] = [{}, {}];
  private nextDecision: [number, number] = [300, 300];
  private nextShop = 0;
  private playSerial = 0;
  private roshanAttackAt = 0;
  private roshanDamagedAt = -1000;
  private sightCache: [Unit[] | undefined, Unit[] | undefined] = [undefined, undefined];
  private itemTable: Map<ItemId,MatchItem>;
  units: Unit[] = [];
  camps: FarmCamp[] = [];
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
  private patch: SeasonPatch | undefined;
  private drafted?: CompletedDraft;
  private mapEra?: MapEra;
  private paths?: MapPaths;
  constructor(
    public config: BattleConfig,
    gameIndex = 0,
  ) {
    this.random = seededRandom(config.seed + gameIndex * 7919);
    this.patch = patchById(config.patchId);
    this.itemTable = new Map(itemCatalog.map(item=>[item.id,itemForPatch(item.id,this.patch)]));
    this.preparations = ([0, 1] as Side[]).map(side => config.tacticalPreparations?.[side] ? normalizeTactics(config.tacticalPreparations[side])
      : automaticTactics(config.players[side], config.patchObservers?.[side]?.staffIds ?? oppositionStaff(config.teams[side]))) as [TacticalPreparation,TacticalPreparation];
    this.camps = frontiersEnabled(this.patch) ? createFarmCamps() : [];
    // Patched maps use that era's terrain and Roshan pit; legacy maps keep open ground.
    if (this.patch) {
      this.mapEra = mapEraForPatch(this.patch); this.paths = pathsForEra(this.mapEra);
      [this.roshan.x, this.roshan.y] = roshanPit(this.mapEra, 0);
    }
    this.drafted = config.draftRecord ?? (this.patch && !config.draft ? autoDraftMap(config,gameIndex) : undefined);
    const fixedDraft = config.draft ?? this.drafted?.heroes;
    const pool = getHeroPool(config.year, this.patch ? Math.min(config.heroPoolThroughYear ?? this.patch.year - 1, this.patch.year - 1) : config.heroPoolThroughYear, this.patch).slice();
    if (fixedDraft) {
      const ids = fixedDraft.flat();
      if (fixedDraft.some(side => side.length !== 5) || new Set(ids).size !== 10 ||
          fixedDraft.some(side => side.some((id, role) => !pool.some(h => h.id === id && h.roles.includes(role)))))
        throw new Error("A fixed draft must contain ten unique, unlocked, position-eligible heroes.");
    }
    for (const team of [0, 1] as Side[]) {
      const observer = config.patchObservers?.[team] ?? { teamKey: config.teams[team], staffIds: oppositionStaff(config.teams[team]) };
      const draftPatch = this.patch ? perceivedPatch(this.patch, observer) : undefined;
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
        const weights = choices.map(h => draftWeight(h, draftPatch, player.skills.creativity ?? 50));
        let roll = this.random() * weights.reduce((sum, value) => sum + value, 0);
        const hero = fixedDraft ? pool.find(h => h.id === fixedDraft[team][role])! : choices[weights.findIndex((weight, index) => (roll -= weight) < 0 || index === weights.length - 1)];
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
        ) * (1 + heroPatchBonus(this.patch, hero.id) / 100);
        const lane = [2, 1, 0, 0, 2][role];
        const unit = this.add({
          team,
          kind: "hero",
          hero,
          player,
          lane: team ? 2 - lane : lane,
          homeLane: team ? 2 - lane : lane,
          x: base[0] + role * 5,
          y: base[1] - role * 5,
          range: hero.ranged ? 150 : 42,
          rate: hero.attribute === "Agility" ? 0.9 : 1.15,
          speed: (102 + (s.intuition ?? 70) / 8) * axisFactor(this.patch, "tempo", 0.12),
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
      neutralLastHits: 0,
      strength: 0,
      agility: 0,
      intelligence: 0,
      power: 1,
      respawn: 0,
      retreat: false,
      abilityCd: 0,
      contributions: new Map(),
      inventory: [], purchasedItems: [], spent: 0, itemCooldowns: {}, bkbUntil: 0, aegisUntil: 0, lastDamagedAt: -1000, homeLane: 1, neutralDeaths: 0, regroupUntil:0,
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
    const talents = this.talents(u);
    const gear = u.inventory.map(id => this.item(id));
    u.damage = (25 + primary + gear.reduce((sum, item) => sum + item.attack, 0)) * u.power * talents.attack;
    u.max = ((200 + u.strength * 22) * u.power + gear.reduce((sum, item) => sum + item.health, 0)) * talents.health;
  }
  private talents(u: Unit) { return talentBonuses(talentsEnabled(this.patch) ? u.player?.talents : undefined, u.level); }
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
      // Exact broad-phase rejection: anything outside this box cannot beat
      // the current edge-to-edge distance. Preserve tie order and combat RNG.
      const extent = e.kind === "base" ? 26 : e.kind === "hero" ? 10 : 6;
      if (Math.abs(e.x - u.x) > d + extent || Math.abs(e.y - u.y) > d + extent) continue;
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
    if (u.kind === "hero" && this.paths) [x, y] = this.paths.waypoint(u.x, u.y, x, y);
    const d = Math.hypot(x - u.x, y - u.y);
    if (d < 1) return;
    const gearSpeed = u.inventory.reduce((sum, id) => sum + (this.item(id).speed ?? 0), 0);
    const step = Math.min(d, u.speed * (1 + gearSpeed) * this.talents(u).speed * DT);
    u.x += ((x - u.x) / d) * step;
    u.y += ((y - u.y) / d) * step;
  }
  private gainXp(u: Unit, value: number) {
    if (!u.player) return;
    const gain = value * 2.2 * (0.8 + (u.player.skills.farming ?? 70) / 350) * axisFactor(this.patch, "economy", 0.18) * this.talents(u).resources;
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
  private damage(source: Unit, target: Unit, value: number, spell = false) {
    if (target.dead || this.winner !== null) return;
    if (target.kind === "hero") {
      if (spell && target.bkbUntil > this.clock) value *= bkbProtection(this.patch);
      if (!spell && target.inventory.includes("butterfly")) value *= 1 - (this.item("butterfly").evasion ?? 0);
      target.lastDamagedAt = this.clock;
    }
    if (target.kind === "tower" || target.kind === "base") value *= this.talents(source).buildings;
    if (this.patch && source.player && source.hero && (target.kind === "tower" || target.kind === "base")) {
      const pushing = source.player.skills.pushing ?? 50;
      value *= axisFactor(this.patch, "objectives", 0.3) * (0.9 + pushing / 500);
      const partners = this.units.filter(u => u.kind === "hero" && !u.dead && u.team === source.team && u !== source && distance(u, source) < 200).length;
      if (partners === 0) value *= axisFactor(this.patch, "splitpush", heroTags(source.hero).includes("Pushing") ? 0.35 : 0.18);
    }
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
  private die(target: Unit, source: Unit, neutral = false) {
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
      target.farmCamp = undefined;
      if (target.aegisUntil > this.clock) {
        target.aegisUntil = 0; target.respawn = 5 / GAME_CLOCK; target.reviveAt = [target.x, target.y];
        return;
      }
      if (target.inventory.includes("rapier")) {
        target.inventory = target.inventory.filter(id => id !== "rapier");
        this.recalculate(target);
        this.droppedItems.push({ id: ++this.playSerial, x: target.x, y: target.y, item: "rapier" });
        this.itemEvents.push({ time: this.clock, playerId: target.player!.id, item: "rapier", kind: "drop", gold: 0 });
      }
      target.deaths++;
      target.respawn = 6 + target.level * 2;
      if(neutral){target.neutralDeaths++;target.contributions.clear();return;}
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
        killer.gold += (200 + target.level * 10) * this.talents(killer).resources;
      }
      for (const hero of involved)
        if (hero !== killer) {
          hero.assists++;
          hero.gold += 75 * this.talents(hero).resources;
        }
      target.contributions.clear();
    } else if (target.kind === "tower") {
      for (const hero of allies) hero.gold += 150 * this.talents(hero).resources;
      if (source.kind === "hero") source.gold += 75 * this.talents(source).resources;
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
        farmer.gold += 35 * (0.8 + (farmer.player?.skills.farming ?? 70) / 250) * axisFactor(this.patch, "economy", 0.25) * this.talents(farmer).resources;
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
    if (this.patch && u.player && this.time < 100 && (target.kind === "hero" || target.kind === "creep"))
      value *= 1 + (this.patch.axes.laning - 50) / 50 * (u.player.skills.laning ?? 50) / 100 * 0.3;
    this.damage(u, target, value);
  }
  private cast(u: Unit, target: Unit) {
    if (!u.hero) return;
    let execution = 0.7 + (u.player?.skills.teamfights ?? 70) / 200;
    if (this.patch) {
      const partners = this.units.filter(a => a.kind === "hero" && !a.dead && a.team === u.team && a !== u && distance(a,u) < 240).length;
      execution *= 1 + (this.patch.axes.teamfight - 50) / 50 * Math.min(1, partners / 2) * 0.3;
    }
    const spellPower = execution * this.talents(u).spells * (1 + u.inventory.reduce((sum, id) => sum + (this.item(id).spells ?? 0), 0));
    if (u.hero.ability === "nuke")
      this.damage(u, target, (u.damage * 2 + u.level * 8) * spellPower, true);
    else if (u.hero.ability === "stun") {
      target.stun = 1.6 * (this.patch ? limit(execution, 0.7, 1.4) : 1) * (target.bkbUntil > this.clock ? bkbProtection(this.patch) : 1);
      this.damage(u, target, u.damage * spellPower, true);
    } else if (u.hero.ability === "area") {
      for (const e of this.units)
        if (this.canTarget(u, e) && distance(e, target) < 90)
          this.damage(u, e, u.damage * 1.35 * spellPower, true);
    } else
      for (const ally of this.units)
        if (
          ally.kind === "hero" &&
          !ally.dead &&
          ally.team === u.team &&
          distance(ally, u) < 200
        ) {
          u.healing += Math.max(0, Math.min(ally.max - ally.hp, (90 + u.level * 12) * spellPower));
          ally.hp = Math.min(
            ally.max,
            ally.hp + (90 + u.level * 12) * spellPower,
          );
        }
    u.abilityCd = (9 + this.random() * 3) / axisFactor(this.patch, "tempo", 0.18);
  }
  /** Shared, finite camps: clearing costs travel and attack time. No passive farm bonus. */
  private farm(u: Unit): boolean {
    const role = u.player!.role;
    const inWindow = this.time >= 100 && this.time < 480 && (this.time + role * 7) % 60 < 18;
    if (!inWindow || u.hp < u.max * 0.6 || this.nearest(u, 220)) { u.farmCamp = undefined; return false; }
    let camp = this.camps.find(c => c.id === u.farmCamp && c.readyAt <= this.time);
    if (!camp) {
      const available = this.camps.filter(c => c.readyAt <= this.time && !this.units.some(a => a !== u && !a.dead && a.farmCamp === c.id));
      camp = available.sort((a,b) => distance(u,a) - distance(u,b))[0];
      if (!camp || distance(u,camp) > 380) return false;
      u.farmCamp = camp.id;
    }
    if (distance(u,camp) > 40) this.move(u,camp.x,camp.y);
    else if (u.cd <= 0) {
      u.cd = u.rate;
      camp.hp -= u.damage * (0.8 + (u.player!.skills.farming ?? 50) / 100);
      u.hp = Math.max(1, u.hp - 12);
      if (camp.hp <= 0) {
        u.gold += 95 * (0.8 + (u.player!.skills.farming ?? 50) / 250) * axisFactor(this.patch, "economy", 0.25) * this.talents(u).resources;
        u.lastHits += 3;
        u.neutralLastHits += 3;
        this.gainXp(u,90);
        camp.hp = 450;
        camp.readyAt = this.time + 10;
        u.farmCamp = undefined;
      }
    }
    return true;
  }
  get clock() { return Math.round(this.time * GAME_CLOCK); }
  private item(id:ItemId) { return this.itemTable.get(id)!; }
  private heroes(side?: Side) { return this.units.filter(u => u.kind === "hero" && (side === undefined || u.team === side)); }
  private staff(side: Side) { return this.config.patchObservers?.[side]?.staffIds ?? oppositionStaff(this.config.teams[side]); }
  /** Shared local sight. Orders never inspect enemy inventory, builds or plans. */
  private visibleEnemies(side: Side) {
    if(this.sightCache[side])return this.sightCache[side]!;
    const observers = this.units.filter(u => u.team === side && !u.dead && u.wait <= 0 && u.kind !== "base");
    return this.sightCache[side] = this.heroes((1 - side) as Side).filter(e => !e.dead && observers.some(a => distance(a, e) <= (a.kind === "hero" ? 205 + (a.player!.skills.vision ?? 50) * .65 : 160)));
  }
  private buildFor(u: Unit) { return automaticBuild(u.hero!, u.player!.role, this.preparations[u.team].builds[u.player!.role]); }
  private nextItem(u: Unit) { return u.itemPriority ?? this.buildFor(u).find(id => !u.purchasedItems.includes(id)); }
  private shop() {
    for (const u of this.heroes()) {
      const id = this.nextItem(u);
      if (!id) continue;
      const item = this.item(id);
      const disposable = u.inventory.find(i => ["bracer", "wraith", "null", "wand"].includes(i));
      const sale = u.inventory.length >= 6 && disposable ? Math.floor(this.item(disposable).cost / 2) : 0;
      if (u.gold - u.spent + sale < item.cost || (u.inventory.length >= 6 && !disposable)) continue;
      if (sale && disposable) {
        u.inventory.splice(u.inventory.indexOf(disposable), 1); u.spent -= sale;
        this.itemEvents.push({ time: this.clock, playerId: u.player!.id, item: disposable, kind: "sale", gold: sale });
      }
      u.spent += item.cost; u.inventory.push(id); u.purchasedItems.push(id);
      this.itemEvents.push({ time: this.clock, playerId: u.player!.id, item: id, kind: "purchase", gold: item.cost });
      if (u.itemPriority === id) {
        u.itemPriority = undefined;
        this.logPlay(u.team, id === "bkb" ? "buy-bkb" : "buy-rapier", "completed", `${u.player!.name} purchased ${item.name} with match gold.`, u.itemPrioritySource ?? "bot");
      }
      const old = u.max; this.recalculate(u); u.hp = Math.min(u.max, u.hp + Math.max(0, u.max - old));
    }
  }
  private useItems(u: Unit) {
    const ready = (id: ItemId) => u.inventory.includes(id) && (u.itemCooldowns[id] ?? 0) <= this.clock;
    if (ready("wand") && u.hp < u.max * .55) { u.hp = Math.min(u.max, u.hp + 55); u.itemCooldowns.wand = this.clock + 45; }
    if (ready("mek")) {
      const allies = this.heroes(u.team).filter(a => !a.dead && distance(a,u) < 190 && a.hp < a.max * .65);
      if (allies.length >= 2) {
        for (const a of allies) { const heal = Math.min(a.max - a.hp, 95); a.hp += heal; u.healing += heal; }
        u.itemCooldowns.mek = this.clock + 70;
      }
    }
    if (ready("bkb") && u.hp < u.max * .9 && this.visibleEnemies(u.team).some(e => distance(e,u) < 190)) {
      u.bkbUntil = this.clock + (this.patch && this.patch.year >= 2023 ? 8 : 9); u.itemCooldowns.bkb = this.clock + 90;
    }
    if (u.retreat && ready("force") && this.clock - u.lastDamagedAt < 8) {
      this.displace(u, {x:BASES[u.team][0],y:BASES[u.team][1]}, 65); u.itemCooldowns.force = this.clock + 45;
    }
    for (const drop of [...this.droppedItems]) if (distance(u,drop) < 35 && u.inventory.length < 6 && !u.inventory.includes(drop.item)) {
      u.inventory.push(drop.item); this.droppedItems = this.droppedItems.filter(d => d.id !== drop.id);
      this.itemEvents.push({ time:this.clock, playerId:u.player!.id, item:drop.item, kind:"pickup", gold:0 });
      if(u.itemPriority===drop.item){this.logPlay(u.team,"buy-rapier","completed",`${u.player!.name} recovered Divine Rapier from the ground.`,u.itemPrioritySource);u.itemPriority=undefined;}
      this.recalculate(u);
    }
  }
  private displace(u: Unit, point: {x:number;y:number}, max: number) {
    const d = distance(u,point); if (!d) return;
    const f = Math.min(max,d) / d; u.x += (point.x-u.x)*f; u.y += (point.y-u.y)*f;
  }
  private logPlay(side: Side, strategyId: string, status: TacticalEvent["status"], message: string, source: "manager" | "bot" = this.plays[side]?.source ?? "bot") {
    this.tacticalEvents.push({time:this.clock,side,strategyId,source,status,message});
  }
  private participants(side: Side, strategy: Strategy) {
    return this.heroes(side).filter(u => strategy.roles.includes(u.player!.role) && !u.dead && !u.retreat && u.hp >= u.max * .5);
  }
  strategyReason(side: Side, order: TacticalOrder): string | null {
    if (this.winner !== null) return "Map complete";
    const strategy = strategyById(order.strategyId);
    if (!strategy || !strategy.phases.includes(phaseAt(this.clock))) return "Unavailable in this phase";
    if (!this.preparations[side].slots[phaseAt(this.clock)].includes(strategy.id)) return "Not equipped in this phase’s quick slots";
    if (!strategyUnlocked(strategy,this.config.players[side],this.staff(side))) return "Requires specialist staff or a qualifying player trait";
    const cooldown = this.playCooldowns[side][strategy.id] ?? 0;
    if (cooldown > this.clock) return `Ready in ${Math.ceil(cooldown-this.clock)}s`;
    if (strategy.kind === "item") {
      const u = this.heroes(side).find(h => h.player!.id === order.targetPlayerId) ?? (!order.targetPlayerId ? this.heroes(side).find(h => h.player!.role === 0) : undefined);
      if (!u) return "Choose a player on your team";
      if (u.inventory.includes(strategy.item!)) return "Player already owns this item";
      if (u.itemPriority === strategy.item) return "Already saving for this item";
      if (u.inventory.length >= 6 && !u.inventory.some(id => ["bracer","wraith","null","wand"].includes(id))) return "Inventory full; no starter item to replace";
      return null;
    }
    if (this.plays[side]) return "Finish or cancel the current team movement";
    const members = this.participants(side,strategy);
    if (members.length !== strategy.roles.length) return "Required players must be alive, recovered and not retreating";
    if (strategy.kind === "roshan" && this.roshan.respawnAt > this.clock) return `Roshan returns in ${this.roshan.respawnAt-this.clock}s`;
    if (strategy.id.startsWith("push-") && !this.units.some(u => u.kind === "tower" && u.team !== side && u.lane === strategy.lane && !u.dead)) return "Both towers in this lane are already destroyed";
    if (strategy.kind === "protect" && !this.heroes(side).some(u => u.player!.role === 0 && !u.dead)) return "Carry is dead";
    return null;
  }
  issueOrder(side: Side, order: TacticalOrder, source: "manager" | "bot" = "manager") {
    const reason = this.strategyReason(side,order); if (reason) return {accepted:false,reason};
    const strategy = strategyById(order.strategyId)!;
    if (strategy.kind === "item") {
      const u = this.heroes(side).find(h => h.player!.id === order.targetPlayerId) ?? this.heroes(side).find(h => h.player!.role === 0)!;
      u.itemPriority = strategy.item; u.itemPrioritySource = source; this.playCooldowns[side][strategy.id] = this.clock + 30;
      this.logPlay(side,strategy.id,"called",`${u.player!.name} is saving for ${this.item(strategy.item!).name}; the normal build waits.`,source);
      return {accepted:true,reason:null};
    }
    const members = this.participants(side,strategy);
    let lane = strategy.lane ?? 1;
    if (strategy.id === "help-losing") lane = [0,2].sort((a,b) => this.lanePressure(side,b) - this.lanePressure(side,a))[0];
    if (strategy.id === "split-push") {
      const seen = this.visibleEnemies(side);
      lane = [0,1,2].sort((a,b) => seen.filter(e=>e.homeLane===a).length - seen.filter(e=>e.homeLane===b).length)[0];
    }
    if (strategy.id === "high-ground") lane = [0,1,2].sort((a,b) => this.units.filter(u=>u.team!==side&&u.kind==="tower"&&!u.dead&&u.lane===a).length-this.units.filter(u=>u.team!==side&&u.kind==="tower"&&!u.dead&&u.lane===b).length)[0];
    const target = strategy.kind === "push" ? this.units.filter(u => u.team !== side && u.kind === "tower" && u.lane === lane && !u.dead).sort((a,b)=>distance(a,{x:BASES[side][0],y:BASES[side][1]})-distance(b,{x:BASES[side][0],y:BASES[side][1]}))[0]
      ?? this.units.find(u => u.team !== side && u.kind === "base") : undefined;
    const lead = members.find(u=>u.player!.role===2) ?? members[0];
    this.plays[side] = {id:++this.playSerial,strategyId:strategy.id,side,source,participants:members.map(u=>u.id),targetLane:lane,targetUnit:target?.id,
      stage:"assembling",startedAt:this.clock,expiresAt:this.clock+(strategy.kind==="gank"?150:strategy.kind==="protect"?90:300),
      baselineInvolvement:members.reduce((n,u)=>n+u.kills+u.assists,0),rally:{x:lead.x,y:lead.y}};
    for(const u of members)u.farmCamp=undefined;
    this.logPlay(side,strategy.id,"called",`${strategy.name}: ${members.map(u=>u.player!.name).join(", ")} assembling.`,source);
    return {accepted:true,reason:null};
  }
  cancelOrder(side: Side) {
    const play = this.plays[side]; if (!play) return;
    this.logPlay(side,play.strategyId,"cancelled","Manager cancelled the movement; players resume normal duties.");
    this.playCooldowns[side][play.strategyId] = this.clock+45; this.plays[side]=undefined;
  }
  cancelItemPriority(side: Side, playerId: string) {
    const u = this.heroes(side).find(h=>h.player!.id===playerId); if (!u?.itemPriority) return;
    this.logPlay(side,u.itemPriority==="bkb"?"buy-bkb":"buy-rapier","cancelled",`${u.player!.name} resumes the normal item build.`,"manager"); u.itemPriority=undefined;
  }
  private lanePressure(side: Side, lane: number) {
    return this.heroes(side).filter(u=>u.homeLane===lane).reduce((n,u)=>n+u.deaths*3-u.kills,0)
      + this.units.filter(u=>u.kind==="tower"&&u.team===side&&u.lane===lane&&u.dead).length*4;
  }
  private endPlay(side: Side, success: boolean, message: string) {
    const play=this.plays[side]!;
    this.logPlay(side,play.strategyId,success?"completed":"abandoned",message);
    this.playCooldowns[side][play.strategyId]=this.clock+90; this.plays[side]=undefined;
  }
  private updatePlans() {
    for (const side of [0,1] as Side[]) {
      const play = this.plays[side];
      if (play) {
        const strategy = strategyById(play.strategyId)!;
        const members = this.heroes(side).filter(u=>play.participants.includes(u.id));
        const available=members.filter(u=>!u.dead&&!u.retreat);
        const target=this.units.find(u=>u.id===play.targetUnit);
        if (strategy.kind==="push"&&target?.dead) this.endPlay(side,true,"Target building destroyed. Players resume their lanes.");
        else if (strategy.kind==="gank"&&members.reduce((n,u)=>n+u.kills+u.assists,0)>play.baselineInvolvement) this.endPlay(side,true,"The rotation contributed to a hero kill. Players return to normal duties.");
        else if (strategy.kind==="protect"&&this.heroes(side).some(u=>u.player!.role===0&&u.dead)) this.endPlay(side,false,"Carry died; the escort has ended.");
        else if (available.length < Math.ceil(members.length*.6)) this.endPlay(side,false,"Too many participants died or needed to retreat. Regrouping.");
        else if (this.clock>=play.expiresAt) this.endPlay(side,strategy.kind==="protect",strategy.kind==="protect"?"Escort completed. Supports resume normal duties.":"No safe conversion before the play expired. Farm and travel time were spent.");
        else if (play.stage==="assembling") {
          const avg = members.reduce((n,u)=>n+(u.player!.skills.teamfights??50),0)/members.length;
          const ready = this.clock-play.startedAt>=8+(100-avg)*.12 && (available.every(u=>distance(u,play.rally)<135)||this.clock-play.startedAt>=40);
          if(ready){play.stage="moving";this.logPlay(side,play.strategyId,"moving","Players are rotating toward the objective.");}
        }
      }
      if (this.clock<this.nextDecision[side]) continue;
      const avg=this.config.players[side].reduce((n,p)=>n+(p.skills.intuition??50),0)/5;
      this.nextDecision[side]=this.clock+55+(100-avg)*.25;
      // Autonomous teams can only choose their own equipped, unlocked calls.
      const choices=this.preparations[side].slots[phaseAt(this.clock)].map(strategyById).filter((s):s is Strategy=>!!s);
      const healthy=this.heroes(side).filter(u=>!u.dead&&!u.retreat&&u.hp>u.max*.65);
      const seen=this.visibleEnemies(side);
      const ranked=choices.map(s=>({s,weight:s.kind==="item"?1:s.kind==="roshan"?healthy.length===5&&!seen.some(e=>distance(e,this.roshan)<220)?7:0:s.kind==="gank"?seen.some(e=>e.homeLane===(s.lane??1))?5:1:s.kind==="protect"?seen.some(e=>this.heroes(side).some(u=>u.player!.role===0&&distance(e,u)<250))?7:1:healthy.length>=3?4:0})).sort((a,b)=>b.weight-a.weight);
      for(const {s,weight} of ranked) {
        if(!weight)continue;
        const base=this.units.find(u=>u.kind==="base"&&u.team===side)!;
        const target=s.kind==="item"?this.heroes(side).filter(u=>!u.inventory.includes(s.item!)&&!u.itemPriority&&u.player!.role<=1&&
          (s.item==="bkb"?(u.deaths>=2||u.hp<u.max*.65)&&this.clock-u.lastDamagedAt<90
            :u.player!.role===0&&this.clock>=2700&&base.hp<base.max*.5&&!u.dead&&healthy.length>=3))
          .sort((a,b)=>b.deaths-a.deaths||a.player!.role-b.player!.role)[0]:undefined;
        if(s.kind==="item"&&!target)continue;
        if(this.issueOrder(side,{strategyId:s.id,targetPlayerId:target?.player!.id},"bot").accepted)break;
      }
    }
  }
  private tacticalAction(u: Unit): boolean {
    const play=this.plays[u.team]; if(!play?.participants.includes(u.id))return false;
    const strategy=strategyById(play.strategyId)!;
    const seen=this.visibleEnemies(u.team).filter(e=>distance(e,u)<230);
    const friends=this.heroes(u.team).filter(a=>!a.dead&&distance(a,u)<230);
    if(seen.length>friends.length+1&&(u.player!.skills.intuition??50)>=25){u.retreat=true;u.regroupUntil=this.clock+12;return false;}
    // Local threats interrupt movement; generic combat below resolves the fight.
    if(this.nearest(u,u.range+55)?.kind==="hero")return false;
    let point=play.rally;
    if(play.stage!=="assembling") {
      const target=this.units.find(a=>a.id===play.targetUnit);
      if(strategy.kind==="roshan")point=this.roshan;
      else if(strategy.kind==="protect")point=this.heroes(u.team).find(a=>a.player!.role===0)!;
      else if(target) {
        const wave=this.units.filter(c=>c.kind==="creep"&&c.team===u.team&&!c.dead&&c.lane===play.targetLane&&c.wait<=0).sort((a,b)=>distance(a,target)-distance(b,target))[0];
        point=wave&&distance(wave,target)>190?wave:target;
      }else {
        const enemy=seen.filter(e=>e.homeLane===play.targetLane).sort((a,b)=>distance(a,u)-distance(b,u))[0];
        const ally=this.heroes(u.team).find(a=>a.homeLane===play.targetLane&&!play.participants.includes(a.id)&&!a.dead);
        const fallback=this.lanePoint(play.targetLane,u.team?.55:.45);
        point=enemy??ally??{x:fallback[0],y:fallback[1]};
      }
    }
    if(strategy.kind==="roshan"&&play.stage!=="assembling"&&distance(u,this.roshan)<115) {
      if(this.roshan.respawnAt>this.clock){this.endPlay(u.team,false,"Roshan is unavailable. Returning to normal duties.");return false;}
      if(seen.length)return false;
      if(play.stage!=="engaging"){play.stage="engaging";this.logPlay(u.team,play.strategyId,"engaging","The team is attacking Roshan. The pit can be contested.");}
      if(u.cd<=0){u.cd=u.rate;this.roshan.hp-=u.damage*.8;this.roshanDamagedAt=this.clock;}
      if(this.roshanAttackAt<=this.time){this.roshanAttackAt=this.time+1.2;u.hp-=55+this.clock/180;u.lastDamagedAt=this.clock;if(u.hp<=0)this.die(u,u,true);}
      if(this.roshan.hp<=0) {
        this.roshan.kills[u.team]++;this.roshan.respawnAt=this.clock+480;
        const nearby=this.heroes(u.team).filter(a=>!a.dead&&distance(a,this.roshan)<180);
        for(const a of this.heroes(u.team))a.gold+=150;
        const holder=nearby.sort((a,b)=>a.player!.role-b.player!.role)[0];if(holder)holder.aegisUntil=this.clock+300;
        this.endPlay(u.team,true,`Roshan defeated. Team gold awarded${holder?`; ${holder.player!.name} holds Aegis for five minutes`:""}.`);
      }
      return true;
    }
    const near=distance(u,point);
    if(near<160&&play.stage==="moving") {play.stage="engaging";this.logPlay(u.team,play.strategyId,"engaging","Players reached the target area; looking for a safe engagement.");}
    if(near<Math.max(60,u.range))return false;
    if(u.inventory.includes("blink")&&(u.itemCooldowns.blink??0)<=this.clock&&this.clock-u.lastDamagedAt>12&&near>200) {
      this.displace(u,point,90);u.itemCooldowns.blink=this.clock+30;
    }
    this.move(u,point.x,point.y);return true;
  }
  tacticalSnapshot(side: Side, targetPlayerId?: string): TacticalSnapshot {
    const phase=phaseAt(this.clock);
    return {phase,slots:this.preparations[side].slots[phase].map(strategyId=>({strategyId,reason:this.strategyReason(side,{strategyId,targetPlayerId})})),
      ...(this.plays[side]?{active:structuredClone(this.plays[side])}:{}),events:this.tacticalEvents.filter(e=>e.side===side).slice(-8),
      itemTargets:this.heroes(side).filter(u=>u.itemPriority).map(u=>({playerId:u.player!.id,item:u.itemPriority!}))};
  }
  step() {
    if (this.winner !== null) return; // Team zero is a valid winner.
    this.time += DT;
    this.sightCache = [undefined, undefined];
    if(!this.roshan.respawnAt&&this.clock-this.roshanDamagedAt>20)this.roshan.hp=Math.min(this.roshan.max,this.roshan.hp+this.roshan.max*.02*DT);
    if(this.roshan.respawnAt&&this.roshan.respawnAt<=this.clock){this.roshan.max=4800+this.clock;this.roshan.hp=this.roshan.max;this.roshan.respawnAt=0;}
    // Two-pit eras: Roshan changes pit with day and night, never mid-fight.
    if(this.mapEra?.roshan.night&&this.clock-this.roshanDamagedAt>20)[this.roshan.x,this.roshan.y]=roshanPit(this.mapEra,this.clock);
    if(this.clock>=this.nextShop){this.nextShop=this.clock+3;this.shop();}
    this.updatePlans();
    if (this.time >= this.nextWave) {
      this.nextWave += 25;
      this.spawn();
    }
    for (const u of this.units) {
      if (this.winner !== null) break;
      if (u.kind === "hero") {
        u.gold +=
          DT * GAME_CLOCK * (0.8 + (u.player?.skills.farming ?? 70) / 100) * axisFactor(this.patch, "economy", 0.25) * this.talents(u).resources;
      }
      if (u.dead) {
        if (u.kind === "hero") {
          u.respawn -= DT;
          if (u.respawn <= 0) {
            u.dead = false;
            u.hp = u.max;
            u.x = u.reviveAt?.[0] ?? BASES[u.team][0];
            u.y = u.reviveAt?.[1] ?? BASES[u.team][1];
            u.reviveAt = undefined;
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
      this.useItems(u);
      u.hp = Math.min(
        u.max,
        u.hp +
          (distance(u, home) < 100 ? u.max * 0.12 : (2 + 0.1 * u.strength) * (u.inventory.includes("heart") && this.clock-u.lastDamagedAt>12?1.3:1)) * DT,
      );
      if (u.hp < u.max * (0.24 + (u.player?.skills.intuition ?? 70) / 1000))
        u.retreat = true;
      if (u.hp > u.max * 0.85 && this.clock >= u.regroupUntil) u.retreat = false;
      const enemies = this.visibleEnemies(u.team).filter(e=>distance(e,u)<220);
      const partners = this.heroes(u.team).filter(a=>!a.dead&&distance(a,u)<220);
      if(enemies.length > partners.length + 1 && (u.player!.skills.intuition??50)>=25) {u.retreat=true;u.regroupUntil=this.clock+12;}
      if (u.retreat) {
        u.farmCamp = undefined;
        this.move(u, home.x, home.y);
        continue;
      }
      const awareness = this.patch ? (this.patch.axes.vision - 50) / 50 * ((u.player?.skills.vision ?? 50) + (u.player?.skills.intuition ?? 50)) / 200 * 65 : 0;
      if(this.tacticalAction(u))continue;
      if (this.camps.length && this.farm(u)) continue;
      let target = this.nearest(u, u.range + 60 + awareness);
      // Players recognize nearby opportunities; farming cores finish an easy
      // last hit, while skirmish skill helps identify a vulnerable visible hero.
      const vulnerable=enemies.filter(e=>distance(e,u)<u.range+45&&e.hp<e.max*(.3+(u.player!.skills.skirmish??50)/500)).sort((a,b)=>a.hp/a.max-b.hp/b.max)[0];
      if(vulnerable)target=vulnerable;
      if(target?.kind==="tower" && !this.units.some(c=>c.kind==="creep"&&c.team===u.team&&!c.dead&&distance(c,target!)<150) && enemies.length) {
        this.move(u,home.x,home.y);continue;
      }
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
        const value = (team: Side) => heroes.filter(u => u.team === team && u.homeLane === hero.homeLane)
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
        inventory: [...u.inventory],
        spendableGold: Math.max(0,Math.floor(u.gold-u.spent)),
        netWorth: Math.max(0,Math.round(u.gold-u.spent+u.inventory.reduce((n,id)=>n+this.item(id).cost,0))),
        ...(this.nextItem(u)?{nextItem:this.nextItem(u)}:{}),
        bkbUntil:u.bkbUntil, aegisUntil:u.aegisUntil,
        neutralDeaths:u.neutralDeaths,
        xp: Math.round(u.totalXp),
        lastHits: u.lastHits,
        heroDamage: Math.round(u.heroDamage),
        buildingDamage: Math.round(u.buildingDamage),
        healing: Math.round(u.healing),
        ...(this.camps.length ? { neutralLastHits: u.neutralLastHits } : {}),
        ...(talentsEnabled(this.patch) ? { talents: Object.fromEntries(Object.entries(u.player!.talents ?? {}).filter(([level]) => u.level >= Number(level))) as TalentPlan } : {}),
        ...(u.laneOutcome ? { laneOutcome: u.laneOutcome } : {}),
      }));
  }
  private capture(final = false) {
    const time = Math.round(this.time * GAME_CLOCK);
    if (this.config.captureTimeline !== false && (final || this.time >= this.nextSample)) {
      if (this.timeline.at(-1)?.time !== time)
        this.timeline.push({
          time,
          gold: [this.resourceTotal(0, "gold"), this.resourceTotal(1, "gold")],
          netWorth: ([0,1] as Side[]).map(side=>this.heroes(side).reduce((n,u)=>n+Math.max(0,Math.round(u.gold-u.spent+u.inventory.reduce((v,id)=>v+this.item(id).cost,0))),0)) as [number,number],
          xp: [
            this.resourceTotal(0, "totalXp"),
            this.resourceTotal(1, "totalXp"),
          ],
        });
      this.nextSample = this.time + 5;
    }
    if (this.config.captureReplay !== false && (final || this.time >= this.nextFrame)) {
      if (this.frames.at(-1)?.time !== time)
        this.frames.push(this.snapshot());
      this.nextFrame = this.time + 3;
    }
  }
  /** Read-only live frame: observing a match never consumes RNG or advances it. */
  snapshot(): ReplayFrame {
    return { time:this.clock,kills:[...this.kills],players:this.score(),roshan:{...this.roshan,hp:Math.max(0,Math.round(this.roshan.hp)),kills:[...this.roshan.kills]},
      droppedItems:this.droppedItems.map(d=>({...d})),
      ...(this.camps.length?{camps:this.camps.map(c=>({...c,readyAt:Math.round(c.readyAt*GAME_CLOCK)}))}:{}),
      units:this.units.filter(u=>u.wait<=0).map(u=>({id:u.id,kind:u.kind,team:u.team,x:Math.round(u.x),y:Math.round(u.y),hp:Math.round(u.hp),max:Math.round(u.max),name:u.hero?.name??u.kind,...(u.hero?{heroId:u.hero.id}:{})})) };
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
      tacticalEvents:this.tacticalEvents.map(e=>({...e})), itemEvents:this.itemEvents.map(e=>({...e})), roshanKills:[...this.roshan.kills],
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
      ...(this.drafted ? { draft: this.drafted } : {}),
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
  const patch = patchById(config.patchId);
  const { bestOf = 3, advantage = [0, 0] } = config.seriesFormat ?? {};
  if (![1, 2, 3, 5, 7].includes(bestOf) || advantage.some(n => !Number.isInteger(n) || n < 0) || (bestOf === 2 && advantage.some(Boolean)))
    throw new Error("Invalid series format");
  const target = Math.floor(bestOf / 2) + 1;
  if (Math.max(...advantage) >= target) throw new Error("Invalid starting advantage");
  const score: [number, number] = [...advantage];
  const games: GameSummary[] = [];
  const frames: ReplayFrame[][] = [];
  while (bestOf === 2 ? games.length < 2 : Math.max(...score) < target) {
    const players = config.players.map(side=>side.map(p=>{
      const heroExperience={...p.heroExperience};
      for(const game of games)for(const row of game.players)if(row.id===p.id)heroExperience[row.heroId]=(heroExperience[row.heroId]??0)+1;
      return {...p,heroExperience};
    })) as BattleConfig["players"];
    const battle = new LaneBattle({...config,players}, games.length);
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
      ...(patch ? { patch: { id: patch.id, name: patch.name, versions: patch.versions } } : {}),
      ...(frontiersEnabled(patch) ? { mapLayout: "frontiers" as const } : {}),
    },
    frames,
  };
}
