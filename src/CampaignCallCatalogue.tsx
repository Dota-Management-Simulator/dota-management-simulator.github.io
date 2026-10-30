import { useMemo } from 'react';
import { teamPlayers } from './game';
import type { Campaign } from './game';
import StrategyCatalogue from './StrategyCatalogue';
import { earnedTacticalCalls, tacticalProgressForCampaign } from './tactical-progress';
import { automaticTactics, normalizeTactics } from './tactics';

export default function CampaignCallCatalogue({campaign,onChange}:{campaign:Campaign;onChange:(next:Campaign)=>void}) {
  const config=useMemo(()=>({players:[teamPlayers(campaign).map((p,role)=>({id:p.id,name:p.name,role,skills:p.stats,energy:p.energy,happiness:p.happiness})),[]] as import('./battle').BattleConfig['players'],patchObservers:[{teamKey:'managed',staffIds:campaign.staffIds},{teamKey:'opponent',staffIds:[]}] as import('./battle').BattleConfig['patchObservers'],tacticalUnlocks:[earnedTacticalCalls(campaign),undefined] as import('./battle').BattleConfig['tacticalUnlocks']}),[campaign]);
  const victories=tacticalProgressForCampaign(campaign).victories;
  return <section aria-label="Club call playbook"><p className="field-note">Club playbook · {victories.length} competitive series {victories.length===1?'victory':'victories'} recorded. Learned calls remain with your club across seasons and roster changes.</p><StrategyCatalogue config={config} onEquip={(phase,id,index)=>{
    const preparation=campaign.tacticalPreparation?normalizeTactics(campaign.tacticalPreparation):automaticTactics(config.players[0],campaign.staffIds,config.tacticalUnlocks?.[0]);
    const slots=[...preparation.slots[phase]],other=slots.indexOf(id);
    if(other>=0)slots[other]=slots[index];slots[index]=id;
    onChange({...campaign,tacticalPreparation:{...preparation,slots:{...preparation.slots,[phase]:slots}}});
  }}/></section>;
}
