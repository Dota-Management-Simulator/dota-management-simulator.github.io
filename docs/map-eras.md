# Era maps and hero paths

Every patched match shows the Dota map of its era and moves heroes along that map's paths. Code: `src/map-eras.ts` (eras, art placement, Roshan pits, changes), `src/map-geometry.ts` (shared building, lane, base, river and camp coordinates) and `src/map-paths.ts` (walkable corridors and routing). Tests: `tests/map-eras.test.ts`.

## Eras

| First composite | Map | Roshan |
|---|---|---|
| 2011.1 | 6.70–6.81 classic | bottom river, Dire side |
| 2015.1 | 6.82 | bottom river |
| 2016.1 | 6.86 | bottom river |
| 2017.1 | 7.00 | top river |
| 2018.1 | 7.07 | top river |
| 2019.1 | 7.20 | top river (reworked pit) |
| 2020.1 | 7.23 | top river |
| 2022.2 | 7.32 | top river |
| 2023.1 | 7.33 | two corner pits: bottom-right by day, top-left by night |
| 2025.1 | 7.38 | two river pits: bottom until 15:00, then top at night, bottom by day |
| 2026.1 | 7.40 | as 7.38 |

Generated future patches keep the 7.40 map. Legacy matches with no patch keep the old sketch and straight-line movement. Day and night alternate every five game minutes, day first. Roshan only switches pit when he has not been hit for 20 seconds.

Patch notes show a **Map** section on every composite: the new map's changes when one arrives, otherwise which map carries forward. Change lists are short summaries checked against news coverage and Liquipedia version pages; each links to its Liquipedia page. The 6.82, 6.86, 7.07 and 7.32 entries are generic ("terrain adjusted") because the specifics were not verified.

## Art

Eleven WebP images (~2.1 MB) from OpenDota's repository, Valve's map art. Sources, sizes and SHA-256 are in [dota-map-assets.json](dota-map-assets.json). Every square image now occupies `[0, 0, 800, 800]` without stretching. Geometry is measured relative to that image, rather than fitting the picture around the old 90–710 lane square. The 7.33+ images crop the expanded outer terrain: the surrounding land, paths and objective sites remain a visibly simplified extension, not recovered full-map artwork.

## Paths

Each era builds its path network from the same lane and tower anchors used by the battle, its traced river and explicit jungle junctions on each side, plus outer paths on 7.33+. Lanes include all three tower tiers and the actual base endpoints. Creeps use these paths in opposite directions; heroes spawn, respawn and retreat at those bases. Lanes and river are 30 units wide, trails 17. Bases and Roshan pits are open discs. Nearby visible nodes connect across corridor intersections. The network is painted onto a 10-unit grid; everything else counts as trees or cliffs.

Heroes walk straight when the line stays on open ground (exact grid traversal). Otherwise they head for the visible node with the shortest walk-plus-route to the goal, which can't oscillate. A hero knocked off a path may cross blocked cells only until it is back on open ground. Creeps keep their lane routes.

Limits: the junction networks are hand-placed approximations shared within the classic and expanded terrain families, with individual era river/pit coordinates. They are not Valve navigation meshes or every historical tree/ramp. The twelve finite simulated camps remain representative camps, not Dota's full camp catalogue; their central sites follow the terrain and outer sites use the simplified expansion. 7.38 currents, Twin Gates, Tormentors, Lotus Pools, Shrines and Outposts are described in the notes but not simulated.

## Shared coordinate correction — October 25, 2026

This supersedes the previous image-box fitting. Combat towers, base positions, creep routes, hero movement and presentation now share `geometryForEra`. OpenDota's [classic anchors](https://github.com/odota/web/blob/master/src/components/Match/BuildingMap/buildingData.ts) and [7.33 anchors](https://github.com/odota/web/blob/master/src/components/Match/BuildingMap/buildingData733.ts) supply the building layout, with icon-origin corrections and outer-lane adjustments checked against the bundled images. These remain hand-aligned positions, not surveyed engine coordinates. Tower frames carry optional lane/tier identity, so labels no longer infer the lane from the obsolete square layout. Tier 3/4 towers and barracks retain their existing reference-only behavior.

Roshan is centred on the illustrated pit in each overview, including the previously missed 6.82 shift. The 7.33 corner pits sit beyond the central crop; 7.38/7.40 use the two pictured river pits. Existing day/night timing and combat disengagement rules remain. Tormentor references use the same map boundary and retain the displayed 7.40 layout in 2026.

This changes travel and combat outcomes. `MAP_PATHS_VERSION` is now `map-paths-v2-art-coordinates`; old calibration cannot activate. No balance job was started, stopped or certified. Legacy unpatched battles retain their old coordinates, and archived results are not rewritten. New geometry applies when a battle is created; an already-running worker retains its original map.

Validation: all **315 tests**, TypeScript/production build and `git diff --check` pass. Tests compare combat and displayed anchors across all 32 historical composites, verify both teams' complete creep routes, and walk routes to both pits and every representative camp across all eleven terrains. Isolated localhost 5342 real-worker QA verifies a fresh 2023.1 scrim, pause/minute step to 6:00, live tower coordinates, creep movement and the night Roshan pit. Era asset selections, classic/6.82 pit changes, 7.33 corner and 7.38 river day/night fixtures, and 390px/320px containment were checked without reading or writing a normal campaign. Build output and screenshots are ignored under `.local/map-alignment-*`.

## Structures and neutral objective signals — October 25, 2026

Local, not published. Both live matches and recorded playback use `MapObjectives.tsx`
and `map-objectives.ts` for the same structure overlay: eleven towers, three pairs of
melee/ranged barracks and one Ancient on each side. The green/red Valve minimap
artwork comes from OpenDota; local files, sources and SHA-256 hashes are recorded in
[map-objective-assets.json](map-objective-assets.json). Mid-lane icons use the
diagonal variants. Unavailable artwork falls back to a simple SVG silhouette.

The current combat engine has **two towers per lane and one Ancient per team**.
Those fourteen real entities retain their actual match coordinates, HP bars and
destroyed state. Tier 1/2 labels are resolved by lane and distance from their base,
including destroyed entities, rather than by spawn order. Tier 3/4 towers and
barracks are **layout references**, with dotted outlines and explicit tooltips;
they have no invented HP, destruction, protection or creep upgrades. Reference
positions use OpenDota's classic/7.33 building anchors inside the existing era art
boxes. This is an adapted layout, not a claim of surveyed coordinates for every
historical terrain revision. Legacy replays without a patch retain the sketch
terrain and gain the structure icons without changing their match data.

Roshan uses Valve's original white HUD/minimap skull artwork, highlighted active location and real snapshot
health/respawn state. The 7.33 map also marks the alternate empty pit; 7.38 onward
shows only the active pit. The status key reports this simulation's actual
eight-minute respawn countdown. It does not invent Dota's 8–11 minute uncertainty
or change the existing pit-switching/20-second disengagement rule.

Tormentor markers use Valve's original blue Radiant and red Dire minimap-side
timer artwork; the legend shows the same icon for each displayed site. Sources
and hashes for all three local WebP files are in the asset ledger. Current HUD
artwork is reused across eras rather than claiming separate historical icon
revisions. SVG drawings remain only as image-load fallbacks.

Tormentor signals follow the versions included in the pinned composite:

| Composite | Location reference | Initial spawn reference |
|---|---|---|
| Before 2023.1 | No Tormentor markers | Not introduced |
| 2023.1–2024.2 (7.33+) | Two offlane sites, near each base | 20:00 |
| 2025.1 (7.38) | One corner site: Dire by day, Radiant by night | 15:00 |
| 2025.2 (7.39) | Same rotating corner sites | 20:00 |
| 2026.1 onward (7.40 background) | Same rotating corner sites | 20:00 |

Before the initial spawn time the signal is dim; the single rotating marker points
to the expected first spawn site. Afterward it follows the match-clock day/night
cycle. Tormentor positions are hand-aligned approximations on the current map
art. The 2026 composite includes later 7.41 notes, but these location markers
follow the displayed 7.40 background. The 7.41 side reversal and Lotus Pool
relocation are deferred until that terrain is added.
These are **location/spawn references only**: Tormentor fights, HP, deaths,
respawns and Shard rewards are not simulated. The status key and tooltips say so.

Primary rule sources: [Valve 7.33](https://www.dota2.com/newfrontiers),
[Valve 7.38](https://www.dota2.com/datafeed/patchnotes?version=7.38&language=english),
[Valve 7.39](https://www.dota2.com/datafeed/patchnotes?version=7.39&language=english).
No combat, RNG, balance fingerprints, worker messages or save formats change.

Validation: the initial full run passed 305 tests. After concurrent geometry
integration, all ten map/overlay tests and TypeScript/production build pass.
The full suite is being revalidated by the active map-alignment work. Five new
cases cover the full structure layout,
tracked damage/coordinates, local artwork, snapshot immutability and neutral era
boundaries. The production build retains the existing bundle warning;
the CRLF-aware diff check passes. Disposable localhost 5338 QA verifies the real-worker
live map, pause/minute step, all eleven terrain eras, the 7.39 initial spawn change,
destroyed tower/damaged Ancient and Roshan countdown fixture, plus 390px/320px map
and key containment. No hosted campaign or clock was accessed.

## Effect on matches

Heroes now walk real routes, so rotations, retreats and Roshan attempts take longer. On 20 maps per era, games ran about 1–6 minutes longer and each map cost about 160 ms instead of 113 ms. `heroBalanceSignature` includes `MAP_PATHS_VERSION`, so balance runs measured on the old open-ground movement no longer activate. The committed calibration file holds no patches, so nothing active was invalidated.

## Playback speed

1× is 30 game seconds per real second, half the old live default. Replays default to 2× (60 game seconds per second, half the old 120). Both offer ½×, 1×, 2×, 4×, 8×, 16× and 32×. Live play sends 6-second steps every 200 ms at 1×; faster speeds step every 100 ms with larger chunks, up to 96 seconds. Worker latency makes real rates a little lower (measured: about 26 game seconds per second at 1×, about 186 at 8×). Both viewers now animate unit transforms between updates at the browser's animation-frame rate; simulation cadence and results are unchanged. See [playback optimization and measurements](simulation.md#october-24-match-playback-optimization-local).
