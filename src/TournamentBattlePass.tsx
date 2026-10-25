import { useRef, useState } from "react";
import { ChevronLeft, ChevronRight, List, X } from "lucide-react";
import type { Campaign, Page } from "./game";
import { money } from "./game";
import { formatDate } from "./tournaments";
import { passTournamentData, passTournaments } from "./tournament-pass";
import type { TournamentPass } from "./tournament-pass";
import ClientModal from "./ClientModal";
import TeamBadge from "./TeamBadge";
import "./tournament-pass.css";

const pages = ["The tournament", "The teams", "Venue & schedule", "The prize pool", "Results & placements"];
const place = (from: number, to: number) => from === to ? String(from) : `${from}–${to}`;

/** An openable tournament book shared by every Reborn Battle Pass promotion. */
export default function TournamentBattlePass({ pass, campaign, onClose, onPage, onTournament }: {
  pass: TournamentPass; campaign: Campaign; onClose: () => void;
  onPage: (page: Page) => void; onTournament?: (id: string) => void;
}) {
  const events = passTournaments(pass, campaign);
  const [eventId, setEventId] = useState(events[0]?.id);
  const [spread, setSpread] = useState(-1);
  const content = useRef<HTMLDivElement>(null);
  const event = events.find(event => event.id === eventId) ?? events[0];
  const data = event ? passTournamentData(event, campaign) : undefined;
  const run = data?.run;
  const name = (id: string) => data?.teams.find(team => team.id === id)?.name ?? id;
  const turn = (next: number) => { setSpread(next); content.current?.scrollTo(0, 0); };
  const go = (page: Page) => { onClose(); onPage(page); };
  const calendar = () => { onClose(); if (event && onTournament) onTournament(event.id); else onPage("calendar"); };
  const day = campaign.calendar?.now.slice(0, 10);
  const registered = !!run?.teams.some(team => team.id === run.managed);
  const prizes = event?.prizes.filter(prize => prize.usd > 0) ?? [];
  const rounds = [...new Set(data?.fixtures.map(fixture => fixture.stage) ?? [])];

  return <ClientModal label={`${pass.title} · Tournament Battle Pass`} className="tpass-modal" onClose={onClose}>
    <div className="tpass-book">
      <header className="tpass-cover" style={{ backgroundImage: `url("${import.meta.env.BASE_URL}dota-menu/${pass.art}")` }}>
        <button className="tpass-close" onClick={onClose} aria-label="Close the Battle Pass"><X size={22} /></button>
        <div><small>TOURNAMENT BATTLE PASS</small><h2>{pass.title}</h2></div>
      </header>
      <div className="tpass-toolbar">
        {events.length > 1 ? <label>Tournament<select value={event?.id ?? ""} onChange={change => { setEventId(change.target.value); turn(-1); }}>{events.map(event => <option key={event.id} value={event.id}>{event.name}</option>)}</select></label>
          : <strong>{event?.name ?? "Season tournament guide"}</strong>}
        <span>{run ? run.state === "complete" ? "CAMPAIGN COMPLETE" : "CAMPAIGN IN PROGRESS" : "TOURNAMENT REFERENCE"}</span>
      </div>
      <div className="tpass-body" ref={content}>
        <nav className="tpass-contents" aria-label="Battle Pass contents">
          <button className={spread === -1 ? "is-active" : ""} aria-current={spread === -1 ? "page" : undefined} onClick={() => turn(-1)}><List size={16} /> Contents</button>
          {pages.map((page, index) => <button key={page} className={spread === index ? "is-active" : ""} aria-current={spread === index ? "page" : undefined} onClick={() => turn(index)}><span>0{index + 1}</span>{page}</button>)}
          <p>{pass.note ?? "Follow the tournament and your club’s campaign."}</p>
        </nav>
        <section className="tpass-page" aria-label={spread < 0 ? "Contents" : pages[spread]}>
          <h3>{spread < 0 ? "Table of contents" : pages[spread]}</h3>
          {spread < 0 ? <>
            <p className="tpass-intro">Your tournament companion. Open a chapter to explore the field, follow the schedule and revisit your campaign’s results.</p>
            <div className="tpass-chapters">{pages.map((page, index) => <button key={page} onClick={() => turn(index)}><small>CHAPTER 0{index + 1}</small><strong>{page}</strong><ChevronRight size={20} /></button>)}</div>
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
        </section>
      </div>
      <footer className="tpass-navigation" aria-label="Battle Pass pages"><button disabled={spread === -1} onClick={() => turn(spread - 1)} aria-label="Previous Battle Pass page"><ChevronLeft size={18} /><span>Previous</span></button><button onClick={() => turn(-1)}><List size={16} />Contents</button><span>{spread + 2} / {pages.length + 1}</span><button disabled={spread === pages.length - 1} onClick={() => turn(spread + 1)} aria-label="Next Battle Pass page"><span>Next</span><ChevronRight size={18} /></button></footer>
    </div>
  </ClientModal>;
}
