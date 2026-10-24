import { formatOfficeDate } from "./office-date";
import { useEffect, useState } from "react";
import { botChallengeOpen } from "./bot-challenge";
import { allStarEvent } from "./all-star";
import { ArrowUpRight, ChevronLeft, ChevronRight, ChevronsLeft, Gem, Info, Mail, Plus, Power, Shield, Star, Users, X } from "lucide-react";
import type { Campaign, Page, Player } from "./game";
import { average, money, teamPlayers } from "./game";
import { campaignMenu } from "./menu-eras";
import type { MenuEvent } from "./menu-events";
import type { TiMenu } from "./menu-ti";
import { managerCompetition } from "./manager-view";
import { unreadMessages } from "./office";
import type { OfficeMessage } from "./office";
import { formatDate, historicalTournaments, utcTime } from "./tournaments";
import { ClientSystemMenu, ClientTabButton, ContinueButton, useDeskShell } from "./ClientShell";
import type { ClientTab } from "./ClientShell";
import { weeklyIncome, weeklyWages } from "./game";
import TeamBadge from "./TeamBadge";
import Avatar from "./PlayerAvatar";

type Props = {
  campaign: Campaign; event?: MenuEvent; ti?: TiMenu; archived?: boolean;
  onPage: (page: Page) => void; onPlayer: (player: Player) => void; onCompetition: () => void;
};
type View = "home" | "play" | "ti";
const art = (name: string) => `${import.meta.env.BASE_URL}dota-menu/${name}`;
const DAY = 86400000;

/** Client changes with no dated source. Each is the earliest capture that shows
 * the change, so the real switch may be earlier (docs/dota-menu.md). */
const PLUS = "2019-12-18";
const FEATURED_HOME = "2020-10-29";
const SHARDS = "2020-10-29";
const ARMORY = "2023-09-12";

/** The latest major update's Valve art, by composite (dota2.com past updates). */
const updateArt: [string, string, string][] = [
  ["2016.1", "update-reborn.jpg", "Reborn"], ["2017.1", "update-700.jpg", "The New Journey"], ["2018.1", "update-duelingfates.jpg", "Dueling Fates"],
  ["2019.1", "update-720.jpg", "Gameplay Update 7.20"], ["2020.1", "update-outlanders.jpg", "The Outlanders"], ["2021.1", "update-mistwoods.jpg", "Mistwoods"],
  ["2022.1", "update-primalbeast.jpg", "Primal Beast"], ["2023.1", "update-newfrontiers.jpg", "New Frontiers"], ["2024.2", "update-facets.jpg", "Facets & Innates"],
  ["2025.1", "update-wanderingwaters.jpg", "Wandering Waters"],
];
const order = (id: string) => { const [year, phase] = id.split(".").map(Number); return year * 2 + phase; };

function useData(campaign: Campaign) {
  const { patch } = campaignMenu(campaign);
  const day = (campaign.calendar?.now ?? patch.startsOn).slice(0, 10);
  const roster = teamPlayers(campaign);
  const results = campaign.results.filter(result => !result.skipped);
  const tis = historicalTournaments.filter(e => e.kind === "ti").sort((a, b) => a.end.localeCompare(b.end));
  const nextTi = tis.find(e => e.end >= day), previousTi = [...tis].reverse().find(e => e.end < day);
  const update = [...updateArt].reverse().find(([id]) => order(id) <= patch.year * 2 + patch.phase) ?? updateArt[0];
  return {
    patch, day, roster, results,
    energy: average(roster.map(player => player.energy)),
    wins: results.filter(result => result.won).length,
    last: campaign.results.filter(result => !result.skipped).at(-1),
    competition: managerCompetition(campaign),
    messages: (campaign.office?.messages ?? []).filter(message => !message.expired && !message.archived).slice(0, 6),
    unread: unreadMessages(campaign),
    nextTi, tiDays: nextTi ? Math.max(0, Math.ceil((utcTime(nextTi.start) - utcTime(day)) / DAY)) : null,
    season: nextTi && previousTi ? Math.min(1, (utcTime(day) - utcTime(previousTi.end)) / (utcTime(nextTi.end) - utcTime(previousTi.end))) : 0,
    upcoming: historicalTournaments.filter(e => e.start >= day).sort((a, b) => a.start.localeCompare(b.start)).slice(0, 5),
    update: { file: update[1], title: update[2] },
    live: campaign.calendar?.runs.some(run => run.state === "playing") ?? false,
  };
}
type Data = ReturnType<typeof useData>;

/** The Reborn client (September 2015 onward), following the layouts in
 * docs/dota-menu-references.md. Tabs open the matching management page. */
export default function RebornClient(props: Props) {
  const { campaign, event, ti, archived, onPage } = props;
  const d = useData(campaign);
  const modern = d.day >= FEATURED_HOME;
  const compendium = !!ti && ti.style !== "battlepass";
  const start: View = compendium ? "ti" : !ti && event?.pattern === "column" ? "play" : "home";
  const [view, setView] = useState<View>(start);
  const [pass, setPass] = useState(ti?.style === "battlepass");
  const [motion, setMotion] = useState(() => !window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  useEffect(() => { setView(start); setPass(ti?.style === "battlepass"); }, [event?.id, ti?.year]);
  useEffect(() => {
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    const change = () => { if (preference.matches) setMotion(false); };
    preference.addEventListener("change", change);
    return () => preference.removeEventListener("change", change);
  }, []);

  const green = event?.id === "diretide2020" || event?.id === "diretide";
  const shell = useDeskShell();
  // Every management page sits under a client tab; the party icon opens Squad and the mail icon the inbox.
  const tabs: ClientTab[] = [{ label: "Heroes", pages: ["heroes", "patch"] }, { label: d.day >= ARMORY ? "Armory" : "Store", pages: ["finances", "scouting", "staff"] },
    { label: "Watch", pages: ["standings", "calendar", "history"], badge: d.live ? "Live tournament" : undefined }, { label: "Learn", pages: ["training", "scrims", "next-series"] }, { label: "Arcade", pages: ["arcade", "world"] }];
  const net = weeklyIncome(campaign) - weeklyWages(campaign);
  const shared = { ...props, d, modern, setView, openPass: () => setPass(true) };
  const home = event?.pattern === "battlepass" ? <PassPage {...shared} event={event} />
    : event?.pattern === "home" ? event.id === "frostivus2019" ? <FrostivusHome {...shared} /> : <FeaturedHome {...shared} />
    : modern ? <FeaturedHome {...shared} /> : <GridHome {...shared} />;
  const main = view === "ti" && ti ? ti.style === "compendium-2021" ? <Compendium2021 ti={ti} d={d} onPage={onPage} /> : <CompendiumSidebar ti={ti} d={d} campaign={campaign} onPage={onPage} />
    : <>{home}{view === "play" && <PlayPanel {...shared} />}</>;
  const title = ti ? `The International ${ti.year}` : event?.name ?? "Dota 2 Reborn";

  return <section className={`rb-client rb-view-${view} ${event ? `rb-event-${event.id}` : ""} ${ti ? `rb-ti-${ti.year}` : ""} ${modern ? "is-modern" : ""} ${motion ? "has-motion" : ""}`} aria-label={`Manager’s Desk · ${title}`}>
    <header className="rb-top">
      <ClientSystemMenu motion={motion} onMotion={() => setMotion(!motion)} className="rb-icon" />
      <span className="rb-arrows" aria-hidden="true"><ChevronLeft size={18} /><ChevronRight size={18} /></span>
      <button className={`rb-logo-tab ${green ? "is-green" : ""} ${view === "home" ? "is-active" : ""}`} onClick={() => setView("home")} aria-label="Dashboard home" aria-pressed={view === "home"}><img src={art("dota-symbol.png")} alt="" /></button>
      <nav aria-label="Desk client tabs">{tabs.map(tab => <ClientTabButton key={tab.label} tab={tab} onPage={onPage} />)}</nav>
      <div className="rb-top-right">
        {d.day >= SHARDS && <button className="rb-shards" onClick={() => onPage("finances")} title={`${net > 0 ? "+" : ""}${money(net)} net per week`}><Gem size={16} /><b>{money(campaign.cash)}</b><small>CLUB FUNDS</small></button>}
        <button className="rb-icon" onClick={() => onPage("inbox")} aria-label={`Inbox, ${d.unread} unread`}><Mail size={18} />{d.unread > 0 && <i>{d.unread}</i>}</button>
        <span className="rb-icon" aria-hidden="true"><Shield size={18} /></span>
        {d.day >= PLUS && <span className="rb-icon rb-plus" aria-hidden="true"><Plus size={16} /></span>}
        {ti && <button className="rb-icon rb-ti-icon" onClick={() => compendium ? setView("ti") : setPass(true)} aria-label={compendium ? "Open the Compendium" : "Open the Battle Pass"}><img src={art("dota-symbol.png")} alt="" /></button>}
        <span className="rb-icon rb-power" aria-hidden="true"><Power size={17} /></span>
      </div>
    </header>
    {/* The 2015–2020 client printed its live counters under the top bar; the date and funds sit there. */}
    <div className="rb-stats"><span>{campaign.calendar ? formatDate(campaign.calendar.now) : `Week ${campaign.week} · ${campaign.year}`}</span>{d.day < SHARDS && <span>{money(campaign.cash)} CLUB FUNDS</span>}<span>{net > 0 ? "+" : ""}{money(net)} PER WEEK</span><button disabled={shell?.busy} onClick={() => onPage("patch")}>PATCH {d.patch.id}</button></div>
    <div className="rb-body">{main}</div>
    <footer className="rb-bottom">
      <div className="rb-party"><button className="rb-party-icon" onClick={() => onPage("roster")} aria-label="Open squad"><Users size={18} /></button><div>{d.roster.map(player => <button key={player.id} onClick={() => props.onPlayer(player)} aria-label={`Open ${player.name} profile`}><Avatar player={player} small /></button>)}</div></div>
      <button className="rb-chat" onClick={() => onPage("inbox")}><b>To ({campaign.settings.team}):</b> {d.unread ? `${d.unread} unread in the club inbox.` : "Open the club inbox."} <span aria-hidden="true">?</span></button>
      <div className="rb-play-wrap">{shell?.action && <small>{shell.action.kind === "advance" ? "NEXT STEP" : "YOUR ATTENTION"} · {shell.action.detail}</small>}<ContinueButton className={`rb-play ${modern ? "is-green" : ""}`} /></div>
    </footer>
    {pass && ti?.style === "battlepass" && <BattlePassOverlay ti={ti} onClose={() => setPass(false)} onPage={onPage} />}
    <span className="rb-credit">{archived ? "From the event archive · " : ""}Layout after the {ti?.year ?? event?.historicalRelease.slice(0, 4) ?? d.day.slice(0, 4)} client{ti?.inferred ? " (inferred)" : ""} · Artwork © Valve</span>
  </section>;
}

type Shared = Props & { d: Data; modern: boolean; setView: (view: View) => void; openPass: () => void };

function Friends({ d, onPlayer, onPage, title = "Friends" }: { d: Data; onPlayer: (player: Player) => void; onPage: (page: Page) => void; title?: string }) {
  const groups: [string, Player[]][] = [["Ready to play", d.roster.filter(player => player.energy >= 60)], ["Resting", d.roster.filter(player => player.energy < 60)]];
  return <section className="rb-card rb-friends"><h3>{title}<button onClick={() => onPage("roster")} aria-label="Manage squad"><Users size={14} /></button></h3>
    {groups.filter(([, players]) => players.length).map(([label, players]) => <div key={label}><h4>▾ {label} <span>({players.length})</span></h4><div>{players.map(player =>
      <button key={player.id} onClick={() => onPlayer(player)} aria-label={`Open ${player.name} profile`}><Avatar player={player} small /><span>{player.name}</span></button>)}</div></div>)}
  </section>;
}

function GridHome({ campaign, ti, event, d, onPage, onPlayer, onCompetition, openPass, setView }: Shared) {
  const pass = ti?.style === "battlepass";
  const ladder = [...d.roster].sort((a, b) => b.energy - a.energy);
  return <div className="rb-grid">
    <div className="rb-col rb-col-left">
      <section className="rb-card rb-profile"><h3>My profile<button onClick={() => onPage("roster")} aria-label="Open squad"><ArrowUpRight size={14} /></button></h3>
        <div className="rb-profile-row"><TeamBadge teamId={campaign.world?.managedTeamId} name={campaign.settings.team} year={campaign.year} size="medium" /><span><strong>{campaign.settings.team}</strong><small>Main Menu</small></span><b className="rb-badge-level">{d.wins}</b></div>
        <div className="rb-profile-stats"><span><small>SEASON</small>{campaign.year}</span><span><small>READINESS</small>{d.energy}%</span><span><small>DIFFICULTY</small>{campaign.settings.difficulty}</span></div>
      </section>
      <section className="rb-card rb-pass"><h3>{pass ? "Battle Pass" : "Season"}<ArrowUpRight size={14} aria-hidden="true" /></h3>
        <div className="rb-pass-level"><div><span style={{ width: `${Math.round(d.season * 100)}%` }} /></div><small>{d.tiDays === null ? "NO INTERNATIONAL SCHEDULED" : `${d.tiDays} DAYS TO ${d.nextTi?.name.toUpperCase()}`}</small><span>LEVEL <b>{d.wins}</b></span></div>
        <button className="rb-green" onClick={pass ? openPass : onCompetition}>{pass ? "View the Battle Pass" : "Season calendar"}</button>
      </section>
      <Friends d={d} onPlayer={onPlayer} onPage={onPage} />
    </div>
    <div className="rb-col rb-col-mid">
      <div className="rb-tiles">
        <button className="rb-tile rb-news" onClick={() => onPage("patch")} style={{ backgroundImage: `url("${art(d.update.file)}")` }}><span className="rb-tag">New in Dota 2</span><strong>{d.patch.name}<small>Patch {d.patch.id} · {d.patch.versions}</small></strong></button>
        <section className="rb-tile rb-last"><span className="rb-tag">Your last match</span>{d.last ? <div><strong>{d.last.event}</strong><dl><dt>OPPONENT</dt><dd>{d.last.opponent || "—"}</dd><dt>SCORE</dt><dd>{d.last.score || "—"}</dd><dt>PRIZE</dt><dd>{money(d.last.prize)}</dd><dt>RESULT</dt><dd className={d.last.won ? "is-win" : "is-loss"}>{d.last.won ? "WON" : "NOT WON"}</dd></dl></div> : <p>No matches played yet.</p>}<button onClick={() => onPage("history")}>All recent games »</button></section>
        <section className="rb-tile rb-ladder"><span className="rb-tag">Friends</span><span className="rb-tag is-right">Readiness</span><ol>{ladder.map(player => <li key={player.id}><button onClick={() => onPlayer(player)}><Avatar player={player} small /><span>{player.name}</span><b>{Math.round(player.energy)}</b></button></li>)}</ol></section>
        <button className="rb-tile rb-treasure" onClick={onCompetition} style={{ backgroundImage: `url("${art(ti && ti.year <= 2019 ? `ti${ti.year}.jpg` : "reborn-header.png")}")` }}><span className="rb-tag">{d.competition?.opponent ? "Next series" : "Season calendar"}</span><strong>{d.competition?.name ?? "Choose your next tournament"}<small>{d.competition?.opponent ? `vs ${d.competition.opponent}` : "Invitations & qualification"}</small></strong></button>
      </div>
      <ChatPanel campaign={campaign} d={d} onPage={onPage} />
    </div>
    <div className="rb-col rb-col-right">
      {event?.id === "siltbreaker" ? <button className="rb-feature rb-feature-silt" onClick={() => setView("play")} style={{ backgroundImage: `url("${art("siltbreaker.jpg")}")` }}><span className="rb-tag">Multiplayer campaign</span><strong>Siltbreaker</strong><small>Act I: The Sands of Fate</small><em>Play it now</em></button>
        : event ? <button className={`rb-feature rb-feature-${event.id}`} onClick={() => onPage("calendar")} style={event.background ? { backgroundImage: `url("${art(event.background)}")` } : undefined}><span className="rb-tag">Special event</span><strong>{event.name}</strong><small>Ends {formatDate(event.window.to)}</small><em>Play it now</em></button>
        : <button className="rb-feature rb-feature-ti" onClick={() => onPage("standings")} style={d.nextTi && d.nextTi.year <= 2019 && d.nextTi.year >= 2016 ? { backgroundImage: `url("${art(`ti${d.nextTi.year}.jpg`)}")` } : undefined}><span className="rb-tag">The International</span><strong>{d.tiDays ?? "—"}</strong><small>{d.tiDays === null ? "No International scheduled" : `days until ${d.nextTi?.name}`}</small><em>TI race & standings</em></button>}
      <section className="rb-card rb-feed"><button className="rb-feed-input" onClick={() => onPage("inbox")}>Say something on your feed…</button>
        {d.messages.length ? d.messages.slice(0, 3).map(message => <button key={message.id} onClick={() => onPage("inbox")}><b>{message.sender}</b> posted: {message.subject}<time>{formatOfficeDate(message.at)}</time></button>) : <p>No club news yet.</p>}</section>
    </div>
  </div>;
}

function ChatPanel({ campaign, d, onPage }: { campaign: Campaign; d: Data; onPage: (page: Page) => void }) {
  return <section className="rb-card rb-chat-panel"><div className="rb-chat-tabs"><span>Party</span><span className="is-active">{campaign.settings.region}</span><span className="is-right">Channels +</span></div>
    <div className="rb-chat-log">{d.messages.length ? d.messages.map((message: OfficeMessage) => <button key={message.id} onClick={() => onPage("inbox")}><time>{formatOfficeDate(message.at)}</time><b>{message.sender}:</b> {message.subject}</button>) : <p>Your desk is clear.</p>}</div>
    <button className="rb-chat-input" onClick={() => onPage("inbox")}><b>To ({campaign.settings.region}):</b> Open the club inbox</button>
  </section>;
}

function Promos({ d, ti, event, onPage, onCompetition }: Shared) {
  return <aside className="rb-promos" aria-label="Featured">
    <button className="rb-promo" onClick={onCompetition} style={{ backgroundImage: `url("${art(event?.background ?? d.update.file)}")` }}><span className="rb-tag">{d.competition?.opponent ? "Next series" : "Season calendar"}</span><strong>{d.competition?.name ?? "Choose your next tournament"}</strong></button>
    <button className="rb-outline" onClick={() => onPage("next-series")}>Scout your opponent</button>
    <button className="rb-promo" onClick={() => onPage("standings")} style={ti?.year === 2023 ? { backgroundImage: `url("${art("ti2023.jpg")}")` } : ti?.year === 2021 ? { backgroundImage: `url("${art("ti2021.jpg")}")` } : undefined}><span className="rb-tag">The International</span><strong>{d.tiDays === null ? "No International scheduled" : d.tiDays === 0 ? `${d.nextTi?.name} is live` : `${d.tiDays} days until ${d.nextTi?.name}`}</strong></button>
  </aside>;
}

function FeaturedHome(props: Shared) {
  const { campaign, event, d, onPage, onPlayer, onCompetition } = props;
  const crownfall = event?.id === "crownfall", curios = event?.id === "curios2025";
  const background = event?.background ?? (curios ? undefined : d.update.file);
  return <div className="rb-featured">
    <aside className="rb-left">
      <section className="rb-card rb-profile is-flat"><div className="rb-profile-row"><TeamBadge teamId={campaign.world?.managedTeamId} name={campaign.settings.team} year={campaign.year} size="medium" /><span><strong>{campaign.settings.team}</strong><small>Main Menu</small></span></div>
        {event && <div className="rb-points-row"><span>{event.name} wins <Info size={11} /></span><b>{d.wins}</b></div>}
        <div className="rb-challenge"><small>WEEKLY CHALLENGE</small><strong>{d.competition?.opponent ? `Beat ${d.competition.opponent}` : "Choose your next event"}</strong><span>{[0, 1, 2].map(index => <i key={index} className={index < Math.min(3, d.wins) ? "is-done" : ""} />)}</span><small>READINESS {d.energy}%</small></div>
      </section>
      <Friends d={d} onPlayer={onPlayer} onPage={onPage} />
    </aside>
    <div className={`rb-stage ${event ? `is-${event.id}` : ""}`} style={background ? { backgroundImage: `url("${art(background)}")` } : undefined}>
      <div className="rb-stage-fx" aria-hidden="true" />
      {crownfall && <img className="rb-crown-heroes" src={art("crownfall-heroes.png")} alt="" />}
      {curios ? <CuriosPanel {...props} />
        : event ? <div className="rb-stage-copy">{event.logo ? <img src={art(event.logo)} alt={event.name} /> : <h2>{event.name}</h2>}<p>{event.subtitle}</p>
          {crownfall && <div className="rb-acts" style={{ backgroundImage: `url("${art("crownfall-acts.png")}")` }}>{([["I", "Your squad", "roster"], ["II", "Preparation", "next-series"], ["III", "Practice", "training"], ["IV", "The road to TI", "calendar"]] as [string, string, Page][]).map(([numeral, label, page]) => <button key={numeral} onClick={() => onPage(page)}><small>ACT {numeral}</small>{label}</button>)}</div>}
          <button className="rb-show" onClick={() => onPage("calendar")}>Show event details</button></div>
        : <div className="rb-stage-copy is-update"><small>NEW IN DOTA 2</small><h2>{d.update.title}</h2><p>Patch {d.patch.id} · {d.patch.name}</p><button className="rb-show" onClick={() => onPage("patch")}>Read patch notes</button></div>}
    </div>
    <Promos {...props} onCompetition={onCompetition} />
  </div>;
}

function CuriosPanel({ event, d, onPlayer, onPage }: Shared) {
  const featured = [...d.roster].sort((a, b) => b.energy - a.energy).slice(0, 3);
  return <div className="rb-curios"><div className="rb-curios-head"><h2>{event!.name}</h2><b>{d.wins}</b></div><p>{event!.subtitle}</p>
    <div className="rb-curios-sets">{featured.map(player => <button key={player.id} onClick={() => onPlayer(player)}><Avatar player={player} small /><small>{player.role}</small><strong>{player.name}</strong><span>{[20, 40, 60, 80, 100].map(step => <i key={step} className={player.energy >= step ? "is-done" : ""}>{step}</i>)}</span></button>)}</div>
    <div className="rb-curios-track"><div><h4>Results</h4><span>{d.results.slice(-6).map((result, index) => <i key={index} className={result.won ? "is-done" : ""}>{index + 1}</i>)}{d.results.length === 0 && <em>No results yet</em>}</span></div><div><h4>Upcoming</h4><span>{d.upcoming.slice(0, 4).map(item => <button key={item.id} onClick={() => onPage("calendar")}>{item.name}</button>)}</span></div></div>
    <small className="rb-curios-end">Event ends: {formatDate(event!.window.to)}</small>
  </div>;
}

function FrostivusHome({ campaign, d, onPage, onCompetition }: Shared) {
  const cheer: [string, Page, number][] = [["Train the squad", "training", d.energy], ["Book a scrim", "scrims", d.roster.length], ["Scout a rival", "next-series", d.unread], ["Hero pool", "heroes", d.results.length]];
  return <div className="rb-frostivus">
    <div className="rb-snow" aria-hidden="true" />
    <div className="rb-frost-copy">
      <h2>Frostivus</h2><strong>DEC 18 – JAN 2</strong>
      <p>The march of the Frostivus Penguins signals the start of the Season of Givening. {campaign.settings.team} still has a season to win.</p>
      <h3>Frostivus cheer</h3><div className="rb-cheer">{cheer.map(([label, page, value]) => <button key={label} onClick={() => onPage(page)}><small>{label}</small><b>{value}</b></button>)}</div>
      <button className="rb-gold" onClick={() => onPage("finances")}>Club finances</button>
      <div className="rb-frost-bars"><div><h3>Frostivus rewards</h3><span><b>{Math.round(d.season * 100)}%</b> of the season played</span><div><i style={{ width: `${Math.round(d.season * 100)}%` }} /></div></div>
        <div><h3>Play nice</h3><span><b>{d.energy} / 100</b> squad readiness</span><div><i style={{ width: `${d.energy}%` }} /></div></div></div>
    </div>
    <div className="rb-frost-track">{d.upcoming.map((item, index) => <button key={item.id} onClick={index === 0 ? onCompetition : () => onPage("calendar")}><small>{formatDate(item.start)}</small>{item.name}<b>{index + 1}</b></button>)}</div>
  </div>;
}

function PassPage({ campaign, event, d, onPage }: Shared & { event: MenuEvent }) {
  const week = Math.max(1, Math.min(8, Math.floor((utcTime(d.day) - utcTime(event.window.from)) / (7 * DAY)) + 1));
  const read = d.messages.length - Math.min(d.unread, d.messages.length);
  const quests: [string, string, number, number, Page][] = [
    ["Full strength", "Bring squad readiness to 80%", Math.min(d.energy, 80), 80, "training"],
    ["Road to the Aegis", "Win 1 event", Math.min(d.wins, 1), 1, "calendar"],
    ["Know your enemy", "Scout your next opponent", 0, 1, "next-series"],
    ["Clear the desk", "Read your club messages", read, Math.max(1, d.messages.length), "inbox"],
    ["Squad goals", "Field five players", d.roster.length, 5, "roster"],
    ["Balanced books", "Check the club finances", campaign.cash > 0 ? 1 : 0, 1, "finances"],
  ];
  const stars = quests.reduce((sum, [, , value, goal]) => sum + Math.floor(3 * value / goal), 0);
  return <div className="rb-bp">
    <img className="rb-bp-art" src={art(event.background!)} alt="" />
    <div className="rb-bp-head">{event.logo ? <img src={art(event.logo)} alt={event.name} /> : <h2>{event.name}</h2>}<small>+ BATTLE PASS</small></div>
    <nav className="rb-bp-crumbs" aria-label="Battle Pass"><span>Home</span>/<span>Weekly quests</span>/<span>{campaign.settings.team}</span></nav>
    <div className="rb-bp-main">
      <div className="rb-bp-weeks">{Array.from({ length: 8 }, (_, index) => <span key={index} className={index + 1 === week ? "is-active" : index + 1 > week ? "is-locked" : ""}>Week {index + 1}{index + 1 === week && <small>ACTIVE</small>}</span>)}</div>
      <div className="rb-bp-progress"><strong>WEEK {week} PROGRESS:</strong><span>{Array.from({ length: 18 }, (_, index) => <i key={index} className={index < stars ? "is-done" : ""} />)}</span><b>{stars}/18</b></div>
      <div className="rb-bp-quests">{quests.map(([title, text, value, goal, page]) => <button key={title} onClick={() => onPage(page)}><h4>{title}<span>{[0, 1, 2].map(index => <Star key={index} size={16} className={index < Math.floor(3 * value / goal) ? "is-done" : ""} />)}</span></h4><p>{text}</p><div><i style={{ width: `${Math.round(100 * value / goal)}%` }} /><b>{value}/{goal}</b></div></button>)}</div>
    </div>
  </div>;
}

function PlayPanel({ campaign, event, d, onPage, onCompetition, setView }: Shared) {
  const column = event?.pattern === "column" ? event : undefined;
  const modes: [string, () => void][] = [["Ranked match", onCompetition], ["Normal match", () => onPage("scrims")], ["Practice with bots", () => onPage("training")], ...(botChallengeOpen(campaign) ? [["Challenge OpenAI Five", () => onPage("arcade")] as [string, () => void]] : []), ...(allStarEvent(campaign) ? [["All-Star match", () => onPage("arcade")] as [string, () => void]] : [])];
  return <div className="rb-play-panel">
    {column && <section className={`rb-event-column is-${column.id}`}><h2>{column.name}</h2><small>EVENT ENDS {formatDate(column.window.to).toUpperCase()}</small>
      <p>{column.subtitle} {campaign.settings.team} plays on through the event: every series still counts toward the road to The International.</p>
      <ol>{["Prepare the squad in training and scrims.", "Win series to earn prize money and points.", "Claim the Aegis at The International."].map(step => <li key={step}>{step}</li>)}</ol>
      <div className="rb-current-points"><small>EVENT WINS</small><strong>{d.wins.toLocaleString()}</strong></div></section>}
    <section className="rb-modes">
      <button className="rb-modes-close" onClick={() => setView("home")} aria-label="Close the play menu"><X size={16} /></button>
      <div className={`rb-modes-art ${column ? `is-${column.id}` : ""}`} style={column?.background ? { backgroundImage: `url("${art(column.background)}")` } : undefined} aria-hidden="true" />
      <button onClick={() => onPage("calendar")}><ChevronsLeft size={16} />Battle Cup</button>
      <button onClick={() => onPage("scrims")}><ChevronsLeft size={16} />View lobbies</button>
      <button onClick={() => onPage("next-series")}><ChevronsLeft size={16} />Create lobby</button>
      {column && <div className="rb-mode-event"><strong>{column.name}</strong><p><span aria-hidden="true" className="rb-radio" />Join forces and take on your next series during this special event.</p><em>SPECIAL EVENT</em></div>}
      {modes.map(([label, open]) => <button key={label} className="rb-mode" onClick={open}>{label}</button>)}
      <div className="rb-modes-foot"><span>REGION: {campaign.settings.region}</span><span>PATCH {d.patch.id}</span></div>
      <p className="rb-modes-note">{d.competition?.opponent ? `${d.competition.name}: ${campaign.settings.team} vs ${d.competition.opponent}` : "No series scheduled. Find match opens the season calendar."}</p>
    </section>
  </div>;
}

function BattlePassOverlay({ ti, onClose, onPage }: { ti: TiMenu; onClose: () => void; onPage: (page: Page) => void }) {
  const prizes = ti.event.prizes.filter(prize => prize.usd > 0).slice(0, 8);
  const place = (from: number, to: number) => from === to ? `${from}` : `${from}–${to}`;
  const header = ti.year <= 2019 ? art(`ti${ti.year}.jpg`) : undefined;
  return <div className="rb-overlay" role="dialog" aria-label={`The International ${ti.year} Battle Pass`}>
    <div className="rb-bpass">
      <button className="rb-close" onClick={onClose} aria-label="Close the Battle Pass"><X size={20} /></button>
      {/* Valve's TI6–TI9 art already carries the Battle Pass title. */}
      <header style={header ? { backgroundImage: `url("${header}")` } : undefined} role="img" aria-label={`The International ${ti.year} Battle Pass`}>{!header && <img src={art("ti-battlepass-logo.png")} alt="" />}</header>
      <div className="rb-bundles">
        <section><h3><span className="rb-bundle-badge"><b>{ti.teams.length || "—"}</b><small>TEAMS</small></span>The event</h3>
          <h4>Includes the following:</h4>
          <div className="rb-bundle-features"><span><b>{ti.event.location}</b>Venue</span><span><b>{formatDate(ti.event.start)}</b>First day</span><span><b>{formatDate(ti.event.end)}</b>Grand final</span><span><b>{ti.managedEntered ? "Qualified" : "Not entered"}</b>Your club</span></div>
          <h4>And the following teams:</h4>
          <ol>{ti.teams.map(team => <li key={team.id} className={team.managed ? "is-managed" : ""}>{team.name}</li>)}</ol>
          {ti.teams.length === 0 && <p>The field is not set yet.</p>}
        </section>
        <section className="is-mega"><h3><span className="rb-bundle-badge"><b>1</b><small>PLACE</small></span>Prize pool</h3>
          <h4>{money(ti.event.pool)} in total<br />shared by the following places:</h4>
          <ul>{prizes.map(prize => <li key={prize.from}>{place(prize.from, prize.to)} · {money(prize.usd)}</li>)}</ul>
        </section>
      </div>
      <div className="rb-bpass-actions"><button onClick={() => onPage("calendar")}>Season calendar</button><button onClick={() => onPage("standings")}>TI race & standings</button></div>
      <p className="rb-bpass-note">{money(ti.event.pool)} prize pool · The International {ti.year} · {ti.event.location}</p>
    </div>
  </div>;
}

function TeamGrid({ ti, year }: { ti: TiMenu; year: number }) {
  return <div className="rb-team-grid">{ti.teams.map(team => <span key={team.id} className={team.managed ? "is-managed" : ""} title={team.name}><TeamBadge teamId={team.id} name={team.name} year={year} size="medium" /><small>{team.name}</small></span>)}</div>;
}

function Compendium2021({ ti, d, onPage }: { ti: TiMenu; d: Data; onPage: (page: Page) => void }) {
  const started = d.day >= ti.event.start;
  const sections: [string, Page, boolean][] = [["Talent", "staff", true], ["Player cards", "roster", true], ["Fantasy", "heroes", started], ["Main event predictions", "standings", started], ["Bracket predictions", "calendar", started]];
  return <div className="rb-c21">
    <div className="rb-c21-left"><div className="rb-c21-plaque"><small>The International</small><strong>Compendium</strong></div>
      <nav aria-label="Compendium sections">{sections.map(([label, page, open]) => <button key={label} onClick={() => onPage(page)}>{label}<small>{open ? "NOW OPEN" : `AVAILABLE ${formatDate(ti.event.start).toUpperCase()}`}</small></button>)}</nav>
      <p><i>The International</i> draws near. Prepare your squad, follow every team in the field and earn your place in the biggest event of the year.</p></div>
    <img className="rb-c21-aegis" src={art("ti2021.jpg")} alt="" />
    <aside className="rb-c21-right"><img src={art("ti-logo.png")} alt="The International · Dota 2 Championships" />
      <small>PRIZE POOL</small><strong>{money(ti.event.pool)}</strong>
      <small>THE TOP {ti.teams.length || "—"} TEAMS IN THE WORLD</small><TeamGrid ti={ti} year={ti.year} />
      <small>THE EVENT</small><p>{formatDate(ti.event.start)} – {formatDate(ti.event.end)}</p>
      <small>VENUE</small><p>{ti.event.location}</p></aside>
  </div>;
}

function CompendiumSidebar({ ti, d, campaign, onPage }: { ti: TiMenu; d: Data; campaign: Campaign; onPage: (page: Page) => void }) {
  // The TI13 capture opens on the rewards page, the TI12 one on Supporters Clubs.
  const [section, setSection] = useState<"clubs" | "rewards">(ti.year === 2024 ? "rewards" : "clubs");
  const prizes = ti.event.prizes.filter(prize => prize.usd > 0);
  const place = (from: number, to: number) => from === to ? `${from}` : `${from}–${to}`;
  const links: [string, () => void, boolean?][][] = [
    [["Road to TI challenge", () => onPage("calendar")], ["Fantasy", () => onPage("heroes")], ["The Oracle’s challenge", () => onPage("standings")], ["Bingo", () => onPage("next-series")]],
    [["Talent", () => onPage("staff")], ["Supporters clubs", () => setSection("clubs"), section === "clubs"], ["Watch ↗", () => onPage("standings")]],
  ];
  return <div className="rb-csb">
    <aside className="rb-csb-side">
      <div className="rb-csb-logo"><img src={art("ti-logo.png")} alt="" /><strong>Compendium</strong><small>★ ★ ★ ★ ★</small></div>
      <nav aria-label="Compendium sections"><button className={section === "rewards" ? "is-active" : ""} onClick={() => setSection("rewards")}>Rewards</button>
        {links.map((group, index) => <div key={index}><small>{index === 0 ? "PARTICIPATE" : "THE EVENT"}</small>{group.map(([label, open, active]) => <button key={label} className={active ? "is-active" : ""} onClick={open}>{label}</button>)}</div>)}</nav>
      <div className="rb-csb-level"><b>{d.wins}</b><div><span><i style={{ width: `${Math.round(d.season * 100)}%` }} /></span><small>{Math.round(d.season * 1000)} / 1,000</small></div></div>
      <div className="rb-csb-friends"><small>FRIENDS<span>READINESS</span></small>{d.roster.map(player => <span key={player.id}>{player.name}<b>{Math.round(player.energy)}</b></span>)}</div>
    </aside>
    <div className="rb-csb-main">
      <div className="rb-csb-curtains" aria-hidden="true" />
      {section === "clubs" ? <><h2>Supporters clubs</h2><p className="rb-csb-lede">Follow every team at The International {ti.year}: {ti.event.location}, {formatDate(ti.event.start)} – {formatDate(ti.event.end)}.</p>
        <div className="rb-csb-clubs"><div><h3>Support your favorite teams</h3><p>{money(ti.event.pool)} prize pool. {ti.managedEntered ? `${campaign.settings.team} is in the field.` : `${campaign.settings.team} is not in the field this year.`}</p></div>
          <div className="rb-csb-grid">{ti.teams.map(team => <span key={team.id} className={team.managed ? "is-managed" : ""}><em>{team.managed ? "YOU" : "NEW"}</em><TeamBadge teamId={team.id} name={team.name} year={ti.year} size="large" /><small>{team.name}</small></span>)}{ti.teams.length === 0 && <p>The field is not set yet.</p>}</div></div></>
        : <><h2>Compendium rewards</h2><p className="rb-csb-lede">The prize pool for The International {ti.year}.</p><ol className="rb-csb-prizes">{prizes.map(prize => <li key={prize.from}><span>{place(prize.from, prize.to)}</span><b>{money(prize.usd)}</b></li>)}</ol><strong className="rb-csb-total">{money(ti.event.pool)}</strong></>}
    </div>
  </div>;
}
