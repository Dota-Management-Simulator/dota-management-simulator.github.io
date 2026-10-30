import { ArrowRight, Mail, Shield, Trophy, Zap } from "lucide-react";
import type { Campaign, Page, Player } from "./game";
import ManagerPriorities from './ManagerPriorities';
import { average, money, teamPlayers } from "./game";
import type { OfficeAction } from "./office";
import { unreadMessages } from "./office";
import { formatDate } from "./tournaments";
import { managerCompetition } from "./manager-view";
import TeamBadge from "./TeamBadge";
import { SquadTable } from "./SquadWorkspace";
import { TIRaceBrief } from "./CompetitionStandings";
import Headquarters from "./Headquarters";
import { campaignMenu } from "./menu-eras";

export default function ManagerDesk({ campaign, onPage, onAction, onPlayer, onCompetition }: {
  campaign: Campaign; onPage: (page: Page) => void; onAction: (action: OfficeAction) => void;
  onPlayer: (player: Player) => void; onCompetition: () => void;
}) {
  const roster = teamPlayers(campaign);
  const messages = (campaign.office?.messages ?? []).filter(m => !m.expired && !m.archived && m.action)
    .sort((a, b) => Number(!b.read) - Number(!a.read)).slice(0, 3);
  const competition = managerCompetition(campaign);
  const tired = roster.filter(p => p.energy < 60);
  const latest = campaign.results.at(-1);
  return <div className="manager-desk">
    <ManagerPriorities campaign={campaign} onAction={onAction} />
    <Headquarters campaign={campaign} onPage={onPage} onPlayer={onPlayer} onCompetition={onCompetition} onTournament={eventId => onAction({ kind: "tournament", eventId })} />
    {/* The copied clients already carry this data in their own panels and tabs. */}
    {campaignMenu(campaign).era.layout === "showcase" && <details className="desk-briefings"><summary>Club briefings <span>Decisions, standings & squad details</span><ArrowRight size={15} /></summary><div className="desk-briefing-content">
    <div className="desk-topline"><span><Shield size={16} />{campaign.settings.team} <span className="workspace-divider">/</span> Your alternate history</span><span><Zap size={15} />{average(roster.map(p => p.energy))}% squad energy</span></div>
    <div className="desk-columns">
      <section className="panel desk-decisions"><div className="desk-panel-heading"><div><span className="eyebrow">CLUB OFFICE</span><h2>On your desk</h2></div><button className="text-link" onClick={() => onPage("inbox")}><Mail size={15} />{unreadMessages(campaign)} unread <ArrowRight size={14} /></button></div>
        {messages.length ? <div className="desk-messages">{messages.map(message => <button className="desk-message" key={message.id} onClick={() => onAction(message.action!)}><span className={`desk-message-dot ${message.read ? "read" : ""}`} /><span><small>{message.sender}</small><strong>{message.subject}</strong><span>{message.actionLabel ?? "Review"} <ArrowRight size={13} /></span></span></button>)}</div> : <div className="desk-clear"><Shield size={25} /><h3>Your desk is clear.</h3><p>Review your squad and continue when you’re ready.</p></div>}
        {tired.length > 0 && <button className="desk-readiness" onClick={() => onPage("training")}><Zap size={16} /><span>{tired.map(p => p.name).join(", ")} {tired.length === 1 ? "is" : "are"} below 60% energy. Review the weekly plan.</span><ArrowRight size={15} /></button>}
      </section>
      <section className="panel desk-competition"><span className="eyebrow"><Trophy size={14} />{competition ? "NEXT COMPETITION" : "SEASON PLANNING"}</span><h2>{competition?.name ?? "Choose your next tournament"}</h2><p>{competition ? `${competition.stage}${competition.at ? ` · ${formatDate(competition.at)}` : ""}${competition.estimated ? " · estimated date" : ""}` : "Review invitations, qualification routes and upcoming dates."}</p>
        <div className="desk-matchup"><TeamBadge teamId={campaign.world?.managedTeamId} name={campaign.settings.team} year={campaign.year} size="large" /><strong>{campaign.settings.team}</strong>{competition?.opponent && <><span>vs</span><strong>{competition.opponent}</strong></>}</div>
        <button className="button secondary full" onClick={onCompetition}>{competition?.opponent ? "Open match centre" : competition ? "Review competition" : "Open season calendar"}<ArrowRight size={15} /></button>
        <button className="text-link" onClick={() => onPage("next-series")}>Scout your next series <ArrowRight size={14} /></button>
        <div className="desk-qualification"><Trophy size={15} /><span>{campaign.calendar ? "Qualification follows each tournament’s entry rules." : campaign.qualified ? "Your place at TI is secured." : `${campaign.points} / 80 circuit points · or win the regional qualifier`}</span></div>
      </section>
    </div>
    <TIRaceBrief campaign={campaign} onOpen={() => onPage("standings")} />
    <section className="panel desk-squad"><div className="desk-panel-heading"><div><h2>Squad readiness</h2><p>Your starting five, at a glance.</p></div><button className="text-link" onClick={() => onPage("roster")}>Manage squad <ArrowRight size={14} /></button></div><SquadTable campaign={campaign} onSelect={onPlayer} compact /></section>
    <div className="desk-bottom"><section className="panel desk-activity"><div className="desk-panel-heading"><h2>Club report</h2></div>{campaign.log.slice(0, 3).map((entry, i) => <p key={`${i}-${entry}`}><span className="activity-dot" />{entry}</p>)}</section>
      <section className="panel desk-result"><span className="eyebrow">LATEST RESULT</span>{latest ? <><h2>{latest.event}</h2><strong className="desk-result-score">{latest.won ? "WIN" : "LOSS"} · {latest.score ?? "Archived result"}</strong><p>{latest.opponent} · {money(latest.prize)} prize</p><button className="text-link" onClick={() => onPage("history")}>Season history <ArrowRight size={14} /></button></> : <><h2>A season to write.</h2><p>Your first completed event will appear here.</p></>}</section></div>
    </div></details>}
  </div>;
}
