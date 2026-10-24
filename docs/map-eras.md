# Era maps and hero paths

Every patched match shows the Dota map of its era and moves heroes along that map's paths. Code: `src/map-eras.ts` (eras, art placement, Roshan pits, changes) and `src/map-paths.ts` (walkable corridors and routing). Tests: `tests/map-eras.test.ts`.

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

Eleven WebP images (~2.1 MB) from OpenDota's repository, Valve's map art. Sources, sizes and SHA-256 are in [dota-map-assets.json](dota-map-assets.json). Each image is stretched into a box so its lanes meet the engine's lane square (90–710): `[23.5, -12, 770, 830]` for the 6.70–7.32 images, `[59, 62, 681, 681]` for 7.33–7.40. The boxes were fitted by eye against the lane strips and OpenDota's tower positions. The 7.33+ images cover the central map only, so the New Frontiers outer land is drawn as a plain ring around the art.

## Paths

Each era builds a path network from the three lanes, its river line and shared jungle trails (mirrored for Dire), plus the outer ring and lane links on 7.33+. Lanes and river are 30 units wide, trails 17. Bases and Roshan pits are open discs. The network is painted onto a 10-unit grid; everything else counts as trees or cliffs.

Heroes walk straight when the line stays on open ground (exact grid traversal). Otherwise they head for the visible node with the shortest walk-plus-route to the goal, which can't oscillate. A hero knocked off a path may cross blocked cells only until it is back on open ground. Creeps keep their lane routes.

Limits: the jungle trails are hand-placed approximations shared by every pre-7.33 era, so they don't follow each image's exact tree lines; 7.38 currents, Twin Gates, Tormentors, Lotus Pools, Shrines and Outposts are described in the notes but not simulated.

## Effect on matches

Heroes now walk real routes, so rotations, retreats and Roshan attempts take longer. On 20 maps per era, games ran about 1–6 minutes longer and each map cost about 160 ms instead of 113 ms. `heroBalanceSignature` includes `MAP_PATHS_VERSION`, so balance runs measured on the old open-ground movement no longer activate. The committed calibration file holds no patches, so nothing active was invalidated.

## Playback speed

1× is 30 game seconds per real second, half the old live default. Replays default to 2× (60 game seconds per second, half the old 120). Both offer ½×, 1×, 2×, 4×, 8×, 16× and 32×. Live play sends 6-second steps every 200 ms at 1×; faster speeds step every 100 ms with larger chunks, up to 96 seconds. Worker latency makes real rates a little lower (measured: about 26 game seconds per second at 1×, about 186 at 8×).
