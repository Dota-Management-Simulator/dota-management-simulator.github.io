import type { BattleConfig } from "./battle";
import { heroById, heroRoles } from "./heroes";
import { automaticBuild, buildStyles, itemForPatch } from "./items";
import { patchById } from "./patches";
import { gamePhases, phaseLabels, strategies, strategyById, strategyUnlocked, unlockDescription } from "./tactics";
import type { TacticalPreparation as Preparation } from "./tactics";
import StrategyCatalogue from './StrategyCatalogue';
import "./tactics.css";

export default function TacticalPreparation({config,preparation,onChange,onSave}: {
  config:BattleConfig;preparation:Preparation;onChange:(p:Preparation)=>void;onSave:()=>void;
}) {
  const patch=patchById(config.patchId),staff=config.patchObservers?.[0]?.staffIds??[];
  return <section className="tactical-preparation" aria-label="Tactical playbook preparation">
    <div className="eyebrow">YOUR MATCH PLAYBOOK</div><h3>Prepare three calls for each phase.</h3>
    <p>Players make their own decisions throughout the map. Your calls change their movement or item priorities. Calls can be reused after recovery when their conditions are met.</p>
    <label className="glyph-preference"><input type="checkbox" checked={preparation.autoGlyph!==false} onChange={e=>onChange({...preparation,autoGlyph:e.target.checked})}/> Auto Glyph · protect low-health buildings under attack</label>
    <p className="field-note">You can always activate Glyph manually when ready. Turn Auto Glyph off to control every use. This preference is saved with your playbook.</p>
    <div className="tactic-phase-grid">{gamePhases.map(phase=><section key={phase}><h4>{phaseLabels[phase]}</h4>{preparation.slots[phase].map((id,index)=>{
      const selected=strategyById(id)!;
      return <label key={index}>Quick slot {index+1}<select aria-label={`${phase} strategy ${index+1}`} value={id} onChange={e=>{
        const slots=[...preparation.slots[phase]],other=slots.indexOf(e.target.value);
        if(other>=0)slots[other]=slots[index];slots[index]=e.target.value;
        onChange({...preparation,slots:{...preparation.slots,[phase]:slots}});
      }}>{strategies.filter(s=>s.phases.includes(phase)).map(s=>{
        const unlocked=strategyUnlocked(s,config.players[0],staff,config.tacticalUnlocks?.[0]);
        return <option key={s.id} value={s.id} disabled={!unlocked}>{s.name}{unlocked?"":" · locked"}</option>;
      })}</select><small>{selected.description}</small>{!strategyUnlocked(selected,config.players[0],staff,config.tacticalUnlocks?.[0])&&<small className="tactic-warning">{unlockDescription(selected)}</small>}</label>;
    })}</section>)}</div>
    <StrategyCatalogue config={config} onEquip={(phase,id,index)=>{
      const slots=[...preparation.slots[phase]],other=slots.indexOf(id);
      if(other>=0)slots[other]=slots[index];slots[index]=id;
      onChange({...preparation,slots:{...preparation.slots,[phase]:slots}});
    }}/>
    <h4>Item builds</h4><p>Automatic builds follow hero type and role. A live purchase call takes priority until bought or cancelled. Purchases spend match gold.</p>
    <div className="tactic-builds">{config.players[0].map((p,role)=>{
      const hero=heroById(config.draft?.[0][role]??"");
      return <label key={p.id}>{p.name} · {heroRoles[role]}{hero&&<small>{hero.name}</small>}<select aria-label={`${p.name} item build`} value={preparation.builds[role]} onChange={e=>onChange({...preparation,builds:preparation.builds.map((style,i)=>i===role?e.target.value as typeof style:style)})}>
        {buildStyles.map(style=><option key={style} value={style}>{style[0].toUpperCase()+style.slice(1)}</option>)}
      </select>{hero&&<small>{automaticBuild(hero,role,preparation.builds[role]).map(id=>itemForPatch(id,patch).name).join(" → ")}</small>}</label>;
    })}</div>
    <button className="button secondary small-button" onClick={onSave}>Save playbook & builds</button>
    <p className="field-note">Historical shop prices and scaled attributes follow the match patch. Live item priorities offer the era’s catalogue, including eligible Scepters and Shards. Active effects are simplified. Coaches, qualifying player skills and competitive victories unlock calls; see the catalogue for each route.</p>
  </section>;
}
