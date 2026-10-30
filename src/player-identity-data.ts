/** Player identity v2: player skills, development and club welfare. */
export const PLAYER_IDENTITY_VERSION = 'player-identity-v2';
export { playerInnates, innateById, playerSkillLabels } from './player-innates';
export type { PlayerInnate, PlayerSkill, SkillBonus, InnateMatchRule, InnateWeeklyRule } from './player-innates';
export { conditionLabels, effectDescription } from './legacy-player-innates';
export type { IdentityCondition, IdentityEffect } from './legacy-player-innates';
export type TalentEffect = 'attack'|'health'|'resources'|'spells'|'speed'|'buildings';
export interface SharedPlayerTalent { id:string; name:string; effects:Partial<Record<TalentEffect,number>>; category:string }
export const sharedPlayerTalents: SharedPlayerTalent[] = [
  {id:'striking',name:'Striking power',effects:{attack:.05},category:'Skirmishing'},
  {id:'resilience',name:'Resilience',effects:{health:.08},category:'Endurance'},
  {id:'resourceful',name:'Resourceful',effects:{resources:.1},category:'Farming'},
  {id:'spellcraft',name:'Spellcraft',effects:{spells:.08},category:'Teamwork'},
  {id:'fleet',name:'Fleet footed',effects:{speed:.06},category:'Movement'},
  {id:'siege',name:'Siege specialist',effects:{buildings:.08},category:'Objectives'},
  {id:'finisher',name:'Finisher',effects:{attack:.08},category:'Skirmishing'},
  {id:'unbreakable',name:'Unbreakable',effects:{health:.12},category:'Endurance'},
  {id:'lane-craft',name:'Lane craft',effects:{attack:.03,health:.035},category:'Laning'},
  {id:'field-study',name:'Field study',effects:{resources:.05,spells:.025},category:'Learning'},
  {id:'safe-movement',name:'Safe movement',effects:{speed:.035,health:.04},category:'Awareness'},
  {id:'composure',name:'Steady execution',effects:{attack:.025,spells:.035},category:'Composure'},
  {id:'mobile-caster',name:'Mobile caster',effects:{speed:.035,spells:.04},category:'Movement'},
  {id:'siege-economy',name:'Siege economy',effects:{buildings:.055,resources:.04},category:'Objectives'},
  {id:'front-line',name:'Front-line discipline',effects:{health:.06,attack:.025},category:'Teamwork'},
  {id:'efficient-fighter',name:'Efficient fighter',effects:{resources:.045,attack:.03},category:'Farming'},
];
export const sharedTalentById = new Map(sharedPlayerTalents.map(t=>[t.id,t]));
