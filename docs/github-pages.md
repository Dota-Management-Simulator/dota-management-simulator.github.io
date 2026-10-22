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

## October 22, 2026 release

**Organization-selection preview:** source `2ff2259`, Pages deployment `798cabb`. Historical team colors now apply while selecting the organization, including setup cards and artwork, and follow the actually displayed club after year changes. Pages reports **built**; public HTML, CSS, every JavaScript chunk, favicon and both workers match the production build by SHA-256. Five branding tests and the build pass; isolated 5196 browser checks cover switching clubs in light/dark mode, 2026 fallback selection and custom-club isolation.

**Club branding follow-up:** source `a52ef20` and Pages deployment `ec251a6` publish logo uploads, the crest editor and optional team-color themes. The suite has 104 passing tests and the production build passes. Pages reports **built**; HTML, all JavaScript chunks including both workers, CSS and favicon match `dist/` by SHA-256. Local browser QA covers actual image selection/rejection, color updates, save/reload and toggle persistence, historical palette sampling and mobile light/dark settings. The hosted app exposes the new Organization settings controls while preserving the existing legacy campaign's week, balance and identity. See [club branding](club-branding.md).

The user authorized pushing all current work. Source commit `ea8d84c` was pushed to `origin/main`, and `npm run deploy` published deployment commit `dd87c54` to `gh-pages`. GitHub's Pages API reports that deployment as **built**, without an error.

- All 99 tests pass; TypeScript and the production build pass. Vite retains its large-chunk warning.
- Public HTML, all seven JavaScript chunks (including battle and tournament workers), CSS, favicon and `hero-icons/axe.png` return HTTP 200 and match `dist/` by SHA-256.
- A hosted-browser smoke check loaded the existing legacy campaign with its saved week, balance, roster and results. The new inbox navigation and player contract section rendered, and Performance displayed the two saved maps with unknown older telemetry left blank. The check did not advance time, negotiate terms or simulate another match.
- The release includes the implemented historical references/assets, contracts, sponsor market, expanded training, hero icons, tournament engine/catalog, calendar/inbox and player performance. Tournament history remains partial; pending-verification entry locks are retained. The documented portrait rights remain mixed; publication is not evidence of reuse permission.

Earlier “local/not deployed” statements in feature notes record the pre-release state and are superseded by this release record for deployment status only. Ignored `.local/` fixtures, dependency directories and temporary files remain outside source control.
