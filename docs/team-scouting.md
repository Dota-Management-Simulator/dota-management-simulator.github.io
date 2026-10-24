# Team scouting and staff draft preparation

October 23, 2026 — implemented locally; not published.

**Scout your next series** is a dedicated navigation entry and a Manager’s Desk shortcut. It shows the next registered commitment, confirmed opponent, stage, series length and date. Registered lineups and the tournament’s pinned patch drive preparation, even if the club roster or current patch has changed. An unresolved bracket shows a waiting state; an unregistered campaign shows no scheduled series and links to the calendar and team directory. Legacy weekly circuits retain their existing opponent selection.

**Teams** replaces the former World teams roster grid with a searchable, regional directory. Active clubs appear by default; All recorded teams includes archived reference clubs and registered field teams. Every entry opens a profile with starters, reserves, player-profile links, campaign series record, recent results, the three most played heroes and roster/logo references. The manager’s own team also has a profile. Unlinked tournament field teams remain event-scoped, even when their names match.

## What staff add

Everyone can inspect basic lineups and public campaign results. Employed tactical staff provide additional interpretation and a suggested draft plan:

| Staff | Additional scouting/preparation |
| --- | --- |
| Head coach | A suggested approach and legal five-position hero preferences, based on the club’s uncertain patch report |
| Analyst | Recorded lane outcomes for current lineup players, observed hero threats and priority-ban candidates |
| Economy coach | Recorded core earned GPM, available building-damage measurements and economy/objective advice |
| Strategy scout | Observed pushing compositions, the opponent’s recorded bans and priority-ban candidates |
| Hero specialist | Extra patch hero research, observed current-lineup threats and each player’s campaign hero pool across clubs |
| Physical therapist | Existing recovery support; no added tactical scouting coverage |

Only employed staff contribute their notes. Duplicate or unknown staff IDs add no coverage. Releasing a member removes their future insights; an explicitly applied saved plan remains the manager’s plan. Existing wages, hiring reserves, training and recovery rules are unchanged.

Staff advice also appears before each managed map in both historical tournaments and legacy circuits. **Use staff draft plan** explicitly replaces and saves the approach, five role preferences and up to three observed priority bans. The normal preparation controls remain editable before manual or fast automatic drafting. Suggested picks use legal era roles and the released pool, with known own-player campaign familiarity when present in the match config. Ban suggestions exclude the proposed own lineup and preserve a legal draft for both sides. Picks and bans remain preferences, never forced outcomes or combat bonuses.

## Evidence and limitations

Scouting is derived from completed saved campaign series, including compact AI scoreboards. It never fetches live statistics or uses historical finishing positions as invented campaign form. Tournament placement summaries do not duplicate individual matches. Duplicate match keys, future-dated matches and non-played default wins are excluded. Old series without scoreboards can contribute results but do not fabricate hero or player statistics.

Club results follow club identity across roster changes. Specialist analysis uses at most twenty recent recorded maps; hero threats and lane analysis retain only players in the displayed lineup. The hero specialist’s player pools follow exact player IDs across clubs, counting completed campaign appearances rather than claiming pre-campaign signature heroes or combat proficiency. Samples can be very small and are labeled accordingly. Scouting does not create world results for unentered events.

Preparation reads the manager’s existing uncertain patch report, not true strength rankings, calibration power, the opponent’s private research or their saved draft plan. Player attributes and simulation outcomes are unchanged by viewing or applying advice. Advice is a deterministic gameplay heuristic, not a fitted historical counter model.

No save migration or second scouting ledger is required. Applied plans reuse optional `Campaign.draftPreparation`; browsing and applying do not advance the clock, charge money or change ratings, contracts or old results. Existing malformed-preparation normalization still applies.

## Validation

All **210 application tests** pass. Eight new scouting checks cover immutable empty reports and directories, pinned lineups/patches and save round trips, unresolved brackets, compact AI samples, duplicate/future/default-win filtering, staff coverage/release, current-player threats, legal plans across all 32 phases, hidden opponent preparation/research and combat-coefficient independence, legacy compatibility and same-name field isolation. The focused suite also passes after the final legal-ban checks. TypeScript and the production build pass with the existing chunk-size warning.

Browser QA uses isolated **5313**. A disposable TI1 campaign verified directory search, empty reports, staff hiring, confirmed next opponent, applied-plan persistence after reload, editable preparation in the actual draft screen, a real automatic draft and managed-worker settlement. The resulting opponent profile displays its recorded picks, bans, lanes, economy and per-player hero pools. Desktop and a 390px iframe were inspected in light and dark themes. The ordinary local and hosted campaign saves were not used.

Implementation: `src/team-scouting.ts`, `src/TeamScouting.tsx`, `src/WorldTeams.tsx`, `src/team-scouting.css`; navigation and integration in `App`, `ManagerDesk`, `StaffOffice`, `DraftSeries` and `HistoricalCalendar`. Tests: `tests/team-scouting.test.ts`.
