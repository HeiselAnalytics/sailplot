# Interaction model

## Shared editing model

Phone, tablet and desktop surfaces call the same Zustand actions and operate on the same Konva stage. Layout differences do not create separate data models.

The desktop Scene section groups visibility switches in two columns. Grid size, wind direction and
layline angle each provide an exact numeric input followed by a linked slider. Wind direction uses
a centred signed scale from −180° through 0° to +180°; zero remains wind from the top. Units are
displayed as compact input suffixes, while general wind-strength notes are grouped under Additional
information.

## Mouse and keyboard

- Click selects; Shift-click toggles a member of the selection.
- Drag moves an unlocked object. Boats, marks and text rotate without scaling; drawing objects can
  retain their transform behavior.
- The wheel zooms around the pointer. Pan mode or Space-drag moves the view. The width-fitted view is
  100% and is the minimum zoom level.
- Delete/Backspace removes, arrow keys nudge, Shift+arrow uses a larger step.
- Ctrl/Command+Z, Ctrl/Command+Shift+Z, Ctrl/Command+Y and Ctrl/Command+D cover history and duplication.

## Touch and stylus

Visible tool controls use at least 44 px targets in compact layouts. Canvas objects have hit areas larger than their visible lines. Canvas CSS disables browser panning, selection and overscroll only inside the editor. Native scrolling remains available in panels and dialogs.

## Boat chains

Selecting the Boat tool starts a new chain. It remains active after placement, so every following
canvas click creates the next numbered position with the same class, color and sail setup. A curved
path connects the positions. “Add static position” provides the same continuation from an existing
boat. Positions never play automatically and carry no time or speed value.

Every position keeps an independent heading, even after it is moved within a chain. Changing a boat
class updates every position in that chain and becomes the default class for subsequently created
chains. A class change also restores its supported upwind sail plan. The properties panel only
offers sails supported by that class. Sail controls show the actual angle, constrain it to the
leeward side between the centreline and 100 degrees, and indicate when the resulting sail luffs.
Heading remains freely adjustable with a slider; position, coordinates and wind-derived tack are
compact read-only information.

Each new chain receives the first unused color from the central regatta palette. Positions added to
an existing chain retain its color. After all palette colors are in use, new chains continue by
cycling through the palette.

## Mark zones

Mark zones are entered in boat lengths (BL) and default to 3 BL. Their canvas radius is calculated
from the longest boat class currently present, so a mixed-class scenario consistently uses the
longest hull. Before any boat is placed, the default ILCA / Laser length is used as the basis.
