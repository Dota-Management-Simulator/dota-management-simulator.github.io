**October 28 player-control correction, local:** newly prepared matches use player skills, mastery and conditional skill innates for AI decisions, with equal hero stats/action output and per-action rewards. Frozen older preparations retain their original rules. See [controller rules and limits](player-careers.md#shared-hero-kits-and-player-control--october-28-correction). No publication; balance remains uncertified.

**October 28 player careers and campaign usability, local:** individual new-player playstyles, simulated leadership/adaptability and learning curves, trainable hero mastery in new matches, recruitment comparisons/shortlists/affordability, finite AI budgets/free-agent activity, actionable Desk priorities and portable JSON saves/compressed backups are implemented. Existing saved ratings/styles and archives are preserved. See [research, rules, campaign audits and limits](player-careers.md). Balance remains uncertified; no publication. Earlier future-work descriptions below are historical context.

**October 27 mobile controls follow-up:** The separate mobile copy now has 48px touch targets, right-side primary actions and portrait/landscape navigation and combat layouts. Version 0.2.0/build 2 passes 479 tests, era/page layout checks and compiled save/reload/package checks. Desktop source and deployment remain separate.

**October 27 mobile direction:** The user requested a separate downloadable app for Android and iPhone. Work is in the sibling **Aegis Manager Mobile** copy: Android debug APK, native iOS project and installable/offline web build, with isolated mobile saves. iPhone compilation/signing and physical-phone QA remain. The desktop source/deployment remains separate; this does not authorize unrelated roadmap work.

# Product vision and future plans

**October 27 combat update, local:** approved slower playback and optional event pauses, prominent manual buyback, exact ward orders/previews and support-bot warding, managed-team-only live/replay vision, the full tower/barracks/super/mega loop, additional supported hero saves/dispels and a phone-specific combat layout. The 27-call catalogue exposes coach/skill and permanent competitive-victory unlocks in Squad/preparation/live. Eight exported terrain/building eras and three approximate pre-7.00 traced terrains share visibility and tree-safe movement. The proposed explanation feed was rejected. All 477 tests, TypeScript/isolated build and desktop/390px/320px real-worker checks pass; a compiled worker completes a 56:37 map. Balance remains uncertified; no publication or normal-save/job changes. See [combat behavior and validation](combat-experience.md) and [terrain accuracy limits](map-terrain.md).

**October 26 player innate correction, local:** the user requested skills, development, morale and teammate support instead of direct hero buffs. The 100-entry v2 pool now has 54 conditional skill innates (27 support teammates), 26 training/mentoring, nine morale, four campaign-recovery and seven effective-attribute innates. Weekly caps/Rest/contracts/debt/bootcamp previews and real nearby same-lane skill support are enforced. IDs and talent trees migrate without rerolling; old match snapshots remain. All 447 tests, TypeScript and isolated build pass; disposable training/reload/live-worker/narrow checks pass. No publication; balance uncertified. [Current rules](player-identities.md).

**October 26 player identity, local:** the requested player systems now include 100 permanent simulated innates with stable low-overlap assignment, varied saved trees from 16 shared talent templates and stronger specialty ranks, and temporary role-based player facets with per-map preparation. Existing map-level talent progression and selected old-save bonuses remain. Innates/facets start in 2024.2; facets retire in the 2026.1 composite (ending at 7.41c), while innates continue. Real engine effects and recorded identities work across match paths, with profile/catalogue/live/post-game UI. All 433 tests, TypeScript, isolated build, real-worker and narrow browser checks pass. Balance remains uncertified; no publication. See [rules, compatibility and limits](player-identities.md).

**October 26 current-version publication:** source `6e929e9`, Pages `db9485e` publish the current launcher/local campaign library/all-era save-exit, client/match/patch/map/history/welfare and preparation/finance work. All 417 tests and TypeScript/build pass locally and in Actions; Pages, the exact deployed tree, public assets/workers and isolated production campaign flows are verified. A production-only worker packaging failure was corrected and now has a build guard. Balance remains incomplete and is not activated; the previous process is no longer observed while its preserved status says fitting. See [release verification and limits](github-pages.md#october-26-2026-current-version-release). Earlier local feature entries are development snapshots.

**October 26 sports-manager concepts, local:** finite paid bootcamps now layer on existing individual training, with development/energy tradeoffs, protected Rest/contracts, fatigue checks, refunds and retained participant reports. Finances adds sponsor-expiry-aware baseline/scenario cash projections to assess preparation without assumed prizes. Five follow-up improvements address exact player previews, completion feedback, payroll affordability, forecast explanations and mobile controls. All 410 shared tests, TypeScript/isolated build and full-client/narrow browser checks pass. These are adapted game systems, not historical assessments; strategy secrecy, full coordination and dynamic financial forecasting remain future work. See [research, five-point review, rules and limits](management-planning.md). Not published.

**October 25 patch-mechanics balance, local:** actual siege/resource/TP rules now have public per-composite deltas; historical percent/flat mana regen and 7.07/7.20 formula transitions are corrected. Fresh six-worker full-engine tuning is running across all 32 phases with stronger completion/hero/side/duration gates and an independent final holdout before activation. Two 512-map pilots complete with zero stalls; **balance remains pending**, not certified. Tests/build pass. See [current command, progress and acceptance rules](mechanics-balance.md); preserve process 69740 and its `.local/mechanics-hero-balance/` output.

**October 25 identity and resources, local:** basic hero identity, HP/mana regeneration, recovery consumables and paid TP channels now run in the shared match engine, with short spell/item guides. All 385 tests, TypeScript/production build and CRLF-aware diff checks pass. See [combat identity and resources](combat-identity.md) for supported behavior and remaining unique-mechanic/TP limitations. Not published; balance remains uncertified.

**October 25 siege/high ground, local:** patched matches now require real creep-enabled siege windows, with backdoor healing/reduction, manual and optional automatic Glyph, catapult waves, approximate elevation/shared sight, real denies and historical buyback costs/penalties. Glyph preference persists; live/replay defenses and saved DN/BB expose behavior. Source attack ranges, Take Aim, Nether Blast, Liquid Fire, Dragon Form, representative Serpent Wards and directional wave clear distinguish hero siege/defense strengths. Push AI converts building windows; no patched timed Ancient damage. All 385 shared tests, TypeScript/build/diff checks pass, all 32 composites complete a seeded sample, and real-worker desktop/390px/320px checks pass. Balance remains uncertified; jobs and existing results/saves are preserved. [Sources, adaptations and limits](match-rules.md). Not published.

**October 25 modern breakdown follow-up, local:** modern player analysis now has ten hero portraits, Combat/Economy controls and paired comparisons, with persistent selections and direct links to each player's visual item progression. Pause-model preference survives navigation. Archive limits remain explicit. TypeScript/isolated build/diff checks pass; 22/24 focused tests pass, with two concurrent engine match-completion failures before settlement assertions. Desktop/390px/320px UI checks and historical practice-map reopening pass. [Details](post-game.md#modern-breakdown-follow-up--october-25-2026). Not published.

**October 25 current-client results correction, local:** modern post-game screens now follow an inspected 2026 capture with ten animated hero columns in one row, top horizontal tabs, compact winning-side/score header and dense item/stat scoreboards. Recorded Performance and existing click-through breakdowns remain. Earlier eras and profile histories are preserved; no rank/Plus/cosmetic data is invented. The implementation snapshot passes 340 tests and TypeScript/build; desktop/390px/320px visual checks pass. A stable 5353 recorded-result preview is isolated from concurrent combat edits. [Sources and limits](post-game.md#current-client-correction--october-25-2026). Not published.

**October 25 player welfare, local:** managed players now have individual expectations for competitive win rate, free time and scrim/training mix, demanding personalities and simulated teammate friction. Weekly concern/notice/recovery/quit transitions and inbox messages give the manager time to intervene; meetings ease tension without erasing unmet demands. Historical roster observations have a modest, source-linked effect on patience, excluding future knowledge, ambiguous years and whole-core moves. Kicks show exact existing severance and leave recruitable vacancies; zero-to-five-player saves remain valid and competition requires a rebuilt five. Tournament/prepared-scrim locks remain. All 340 shared tests, TypeScript/isolated build and CRLF-aware diff checks pass, including the earlier qualifier regression; desktop/390px/320px browser QA passes. See [sources, behavior and limits](player-welfare.md). Not published; AI clubs retain their existing shuffle system.

**October 25 post-game/profile history, local:** era-specific Dota-style results now provide clickable player lineups/breakdowns, sortable scoreboards, recorded graphs, item progression and draft/call tabs. My profile and player profiles index saved tournament/practice/exhibition maps, preserve event identity and reopen the selected map in its historical presentation. Practice remains outside competitive career statistics; no save/combat/settlement changes. Forty-two focused tests and TypeScript/build pass; shared full suite is 337/338 with an unrelated concurrent welfare/qualifier fixture failure. Desktop and actual 390px/320px QA pass. See [sources, limits and validation](post-game.md). Not published.

**October 24 Battle Pass publication:** the requested reward experience is live: source `bd23b9b`, Pages `8e2acca`. The committed snapshot passes 291 tests/build and GitHub Actions; Pages is built, all 2,194 deployed files match, and public assets/workers plus the live reward/search/animation/tournament screens are verified. The existing hosted campaign is preserved. The authorized Discord summary was delivered. Earlier development labels are snapshots; see [release details](github-pages.md#october-24-2026-battle-pass-release).

**October 24 Battle Pass reward experience:** the user expanded the request to the actual sets, Arcanas, Personas and scrolling reward menus. All eleven passes now open a cosmetic highlight stage and provide a reward track, searchable/filterable collection, treasure gallery, alternate artwork and on-demand original animation previews: 237 entries, 422 sourced local illustrations and 192 verified clips. Tournament chapters remain available. Original unlock levels are historical information; purchasing, random openings, ownership and earned cosmetic progression are not added. All 291 tests/build pass, with desktop/390px/320px browser QA. See [sources, coverage and limits](tournament-battle-passes.md).

**October 24 tournament Battle Pass companions:** all eleven advertised Reborn passes, including the Fall 2015 Compendium, open Home plus tournament/teams/schedule/prizes/results chapters, using pinned campaign data and exact Calendar links. The visual follow-up replaces the generic book modal with full-screen period palettes, horizontal or side navigation, original Valve artwork and chapter tiles. Seasonal guides are explicit manager adaptations; cosmetic progression, wagering and fantasy remain outside this feature. All 287 tests and the production build pass; all eleven passes and desktop/390px/320px layouts were reviewed on 5338. See [behavior, sources and limits](tournament-battle-passes.md). This pass initiated no publication.

**October 24 publication:** at the user’s request, all completed client/menu/event/TI, hero gallery, draft grid, era-map/path/speed, sponsor-negotiator and Arcade work is published, including the smooth-playback follow-up and legacy weekly-inbox date fix. Final application source `95380d0`, Pages `e46ee9b`: 279 tests/build and Actions pass; Pages is built, the deployed tree matches the isolated build and public files/workers pass SHA-256 checks. Hosted Atlas Esports retains week 4, $90,000, its roster and saved result. The authorized Discord summary was delivered (HTTP 200). Earlier local notes are implementation snapshots; the local patch preview remains DEV-only. See [release verification](github-pages.md).

**October 24 match smoothness, local:** live and replay maps now animate unit positions at the browser's animation-frame rate, reusing terrain/artwork and avoiding management UI renders on animation frames. Recorded playback halves UI update frequency and uses binary frame lookup; the simulation's ticks, cadence, orders and outcomes stay unchanged. The local live fixture improved from about 4.5 to 60–63 map updates/s. Tests/build and real-worker pause/step/order/replay checks pass. See [measurements and limits](simulation.md#october-24-match-playback-optimization-local). Not published.

**October 24 sponsor negotiator, local:** Taylor Mercer can be hired in Staff at $400/week (four-week cash reserve, no fee). New sponsor budgets rise 15%; Finances ranks eligible brands on matching length/media terms, shows pay/bonus/total, extra support, benefits/media costs and a portfolio comparison after the negotiator wage. Suggested terms stay editable and require explicit signing. Existing deals survive release, old saves use existing fields, and the role grants no tactical research. All 267 tests and the production build pass (existing chunk warning); 5330 sandbox QA covers hiring, review/signing, release and 390px/320px. See [rules and validation](sponsors.md). Not published.

**October 24 draft preparation hero grid, local:** role dropdowns are replaced by five position slots and a searchable portrait grid, with a full-pool priority-ban mode, selection markers and six-ban limit. Existing staff plans, preparation saves and manual/fast draft flows remain. Era roles and hero availability use the event's pinned pool. See [draft preparation](drafting.md). Not published.

**October 23 hero model gallery, local:** the user requested Dota-style models in **Heroes**. Selecting an unlocked hero now opens their animated Valve render and existing uncertain scouting report beside a portrait gallery. Search, era roles and position/strength sorting remain; pause/still, reduced motion, media fallbacks and phone layouts are supported. All 127 catalogued model URLs are verified; larger assets stream on selection. All 247 tests and TypeScript/build pass. No gameplay/save changes or publication. See [behavior, sources and validation](heroes-preseason.md).

**October 23 evolving Dota menus, local:** the user requested a Dota client feel, then supplied classic-client/7.00 references and asked for menus that change with updates. The active composite now chooses Classic, Reborn (`2016.1`), New Journey (`2017.1`), later hero showcase (`2018.1`), Frontiers styling (`2023.1`) or explicit alternate future. Classic bulletin/office panels and Reborn profile/banner layouts differ structurally. Valve artwork, current patch/hero arrivals, top tabs and persistent campaign controls retain all management actions. Historical release dates remain distinct from compressed game dates. No saved theme field, simulation or economy changes; existing worker locks remain. All 245 tests/build pass, with isolated real Continue/reload and responsive era QA. See [UI, boundaries, sources and limits](dota-menu.md). Not published.

**October 23 Heroes and preparation month, local:** dedicated **Heroes** tab with uncertain strength bars, current-patch release/role filtering, search and sorting. General 16-point observations narrow to existing four-point discovered-favorite reads; these catalog observations do not change drafting/combat. Patch summaries now show labelled current/previous range bars. New dated campaigns begin one calendar month before that year's catalogued TI; uncatalogued/cancelled years keep January 1. Existing dates remain intact, while preparation pays/trains through the normal weekly clock. All 227 tests and build pass; isolated 5322 UI QA checks reload, real Continue, a patch crossing and desktop/390px light/dark layouts. See [rules and limits](heroes-preseason.md). Not published.

**October 23 live tactics/items, local:** maps now offer three prepared reusable calls in each early/mid/late phase, saved builds, a live order-capable worker, automatic tactical decisions, actual six-slot inventories, patch-dependent item estimates, BKB, dropped Rapier and Roshan/Aegis. Orders affect real movement/combat and consume travel/farm time; skip continues the same state. Staff/attributes unlock advanced calls. The 8,256-map pilot preserves player-strength direction but finds material hero-rate drift: balance is not certified. Existing CPU work stays alive, with fresh all-phase calibration queued separately under `.local/tactical-hero-balance/`. All 223 tests/build pass; 5321 UI QA covers real settlement, phases, purchases/reload and narrow light/dark layouts. Exact spells, full shop history/recipes, terrain/wards and learned coordination remain future work. See [rules and limits](tactics-items.md). Not published.

**October 23 team scouting publication:** application source `f685624`, Pages `b41eb77` publish next-series scouting, team profiles and staff draft preparation. The automatic workflow, Pages build and public asset/worker SHA-256 checks pass; hosted Atlas Esports retains week 4, $90,000 and its five players. All 210 tests/build pass. The requested Discord summary was delivered (HTTP 200). The local scouting note below is a pre-release snapshot. See [release verification](github-pages.md).

**October 23 team scouting and preparation, local:** added **Scout your next series** with the actual registered opponent and pinned lineup/patch, plus a searchable **Teams** directory and individual profiles. Basic reports use saved public results; employed coaches/analysts/scouts add specialist insights and legal suggested preparation, available in the scouting view and before managed maps. Applied plans persist and remain editable without advancing time or changing combat attributes. All 210 tests and the build pass; isolated 5313 QA covers real worker drafting/settlement, records, reload and desktop/390px light/dark layouts. No publication; the separate balance run remains alive. See [team scouting](team-scouting.md).

**October 23 observed meta correction, local:** historical observations now inform internal targets in 15 of 32 phases; 17 remain estimates. Full TI2026 drafts and a dated professional opening sample replace the authored Anti-Mage boosts. Same-phase source selection, count validation, sample shrinkage and target bounds retain raw history separately. Rankings show historical picks/bans and keep measured engine drift visible. The ongoing CPU batch is preserved; a queued successor revalidates the new targets after it finishes. All 202 application tests, four Python importer tests and the build pass. See [sources and limits](historical-meta.md). Not published.

**October 23 historical roles and match drafting, local:** the user approved two modes before each map: follow saved preparation through a fast visible pick/ban sequence, or draft manually. Both workers share era roles, changing Captain's Mode sequences, legal flex assignment and imperfect staff-limited meta knowledge. Thirteen TI role tables inform 1,351 hero/event rows; other roles remain labeled estimates. Completed results retain drafts; preparation survives reload. Sybil-inspired structure is adapted independently, without claiming its fitted win probabilities. All 198 tests/build pass; isolated 5312 QA covers actual workers, BO3 mode switching, archive reload, 14-ban modern rules and mobile light/dark layouts. A new CPU balance run revalidates all phases after the earlier run stopped on a checkpoint lock. See [drafting](drafting.md) and [current calibration](hero-balance.md). No publication in this pass.

**October 23 saved training plans, local:** the user requested reusable training settings and variants. Training now stores named squad presets for focus, intensity, hours/day and days/week, with preview/apply, save-as-new variants, update/rename and deletion. Presets persist in the campaign, follow retained players and replacement roles, and respect current contract limits without advancing time. All 185 tests/build pass; isolated 5308 browser QA covers interactions, reload and light/dark desktop/phone layouts. Not published. See [training rules](training.md).

**October 23 iterative balance follow-up, local:** the user authorized further tuning in every patch and internal top-ten-per-role highlighting. `npm run balance:heroes -- --workers 12 --apply` runs four further fitting rounds plus 4,096 validation maps per phase, with up to three passes for unresolved phases. The current process and completed-map counts are recorded in `.local/hero-balance-rounds/status.json` and `progress.json`. Application code now keeps hero corrections outside the player-power limits so strong nerfs/buffs preserve skill progression; the batch was restarted against that engine. `src/hero-rankings.ts` and `npm run rank:heroes` provide eligible role-specific top tens, with gold-highlighted local HTML/JSON/CSV reports and separate candidate/active labels. No full-strength knowledge enters scouting. Do not claim balanced patches or applied coefficients before the program's final status confirms them. See [method](hero-balance.md). Not published.

**October 23 wider patch observations, local:** baseline axis ranges are now 35 points wide. Seeded random placement spans every legal integer lower bound, including truth at either endpoint, with stable reloads and nested specialist coverage. This supersedes the earlier 25-point and 12-point baselines. See [staff research](staff-research.md). Not published.

**October 23 historical hero balance, local:** every eligible hero has an internal 42–58% equal-team target for each phase; actual combat power is tuned by CPU-only full-engine batches. Two community count snapshots inform TI2015 and Shanghai Major 2016; other phases remain clearly provisional, and observed historical rates remain separate from capped gameplay targets. Staff now see uncertain win-rate ranges rather than power-bonus percentages. A 163,840-map batch and automatic local verification are running; `.local/hero-calibration/status.json` records actual progress, checks and any remaining imbalance. Do not infer completed calibration or a guaranteed campaign win-rate ceiling from the design target. See [method, sources and commands](hero-balance.md). Not published.

**October 23 local staff/research revamp:** patch truth is fixed; each team sees 12-point ranges and initially two favored heroes. Staff narrow only their specialties to 4–5 points or discover more heroes. Six roles include the existing coach/analyst/therapist plus economy coach, strategy scout and hero specialist. Both workers draft from their own perceived report, while combat uses actual patch values. The analyst's flat power bonus is removed. Hire/release/payroll and old saves remain compatible; reports are deterministic and never exact. All 160 tests and the build pass, plus isolated staffing/reload/light/dark and actual worker QA. Local, not published. See [staff research](staff-research.md).

**October 23 local patch system:** two numbered composites per TI season cover 2011–2026, with real source-version ranges, distinct priorities and strong heroes. Opening follows the shuffle; a second pre-TI drop changes drafting and actual lane combat. Events pin one patch for both workers; new managed/AI result archives retain patch labels. Tuning/hero priorities remain estimates, TI1 coverage is provisional, and future patches are explicitly generated. Existing saves/results remain intact. All 153 tests and the build pass. Not published. See [patch sources and rules](patches.md).

**October 23 published update:** source `54cbeea`, Pages `996ff33` publish the scoreboard restoration and tournament audit. All 145 application tests, 13 parser tests and the build pass. Pages and public asset/worker checksum checks pass; the hosted legacy campaign's week, finances, roster and saved scoreboards were preserved. The authorized Discord summary was delivered. The audit's **96 ready / 385 needing review / two scheduled** count supersedes older coverage counts. Earlier local/pending entries below are pre-release snapshots. See [release verification](github-pages.md).

**October 23 tournament audit — release pending:** corrected regular-group parsing, default wins and round headers, and restored post-match scoreboards. Current coverage is **96 ready / 385 needing review / two scheduled** after restricting sixteen formerly accepted events with unsupported or incomplete rules. All 145 application tests, 13 parser tests and the build pass; every ready event resolves eight alternate advancement paths. BO2/BO3 browser checks pass. Existing saves retain registered rules/results. See [findings and remaining limits](tournament-audit.md).

**October 22 local bugfix:** restored immediate post-series scoreboards for watched/skipped dated matches and reopening for managed/AI matches in active/completed events. TI1's historical BO1/BO3/BO5 lengths are verified, lower-round labels corrected, and round formats visible. All 142 tests/build pass; isolated browser QA completed TI1 and checked reload and narrow light/dark views. This fix has not been published. See [details](tournaments.md).

**October 22 latest publication:** source `d2197b2` and Pages `dc3c334` publish the Manager’s Desk/squad workspace, TI race and standings, and historical lineup strength/recent form. All 139 tests pass; Pages and public asset/worker SHA-256 checks pass. The hosted legacy campaign retained its week, finances, roster and results. The requested Discord release summary was delivered. Earlier local/unpublished labels are pre-release snapshots; historical coverage gaps and unentered-event world simulation remain outstanding. See [release verification](github-pages.md).

**October 22 publication:** the user requested pushing all current work. Source `ea8d84c` is on `main`; deployment `dd87c54` is live on GitHub Pages, with 99 passing tests, a successful production build and public asset/worker checks. A browser smoke check confirmed legacy campaign loading and saved-map Performance statistics. Earlier local/not-deployed statements in this roadmap are implementation snapshots superseded by this release. Historical coverage gaps, unimplemented roadmap features and documented portrait-rights limits remain; deployment does not establish photo reuse clearance. See [release verification](github-pages.md).

**October 22, 2026 — tournament work in progress:** the user approved major/tier-2 events and qualifiers, actual dates/times, era-specific qualification, full groups/brackets, placement payouts and tournament completion in all player contracts. The dated engine and 483 catalog records are local; 112 pass current stage/topology/payout checks. TI2011–2019, TI2021/2022 and TI2024 have main fields/groups/brackets. TI2023's recovered stages remain locked pending its tiebreak policy. A checked-in Valve cache now supplements the rate-limited community archive. The complete archive, most qualifiers, 2020 events, Swiss, world-event simulation and full DPC rules remain outstanding; see [coverage and limitations](tournaments.md). The partner's research is retained with date/currency corrections. No deployment has been made.

Context preserved from the user's design discussions and subsequent implementation choices. Last updated **2026-10-21**. This is a design backlog, not an instruction to build all of it or a promised implementation schedule. Start with [AGENTS.md](../AGENTS.md) for the current application and deployment.

## Explicit decisions already made

- Historical results should be a soft baseline for intact lineups, while management and subsequent campaign changes can alter the timeline. Implemented locally through roster-linked strength, continuity, actual-result form and shared AI/managed simulation. The manager uses the same rules; outcomes still come from the lane engine. Existing ratings/results remain intact. Exact event lineups and skipped-event world simulation remain incomplete. See [historical strength](historical-strength.md).

- Custom teams can upload a logo during setup. Organization settings now include logo uploads, a crest creator and editable primary/secondary colors for the managed club. A saved **Use team colors** checkbox controls app tinting independently of Light/Dark mode. Uploaded and bundled historical logos can supply suggested palettes; custom badges do not alter opponents. See [club branding](club-branding.md).
- Historical organization selection also previews team colors immediately, including the setup cards and artwork, before a campaign is started.

- Build a browser application with separate files/data/simulation modules, rather than only a standalone HTML file.
- Begin with a clean management scaffold and dummy players/stats, then incrementally fill in systems. The user likes the current UI.
- Include campaign setup, difficulty and a starting-era choice; the earliest/classic start is The International in 2011.
- Use real Dota hero names; keep initial balance values illustrative rather than claiming validated historical stats.
- Adapt the old lane simulation to determine results, show a watchable simulation, and allow skipping it.
- Results should show series scores, **K/D/A per hero, levels, and gold and XP graphs over the game**.
- Simulation heroes now use actual Valve minimap icons, with matching live-roster and scoreboard artwork. All 127 icons are bundled locally with exact hero-ID mapping, team rings, health bars and initials fallbacks. Modern artwork is not era-specific. This visual change remains local, not deployed; see [simulation notes](simulation.md).
- Use the 46 TI1-contested heroes at the opening, then add Dota 2 heroes in calendar-year batches at post-TI shuffles through 2026. This game rule includes late-year releases and is independent of Captain's Mode eligibility.
- Support dark mode and remember the preference.
- Training must offer every player-card attribute and playstyle, plus happiness and energy recovery, and player cards must open their profiles directly from Training. Implemented locally with grouped choices, weekly-effect previews and existing-save compatibility.
- Training now includes Light/Normal/Intense intensity, hours/day and days/week per player. More hours/intensity increase development and energy use; schedules respect contracted weekly-hour limits and protected rest. See [training rules](training.md) for formulas, previews and save compatibility.
- Sponsors now have a local sourced era catalog with 42 brands from Dota and other esports. The user requested global brand exclusivity, up to five sponsors per team, expiry before switching clubs, negotiation and sponsor-specific benefits. Implemented locally with simulated AI ownership, support/bonus/duration/media negotiations, fixed expiry, weekly effects and legacy-save compatibility. Real associations do not establish continuous contracts from 2012; current-only evidence uses conservative catalog years. See [sponsor rules and source ledger](sponsors.md).
- Publish the source publicly under the user's GitHub organization and host on GitHub Pages. The actual organization is **Dota-Management-Simulator**, owned by **Jonahbyu**; the earlier proposed name Dota-Team-Manager was superseded.
- Populate real players and teams in annual increments from 2011 through the present, including regional/tier-2 players. Load annual updates during the post-TI shuffle. Three era-specific signature heroes per player are deferred.
- Historical teams make up the world. Manage an original TI1 team or replace one with a custom club. Recruiting another club's player makes that club find an available regional replacement.
- Show historical team logos according to era, including sourced branding changes. The local implementation bundles 473 images for 408 of 463 club IDs; 55 unverified clubs use initials. Logo selection uses the displayed season or result year, with annual snapshot precision. Custom clubs use their own initials. See [team logo coverage](team-logos.md).
- Add as many sourced player photos as practical, including sources beyond Wikimedia. The local collection covers 1,022 identity records using 907 distinct source photos from Commons, Liquipedia and Spectral player cards. Exact player-ID matching, silhouette fallbacks and source/rights credits remain. These are single reference appearances, not year-by-year photos. The expansion has mixed rights, including Liquipedia-only restrictions and unverified reuse permission; it is not blanket publication clearance and remains local. See [portrait coverage and sources](player-portraits.md).

The initial request to avoid building was superseded by explicit requests to build the scaffold, add features and publish. It is not an ongoing prohibition. Conversely, the future concepts below are not blanket approval for a wholesale rebuild.

The user subsequently requested negotiation of pay/contracts and non-monetary commitments such as practice time. The local implementation now includes offers and counteroffers for current players and recruits, with weekly pay, bonuses, fixed duration, prize share, practice hours and protected rest days. Terms affect payroll, morale, development, energy, prize payouts and early replacement costs. Expiry retains the five on weekly terms pending renewal. See [contract mechanics](contracts.md).

## 1. Campaign: an alternate Dota history

### Requested vision

- Start at TI1 and support progression through TI26, then continue into future seasons with generated players and patches.
- Each TI ends a season, with tournaments and qualification leading up to it.
- **Making TI is not guaranteed.** Missing it should be a real, understandable campaign outcome.
- Historical rosters should be a starting framework. Management changes and different results can produce different TI champions and names on the Aegis.
- Post-TI roster shuffle is a major management period. Moves should resemble history with chances to diverge as the player's timeline changes.

### Present limits

The selector offers calendar years 2011–2036 with a compact 18-week/five-event placeholder calendar. Annual player/team imports cover 2011–2026, including TI fields and selected regional/closed qualifier references. The database grows from 100 opening identities/19 clubs to 1,641 identities through 2026. Hero releases grow from 46 opening heroes to 127. Later starts use completed prior-year batches. All original TI1 clubs and later reference clubs can be managed or replaced with a custom club. Imports preserve the manager's five/signings; regional replacements reconcile overlapping references. AI clubs outside later annual fields are archived without claiming historical disbandment. See [historical roster notes](historical-rosters.md) for sources, precision and coverage limits. Individual roles, exhaustive tier-2 coverage, retirement, historical events, accurate TI numbering and procedural generation remain pending. No historical TI occurred in 2020; its roster import uses online events while the game's separate calendar remains a placeholder.

### Decisions still needed

- Calendar/season granularity and the intended relationship between start year, TI edition and actual event dates.
- How faithfully qualification rules change by era versus a simplified unified system.
- How results, finances, reputation and relationships affect historical transfers, team formation, retirement and future generation.
- Resolved: both historical clubs and a custom replacement club are supported. Further decisions concern contracts, retirement and how later historical batches interact with the alternate timeline.

## 2. Tournament scheduling and preparation

The core tradeoff requested by the user is choosing **which tournaments to enter and when to bootcamp or rest**:

- Play to gain practice, confidence, money, qualification progress and momentum.
- Rest to recover stamina/readiness.
- Hide strategies so opponents have less information before important events.
- Bootcamp to develop skills, hero comfort, coordination or a new playstyle, at a stamina/financial cost.
- Arrive at qualifiers and TI prepared rather than automatically participating in everything.

Current weekly training/rest, event skips and elapsed-week finances provide a foundation. Team bootcamps, strategy secrecy, opponent scouting knowledge, explicit momentum, and richer fatigue scheduling remain to be designed. Avoid making one preparation option universally optimal.

## 3. Player attributes and development

Preserve the user's intended meanings:

| Attribute | Intended behavior |
| --- | --- |
| Creativity | Find ideas outside the meta; enable or multiply unconventional/off-meta hero strategies. The user suggested generating an off-meta opportunity for the manager. |
| Stability | Consistently perform near the player's level rather than swing wildly. |
| Confidence | Change how tournament tier/pressure affects stability and other performance. |
| Stamina | Sustain a dense game schedule; higher-tier matches and bootcamps should be more demanding. |
| Hero pool | Breadth of heroes a player can play; eventually distinguish amount of comfort from detailed hero proficiency. |
| Laning | Win lanes even with poor hero matchups. |
| Teamfights | Execute spells and coordinate full-team fights. |
| Farming | Collect gold efficiently and create item advantages. |
| Skirmish | Excel in fights involving fewer than both full teams. |
| Vision | Place good wards and deward the enemy. |
| Intuition | Read enemy movements, anticipate danger and survive. |
| Pushing | Keep waves in useful positions and deal tower damage. |
| Happiness | Overall morale and satisfaction; paying and treating players well should matter. |

Current profiles display 12 skills on 0–100 scales, plus happiness and energy. Some skills already affect the simplified engine; full distinct behaviors for all attributes are not implemented. Confidence changes after results but does not yet model tournament-tier pressure. The hero-pool number is not yet a per-hero proficiency database. Negotiated pay now affects weekly happiness, and contracted practice/rest changes development and recovery. Negotiation preferences are gameplay estimates derived from stamina/confidence.

Targeted weekly training covers all 12 skills, each displayed playstyle, happiness and energy recovery. Intensity, hours/day and days/week scale gains and energy costs within negotiated limits. As requested October 22, new campaign players and new arrivals start with varied **15–40** attributes; existing saves retain their ratings. Balanced now develops all 12 attributes slowly, while focused plans develop selected skills faster. Ten effective hours offset weekly rust; less practice, including full Rest, causes up to 0.20 decay per attribute. Energy below 40 reduces development. Opposition starters/reserves train weaker skills and rest when tired; free agents self-practice more lightly. Both clocks update shared players once per elapsed week. Attributes cap at 99 and playstyles at 10. See [training rules](training.md) for formulas, compatibility and AI limits. These are illustrative game rules, not historical assessments. Teammate effects, bootcamp gains, age-driven decline, potential and scouting uncertainty remain future work.

## 4. Playstyles are separate from player skills

The user wants a list of playstyles, rated **1–10** for all players, including historical players such as AdmiralBulldog, Arteezy and BuLba. AI-assisted bulk assessment was proposed for eventually populating ratings, subject to validation.

Examples discussed include farming carry, tempo carry, hard carry, roaming support, disabling support and save support. The current scaffold also shows aggression, initiation, split pushing, teamfight and vision control tendencies.

Weekly practice can now improve any playstyle shown on a player's profile, capped at 10. Teammate and bootcamp effects remain future work. Team fit and preferred strategies should matter separately from mechanical ability. The current ratings are gameplay placeholders and do not modify match outcomes. The final taxonomy, scoring definitions and deeper development interactions are still open.

## 5. Patches, hero tags and the evolving meta

**Latest direction, October 25:** keep two representative composites per season,
but make their public logs cover every recovered changed hero, named ability,
rework, talent, Scepter, Shard and item in concise terms. Public changes should
let the manager infer consequences; analyst/staff interpretation is a research
bonus. The local implementation adds full public logs, named ability cooldowns
and mana, historical hero/shop attributes, specific economy rules and a separate
live/replay spell panel for the allied five plus fading enemy casts. Exact unique
mechanics remain incomplete and early reference values remain provisional. See
[the overhaul coverage and limits](patch-overhaul.md). This supersedes the earlier
free-favorites and single-generic-spell descriptions below; it is not a claim
that every recorded historical change has full engine parity.

Local milestone follow-up (October 23): the patch screen now opens a single scrolling summary with hero arrivals, uncertain gameplay comparisons and simplified hero notes. The composite containing 7.00 unlocks per-player talent plans that activate at match levels 10/15/20/25. New Frontiers expands actual playable area by 40% and adds twelve finite neutral farm camps with travel/clearing costs. Both milestones introduce official embedded videos. These remain simplified systems on the compressed season calendar; see [rules and limits](patch-milestones.md).

The user does not want exhaustive patch notes. The idea is **one or two representative major patches per year/era**, attached to specific tournaments, with concise attributes and meta hero lists.

The current seven patch dimensions provide a starting schema:

1. Game tempo — patient scaling versus early pressure.
2. Farming economy — how rewarding resource accumulation is.
3. Lane importance — how strongly lanes shape the game.
4. Teamfight impact — value of full-team engagements versus pickoffs.
5. Objective pressure — converting map control into towers/objectives.
6. Vision advantage — the impact of map information.
7. Split-push viability — applying pressure away from the main team.

Heroes need tags for role and strategic properties, such as initiation, durability, control, saving, pushing, scaling and damage type. A patch changes hero strength and viable playstyles, not just a cosmetic version label. Player comfort and creativity should leave room for successful off-meta picks.

The local catalog now implements two composite patches per TI season from 2011–2026, actual effects for all seven priorities, patch-aware auto-drafting, featured hero power and one pinned patch per tournament. Valve version/release dates remain separate from compressed gameplay drop dates. Tuning, hero priorities, tags and abilities are estimates, not verified historical pick/win rankings. TI1 phases are provisional. Annual release pools still gate every draft; future patches are generated. Exact spells, inventory, wards and detailed historical balance reconstruction remain future work. See [patch coverage and mechanics](patches.md).

## 6. Drafting

Requested future direction: the manager drafts against a heuristic AI. The AI should combine general draft principles, patch/meta strength and team coherence.

Potential inputs from the discussion:

- Hero tags and complementary roles/abilities.
- Cohesive overall strategy and ability to execute it.
- Meta strength for the event's patch.
- Player hero proficiency and preferred playstyles.
- Creativity and off-meta opportunities.
- Opponent draft and what their composition threatens.

Draft quality should influence real match situations. A pushing composition needs a way to exploit objectives; a pickoff composition needs opportunities to isolate heroes. Interactive picks/bans and automatic preparation are now implemented per map, with historical rules, role fit, bounded composition/counter heuristics, campaign familiarity and uncertain patch reads. Creativity preserves varied choices. Exact hero spells/items, trained historical synergy/counter probabilities, richer explanations and combat hero proficiency remain future work. See [implemented drafting and limits](drafting.md).

## 7. Matches: current lane engine and future manager orders

### Implemented and explicitly approved

The old lane engine now determines best-of-three results. A map viewer shows the computed series, and the manager can pause, speed up or skip playback without changing the outcome. Per-game hero K/D/A, levels, resource graphs and results history exist. Keep these useful even if the simulation becomes more sophisticated.

**October 25 match announcements, local:** both viewers now show actual kill/objective events and kill-streak banners above the map, a ten-hero life strip and engine-derived respawn countdowns in the strip/side panels/rosters. Explicit sound activation plays original default Dota announcer clips. Replay event timestamps handle deaths and Aegis revivals between snapshots; telemetry remains outside saved scoreboards and changes no combat decisions or rewards. See [behavior, sources and verification](match-announcer.md). Not published.

### Original long-term tactical idea

- Map state includes positions, vision and towers.
- Matches unfold in phases/rounds. The manager issues a small number of plays per round, roughly two in the initial idea.
- Example plays: a top-jungle gank sweep, farming bottom, coordinated pushes, or moving players to create/defend an objective.
- Execution depends on player stats, enemy stats and the plays each side is attempting.
- Fight outcomes depend on participating heroes, gold/item advantage, teamfight skill, draft, positioning and other understandable factors.
- Rounds continue until an Ancient falls.

This is a future design direction, not permission to replace the newly approved auto-battle/skip flow with a large tactical UI immediately. Round duration, play catalog, player allocation, simultaneous-order resolution, information/vision model and how much direct manager control feels good are unresolved.

Good outcome explanations were suggested: show why a play succeeded or failed rather than burying the manager in hidden rolls. Detailed fight logs, actual inventory/items and exact Dota hero spells are not yet built.

## 8. Management and finances

The original summary identified management as the first playable foundation: team/free-agent rosters, training, staff, finance, wages, earnings, sponsors, schedules and standings.

Implemented: recruiting free agents or players from historical clubs to replace starters by position, regional replacement of departing opposition players, negotiated weekly wages/bonuses/duration/prize share/practice/rest with deterministic counteroffers, early replacement compensation, renewal and pay satisfaction, individual training/rest, three staff roles, sponsor offers/bonuses/reputation gates, a ledger, and basic happiness/readiness. See [contracts](contracts.md). Existing saves retain their original rolling terms until a deal is signed.

The local sponsor market now adds negotiated weekly support, bonuses, fixed terms and media obligations, global exclusive holders, five slots per club and expiry. Sponsor benefits alter weekly development/recovery/morale/reputation, with caps and training previews. Brand entry years and source associations are researched; contract finances, durations, assignments and benefits are illustrative. AI clubs participate in ownership, without a separate AI financial/training economy. Historical contract ends, exhaustive sponsorship archives and performance clauses remain future work. See [sponsors](sponsors.md).

Future work from the vision includes richer contract clauses and morale, staffing effects, team development, realistic scouting/roster movement, and preparation costs. Detailed standings, full tournament brackets, contract-driven automatic departures, agent personalities and staff upgrade/career systems are not implemented. Avoid importing the old prototype's flat per-match payouts or direct damage/HP staff bonuses without reconciling them with the new weekly economy and chosen design.

## 9. Suggested next discussions, not an approved sequence

Useful questions for the next feature conversation:

- Should we first improve simulation balance/explanations, campaign scheduling, manual drafting, or the historical data layer?
- Which systems must use verified history next, and which should stay fictional placeholders?
- What level of simulation detail is enough for management decisions to feel meaningful?
- How much historical roster fidelity should remain after the managed timeline diverges?

Engineering possibilities such as save export/import, multiple slots, persisted replays, more modular UI and eventually backend/accounts are **optional proposals**, not user-approved requirements. The selected annual player/team and hero-release layer through 2026 is implemented locally and has not yet been deployed. Signature heroes, deeper regional coverage and individual role/biography verification remain future data work.

## October 22, 2026: dated calendar and club inbox

The user requested a real calendar showing every tournament's full duration, clickable event entry/qualification and a useful inbox. The local month grid now consumes the tournament-history catalog directly, with inclusive event spans, overlapping bars and linked qualifier routes. Invitations and qualified/open-qualifier spots can be reserved without moving time; starting a run still applies the tournament engine's entry and scheduling checks. Pending historical verification stays visible and locked. Existing weekly saves can explicitly adopt the dated competition clock while retaining their club state and archive.

A persistent manager inbox now carries tournament invitations, registration/opening/missed-window notices, placement results, player renewal/expiry notices, sponsor opportunities/expiry and low-cash alerts. It supports unread badges, search, filters, read/archive state and links to relevant management actions. Invitation notifications use a simulated 28-day lead time rather than claiming verified historical announcement dates. UI time advancement stops at invited/reserved openings and scheduled series so the manager can make the decision. These features remain local. Details, save compatibility and limits are in [calendar and inbox rules](calendar-inbox.md).

The inbox now retires notifications when requirements change, an action is completed, or information becomes outdated. Expired notices no longer count as unread or expose obsolete actions; an Expired filter keeps their history and reason. Active reminders refresh their countdowns, and unresolved player renewals remain visible. This is implemented locally with optional metadata for existing saves; see the notification-expiry rules in [calendar and inbox](calendar-inbox.md).

## Player performance — October 22, 2026

Local player profiles now have a **Performance** section with campaign event ratings, GPM/XPM, KDA, kill participation, damage/healing/building damage, last hits, lane win rate and hero records, filtered by season/event/hero. These reflect actual saved campaign maps; no historical statistics are invented. New engine telemetry measures effective damage/healing and assigned-lane resource advantage at 10:00 without changing outcomes. AI tournament matches now preserve compact player scoreboards for scouting/career records, without timelines or replays. Old matches retain missing metrics as unknown. Wards/dewards explicitly remain unmodeled pending a real vision system. Rating formulas, samples and save compatibility are documented in [player performance](performance.md). This change is local and not deployed.
