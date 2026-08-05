# Testing

## Automated checks

`npm test` covers schema validation, file round trips, compressed URL encoding/decoding, invalid links, coordinate conversion, group translation, heading normalization, duplication and command undo/redo. `npm run lint`, `npm run format:check` and `npm run build` cover source quality and strict TypeScript.

Playwright includes Desktop Chrome, iPhone and iPad profiles. Core flows verify app startup, touch-sized tools, object creation and scenario templates.

## Manual matrix

Before release, validate widths 1440, 1024, 768 and 375 px in light and dark mode. Check long titles, keyboard-only focus, touch drag/transform, stylus freehand input, mobile safe areas, iPad landscape, browser reload restoration, offline startup, JSON errors, damaged share links, clipboard fallback and native sharing.

Pinch gestures and Apple Pencil behavior require physical Safari testing; automated mouse emulation is not an adequate substitute for every multi-touch event sequence.
