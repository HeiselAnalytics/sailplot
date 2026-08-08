# SailPlot

SailPlot is a local-first web application for creating static sailing plots and racing-rule
diagrams. It runs entirely in the browser and does not require an account or backend service.

## Features

- Create diagrams with boats, marks, gates, course lines, arrows, shapes, text, and freehand paths.
- Arrange and edit plot objects on an interactive canvas.
- Manage multiple projects locally in the browser.
- Import and export SailPlot project files.
- Export plots as PNG or PDF documents.
- Create self-contained share links and QR codes that reopen an editable plot.
- Use the application on desktop, tablet, and mobile layouts.
- Work in German or English.

## Local-first operation

Projects and preferences are stored locally in the browser with IndexedDB and Local Storage. Image,
PDF, and project-file exports are created on the device. SailPlot does not upload plot data to a
server.

A share link contains a compressed copy of the plot in its URL fragment. Anyone who receives such a
link can open the embedded plot, but no server-side plot storage is involved.

## Development

Requirements:

- Node.js 22 or a newer supported LTS release
- npm

Install dependencies and start the development server:

```bash
npm ci
npm run dev
```

Run the project checks:

```bash
npm run typecheck
npm run lint
npm test
npm run build
npm run test:e2e
```

The production application is written to `dist/`.

## Privacy

SailPlot does not require authentication and does not include analytics, tracking, or cloud plot
storage. Clearing browser data can remove locally stored projects, so important plots should also be
saved as project files.

## Origin and attribution

SailPlot was inspired by the historical open-source
[BOATS race-scenario drawing tool](https://sourceforge.net/projects/boats/). SailPlot is a new
web-based implementation and does not use BOATS as a runtime dependency.

## License

See [LICENSE](LICENSE).
