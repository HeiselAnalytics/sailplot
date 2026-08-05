import { boatColorForClass } from '../lib/boatColors'
import { createId } from '../lib/scenario'
import { scenarioSchema } from '../schemas/scenario'
import type { Scenario } from '../types/scenario'

export const CURRENT_FORMAT_VERSION = 1

export function migrateScenario(input: unknown): Scenario {
  const version = (input as { version?: unknown })?.version
  if (typeof version !== 'number') throw new Error('The scenario format version is missing.')
  if (version > CURRENT_FORMAT_VERSION) {
    throw new Error(`Format version ${version} is newer than this app supports.`)
  }
  // Version 1 is the initial format. Missing display, chain, spinnaker and zone-unit fields are normalized here.
  const scenario = scenarioSchema.parse(input)
  let nextMarkNumber = 1
  return {
    ...scenario,
    canvas: {
      ...scenario.canvas,
      view: { ...scenario.canvas.view, scale: Math.max(1, scenario.canvas.view.scale) },
    },
    objects: scenario.objects.map((object) => {
      if (object.type === 'boat') {
        return {
          ...object,
          color: boatColorForClass(object.boatClass, object.color),
          sequenceId: object.sequenceId ?? createId(),
          positionNumber: object.positionNumber ?? 1,
        }
      }
      if (object.type === 'mark') {
        const markNumber = object.markNumber ?? nextMarkNumber
        nextMarkNumber = Math.max(nextMarkNumber, markNumber + 1)
        return {
          ...object,
          markNumber,
          zoneRadius:
            object.zoneRadiusUnit === 'boat-lengths'
              ? object.zoneRadius
              : Math.max(0.25, object.zoneRadius / 36),
          zoneRadiusUnit: 'boat-lengths',
        }
      }
      return object
    }),
  } as Scenario
}
