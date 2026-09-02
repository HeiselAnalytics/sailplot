import {
  UMPIRE_SIGNAL_FLAGS,
  type BoatClass,
  type BoatObject,
  type CourseEndpointType,
  type Scenario,
  type ScenarioObject,
} from '../types/scenario'
import {
  createBoat,
  createEmptyScenario,
  createFinishLine,
  createGate,
  createId,
  createMark,
  createStartLine,
  FINISH_FLAG_COLOR,
  START_FLAG_COLOR,
} from '../lib/scenario'
import { boatColorForClass } from '../lib/boatColors'
import { PLOT_BACKGROUNDS } from '../lib/plotTheme'
import { migrateScenario } from './migrations'

type CompactValue = string | number | boolean | null | CompactValue[]
type CompactArray = CompactValue[]

const OBJECT_TYPES = [
  'boat',
  'mark',
  'gate',
  'start-line',
  'finish-line',
  'line',
  'arrow',
  'freehand',
  'text',
  'rectangle',
  'circle',
] as const satisfies readonly ScenarioObject['type'][]

// Compact links use stable numeric IDs. Index 11 remains reserved for the retired
// Jury boat, which is migrated to the Umpire boat when an old link is opened.
const COMPACT_BOAT_CLASSES = [
  'Optimist',
  'ILCA',
  'Generic keelboat',
  'Lacustre',
  'Tornado',
  '420',
  '470',
  '29er',
  '49er',
  'Windsurf',
  'Coachboat',
  null,
  'Committee boat',
  'Umpire boat',
] as const satisfies readonly (BoatClass | null)[]

const COLORS = [
  '#FFAA00',
  '#171717',
  'transparent',
  '#A3A3A3',
  '#168DDD',
  PLOT_BACKGROUNDS.light,
  PLOT_BACKGROUNDS.dark,
  '#18324A',
  '#2F5D78',
  '#1F6D68',
  '#4F6B52',
  '#884454',
  '#B46632',
  '#5B6572',
  '#79B8D1',
  '#5F9FC2',
  '#55B5AA',
  '#89AA8C',
  '#D2879E',
  '#D99A68',
  '#B8C1C9',
  '#D72638',
  '#FFD100',
  '#00843D',
  '#FFFFFF',
  '#4B5563',
] as const

const MARK_TYPES = ['racing', 'starting', 'finish'] as const
const MARK_SHAPES = ['round', 'cylindrical', 'inflatable', 'flag', 'gate', 'pin'] as const
const ENDPOINT_TYPES = [
  'committee-boat',
  'buoy',
  'flag',
  'coach-boat',
  'coach-boat-reversed',
  'committee-boat-reversed',
] as const satisfies readonly CourseEndpointType[]
const OVERLAP_INDICATORS = ['none', 'port', 'starboard'] as const
const STATE_MARKERS = ['none', 'tack', 'gybe', 'head-to-wind', 'reverse', 'drift'] as const
const TEXT_ALIGNS = ['left', 'center', 'right'] as const

const hasBit = (mask: number, bit: number) => Math.floor(mask / 2 ** bit) % 2 === 1

function pack(changes: Array<{ changed: boolean; value?: CompactValue }>): CompactArray {
  let mask = 0
  const values: CompactValue[] = []
  changes.forEach((change, bit) => {
    if (!change.changed) return
    mask += 2 ** bit
    if ('value' in change) values.push(change.value ?? null)
  })
  return [mask, ...values]
}

class CompactReader {
  private index = 0

  constructor(private readonly values: CompactValue[]) {}

  take<T extends CompactValue>(): T {
    if (this.index >= this.values.length) throw new Error('The compact plot data is incomplete.')
    return this.values[this.index++] as T
  }

  finish() {
    if (this.index !== this.values.length) throw new Error('The compact plot data is damaged.')
  }
}

const asArray = (value: CompactValue, label: string): CompactArray => {
  if (!Array.isArray(value)) throw new Error(`The compact ${label} data is damaged.`)
  return value
}

const asNumber = (value: CompactValue, label: string): number => {
  if (typeof value !== 'number' || !Number.isFinite(value))
    throw new Error(`The compact ${label} data is damaged.`)
  return value
}

const asString = (value: CompactValue, label: string): string => {
  if (typeof value !== 'string') throw new Error(`The compact ${label} data is damaged.`)
  return value
}

const compactBoatClassIndex = (boatClass: BoatClass): number => {
  const index = COMPACT_BOAT_CLASSES.indexOf(boatClass)
  if (index < 0) throw new Error('The boat class cannot be encoded.')
  return index
}

const decodeCompactBoatClass = (value: CompactValue, label: string): BoatClass => {
  const index = asNumber(value, label)
  const boatClass = COMPACT_BOAT_CLASSES[index]
  if (boatClass === undefined) throw new Error(`The compact ${label} data is damaged.`)
  return boatClass ?? 'Umpire boat'
}

const enumAt = <Value extends string>(
  values: readonly Value[],
  index: CompactValue,
  label: string,
) => {
  const value = values[asNumber(index, label)]
  if (value === undefined) throw new Error(`The compact ${label} data is damaged.`)
  return value
}

const encodeColor = (color: string): string | number => {
  const index = COLORS.findIndex((candidate) => candidate === color)
  return index >= 0 ? index : color
}

const decodeColor = (value: CompactValue): string =>
  typeof value === 'number' ? enumAt(COLORS, value, 'colour') : asString(value, 'colour')

const encodeMarkNumber = (value: string): string | number =>
  /^[1-9]\d*$/.test(value) && Number.isSafeInteger(Number(value)) ? Number(value) : value

function encodeMetadata(scenario: Scenario): CompactArray {
  const defaultInformation =
    scenario.metadata.additionalInformation.length === 1 &&
    scenario.metadata.additionalInformation[0].name === '' &&
    scenario.metadata.additionalInformation[0].value === ''
  return pack([
    { changed: scenario.metadata.title !== 'Untitled plot', value: scenario.metadata.title },
    { changed: scenario.metadata.description !== '', value: scenario.metadata.description },
    {
      changed: scenario.metadata.ruleReferences.length > 0,
      value: scenario.metadata.ruleReferences,
    },
    {
      changed: !defaultInformation,
      value: scenario.metadata.additionalInformation.map(({ name, value }) => [name, value]),
    },
  ])
}

function decodeMetadata(value: CompactValue, scenario: Scenario) {
  const [maskValue, ...values] = asArray(value, 'metadata')
  const mask = asNumber(maskValue, 'metadata mask')
  const reader = new CompactReader(values)
  if (hasBit(mask, 0)) scenario.metadata.title = asString(reader.take(), 'title')
  if (hasBit(mask, 1)) scenario.metadata.description = asString(reader.take(), 'description')
  if (hasBit(mask, 2)) {
    scenario.metadata.ruleReferences = asArray(reader.take(), 'rule references').map((entry) =>
      asString(entry, 'rule reference'),
    )
  }
  if (hasBit(mask, 3)) {
    scenario.metadata.additionalInformation = asArray(reader.take(), 'additional information').map(
      (entry) => {
        const [name, content] = asArray(entry, 'additional information entry')
        return {
          id: createId(),
          name: asString(name, 'additional information name'),
          value: asString(content, 'additional information value'),
        }
      },
    )
  }
  reader.finish()
}

function encodeCanvas(scenario: Scenario): CompactArray {
  const { canvas } = scenario
  return pack([
    { changed: canvas.width !== 1920, value: canvas.width },
    { changed: canvas.height !== 1080, value: canvas.height },
    {
      changed: canvas.background !== PLOT_BACKGROUNDS.light,
      value: encodeColor(canvas.background),
    },
    { changed: !canvas.boatNumbersVisible },
    { changed: !canvas.grid.visible },
    { changed: canvas.grid.size !== 40, value: canvas.grid.size },
    // Bit 6 was the retired snap-to-grid setting.
    { changed: false },
    { changed: canvas.grid.opacity !== 1, value: canvas.grid.opacity },
    // Bits 8–10 stay reserved so the following fields keep their positions.
    // Pan and zoom are editor state, not plot content, and never belong in a share link.
    { changed: false },
    { changed: false },
    { changed: false },
    { changed: !canvas.boatLegendVisible },
    { changed: canvas.infinite },
    {
      changed: canvas.windIndicatorPosition !== null,
      value: canvas.windIndicatorPosition
        ? [canvas.windIndicatorPosition.x, canvas.windIndicatorPosition.y]
        : undefined,
    },
    {
      changed: canvas.boatLegendPosition !== null,
      value: canvas.boatLegendPosition
        ? [canvas.boatLegendPosition.x, canvas.boatLegendPosition.y]
        : undefined,
    },
  ])
}

function decodeCanvas(value: CompactValue, scenario: Scenario) {
  const [maskValue, ...values] = asArray(value, 'canvas')
  const mask = asNumber(maskValue, 'canvas mask')
  const reader = new CompactReader(values)
  if (hasBit(mask, 0)) scenario.canvas.width = asNumber(reader.take(), 'canvas width')
  if (hasBit(mask, 1)) scenario.canvas.height = asNumber(reader.take(), 'canvas height')
  if (hasBit(mask, 2)) scenario.canvas.background = decodeColor(reader.take())
  if (hasBit(mask, 3)) scenario.canvas.boatNumbersVisible = false
  if (hasBit(mask, 4)) scenario.canvas.grid.visible = false
  if (hasBit(mask, 5)) scenario.canvas.grid.size = asNumber(reader.take(), 'grid size')
  // Bit 6 was the retired snap-to-grid setting and carried no payload.
  if (hasBit(mask, 7)) scenario.canvas.grid.opacity = asNumber(reader.take(), 'grid opacity')
  // Consume view values from links created during development, but deliberately
  // ignore them so every shared plot opens fitted at 100%.
  if (hasBit(mask, 8)) asNumber(reader.take(), 'view x')
  if (hasBit(mask, 9)) asNumber(reader.take(), 'view y')
  if (hasBit(mask, 10)) asNumber(reader.take(), 'view scale')
  if (hasBit(mask, 11)) scenario.canvas.boatLegendVisible = false
  if (hasBit(mask, 12)) scenario.canvas.infinite = true
  if (hasBit(mask, 13)) {
    const [x, y] = asArray(reader.take(), 'wind indicator position')
    scenario.canvas.windIndicatorPosition = {
      x: asNumber(x, 'wind indicator x'),
      y: asNumber(y, 'wind indicator y'),
    }
  }
  if (hasBit(mask, 14)) {
    const [x, y] = asArray(reader.take(), 'boat legend position')
    scenario.canvas.boatLegendPosition = {
      x: asNumber(x, 'boat legend x'),
      y: asNumber(y, 'boat legend y'),
    }
  }
  reader.finish()
}

function encodeEnvironment(scenario: Scenario): CompactArray {
  const { environment } = scenario
  return pack([
    { changed: environment.windDirection !== 0, value: environment.windDirection },
    { changed: environment.windStrength !== null, value: environment.windStrength },
    { changed: !environment.windVisible },
    { changed: environment.laylineAngle !== 45, value: environment.laylineAngle },
    { changed: !environment.laylinesVisible },
    { changed: !environment.zonesVisible },
    {
      changed: environment.zoneRadiusBoatLengths !== 3,
      value: environment.zoneRadiusBoatLengths,
    },
    {
      changed: environment.measurementBoatClass !== null,
      value:
        environment.measurementBoatClass === null
          ? 0
          : compactBoatClassIndex(environment.measurementBoatClass),
    },
  ])
}

function decodeEnvironment(value: CompactValue, scenario: Scenario) {
  const [maskValue, ...values] = asArray(value, 'environment')
  const mask = asNumber(maskValue, 'environment mask')
  const reader = new CompactReader(values)
  if (hasBit(mask, 0))
    scenario.environment.windDirection = asNumber(reader.take(), 'wind direction')
  if (hasBit(mask, 1)) scenario.environment.windStrength = asString(reader.take(), 'wind strength')
  if (hasBit(mask, 2)) scenario.environment.windVisible = false
  if (hasBit(mask, 3)) scenario.environment.laylineAngle = asNumber(reader.take(), 'layline angle')
  if (hasBit(mask, 4)) scenario.environment.laylinesVisible = false
  if (hasBit(mask, 5)) scenario.environment.zonesVisible = false
  if (hasBit(mask, 6))
    scenario.environment.zoneRadiusBoatLengths = asNumber(reader.take(), 'zone radius')
  if (hasBit(mask, 7))
    scenario.environment.measurementBoatClass = decodeCompactBoatClass(
      reader.take(),
      'measurement boat class',
    )
  reader.finish()
}

function encodeBase(object: ScenarioObject, index: number): CompactArray {
  const defaultRotation = object.type === 'boat' ? object.heading : 0
  return pack([
    { changed: object.rotation !== defaultRotation, value: object.rotation },
    { changed: object.scaleX !== 1, value: object.scaleX },
    { changed: object.scaleY !== 1, value: object.scaleY },
    { changed: !object.visible },
    { changed: object.locked },
    { changed: object.zIndex !== index + 1, value: object.zIndex },
    { changed: object.opacity !== 1, value: object.opacity },
  ])
}

function decodeBase(mask: number, reader: CompactReader, index: number) {
  return {
    rotation: hasBit(mask, 0) ? asNumber(reader.take(), 'rotation') : 0,
    scaleX: hasBit(mask, 1) ? asNumber(reader.take(), 'horizontal scale') : 1,
    scaleY: hasBit(mask, 2) ? asNumber(reader.take(), 'vertical scale') : 1,
    visible: !hasBit(mask, 3),
    locked: hasBit(mask, 4),
    zIndex: hasBit(mask, 5) ? asNumber(reader.take(), 'layer index') : index + 1,
    opacity: hasBit(mask, 6) ? asNumber(reader.take(), 'opacity') : 1,
  }
}

function significantSequenceIds(objects: ScenarioObject[]): Map<string, number> {
  const boats = objects.filter((object): object is BoatObject => object.type === 'boat')
  const counts = new Map<string, number>()
  boats.forEach((boat) => counts.set(boat.sequenceId, (counts.get(boat.sequenceId) ?? 0) + 1))
  const groups = new Map<string, number>()
  boats.forEach((boat) => {
    if ((counts.get(boat.sequenceId) ?? 0) <= 1 && boat.positionNumber === 1) return
    if (!groups.has(boat.sequenceId)) groups.set(boat.sequenceId, groups.size)
  })
  return groups
}

function encodeObject(
  object: ScenarioObject,
  index: number,
  sequenceGroups: Map<string, number>,
): CompactArray {
  const type = OBJECT_TYPES.indexOf(object.type)
  const base = encodeBase(object, index)
  const prefix: CompactArray = [type, object.x, object.y, ...base]

  if (object.type === 'boat') {
    const defaultColor = boatColorForClass(object.boatClass, '#FFAA00')
    const group = sequenceGroups.get(object.sequenceId)
    return [
      ...prefix,
      ...pack([
        { changed: object.boatClass !== 'ILCA', value: compactBoatClassIndex(object.boatClass) },
        { changed: object.name !== '', value: object.name },
        { changed: object.sailNumber !== '', value: object.sailNumber },
        { changed: object.label !== '', value: object.label },
        { changed: object.color !== defaultColor, value: encodeColor(object.color) },
        { changed: object.heading !== 0, value: object.heading },
        { changed: object.tack === 'port' },
        { changed: !object.mainsailVisible },
        { changed: object.jibVisible },
        { changed: object.genoaVisible },
        { changed: object.spinnakerVisible },
        { changed: object.gennakerVisible },
        { changed: object.mainsailTrim !== 0, value: object.mainsailTrim },
        { changed: object.jibTrim !== 0, value: object.jibTrim },
        { changed: object.spinnakerTrim !== 0, value: object.spinnakerTrim },
        { changed: object.gennakerTrim !== 0, value: object.gennakerTrim },
        { changed: object.sailMode === 'manual' },
        { changed: object.sailAngle !== 32, value: object.sailAngle },
        { changed: group !== undefined, value: group ?? 0 },
        { changed: object.positionNumber !== 1, value: object.positionNumber },
        {
          changed: object.overlapIndicator !== 'none',
          value: OVERLAP_INDICATORS.indexOf(object.overlapIndicator),
        },
        {
          changed: object.stateMarker !== undefined && object.stateMarker !== 'none',
          value: STATE_MARKERS.indexOf(object.stateMarker ?? 'none'),
        },
        {
          changed: object.boatFlagColor !== null,
          value: encodeColor(object.boatFlagColor ?? '#FFFFFF'),
        },
        {
          changed: object.umpireSignalFlag !== 'none',
          value: UMPIRE_SIGNAL_FLAGS.indexOf(object.umpireSignalFlag),
        },
      ]),
    ]
  }

  if (object.type === 'mark') {
    return [
      ...prefix,
      ...pack([
        { changed: object.markType !== 'racing', value: MARK_TYPES.indexOf(object.markType) },
        { changed: object.shape !== 'round', value: MARK_SHAPES.indexOf(object.shape) },
        { changed: object.color !== '#FFAA00', value: encodeColor(object.color) },
        { changed: object.label !== '', value: object.label },
        { changed: object.markNumber !== '1', value: encodeMarkNumber(object.markNumber) },
        { changed: object.downwind },
        { changed: !object.zoneVisible },
        { changed: object.zoneRadius !== 3, value: object.zoneRadius },
        { changed: !object.laylinesVisible },
      ]),
    ]
  }

  if (object.type === 'gate') {
    return [
      ...prefix,
      object.endAX,
      object.endAY,
      object.endBX,
      object.endBY,
      object.markNumber,
      ...pack([
        { changed: object.color !== '#FFAA00', value: encodeColor(object.color) },
        { changed: !object.zoneVisible },
        { changed: object.zoneRadius !== 3, value: object.zoneRadius },
      ]),
    ]
  }

  if (object.type === 'start-line' || object.type === 'finish-line') {
    const defaultFlagColor = object.type === 'start-line' ? START_FLAG_COLOR : FINISH_FLAG_COLOR
    return [
      ...prefix,
      object.endAX,
      object.endAY,
      object.endBX,
      object.endBY,
      ...pack([
        { changed: object.color !== '#A3A3A3', value: encodeColor(object.color) },
        {
          changed: object.startEndType !== 'committee-boat',
          value: ENDPOINT_TYPES.indexOf(object.startEndType),
        },
        {
          changed: object.pinEndType !== 'flag',
          value: ENDPOINT_TYPES.indexOf(object.pinEndType),
        },
        {
          changed: object.startEndFlagColor !== defaultFlagColor,
          value: encodeColor(object.startEndFlagColor),
        },
        {
          changed: object.pinEndFlagColor !== defaultFlagColor,
          value: encodeColor(object.pinEndFlagColor),
        },
        { changed: object.laylinesVisible },
        { changed: object.laylineAreaVisible },
        {
          changed: object.laylineAreaColor !== defaultFlagColor,
          value: encodeColor(object.laylineAreaColor),
        },
      ]),
    ]
  }

  if (object.type === 'line' || object.type === 'arrow' || object.type === 'freehand') {
    return [
      ...prefix,
      object.points,
      ...pack([
        { changed: object.stroke !== '#171717', value: encodeColor(object.stroke) },
        { changed: object.strokeWidth !== 3, value: object.strokeWidth },
        { changed: object.dash.length > 0, value: object.dash },
      ]),
    ]
  }

  if (object.type === 'text') {
    return [
      ...prefix,
      ...pack([
        { changed: object.text !== 'Annotation', value: object.text },
        { changed: object.color !== '#171717', value: encodeColor(object.color) },
        { changed: object.fontSize !== 28, value: object.fontSize },
        { changed: object.fontWeight === 'bold' },
        { changed: object.align !== 'left', value: TEXT_ALIGNS.indexOf(object.align) },
        { changed: object.background !== 'transparent', value: encodeColor(object.background) },
      ]),
    ]
  }

  if (object.type !== 'rectangle' && object.type !== 'circle')
    throw new Error(`Unsupported compact object type: ${object.type}`)
  return [
    ...prefix,
    object.width,
    object.height,
    ...pack([
      { changed: object.stroke !== '#171717', value: encodeColor(object.stroke) },
      { changed: object.strokeWidth !== 3, value: object.strokeWidth },
      { changed: object.fill !== 'transparent', value: encodeColor(object.fill) },
    ]),
  ]
}

function decodeObject(
  value: CompactValue,
  index: number,
  sequenceGroups: Map<number, string>,
): ScenarioObject {
  const [typeValue, xValue, yValue, baseMaskValue, ...values] = asArray(value, 'object')
  const type = enumAt(OBJECT_TYPES, typeValue, 'object type')
  const x = asNumber(xValue, 'object x')
  const y = asNumber(yValue, 'object y')
  const baseMask = asNumber(baseMaskValue, 'object mask')
  const reader = new CompactReader(values)
  const base = decodeBase(baseMask, reader, index)

  if (type === 'boat') {
    const mask = asNumber(reader.take(), 'boat mask')
    const boatClass: BoatClass = hasBit(mask, 0)
      ? decodeCompactBoatClass(reader.take(), 'boat class')
      : 'ILCA'
    const boat = { ...createBoat(x, y, index + 1, boatClass), ...base }
    if (hasBit(mask, 1)) boat.name = asString(reader.take(), 'boat name')
    if (hasBit(mask, 2)) boat.sailNumber = asString(reader.take(), 'sail number')
    if (hasBit(mask, 3)) boat.label = asString(reader.take(), 'boat label')
    if (hasBit(mask, 4)) boat.color = decodeColor(reader.take())
    if (hasBit(mask, 5)) boat.heading = asNumber(reader.take(), 'boat heading')
    boat.tack = hasBit(mask, 6) ? 'port' : 'starboard'
    boat.mainsailVisible = !hasBit(mask, 7)
    boat.jibVisible = hasBit(mask, 8)
    boat.genoaVisible = hasBit(mask, 9)
    boat.spinnakerVisible = hasBit(mask, 10)
    boat.gennakerVisible = hasBit(mask, 11)
    if (hasBit(mask, 12)) boat.mainsailTrim = asNumber(reader.take(), 'mainsail trim')
    if (hasBit(mask, 13)) boat.jibTrim = asNumber(reader.take(), 'jib trim')
    if (hasBit(mask, 14)) boat.spinnakerTrim = asNumber(reader.take(), 'spinnaker trim')
    if (hasBit(mask, 15)) boat.gennakerTrim = asNumber(reader.take(), 'gennaker trim')
    boat.sailMode = hasBit(mask, 16) ? 'manual' : 'automatic'
    if (hasBit(mask, 17)) boat.sailAngle = asNumber(reader.take(), 'sail angle')
    if (hasBit(mask, 18)) {
      const group = asNumber(reader.take(), 'boat sequence')
      if (!sequenceGroups.has(group)) sequenceGroups.set(group, createId())
      boat.sequenceId = sequenceGroups.get(group)!
    }
    if (hasBit(mask, 19)) boat.positionNumber = asNumber(reader.take(), 'boat position')
    if (hasBit(mask, 20))
      boat.overlapIndicator = enumAt(OVERLAP_INDICATORS, reader.take(), 'overlap indicator')
    if (hasBit(mask, 21)) boat.stateMarker = enumAt(STATE_MARKERS, reader.take(), 'state marker')
    if (hasBit(mask, 22)) boat.boatFlagColor = decodeColor(reader.take())
    if (hasBit(mask, 23))
      boat.umpireSignalFlag = enumAt(UMPIRE_SIGNAL_FLAGS, reader.take(), 'umpire signal flag')
    if (!hasBit(baseMask, 0)) boat.rotation = boat.heading
    reader.finish()
    return boat
  }

  if (type === 'mark') {
    const mask = asNumber(reader.take(), 'mark mask')
    const mark = { ...createMark(x, y, index + 1), ...base }
    if (hasBit(mask, 0)) mark.markType = enumAt(MARK_TYPES, reader.take(), 'mark type')
    if (hasBit(mask, 1)) mark.shape = enumAt(MARK_SHAPES, reader.take(), 'mark shape')
    if (hasBit(mask, 2)) mark.color = decodeColor(reader.take())
    if (hasBit(mask, 3)) mark.label = asString(reader.take(), 'mark label')
    if (hasBit(mask, 4)) {
      const markNumber = reader.take()
      mark.markNumber =
        typeof markNumber === 'number'
          ? String(asNumber(markNumber, 'mark number'))
          : asString(markNumber, 'mark number')
    }
    mark.downwind = hasBit(mask, 5)
    mark.zoneVisible = !hasBit(mask, 6)
    if (hasBit(mask, 7)) mark.zoneRadius = asNumber(reader.take(), 'mark zone radius')
    mark.laylinesVisible = !hasBit(mask, 8)
    reader.finish()
    return mark
  }

  if (type === 'gate') {
    const endAX = asNumber(reader.take(), 'gate endpoint')
    const endAY = asNumber(reader.take(), 'gate endpoint')
    const endBX = asNumber(reader.take(), 'gate endpoint')
    const endBY = asNumber(reader.take(), 'gate endpoint')
    const markNumber = asNumber(reader.take(), 'gate number')
    const mask = asNumber(reader.take(), 'gate mask')
    const gate = {
      ...createGate(x + endAX, y + endAY, x + endBX, y + endBY, index + 1, markNumber),
      ...base,
    }
    if (hasBit(mask, 0)) gate.color = decodeColor(reader.take())
    gate.zoneVisible = !hasBit(mask, 1)
    if (hasBit(mask, 2)) gate.zoneRadius = asNumber(reader.take(), 'gate zone radius')
    reader.finish()
    return gate
  }

  if (type === 'start-line' || type === 'finish-line') {
    const endAX = asNumber(reader.take(), 'line endpoint')
    const endAY = asNumber(reader.take(), 'line endpoint')
    const endBX = asNumber(reader.take(), 'line endpoint')
    const endBY = asNumber(reader.take(), 'line endpoint')
    const mask = asNumber(reader.take(), 'course line mask')
    const line = {
      ...(type === 'start-line'
        ? createStartLine(x + endAX, y + endAY, x + endBX, y + endBY, index + 1)
        : createFinishLine(x + endAX, y + endAY, x + endBX, y + endBY, index + 1)),
      ...base,
    }
    if (hasBit(mask, 0)) line.color = decodeColor(reader.take())
    if (hasBit(mask, 1))
      line.startEndType = enumAt(ENDPOINT_TYPES, reader.take(), 'course start endpoint')
    if (hasBit(mask, 2))
      line.pinEndType = enumAt(ENDPOINT_TYPES, reader.take(), 'course pin endpoint')
    if (hasBit(mask, 3)) line.startEndFlagColor = decodeColor(reader.take())
    if (hasBit(mask, 4)) line.pinEndFlagColor = decodeColor(reader.take())
    line.laylinesVisible = hasBit(mask, 5)
    line.laylineAreaVisible = hasBit(mask, 6)
    if (hasBit(mask, 7)) line.laylineAreaColor = decodeColor(reader.take())
    reader.finish()
    return line
  }

  if (type === 'line' || type === 'arrow' || type === 'freehand') {
    const points = asArray(reader.take(), 'line points').map((point) =>
      asNumber(point, 'line point'),
    )
    const mask = asNumber(reader.take(), 'line mask')
    const line: ScenarioObject = {
      id: createId(),
      type,
      x,
      y,
      ...base,
      points,
      stroke: hasBit(mask, 0) ? decodeColor(reader.take()) : '#171717',
      strokeWidth: hasBit(mask, 1) ? asNumber(reader.take(), 'stroke width') : 3,
      dash: hasBit(mask, 2)
        ? asArray(reader.take(), 'line dash').map((entry) => asNumber(entry, 'dash value'))
        : [],
    }
    reader.finish()
    return line
  }

  if (type === 'text') {
    const mask = asNumber(reader.take(), 'text mask')
    const text: ScenarioObject = {
      id: createId(),
      type,
      x,
      y,
      ...base,
      text: hasBit(mask, 0) ? asString(reader.take(), 'annotation') : 'Annotation',
      color: hasBit(mask, 1) ? decodeColor(reader.take()) : '#171717',
      fontSize: hasBit(mask, 2) ? asNumber(reader.take(), 'font size') : 28,
      fontWeight: hasBit(mask, 3) ? 'bold' : 'normal',
      align: hasBit(mask, 4) ? enumAt(TEXT_ALIGNS, reader.take(), 'text alignment') : 'left',
      background: hasBit(mask, 5) ? decodeColor(reader.take()) : 'transparent',
    }
    reader.finish()
    return text
  }

  const width = asNumber(reader.take(), 'shape width')
  const height = asNumber(reader.take(), 'shape height')
  const mask = asNumber(reader.take(), 'shape mask')
  const shape: ScenarioObject = {
    id: createId(),
    type,
    x,
    y,
    ...base,
    width,
    height,
    stroke: hasBit(mask, 0) ? decodeColor(reader.take()) : '#171717',
    strokeWidth: hasBit(mask, 1) ? asNumber(reader.take(), 'stroke width') : 3,
    fill: hasBit(mask, 2) ? decodeColor(reader.take()) : 'transparent',
  }
  reader.finish()
  return shape
}

export function compactScenario(scenario: Scenario): CompactArray {
  const sequenceGroups = significantSequenceIds(scenario.objects)
  return [
    encodeMetadata(scenario),
    encodeCanvas(scenario),
    encodeEnvironment(scenario),
    scenario.objects.map((object, index) => encodeObject(object, index, sequenceGroups)),
  ]
}

export function expandCompactScenario(value: unknown): Scenario {
  if (!Array.isArray(value) || value.length !== 4)
    throw new Error('The compact plot data is damaged.')
  const scenario = createEmptyScenario()
  // Compact share format v1 was defined when the legend defaulted to on. Preserve
  // that format's bit semantics even though new editor projects now default to off.
  scenario.canvas.boatLegendVisible = true
  decodeMetadata(value[0] as CompactValue, scenario)
  decodeCanvas(value[1] as CompactValue, scenario)
  decodeEnvironment(value[2] as CompactValue, scenario)
  const groups = new Map<number, string>()
  scenario.objects = asArray(value[3] as CompactValue, 'objects').map((object, index) =>
    decodeObject(object, index, groups),
  )
  return migrateScenario(scenario)
}
