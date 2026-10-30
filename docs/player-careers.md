# Player individuality, careers and campaign usability

Implemented locally October 28, 2026. No publication or balance certification. The separate mobile application has not been changed.

## Research and design

The research informs which differences to model. It does **not** establish numerical ratings, ceilings, personalities or signature heroes for the entire professional database.

- [Topson’s Red Bull interview](https://www.redbull.com/au-en/topson-video-dota-2-og) describes a disruptive approach to mid play. This supports treating strategic preference separately from general mechanical ability. The implementation gives each identity individual tendencies; its numbers remain simulated.
- [GosuGamers’ direct interview with 33](https://www.gosugamers.net/dota2/features/70641-33-interview-it-s-going-to-take-some-time-to-get-the-playstyles-in-sync-) discusses methodical play, adapting between teams and contributions from teammates. This informs the separate leadership/adaptability contribution to chemistry. It does not justify a universal bonus for identical player styles.
- [GosuGamers’ TI3 interview with AdmiralBulldog](https://www.gosugamers.net/dota2/features/37417-admiralbulldog-i-am-usually-very-nervous-on-the-first-game) discusses Lone Druid specialization, communication and team preparation. This motivates trainable hero-specific expertise and retaining individual differences within a role. No unverified historical signature lists are assigned to other players.
- [Team Liquid’s interview with BSJ](https://teamliquid.com/news/2021/10/08/what-in-the-hell-is-a-dota-2-bsj-will-tell-you) explains distinct role demands and communication expertise. Leadership is therefore separate from the average of combat skills.
- [Stafford and Vaci’s learning-curve review](https://journals.sagepub.com/doi/10.1177/09637214211057841) separates initial performance, learning rate and eventual performance, and describes diminishing returns from practice. The chosen thresholds and numerical curves below are authored game rules, not fitted esports research. Unknown real ages remain unknown; no birthdays or age-based retirement dates are invented.
- [OpenDota’s API documentation](https://opendota.apidocumentation.com/) distinguishes player hero histories from general hero strength. This supports using actual campaign hero appearances separately from the patch’s underlying hero balance. Runtime gameplay makes no OpenDota requests or modern-stat backfills into early campaigns.

## Individuality and mastery

New historical players retain the requested 15–40 starting attributes. Each displayed playstyle now varies around its role template by a stable identity-specific offset, bounded to 1–10. Existing saved playstyles and selected training choices are preserved verbatim. Leadership (1–10), adaptability (1–10), learning pace (85–115%) and development outlook derive deterministically from the exact player ID, so renames do not reroll them. Leadership/adaptability add a bounded communication component to the existing team synergy calculation; the coordination input retains its existing ±0.04 cap. Newly prepared matches use it for controller decisions rather than hero power.

Every currently available hero has simulated comfort. Three role-suitable preferences, the Hero pool attribute, explicit hero-practice credits and recorded appearances contribute. Historical hero release pools and current-era roles apply; future heroes are not shown. These are simulated affinities, not claims that a named professional historically played a hero.

Mastery ranges from 0–100. `(mastery − 50) / 10`, clamped to **−2 through +4 controller skill points**, adjusts the decision inputs for Laning, Teamfights, Skirmish and Farming. Both managed and AI sides receive it in newly prepared legacy/tournament/scrim/All-Star configurations; unscouted and synthetic bot players do not gain fabricated mastery. Opponent private mastery is excluded from live vision snapshots and ban scoring; public recorded hero appearances remain usable.

Mastery is pinned in the prepared configuration. Competitive event appearances count once their event settles, avoiding changing controller skill between AI worker batches within a running event. Completed scrims count; exhibitions do not. Draft familiarity retains the existing campaign-map rules. Recorded player scoreboards retain the exact map’s mastery and distinguish decision-only handling from older numerical execution rules. Old scores without it remain unknown. Old prepared configurations retain their previous behavior.

Training offers one hero focus using the existing practice schedule. Ten effective hours are required; a normal 20-hour week adds one training credit, up to two before fatigue adjustment. Gains slow proportionally toward the **40-credit** cap. Full Rest, unavailable heroes and insufficient effective hours give no hero-training credit. Paid-week settlement is shared by both clocks. Match familiarity and practice credits are distinct, and selecting a focus never advances time or awards immediate gains.

## Shared hero kits and player control — October 28 correction

New preparations carry `playerControl: 1`. Player attributes, hero mastery, conditional skill innates, team coordination, form, fatigue and morale influence **how the AI controls its hero**. They do not scale that hero’s damage, HP, movement speed, spell output, cooldowns, XP awards or gold bounty for an identical action. The hero, era, level, items and chosen shared talents/facets still determine the kit; those existing choice systems retain their separate rules.

Laning helps the controller wait for genuine last-hit windows and notice denies. Farming helps it select available last hits and camps. Teamfights changes spell consideration timing, ally-save priorities, channel interrupts and overlapping disables. Skirmish, Intuition, Vision and Pushing influence visible-target assessment, retreat, tactical response and open-building decisions. Better players may earn more gold by securing more real last hits; each identical last hit still pays the same amount. All ratings can attempt the same legal actions. Existing release/position eligibility and draft rules are unchanged.

Spell and target decision intervals use `max(1.2, 4.8 − skill × .032 + fatigue × 1.2 + lowMorale × .6 + stabilityVariation)` game seconds. Recognizing selected opportunities uses probability `.35 + skill / 165`, capped by the 0–99 skill range. Mastery and conditional innate points affect these inputs, and context bonuses use the existing 0.008-per-skill-point conversion, bounded by the final 0–99 controller rating. Historical lineup evidence therefore estimates controller competence rather than changing hero power. Deterministic controller rolls do not consume combat RNG or reveal hidden enemies. These are authored, bounded AI rules, not measured professional reaction times or a learned AI model.

Already-prepared maps without the optional control version keep their original numerical rules, as do their archived results. All newly prepared match paths and both worker paths use the new controller. Calibration signatures include the control version; previous balance outputs cannot silently certify this engine. Existing calibration jobs and files are preserved.

## Career development

Positive attribute gains remain unchanged through 45. Above 45, per-skill ceilings are the player’s 65–90 base outlook plus a stable −4 through +4 variation, bounded at 99. Gains taper using `learningPace × ((ceiling − current) / (ceiling − 45))^1.5`, with the ratio bounded to 0–1. A skill at or above its ceiling receives no further positive gain; existing higher ratings are retained. Rust, Rest, energy, debt, contracts, coaching, sponsor effects and innate limits remain active.

The same calculation drives actual development, Training text, profile previews, innate previews and bootcamp incremental gains. AI players use the same curve. Career paid-week counters do not award retrospective growth on load. This reduces linear veteran inflation without changing the requested initial rating scale. Retirement, individual sourced ages and procedural future-player generation remain separate future work.

## Recruitment and AI clubs

Player scouting now has role/search/wage/free-agent filters, sorting, a saved 100-player shortlist and 30-row paging. Compare opens a focused side-by-side attribute table, actual outgoing starter, synergy/team-rating changes, fees and severance, weekly payroll change, total recruit cost and additional eight-week cost. The cash forecast uses a replaced-roster scenario and current sponsor expiries; prizes and future deals are excluded. Negotiated bonuses/terms can change the displayed asking-price scenario. Negative payroll changes remain savings rather than being clamped away.

AI budgets initialize on the next paid week with simulated club support and finite reserves. Each paid week settles support and market-valued payroll exactly once. Registered tournament prizes and managed-club buyouts credit the appropriate AI club once. Every four paid weeks, at most two AI clubs can recruit an unowned player with an improvement of at least three OVR, sufficient money after fees for four weeks of payroll, and affordable ongoing wages. Managed/protected players are excluded. Any active registered tournament or prepared scrim defers AI roster moves. Annual historical imports retain their existing reconciliation rules.

Cash-backed competing free-agent offers use the same improvement/reserve/affordability constraints and raise the player’s minimum negotiated package. They do not reserve or spend another club’s money before an actual signing. Club finances and the latest twelve AI transfers are available in Teams. This is a small AI economy, not complete agent negotiations, staff/media management or independent welfare simulation for every club.

## Desk and save library

All Desk eras now show up to three ranked decisions. Resignation notices, vacancies and imminent debt outrank routine scheduling; renewal deadlines and fatigue also link to the relevant action. Read/archive choices do not conceal the underlying problem. The panel never advances time or changes campaign state.

The campaign library imports native `.json` exports or raw campaign JSON into a **new independent slot**. It rejects unsupported formats, malformed player data and files above 32 MB. Export downloads a versioned, portable JSON file. No accounts or cloud service are involved.

Saves larger than 200,000 characters use pinned `lz-string` 1.5.0 UTF-16 compression. Each slot also keeps one compressed prior-date backup; within the same date, repeated autosaves retain that backup. The entire slot replacement is atomic. Quota failure preserves the old record and the existing save warning/exit protection. The original legacy save is still archived verbatim, and the compatibility mirror is best-effort.

Reading a damaged main record may expose a valid backup without rewriting storage. Loading that recovered backup or restoring a normal backup creates a separate slot, preserving the original record. This is recovery against a damaged latest payload, not a replacement for exported files: clearing browser storage can remove both versions. The mobile copy’s storage and application code remain separate.

## Era meta pull on playstyles — October 30, 2026

Source: `src/meta-style.ts`. Tests: `tests/meta-style.test.ts`. Game rules, not sourced claims about how any real player's style changed.

- **Style to patch axis:** Farming carry → economy, Tempo carry and Roaming → tempo, Aggression → laning, Split pushing → splitpush, Teamfight, Initiation and Save support → teamfight, Vision control → vision.
- **Pull:** an axis's value against the average of that patch's seven axes, ÷ 25, clamped to −1..1. Patch axes average about 70, so measuring against 50 would push every style up.
- **Drift:** at each post-TI shuffle, every player's styles move by the average pull of that year's two patches × 0.6 × (0.2 + 0.8 × adaptability/10). Adaptability 10 moves up to 0.6 a season; adaptability 1 moves about a quarter of that. Applied once per year with the shuffle.
- **Meta fit:** strong styles (above 5.5) on favoured axes add, and strong styles on unfavoured axes subtract. The result is up to ±2 decision-skill points for both sides in legacy events and dated tournaments, read only under player control (`BattlePlayer.metaFit`). Scrims, All-Star and the bot challenge don't use it.
- **Measured (100 players, 2011–2026):** the average style stays at 6.7. Styles at 10 go from 13% to 17%. In 2011.1 meta fit spans −0.54 to 0.57 (about ±1.1 points). An adaptability-10 player's Split pushing fell from 4.7 to 2.5; an adaptability-1 player barely moved.
- **Limits:**
  - Later starts don't replay earlier seasons' drift. A 2016 start begins from templates.
  - Seasons after 2026 have no shuffle, so they have no drift.
  - Synergy picks up the new styles automatically.
  - Not balance-calibrated.

## Validation and limits

The decision-only correction passes **511 shared tests**, including nine new controller cases for equal kits, identical attacks/named spells/resources, reaction timing, genuine last hits, innate decision inputs, old-preparation compatibility and live determinism. TypeScript, the isolated production build and both compiled-worker guards pass. A saved pre-correction battle engine and current numerical compatibility mode produce equal 2:00 snapshots. The historical-favorite/upset and actual AI-worker/watched equality regressions also pass.

Current fingerprinted reports under `.local/player-control-final-quality/` complete **20 actual maps** across 2011/2025 and **104 dated management weeks**, with no simulation failures and unchanged inputs. The dated policy retains the scope limits below. The compiled browser worker at disposable port 5383 completes a **31:42** Ancient-destruction map, records decision-only mastery with zero numerical skill bonus and reports no errors; its managed-team vision correctly omits hidden opponents. The tournament worker module loads. These checks confirm functionality, not statistical balance. Production build, logs and receipts remain under `.local/player-control-*`.

The validation below describes the earlier career feature snapshot. Its combat receipts precede the decision-only correction and do not certify the changed engine. Current correction checks are recorded in the project handoff and `.local/player-control-*`.

The full shared suite passes **502 tests**, including twelve new career/recruitment/AI/priority/portable-save cases. Existing fixtures now isolate early training from late-career tapering, include the communication component, and pin the hero draft when checking a pure patch multiplier. TypeScript and the isolated production build pass, with the existing large-chunk warning. Both production workers pass JavaScript packaging/syntax checks.

`npm run audit:campaign -- --year 2011` runs disposable, seeded actual legacy series for one complete season plus 52 dated management weeks. Repeatable 2011/2018/2025 reports live under `.local/player-career-quality/`; their source fingerprints must remain unchanged. Together they complete **30 real maps** with no simulation failures and 156 dated paid weeks. The final representative runs reach TI in 2011 and 2018 and miss it in 2025. The dated-management policy does not play dated tournaments or arrange the requested scrims, and records actual welfare departures rather than suppressing them. Those smoke audits do not certify hero rates, side bias or every era.

Compiled browser checks use disposable port 5382 and a generated Career QA file: import, one paid week of hero practice, autosave/reload, portable export, and previous-date backup retention. The exported state retains July 20, 2026, $92,250, one paid week and one Juggernaut credit, with 51 AI club ledgers. Desktop/phone recruitment, sorting/shortlist/comparison and mastery details are reviewed separately. Normal and hosted campaigns were never loaded or changed. Existing calibration folders/jobs remain untouched, no coefficients are applied, and **combat balance remains uncertified**.

The compiled production live worker also completes a mastery-bearing 2025 map in **33:17**, ending with an Ancient at zero HP and no reported errors; the tournament worker module loads. Browser backup recovery preserves the newer July 20 campaign while creating an independent July 13 copy. Phone checks at 390px/320px show contained recruitment layouts. Screenshots and worker receipts are retained under `.local/player-career-*`.
