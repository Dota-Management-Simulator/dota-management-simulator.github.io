import { useEffect, useState } from "react";
import { ArrowRight, ChevronRight, ClipboardList, Mail, Pause, Play, Shield, Swords, Trophy, Users, Zap } from "lucide-react";
import type { Campaign, Page, Player } from "./game";
import { average, teamPlayers } from "./game";
import { managerCompetition } from "./manager-view";
import { campaignMenu } from "./menu-eras";
import { unreadMessages } from "./office";
import TeamBadge from "./TeamBadge";
import Avatar from "./PlayerAvatar";
import { availableMenuEvents, eventMenuForCampaign } from "./menu-events";
import { tiMenuForCampaign } from "./menu-ti";
import ClientDashboard from "./ClientDashboard";
import RebornClient from "./RebornClient";

const showcaseHeroes = [
  { id: "axe", name: "Axe", icon: "axe" },
  { id: "antimage", name: "Anti-Mage", icon: "anti_mage" },
  { id: "crystal_maiden", name: "Crystal Maiden", icon: "crystal_maiden" },
  { id: "monkey_king", name: "Monkey King", icon: "monkey_king" },
];

type HeadquartersProps = {
  campaign: Campaign; onPage: (page: Page) => void; onPlayer: (player: Player) => void; onCompetition: () => void;
  onTournament?: (id: string) => void;
};

export default function Headquarters(props: HeadquartersProps) {
  const { patch, era } = campaignMenu(props.campaign);
  const [choice, setChoice] = useState("current");
  const now = props.campaign.calendar?.now;
  const available = availableMenuEvents(patch, now);
  const current = eventMenuForCampaign(props.campaign);
  const ti = tiMenuForCampaign(props.campaign);
  const event = choice === "current" ? current : available.find(item => item.id === choice) ?? current;
  const archived = choice !== "current" && event?.id !== current?.id;
  useEffect(() => setChoice("current"), [patch.id]);
  const client = event?.layout === "source1" || (!event && (era.layout === "beta" || era.layout === "source1"));
  const reborn = event?.layout === "reborn" || (!event && era.layout === "reborn");
  return <div className="desk-client">
    {available.length > 0 && <div className="desk-theme-bar"><span>MANAGER’S DESK <small>PATCH {patch.id}</small></span><label>Event screens<select aria-label="Desk event screen" value={choice} onChange={e => setChoice(e.target.value)}><option value="current">Current update · {ti && choice === "current" ? `The International ${ti.year}` : current?.name ?? era.title}</option>{available.map(item => <option key={item.id} value={item.id}>{item.name} · {item.historicalRelease.slice(0, 4)}</option>)}</select></label>{choice !== "current" && <button onClick={() => setChoice("current")}>Return to current update</button>}</div>}
    {reborn ? <RebornClient {...props} event={event} ti={choice === "current" ? ti : undefined} archived={archived} />
      : client ? <ClientDashboard {...props} variant={event || era.layout === "source1" ? "source1" : "beta"} event={event} ti={choice === "current" ? ti : undefined} archived={archived} />
      : <StandardHeadquarters {...props} />}
  </div>;
}

function StandardHeadquarters({ campaign, onPage, onPlayer, onCompetition }: HeadquartersProps) {
  const menu = campaignMenu(campaign);
  const [heroId, setHeroId] = useState(menu.era.id === "journey" ? "monkey_king" : "axe");
  const [motion, setMotion] = useState(() => !window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  const availableHeroes = showcaseHeroes.filter(item => menu.monkeyKing || item.id !== "monkey_king");
  const hero = availableHeroes.find(item => item.id === heroId) ?? availableHeroes[0];
  const competition = managerCompetition(campaign);
  const patch = menu.patch;
  const roster = teamPlayers(campaign);
  const unread = unreadMessages(campaign);
  const imagePath = `${import.meta.env.BASE_URL}dota-menu/${hero.id}.png`;
  useEffect(() => { setHeroId(menu.era.id === "journey" ? "monkey_king" : "axe"); }, [menu.era.id]);
  useEffect(() => {
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    const changed = () => { if (preference.matches) setMotion(false); };
    preference.addEventListener("change", changed);
    return () => preference.removeEventListener("change", changed);
  }, []);

  return <section className="dota-lobby" aria-label="Manager’s Desk lobby">
    <div className="lobby-era-strip"><span>{menu.era.title}</span><strong>Patch {patch.id} · {patch.name}</strong><button onClick={() => onPage("patch")}>View update<ArrowRight size={12} /></button></div>
    <div className="lobby-main">
      <div className="lobby-profile">
        <div className="lobby-team-badge"><TeamBadge teamId={campaign.world?.managedTeamId} name={campaign.settings.team} year={campaign.year} size="large" /><span className="lobby-kicker">MANAGER’S DESK</span></div>
        <h2>{campaign.settings.team}</h2>
        <p className="lobby-season">{campaign.settings.region} <span> / </span> {campaign.year} SEASON</p>
        <div className="lobby-red-rule" />
        <p className="lobby-tagline">Five players.<br />One Aegis.</p>
        <p className="lobby-intro">Your roster. Your preparation.<br />Your place in Dota history.</p>
        <button className="lobby-outline-button" onClick={() => onPage("roster")}><Users size={16} />Manage squad<ChevronRight size={15} /></button>
        <div className="lobby-condition"><span><Zap size={13} />SQUAD READINESS</span><strong>{average(roster.map(player => player.energy))}%</strong><div><span style={{ width: `${average(roster.map(player => player.energy))}%` }} /></div></div>
      </div>
      <div className="lobby-showcase" aria-label="Dota hero showcase">
        <div className="lobby-hero-halo" aria-hidden="true" /><div className="lobby-hero-plinth" aria-hidden="true" />
        {motion ? <video key={hero.id} className="lobby-hero-render" aria-label={`${hero.name} animated hero showcase`} autoPlay muted loop playsInline preload="none" poster={imagePath} onError={() => setMotion(false)}><source src={`${import.meta.env.BASE_URL}dota-menu/${hero.id}.webm`} type="video/webm" /></video> : <img className="lobby-hero-render" src={imagePath} alt={`${hero.name} hero showcase`} />}
        <div className="lobby-hero-caption"><span className="lobby-kicker">HERO SHOWCASE</span><h3>{hero.name}</h3><span className="lobby-showcase-note">Browse heroes. Build your next draft.</span></div>
        <div className="lobby-hero-controls"><div role="group" aria-label="Choose showcase hero">{availableHeroes.map(item => <button key={item.id} aria-label={`Show ${item.name}`} aria-pressed={hero.id === item.id} onClick={() => setHeroId(item.id)}><img src={`${import.meta.env.BASE_URL}hero-icons/${item.icon}.png`} alt="" /></button>)}</div><button className="lobby-motion-button" aria-label={motion ? "Pause hero animation" : "Play hero animation"} onClick={() => setMotion(!motion)}>{motion ? <Pause size={14} /> : <Play size={14} />}</button><button className="lobby-view-heroes" onClick={() => onPage("heroes")}>Heroes<ArrowRight size={13} /></button></div>
      </div>
      <aside className="lobby-briefing" aria-label="Club briefing">
        <section className="lobby-event"><span className="lobby-card-kicker"><Trophy size={14} />{competition?.opponent ? "NEXT SERIES" : "THE ROAD TO THE INTERNATIONAL"}</span><div className="lobby-event-art" aria-hidden="true"><Trophy size={66} /><span>{!competition || competition.name.includes("International") ? <>THE<br />INTERNATIONAL</> : <>YOUR<br />NEXT SERIES</>}</span></div><h3>{competition?.name ?? "Choose your next tournament"}</h3><p>{competition?.opponent ? `${campaign.settings.team} vs ${competition.opponent}` : "Review invitations and plan your tournament calendar."}</p>{competition && <small>{competition.stage}{competition.estimated ? " · Estimated date" : ""}</small>}<button className="lobby-match-button" onClick={onCompetition}>{competition?.opponent ? "Open match centre" : "Season calendar"}<ArrowRight size={15} /></button></section>
        <button className="lobby-briefing-row" onClick={() => onPage("next-series")}><ClipboardList size={20} /><span><strong>Prepare for your opponent</strong><small>Scouting & draft preparation</small></span><ChevronRight size={15} /></button>
        <button className="lobby-briefing-row lobby-patch-row" onClick={() => onPage("patch")}><Shield size={20} /><span><strong>Patch {patch.id}</strong><small>{patch.name}</small></span><ChevronRight size={15} /></button>
        <button className="lobby-briefing-row" onClick={() => onPage("inbox")}><Mail size={20} /><span><strong>Club inbox</strong><small>{unread} unread {unread === 1 ? "message" : "messages"}</small></span>{unread > 0 && <span className="lobby-message-count">{unread}</span>}<ChevronRight size={15} /></button>
      </aside>
    </div>
    <div className="lobby-party"><div className="lobby-party-heading"><Swords size={17} /><span>YOUR STARTING FIVE</span><small>Click a player to open their profile</small></div><div className="lobby-party-slots">{roster.map((player, index) => <button className="lobby-player" key={player.id} onClick={() => onPlayer(player)} aria-label={`Open ${player.name} profile`}><span className="lobby-player-position">0{index + 1}</span><Avatar player={player} small /><span className="lobby-player-name"><strong>{player.name}</strong><small>{player.role}</small></span><span className={`lobby-player-energy ${player.energy < 60 ? "is-tired" : ""}`}><Zap size={10} />{Math.round(player.energy)}%</span></button>)}</div></div>
  </section>;
}
