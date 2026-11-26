# WAFFER — browser deployment

Target repository: https://github.com/mczdj/waffer

Expected website: https://mczdj.github.io/waffer/ (only after successful deployment).

## Local development

Use Node.js 22 (at least 22.13) and npm. Extract the source ZIP and open the `waffer` folder.
Keep your existing `.env` if you have one, or copy `.env.example` to `.env` and set
`EXPO_PUBLIC_OFFERS_API_URL=https://waffer-api-3rvu.onrender.com`. The SerpApi key belongs only on the backend; it is not needed by the website.

```sh
npm ci
npm run web
```

The normal Expo browser development server runs at the root URL. The GitHub Pages build instead uses `/waffer/` as its base path:

```sh
npm run typecheck
npm run test:map
npm run build:pages
```

`dist/` contains the production website. To preview it at the correct base path, use a local static server with `dist` mounted at `/waffer/`; for example from the parent folder create a `preview/waffer/` directory, copy the contents of `dist` there, and run `python -m http.server 8080 --directory preview` and visit `http://localhost:8080/waffer/`. Do not double-click `index.html`, because the production asset URLs start with `/waffer/`.

## Publish with GitHub Actions (recommended)

1. Clone the existing repository, or open your existing local clone. Copy the updated source files from `waffer/` into the repository root (including the hidden `.github` directory and `.gitignore`). Do not overwrite the existing `.git` directory or `.env`. Do not copy `node_modules` or `dist`.
2. In the repository on GitHub, open **Settings → Pages → Build and deployment → Source** and choose **GitHub Actions**. A public repository or an eligible GitHub plan is required.
3. Optional: in **Settings → Secrets and variables → Actions → Variables**, create `EXPO_PUBLIC_OFFERS_API_URL` with the HTTPS backend URL if it differs from the existing Render URL. The build defaults to `https://waffer-api-3rvu.onrender.com` when no variable is configured.
4. In your local clone, run `git status`, review the changes, then `git add .`, `git diff --cached --stat`, `git commit -m "Add WAFFER web app and GitHub Pages deployment"`, and `git push`. Use the repository's default branch. The workflow triggers on `main` or `master`; for another default branch use Actions → Deploy WAFFER web to GitHub Pages → Run workflow and select that branch, or adjust the trigger.
5. Open **Actions → Deploy WAFFER web to GitHub Pages** and check the build and deploy jobs. If necessary run it manually on the default branch. Once successful, the Pages settings will show the deployed address.

## Backend and privacy

GitHub Pages cannot run `server/index.mjs`. Continue running that server on Render. The included server already sends permissive CORS headers for browser requests; confirm the live deployed version does as well. Live searches and map data require a reachable backend, while map imagery is loaded from OpenStreetMap. Browser GPS requires HTTPS or localhost and user permission. The web build is a normal website, not an installable PWA. Do not publish `.env`, private keys, or API secrets. The public API URL is intentionally embedded in the frontend.

## Verification checklist after deployment

- Open the website in a desktop and a mobile browser; check that the home page, navigation, and favicon load.
- Open Groceries, allow location permission or choose a UAE area, check store markers, zoom, filter and directions.
- Search grocery and shopping items, check deals, test basket and dark mode.
- Verify the mobile build still works using `npm start` or the existing EAS workflow.

## Build validation in the preparation environment

TypeScript, map unit tests, and the production Expo web export passed. The generated index references `/waffer/` assets. Browser execution and live Render/GitHub verification were blocked by environment network/browser restrictions. No repository was modified remotely.
