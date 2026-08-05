# Data format

## Envelope

Scenario files are UTF-8 JSON and conventionally end in `.sailing-scenario.json`.

```json
{
  "format": "sailing-scenario",
  "version": 1,
  "metadata": {
    "id": "uuid",
    "title": "Windward mark situation",
    "description": "Static visual example",
    "ruleReferences": ["RRS 18"],
    "createdAt": "2026-08-02T12:00:00.000Z",
    "updatedAt": "2026-08-02T12:00:00.000Z"
  },
  "canvas": {
    "width": 1920,
    "height": 1080,
    "background": "#f8fbfc",
    "grid": { "visible": true, "size": 40, "snap": false },
    "view": { "x": 0, "y": 0, "scale": 1 }
  },
  "environment": {
    "windDirection": 0,
    "windStrength": null,
    "windVisible": true,
    "laylineAngle": 45,
    "laylinesVisible": true,
    "zonesVisible": true,
    "zoneRadiusBoatLengths": 3
  },
  "objects": []
}
```

Every object has a stable ID, type, position, rotation, scale, visibility, lock state, z-index and opacity. Typed extensions describe boats, marks, strokes, text or geometric shapes. Every boat belongs to a chain through `sequenceId` and carries a positive `positionNumber`. Boat records also retain explicit mainsail, jib, symmetric-spinnaker and gennaker visibility and trim values, including an independent `mainsailTrim`. Mark records store `zoneRadius` in boat lengths and identify that unit with `zoneRadiusUnit: "boat-lengths"`. The default radius is three boat lengths; in mixed fleets the longest boat class present supplies the physical length. Legacy version-1 records without these newer fields, including pixel-based mark zones, are normalized on load.

## Validation and migration

`scenarioSchema` is the authoritative runtime validator. Version `1` is the initial format. `src/services/migrations.ts` is the ordered migration entry point for future older formats. A version newer than the app supports is rejected with a clear message. Compatible unknown top-level metadata is retained by the schema’s passthrough behavior.

## Share representation

The share service serializes JSON, deflates it, encodes the bytes as URL-safe Base64 and stores them in the fragment. Plain uncompressed JSON is never placed in the URL.
