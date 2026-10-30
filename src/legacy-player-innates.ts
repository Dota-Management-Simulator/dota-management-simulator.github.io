/** Authored manager-game traits, never biographical claims about real players. */
export const PLAYER_IDENTITY_VERSION = 'player-identity-v1';
export type IdentityCondition = 'always' | 'lane' | 'midgame' | 'late' | 'alone' | 'paired' | 'grouped' | 'hurt' | 'healthy' | 'low-mana' | 'rested' | 'recovering' | 'behind' | 'ahead' | 'day' | 'night' | 'moving' | 'defending' | 'siege' | 'tired';
export type IdentityEffect = 'creeps' | 'heroes' | 'spells' | 'buildings' | 'speed' | 'sight' | 'farmGold' | 'farmSpeed' | 'xp' | 'hpRegen' | 'manaRegen' | 'manaCost' | 'incoming' | 'deny' | 'retreat' | 'engage' | 'farmWindow';
export interface PlayerInnate { id: string; name: string; category: string; condition: IdentityCondition; effects: Partial<Record<IdentityEffect, number>>; roles: number[] }
const categories: [string, number[]][] = [['Laning',[0,1,2]],['Farming',[0,1]],['Skirmishing',[1,2,3]],['Teamwork',[2,3,4]],['Movement',[1,3]],['Awareness',[3,4]],['Objectives',[0,2]],['Endurance',[0,2,4]],['Composure',[1,2,4]],['Learning',[0,1,2,3,4]]];
type Entry = [string, IdentityCondition, Partial<Record<IdentityEffect, number>>];
const groups: Entry[][] = [
  [
    ['Last-hit rhythm','lane',{creeps:.08}], ['Deny specialist','lane',{deny:.12}],
    ['Solo laner','alone',{creeps:.07,xp:.03}], ['Lane partner','paired',{creeps:.06,manaRegen:.04}],
    ['Trade discipline','lane',{incoming:-.04}], ['Wave reader','lane',{sight:.08}],
    ['First rotation','moving',{speed:.07,xp:.03}], ['Lane recovery','behind',{creeps:.07}],
    ['Lane pressure','ahead',{creeps:.05,engage:8}], ['Ranged-creep student','lane',{xp:.07}],
  ],
  [
    ['Camp technician','midgame',{farmSpeed:.1}], ['Resource route','alone',{farmWindow:18,speed:.03}],
    ['Patient accumulator','healthy',{farmGold:.06}], ['Recovery farmer','behind',{farmGold:.08}],
    ['Economical clearing','low-mana',{farmSpeed:.09}], ['Daylight harvest','day',{farmGold:.05}],
    ['Night harvester','night',{farmSpeed:.08}], ['Late accelerator','late',{farmGold:.06}],
    ['Fresh rotation','rested',{farmSpeed:.07,speed:.03}], ['Shared resources','paired',{farmGold:.04,xp:.03}],
  ],
  [
    ['Duel instinct','alone',{heroes:.07}], ['Wing player','paired',{heroes:.06}],
    ['Opening hunter','lane',{engage:14}], ['Midgame hunter','midgame',{heroes:.06,engage:6}],
    ['Calculated pursuit','healthy',{engage:12}], ['Counterpunch','hurt',{heroes:.08}],
    ['Night interceptor','night',{engage:14}], ['Daytime aggressor','day',{heroes:.05}],
    ['Comeback fighter','behind',{heroes:.07}], ['Lead converter','ahead',{engage:10,speed:.025}],
  ],
  [
    ['Formation player','grouped',{spells:.07}], ['Duo executor','paired',{spells:.06}],
    ['Backline anchor','grouped',{incoming:-.05}], ['Mana coordinator','grouped',{manaRegen:.1}],
    ['Group advance','grouped',{speed:.05}], ['Siege coordinator','siege',{spells:.06}],
    ['Defensive coordinator','defending',{spells:.08}], ['Long-fight rhythm','low-mana',{manaCost:-.07}],
    ['Late-fight conductor','late',{spells:.06}], ['Recovery formation','recovering',{spells:.05,xp:.02}],
  ],
  [
    ['Rotation specialist','moving',{speed:.09}], ['Solo pathfinder','alone',{speed:.06}],
    ['Duo navigator','paired',{speed:.055}], ['Night runner','night',{speed:.065}],
    ['Day runner','day',{speed:.06}], ['Escape route','hurt',{speed:.08}],
    ['Fresh legs','rested',{speed:.055}], ['Second wind','recovering',{speed:.07}],
    ['Defensive rotation','defending',{speed:.075}], ['Siege arrival','siege',{speed:.06}],
  ],
  [
    ['Solo lookout','alone',{sight:.1}], ['Duo lookout','paired',{sight:.08}],
    ['Formation lookout','grouped',{sight:.09}], ['Night observer','night',{sight:.12}],
    ['Day observer','day',{sight:.1}], ['Lane observer','lane',{sight:.055,deny:.04}],
    ['Defensive observer','defending',{sight:.12}], ['Siege observer','siege',{sight:.1}],
    ['Cautious reader','hurt',{retreat:.025,sight:.04}], ['Rotation reader','moving',{sight:.09}],
  ],
  [
    ['Catapult escort','siege',{buildings:.1}], ['Solo siege','alone',{buildings:.08}],
    ['Coordinated siege','grouped',{buildings:.075}], ['Duo demolition','paired',{buildings:.07}],
    ['Late closer','late',{buildings:.09}], ['Daylight siege','day',{buildings:.06}],
    ['Night siege','night',{buildings:.07}], ['Advantage conversion','ahead',{buildings:.085}],
    ['Healthy commitment','healthy',{buildings:.06}], ['Defensive wave clear','defending',{creeps:.1}],
  ],
  [
    ['Recovery routine','rested',{hpRegen:.12}], ['Mana routine','rested',{manaRegen:.12}],
    ['Low-health composure','hurt',{hpRegen:.15}], ['Mana conservation','low-mana',{manaRegen:.15}],
    ['Long-map endurance','late',{hpRegen:.1,manaRegen:.06}], ['Solo sustain','alone',{hpRegen:.1}],
    ['Shared recovery','paired',{hpRegen:.08,manaRegen:.05}], ['Return-to-lane routine','recovering',{hpRegen:.12,manaRegen:.08}],
    ['Tired but economical','tired',{manaCost:-.08}], ['Home-ground sustain','defending',{hpRegen:.14}],
  ],
  [
    ['Measured retreat','always',{retreat:.02}], ['Hold your ground','grouped',{retreat:-.025,incoming:-.02}],
    ['Pressure management','behind',{incoming:-.055}], ['Lead protection','ahead',{retreat:.025}],
    ['Late composure','late',{incoming:-.04}], ['Efficient opening','lane',{manaCost:-.06}],
    ['Duo economy','paired',{manaCost:-.065}], ['Formation economy','grouped',{manaCost:-.06}],
    ['Patient recovery','rested',{manaCost:-.04}], ['Wounded discipline','hurt',{manaCost:-.075}],
  ],
  [
    ['Solo student','alone',{xp:.06}], ['Duo student','paired',{xp:.055}],
    ['Teamfight student','grouped',{xp:.055}], ['Comeback student','behind',{xp:.08}],
    ['Early learner','lane',{xp:.04,manaRegen:.03}], ['Midgame learner','midgame',{xp:.06}],
    ['Late learner','late',{xp:.07}], ['Night student','night',{xp:.05}],
    ['Day student','day',{xp:.045}], ['Rested student','rested',{xp:.055}],
  ],
];
export const legacyPlayerInnates: PlayerInnate[] = groups.flatMap((entries, group) => entries.map(([name,condition,effects]) => ({
  id: name.toLowerCase().replaceAll(' ','-'), name, category:categories[group][0], roles:categories[group][1], condition, effects,
})));
export const legacyInnateById = new Map(legacyPlayerInnates.map(i => [i.id,i]));
export const conditionLabels: Record<IdentityCondition,string> = {
  always:'At all times',lane:'Before 10:00',midgame:'From 10:00 to 30:00',late:'From 30:00',
  alone:'With no living teammate within 240 map units',paired:'With exactly one living teammate within 240 map units',grouped:'With at least two living teammates within 240 map units',
  hurt:'Below 40% health',healthy:'Above 80% health','low-mana':'Below 35% mana',rested:'After 12 seconds without taking damage',
  recovering:'After at least two deaths this map',behind:'With more deaths than kills',ahead:'With at least two more kills than deaths',
  day:'During daytime',night:'During nighttime',moving:'While participating in an active tactical call',
  defending:'Within 200 map units of a living allied tower or Ancient',siege:'Within 240 map units of a living allied catapult',tired:'With campaign energy below 60',
};
export const effectLabels: Record<IdentityEffect,string> = {
  creeps:'lane-creep damage',heroes:'hero damage',spells:'spell damage and healing',buildings:'building damage',speed:'movement speed',
  sight:'sight radius',farmGold:'last-hit, deny and neutral gold',farmSpeed:'neutral clearing damage',xp:'earned experience',hpRegen:'HP regeneration',
  manaRegen:'mana regeneration',manaCost:'spell mana cost',incoming:'damage received',deny:'deny finishing threshold',
  retreat:'health threshold for retreat',engage:'hero pursuit radius',farmWindow:'neutral farming window per six match minutes',
};
export function effectDescription(effects: Partial<Record<IdentityEffect,number>>) {
  return (Object.entries(effects) as [IdentityEffect,number][]).map(([key,value]) => {
    const amount=key==='engage'?`${value>0?'+':''}${value} map units`:key==='farmWindow'?`${value>0?'+':''}${value}s`:key==='retreat'?`${value>0?'+':''}${Math.round(value*1000)/10} percentage points`:`${value>0?'+':''}${Math.round(value*1000)/10}%`;
    return `${amount} ${effectLabels[key]}`;
  }).join(' · ');
}

