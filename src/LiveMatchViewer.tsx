import { startSimulationWorker } from "./simulation-worker";
import { patchLabel } from "./patch-label";
import { memo, useEffect, useRef, useState } from "react";
import { Pause, Play, SkipForward } from "lucide-react";
import { matchClock } from "./battle";
import type { BattleConfig, ReplayFrame, SimulatedSeries } from "./battle";
import type { LiveRequest, LiveUpdate } from "./live-battle";
import { HeroToken, MapReplay, PLAYBACK_SPEEDS, speedLabel } from "./MatchExperience";
import ItemInventory from "./ItemInventory";
import { itemById, itemsAvailableForPatch } from "./items";
import { patchById } from "./patches";
import { phaseLabels, strategyById } from "./tactics";
import TeamBadge from "./TeamBadge";
import { teamIdForName } from "./team-logos";
import { liveCadence } from "./match-playback";
import SpellPanel from "./SpellPanel";
import { RespawnStatus } from "./MatchAnnouncer";
import {noCombatPauses} from './combat-pauses';
import type {CombatPauseSettings} from './combat-pauses';
import WardPlacement from './WardPlacement';
import StrategyCatalogue from './StrategyCatalogue';
import "./tactics.css";
import './combat-mobile.css';

export default function LiveMatchViewer({config,onComplete,managedTeamId,onAutoGlyphChange}:{config:BattleConfig;onComplete:(s:SimulatedSeries)=>void;managedTeamId?:string;onAutoGlyphChange?:(enabled:boolean)=>void}) {
  const [live,setLive]=useState<LiveUpdate|null>(null),[playing,setPlaying]=useState(true),[speed,setSpeed]=useState(1);
  const [busy,setBusy]=useState(true),[finishing,setFinishing]=useState(false),[error,setError]=useState(""),[retry,setRetry]=useState(0);
  const [target,setTarget]=useState(config.players[0][0].id),[notice,setNotice]=useState("");
  const [purchase,setPurchase]=useState('scepter');
  const [mobileView,setMobileView]=useState('map'),[pauses,setPauses]=useState<CombatPauseSettings>({...noCombatPauses});
  const worker=useRef<Worker|null>(null),pending=useRef(true),completed=useRef(false),finishRef=useRef(onComplete);
  const autoGlyphRef=useRef(onAutoGlyphChange),reportedAutoGlyph=useRef(config.tacticalPreparations?.[0]?.autoGlyph!==false);
  autoGlyphRef.current=onAutoGlyphChange;
  finishRef.current=onComplete;
  useEffect(()=>{
    completed.current=false;pending.current=true;setBusy(true);setError("");setFinishing(false);setLive(null);setNotice("");
    reportedAutoGlyph.current=config.tacticalPreparations?.[0]?.autoGlyph!==false;
    let preferencesSent=false;

    const fail=(message:string)=>{worker.current?.terminate();worker.current=null;pending.current=false;setBusy(false);setFinishing(false);setError(message);};
    const w=startSimulationWorker(()=>new Worker(new URL("./battle.worker.ts",import.meta.url),{type:"module"}),{type:"start-live",config} satisfies LiveRequest,({data},w)=>{
      if(worker.current!==w||completed.current)return;
      pending.current=false;setBusy(false);
      if(data.type==="error"){fail(data.message);return;}
      if(data.type!=="live")return;
      const update=data as LiveUpdate;setFinishing(false);setLive(update);setNotice(update.message??update.tactics.events.at(-1)?.message??"");
      if(!preferencesSent){preferencesSent=true;if(Object.values(pauses).some(Boolean)){pending.current=true;setBusy(true);w.postMessage({type:'pause-settings',settings:pauses} satisfies LiveRequest);}}
      if(update.pauseReason){setPlaying(false);setNotice(`Paused · ${update.pauseReason}`);}
      const auto=update.frame.glyphs?.[0].auto;
      if(auto!=null&&auto!==reportedAutoGlyph.current){reportedAutoGlyph.current=auto;autoGlyphRef.current?.(auto);}
      if(update.simulation){completed.current=true;w.terminate();worker.current=null;finishRef.current(update.simulation);}
    },()=>fail("The live map worker stopped. Completed maps are retained; restart this map to retry."));
    worker.current=w;
    return()=>{w?.terminate();if(worker.current===w)worker.current=null;};
  },[config,retry]);
  const send=(request:LiveRequest)=>{
    if(!worker.current||pending.current||completed.current||error)return;
    pending.current=true;setBusy(true);worker.current.postMessage(request);
  };
  useEffect(()=>{
    if(!playing||!live||busy||finishing||error)return;
    // 1× is thirty game seconds per real second; faster speeds take bigger steps.
    const {intervalMs,seconds}=liveCadence(speed);
    const timer=setTimeout(()=>send({type:"advance",seconds}),intervalMs);
    return()=>clearTimeout(timer);
  },[playing,live,busy,speed,finishing,error]);
  const patch=patchById(config.patchId);
  if(error)return <div className="computing-match"><h2 id="modal-title">The map stopped.</h2><p role="alert">{error}</p><button className="button secondary" onClick={()=>{setPlaying(false);setRetry(n=>n+1);}}>Restart this map</button></div>;
  if(!live)return <div className="computing-match" role="status"><h2 id="modal-title">The team takes the stage.</h2><p>Preparing the live map…</p></div>;
  const frame=live.frame,tactics=live.tactics,active=tactics.active;
  const glyph=frame.glyphs?.[0],glyphActive=!!glyph&&glyph.activeUntil>frame.time;
  const glyphReason=!glyph?'Unavailable in this legacy match':glyphActive?'Glyph is active':glyph.readyAt>frame.time?`Ready in ${matchClock(glyph.readyAt-frame.time)}`:null;
  const deadAllies=frame.players.filter(p=>p.team===0&&frame.units.some(u=>u.playerId===p.id&&u.hp<=0));
  return <div className="match-viewer live-match" data-mobile-view={mobileView}>
    <div className="watch-heading"><div><div className="eyebrow">LIVE MATCH · PATCH {patchLabel(config.patchId)}</div><h2 id="modal-title">Read the map. Call the play.</h2><p className="patch-match-label">{phaseLabels[tactics.phase]} · {playing?"Playing":"Paused"}</p></div>
      <button className="button secondary small-button" disabled={busy||finishing} onClick={()=>{setPlaying(false);setFinishing(true);send({type:"finish-live"});}}><SkipForward size={15}/>{finishing?"Finishing map…":"Simulate remainder"}</button></div>
    <div className="live-score"><strong><TeamBadge teamId={managedTeamId} name={config.teams[0]} year={config.year} size="small"/>{config.teams[0]}</strong><span><b>{frame.kills[0]}</b><small>{matchClock(frame.time)}</small><b>{frame.kills[1]}</b></span><strong><TeamBadge teamId={teamIdForName(config.teams[1],config.year)} name={config.teams[1]} year={config.year} size="small"/>{config.teams[1]}</strong></div>
    <div className="combat-command-bar"><div className="watch-controls"><button className="button secondary combat-play" disabled={finishing} aria-label={playing?"Pause match":"Resume match"} onClick={()=>setPlaying(p=>!p)}>{playing?<Pause size={18}/>:<Play size={18}/>} {playing?'Pause':'Resume'}</button><label>Speed<select aria-label="Match speed" value={speed} onChange={e=>setSpeed(Number(e.target.value))}>{PLAYBACK_SPEEDS.map(s=><option key={s} value={s}>{speedLabel(s)}</option>)}</select></label><button className="text-link" disabled={playing||busy||finishing} onClick={()=>send({type:"advance",seconds:60})}>+1 minute</button></div>
      <nav className="combat-mobile-tabs" aria-label="Combat panels">{[['map','Map'],['team','Team'],['events','Events'],['calls','Calls']].map(([id,label])=><button key={id} aria-pressed={mobileView===id} onClick={()=>setMobileView(id)}>{label}</button>)}</nav>
    </div>
    <details className="combat-pause-settings"><summary>Optional automatic pauses</summary><p>The simulation stops on the event tick, including at faster speeds. Simulate remainder bypasses pauses.</p>{([['allyDeath','Ally dies'],['buyback','Ally can buy back'],['baseThreat','Base under attack'],['teamfight','Major fight enters team vision']] as const).map(([key,label])=><label key={key}><input type="checkbox" disabled={busy||finishing} checked={pauses[key]} onChange={e=>{const settings={...pauses,[key]:e.target.checked};setPauses(settings);send({type:'pause-settings',settings});}}/>{label}</label>)}</details>
    {!!deadAllies.length&&<section className="combat-buybacks" aria-label="Allied buybacks"><strong>Bring a player back</strong>{deadAllies.map(p=><button key={p.id} className="button secondary" disabled={busy||finishing||!p.buyback||!!p.buyback.reason} onClick={()=>send({type:'buyback',playerId:p.id,at:frame.time})}>{p.player} · Buyback {p.buyback?.cost??'—'} gold<small>{p.buyback?.reason??'Return at fountain · adds a respawn penalty'}</small></button>)}</section>}
    {glyph&&<section className="glyph-controls" aria-label="Team defenses">
      <button className={`button ${glyphActive?'primary':'secondary'}`} disabled={busy||finishing||!!glyphReason} title={glyphReason??'Protect allied buildings. Shares its cooldown with Auto Glyph.'} onClick={()=>send({type:'glyph',at:frame.time})}>
        Glyph of Fortification <small>{glyphActive?`Active · ${Math.ceil(glyph.activeUntil-frame.time)}s`:glyphReason??'Ready'}</small>
      </button>
      <label><input type="checkbox" checked={glyph.auto} disabled={busy||finishing} onChange={e=>send({type:'auto-glyph',enabled:e.target.checked})}/> Auto Glyph</label>
      <span>Automatically protects low-health buildings under attack. Turn off to save it for your call.</span>
      {frame.glyphs&&frame.glyphs[1].activeUntil>frame.time&&<strong>Enemy Glyph active · {Math.ceil(frame.glyphs[1].activeUntil-frame.time)}s</strong>}
    </section>}
    <div className="watch-layout watch-with-spells"><SpellPanel key={config.seed} frame={frame} patchId={config.patchId} playing={playing&&!finishing}><WardPlacement frame={frame} patchId={config.patchId} disabled={busy||finishing} onPlace={order=>send({type:'ward',order,at:frame.time})} onPlanning={()=>setPlaying(false)}>{(onPoint,overlay)=><div className="map-wrap"><MapReplay before={frame} after={frame} ratio={0} transitionMs={playing&&!finishing?liveCadence(speed).intervalMs:0} expanded={(patch?.year??0)>=2023} patchId={config.patchId} selectedUnitIds={active?.participants} onMapPoint={onPoint} overlay={overlay}/><span className="map-live-label"><i/>TEAM VISION · {matchClock(frame.time)}</span></div>}</WardPlacement></SpellPanel>
    <section className="tactics-console" aria-label="Live tactical calls">
      <StrategyCatalogue config={config}/>
      <div className="tactics-console-head"><div className="eyebrow">{phaseLabels[tactics.phase]} · THREE QUICK SLOTS</div><label>Purchase order target<select aria-label="Purchase order target" disabled={busy||finishing} value={target} onChange={e=>{setTarget(e.target.value);send({type:"inspect",playerId:e.target.value});}}><option value="all">All players</option>{config.players[0].map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select></label></div>
      <div className="tactic-quick-slots">{tactics.slots.map((slot,i)=>{const s=strategyById(slot.strategyId)!;return <button key={s.id} className="button secondary" disabled={busy||finishing||!!slot.reason} title={slot.reason??s.description} onClick={()=>send({type:"order",at:frame.time,order:{strategyId:s.id,...(s.kind==="item"?{targetPlayerId:target}:{})}})}><strong>{i+1}. {s.name}</strong><small>{slot.reason??s.description}</small></button>;})}</div>
      {active&&<div className="active-play"><strong>{strategyById(active.strategyId)?.name} · {active.stage} · {active.source==="manager"?"Your call":"Team decision"}</strong><p>Ends by {matchClock(active.expiresAt)}. Players can disengage if the situation becomes unsafe.</p><button className="text-link" disabled={busy||finishing} onClick={()=>send({type:"cancel-order"})}>Cancel movement</button></div>}
      <div className="tactic-purchase-targets">{tactics.itemTargets.map(t=><button key={t.playerId} className="text-link" disabled={busy||finishing} onClick={()=>send({type:"cancel-item",playerId:t.playerId})}>{config.players[0].find(p=>p.id===t.playerId)?.name} saving for {itemById(t.item)?.name} · Cancel</button>)}</div>
      <div className="live-match-status" role="status">{finishing?"Continuing this same map with all accepted calls…":notice}</div>
      {!!frame.siegeEvents?.length&&<details><summary>Fortification & buybacks</summary><ol className="tactic-log">{frame.siegeEvents.slice(-8).map((e,i)=><li key={`${e.time}-${i}`}><time>{matchClock(e.time)}</time>{config.teams[e.team]} · {e.message}</li>)}</ol></details>}
      <div className="patch-log-filters"><label>Item build priority<select aria-label="Item build priority" value={purchase} disabled={busy||finishing} onChange={e=>setPurchase(e.target.value)}>{itemsAvailableForPatch(patch).sort((a,b)=>a.name.localeCompare(b.name)).map(item=><option key={item.id} value={item.id}>{item.name} · {item.cost} gold</option>)}</select></label><button className="button secondary" disabled={busy||finishing} onClick={()=>send({type:'purchase-item',playerId:target,itemId:purchase})}>Save for item</button></div>
      {!!tactics.events.length&&<details><summary>Recent tactical decisions</summary><ol className="tactic-log">{tactics.events.map((e,i)=><li key={`${e.time}-${i}`}><time>{matchClock(e.time)}</time>{e.message}</li>)}</ol></details>}
    </section>
    </div>
    <LiveRosters config={config} frame={frame} disabled={busy||finishing} onBuyback={id=>send({type:'buyback',playerId:id,at:frame.time})} />
    <p className="match-footnote">Only your team's current vision is shown. Hidden enemy inventories and cooldowns stay hidden. Orders use the current match clock. Simulating the remainder preserves accepted orders.</p>
  </div>;
}

// Pending worker requests change button availability, not roster contents.
const LiveRosters = memo(function LiveRosters({ config, frame, disabled, onBuyback }: { config: BattleConfig; frame: ReplayFrame; disabled:boolean; onBuyback:(id:string)=>void }) {
  const patch = patchById(config.patchId);
  return <div className="live-rosters">{([0,1] as const).map(side=><section key={side}><h3>{config.teams[side]}</h3>{frame.players.filter(p=>p.team===side).map(p=>{
      const unit=frame.units.find(u=>u.kind==="hero"&&u.team===p.team&&u.heroId===p.heroId);
      return <div className="live-inventory-row" key={p.id}><div className="live-player"><HeroToken score={p}/><span><strong>{p.player}</strong><small>{p.hero} · {unit&&unit.hp>0?`${Math.round(unit.hp/unit.max*100)}% HP`:"Dead"}</small><RespawnStatus frame={frame} player={p}/><small>{p.attackRange!=null?`Range ${p.attackRange} · `:""}{p.lastHits} LH{p.denies!=null?` / ${p.denies} denies`:''}{p.buybacks?` · ${p.buybacks} buyback${p.buybacks===1?'':'s'}`:''}</small></span><b>{p.kills}/{p.deaths}/{p.assists}<small>LV {p.level}</small></b></div><ItemInventory player={p} patch={patch} time={frame.time} showNext/>
        {side===0&&p.buyback&&unit&&unit.hp<=0&&<button className="button secondary small-button" disabled={disabled||!!p.buyback.reason} title={p.buyback.reason??'Return at your fountain; costs match gold and adds a respawn penalty.'} onClick={()=>onBuyback(p.id)}>Buyback · {p.buyback.cost} gold<small>{p.buyback.reason??'Ready'}</small></button>}</div>;
    })}</section>)}</div>;
});
