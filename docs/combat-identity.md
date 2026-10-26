# Hero identity, resources and TP scrolls

Implemented locally on October 25, 2026. Not published. New patched matches use
these mechanics in the shared watched, stepped, skipped and tournament engine.
Recorded results are retained; legacy preparations without a patch retain their
previous resource behavior. Existing siege, map and post-game work is preserved.

## Basic spell and item behavior

The offline compiler retains numeric ability specials, channel times, toggles,
hero base regeneration and TP definitions from the existing SHA-pinned Valve
game-file cache. `combat-model.ts` turns supported values into bounded effects.
Damage, healing, stuns, roots, silence, slows, shields, damage over time, mana
burn, lifesteal, critical attacks, armor reduction, attack buffs and regeneration
have separate effects. Physical item armor, attack speed and extra mana now
affect the owner. Generic offensive item actives spend their source mana cost
and cooldown rather than activating for free. Hex and Orchid disable actual
actions. Arcane Boots restore nearby allied mana. Wand restores HP and mana.

Named behavior includes:

| Hero | Implemented distinction |
| --- | --- |
| Anti-Mage | Learned Mana Break burns the victim's remaining mana on attacks; Mana Void scales with the selected victim's missing mana. |
| Axe | Counter Helix can retaliate against nearby enemies when attacked. Culling Blade waits for a scaled kill threshold, bypasses defensive mitigation on execution and resets after a kill. |
| Pudge | Meat Hook pulls its damaged target toward Pudge. |
| Crystal Maiden | Learned Arcane Aura restores allied mana globally, with stronger self/nearby effects; Frostbite roots and applies periodic damage. |
| Lion | Mana Drain transfers actual mana over a channel. Stun, silence, range loss, depleted mana or target death stop it. Hex disables actions. |
| Ursa | Fury Swipes stack per attacker/target and expire. Overpower grants a limited burst of faster attacks; Enrage reduces incoming damage. |
| Huskar | Berserker's Blood increases attack speed and HP regeneration as HP falls. |
| Tidehunter | Learned Kraken Shell blocks scaled physical damage. |
| Faceless Void | Time Lock can add damage and a brief disable to an attack. |
| Outworld Destroyer | Arcane Orb spends a fraction of current mana for mana-based attack damage. |

The existing siege-specific Sniper, Pugna, Jakiro, Dragon Knight and Shadow Shaman
behavior remains. Other summons remain temporary attack pressure. Skill builds
learn each of the three basic slots by level four, then prioritize the primary
skill, with ultimates at 6/12/18. Passives do not fabricate cast events.

The Heroes browser has **Spells & how they play**. Live/replay allies have
**What these spells do**, keyboard-focusable spell tooltips and resource rates.
Items can be tapped or clicked to read a short explanation, including TP scrolls.
Descriptions report supported simulation effects and explicitly disclose generic
active abstractions or an unsupported passive. They are not complete Dota guides.
Enemy TP cooldowns remain hidden; visible channel activity is public.

## Regeneration and recovery

Rates use **match seconds**, independent of playback speed. Base HP regeneration
is `(source base regen + Strength × 0.1) × 0.4`. Base mana regeneration is source
base mana regen plus `Intelligence × 0.05`. Applicable owned-item regeneration
and learned passive regeneration add to those rates. Heart adds bounded
out-of-combat recovery after twelve seconds without damage. The fountain adds
2% max HP/s and 3% max mana/s within the existing home radius.

Living heroes recover while stunned and channeling; dead heroes do not recover.
HP and mana cap at their current maxima. Natural recovery does not count as
ability healing. Tango, Salve and Clarity consume their inventory item to start
timed recovery; Salve/Clarity stop on enemy hero damage. Consumables grant one
activation per catalogue purchase here, without a full charge/tree/recipe model.
The numerical scaling and historical attribute coefficients are manager-engine
approximations, not an exact reconstruction of every regeneration rework.

## Town Portal scrolls

TP scrolls are available on every historical composite, using that snapshot's
price, mana cost, cooldown and channel time. Each player can automatically buy
one at the fountain, or the manager can prioritize one through the existing item
shop, including **All players**. Each hero spends their own match gold. A dedicated
utility counter avoids removing a combat item from a full inventory; using that
counter in older eras is an explicit adaptation of the later client slot.

Autonomous heroes channel home when retreating far from the fountain and can
return from the fountain to a surviving original-lane tower once healthy, with
enough mana and no observed enemy near the destination. Active movement calls
take priority over autonomous lane-return teleports. Starting a channel consumes
one scroll, pays mana and starts cooldown. The hero stays in place until the
channel ends. Stun, silence, root, death or destination destruction cancels it
without refund. Ordinary damage alone does not cancel a TP. A completed teleport
updates actual coordinates and shared sightings. Counts, allied cooldowns and
channel destinations appear with the current inventory in live/replay frames.

There is no manual arbitrary-point TP, courier logistics, multi-hero channel-time
escalation, Boots of Travel target expansion or death-granted free-scroll rule in
this first TP model. Fountain and simulated lane towers are the destinations.

## Sources, scope and verification

The reproducible source ledger remains `scripts/data/combat-history.json.gz`:
dated, SHA-addressed Valve files in the Dotabuff extracted-game-file mirrors,
compiled without network access by `scripts/build-combat-history.mjs`. Each
catalogue retains its own source URL/date and content signature. Valve's
[official hero pages](https://www.dota2.com/heroes) provide the hero-identity
reference; exact modeled values come from the pinned game files. Early 2011–2013
kits remain provisional because the oldest recovered file reference is 2013.

This is a basic simulation layer. Many unique passives, steals, clones, facets,
transformations, spell projectiles, dispels and structural upgrades remain
incomplete. Do not interpret a public historical note or a guide entry as full
mechanical coverage. Changed outcomes invalidate previous calibration through
`COMBAT_MODEL_VERSION` and the catalogue signatures; balance is not certified.
Existing balance jobs and the blocked continuation queue are untouched.

Validation: all **385 shared tests** pass, including **15 resource/identity tests**,
along with TypeScript and an isolated production build (existing bundle-size
warning). Tests cover paid TP utility-slot purchases and interruption, elapsed
recovery and caps, dead/stunned behavior, aura range/death, mana transfer/burn,
Hook/Frostbite/Culling, Ursa/Huskar/Kraken Shell, lifesteal, item disables,
consumables and deterministic live chunks. Disposable localhost 5356 worker
playback, pause, minute stepping and remainder simulation completed a real
51:16 map. Spell/item/TP guide controls and actual 390px/320px containment pass.
Preview: `.local/combat-identity-preview.png`. No normal campaign storage,
publication, external messages or background balance jobs were changed.
