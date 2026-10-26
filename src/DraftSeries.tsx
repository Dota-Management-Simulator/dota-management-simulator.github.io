import { startSimulationWorker } from "./simulation-worker";
import { patchLabel } from "./patch-label";
import { useEffect, useMemo, useRef, useState } from "react";
import type { BattleConfig, SimulatedSeries } from "./battle";
import { assignDraftRoles, automaticDraftAction, completeMapDraft, createMapDraft, draftSuggestions, nextDraftStep, normalizeDraftPreparation, takeDraftAction } from "./draft";
import type { DraftPreparation, MapDraft } from "./draft";
import { getHeroPool, heroById, heroRoles } from "./heroes";
import { HeroName } from "./DraftRecord";
import { patchById } from "./patches";
import { captainsRulesFor } from "./captains-mode";
import { SeriesResults } from "./MatchExperience";
import LiveMatchViewer from "./LiveMatchViewer";
import TacticalPreparation from "./TacticalPreparation";
import { automaticTactics, normalizeTactics } from "./tactics";
import type { TacticalPreparation as TacticalPlan } from "./tactics";
import "./draft.css";
import type { Campaign } from "./game";
import { StaffDraftPreparation } from "./TeamScouting";
import { scoutingTeamForConfig } from "./team-scouting";
import DraftPreparationGrid from "./DraftPreparation";

export default function DraftSeries({campaign,config,preparation,skipPlayback=false,onPreparation,onTactics,onComplete,onCancel,managedTeamId}: {
  campaign: Campaign;
  config:BattleConfig; preparation?:DraftPreparation; skipPlayback?:boolean;
  onPreparation:(prep:DraftPreparation)=>void; onComplete:(series:SimulatedSeries)=>void | boolean;
  onTactics:(prep:TacticalPlan)=>void;
  onCancel:()=>void; managedTeamId?:string;
}){
  const [prep,setPrep]=useState(()=>normalizeDraftPreparation(preparation));
  const [tactics,setTactics]=useState(()=>campaign.tacticalPreparation?normalizeTactics(campaign.tacticalPreparation):automaticTactics(config.players[0],config.patchObservers?.[0]?.staffIds));
  const [preparing,setPreparing]=useState(false),[liveConfig,setLiveConfig]=useState<BattleConfig|null>(null);
  const opponent = useMemo(() => scoutingTeamForConfig(campaign, config), [campaign, config]);
  const [maps,setMaps]=useState<SimulatedSeries[]>([]);
  const [mode,setMode]=useState<"auto"|"manual"|null>(null);
  const [state,setState]=useState<MapDraft>(()=>createMapDraft(config));
  const [query,setQuery]=useState("");const [role,setRole]=useState("all");
  const [busy,setBusy]=useState(false);const [error,setError]=useState("");
  const [current,setCurrent]=useState<SimulatedSeries|null>(null);
  const worker=useRef<Worker|null>(null);const completed=useRef(false);
  useEffect(()=>()=>{worker.current?.terminate();},[]);
  const patch=patchById(config.patchId),rules=captainsRulesFor(patch);
  const pool=useMemo(()=>getHeroPool(config.year,patch?Math.min(config.heroPoolThroughYear??patch.year-1,patch.year-1):config.heroPoolThroughYear,patch),[config,patch]);
  const cfg=useMemo<BattleConfig>(()=>({...config,draftPreparations:[prep,config.draftPreparations?.[1]],tacticalPreparations:[tactics,config.tacticalPreparations?.[1]],
    players:config.players.map(side=>side.map(p=>{
      const heroExperience={...p.heroExperience};
      for(const m of maps)for(const row of m.summary.games[0].players)if(row.id===p.id)heroExperience[row.heroId]=(heroExperience[row.heroId]??0)+1;
      return {...p,heroExperience};
    })) as BattleConfig["players"]}),[config,prep,maps,tactics]);
  const step=nextDraftStep(cfg,state);
  const choices=useMemo(()=>mode==="manual"&&!busy&&!current&&step?.side===0?draftSuggestions(cfg,state):[],[cfg,state,mode,busy,current,step?.side]);
  const initial=config.seriesFormat?.advantage??[0,0];const score:[number,number]=[initial[0],initial[1]];
  for(const m of maps)score[m.summary.games[0].winner]++;
  const bestOf=config.seriesFormat?.bestOf??3;
  const done=bestOf===2?maps.length===2:Math.max(...score)>=Math.floor(bestOf/2)+1;
  const launch=(watch=!skipPlayback)=>{
    if(worker.current||current||liveConfig)return;
    try{
      const draft=completeMapDraft(cfg,state);setError("");onTactics(tactics);
      const mapConfig:BattleConfig={...cfg,seed:(config.seed+state.map*7919)>>>0,draft:draft.heroes,draftRecord:draft,seriesFormat:{bestOf:1}};
      if(watch){setLiveConfig(mapConfig);return;}
      setBusy(true);

      const fail=(message:string)=>{worker.current?.terminate();worker.current=null;setBusy(false);setError(message);};
      worker.current=startSimulationWorker(()=>new Worker(new URL("./battle.worker.ts",import.meta.url),{type:"module"}),mapConfig,({data},w)=>{
        if(worker.current!==w)return;
        if(data.type==="complete"){
          w.terminate();worker.current=null;setBusy(false);
          setMaps(previous=>[...previous,data.simulation]);setCurrent(data.simulation);
        }else if(data.type==="error")fail(data.message);
      },()=>fail("The map worker could not finish. Your campaign result has not changed; retry this draft."));
    }catch(e){worker.current?.terminate();worker.current=null;setBusy(false);setError(e instanceof Error?e.message:"Could not start map.");}
  };
  useEffect(()=>{
    if(!mode||busy||current||liveConfig||error)return;
    if(!step){if(mode==="auto")setPreparing(true);return;}
    if(mode==="auto"||step.side===1){
      const timer=setTimeout(()=>{try{setState(previous=>automaticDraftAction(cfg,previous));}catch(e){setError(e instanceof Error?e.message:"Draft failed.");}},mode==="auto"?85:240);
      return()=>clearTimeout(timer);
    }
  },[mode,state,cfg,busy,current,liveConfig,error]);
  const continueMap=()=>{
    if(done){
      if(completed.current)return;completed.current=true;
      const first=maps[0];
      try {
        const recorded = onComplete({summary:{...first.summary,seed:config.seed,bestOf,advantage:initial as [number,number],score,
          winner:score[0]===score[1]?null:score[0]>score[1]?0:1,games:maps.map(m=>m.summary.games[0])},frames:maps.map(m=>m.frames[0])});
        if (recorded === false) {
          completed.current=false;
          setError("The series could not be recorded. Your completed maps are retained; retry Finish series.");
        }
      } catch (e) {
        completed.current=false;
        setError(e instanceof Error ? e.message : "The series could not be recorded. Your completed maps are retained; retry Finish series.");
      }
    }else{setCurrent(null);setLiveConfig(null);setPreparing(false);setMode(null);setState(createMapDraft(cfg,maps.length));setQuery("");setError("");}
  };
  if(liveConfig)return <LiveMatchViewer config={liveConfig} managedTeamId={managedTeamId} onAutoGlyphChange={enabled=>{const next={...tactics,autoGlyph:enabled};setTactics(next);onTactics(next);}} onComplete={simulation=>{setMaps(previous=>[...previous,simulation]);setCurrent(simulation);setLiveConfig(null);}}/>;
  if(current)return <div><SeriesResults result={{eventId:"draft-map",event:`Map ${maps.length} · series ${score.join("–")}`,year:config.year,week:0,
    won:current.summary.winner===0,prize:0,points:0,opponent:config.teams[1],score:current.summary.score.join("–"),series:current.summary}}
    managedTeamId={managedTeamId} playedAt={campaign.calendar?.now} mapOnly closeLabel={done?"Finish series":`Draft map ${maps.length+1}`} onClose={continueMap}/>{error&&<p role="alert">{error}</p>}</div>;
  const filtered=choices.filter(({hero:h})=>h.name.toLowerCase().includes(query.toLowerCase())&&(role==="all"||h.roles.includes(+role)));
  const start=(m:"auto"|"manual")=>{onPreparation(prep);setMode(m);setError("");};
  return <section className="draft-room" aria-label="Match draft">
    <div className="eyebrow">CAPTAIN’S MODE · PATCH {patchLabel(config.patchId)} · BO{bestOf}</div>
    <h2 id="modal-title">Map {maps.length+1} · {config.teams[0]} vs {config.teams[1]}</h2>
    <p className="draft-score">Series {score.join(" – ")} · {config.teams[state.firstPick]} has first pick{initial.some(Boolean)?" · Includes a default upper-bracket win":""}</p>
    <p>{rules.summary} <a href={rules.source} target="_blank" rel="noreferrer">Draft rules source ↗</a></p>
    {!mode?<>
      <StaffDraftPreparation campaign={campaign} config={cfg} team={opponent} onApply={plan=>{setPrep(plan);onPreparation(plan);}} />
      <DraftPreparationGrid pool={pool} preparation={prep} onChange={setPrep} onSave={()=>onPreparation(prep)} />
      <div className="draft-mode-buttons"><button className="button primary" onClick={()=>start("auto")}>Follow preparation · fast draft</button><button className="button secondary" onClick={()=>start("manual")}>Draft for my team</button></div>
      {!maps.length&&<button className="text-link" onClick={onCancel}>Back without playing</button>}
    </>:<>
      <div className="draft-turn" role="status">{busy?"Playing the map in the lane engine…":step?`Phase ${step.phase} · ${config.teams[step.side]} ${step.kind==='ban'?'bans':'picks'}${mode==="auto"?" · fast draft":""}`:"Draft complete · five roles assigned"}</div>
      <div className="draft-lineups">{([0,1] as const).map(side=>{const lineup=assignDraftRoles(cfg,side,state.picks[side])?.heroes??[];return <div key={side}><h3>{config.teams[side]}</h3>{heroRoles.map((name,r)=><div className="draft-lineup-row" key={r}><small>{name}</small>{lineup[r]?<HeroName id={lineup[r]}/>:<span className="muted">Not picked</span>}</div>)}</div>;})}</div>
      <div className="draft-ban-chips" aria-label="Banned heroes"><strong>Bans · {state.bans.length}</strong>{state.bans.map(id=><HeroName key={id} id={id}/>)}</div>
      {mode==="manual"&&step?.side===0&&!busy&&<><div className="draft-filters"><label>Search heroes<input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Find a hero"/></label><label>Position<select value={role} onChange={e=>setRole(e.target.value)}><option value="all">All roles</option>{heroRoles.map((name,r)=><option key={r} value={r}>{name}</option>)}</select></label></div>
        <p className="field-note">Listed by your coach’s uncertain assessment. Flex picks are reassigned as the lineup develops. Picks and bans must leave a legal five for both teams.</p>
        <div className="draft-choices">{filtered.map(({hero})=><button className="button secondary" key={hero.id} onClick={()=>{try{setState(takeDraftAction(cfg,state,hero.id));}catch(e){setError(String(e));}}}><HeroName id={hero.id}/><small>{step.kind==="ban"?"Ban":hero.roles.map(r=>heroRoles[r]).join(" / ")}</small></button>)}</div>
      </>}
      {mode==="manual"&&!step&&!busy&&!preparing&&<button className="button primary" onClick={()=>setPreparing(true)}>Confirm lineup & prepare tactics</button>}
      {preparing&&!busy&&<><TacticalPreparation config={{...cfg,draft:completeMapDraft(cfg,state).heroes}} preparation={tactics} onChange={setTactics} onSave={()=>onTactics(tactics)}/><div className="draft-mode-buttons"><button className="button primary" onClick={()=>launch(!skipPlayback)}>{skipPlayback?"Simulate map":"Start watching & call plays"}</button><button className="button secondary" onClick={()=>launch(skipPlayback)}>{skipPlayback?"Watch & call plays":"Simulate map & skip"}</button></div></>}
      {!!state.actions.length&&<details className="draft-record"><summary>Pick/ban sequence · {state.actions.length} actions</summary><ol>{state.actions.map((a,i)=><li key={i}>{config.teams[a.side]} · {a.kind} · {heroById(a.heroId)?.name}</li>)}</ol></details>}
    </>}
    {error&&<div role="alert"><p>{error}</p><button className="button secondary" onClick={()=>{setError("");if(!step)launch();}}>Retry</button></div>}
  </section>;
}
