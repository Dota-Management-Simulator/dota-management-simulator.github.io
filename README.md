# Aegis Manager

A local, browser-based Dota-inspired management prototype. React + TypeScript + Vite, with separate application, simulation and JSON data modules. Annual historical player/team and hero-release batches cover 2011–2026; gameplay ratings and finances remain estimates. These historical updates are local and have not yet been deployed.

**[Play the live simulator](https://dota-management-simulator.github.io/)** · [Source repository](https://github.com/Dota-Management-Simulator/dota-management-simulator.github.io)

## Project context

Start a new development chat with [AGENTS.md](AGENTS.md). It describes the current build, architecture, saves, simulation rules and deployment workflow. [The roadmap](docs/roadmap.md) preserves the original campaign vision, future systems and unresolved design decisions separately from implemented features.

## Run

Requires Node.js 20.19+ or 22.12+.

```sh
npm install
npm run dev
```

Open the Local URL printed by Vite. `npm run build` creates `dist/`; `npm run preview` serves that production build. `npm test` runs the simulation checks. The app is intentionally self-contained in this folder and does not modify the parent project's application.

## Publishing

GitHub Pages publishes from `Dota-Management-Simulator/dota-management-simulator.github.io`. Run `npm run deploy` to build and publish the static app to its `gh-pages` branch. Hosting and repository organization are described in [GitHub Pages setup](docs/github-pages.md). Hosting uses relative asset URLs and supports the background match worker.

## Implemented scaffold

- Campaign setup: manage an original TI1 club, or a historical club from the prior completed annual batch for later starts. Custom clubs replace one, inheriting its region and players. Three difficulty levels change budgets and combat modifiers.
- Historical world: 100 opening identities/19 clubs, expanding through annual imports to 1,641 identity records by the 2026 shuffle. TI fields and selected regional/closed qualifier teams supply real handles and roster references; roles remain adapted. Shared club rosters supply actual opposition names. World teams exposes current lineups and source links; scouting searches aliases, clubs and regions. See [coverage, provenance and limitations](docs/historical-rosters.md).
- Headquarters, player profiles (12 skills plus happiness/energy), 1–10 playstyle ratings, roster, recruitment from clubs or free agents, regional vacancy replacements, individual training/recovery, support staff hiring.
- Local portraits cover 1,022 historical player records using 907 distinct source photos from Wikimedia, Liquipedia and Spectral player cards. Profiles retain source/rights links; missing images use silhouettes. Exact identity matching and non-season-specific appearances are preserved. The expansion has mixed reuse rights and remains local, not deployed. See [portrait coverage and credits](docs/player-portraits.md).
- An illustrative 18-week season with five events. Earn 80 points or win the regional qualifier to enter TI; qualifying is not guaranteed. Skipping events is supported. Each event is simplified to a best-of-three decider, resolved by a lane-combat engine adapted from the supplied Lane Siege prototype.
- Watch accelerated map playback with pause and 1×/2×/4× controls, or skip to the same result. Match computation runs in a Web Worker. Hero K/D/A, levels, gold, XP, last hits, duration, towers, and interactive gold/XP advantage graphs are saved per game and reopen from Season history → Details.
- Weekly wages and sponsor income, signing bonuses, reputation gates, transaction history, and an ongoing season archive.
- Browser autosave under `aegis-manager-campaign-v1`; replacement campaigns require confirmation. Each browser/profile has its own single save. Clearing site data removes it.
- Responsive UI, keyboard-accessible dialogs, reduced-motion support.
- Light/dark mode from the top-bar toggle or Campaign settings. Appearance follows your system preference initially, then remembers your selection independently of campaign saves.

## Patch placeholder model

`world.json` contains seven 0–100 patch attributes: **tempo, farming economy, lane importance, teamfight impact, objective pressure, vision advantage, split-push viability**. Each has labels and a short explanation. Featured meta heroes now come from the classic pool (Storm Spirit, Beastmaster, Weaver, Chen, Earthshaker). Roles, tags, strength values, and combat values remain placeholders. No values claim to represent a real historical patch.

`src/data/heroes-2011.json` contains the 46 TI1-contested heroes. `src/data/hero-releases.json` adds 81 heroes in release-year batches through 2026, for a total of 127. Additions unlock at that year's post-TI shuffle, including late-year releases. This is a game rule, independent of Captain's Mode eligibility. Patch & meta shows the currently eligible, searchable hero catalog. See [simulation notes](docs/simulation.md) for provenance and modeling limits.

The lane engine simulates movement, waves, attacks, four generic ability archetypes, healing/retreat, gold/XP acquisition, leveling, respawn, towers, and Ancient destruction. Each Ancient destruction awards a game; two games win a series. Randomness supplies drafts and player form, never a separate winner roll. A labeled overtime siege rule breaks stalemates. Player laning, teamfight, skirmish, stability, farming and intuition, plus energy, happiness, difficulty and analyst preparation, affect combat. Patch and playstyle values are modeled and displayed but do not yet modify outcomes. Playback does not influence outcomes. Only compact scoreboards and resource timelines are persisted; replay frames stay in memory. Existing saves and older roll-based result summaries remain readable.

## Intentionally deferred

Exhaustive lower-tier coverage and individually verified historical positions, era-specific signature heroes, historical balance assessments, accurate TI numbering, actual tournament formats/calendars, patches per tournament, manual drafting, tactical orders, exact Dota abilities/items, confidence-by-stage behavior, detailed hero proficiency, bootcamps and strategy secrecy, injuries, retirement/procedural future-world generation, contracts beyond weekly wages, multiple save slots, accounts, and backend storage. Years beyond 2026 continue the alternate timeline with the latest imported pool.

Region identifies a club and the real-player pool used to refill its vacancies. Difficulty affects starting cash and your team's combat modifier. Training effects are deliberately simple and deterministic. Older fictional saves remain intact. The project uses a Google Fonts stylesheet with local system-font fallbacks.
