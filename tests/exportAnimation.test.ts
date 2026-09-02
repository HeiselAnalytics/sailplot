import { describe, expect, it } from 'vitest'
import { animationPlaybackPositions } from '../src/lib/exportAnimation'

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
