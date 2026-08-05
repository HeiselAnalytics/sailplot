# Architecture

## System context

The product is a static single-page application. React owns the application shell, Konva renders the editable world, Zustand holds the active scenario and command history, and Dexie persists local projects in IndexedDB. There is no backend, authentication or cloud synchronization.

```text
UI controls ──commands──> Zustand scenario store ──debounced autosave──> IndexedDB
     │                         │
     └──── React/Konva <───────┘
                               ├── JSON file service
                               ├── compressed URL-fragment codec
                               └── PNG renderer
```

## Boundaries

- `src/types` and `src/schemas` define the portable domain format.
- `src/editor` contains canvas rendering, interaction geometry and explicit object commands.
- `src/stores` coordinates selection, tools, history and scenario state.
- `src/services` owns persistence and serialization; components do not access IndexedDB directly.
- `src/app` adapts the same editor to responsive layouts.

Object drag updates are committed on drag end, so pointer movement does not create repeated history entries or autosaves. History entries carry only affected objects before and after the action, not a deep copy of the whole scenario.

## Security and privacy

Imported JSON is parsed as data and validated by Zod. It is never executed. React and Konva render user text as text nodes rather than HTML. Share data is decoded defensively and future versions are rejected. No scenario data is sent to a server by application code.
