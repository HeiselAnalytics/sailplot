# Deployment

## Build

Run `npm ci`, `npm test` and `npm run build`. The deployable output is `dist/`. The historical Qt source directory is outside Vite’s source graph and is ignored by all modern tooling.

## GitHub Pages

The included workflow deploys on `main`. Enable GitHub Pages with GitHub Actions as its source. Vite’s relative base keeps asset URLs valid at `https://username.github.io/repository-name/`; share links retain the current path before adding the URL fragment.

The service worker precaches the application shell. Deployment should be served over HTTPS so service workers, clipboard access and PWA installation are available.

## Custom domain

Add the domain in GitHub Pages settings and configure DNS as instructed by GitHub. The application makes no assumption about a fixed hostname. If a `CNAME` file is later added, keep it in `public/`.

## Recovery

Deployments do not contain user projects. Projects live in each browser’s IndexedDB. Users should export JSON backups before clearing site data, changing browsers or resetting a device.
