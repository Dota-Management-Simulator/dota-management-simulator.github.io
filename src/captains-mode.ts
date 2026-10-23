import type { SeasonPatch } from "./patches";
export interface DraftStep { side: 0|1; kind: "pick"|"ban"; phase: number }
export interface CaptainsRules {
  id: string; version: string; summary: string; source: string;
  phases: { kind: "pick"|"ban"; order: number[] }[];
}
const phase = (kind: "pick"|"ban", order: string) => ({kind,order:[...order].map(Number)});
const rules = (id:string,version:string,summary:string,source:string,orders:string[]):CaptainsRules=>({id,version,summary,source,phases:orders.map((v,i)=>phase(i%2?"pick":"ban",v))});
const steam = (n:number)=>`https://store.steampowered.com/news/${n}/`;
export const captainRules: CaptainsRules[] = [
  rules("ti1","TI1 client","Two ban phases (2/2 per team), with 3/2 picks. Early-client sequence reconstructed from TI1 draft records.","https://stats.ru.spectral.gg/lrg2/?league=ti1&mod=heroes-draft",["0101","011001","0101","0101"]),
  rules("five-bans","6.73–6.74","Five bans per team: 3/2, with 3/2 picks.",steam(7489),["010101","011001","0101","0101"]),
  rules("6.75","6.75","Bans move from 3/2 to 2/3.",steam(9016),["0101","011001","010101","0101"]),
  rules("6.78","6.78c","Three draft phases: 2/2/1 bans and 2/2/1 picks.",steam(10779),["0101","0110","0101","1010","10","10"]),
  rules("6.87","6.87","Second bans start with second pick; final picks now start with first pick.","https://www.dota2.com/687",["0101","0110","1010","1010","10","01"]),
  rules("7.07","7.07","An extra opening ban: 3/2/1 bans per team.","https://www.dota2.com/duelingfates/",["010101","0110","1010","1010","10","01"]),
  rules("7.25","7.25","Bans shift from 3/2/1 to 4/1/1.","https://www.dota2.com/patches/7.25",["01010101","0110","10","1010","10","01"]),
  rules("7.27","7.27","Seven bans: 2/3/2. First picks alternate; the final ban phase expands.","https://www.dota2.com/patches/7.27",["0101","0101","101010","1010","0101","01"]),
  rules("7.29","7.29","First picks return to first/second/second/first.","https://www.dota2.com/patches/7.29",["0101","0110","101010","1010","0101","01"]),
  rules("7.30","7.30","Second pick phase changes to second/first/first/second.","https://www.dota2.com/patches/7.30",["0101","0110","101010","1001","0101","01"]),
  rules("7.34","7.34","Asymmetric opening bans: 3/2/2 for first pick, 4/1/2 for second; both pick 1/3/1.","https://www.dota2.com/patches/7.34",["0110110","01","001","100110","0110","01"]),
];
export function captainsRulesFor(patch?: Pick<SeasonPatch,"year"|"phase">): CaptainsRules {
  if(!patch)return captainRules[0];
  const n=patch.year*10+patch.phase;
  const index=n>=20232?10:n>=20212?9:n>=20211?8:n>=20202?7:n>=20201?6:n>=20181?5:n>=20162?4:n>=20132?3:n>=20131?2:n>=20121?1:0;
  return captainRules[index];
}
export function draftSequence(patch: Pick<SeasonPatch,"year"|"phase">|undefined, firstPick:0|1):DraftStep[]{
  return captainsRulesFor(patch).phases.flatMap((p,i)=>p.order.map(side=>({side:(side^firstPick) as 0|1,kind:p.kind,phase:Math.floor(i/2)+1})));
}
