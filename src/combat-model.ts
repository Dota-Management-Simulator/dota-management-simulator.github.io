import raw from './data/combat-history.json';
import type { SeasonPatch } from './patches';
import type { TalentPlan } from './talents';

export const COMBAT_MODEL_VERSION = 'identity-resources-tp-v3-siege';
export interface AbilityDefinition {
  siege?: { kind: 'range' | 'blast' | 'fire' | 'form' | 'wards'; rangeBonus?: number[]; activeRangeBonus?: number[];
    buildingMultiplier?: number; radius?: number[]; attackSlow?: number[]; dot?: number[]; dotDuration?: number[];
    wardCount?: number[]; wardDamage?: number[]; wardRange?: number[] };
  id: string; name: string; passive: boolean; ultimate: boolean; hidden: boolean;
  granted?: 'scepter' | 'shard'; cooldown: number[]; mana: number[]; damage: number[];
  heal: number[]; stun: number[]; slow: number[]; shield: number[]; duration: number[];
  range: number[]; area: boolean; ally: boolean; summon: boolean; mobility: boolean;
  scepter: boolean; shard: boolean; upgrades: Record<string, unknown>; talent?: Record<string, unknown>;
  modifiers?: { field:string; upgrade:string; amount:number }[];
  properties?: Record<string, number[]>;
  line?: boolean;
  channel?: number[]; toggle?: boolean; damageOverTime?: boolean;
}
export interface HistoricalHeroKit { kit: string[]; talents: string[]; stats: Record<string, number> }
export interface HistoricalItem extends AbilityDefinition { cost: number; attack: number; health: number; speed: number; spells: number; evasion: number }
export interface CombatCatalogue {
  rules: EconomyRules;
  signature: string;
  overlays?: { version:string;url:string;date:string }[];
  source: { date: string; url: string; provisional: boolean };
  heroes: Record<string, HistoricalHeroKit>; abilities: Record<string, AbilityDefinition>; items: Record<string, HistoricalItem>;
}
export interface EconomyRules {
  passiveGoldPerMinute:number;bountyMultiplier:number;creepBase:number;meleeGrowth:number;rangedGrowth:number;neutralGrowth:number;assistNetWorth:boolean;sources:{version:string;url:string}[];
}
export const defaultEconomyRules: EconomyRules={passiveGoldPerMinute:85,bountyMultiplier:1,creepBase:35,meleeGrowth:1,rangedGrowth:1,neutralGrowth:0,assistNetWorth:false,sources:[]};
const history = raw as unknown as { definitions: AbilityDefinition[]; patches: Record<string, Omit<CombatCatalogue, 'abilities'|'items'> & { abilities: Record<string, number>;items:Record<string,number> }> };
const resolved = new Map<string, CombatCatalogue>();
export function combatCatalogue(patch?: Pick<SeasonPatch, 'id' | 'year'>): CombatCatalogue | undefined {
  if (!patch) return undefined;
  const key = patch.year > 2026 ? '2026.2' : patch.id;
  if (resolved.has(key)) return resolved.get(key);
  const row=history.patches[key]; if(!row)return undefined;
  const table={...row,abilities:Object.fromEntries(Object.entries(row.abilities).map(([id,index])=>[id,history.definitions[index]])),items:Object.fromEntries(Object.entries(row.items).map(([id,index])=>[id,history.definitions[index] as HistoricalItem]))};
  resolved.set(key,table); return table;
}
export function allHistoricalItems(): HistoricalItem[] {
  return [...new Map(Object.values(history.patches).flatMap(p=>Object.entries(p.items))).values()].map(index=>history.definitions[index] as HistoricalItem);
}
export function heroAbilities(heroId: string, patch?: Pick<SeasonPatch, 'id' | 'year'>): AbilityDefinition[] {
  const table = combatCatalogue(patch);
  return table?.heroes[heroId]?.kit.map(id => table.abilities[id]).filter(Boolean) ?? [];
}
export function abilityRank(ability: AbilityDefinition, level: number, slot = 0): number {
  if (ability.granted) return 1;
  if (ability.ultimate) return level < 6 ? 0 : level < 12 ? 1 : level < 18 ? 2 : 3;
  // One point in each basic skill by level four; legal primary-first build.
  const ranks = [[1,3,5,7],[2,8,9,11],[4,10,13,14]][Math.min(slot,2)];
  return ranks.filter(at => level >= at).length;
}
export function rankValue(values: number[], rank: number): number {
  return rank > 0 && values.length ? values[Math.min(rank - 1, values.length - 1)] : 0;
}
export function special(a: AbilityDefinition, rank: number, ...keys: string[]): number {
  for (const key of keys) if (a.properties?.[key]?.length) return rankValue(a.properties[key], rank);
  return 0;
}
export function adjustedAbility(a:AbilityDefinition,heroId:string,level:number,plan:TalentPlan|undefined,inventory:string[],patch?:Pick<SeasonPatch,'id'|'year'>):AbilityDefinition{
  const tree=combatCatalogue(patch)?.heroes[heroId]?.talents??[];
  const enabled=new Set<string>();
  for(const[tier,choice]of Object.entries(plan??{}))if(level>=Number(tier))enabled.add(tree[([10,15,20,25].indexOf(Number(tier)))*2+Number(choice)]);
  if(inventory.includes('scepter'))enabled.add('special_bonus_scepter');
  if(inventory.includes('shard'))enabled.add('special_bonus_shard');
  let result=a;
  for(const m of a.modifiers??[]){
    if(!enabled.has(m.upgrade)||!m.amount)continue;
    if (result.siege && /attack_range/.test(m.field)) {
      const field=/active_/.test(m.field)?'activeRangeBonus':'rangeBonus';
      result={...result,siege:{...result.siege,[field]:(result.siege[field]??[0]).map(n=>Math.max(0,n+m.amount))}};
      continue;
    }
    const key=/cooldown/i.test(m.field)?'cooldown':/mana_cost|manacost/i.test(m.field)?'mana':/stun/i.test(m.field)?'stun':/heal/i.test(m.field)?'heal':/damage/i.test(m.field)?'damage':/duration/i.test(m.field)?'duration':undefined;
    if(!key)continue;
    result={...result,[key]:result[key].map(value=>Math.max(0,value+m.amount))};
  }
  // Old files expose absolute upgrade values rather than linked deltas.
  for(const[key,value]of Object.entries(a.upgrades)){
    if(!inventory.includes('scepter')&&!inventory.includes('shard'))break;
    if(!((/scepter/.test(key)&&inventory.includes('scepter'))||(/shard/.test(key)&&inventory.includes('shard'))))continue;
    const field=/cooldown/i.test(key)?'cooldown':/damage/i.test(key)?'damage':/heal/i.test(key)?'heal':undefined;
    const values=String(value).split(/\s+/).map(Number).filter(Number.isFinite);
    if(field&&values.length&&values.some(n=>n>0))result={...result,[field]:values};
  }
  return result;
}
export function abilityIcon(id: string) {
  return `https://cdn.cloudflare.steamstatic.com/apps/dota2/images/dota_react/abilities/${id}.png`;
}
export interface SpellState {
  id: string; rank: number; readyAt: number; cooldown: number; manaCost: number;
  lastCastAt?: number; casts: number; passive: boolean; locked?: string;
}
export interface SpellCast { time: number; playerId: string; heroId: string; team: 0 | 1; abilityId: string; targetId?: number }

/** Source facts drive bounded effects in the small lane engine. Values are
 * scaled to its HP/map; cooldown and mana stay in Dota clock units. */
export function spellEffects(a: AbilityDefinition, rank: number) {
  return { damage: Math.max(0,rankValue(a.damage,rank))*.42,
    heal: Math.max(0,rankValue(a.heal,rank))*.6,
    control: Math.min(5,Math.max(0,rankValue(a.stun,rank),special(a,rank,'sheep_duration','hex_duration'),/^(lion_voodoo|shadow_shaman_voodoo)$/.test(a.id)?rankValue(a.duration,rank):0)),
    slow: Math.min(.65,Math.abs(rankValue(a.slow,rank))/100),
    shield: Math.max(0,rankValue(a.shield,rank))*.5,
    duration: Math.min(30,Math.max(1,rankValue(a.duration,rank)||5)),
    range: Math.min(600,Math.max(80,rankValue(a.range,rank)*.22)),
    manaBurn: special(a,rank,'mana_per_hit','mana_burn','mana_burned','mana_per_second','feedback_mana_burn'),
    lifesteal: Math.min(.5,special(a,rank,'lifesteal','lifesteal_percent','vampiric_aura','lifesteal_pct')/100),
    critChance: Math.min(.6,special(a,rank,'crit_chance','critical_chance','blade_dance_crit_chance')/100),
    critMultiplier: Math.min(4,special(a,rank,'crit_multiplier','crit_mult','critical_damage','blade_dance_crit_mult')/100),
    silence: Math.min(16,special(a,rank,'silence_duration')||(/silence|doom_bringer_doom|silencer_last_word/.test(a.id)?rankValue(a.duration,rank):0)),
    root: Math.min(5,special(a,rank,'root_duration','entangle_duration','purge_root_duration')||(a.id==='crystal_maiden_frostbite'?rankValue(a.duration,rank):0)),
    armorReduction: Math.min(15,Math.abs(special(a,rank,'armor_reduction','armor_reduction_amount','corruption_armor'))),
    healthRegen: special(a,rank,'health_regen','hp_regen','heal_per_second','health_regen_per_second','bonus_health_regen'),
    manaRegen: special(a,rank,'mana_regen','base_mana_regen','bonus_mana_regen'),
    attackSpeed: Math.min(300,special(a,rank,'attack_speed_bonus_pct','bonus_attack_speed','attack_speed_bonus')),
    attackBonus: Math.min(1,special(a,rank,'gods_strength_damage','bonus_damage_pct','bonus_damage_percent')/100),
    damageReduction: a.damage.some(n=>n>0)?0:Math.max(0,Math.min(.8,special(a,rank,'damage_reduction')/100)),
    stackingDamage: special(a,rank,'damage_per_stack'),
  };
}

/** Describes the implemented effect rather than promising complete Dota parity. */
export function abilitySummary(a: AbilityDefinition, rank = 1): string {
  const e=spellEffects(a,Math.max(1,rank));
  const unique: Record<string,string> = {
    antimage_mana_void:'Blasts enemies around a target for damage based on that target’s missing mana.',
    axe_culling_blade:'Finishes a hero below the scaled damage threshold; a successful execution resets its cooldown.',
    axe_counter_helix:'Chance to counterattack nearby enemies when struck.',
    pudge_meat_hook:'Damages and pulls the target toward Pudge.',
    crystal_maiden_brilliance_aura:'Passively restores allied mana; stronger on Crystal Maiden and nearby allies.',
    lion_mana_drain:'Channels to drain enemy mana and replenish Lion; disables or losing range interrupt it.',
    item_arcane_boots:'Restores mana to the owner and nearby allied heroes.',
    item_flask:'Consumed to regenerate health over time. Enemy hero damage ends the recovery.',
    item_clarity:'Consumed to regenerate mana over time. Enemy hero damage ends the recovery.',
    item_tango:'Consumed to regenerate health over time; this simplified use needs no tree target.',
    item_tpscroll:'Consumes a scroll and mana to channel to a friendly fountain or lane tower. Disables cancel the teleport.',
    ursa_fury_swipes:'Repeated attacks stack extra damage on the same target; stacks expire without another hit.',
    ursa_overpower:'Gives a limited burst of faster attacks.',
    ursa_enrage:'Briefly reduces incoming damage when fighting.',
    tidehunter_kraken_shell:'Passively blocks a scaled amount of physical attack damage.',
    huskar_berserkers_blood:'Gains attack speed and health regeneration as health falls.',
    faceless_void_time_lock:'Attacks can briefly stun and deal bonus damage.',
    obsidian_destroyer_arcane_orb:'Spends a fraction of current mana to add mana-based damage to an attack.',
  };
  if(unique[a.id])return unique[a.id];
  const parts=[e.attackSpeed?'Increases attack speed.':'',e.attackBonus?'Increases attack damage.':e.damage>0?(a.damageOverTime?'Deals damage over time.':'Deals damage.'):'',e.damageReduction?'Reduces incoming damage.':'',e.heal>0?'Restores health.':'',e.control>0?'Stuns enemies.':'',e.root>0?'Roots enemies.':'',e.silence>0?'Silences spells.':'',e.slow>0?'Slows movement.':'',e.shield>0?'Absorbs damage.':'',e.manaBurn>0?'Burns enemy mana.':'',e.lifesteal>0?'Attacks restore health.':'',e.critChance>0?'Chance for critical attacks.':'',e.armorReduction>0?'Reduces armor.':'',e.healthRegen>0?'Regenerates health.':'',e.manaRegen>0?'Regenerates mana.':'',a.summon?'Controlled units add temporary attack pressure.':'',a.mobility?'Repositions toward a target or escapes when hurt.':''].filter(Boolean);
  return `${a.passive?'Passive: ':''}${parts.join(' ') || (a.passive?'No additional passive modeled yet.':'Utility is simplified to a temporary attack buff.')} Effects use simulation scaling.`;
}
