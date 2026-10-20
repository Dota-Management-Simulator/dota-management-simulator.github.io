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
