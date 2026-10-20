# GitHub organization and hosting

Target organization: **Dota-Team-Manager**, owned by **Jonahbyu**.
Target public repository: `Dota-Team-Manager/dota-team-manager.github.io`.
Target website: `https://dota-team-manager.github.io/`.

## Structure

- `src/`: React UI, simulation engine, worker, and dummy world data.
- `public/`: favicon and `.nojekyll` marker.
- `tests/`: simulation and campaign checks.
- `docs/`: design and implementation notes.
- `reference/`: preserved earlier prototypes, kept separate from the new app.
- `scripts/deploy-pages.mjs`: publishes the production build to `gh-pages`.

## First publication

Create the **Dota-Team-Manager** organization while signed in as **Jonahbyu**. Choose GitHub Free. Create the public `dota-team-manager.github.io` repository, push this source to `main`, then run:

```sh
npm ci
npm test
npm run deploy
```

An organization owner or repository administrator must set **Settings → Pages → Deploy from a branch → gh-pages → / (root)**. The Pages build may take a few minutes. GitHub Free Pages requires a public repository.

## Updating the site

Commit and push source changes to `main`, then run `npm run deploy` from the project directory. The deploy command builds locally and pushes only `dist/` to the explicit organization repository's `gh-pages` branch. It preserves deployment history and does not force-push. It does not require a token with the `workflow` scope or change the parent workspace's Git remote. Git and an authenticated GitHub credential helper must be available.

The app runs entirely in the browser, including its simulation worker. Campaign saves and theme choices stay in the browser that created them; localhost saves do not automatically transfer to the hosted site's different origin.

This document describes the prepared configuration. A successful GitHub Pages build and an HTTP check of the deployed URL are required before reporting publication as complete.
