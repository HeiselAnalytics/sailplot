import { describe, expect, it } from 'vitest'
import { courseEndpointBoatAppearance } from '../src/editor/objects/courseEndpoints'
import { COACHBOAT_BLUE } from '../src/lib/boatColors'

describe('course line boat endpoints', () => {
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
})
