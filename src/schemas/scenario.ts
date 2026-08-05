import { z } from 'zod'
import { BOAT_CLASSES } from '../types/scenario'

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
  boatClass: z.enum(BOAT_CLASSES),
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
  stateMarker: z.enum(['none', 'tack', 'gybe', 'head-to-wind', 'reverse', 'drift']).optional(),
})

const markSchema = baseObjectSchema.extend({
  type: z.literal('mark'),
  markType: z.enum(['racing', 'starting', 'finish']),
  shape: z.enum(['round', 'cylindrical', 'inflatable', 'flag', 'gate', 'pin']),
  color: z.string(),
  label: z.string(),
  markNumber: z.number().int().positive().optional(),
  downwind: z.boolean().default(false),
  zoneVisible: z.boolean(),
  zoneRadius: z.number().positive(),
  zoneRadiusUnit: z.enum(['pixels', 'boat-lengths']).default('pixels'),
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
  lineSchema,
  textSchema,
  shapeSchema,
])

export const scenarioSchema = z
  .object({
    format: z.literal('sailing-scenario'),
    version: z.literal(1),
    metadata: z
      .object({
        id: z.string().min(1),
        title: z.string().min(1),
        description: z.string(),
        ruleReferences: z.array(z.string()),
        createdAt: z.string(),
        updatedAt: z.string(),
      })
      .passthrough(),
    canvas: z.object({
      width: z.number().positive(),
      height: z.number().positive(),
      background: z.string(),
      boatNumbersVisible: z.boolean().default(true),
      grid: z.object({
        visible: z.boolean(),
        size: z.number().positive(),
        snap: z.boolean(),
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
    }),
    objects: z.array(scenarioObjectSchema),
  })
  .passthrough()
