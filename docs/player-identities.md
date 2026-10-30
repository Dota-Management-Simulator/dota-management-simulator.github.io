# Player innates, talents and temporary facets

Implemented locally on October 26, 2026. These are **manager-game systems on the
professional players**, with simulated assignments, rather than factual
assessments of real people or implementations of Dota heroes' innate abilities.

**User-directed revision:** the current 100-innate pool concerns player skills,
development and club welfare. Direct hero regen/damage/XP/gold innates from the
first local implementation are superseded for new maps. Their old rule table is
retained only for frozen v1 match configurations and existing result snapshots.

## Permanent identity and overlap

Every player receives one of **100 named innates** across ten categories:
Laning, Farming, Skirmishing, Teamwork, Movement, Awareness, Objectives,
Endurance, Composure and Learning. Each entry has an explicit condition and
effect. The shared catalogue is in `src/player-identity-data.ts`.

Assignment processes missing players in stable ID order, prioritizing active
club members and reserves. It minimizes usage among active players, then total
usage, prefers suitable roles among ties, and uses a deterministic ID hash for
the remaining ties. A fresh ungrouped pool uses all 100 before repeating and
keeps counts within one. Annual imports favor variety in the current field;
existing valid assignments are never rerolled to rebalance a new field. This
does not promise a unique innate for every person or every lineup.

The assignment and four-tier tree stay on the player record through name/role
changes, transfers and annual imports. New arrivals get their own assignment.
There is no innate reroll purchase or manual innate selection.

## Historical gates

The manager adaptation follows the introduction of innates/facets in Valve's
[7.36 update](https://www.dota2.com/patches/7.36) and facet retirement in
[7.41](https://www.dota2.com/patches/7.41). Actual player traits are authored game
rules, not historical Dota abilities.

| Composite | Player talents | Innates | Facets |
| --- | --- | --- | --- |
| Before 2017.1 | Off | Off | Off |
| 2017.1–2024.1 | On | Off | Off |
| 2024.2–2025.2 | On | On | On |
| 2026.1 and later, including generated future cycles | On | On | Off |

The existing game has two representative composites per season. **2026.1 spans
7.39e–7.41c**, crossing real-world facet retirement; its final representative
version governs the whole composite. It therefore has no facet selection or
effects, even for an earlier real-world date within that composite. We did not
add a third composite or change the calendar/patch catalog. Tournament-pinned
patches govern matches independently of the current campaign screen. An old
facet-era match retains its recorded facet after the campaign passes removal.

Identities are assigned in earlier worlds for stability, but their innate/facet
rules and UI remain locked until the introduction composite. Talents retain
their existing New Journey gate.

## Talent trees

Each player's saved tree has two choices at match levels **10/15/20/25**, drawn
from **16 shared talent templates**. Combinations differ by player; templates
can overlap. A template at the same rank always has the same numerical effect.
Rank 2 gives **25% more bonus than Rank 1**, rather than 25 percentage points:
Striking power is +5% attack damage at Rank 1 and +6.25% at Rank 2. The profile
shows percentages rounded to one decimal; simulation uses the exact value.

Specialty ranks follow the innate's category. Tree/rank assignment is fixed;
the manager chooses branches, not arbitrary upgrades to every rank. This builds
on existing map-level talents, with no added career-XP currency or training
grind. Levels and their activated bonuses reset each map. Unselected tiers give
no player bonus. The existing first/second-branch link to supported historical
hero talents remains. AI clubs choose using role-weighted talent benefits and
rank, while managed players use the saved selections.

Trees and choices travel with players. Campaign branch edits are blocked for
ongoing tournaments and prepared scrim participants. Training attributes,
welfare, wages and contracts are unaffected by choosing a branch.

## Facets and preparation

Each role has a shared pair of selectable approaches:

| Role | Choice one | Choice two |
| --- | --- | --- |
| Carry | Resource priority | Active carry |
| Mid | Lane controller | Map mover |
| Offlane | Pressure anchor | Fight starter |
| Soft support | Bodyguard | Playmaker |
| Hard support | Core escort | Forward support |

Each has a visible tradeoff. The initial default uses the player's aggression
rating (6+ chooses the active option); synthetic opponents use deterministic
defaults. The profile changes the campaign default subject to lineup locks.
After drafting, **Player facets · this map** allows an override for each own-team
player, including during a tournament, before the map starts. This does not
change the campaign default or rewrite earlier maps. There is no in-map switch.
Direct simulations use the pinned defaults. Both sides' worker configurations
carry their resolved identities and approaches.

Support escort facets move an idle support toward the living carry; active
support facets move toward a visible nearby fight involving a teammate.
Retreats, local threats and actual manager-call participation retain priority.
Other facets alter pursuit range, wave clearing, denies, building commitment or
finite neutral-farming windows. The existing neutral cadence is six match
minutes; displayed window adjustments are in **match-clock seconds**, not the
internal simulation-time units.

After retirement, saved defaults remain stored but cannot be selected and have
no effects. Innates and talents continue.

## Real effects and records

The new pool contains **54 conditional skill innates** (27 support teammates),
**26 training/mentoring innates**, **nine morale innates**, **four campaign-energy
recovery innates** and **seven effective player-attribute innates**. None of the
new innates directly changes hero regeneration, maximum health, raw damage,
mana cost, movement speed, XP or gold multipliers. The existing talents and
temporary facets retain their separate rules.

Match innates add points to existing **Laning, Farming, Skirmish, Teamfights,
Vision, Intuition or Pushing** skills under visible conditions. The engine then
uses those skills for decision timing, target reading, last-hit selection,
spell priorities and tactical decisions in newly prepared matches. They do not
change the output or rewards of an identical action. Frozen older preparations
retain their original numerical execution rules; see [player control](player-careers.md#shared-hero-kits-and-player-control--october-28-correction). For example, Lane technician grants +5
Laning before 10:00. Lane communicator grants other living same-lane players
within 240 map units +4 Laning before 10:00. Nearby shotcallers support other
living teammates within 240 map units. Conditions never inspect hidden enemy
plans. All innate contributions together cap at +10 points per skill, and
effective skills cap at 99. Death, distance, lane and timing gates are enforced;
the result snapshot records the actual contributors at that moment.

Effective attribute innates add a small player-rating bonus while retaining the
original saved base stats. Profiles show base → effective values. Those values
feed initial match attributes; effective Stamina/Confidence also feed the
existing contract-preference thresholds. A load never permanently adds points
again. Match-only teammate bonuses are not represented as permanent ratings.

Training innates multiply **positive focused weekly development**, including
the appropriate share of Balanced training. A Resource mentor can add 12% to a
clubmate's Farming development; Efficient practice adds 18% to its owner's
Farming development. Combined rates cap at 25% before the existing two-decimal
training rounding. They do not offset rust or create practice during Rest.
Mentors must be actual members of the same active club, be training rather than
resting and have at least ten scheduled practice hours under their contract
limits. Free agents cannot mentor unrelated free agents. AI plans are resolved
before mentoring is evaluated so player-array order cannot change results.

Morale innates grant conditional **weekly happiness**, capped at +3 from all
innates. Resting/tired/low-morale conditions use the recipient's plan or state.
Campaign energy recovery innates grant up to +4 energy per paid week, outside
the hero's HP/mana system. Existing happiness/energy caps apply, and debt still
imposes its original happiness penalty. These benefits settle once through
the existing paid-week path on both clocks; partial weeks, reloads and previews
do not pay them again. Bootcamp previews and settlement scale the same innate
training increments. Profiles show the additional capped gains and sources
under the current plan and cash state.

These remain shared bounded rule families rather than 100 bespoke simulations.
Hero familiarity, ward placement and historical personality research are not
added by this feature.

Profiles and the squad dossier show the assigned innate/default facet. The full
profile includes a searchable/category-filtered library with active-club usage
counts. Each map's preparation shows innate descriptions alongside facet
choices. Live/replay allied panels provide expandable identity details. Saved
player scoreboards capture the exact innate/facet and learned talent names,
ranks and effects; post-game breakdowns read that snapshot instead of the
player's current identity.
They also show effective skill-point contributions with each source's player
name and innate, labelled as applying at the recorded moment rather than being
a claim about the entire map.

## Save compatibility

`Player.identity` is optional, with version, innate ID, saved tree and optional
facet default. Loading recovers malformed optional identity records without
rejecting an otherwise valid campaign. Valid innate IDs survive tree repair;
invalid IDs get a deterministic replacement using the pool's usage rules.
Campaign identities now carry `innateRules: 2`. Existing innate IDs, saved tree
pairs, specialty ranks and facet defaults survive this migration. New match
builders pin v2. A frozen v1 match configuration without this marker retains
the original direct-buff rules, while completed snapshots are never relabelled
or re-simulated. Weekly campaign effects use the new pool immediately.

For an older save with selected generic talent tiers, those tiers receive the
original pair at Rank 1 so their exact existing bonuses and branch choices are
preserved. Previously unselected tiers can receive new template pairs.
Existing completed results are not rewritten. A prepared/archived match with
no identity metadata retains its original generic talent behavior and gets no
new innate/facet bonuses retroactively. No clock, cash or attribute changes
occur during identity recovery.

## Validation and limits

- **447 shared tests pass**, including the 16 identity tests covering pool
  uniqueness/reachable conditions, low-overlap distribution, stable imports,
  shared ranks, exact legacy bonuses, malformed saves, era/ownership/lineup
  gates, match builders, actual damage/movement/XP/gold/mana/regen/denies/camps,
  support movement priority and immutable match snapshots.
- Fourteen additional skill/club tests cover the absence of direct hero buffs,
  living/nearby/same-lane ally gates, phase and stacking caps, actual skill-based
  combat and telemetry, effective attributes, focused practice, mentor
  eligibility, morale/debt/recovery, exact camp previews, both paid clocks,
  AI-order independence and v1-to-v2 migration without rewriting archives.
- TypeScript and an isolated production build pass, with the existing large
  chunk warning. Both emitted simulation workers remain bundled JavaScript.
- Six seeded real-engine maps finish for 2017.1, 2024.2, 2025.1, 2025.2,
  2026.1 and 2026.2. This is completion smoke evidence, not balance calibration.
- Disposable browser QA covers profile selections, catalogue search/category
  filters, serialization/reload and full-client 1440px/390px/320px containment.
  A real drafted worker map preserves the selected per-map Active carry facet
  through pause, minute stepping, remainder completion and the 43:54 post-game
  breakdown with exact talent ranks. The isolated production battle worker
  reaches 1:00 with ten innate-bearing players and the selected facet; the
  compiled tournament worker loads and returns its expected invalid-input error.
  Ignored fixtures, logs and screenshots are under `.local/player-identity-*`.
- Revised-pool browser checks at 390px/320px verify a paid week and reload
  (30 → 31.25 Farming, with +2 innate happiness) and a paused/stepped real worker
  showing +5 self Laning plus +4 from a named lane partner. Six affected-era
  seeded maps complete with the new rules. The rebuilt production workers
  independently verify those nine skill points, ten-player 1:00 progression,
  the chosen facet and successful tournament-worker loading. Logs and fixtures are under
  `.local/innate-skills-*`.

Combat fingerprints include the identity catalogue and handlers. **Balance is
not certified.** Retained calibration output and existing jobs were not
restarted, terminated or applied. This implementation is local; it does not
publish the site or modify normal/hosted campaign saves.
