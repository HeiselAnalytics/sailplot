import { Group } from 'konva/lib/Group'
import { Rect } from 'konva/lib/shapes/Rect'
import { describe, expect, it } from 'vitest'
import {
  BOAT_ROTATE_ANCHOR_OFFSET,
  DEFAULT_ROTATE_ANCHOR_OFFSET,
  pinTransformBoundsToNamedNode,
} from '../src/editor/canvas/rotationBounds'

describe('rotation transformer bounds', () => {
  it('uses a rotation-handle stem for boats that is exactly 50% shorter', () => {
    expect(DEFAULT_ROTATE_ANCHOR_OFFSET).toBe(50)
    expect(BOAT_ROTATE_ANCHOR_OFFSET).toBe(25)
    expect(BOAT_ROTATE_ANCHOR_OFFSET).toBe(DEFAULT_ROTATE_ANCHOR_OFFSET / 2)
  })

  it('keeps the hull bounds stable while a boat rotates', () => {
    const boat = new Group({ x: 120, y: 180, rotation: 0 })
    const scaledHull = new Group({ scaleX: 0.9, scaleY: 0.9 })
    scaledHull.add(
      new Rect({
        name: 'rotation-bounds',
        x: -10,
        y: -40,
        width: 20,
        height: 80,
      }),
    )
    boat.add(scaledHull)
    boat.add(
      new Rect({
        name: 'selection-bounds-ignore',
        x: -100,
        y: -120,
        width: 200,
        height: 240,
        fill: 'transparent',
      }),
    )

    const restore = pinTransformBoundsToNamedNode(boat)
    const initial = boat.getClientRect({ skipTransform: true })
    boat.rotation(137)
    const rotated = boat.getClientRect({ skipTransform: true })

    expect(initial).toEqual({ x: -9, y: -36, width: 18, height: 72 })
    expect(rotated).toEqual(initial)

    restore()
    expect(boat.getClientRect({ skipTransform: true }).width).toBe(200)
  })
})
