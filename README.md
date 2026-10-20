# Aegis Manager

A local, browser-based Dota-inspired management prototype. React + TypeScript + Vite; fictional data is loaded from `src/data/world.json`, separate from the UI and simulation engine.

## Run

Requires Node.js 20.19+ or 22.12+.

```sh
npm install
npm run dev
```

Open the Local URL printed by Vite. `npm run build` creates `dist/`; `npm run preview` serves that production build. `npm test` runs the simulation checks. The app is intentionally self-contained in this folder and does not modify the parent project's application.

## Publishing

The prepared GitHub Pages destination is `Dota-Team-Manager/dota-team-manager.github.io`. Run `npm run deploy` to build and publish the static app to its `gh-pages` branch. First-time setup and repository organization are described in [GitHub Pages setup](docs/github-pages.md). Hosting uses relative asset URLs and supports the background match worker.

## Implemented scaffold

- Campaign setup: team name, region, 2011–2036 start year, three difficulty levels with different starting budgets and opponent modifiers. The 2011 option is the classic starting point.
- Headquarters, player profiles (12 skills plus happiness/energy), 1–10 playstyle ratings, roster, free-agent signing, individual training/recovery, support staff hiring.
- An illustrative 18-week season with five events. Earn 80 points or win the regional qualifier to enter TI; qualifying is not guaranteed. Skipping events is supported. Each event is simplified to a best-of-three decider, resolved by a lane-combat engine adapted from the supplied Lane Siege prototype.
- Watch accelerated map playback with pause and 1×/2×/4× controls, or skip to the same result. Match computation runs in a Web Worker. Hero K/D/A, levels, gold, XP, last hits, duration, towers, and interactive gold/XP advantage graphs are saved per game and reopen from Season history → Details.
- Weekly wages and sponsor income, signing bonuses, reputation gates, transaction history, and an ongoing season archive.
- Browser autosave under `aegis-manager-campaign-v1`; replacement campaigns require confirmation. Each browser/profile has its own single save. Clearing site data removes it.
- Responsive UI, keyboard-accessible dialogs, reduced-motion support.
- Light/dark mode from the top-bar toggle or Campaign settings. Appearance follows your system preference initially, then remembers your selection independently of campaign saves.

## Patch placeholder model

`world.json` contains seven 0–100 patch attributes: **tempo, farming economy, lane importance, teamfight impact, objective pressure, vision advantage, split-push viability**. Each has labels and a short explanation. Featured meta heroes now come from the classic pool (Storm Spirit, Beastmaster, Weaver, Chen, Earthshaker). Roles, tags, strength values, and combat values remain placeholders. No values claim to represent a real historical patch.

`src/data/heroes-2011.json` contains the 46 TI1-contested heroes, with modern display names and a source link. Patch & meta includes a searchable, position-filtered hero catalog. The classic campaign excludes later hero releases; later seasons currently retain the classic pool until additional era data is supplied. See [simulation notes](docs/simulation.md) for provenance and modeling limits.

The lane engine simulates movement, waves, attacks, four generic ability archetypes, healing/retreat, gold/XP acquisition, leveling, respawn, towers, and Ancient destruction. Each Ancient destruction awards a game; two games win a series. Randomness supplies drafts and player form, never a separate winner roll. A labeled overtime siege rule breaks stalemates. Player laning, teamfight, skirmish, stability, farming and intuition, plus energy, happiness, difficulty and analyst preparation, affect combat. Patch and playstyle values are modeled and displayed but do not yet modify outcomes. Playback does not influence outcomes. Only compact scoreboards and resource timelines are persisted; replay frames stay in memory. Existing saves and older roll-based result summaries remain readable.

## Intentionally deferred

Historical player and balance data imports; accurate TI numbering, actual tournament formats/calendars, patches per tournament, additional hero-release eras, manual drafting, tactical orders, exact Dota abilities/items, confidence-by-stage behavior, detailed hero proficiency, bootcamps and strategy secrecy, automatic historical roster shuffles, injuries, procedural future-world generation, contracts beyond weekly wages, multiple save slots, accounts, and backend storage. Years can advance beyond the selected start year, but rosters are not procedurally replenished yet.

The region currently identifies the organization; it does not change opponents or free-agent eligibility. Player ratings are illustrative. Difficulty affects starting cash and your team's combat modifier. Training effects are deliberately simple and deterministic. The project uses a Google Fonts stylesheet with local system-font fallbacks.
