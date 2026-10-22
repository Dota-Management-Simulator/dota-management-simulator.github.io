# GitHub organization and hosting

Organization: **Dota-Management-Simulator**, owned by **Jonahbyu** (verified active organization owner).
Public repository: [Dota-Management-Simulator/dota-management-simulator.github.io](https://github.com/Dota-Management-Simulator/dota-management-simulator.github.io).
Live website: [dota-management-simulator.github.io](https://dota-management-simulator.github.io/).

## Structure

- `src/`: React UI, simulation engine, worker, and dummy world data.
- `public/`: favicon and `.nojekyll` marker.
- `tests/`: simulation and campaign checks.
- `docs/`: design and implementation notes.
- `reference/`: preserved earlier prototypes, kept separate from the new app.
- `scripts/deploy-pages.mjs`: publishes the production build to `gh-pages`.

## Build and publish

The organization and public repository are configured. Source lives on `main`; compiled site files live on `gh-pages`. To build and publish updates:

```sh
npm ci
npm test
npm run deploy
```

Pages is configured as **Deploy from a branch → gh-pages → / (root)** with HTTPS enforced. The Pages build may take a few minutes after a deployment. GitHub Free Pages requires a public repository.

## Updating the site

Commit and push source changes to `main`, then run `npm run deploy` from the project directory. The deploy command builds locally and pushes only `dist/` to the explicit organization repository's `gh-pages` branch. It preserves deployment history and does not force-push. It does not require a token with the `workflow` scope or change the parent workspace's Git remote. Git and an authenticated GitHub credential helper must be available.

The app runs entirely in the browser, including its simulation worker. Campaign saves and theme choices stay in the browser that created them; localhost saves do not automatically transfer to the hosted site's different origin.

Initial publication was verified with a successful Pages build, HTTP 200 responses for the page, JavaScript, CSS, favicon and worker, and a hosted-browser campaign and match simulation. Future deployments should also be checked before reporting publication as complete.

## Discord release summaries

The user wants update summaries in their Discord channel **only when they explicitly request pushing an update or publishing a release**. After the requested publication succeeds and is verified, send a concise summary of the published changes, relevant validation and the live link through their configured webhook variable. A source-only push should be described as source-only. Do not send messages for ordinary development, builds, tests or commits, and do not send a setup/test message without a separate request.

The webhook stays outside the browser application and committed files. The user identified the local secret file `resend api .txt`; its confirmed path is recorded in [the project handoff](../AGENTS.md). Read the webhook into a local variable only when sending the authorized summary; never print it. The Discord webhook is named **Aegis Updates** and targets **#dota-management-simulator**. If the webhook is unavailable or delivery fails, report that the Discord summary remains unsent. No automatic notification hook has been installed and no setup/test message has been sent.

## October 22, 2026 release

**Manager workspace, TI standings and historical strength:** source `d2197b2f4ad4c102ae2e74dd7a48af5ab7a8bf5b`, Pages `dc3c334a2652d537a6f056c156db02e616871128`. The user requested pushing all outstanding project changes and posting the release summary. This publishes the Manager’s Desk, sticky campaign controls, squad comparison/dossier, TI race and standings, roster-linked historical strength and actual-result form, plus supporting data/compiler changes, tests and documentation.

- All **139 tests pass** and the production build passes with the existing large-chunk warning.
- GitHub Pages reports **built** without an error. Public HTML, CSS, all seven JavaScript files including both workers, favicon and `hero-icons/axe.png` return HTTP 200 and match `dist/` by SHA-256.
- A hosted-browser check loaded the new desk, squad and standings, preserving the legacy Atlas Esports campaign's week 4, $90,000 balance, Kestrel/Solace/Oak/Static/North lineup and saved Founders Open result. No time was advanced and no hosted match was simulated.
- The authorized Discord summary was delivered through the configured webhook (HTTP 200, message receipt `1562975543895261274`). It describes the release, validation, live/source links and the remaining historical/world-simulation limitations. The secret URL was neither printed nor committed.
- Historical coverage remains partial; skipped and unentered events still lack global world simulation. Earlier local/unpublished feature labels are superseded for publication status only.

**World roster development and skill upkeep:** source `35542de`, Pages deployment `a047b93`. New campaign players and arrivals start at 15–40 attributes; opposition rosters train and recover each elapsed week, low practice causes skill decay, and Balanced develops all attributes. The adjusted combat curve distinguishes low starting skills. Existing saved ratings remain intact. All **112 tests pass** and the production build passes with the existing large-chunk warning. GitHub Pages reports **built** for `a047b9359e071beaa24de656ec73d1286eeae00d`; public HTML, all seven JavaScript chunks (including both workers), CSS, favicon and a hero icon return HTTP 200 and match `dist/` by SHA-256. A hosted-browser smoke check retained the existing Atlas Esports legacy campaign's week 4, $90k balance, five-player roster and ratings, then confirmed the new Balanced forecasts and upkeep/decay guidance on Training. It did not advance time, alter training or replace the hosted campaign. Local interaction QA used isolated 5297. See [training rules](training.md).

**Organization-selection preview:** source `2ff2259`, Pages deployment `798cabb`. Historical team colors now apply while selecting the organization, including setup cards and artwork, and follow the actually displayed club after year changes. Pages reports **built**; public HTML, CSS, every JavaScript chunk, favicon and both workers match the production build by SHA-256. Five branding tests and the build pass; isolated 5196 browser checks cover switching clubs in light/dark mode, 2026 fallback selection and custom-club isolation.

**Club branding follow-up:** source `a52ef20` and Pages deployment `ec251a6` publish logo uploads, the crest editor and optional team-color themes. The suite has 104 passing tests and the production build passes. Pages reports **built**; HTML, all JavaScript chunks including both workers, CSS and favicon match `dist/` by SHA-256. Local browser QA covers actual image selection/rejection, color updates, save/reload and toggle persistence, historical palette sampling and mobile light/dark settings. The hosted app exposes the new Organization settings controls while preserving the existing legacy campaign's week, balance and identity. See [club branding](club-branding.md).

The user authorized pushing all current work. Source commit `ea8d84c` was pushed to `origin/main`, and `npm run deploy` published deployment commit `dd87c54` to `gh-pages`. GitHub's Pages API reports that deployment as **built**, without an error.

- All 99 tests pass; TypeScript and the production build pass. Vite retains its large-chunk warning.
- Public HTML, all seven JavaScript chunks (including battle and tournament workers), CSS, favicon and `hero-icons/axe.png` return HTTP 200 and match `dist/` by SHA-256.
- A hosted-browser smoke check loaded the existing legacy campaign with its saved week, balance, roster and results. The new inbox navigation and player contract section rendered, and Performance displayed the two saved maps with unknown older telemetry left blank. The check did not advance time, negotiate terms or simulate another match.
- The release includes the implemented historical references/assets, contracts, sponsor market, expanded training, hero icons, tournament engine/catalog, calendar/inbox and player performance. Tournament history remains partial; pending-verification entry locks are retained. The documented portrait rights remain mixed; publication is not evidence of reuse permission.

Earlier “local/not deployed” statements in feature notes record the pre-release state and are superseded by this release record for deployment status only. Ignored `.local/` fixtures, dependency directories and temporary files remain outside source control.
