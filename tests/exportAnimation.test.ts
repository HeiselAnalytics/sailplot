import { describe, expect, it } from 'vitest'
import {
  animationFrameDurationSeconds,
  animationPlaybackPositions,
} from '../src/lib/exportAnimation'

describe('animationPlaybackPositions', () => {
  it('uses the same number of frames for every boat-position interval', () => {
    const positions = animationPlaybackPositions(3, 10)

    expect(positions).toHaveLength(31)
    expect(positions[0]).toBe(1)
    expect(positions[15]).toBe(2)
    expect(positions[30]).toBe(3)
  })

  it('keeps a plot without a playable sequence on its first position', () => {
    expect(animationPlaybackPositions(1, 24)).toEqual([1])
  })
})

describe('animationFrameDurationSeconds', () => {
  it('uses the selected Player speed for export timing', () => {
    expect(animationFrameDurationSeconds(24, 0.5)).toBeCloseTo(1 / 12)
    expect(animationFrameDurationSeconds(24, 1)).toBeCloseTo(1 / 24)
    expect(animationFrameDurationSeconds(24, 2)).toBeCloseTo(1 / 48)
  })
})
