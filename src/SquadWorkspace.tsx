import { useRef, useState } from "react";
import { ArrowUpRight, Heart, Search, Users, Zap } from "lucide-react";
import type { Campaign, Player } from "./game";
import { average, money, rating, ROLES, statNames, teamPlayers } from "./game";
import { weeklyPractice, weeksRemaining } from "./contracts";
import { trainingSchedule } from "./training";
import Avatar from "./PlayerAvatar";
import { fullRosterBlocker, welfareStatus } from "./player-welfare";
import PlayerWelfarePanel from "./PlayerWelfare";
import PlayerIdentityPanel from './PlayerIdentity';
import TeamChemistry from './TeamChemistry';
import PlayerCareerPanel from './PlayerCareerPanel';
import PlayerScoutingSummary, { PlayerScoutingLine } from './PlayerScoutingSummary';

function Condition({ value, label }: { value: number; label: string }) {
  return <span className={`squad-condition ${value < 40 ? "low" : value < 60 ? "tired" : ""}`}><span>{value}%</span><span className="condition-track" role="meter" aria-label={label} aria-valuenow={value} aria-valuemin={0} aria-valuemax={100}><span style={{ width: `${value}%` }} /></span></span>;
}

export function SquadTable({ campaign, selectedId, onSelect, compact = false }: {
  campaign: Campaign; selectedId?: string; onSelect: (player: Player) => void; compact?: boolean;
}) {
  return <div className="squad-table-scroll" role="region" aria-label="Starting squad" tabIndex={0}><table className={`squad-table ${compact ? "compact" : ""}`}>
    <caption className="sr-only">Starting five · ratings are gameplay estimates</caption><thead><tr><th scope="col">Player</th><th scope="col">OVR</th><th scope="col">Energy</th><th scope="col">Happiness</th>{!compact && <><th scope="col">Pay / wk</th><th scope="col">Contract</th><th scope="col">Training</th></>}</tr></thead>
    <tbody>{teamPlayers(campaign).map(p => {
      const contract = campaign.contracts?.[p.id];
      const left = contract ? weeksRemaining(campaign, contract) : null;
      return <tr key={p.id} className={selectedId === p.id ? "selected" : ""}>
        <th scope="row"><button className="squad-select" aria-pressed={selectedId === p.id} onClick={() => onSelect(p)}><span className="squad-position">{ROLES.indexOf(p.role as typeof ROLES[number]) + 1}</span><Avatar player={p} small /><span><strong>{p.name}</strong><small>{p.role}</small><PlayerScoutingLine player={p} /><span className="squad-welfare">{welfareStatus(campaign, p.id)}</span></span></button></th>
        <td className="squad-rating">{rating(p)}</td><td><Condition value={p.energy} label={`${p.name} energy`} /></td><td><Condition value={p.happiness} label={`${p.name} happiness`} /></td>
        {!compact && <><td className="squad-pay">{money(p.wage)}</td><td><span className={left === 0 ? "contract-due" : ""}>{left == null ? "Rolling" : left === 0 ? "Renewal due" : `${left} wk`}</span></td><td className="squad-focus">{campaign.training[p.id] ?? "Balanced"}</td></>}
      </tr>;
    })}</tbody>
  </table></div>;
}

export default function SquadWorkspace({ campaign, onProfile, onTraining, onScout, onChange }: {
  campaign: Campaign; onProfile: (player: Player) => void; onTraining: () => void; onScout: () => void; onChange: (c: Campaign) => void;
}) {
  const [selectedId, setSelectedId] = useState(campaign.roster[0]);
  const [section, setSection] = useState<"attributes" | "playstyles">("attributes");
  const dossier = useRef<HTMLElement>(null);
  const roster = teamPlayers(campaign);
  const player = roster.find(p => p.id === selectedId) ?? roster[0];
  const effect = player ? weeklyPractice(campaign, player, campaign.training[player.id] ?? "Balanced") : null;
  const schedule = player ? trainingSchedule(campaign, player) : null;
  return <>
    {fullRosterBlocker(campaign) && <div className="welfare-vacancy" role="status"><strong>{fullRosterBlocker(campaign)}</strong><p>Training, payroll and the calendar continue for remaining players.</p><button className="button secondary small-button" onClick={onScout}>Recruit replacement</button></div>}
    <div className="squad-toolbar"><span><Users size={16} />{roster.length} / 5 starters <span className="workspace-divider">·</span> {average(roster.map(rating))} average OVR</span><button className="button secondary small-button" onClick={onScout}><Search size={15} />Explore players</button></div>
    <TeamChemistry campaign={campaign} />
    <div className="squad-workspace"><section className="panel squad-list"><div className="desk-panel-heading"><div><h2>Starting five</h2><p>Select a player to inspect their dossier.</p></div></div><SquadTable campaign={campaign} selectedId={player?.id} onSelect={p => { setSelectedId(p.id); if (window.matchMedia("(max-width: 1180px)").matches) dossier.current?.scrollIntoView({ block: "start" }); }} /><div className="squad-footnote">Attributes 0–99 · playstyles 1–10 · gameplay estimates</div></section>
      {player && effect && schedule && <aside className="panel player-dossier" aria-label="Selected player dossier" ref={dossier}>
        <div className="dossier-heading"><Avatar player={player} /><div><span className="eyebrow">PLAYER DOSSIER</span><h2>{player.name}</h2><p>{player.role} · {player.region}</p></div><div className="dossier-rating">{rating(player)}<small>OVR</small></div></div>
        <div className="dossier-vitals"><span><Zap size={14} />{player.energy}% energy</span><span><Heart size={14} />{player.happiness}% happy</span></div>
        <PlayerScoutingSummary campaign={campaign} player={player} compact />
        <div className="dossier-sections" role="group" aria-label="Dossier section"><button aria-pressed={section === "attributes"} onClick={() => setSection("attributes")}>Attributes</button><button aria-pressed={section === "playstyles"} onClick={() => setSection("playstyles")}>Playstyles</button></div>
        <div className="dossier-ratings">{(section === "attributes" ? Object.entries(player.stats).map(([key, value]) => [statNames[key], value] as const) : Object.entries(player.playstyles).filter(([, value]) => value != null).map(([key, value]) => [key, value!] as const)).map(([name, value]) => <div className="dossier-stat" key={name}><span>{name}</span><strong>{value}</strong><span className="condition-track"><span style={{ width: `${value / (section === "attributes" ? 99 : 10) * 100}%` }} /></span></div>)}</div>
        <div className="dossier-plan"><span className="eyebrow">THIS WEEK</span><strong>{campaign.training[player.id] ?? "Balanced"}</strong><p>{campaign.training[player.id] === "Rest" ? "Full rest" : `${Math.round(schedule.hoursPerDay * schedule.daysPerWeek * 100) / 100} practice hours · ${schedule.intensity} intensity`}</p><p>Projected energy <strong>{Math.round(Math.max(0, Math.min(100, player.energy + effect.energy)) * 100) / 100}%</strong></p><button className="text-link" onClick={onTraining}>Adjust training <ArrowUpRight size={14} /></button></div>
        <details><summary>Development &amp; hero mastery</summary><PlayerCareerPanel campaign={campaign} player={player} compact /></details>
        <PlayerIdentityPanel key={`identity:${player.id}`} campaign={campaign} player={player} onChange={onChange} compact />
        <PlayerWelfarePanel key={player.id} campaign={campaign} player={player} onChange={onChange} />
        <button className="button secondary full" onClick={() => onProfile(player)}>Full profile, performance & contract <ArrowUpRight size={15} /></button>
      </aside>}
    </div>
  </>;
}
