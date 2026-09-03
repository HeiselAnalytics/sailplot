import { describe, expect, it } from 'vitest'
import {
  boatTailsAtPlaybackPosition,
  boatsAtPlaybackPosition,
  hasPlayableBoatSequence,
  interpolateAngle,
  objectsAtPlaybackPosition,
  playbackLastPosition,
} from '../src/features/playback/playback'
import {
  boatSequenceSegment,
  constantSpeedCurveProgress,
  partialBoatSequenceSegment,
  pointOnBoatSequenceSegment,
} from '../src/editor/objects/boatSequenceGeometry'
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

    expect(boatsAtPlaybackPosition([first, second, third], 2)[0]).toMatchObject({
      x: second.x,
      y: second.y,
      heading: second.heading,
    })
    expect(boatsAtPlaybackPosition([first, second, third], 3)[0]).toMatchObject({
      x: third.x,
      y: third.y,
      heading: third.heading,
    })
    expect(boatsAtPlaybackPosition([first, second, third], 1.5)[0].x).toBeGreaterThan(0)
    expect(boatsAtPlaybackPosition([first, second, third], 1.5)[0].x).toBeLessThan(100)
    expect(boatsAtPlaybackPosition([first, second, third], 2.5)[0].x).toBeGreaterThan(100)
    expect(boatsAtPlaybackPosition([first, second, third], 2.5)[0].x).toBeLessThan(400)
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

  it('turns along the curved route instead of drifting sideways', () => {
    const first = {
      ...createBoat(0, 0),
      sequenceId: 'natural-motion',
      positionNumber: 1,
      heading: 0,
    }
    const second = {
      ...createBoat(100, -100),
      sequenceId: 'natural-motion',
      positionNumber: 2,
      heading: 90,
    }
    const before = boatsAtPlaybackPosition([first, second], 1.499)[0]
    const current = boatsAtPlaybackPosition([first, second], 1.5)[0]
    const after = boatsAtPlaybackPosition([first, second], 1.501)[0]
    const movementHeading =
      ((((Math.atan2(after.x - before.x, -(after.y - before.y)) * 180) / Math.PI) % 360) + 360) %
      360
    const headingDifference = Math.abs(
      ((((current.heading - movementHeading) % 360) + 540) % 360) - 180,
    )

    expect(current).toMatchObject({ x: expect.any(Number), y: expect.any(Number) })
    expect(current.x).not.toBeCloseTo(50)
    expect(current.y).not.toBeCloseTo(-50)
    expect(headingDifference).toBeLessThan(0.2)
  })

  it('preserves the overlap line while a boat moves to its next position', () => {
    const first = {
      ...createBoat(0, 0),
      sequenceId: 'overlap',
      positionNumber: 1,
      overlapIndicator: 'starboard' as const,
    }
    const second = {
      ...createBoat(100, 0),
      sequenceId: 'overlap',
      positionNumber: 2,
      overlapIndicator: 'none' as const,
    }

    expect(boatsAtPlaybackPosition([first, second], 1.5)[0].overlapIndicator).toBe('starboard')
    expect(boatsAtPlaybackPosition([first, second], 2)[0].overlapIndicator).toBe('none')
  })

  it('changes support-boat flags at the configured boat position', () => {
    const first = {
      ...createBoat(0, 0, 1, 'Umpire boat'),
      sequenceId: 'umpire',
      positionNumber: 1,
      boatFlagColor: '#FFAA00',
      umpireSignalFlag: 'green-white' as const,
    }
    const second = {
      ...createBoat(100, 0, 2, 'Umpire boat'),
      sequenceId: 'umpire',
      positionNumber: 2,
      boatFlagColor: '#18324A',
      umpireSignalFlag: 'red' as const,
    }

    expect(boatsAtPlaybackPosition([first, second], 1.5)[0]).toMatchObject({
      boatFlagColor: '#FFAA00',
      umpireSignalFlag: 'green-white',
    })
    expect(boatsAtPlaybackPosition([first, second], 2)[0]).toMatchObject({
      boatFlagColor: '#18324A',
      umpireSignalFlag: 'red',
    })
  })

  it('changes the sailing-boat protest flag side at the configured position', () => {
    const first = {
      ...createBoat(0, 0, 1, 'ILCA'),
      sequenceId: 'sailing-boat',
      positionNumber: 1,
      protestFlagSide: 'port' as const,
    }
    const second = {
      ...createBoat(100, 0, 2, 'ILCA'),
      sequenceId: 'sailing-boat',
      positionNumber: 2,
      protestFlagSide: 'starboard' as const,
    }

    expect(boatsAtPlaybackPosition([first, second], 1.5)[0].protestFlagSide).toBe('port')
    expect(boatsAtPlaybackPosition([first, second], 2)[0].protestFlagSide).toBe('starboard')
  })

  it('builds a tail only through the current playback position', () => {
    const first = { ...createBoat(0, 0), sequenceId: 'tail', positionNumber: 1 }
    const second = { ...createBoat(100, 0), sequenceId: 'tail', positionNumber: 2 }
    const third = { ...createBoat(300, 0), sequenceId: 'tail', positionNumber: 3 }

    const [{ boats }] = boatTailsAtPlaybackPosition([first, second, third], 1.5)
    expect(boats).toHaveLength(2)
    expect(boats[0].x).toBe(0)
    expect(boats[1].x).toBe(50)
  })

  it('keeps the travelled part of the active tail fixed as the boat advances', () => {
    const first = {
      ...createBoat(0, 0),
      sequenceId: 'fixed-tail',
      positionNumber: 1,
      heading: 20,
    }
    const second = {
      ...createBoat(240, -120),
      sequenceId: 'fixed-tail',
      positionNumber: 2,
      heading: 100,
    }
    const fullSegment = boatSequenceSegment(first, second)
    const earlierProgress = constantSpeedCurveProgress(fullSegment, 0.3)
    const laterProgress = constantSpeedCurveProgress(fullSegment, 0.8)
    const earlierTail = partialBoatSequenceSegment(fullSegment, earlierProgress)
    const laterTail = partialBoatSequenceSegment(fullSegment, laterProgress)
    const earlierPointOnLaterTail = pointOnBoatSequenceSegment(
      laterTail,
      earlierProgress / laterProgress,
    )

    expect(earlierPointOnLaterTail.x).toBeCloseTo(earlierTail.end.x, 8)
    expect(earlierPointOnLaterTail.y).toBeCloseTo(earlierTail.end.y, 8)

    const [{ path, boats }] = boatTailsAtPlaybackPosition([first, second], 1.8)
    expect(path).toContain(`${laterTail.end.x} ${laterTail.end.y}`)
    expect(boats.at(-1)).toMatchObject({ x: laterTail.end.x, y: laterTail.end.y })
  })

  it('does not append a moving duplicate after a sequence reaches its final position', () => {
    const first = { ...createBoat(0, 0), sequenceId: 'finished-tail', positionNumber: 1 }
    const second = { ...createBoat(100, 0), sequenceId: 'finished-tail', positionNumber: 2 }
    const third = { ...createBoat(200, 0), sequenceId: 'other-boat', positionNumber: 3 }

    const [{ boats, path }] = boatTailsAtPlaybackPosition([first, second, third], 2.5)
    expect(boats).toEqual([first, second])
    expect(path).toBe(boatTailsAtPlaybackPosition([first, second], 2)[0].path)
  })
})
