import { useEffect, useRef, useState } from "react";
import { CalendarDays, ChevronLeft, ChevronRight, Check, X, ArrowRight } from "lucide-react";
import type { Campaign, Result } from "./game";
import { money } from "./game";
import { earnedInvitations, enterHistoricalTournament, tournamentEntryBlocker } from "./historical-game";
import { calendarDay, calendarMonth, CALENDAR_DAY, dateKey, tournamentDays } from "./calendar-layout";
import { declineTournament, managedReference, qualifiedFor, reservationBlocker, reserveTournament } from "./office";
import { formatDate, formatPrize, historicalTournaments, tournamentById, utcTime } from "./tournaments";
import type { HistoricalTournament } from "./tournament-types";
import "./calendar-board.css";
import TournamentSources from "./TournamentSources";

const monthNames = Array.from({ length: 12 }, (_, i) => new Intl.DateTimeFormat("en", { month: "long", timeZone: "UTC" }).format(Date.UTC(2011, i, 1)));
const eventKind = (e: HistoricalTournament) => e.kind === "ti" ? "The International" : e.kind === "qualifier" ? "Qualifier" : `Tier ${e.tier}`;

export default function TournamentCalendarBoard({ campaign, onChange, onHistory, busy, focusEventId, focusRequest }: {
  campaign: Campaign; onChange: (c: Campaign) => void; onHistory: (r: Result) => void; busy: boolean; focusEventId?: string; focusRequest?: number;
}) {
  const now = campaign.calendar!.now;
  const [view, setView] = useState(() => ({ year: Number(now.slice(0, 4)), month: Number(now.slice(5, 7)) - 1 }));
  const [search, setSearch] = useState("");
  const [kind, setKind] = useState("all");
  const [tier, setTier] = useState("both");
  const [selected, setSelected] = useState<string | null>(null);
  const [error, setError] = useState("");
  const dialog = useRef<HTMLDialogElement>(null);
  const events = historicalTournaments.filter(e => (tier === "both" ? e.tier === 1 || e.tier === 2 : e.tier === Number(tier)) && `${e.name} ${e.location}`.toLowerCase().includes(search.toLowerCase()) && (kind === "all" || (kind === "mine" ? campaign.calendar!.runs.some(r => r.eventId === e.id) || campaign.office?.registrations[e.id]?.status === "reserved" : kind === e.kind)));
  const weeks = calendarMonth(view.year, view.month, events);
  const monthFirst = Date.UTC(view.year, view.month, 1);
  const monthLast = Date.UTC(view.year, view.month + 1, 0);
  const monthEvents = events.filter(e => calendarDay(e.start) <= monthLast && calendarDay(e.end) >= monthFirst);
  const chosen = selected ? tournamentById(selected) : undefined;
  const move = (by: number) => { const d = new Date(Date.UTC(view.year, view.month + by, 1)); setView({ year: d.getUTCFullYear(), month: d.getUTCMonth() }); };
  const openEvent = (id: string) => { setError(""); setSelected(id); };
  useEffect(() => {
    const event = focusEventId ? tournamentById(focusEventId) : undefined;
    if (!event) return;
    setView({ year: Number(event.start.slice(0, 4)), month: Number(event.start.slice(5, 7)) - 1 });
    setSelected(event.id);
  }, [focusEventId, focusRequest]);
  useEffect(() => { if (chosen && !dialog.current?.open) dialog.current?.showModal(); }, [chosen]);
  const close = () => { dialog.current?.close(); setSelected(null); setError(""); };
  const execute = (fn: () => Campaign, dismiss = false) => { try { onChange(fn()); setError(""); if (dismiss) close(); } catch (e) { setError(e instanceof Error ? e.message : "Could not update tournament entry."); } };
  const existing = chosen ? campaign.calendar!.runs.find(r => r.eventId === chosen.id) : undefined;
  const reserved = chosen && campaign.office?.registrations[chosen.id]?.status === "reserved";
  const declined = chosen && campaign.office?.registrations[chosen.id]?.status === "declined";
  const invited = chosen && earnedInvitations(campaign, chosen).includes(managedReference(campaign));
  const qualified = chosen && qualifiedFor(campaign, chosen);
  const reserveReason = chosen ? reservationBlocker(campaign, chosen) : null;
  const enterReason = chosen ? tournamentEntryBlocker(campaign, chosen) : null;
  const qualifiers = chosen ? historicalTournaments.filter(e => e.parent === chosen.id).sort((a, b) => utcTime(a.start) - utcTime(b.start)) : [];
  const overlaps = chosen ? historicalTournaments.filter(e => e.id !== chosen.id && calendarDay(e.start) <= calendarDay(chosen.end) && calendarDay(e.end) >= calendarDay(chosen.start) && (campaign.office?.registrations[e.id]?.status === "reserved" || campaign.calendar!.runs.some(r => r.eventId === e.id && r.state === "playing"))) : [];
  const ended = chosen && utcTime(now) > calendarDay(chosen.start) + CALENDAR_DAY;
  return <section className="panel calendar-board">
    <div className="calendar-board-heading"><div><span className="eyebrow">YOUR COMPETITIVE DIARY</span><h2>Tournament calendar</h2><p>Full event dates, from opening stage to final. Click an event to plan your entry.</p></div><button className="button secondary small-button" onClick={() => setView({ year: Number(now.slice(0, 4)), month: Number(now.slice(5, 7)) - 1 })}><CalendarDays size={15} /> Campaign date</button></div>
    <p className="field-note">Historical coverage is still in progress. Events with missing stages or unresolved prizes are unavailable; some tournaments and qualifiers have not been imported yet. Individual match dates marked as estimates are not verified historical dates.</p>
    <div className="calendar-board-controls"><div className="calendar-month-picker"><button className="icon-button" aria-label="Previous month" onClick={() => move(-1)}><ChevronLeft size={20} /></button><h3 aria-live="polite">{monthNames[view.month]} {view.year}</h3><button className="icon-button" aria-label="Next month" onClick={() => move(1)}><ChevronRight size={20} /></button></div><div className="calendar-selectors"><label>Month<select aria-label="Calendar month" value={view.month} onChange={e => setView({ ...view, month: Number(e.target.value) })}>{monthNames.map((name, i) => <option value={i} key={name}>{name}</option>)}</select></label><label>Year<select aria-label="Calendar year" value={view.year} onChange={e => setView({ ...view, year: Number(e.target.value) })}>{Array.from({ length: Math.max(26, view.year - 2010) }, (_, i) => 2011 + i).map(year => <option key={year}>{year}</option>)}</select></label></div></div>
    <div className="calendar-board-filters"><label>Find tournament<input type="search" placeholder="Event or location" value={search} onChange={e => setSearch(e.target.value)} /></label><label>Events<select aria-label="Calendar event filter" value={kind} onChange={e => setKind(e.target.value)}><option value="all">All tournaments</option><option value="mine">My commitments</option><option value="ti">The International</option><option value="event">Main events</option><option value="qualifier">Qualifiers</option></select></label><label>Tier<select aria-label="Calendar tier filter" value={tier} onChange={e => setTier(e.target.value)}><option value="both">Tier 1 &amp; Tier 2</option><option value="1">Tier 1 only</option><option value="2">Tier 2 only</option></select></label><div className="calendar-legend"><span className="legend-main">Main event</span><span className="legend-qualifier">Qualifier</span><span className="legend-mine">Your entry</span></div></div>
    <div className="calendar-scroll" role="region" aria-label={`${monthNames[view.month]} ${view.year} tournament calendar`} tabIndex={0}><div className="calendar-month-grid">
      <div className="calendar-weekdays">{["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map(d => <span key={d}>{d}</span>)}</div>
      {weeks.map(week => <div key={week.start} className="calendar-week" style={{ minHeight: Math.max(108, 44 + week.lanes * 32) }}>
        <div className="calendar-day-backgrounds">{week.days.map(day => <div key={day} className={`calendar-day ${new Date(day).getUTCMonth() !== view.month ? "outside-month" : ""} ${dateKey(day) === now.slice(0, 10) ? "campaign-day" : ""}`}><time dateTime={dateKey(day)} aria-label={formatDate(dateKey(day))}>{new Date(day).getUTCDate()}</time>{dateKey(day) === now.slice(0, 10) && <small>NOW</small>}</div>)}</div>
        <div className="calendar-event-lanes" style={{ gridTemplateRows: `repeat(${Math.max(1, week.lanes)}, 28px)` }}>{week.segments.map(segment => {
          const e = segment.event;
          const mine = campaign.office?.registrations[e.id]?.status === "reserved" || campaign.calendar!.runs.some(r => r.eventId === e.id);
          return <button key={e.id} className={`calendar-event-bar ${e.kind} ${mine ? "my-event" : ""} ${e.status !== "ready" ? "unverified-event" : ""} ${segment.continuesBefore ? "continues-before" : ""} ${segment.continuesAfter ? "continues-after" : ""}`} style={{ gridColumn: `${segment.column} / span ${segment.span}`, gridRow: segment.lane + 1 }} title={`${e.name} · ${formatDate(e.start)} – ${formatDate(e.end)} · ${tournamentDays(e)} days${mine ? " · Your entry" : ""}`} aria-label={`${e.name}, ${formatDate(e.start)} through ${formatDate(e.end)}, ${tournamentDays(e)} days${mine ? ", your entry" : ""}`} onClick={() => openEvent(e.id)}>{mine && <Check size={12} />}<span>{segment.continuesBefore ? "‹ " : ""}{e.name}</span>{segment.continuesAfter && <b>›</b>}</button>;
        })}</div>
      </div>)}
    </div></div>
    <div className="calendar-month-footer"><span>{monthEvents.length} events this month · All dates shown in UTC</span><span>Dashed bars: historical format verification pending</span></div>
    {!monthEvents.length && <p className="calendar-empty">{search || kind !== "all" || tier !== "both" ? "No tournaments match these filters this month." : "No tournament records are available for this month yet. Try another month or year."}</p>}
    {monthEvents.length > 0 && <details className="calendar-agenda"><summary>Month agenda · full event names and dates</summary>{monthEvents.map(e => <button key={e.id} onClick={() => openEvent(e.id)}><span><strong>{e.name}</strong><small>{eventKind(e)} · {e.location}</small></span><span>{formatDate(e.start)} – {formatDate(e.end)}<small>{tournamentDays(e)} days</small></span><ChevronRight size={16} /></button>)}</details>}
    <dialog ref={dialog} className="calendar-event-dialog" aria-labelledby="calendar-event-title" onCancel={() => { setSelected(null); setError(""); }} onClose={() => setSelected(null)}>
      {chosen && <><button className="icon-button calendar-dialog-close" aria-label="Close event details" onClick={close}><X size={20} /></button><div className="eyebrow">{eventKind(chosen).toUpperCase()} · {chosen.year}</div><h2 id="calendar-event-title">{chosen.name}</h2><div className="calendar-event-meta"><span><CalendarDays size={17} />{formatDate(chosen.start)} – {formatDate(chosen.end)}</span><strong>{tournamentDays(chosen)} days</strong><span>{chosen.location}</span><span>{chosen.teams.length} teams · {money(chosen.pool)} prize pool</span></div>
        <section className="calendar-entry-card"><h3>{existing ? existing.state === "complete" ? "Your tournament is complete" : "Your team is playing" : reserved ? "Your place is reserved" : declined ? "You declined this event" : qualified ? "You earned a qualifying place" : invited ? "Your club has an invitation" : "Plan your path into this event"}</h3>
          {chosen.status !== "ready" && <p>{chosen.status === "scheduled" ? "This event is scheduled. Its final format is not yet confirmed for play." : "This event is visible on the calendar while its historical format is verified."} {chosen.limitations.join(" ")}</p>}
          {chosen.kind === "ti" && chosen.year >= 2018 && chosen.year <= 2023 && <p>Provisional DPC entry: invitations currently use recent campaign results and ratings while the historical points and roster rules are being completed.</p>}
          {error && <p role="alert" className="calendar-entry-error">{error}</p>}
          {existing?.state === "complete" ? <button className="button primary" onClick={() => { const result = campaign.results.find(r => r.tournamentId === chosen.id); if (result) { close(); onHistory(result); } }}>View tournament results <ArrowRight size={15} /></button> : existing ? <button className="button primary" onClick={close}>Return to tournament</button> : <>
            {reserved ? <p>Registration is saved. Start your run at the opening stage to play. Reserving a spot keeps the club clock where it is.</p> : <p>{reserveReason ?? (chosen.kind === "qualifier" ? "Register for this qualifier and earn your place through its actual matches." : "Claim your place first, then start your run when you are ready to advance to the opening stage.")}</p>}
            <div className="calendar-entry-actions">{!reserved && <button className="button primary" disabled={!!reserveReason || busy} onClick={() => execute(() => reserveTournament(campaign, chosen.id))}>{qualified ? "Claim qualified spot" : invited ? "Accept invitation & claim spot" : chosen.kind === "qualifier" ? "Register for qualifier" : "Claim a spot"}</button>}
              {reserved && <button className="button primary" disabled={!!enterReason || busy} title={enterReason ?? undefined} onClick={() => execute(() => enterHistoricalTournament(campaign, chosen.id), true)}>Start tournament <ArrowRight size={15} /></button>}
              {!ended && !existing && (reserved || invited) && <button className="button secondary" disabled={busy} onClick={() => execute(() => declineTournament(campaign, chosen.id))}>{reserved ? "Withdraw reservation" : "Decline invitation"}</button>}
            </div>{reserved && enterReason && <p>{enterReason}</p>}
          </>}
          {overlaps.length > 0 && <p className="calendar-overlap-note">Dates overlap your commitments: {overlaps.map(e => e.name).join(", ")}. Entry remains subject to the tournament schedule checks.</p>}
        </section>
        {chosen.parent && <button className="calendar-parent-link" onClick={() => openEvent(chosen.parent!)}>Qualifies for {tournamentById(chosen.parent)?.name ?? "parent event"}<ChevronRight size={15} /></button>}
        {qualifiers.length > 0 && <section className="calendar-qualifier-paths"><h3>Qualification routes</h3>{qualifiers.map(q => <button key={q.id} onClick={() => openEvent(q.id)}><span><strong>{q.name}</strong><small>{q.region ?? "All regions"} · {formatDate(q.start)} – {formatDate(q.end)}{q.qualifyingPlaces ? ` · Top ${q.qualifyingPlaces} qualify` : ""}</small></span><ChevronRight size={16} /></button>)}</section>}
        {!existing && !invited && !qualified && chosen.kind !== "qualifier" && qualifiers.length === 0 && <p className="field-note">No linked qualifier has been imported for this event yet. Entry still requires a valid invitation or earned qualifying place.</p>}
        <details className="tournament-facts"><summary>Format, prizes & historical source</summary><p className="tournament-format">{chosen.format}</p>{chosen.prizes.length > 0 && <table><caption>{money(chosen.pool)} total prize pool</caption><thead><tr><th>Placement</th><th>Prize per team</th></tr></thead><tbody>{chosen.prizes.map(p => <tr key={`${p.from}-${p.to}`}><th>{p.from === p.to ? p.from : `${p.from}–${p.to}`}</th><td>{formatPrize(p.usd)}</td></tr>)}</tbody></table>}<TournamentSources event={chosen} /></details>
        {chosen.poolNote && <p className="field-note">{chosen.poolNote}</p>}
        <p className="field-note">The calendar shows the full tournament window, including rest days between matches. Historical dates are shared by all clubs; your campaign results decide advancement.</p>
      </>}
    </dialog>
  </section>;
}
