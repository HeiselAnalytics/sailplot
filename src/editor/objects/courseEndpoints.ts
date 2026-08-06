import { COACHBOAT_BLUE } from '../../lib/boatColors'
import type { BoatClass, CourseEndpointType } from '../../types/scenario'

export const COMMITTEE_BOAT_COLOR = '#475569'

export interface CourseEndpointBoatAppearance {
  boatClass: BoatClass
  color: string
  reversed: boolean
}

export function courseEndpointBoatAppearance(
  type: CourseEndpointType,
): CourseEndpointBoatAppearance | null {
  if (type === 'committee-boat') {
    return {
      boatClass: 'Committee boat',
      color: COMMITTEE_BOAT_COLOR,
      reversed: false,
    }
  }
  if (type === 'coach-boat' || type === 'coach-boat-reversed') {
    return {
      boatClass: 'Coachboat',
      color: COACHBOAT_BLUE,
      reversed: type === 'coach-boat-reversed',
    }
  }
  return null
}
