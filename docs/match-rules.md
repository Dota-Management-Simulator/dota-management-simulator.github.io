# Siege, laning and defensive decisions — October 25, 2026

Local implementation for newly created **patched** matches. All six requested rules run in `LaneBattle`, shared by watched, stepped, skipped, practice, bot and tournament matches. Legacy preparations without a patch keep their original engine, including its overtime rule. Existing results and archived replays are not resimulated.

## Glyph: manual control and optional automation

The live viewer has **Glyph of Fortification**, its remaining protection/cooldown, and an **Auto Glyph** checkbox. Manual and automatic uses spend the same team ability. Auto defaults on for old playbooks. The checkbox is also available before a match; changing it live saves the accepted preference through the existing playbook callback without restarting the worker. The preference carries into later maps and survives campaign reload. Each map starts with fresh cooldowns. Turning automation off never changes a cooldown or disables manual activation.

Automation checks once per match second. It uses a ready Glyph when a living tower is below 40% HP, or the Ancient below 85%, and that building actually took damage in the previous three seconds. These thresholds are authored manager decisions, not Dota rules. The opponent follows the same automatic logic. A low building that has not been attacked does not consume Glyph. Manual activation works while paused and uses the authoritative worker clock. Stale, duplicate, cooling-down and post-match requests cannot spend another use.

Buildings take no damage during protection; eligible lane creeps have a separate protection timer. Tier 2 towers gain the era's additional attack targets during Glyph, using actual nearby enemies and a single attack cooldown. Losing a tower refreshes according to the composite: no early reset; each Tier 1 from 6.82; first tower of each supported tier from 7.32; 7.36 retains the first Tier 1/2 resets. **Tier 3/4 and barracks are still layout references**, so their additional historical refresh triggers are not invented. Active Glyph and backdoor shields appear on the shared live/replay map. Short Glyph windows are explicitly captured rather than lost between ordinary replay samples.

## Backdoor protection

Tier 1 has no protection. Each simulated Tier 2 and the Ancient tracks enemy lane-creep proximity, with a 15-match-second grace after the last qualifying creep. Dead, waiting and defending creeps do not disable protection. Protected buildings receive era-dependent damage reduction and heal **only damage taken under protection**; damage from a previous legitimate push is retained. Enough damage can still overpower the regeneration. Tier 2 targeting also requires destruction of the same-lane Tier 1.

Distances are adapted to this engine's coordinates: 150 units around a Tier 2 and 240 around an Ancient. They are not Valve's raw 900/4000-unit detection circles. Health regeneration uses the existing creep-health scale of 0.4; the underlying reference is 90 HP/s, with the Ancient rising to 180 in 7.32. Nearby waves influence heroes' actual movement, not just a hidden objective multiplier.

## Siege waves

Patched lane waves now spawn every 30 match seconds, rather than the prototype's 150-second cadence. Melee/ranged/siege types are explicit. Catapults have different HP, range, attack interval, building damage and spell resistance, and render as rectangular markers. Before 7.06 they arrive every seven waves (3:30); later they arrive every five minutes. The extra siege unit moves between 45, 40, 30 and 35 minutes across the supported historical transitions. Extra melee/ranged units and the temporary 7.06 extra mid melee creep also follow the selected composite. HP/damage upgrades are bounded; they do not increase indefinitely to force an ending.

There is **no timed Ancient damage in patched matches**. Only actual attacks end the game. The existing 180-minute safety cap reports a failed simulation without settling a fabricated result. Barracks, super/mega creeps, exact collision, attack projectiles and a complete tower roster are outside this change.

## High ground and shared sight

The map artwork contains no engine terrain-height data. `terrainHeight` defines conservative **approximate** river low ground, normal ground and base plateaus in image-relative coordinates. Low-ground observers cannot reveal a whole upper plateau; an ally with sight on that ground can reveal the target for the team. Nearby attacking heroes briefly reveal themselves. The same shared sightings gate autonomous hero targeting, named spell acquisition and tactical decisions. The spectator view intentionally continues to show both teams.

Ranged hero and ranged/siege creep attacks from below have a 25% miss chance; melee attacks do not. This uses the match's seeded RNG, so repeated and chunked simulations remain deterministic. The current abstraction uses independent rolls, not Dota's later pseudo-random distribution. Exact tree occlusion, wards, day/night hero sight, full elevation grids and temporary flight/True Strike exceptions are not implemented; the existing bounded ability model does not represent those states reliably. This is a spatial advantage, not a claim of full Dota terrain parity.

### Heroes have different siege and defense strengths

Historical hero attack ranges now come from each composite's game-file snapshot. Learned **Take Aim** and supported linked talents extend Sniper's reach; available active range bonuses consume the actual spell's mana/cooldown. **Nether Blast** damages legal buildings using its source building multiplier. **Liquid Fire** burns a building over time and slows its attacks. **Elder Dragon Form** temporarily grants Dragon Knight ranged attacks and corrosive damage, with source duration, mana and cooldown. These effects respect building prerequisites, Glyph and backdoor protection.

**Mass Serpent Ward** creates at most three representative stationary wards with source damage/range/duration and scaled durability. They can be attacked, expire, and credit their owner for damage and kills. They never count as lane creeps for backdoor or Glyph. This bounded representation does not reproduce ten-ward collision, placement, targeting commands or every upgrade interaction. Existing wave-clear spells hit actual lane units; source directional-width fields now allow line spells such as Dragon Slave to clear a clustered wave. Defenders can therefore remove the creeps enabling a push.

The compiler also preserves source values supplied as arrays; previously these could become zero. Hero ranges, spell damage, building effects and wave-clear capabilities create different siege outcomes without applying a flat high-ground bonus to particular hero names. The pinned game-file manifest and recovery limits are documented in [patch overhaul](patch-overhaul.md); current Valve hero pages describe the underlying identities ([Sniper](https://www.dota2.com/hero/sniper), [Pugna](https://www.dota2.com/hero/pugna), [Jakiro](https://www.dota2.com/hero/jakiro), [Dragon Knight](https://www.dota2.com/hero/dragonknight), [Shadow Shaman](https://www.dota2.com/hero/shadowshaman)).

## Denies and last hits

Players with sufficient laning skill can use an available attack to finish a friendly creep below half HP, in attack range, while a visible opponent contests the lane. They prioritize a reachable enemy last hit or vulnerable hero. A deny consumes attack recovery, removes the actual creep, records a deny, prevents ordinary enemy last-hit gold and distributes era-dependent reduced XP. Denier XP in 7.06/7.07 and denier gold in the 7.20 period are separate. Glyph-protected creeps cannot be denied. Shared XP existed previously; it is retained.

Ordinary creep last-hit gold now requires the hero to land the final attack/spell. The former fallback that assigned a creep-secured kill's gold to a nearby hero is retained only for legacy maps. Denies appear in live rosters, saved player scoreboards and sortable post-game DN columns/breakdowns. Old rows remain unknown, rather than becoming zero. Tower and special hero denies are not implemented.

## Buyback

Dead allied player rows expose a manual **Buyback** button, current cost and any blocking reason. It checks the owner, match state, gold, cooldown and Aegis resurrection. It spends that hero's unspent match gold, returns them at their own fountain with HP/mana restored, preserves spell/item cooldowns and applies the era's additional respawn and earning penalties. Aegis revival remains separate, with no ordinary buyback or kill award. Buyback spending is tracked as an expense; earned-gold graphs remain cumulative.

Both teams can automatically buy back one available hero per defensive check when their Ancient is below 65%, actually damaged within five seconds, fewer than three living allies are nearby, and the hero has more than twelve match seconds left dead and can pay. This is an authored emergency policy. Automatic late-game shopping reserves one buyback after a lane is open; explicit manager item priorities can spend that reserve. Dead heroes do not automatically shop away their buyback. Buyback returns to the fountain; subsequent travel uses the engine's movement and separately implemented Town Portal rules.

The old level/time cost, 7.11's `100 + NW/13`, 7.24's `200 + NW/12` and 7.29's `200 + NW/13` are selected by composite. Cooldowns progress 5/6/7/8 minutes. The remaining-time respawn penalty becomes a flat 25 seconds at the 7.19b composite; pre-7.11 earnings penalties expire at the original respawn time. Existing base respawn durations are the engine's scaled curve, not a new complete historical death-time table. Buyback counts are saved and shown with DN/BB statistics; transient eligibility remains in live frames.

## Sources and historical precision

The game selects two composites per year. A change within a composite is applied to that whole composite, consistently with the existing map/kit/economy adapters; these are not per-letter-patch reenactments. Future patches inherit the last verified rules. No historical results are rewritten.

Primary material already cached in `scripts/data/patch-sources.json.gz` includes Valve's Steam updates for October 4, 2012 (4→5-second Glyph), June 4, 2013 (6.78 backdoor reduction and buyback cooldown), October 2013 (buyback penalties), October 2014 (6.82c cooldown), and November 2017 (7.07b backdoor reduction), plus Valve's structured patch feeds. The implementation checked those records directly, rather than relying on remembered modern values.

- [Valve 7.06](https://www.dota2.com/706?l=english): siege timing/damage/HP, creep aggro context, buyback cooldown and uphill exception.
- [Valve 7.07](https://www.dota2.com/duelingfates): deny XP, creep protection under Glyph and extra siege creep timing.
- [Valve 7.11](https://www.dota2.com/datafeed/patchnotes?version=7.11&language=english), [7.13](https://www.dota2.com/datafeed/patchnotes?version=7.13&language=english), [7.19b](https://www.dota2.com/datafeed/patchnotes?version=7.19b&language=english): buyback formula/penalties, Glyph duration/opening cooldown.
- [Valve 7.20](https://www.dota2.com/720), [7.22](https://www.dota2.com/datafeed/patchnotes?version=7.22&language=english), [7.23c](https://www.dota2.com/datafeed/patchnotes?version=7.23c&language=english), [7.24](https://www.dota2.com/datafeed/patchnotes?version=7.24&language=english): denies, catapults, multishot, creep protection and buyback cost.
- [Valve 7.29](https://www.dota2.com/dawnbreaker?l=english), [7.32](https://www.dota2.com/datafeed/patchnotes?version=7.32&language=english), [7.32e](https://www.dota2.com/datafeed/patchnotes?version=7.32e&language=english), [7.36](https://www.dota2.com/datafeed/patchnotes?version=7.36&language=english), [7.38](https://www.dota2.com/datafeed/patchnotes?version=7.38&language=english): protection, regeneration, refreshes and creep duration.
- [Archived building rules](https://liquipedia.net/dota2/Archive%3ABuildings) and [building changelog](https://dota2.fandom.com/wiki/Buildings/Changelogs) cross-check pre-2011 regeneration, proximity/grace and Tier 1's exemption. Earlier game-file references remain provisional as documented in [patch overhaul](patch-overhaul.md).

## Verification and balance

All **385 shared tests**, TypeScript and the isolated production build pass (existing bundle-size warning). Focused engine/worker tests cover protection ownership, grace/healing, Glyph automation/cooldowns/refreshes/multishot, siege waves/resistance, shared high-ground sight/misses, denies and XP, buyback ownership/spending/penalties/Aegis, replay windows, the five hero-specific siege kits and removal of timed Ancient damage. Full seeded maps complete across all 32 composites; this single-seed sweep checks completion, not balance. Existing live chunk/inspection/skip tests still require the same final state and one settlement.

Push participants contest visible defenders and use an exposed building window rather than indefinitely farming replacement creeps. Automated push calls can regroup with three of five roles available; manual calls retain their required participants. The targeted historical tournament stalemate now completes through actual attacks. Regression checks cover both the building decision and a wave in another lane opening an Ancient's protection.

Disposable **5355** browser checks verify paused manual Glyph with Auto Glyph off, shared cooldown, accepted preference/reload persistence, manual buyback, actual real-worker skip completion with one callback, recorded DN/BB columns, no desktop console errors and 390px/320px containment. Preview: `.local/siege-glyph-preview.png`; logs and fixtures remain ignored under `.local/siege-*`. Campaign saves, existing jobs and hosted state were not accessed or changed.

`MATCH_RULES_VERSION` and selected rule values are included in the hero balance signature. Old calibration cannot activate for changed combat. Existing background jobs and the blocked continuation queue are untouched; these changes do **not** certify balance.
