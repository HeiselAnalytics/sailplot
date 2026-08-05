# Sailing Scenario Editor

A local-first, touch-friendly web editor for creating static sailing and racing-rule diagrams. Place boats, marks, wind indicators, laylines, zones, lines, arrows, shapes and annotations on a large canvas, then save, export or share the result without an account or backend.

The editor is intentionally **not** a sailing simulator. It contains no playback, timeline, automatic boat movement, physics or automated racing-rule decisions.

## Screenshot

> Screenshot placeholder: add a desktop and an iPad screenshot after the first public deployment.

## Current feature set

- Desktop, tablet and phone layouts from one React application
- Mouse, touch and stylus-compatible Konva canvas
- Numbered boat chains with continuous placement and curved connecting paths
- Class-specific mainsail, jib, symmetric spinnaker and gennaker geometry
- Racing marks, configurable zones, wind direction and laylines
- Lines, arrows, freehand strokes, text, rectangles and circles
- Multi-selection, rotation, layer ordering, lock, hide, duplicate and delete
- Command-based undo and redo; drag completion creates one command
- Local IndexedDB autosave and recent projects through Dexie
- Versioned, Zod-validated JSON import and export
- Compressed URL-fragment share links with Web Share/clipboard fallback
- Static PNG export and browser print support
- Installable PWA with an offline application shell
- Light and dark modes, keyboard shortcuts and visible focus states

## Technology

React 18, TypeScript, Vite, Tailwind CSS, Konva/react-konva, Zustand, Dexie, Zod, pako, Lucide, Vitest, Playwright and vite-plugin-pwa. Shared controls follow the repository’s Heisel design tokens; the application has no server component.

## Local development

Requirements: Node.js 22 LTS and npm.

```bash
npm install
npm run dev
```

Open the local URL printed by Vite. The historical reference directory `boats-code_old_dontuse/` is excluded from TypeScript, linting, formatting, tests and builds.

## Production build

```bash
npm run build
npm run preview
```

The static output is created in `dist/`. Vite uses a relative base path so the build works from a GitHub Pages repository subpath and can later be served from a custom domain.

## Testing and quality checks

```bash
npm test
npm run lint
npm run format:check
npm run build
npx playwright install chromium
npm run test:e2e -- --project=desktop-chrome
```

Playwright projects are configured for Desktop Chrome, iPhone 13 and iPad Pro 11. Multi-touch logic should additionally be checked on physical Safari and Android devices because browser automation cannot reproduce every platform gesture accurately.

## GitHub Pages deployment

The workflow in `.github/workflows/deploy-pages.yml` tests, builds and uploads `dist/` on pushes to `main`. In the repository settings, choose **GitHub Actions** as the Pages source. See [deployment details](docs/deployment.md).

## PWA and offline use

The service worker caches the built application shell. After one successful online load, the editor can start offline. Project content is stored separately in the browser’s IndexedDB. An offline cache is not a backup: export important projects as JSON.

## JSON files and share links

The documented file format uses `format: "sailing-scenario"` and version `1`. Imports are treated as untrusted data and validated; user text is rendered as text, never HTML. JSON filenames are sanitized.

Share links compress the complete scenario and place it in `#scenario=...`. URL fragments are not included in the normal HTTP request, and the app never uploads scenario content. Long links are less portable, so JSON export is recommended for large projects. See [data format](docs/data-format.md).

## Privacy

- Projects, autosave data and preferences stay in the current browser.
- JSON and PNG files are generated locally.
- A share link contains the complete scenario data.
- Anyone with a share link can read the embedded scenario.
- No project data is uploaded by this application.

## Browser support

Targeted browsers are current Safari on iPhone, iPad and macOS; Chrome on Android and desktop; Edge; and Firefox. Clipboard and native sharing use feature detection and fallbacks. Browser storage quotas and maximum usable URL length vary by platform.

## Repository structure

```text
src/app/                 application shell and dialogs
src/editor/              canvas, commands, interactions and object controls
src/features/            project examples and feature modules
src/schemas/             Zod validation
src/services/            persistence, files, migrations and share encoding
src/stores/              Zustand editor state
tests/                   Vitest unit tests
e2e/                     Playwright flows
docs/                    technical documentation
public/                  permanent application assets and PWA icon
boats-code_old_dontuse/  historical reference only; never built
```

## Known limitations

- The canvas itself is not fully screen-reader editable; surrounding controls are accessible.
- SVG export and selected-area image cropping are not enabled where output reliability is uncertain.
- Pressure-sensitive stylus strokes are not recorded.
- Multi-touch behavior needs final physical-device validation across Safari and Android.
- Share-link length limits depend on the receiving browser and messaging app.
- This first milestone focuses on the complete static editing path; advanced alignment/distribution and every specialized course-layout preset remain suitable follow-up enhancements.

## License and attribution

Licensed under the [GNU General Public License v3](LICENSE).

This is a new web-based implementation inspired by the historical BOATS sailing scenario application. Class-specific Bézier hull proportions and sail-plan dimensions were translated into native TypeScript profiles from the GPL reference data. The historical application is not a runtime or build dependency; the new application is implemented from scratch using a modern web architecture. Relevant original copyright notices remain available in `boats-code_old_dontuse/` until the repository owner removes that reference directory. No original name or logo is used to imply official endorsement.

The interface is powered by Heisel Analytics and includes the provided official logo from permanent project-owned assets.
