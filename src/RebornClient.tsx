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
import { HeroToken } from "./MatchExperience";
import { rebornGamesLabel } from "./source1-navigation";
import "./reborn-2015.css";
import { selectMenuPromotion } from "./menu-promotions";
import type { MenuPromotion } from "./menu-promotions";
import TournamentBattlePass from "./TournamentBattlePass";
import { tournamentPasses, tournamentPassForMenu } from "./tournament-pass";
import type { TournamentPass } from "./tournament-pass";

type Props = {
  campaign: Campaign; event?: MenuEvent; ti?: TiMenu; archived?: boolean;
  onPage: (page: Page) => void; onPlayer: (player: Player) => void; onCompetition: () => void;
  onTournament?: (id: string) => void;
};
type View = "home" | "play" | "ti";
const art = (name: string) => `${import.meta.env.BASE_URL}dota-menu/${name}`;
const DAY = 86400000;

/** Client changes with no dated source. Each is the earliest capture that shows
 * the change, so the real switch may be earlier (docs/dota-menu.md). */
const PLUS = "2019-12-18";
const FEATURED_HOME = "2020-10-29";
const SHARDS = "2020-10-29";
/** Dated: the Summer Client Update made the Armory "your one-stop shop for every cosmetic item" (Aug 30, 2023). */
const ARMORY = "2023-08-30";
/** The TI card borrows each Battle Pass's Valve art only once that pass is out (Steam announcements). */
const tiPassReleased: Record<number, string> = { 2016: "2016-05-16", 2017: "2017-05-04", 2018: "2018-05-08", 2019: "2019-05-07" };

/** The latest major update's Valve art, by composite (dota2.com past updates).
 * Entries with a release date follow the campaign clock when it has one. */
const updateArt: MenuPromotion[] = [
  ["2016.1", "update-reborn.jpg", "Reborn"],
  ["2016.1", "update-fall2015.png", "The Fall Season 2015 Compendium", "2015-10-02", "2015-11-23"],
  ["2016.1", "update-balanceofpower.jpg", "Balance of Power", "2015-12-16"],
  // 2016–2017 dates are Valve's Steam announcements in Pacific time (7.00 posted December 12 at 4:37 pm).
  ["2016.2", "update-winterbp.jpg", "The Winter Battle Pass", "2016-01-27"], ["2016.2", "ti2016.jpg", "The International 2016 Battle Pass", "2016-05-16"],
  ["2017.1", "update-darkrift.jpg", "The Dark Rift Update", "2016-08-23"], ["2017.1", "update-fall2016.jpg", "The Fall 2016 Battle Pass", "2016-10-05"],
  ["2017.1", "update-700.jpg", "The New Journey", "2016-12-12"], ["2017.2", "ti2017.jpg", "The International 2017 Battle Pass", "2017-05-04"],
  ["2018.1", "update-duelingfates.jpg", "Dueling Fates", "2017-11-01"],
  // Dated entries filed under a later composite stay out of the earlier composite's weekly art, which keeps its headline update.
  ["2018.2", "update-plus.jpg", "Introducing Dota Plus", "2018-03-12"], ["2018.2", "update-ti8bp.jpg", "The International 2018 Battle Pass", "2018-05-08"],
  ["2019.1", "update-grimstroke.jpg", "Grimstroke", "2018-08-25"], ["2019.1", "update-720.jpg", "Gameplay Update 7.20", "2018-11-19"],
  ["2019.2", "update-frosthaven.jpg", "The Frosthaven Update", "2018-12-19"], ["2019.2", "update-mars.jpg", "Mars", "2019-03-06"],
  ["2019.2", "update-ti9bp.jpg", "The International 2019 Battle Pass", "2019-05-07"], ["2020.1", "update-outlanders.jpg", "The Outlanders", "2019-11-26"],
  ["2020.2", "update-ti10bp.jpg", "The International 10 Battle Pass", "2020-05-25"], ["2020.2", "update-labyrinth2020.jpg", "Aghanim’s Labyrinth", "2020-07-14"],
  ["2021.1", "update-diretide2020.jpg", "Diretide", "2020-10-29"], ["2021.1", "update-mistwoods.jpg", "The Mistwoods Update", "2020-12-17"],
  ["2021.1", "update-dawnbreaker.jpg", "The Dawnbreaker Update", "2021-04-09"], ["2021.2", "update-nemestice.jpg", "Nemestice", "2021-06-24"],
  ["2022.1", "update-marci.jpg", "Introducing Marci", "2021-10-28"], ["2022.1", "update-continuum.jpg", "Aghanim’s Labyrinth: The Continuum Conundrum", "2021-12-15"],
  ["2022.1", "update-primalbeast.jpg", "Primal Beast", "2022-02-23"], ["2022.2", "update-battlepass2022.jpg", "The 2022 Battle Pass", "2022-09-01"],
  ["2023.1", "update-deadreckoning.jpg", "The Dead Reckoning Update", "2023-03-06"], ["2023.1", "update-newfrontiers.jpg", "New Frontiers", "2023-04-20"],
  ["2023.2", "update-summer2023.jpg", "The Summer Client Update", "2023-08-30"], ["2024.1", "update-ti2023.jpg", "The International 2023 Celebration Update", "2023-09-27"],
  ["2024.1", "update-frostivus2023.jpg", "Frostivus 2023", "2023-12-14"], ["2024.2", "update-facets.jpg", "Facets & Innates", "2024-05-22"],
  ["2024.2", "update-ringmaster.jpg", "Introducing The Ringmaster", "2024-08-23"], ["2025.1", "update-kez.jpg", "Introducing Kez", "2024-11-07"],
  ["2025.1", "update-wanderingwaters.jpg", "Wandering Waters", "2025-02-19"], ["2025.2", "update-springforward.jpg", "Spring Forward", "2025-05-22"],
  ["2026.1", "update-largo.jpg", "Introducing Largo", "2025-12-15"],
];
/** Crownfall's acts opened one at a time (Valve announcements); Frostivus 2024 ran inside Act IV. */
const CROWNFALL_ACTS = ["2024-04-18", "2024-05-23", "2024-07-09", "2024-11-07"];
const CROWNFALL_FINAL_BOW = "2025-01-15";
const FROSTIVUS_2024 = { from: "2024-12-19", to: "2025-01-15" };

function useData(campaign: Campaign) {
  const { patch } = campaignMenu(campaign);
  const day = (campaign.calendar?.now ?? patch.startsOn).slice(0, 10);
  const roster = teamPlayers(campaign);
  const results = campaign.results.filter(result => !result.skipped);
  const tis = historicalTournaments.filter(e => e.kind === "ti").sort((a, b) => a.end.localeCompare(b.end));
  const nextTi = tis.find(e => e.end >= day), previousTi = [...tis].reverse().find(e => e.end < day);
  const update = selectMenuPromotion(updateArt, patch, campaign.calendar ? day : undefined);
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
  const menuPass = tournamentPassForMenu(d.day, d.update.file, ti, event, archived);
  const promotionPass = tournamentPasses.find(pass => pass.art === d.update.file);
  const [pass, setPass] = useState<TournamentPass | undefined>(ti?.style === "battlepass" ? menuPass : undefined);
  const [motion, setMotion] = useState(() => !window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  useEffect(() => { setView(start); setPass(ti?.style === "battlepass" ? menuPass : undefined); }, [event?.id, ti?.year, menuPass?.id]);
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
    { label: "Watch", pages: ["standings", "calendar", "history"], badge: d.live ? "Live tournament" : undefined }, { label: "Learn", pages: ["training", "scrims", "next-series"] }, { label: rebornGamesLabel(d.day), pages: ["arcade", "world"] }];
  const net = weeklyIncome(campaign) - weeklyWages(campaign);
  const shared = { ...props, d, modern, setView, menuPass, promotionPass, openPass: () => setPass(menuPass), openPromotion: () => setPass(promotionPass) };
  const home = event?.pattern === "battlepass" ? <PassPage {...shared} event={event} />
    : event?.pattern === "home" ? event.id === "frostivus2019" ? <FrostivusHome {...shared} /> : <FeaturedHome {...shared} />
    : modern ? <FeaturedHome {...shared} /> : <GridHome {...shared} />;
  const main = view === "ti" && ti ? ti.style === "compendium-2021" ? <Compendium2021 ti={ti} d={d} onPage={onPage} /> : <CompendiumSidebar ti={ti} d={d} campaign={campaign} onPage={onPage} />
    : <>{home}{view === "play" && <PlayPanel {...shared} />}</>;
  const title = ti ? `The International ${ti.year}` : event?.name ?? "Dota 2 Reborn";

  return <section className={`rb-client rb-view-${view} ${d.day.startsWith("2015-") ? "rb-2015" : ""} ${event ? `rb-event-${event.id}` : ""} ${ti ? `rb-ti-${ti.year}` : ""} ${modern ? "is-modern" : ""} ${motion ? "has-motion" : ""}`} aria-label={`Manager’s Desk · ${title}`}>
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
        {(ti || menuPass) && <button className="rb-icon rb-ti-icon" onClick={() => compendium ? setView("ti") : setPass(menuPass)} aria-label={ti?.year === 2025 ? "Open The International" : compendium ? "Open the Compendium" : "Open the Battle Pass"}><img src={art("dota-symbol.png")} alt="" /></button>}
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
    {pass && <TournamentBattlePass key={pass.id} pass={pass} campaign={campaign} onClose={() => setPass(undefined)} onPage={onPage} onTournament={props.onTournament} />}
    <span className="rb-credit">{archived ? "From the event archive · " : ""}Layout after the {ti?.year ?? event?.historicalRelease.slice(0, 4) ?? d.day.slice(0, 4)} client{ti?.inferred ? " (inferred)" : ""} · Artwork © Valve</span>
  </section>;
}

type Shared = Props & { d: Data; modern: boolean; setView: (view: View) => void; menuPass?: TournamentPass; promotionPass?: TournamentPass; openPass: () => void; openPromotion: () => void };

function Friends({ d, onPlayer, onPage, title = "Friends" }: { d: Data; onPlayer: (player: Player) => void; onPage: (page: Page) => void; title?: string }) {
  const groups: [string, Player[]][] = [["Ready to play", d.roster.filter(player => player.energy >= 60)], ["Resting", d.roster.filter(player => player.energy < 60)]];
  return <section className="rb-card rb-friends"><h3>{title}<button onClick={() => onPage("roster")} aria-label="Manage squad"><Users size={14} /></button></h3>
    {groups.filter(([, players]) => players.length).map(([label, players]) => <div key={label}><h4>▾ {label} <span>({players.length})</span></h4><div>{players.map(player =>
      <button key={player.id} onClick={() => onPlayer(player)} aria-label={`Open ${player.name} profile`}><Avatar player={player} small /><span>{player.name}</span></button>)}</div></div>)}
  </section>;
}

function GridHome({ campaign, ti, event, d, onPage, onPlayer, onCompetition, openPass, openPromotion, menuPass, promotionPass, setView }: Shared) {
  const pass = !!menuPass;
  const ladder = [...d.roster].sort((a, b) => b.energy - a.energy);
  return <div className="rb-grid">
    <div className="rb-col rb-col-left">
      <section className="rb-card rb-profile"><h3>My profile<button onClick={() => onPage("roster")} aria-label="Open squad"><ArrowUpRight size={14} /></button></h3>
        <div className="rb-profile-row"><TeamBadge teamId={campaign.world?.managedTeamId} name={campaign.settings.team} year={campaign.year} size="medium" /><span><strong>{campaign.settings.team}</strong><small>Main Menu</small></span><b className="rb-badge-level">{d.wins}</b></div>
        <div className="rb-profile-stats"><span><small>SEASON</small>{campaign.year}</span><span><small>READINESS</small>{d.energy}%</span><span><small>DIFFICULTY</small>{campaign.settings.difficulty}</span></div>
      </section>
      <section className="rb-card rb-pass"><h3>{pass ? "Battle Pass" : "Season"}<ArrowUpRight size={14} aria-hidden="true" /></h3>
        <div className="rb-pass-level"><div><span style={{ width: `${Math.round(d.season * 100)}%` }} /></div><small>{d.tiDays === null ? "NO INTERNATIONAL SCHEDULED" : `${d.tiDays} DAYS TO ${d.nextTi?.name.toUpperCase()}`}</small><span>LEVEL <b>{d.wins}</b></span></div>
        <button className="rb-green" onClick={pass ? openPass : onCompetition}>{pass ? "Open tournament Battle Pass" : "Season calendar"}</button>
      </section>
      <Friends d={d} onPlayer={onPlayer} onPage={onPage} />
    </div>
    <div className="rb-col rb-col-mid">
      <div className="rb-tiles">
        <button className="rb-tile rb-news" onClick={promotionPass ? openPromotion : () => onPage("patch")} style={{ backgroundImage: `url("${art(d.update.file)}")` }}><span className="rb-tag">{promotionPass ? "Open tournament Battle Pass" : "New in Dota 2"}</span><strong>{promotionPass || d.day.startsWith("2015-") ? d.update.title : d.patch.name}<small>Patch {d.patch.id} · {d.patch.versions}</small></strong></button>
        <section className="rb-tile rb-last"><span className="rb-tag">Your last match</span>{d.last ? <div><strong>{d.last.event}</strong><dl><dt>OPPONENT</dt><dd>{d.last.opponent || "—"}</dd><dt>SCORE</dt><dd>{d.last.score || "—"}</dd><dt>PRIZE</dt><dd>{money(d.last.prize)}</dd><dt>RESULT</dt><dd className={d.last.won ? "is-win" : "is-loss"}>{d.last.won ? "WON" : "NOT WON"}</dd></dl></div> : <p>No matches played yet.</p>}<button onClick={() => onPage("history")}>All recent games »</button></section>
        <section className="rb-tile rb-ladder"><span className="rb-tag">Friends</span><span className="rb-tag is-right">Readiness</span><ol>{ladder.map(player => <li key={player.id}><button onClick={() => onPlayer(player)}><Avatar player={player} small /><span>{player.name}</span><b>{Math.round(player.energy)}</b></button></li>)}</ol></section>
        <button className="rb-tile rb-treasure" onClick={onCompetition} style={{ backgroundImage: `url("${art(ti && ti.year <= 2019 ? `ti${ti.year}.jpg` : "reborn-header.png")}")` }}><span className="rb-tag">{d.competition?.opponent ? "Next series" : "Season calendar"}</span><strong>{d.competition?.name ?? "Choose your next tournament"}<small>{d.competition?.opponent ? `vs ${d.competition.opponent}` : "Invitations & qualification"}</small></strong></button>
      </div>
      <ChatPanel campaign={campaign} d={d} onPage={onPage} />
    </div>
    <div className="rb-col rb-col-right">
      {event?.id === "siltbreaker" ? <button className="rb-feature rb-feature-silt" onClick={() => setView("play")} style={{ backgroundImage: `url("${art("siltbreaker.jpg")}")` }}><span className="rb-tag">Multiplayer campaign</span><strong>Siltbreaker</strong><small>Act I: The Sands of Fate</small><em>Play it now</em></button>
        : event ? <button className={`rb-feature rb-feature-${event.id}`} onClick={() => onPage("calendar")} style={event.background ? { backgroundImage: `url("${art(event.background)}")` } : undefined}><span className="rb-tag">Special event</span><strong>{event.name}</strong><small>Ends {formatDate(event.window.to)}</small><em>Play it now</em></button>
        : <button className="rb-feature rb-feature-ti" onClick={() => onPage("standings")} style={d.day.startsWith("2015-") ? { backgroundImage: `url("${art("reborn-header.png")}")` } : d.nextTi && tiPassReleased[d.nextTi.year] <= d.day ? { backgroundImage: `url("${art(`ti${d.nextTi.year}.jpg`)}")` } : undefined}><span className="rb-tag">The International</span><strong>{d.tiDays ?? "—"}</strong><small>{d.tiDays === null ? "No International scheduled" : `days until ${d.nextTi?.name}`}</small><em>TI race & standings</em></button>}
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

function Promos({ d, ti, event, onPage, onCompetition, menuPass, promotionPass, openPass, openPromotion }: Shared) {
  return <aside className="rb-promos" aria-label="Featured">
    {/* The stage shows either the event or the update art; this promo carries the other one (or Frostivus 2024 inside Crownfall). */}
    {event?.id === "crownfall" && d.day >= FROSTIVUS_2024.from && d.day <= FROSTIVUS_2024.to
      ? <button className="rb-promo" onClick={onCompetition} style={{ backgroundImage: `url("${art("frostivus2024.jpg")}")` }}><span className="rb-tag">Frostivus · until {formatDate(FROSTIVUS_2024.to)}</span><strong>{d.competition?.name ?? "Choose your next tournament"}</strong></button>
      : <button className={`rb-promo ${event || d.last ? "is-update" : ""}`} onClick={promotionPass ? openPromotion : onCompetition} style={event || d.last || promotionPass ? { backgroundImage: `url("${art(d.update.file)}")` } : undefined}><span className="rb-tag">{promotionPass ? "Open tournament Battle Pass" : d.competition?.opponent ? "Next series" : "Season calendar"}</span><strong>{promotionPass ? promotionPass.title : d.competition?.name ?? "Choose your next tournament"}</strong></button>}
    {menuPass && <button className="rb-outline" onClick={openPass}>Open tournament Battle Pass</button>}
    <button className="rb-outline" onClick={() => onPage("next-series")}>Scout your opponent</button>
    <button className="rb-promo" onClick={() => onPage("standings")} style={ti?.year === 2023 ? { backgroundImage: `url("${art("ti2023.jpg")}")` } : ti?.year === 2021 ? { backgroundImage: `url("${art("ti2021.jpg")}")` } : undefined}><span className="rb-tag">The International</span><strong>{d.tiDays === null ? "No International scheduled" : d.tiDays === 0 ? `${d.nextTi?.name} is live` : `${d.tiDays} days until ${d.nextTi?.name}`}</strong></button>
  </aside>;
}

function FeaturedHome(props: Shared) {
  const { campaign, event, d, onPage, onPlayer, onCompetition } = props;
  const crownfall = event?.id === "crownfall", curios = event?.id === "curios2025";
  const background = event?.background ?? (curios ? undefined : d.update.file);
  // Valve's update art has its title painted in, so it is shown whole over a blurred copy.
  const stageArt = background ? { backgroundImage: `url("${art(background)}")`, ["--rb-art" as string]: `url("${art(background)}")` } : undefined;
  return <div className="rb-featured">
    <aside className="rb-left">
      <section className="rb-card rb-profile is-flat"><div className="rb-profile-row"><TeamBadge teamId={campaign.world?.managedTeamId} name={campaign.settings.team} year={campaign.year} size="medium" /><span><strong>{campaign.settings.team}</strong><small>Main Menu</small></span></div>
        {event && <div className="rb-points-row"><span>{event.name} wins <Info size={11} /></span><b>{d.wins}</b></div>}
        <div className="rb-challenge"><small>WEEKLY CHALLENGE</small><strong>{d.competition?.opponent ? `Beat ${d.competition.opponent}` : "Choose your next event"}</strong><span>{[0, 1, 2].map(index => <i key={index} className={index < Math.min(3, d.wins) ? "is-done" : ""} />)}</span><small>READINESS {d.energy}%</small></div>
      </section>
      <Friends d={d} onPlayer={onPlayer} onPage={onPage} />
    </aside>
    <div className={`rb-stage ${event ? `is-${event.id}` : d.last ? "is-update is-lastmatch" : "is-update"}`} style={stageArt}>
      <div className="rb-stage-fx" aria-hidden="true" />
      {crownfall && <img className="rb-crown-heroes" src={art("crownfall-heroes.png")} alt="" />}
      {curios ? <CuriosPanel {...props} />
        : event ? <div className="rb-stage-copy">{event.logo ? <img src={art(event.logo)} alt={event.name} /> : <h2>{event.name}</h2>}<p>{event.subtitle}</p>
          {crownfall && <div className="rb-acts" style={{ backgroundImage: `url("${art("crownfall-acts.png")}")` }}>{([["I", "Your squad", "roster"], ["II", "Preparation", "next-series"], ["III", "Practice", "training"], ["IV", "The road to TI", "calendar"]] as [string, string, Page][]).map(([numeral, label, page], index) => {
            const opens = CROWNFALL_ACTS[index], latest = CROWNFALL_ACTS.filter(date => date <= d.day).length - 1;
            const state = opens > d.day ? "is-soon" : index === latest ? "is-now" : "";
            return <button key={numeral} className={state} onClick={() => onPage(page)}><small>ACT {numeral}{state === "is-soon" ? ` · ${formatDate(opens)}` : state === "is-now" ? " · NOW" : ""}</small>{label}</button>;
          })}</div>}
          {event.id === "frostivus2023" && <div className="rb-spirit"><small>FROSTIVUS SPIRIT METER</small><span><i style={{ width: `${Math.round(100 * (d.wins % 3) / 3)}%` }} /></span><small>{d.wins % 3} / 3 WINS · DEC 14 – JAN 11</small></div>}
          {event.id === "newbloom2019" && <div className="rb-spirit is-newbloom"><small>NEW BLOOM REWARDS LINE</small><small>{d.wins} {d.wins === 1 ? "WIN" : "WINS"} · EVERY VICTORY MOVES YOU ALONG · ENDS {formatDate(event.window.to).toUpperCase()}</small></div>}
          {event.id === "anniversary10" && <div className="rb-treasures"><span>{Array.from({ length: 13 }, (_, index) => <i key={index} className={index < d.wins ? "is-done" : ""}>{String(11 + index)}</i>)}</span><small>{Math.min(13, d.wins)} / 13 TREASURES · ENDS {formatDate(event.window.to).toUpperCase()}</small></div>}
          {crownfall && d.day >= CROWNFALL_FINAL_BOW && <small className="rb-final-bow">Crownfall’s final bow · ends {formatDate(event!.window.to)}</small>}
          <button className="rb-show" onClick={() => onPage("calendar")}>{event.id === "darkcarnival" ? "View event" : "Show event details"}</button></div>
        : d.last ? <LastMatch {...props} />
        : <div className="rb-stage-copy is-update"><small>NEW IN DOTA 2</small><h2 className="sr-only">{d.update.title}</h2><p>Patch {d.patch.id} · {d.patch.name}</p><button className="rb-show" onClick={props.promotionPass ? props.openPromotion : () => onPage("patch")}>{props.promotionPass ? "Open tournament Battle Pass" : "Read patch notes"}</button></div>}
    </div>
    <Promos {...props} onCompetition={onCompetition} />
  </div>;
}

/** Outside events the dashboard "mostly just shown the results of your last match"
 * (Valve, Quartero's Curios post, Aug 5 2025). Your club is side 0 of the series. */
function LastMatch({ d, onPage }: Shared) {
  const last = d.last!, game = last.series?.games.at(-1);
  const ours = game?.players.filter(score => score.team === 0) ?? [];
  const clock = (seconds: number) => `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, "0")}`;
  return <section className={`rb-lastmatch ${last.won ? "is-win" : "is-loss"}`} aria-label="Your last match">
    <header><small>LAST MATCH · {last.event}</small><strong>{last.won ? "Victory" : "Defeat"}</strong><span>vs {last.opponent || "—"} · {last.score || "—"}</span></header>
    {ours.length > 0 && <ol>{ours.map(score => <li key={score.id}><HeroToken score={score} /><span><b>{score.player}</b><small>{score.hero}</small></span><em>{score.kills}/{score.deaths}/{score.assists}</em></li>)}</ol>}
    <footer>{game && <span>DURATION <b>{clock(game.duration)}</b></span>}{game && <span>KILLS <b>{game.kills[0]}–{game.kills[1]}</b></span>}<span>PRIZE <b>{money(last.prize)}</b></span>
      <button onClick={() => onPage("history")}>All recent games »</button><button onClick={() => onPage("patch")}>New in Dota 2: {d.update.title} »</button></footer>
  </section>;
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

function PassPage({ campaign, event, d, onPage, openPass }: Shared & { event: MenuEvent }) {
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
  // The Nemestice capture sets the quests over a night sky and a tall hero panel; both crops come from Valve's key art.
  return <div className="rb-bp" style={{ ["--rb-sky" as string]: `url("${art("nemestice-keyart.jpg")}")` }}>
    <img className="rb-bp-art" src={art(event.background!)} alt="" />
    <div className="rb-bp-head">{event.logo ? <img src={art(event.logo)} alt={event.name} /> : <h2>{event.name}</h2>}<small>+ BATTLE PASS</small><button className="rb-open-tournament-pass" onClick={openPass}>Open tournament Battle Pass</button></div>
    <nav className="rb-bp-crumbs" aria-label="Battle Pass"><span>Home</span>/<span>Weekly quests</span>/<span>{campaign.settings.team}</span></nav>
    <div className="rb-bp-main">
      <div className="rb-bp-weeks">{Array.from({ length: 8 }, (_, index) => <span key={index} className={index + 1 === week ? "is-active" : index + 1 > week ? "is-locked" : ""}>Week {index + 1}{index + 1 === week && <small>ACTIVE</small>}</span>)}</div>
      <p className="rb-bp-note"><Info size={11} /> Quest progress only counts for the active week.</p>
      <div className="rb-bp-progress"><strong>WEEK {week} PROGRESS:</strong><span>{Array.from({ length: 18 }, (_, index) => <i key={index} className={index < stars ? "is-done" : ""} />)}</span><b>{stars}/18</b></div>
      <div className="rb-bp-quests">{quests.map(([title, text, value, goal, page]) => <button key={title} onClick={() => onPage(page)}><h4>{title}<span>{[0, 1, 2].map(index => <Star key={index} size={16} className={index < Math.floor(3 * value / goal) ? "is-done" : ""} />)}</span></h4><p>{text}</p><div><i style={{ width: `${Math.round(100 * value / goal)}%` }} /><b>{value}/{goal}</b></div></button>)}</div>
    </div>
  </div>;
}

function PlayPanel({ campaign, event, d, onPage, onCompetition, setView }: Shared) {
  const column = event?.pattern === "column" ? event : undefined;
  const modes: [string, () => void][] = [["Ranked match", onCompetition], ["Normal match", () => onPage("scrims")], ["Practice with bots", () => onPage("training")], ...(botChallengeOpen(campaign) ? [["Challenge OpenAI Five", () => onPage("arcade")] as [string, () => void]] : []), ...(allStarEvent(campaign) ? [["All-Star match", () => onPage("arcade")] as [string, () => void]] : [])];
  return <div className="rb-play-panel">
    {column && <section className={`rb-event-column is-${column.id}`}><h2>{column.logo ? <img src={art(column.logo)} alt={column.name} /> : column.name}</h2><small>EVENT ENDS {formatDate(column.window.to).toUpperCase()}</small>
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

/** TI 2024 rewards page (capture): Aegis centre stage, rewards on lit pedestals with gold
 * buttons, Buy levels / Apply boost below. Valve's reward art; pedestals carry the prize places. */
function TheatreRewards({ ti, d, onPage }: { ti: TiMenu; d: Data; onPage: (page: Page) => void }) {
  const prizes = ti.event.prizes.filter(prize => prize.usd > 0);
  const place = (prize: { from: number; to: number }) => prize.from === prize.to ? `${prize.from}` : `${prize.from}–${prize.to}`;
  const rewards = ["hud", "versus", "loading", "chatwheel", "teleport", "effigy"];
  const pedestal = (file: string, index: number) => { const prize = prizes[index];
    return <div key={file} className="rb-c24-reward"><img src={art(`ti2024-reward-${file}.png`)} alt="" />{prize && <small>{place(prize)} · {money(prize.usd)}</small>}<button onClick={() => onPage("standings")}>View</button></div>; };
  return <>
    <h2>Compendium rewards</h2><p className="rb-csb-lede">Your guide to the contests and rewards of this year’s tournament: {ti.event.location}, {formatDate(ti.event.start)} – {formatDate(ti.event.end)}.</p>
    <div className="rb-c24-stage">
      <div className="rb-c24-col">{rewards.slice(0, 3).map((file, index) => pedestal(file, index))}</div>
      <div className="rb-c24-aegis"><img src={art("ti2024-aegis.png")} alt="The Aegis of Champions" /><b>{money(ti.event.pool)}</b><small>PRIZE POOL · {Math.round(d.season * 300)}/300</small></div>
      <div className="rb-c24-col">{rewards.slice(3).map((file, index) => pedestal(file, index + 3))}</div>
    </div>
    <div className="rb-c24-actions"><button onClick={() => onPage("finances")}>Buy levels</button><button onClick={() => onPage("training")}>Apply boost <b>{d.roster.length}</b></button></div>
  </>;
}

function CompendiumSidebar({ ti, d, campaign, onPage }: { ti: TiMenu; d: Data; campaign: Campaign; onPage: (page: Page) => void }) {
  // The TI13 capture opens on the rewards page, the TI12 one on Supporters Clubs.
  const [section, setSection] = useState<"clubs" | "rewards">(ti.year === 2024 ? "rewards" : "clubs");
  const prizes = ti.event.prizes.filter(prize => prize.usd > 0);
  const place = (from: number, to: number) => from === to ? `${from}` : `${from}–${to}`;
  // TI 2025 had no Compendium: Valve made Fantasy and Predictions free, sold team and talent
  // bundles from the main menu and gave Tyrian Regalia to top predictors (Aug 19, 2025 post).
  const free = ti.year === 2025;
  // TI 2024 (capture): Aegis medallion and Valve's Compendium logo; Fantasy / Oracle / Bingo, then Studio / Clubs / Watch.
  const theatre = ti.year === 2024;
  // TI 2023 (capture): Valve's stained-glass crest, a Pubstomps link, a crest level badge with Points log, and Gift a Compendium.
  const glass = ti.year === 2023;
  const links: [string, () => void, boolean?][][] = theatre ? [
    [["Fantasy", () => onPage("heroes")], ["The Oracle’s challenge", () => onPage("standings")], ["Bingo", () => onPage("next-series")]],
    [["Studio", () => onPage("staff")], ["Supporters clubs", () => setSection("clubs"), section === "clubs"], ["Watch ↗", () => onPage("standings")]],
  ] : free ? [
    [["Fantasy", () => onPage("heroes")], ["Predictions", () => onPage("standings")], ["Tyrian Regalia", () => setSection("rewards"), section === "rewards"]],
    [["Team & talent bundles", () => setSection("clubs"), section === "clubs"], ["Talent", () => onPage("staff")], ["Watch ↗", () => onPage("standings")]],
  ] : [
    [["Road to TI challenge", () => onPage("calendar")], ["Fantasy", () => onPage("heroes")], ["The Oracle’s challenge", () => onPage("standings")], ["Bingo", () => onPage("next-series")]],
    [["Talent", () => onPage("staff")], ["Supporters clubs", () => setSection("clubs"), section === "clubs"], ["Watch ↗", () => onPage("standings")], ...(glass ? [["Pubstomps ↗", () => onPage("world")] as [string, () => void]] : [])],
  ];
  return <div className={`rb-csb ${free ? "is-free" : ""}`}>
    <aside className="rb-csb-side">
      {theatre ? <div className="rb-csb-logo is-2024"><img className="rb-csb-medallion" src={art("ti2024-aegis.png")} alt="" /><img src={art("ti2024-compendium-logo.png")} alt="The International Compendium" /></div>
        : <div className={`rb-csb-logo ${glass ? "is-2023" : ""}`}><img src={art(glass ? "ti2023-logo.png" : "ti-logo.png")} alt={glass ? "The International" : ""} /><strong>{free ? "Fantasy & Predictions" : "Compendium"}</strong><small>{free ? "FREE FOR EVERY PLAYER" : "★ ★ ★ ★ ★"}</small></div>}
      <nav aria-label={free ? "The International sections" : "Compendium sections"}>{!free && <button className={section === "rewards" ? "is-active" : ""} onClick={() => setSection("rewards")}>Rewards</button>}
        {links.map((group, index) => <div key={index}><small>{index === 0 ? free ? "PLAY FREE" : "PARTICIPATE" : theatre ? "FOLLOW" : "THE EVENT"}</small>{group.map(([label, open, active]) => <button key={label} className={active ? "is-active" : ""} onClick={open}>{label}</button>)}</div>)}</nav>
      {free ? <div className="rb-csb-level"><b>{d.wins}</b><div><small>LEADERBOARD · EVENT WINS</small><small>{Math.round(d.season * 100)}% OF THE SEASON PLAYED</small></div></div>
        : <div className={`rb-csb-level ${theatre ? "is-shield" : glass ? "is-crest" : ""}`}><b style={glass ? { backgroundImage: `url("${art("ti2023-crest.png")}")` } : undefined}>{d.wins}</b><div><span><i style={{ width: `${Math.round(d.season * 100)}%` }} /></span><small>{Math.round(d.season * 1000)} / 1,000</small>{theatre && <button onClick={() => onPage("inbox")}>Journal</button>}{glass && <button onClick={() => onPage("history")}>Points log</button>}</div></div>}
      {glass && <button className="rb-csb-gift" onClick={() => onPage("finances")}>Gift a Compendium</button>}
      <div className="rb-csb-friends"><small>FRIENDS<span>READINESS</span></small>{d.roster.map(player => <span key={player.id}>{player.name}<b>{Math.round(player.energy)}</b></span>)}</div>
    </aside>
    <div className="rb-csb-main">
      <div className="rb-csb-curtains" aria-hidden="true" />
      {section === "clubs" ? <><h2>{free ? "Team & talent bundles" : "Supporters clubs"}</h2><p className="rb-csb-lede">{free ? `Half of every bundle goes to the team or talent, and 30% joins the prize pool. The International ${ti.year} · ` : `Follow every team at The International ${ti.year}: `}{ti.event.location}, {formatDate(ti.event.start)} – {formatDate(ti.event.end)}.</p>
        <div className="rb-csb-clubs"><div><h3>{free ? "Back your favorite teams" : "Support your favorite teams"}</h3><p>{money(ti.event.pool)} prize pool. {ti.managedEntered ? `${campaign.settings.team} is in the field.` : `${campaign.settings.team} is not in the field this year.`}</p></div>
          <div className="rb-csb-grid">{ti.teams.map(team => <span key={team.id} className={team.managed ? "is-managed" : ""}><em>{team.managed ? "YOU" : "NEW"}</em><TeamBadge teamId={team.id} name={team.name} year={ti.year} size="large" /><small>{team.name}</small></span>)}{ti.teams.length === 0 && <p>The field is not set yet.</p>}</div></div></>
        : theatre ? <TheatreRewards ti={ti} d={d} onPage={onPage} />
        : <><h2>{free ? "Tyrian Regalia" : "Compendium rewards"}</h2><p className="rb-csb-lede">{free ? "Immortal rewards for the top predictors and fantasy managers. Below, the prize pool" : "The prize pool"} for The International {ti.year}.</p><ol className="rb-csb-prizes">{prizes.map(prize => <li key={prize.from}><span>{place(prize.from, prize.to)}</span><b>{money(prize.usd)}</b></li>)}</ol><strong className="rb-csb-total">{money(ti.event.pool)}</strong></>}
    </div>
  </div>;
}
