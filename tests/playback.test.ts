import { describe, expect, it } from 'vitest'
import {
  boatsAtPlaybackPosition,
  hasPlayableBoatSequence,
  interpolateAngle,
  objectsAtPlaybackPosition,
  playbackLastPosition,
} from '../src/features/playback/playback'
import { createBoat, createMark } from '../src/lib/scenario'

describe('scenario playback', () => {
  it('interpolates every leg over the same timeline interval', () => {
    const first = { ...createBoat(0, 0), sequenceId: 'boat-a', positionNumber: 1, heading: 350 }
    const second = {
      ...createBoat(100, 40),
      sequenceId: 'boat-a',
      positionNumber: 2,
      heading: 10,
    }
    const third = {
      ...createBoat(400, 100),
      sequenceId: 'boat-a',
      positionNumber: 3,
      heading: 70,
    }

    expect(boatsAtPlaybackPosition([first, second, third], 1.5)[0]).toMatchObject({
      x: 50,
      y: 20,
      heading: 0,
    })
    expect(boatsAtPlaybackPosition([first, second, third], 2.5)[0]).toMatchObject({
      x: 250,
      y: 70,
      heading: 40,
    })
  })

  it('moves sequences together and holds shorter sequences at their final position', () => {
    const a1 = { ...createBoat(0, 0), sequenceId: 'a', positionNumber: 1 }
    const a2 = { ...createBoat(100, 0), sequenceId: 'a', positionNumber: 2 }
    const a3 = { ...createBoat(200, 0), sequenceId: 'a', positionNumber: 3 }
    const b1 = { ...createBoat(0, 100), sequenceId: 'b', positionNumber: 1 }
    const b2 = { ...createBoat(50, 100), sequenceId: 'b', positionNumber: 2 }

    const boats = boatsAtPlaybackPosition([a1, a2, a3, b1, b2], 2.5)
    expect(boats.find((boat) => boat.sequenceId === 'a')?.x).toBe(150)
    expect(boats.find((boat) => boat.sequenceId === 'b')?.x).toBe(50)
  })

  it('keeps non-boat objects and exposes timeline availability', () => {
    const first = { ...createBoat(0, 0), sequenceId: 'a', positionNumber: 1 }
    const second = { ...createBoat(100, 0), sequenceId: 'a', positionNumber: 2 }
    const mark = createMark(30, 40)

    expect(hasPlayableBoatSequence([first])).toBe(false)
    expect(hasPlayableBoatSequence([first, second, mark])).toBe(true)
    expect(playbackLastPosition([first, second, mark])).toBe(2)
    expect(objectsAtPlaybackPosition([first, second, mark], 1.5)).toHaveLength(2)
    expect(objectsAtPlaybackPosition([first, second, mark], 1.5)).toContainEqual(
      expect.objectContaining({ id: mark.id, locked: true }),
    )
  })

  it('uses the shortest path when interpolating headings', () => {
    expect(interpolateAngle(350, 10, 0.5)).toBe(0)
    expect(interpolateAngle(10, 350, 0.5)).toBe(0)
  })
})
