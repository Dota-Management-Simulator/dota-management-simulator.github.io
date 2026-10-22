# Historical tournaments — local work in progress

Reviewed **October 22, 2026**. Approved scope: major events, tier-2 events and their qualifiers, real dates/times, actual formats, era-specific entry and placement payouts. Every player must finish registered tournament runs before a transfer or release.

## Coverage

**The full request is not finished.** The catalog contains **483 records**: 112 pass current stage/topology/payout checks, 369 need review and two are scheduled. Passing checks does not mean every start time, invitation method or tiebreaker is verified. Entry also requires an invitation or qualifying place. The research catalog includes DPC qualification-path leagues whose tier classification is still under review; the count is not a claim of 483 verified major/tier-2 tournaments.

- TI1: four four-team groups, 24 BO1 group series and 22 playoff series, including its BO1/BO3/BO5 distinctions and final default win.
- Every TI from **2011 through 2019** now has its main field, groups and bracket graph. TI2012 East and West qualifiers each have 14 series, a BO5 final, zero cash prizes and a winner's main-event place. Clubs already invited/qualified for a parent event cannot consume another regional qualifying place.
- TI2014: 120 BO1 round-robin series, six BO3 gauntlet series and ten main-bracket series. Its July 8 wildcard is a separate three-series qualifier; entry stays unavailable until its regional runner-up links are imported. The main group field remains sixteen teams.
- TI2017/2018/2019: two nine-team groups and 22 playoff series. TI2017's unrecovered per-pair group dates stay estimated. Valve's TI2018/2019 graph supplies verified timestamps, while their archived historical prize pools take precedence over different current API counters.
- TI2021/2022: 94/112 mandatory series respectively, before campaign tiebreaks, with all regular fixture timestamps recovered. Event-scoped Steam ID reviews restore the historical names rather than today's rebrands.
- TI2024: 24 BO2 group series, eight BO3 seeding deciders and 22 playoff series. Nobody is eliminated in the initial groups. Its two-team BO3, three-team BO1 and five-match four-way placement tiebreaks are implemented; an unnecessary third/fourth tie match is omitted.
- TI2023: all 70 mandatory series are compiled, but entry remains locked pending its different BO1 seeding/BO3 elimination tiebreak policy. TI2025/2026 remain locked pending Swiss support and further review.
- The Defense Season 1 spans November 15, 2011–March 4, 2012: four opening six-team groups feed two six-team groups, then playoffs. Event-scoped sponsor/tag continuity prevents extra entrants, without merging organizations globally.
- Remaining work: most qualifiers, the rest of the main-event inventory, **2020 events**, gaps in 2021–2023 seasons, exact fixture times where recoverable, remaining GSL/multi-stage formats, Swiss pairings and individual tiebreak rules. No TI took place in 2020.
- **Qualification is partial.** Historical invitation counts and imported regional paths are enforced. Discretionary selection uses recent post-TI campaign performance and a gameplay-rating baseline. DPC player/team point ownership, roster penalties, regional changes and skipped AI world events remain outstanding. Do not call that fallback complete era-specific qualification.

The partner's 17 leads are retained in [the research intake](../scripts/data/tournament-partner-intake.json). BenQ Clash #2 belongs in December 2011; Brawl and several monthly cups belong in 2012. Ambiguous identities/currency conflicts remain research leads. Documented historical formats take precedence over a uniform BO1/BO3/BO5 template.

## Clock, simulation and saves

New campaigns use optional `Campaign.calendar` metadata. Wages, training and contract/sponsor expiry follow real seven-day intervals across years. Existing weekly saves retain their clock unless explicitly converted. Roster/hero imports follow actual TI end dates, with a year-end boundary for 2020.

Event windows and verified timestamps are sourced. Date-only facts stay date-only. Unrecovered per-pair dates are explicitly estimated within known stage windows; this is not a complete verified match timetable. Advances stop at pending registered fixtures. Concurrent online runs are supported; overlapping LAN attendance is blocked.

BO1, fixed two-map BO2 draws, BO3, BO5 and BO7 use the lane engine, including default-win advantages. AI matches omit replay frames and save compact career stats. Managed series retain scoreboards/graphs. The worker loads registered rules/templates instead of the catalog. Watching/skipping share outcomes; reloading an unrecorded match returns to its seeded fixture.

AI bracket batches now advance the club clock and elapsed payroll, and stop at another registered tournament's earlier commitment. Previously the final bracket could be revealed while the date stayed at the manager's elimination day. Existing settled saves keep their dates; the fix does not retrospectively move the clock or charge wages. Offscreen events outside registered runs still require world-season simulation.

Group scoring is configurable by map score. TI2015 uses 3/1/0 for 2–0/1–1/0–2; TI2016 uses 2/1/0. Their upper/lower-bracket boundary ties play extra games; other ties use head-to-head, successive lower seeds and a reproducible seeding coin toss, which never decides a map. Other round robins currently use a common head-to-head/extra-BO1 fallback where individual tiebreak rules remain unverified.

Group tables show points and the resolved tiebreak order. Historical opponent choices remain the bracket's seed-wiring template; manager-selected opponents are not implemented. TI2024's special four-way bracket and three-way stopping rule take precedence over the common round-robin fallback.

Players spend stamina-dependent energy per actual map. AI opponents accumulate map fatigue, with an illustrative twelve energy recovery per elapsed rest week. Default wins spend no map energy. These are gameplay rules, not historical measurements.

## Prizes and contracts

Placement awards the archived per-team payout once. Group wins never pay the championship prize. Zero-cash qualifiers pay zero. Distributions must reconcile to the pool before passing checks; source cents are retained.

Original currency is retained when verified. DreamHack Winter 2011 was **100,000 SEK**: archived placement conversions total **USD 14,253**, while the approximate headline conversion says USD 14,500. Gameplay uses the consistent archived payouts and explains the difference. The Defense's EUR 10,000 is not USD 10,000. TI2016's transposed 5th–6th payout is corrected to USD 934,671, consistent with 4.5% and the independent archive.

TI2017's main championship pool is **USD 24,687,916**; the combined headline includes a separate USD 100,000 All-Star award. Archived rounded team awards sum three dollars higher. TI2018's 7th–8th payout is corrected from the inconsistent USD 638,333 to **USD 638,304**, corroborated by contemporary reporting. TI2021/2022/2024 allocations use Valve's final pool and published percentage splits, rounded to whole dollars and explained in the UI. TI2018/2019 retain archived final payouts instead of recalculating them from different present-day API counters.

All rolling/negotiated agreements require tournament completion. Registered lineups and prize shares are pinned. Expiry keeps pay and suppresses the renewal morale penalty until the run ends. Incoming/outgoing registered players cannot transfer. Renewal changes future terms without rewriting active prize shares. Rules/prizes are pinned against later source corrections. Compact structural definitions are saved; combat configs/replay frames are not.

## Research and builds

[Liquipedia API terms](https://liquipedia.net/api-terms-of-use) require caching, a descriptive contact user agent, gzip, two seconds between API calls and thirty seconds between `action=parse` calls. Automated rendered-HTML collection has stopped. Network access is currently rate-limited; importers stop on denial and preserve caches. Do not bypass denial with another identity/IP or challenge solution.

- `fetch-tournament-wikitext.py` reads public `action=query` source in cached batches and discovers stage/qualifier transclusions.
- `normalize-tournament-source.py` uses `mwparserfromhell` for explicit lengths, times, default maps and entry metadata. The older parse importer waits 31 seconds.
- Checked-in `scripts/data/tournament-facts.json.gz` retains facts/URLs/attribution. `tournament-source-rules.json` retains template facts. `tournament-corrections.json` contains reviewed event-scoped corrections; `tournament-supplements.json` contains separately researched qualifiers.
- `scripts/data/tournament-index.json.gz` preserves the 627-entry research inventory for fresh checkouts. It includes pre-Dota-2 entries and is not a count of playable Dota 2 events. Both Liquipedia fetchers fall back to it when ignored local index files are absent.
- `import-valve-tournaments.py` caches the first-party esports client's public league endpoint. **116 league records** are saved in `valve-tournament-facts.json.gz`, including the configured 2021–2026 circuits and separately identified TI2018/2019 IDs. It batches an event's leagues, waits between calls, reuses caches and stops on HTTP denial. `--league ID` accepts an independently identified additional league; `--refresh` is explicit.
- `valve_tournaments.py` normalizes that cache offline. `valve-tournament-reviews.json` records event-scoped historical identities, source links and reviewed format exceptions. Unreviewed mutable Steam names never produce an automatically playable field. Verified source enums distinguish Swiss (3), GSL (8), double-elimination (5/6) and placement stages (9).
- Rebuild offline: `python -X utf8 scripts/build-tournaments.py`. After new source research, export with `cache-tournament-facts.py`, normalize source rules, rebuild and review. Missing local caches must not erase tracked facts.

Liquipedia contributors retain CC-BY-SA 3.0 attribution. Supplemental qualifier times/results link the independent [Escorenews archive](https://escorenews.com/en/dota-2/international-2012/qualification-east). Historical outcomes recover wiring only; campaign winners come from simulation.

## Validation

**99 workspace tests pass**, including fifteen tournament checks for alternate topology outcomes, full placements, real-date finances, legacy saves, contract locks, prize snapshots, duplicate settlement, engine BO1/BO2/BO5 outcomes, qualifier slots/exclusions, partner-list corrections, historical pool reconciliation, group points/boundary ties, TI2024 tiebreaks, dated AI batch limits/payroll and opponent fatigue. Build passes; the tournament worker is about 35 KB and does not bundle the catalog. The main bundle still has a Vite size warning.

Browser QA uses isolated origin **5192**, preserving the user's **5173** save. A TI1 run completed all 46 series, settled the managed club at 9–12/$0, and reopened its five played scoreboards after reload. Points and resolved group order are visible. TI2024's format, placement payouts and supporting sources were checked in both themes. These tests do not claim a complete historical archive or full DPC qualification. Changes remain local.
