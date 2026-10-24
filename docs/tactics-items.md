# Live strategies, items and autonomous teams

Local implementation, October 23, 2026. These rules apply to newly simulated maps. Existing campaign ratings, finances, dates and completed results are retained.

## Match preparation and live calls

After the automatic or manual draft, the manager prepares exactly three quick slots for each phase:

| Phase | Match clock | Available calls |
| --- | --- | --- |
| Early | 0:00–14:59 | Mid ganks top/bottom, mid helps the losing sidelane, supports gank mid |
| Mid | 15:00–39:59 | Push a top/mid/bottom tower, protect the carry, attempt Roshan, offlaner split pushes, prioritize BKB |
| Late | 40:00 onward | Tower pushes, protect the carry, Roshan, split push, group for high ground, prioritize BKB/Rapier |

Slots and five role-based build preferences save in optional `Campaign.tacticalPreparation`. A changed lineup uses the same role preferences; each map has another preparation opportunity. Unknown or malformed optional fields normalize without discarding a valid campaign. Saving a playbook changes no clock, money, attributes or outcomes. Duplicate slots are exchanged in the editor; save normalization fills invalid slots with legal defaults.

Watch a map to make calls, pause to assess it, or use **Advance 1 minute** while paused. Clock speed changes how quickly the same simulation advances. **Simulate remainder** completes the current state with every accepted order retained. **Simulate map & skip** uses the same battle rules and autonomous decisions. Orders cannot be issued against an earlier displayed state, after a map ends, or for an unequipped/locked strategy.

An issued movement call has participants, a rally point, a target and an expiry. The team assembles, moves, engages, then completes or abandons the play. Its participants receive rings on the map. Travel and time away from a lane actually displace ordinary lane/farm actions; there is no strategy damage multiplier or success coin flip. Local combat, deaths, recovery and enemy decisions resolve the result.

- Ganks move the mid or both supports. A participating hero's kill/assist can complete the rotation; an opening that never materializes expires after 150 match seconds.
- Losing-lane selection uses the manager's own sidelane deaths/kills and lost towers. It does not inspect private enemy ratings, research or builds.
- Tower pushes use mid/offlane/supports and wait behind an available allied wave. High ground commits all five toward the least obstructed lane and its next building. Each push targets one building, then returns players to normal duties.
- Split pushing sends the offlaner toward a lane with less observed opposition. The routing remains a simplified lane-assignment proxy.
- Carry protection sends both supports to escort their carry for 90 seconds.
- A participating player must be alive, at least half health and not retreating when the call is made. A movement ends early if fewer than 60% of its original participants remain available. Recovery and local danger can override an order.
- One team movement runs at a time. Purchase priorities can coexist with it. Completed/abandoned movements recover for 90 match seconds; cancelling a movement recovers for 45. Purchase calls recover for 30 seconds and can be reused for another eligible player.

The console explains unavailable calls and shows the current play, a purchase target, cancel controls and recent decisions. Full managed results retain the chronological tactical and purchase/drop/pickup histories. Compact AI results retain their actual final inventories and player statistics, without adding large tactical histories or inventing replays.

## Staff and player access

Basic calls are available to every club. Advanced access comes from the specified employed staff member **or any actual lineup player's qualifying attribute**:

| Play | Staff | Alternative attribute |
| --- | --- | --- |
| Help the losing sidelane | Head coach | Intuition 50+ |
| Roshan | Economy coach | Intuition 50+ |
| Split push | Strategy scout | Pushing 50+ |
| Rapier priority | Hero specialist | Creativity 55+ |

Staff cards and the strategy library show these unlocks. Staff expand the available playbook; they add no flat combat bonus. Releasing staff can leave a saved advanced slot unavailable until replaced or qualified through a player.

## Autonomous decisions and information

Both teams use `LaneBattle` for movement, items, tactics, retreats and objectives. Automatic teams prepare three calls per phase from their own staff and players. The manager's team continues to act without input; manual calls override its current intentions through the same eligibility/execution path.

Bots use local shared sightings from their own living heroes, creeps and towers. Vision affects the hero sight radius. A spectator can see both teams, but decisions do not read the opponent's private quick slots, item priorities or preparation. There is no ward placement, smoke, terrain obstruction or full Dota fog system yet.

Intuition affects decision cadence and numerical-danger disengagement; teamfight skill affects assembly time; skirmish skill helps select a vulnerable nearby enemy. Existing player power, hero coefficients, patch axes, farming, laning, pushing, talents and energy remain effective. Ordinary lane behavior still follows waves and avoids a contested tower without allied creeps. Bots do not automatically divert every support into BKB: emergency purchase calls are restricted to pressured cores; support utility builds continue. A manager can explicitly prioritize any teammate. Autonomous Rapier priorities require a late, threatened base and sufficient healthy teammates.

## Real match inventories

The initial catalog has 13 classic items: Bracer, Wraith Band, Null Talisman, Boots of Speed, Magic Wand, Blink Dagger, Force Staff, Mekansm, Black King Bar, Desolator, Heart of Tarrasque, Butterfly and Divine Rapier.

These are **bounded Lane Siege equivalents**. Prices, bonuses and automatic build choices are authored gameplay estimates, not a reconstructed historical shop. All catalog entries are available from the opening era. There is no claim that every real item, recipe, courier/delivery rule, active or historical change is implemented.

- Each hero has six inventory slots, spendable match gold, current net worth, a build and an optional purchase priority.
- Build styles are Automatic, Physical, Spell, Survival and Utility. Automatic uses the hero's attribute and assigned role. Players purchase their next affordable item automatically; a purchase instruction saves for the selected item first. It cannot grant gold or an unaffordable item.
- Starting gold, passive income, farm, kills and building rewards feed the same match economy. Campaign cash is never used. Purchases happen at the next three-second shop check, including while dead; courier travel is intentionally abstracted.
- When a six-slot inventory needs another item, a small starter can be sold for half its patch price if that makes the purchase affordable. Completed starters do not get repurchased. A full inventory without a replaceable starter blocks a new purchase priority.
- Item attack/health bonuses replace the previous direct gold-to-attack/health scaling. Unspent wealth has no automatic combat bonus. Item power remains subject to player/hero combat power and the existing talent rules.
- Boots improve movement. Null improves generic spells. Wand provides a small emergency heal. Blink shortens travel outside recent combat. Force helps a retreat. Mek heals nearby hurt teammates. Heart improves health and recovery outside combat. Butterfly reduces physical damage deterministically. Desolator improves attack damage.
- BKB activates near visible enemy heroes once hurt. It reduces actual generic spell damage and stun duration for a short window, with a 90-second cooldown. The composite containing 7.33 reduces its protection. This is a simplified interpretation of Valve's [New Frontiers](https://www.dota2.com/newfrontiers) / [7.33](https://www.dota2.com/patches/7.33) change, without full debuff-immunity or dispel semantics.
- Rapier supplies larger attack damage and drops at the hero's death position. Either side can recover it through actual proximity if they have space and do not already hold one. It contributes to its new holder's combat stats and net worth. An Aegis revival consumes Aegis before a scored death and does not drop Rapier.

Composite economy axes shift item prices modestly; objective/teamfight axes shift attack, health and spell bonuses. BKB's era behavior changes in 2023. Future composites keep the same catalog with fictional axis-driven values. Every item shown uses the map's pinned patch, including final result tooltips after the campaign moves to another patch.

The GOLD scoreboard column and GPM retain accumulated earned resources, preserving existing career semantics. New timelines additionally retain **current net worth**, and the economic graph uses it so sales and Rapier transfers are visible. Older graphs retain their original gold totals. The live roster shows current HP/death state, inventory, purse, net worth and the next purchase's funding progress.

## Roshan and Aegis

Roshan is a finite neutral encounter at a visible pit. Participants must travel into range and spend attacks on him, receiving damage and foregoing ordinary actions. Local enemy contact interrupts the attempt for combat; retreat and casualty rules still apply. After an uncontested period he recovers health. The encounter remains simplified: it has no exact hero-specific spell interactions or full historical pit/reward variants.

A kill awards each teammate 150 match gold and grants one nearby surviving core an Aegis lasting five match minutes. Aegis consumes itself for a five-second revival near the death position, without a scored hero death. Roshan returns after eight match minutes with increased health. Hero deaths caused by the neutral encounter are recorded separately from enemy kills.

## Runtime and saves

`LiveBattleSession` and the managed battle worker advance an unfinished map in integral 1.2-match-second ticks. Read-only frame/console inspection does not advance time or consume RNG. The UI allows one request in flight and includes the displayed match clock with an order. The headless and tournament workers run the same `LaneBattle.step()` path. Accepted orders are never implemented by resimulating an already completed replay.

Preparation persists immediately. Match state stays in memory; as with the previous draft flow, reloading an unfinished series restarts that series. Completed maps enter the campaign through the existing series settlement path, with its duplicate-settlement protections. Old completed matches are not resimulated or furnished with invented inventories.

## Balance and verification

The internal 42–58% equal-team hero targets remain unchanged. They describe intended relative hero strength, not a promised campaign win rate or proof that the new engine is already balanced. The new combat, inventories and decisions need fresh tuning.

- `heroBalanceSignature` includes the tactical engine version, item definitions and strategy catalog. Old runtime coefficients fail the signature and cannot silently certify this engine. Behavior changes require a version bump.
- `scripts/combat-inputs.mjs` is the shared source boundary for calibration fingerprints: combat, items, tactics, staff, heroes/roles, patches, talents and drafting. Resume rejects changed experiments; activation rechecks source inputs. Iteration also fingerprints the frozen starting coefficients.
- Calibration benchmarks give both teams equal staff and attributes, unique legal drafts, swapped sides and independent fitting/validation seed domains. This prevents staffing differences from masquerading as hero strength.
- `npm run audit:tactics` runs an 8,256-map pilot: 256 equal-team maps in each of 32 phases, plus 64 independent 70-v-30 player-strength probes. It exports per-hero counts, paired intervals, target error, side rates, purchases and Roshan conversions. A pilot explicitly does **not** certify balance.
- The first pilot is preserved in `.local/tactics-audit/`. It identified drift and overly broad automatic BKB priorities. The corrected-engine pilot is `.local/tactics-audit-current/`; inspect its `status.json`, `summary.json` and `hero-rates.csv` for actual completion and results.
- The corrected pilot completed **8,256 maps / all 32 phases** with matching current source fingerprints. Equal-team side-zero wins were **49.10%**; stronger players won **64/64** independent fixed-draft probes. It recorded 337,901 purchases and 1,202 Roshan kills. Hero target error averaged **12.25 percentage points**, with **24 conservative ceiling flags**. These are uncalibrated pilot results, not a balanced release or a promise that every hero is below 58%.
- Existing CPU process **54972** and its continuation are preserved. Their frozen mechanics predate this feature. `.local/tactical-balance-queue.json` records separate one-shot process **4648** (verified waiting, with source fingerprint matching) that waits for existing jobs, rejects changed source, then launches all-phase fitting into `.local/tactical-hero-balance/`. Starting values are warm starts only; every phase measures a fresh 4,096-map baseline, four 1,024-map fitting rounds and disjoint 4,096-map validation, with up to three passes.
- Automatic activation requires every phase to improve its target error, zero conservative ceiling flags and passing tests/TypeScript/build. Failed or stale candidates remain local and inactive. Inspect the continuation and batch status files before claiming activation or completion.

Thirteen focused tests cover phases/normalization, unlocks, real movement and reuse, invalid calls, economy, targeted priorities, support-build discipline, BKB damage/stuns, Rapier transfer, Roshan/Aegis, live/speed/skip determinism and save compatibility. The complete suite currently has **223 passing tests**, with TypeScript and production build passing (existing chunk-size warning).

Browser QA uses isolated **5321**, preserving earlier local and hosted saves. It exercises a real drafted tournament map, an accepted/completed support rotation, order-preserving skip, series settlement and preparation reload. A disposable equal-team fixture uses the production live worker to cross both boundaries, target item orders, inspect inventory and check light/dark desktop and 390px layouts. Artifacts remain ignored under `.local/`.

Exact hero spells/items/recipes, terrain/wards, comprehensive historical item balance and learned tactical coordination remain future work.
