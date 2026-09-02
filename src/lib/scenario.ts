import type {
  BoatClass,
  BoatObject,
  FinishLineObject,
  GateObject,
  MarkObject,
  Scenario,
  ScenarioObject,
  StartLineObject,
} from '../types/scenario'
import { boatColorForClass, SAILPLOT_AMBER } from './boatColors'
import { PLOT_BACKGROUNDS } from './plotTheme'

export { isDarkPlotBackground, normalizePlotBackground, PLOT_BACKGROUNDS } from './plotTheme'

export const createId = () => {
  const runtimeCrypto = globalThis.crypto

  if (typeof runtimeCrypto?.randomUUID === 'function') {
    return runtimeCrypto.randomUUID()
  }

  const bytes = new Uint8Array(16)
  if (typeof runtimeCrypto?.getRandomValues === 'function') {
    runtimeCrypto.getRandomValues(bytes)
  } else {
    for (let index = 0; index < bytes.length; index += 1) {
      bytes[index] = Math.floor(Math.random() * 256)
    }
  }

  bytes[6] = (bytes[6] & 0x0f) | 0x40
  bytes[8] = (bytes[8] & 0x3f) | 0x80

  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0'))
  return `${hex.slice(0, 4).join('')}-${hex.slice(4, 6).join('')}-${hex.slice(6, 8).join('')}-${hex.slice(8, 10).join('')}-${hex.slice(10).join('')}`
}
export const normalizeHeading = (value: number) => ((value % 360) + 360) % 360
export const START_FLAG_COLOR = '#FF5E00'
export const FINISH_FLAG_COLOR = '#168DDD'
export const normalizeSignedAngle = (value: number) => {
  const normalized = normalizeHeading(value)
  return normalized > 180 ? normalized - 360 : normalized
}

export const markNumberSequenceValue = (value: string | number | null | undefined) => {
  const match = /^([1-9]\d*)/.exec(String(value ?? ''))
  return match ? Number(match[1]) : 0
}

export const nextMarkSequenceNumber = (objects: ScenarioObject[]) =>
  objects.reduce(
    (highest, object) =>
      object.type === 'mark' || object.type === 'gate'
        ? Math.max(highest, markNumberSequenceValue(object.markNumber))
        : highest,
    0,
  ) + 1

export const now = () => new Date().toISOString()

const baseObject = (type: ScenarioObject['type'], x: number, y: number, zIndex: number) => ({
  id: createId(),
  type,
  x,
  y,
  rotation: 0,
  scaleX: 1,
  scaleY: 1,
  visible: true,
  locked: false,
  zIndex,
  opacity: 1,
})

export function createBoat(
  x: number,
  y: number,
  zIndex = 1,
  boatClass: BoatClass = 'ILCA',
  brandAccentColor = SAILPLOT_AMBER,
): BoatObject {
  return {
    ...baseObject('boat', x, y, zIndex),
    type: 'boat',
    boatClass,
    name: '',
    sailNumber: '',
    label: '',
    color: boatColorForClass(boatClass, brandAccentColor),
    heading: 0,
    tack: 'starboard',
    mainsailVisible: true,
    jibVisible: false,
    genoaVisible: false,
    spinnakerVisible: false,
    gennakerVisible: false,
    mainsailTrim: 0,
    jibTrim: 0,
    spinnakerTrim: 0,
    gennakerTrim: 0,
    sailMode: 'automatic',
    sailAngle: 32,
    sequenceId: createId(),
    positionNumber: 1,
    overlapIndicator: 'none',
    protestFlagVisible: false,
    boatFlagColor: null,
    umpireSignalFlag: 'none',
    stateMarker: 'none',
  }
}

export function createMark(
  x: number,
  y: number,
  zIndex = 1,
  markColor = SAILPLOT_AMBER,
): MarkObject {
  return {
    ...baseObject('mark', x, y, zIndex),
    type: 'mark',
    markType: 'racing',
    shape: 'round',
    color: markColor,
    label: '',
    markNumber: '1',
    downwind: false,
    laylinesVisible: false,
    zoneVisible: true,
    zoneRadius: 3,
    zoneRadiusUnit: 'boat-lengths',
  }
}

export function createGate(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  zIndex = 1,
  markNumber = 1,
  zoneRadius = 3,
  markColor = SAILPLOT_AMBER,
): GateObject {
  const centerX = (x1 + x2) / 2
  const centerY = (y1 + y2) / 2
  return {
    ...baseObject('gate', centerX, centerY, zIndex),
    type: 'gate',
    endAX: x1 - centerX,
    endAY: y1 - centerY,
    endBX: x2 - centerX,
    endBY: y2 - centerY,
    markNumber,
    color: markColor,
    zoneVisible: true,
    zoneRadius,
    zoneRadiusUnit: 'boat-lengths',
  }
}

export function createStartLine(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  zIndex = 1,
  startLineFlagColor = START_FLAG_COLOR,
): StartLineObject {
  const centerX = (x1 + x2) / 2
  const centerY = (y1 + y2) / 2
  return {
    ...baseObject('start-line', centerX, centerY, zIndex),
    type: 'start-line',
    endAX: x1 - centerX,
    endAY: y1 - centerY,
    endBX: x2 - centerX,
    endBY: y2 - centerY,
    color: '#A3A3A3',
    startEndType: 'committee-boat',
    pinEndType: 'flag',
    startEndFlagColor: startLineFlagColor,
    pinEndFlagColor: startLineFlagColor,
    laylinesVisible: false,
    laylineAreaVisible: false,
    laylineAreaColor: SAILPLOT_AMBER,
  }
}

export function createFinishLine(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  zIndex = 1,
): FinishLineObject {
  const centerX = (x1 + x2) / 2
  const centerY = (y1 + y2) / 2
  return {
    ...baseObject('finish-line', centerX, centerY, zIndex),
    type: 'finish-line',
    endAX: x1 - centerX,
    endAY: y1 - centerY,
    endBX: x2 - centerX,
    endBY: y2 - centerY,
    color: '#A3A3A3',
    startEndType: 'committee-boat',
    pinEndType: 'flag',
    startEndFlagColor: FINISH_FLAG_COLOR,
    pinEndFlagColor: FINISH_FLAG_COLOR,
    laylinesVisible: false,
    laylineAreaVisible: false,
    laylineAreaColor: FINISH_FLAG_COLOR,
  }
}

export function createEmptyScenario(title = 'Untitled plot'): Scenario {
  const timestamp = now()
  return {
    format: 'sailplot',
    version: 1,
    metadata: {
      id: createId(),
      title,
      description: '',
      ruleReferences: [],
      additionalInformation: [{ id: createId(), name: '', value: '' }],
      createdAt: timestamp,
      updatedAt: timestamp,
    },
    canvas: {
      width: 1920,
      height: 1080,
      infinite: false,
      background: PLOT_BACKGROUNDS.light,
      boatNumbersVisible: true,
      boatLegendVisible: false,
      windIndicatorPosition: null,
      boatLegendPosition: null,
      grid: { visible: true, size: 40, opacity: 1 },
      view: { x: 0, y: 0, scale: 1 },
    },
    environment: {
      windDirection: 0,
      windStrength: null,
      windVisible: true,
      laylineAngle: 45,
      laylinesVisible: true,
      zonesVisible: true,
      zoneRadiusBoatLengths: 3,
      measurementBoatClass: null,
    },
    objects: [],
  }
}

export function nextUntitledPlotTitle(baseTitle: string, existingTitles: string[]): string {
  const defaultTitles = new Set([baseTitle, 'Untitled plot', 'Unbenannter Plot'])
  let highestNumber = 0

  for (const title of existingTitles) {
    for (const defaultTitle of defaultTitles) {
      if (title === defaultTitle) {
        highestNumber = Math.max(highestNumber, 0)
        continue
      }

      if (!title.startsWith(`${defaultTitle} `)) continue
      const suffix = title.slice(defaultTitle.length + 1)
      if (/^\d+$/.test(suffix)) highestNumber = Math.max(highestNumber, Number(suffix))
    }
  }

  return `${baseTitle} ${highestNumber + 1}`
}

export function duplicateObject<T extends ScenarioObject>(object: T, offset = 24): T {
  return {
    ...structuredClone(object),
    id: createId(),
    x: object.x + offset,
    y: object.y + offset,
    zIndex: object.zIndex + 1,
  }
}

export function sanitizeFilename(value: string): string {
  const cleaned = value
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
  return cleaned || 'sailplot'
}
