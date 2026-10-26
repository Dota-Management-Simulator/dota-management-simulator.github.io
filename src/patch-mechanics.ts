import type { SeasonPatch } from './patches';
import { matchRules } from './match-rules';
import { combatCatalogue, rankValue } from './combat-model';

/** Public descriptions derive from the same values read by LaneBattle. */
export function patchMechanics(patch: SeasonPatch) {
  const r=matchRules(patch),tp=combatCatalogue(patch)?.items.item_tpscroll;
  const refresh=r.glyphRefresh==='none'?'no tower refresh':r.glyphRefresh==='tier1'?'each Tier 1 loss refreshes it':'first Tier 1 and Tier 2 losses refresh it';
  return [
    {id:'backdoor',name:'Backdoor protection',value:`Tier 2 and Ancient: ${r.backdoorReduction*100}% damage reduction; ${r.backdoorGrace}s grace after an enemy lane creep leaves. Protected damage regenerates at ${r.backdoorHeal*.4} HP/s (${r.ancientBackdoorHeal*.4} for the Ancient).`,source:'https://www.dota2.com/datafeed/patchnotes?version=7.29&language=english'},
    {id:'glyph',name:'Glyph',value:`Buildings protected for ${r.glyphDuration}s; lane creeps for ${r.glyphCreepDuration}s. ${r.glyphCooldown}s cooldown; ${refresh}. Tier 2 gains ${r.glyphExtraTargets} extra attack targets.`,source:'https://www.dota2.com/datafeed/patchnotes?version=7.32&language=english'},
    {id:'siege',name:'Siege waves',value:`Catapult every ${r.siegeInterval}s, ${r.siegeHealth} HP, ${r.siegeMultiplier}× building damage. Extra catapult from ${r.extraSiegeAt/60}:00.`,source:'https://www.dota2.com/706'},
    {id:'denies',name:'Denies',value:`Enemy receives ${r.flatDenyXp?'the early flat, ranged/melee-dependent XP award':`${r.denyEnemyXp*100}% XP`}; denier receives ${r.denyOwnXp*100}% XP and ${r.denyGold*100}% gold.`,source:'https://www.dota2.com/duelingfates'},
    {id:'buyback',name:'Buyback',value:`${r.buybackCooldown}s cooldown. ${r.buybackDivisor?`Cost: ${r.buybackBase} + net worth/${r.buybackDivisor}.`:'Cost scales with level and match time.'} Respawn penalty: ${r.buybackPenalty==='flat'?'25s':r.buybackPenalty==='remaining'?'25% of remaining death time':'none'}.`,source:'https://www.dota2.com/datafeed/patchnotes?version=7.29&language=english'},
    {id:'regeneration',name:'HP and mana regeneration',value:r.regenFormula==='attribute-amplified'?'Strength amplifies base/item HP regeneration by 0.7% per point; Intelligence amplifies base/item mana regeneration by 2% per point.':`Strength adds ${r.strengthRegen} HP/s per point before health scaling; Intelligence adds ${r.intelligenceRegen} mana/s. ${r.regenFormula==='legacy-percent'?'Percentage item bonuses multiply base/attribute mana regeneration; flat bonuses and auras stay flat.':'Item mana regeneration adds flat mana per second.'}`,source:r.regenFormula==='attribute-amplified'?'https://www.dota2.com/duelingfates':'https://www.dota2.com/720'},
    {id:'tower-regen',name:'Tower recovery aura',value:`Nearby allied heroes gain ${Number((r.towerHealthRegen[0]*.4).toFixed(2))} HP/s at Tier 1 or ${Number((r.towerHealthRegen[1]*.4).toFixed(2))} at Tier 2. Overlapping tower auras do not stack.`,source:'https://www.dota2.com/datafeed/patchnotes?version=7.26b&language=english'},
    {id:'teleport',name:'Town Portal Scroll',value:tp?`${tp.cost} gold; ${rankValue(tp.mana,1)} mana; ${rankValue(tp.cooldown,1)}s cooldown; ${rankValue(tp.channel??[],1)||3}s interruptible channel. Scrolls use the simulator’s utility slot in every era.`:'No scroll recovered for this composite.',source:combatCatalogue(patch)?.source.url??'https://www.dota2.com/720'},
    {id:'high-ground',name:'High ground',value:`Ranged attacks have ${r.uphillMiss*100}% uphill miss chance. Approximate height and shared sight determine target acquisition.`,source:'https://www.dota2.com/706'},
  ];
}

export function patchMechanicsChanges(patch:SeasonPatch,previous?:SeasonPatch){
  const before=new Map(previous?patchMechanics(previous).map(row=>[row.id,row.value]):[]);
  return patchMechanics(patch).filter(row=>before.get(row.id)!==row.value);
}
