import { describe, expect, it } from 'vitest'
import {
  courseEndpointAccentColor,
  courseEndpointBoatAppearance,
  courseEndpointShowsSignalFlag,
} from '../src/editor/objects/courseEndpoints'
import { COACHBOAT_BLUE } from '../src/lib/boatColors'

describe('course line boat endpoints', () => {
  it('offers the Committee boat in both directions', () => {
    expect(courseEndpointBoatAppearance('committee-boat')).toMatchObject({
      boatClass: 'Committee boat',
      reversed: false,
    })
    expect(courseEndpointBoatAppearance('committee-boat-reversed')).toMatchObject({
      boatClass: 'Committee boat',
      reversed: true,
    })
  })

  it('offers the fixed-blue Coachboat in both directions', () => {
    expect(courseEndpointBoatAppearance('coach-boat')).toMatchObject({
      boatClass: 'Coachboat',
      color: COACHBOAT_BLUE,
      reversed: false,
    })
    expect(courseEndpointBoatAppearance('coach-boat-reversed')).toMatchObject({
      boatClass: 'Coachboat',
      color: COACHBOAT_BLUE,
      reversed: true,
    })
  })

  it('adds a signal flag to every supported vessel endpoint variant', () => {
    const vesselTypes = [
      'committee-boat',
      'committee-boat-reversed',
      'coach-boat',
      'coach-boat-reversed',
    ] as const
    expect(vesselTypes.map(courseEndpointShowsSignalFlag)).toEqual([true, true, true, true])
    expect(courseEndpointShowsSignalFlag('flag')).toBe(false)
    expect(courseEndpointShowsSignalFlag('buoy')).toBe(false)
  })

  it('uses mark color for buoys and keeps flag color for flags and vessel signals', () => {
    expect(courseEndpointAccentColor('buoy', '#D72638', '#FFAA00')).toBe('#D72638')
    expect(courseEndpointAccentColor('flag', '#D72638', '#FFAA00')).toBe('#FFAA00')
    expect(courseEndpointAccentColor('committee-boat', '#D72638', '#FFAA00')).toBe('#FFAA00')
    expect(courseEndpointAccentColor('coach-boat-reversed', '#D72638', '#FFAA00')).toBe('#FFAA00')
  })
})
