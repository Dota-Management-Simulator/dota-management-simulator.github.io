# Post-game screens and profile match history

## Modern breakdown follow-up — October 25, 2026

The modern Breakdowns view now has a ten-hero portrait selector, Combat/Economy
controls, a selected hero panel and paired comparison bars. The default comparison
uses the same-position opponent; any other participant can be selected. Recorded
team shares, lane outcome and learned talents retain their actual archive values.
Player/category/comparison selections persist when visiting other tabs. A hero's
Item progression link opens that player's item filter. The Items view adds original
item thumbnails in chronological event order with actual times, purchase/sale/drop
labels and gold details in an expandable event log. The sequence spacing does not
represent elapsed time. Paused hero models stay paused across tabs and maps.

Valve's [Dota Plus feature page](https://www.dota2.com/plus) describes the actual
client's ability/target damage matrix, and the [2026 Summer Scrub](https://www.dota2.com/summerscrub2026)
adds more source-level detail. These archives retain aggregate totals, so the
comparison layout remains a manager adaptation and explicitly identifies the
missing spell/type/target data. No damage grid is inferred from aggregate totals.

TypeScript, the isolated production build and the CRLF-aware diff check pass.
The current focused run passes **22/24 tests**; two existing integration fixtures
stop inside `LaneBattle.run` with “The lane simulation did not finish” before
settlement/history assertions. Concurrent combat changes are preserved. This
follow-up adds no engine changes. The recorded-result 5353 preview verifies
hero/category/comparison navigation, persistent selections, item links/logs,
model-pause persistence and all seven tabs at an actual 320px viewport; the new
breakdown is also visually checked at 390px and desktop. The existing disposable
5347 profile verifies Practice filtering, exact Game 2 opening in its 2011 beta
presentation and preserved filters on return. Screenshot:
`.local/current-post-game-breakdown.png`. No normal-save changes or publication.

## Current-client correction — October 25, 2026

The user's visual review rejected the first generic modern layout. Its stacked
team cards, sidebar navigation and large trophy header are superseded for the
2018+ analytics/future presentation by `CurrentPostGame.tsx` and the scoped
`post-game-current.css`.

The inspected [February 14, 2026 in-client overview capture](https://pbs.twimg.com/media/HBHFlQoaEAAluzm.jpg)
from [luki luki](https://x.com/lukiluki_dota) is the composition reference: all ten
heroes in one tall horizontal strip with a gap between teams, player names at
the top, net worth/KDA near the bottom, victory on the winning side and the
central score/duration. Horizontal text tabs sit above the result. The
[April 2023 player capture](https://user-images.githubusercontent.com/131482730/233704404-c90b9843-53f9-405d-992f-118bab700b67.jpg)
also shows this basic composition. These references are inspected, not bundled.

Existing Valve idle films now animate each visible hero column. Pause models,
reduced motion, offscreen/hidden-tab cleanup and poster/icon fallbacks are
supported. These are rendered films rather than Source 2 scenes; cosmetic
loadouts, rank medals and Dota Plus progression are not fabricated. The displayed
level is the actual match level, labelled LV, rather than an invented Plus badge.

The modern scoreboard is denser, with wide hero portraits, inventories beside
net worth, then LH/GPM/XPM/damage/building/healing columns. Item images are
explicitly contained in their slots, fixing a shared overflow. Performance
compares recorded player totals and opens the existing detailed breakdowns.
Items and Draft & calls remain useful simulator tabs rather than fake Buffs/MVP
panels. Earlier client layouts, saved history and all simulation/settlement code
are untouched by this correction.

The implementation snapshot passes **340 tests**, TypeScript and production
build (existing bundle warning), superseding the first pass's 337/338 welfare
fixture result below. Desktop review verifies ten same-row hero panels, all ten
film decodes/playback, pause/still fallback, damage sorting, comparisons and all
seven modern tabs. Actual 390px/320px viewports contain every tab; hero columns
and wide tables scroll internally. A 320px nested container is also checked.

Concurrent combat edits subsequently triggered development reloads and altered
map completion. The stable visual preview on **5353** uses a disposable recorded
map from the earlier passing compiled worker; it neither changes those combat
edits nor reads/writes normal campaign storage. The updated application source
retains normal live/simulated result callbacks. Preview source/output/logs are
ignored under `.local/current-post-game-*`. Screenshots:
`.local/current-post-game-preview.png` and `.local/current-post-game-scoreboard.png`.
No publication.

Local implementation, October 25, 2026. Not published.

## End screens

`PostGameScreen.tsx` replaces the single long results report used by managed
maps, series, scrims, exhibitions and reopened tournament scoreboards. It uses
the recorded match date, then the saved patch's start date, then the archived
year. The current campaign and host date never restyle an old match.

| Recorded date | Presentation | Initial view |
| --- | --- | --- |
| Before May 24, 2012 | Bronze/stone beta match ledger | Scoreboard |
| May 24, 2012–September 8, 2015 | Red/charcoal Source 1 ledger | Scoreboard |
| September 9, 2015–August 22, 2016 | Blue/slate Reborn ledger | Scoreboard |
| August 23, 2016–March 11, 2018 | Dark Rift hero-lineup summary | Overview |
| March 12, 2018–2026 | Analytics presentation | Overview |
| 2027 onward | Explicit alternate future | Overview |

All periods have working Overview, Scoreboard, Graphs, Breakdowns, Items and
Draft & calls navigation. Tabs support arrow keys, Home and End. Hero cards and
scoreboard players open a selected player breakdown; player arrows/selector,
opponent comparison and all-player metric rankings work without changing the
match. Scoreboard headings sort each side independently. Item histories filter
by player. Long recorded event lists scroll independently.

Graphs use the existing recorded team resource samples and retain pointer and
keyboard-slider inspection. GPM matches career statistics: earned gold excludes
the 600 starting gold and uses match-clock minutes. Optional damage, healing,
net worth, lane and objective telemetry stays unknown when unrecorded; a measured
zero is displayed as zero. Team shares require complete team telemetry. No
per-spell/target damage split, wards, denies, MVP, cosmetic ownership, progression
or rewards have been invented. Hero renders and item artwork reuse current Valve
media rather than claiming historical art fidelity.

`DraftSeries` still stops after each played map and requires explicit continuation
to the next draft/settlement. Live-worker completion and simulating the remainder
both reach this screen. Series map selection, BO2 draws, default-win advantages,
neutral viewing and the existing settlement callbacks remain intact. Saved
results retain their existing schema and compact scoreboards; no replay frames
are saved. Empty/older archives have a readable summary fallback.

## Profile history

**My profile** is a club page reachable from the client profile and Club/Party
navigation. Individual player profiles also have a **Match history** section.
`match-history.ts` indexes existing archives without writing a second ledger:

- Tournament maps retain their exact registered tournament, fixture label,
  played date, patch and saved side order, including completed maps in active
  events. Placement summaries are excluded to prevent double counting.
- Weekly event maps retain their original event and week labels. Skipped events
  do not create appearances.
- Completed scrims are explicitly **Practice**, with their focus and **Private
  practice · no tournament**. Scheduled/declined/unplayed scrims do not appear.
- OpenAI Five and coached All-Star results are separate **Exhibition** entries.
  Old/pruned summaries retain their score without invented maps or players.

History filters by match type, season, event and opponent/hero search, displays
30 rows at a time and supports loading more. Each recorded map opens that exact
map in the shared era screen; returning preserves history filters. Player
appearances are matched by exact archived player ID on either side, independently
of the current roster. Practice/exhibitions remain excluded from competitive
career averages, scouting form and tournament statistics.

## Sources and adaptation limits

- Valve's [May 24, 2012 dashboard update](https://store.steampowered.com/oldnews/8064)
  and [Reborn](https://www.dota2.com/reborn/part1/) inform the existing client
  boundaries. The early results surfaces adapt those period palettes and dense
  scoreboard patterns; exact historical post-game screen geometry is not claimed.
- Valve's [Dark Rift update](https://www.dota2.com/darkrift/) describes Overview,
  clickable heroes, Scoreboard, resource graphs and item progression. Its
  [original post-game illustration](https://cdn.steamstatic.com/apps/dota2/images/darkrift/postgame_main.jpg)
  is a reference, not a new bundled asset. The summary launch was August 23, 2016.
- Valve's [Introducing Dota Plus](https://www.dota2.com/newsentry/2882822214138792980)
  is dated March 12, 2018; [its feature page](https://www.dota2.com/plus) describes
  post-game analytics. Universal early-era analysis tabs and
  comparisons against the current match are manager adaptations. They do not
  reproduce Valve's subscription service, skill-bracket averages or damage grid.
- Later supported years retain the analytics family rather than inventing a
  redesign for every patch. Future years are explicitly fictional.

## Validation

The 42 focused tests covering post-game boundaries/rates/unknown telemetry,
history/membership/classification/reload, existing scoreboards/performance,
scrims and client previews pass. TypeScript and the isolated production build
pass (the existing bundle-size warning remains). The shared full-suite run
passes 337/338 tests; the remaining qualifier-settlement test fails after the
concurrent player-welfare changes leave an incomplete roster during its twelve
week jump. This feature changes no settlement or welfare logic.

Disposable localhost **5347** QA covers a real BO2 fast-drafted first map,
explicit next-map continuation, watched second map/simulate remainder, all
breakdown tabs and single final callback. All six sections across six presentation
families pass desktop, actual 390px and actual 320px containment (36 checks per
size); tables scroll within their frames. Browser checks also cover sorting,
keyboard tabs/graph inspection, item filters, compact/empty/legacy archives,
club profile navigation, player-specific practice/tournament history, tournament
filters and exact-map reopening from a 2024 profile into a 2011 screen. Ignored
fixtures, build output, logs and screenshots live under `.local/post-game-*` and
`.local/profile-history-*`. Normal campaign saves and existing jobs are untouched.
