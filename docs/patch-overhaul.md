# Public patch logs and named spell simulation

Implemented locally for review, October 25, 2026. Not published.

The later [hero identity and resources follow-up](combat-identity.md) adds
HP/mana/item/aura regeneration, consumable recovery, TP scroll channels,
distinct passives/attack buffs and short spell/item explanations. It supersedes
the earlier generic-effect descriptions below where the named mechanic is now
implemented; full Dota parity remains outside the current engine.

## Public facts and private interpretation

The patch page opens with a compact list of mechanical changes. General rules,
Heroes and Items have independent tabs, search and filters for balance,
cooldowns, reworks, Scepters, Shards and talents. General notes are grouped by
economy, tempo, objectives, map resources, vision and combat rules. Hero entries
include every recovered changed, campaign-eligible hero, independently of the
scouting shortlist. A named spell retains its subject and replacement behavior;
ordinary numerical buffs and nerfs are shortened without exposing calculations.
Individual historical releases remain identified inside each season composite.

No hired research staff means no free favorites shortlist. Relevant staff reveal
their covered axis interpretations; analysts/scouts/specialists discover
favorites. Practice observations continue to accumulate normally. The Heroes
gallery also hides estimates and excludes their values from strength sorting
until that hero has been researched or observed. Internal broad decision priors
still let unaided coaches make uncertain drafts; they are not displayed as an
analyst report. Commercial and recovery staff do not discover favorites.

## Historical data

`scripts/import-combat-history.mjs` retrieves SHA-addressed Valve game-file
mirrors from Dotabuff's `d2vpk`/`d2vpkr` repositories. The source cache is
`scripts/data/combat-history.json.gz`; builds and gameplay never fetch it.
`scripts/build-combat-history.mjs` compiles the runtime ability, hero and item
catalogue plus public changelogs. It also consumes the existing cached Valve
patch-note API and Valve Steam announcements. Repeated ability definitions are
interned; the public changelog loads separately from the main application.

Every eligible hero has a named kit in all 32 historical composites. Snapshot
differences supplement recovered notes for base attributes, ability replacements,
cooldowns and shop stats. They compare composite endpoints; intermediate changes
are preserved when source notes were recovered. Later explicit numerical changes
overlay stale snapshots only when released after that snapshot, with their source
URLs recorded. For example, the May 2023 mirror is corrected using subsequent
7.33 notes instead of ignoring later Dragon Slave cooldown changes.

**Early gap:** August 31, 2013 is the oldest recovered game-file snapshot.
2011–2013 phases use it as an explicitly provisional kit/cooldown reference;
recovered earlier announcements supply public changes but do not establish full
early-game parity. Both 2011 composites lack recovered primary change bullets.
Their opening kits and authored simulator rules remain visible. No “no changes”
claim is inferred from missing evidence. Modern names are used for historical
ability IDs when localization has since changed.

Two composites per season, annual hero release gates and tournament patch pins
remain. They deliberately compress several actual updates into one ruleset.
Fictional future seasons reuse the last known ability catalogue and retain their
generated balance axes; they do not claim newly researched future spells.

## Combat and economy

Patched maps use named learned abilities rather than the previous single random
9–12-second archetype spell. Basic skills follow a deterministic skill build;
ultimates require levels 6/12/18. Individual cooldowns and mana costs use source
rank values on the match clock. Mana regenerates and recovers at base/respawn.
The 1.2-game-second engine tick bounds cast scheduling; being ready does not force
a cast if mana, range, health or target conditions are unsuitable. The tempo axis
does not shorten named cooldowns. Legacy maps without patch metadata keep their
generic compatibility path.

Source damage, healing, control, slow, shield, movement and controlled-unit
properties drive scaled effects in the lane engine. Healing measures restored
HP; control and spell damage respect BKB protection. Passive spells do not
produce fake cast telemetry. Hero base attributes, growth and base attack damage
also vary by the catalogue. Existing player talent bonuses remain; choosing a
branch additionally enables supported spell modifications from the corresponding
historical hero branch when its tier unlocks. This extra branch behavior is
explained in the talent UI. Supported linked/absolute Scepter and Shard changes
require the corresponding purchased upgrade. Shards are consumed permanently
without occupying an inventory slot; their value remains in net worth. Merely
owning an upgrade does not add an unrelated blanket spell-power bonus.

Specific source economy changes are separate from the existing seven authored
balance axes: lane-bounty adjustments and 7:30 growth, 7.26's bounty reduction,
7.27/7.32 passive income, 7.31 neutral-bounty growth and 7.33's victim-net-worth /
participant assist formula. These affect actual earned gold and purchases.
Passive income no longer receives a farming-skill modifier on patched maps.
Opening constants and the compressed creep averages remain model estimates;
this is not an exhaustive reconstruction of every economy formula.

The historical shop supplies era prices and scaled attack/health/movement/spell
attributes. Live matches can prioritize an eligible item for the selected allied
player, spending earned match gold and respecting inventory limits. Scepter and
Shard availability follows the shop snapshot. The original item-specific BKB,
Mekansm, Wand, Force Staff and Blink behaviors remain simplified; other supported
actives use their scaled damage/healing/control. Automatic builds remain compact
and role-based, with eligible upgrade purchases. They do not optimize the entire
shop.

## Spell activity panel

Both live managed matches and tournament playback have a separate collapsible
Spell activity panel. It shows all five allied heroes, mana, spell icons,
learning/upgrade locks, readiness and remaining cooldowns. Cast highlights and
the fading enemy icon feed come from actual engine cast events. Enemy ready
times and mana are not exposed in that feed. Thirty game seconds of recent casts
are retained per frame, including intervening casts between replay samples.
Playback filters out future events. Pause and stepping use the actual match
clock, and larger playback speeds naturally compress visible events.

Icons use Valve's CDN and fall back to readable initials on failure. Older
replays without telemetry say it was not recorded. Spell state belongs to replay
frames, not final compact player scoreboards; saved results and campaign schema
do not require conversion.

## Explicit limits and balance

Historical notes have broader coverage than the engine's detailed mechanics.
Exact summoned units and illusions, channels, ability stealing, transformations,
individual facet/innate systems, many unique passives, precise projectile/area
geometry, dispel/debuff persistence and every structural talent/upgrade rework
are not fully reproduced. Controlled units currently add temporary attack
pressure rather than independently walking entities. Unknown active rules use
a bounded temporary combat abstraction. The coverage disclosure separates these
notes from implemented effects; a historical log entry does not certify full
mechanical parity. Generic player talent plans still coexist with supported
hero-branch changes; a full hero-specific talent editor is not implemented.

This overhaul changes match outcomes and invalidates earlier calibration.
`heroBalanceSignature` includes the combat-model version and a SHA-256 fingerprint
of each compiled ruleset. Old frozen CPU reports cannot activate for it. The
existing continuation queue was already `blocked-changed-inputs`; it was not
restarted. No simulation-balance certification is claimed.

## Validation

- Automated coverage checks every eligible hero/phase, source cooldowns,
  independent mana/cooldown scheduling, no passive casts, ultimate locks, real
  healing/damage, later-note overlays, talent branch gates, historical shop locks,
  item spending/ownership and actual net-worth assist rewards.
- Existing tests continue to cover both workers, pinned patches, live/skip speed
  equivalence, accepted tactical orders, old saves and compact career results.
- Browser QA uses only the disposable dev preview: full hero/item logs, Lina
  ability search, Black King Bar rework, a real drafted BO1 scrim worker, all five
  allied spell rows, enemy casts, pause, item-priority submission and 390/320px
  containment. Hosted campaigns and clock were not accessed.
- Final test/build counts and output sizes are recorded in the project handoff.

No commit, push, deployment, messages or balance-job restarts were initiated.


### Map-side layout follow-up — October 25

Allied cooldowns sit to the left of the map and recent enemy cast icons to its right in both live and replay viewers. Desktop rows show all five heroes with spell icons, cooldowns and mana; hovering a spell retains its name, rank, cooldown and mana cost. Narrow containers put the map first and stack the spell panels beneath it. Tactical calls follow the map. This presentation change does not alter combat or saved data. TypeScript/production build passes; disposable live-scrim browser checks cover desktop placement plus 390px/320px containment.


The map-side panels also show every hero's six current item slots with artwork and hover details. Allied heroes show their next planned purchase and savings progress; opponents show items already owned, followed by recent enemy casts. Inventory data comes from the current frame in live matches and replays, so later purchases do not appear ahead of playback. Missing old inventory telemetry keeps the existing unavailable message. Artwork has abbreviation fallbacks. Desktop and 390px/320px browser checks pass, including actual purchase updates after a minute step.
