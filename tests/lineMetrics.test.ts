import { describe, expect, it } from 'vitest'
import { lineMetrics } from '../src/editor/objects/lineMetrics'
import { createFinishLine } from '../src/lib/scenario'
import type { LineObject } from '../src/types/scenario'

describe('line properties', () => {
  it('shows zero degrees for a course line square to the wind', () => {
    const finishLine = createFinishLine(100, 200, 500, 200)
    expect(lineMetrics(finishLine, 0, 100)).toEqual({
      lengthBoatLengths: 4,
      angleToWind: 0,
    })
  })

  it('uses the complete freehand path length', () => {
    const freehand: LineObject = {
      id: 'freehand-test',
      type: 'freehand',
      x: 0,
      y: 0,
      rotation: 0,
      scaleX: 1,
      scaleY: 1,
      visible: true,
      locked: false,
      zIndex: 1,
      opacity: 1,
      points: [0, 0, 30, 40, 30, 80],
      stroke: '#171717',
      strokeWidth: 3,
      dash: [],
    }
    const metrics = lineMetrics(freehand, 0, 10)
    expect(metrics?.lengthBoatLengths).toBe(9)
    expect(metrics?.angleToWind).toBeCloseTo(69.44, 2)
  })

  it('converts a 55-degree axis intersection into a 35-degree line deviation', () => {
    const line: LineObject = {
      id: 'line-angle-test',
      type: 'line',
      x: 0,
      y: 0,
      rotation: 0,
      scaleX: 1,
      scaleY: 1,
      visible: true,
      locked: false,
      zIndex: 1,
      opacity: 1,
      points: [0, 0, Math.sin((55 * Math.PI) / 180), -Math.cos((55 * Math.PI) / 180)],
      stroke: '#171717',
      strokeWidth: 3,
      dash: [],
    }
    expect(lineMetrics(line, 0, 1)?.angleToWind).toBeCloseTo(35, 8)
  })
})
