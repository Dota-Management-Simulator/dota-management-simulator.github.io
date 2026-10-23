# Historical roles and match drafting

October 23, 2026 — local implementation; not published in this pass.

Every managed map now starts with a choice: **Follow preparation · fast draft** runs the actual picks and bans visibly at 85 ms per action, or **Draft for my team** lets the manager choose their team's bans and picks. The opponent acts automatically. The choice returns before each map of BO2/BO3/BO5/BO7 series. Watching/skipping match playback remains a separate choice. A completed manual draft must be confirmed before the map runs.

Preparation saves one approach, a preferred hero for each position and up to six priority bans. Preferences guide automatic choices; they cannot force an unavailable hero or an illegal lineup. They persist across reloads, are editable before each map and do not advance time, spend money or modify attributes. Optional malformed preparation normalizes without rejecting an otherwise valid save. Prior draft records are absent in older saved matches rather than fabricated.

Maps run through the existing battle worker using the chosen ten heroes. Full-series settlement happens once, after the series ends; prizes, tournament advancement and player updates still use the existing settlement rules. First pick alternates between maps, with the initial side seeded deterministically; historical coin tosses are not reproduced. Default upper-bracket wins count toward the series without creating a fictional played map. Completed series retain a chronological draft in full managed results and compact AI scoreboards. **An unfinished series is not checkpointed between maps**: reloading returns to the unsettled series, as before. Preparation and completed series persist.

## Role evidence

The role compiler retains **13 usable annual TI tables and 1,351 hero/event rows**, with raw primary HTML cached in `scripts/data/hero-role-sources.json.gz` and compact runtime counts in `src/data/hero-role-evidence.json`. Run `python scripts/import-hero-roles.py` offline to rebuild from that cache. Builds and gameplay make no research requests. The ignored expanded HTML folder is optional.

Sources are Spectral's core/support classification crossed with safelane, mid and offlane, for TI2013–TI2019 and TI2021–TI2026; for example [TI2013](https://stats.ru.spectral.gg/lrg2/?league=ti3&mod=heroes-positions), [TI2015](https://stats.ru.spectral.gg/lrg2/?league=ti5&mod=heroes-positions) and [TI2026](https://stats.ru.spectral.gg/lrg2/?league=ti15&mod=heroes-positions). Lane swaps can make support lanes differ from true team farm-priority positions. These are event samples and **phase proxies**, not complete patch-wide or exact five-position professional datasets. TI2011/TI2012 lack usable tables here; there was no TI2020.

Opening composites use the preceding TI's evidence; pre-TI composites can use their own TI. Thus each simulated environment has an era role snapshot, without claiming teams see future tournament results. The latest nonempty row within three years is eligible. At least eight appearances are required; a role needs at least three appearances and a 15% share, with the largest role retained if necessary. Sparse recent evidence falls back to a reviewed estimate instead of reviving an obsolete role. Missing heroes use conventional catalog roles plus explicit era corrections. Future seasons keep the latest role prior, without claiming future observations.

Bounty Hunter had 11 offlane-core appearances out of 20 classified maps at TI2013, but 46 offlane-support appearances out of 48 at TI2015. Early offlane Bounty remains legal; modern Bounty is a support and cannot appear in the 2026 offlane ranking. Underlord is offlane. Tinker's later support transition is retained. Flex heroes are assigned across all five players jointly. Research gaps and estimates remain; this pass does not certify every hero's role in every historical subpatch.

Actual role eligibility is shared by manual drafting, both simulation workers, fixed-draft validation, the hero-pool UI, offline calibration and internal rankings. Backend reports highlight the ten strongest eligible heroes per role, with an explicit role-evidence column. Target-based strength estimates remain distinct from measured combat win rates and historical observations.

## Captain's Mode across composites

`src/captains-mode.ts` contains ordered ban/pick phases, mirrored for either first-pick side. The patch notes display the current rule and flag a change from the preceding composite.

| First composite | Rule | Bans per team by phase | Picks per team by phase |
|---|---|---|---|
| 2011.1 | TI1 | 2/2 | 3/2 |
| 2012.1 | restored five bans | 3/2 | 3/2 |
| 2013.1 | 6.75 | 2/3 | 3/2 |
| 2013.2 | 6.78c | 2/2/1 | 2/2/1 |
| 2016.2 | 6.87 | 2/2/1 | 2/2/1 |
| 2018.1 | 7.07 | 3/2/1 | 2/2/1 |
| 2020.1 | 7.25 | 4/1/1 | 2/2/1 |
| 2020.2 | 7.27 | 2/3/2 | 2/2/1 |
| 2021.1 | 7.29 | 2/3/2 | 2/2/1 |
| 2021.2 | 7.30 | 2/3/2 | 2/2/1 |
| 2023.2 | 7.34 | first pick 3/2/2; second pick 4/1/2 | 1/3/1 |

Official sources: [March 2012 five-ban restoration](https://store.steampowered.com/news/7489/), [6.75](https://store.steampowered.com/news/9016/), [6.78](https://store.steampowered.com/news/10779/), [6.87 exact order](https://www.dota2.com/687), [7.07](https://www.dota2.com/duelingfates/), [7.25](https://www.dota2.com/patches/7.25), [7.27](https://www.dota2.com/patches/7.27), [7.29](https://www.dota2.com/patches/7.29), [7.30](https://www.dota2.com/patches/7.30), [7.34](https://www.dota2.com/patches/7.34). Modern official responses are already in the patch-source cache. Early client order is reconstructed from available draft records and the subsequent changelog; it is less certain than the modern explicit sequence.

Rule changes are compressed into the game's two annual drops, rather than recreating every historical client update. Draft countdown/reserve times, historical side-selection procedures and a complete Captain's Mode eligibility/unlock archive remain unmodeled. The existing annual hero release pool still applies.

## Sybil adaptation and imperfect knowledge

The user-provided private [Project-Sybil](https://github.com/ybabts/Project-Sybil) was inspected at `c20ad00c96230aed5e73a2062910e2488ef99614`, together with the local Dota Drafter's role pipeline and overrides. Sybil's useful structure is adapted independently: separate versioned draft rules/data, legal assignment of flex heroes across players (at most 120 permutations), player familiarity and probabilistic suggestions. Its modern fitted role shares helped identify contemporary errors, but were not applied backwards across all years. No fitted Sybil weights, modern matchup table, credentials or full private model were bundled into the app.

The new engine uses **authored bounded strategic scores**, not a trained Sybil win-probability model: position fit, complementary control/healing, mobile targets, approach, preferences and actual campaign hero experience. Familiarity comes only from completed campaign maps, including earlier maps in the current series; it guides draft preference and does not add a fabricated combat proficiency bonus. Pre-campaign signature hero pools remain unknown.

Both sides use their own staff-limited patch estimate. Ban decisions assess threats through the acting team's research, without reading the opponent's private research. Unknown hero strengths, hidden truth rankings, calibration coefficients and perfect future matchup knowledge never enter draft scoring. Even maximum player attributes leave stochastic choice; creativity adjusts its spread. Combat then uses the real pinned patch and chosen heroes. Drafts change real match situations through existing hero statistics/archetypes, not a forced win percentage or generic draft-quality bonus. Exact Dota abilities/items and fitted historical pairwise synergy/counter datasets remain future work.

## Validation

Focused checks cover every composite plus future seasons, both first-pick orientations and negative seeds; unique picks/bans, five legal roles, scarce-role completion, manual/automatic combat equality, Ancient destruction, BO2 drafting, imperfect decisions, research separation, preparation normalization/save and actual-map familiarity. Checkpoint tests cover transient and persistent sync locks. Full-suite and browser results are recorded in the project handoff after verification.
