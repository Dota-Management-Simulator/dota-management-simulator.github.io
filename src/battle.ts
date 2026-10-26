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
import { geometryForEra } from "./map-geometry";
import { pathsForEra } from "./map-paths";
import type { MapPaths } from "./map-paths";
import { talentBonuses } from "./talents";
import type { TalentPlan } from "./talents";
import { autoDraftMap } from "./draft";
import type { CompletedDraft, DraftPreparation } from "./draft";
import { automaticBuild, bkbProtection, historicalItemKey, itemCatalog, itemForPatch } from "./items";
import type { ItemId, ItemSnapshot, ItemEvent, MatchItem } from "./items";
import { abilityRank, adjustedAbility, combatCatalogue, defaultEconomyRules, heroAbilities, rankValue, special, spellEffects } from "./combat-model";
import type { EconomyRules } from "./combat-model";
import type { AbilityDefinition, SpellCast, SpellState } from "./combat-model";
import { MatchEventLog } from './match-events';
import type { MatchEvent } from './match-events';
import { automaticTactics, normalizeTactics, phaseAt, strategyById, strategyUnlocked } from "./tactics";
import type { ActivePlay, DroppedItem, RoshanState, Strategy, TacticalEvent, TacticalOrder, TacticalPreparation, TacticalSnapshot } from "./tactics";
import { buybackCost, matchRules, terrainHeight, terrainSight } from './match-rules';
import type { CreepType, GlyphState, SiegeEvent } from './match-rules';

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
  attackRange?: number;
  hpRegen?: number; manaRegen?: number;
  teleport?: { charges: number; readyAt: number; endsAt?: number; destination?: string };
  spells?: SpellState[];
  mana?: number;
  maxMana?: number;
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
  denies?: number;
  buybacks?: number;
  buyback?: { cost: number; readyAt: number; reason: string | null };
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
  siegeEvents?: SiegeEvent[];
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
  creepType?: CreepType;
  backdoor?: boolean;
  fortified?: boolean;
  playerId?: string;
  /** Absolute match-clock time from the engine's remaining respawn. */
  respawnAt?: number;
  id: number;
  kind: "hero" | "creep" | "tower" | "base";
  heroId?: string;
  lane?: number;
  tier?: number;
  team: Side;
  x: number;
  y: number;
  hp: number;
  max: number;
  name: string;
}
export interface ReplayFrame {
  glyphs?: [GlyphState, GlyphState];
  siegeEvents?: SiegeEvent[];
  matchEvents?: MatchEvent[];
  spellCasts?: SpellCast[];
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
  attackBoostUntil:number; attackBoostSpeed:number; attackBoostDamage:number; attackBoostHits:number;
  reductionUntil:number; reduction:number; attackStacks:Record<number,{count:number;until:number}>;
  silenceUntil: number; rootUntil: number; armorReduction: number; armorUntil: number;
  recovery: { source: number; key: string; until: number; at: number; heal: number; mana: number }[];
  drain?: { target: number; until: number; at:number; rate: number; range: number };
  tpCharges: number; tpReadyAt: number;
  teleport?: { endsAt: number; target: number; x: number; y: number; label: string };
  summonOwner?: number;
  summonExpires?: number;
  summonName?: string;
  formUntil: number;
  activeRangeUntil: number;
  activeRangeBonus: number;
  corrosionDps: number;
  corrosionDuration: number;
  attackSlowUntil: number;
  attackSlow: number;
  tier?: number;
  creepType?: CreepType;
  backdoorUntil: number;
  protectedDamage: number;
  denies: number;
  buybacks: number;
  buybackReadyAt: number;
  buybackRespawnPenalty: number;
  buybackGoldUntil: number;
  revealedUntil: number;
  spells: { definition: AbilityDefinition; slot: number; readyAt: number; lastCastAt?: number; casts: number }[];
  mana: number;
  maxMana: number;
  shield: number;
  shieldUntil: number;
  slowUntil: number;
  slow: number;
  summonUntil: number;
  buffUntil: number;
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
// with gold, assist attribution, era siege rules, and separate replay capture.
export class LaneBattle {
  private damageOverTime: {source:number;target:number;ability:string;dps:number;until:number;at:number}[] = [];
  private rules: ReturnType<typeof matchRules>;
  private glyphs: [GlyphState, GlyphState];
  private glyphRefreshes: [Set<number>, Set<number>] = [new Set(), new Set()];
  siegeEvents: SiegeEvent[] = [];
  private nextDefense = 0;
  private nextSpawnClock = 0;
  private matchEvents = new MatchEventLog();
  private spellCasts: SpellCast[] = [];
  private economyRules: EconomyRules = defaultEconomyRules;
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
  private lanes = LANES;
  private bases = BASES;
  private mapEra?: MapEra;
  private paths?: MapPaths;
  constructor(
    public config: BattleConfig,
    gameIndex = 0,
  ) {
    this.random = seededRandom(config.seed + gameIndex * 7919);
    this.patch = patchById(config.patchId);
    this.rules = matchRules(this.patch);
    this.economyRules=combatCatalogue(this.patch)?.rules??defaultEconomyRules;
    this.itemTable = new Map(itemCatalog.map(item=>[item.id,itemForPatch(item.id,this.patch)]));
    this.preparations = ([0, 1] as Side[]).map(side => config.tacticalPreparations?.[side] ? normalizeTactics(config.tacticalPreparations[side])
      : automaticTactics(config.players[side], config.patchObservers?.[side]?.staffIds ?? oppositionStaff(config.teams[side]))) as [TacticalPreparation,TacticalPreparation];
    this.glyphs = this.preparations.map(p => ({ auto: p.autoGlyph !== false, activeUntil: 0, creepsUntil: 0, readyAt: this.rules.glyphStartsAt, uses: 0 })) as [GlyphState, GlyphState];

    // Patched maps use that era's terrain and Roshan pit; legacy maps keep open ground.
    if (this.patch) {
      this.mapEra = mapEraForPatch(this.patch); this.paths = pathsForEra(this.mapEra);
      const geometry = geometryForEra(this.mapEra); this.lanes = geometry.lanes; this.bases = geometry.bases;
      [this.roshan.x, this.roshan.y] = roshanPit(this.mapEra, 0);
    }
    this.camps = frontiersEnabled(this.patch) ? createFarmCamps(this.mapEra) : [];
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
      const base = this.bases[team];
      this.add({ team, kind: "base", x: base[0], y: base[1], hp: 4500 });
      for (let lane = 0; lane < 3; lane++)
        for (const fraction of [0.2, 0.4]) {
          const [x, y] = this.mapEra ? geometryForEra(this.mapEra).towers[team][lane][fraction === .4 ? 0 : 1] : this.lanePoint(lane, team ? 1 - fraction : fraction);
          this.add({
            team,
            lane,
            kind: "tower",
            tier: fraction === .4 ? 1 : 2,
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
        const kit = combatCatalogue(this.patch)?.heroes[hero.id];
        if (kit) {
          unit.strength = kit.stats.AttributeBaseStrength ?? unit.strength;
          unit.agility = kit.stats.AttributeBaseAgility ?? unit.agility;
          unit.intelligence = kit.stats.AttributeBaseIntelligence ?? unit.intelligence;
          unit.speed *= (kit.stats.MovementSpeed ?? 300) / 300;
          let slot = 0;
          unit.spells = heroAbilities(hero.id,this.patch).map(definition => ({definition,slot:definition.ultimate || definition.granted ? 0 : slot++,readyAt:0,casts:0}));
          unit.maxMana = 75 + unit.intelligence * 12; unit.mana = unit.maxMana;
        }
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
      backdoorUntil: 0, protectedDamage: 0, denies: 0, buybacks: 0,
      formUntil:0,activeRangeUntil:0,activeRangeBonus:0,corrosionDps:0,corrosionDuration:0,attackSlowUntil:0,attackSlow:0,
      buybackReadyAt: 0, buybackRespawnPenalty: 0, buybackGoldUntil: 0, revealedUntil: 0,
      strength: 0,
      agility: 0,
      intelligence: 0,
      power: 1,
      respawn: 0,
      retreat: false,
      abilityCd: 0,
      spells: [], mana:0, maxMana:0, shield:0, shieldUntil:0, slowUntil:0, slow:0, summonUntil:0, buffUntil:0,
      silenceUntil:0, rootUntil:0, armorReduction:0, armorUntil:0, recovery:[], tpCharges:0, tpReadyAt:0,
      attackBoostUntil:0,attackBoostSpeed:0,attackBoostDamage:0,attackBoostHits:0,reductionUntil:0,reduction:0,attackStacks:{},
      contributions: new Map(),
      inventory: [], purchasedItems: [], spent: 0, itemCooldowns: {}, bkbUntil: 0, aegisUntil: 0, lastDamagedAt: -1000, homeLane: 1, neutralDeaths: 0, regroupUntil:0,
      ...values,
    };
    this.units.push(u);
    return u;
  }
  private lanePoint(lane: number, fraction: number): Point {
    const path = this.lanes[lane];
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
    const stats=combatCatalogue(this.patch)?.heroes[u.hero.id]?.stats;
    const baseDamage=stats ? ((stats.AttackDamageMin??20)+(stats.AttackDamageMax??30))/2 : 25;
    u.damage = (baseDamage + primary + gear.reduce((sum, item) => sum + item.attack, 0)) * u.power * talents.attack;
    u.max = ((200 + u.strength * 22) * u.power + gear.reduce((sum, item) => sum + item.health, 0)) * talents.health;
    if(u.spells.length)u.maxMana=75+u.intelligence*12+gear.reduce((sum,item)=>sum+(item.mana??0),0);
    if(this.rules.enabled)this.updateAttackRange(u);
  }
  private updateAttackRange(u: Unit) {
    if(!u.hero)return;
    const stats=combatCatalogue(this.patch)?.heroes[u.hero.id]?.stats;
    let range=stats?.AttackRange??(u.hero.ranged?600:150);
    for(const state of u.spells)if(state.definition.siege?.kind==='range') {
      const a=adjustedAbility(state.definition,u.hero.id,u.level,u.player?.talents,u.inventory,this.patch);
      range+=rankValue(a.siege!.rangeBonus??[],abilityRank(a,u.level,state.slot));
    }
    if(u.activeRangeUntil>this.clock)range+=u.activeRangeBonus;
    u.range=limit(range*.22,26,350);
  }
  private dot(source:Unit,target:Unit,ability:string,dps:number,duration:number) {
    if(dps<=0||duration<=0)return;
    const effect={source:source.id,target:target.id,ability,dps,until:this.time*GAME_CLOCK+duration,at:this.time*GAME_CLOCK};
    const existing=this.damageOverTime.findIndex(e=>e.source===source.id&&e.target===target.id&&e.ability===ability);
    if(existing>=0)this.damageOverTime[existing]=effect;else this.damageOverTime.push(effect);
  }
  private updateDots() {
    const now=this.time*GAME_CLOCK;
    this.damageOverTime=this.damageOverTime.filter(e=>{
      const target=this.units.find(u=>u.id===e.target),source=this.units.find(u=>u.id===e.source);
      if(!target||target.dead||!source)return false;
      const end=Math.min(now,e.until),elapsed=Math.max(0,end-e.at);
      if(elapsed)this.damage(source,target,e.dps*elapsed,true);
      e.at=end;return e.until>now&&!target.dead;
    });
  }
  private talents(u: Unit) { return talentBonuses(talentsEnabled(this.patch) ? u.player?.talents : undefined, u.level); }
  private addRecovery(target:Unit,source:Unit,key:string,duration:number,heal:number,mana:number) {
    target.recovery=target.recovery.filter(e=>e.key!==key||e.source!==source.id);
    target.recovery.push({source:source.id,key,until:this.time*GAME_CLOCK+duration,at:this.time*GAME_CLOCK,heal,mana});
  }
  private regeneration(u:Unit) {
    if(u.dead)return {hp:0,mana:0};
    const stats=u.hero&&combatCatalogue(this.patch)?.heroes[u.hero.id]?.stats;
    let hp=stats?.StatusHealthRegen??.5;
    let mana=stats?.StatusManaRegen??(this.rules.regenFormula==='attribute-amplified'?.9:0);
    let itemMana=0,itemManaFlat=0;
    for(const id of u.inventory){
      const a=combatCatalogue(this.patch)?.items[historicalItemKey(id)];if(!a)continue;
      if(!['tango','flask','clarity','bottle'].includes(id)){
        hp+=special(a,1,'bonus_health_regen','health_regen');
        const amount=special(a,1,'bonus_mana_regen','mana_regen');
        // 7.06 changed Urn to flat regen before the general 7.07 rework.
        if(this.rules.regenFormula==='legacy-percent'&&id==='urn_of_shadows'&&this.patch&&this.patch.year*10+this.patch.phase>=20172)itemManaFlat+=amount;
        else itemMana+=amount;
      }
    }
    if(this.rules.regenFormula==='attribute-amplified'){
      hp*=1+u.strength*this.rules.strengthRegenAmp;
      mana=(mana+itemMana)*(1+u.intelligence*this.rules.intelligenceRegenAmp);
    }else{
      hp+=u.strength*this.rules.strengthRegen;
      mana+=u.intelligence*this.rules.intelligenceRegen;
      mana=this.rules.regenFormula==='legacy-percent'?mana*(1+itemMana/100)+itemManaFlat:mana+itemMana;
    }
    hp*=.4;
    let auraHp=0,auraMana=0;
    for(const ally of this.heroes(u.team))if(!ally.dead&&distance(ally,u)<240)for(const id of ally.inventory){
      const a=combatCatalogue(this.patch)?.items[historicalItemKey(id)];if(!a)continue;
      auraHp=Math.max(auraHp,special(a,1,'aura_health_regen','health_regen_aura'));
      auraMana=Math.max(auraMana,special(a,1,'aura_mana_regen','mana_regen_aura'));
    }
    hp+=auraHp*.4;mana+=auraMana;
    if(u.inventory.includes('heart')&&this.clock-u.lastDamagedAt>12)hp+=u.max*.004;
    // One nearest living tower aura; overlapping towers do not stack it.
    const towerTier=this.units.filter(v=>v.kind==='tower'&&v.team===u.team&&!v.dead&&distance(v,u)<180).reduce((tier,v)=>Math.max(tier,v.tier??1),0);
    if(towerTier)hp+=this.rules.towerHealthRegen[Math.min(towerTier,2)-1]*.4;
    for(const ally of this.heroes(u.team).filter(v=>!v.dead))for(const state of ally.spells){
      const a=state.definition;if(!a.passive)continue;
      const rank=abilityRank(a,ally.level,state.slot),e=spellEffects(a,rank);
      if(!rank)continue;
      if(a.id==='huskar_berserkers_blood'&&ally===u)hp+=u.strength*special(a,rank,'maximum_health_regen')/100*(1-u.hp/u.max)*.4;
      if(!e.healthRegen&&!e.manaRegen)continue;
      const s=this.spellState(ally,state);if(s.locked)continue;
      const near=distance(u,ally)<240;
      if(a.id==='crystal_maiden_brilliance_aura')mana+=e.manaRegen*(ally===u?(special(a,s.rank,'self_factor')||2):near?(special(a,s.rank,'proximity_bonus_factor')||1):1);
      else if(ally===u||near&&/aura|aura_regen/.test(a.id)){hp+=e.healthRegen*.4;mana+=e.manaRegen;}
    }
    const base={x:this.bases[u.team][0],y:this.bases[u.team][1]};
    if(distance(u,base)<100){hp+=u.max*.02;mana+=u.maxMana*.03;}
    return {hp:Math.max(0,hp),mana:Math.max(0,mana)};
  }
  private recover(u:Unit) {
    const now=this.time*GAME_CLOCK,r=this.regeneration(u);
    u.hp=Math.min(u.max,u.hp+r.hp*DT*GAME_CLOCK);
    u.mana=Math.min(u.maxMana,u.mana+r.mana*DT*GAME_CLOCK);
    u.recovery=u.recovery.filter(e=>{
      const elapsed=Math.max(0,Math.min(now,e.until)-e.at),source=this.units.find(v=>v.id===e.source);
      const heal=Math.min(u.max-u.hp,e.heal*elapsed);u.hp+=heal;if(source)source.healing+=heal;
      u.mana=Math.min(u.maxMana,u.mana+e.mana*elapsed);e.at=now;return e.until>now;
    });
  }
  /** Channels spend a real scroll/mana and can fail; no invulnerable escape. */
  private useTeleport(u:Unit):boolean {
    if(!this.patch)return false;
    const now=this.time*GAME_CLOCK;
    if(u.teleport){
      const target=this.units.find(v=>v.id===u.teleport!.target);
      if(u.stun>0||u.silenceUntil>now||u.rootUntil>now||!target||target.dead){u.teleport=undefined;return false;}
      if(now>=u.teleport.endsAt){u.x=u.teleport.x;u.y=u.teleport.y;u.teleport=undefined;u.farmCamp=undefined;this.sightCache=[undefined,undefined];}
      return true;
    }
    if(!u.tpCharges||u.tpReadyAt>now||u.stun>0||u.silenceUntil>now||u.rootUntil>now||u.drain)return false;
    if(!u.retreat&&this.plays[u.team]?.participants.includes(u.id))return false;
    const a=combatCatalogue(this.patch)?.items.item_tpscroll;if(!a)return false;
    const cost=rankValue(a.mana,1);if(u.mana<cost)return false;
    const home=this.units.find(v=>v.team===u.team&&v.kind==='base'&&!v.dead)!;
    let target:Unit|undefined;
    if(u.retreat&&distance(u,home)>250)target=home;
    else if(distance(u,home)<100&&u.hp>u.max*.85&&u.mana>u.maxMana*.6){
      target=this.units.filter(v=>v.team===u.team&&v.kind==='tower'&&!v.dead&&v.lane===u.homeLane&&distance(v,u)>250
        &&!this.visibleEnemies(u.team).some(e=>distance(e,v)<180)).sort((a,b)=>distance(b,home)-distance(a,home))[0];
    }
    if(!target)return false;
    u.tpCharges--;u.mana-=cost;u.tpReadyAt=now+Math.max(1,rankValue(a.cooldown,1));
    u.teleport={endsAt:now+(rankValue(a.channel??[],1)||3),target:target.id,x:target.x,y:target.y,label:target.kind==='base'?'Fountain':`${['Top','Mid','Bottom'][target.lane]} tower`};
    return true;
  }
  private channelDrain(u:Unit):boolean {
    if(!u.drain)return false;
    const target=this.units.find(v=>v.id===u.drain!.target),now=this.time*GAME_CLOCK;
    if(!target||target.dead||u.stun>0||u.silenceUntil>now||target.bkbUntil>now||distance(u,target)>u.drain.range){u.drain=undefined;return false;}
    const amount=Math.min(target.mana,u.drain.rate*Math.max(0,Math.min(now,u.drain.until)-u.drain.at));target.mana-=amount;u.mana=Math.min(u.maxMana,u.mana+amount);u.drain.at=now;
    if(!target.mana||now>=u.drain.until)u.drain=undefined;
    return true;
  }
  glyphReason(side: Side): string | null {
    if (!this.rules.enabled) return 'Glyph is unavailable in this legacy match';
    if (this.winner !== null) return 'The match has ended';
    if (this.glyphs[side].activeUntil > this.clock) return 'Glyph is already active';
    if (this.glyphs[side].readyAt > this.clock) return `Glyph ready in ${matchClock(this.glyphs[side].readyAt - this.clock)}`;
    return null;
  }
  setAutoGlyph(side: Side, enabled: boolean) {
    if (typeof enabled !== 'boolean' || this.winner !== null) return;
    this.glyphs[side].auto = enabled;
  }
  useGlyph(side: Side, automatic = false): string | null {
    const reason = this.glyphReason(side);
    if (reason) return reason;
    const glyph = this.glyphs[side];
    glyph.activeUntil = this.clock + this.rules.glyphDuration;
    glyph.creepsUntil = this.clock + this.rules.glyphCreepDuration;
    glyph.readyAt = this.clock + this.rules.glyphCooldown;
    glyph.uses++;
    this.siegeEvents.push({ time: this.clock, team: side, kind: 'glyph', automatic,
      message: `${automatic ? 'Auto Glyph' : 'Glyph'} activated: buildings protected for ${this.rules.glyphDuration}s.` });
    this.recordDecisionFrame();
    return null;
  }
  private fortified(u: Unit) {
    return this.rules.enabled && (u.kind === 'creep' && u.summonOwner==null ? this.glyphs[u.team].creepsUntil : u.kind === 'tower' || u.kind === 'base' ? this.glyphs[u.team].activeUntil : 0) > this.clock;
  }
  private protectedBuilding(u: Unit) {
    return this.rules.enabled && (u.kind === 'base' || u.kind === 'tower' && u.tier === 2) && this.clock >= u.backdoorUntil;
  }
  private updateBackdoor() {
    if (!this.rules.enabled) return;
    for (const building of this.units) {
      if (building.dead || !(building.kind === 'base' || building.kind === 'tower' && building.tier === 2)) continue;
      const wave = this.units.some(c => c.kind === 'creep' && c.summonOwner==null && !c.dead && c.wait <= 0 && c.team !== building.team && distance(c, building) <= (building.kind === 'base' ? 240 : 150));
      if (wave) {
        building.backdoorUntil = this.time * GAME_CLOCK + this.rules.backdoorGrace;
        building.protectedDamage = 0;
      } else if (this.protectedBuilding(building) && building.protectedDamage > 0) {
        // Heal only damage taken under protection, never erase a previous legal push.
        const healed = Math.min(building.protectedDamage, (building.kind==='base'?this.rules.ancientBackdoorHeal:this.rules.backdoorHeal) * .4 * DT * GAME_CLOCK, building.max - building.hp);
        building.hp += healed; building.protectedDamage -= healed;
      }
    }
  }
  buybackReason(side: Side, playerId: string): string | null {
    const u = this.heroes(side).find(u => u.player!.id === playerId);
    if (!u) return 'Choose a player on your team';
    if (!this.rules.enabled) return 'Buyback is unavailable in this legacy match';
    if (this.winner !== null) return 'The match has ended';
    if (!u.dead) return 'Player is alive';
    if (u.reviveAt) return 'Aegis resurrection is already in progress';
    if (u.buybackReadyAt > this.clock) return `Buyback ready in ${matchClock(u.buybackReadyAt - this.clock)}`;
    const cost = buybackCost(this.rules, u.level, this.netWorth(u), this.clock);
    return u.gold - u.spent < cost ? `Needs ${Math.ceil(cost - (u.gold - u.spent))} more gold` : null;
  }
  buyback(side: Side, playerId: string, automatic = false): string | null {
    const reason = this.buybackReason(side, playerId);
    if (reason) return reason;
    const u = this.heroes(side).find(u => u.player!.id === playerId)!;
    const cost = buybackCost(this.rules, u.level, this.netWorth(u), this.clock);
    u.spent += cost; u.buybacks++;
    u.buybackReadyAt = this.clock + this.rules.buybackCooldown;
    u.buybackRespawnPenalty = this.rules.buybackPenalty === 'flat' ? 25 : this.rules.buybackPenalty === 'remaining' ? u.respawn * GAME_CLOCK * .25 : 0;
    u.buybackGoldUntil = this.clock + u.respawn * GAME_CLOCK;
    u.dead = false; u.respawn = 0; u.hp = u.max; u.mana = u.maxMana;
    [u.x, u.y] = this.bases[side];
    u.retreat = false; u.stun = 0; u.slowUntil = 0; u.shield = 0; u.revealedUntil = 0;
    u.contributions.clear(); this.sightCache = [undefined, undefined];
    this.siegeEvents.push({ time: this.clock, team: side, kind: 'buyback', playerId, automatic,
      message: `${u.player!.name} bought back for ${cost} gold${automatic ? ' to defend the base' : ''}.` });
    this.recordDecisionFrame();
    return null;
  }
  private addGold(u: Unit, value: number, farm = false) {
    if (this.rules.enabled && this.clock < u.buybackGoldUntil) {
      if (this.rules.buybackGoldPenalty === 'all') value *= .4;
      else if (farm && this.rules.buybackGoldPenalty === 'farm') value = 0;
    }
    u.gold += value;
  }
  private defendObjectives() {
    if (!this.rules.enabled || this.clock < this.nextDefense) return;
    this.nextDefense = this.clock + 1;
    for (const side of [0, 1] as Side[]) {
      const buildings = this.units.filter(u => u.team === side && !u.dead && (u.kind === 'tower' || u.kind === 'base'));
      if (this.glyphs[side].auto && !this.glyphReason(side)) {
        const threat = buildings.find(b => this.clock - b.lastDamagedAt <= 3 && b.hp < b.max * (b.kind === 'base' ? .85 : .4));
        if (threat) this.useGlyph(side, true);
      }
      const base = buildings.find(b => b.kind === 'base');
      if (!base || base.hp > base.max * .65 || this.clock - base.lastDamagedAt > 5) continue;
      if (this.heroes(side).filter(u => !u.dead && distance(u, base) < 240).length >= 3) continue;
      const dead = this.heroes(side).filter(u => u.dead && u.respawn * GAME_CLOCK > 12 && !this.buybackReason(side, u.player!.id))
        .sort((a, b) => a.player!.role - b.player!.role)[0];
      if (dead) this.buyback(side, dead.player!.id, true);
    }
  }
  private spawn() {
    if (this.rules.enabled) {
      const clock = this.nextSpawnClock, melee = 3 + Math.min(3, Math.floor(clock / this.rules.meleeInterval));
      const siege = clock > 0 && clock % this.rules.siegeInterval === 0;
      const growth = Math.min(12, Math.floor(clock / 450));
      for (const team of [0, 1] as Side[]) for (let lane = 0; lane < 3; lane++) {
        const route = this.lanes[lane].map(p => [...p] as Point); if (team) route.reverse();
        const extraMid = this.patch!.year === 2017 && this.patch!.phase === 2 && lane === 1 && clock < 900 ? 1 : 0;
        const types: CreepType[] = [...Array<CreepType>(melee + extraMid).fill('melee'), ...Array<CreepType>(clock >= this.rules.extraRangedAt ? 2 : 1).fill('ranged'), ...Array<CreepType>(siege ? clock >= this.rules.extraSiegeAt ? 2 : 1 : 0).fill('siege')];
        types.forEach((creepType, i) => this.add({ kind: 'creep', creepType, team, lane, x: route[0][0], y: route[0][1],
          hp: creepType === 'siege' ? this.rules.siegeHealth : creepType === 'melee' ? 220 + growth * 12 : 140 + growth * 8,
          damage: creepType === 'siege' ? 18 + growth * 2 : (creepType === 'melee' ? 14 : 18) + growth * 2,
          range: creepType === 'siege' ? 115 : creepType === 'ranged' ? 90 : 22,
          rate: creepType === 'siege' ? 2.7 : .9, speed: 45, route, wait: i * .15 }));
      }
      this.nextSpawnClock += 30;
      return;
    }
    const siege = 1 + Math.max(0, this.time - 240) / 200;
    for (const team of [0, 1] as Side[])
      for (let lane = 0; lane < 3; lane++) {
        const route = this.lanes[lane].map((p) => [...p] as Point);
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
    if (this.rules.enabled && e.kind === 'hero' && !this.visibleEnemies(u.team).includes(e)) return false;
    if (this.rules.enabled && e.kind === 'tower' && e.tier === 2 && this.units.some(t => t.kind === 'tower' && t.team === e.team && t.lane === e.lane && t.tier === 1 && !t.dead)) return false;
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
    if(u.rootUntil>this.clock||u.teleport||u.drain)return;
    if (u.kind === "hero" && this.paths) [x, y] = this.paths.waypoint(u.x, u.y, x, y);
    const d = Math.hypot(x - u.x, y - u.y);
    if (d < 1) return;
    const gearSpeed = u.inventory.reduce((sum, id) => sum + (this.item(id).speed ?? 0), 0);
    const step = Math.min(d, u.speed * (1 + gearSpeed) * this.talents(u).speed * (u.slowUntil>this.clock?1-u.slow:1) * DT);
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
      const stats=u.hero && combatCatalogue(this.patch)?.heroes[u.hero.id]?.stats;
      u.strength += stats?.AttributeStrengthGain ?? (u.hero?.attribute === "Strength" ? 3.3 : 2);
      u.agility += stats?.AttributeAgilityGain ?? (u.hero?.attribute === "Agility" ? 3.2 : 1.8);
      u.intelligence += stats?.AttributeIntelligenceGain ?? (u.hero?.attribute === "Intelligence" ? 3.2 : 1.5);
      const old = u.max;
      this.recalculate(u);
      u.hp = Math.min(u.max, u.hp + u.max - old + u.max * 0.08);
    }
  }
  private creepXp(u: Unit) {
    if (!this.rules.enabled) return 55;
    return u.creepType === 'siege' ? 88 : u.creepType === 'ranged' ? this.patch!.year >= 2018 ? 69 : 90 : this.patch!.year >= 2018 ? 57 : this.patch!.year === 2017 && this.patch!.phase === 2 ? 40 : 45;
  }
  private tryDeny(u: Unit, target?: Unit) {
    if (!this.rules.enabled || u.cd > 0 || (u.player!.skills.laning ?? 50) < 20) return false;
    if (target?.kind === 'hero' && target.hp < target.max * .35) return false;
    if (target?.kind === 'creep' && target.hp <= u.damage) return false; // Prefer securing a last hit.
    const creep = this.units.find(c => c.kind === 'creep' && c.team === u.team && !c.dead && c.wait <= 0 && !this.fortified(c)
      && c.hp <= c.max * .5 && c.hp <= u.damage * (.7 + (u.player!.skills.laning ?? 50) / 150) && distance(c, u) <= u.range + 6
      && this.visibleEnemies(u.team).some(e => distance(e, c) < 350));
    if (!creep) return false;
    u.cd = u.rate * 100 / (100 + u.agility); u.denies++;
    creep.dead = true; creep.hp = 0; this.sightCache = [undefined, undefined];
    const xp = this.creepXp(creep);
    const enemies = this.heroes((1 - u.team) as Side).filter(h => !h.dead && distance(h, creep) < 350);
    for (const h of enemies) this.gainXp(h, (this.rules.flatDenyXp ? h.hero!.ranged && this.patch!.year < 2014 ? 18 : 36 : xp * this.rules.denyEnemyXp) / enemies.length);
    const friends = this.heroes(u.team).filter(h => !h.dead && distance(h, creep) < 350);
    for (const h of friends) if (this.rules.denyOwnXp) this.gainXp(h, xp * this.rules.denyOwnXp / friends.length);
    if (this.rules.denyGold) this.addGold(u, this.economyRules.creepBase * this.rules.denyGold, true);
    return true;
  }
  private damage(source: Unit, target: Unit, value: number, spell = false, execution = false) {
    if (target.dead || this.winner !== null) return;
    if (this.fortified(target)) return;
    if (this.rules.enabled && (target.kind==='tower'||target.kind==='base') && !this.canTarget(source,target)) return;
    if (this.rules.enabled && spell && target.creepType === 'siege') {
      if (this.patch!.year < 2016) return; // Pre-6.85 catapults were spell immune.
      value *= .2;
    }
    if (target.kind === "hero") {
      if(!execution&&target.reductionUntil>this.clock)value*=1-target.reduction;
      for(const state of target.spells){
        if(execution||state.definition.id!=='tidehunter_kraken_shell'||spell)continue;
        const rank=abilityRank(state.definition,target.level,state.slot);if(rank)value=Math.max(0,value-special(state.definition,rank,'damage_reduction')*.42);
      }
      if (!execution&&spell && target.bkbUntil > this.clock) value *= bkbProtection(this.patch);
      if (!execution&&!spell && target.inventory.includes("butterfly")) value *= 1 - (this.item("butterfly").evasion ?? 0);
      target.lastDamagedAt = this.clock;
      if(!execution&&target.shieldUntil>this.clock && target.shield>0){const absorbed=Math.min(target.shield,value);target.shield-=absorbed;value-=absorbed;}
      if(value>0&&source.team!==target.team&&source.kind==='hero')target.recovery=target.recovery.filter(e=>!['item_flask','item_clarity'].includes(e.key));
    }
    if (target.kind === "tower" || target.kind === "base") value *= this.talents(source).buildings;
    if (this.patch && source.player && source.hero && (target.kind === "tower" || target.kind === "base")) {
      const pushing = source.player.skills.pushing ?? 50;
      value *= axisFactor(this.patch, "objectives", 0.3) * (0.9 + pushing / 500);
      const partners = this.units.filter(u => u.kind === "hero" && !u.dead && u.team === source.team && u !== source && distance(u, source) < 200).length;
      if (partners === 0) value *= axisFactor(this.patch, "splitpush", heroTags(source.hero).includes("Pushing") ? 0.35 : 0.18);
    }
    if (this.protectedBuilding(target)) value *= 1 - this.rules.backdoorReduction;
    // Count effective damage, excluding overkill. Telemetry never consumes RNG.
    const effective = Math.max(0, Math.min(target.hp, value));
    if (this.protectedBuilding(target)) target.protectedDamage += effective;
    if (effective > 0) target.lastDamagedAt = this.clock;
    const credited=source.summonOwner!=null?this.units.find(u=>u.id===source.summonOwner):source;
    if (credited?.kind === "hero") {
      if (target.kind === "hero") credited.heroDamage += effective;
      if (target.kind === "tower" || target.kind === "base") credited.buildingDamage += effective;
    }
    target.hp -= value;
    if (credited?.kind === "hero" && target.kind === "hero")
      target.contributions.set(credited.id, this.time);
    if (target.hp <= 0) this.die(target, source);
  }
  private die(target: Unit, source: Unit, neutral = false) {
    if (target.dead) return;
    target.dead = true;
    target.hp = 0;
    this.sightCache = [undefined, undefined];
    if (target.kind === "base") {
      this.winner = (1 - target.team) as Side;
      this.matchEvents.add({time:this.clock,kind:'victory',team:this.winner});
      return;
    }
    const rewardSource=source.summonOwner!=null?this.units.find(u=>u.id===source.summonOwner)??source:source;
    const allies = this.units.filter(
      (u) => u.kind === "hero" && u.team === source.team,
    );
    if (target.kind === "hero") {
      target.farmCamp = undefined;
      target.teleport=undefined;target.drain=undefined;target.recovery=[];
      target.silenceUntil=0;target.rootUntil=0;target.armorUntil=0;
      target.attackBoostUntil=0;target.reductionUntil=0;target.attackStacks={};
      if (target.aegisUntil > this.clock) {
        target.aegisUntil = 0; target.respawn = 5 / GAME_CLOCK; target.reviveAt = [target.x, target.y];
        this.matchEvents.add({time:this.clock,kind:'reincarnation',team:target.team,victimId:target.player!.id,respawnAt:this.time*GAME_CLOCK+target.respawn*GAME_CLOCK});
        return;
      }
      if (target.inventory.includes("rapier")) {
        target.inventory = target.inventory.filter(id => id !== "rapier");
        this.recalculate(target);
        this.droppedItems.push({ id: ++this.playSerial, x: target.x, y: target.y, item: "rapier" });
        this.itemEvents.push({ time: this.clock, playerId: target.player!.id, item: "rapier", kind: "drop", gold: 0 });
      }
      target.deaths++;
      target.respawn = 6 + target.level * 2 + (this.rules.enabled ? target.buybackRespawnPenalty / GAME_CLOCK : 0);
      target.buybackRespawnPenalty = 0;
      if(neutral){target.neutralDeaths++;this.matchEvents.death(this.clock,target.team,target.player!.id,undefined,true,this.time*GAME_CLOCK+target.respawn*GAME_CLOCK);target.contributions.clear();return;}
      this.kills[source.team]++;
      const involved = allies.filter(
        (u) => this.time - (target.contributions.get(u.id) ?? -1000) <= 12,
      );
      const killer =
        rewardSource.kind === "hero"
          ? rewardSource
          : involved.sort(
              (a, b) =>
                (target.contributions.get(b.id) || 0) -
                (target.contributions.get(a.id) || 0),
            )[0];
      if (killer) {
        killer.kills++;
        this.addGold(killer, (200 + target.level * 10) * this.economyRules.bountyMultiplier * this.talents(killer).resources);
      }
      this.matchEvents.death(this.clock,source.team,target.player!.id,killer?.player?.id,false,this.time*GAME_CLOCK+target.respawn*GAME_CLOCK);
      for (const hero of involved)
        if (hero !== killer) {
          hero.assists++;
          const worth=this.netWorth(target);
          const assist=this.economyRules.assistNetWorth?10+(50+worth*.037)/Math.max(1,involved.length):75;
          this.addGold(hero, assist * this.economyRules.bountyMultiplier * this.talents(hero).resources);
        }
      target.contributions.clear();
    } else if (target.kind === "tower") {
      if (this.rules.enabled) {
        const tier = target.tier ?? 1;
        const refresh = this.rules.glyphRefresh === 'tier1' ? tier === 1
          : this.rules.glyphRefresh === 'tiers' ? tier <= 3 && !this.glyphRefreshes[target.team].has(tier)
          : this.rules.glyphRefresh === 'barracks' ? tier <= 2 && !this.glyphRefreshes[target.team].has(tier) : false;
        if (refresh) {
          this.glyphRefreshes[target.team].add(tier);
          this.glyphs[target.team].readyAt = Math.min(this.glyphs[target.team].readyAt, this.clock + 1);
          this.siegeEvents.push({ time: this.clock, team: target.team, kind: 'glyph-refresh', message: `Glyph refreshes after losing a Tier ${tier} tower.` });
        }
      }
      this.matchEvents.add({time:this.clock,kind:'tower',team:source.team,target:`${target.team===0?'Radiant':'Dire'} ${['top','middle','bottom'][target.lane]} tower`});
      for (const hero of allies) this.addGold(hero, 150 * this.economyRules.bountyMultiplier * this.talents(hero).resources);
      if (rewardSource.kind === "hero") this.addGold(rewardSource, 75 * this.economyRules.bountyMultiplier * this.talents(rewardSource).resources);
    } else {
      const farmer =
        rewardSource.kind === "hero"
          ? rewardSource
          : this.rules.enabled ? undefined : allies
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
        const upgrades=Math.floor(this.clock/450),rules=this.economyRules;
        const bounty=this.patch?rules.creepBase+upgrades*(rules.meleeGrowth*.75+rules.rangedGrowth*.25):35;
        this.addGold(farmer, (target.creepType === 'siege' ? bounty * 1.5 : bounty) * rules.bountyMultiplier * (0.8 + (farmer.player?.skills.farming ?? 70) / 250) * axisFactor(this.patch, "economy", 0.25) * this.talents(farmer).resources, true);
      }
    }
    const xp =
      target.kind === "hero"
        ? 180 + target.level * 30
        : target.kind === "tower"
          ? 200
          : this.creepXp(target);
    const nearby = allies.filter((u) => !u.dead && distance(u, target) < 350);
    for (const h of nearby) this.gainXp(h, xp / Math.max(1, nearby.length));
  }
  private attack(u: Unit, target: Unit) {
    if (u.cd > 0) return;
    const boosted=u.attackBoostUntil>this.clock&&u.attackBoostHits!==0;
    const blood=u.spells.find(s=>s.definition.id==='huskar_berserkers_blood');
    const frenzy=blood?special(blood.definition,abilityRank(blood.definition,u.level,blood.slot),'maximum_attack_speed')*(1-u.hp/u.max)*.5:0;
    u.cd = (u.rate * 100) / (100 + u.agility+frenzy+(boosted?u.attackBoostSpeed:0)+u.inventory.reduce((n,id)=>n+(this.item(id).attackSpeed??0),0)) / (u.attackSlowUntil>this.clock?1-u.attackSlow:1);
    if (this.rules.enabled) {
      if (u.kind === 'hero') { u.revealedUntil = this.clock + 3; this.sightCache[(1 - u.team) as Side] = undefined; }
      const ranged = u.hero?.ranged || u.formUntil>this.clock || u.creepType === 'ranged' || u.creepType === 'siege' || u.summonOwner!=null;
      if (ranged && terrainHeight(this.mapEra, u.x, u.y) < terrainHeight(this.mapEra, target.x, target.y) && this.random() < this.rules.uphillMiss) return;
    }
    const armor = target.agility / 6+target.inventory.reduce((n,id)=>n+(this.item(id).armor??0),0) - (target.armorUntil>this.clock?target.armorReduction:0);
    let value = u.damage * (1 - (0.06 * armor) / (1 + 0.06 * Math.abs(armor)));
    if (this.rules.enabled && u.creepType === 'siege' && (target.kind === 'tower' || target.kind === 'base')) value *= this.rules.siegeMultiplier;
    if (u.player && target.kind === "creep")
      value *= 0.7 + (u.player.skills.laning ?? 70) / 150;
    if (this.patch && u.player && this.time < 100 && (target.kind === "hero" || target.kind === "creep"))
      value *= 1 + (this.patch.axes.laning - 50) / 50 * (u.player.skills.laning ?? 50) / 100 * 0.3;
    if(u.summonUntil>this.clock)value*=1.18;
    if(u.buffUntil>this.clock)value*=1.12;
    if(boosted){value*=1+u.attackBoostDamage;if(u.attackBoostHits>0)u.attackBoostHits--;}
    let lifesteal=0;
    // Learned attack passives and purchased items keep distinct effects.
    for(const state of u.spells)if(state.definition.passive && !(state.definition.siege&& (target.kind==='tower'||target.kind==='base'))){
      const rank=abilityRank(state.definition,u.level,state.slot); if(!rank)continue;
      const effects=spellEffects(state.definition,rank);
      if(this.spellState(u,state).locked||state.definition.id==='axe_counter_helix')continue;
      if(effects.critChance&&this.random()<effects.critChance)value*=Math.max(1,effects.critMultiplier);
      lifesteal=Math.max(lifesteal,effects.lifesteal);
      if(effects.stackingDamage&&target.kind!=='tower'&&target.kind!=='base'){
        const previous=target.attackStacks[u.id],count=previous&&previous.until>this.clock?Math.min(20,previous.count+1):1;
        target.attackStacks[u.id]={count,until:this.clock+(special(state.definition,rank,'bonus_reset_time')||10)};value+=effects.stackingDamage*.42*count;
      }
      if(state.definition.id==='faceless_void_time_lock'&&target.bkbUntil<=this.clock&&this.random()<special(state.definition,rank,'chance_pct')/100){target.stun=Math.max(target.stun,rankValue(state.definition.duration,rank)/GAME_CLOCK);value+=special(state.definition,rank,'bonus_damage')*.42;}
      if(effects.manaBurn&&target.kind==='hero'&&target.bkbUntil<=this.clock){const burned=Math.min(target.mana,effects.manaBurn);target.mana-=burned;value+=burned*.25;}
      else value+=Math.min(u.damage*.2,effects.damage*.12);
    }
    for(const id of u.inventory){
      const a=combatCatalogue(this.patch)?.items[historicalItemKey(id)];if(!a)continue;
      const e=spellEffects(a,1);lifesteal=Math.max(lifesteal,e.lifesteal);
      if(e.critChance&&this.random()<e.critChance)value*=Math.max(1,e.critMultiplier);
      if(e.armorReduction){target.armorReduction=e.armorReduction;target.armorUntil=this.clock+7;}
      if(e.manaBurn&&target.kind==='hero'&&target.bkbUntil<=this.clock){const burned=Math.min(target.mana,e.manaBurn);target.mana-=burned;value+=burned*.25;}
    }
    const orb=u.spells.find(s=>s.definition.id==='obsidian_destroyer_arcane_orb');
    if(orb&&target.kind!=='tower'&&target.kind!=='base'&&u.silenceUntil<=this.clock){
      const rank=abilityRank(orb.definition,u.level,orb.slot),manaCost=u.mana*special(orb.definition,rank,'mana_cost_percentage')/100;
      if(rank&&u.mana>=manaCost&&u.mana>10){value+=u.mana*special(orb.definition,rank,'mana_pool_damage_pct')/100*.42;u.mana-=manaCost;}
    }
    const before=target.hp;
    this.damage(u, target, value);
    if(lifesteal&&target.kind!=='tower'&&target.kind!=='base')u.hp=Math.min(u.max,u.hp+Math.min(before,Math.max(0,before-target.hp))*lifesteal);
    const helix=target.spells.find(s=>s.definition.id==='axe_counter_helix');
    if(helix&&!target.dead&&helix.readyAt<=this.clock){
      const rank=abilityRank(helix.definition,target.level,helix.slot);
      if(rank&&this.random()<Math.min(.5,(special(helix.definition,rank,'trigger_chance')||20)/100)){
        helix.readyAt=this.clock+.6;
        for(const enemy of this.units.filter(v=>v.team!==target.team&&!v.dead&&v.kind!=='tower'&&v.kind!=='base'&&distance(v,target)<90))this.damage(target,enemy,spellEffects(helix.definition,rank).damage,true);
      }
    }
    if(u.formUntil>this.clock&&!target.dead)this.dot(u,target,'dragon_corrosion',u.corrosionDps,u.corrosionDuration);
  }
  private spellState(u: Unit, state: Unit['spells'][number]): SpellState {
    const upgrades=u.purchasedItems.includes('shard')?[...u.inventory,'shard']:u.inventory;
    const a=adjustedAbility(state.definition,u.hero!.id,u.level,u.player?.talents,upgrades,this.patch),rank=abilityRank(a,u.level,state.slot);
    const locked=!rank ? 'Not learned' : a.granted && !upgrades.includes(a.granted) ? `Requires Aghanim’s ${a.granted}` : undefined;
    return {id:a.id,rank,readyAt:state.readyAt,cooldown:rankValue(a.cooldown,rank),manaCost:rankValue(a.mana,rank),lastCastAt:state.lastCastAt,casts:state.casts,passive:a.passive,...(locked?{locked}:{})};
  }
  private recordSiegeSpell(u:Unit,state:Unit['spells'][number],a:AbilityDefinition,s:SpellState,target:Unit) {
    const now=this.time*GAME_CLOCK;
    u.mana-=s.manaCost;state.readyAt=now+Math.max(1.2,s.cooldown);state.lastCastAt=now;state.casts++;
    this.spellCasts.push({time:now,playerId:u.player!.id,heroId:u.hero!.id,team:u.team,abilityId:a.id,targetId:target.id});
    this.spellCasts=this.spellCasts.filter(c=>c.time>now-30);
  }
  private castSiege(u:Unit,state:Unit['spells'][number],a:AbilityDefinition,s:SpellState,enemy?:Unit) {
    const effect=a.siege;if(!effect||!this.rules.enabled)return false;
    const now=this.time*GAME_CLOCK;
    const castRange=Math.max(u.range,rankValue(a.range,s.rank)*.22)+(effect.kind==='blast'?rankValue(effect.radius??[],s.rank)*.22:0);
    const building=this.units.filter(v=>(v.kind==='tower'||v.kind==='base')&&this.canTarget(u,v)&&!this.protectedBuilding(v)&&!this.fortified(v)&&distance(u,v)<=castRange)
      .sort((a,b)=>distance(a,u)-distance(b,u))[0];
    const target=building??enemy;
    if(!target||target.dead)return false;
    if(effect.kind==='range') {
      const bonus=rankValue(effect.activeRangeBonus??[],s.rank);if(!bonus||u.activeRangeUntil>now)return false;
      u.activeRangeUntil=now+rankValue(a.duration,s.rank);u.activeRangeBonus=bonus;this.updateAttackRange(u);
      this.recordSiegeSpell(u,state,a,s,u);return true;
    }
    if(effect.kind==='form') {
      if(u.formUntil>now||distance(u,target)>300)return false;
      const rank=s.rank+(u.inventory.includes('scepter')?1:0);
      u.formUntil=now+rankValue(a.duration,s.rank);u.activeRangeUntil=u.formUntil;u.activeRangeBonus=rankValue(effect.rangeBonus??[],rank);
      u.corrosionDps=rankValue(effect.dot??[],rank)*.42;u.corrosionDuration=rankValue(effect.dotDuration??[],rank);
      this.updateAttackRange(u);this.recordSiegeSpell(u,state,a,s,u);return true;
    }
    if(effect.kind==='wards') {
      if(distance(u,target)>castRange)return false;
      const count=Math.min(3,rankValue(effect.wardCount??[],s.rank)),damage=rankValue(effect.wardDamage??[],s.rank)*.42;
      if(!count||!damage)return false;
      for(let i=0;i<count;i++)this.add({kind:'creep',team:u.team,lane:u.lane,x:target.x+(i-1)*13,y:target.y+15,hp:160,damage,
        rate:1.5/GAME_CLOCK,range:(rankValue(effect.wardRange??[],s.rank)||650)*.22,
        summonOwner:u.id,summonExpires:now+rankValue(a.duration,s.rank),summonName:'Serpent Ward'});
      this.recordSiegeSpell(u,state,a,s,target);return true;
    }
    if(!building)return false;
    const power=(.7+(u.player?.skills.teamfights??50)/200)*this.talents(u).spells*(1+u.inventory.reduce((n,id)=>n+(this.item(id).spells??0),0));
    if(effect.kind==='blast')this.damage(u,building,spellEffects(a,s.rank).damage*power*(effect.buildingMultiplier??.5),true);
    if(effect.kind==='fire') {
      this.dot(u,building,a.id,spellEffects(a,s.rank).damage*power*(effect.buildingMultiplier??1),rankValue(a.duration,s.rank));
      building.attackSlow=Math.min(.75,rankValue(effect.attackSlow??[],s.rank));building.attackSlowUntil=now+rankValue(a.duration,s.rank);
    }
    this.recordSiegeSpell(u,state,a,s,building);return true;
  }
  private castNamed(u: Unit, enemy?: Unit) {
    if(u.dead||u.silenceUntil>this.clock||u.drain||u.teleport)return;
    const now=this.time*GAME_CLOCK;
    for(const state of u.spells){
      const upgrades=u.purchasedItems.includes('shard')?[...u.inventory,'shard']:u.inventory;
      const a=adjustedAbility(state.definition,u.hero!.id,u.level,u.player?.talents,upgrades,this.patch),s=this.spellState(u,state);
      if(s.locked||state.readyAt>now||u.mana<s.manaCost)continue;
      if(a.id==='obsidian_destroyer_arcane_orb'||a.toggle&&u.buffUntil>now)continue;
      if(a.siege&&this.castSiege(u,state,a,s,enemy))break;
      if(a.passive||a.siege?.kind==='form'||a.siege?.kind==='range')continue;
      const effects=spellEffects(a,s.rank);
      const allies=this.heroes(u.team).filter(v=>!v.dead && (a.id==='chen_hand_of_god'||distance(v,u)<effects.range));
      const hurt=allies.filter(v=>v.hp<v.max*.8).sort((a,b)=>a.hp/a.max-b.hp/b.max);
      const restorative=!a.summon&&(effects.heal>0||effects.shield>0||(effects.healthRegen>0&&!a.toggle)||a.ally);
      const target=restorative?hurt[0]:enemy;
      if(!target || !restorative && (target.kind==='tower'||target.kind==='base'||target.dead||distance(u,target)>effects.range))continue;
      if(a.ultimate && !restorative && target.kind!=='hero')continue;
      if(a.id==='axe_culling_blade'&&target.hp>effects.damage)continue;
      if(a.id==='antimage_mana_void'&&target.maxMana-target.mana<target.maxMana*.25)continue;
      const partners=this.heroes(u.team).filter(v=>v!==u&&!v.dead&&distance(v,u)<240).length;
      const teamfight=this.patch?1+(this.patch.axes.teamfight-50)/50*Math.min(1,partners/2)*.3:1;
      const execution=(.7+(u.player?.skills.teamfights??50)/200)*this.talents(u).spells*teamfight;
      const gear=1+u.inventory.reduce((n,id)=>n+(this.item(id).spells??0),0);
      // Only sourced supported modifiers apply; buying an upgrade does not
      // give every associated spell an unrelated damage/healing multiplier.
      const power=execution*gear;
      let applied=false;
      if(effects.attackSpeed||effects.attackBonus||effects.damageReduction){
        u.attackBoostSpeed=effects.attackSpeed;u.attackBoostDamage=effects.attackBonus;u.attackBoostUntil=now+effects.duration;
        u.attackBoostHits=special(a,s.rank,'max_attacks')||-1;u.reduction=effects.damageReduction;u.reductionUntil=now+effects.duration;
        applied=true;
      }else if(restorative){
        for(const ally of (a.area||a.id==='chen_hand_of_god'?hurt:[target])){
          const heal=Math.min(ally.max-ally.hp,effects.heal*power);ally.hp+=heal;u.healing+=heal;
          if(effects.shield>0){ally.shield=effects.shield*power;ally.shieldUntil=now+effects.duration;}
          if(effects.healthRegen>0)this.addRecovery(ally,u,a.id,effects.duration,effects.healthRegen*.4*power,0);
          if(a.ally&&!effects.heal&&!effects.shield)ally.buffUntil=now+effects.duration;
        }
        applied=true;
      }else{
        const targets=a.area?this.units.filter(v=>{
          if(!this.canTarget(u,v)||v.kind==='base'||v.kind==='tower')return false;
          if(!a.line)return distance(v,target)<100;
          const dx=target.x-u.x,dy=target.y-u.y,length=Math.hypot(dx,dy)||1;
          const along=((v.x-u.x)*dx+(v.y-u.y)*dy)/length,across=Math.abs((v.x-u.x)*dy-(v.y-u.y)*dx)/length;
          const width=Math.max(20,...Object.entries(a.properties??{}).filter(([k])=>/width_(?:initial|end)/.test(k)).map(([,values])=>rankValue(values,s.rank)*.22));
          return along>=0&&along<=effects.range&&across<=width;
        }):[target];
        for(const victim of targets){
          const damage=a.id==='antimage_mana_void'?(target.maxMana-target.mana)*(special(a,s.rank,'mana_void_damage_per_mana')||.8)*.42:effects.damage*power;
          if(a.damageOverTime)this.dot(u,victim,a.id,damage,effects.duration);
          else if(damage>0)this.damage(u,victim,a.id==='axe_culling_blade'?Math.max(damage,victim.hp):damage,true,a.id==='axe_culling_blade');
          if(effects.control>0)victim.stun=Math.max(victim.stun,effects.control/GAME_CLOCK*(victim.bkbUntil>now?bkbProtection(this.patch):1));
          if(effects.slow>0){victim.slow=effects.slow;victim.slowUntil=now+effects.duration;}
          if(victim.bkbUntil<=now){
            victim.silenceUntil=Math.max(victim.silenceUntil,now+effects.silence);
            victim.rootUntil=Math.max(victim.rootUntil,now+effects.root);
            if(effects.armorReduction){victim.armorReduction=effects.armorReduction;victim.armorUntil=now+effects.duration;}
            if(effects.manaBurn&&!a.channel?.some(v=>v>0))victim.mana=Math.max(0,victim.mana-effects.manaBurn);
          }
          if(a.id==='pudge_meat_hook'&&!victim.dead)this.displace(victim,u,Math.max(0,distance(victim,u)-35));
        }
        if(a.summon)u.summonUntil=now+effects.duration;
        if(a.id==='lion_mana_drain'&&target.mana>0)u.drain={target:target.id,until:now+(rankValue(a.channel??[],s.rank)||5),at:now,rate:effects.manaBurn,range:effects.range*1.25};
        if(a.mobility&&u.rootUntil<=now)this.displace(u,u.retreat?{x:this.bases[u.team][0],y:this.bases[u.team][1]}:target,Math.min(100,distance(u,target)*.65));
        if(!effects.damage&&!effects.control&&!effects.slow&&!a.summon&&!a.mobility)u.buffUntil=now+effects.duration;
        applied=true;
      }
      if(applied){
        u.mana-=s.manaCost;state.readyAt=now+Math.max(1.2,s.cooldown);state.lastCastAt=now;state.casts++;
        if(a.id==='axe_culling_blade'&&target.dead)state.readyAt=now;
        this.spellCasts.push({time:now,playerId:u.player!.id,heroId:u.hero!.id,team:u.team,abilityId:a.id,targetId:target.id});
        // Bounded recent event window is enough for both live and replay HUDs.
        this.spellCasts=this.spellCasts.filter(c=>c.time>now-30);
        break;
      }
    }
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
        this.addGold(u, (95+Math.floor(this.clock/450)*this.economyRules.neutralGrowth*3) * this.economyRules.bountyMultiplier * (0.8 + (u.player!.skills.farming ?? 50) / 250) * axisFactor(this.patch, "economy", 0.25) * this.talents(u).resources, true);
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
    const observers = this.units.filter(u => u.team === side && !u.dead && u.wait <= 0 && (this.rules.enabled || u.kind !== "base"));
    return this.sightCache[side] = this.heroes((1 - side) as Side).filter(e => !e.dead && observers.some(a => distance(a, e) <= (a.kind === "hero" ? 205 + (a.player!.skills.vision ?? 50) * .65 : a.kind === 'base' ? 240 : 160)
      && (!this.rules.enabled || e.revealedUntil > this.clock || terrainSight(this.mapEra, a, e))));
  }
  private buildFor(u: Unit) {
    const build=automaticBuild(u.hero!,u.player!.role,this.preparations[u.team].builds[u.player!.role]);
    const items=combatCatalogue(this.patch)?.items;
    if(items?.item_aghanims_shard&&u.spells.some(s=>s.definition.shard||s.definition.granted==='shard'))build.splice(3,0,'shard');
    return build.filter(id=>!items||!!items[historicalItemKey(id)]);
  }
  private nextItem(u: Unit) { return u.itemPriority ?? this.buildFor(u).find(id => !u.purchasedItems.includes(id)); }
  private netWorth(u: Unit) {
    return Math.max(0,Math.round(u.gold-u.spent+u.inventory.reduce((sum,id)=>sum+this.item(id).cost,0)+u.tpCharges*(this.itemTable.get('tpscroll')?.cost??0)+(u.purchasedItems.includes('shard')?this.item('shard').cost:0)));
  }
  private itemPriorityReason(unit: Unit, id: ItemId) {
    if(!this.itemTable.has(id)||this.patch&&!combatCatalogue(this.patch)?.items[historicalItemKey(id)])return 'Item unavailable on this patch';
    if(unit.inventory.includes(id)||id==='shard'&&unit.purchasedItems.includes(id))return 'Player already owns this item';
    if(unit.itemPriority===id)return 'Already saving for this item';
    if(id==='tpscroll')return unit.tpCharges>=1?'Player already carries a TP scroll':null;
    if(id!=='shard'&&unit.inventory.length>=6&&!unit.inventory.some(id=>['bracer','wraith','null','wand'].includes(id)))return 'Inventory full; no starter item to replace';
    return null;
  }
  private purchaseTargets(side: Side, playerId?: string) {
    const own=this.heroes(side);
    return playerId==='all'?own:own.filter(u=>playerId?u.player!.id===playerId:u.player!.role===0);
  }
  prioritizeItem(side: Side, playerId: string, id: ItemId) {
    const targets=this.purchaseTargets(side,playerId);
    if(!targets.length)return 'Choose a player on your team';
    const eligible=targets.filter(u=>!this.itemPriorityReason(u,id));
    if(!eligible.length)return playerId==='all'?'No eligible players: everyone owns this item, is already saving for it, or cannot buy it.':this.itemPriorityReason(targets[0],id)!;
    for(const unit of eligible){
      unit.itemPriority=id;unit.itemPrioritySource='manager';
      this.logPlay(side,`buy-${id}`,'called',`${unit.player!.name} is saving for ${this.item(id).name}.`,'manager');
    }
    return undefined;
  }
  private shop() {
    for (const u of this.heroes()) {
      if (this.rules.enabled && u.dead) continue; // Preserve the opportunity to buy back.
      const scroll=combatCatalogue(this.patch)?.items.item_tpscroll;
      const atHome=distance(u,{x:this.bases[u.team][0],y:this.bases[u.team][1]})<100;
      if(scroll&&!u.tpCharges&&(atHome||u.itemPriority==='tpscroll')&&u.gold-u.spent>=scroll.cost){
        u.spent+=scroll.cost;u.tpCharges++;
        this.itemEvents.push({time:this.clock,playerId:u.player!.id,item:'tpscroll',kind:'purchase',gold:scroll.cost});
        if(u.itemPriority==='tpscroll')u.itemPriority=undefined;
      }
      const id = this.nextItem(u);
      if(id==='tpscroll')continue;
      if (!id) continue;
      const item = this.item(id);
      // Autonomous late-game spending keeps one buyback when the base is exposed.
      const exposed = this.rules.enabled && this.clock >= 1800 && !this.itemPriorityReason(u, id) && u.itemPrioritySource !== 'manager'
        && [0, 1, 2].some(lane => !this.units.some(t => t.team === u.team && t.kind === 'tower' && t.lane === lane && !t.dead));
      if (exposed && u.gold - u.spent - item.cost < buybackCost(this.rules, u.level, this.netWorth(u), this.clock)) continue;
      const disposable = u.inventory.find(i => ["bracer", "wraith", "null", "wand"].includes(i));
      const sale = id!=='shard' && u.inventory.length >= 6 && disposable ? Math.floor(this.item(disposable).cost / 2) : 0;
      if (u.gold - u.spent + sale < item.cost || (id!=='shard' && u.inventory.length >= 6 && !disposable)) continue;
      if (sale && disposable) {
        u.inventory.splice(u.inventory.indexOf(disposable), 1); u.spent -= sale;
        this.itemEvents.push({ time: this.clock, playerId: u.player!.id, item: disposable, kind: "sale", gold: sale });
      }
      u.spent += item.cost; if(id!=='shard')u.inventory.push(id); u.purchasedItems.push(id);
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
    if (ready("wand") && (u.hp < u.max * .55||u.mana<u.maxMana*.25)) { u.hp = Math.min(u.max, u.hp + 55);u.mana=Math.min(u.maxMana,u.mana+55); u.itemCooldowns.wand = this.clock + 45; }
    if (ready("mek")) {
      const allies = this.heroes(u.team).filter(a => !a.dead && distance(a,u) < 190 && a.hp < a.max * .65);
      if (allies.length >= 2) {
        for (const a of allies) { const heal = Math.min(a.max - a.hp, 95); a.hp += heal; u.healing += heal; }
        u.itemCooldowns.mek = this.clock + 70;
      }
    }
    if (ready("bkb") && u.hp < u.max * .9 && this.visibleEnemies(u.team).some(e => distance(e,u) < 190)) {
      u.silenceUntil=0;u.rootUntil=0;u.slowUntil=0;
      u.bkbUntil = this.clock + (this.patch && this.patch.year >= 2023 ? 8 : 9); u.itemCooldowns.bkb = this.clock + 90;
    }
    if (u.retreat && ready("force") && this.clock - u.lastDamagedAt < 8) {
      this.displace(u, {x:this.bases[u.team][0],y:this.bases[u.team][1]}, 65); u.itemCooldowns.force = this.clock + 45;
    }
    // Other historical purchases use their sourced active damage/heal/control.
    // The original named items above keep their dedicated tactical behavior.
    for(const id of u.inventory.filter(id=>!['wand','mek','bkb','force','blink','scepter','shard'].includes(id))){
      const a=combatCatalogue(this.patch)?.items[historicalItemKey(id)];
      if(!a||a.passive||!ready(id)||u.mana<rankValue(a.mana,1))continue;
      const effect=spellEffects(a,1),enemy=this.nearest(u,effect.range);
      let used=false;
      if(['tango','flask','clarity'].includes(id)){
        const needed=id==='clarity'?u.mana<u.maxMana*.6:u.hp<u.max*.65;
        if(needed&&!u.recovery.some(e=>e.key===a.id)&&(id==='tango'||this.clock-u.lastDamagedAt>3)){
          this.addRecovery(u,u,a.id,effect.duration,effect.healthRegen*.4,effect.manaRegen);
          u.inventory.splice(u.inventory.indexOf(id),1);used=true;
        }
      }else if(id==='arcane_boots'&&u.mana<u.maxMana*.6){
        for(const ally of this.heroes(u.team).filter(v=>!v.dead&&distance(v,u)<240))ally.mana=Math.min(ally.maxMana,ally.mana+special(a,1,'replenish_amount'));
        used=true;
      }else if(effect.heal>0&&u.hp<u.max*.6){const heal=Math.min(u.max-u.hp,effect.heal);u.hp+=heal;u.healing+=heal;used=true;}
      else if(enemy?.kind==='hero'&&(effect.damage>0||effect.control>0||effect.silence>0||effect.root>0||effect.slow>0)){
        if(a.damageOverTime)this.dot(u,enemy,a.id,effect.damage,effect.duration);else if(effect.damage>0)this.damage(u,enemy,effect.damage,true);
        if(enemy.bkbUntil<=this.clock){enemy.stun=Math.max(enemy.stun,effect.control/GAME_CLOCK);enemy.silenceUntil=Math.max(enemy.silenceUntil,this.clock+effect.silence);enemy.rootUntil=Math.max(enemy.rootUntil,this.clock+effect.root);if(effect.slow){enemy.slow=effect.slow;enemy.slowUntil=this.clock+effect.duration;}}
        used=true;
      }else if(enemy?.kind==='hero'&&!effect.lifesteal&&!effect.critChance&&!effect.armorReduction&&!effect.manaBurn){u.buffUntil=this.clock+effect.duration;used=true;}
      if(used){u.mana-=rankValue(a.mana,1);u.itemCooldowns[id]=this.clock+Math.max(5,rankValue(a.cooldown,1));}
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
  strategyReason(side: Side, order: TacticalOrder, source: 'manager' | 'bot' = 'manager'): string | null {
    if (this.winner !== null) return "Map complete";
    const strategy = strategyById(order.strategyId);
    if (!strategy || !strategy.phases.includes(phaseAt(this.clock))) return "Unavailable in this phase";
    if (!this.preparations[side].slots[phaseAt(this.clock)].includes(strategy.id)) return "Not equipped in this phase’s quick slots";
    if (!strategyUnlocked(strategy,this.config.players[side],this.staff(side))) return "Requires specialist staff or a qualifying player trait";
    const cooldown = this.playCooldowns[side][strategy.id] ?? 0;
    if (cooldown > this.clock) return `Ready in ${Math.ceil(cooldown-this.clock)}s`;
    if (strategy.kind === "item") {
      const targets=this.purchaseTargets(side,order.targetPlayerId);
      if(!targets.length)return "Choose a player on your team";
      if(order.targetPlayerId==='all')return targets.some(u=>!this.itemPriorityReason(u,strategy.item!))?null:"No eligible players: everyone owns this item, is already saving for it, or cannot buy it.";
      return this.itemPriorityReason(targets[0],strategy.item!);
    }
    if (this.plays[side]) return "Finish or cancel the current team movement";
    if (strategy.kind === "roshan" && this.roshan.respawnAt > this.clock) return `Roshan returns in ${this.roshan.respawnAt-this.clock}s`;
    const members = this.participants(side,strategy);
    const flexiblePush = this.rules.enabled && source === 'bot' && strategy.kind === 'push' && strategy.roles.length >= 4;
    if (members.length < (flexiblePush ? Math.ceil(strategy.roles.length * .6) : strategy.roles.length)) return "Required players must be alive, recovered and not retreating";
    if (strategy.id.startsWith("push-") && !this.units.some(u => u.kind === "tower" && u.team !== side && u.lane === strategy.lane && !u.dead)) return "Both towers in this lane are already destroyed";
    if (strategy.kind === "protect" && !this.heroes(side).some(u => u.player!.role === 0 && !u.dead)) return "Carry is dead";
    return null;
  }
  issueOrder(side: Side, order: TacticalOrder, source: "manager" | "bot" = "manager") {
    const reason = this.strategyReason(side,order,source); if (reason) return {accepted:false,reason};
    const strategy = strategyById(order.strategyId)!;
    if (strategy.kind === "item") {
      const targets=this.purchaseTargets(side,order.targetPlayerId).filter(u=>!this.itemPriorityReason(u,strategy.item!));
      for(const u of targets){
        u.itemPriority = strategy.item; u.itemPrioritySource = source;
        this.logPlay(side,strategy.id,"called",`${u.player!.name} is saving for ${this.item(strategy.item!).name}; the normal build waits.`,source);
      }
      this.playCooldowns[side][strategy.id] = this.clock + 30;
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
    const target = strategy.kind === "push" ? this.units.filter(u => u.team !== side && u.kind === "tower" && u.lane === lane && !u.dead).sort((a,b)=>distance(a,{x:this.bases[side][0],y:this.bases[side][1]})-distance(b,{x:this.bases[side][0],y:this.bases[side][1]}))[0]
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
      const exposed = this.rules.enabled && !this.units.some(u=>u.team!==side&&u.kind==='tower'&&!u.dead);
      const ranked=choices.map(s=>({s,weight:s.id==='high-ground'&&exposed&&healthy.length>=3?10:s.kind==="item"?1:s.kind==="roshan"?healthy.length===5&&!seen.some(e=>distance(e,this.roshan)<220)?7:0:s.kind==="gank"?seen.some(e=>e.homeLane===(s.lane??1))?5:1:s.kind==="protect"?seen.some(e=>this.heroes(side).some(u=>u.player!.role===0&&distance(e,u)<250))?7:1:healthy.length>=3?4:0})).sort((a,b)=>b.weight-a.weight);
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
    if(this.nearest(u,u.range+55)?.kind==="hero" || this.rules.enabled && seen.some(e=>distance(e,u)<=u.range+55))return false;
    let point=play.rally;
    if(play.stage!=="assembling") {
      const target=this.units.find(a=>a.id===play.targetUnit);
      if(strategy.kind==="roshan")point=this.roshan;
      else if(strategy.kind==="protect")point=this.heroes(u.team).find(a=>a.player!.role===0)!;
      else if(target) {
        const wave=this.units.filter(c=>c.kind==="creep"&&c.summonOwner==null&&c.team===u.team&&!c.dead&&c.lane===play.targetLane&&c.wait<=0).sort((a,b)=>distance(a,target)-distance(b,target))[0];
        const openSiege=this.rules.enabled&&(target.kind==='base'||target.tier===2)&&!this.protectedBuilding(target)&&!this.fortified(target);
        point=openSiege?target:wave&&distance(wave,target)>190?wave:target;
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
        this.matchEvents.add({time:this.clock,kind:'roshan',team:u.team});
        this.roshan.kills[u.team]++;this.roshan.respawnAt=this.clock+480;
        const nearby=this.heroes(u.team).filter(a=>!a.dead&&distance(a,this.roshan)<180);
        for(const a of this.heroes(u.team))this.addGold(a,150);
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
    if (this.rules.enabled) {
      if (this.time * GAME_CLOCK >= this.nextSpawnClock) this.spawn();
    } else if (this.time >= this.nextWave) {
      this.nextWave += 25;
      this.spawn();
    }
    this.updateBackdoor();
    this.updateDots();
    this.defendObjectives();
    for (const u of this.units) {
      if (this.winner !== null) break;
      if (u.kind === "hero") {
        this.addGold(u,
          DT * GAME_CLOCK * (this.patch?this.economyRules.passiveGoldPerMinute/60:(0.8 + (u.player?.skills.farming ?? 70) / 100)) * axisFactor(this.patch, "economy", 0.25) * this.talents(u).resources, true);
      }
      if (u.dead) {
        if (u.kind === "hero") {
          u.respawn -= DT;
          if (u.respawn <= 0) {
            u.dead = false;
            u.hp = u.max;
            u.mana=u.maxMana;
            u.x = u.reviveAt?.[0] ?? this.bases[u.team][0];
            u.y = u.reviveAt?.[1] ?? this.bases[u.team][1];
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
      if(u.summonExpires!=null&&u.summonExpires<=this.clock){u.dead=true;u.hp=0;continue;}
      if(u.activeRangeBonus&&u.activeRangeUntil<=this.clock){u.activeRangeBonus=0;this.updateAttackRange(u);}
      u.abilityCd -= DT;
      if(u.kind==='hero'&&this.patch){
        this.recover(u);
        if(this.useTeleport(u)||this.channelDrain(u))continue;
      }
      if (u.stun > 0) {
        u.stun -= DT;
        continue;
      }
      if (u.kind === "base") continue;
      if (u.kind === "tower") {
        const target = this.nearest(u, u.range);
        if (target) {
          const ready = u.cd <= 0;
          this.attack(u, target);
          if (ready && this.fortified(u) && u.tier === 2 && this.rules.glyphExtraTargets) {
            const cooldown = u.cd;
            for (const extra of this.units.filter(e => e !== target && this.canTarget(u, e) && distance(u, e) <= u.range).sort((a,b) => distance(u,a)-distance(u,b)).slice(0,this.rules.glyphExtraTargets)) {
              u.cd = 0; this.attack(u, extra);
            }
            u.cd = cooldown;
          }
        }
        continue;
      }
      if (u.kind === "creep") {
        if(u.summonOwner!=null){
          const building=this.units.filter(v=>(v.kind==='tower'||v.kind==='base')&&this.canTarget(u,v)&&distance(u,v)<=u.range).sort((a,b)=>distance(u,a)-distance(u,b))[0];
          const target=building??this.nearest(u,u.range);if(target)this.attack(u,target);
          continue;
        }
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
      const home = { x: this.bases[u.team][0], y: this.bases[u.team][1] };
      this.useItems(u);
      if(u.spells.length){
        this.castNamed(u,this.nearest(u,300));
      }
      if(!this.patch)u.hp = Math.min(
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
      // A committed push must contest its defenders rather than permanently
      // farming the nearest creep while both teams replace the wave forever.
      const commitment = this.plays[u.team];
      if (this.rules.enabled && !vulnerable && commitment?.participants.includes(u.id) && commitment.stage !== 'assembling') {
        const defender = enemies.filter(e=>distance(e,u)<=u.range+55).sort((a,b)=>distance(a,u)-distance(b,u))[0];
        if (defender) target=defender;
      }
      if (this.rules.enabled && commitment?.participants.includes(u.id) && commitment.stage==='engaging') {
        const objective=this.units.find(v=>v.id===commitment.targetUnit);
        // Once a push reaches an open building, use the window. Repeatedly
        // clearing its replacement creeps lets defenders reset the siege forever.
        const finish=objective?.kind==='base'&&objective.hp<objective.max*.2;
        if(objective&&(finish||!vulnerable&&partners.length>=enemies.length)&&this.canTarget(u,objective)&&!this.protectedBuilding(objective)&&!this.fortified(objective)&&distance(u,objective)<=u.range+(objective.kind==='base'?26:10))target=objective;
      }
      if (this.tryDeny(u, target)) continue;
      if (target && this.rules.enabled && this.protectedBuilding(target) && !enemies.length) {
        const wave = this.units.filter(c => c.kind === 'creep' && c.summonOwner==null && c.team === u.team && c.lane === target!.lane && !c.dead && c.wait <= 0).sort((a,b) => distance(a,target!)-distance(b,target!))[0];
        if (wave && distance(wave,target) > 150) { this.move(u,wave.x,wave.y); continue; }
      }
      if(target?.kind==="tower" && !this.units.some(c=>c.kind==="creep"&&c.summonOwner==null&&c.team===u.team&&!c.dead&&distance(c,target!)<150) && enemies.length) {
        this.move(u,home.x,home.y);continue;
      }
      if (target) {
        if (!u.spells.length && u.abilityCd <= 0 && distance(u, target) < u.range + 30)
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
          c.summonOwner == null &&
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
    // Only unpatched legacy preparations retain the original overtime rule.
    if (!this.rules.enabled && this.time > 540 && this.winner === null) {
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
        this.matchEvents.add({time:this.clock,kind:'victory',team:this.winner});
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
  private score(includeSpells = false): PlayerScore[] {
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
        ...(includeSpells&&u.spells.length?{mana:Math.round(u.mana),maxMana:Math.round(u.maxMana),attackRange:this.rules.enabled?Math.round(u.range/.22):undefined,spells:u.spells.filter(s=>!s.definition.hidden||s.definition.granted).map(s=>this.spellState(u,s))}:{}),
        ...(includeSpells&&this.patch?{hpRegen:Number(this.regeneration(u).hp.toFixed(1)),manaRegen:Number(this.regeneration(u).mana.toFixed(1)),teleport:{charges:u.tpCharges,readyAt:u.tpReadyAt,...(u.teleport?{endsAt:u.teleport.endsAt,destination:u.teleport.label}:{})}}:{}),
        kills: u.kills,
        deaths: u.deaths,
        assists: u.assists,
        gold: Math.round(u.gold),
        inventory: [...u.inventory],
        spendableGold: Math.max(0,Math.floor(u.gold-u.spent)),
        netWorth: this.netWorth(u),
        ...(this.nextItem(u)?{nextItem:this.nextItem(u)}:{}),
        bkbUntil:u.bkbUntil, aegisUntil:u.aegisUntil,
        neutralDeaths:u.neutralDeaths,
        xp: Math.round(u.totalXp),
        lastHits: u.lastHits,
        ...(this.rules.enabled ? { denies: u.denies, buybacks: u.buybacks,
          ...(includeSpells ? { buyback: { cost: buybackCost(this.rules, u.level, this.netWorth(u), this.clock), readyAt: u.buybackReadyAt, reason: this.buybackReason(u.team, u.player!.id) } } : {}) } : {}),
        heroDamage: Math.round(u.heroDamage),
        buildingDamage: Math.round(u.buildingDamage),
        healing: Math.round(u.healing),
        ...(this.camps.length ? { neutralLastHits: u.neutralLastHits } : {}),
        ...(talentsEnabled(this.patch) ? { talents: Object.fromEntries(Object.entries(u.player!.talents ?? {}).filter(([level]) => u.level >= Number(level))) as TalentPlan } : {}),
        ...(u.laneOutcome ? { laneOutcome: u.laneOutcome } : {}),
      }));
  }
  private recordDecisionFrame() {
    if (this.config.captureReplay === false) return;
    const frame = this.snapshot();
    if (this.frames.at(-1)?.time === frame.time) this.frames[this.frames.length - 1] = frame;
    else this.frames.push(frame);
    this.nextFrame = this.time;
  }
  private capture(final = false) {
    const time = Math.round(this.time * GAME_CLOCK);
    if (this.config.captureTimeline !== false && (final || this.time >= this.nextSample)) {
      if (this.timeline.at(-1)?.time !== time)
        this.timeline.push({
          time,
          gold: [this.resourceTotal(0, "gold"), this.resourceTotal(1, "gold")],
          netWorth: ([0,1] as Side[]).map(side=>this.heroes(side).reduce((n,u)=>n+this.netWorth(u),0)) as [number,number],
          xp: [
            this.resourceTotal(0, "totalXp"),
            this.resourceTotal(1, "totalXp"),
          ],
        });
      this.nextSample = this.time + 5;
    }
    const lastGlyphs = this.frames.at(-1)?.glyphs, lastTime = this.frames.at(-1)?.time ?? 0;
    const glyphTransition = this.rules.enabled && this.glyphs.some((g,i) => g.activeUntil > this.clock || (lastGlyphs?.[i].activeUntil ?? 0) > lastTime && g.activeUntil <= this.clock);
    if (this.config.captureReplay !== false && (final || glyphTransition || this.time >= this.nextFrame)) {
      if (this.frames.at(-1)?.time !== time)
        this.frames.push(this.snapshot());
      this.nextFrame = this.time + 3;
    }
  }
  /** Read-only live frame: observing a match never consumes RNG or advances it. */
  snapshot(): ReplayFrame {
    return { time:this.clock,matchEvents:this.matchEvents.recent(this.clock),kills:[...this.kills],players:this.score(true),roshan:{...this.roshan,hp:Math.max(0,Math.round(this.roshan.hp)),kills:[...this.roshan.kills]},
      ...(this.rules.enabled ? { glyphs: this.glyphs.map(g => ({...g})) as [GlyphState, GlyphState], siegeEvents: this.siegeEvents.filter(e => e.time >= this.clock - 90).map(e => ({...e})) } : {}),
      ...(this.patch?{spellCasts:this.spellCasts.filter(c=>c.time>this.clock-30).map(c=>({...c}))}:{}),
      droppedItems:this.droppedItems.map(d=>({...d})),
      ...(this.camps.length?{camps:this.camps.map(c=>({...c,readyAt:Math.round(c.readyAt*GAME_CLOCK)}))}:{}),
      units:this.units.filter(u=>u.wait<=0).map(u=>({id:u.id,kind:u.kind,team:u.team,x:Math.round(u.x),y:Math.round(u.y),hp:Math.round(u.hp),max:Math.round(u.max),...(u.kind==="tower"?{lane:u.lane,tier:this.mapEra?u.tier:undefined}:{}),
        ...(this.rules.enabled ? { ...(u.creepType ? {creepType:u.creepType} : {}), ...(!u.dead && (u.kind==='tower'||u.kind==='base') ? { backdoor:this.protectedBuilding(u), fortified:this.fortified(u) } : {}) } : {}),
        name:u.hero?.name??u.summonName??(u.creepType?`${u.creepType} creep`:u.kind),...(u.hero?{heroId:u.hero.id,playerId:u.player!.id,...(u.dead?{respawnAt:this.time*GAME_CLOCK+Math.max(0,u.respawn)*GAME_CLOCK}:{})}:{})})) };
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
      ...(this.rules.enabled ? { siegeEvents: this.siegeEvents.map(e => ({...e})) } : {}),
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
      overtime: !this.rules.enabled && this.time > 540,
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
