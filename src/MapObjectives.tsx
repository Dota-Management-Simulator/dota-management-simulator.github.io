import { memo, useState } from "react";
import type { ReplayFrame } from "./battle";
import { matchClock } from "./battle";
import type { MapEra } from "./map-eras";
import { mapStructures, structureIcon, tormentorSites } from "./map-objectives";
import type { MapStructure } from "./map-objectives";
import "./map-objectives.css";

const SIDE_COLORS = ["#86c969", "#e0766d"];

function Building({ structure }: { structure: MapStructure }) {
  const [failed, setFailed] = useState(false);
  const { unit, kind, team } = structure;
  const dead = unit != null && unit.hp <= 0;
  const size = kind === "ancient" ? 54 : kind === "tower" ? 32 : 23;
  const status = unit ? dead ? "Destroyed" : `${Math.max(0, unit.hp)} / ${unit.max} HP`
    : "Layout reference · combat and destruction are not simulated";
  return <g className={`map-building ${dead ? "destroyed" : ""} ${unit ? "tracked" : "reference"}`}
    transform={`translate(${structure.x},${structure.y})`} data-structure={kind}
    data-team={team} data-tracked={!!unit} data-tier={structure.tier}>
    <title>{structure.name} · {status}{unit?.fortified?' · Glyph of Fortification active':unit?.backdoor?' · Backdoor protection active':''}</title>
    {unit&&!dead&&(unit.backdoor||unit.fortified)&&<circle r={size*.68} fill="none" stroke={unit.fortified?'#ffdc82':'#80ccee'} strokeWidth={unit.fortified?3:2} strokeDasharray={unit.fortified?undefined:'5 3'} />}
    <circle r={size * .48} fill="#0b100d" opacity=".7" />
    {failed ? <path d={kind === "ancient" ? "M0-22 19 0 0 22-19 0Z" : kind === "tower" ? "M-10 12V-10H10V12Z" : "M-10-7H10V7H-10Z"}
      fill={SIDE_COLORS[team]} stroke="#111b13" strokeWidth="2" />
      : <image href={`${import.meta.env.BASE_URL}${structureIcon(structure)}`} x={-size / 2} y={-size / 2}
        width={size} height={size} preserveAspectRatio="xMidYMid meet" onError={() => setFailed(true)} />}
    {!unit && <circle r={size * .55} fill="none" stroke="#b5bda9" strokeWidth="1" strokeDasharray="2 4" opacity=".55" />}
    {unit && !dead && <g>
      <rect x={-size / 2} y={-size / 2 - 6} width={size} height="4" fill="#070e09" stroke="#28372b" strokeWidth="1" />
      <rect x={-size / 2} y={-size / 2 - 6} width={size * Math.max(0, Math.min(1, unit.hp / unit.max))} height="4" fill={SIDE_COLORS[team]} />
    </g>}
    {dead && <path d="M-9-9 9 9M9-9-9 9" stroke="#a39b8c" strokeWidth="2" />}
  </g>;
}

/** Local Valve HUD artwork, shared by the map markers and their status key. */
function ObjectiveIcon({ kind, side = 0 }: { kind: "roshan" | "tormentor"; side?: 0 | 1 }) {
  const [failedSource, setFailedSource] = useState<string>();
  const source = `${import.meta.env.BASE_URL}dota-maps/${kind === "roshan" ? "roshan" : `tormentor-${side ? "dire" : "radiant"}`}.webp`;
  return failedSource === source ? kind === "roshan" ? <RoshanFallback /> : <TormentorFallback />
    : <image href={source} x="-26" y="-26" width="52" height="52"
      preserveAspectRatio="xMidYMid meet" onError={() => setFailedSource(source)} />;
}

function RoshanFallback() {
  return <g fill="currentColor" stroke="#21170e" strokeWidth="1.5" strokeLinejoin="round">
    <path d="M-12-5-21-17-19-2-12 6-9 15H9L12 6 19-2 21-17 12-5 8-10H-8Z" />
    <path d="m-10-1 7 3-5 5Zm20 0-7 3 5 5Z" fill="#21170e" stroke="none" />
    <path d="M-4 10v5M4 10v5" fill="none" />
  </g>;
}

function TormentorFallback() {
  return <g stroke="currentColor" strokeWidth="2" strokeLinejoin="round">
    <path d="M0-19 17-9V10L0 20-17 10V-9Z" fill="#142e3c" />
    <path d="m0-19 0 20m-17-10L0 1 17-9M0 1v19" fill="none" />
    <path d="m0-9 8 5v9L0 10-8 5v-9Z" fill="currentColor" opacity=".6" stroke="none" />
  </g>;
}

export const MapObjectives = memo(function MapObjectives({ frame, era, patchId }: {
  frame: ReplayFrame; era?: MapEra; patchId?: string;
}) {
  const roshan = frame.roshan;
  const unavailable = roshan != null && (roshan.respawnAt > frame.time || roshan.hp <= 0);
  const sites = tormentorSites(patchId, frame.time);
  return <g className="map-objectives">
    {mapStructures(frame, era).map(structure => <Building key={structure.id} structure={structure} />)}
    {roshan && <>
      {era?.id === "733" && [era.roshan.day, era.roshan.night!].filter(([x, y]) => Math.hypot(x - roshan.x, y - roshan.y) > 30)
        .map(([x, y]) => <g key={`${x}:${y}`} transform={`translate(${x},${y})`} className="map-empty-pit">
          <title>Alternate Roshan pit · The active site is highlighted</title>
          <circle r="26" fill="none" stroke="#b99460" strokeWidth="2" strokeDasharray="4 6" opacity=".35" />
        </g>)}
      <g transform={`translate(${roshan.x},${roshan.y})`} className={`map-roshan ${unavailable ? "unavailable" : "available"}`} data-objective="roshan">
        <title>Roshan · {unavailable ? `Returns at ${matchClock(roshan.respawnAt)}` : `${roshan.hp} / ${roshan.max} HP`}</title>
        <circle r="28" fill="#211b13" stroke="currentColor" strokeWidth={unavailable ? 1 : 3} strokeDasharray={unavailable ? "3 5" : undefined} />
        <ObjectiveIcon kind="roshan" />
        {!unavailable && <g>
          <rect x="-22" y="-38" width="44" height="5" fill="#0b100d" />
          <rect x="-22" y="-38" width={44 * Math.max(0, Math.min(1, roshan.hp / roshan.max))} height="5" fill="currentColor" />
        </g>}
      </g>
    </>}
    {sites.map(site => <g key={site.id} transform={`translate(${site.x},${site.y})`}
      className={`map-tormentor ${site.current ? "spawn-time-reached" : "pending"}`} data-objective="tormentor" data-side={site.side}
      style={{ color: site.side ? "#ed9292" : "#8dd7ef" }}>
      <title>Tormentor · {site.side ? "Dire" : "Radiant"} {site.id === "rotating" ? "site" : "offlane"} · {site.current ? "Historical spawn time reached" : `First spawn ${matchClock(site.spawnAt)}`} · Location reference; combat and kills are not simulated</title>
      <circle r="27" fill="#0c151d" stroke="currentColor" strokeWidth="1.5" strokeDasharray="3 4" />
      <ObjectiveIcon kind="tormentor" side={site.side} />
    </g>)}
  </g>;
});

export function MapObjectiveLegend({ frame, patchId }: { frame: ReplayFrame; patchId?: string }) {
  const sites = tormentorSites(patchId, frame.time);
  const roshan = frame.roshan;
  return <div className="map-objective-key">
    <div className="map-objective-status">
      {frame.glyphs?.map((glyph,side)=>glyph.activeUntil>frame.time&&<span key={`glyph-${side}`}>{side?'Dire':'Radiant'} Glyph · {Math.ceil(glyph.activeUntil-frame.time)}s</span>)}
      {frame.siegeEvents?.filter(e=>e.kind==='buyback'&&e.time>frame.time-12).map(e=><span key={`buyback-${e.team}-${e.playerId}-${e.time}`}>{e.message}</span>)}
      {roshan && <span><svg viewBox="-30 -30 60 60" aria-hidden="true" className="roshan-key"><ObjectiveIcon kind="roshan" /></svg>
        Roshan · {roshan.respawnAt > frame.time ? `returns in ${matchClock(roshan.respawnAt - frame.time)}` : "alive"}</span>}
      {!!sites.length && <span>{sites.map(site => <svg key={site.id} viewBox="-30 -30 60 60" aria-hidden="true" className="tormentor-key">
        <ObjectiveIcon kind="tormentor" side={site.side} /></svg>)}
        Tormentor · {frame.time < sites[0].spawnAt ? `first spawn ${matchClock(sites[0].spawnAt)}` : sites.length === 2 ? "both offlanes" : `${sites[0].side ? "Dire" : "Radiant"} site`} <small>(layout)</small></span>}
    </div>
    <p>HP bars track match damage. Blue rings: backdoor protection. Gold rings: Glyph. Rectangular creeps: catapults. Dotted markers show the {sites.length ? "structure and Tormentor" : "structure"} layout; their combat is not simulated.</p>
  </div>;
}
