import { boatColorForClass } from '../lib/boatColors'
import {
  createId,
  FINISH_FLAG_COLOR,
  markNumberSequenceValue,
  START_FLAG_COLOR,
} from '../lib/scenario'
import { scenarioSchema } from '../schemas/scenario'
import { isSupportBoatClass, type Scenario } from '../types/scenario'
import { normalizePlotBackground } from '../lib/plotTheme'

export const CURRENT_FORMAT_VERSION = 1

export function migrateScenario(input: unknown): Scenario {
  const version = (input as { version?: unknown })?.version
  const hasAdditionalInformation = Array.isArray(
    (input as { metadata?: { additionalInformation?: unknown } })?.metadata?.additionalInformation,
  )
  if (typeof version !== 'number') throw new Error('The plot format version is missing.')
  if (version > CURRENT_FORMAT_VERSION) {
    throw new Error(`Format version ${version} is newer than this app supports.`)
  }
  // Version 1 is the initial format. Missing display, chain, spinnaker and zone-unit fields are normalized here.
  const scenario = scenarioSchema.parse(input)
  let nextMarkNumber =
    scenario.objects.reduce(
      (highest, object) =>
        object.type === 'mark' || object.type === 'gate'
          ? Math.max(highest, markNumberSequenceValue(object.markNumber))
          : highest,
      0,
    ) + 1
  return {
    ...scenario,
    format: 'sailplot',
    metadata: {
      ...scenario.metadata,
      additionalInformation: hasAdditionalInformation
        ? scenario.metadata.additionalInformation
        : [
            {
              id: createId(),
              name: scenario.environment.windStrength ? 'Wind strength' : '',
              value: scenario.environment.windStrength ?? '',
            },
          ],
    },
    canvas: {
      ...scenario.canvas,
      background: normalizePlotBackground(scenario.canvas.background),
      view: { ...scenario.canvas.view, scale: Math.max(1, scenario.canvas.view.scale) },
    },
    objects: scenario.objects.map((object) => {
      if (object.type === 'boat') {
        const { protestFlagVisible, ...boat } = object
        return {
          ...boat,
          color: boatColorForClass(object.boatClass, object.color),
          sequenceId: object.sequenceId ?? createId(),
          positionNumber: object.positionNumber ?? 1,
          overlapIndicator: object.overlapIndicator ?? 'none',
          protestFlagSide: isSupportBoatClass(object.boatClass)
            ? 'none'
            : (object.protestFlagSide ?? (protestFlagVisible ? 'port' : 'none')),
        }
      }
      if (object.type === 'mark') {
        const markNumber = object.markNumber ?? String(nextMarkNumber)
        nextMarkNumber = Math.max(nextMarkNumber, markNumberSequenceValue(markNumber) + 1)
        return {
          ...object,
          rotation: 0,
          shape: object.shape === 'pin' ? 'flag' : object.shape,
          markNumber,
          zoneRadius:
            object.zoneRadiusUnit === 'boat-lengths'
              ? object.zoneRadius
              : Math.max(0.25, object.zoneRadius / 36),
          zoneRadiusUnit: 'boat-lengths',
        }
      }
      if (object.type === 'gate' || object.type === 'start-line' || object.type === 'finish-line') {
        const legacyWidth = object.width ?? (object.type === 'gate' ? 240 : 400)
        const legacyAngle = (object.rotation * Math.PI) / 180
        const endAX = object.endAX ?? -Math.cos(legacyAngle) * (legacyWidth / 2)
        const endAY = object.endAY ?? -Math.sin(legacyAngle) * (legacyWidth / 2)
        const endBX = object.endBX ?? Math.cos(legacyAngle) * (legacyWidth / 2)
        const endBY = object.endBY ?? Math.sin(legacyAngle) * (legacyWidth / 2)
        if (object.type === 'gate') {
          const markNumber = object.markNumber ?? nextMarkNumber
          nextMarkNumber = Math.max(nextMarkNumber, markNumber + 1)
          return {
            ...object,
            rotation: 0,
            endAX,
            endAY,
            endBX,
            endBY,
            markNumber,
          }
        }
        const defaultFlagColor =
          object.type === 'finish-line' ? FINISH_FLAG_COLOR : START_FLAG_COLOR
        return {
          ...object,
          rotation: 0,
          endAX,
          endAY,
          endBX,
          endBY,
          startEndFlagColor: object.startEndFlagColor ?? defaultFlagColor,
          pinEndFlagColor: object.pinEndFlagColor ?? defaultFlagColor,
          laylinesVisible: object.laylinesVisible ?? false,
          laylineAreaVisible: object.laylineAreaVisible ?? false,
          laylineAreaColor: object.laylineAreaColor ?? defaultFlagColor,
        }
      }
      return object
    }),
  } as Scenario
}
