import archive from "./data/hero-role-evidence.json";
export interface RoleEra { year: number; phase?: number }
export interface HeroRoleProfile {
  roles: number[]; weights: number[];
  basis: "observed-role-sample" | "reviewed-era-estimate";
  sourceYear?: number; sourceUrl?: string; games: number;
}
// Conventional fallbacks, not fabricated match observations. Event samples
// override these only when there is sufficient role evidence.
const fallback: Record<string, number[]> = {
  bounty_hunter:[3,4],underlord:[2],io:[3,4],visage:[1,2],
  leshrac:[1,3,4],lina:[1,3,4],tiny:[0,1,3],weaver:[0,3],
  natures_prophet:[0,2,3,4],enchantress:[3,4],naga_siren:[0],
  lycan:[0,2],undying:[3,4],earthshaker:[1,2,3],tinker:[1],
  muerta:[0,3,4],marci:[0,3,4],
};
export function heroRoleProfile(id: string, era: RoleEra, original: number[]): HeroRoleProfile {
  let conventional = fallback[id] ?? original;
  if(id==="bounty_hunter"&&era.year<=2013)conventional=[2,3];
  if(id==="visage"&&era.year<=2015)conventional=[3,4];
  if(id==="weaver"&&era.year<=2013)conventional=[0,2];
  if(id==="tiny"&&era.year<=2013)conventional=[1,2];
  if(id==="natures_prophet"&&era.year<=2013)conventional=[2,3];
  if(id==="tinker"&&(era.year>2024||era.year===2024&&(era.phase??1)===2))conventional=[3,4];
  const anchor=Math.min(2026,era.year-((era.phase??1)===1?1:0));
  const sources=archive.sources.filter(s=>s.year<=anchor&&s.year>=anchor-3).sort((a,b)=>b.year-a.year);
  for(const source of sources){
    const row=source.rows.find(h=>h.id===id);if(!row)continue;
    const total=row.counts.reduce((n,v)=>n+v,0);
    if(!total)continue;
    if(total<8)break; // Sparse current evidence must not resurrect an old role.
    const roles=row.counts.flatMap((n,r)=>n>=3&&n/total>=.15?[r]:[]);
    if(!roles.length)roles.push(row.counts.indexOf(Math.max(...row.counts)));
    // Reviewed modern correction; earlier observed offlane Bounty remains.
    if(id==="bounty_hunter"&&era.year>=2025){const kept=roles.filter(r=>r>=3);roles.splice(0,roles.length,...(kept.length?kept:[3]));}
    return {roles,weights:row.counts.map((n,r)=>roles.includes(r)?n/total:0),basis:"observed-role-sample",sourceYear:source.year,sourceUrl:source.url,games:total};
  }
  return {roles:conventional,weights:Array.from({length:5},(_,r)=>conventional.includes(r)?1/conventional.length:0),basis:"reviewed-era-estimate",games:0};
}
