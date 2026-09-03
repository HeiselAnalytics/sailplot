import { describe, expect, it } from 'vitest'
import {
  animationFrameDurationSeconds,
  animationPlaybackPositions,
  gifFrameDelayMilliseconds,
} from '../src/lib/exportAnimation'

describe('animationPlaybackPositions', () => {
  it('uses the same number of frames for every boat-position interval', () => {
    const positions = animationPlaybackPositions(3, 10)

    expect(positions).toHaveLength(31)
    expect(positions[0]).toBe(1)
    expect(positions[15]).toBe(2)
    expect(positions[30]).toBe(3)
  })

  it('keeps the output frame rate constant across Player speeds', () => {
    const slowPositions = animationPlaybackPositions(3, 10, 0.5)
    const normalPositions = animationPlaybackPositions(3, 10, 1)
    const fastPositions = animationPlaybackPositions(3, 10, 2)

    expect(slowPositions).toHaveLength(61)
    expect(normalPositions).toHaveLength(31)
    expect(fastPositions).toHaveLength(16)
    expect(slowPositions.at(-1)).toBe(3)
    expect(normalPositions.at(-1)).toBe(3)
    expect(fastPositions.at(-1)).toBe(3)
  })

  it('keeps a plot without a playable sequence on its first position', () => {
    expect(animationPlaybackPositions(1, 24)).toEqual([1])
  })
})

describe('animationFrameDurationSeconds', () => {
  it('keeps a stable output frame rate', () => {
    expect(animationFrameDurationSeconds(30)).toBeCloseTo(1 / 30)
  })
})

describe('gifFrameDelayMilliseconds', () => {
  it('distributes GIF centisecond delays without changing the average frame rate', () => {
    const delays = Array.from({ length: 3 }, (_, index) =>
      gifFrameDelayMilliseconds(30, index),
    )

    expect(delays).toEqual([30, 40, 30])
    expect(delays.reduce((total, delay) => total + delay, 0)).toBe(100)
  })
})
