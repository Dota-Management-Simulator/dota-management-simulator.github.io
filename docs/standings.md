# TI race and campaign standings

October 22, 2026. Published in source `d2197b2`, Pages `dc3c334`; see [release verification](github-pages.md).

**TI race & standings** is a competition page in the sidebar. A Manager’s Desk summary links to it and shows the managed club's TI status, the leading recorded form and the latest saved tournament champion.

## What the page shows

- **TI race:** team identities, recent W/D/L form, series records, played maps, series win rate, titles and TI entry status. Region/search filters and series-win, title and invitation ordering support comparisons. The managed club is highlighted.
- **Live standings:** the existing tournament engine's group points and series/map records for registered tournaments, plus recent completed series and a link back to the tournament.
- **Recent winners:** completed campaign champions, runners-up, gross winner prizes and links to saved results. Qualifier winners are labeled separately. The previous TI champion remains visible when the race rolls into the next edition.

The default TI selector follows the current/next imported TI as time advances. Specific earlier editions remain inspectable. There is no invented 2020 TI or procedural TI beyond the imported archive. An unavailable event format stays locked by the calendar's existing entry checks.

## Invitations and qualification

`invitationRanking` in `historical-game.ts` exposes the same ordered candidates that `earnedInvitations` already selected. The view follows the engine formula: completed non-qualifier placements since the previous TI, weighted by tier, plus current player ratings, available historical lineup-strength evidence, recent lineup form and the small source-invite preference. The historical-strength/form terms were added by concurrent tournament work; the standings shares them rather than maintaining a second ranking. **This is a gameplay invitation score, not official DPC points or a complete historical qualification system.**

Projected invites can change before selection. Recorded invitation arrays and registered tournament fields remain authoritative. Once invitations are frozen, the UI does not reconstruct historical ranking scores from today's player ratings. TI2011 uses its fixed sixteen-team opening field. Completed qualifier placements supply earned places through their pinned awards and exact club IDs. Custom replacement clubs resolve to their own identity without duplicating the historical club.

The manager's status distinguishes invited, projected, qualified, reserved, declined, missed entry and participation. An invitation is an offer; it does not automatically enter a tournament. Registered teams retain their direct-invite/qualifier context where recorded.

## Records and time windows

The leaderboard reads both sides of saved `TournamentRun.matches`, including AI vs AI. Form is newest first; only the five newest results are displayed. Series wins order the default leaderboard, followed by win rate, map difference, titles and name. Default-win advantages are subtracted from played map totals. Draws count as draws, and team zero is a valid winner. Duplicate run/match entries, zero-map/default-only series and future-dated results do not inflate records.

Series and title totals use the selected TI cycle, after the preceding TI and through the selected edition's final day (or the current date if earlier). Recent winners retain earlier completed campaign events up to that same cutoff. A champion requires a unique first-place placement in a completed, date-appropriate saved run. Neither historical entrant lists nor unplayed catalog events generate results. Tied group order uses the existing engine standings and resolved order.

Exact club IDs link records through roster changes. Unlinked field teams retain event-scoped identities; identical names in different unlinked events are not merged. Source reference IDs do not imply that an unknown team has become an active world club.

Legacy weekly saves retain their clock, managed points and qualification. Their archived event summaries can identify known winners, but missing detailed series do not create W/D/L or form. Unrecorded rival prizes remain unknown, rather than zero. Skipped events are excluded.

## Coverage and compatibility

**The world does not yet simulate every event that the manager skips or does not enter.** This page reports saved tournament runs and existing legacy results. It does not invent a full global tournament season, official DPC standings, historical winners or unseen rival results. The page states that coverage explicitly. Global event simulation and complete era-specific invitation rules remain separate future work.

The standings view adds no save schema, storage key, prize settlement, rating or simulation outcome changes. The view is derived, read-only and survives reload because it uses existing saved records. Page filters/selection are temporary UI state.

Eleven tests cover fixed/custom fields, actual records and draws, default wins, duplicates and future dates, completed champions across TI cycles, entry decisions, qualifying awards, shared projections and frozen snapshots, past-edition cutoffs, event-scoped identities, the absent 2020/future editions and legacy unknowns. The current workspace suite has 139 tests; the production build passes with the existing large-chunk warning. The final build uses `.local/ti-race-build/` after a concurrent build locked the shared `dist/` folder.

Browser QA uses isolated port **5300**, preserving the campaign at **5298** and hosted saves. Checks cover search/region filters, actual AI results and all four TI1 groups, tournament links, a completed engine-driven event and its champion/results archive, reload persistence, invitation projection selection and desktop/phone layouts in both themes. Ignored previews live under `.local/ti-race-*.png`.
