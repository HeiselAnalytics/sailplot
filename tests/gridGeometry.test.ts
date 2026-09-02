import { describe, expect, it } from 'vitest'
import {
  courseLineLaylineGeometry,
  laylineVector,
  markLaylineRotation,
  sailingGridSegments,
  sailingGridSegmentsForBounds,
} from '../src/editor/canvas/gridGeometry'

describe('sailing grid geometry', () => {
  it('keeps all laylines and bounds the area by left-inner and right-outer from leeward', () => {
    const geometry = courseLineLaylineGeometry({ x: -200, y: 0 }, { x: 200, y: 0 }, 45, 0, 500)

    expect(geometry.endsA).toHaveLength(2)
    expect(geometry.endsB).toHaveLength(2)
    expect(geometry.endsA[0].x).toBeGreaterThan(-200)
    expect(geometry.endsA[1].x).toBeLessThan(-200)
    expect(geometry.area[0]).toEqual({ x: -200, y: 0 })
    expect(geometry.area[1]).toEqual({ x: 200, y: 0 })
    expect(geometry.area[2].x).toBeGreaterThan(200)
    expect(geometry.area[3].x).toBeGreaterThan(-200)
    expect(geometry.area[2].x - geometry.area[1].x).toBeCloseTo(
      geometry.area[3].x - geometry.area[0].x,
    )
  })

  it('uses the exact layline angle rather than a shortened x component', () => {
    const vector = laylineVector(40, 100)
    expect(vector.x).toBeCloseTo(64.2788, 3)
    expect(vector.y).toBeCloseTo(76.6044, 3)
    expect(Math.hypot(vector.x, vector.y)).toBeCloseTo(100)
  })

  it('draws both grid families at the layline angles', () => {
    const segments = sailingGridSegments(1920, 1080, 40, 40, 0)
    const angles = new Set(
      segments.map(([x1, y1, x2, y2]) =>
        Math.round((Math.atan2(Math.abs(x2 - x1), Math.abs(y2 - y1)) * 180) / Math.PI),
      ),
    )
    expect(angles).toEqual(new Set([40]))
  })

  it('keeps the endless grid aligned when the visible bounds move beyond the base plot', () => {
    const first = sailingGridSegmentsForBounds(-2400, 1600, 1920, 1080, 40, 45, 0)
    const moved = sailingGridSegmentsForBounds(-2200, 1700, 1920, 1080, 40, 45, 0)
    const lineOffsets = (segments: typeof first) =>
      new Set(
        segments.map(([x1, y1, x2, y2]) => {
          const length = Math.hypot(x2 - x1, y2 - y1)
          const normal = { x: -(y2 - y1) / length, y: (x2 - x1) / length }
          return Math.round((normal.x * x1 + normal.y * y1) * 1000) / 1000
        }),
      )

    expect(first.length).toBeGreaterThan(0)
    expect([...lineOffsets(first)].some((offset) => lineOffsets(moved).has(offset))).toBe(true)
  })

  it('reverses mark laylines for a downwind mark', () => {
    expect(markLaylineRotation(0, false)).toBe(0)
    expect(markLaylineRotation(0, true)).toBe(180)
    expect(markLaylineRotation(270, true)).toBe(90)
  })
})
