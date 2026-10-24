import { useEffect, useState } from "react";
import { ArrowLeft, ChevronLeft, ChevronRight, Gem, List, Power, RotateCcw, Undo2, X } from "lucide-react";
import type { Campaign, Page, Player } from "./game";
import { average, money, teamPlayers } from "./game";
import { campaignMenu } from "./menu-eras";
import type { MenuEvent } from "./menu-events";
import type { TiMenu } from "./menu-ti";
import { managerCompetition } from "./manager-view";
import { unreadMessages } from "./office";
import type { OfficeMessage } from "./office";
import { formatDate, historicalTournaments, utcTime } from "./tournaments";
import TeamBadge from "./TeamBadge";
import { ClientStatus, ClientSystemMenu, ClientTabButton } from "./ClientShell";
import type { ClientTab } from "./ClientShell";
import Avatar from "./PlayerAvatar";

type Props = {
  campaign: Campaign; variant: "beta" | "source1"; event?: MenuEvent; ti?: TiMenu; archived?: boolean;
  onPage: (page: Page) => void; onPlayer: (player: Player) => void; onCompetition: () => void;
};
type View = "today" | "updates" | "play";
const art = (name: string) => `${import.meta.env.BASE_URL}dota-menu/${name}`;
const DAY = 86400000;

/** The 2011–2015 clients, following the layouts in docs/dota-menu-references.md.
 * Client tabs either switch this desk's own view or open the matching page. */
export default function ClientDashboard(props: Props) {
  const { campaign, variant, event, ti, archived, onPage, onPlayer } = props;
  const { patch, arrivals } = campaignMenu(campaign);
  const day = (campaign.calendar?.now ?? `${patch.startsOn}`).slice(0, 10);
  const eventCard = !!event && event.id !== "diretide2012";
  const [view, setView] = useState<View>(eventCard ? "play" : "today");
  const [motion, setMotion] = useState(() => !window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  const [book, setBook] = useState(ti?.style === "compendium-book");
  useEffect(() => { setView(eventCard ? "play" : "today"); setBook(ti?.style === "compendium-book"); }, [event?.id, ti?.year]);
  useEffect(() => {
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    const change = () => { if (preference.matches) setMotion(false); };
    preference.addEventListener("change", change);
    return () => preference.removeEventListener("change", change);
  }, []);

  const roster = teamPlayers(campaign);
  const energy = average(roster.map(player => player.energy));
  const competition = managerCompetition(campaign);
  const messages = (campaign.office?.messages ?? []).filter(message => !message.expired && !message.archived).slice(0, 6);
  const unread = unreadMessages(campaign);
  const results = campaign.results.filter(result => !result.skipped);
  const wins = results.filter(result => result.won).length;
  const live = campaign.calendar?.runs.some(run => run.state === "playing") ?? false;
  const nextTi = historicalTournaments.filter(e => e.kind === "ti" && e.end >= day).sort((a, b) => a.start.localeCompare(b.start))[0];
  const tiDays = nextTi ? Math.max(0, Math.ceil((utcTime(nextTi.start) - utcTime(day)) / DAY)) : null;
  const theme = ti ? (ti.style === "international-tab" ? "ti-blue" : ti.style === "compendium-book" ? "ti-crimson" : "ti-red")
    : event ? (event.id === "diretide2013" || event.id === "wraithnight" ? "frostivus" : event.id) : "default";
  const shared = { campaign, roster, energy, messages, unread, wins, results, onPage, onPlayer };
  const playTarget = competition?.opponent ? "Open match centre" : "Season calendar";
  const panels = { today: <TodayPanel {...props} day={day} patchName={patch.name} patchVersions={patch.versions} patchId={patch.id} description={patch.description} arrivals={arrivals} messages={messages} tiDays={tiDays} nextTiName={nextTi?.name} variant={variant} onBook={() => setBook(true)} />,
    updates: <UpdatesPanel patchId={patch.id} patchName={patch.name} versions={patch.versions} description={patch.description} arrivals={arrivals} onPage={onPage} />,
    play: <PlayPanel {...props} day={day} energy={energy} wins={wins} unread={unread} roster={roster} competition={competition} playTarget={playTarget} /> };

  if (variant === "beta") {
    // Every management page sits under a client tab; the profile, chat and friends panels open Squad and the inbox.
    const tabs: ClientTab[] = [{ label: "Today", open: () => setView("today"), active: view === "today" }, { label: "Updates", open: () => setView("updates"), active: view === "updates" }, { label: "Play", open: () => setView("play"), active: view === "play" },
      { label: "Watch", pages: ["standings", "calendar", "history"] }, { label: "Learn", pages: ["heroes", "patch", "training", "scrims", "next-series"] }, { label: "Socialize", pages: ["world", "roster", "scouting", "staff", "finances", "arcade"] }];
    return <section className="beta-client" aria-label="Manager’s Desk · The original dashboard">
      <header className="beta-top">
        <ClientSystemMenu motion={motion} onMotion={() => setMotion(!motion)} className="beta-corner" />
        <nav aria-label="Desk client tabs">{tabs.map(tab => <ClientTabButton key={tab.label} tab={tab} onPage={onPage} />)}</nav>
        <span className="beta-corner" aria-hidden="true"><Power size={24} /></span>
      </header>
      <ClientStatus campaign={campaign} className="beta-status" />
      <div className="beta-frame">
        <div className="beta-ornament" aria-hidden="true"><img src={art("dota-symbol.png")} alt="" /></div>
        <div className="beta-centre">{panels[view]}</div>
        <div className="beta-ornament" aria-hidden="true"><img src={art("dota-symbol.png")} alt="" /></div>
      </div>
      <div className="beta-bottom">
        <section className="beta-panel beta-profile"><h3>Profile</h3>
          <div className="beta-profile-card"><TeamBadge teamId={campaign.world?.managedTeamId} name={campaign.settings.team} year={campaign.year} size="medium" /><span><strong>{campaign.settings.team}</strong><small>Manager’s Desk</small></span></div>
          <div className="beta-level"><span>SEASON: {campaign.year}</span><span>READINESS: {energy} / 100</span></div>
          <div className="beta-record"><span><strong>{wins}</strong>EVENTS WON</span><span><strong>{results.length - wins}</strong>NOT WON</span><span><strong>{campaign.results.length - results.length}</strong>SKIPPED</span></div>
          <table><thead><tr><th>RECENT EVENTS</th><th>RESULT</th></tr></thead><tbody>{campaign.results.slice(-3).reverse().map((result, index) => <tr key={`${result.eventId}-${index}`}><td>{result.event}</td><td>{result.skipped ? "Skipped" : result.won ? "Won" : "—"}</td></tr>)}</tbody></table>
          {campaign.results.length === 0 && <p className="beta-empty">No events played yet.</p>}
        </section>
        <InboxPanel {...shared} className="beta-panel beta-chat" />
        <SquadPanel {...shared} className="beta-panel beta-friends" title="Friends" />
      </div>
    </section>;
  }

  const modernTabs = day >= "2013-08-12";
  const tabs: ClientTab[] = [
    { label: "Today", open: () => setView("today"), active: view === "today" },
    { label: modernTabs ? "Store" : "Customize", pages: ["finances", "scouting", "staff"] },
    { label: "Play", open: () => setView("play"), active: view === "play" },
    { label: "Watch", pages: ["standings", "calendar", "history"], badge: live ? "Live tournament" : undefined },
    { label: modernTabs ? "Library" : "Learn", pages: ["heroes", "patch", "training", "next-series"] },
    { label: modernTabs ? "Community" : "Socialize", pages: ["world", "roster", "scrims", "arcade"] },
  ];
  return <section className={`s1-client s1-theme-${theme} ${motion ? "has-motion" : ""}`} aria-label={`Manager’s Desk · ${ti ? `The International ${ti.year}` : event?.name ?? "The Dota 2 client"}`}>
    <div className="s1-backdrop" aria-hidden="true"><span className="s1-layer-a" /><span className="s1-layer-b" /></div>
    <header className="s1-top">
      <ClientSystemMenu motion={motion} onMotion={() => setMotion(!motion)} className="s1-corner" />
      <nav aria-label="Desk client tabs">{tabs.map(tab => <ClientTabButton key={tab.label} tab={tab} onPage={onPage} />)}</nav>
      <span className="s1-corner" aria-hidden="true"><Power size={14} /></span>
    </header>
    <div className="s1-logo"><img src={art("dota-symbol.png")} alt="" /><span>DOTA <b>2</b></span>{(archived || event || ti) && <small>{archived ? "From the event archive · " : ""}{ti ? `The International ${ti.year} · ${formatDate(ti.event.start)} – ${formatDate(ti.event.end)}` : event ? `${event.name} · original release ${formatDate(event.historicalRelease)}` : ""}</small>}<ClientStatus campaign={campaign} className="s1-status" /></div>
    <div className="s1-body">
      <div className="s1-main">{panels[view]}</div>
      <aside className="s1-side" aria-label="Club profile">
        <section className="s1-profile">
          <TeamBadge teamId={campaign.world?.managedTeamId} name={campaign.settings.team} year={campaign.year} size="large" />
          <div><strong>{campaign.settings.team}</strong><span>Manager’s Desk</span><div className="s1-points"><span style={{ width: `${energy}%` }} /><em>Squad readiness <b>{energy} / 100</b></em></div></div>
          <span className="s1-games">EVENT WINS: <b>{wins}</b></span><span className="s1-level">SEASON <b>{campaign.year}</b></span>
          {ti && ti.style !== "international-tab" && <button className="s1-compendium-icon" onClick={() => setBook(true)} aria-label="Open the Compendium"><img src={art("dota-symbol.png")} alt="" /></button>}
        </section>
        <InboxPanel {...shared} className="s1-panel s1-chat" />
        <SquadPanel {...shared} className="s1-panel s1-friends" title="Friends" />
      </aside>
    </div>
    {book && ti && <CompendiumBook ti={ti} onClose={() => setBook(false)} onPage={onPage} />}
    <span className="s1-credit">Layout after the {day.slice(0, 4)} client · Artwork © Valve</span>
  </section>;
}

function InboxPanel({ campaign, messages, unread, roster, onPage, className }: { campaign: Campaign; messages: OfficeMessage[]; unread: number; roster: Player[]; onPage: (page: Page) => void; className: string }) {
  const channel = campaign.settings.team.split(" ")[0].slice(0, 10);
  return <section className={className}>
    <h3>Inbox <span>{unread} unread</span></h3>
    <div className="client-chat-tabs"><span>{channel}</span><span>Office</span></div>
    <div className="client-chat-body">
      <div className="client-chat-log">{messages.length ? messages.map(message => <button key={message.id} onClick={() => onPage("inbox")}><time>{formatDate(message.at)}</time><b>{message.sender}:</b> {message.subject}</button>) : <p>Your desk is clear.</p>}</div>
      <ul className="client-chat-members" aria-label="Squad">{roster.map(player => <li key={player.id}>{player.name}</li>)}</ul>
    </div>
    <button className="client-chat-input" onClick={() => onPage("inbox")}>Open inbox<ChevronRight size={12} /></button>
  </section>;
}

function SquadPanel({ roster, onPlayer, onPage, className, title }: { roster: Player[]; onPlayer: (player: Player) => void; onPage: (page: Page) => void; className: string; title: string }) {
  const groups: [string, Player[]][] = [["READY TO PLAY", roster.filter(player => player.energy >= 60)], ["RESTING", roster.filter(player => player.energy < 60)]];
  return <section className={className}>
    <h3>{title} <span>Your squad</span><button onClick={() => onPage("roster")} aria-label="Manage squad">+</button></h3>
    <div className="client-friends">{groups.filter(([, players]) => players.length).map(([label, players]) => <div key={label}><h4>{label}</h4><div>{players.map(player =>
      <button key={player.id} className={player.energy >= 60 ? "is-playing" : "is-online"} onClick={() => onPlayer(player)} aria-label={`Open ${player.name} profile`}><Avatar player={player} small /><span><strong>{player.name}</strong><small>{player.role} · {Math.round(player.energy)}%</small></span></button>)}</div></div>)}</div>
  </section>;
}

function TodayPanel({ event, ti, variant, day, patchId, patchName, patchVersions, description, arrivals, messages, tiDays, nextTiName, onPage, onCompetition, onBook }: Props & {
  day: string; patchId: string; patchName: string; patchVersions: string; description: string; arrivals: { id: string; name: string }[]; messages: OfficeMessage[];
  tiDays: number | null; nextTiName?: string; onBook: () => void;
}) {
  const tabs = ["Blog", "News", "Updates", ...(ti?.style === "international-tab" ? ["International"] : [])];
  const [tab, setTab] = useState(ti?.style === "international-tab" ? "International" : "Blog");
  const [notice, setNotice] = useState(ti?.style === "compendium-2015");
  const lead = event ? { title: event.name, text: `${event.subtitle} The ${event.name} update is live across the client. Your season continues around it: prepare the squad, then take on your next series.` }
    : { title: patchName, text: description };
  return <div className={`client-panel client-today ${variant === "beta" ? "is-beta" : ""}`}>
    <div className="client-subtabs" role="tablist">{tabs.map(label => <button key={label} role="tab" aria-selected={tab === label} className={tab === label ? "is-active" : ""} onClick={() => setTab(label)}>{label}</button>)}<span className="client-subtab-icons" aria-hidden="true"><ArrowLeft size={12} /><RotateCcw size={12} /></span></div>
    {tab === "International" && ti ? <InternationalTab ti={ti} onPage={onPage} />
      : tab === "News" ? <div className="client-news">{messages.length ? messages.map(message => <button key={message.id} onClick={() => onPage("inbox")}><time>{formatDate(message.at)}</time><strong>{message.subject}</strong></button>) : <p>No club news yet.</p>}</div>
      : tab === "Updates" ? <UpdatesPanel patchId={patchId} patchName={patchName} versions={patchVersions} description={description} arrivals={arrivals} onPage={onPage} />
      : <div className="client-blog">
        <article className="client-article">
          <h2>{lead.title}</h2><time>{formatDate(day)}</time>
          {event?.background && <img src={art(event.background)} alt="" />}
          {event?.logo && <img className="is-sign" src={art(event.logo)} alt="" />}
          <p>{lead.text}</p>
          <button onClick={() => onPage(event ? "calendar" : "patch")}>{event ? "Season calendar" : "Read patch notes"}<ChevronRight size={12} /></button>
        </article>
        <aside className="client-blog-side">
          <div className="client-counter"><strong>{tiDays === null ? "—" : tiDays.toLocaleString()}</strong><span>{tiDays === null ? "NO INTERNATIONAL SCHEDULED" : `DAYS UNTIL ${nextTiName?.toUpperCase() ?? "THE INTERNATIONAL"}`}</span></div>
          <button className="client-ti-banner" onClick={() => onPage("standings")}><span>The International</span><small>DOTA 2 CHAMPIONSHIPS · TI RACE</small></button>
          <button className="client-promo" onClick={onCompetition}><span>NEXT SERIES</span><small>Match centre & calendar</small></button>
          <button className="client-promo is-blue" onClick={() => onPage("next-series")}><span>SCOUTING</span><small>Prepare for your opponent</small></button>
          <ul>{messages.slice(0, 4).map(message => <li key={message.id}><button onClick={() => onPage("inbox")}>{message.subject}<time>{formatDate(message.at)}</time></button></li>)}</ul>
        </aside>
        {notice && ti && <div className="client-compendium-notice" role="dialog" aria-label="The International Compendium">
          <button className="client-close" onClick={() => setNotice(false)}>Close<X size={11} /></button>
          <h3>The International Compendium {ti.year}</h3>
          <img src={art("ti2015.jpg")} alt="" />
          <img className="client-compendium-logo" src={art("ti2015-compendium-logo.png")} alt="The International Compendium" />
          <p>{money(ti.event.pool)} prize pool · {ti.teams.length} teams · {ti.event.location}<br />{formatDate(ti.event.start)} – {formatDate(ti.event.end)}</p>
          <div><button className="client-green" onClick={onBook}>Open the Compendium</button><button className="client-green" onClick={() => onPage("standings")}>TI race & standings</button></div>
        </div>}
      </div>}
  </div>;
}

function UpdatesPanel({ patchId, patchName, versions, description, arrivals, onPage }: { patchId: string; patchName: string; versions: string; description: string; arrivals: { id: string; name: string }[]; onPage: (page: Page) => void }) {
  return <div className="client-updates">
    <h2>{patchName}</h2><small>Patch {patchId} · {versions}</small><p>{description}</p>
    {arrivals.length > 0 && <div className="client-arrivals"><strong>New heroes</strong>{arrivals.map(hero => <span key={hero.id}><img src={`${import.meta.env.BASE_URL}hero-icons/${hero.id}.png`} alt="" />{hero.name}</span>)}</div>}
    <button onClick={() => onPage("patch")}>Read patch notes<ChevronRight size={12} /></button>
  </div>;
}

function PlayPanel({ campaign, event, day, energy, wins, unread, roster, competition, playTarget, onPage, onPlayer, onCompetition }: Props & {
  day: string; energy: number; wins: number; unread: number; roster: Player[]; competition: ReturnType<typeof managerCompetition>; playTarget: string;
}) {
  const later = day >= "2015-01-01";
  const eventLabel = event?.id === "newbloom2015" ? undefined : event?.name;
  const groups: [string, [string, () => void, boolean?][]][] = [
    [later ? "FIND A GAME" : "MATCHMAKING", [["Find a match", onCompetition], ["Season calendar", () => onPage("calendar")], ["Scout next series", () => onPage("next-series")], ...(eventLabel ? [[eventLabel, onCompetition, true] as [string, () => void, boolean]] : [])]],
    [later ? "LEARN" : "PRIVATE GAMES", later ? [["Training", () => onPage("training")], ["Staff", () => onPage("staff")]] : [["Scrims", () => onPage("scrims")], ["Training", () => onPage("training")]]],
    [later ? "PRIVATE GAMES" : "LEARN TO PLAY", later ? [["Scrims", () => onPage("scrims")], ["Heroes", () => onPage("heroes")]] : [["Heroes", () => onPage("heroes")], ["Patch notes", () => onPage("patch")], ["Staff", () => onPage("staff")]]],
  ];
  const versus = competition?.opponent ? `${campaign.settings.team} vs ${competition.opponent}` : "Review invitations and choose your next event.";
  const when = competition?.at ? `${competition.stage} · ${formatDate(competition.at)}` : competition?.stage ?? "No series scheduled";
  const days = competition?.at ? Math.max(0, Math.ceil((utcTime(competition.at) - utcTime(day)) / DAY)) : null;
  const tis = historicalTournaments.filter(e => e.kind === "ti").sort((a, b) => a.end.localeCompare(b.end));
  const next = tis.find(e => e.end >= day), previous = [...tis].reverse().find(e => e.end < day);
  const season = next && previous ? Math.min(1, (utcTime(day) - utcTime(previous.end)) / (utcTime(next.end) - utcTime(previous.end))) : 0;
  const card = event?.id === "wraithnight" ? <div className="client-event-card client-wraith" style={{ backgroundImage: `url("${art("wraith-night.jpg")}")` }}>
      <div className="client-wraith-progress"><span>THE ROAD TO {next?.name.toUpperCase() ?? "THE INTERNATIONAL"}</span><div aria-label={`${Math.round(season * 100)}% of the season played`}>{Array.from({ length: 10 }, (_, index) => <i key={index} className={index < Math.round(season * 10) ? "is-done" : ""} />)}</div></div>
      <div className="client-fragments"><span><Gem size={26} className="is-violet" /><small>EVENT WINS</small><strong>{wins}</strong></span><span><Gem size={26} className="is-green" /><small>SQUAD READINESS</small><strong>{energy}%</strong></span><button onClick={() => onPage("next-series")}><small>Next opponent</small><strong>{competition?.opponent ?? "To be decided"}</strong></button></div>
      <p>{versus}<br />{when}</p>
      <button className="client-play-now" onClick={onCompetition}>{competition?.opponent ? "PLAY NOW!" : "SEASON CALENDAR"}</button>
      <span className="client-difficulty">Difficulty: <b>{campaign.settings.difficulty}</b></span>
    </div>
    : event?.id === "diretide2013" ? <div className="client-event-card client-diretide">
      <div className="client-parchment"><h3>Diretide</h3><div className="client-sketch" aria-hidden="true" /></div>
      <div className="client-candy"><strong>CANDY CHAOS</strong><p>* {versus}<br />* {when}<br />* Squad readiness {energy}%<br />* Unread messages: {unread}</p></div>
      <button className="client-grey-button" onClick={onCompetition}>{competition?.opponent ? "PLAY DIRETIDE" : "SEASON CALENDAR"}</button>
      <div className="client-hall"><strong>YOUR STARTING FIVE</strong><div>{roster.map(player => <button key={player.id} onClick={() => onPlayer(player)} aria-label={`Open ${player.name} profile`}><Avatar player={player} small /></button>)}</div><small>Click a player to open their profile</small></div>
    </div>
    : event?.id === "greeviling" ? <div className="client-event-card client-greeviling">
      <img src={art("greeviling-sign.jpg")} alt="The Greeviling" />
      <p><strong>{event.subtitle}</strong>{versus}<br />{when}</p>
      <button className="client-grey-button" onClick={onCompetition}>{competition?.opponent ? "PLAY THE GREEVILING" : "SEASON CALENDAR"}</button>
    </div>
    : event?.id === "newbloom2015" ? <div className="client-event-card client-newbloom">
      <span className="client-learn-more">LEARN MORE</span>
      <img src={art("new-bloom-sign.jpg")} alt="New Bloom Festival" />
      <p>{versus}</p>
      <button className="client-green client-find-button" onClick={onCompetition}>{competition?.opponent ? "FIND MATCH" : "SEASON CALENDAR"}</button>
      <p className="client-countdown">{days === null ? "No series scheduled yet" : <>Your next series begins in: <b>{days === 0 ? "today" : `${days} ${days === 1 ? "day" : "days"}`}</b></>}</p>
      <div className="client-points"><div><span><b>{energy}</b>SQUAD READINESS</span><span><b>+{unread}</b>UNREAD MESSAGES</span><span><b>{wins}</b>EVENT WINS</span></div>
        <div><button onClick={() => onPage("training")}>Training</button><button onClick={() => onPage("scrims")}>Scrims</button><button onClick={() => onPage("next-series")}>Scouting</button></div></div>
    </div>
    : <div className="client-find-card"><h3>{competition?.name ?? "Choose your next tournament"}</h3><p>{versus}</p><small>{when}{competition?.estimated ? " · Estimated date" : ""}</small><button className="client-green client-find-button" onClick={onCompetition}>{playTarget}</button></div>;
  return <div className="client-panel client-play">
    <nav className="client-modes" aria-label="Play options">{groups.map(([heading, items]) => <div key={heading}><h4>{heading}</h4>{items.map(([label, open, highlight]) => <button key={label} className={highlight ? "is-event" : ""} onClick={open} aria-current={highlight ? "true" : undefined}>{label}</button>)}</div>)}</nav>
    <div className="client-find"><h3>FIND A MATCH</h3>{card}
      <div className="client-regions"><span><small>REGION</small>{campaign.settings.region}</span><span><small>PATCH</small>{campaignMenu(campaign).patch.id}</span><span><small>DIFFICULTY</small>{campaign.settings.difficulty}</span></div>
    </div>
  </div>;
}

function InternationalTab({ ti, onPage }: { ti: TiMenu; onPage: (page: Page) => void }) {
  const [section, setSection] = useState<"location" | "about" | "teams">("location");
  const poster = ti.year === 2012;
  return <div className="client-international" style={{ backgroundImage: `url("${art("ti2012-panel.jpg")}")` }}>
    <div className="client-international-head" aria-label={`The International ${ti.year}`} />
    <nav>{(["location", "about", "teams"] as const).map(item => <button key={item} className={section === item ? "is-active" : ""} onClick={() => setSection(item)}>{item === "teams" ? "Main event" : item}</button>)}<span>Media</span><span>Prelims</span></nav>
    {section === "location" ? <div className="client-ti-location"><div className="client-ti-subtabs"><span className="is-active">The event</span><span>Attendance</span><span>F.A.Q.</span></div>
      {poster ? <img src={art("ti2012-seattle.jpg")} alt={`The International ${ti.year}, ${ti.event.location}`} /> : <div className="client-ti-poster"><span>The International</span><small>DOTA 2 CHAMPIONSHIPS</small><em>★ ★ ★ ★ ★</em></div>}
      <p>{formatDate(ti.event.start)} – {formatDate(ti.event.end)}<br />{ti.event.location.toUpperCase()}</p></div>
      : section === "about" ? <div className="client-ti-about"><strong>{money(ti.event.pool)}</strong><span>PRIZE POOL</span><p>{ti.managedEntered ? "Your club is in the field. Prepare the squad for the main event." : "Your club is not in the field this year. Follow the event from the TI race and standings."}</p><button onClick={() => onPage("standings")}>TI race & standings<ChevronRight size={12} /></button></div>
      : <ol className="client-ti-teams">{ti.teams.map(team => <li key={team.id} className={team.managed ? "is-managed" : ""}>{team.name}</li>)}</ol>}
  </div>;
}

function CompendiumBook({ ti, onClose, onPage }: { ti: TiMenu; onClose: () => void; onPage: (page: Page) => void }) {
  const [spread, setSpread] = useState(0);
  const prizes = ti.event.prizes.filter(prize => prize.usd > 0);
  const half = Math.ceil(prizes.length / 2);
  const place = (from: number, to: number) => from === to ? `${from}` : `${from}–${to}`;
  const prizeRow = (prize: typeof prizes[number]) => <li key={prize.from}><span className="client-book-number">{place(prize.from, prize.to)}</span><span className="client-book-tag">{prize.from === 1 ? "CHAMPION" : `PLACE ${place(prize.from, prize.to)}`}</span><span className="client-book-amount"><strong>{money(prize.usd)}</strong><small>{prize.from === prize.to ? "Prize money" : "Prize money per team"}</small></span></li>;
  return <div className="client-book-overlay" role="dialog" aria-label={`The International ${ti.year} Compendium`}>
    <button className="client-book-close" onClick={onClose} aria-label="Close the Compendium"><X size={22} /></button>
    <div className="client-book">
      {spread === 0 ? <>
        <div className="client-book-page"><h3>THE PRIZE POOL</h3><p className="client-book-total">{money(ti.event.pool)} <small>TOTAL</small></p>
          <div className="client-book-goals"><span>PRIZE DISTRIBUTION</span><div>{prizes.map(prize => <i key={prize.from} style={{ flex: prize.usd }} />)}</div></div>
          <ol>{prizes.slice(0, half).map(prizeRow)}</ol></div>
        <div className="client-book-page"><h3>THE PRIZE POOL</h3><ol>{prizes.slice(half).map(prizeRow)}</ol><p className="client-book-foot">{ti.event.location} · {formatDate(ti.event.start)} – {formatDate(ti.event.end)}</p></div>
      </> : <>
        <div className="client-book-page"><h3>THE TEAMS</h3><ol className="client-book-teams">{ti.teams.map(team => <li key={team.id} className={team.managed ? "is-managed" : ""}>{team.name}</li>)}</ol></div>
        <div className="client-book-page"><h3>YOUR ROAD</h3><p className="client-book-road">{ti.managedEntered ? "Your club is in the field for The International." : "Your club is not in the field this year."}</p>
          <div className="client-book-actions"><button onClick={() => onPage("calendar")}>Season calendar</button><button onClick={() => onPage("standings")}>TI race & standings</button><button onClick={() => onPage("next-series")}>Scout your next series</button></div></div>
      </>}
    </div>
    <nav className="client-book-nav" aria-label="Compendium pages"><button disabled={spread === 0} onClick={() => setSpread(0)} aria-label="Previous page"><ChevronLeft size={30} /></button><button onClick={() => setSpread(0)} aria-label="Contents"><List size={24} /></button><button onClick={onClose} aria-label="Back to the dashboard"><Undo2 size={22} /></button><button disabled={spread === 1} onClick={() => setSpread(1)} aria-label="Next page"><ChevronRight size={30} /></button></nav>
  </div>;
}
