import { useState, type ReactNode } from 'react';
import type { ReplayFrame } from './battle';
import { abilityIcon, abilitySummary, combatCatalogue } from './combat-model';
import { patchById } from './patches';
import { HeroToken } from './MatchExperience';
import ItemInventory from './ItemInventory';
import { RecordedPlayerIdentity } from './PlayerIdentity';
import { MapObjectiveLegend } from './MapObjectives';
import MatchAnnouncer, { RespawnStatus } from './MatchAnnouncer';
import './spells.css';

function SpellIcon({id,name}:{id:string;name:string}){
  const [failed,setFailed]=useState(false);
  return failed?<span className="spell-fallback">{name.split(' ').map(s=>s[0]).join('').slice(0,3)}</span>:<img src={abilityIcon(id)} alt="" onError={()=>setFailed(true)}/>;
}
export default function SpellPanel({frame,nextFrame,time=frame.time,patchId,team=0,playing=true,children}:{frame:ReplayFrame;nextFrame?:ReplayFrame;time?:number;patchId?:string;team?:0|1;playing?:boolean;children:ReactNode}){
  const patch=patchById(patchId),catalogue=combatCatalogue(patch);
  const [inspectedSpell,setInspectedSpell]=useState<string>();
  const casts=[...new Map([...(frame.spellCasts??[]),...(nextFrame?.spellCasts??[])].filter(c=>c.time<=time&&c.time>time-30).map(c=>[`${c.playerId}:${c.abilityId}:${c.time}`,c])).values()];
  const enemies=casts.filter(c=>c.team!==team).sort((a,b)=>b.time-a.time).slice(0,12);
  return <section className="spell-map-layout" aria-label="Map and spell activity"><aside className="spell-panel allied-spell-panel" aria-label="Your team’s cooldowns"><div className="spell-panel-heading"><div><div className="eyebrow">YOUR TEAM</div><h3>Spells &amp; items</h3></div></div><p>Match-clock cooldowns · learned spell ranks</p><div className="allied-spell-roster">{frame.players.filter(p=>p.team===team).map(player=>{
      return <div className="hero-spells" key={player.id}><div className="spell-player"><HeroToken score={player}/><div><strong>{player.player}</strong><small>{player.hero} · Lv {player.level}</small><RespawnStatus frame={frame} player={player} time={time} nextFrame={nextFrame}/>{player.mana!=null&&<small className="spell-mana">{player.mana} / {player.maxMana} mana</small>}{player.hpRegen!=null&&<small>+{player.hpRegen} HP/s · +{player.manaRegen} mana/s</small>}</div></div>
        <div className="spell-slots">{player.spells?.map(state=>{
          const definition=catalogue?.abilities[state.id];if(!definition)return null;
          const latest=casts.filter(c=>c.playerId===player.id&&c.abilityId===state.id).at(-1);
          const lastCast=latest?.time??state.lastCastAt;
          const readyAt=latest?Math.max(state.readyAt,latest.time+state.cooldown):state.readyAt;
          const remaining=Math.max(0,Math.ceil(readyAt-time));
          const status=state.locked??(state.passive?'Passive':remaining?`${remaining}s`:((player.mana??0)<state.manaCost?'No mana':'Ready'));
          const active=lastCast!==undefined&&time-lastCast>=0&&time-lastCast<6;
          return <button type="button" key={state.id} onClick={()=>setInspectedSpell(inspectedSpell===`${player.id}:${state.id}`?undefined:`${player.id}:${state.id}`)} aria-pressed={inspectedSpell===`${player.id}:${state.id}`} className={`spell-slot ${state.locked?'locked':''} ${active?'casting':''}`} title={`${definition.name} · ${status} · Rank ${state.rank} · ${state.cooldown}s cooldown · ${state.manaCost} mana. ${abilitySummary(definition,state.rank)}`} aria-label={`${player.hero}, ${definition.name}, ${status}. ${abilitySummary(definition,state.rank)}`}><div className="spell-art"><SpellIcon id={state.id} name={definition.name}/>{remaining>0&&!state.passive&&!state.locked&&<b>{remaining}</b>}{active&&<span className="spell-cast-flash">CAST</span>}</div><strong>{definition.name}</strong><small>{status}</small>{inspectedSpell===`${player.id}:${state.id}`&&<span className="spell-tap-description">Rank {state.rank} · {state.manaCost} mana · {state.cooldown}s cooldown. {abilitySummary(definition,state.rank)}</span>}</button>;
        })??<small>No spell telemetry in this older replay.</small>}</div>{player.spells&&<details className="spell-guide"><summary>What these spells do</summary>{player.spells.map(s=>{const a=catalogue?.abilities[s.id];return a?<p key={s.id}><strong>{a.name}</strong> {abilitySummary(a,s.rank)}</p>:null;})}</details>}<ItemInventory player={player} patch={patch} time={time} showNext compact/>{(player.playerIdentity||player.heroMastery)&&<details className="spell-guide"><summary>Player mastery, innate &amp; talents</summary><RecordedPlayerIdentity player={player}/></details>}</div>;
    })}</div></aside><div className="spell-map-stage"><MatchAnnouncer frame={frame} nextFrame={nextFrame} time={time} playing={playing}/>{children}<MapObjectiveLegend frame={frame} patchId={patchId}/></div><aside className="spell-panel enemy-spell-feed" aria-label="Enemy items and casts"><div className="eyebrow">OPPONENTS</div><h3>Current items</h3><p>Items owned at the current match time.</p><div className="enemy-item-roster">{frame.players.filter(p=>p.team!==team).map(player=><div className="enemy-item-player" key={player.id}><div className="spell-player"><HeroToken score={player}/><div><strong>{player.player}</strong><small>{player.hero} · Lv {player.level}</small><RespawnStatus frame={frame} player={player} time={time} nextFrame={nextFrame}/></div></div><ItemInventory player={player} patch={patch} time={time} compact/></div>)}</div><div className="enemy-cast-section"><h4>Recent casts</h4><p>Cast icons fade away. Enemy cooldowns stay hidden.</p>{!enemies.length&&<small>No recent enemy casts.</small>}<div className="enemy-spell-icons">{enemies.map(c=>{
      const a=catalogue?.abilities[c.abilityId],player=frame.players.find(p=>p.id===c.playerId);
      return <span className="enemy-cast" key={`${c.playerId}:${c.abilityId}:${c.time}`} style={{opacity:Math.max(.12,1-(time-c.time)/30)}} title={`${player?.hero??c.heroId} · ${a?.name??c.abilityId}`}><SpellIcon id={c.abilityId} name={a?.name??c.abilityId}/><small>{player?.hero}</small><strong>{a?.name??c.abilityId}</strong></span>;
    })}</div></div></aside><small className="spell-precision">{catalogue?.source.provisional?'Early-era kit and cooldown values are provisional; the oldest recovered files are from 2013.':'Source rank cooldowns and mana costs; effects are scaled to this simplified simulation.'}</small>
  </section>;
}
