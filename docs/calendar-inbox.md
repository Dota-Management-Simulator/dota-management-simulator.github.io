# Tournament calendar and manager inbox

Implemented locally on October 22, 2026. This interface consumes the shared historical tournament catalog; the tournament-history work owns its source verification, playable formats, fixtures, advancement and prize settlement. It does not make an unverified event playable or invent missing qualifiers.

## Calendar

`TournamentCalendarBoard.tsx` renders a Monday-first month calendar. Each tournament spans its inclusive UTC start/end dates, including rest days and fixtures the managed team does not play. Bars continue across week and month boundaries; overlapping events occupy separate lanes. No events are hidden behind an arbitrary per-day limit. The month agenda provides full names/dates when bars are narrow, and the grid scrolls horizontally on phones. Search, month/year, event-kind and club-commitment filters do not change campaign time. The Tier filter shows Tier 1 only, Tier 2 only, or both (the default), and applies to both event bars and the month agenda alongside the other filters.

Clicking a bar opens an accessible native dialog with dates, duration, location, field size, prizes, format and source. Imported qualifiers link to their parent event and parent events list their imported qualification routes. Pending source verification appears as dashed bars and explained entry restrictions.

Claiming a spot records a reservation without charging wages, advancing time, generating results or registering the tournament lineup. Eligibility still uses the tournament engine's invitation, qualification, region, verification and opening-stage rules. A manager can withdraw a reservation or decline an invitation. A declined event can be reconsidered while eligible. Starting the tournament uses `enterHistoricalTournament`, including current schedule conflicts, and hands off to the existing worker/match interface. A reservation is not permission to bypass the opening window or qualification.

Several online events may be active under the shared engine's scheduling rules. The calendar's active-run selector can resume each run and points managers to an earlier scheduled commitment before playing a later series. Overlapping reserved dates are shown as a planning warning; the engine makes the final decision about actual entry.

`advanceManagerWeek` caps a weekly advance at unresolved invited/reserved opening dates and pending tournament fixtures. Managers must enter or decline an opening decision before moving past it. Elapsed payroll/training remains in the campaign engine and only runs for actual elapsed seven-day periods. Starting a distant event directly still follows the tournament engine's advance rules.

Old saves keep their original 18-week clock. An explicit **Use dated tournament calendar** action is available on their calendar page. It retains club finances, roster, contracts and result history, but resets the competition clock to that year's historical opening and replaces old circuit qualification with event-specific entry. Missing inbox data alone never changes a save's clock.

## Inbox

`office.ts` reconciles the optional `Campaign.office` state after campaign changes and on load. Messages are campaign-local game events, not external emails or real communications from the organizations or players pictured.

- Tournament invitations arrive within 28 days of a playable event opening, with the campaign invitation decision snapshotted into the existing `calendar.invitations` map. This notification lead time is a gameplay rule; historical invitation announcement dates have not been verified.
- Reservations produce confirmations, opening reminders within seven days and missed-window notices if another time jump bypasses them. Completed runs produce placement/prize notices, linking winning qualifiers to the next event.
- Current roster contracts produce a reminder within two remaining weeks and an expiry/renewal notice. Players retain the engine's continuing terms and tournament protections.
- Managed sponsors produce reminders within two remaining weeks and expiry notices. A small previous-term snapshot preserves notices even when the market removes an expired deal during a time jump. The inbox does not extend or renew deals.
- Up to two currently eligible available sponsor opportunities are offered per reconciliation, each brand at most once per campaign year. They link to the real negotiation UI and explicitly warn that availability may change.
- Low cash generates a warning when fewer than three weeks of net recurring costs remain, at most once per four-week campaign block.

Read, unread and archive flags, deterministic notice IDs, reservations and sponsor snapshots persist in the existing campaign save. Reconciliation is idempotent and preserves existing dates, money, players and results. The newest 300 messages are retained, with a separate seen-ID ledger preventing old notices from returning after pruning or reload. Unread counts appear in navigation and the header. Filters/search and action links lead to the exact event, player profile or finance page.

## Notification expiry

Notices are reconciled against current campaign state after each change and on reload. Expired notices leave normal inbox/category/unread views and unread badges, retain their original content and read/archive flags, and appear under **Show → Expired** with a reason and expiry date. Their old action and restore-to-inbox controls are removed. This metadata is optional; older messages infer their age from their saved campaign date or legacy week. The seen-ID ledger prevents an old expired message from being presented again as a new unread notice.

- Player reminders expire when the player leaves, terms are replaced, or the fixed term ends. Unresolved expired-contract renewal notices remain actionable until the player leaves or the agreement is renewed. Live reminders refresh their remaining-week wording without generating another notification.
- Sponsor opportunities expire when reputation, era, slot capacity or exclusive ownership no longer permits an offer, or after two campaign weeks. Agreement reminders retire at expiry or if the deal changes; an old expiry update retires after a new deal with that brand or after four weeks.
- Invitations expire on acceptance/reservation, decline, entry, lost eligibility, unavailable event definitions or the opening deadline. Reservation confirmations/reminders retire after withdrawal, entry, loss of eligibility or the deadline; a separate missed-window notice may replace them. Qualifier-result actions expire when the next event is entered or its entry window closes.
- Cash warnings retire when their condition resolves or a new four-week finance update replaces them. Their displayed figures refresh while active. General club/results/missed-window updates leave the current inbox after four campaign weeks; history remains accessible through the Expired filter and season archive.

Expired invitations no longer make the weekly advance stop. Valid reservations and due tournament series still do. No expiry changes a contract, sponsor agreement, tournament result, roster or account balance.

## Verification

`tests/office.test.ts` covers inclusive spans, overlap lanes, leap days/year boundaries, save compatibility, immutable/deduplicated notice generation, read/archive persistence, invitation timing, reservation eligibility and atomicity, future opening stops, skipped-week expiry and missed registration. Browser checks use a separate origin from the user's campaign and the tournament-history chat's test save. Synthetic qualifier fixtures used only for UI checks are ignored helpers under `.local/` and are not added to the historical catalog.
