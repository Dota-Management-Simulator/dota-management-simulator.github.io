# Manager workspace

October 22, 2026. Published in source `d2197b2`, Pages `dc3c334`; see [release verification](github-pages.md).

The first game-format pass keeps Aegis's cream and forest themes, gold accents, club colors, badges and existing management systems. A compact Manager’s Desk replaces the introductory dashboard artwork; Squad replaces the large roster cards with a comparison table and selected-player dossier. Campaign setup keeps its existing presentation.

## Campaign controls

The sticky campaign bar shows the current date, club, cash, net recurring weekly income/costs and Continue. It delegates advancement to the existing campaign functions; it does not introduce another clock or modify payroll, training or settlement rules.

For dated campaigns, Continue opens a due invitation/reservation or resumes the next due registered fixture. Future commitments still permit advancing toward their dates, with `advanceManagerWeek` applying the existing stops. Inbox read/archive state does not remove a real tournament commitment; ordinary contract, sponsor and informational messages do not become mandatory blockers. Legacy weekly campaigns retain their clock, qualification checks and event entry flow.

During calendar computation or playback, the campaign bar disables advancement. Reopening a dismissed tournament decision works even when the calendar and selected event have not changed. Registered runs open directly in the series workspace without an extra entry dialog.

## Manager’s Desk

The desk uses actual active inbox notices, the next invitation/reservation or registered series, squad energy and happiness, recent club log entries and the last completed event result. Resolved/expired notices stay out of the action list. An unresolved bracket never presents an AI match between other clubs as the manager's next opponent. Estimated match dates remain labeled.

## Squad

The comparison table shows the five starters, role, overall rating, energy, happiness, weekly pay, contract duration/status and training focus. Native buttons support keyboard selection. The selected dossier displays the player's current attributes or playstyles, readiness and weekly training plan. Its projected energy calls the existing `weeklyPractice` function and respects saved workloads, rest and current contracts.

The full profile, portrait credits/provenance, negotiations and performance history remain available from the dossier. Selecting a player does not change the campaign. At narrower widths, the dossier stacks below the comparison table and selection scrolls to it; table scrolling keeps every comparison column available without widening the page.

## Compatibility and validation

No campaign schema or storage key changes. Selection and navigation are temporary UI state. Existing ratings, agreements, rosters, results and clock modes retain their mechanics; no retrospective training is introduced.

Seven manager-view tests cover immutable selectors, archived/read invitations, declined and reserved entry, registered fixtures, future openings, legacy eligibility and unresolved opponent display. The complete suite has 119 tests. The production build passes with the existing large-chunk warning.

Browser QA uses isolated `http://127.0.0.1:5298/`, preserving existing local and hosted campaign origins. Checks cover desktop (1440px), tablet (950px), phone (390px and 320px), original and club themes, player and playstyle selection, keyboard selection, full profiles, reload persistence, invitation reopening, reservation/start, direct series routing, disabled controls during computation, and a real skipped-playback series. A declined invitation followed by Continue advanced August 17 to August 24 and charged exactly one week's $6,000 net costs in the test campaign.

Preview screenshots are ignored under `.local/manager-workspace-*.png`. This change is included in the verified October 22 release above; the final combined suite has 139 passing tests.
