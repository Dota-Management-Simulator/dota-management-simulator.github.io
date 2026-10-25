import { useRef, useState } from "react";
import { ChevronLeft, ChevronRight, List, X, Trophy, Users, CalendarDays, Medal, Swords } from "lucide-react";
import type { Campaign, Page } from "./game";
import { money } from "./game";
import { formatDate } from "./tournaments";
import { passTournamentData, passTournaments } from "./tournament-pass";
import type { TournamentPass } from "./tournament-pass";
import ClientModal from "./ClientModal";
import TeamBadge from "./TeamBadge";
import BattlePassRewards from "./BattlePassRewards";
import type { RewardView } from "./BattlePassRewards";
import { rewardsForPass } from "./battle-pass-rewards";
import "./tournament-pass.css";

const pages = ["The tournament", "The teams", "Venue & schedule", "The prize pool", "Results & placements"];
const pageIcons = [Trophy, Users, CalendarDays, Medal, Swords];
const place = (from: number, to: number) => from === to ? String(from) : `${from}–${to}`;
const art = (file: string) => `${import.meta.env.BASE_URL}dota-menu/${file}`;

// Later passes moved their navigation to the left; seasonal passes kept a
// horizontal breadcrumb strip. Cosmetic collections and the tournament guide
// remain separate sections of the same pass.
const visuals: Record<string, { layout?: string; background?: string; feature?: string; logo?: string }> = {
  "winter-2016": { feature: "winter2016-lich.webp" },
  "ti-2017": { background: "ti2017-pass-background.jpg", logo: "ti-battlepass-logo.png" },
  "ti-2018": { logo: "ti-battlepass-logo.png" },
  "ti-2019": { background: "ti2019-pass-background.jpg", logo: "ti-battlepass-logo.png" },
  "ti10-2020": { layout: "sidebar", logo: "ti-battlepass-logo.png" },
  nemestice: { layout: "seasonal", background: "nemestice-keyart.jpg", feature: "nemestice-portrait.jpg", logo: "nemestice-logo.png" },
  continuum: { layout: "seasonal" },
  "ti-2022": { layout: "sidebar", feature: "ti2022-void.webp", logo: "ti2022-battlepass-logo.png" },
};

/** An openable tournament book shared by every Reborn Battle Pass promotion. */
export default function TournamentBattlePass({ pass, campaign, onClose, onPage, onTournament }: {
  pass: TournamentPass; campaign: Campaign; onClose: () => void;
  onPage: (page: Page) => void; onTournament?: (id: string) => void;
}) {
  const events = passTournaments(pass, campaign);
  const [eventId, setEventId] = useState(events[0]?.id);
  const [spread, setSpread] = useState(-1);
  const [section, setSection] = useState<RewardView | "tournament">("highlights");
  const content = useRef<HTMLDivElement>(null);
  const event = events.find(event => event.id === eventId) ?? events[0];
  const data = event ? passTournamentData(event, campaign) : undefined;
  const run = data?.run;
  const name = (id: string) => data?.teams.find(team => team.id === id)?.name ?? id;
  const turn = (next: number) => { setSpread(next); content.current?.closest("dialog")?.scrollTo(0, 0); };
  const go = (page: Page) => { onClose(); onPage(page); };
  const calendar = () => { onClose(); if (event && onTournament) onTournament(event.id); else onPage("calendar"); };
  const day = campaign.calendar?.now.slice(0, 10);
  const registered = !!run?.teams.some(team => team.id === run.managed);
  const prizes = event?.prizes.filter(prize => prize.usd > 0) ?? [];
  const rounds = [...new Set(data?.fixtures.map(fixture => fixture.stage) ?? [])];
  const visual = visuals[pass.id] ?? {};
  const chapterDetails = [event?.location || "Tournament overview", `${data?.teams.length ?? 0} competing teams`, event ? formatDate(event.start) : "Tournament calendar", event ? money(event.pool) : "Placement prizes", `${data?.matches.length ?? 0} campaign series`];
  const openSection = (next: RewardView | "tournament") => { setSection(next); content.current?.closest("dialog")?.scrollTo(0, 0); };

  return <ClientModal label={`${pass.title} · Tournament Battle Pass`} className="tpass-modal" onClose={onClose}>
    <div className="tpass-book" data-pass={pass.id} data-layout={visual.layout ?? "classic"} style={{ ["--tp-art" as string]: visual.background ? `url("${art(visual.background)}")` : "none" }}>
      <header className="tpass-cover">
        <button className="tpass-back" onClick={onClose}><ChevronLeft size={17} /> Back to dashboard</button>
        <div className="tpass-brand">{visual.logo ? <img src={art(visual.logo)} alt={pass.title} /> : <><small>{pass.id === "fall-2015" ? "FALL SEASON 2015" : pass.title.replace(" Battle Pass", "")}</small><h2>{pass.id === "fall-2015" ? "COMPENDIUM" : "BATTLE PASS"}</h2></>}<span>REWARDS · COLLECTIONS · COMPENDIUM</span></div>
        <button className="tpass-close" onClick={onClose} aria-label="Close the Battle Pass"><X size={22} /></button>
      </header>
      <nav className="tpass-contents" aria-label="Battle Pass contents">
        {(["highlights", "rewards", "treasures"] as const).map(tab => <button key={tab} className={section === tab ? "is-active" : ""} aria-current={section === tab ? "page" : undefined} onClick={() => openSection(tab)}>{tab === "highlights" ? "Highlights" : tab === "rewards" ? "Rewards" : "Treasures"}</button>)}
        <button className={section === "tournament" && spread === -1 ? "is-active" : ""} aria-current={section === "tournament" && spread === -1 ? "page" : undefined} onClick={() => { openSection("tournament"); turn(-1); }}>Tournament</button>
        {section === "tournament" && pages.map((page, index) => <button key={page} className={spread === index ? "is-active" : ""} aria-current={spread === index ? "page" : undefined} onClick={() => turn(index)}>{page}</button>)}
        <div className="tpass-club"><small>YOUR CLUB</small><strong>{campaign.settings.team}</strong><span>{run?.state === "complete" ? "Tournament complete" : registered ? "Registered for the tournament" : "Tournament guide"}</span></div>
      </nav>
      <div className="tpass-toolbar">
        {section !== "tournament" ? <strong>{pass.title}</strong> : events.length > 1 ? <label>Tournament<select value={event?.id ?? ""} onChange={change => { setEventId(change.target.value); turn(-1); }}>{events.map(event => <option key={event.id} value={event.id}>{event.name}</option>)}</select></label>
          : <strong>{event?.name ?? "Season tournament guide"}</strong>}
        <span>{section !== "tournament" ? `${rewardsForPass(pass.id).length} REWARD PREVIEWS` : run ? run.state === "complete" ? "CAMPAIGN COMPLETE" : "CAMPAIGN IN PROGRESS" : "TOURNAMENT REFERENCE"}</span>
      </div>
      <div className="tpass-body" ref={content}>
        {section !== "tournament" ? <BattlePassRewards key={pass.id} passId={pass.id} view={section} onView={openSection} /> : <section className={`tpass-page ${spread < 0 ? "tpass-home" : ""}`} aria-label={spread < 0 ? "Battle Pass home" : pages[spread]}>
          {spread >= 0 && <h3>{pages[spread]}</h3>}
          {spread < 0 ? <>
            <div className="tpass-showcase">
              <div className={`tpass-keyart ${visual.feature ? "has-feature" : ""}`}><img src={art(visual.feature ?? pass.art)} alt="" /><div className="tpass-art-caption"><small>{pass.from.slice(0, 4)} SEASON</small><strong>{pass.title}</strong></div></div>
              <aside className="tpass-event-card"><small>{event?.kind === "ti" ? "THE INTERNATIONAL" : "TOURNAMENT COMPENDIUM"}</small><h3>{event?.name ?? "Your Dota season"}</h3><div className="tpass-pool"><small>TOURNAMENT PRIZE POOL</small><strong>{event ? money(event.pool) : "To be confirmed"}</strong></div><p>{event ? `${formatDate(event.start)} – ${formatDate(event.end)}` : "Explore this season’s tournaments"}<br />{event?.location}</p><div className="tpass-field-preview">{data?.teams.slice(0, 8).map(team => <TeamBadge key={team.id} teamId={team.id} name={team.name} year={event!.year} size="small" />)}</div><button onClick={() => turn(0)}>Open tournament <ChevronRight size={16} /></button><button className="tpass-text-button" onClick={calendar}>Calendar & bracket</button></aside>
            </div>
            <div className="tpass-chapter-heading"><span>TOURNAMENT COMPENDIUM</span><small>Explore the event</small></div>
            <div className="tpass-chapters">{pages.map((page, index) => { const Icon = pageIcons[index]; return <button key={page} onClick={() => turn(index)}><span className="tpass-chapter-art"><Icon size={34} strokeWidth={1} /><b>0{index + 1}</b></span><strong>{page}</strong><small>{chapterDetails[index]}</small></button>; })}</div>
          </> : !event || !data ? <p>No tournaments are catalogued for this pass’s season yet.</p>
            : spread === 0 ? <>
              <h4 className="tpass-event-name">{event.name}</h4>
              <div className="tpass-facts"><div><small>PRIZE POOL</small><strong>{money(event.pool)}</strong></div><div><small>THE FIELD</small><strong>{data.teams.length} teams</strong></div><div><small>VENUE</small><strong>{event.location || "Not confirmed"}</strong></div><div><small>THE EVENT</small><strong>{formatDate(event.start)} – {formatDate(event.end)}</strong></div></div>
              <p>{event.format}</p>
              <p>{run ? registered ? `${campaign.settings.team} ${run.state === "complete" ? "played" : "is registered"} in this campaign tournament.` : "This campaign tournament has no registered place for your club." : "The field is the historical reference. Review the calendar for your club’s invitation and qualification route."}</p>
              <div className="tpass-actions"><button onClick={calendar}>Open tournament</button><button onClick={() => go("next-series")}>Prepare next series</button></div>
              {event.status !== "ready" && <p className="tpass-note">{event.status === "needs-review" ? "Tournament entry awaits verification." : "This tournament is scheduled."} {event.limitations.join(" ")}</p>}
            </> : spread === 1 ? <>
              <p>{run ? "Registered campaign field" : "Historical reference field"} · {data.teams.length} teams</p>
              <div className="tpass-teams">{data.teams.map(team => <div key={team.id} className={team.managed ? "is-managed" : ""}><TeamBadge teamId={team.id} name={team.name} year={event.year} size="medium" /><strong>{team.name}</strong>{team.managed && <small>YOUR CLUB</small>}</div>)}</div>
              {!data.teams.length && <p>The field is not set yet.</p>}
              <button onClick={() => go("world")}>Explore team profiles</button>
            </> : spread === 2 ? <>
              <div className="tpass-facts"><div><small>VENUE</small><strong>{event.location}</strong></div><div><small>DATES</small><strong>{formatDate(event.start)} – {formatDate(event.end)}</strong></div></div>
              {data.fixtures.length ? <div className="tpass-rounds">{rounds.map(stage => {
                const fixtures = data.fixtures.filter(fixture => fixture.stage === stage);
                const dates = fixtures.map(fixture => fixture.at).sort();
                return <article key={stage}><h4>{stage}</h4><p>{formatDate(dates[0])} – {formatDate(dates.at(-1)!)}</p><small>{fixtures.length} series · {[...new Set(fixtures.map(fixture => `BO${fixture.bestOf}`))].join(" / ")}</small></article>;
              })}</div> : <p>Detailed fixtures are not catalogued yet.</p>}
              {data.fixtures.some(fixture => !fixture.dateVerified || !fixture.timeVerified) && <p className="tpass-note">Some fixture dates or times are estimates within the tournament window.</p>}
              <button onClick={calendar}>View tournament calendar & bracket</button>
            </> : spread === 3 ? <>
              <strong className="tpass-total">{money(event.pool)}</strong><p>Total tournament prize pool · amounts below are per team.</p>
              <div className="tpass-table"><table><thead><tr><th>Place</th><th>Prize per team</th></tr></thead><tbody>{prizes.map(prize => <tr key={`${prize.from}-${prize.to}`}><th scope="row">{place(prize.from, prize.to)}</th><td>{money(prize.usd)}</td></tr>)}</tbody></table></div>
              {!prizes.length && <p>Placement prizes have not been verified.</p>}{event.poolNote && <p className="tpass-note">{event.poolNote}</p>}
            </> : <>
              <p>{run ? `${data.matches.length} recorded campaign series` : day && day > event.end ? "No campaign run was recorded for this tournament." : "Campaign results will appear here as this tournament is played."}</p>
              {run?.state === "complete" && <div className="tpass-table"><table><thead><tr><th>Place</th><th>Team</th><th>Prize</th></tr></thead><tbody>{[...run.placements].sort((a, b) => a.from - b.from).map(placement => <tr key={placement.team}><th scope="row">{place(placement.from, placement.to)}</th><td>{name(placement.team)}</td><td>{money(placement.prize)}</td></tr>)}</tbody></table></div>}
              <ol className="tpass-results">{[...data.matches].sort((a, b) => a.at.localeCompare(b.at)).map(match => <li key={match.id}><small>{formatDate(match.at)}</small><span>{name(match.teams[0])} <b>{match.score.join(" – ")}</b> {name(match.teams[1])}</span></li>)}</ol>
              <div className="tpass-actions"><button onClick={calendar}>Tournament results & scoreboards</button><button onClick={() => go("history")}>Club match history</button></div>
            </>}
          {pass.note && <p className="tpass-note">{pass.note}</p>}
        </section>}
      </div>
      {section === "tournament" && <footer className="tpass-navigation" aria-label="Battle Pass pages"><button disabled={spread === -1} onClick={() => turn(spread - 1)} aria-label="Previous Battle Pass page"><ChevronLeft size={18} /><span>Previous</span></button><button onClick={() => turn(-1)}><List size={16} />Home</button><span>{spread + 2} / {pages.length + 1}</span><button disabled={spread === pages.length - 1} onClick={() => turn(spread + 1)} aria-label="Next Battle Pass page"><span>Next</span><ChevronRight size={18} /></button></footer>}
    </div>
  </ClientModal>;
}
