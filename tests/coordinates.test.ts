import { describe, expect, it } from 'vitest'
import {
  canvasToScreen,
  screenToCanvas,
  translateGroup,
} from '../src/editor/interaction/coordinates'

describe('editor coordinates', () => {
  it('converts between screen and canvas space', () => {
    const view = { x: 40, y: -20, scale: 2 }
    expect(screenToCanvas({ x: 240, y: 180 }, view)).toEqual({ x: 100, y: 100 })
    expect(canvasToScreen({ x: 100, y: 100 }, view)).toEqual({ x: 240, y: 180 })
  })

  it('translates grouped objects without mutating the input', () => {
    const objects = [
      { id: 'a', x: 10, y: 20 },
      { id: 'b', x: 30, y: 40 },
    ]
    expect(translateGroup(objects, 5, -2)).toEqual([
      { id: 'a', x: 15, y: 18 },
      { id: 'b', x: 35, y: 38 },
    ])
    expect(objects[0]).toEqual({ id: 'a', x: 10, y: 20 })
  })
})
