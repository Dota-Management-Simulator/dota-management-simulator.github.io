# Combat, vision and phone controls — October 26–27, 2026

Local development update requested by the user. No publication or balance certification. Existing campaign saves and completed scoreboards retain their data. The proposed outcome-explanation feed was explicitly dropped.

## Watching and intervening

Live and recorded playback offer additional slower rates, including real-time viewing, alongside the existing accelerated speeds. Optional live pauses cover allied deaths, available buybacks, base damage and a visible major engagement. The worker checks after each authoritative tick and stops that batch at the event; resuming continues the same battle. Simulate remainder explicitly finishes the same running map without optional pauses.

Manual allied buyback controls show actual cost and eligibility prominently. Buying back spends that player's match gold, retains the selected era's cooldown and penalties, and returns the player at the actual fountain. It does not grant a free teleport back to combat.

Phone layouts have Map, Team, Events and Calls views and persistent playback controls. Spells and items open descriptions by tapping. Larger targets and readable detail text replace the narrow desktop information stacks. Desktop retains simultaneous panels.

## Club call catalogue and progression

The catalogue is accessible from Squad, map preparation and live calls. Search and Available/Locked filters show every call, its participants, supported phases and exact alternative unlock routes. Squad and preparation let the manager equip three calls per phase; a live map retains its pinned playbook.

The expanded catalogue includes defending each lane, securing farm with escorts, disengaging, five-player tower conversion, counterganks, converging on mid, a supported split push, protecting the carry with the offlaner and supports, and coordinated base defense. These use actual movement and sacrifice farm and map coverage. Disengage can interrupt an active order and includes injured living teammates.

Basic calls remain free. Existing staff/player-skill unlocks survive. Additional calls can be accessed while a specialist coach is employed or permanently learned through competitive series victories: one, two, three or five distinct defeated clubs, or a victory over Alliance for the supported split push. These are authored game rewards, not historical claims about a club's signature play. The catalogue states each rule explicitly.

Competitive results alone teach victory calls. Practice, exhibitions, losses, draws, skipped events and aggregate tournament placements do not count. Dated tournament fixtures credit the managed club on either side. Duplicate settlements cannot double-credit a win. Existing legitimate competitive history supplies earned access; the optional progress ledger retains learned calls across seasons and roster changes. Malformed optional progress recovers without discarding a campaign. Coaches do not permanently teach their calls merely by being hired.

## Trees, wards and information

Observer and sentry orders specify a position on the actual map. The placement preview and the simulation share the same tree/elevation line-of-sight function. A placer must travel into cast range, have match gold and use available team stock; an order is not instant vision. Wards expire, sentries detect hidden wards and nearby heroes can deward. Both teams' support bots place wards and make their decisions from their own sightings.

The terrain sources and coordinate conversion derive from the user's Scrim Circuit Tracker. Eight map eras have pinned exported terrain and structure coordinates. The three earlier overviews have explicitly approximate, traced tree-grove footprints and ground, not recovered individual historical trees. The map preview identifies this distinction. See [terrain provenance and limits](map-terrain.md), [terrain source ledger](map-terrain-sources.json) and [structure source ledger](map-structure-sources.json).

Live updates and recorded playback use the managed team's vision. Hidden enemy units, builds, resources, cooldowns, wards and neutral state are filtered. Recent enemy casts require an actual observation at cast time. Replay filtering uses the recorded frame's state rather than a future frame. Post-game scoreboards still show completed statistics. No selectable omniscient live mode is exposed.

## Completing the base and hero interactions

New patched matches simulate all eleven towers and six barracks per side. Lane Tier 1/2/3 dependencies, barracks protection, Tier 4 access and Ancient protection follow actual structure destruction. Melee/ranged barracks separately upgrade their corresponding enemy lane-creep type; destroying all six unlocks megas. Glyph and backdoor protection cover the added buildings. Only actual Ancient destruction ends a patched match; unpatched legacy battles keep their compatibility path.

Supported combat interactions now include additional targeted saves and dispels, Shallow Grave's ordinary-damage protection with execution exceptions, defensive item timing and control-aware target selection. This builds on the existing named kits and resources. It does not claim complete parity for every Dota hero, spell, upgrade or historical patch. Combat ranges, damage, movement and many historical rules remain scaled manager-game adaptations.

## Validation and scope

All **477 shared tests pass**, including 30 new checks covering terrain shadows and pathing, ward cliffs and exact placement/stock, visibility filtering, building dependencies, super/mega progression, supported saves, call progression and authoritative pauses. TypeScript and the isolated production build pass, with the existing chunk-size warning; the CRLF-aware diff check passes. JSON round-tripping a pinned configuration preserves safe opponent unlock defaults.

Six seeded maps across 2013/2017/2020/2023/2025/2026 complete. An additional eleven-era check and test verify both teams' support bots actually place wards. Disposable port 5365 browser QA covers desktop, 390px and 320px Map/Team/Events/Calls containment, catalogue filtering/unlock routes, spell/item taps, a shared-fog ward preview and real-time clock progression. A real worker places the ordered ward at exactly `(120,700)`, pauses for an allied death at `10:17` and accepts the player's manual 352-gold buyback. No campaign storage is accessed by the fixture.

The actual compiled production workers on port 5367 parse as JavaScript. The live worker advances a managed-team-vision frame to 1:00, then completes a ten-player 56:37 map with the losing Ancient at zero. The tournament worker loads and returns normally. Browser page errors are empty. Logs, receipts, screenshots and the isolated build remain under ignored `.local/combat-*`; source-alignment overlays remain under `.local/terrain-source/`. These are browser viewport checks, not physical-phone battery/FPS certification.

No existing calibration output is applied or overwritten. Terrain, structures, combat and tactics enter stale-input guards. Normal and hosted campaign saves, existing background jobs and prior source edits are preserved. No commit, push, deployment or external message was initiated.
