# SailPlot

SailPlot is a local-first React editor for static sailing plots. This repository produces both the public standalone application and a reusable package; both entries render the same `SailPlotApp` and editor implementation.

## Standalone application

```bash
npm ci
npm run dev
npm test
npm run build
```

The production application is written to `dist/`. `src/main.tsx` is intentionally only a standalone adapter: it registers the service worker, imports the styles and renders `SailPlotApp` with `defaultSailPlotConfig`.

## Package build and usage

The package is prepared locally but is not published by this repository change.

```bash
npm run build:package
```

This writes ESM, CSS, public assets and TypeScript declarations to `dist-package/`. React and ReactDOM are peer dependencies and remain external, preventing a second React instance in a consumer.

```tsx
import { SailPlotApp } from '@heiselanalytics/sailplot'
import '@heiselanalytics/sailplot/styles.css'

export function App() {
  return <SailPlotApp config={tenantConfig} extensions={platformExtensions} />
}
```

The containing element must have a defined height. A complete generic example is in [`examples/package-consumer/App.tsx`](examples/package-consumer/App.tsx).

## Public API

The root export provides:

- `SailPlotApp` and `SailPlotAppProps`
- `SailPlotConfig`, all nested configuration types and `DeepPartial`
- `SailPlotExtensions`, `SailPlotRoute`, `SailPlotNavigationItem` and extension context/event types
- `defaultSailPlotConfig` and `mergeSailPlotConfig`
- `SailPlotConfigProvider` and `useSailPlotConfig`
- `SailPlotNavigation`

Styles are a documented subpath export: `@heiselanalytics/sailplot/styles.css`. Standard public assets are available through the `icons/*` and `assets/*` subpath exports; consumer-specific branding should still supply its own asset URLs through `SailPlotConfig`.

## Serializable configuration

`SailPlotConfig` contains data only; it can be serialized to JSON or loaded from an API. The `config` prop accepts a deep partial value and recursively falls back to `defaultSailPlotConfig`.

| Area           | Fields                                                                                                                      |
| -------------- | --------------------------------------------------------------------------------------------------------------------------- |
| `branding`     | `appName`, `shortName`, logos, favicon and partner/export assets                                                            |
| `theme`        | `mode` (`light`, `dark`, `system`), complete `light`/`dark` token sets, optional body/heading fonts and radius              |
| theme tokens   | `primary`, `primaryText`, `accent`, `background`, `surface`, `sidebar`, `secondary`, `text`, `muted`, `border`, `focusRing` |
| `texts`        | `welcomeTitle`, `welcomeText`, `footerText`, `helpText`, `aboutText`, `poweredByText` and export descriptions               |
| `links`        | nullable `app`, `support`, `website`, `privacy`, `imprint`, `documentation` URLs                                            |
| `ui`           | visibility of header logo, footer, powered-by text, help, about, home, new/open/export actions                              |
| `defaults`     | default `language` (`auto`, `de`, `en`) and `startPage` (`editor`, `home`)                                                  |
| `localization` | locale identifiers for German and English                                                                                   |
| root           | `pageTitle`, `storageNamespace`, `routerBasename`                                                                           |

Logo, favicon and export asset fields are URL strings. A consumer owns and supplies those assets when it changes branding; they are not inferred from a hostname. The unmodified standalone defaults retain the current public SailPlot assets and appearance.

Exported PNGs and PDFs contain a QR code generated from the current plot share URL. In PDFs the QR opens that exact editable plot, the upper branding half opens `links.app`, and the lower partner half opens `links.website`. A tenant can configure its app destination without SailPlot inspecting the browser hostname. `exportWatermarkQr` remains only as a deprecated configuration field for compatibility and is no longer rendered.

Share links use their own versioned compact format and do not change the documented JSON project file. The link payload omits defaults and technical identities, represents objects as positional arrays, uses numeric codes for known colours/classes/enums, compresses with raw Deflate and encodes the bytes with a URL-safe Base41 alphabet selected for QR alphanumeric mode. Opening a link creates fresh project, object and information IDs while preserving the editable plot content. QR error correction uses level L to keep self-contained links as sparse as possible.

An empty `storageNamespace` preserves the historic Local Storage keys and IndexedDB database name. A non-empty namespace prefixes all SailPlot preference/color keys and selects a separate IndexedDB database without changing scenario files or share-link formats.

## Non-serializable extensions

`SailPlotExtensions` is the place for React components and callbacks:

```tsx
const extensions: SailPlotExtensions = {
  routes: [{ path: '/guide', component: GuidePage, title: 'Guide' }],
  navigationItems: [
    { id: 'guide', label: 'Guide', path: '/guide' },
    { id: 'website', label: 'Website', href: 'https://example.com', external: true },
  ],
  headerActions: [AccountAction],
  footer: CustomFooter,
  footerExtensions: [LegalNotice],
  homeContent: HomeAddition,
  helpContent: HelpAddition,
  onEvent: (event) => analytics.track(event.type, event),
}
```

Internal items call SailPlot's small History API router, so the consumer must not mount a competing router around the editor. `routerBasename` scopes generated internal URLs. Additional route components receive `config`, `currentPath` and `navigate`. External items use ordinary links.

The consumer's web server must return its application entry for direct requests to extension paths such as `/guide` (the usual SPA fallback). This is deployment configuration, not route or tenant logic in SailPlot.

Setting `ui.home` to `true` enables the generic home page at `/home`; `defaults.startPage: 'home'` makes it the root view. Otherwise `/` continues to open the editor as before.

## Ownership boundary

All editor behavior, scenario handling, imports/exports, persistence and drawing tools remain in this public repository. A platform consumer may provide branding, configuration, extra navigation/pages and integrations only. Domain or tenant resolution—including inspecting `window.location.hostname`—is exclusively the consumer's responsibility; SailPlot itself knows only the supplied `config` and `extensions`.
