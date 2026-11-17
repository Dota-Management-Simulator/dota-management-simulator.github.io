import type { BattleConfig } from "./battle";
import { heroById, heroRoles } from "./heroes";
import { automaticBuild, buildStyles, itemForPatch } from "./items";
import { patchById } from "./patches";
import { gamePhases, phaseLabels, styleHighlights, teamStyleInfo, teamStyles, timingInfo, timingPreferences, strategyUnlocked, unlockDescription } from "./tactics";
import type { Strategy, TacticalPreparation as Preparation } from "./tactics";
import StrategyCatalogue from './StrategyCatalogue';
import "./tactics.css";

export default function TacticalPreparation({config,preparation,onChange,onSave}: {
  config:BattleConfig;preparation:Preparation;onChange:(p:Preparation)=>void;onSave:()=>void;
}) {
  const patch=patchById(config.patchId),staff=config.patchObservers?.[0]?.staffIds??[];
  return <section className="tactical-preparation" aria-label="Team style preparation">
    <div className="eyebrow">YOUR GAME PLAN</div><h3>Set how the team plays.</h3>
    <p>Coaches don't call plays during a map. Pick a style and a timing; your players read the game and choose their own calls to fit it.</p>
    <fieldset className="tactic-choice-grid"><legend>Team style</legend>{teamStyles.map(style=><label key={style} className={preparation.style===style?"selected":""}>
      <input type="radio" name="team-style" value={style} checked={preparation.style===style} onChange={()=>onChange({...preparation,style})}/>
      <strong>{teamStyleInfo[style].name}</strong><small>{teamStyleInfo[style].description}</small></label>)}</fieldset>
    <fieldset className="tactic-choice-grid timing"><legend>Timing</legend>{timingPreferences.map(timing=><label key={timing} className={preparation.timing===timing?"selected":""}>
      <input type="radio" name="team-timing" value={timing} checked={preparation.timing===timing} onChange={()=>onChange({...preparation,timing})}/>
      <strong>{timingInfo[timing].name}</strong><small>{timingInfo[timing].description}</small></label>)}</fieldset>
    <div className="tactic-phase-grid">{gamePhases.map(phase=>{
      const unlocked=(s:Strategy)=>strategyUnlocked(s,config.players[0],staff,config.tacticalUnlocks?.[0]);
      const ranked=styleHighlights(preparation,phase,6),leans=ranked.filter(unlocked).slice(0,3);
      const locked=ranked.slice(0,3).filter(s=>!unlocked(s));
      return <section key={phase}><h4>{phaseLabels[phase]}</h4><small>Players lean on</small><ul>{leans.map(s=><li key={s.id}>{s.name}</li>)}</ul>
        {locked.map(s=><small key={s.id} className="tactic-warning">Not learned yet: {s.name}. {unlockDescription(s)}.</small>)}</section>;
    })}</div>
    <label className="glyph-preference"><input type="checkbox" checked={preparation.autoGlyph!==false} onChange={e=>onChange({...preparation,autoGlyph:e.target.checked})}/> Auto Glyph · protect low-health buildings under attack</label>
    <p className="field-note">You can always activate Glyph manually when ready. Turn Auto Glyph off to control every use. This preference is saved with your plan.</p>
    <StrategyCatalogue config={config}/>
    <h4>Item builds</h4><p>Automatic builds follow hero type and role. A live item priority overrides the build until bought or cancelled. Purchases spend match gold.</p>
    <div className="tactic-builds">{config.players[0].map((p,role)=>{
      const hero=heroById(config.draft?.[0][role]??"");
      return <label key={p.id}>{p.name} · {heroRoles[role]}{hero&&<small>{hero.name}</small>}<select aria-label={`${p.name} item build`} value={preparation.builds[role]} onChange={e=>onChange({...preparation,builds:preparation.builds.map((style,i)=>i===role?e.target.value as typeof style:style)})}>
        {buildStyles.map(style=><option key={style} value={style}>{style[0].toUpperCase()+style.slice(1)}</option>)}
      </select>{hero&&<small>{automaticBuild(hero,role,preparation.builds[role]).map(id=>itemForPatch(id,patch).name).join(" → ")}</small>}</label>;
    })}</div>
    <button className="button secondary small-button" onClick={onSave}>Save plan & builds</button>
    <p className="field-note">Historical shop prices and scaled attributes follow the match patch. Live item priorities offer the era’s catalogue, including eligible Scepters and Shards. Active effects are simplified. Coaches, qualifying player skills and competitive victories teach your players more calls; see the catalogue for each route.</p>
  </section>;
}
