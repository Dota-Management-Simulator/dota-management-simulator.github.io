# Historical team logos

Reviewed on **2026-10-21**. Implemented locally; not deployed.

The catalog audits all **463 historical club IDs** in the roster database. **408** have sourced images, using **473 distinct bundled assets**; **55** remain missing. There are 44 clubs with more than one observed logo version. All 19 opening-world clubs have logos, including all 16 TI1 entrants.

## Selection and precision

The application selects the latest recorded annual observation at or before the displayed campaign year. Setup, sidebar, world teams, pre-match, playback and results use the same resolver. Archived results use their own year. No save migration, roster change or simulation change is required. Custom clubs keep their own initials, including when replacing a club with a known logo. Unknown and legacy club identities do not resolve by an arbitrary name match.

The evidence comes from rendered logo links on the 99 dated tournament and regional-qualifier pages already used by the roster imports. The first image link for each known team title, generally a historical prize/standings table, is used; these often preserve older logos while participant cards show current branding. The roster's own source page takes precedence over other same-year pages. Source and Commons file links remain attached to every observation. A version year is an **observation year, not an exact rebrand date**. Carrying an observation forward is a game display convention, not proof that the organization never changed its logo between observations. Later campaigns retain the latest documented version after 2026. Sponsor marks can change within a year; this implementation has annual precision.

Files whose names clearly refer to a later year are excluded from earlier snapshots. One reviewed exception is `Mousesports_2016_allmode.png`: the [MOUZ gallery](https://liquipedia.net/dota2/Mousesports) calls it the original logo before October 14, 2021, and early event tables use it; its filename year is not treated as an introduction date. The [It's Gosu profile](https://liquipedia.net/dota2/It%27s_Gosu_eSports) supplies the short-lived 2011–2012 organization's logo, and the [Natural 9 gallery](https://liquipedia.net/dota2/Natural_9) explicitly supplies its original logo. Those two opening-year assignments use organization-era/gallery evidence rather than a dated logo announcement. Exact debuts remain unverified. Generic Dota/game icons are excluded. A missing image or a failed browser load shows initials.

This is broad coverage, not a claim of exhaustive historical brand verification. Some regional stacks had no identifiable custom image in the consulted references. Missing clubs and unknown early eras remain visible gaps rather than borrowing a later badge or a parent organization's identity.

## Sources and assets

- `src/data/team-logos.json`: club IDs, aliases, first reference year, dated logo observations, source pages, original image URLs and Commons file pages.
- `scripts/data/team-logo-references.json`: checked-in browser-extracted evidence, supplementary profile references and the reviewed filename exception.
- `public/team-logos/`: 128-pixel lossless WebP thumbnails, approximately 4.2 MiB total. Neutral light badge tiles preserve contrast in both themes. Original files are cached under ignored `.local/team-logo-originals/`.
- `scripts/import-team-logos.py`: reproducible matching, download validation and image conversion. Run `python scripts/import-team-logos.py` from this root with Pillow installed. It reuses the checked-in evidence, does not scrape HTML or guess image URLs, and writes an import report under `.local/`.

Images are team trademarks belonging to their respective owners. Liquipedia's text license is **not** asserted as a blanket license for these images. Consult each linked Commons file page for media rights and attribution. The project does not claim ownership of third-party team marks.

## Clubs without a verified bundled logo

| Club ID | Reference name |
| --- | --- |
| `whb` | Wild Honey Badgers |
| `blitz` | BlitZ |
| `nookie` | Nook1e |
| `nd9` | ND9 1 |
| `aol` | AOL |
| `artyk-gaming` | Artyk Gaming |
| `ice` | Ice |
| `msi-evogt` | MSI-EvoGT |
| `mineski-sports5` | Mineski.Sports5 |
| `aogiri` | aogiri |
| `doggydogs` | doggydogs |
| `for-the-pig` | For The Pig |
| `greatfaceit` | GreatFaceIt |
| `semsta-laget` | semsta laget |
| `starboyz` | Starboyz |
| `team-entelechy` | Team Entelechy |
| `team-zabijaceq` | Team zabijaceq |
| `wind-boys` | Wind Boys |
| `20-min-afk-les` | 20 min afk les |
| `young-dumb` | Young Dumb |
| `old-suck-gaming` | Old Suck Gaming |
| `six-eight-two` | six eight two |
| `team-ham` | Team Ham |
| `sadboys` | SadBoys |
| `team-dog` | Team Dog |
| `bumble-bee-s` | bumble bEE's |
| `ex-south-built-esports` | ex-South Built Esports |
| `vision` | Vision |
| `4-amigos` | 4 Amigos |
| `dandelions` | Dandelions |
| `justbetter` | JustBetter |
| `la-correntada` | La Correntada |
| `mamuteros` | MAMUTEROS |
| `old-warrior` | Old Warrior |
| `the-chapulines` | The Chapulines |
| `the-hut` | The Hut |
| `tolight-team` | ToLight Team |
| `underdog` | Underdog |
| `bsj-and-friends` | BSJ and friends |
| `castawake` | Castawake |
| `excel-esports` | Excel Esports |
| `future-esport` | Future Esport |
| `sustancia-x` | Sustancia X |
| `team-curtain` | Team Curtain |
| `team-slayers` | Team Slayers |
| `teamdk` | TeamDk |
| `trailer-park-boys` | Trailer Park Boys |
| `tt-geam` | Tt Geam |
| `4-anchors-and-ilmeria` | 4 Anchors and Ilmeria |
| `gg-boom` | GG Boom |
| `grey-track` | Grey Track |
| `grind-back` | Grind Back |
| `lindorfitos` | Lindorfitos |
| `rising-rage` | Rising Rage |
| `the-bug` | The Bug |
