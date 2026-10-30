import { patchLabel } from "./patch-label";
import { memo, useEffect, useId, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  ArrowRight,
  Pause,
  Play,
  SkipForward,
  Swords,
  Trophy,
  X,
} from "lucide-react";
import { BASES, LANES, matchClock,filterReplayFrameForTeam } from "./battle";
import type {
  ReplayFrame,
  SimulatedSeries,
} from "./battle";
import { heroIconFor } from "./hero-icons";
import TeamBadge from "./TeamBadge";
import { teamIdForName } from "./team-logos";
import { frontierBounds, frontierMargin, frontierSize } from "./battle-map";
import { geometryForEra } from "./map-geometry";
import { mapEraForPatch } from "./map-eras";
import SpellPanel from "./SpellPanel";
import { RespawnStatus } from "./MatchAnnouncer";
import { replayPosition, replayWindow } from "./match-playback";
import { MapObjectives } from "./MapObjectives";
import {teamVisionCells} from './map-vision';
import {visionCellPath} from './map-vision-render';
import "./tactics.css";
import './combat-mobile.css';

const COLORS = ["#c8b16f", "#9da6e2"];
/** Shared by replays and live maps: 1× is thirty game seconds per real second. */
export const PLAYBACK_SPEEDS = [1/30, .1, .25, 0.5, 1, 2, 4, 8, 16, 32];
export const speedLabel = (s: number) => s === 1/30 ? "Real time" : s === .1 ? "Watch · 3s/s" : s === .25 ? "¼×" : s === 0.5 ? "½×" : `${s}×`;
export { HeroToken } from "./HeroToken";
import { HeroToken } from "./HeroToken";

const MapHeroToken = memo(function MapHeroToken({ heroId, name, color }: {
  heroId?: string; name: string; color: string;
}) {
  const icon = heroIconFor(heroId);
  const [failedPath, setFailedPath] = useState<string>();
  return (
    <>
      <circle r="20" fill="#202d25" stroke={color} strokeWidth="2.5" />
      {icon && failedPath !== icon.path ? (
        <image href={`${import.meta.env.BASE_URL}${icon.path}`}
          x="-16" y="-16" width="32" height="32" preserveAspectRatio="xMidYMid meet"
          onError={() => setFailedPath(icon.path)} />
      ) : (
        <text y="5" textAnchor="middle" fill={color} fontSize="12" fontWeight="700">
          {name.split(" ").map((word) => word[0]).slice(0, 2).join("")}
        </text>
      )}
    </>
  );
});

export { default as SeriesResults } from "./PostGameScreen";

const MapUnitAppearance = memo(function MapUnitAppearance({ unit, selected }: {
  unit: ReplayFrame["units"][number]; selected: boolean;
}) {
  const dead = unit.hp <= 0, color = COLORS[unit.team];
  return <>
    <title>
      {unit.name} · {Math.max(0, unit.hp)} / {unit.max} HP
    </title>
    {selected&&!dead&&<circle r="26" fill="none" stroke="#f2d27b" strokeWidth="2" strokeDasharray="4 3"/>}
    {unit.kind === "hero" ? (
      <MapHeroToken heroId={unit.heroId} name={unit.name} color={color} />
    ) : (
      unit.creepType==='siege'?<g><rect x="-8" y="-6" width="16" height="12" rx="2" fill={color} stroke="#fff1c9" strokeWidth="1.5"/><path d="M-5 0H7M3-4 7 0 3 4" stroke="#18221b" strokeWidth="2" fill="none"/></g>:<circle r={unit.creepType==='ranged'?5:4} fill={color} opacity=".7" />
    )}
    {unit.kind === "hero" && !dead && (
      <>
        <rect x="-17" y="-28" width="34" height="3" fill="#101812" />
        <rect
          x="-17"
          y="-28"
          width={34 * Math.max(0, unit.hp / unit.max)}
          height="3"
          fill={color}
        />
      </>
    )}
  </>;
});

export const MapReplay = memo(function MapReplay({
  before,
  after,
  ratio,
  expanded,
  patchId,
  selectedUnitIds = [],
  transitionMs = 0,
  onMapPoint,
  overlay,
}: {
  before: ReplayFrame;
  after: ReplayFrame;
  ratio: number;
  expanded: boolean;
  patchId?: string;
  selectedUnitIds?: number[];
  /** Animate only unit transforms between snapshots, without React renders. */
  transitionMs?: number;
  onMapPoint?:(x:number,y:number)=>void;
  overlay?:ReactNode;
}) {
  const fogId=useId().replaceAll(':','');
  const elements = useRef(new Map<number, SVGGElement>());
  const positions = useRef(new Map<number, { x: number; y: number; dead: boolean }>());
  const targets = useMemo(() => {
    const nextUnits = new Map(after.units.map(u => [u.id, u]));
    return before.units.map(unit => ({ unit, ...replayPosition(unit, nextUnits.get(unit.id), ratio) }));
  }, [before, after, ratio]);
  useLayoutEffect(() => {
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const duration = reducedMotion ? 0 : transitionMs;
    const previous = positions.current;
    positions.current = new Map();
    const moves = targets.flatMap(({ unit, x, y }) => {
      const element = elements.current.get(unit.id);
      if (!element) return [];
      const dead = unit.hp <= 0, last = previous.get(unit.id);
      const from = duration > 0 && last?.dead === dead ? last : { x, y };
      const position = { x: from.x, y: from.y, dead };
      positions.current.set(unit.id, position);
      element.setAttribute("transform", `translate(${from.x},${from.y})`);
      return from.x === x && from.y === y ? [] : [{ element, position, fromX: from.x, fromY: from.y, x, y }];
    });
    if (!moves.length) return;
    const start = performance.now();
    let animation = 0;
    const paint = (now: number) => {
      const fraction = Math.min(1, (now - start) / duration);
      for (const move of moves) {
        move.position.x = move.fromX + (move.x - move.fromX) * fraction;
        move.position.y = move.fromY + (move.y - move.fromY) * fraction;
        move.element.setAttribute("transform", `translate(${move.position.x},${move.position.y})`);
      }
      if (fraction < 1) animation = requestAnimationFrame(paint);
    };
    animation = requestAnimationFrame(paint);
    return () => cancelAnimationFrame(animation);
  }, [targets, transitionMs]);
  // Patched maps show that era's Valve map art; legacy maps keep the sketch.
  const era = patchId ? mapEraForPatch({ id: patchId }) : undefined;
  const visionPath=useMemo(()=>{
    if(!before.vision||!era)return undefined;
    const field=teamVisionCells(era,before.vision.sources);
    return visionCellPath(field.cells,field.cellSize);
  },[before.vision,era]);
  const terrain = useMemo(() => (<>
    <defs>
      <pattern
        id="map-grid"
        width="40"
        height="40"
        patternUnits="userSpaceOnUse"
      >
        <path
          d="M40 0H0V40"
          fill="none"
          stroke="#d4dfa1"
          strokeOpacity=".035"
        />
      </pattern>
      <linearGradient id="map-bg" x2="1" y2="1">
        <stop stopColor="#18291f" />
        <stop offset="1" stopColor="#192126" />
      </linearGradient>
    </defs>
    <rect x={expanded ? -frontierMargin : 0} y={expanded ? -frontierMargin : 0} width={expanded ? frontierSize : 800} height={expanded ? frontierSize : 800} fill="url(#map-bg)" />
    <rect x={expanded ? -frontierMargin : 0} y={expanded ? -frontierMargin : 0} width={expanded ? frontierSize : 800} height={expanded ? frontierSize : 800} fill="url(#map-grid)" />

    {era ? <>

      <image className="battle-map-art" href={`${import.meta.env.BASE_URL}${era.image}`} x={era.box[0]} y={era.box[1]} width={era.box[2]} height={era.box[3]} preserveAspectRatio="none" />
      <rect x={era.box[0]} y={era.box[1]} width={era.box[2]} height={era.box[3]} fill="#0c1410" opacity=".22" />
      {era.frontier && <g className="map-expansion-routes">
        <title>Expanded terrain beyond the source overview - simplified paths and objective sites</title>
        {geometryForEra(era).trails.filter(line => line.some(([x,y]) => x < 0 || y < 0 || x > 800 || y > 800))
          .map((line,i) => <polyline key={i} points={line.map(p=>p.join(",")).join(" ")} fill="none" stroke="#8b9a63" strokeOpacity=".35" strokeWidth="24" strokeLinejoin="round" />)}
      </g>}
    </> : <>
    <path
      d="M0 210Q240 180 400 400T800 590"
      stroke="#608da0"
      strokeWidth="36"
      opacity=".14"
      fill="none"
    />
    {LANES.map((lane, i) => (
      <polyline
        key={i}
        points={lane.map((p) => p.join(",")).join(" ")}
        fill="none"
        stroke="#667959"
        strokeOpacity=".25"
        strokeWidth="49"
        strokeLinejoin="round"
      />
    ))}
    {Array.from({ length: 22 }, (_, i) => (
      <g
        key={i}
        transform={`translate(${190 + ((i * 109) % 410)},${120 + ((i * 167) % 570)})`}
        opacity=".14"
      >
        <path d="m0-13-9 17h18Zm0 0v24" fill="#92ae72" stroke="#92ae72" />
      </g>
    ))}
    </>}
  </>), [expanded, era]);
  return (
    <svg
      className="battle-map"
      viewBox={expanded ? frontierBounds : "0 0 800 800"}
      role="img"
      onClick={onMapPoint?event=>{const svg=event.currentTarget,point=svg.createSVGPoint();point.x=event.clientX;point.y=event.clientY;const matrix=svg.getScreenCTM();if(matrix){const map=point.matrixTransform(matrix.inverse());onMapPoint(map.x,map.y);}}:undefined}
      aria-label={`Match playback${era ? ` on the ${era.version} map` : ""}: heroes, creep waves, towers, barracks and Ancients across three lanes, Roshan${era?.frontier ? " and era-specific Tormentor sites" : ""}${expanded ? "; New Frontiers expanded map and twelve neutral farm camps" : ""}`}
    >
      {terrain}
      {expanded && before.camps?.map(camp => <g key={camp.id} transform={`translate(${camp.x},${camp.y})`} opacity={camp.readyAt <= before.time ? .85 : .25}>
        <title>Neutral camp · {camp.readyAt <= before.time ? `${Math.ceil(camp.hp)} HP · gold and experience` : "respawning"}</title>
        <circle r="17" fill="#314331" stroke="#c8b16f" strokeWidth="1.5" />
        <path d="m-8 7 8-16 8 16Z" fill="#c8b16f" />
      </g>)}
      <MapObjectives frame={before} era={era} patchId={patchId} />
      {before.droppedItems?.map(drop=><g key={drop.id} transform={`translate(${drop.x},${drop.y})`}><title>Dropped Divine Rapier · either team can recover it</title><path d="m0-12 4 10 8 4-8 3-4 10-4-10-8-3 8-4Z" fill="#f4d476"/></g>)}
      <text
        x="160"
        y="746"
        fill={COLORS[0]}
        opacity=".6"
        fontSize="14"
        letterSpacing="4"
      >
        RADIANT
      </text>
      <text
        x="550"
        y="58"
        fill={COLORS[1]}
        opacity=".6"
        fontSize="14"
        letterSpacing="4"
      >
        DIRE
      </text>
      {targets.filter(({ unit }) => unit.kind !== "tower" && unit.kind !== "base" && unit.kind !== 'barracks').map(({ unit, x, y }) => {
        const dead = unit.hp <= 0;
        return (
          <g
            key={unit.id}
            ref={element => { if (element) elements.current.set(unit.id, element); else elements.current.delete(unit.id); }}
            transform={`translate(${x},${y})`}
            opacity={dead ? 0.17 : 1}
          >
            <MapUnitAppearance unit={unit} selected={selectedUnitIds.includes(unit.id)} />
          </g>
        );
      })}
      {(era ? geometryForEra(era).bases : BASES).map((p, i) => (
        <circle
          key={i}
          cx={p[0]}
          cy={p[1]}
          r="47"
          fill="none"
          stroke={COLORS[i]}
          strokeDasharray="3 7"
          opacity=".2"
        />
      ))}
      {before.vision&&<><defs><mask id={fogId}><rect x="-200" y="-200" width="1200" height="1200" fill="white"/>{visionPath?<path d={visionPath} fill="black"/>:before.vision.sources.map((source,i)=><circle key={i} cx={source.x} cy={source.y} r={source.radius} fill="black"/>)}</mask></defs><rect className="combat-fog" x="-200" y="-200" width="1200" height="1200" fill="#030907" opacity=".76" mask={`url(#${fogId})`} pointerEvents="none"/></>}
      {before.wards?.map(ward=><g key={ward.id} transform={`translate(${ward.x},${ward.y})`}><title>{ward.kind==='observer'?'Observer Ward':'Sentry Ward'}</title><circle r="9" fill={ward.team===0?'#f3d16a':'#ce7c7c'} stroke="#191f18" strokeWidth="2"/><text y="4" fontSize="11" textAnchor="middle" fill="#101c11">{ward.kind==='observer'?'O':'S'}</text></g>)}
      {before.wardOrders?.map(order=><g key={order.playerId} transform={`translate(${order.x},${order.y})`}><title>{order.kind} ward placement ordered · player travelling</title><circle r="15" fill="none" stroke="#f3d16a" strokeWidth="2" strokeDasharray="4 3"/><path d="M-8 0h16M0-8v16" stroke="#f3d16a" strokeWidth="2"/></g>)}
      {overlay}
    </svg>
  );
});

export function MatchViewer({
  simulation,
  onFinish,
  year,
  managedTeamId,
}: {
  simulation: SimulatedSeries;
  onFinish: () => void;
  year: number;
  managedTeamId?: string;
}) {
  const [gameIndex, setGameIndex] = useState(0);
  const [clock, setClock] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [speed, setSpeed] = useState(2);
  const [mobileView,setMobileView]=useState('map');
  const completed = useRef(false);
  const finishRef = useRef(onFinish);
  finishRef.current = onFinish;
  const game = simulation.summary.games[gameIndex];
  const frames = simulation.frames[gameIndex];
  useEffect(() => {
    if (!playing) return;
    let last = performance.now();
    const timer = setInterval(() => {
      const now = performance.now();
      const elapsed = (now - last) / 1000;
      last = now;
      setClock((t) => Math.min(game.duration, t + elapsed * 30 * speed));
    }, 100);
    return () => clearInterval(timer);
  }, [playing, speed, game.duration, gameIndex]);
  useEffect(() => {
    if (clock < game.duration || completed.current) return;
    const timer = setTimeout(() => {
      if (gameIndex < simulation.summary.games.length - 1) {
        setGameIndex((i) => i + 1);
        setClock(0);
      } else {
        completed.current = true;
        finishRef.current();
      }
    }, 800);
    return () => clearTimeout(timer);
  }, [clock, game.duration, gameIndex, simulation.summary.games.length]);
  const window = replayWindow(frames, clock);
  const before=useMemo(()=>filterReplayFrameForTeam(window.before,0,simulation.summary.patch?.id),[window.before,simulation.summary.patch?.id]);
  const after=useMemo(()=>filterReplayFrameForTeam(window.after,0,simulation.summary.patch?.id),[window.after,simulation.summary.patch?.id]);
  const ratio=window.ratio;
  const kills = clock >= game.duration ? game.kills : before.kills;
  return (
    <div className="match-viewer live-match recorded-match" data-mobile-view={mobileView}>
      <div className="watch-heading">
        <div>
          <div className="eyebrow">LANE SIEGE · TOURNAMENT SERIES</div>
          <h2 id="modal-title">The team takes the stage.</h2>
          {simulation.summary.mapLayout === "frontiers" && <p className="patch-match-label">New Frontiers · 40% more area · 12 shared farm camps</p>}
        </div>
        <button
          className="button secondary small-button"
          onClick={() => {
            completed.current = true;
            onFinish();
          }}
        >
          <SkipForward size={15} /> Skip to results
        </button>
      </div>
      <div className="live-score">
        <strong style={{ color: COLORS[0] }}>
          <TeamBadge teamId={managedTeamId} name={simulation.summary.teams[0]} year={year} size="small" />
          {simulation.summary.teams[0]}
        </strong>
        <span>
          <b>{kills[0]}</b>
          <small>{matchClock(clock)}</small>
          <b>{kills[1]}</b>
        </span>
        <strong style={{ color: COLORS[1] }}>
          <TeamBadge teamId={managedTeamId ? teamIdForName(simulation.summary.teams[1], year) : undefined} name={simulation.summary.teams[1]} year={year} size="small" />
          {simulation.summary.teams[1]}
        </strong>
      </div>
      <div className="combat-command-bar"><div className="watch-controls">
        <button className="button secondary combat-play" aria-label={playing?'Pause playback':'Resume playback'} onClick={()=>setPlaying(!playing)}>{playing?<Pause size={18}/>:<Play size={18}/>} {playing?'Pause':'Resume'}</button>
        <label>Speed<select aria-label="Playback speed" value={speed} onChange={e=>setSpeed(Number(e.target.value))}>{PLAYBACK_SPEEDS.map(s=><option key={s} value={s}>{speedLabel(s)}</option>)}</select></label>
        <button className="text-link" onClick={()=>setClock(game.duration)}>Next result <ArrowRight size={14}/></button>
      </div><nav className="combat-mobile-tabs" aria-label="Replay panels">{[['map','Map'],['team','Team'],['events','Events']].map(([id,label])=><button key={id} aria-pressed={mobileView===id} onClick={()=>setMobileView(id)}>{label}</button>)}</nav></div>
      <div className="watch-layout watch-with-spells">
        <SpellPanel key={gameIndex} frame={before} nextFrame={after} time={clock} patchId={simulation.summary.patch?.id} playing={playing}>
        <div className="map-wrap">
          <MapReplay key={gameIndex} before={before} after={after} ratio={ratio} transitionMs={playing && clock < game.duration ? 100 : 0} expanded={simulation.summary.mapLayout === "frontiers"} patchId={simulation.summary.patch?.id} />
          <span className="map-live-label">
            <i /> GAME {gameIndex + 1} · TEAM VISION
          </span>
          {clock >= game.duration && (
            <div className="map-victory">
              <Trophy size={26} />
              {simulation.summary.teams[game.winner]} wins Game {gameIndex + 1}
            </div>
          )}
        </div>
        </SpellPanel>
        <div className="live-rosters">
          {([0, 1] as const).map((team) => (
            <section key={team}>
              <h3 style={{ color: COLORS[team] }}>
                {simulation.summary.teams[team]}
              </h3>
              {before.players
                .filter((p) => p.team === team)
                .map((p) => (
                  <div className="live-player" key={p.id}>
                    <HeroToken score={p} />
                    <span>
                      <strong>{p.player}</strong>
                      <small>{p.hero}</small><RespawnStatus frame={before} player={p} time={clock} nextFrame={after}/>
                    </span>
                    <b>
                      {p.kills}/{p.deaths}/{p.assists}
                      <small>LV {p.level}</small>
                    </b>
                  </div>
                ))}
            </section>
          ))}
        </div>
      </div>
      <p className="match-footnote">
        Game {gameIndex+1} of {simulation.summary.games.length} · {simulation.summary.patch&&`Patch ${patchLabel(simulation.summary.patch)} · `}Team vision replay. Older recordings use conservative terrain-based visibility. Speed, pause and skip preserve the recorded outcome. Complete statistics remain available after the game.
      </p>
    </div>
  );
}

export function ComputingMatch({
  progress,
  error,
  onSkip,
  onCancel,
}: {
  progress: number;
  error: string;
  onSkip: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="computing-match">
      <div className="event-emblem large">
        <Swords size={30} />
      </div>
      <div className="eyebrow">THE PLAYERS ARE GETTING READY</div>
      <h2 id="modal-title">
        {error ? "The match could not start." : "Simulating the series…"}
      </h2>
      <p>
        {error ||
          "Drafting from your season's unlocked heroes and resolving lane combat in the background."}
      </p>
      {!error && (
        <>
          <div className="meter">
            <span style={{ width: `${Math.max(8, progress)}%` }} />
          </div>
          <button className="button secondary" onClick={onSkip}>
            <SkipForward size={15} /> Skip playback when ready
          </button>
        </>
      )}
      {error && (
        <button className="button secondary" onClick={onCancel}>
          <X size={15} /> Back to management
        </button>
      )}
    </div>
  );
}
