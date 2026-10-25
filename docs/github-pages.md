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
- `.github/workflows/deploy.yml`: tests, builds and runs the deploy script on every push to `main`.

## Build and publish

The organization and public repository are configured. Source lives on `main`; compiled site files live on `gh-pages`. To build and publish updates:

```sh
npm ci
npm test
npm run deploy
```

Pages is configured as **Deploy from a branch → gh-pages → / (root)** with HTTPS enforced. The Pages build may take a few minutes after a deployment. GitHub Free Pages requires a public repository.

## Updating the site

Push source changes to `main`. The **Test and deploy** workflow (`.github/workflows/deploy.yml`) runs `npm ci`, `npm test` and `npm run build`, then `scripts/deploy-pages.mjs` pushes only `dist/` to `gh-pages` using the job's `GITHUB_TOKEN`. A failing test or build stops the deploy. Runs are queued one at a time, so two quick pushes never race on `gh-pages`. It can also be started by hand from the Actions tab (`workflow_dispatch`).

`npm run deploy` still deploys manually from this machine. It builds locally and pushes only `dist/` to the explicit organization repository's `gh-pages` branch, preserves deployment history and does not force-push. Git and an authenticated GitHub credential helper must be available. Changing files under `.github/workflows/` needs a credential with the `workflow` scope.

The app runs entirely in the browser, including its simulation worker. Campaign saves and theme choices stay in the browser that created them; localhost saves do not automatically transfer to the hosted site's different origin.

Initial publication was verified with a successful Pages build, HTTP 200 responses for the page, JavaScript, CSS, favicon and worker, and a hosted-browser campaign and match simulation. Future deployments should also be checked before reporting publication as complete.

## Discord release summaries

The user wants update summaries in their Discord channel **only when they explicitly request pushing an update or publishing a release**. After the requested publication succeeds and is verified, send a concise summary of the published changes, relevant validation and the live link through their configured webhook variable. A source-only push should be described as source-only. Do not send messages for ordinary development, builds, tests or commits, and do not send a setup/test message without a separate request.

The webhook stays outside the browser application and committed files. The user identified the local secret file `resend api .txt`; its confirmed path is recorded in [the project handoff](../AGENTS.md). Read the webhook into a local variable only when sending the authorized summary; never print it. The Discord webhook is named **Aegis Updates** and targets **#dota-management-simulator**. If the webhook is unavailable or delivery fails, report that the Discord summary remains unsent. No automatic notification hook has been installed and no setup/test message has been sent.

## October 24, 2026 Battle Pass release

At the user’s request to push live, application source [`bd23b9b`](https://github.com/Dota-Management-Simulator/dota-management-simulator.github.io/commit/bd23b9b0d9b6dd57078071551e84fb86fadd0ac9) publishes all eleven Battle Pass reward showcases and tournament companions. Pages commit: `8e2acca3a6680b19ae3ba0d32b71948d2deeddd9`. [Test and deploy 40167248858](https://github.com/Dota-Management-Simulator/dota-management-simulator.github.io/actions/runs/40167248858) succeeds; Pages reports **built** without an error.

- An immutable archive of the exact source passes **291 tests** and TypeScript/production build, with the existing chunk warning. The public entry is `index-g5ciicnm.js`.
- All **2,194 deployed files** match that isolated build by Git blob hash, with no stale/missing files. **21 public resources** return HTTP 200 and match SHA-256: HTML, CSS, every JavaScript chunk including both workers, favicon and sampled reward artwork.
- A sandboxed iframe loads the actual production app with an opaque origin, preventing it from reading or writing the normal hosted save. A temporary 2022 campaign confirms Highlights, the 24-item reward gallery, four golden search matches, tournament chapters and actual Void Arcana video playback. It is not a DEV preview or a modified production bundle.
- The normal hosted app loads the new entry with no browser errors and retains Atlas Esports, week 4, $90,000, Kestrel/Solace/Oak/Static/North and the Founders Open win. No campaign time was advanced.
- The authorized **Aegis Updates** summary was delivered (HTTP 200, receipt `1563793827683106857`). The webhook remains external and was neither printed nor committed. Build/test logs, public verification and browser screenshot are ignored under `.local/release-bd23b9b/`.

Earlier local/unpublished Battle Pass notes are pre-release snapshots superseded by this publication record. Existing work and background jobs remain intact. Reward coverage and adaptation limits remain documented in [Battle Passes](tournament-battle-passes.md).

## October 24, 2026 release

The user requested **pushing everything and making it live on Pages**. Final application source [`95380d0`](https://github.com/Dota-Management-Simulator/dota-management-simulator.github.io/commit/95380d09680b0e24f16cd50b909ef65396c6e3c4), Pages `e46ee9bb602852882d0b5fc2a02b98cdf5b43f5a`. [Test and deploy run 40121864370](https://github.com/Dota-Management-Simulator/dota-management-simulator.github.io/actions/runs/40121864370) succeeds and Pages reports **built** without an error.

- Release `deac7af` publishes all initially pending project changes: era clients, TI/event screens, hero gallery, draft portrait grid, era maps/paths/playback speeds, sponsor negotiator and Arcade exhibitions. The completed smooth-playback follow-up is included in `95380d0`; nothing completed remains uncommitted. The local disposable patch preview is intentionally DEV-only.
- The initial hosted check found a legacy compatibility failure: weekly inbox labels such as `2011 · Week 4` were passed to the date formatter by the new client panels. Follow-up `a8aac09` preserves those labels in both clients and the inbox; a new regression test protects old saves. The final source snapshot passes **279 application tests** and TypeScript/production build, with the existing chunk-size warning. Tests/build also pass in Actions.
- Every one of the **1,694 deployed files** matches the isolated release build by Git blob hash, with no stale or missing files. Sixteen public resources return HTTP 200 and match SHA-256: HTML, CSS, all JavaScript including both workers, favicon, hero icon, selected menu artwork/video and 7.00/7.38 map images. The final entry is `index-DDoF5tEt.js`. Receipts and build/test logs are ignored under `.local/release-95380d0/`.
- A hosted-browser reload confirms that final entry and the new client. Atlas Esports retains **week 4 / 2011, $90,000**, Kestrel/Solace/Oak/Static/North at their existing condition, and the Founders Open win. Staff shows Taylor Mercer’s negotiator role and the finance view links to hiring. No hosted clock advance, hire, new deal or match occurred. The final entry produced no browser errors during the smoke check.
- The authorized **Aegis Updates** Discord summary was delivered (HTTP 200, receipt `1563624226605506582`). The configured webhook remained in its external secret file and was neither printed nor committed.
- The frozen CPU jobs were preserved. This publication does not certify hero balance, complete tournament/history coverage or asset reuse rights. Earlier local/unpublished labels describe pre-release implementation snapshots and are superseded for publication status.

## October 23, 2026 release

**Team scouting and staff draft preparation:** application source `f68562433560f191eca999a8896a5fbb6bc7db4d`, Pages `b41eb7750e7f3e85920bb07b37a95df42828fcb7`. The user explicitly requested pushing the change. [Test and deploy](https://github.com/Dota-Management-Simulator/dota-management-simulator.github.io/actions/runs/40043054761) completed successfully, and Pages reports **built** without an error.

- All **210 application tests** pass locally and in Actions; TypeScript and production build pass with the existing chunk-size warning. Prior isolated 5313 QA covered actual staff preparation, drafting/worker settlement, saved scouting evidence and desktop/390px light/dark layouts.
- Public HTML, CSS, all JavaScript chunks including both workers, favicon and `hero-icons/axe.png` return HTTP 200 and match both `dist/` and the deployed branch by SHA-256. The ignored receipt is `.local/team-scouting-release-verification.json`.
- A hosted-browser reload exposes **Scout your next series** and **Teams**. Atlas Esports retains week 4, $90,000 and its Kestrel/Solace/Oak/Static/North lineup and displayed condition values. The next-series view correctly identifies Nova Assembly for the legacy circuit, and the directory displays the club and opponent. No hosted clock advance, hiring or draft-plan application was performed.
- The authorized **Aegis Updates** Discord summary was delivered successfully (HTTP 200, receipt `1563342829726601378`). The webhook remained in the external local secret file and was not printed or committed. No test message or unconditional posting hook was added.
- The separate current-meta balance run was preserved and remains governed by its own status/verification gates. This release makes no balance-completion claim. Earlier local/unpublished scouting labels are pre-release snapshots.

**Restored scoreboards and tournament format audit:** source `54cbeea`, Pages `996ff33351377a265fd6300d85c30267c062236c`. The user requested auditing other leagues and publishing the update. Watched/skipped managed matches now open saved map scoreboards, with active/archive reopening for managed and compact AI records. The format importer separates regular groups from qualifier/tiebreak/playoff rules, preserves BO1 double round robins, recovers missing default wins and fixes round headings. Coverage is **96 ready / 385 needing review / two scheduled** after restricting sixteen formerly accepted events with unsupported or incomplete rules; complete historical/DPC/world-event simulation is not claimed.

- The isolated committed-source snapshot passes **145 application tests, 13 parser tests and the production build** (existing chunk-size warning). Each ready event resolves eight seeded alternate advancement paths. A real worker match in the isolated production build opens ten player rows and two resource graphs without browser errors.
- Pages reports **built**, without an error. Public HTML, CSS, every JavaScript file including both workers, favicon and `hero-icons/axe.png` return HTTP 200 and match the release build by SHA-256.
- A hosted-browser reload uses `index-Bbf9UcIM.js`, retains Atlas Esports' week 4 / $90,000 and identical Kestrel/Solace/Oak/Static/North roster values, and reopens the existing two-map Founders Open result with ten player rows. No hosted time was advanced or new match played.
- Shared-folder patch-system work that appeared during the audit was preserved. Only the tournament/scoreboard changes were committed for this release; deployment used an isolated archive of that commit rather than the mutable shared working directory.
- The authorized Aegis Updates Discord summary was delivered successfully (HTTP 200, receipt `1563088286497636353`). The external secret URL was not printed or committed. No automatic notification hook was added.

Earlier local/pending labels describe pre-release snapshots and are superseded for publication status only. Full findings and limitations are in [the audit](tournament-audit.md).

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
