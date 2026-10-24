import { useEffect, useRef, useState } from "react";
import { Pause, Play, SkipForward } from "lucide-react";
import { matchClock } from "./battle";
import type { BattleConfig, SimulatedSeries } from "./battle";
import type { LiveRequest, LiveUpdate } from "./live-battle";
import { HeroToken, MapReplay } from "./MatchExperience";
import ItemInventory from "./ItemInventory";
import { itemById } from "./items";
import { patchById } from "./patches";
import { phaseLabels, strategyById } from "./tactics";
import TeamBadge from "./TeamBadge";
import { teamIdForName } from "./team-logos";
import "./tactics.css";

export default function LiveMatchViewer({config,onComplete,managedTeamId}:{config:BattleConfig;onComplete:(s:SimulatedSeries)=>void;managedTeamId?:string}) {
  const [live,setLive]=useState<LiveUpdate|null>(null),[playing,setPlaying]=useState(true),[speed,setSpeed]=useState(1);
  const [busy,setBusy]=useState(true),[finishing,setFinishing]=useState(false),[error,setError]=useState(""),[retry,setRetry]=useState(0);
  const [target,setTarget]=useState(config.players[0][0].id),[notice,setNotice]=useState("");
  const worker=useRef<Worker|null>(null),pending=useRef(true),completed=useRef(false),finishRef=useRef(onComplete);
  finishRef.current=onComplete;
  useEffect(()=>{
    completed.current=false;pending.current=true;setBusy(true);setError("");setFinishing(false);setLive(null);setNotice("");
    const w=new Worker(new URL("./battle.worker.ts",import.meta.url),{type:"module"});worker.current=w;
    const fail=(message:string)=>{w.terminate();worker.current=null;pending.current=false;setBusy(false);setFinishing(false);setError(message);};
    w.onmessage=({data})=>{
      if(worker.current!==w||completed.current)return;
      pending.current=false;setBusy(false);
      if(data.type==="error"){fail(data.message);return;}
      if(data.type!=="live")return;
      const update=data as LiveUpdate;setLive(update);setNotice(update.message??update.tactics.events.at(-1)?.message??"");
      if(update.simulation){completed.current=true;w.terminate();worker.current=null;finishRef.current(update.simulation);}
    };
    w.onerror=()=>fail("The live map worker stopped. Completed maps are retained; restart this map to retry.");
    w.postMessage({type:"start-live",config} satisfies LiveRequest);
    return()=>{w.terminate();if(worker.current===w)worker.current=null;};
  },[config,retry]);
  const send=(request:LiveRequest)=>{
    if(!worker.current||pending.current||completed.current||error)return;
    pending.current=true;setBusy(true);worker.current.postMessage(request);
  };
  useEffect(()=>{
    if(!playing||!live||busy||finishing||error)return;
    const timer=setTimeout(()=>send({type:"advance",seconds:6*speed}),100);
    return()=>clearTimeout(timer);
  },[playing,live,busy,speed,finishing,error]);
  const patch=patchById(config.patchId);
  if(error)return <div className="computing-match"><h2 id="modal-title">The map stopped.</h2><p role="alert">{error}</p><button className="button secondary" onClick={()=>{setPlaying(false);setRetry(n=>n+1);}}>Restart this map</button></div>;
  if(!live)return <div className="computing-match" role="status"><h2 id="modal-title">The team takes the stage.</h2><p>Preparing the live map…</p></div>;
  const frame=live.frame,tactics=live.tactics,active=tactics.active;
  return <div className="match-viewer live-match">
    <div className="watch-heading"><div><div className="eyebrow">LIVE MATCH · PATCH {config.patchId??"LEGACY"}</div><h2 id="modal-title">Read the map. Call the play.</h2><p className="patch-match-label">{phaseLabels[tactics.phase]} · {playing?"Playing":"Paused"}</p></div>
      <button className="button secondary small-button" disabled={busy||finishing} onClick={()=>{setPlaying(false);setFinishing(true);send({type:"finish-live"});}}><SkipForward size={15}/>{finishing?"Finishing map…":"Simulate remainder"}</button></div>
    <div className="live-score"><strong><TeamBadge teamId={managedTeamId} name={config.teams[0]} year={config.year} size="small"/>{config.teams[0]}</strong><span><b>{frame.kills[0]}</b><small>{matchClock(frame.time)}</small><b>{frame.kills[1]}</b></span><strong><TeamBadge teamId={teamIdForName(config.teams[1],config.year)} name={config.teams[1]} year={config.year} size="small"/>{config.teams[1]}</strong></div>
    <div className="watch-controls"><button className="icon-button" aria-label={playing?"Pause match":"Resume match"} onClick={()=>setPlaying(p=>!p)}>{playing?<Pause size={18}/>:<Play size={18}/>}</button><div role="group" aria-label="Match speed">{[1,2,4].map(s=><button key={s} aria-pressed={speed===s} className={speed===s?"selected":""} onClick={()=>setSpeed(s)}>{s}×</button>)}</div><button className="text-link" disabled={playing||busy||finishing} onClick={()=>send({type:"advance",seconds:60})}>Advance 1 minute</button><span>Both teams act autonomously · Orders affect future play</span></div>
    <div className="watch-layout"><div className="map-wrap"><MapReplay before={frame} after={frame} ratio={0} expanded={(patch?.year??0)>=2023} selectedUnitIds={active?.participants}/><span className="map-live-label"><i/>LIVE · {matchClock(frame.time)}</span></div>
    <section className="tactics-console" aria-label="Live tactical calls">
      <div className="tactics-console-head"><div className="eyebrow">{phaseLabels[tactics.phase]} · THREE QUICK SLOTS</div><label>Purchase order target<select aria-label="Purchase order target" disabled={busy||finishing} value={target} onChange={e=>{setTarget(e.target.value);send({type:"inspect",playerId:e.target.value});}}>{config.players[0].map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select></label></div>
      <div className="tactic-quick-slots">{tactics.slots.map((slot,i)=>{const s=strategyById(slot.strategyId)!;return <button key={s.id} className="button secondary" disabled={busy||finishing||!!slot.reason} title={slot.reason??s.description} onClick={()=>send({type:"order",at:frame.time,order:{strategyId:s.id,...(s.kind==="item"?{targetPlayerId:target}:{})}})}><strong>{i+1}. {s.name}</strong><small>{slot.reason??s.description}</small></button>;})}</div>
      {active&&<div className="active-play"><strong>{strategyById(active.strategyId)?.name} · {active.stage} · {active.source==="manager"?"Your call":"Team decision"}</strong><p>Ends by {matchClock(active.expiresAt)}. Players can disengage if the situation becomes unsafe.</p><button className="text-link" disabled={busy||finishing} onClick={()=>send({type:"cancel-order"})}>Cancel movement</button></div>}
      <div className="tactic-purchase-targets">{tactics.itemTargets.map(t=><button key={t.playerId} className="text-link" disabled={busy||finishing} onClick={()=>send({type:"cancel-item",playerId:t.playerId})}>{config.players[0].find(p=>p.id===t.playerId)?.name} saving for {itemById(t.item)?.name} · Cancel</button>)}</div>
      <div className="live-match-status" role="status">{finishing?"Continuing this same map with all accepted calls…":notice}</div>
      {!!tactics.events.length&&<details><summary>Recent tactical decisions</summary><ol className="tactic-log">{tactics.events.map((e,i)=><li key={`${e.time}-${i}`}><time>{matchClock(e.time)}</time>{e.message}</li>)}</ol></details>}
    </section>
    </div>
    <div className="live-rosters">{([0,1] as const).map(side=><section key={side}><h3>{config.teams[side]}</h3>{frame.players.filter(p=>p.team===side).map(p=>{
      const unit=frame.units.find(u=>u.kind==="hero"&&u.heroId===p.heroId);
      return <div className="live-inventory-row" key={p.id}><div className="live-player"><HeroToken score={p}/><span><strong>{p.player}</strong><small>{p.hero} · {unit&&unit.hp>0?`${Math.round(unit.hp/unit.max*100)}% HP`:"Respawning"}</small></span><b>{p.kills}/{p.deaths}/{p.assists}<small>LV {p.level}</small></b></div><ItemInventory player={p} patch={patch} time={frame.time} showNext/></div>;
    })}</section>)}</div>
    <p className="match-footnote">Orders use the current match clock. The map shows both sides for spectators; bot decisions use local team sightings. Item effects and abilities are simplified. Simulating the remainder preserves accepted orders.</p>
  </div>;
}
