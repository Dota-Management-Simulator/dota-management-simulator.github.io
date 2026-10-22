# Player portraits

Collected on **2026-10-21**. Local reference implementation; not deployed.

Portraits now cover **1,022 of 1,641 historical identity records**, up from 79, using **907 distinct source photos**: the original 79 Wikimedia Commons photos, 752 Liquipedia headshots and 76 player-card photos served by Spectral. Documented aliases sometimes exist as separate identity records in the historical database, so this is not a claim of 1,022 different people. The expansion adds 943 assignments: 858 from Liquipedia profiles and 85 from player cards.

The 320 × 400 WebP assets occupy approximately 16.2 MiB and load lazily in headquarters, roster cards, training, scouting, profiles and world-team lineups. Missing and failed images retain the colored silhouette. No save schema, ownership, finances or simulation behavior changes.

## Identity evidence and historical precision

Runtime lookup uses exact IDs from `src/data/player-identities.json`, never guessed display names. Research extracted player-profile links from all 109 Liquipedia sources already referenced by the historical rosters. An exact roster handle/known alias and country connect those links to identity records. We checked 1,028 additional distinct profiles and selected their infobox headshots, excluding generic NoImage/unknown/default files. Shared-profile aliases retain their game IDs; this work does not merge historical identities.

For a missing headshot, the card fallback requires one consistent numeric account ID across the profile's player-stat links. Of 272 such profiles, Spectral returned 76 photographs, 151 missing-card responses and 45 inconsistent account references that were skipped. Missing-card responses never enter the catalog. Source/crop contact sheets were visually reviewed; eight off-center subjects have explicit crop rectangles. Tall images keep their top edge to avoid cutting off faces.

The Israeli Fly and American Fly. now both have independently sourced photos, distinct IDs and asset paths. The separate No[o]ne/No(o)ne records also require explicit assignments. Unknown and fictional IDs never borrow a similarly named player's photo.

These are **single reference appearances, not season-specific portraits**. A later team shirt can appear in an earlier campaign; it does not establish the player's appearance, team, age or sponsorship in that season. Profiles disclose this and show photograph dates where recorded. Some old images remain low resolution. The initial eleven ambiguous Commons group-photo candidates remain excluded; most of those players now have a different headshot. Unresolved Super/Su Peng and nongrata/AfterLife profile conflicts were not assigned guessed portraits.

## Sources, credits and reuse status

- [Wikimedia Commons player categories](https://commons.wikimedia.org/wiki/Category:Dota_2_players): the original 79 photos retain their file-specific Creative Commons licenses, photographers and source links. CC BY-SA derivatives retain their respective share-alike licenses.
- [Liquipedia Commons](https://liquipedia.net/commons/Main_Page): each selected headshot is linked by a tournament-referenced player profile. Every selected file page was checked for author/copyright, date, source links and licensing statement. Liquipedia's text license does not license its images.
- [Spectral Resources Hub](https://ru.spectral.gg/reshub): its documented `dota/players/{account_id}.png` resource serves TI-compendium/player-card photos. The hub, account identity evidence and exact image URL are retained. Steam profile avatars, arbitrary social-media photos and generated likenesses are not used.

**The expanded local collection has mixed rights and is not blanket publication clearance.** Among 943 supplemental record assignments, five carry explicit CC licenses, eleven record EPICENTER's attribution-based permission, 169 have explicit restrictions/all-rights-reserved statements, and 758 lack independently verified permission for reuse by this project. Permission granted only to Liquipedia is recorded as **Liquipedia-only permission**, not permission granted to this game. Public team-supplied files and official player cards are not presumed freely licensed.

Profiles link the photo author/source and license or reuse status. The complete `player-portraits/credits.json` manifest includes captured rights statements and primary source links. Resolve applicable rights or exclude/replace restricted and unverified entries before publishing this expansion. It remains local and has not been deployed.

## Files and regeneration

- `src/data/player-portraits.json`: complete catalog, exact identity evidence and per-file rights metadata.
- `src/data/player-portrait-index.json`: generated display fields loaded by the app in a separate small chunk; full provenance remains in the catalog and shipped credits manifest.
- `scripts/data/player-portrait-references.json`: original Commons selections and excluded group-photo files.
- `scripts/data/player-portrait-supplements.json`: supplemental roster/profile/image references, captured rights statements, account evidence and reviewed crops.
- `public/player-portraits/`: local WebP assets and complete credits. Different identity IDs have distinct generated paths, including explicitly documented aliases sharing a source.
- `src/player-portraits.ts`, `src/PlayerAvatar.tsx`: exact-ID lookup, display, error fallback and profile credits.
- `scripts/import-player-portraits.py`: Commons `discover`/`import`; refreshing Commons preserves supplements.
- `scripts/import-player-portrait-supplements.py`: import selected supplements while preserving Commons. Reviewed hosts only; missing-card HTTP responses fail. Shared sources download once before aliases render; pruning is restricted to exact obsolete generated paths from the prior catalog.

Run `python scripts/import-player-portraits.py import` to refresh Commons and `python scripts/import-player-portrait-supplements.py` for supplements, with requests and Pillow installed. Caches stay in ignored `.local/`. The checked-in references preserve the browser-extracted identity, file and rights evidence; regeneration does not require visiting all profiles again. New sources require identity evidence, actual image URLs, image-specific rights information and visual inspection, followed by portrait integrity tests and a production build.
