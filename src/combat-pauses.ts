import type {ReplayFrame} from './battle';

export interface CombatPauseSettings { allyDeath:boolean; buyback:boolean; baseThreat:boolean; teamfight:boolean }
export const noCombatPauses:CombatPauseSettings={allyDeath:false,buyback:false,baseThreat:false,teamfight:false};

/** Called after every authoritative tick, never after a whole playback batch. */
export function combatPauseReason(before:ReplayFrame,after:ReplayFrame,settings:CombatPauseSettings):string|undefined {
  const oldIds=new Set(before.matchEvents?.map(e=>e.id));
  const allies=new Set(after.players.filter(p=>p.team===0).map(p=>p.id));
  const death=after.matchEvents?.find(e=>!oldIds.has(e.id)&&e.kind==='kill'&&e.victimId&&allies.has(e.victimId));
  const buybackReady=settings.buyback&&after.players.some(p=>p.team===0&&p.buyback?.reason===null&&
    after.units.some(u=>u.playerId===p.id&&u.hp<=0)&&before.players.find(old=>old.id===p.id)?.buyback?.reason!==null);
  if(buybackReady||death&&settings.buyback&&after.players.find(p=>p.id===death.victimId)?.buyback?.reason===null)
    return 'An allied player can buy back.';
  if(death&&settings.allyDeath)return 'An allied hero has died.';
  if(settings.baseThreat&&after.units.some(u=>u.team===0&&(u.kind==='base'||u.kind==='tower'&&(u.tier??0)>=3)&&u.hp>0&&u.hp<(before.units.find(p=>p.id===u.id)?.hp??u.hp)))
    return 'Your base is under attack.';
  if(settings.teamfight){
    const contested=(frame:ReplayFrame)=>frame.units.some(u=>u.kind==='hero'&&u.team===0&&u.hp>0&&
      frame.units.filter(e=>e.kind==='hero'&&e.team===1&&e.hp>0&&Math.hypot(e.x-u.x,e.y-u.y)<150).length>=3);
    if(contested(after)&&!contested(before))return 'A major fight is beginning in team vision.';
  }
}
