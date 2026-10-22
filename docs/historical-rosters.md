# Historical player and hero imports

Reviewed **2026-10-21**. Annual player/team references and Dota 2 hero-release batches cover **2011–2026**. These updates are local and have not yet been deployed. Three era-specific signature heroes per player remain deferred.

## Coverage

The TI1 opening world has **100 identities / 19 clubs**, including all 16 TI1 organizations and listed reserves. The 2011 shuffle grows to **199 identities / normally 38 clubs**. Selected Chinese DotA records are intentional during the transition to Dota 2. Its regional coverage is partial and has no verified South American roster.

Later imports combine TI fields with selected regional and closed qualifier teams, covering all six gameplay regions every year from 2012 onward. This is **not an exhaustive census of tier-2 players**; “regional” is not a verified tier ranking. Open qualifiers, exhibitions and incomplete roster excerpts are excluded. Special 2017 champions qualifiers are included. Club/year references prefer main-event rosters over earlier qualifiers; selected 2026 clubs have dated post-TI overrides available before the cutoff.

| Shuffle year | Club references | TI field references | New heroes | Heroes after shuffle |
| --- | ---: | ---: | ---: | ---: |
| 2011 | 38 | 16 opening TI1 clubs | 18 | 64 |
| 2012 | 30 | 16 | 31 | 95 |
| 2013 | 27 | 16 | 10 | 105 |
| 2014 | 53 | 16 | 4 | 109 |
| 2015 | 40 | 16 | 2 | 111 |
| 2016 | 42 | 16 | 2 | 113 |
| 2017 | 79 | 18 | 2 | 115 |
| 2018 | 54 | 18 | 1 | 116 |
| 2019 | 58 | 18 | 3 | 119 |
| 2020 | 51 | No historical TI | 1 | 120 |
| 2021 | 68 | 18 | 2 | 122 |
| 2022 | 73 | 20 | 1 | 123 |
| 2023 | 80 | 20 | 1 | 124 |
| 2024 | 67 | 16 | 2 | 126 |
| 2025 | 52 | 16 | 1 | 127 |
| 2026 | 48 | 16 | 0 as of October 21 | 127 |

The cumulative database has **1,641 identity records**. Active club counts can differ after management decisions, overlapping references and regional replacements. Previously imported players remain recruitable; retirement and career debut dates are not modeled.

## Sources and limits

Data lives in `src/data/rosters-2011.json` and `src/data/rosters/YYYY.json`. Each club has a source key and an event year or precise reference date when available; each batch includes its URL catalog. Principal sources are the [TI archive](https://liquipedia.net/dota2/The_International), annual regional qualifier pages and dated team histories. The 2020 batch uses actual ESL online regional leagues and BTS events because TI was cancelled; cancelled Los Angeles LAN rosters are excluded. The game's five-event calendar remains a placeholder, including its 2020 TI event.

These are **composite annual fields**, not single-date rosters or complete post-TI transaction lists. Overlapping observations of one player are reconciled to one club, filling other vacancies regionally. World teams shows campaign ownership and links to the underlying reference. Research used indexed text when direct sources were unavailable; adjacent-card truncation and incomplete lists were checked before normalization. A year alone preserves the available precision instead of inventing a date.

`src/data/player-identities.json` records source spellings and first imported observation year, **not career debut**. `identity-aliases.json` links reviewed aliases such as QQQ/357, Ceb/7ckngMad, N0tail/BigDaddy, Somnus/Maybe, Quinn/CCnC and Nightfall/epileptick1d. Country-qualified IDs distinguish reused handles; countries aid disambiguation and are not eligibility rules. Further alias and biographical review remains useful.

All fixed-position assignments remain labeled **adapted**, especially where early flexible roles need individual verification. Regional replacements may change role. Regions represent roster pools, not citizenship; Oceania is grouped with Southeast Asia. Ratings, playstyles, wages and fees are neutral role templates, **not historical skill assessments**. Full names/ages stay empty/null until sourced. Hero attributes and combat archetypes also remain approximations.

## Campaign rules

- **Start:** TI1 begins with its 46 contested heroes. Later starts use completed shuffles through the previous year, capped at 2026. A 2026 campaign therefore begins with 2025 rosters and receives 2026 additions after TI.
- **Club:** all original TI1 clubs are selectable. Later starts can choose any club in their starting batch, including regional clubs. A custom club replaces one and inherits its lineup/region; the replaced club is not duplicated by future imports.
- **Window:** week 17 imports the year's newcomers and heroes once, whether TI was entered, skipped or missed. The 2020 window is an annual shuffle with no historical TI. Disabling historical moves keeps club assignments but still unlocks newcomers/heroes.
- **Alternate history:** the managed five and completed recruitment decisions remain protected. AI clubs outside later annual fields are archived; this is a game field change, not historical disbandment or retirement. Their available players remain in the market, and the managed club persists.
- **Replacement:** recruiting an opposition starter makes its former club choose a real available regional player/reserve, preferring the same role and its own reserves. Role changes are allowed. A signing that cannot leave a complete lineup is rejected atomically with an explanation.
- **Formation:** an AI club that cannot form five distinct positions is archived and logged; its available players still arrive. Opponent selection uses active clubs and actual current lineups.
- **Future:** years beyond 2026 retain the latest imported pool. Procedural future generation is not implemented.

Hero data follows the [Dota 2 release chronology](https://liquipedia.net/dota2/Heroes_by_release) and [OpenDota catalog](https://github.com/odota/dotaconstants/blob/master/build/heroes.json). Oracle is corrected to **2014** using [Valve's update](https://www.dota2.com/oracle/day2). Largo's 2025 release brings the pool to 127; no additional 2026 release was recorded by October 21. The user's rule unlocks all calendar-year releases together after TI, including late-year releases; it is independent of original DotA releases and Captain's Mode eligibility. The worker receives the eligible cutoff. Global hero lookup still resolves older scoreboards. See [simulation notes](simulation.md).

## Saves and checks

Version 1 and storage key `aegis-manager-campaign-v1` remain unchanged. Optional world fields record applied windows, data cutoff, current/archived clubs and protected decisions. Historical saves catch up missing completed windows on load, retaining the manager, money, dates and results. Earlier fictional saves retain their original players and recruitment behavior. Hero availability derives from year/week.

**28 tests pass**, including every annual shuffle through 2026, full TI field/reference checks, six regional pools, no future arrivals, historical/custom starts, unique ownership/positions, recruitment protection, depleted pools, idempotence, save catch-up/legacy compatibility, hero boundaries and later-era engine drafts. The production build passes with a separate historical data chunk. Browser checks cover 2026 creation, hero search and week-17 growth from 1,597 to 1,641 identities while retaining the managed lineup.

Further data work can deepen regional coverage, verify roles/biographies, resolve more aliases, add actual post-TI transaction histories and research three signature heroes per era/player.
