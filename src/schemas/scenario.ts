import { z } from 'zod'
import {
  BOAT_CLASSES,
  isSupportBoatClass,
  UMPIRE_SIGNAL_FLAGS,
  type BoatClass,
} from '../types/scenario'

const LEGACY_BOAT_CLASSES: Record<string, BoatClass> = {
  'ILCA / Laser': 'ILCA',
  Firefly: '420',
  Topper: 'ILCA',
  'Generic dinghy': '420',
  'Generic catamaran': 'Tornado',
  'Generic skiff': '49er',
  Windsurfer: 'Windsurf',
  'Wingfoil board': 'Windsurf',
  Wingfoil: 'Windsurf',
  kitefoil: 'Windsurf',
  'Coach boat': 'Coachboat',
  'Slim coachboat': 'Coachboat',
  'VSR Coachboat': 'Coachboat',
  'Jury boat': 'Umpire boat',
}

const normalizeBoatClass = (value: unknown) =>
  typeof value === 'string' ? (LEGACY_BOAT_CLASSES[value] ?? value) : value

const baseObjectSchema = z.object({
  id: z.string().min(1),
  x: z.number().finite(),
  y: z.number().finite(),
  rotation: z.number().finite(),
  scaleX: z.number().finite(),
  scaleY: z.number().finite(),
  visible: z.boolean(),
  locked: z.boolean(),
  zIndex: z.number().int(),
  opacity: z.number().min(0).max(1),
})

const boatSchema = baseObjectSchema.extend({
  type: z.literal('boat'),
  boatClass: z.preprocess(normalizeBoatClass, z.enum(BOAT_CLASSES)),
  name: z.string(),
  sailNumber: z.string(),
  label: z.string(),
  color: z.string(),
  heading: z.number().finite(),
  tack: z.enum(['port', 'starboard']),
  mainsailVisible: z.boolean(),
  jibVisible: z.boolean(),
  genoaVisible: z.boolean().default(false),
  spinnakerVisible: z.boolean().default(false),
  gennakerVisible: z.boolean(),
  mainsailTrim: z.number().min(-180).max(180).default(0),
  jibTrim: z.number().min(-180).max(180),
  spinnakerTrim: z.number().min(-180).max(180).default(0),
  gennakerTrim: z.number().min(-180).max(180),
  sailMode: z.enum(['automatic', 'manual']),
  sailAngle: z.number().finite(),
  sequenceId: z.string().optional(),
  positionNumber: z.number().int().positive().optional(),
  overlapIndicator: z.enum(['port', 'none', 'starboard']).default('none'),
  protestFlagVisible: z.boolean().default(false),
  boatFlagColor: z.string().nullable().default(null),
  umpireSignalFlag: z.enum(UMPIRE_SIGNAL_FLAGS).default('none'),
  stateMarker: z.enum(['none', 'tack', 'gybe', 'head-to-wind', 'reverse', 'drift']).optional(),
})

const markSchema = baseObjectSchema.extend({
  type: z.literal('mark'),
  markType: z.enum(['racing', 'starting', 'finish']),
  shape: z.enum(['round', 'cylindrical', 'inflatable', 'flag', 'gate', 'pin']),
  color: z.string(),
  label: z.string(),
  markNumber: z.preprocess(
    (value) => (typeof value === 'number' ? String(value) : value),
    z
      .string()
      .regex(/^[1-9]\d*[a-z]?$/i)
      .max(6)
      .optional(),
  ),
  downwind: z.boolean().default(false),
  laylinesVisible: z.boolean().default(true),
  zoneVisible: z.boolean(),
  zoneRadius: z.number().positive(),
  zoneRadiusUnit: z.enum(['pixels', 'boat-lengths']).default('pixels'),
})

const normalizeCourseEndpoint = (value: unknown) =>
  value === 'slim-coach-boat'
    ? 'coach-boat'
    : value === 'slim-coach-boat-reversed'
      ? 'coach-boat-reversed'
      : value

const courseEndpointSchema = z.preprocess(
  normalizeCourseEndpoint,
  z.enum([
    'committee-boat',
    'committee-boat-reversed',
    'buoy',
    'flag',
    'coach-boat',
    'coach-boat-reversed',
  ]),
)

const gateSchema = baseObjectSchema.extend({
  type: z.literal('gate'),
  width: z.number().positive().optional(),
  endAX: z.number().finite().optional(),
  endAY: z.number().finite().optional(),
  endBX: z.number().finite().optional(),
  endBY: z.number().finite().optional(),
  markNumber: z.number().int().positive().optional(),
  color: z.string(),
  zoneVisible: z.boolean(),
  zoneRadius: z.number().positive(),
  zoneRadiusUnit: z.literal('boat-lengths'),
})

const startLineSchema = baseObjectSchema.extend({
  type: z.literal('start-line'),
  width: z.number().positive().optional(),
  endAX: z.number().finite().optional(),
  endAY: z.number().finite().optional(),
  endBX: z.number().finite().optional(),
  endBY: z.number().finite().optional(),
  color: z.string(),
  startEndType: courseEndpointSchema,
  pinEndType: courseEndpointSchema,
  startEndFlagColor: z.string().optional(),
  pinEndFlagColor: z.string().optional(),
  laylinesVisible: z.boolean().optional(),
  laylineAreaVisible: z.boolean().optional(),
  laylineAreaColor: z.string().optional(),
})

const finishLineSchema = baseObjectSchema.extend({
  type: z.literal('finish-line'),
  width: z.number().positive().optional(),
  endAX: z.number().finite().optional(),
  endAY: z.number().finite().optional(),
  endBX: z.number().finite().optional(),
  endBY: z.number().finite().optional(),
  color: z.string(),
  startEndType: courseEndpointSchema,
  pinEndType: courseEndpointSchema,
  startEndFlagColor: z.string().optional(),
  pinEndFlagColor: z.string().optional(),
  laylinesVisible: z.boolean().optional(),
  laylineAreaVisible: z.boolean().optional(),
  laylineAreaColor: z.string().optional(),
})

const lineSchema = baseObjectSchema.extend({
  type: z.enum(['line', 'arrow', 'freehand']),
  points: z.array(z.number().finite()).min(4),
  stroke: z.string(),
  strokeWidth: z.number().positive(),
  dash: z.array(z.number().nonnegative()),
})

const textSchema = baseObjectSchema.extend({
  type: z.literal('text'),
  text: z.string(),
  color: z.string(),
  fontSize: z.number().min(8).max(200),
  fontWeight: z.enum(['normal', 'bold']),
  align: z.enum(['left', 'center', 'right']),
  background: z.string(),
})

const shapeSchema = baseObjectSchema.extend({
  type: z.enum(['rectangle', 'circle']),
  width: z.number().positive(),
  height: z.number().positive(),
  stroke: z.string(),
  strokeWidth: z.number().positive(),
  fill: z.string(),
})

export const scenarioObjectSchema = z.union([
  boatSchema,
  markSchema,
  gateSchema,
  startLineSchema,
  finishLineSchema,
  lineSchema,
  textSchema,
  shapeSchema,
])

export const scenarioSchema = z
  .object({
    format: z.union([z.literal('sailplot'), z.literal('sailing-scenario')]),
    version: z.literal(1),
    metadata: z
      .object({
        id: z.string().min(1),
        title: z.string().min(1),
        description: z.string(),
        ruleReferences: z.array(z.string()),
        additionalInformation: z
          .array(
            z.object({
              id: z.string().min(1),
              name: z.string(),
              value: z.string(),
            }),
          )
          .max(10)
          .default([]),
        createdAt: z.string(),
        updatedAt: z.string(),
      })
      .passthrough(),
    canvas: z.object({
      width: z.number().positive(),
      height: z.number().positive(),
      infinite: z.boolean().default(false),
      background: z.string(),
      boatNumbersVisible: z.boolean().default(true),
      boatLegendVisible: z.boolean().default(false),
      windIndicatorPosition: z
        .object({ x: z.number().finite(), y: z.number().finite() })
        .nullable()
        .default(null),
      boatLegendPosition: z
        .object({ x: z.number().finite(), y: z.number().finite() })
        .nullable()
        .default(null),
      grid: z.object({
        visible: z.boolean(),
        size: z.number().positive(),
        opacity: z.number().min(0).max(1).default(1),
      }),
      view: z.object({ x: z.number(), y: z.number(), scale: z.number().positive() }),
    }),
    environment: z.object({
      windDirection: z.number(),
      windStrength: z.string().nullable(),
      windVisible: z.boolean(),
      laylineAngle: z.number().min(0).max(90),
      laylinesVisible: z.boolean(),
      zonesVisible: z.boolean(),
      zoneRadiusBoatLengths: z.number().positive(),
      measurementBoatClass: z.preprocess((value) => {
        const normalized = normalizeBoatClass(value)
        return normalized == null || isSupportBoatClass(normalized) ? null : normalized
      }, z.enum(BOAT_CLASSES).nullable()),
    }),
    objects: z.array(scenarioObjectSchema),
  })
  .passthrough()
