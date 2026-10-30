import { legacyPlayerInnates } from './legacy-player-innates';
import type { IdentityCondition } from './legacy-player-innates';

export const playerSkillLabels = {creativity:'Creativity',stability:'Stability',confidence:'Confidence',stamina:'Stamina',heroPool:'Hero pool',laning:'Laning',teamfights:'Teamfights',farming:'Farming',skirmish:'Skirmish',vision:'Vision',intuition:'Intuition',pushing:'Pushing'} as const;
export type PlayerSkill = keyof typeof playerSkillLabels;
export type SkillBonus = Partial<Record<PlayerSkill,number>>;
export interface InnateMatchRule { target:'self'|'lane-partners'|'nearby-teammates'; condition:IdentityCondition; stats:SkillBonus }
export interface InnateWeeklyRule { kind:'training'|'morale'|'energy'; target:'self'|'teammates'; stats?:SkillBonus; amount?:number; when?:'always'|'rest'|'training'|'tired'|'low-morale' }
export interface PlayerInnate { id:string;name:string;category:string;roles:number[];attributes?:SkillBonus;match?:InnateMatchRule;weekly?:InnateWeeklyRule }
type Entry = [string,Pick<PlayerInnate,'attributes'|'match'|'weekly'>];
const self=(condition:IdentityCondition,stats:SkillBonus)=>({match:{target:'self' as const,condition,stats}});
const lane=(stats:SkillBonus)=>({match:{target:'lane-partners' as const,condition:'lane' as const,stats}});
const nearby=(condition:IdentityCondition,stats:SkillBonus)=>({match:{target:'nearby-teammates' as const,condition,stats}});
const attributes=(stats:SkillBonus)=>({attributes:stats});
const training=(stats:SkillBonus,target:'self'|'teammates'='self')=>({weekly:{kind:'training' as const,target,stats}});
const morale=(amount:number,when:InnateWeeklyRule['when'],target:'self'|'teammates'='self')=>({weekly:{kind:'morale' as const,target,amount,when}});
const recovery=(amount:number,when:InnateWeeklyRule['when'])=>({weekly:{kind:'energy' as const,target:'self' as const,amount,when}});

const groups:Entry[][] = [
  [
    ['Lane technician',self('lane',{laning:5})],['Deny reader',self('lane',{laning:3,intuition:2})],
    ['Solo-lane specialist',self('alone',{laning:4})],['Duo-lane specialist',self('paired',{laning:4})],
    ['Trade evaluator',self('lane',{laning:2,skirmish:3})],['Lane communicator',lane({laning:4})],
    ['Rotation tutor',lane({intuition:3,skirmish:2})],['Recovery laner',self('behind',{laning:5})],
    ['Pressure laner',self('ahead',{laning:3,pushing:2})],['Last-hit tutor',lane({farming:4})],
  ],
  [
    ['Farm planner',self('midgame',{farming:5})],['Solo resource reader',self('alone',{farming:4,intuition:1})],
    ['Disciplined farmer',attributes({farming:3})],['Recovery planner',self('behind',{farming:5})],
    ['Efficient practice',training({farming:.18})],['Resource mentor',training({farming:.12},'teammates')],
    ['Wave-sharing partner',lane({farming:3,laning:1})],['Late-game economist',self('late',{farming:5})],
    ['Route evaluator',self('midgame',{farming:3,intuition:2})],['Resource communicator',nearby('paired',{farming:3})],
  ],
  [
    ['Duel reader',self('alone',{skirmish:5})],['Wing player',self('paired',{skirmish:5})],
    ['Opening finder',self('lane',{skirmish:4,intuition:1})],['Midgame playmaker',self('midgame',{skirmish:5})],
    ['Opportunity reader',attributes({skirmish:3})],['Comeback fighter',self('behind',{skirmish:4,teamfights:1})],
    ['Partner in crime',nearby('paired',{skirmish:4})],['Fight communicator',nearby('midgame',{skirmish:3})],
    ['Counterplay coach',training({skirmish:.12},'teammates')],['Advantage reader',self('ahead',{skirmish:3,intuition:2})],
  ],
  [
    ['Formation captain',nearby('grouped',{teamfights:4})],['Duo shotcaller',nearby('paired',{teamfights:4})],
    ['Backline communicator',nearby('grouped',{intuition:3})],['Lane confidence builder',lane({laning:2,intuition:2})],
    ['Group navigator',nearby('moving',{intuition:4})],['Siege shotcaller',nearby('siege',{pushing:4})],
    ['Defensive shotcaller',nearby('defending',{teamfights:4})],['Teamfight student',training({teamfights:.18})],
    ['Late-game captain',nearby('late',{teamfights:4})],['Teamfight mentor',training({teamfights:.12},'teammates')],
  ],
  [
    ['Rotation reader',self('moving',{intuition:5})],['Independent navigator',self('alone',{intuition:4})],
    ['Duo navigator',nearby('paired',{intuition:4})],['Danger evaluator',attributes({intuition:3})],
    ['Map study routine',training({intuition:.18})],['Retreat communicator',nearby('behind',{intuition:4})],
    ['Fresh perspective',self('midgame',{intuition:3,vision:2})],['Recovery navigator',self('recovering',{intuition:5})],
    ['Defensive organizer',nearby('defending',{intuition:4})],['Objective navigator',self('siege',{intuition:4,pushing:1})],
  ],
  [
    ['Solo map reader',self('alone',{vision:5})],['Lane lookout',lane({vision:4})],
    ['Team lookout',nearby('grouped',{vision:4})],['Information processor',attributes({vision:3})],
    ['Vision student',training({vision:.18})],['Lane information partner',lane({vision:2,intuition:2})],
    ['Defensive lookout',nearby('defending',{vision:4})],['Siege lookout',nearby('siege',{vision:4})],
    ['Danger communicator',nearby('recovering',{intuition:3,vision:1})],['Rotation lookout',nearby('moving',{vision:4})],
  ],
  [
    ['Siege planner',self('siege',{pushing:5})],['Independent pressure',self('alone',{pushing:4})],
    ['Objective coordinator',nearby('grouped',{pushing:4})],['Duo pressure partner',nearby('paired',{pushing:4})],
    ['Closing specialist',self('late',{pushing:5})],['Wave-management mentor',training({pushing:.12},'teammates')],
    ['Map-reading mentor',training({vision:.12},'teammates')],['Rotation mentor',training({intuition:.12},'teammates')],
    ['Lane mentor',training({laning:.12},'teammates')],['Practice organizer',training({laning:.08,pushing:.08},'teammates')],
  ],
  [
    ['Recovery routine',recovery(3,'rest')],['Workload discipline',recovery(2,'training')],
    ['Rest advocate',morale(2,'rest','teammates')],['Sustainable schedule',recovery(3,'tired')],
    ['Long-week discipline',attributes({stamina:4})],['Practice pacer',training({stamina:.18})],
    ['Conditioning mentor',training({stamina:.12},'teammates')],['Team break organizer',morale(1,'always','teammates')],
    ['Quiet recovery',morale(3,'rest')],['Recovery-minded competitor',recovery(1,'always')],
  ],
  [
    ['Calming presence',morale(2,'low-morale','teammates')],['Composed competitor',attributes({stability:4})],
    ['Resilient outlook',morale(3,'low-morale')],['Practice encourager',morale(1.5,'training','teammates')],
    ['Steady preparation',training({stability:.18})],['Confidence builder',training({confidence:.12},'teammates')],
    ['Low-pressure teammate',morale(1.5,'tired','teammates')],['Positive routine',morale(1,'always')],
    ['Patient competitor',attributes({stability:2,confidence:2})],['Perspective keeper',morale(2,'tired')],
  ],
  [
    ['Lane student',training({laning:.18})],['Fight student',training({skirmish:.18})],
    ['Creative student',training({creativity:.18})],['Versatile student',training({heroPool:.18})],
    ['Objective student',training({pushing:.18})],['Creative mentor',training({creativity:.12},'teammates')],
    ['Hero-pool mentor',training({heroPool:.12},'teammates')],['Composure mentor',training({stability:.12},'teammates')],
    ['Balanced learner',training({laning:.1,farming:.1,teamfights:.1})],['Study partner',training({intuition:.08,creativity:.08},'teammates')],
  ],
];

/** Stable IDs preserve assignments and saved trees while the mechanics change. */
export const playerInnates:PlayerInnate[]=groups.flatMap((entries,group)=>entries.map(([name,rule],index)=>{
  const prior=legacyPlayerInnates[group*10+index];return {id:prior.id,name,category:prior.category,roles:[...prior.roles],...rule};
}));
export const innateById=new Map(playerInnates.map(i=>[i.id,i]));
