import {
  isSupportBoatClass,
  type BoatClass,
  type BoatObject,
  type ScenarioObject,
} from '../../types/scenario'
import { boatSequenceSegment } from './boatSequenceGeometry'

export { COACHBOAT_BLUE } from '../../lib/boatColors'

export interface BoatShapeProfile {
  hullPath: string
  displayScale: number
  /** Full-size hull length in canvas units (10 units = 1 metre). */
  length: number
  /** Fore-to-aft extent of the drawn hull before displayScale is applied. */
  drawingLength: number
  /** Port-side stern corner used to anchor the protest flag. */
  sternPort: [number, number]
  mast: [number, number] | null
  mainsailSize: number
  mainsailMaxAngle: number
  mainsailSpinMaxAngle: number
  jibTack: [number, number] | null
  jibSize: number
  genoaSize?: number
  jibMaxAngle: number
  jibSpinMaxAngle: number
  spinnakerSize: number
  gennakerTack: [number, number] | null
  gennakerSize: number
  poleLength: number
  numberPos: [number, number]
  numberSize: number
  kind: 'monohull' | 'skiff' | 'catamaran' | 'board' | 'motor' | 'vsr'
  closeHauledMainsailAngle?: number
  closeHauledHeadsailAngle?: number
  /** Published class sail areas in square metres; omitted when a class has no fixed area. */
  sailAreas?: Partial<
    Record<'mainsail' | 'jib' | 'genoa' | 'spinnaker' | 'gennaker' | 'upwindTotal', number>
  >
}

const profiles = {
  keelboat: {
    hullPath: 'M 0 -50 C 20 0 18 13 10 50 L -10 50 C -18 13 -20 0 0 -50 Z',
    displayScale: 0.88,
    length: 100,
    drawingLength: 100,
    sternPort: [-10, 50],
    mast: [0, -8.7],
    mainsailSize: 41.5,
    mainsailMaxAngle: 90,
    mainsailSpinMaxAngle: 65,
    jibTack: [0, -50],
    jibSize: 40,
    genoaSize: 58,
    jibMaxAngle: 45,
    jibSpinMaxAngle: 35,
    spinnakerSize: 45.65,
    gennakerTack: [0, -80],
    gennakerSize: 70,
    poleLength: 30,
    numberPos: [0, 25],
    numberSize: 12,
    kind: 'monohull',
    closeHauledHeadsailAngle: 15,
  },
  laser: {
    hullPath:
      'M 0 -20 C .3 -19.7 .3 -20 .7 -19.7 C 3.3 -14.3 6.7 -3.3 6.7 4.7 C 6.7 11 6.7 14.3 5 20 L -5 20 C -6.7 14.3 -6.7 11 -6.7 4.7 C -6.7 -3.3 -3.3 -14.3 -.7 -19.7 C -.3 -20 -.3 -19.7 0 -20 Z',
    displayScale: 1.72,
    length: 42.3,
    drawingLength: 40,
    sternPort: [-5, 20],
    mast: [0, -8.7],
    mainsailSize: 24.2,
    mainsailMaxAngle: 90,
    mainsailSpinMaxAngle: 90,
    jibTack: null,
    jibSize: 0,
    jibMaxAngle: 0,
    jibSpinMaxAngle: 0,
    spinnakerSize: 0,
    gennakerTack: null,
    gennakerSize: 0,
    poleLength: 0,
    numberPos: [0, 10],
    numberSize: 7,
    kind: 'monohull',
    closeHauledMainsailAngle: 11,
    sailAreas: { mainsail: 7.06 },
  },
  optimist: {
    hullPath:
      'M 0 -11.5 C 1.5 -11.5 1.7 -11.3 2.9 -11.1 C 3.6 -9.4 5.6 -4 5.6 1.5 C 5.6 5.4 5 9 4.6 11.5 L -4.6 11.5 C -5 9 -5.6 5.4 -5.6 1.5 C -5.6 -4 -3.6 -9.4 -2.9 -11.1 C -1.7 -11.3 -1.5 -11.5 0 -11.5 Z',
    displayScale: 2.5,
    length: 23,
    drawingLength: 23,
    sternPort: [-4.6, 11.5],
    mast: [0, -6.9],
    mainsailSize: 16.5,
    mainsailMaxAngle: 90,
    mainsailSpinMaxAngle: 90,
    jibTack: null,
    jibSize: 0,
    jibMaxAngle: 0,
    jibSpinMaxAngle: 0,
    spinnakerSize: 0,
    gennakerTack: null,
    gennakerSize: 0,
    poleLength: 0,
    numberPos: [0, 3],
    numberSize: 6,
    kind: 'monohull',
    sailAreas: { mainsail: 3.3 },
  },
  topper: {
    hullPath:
      'M 0 -17 C 2.4 -17 2.8 -16 3.7 -14 C 4.6 -12 5.8 -6 5.8 -1 C 5.8 1 5.8 8 4.4 17 L -4.4 17 C -5.8 8 -5.8 1 -5.8 -1 C -5.8 -6 -4.6 -12 -3.7 -14 C -2.8 -16 -2.4 -17 0 -17 Z',
    displayScale: 1.95,
    length: 34,
    drawingLength: 34,
    sternPort: [-4.4, 17],
    mast: [0, -6.5],
    mainsailSize: 23.5,
    mainsailMaxAngle: 90,
    mainsailSpinMaxAngle: 90,
    jibTack: null,
    jibSize: 0,
    jibMaxAngle: 0,
    jibSpinMaxAngle: 0,
    spinnakerSize: 0,
    gennakerTack: null,
    gennakerSize: 0,
    poleLength: 0,
    numberPos: [0, 8],
    numberSize: 7,
    kind: 'monohull',
  },
  firefly: {
    hullPath:
      'M 0 -18.3 C 3.7 -14 7.6 -8 7.6 1.8 C 7.6 4.2 7.6 9.2 4.9 18.3 L -4.9 18.3 C -7.6 9.2 -7.6 4.2 -7.6 1.8 C -7.6 -8 -3.7 -14 0 -18.3 Z',
    displayScale: 1.8,
    length: 36.6,
    drawingLength: 36.6,
    sternPort: [-4.9, 18.3],
    mast: [0, -6.5],
    mainsailSize: 21.8,
    mainsailMaxAngle: 90,
    mainsailSpinMaxAngle: 90,
    jibTack: [0, -18.3],
    jibSize: 14,
    jibMaxAngle: 45,
    jibSpinMaxAngle: 45,
    spinnakerSize: 0,
    gennakerTack: null,
    gennakerSize: 0,
    poleLength: 0,
    numberPos: [0, 10],
    numberSize: 7,
    kind: 'monohull',
  },
  int420: {
    hullPath:
      'M 0 -21 C 1.5 -21 8.15 -12.5 8.15 3.3 Q 8.15 11.5 5.7 20 Q 2.8 21 0 21 Q -2.8 21 -5.7 20 Q -8.15 11.5 -8.15 3.3 C -8.15 -12.5 -1.5 -21 0 -21 Z',
    displayScale: 1.58,
    length: 42,
    drawingLength: 42,
    sternPort: [-5.7, 20],
    mast: [0, -7.1],
    mainsailSize: 24,
    mainsailMaxAngle: 90,
    mainsailSpinMaxAngle: 90,
    jibTack: [0, -21],
    jibSize: 14.4,
    jibMaxAngle: 45,
    jibSpinMaxAngle: 45,
    spinnakerSize: 27.3,
    gennakerTack: null,
    gennakerSize: 0,
    poleLength: 0,
    numberPos: [0, 9],
    numberSize: 7,
    kind: 'monohull',
    closeHauledMainsailAngle: 7,
    closeHauledHeadsailAngle: 10,
    sailAreas: { mainsail: 10.25, jib: 2.8, spinnaker: 9 },
  },
  int470: {
    hullPath:
      'M 0 -23.5 C .8 -23.5 8.5 -15 8.5 3.5 Q 8.5 12.5 5.8 23.5 L -5.8 23.5 Q -8.5 12.5 -8.5 3.5 C -8.5 -15 -.8 -23.5 0 -23.5 Z',
    displayScale: 1.48,
    length: 47,
    drawingLength: 47,
    sternPort: [-5.8, 23.5],
    mast: [0, -7.5],
    mainsailSize: 26.5,
    mainsailMaxAngle: 90,
    mainsailSpinMaxAngle: 90,
    jibTack: [0, -23.5],
    jibSize: 15.9,
    jibMaxAngle: 45,
    jibSpinMaxAngle: 45,
    spinnakerSize: 32.8,
    gennakerTack: null,
    gennakerSize: 0,
    poleLength: 0,
    numberPos: [0, 9],
    numberSize: 7,
    kind: 'monohull',
    closeHauledMainsailAngle: 7,
    closeHauledHeadsailAngle: 10,
    sailAreas: { mainsail: 9.12, jib: 3.58, spinnaker: 13 },
  },
  int29er: {
    hullPath:
      'M 0 -20.5 L -.5 -20.5 C -3.5 -10.25 -6.6 -1.1 -8.3 -.5 L -8.8 18 L -4.4 20.5 L 4.4 20.5 L 8.8 18 L 8.3 -.5 C 6.6 -1.1 3.5 -10.25 .5 -20.5 Z',
    displayScale: 1.62,
    length: 44.5,
    drawingLength: 41,
    sternPort: [-8.8, 18],
    mast: [0, -3.4],
    mainsailSize: 20.5,
    mainsailMaxAngle: 85,
    mainsailSpinMaxAngle: 40,
    jibTack: [0, -20.5],
    jibSize: 17,
    jibMaxAngle: 45,
    jibSpinMaxAngle: 35,
    spinnakerSize: 0,
    gennakerTack: [0, -34.2],
    gennakerSize: 35.2,
    poleLength: 13.7,
    numberPos: [0, 9],
    numberSize: 7,
    kind: 'skiff',
    closeHauledMainsailAngle: 6,
    closeHauledHeadsailAngle: 8,
    sailAreas: { upwindTotal: 12.5, gennaker: 15 },
  },
  int49er: {
    hullPath:
      'M 0 -24 L -.5 -24 C -1.5 -23 -6.5 -5.5 -7.5 1.5 L -13.5 2.4 Q -14 2.5 -14 3 L -14 24 L -13.5 24 L -12.5 21 L -7.5 19 L -5 22 L 5 22 L 7.5 19 L 12.5 21 L 13.5 24 L 14 24 L 14 3 Q 14 2.5 13.5 2.4 L 7.5 1.5 C 6.5 -5.5 1.5 -23 .5 -24 Z',
    displayScale: 1.48,
    length: 49.9,
    drawingLength: 48,
    sternPort: [-14, 24],
    mast: [0, -2.5],
    mainsailSize: 26.5,
    mainsailMaxAngle: 85,
    mainsailSpinMaxAngle: 40,
    jibTack: [0, -22.5],
    jibSize: 19,
    jibMaxAngle: 45,
    jibSpinMaxAngle: 35,
    spinnakerSize: 0,
    gennakerTack: [0, -42.5],
    gennakerSize: 41.8,
    poleLength: 18.5,
    numberPos: [0, 9],
    numberSize: 7,
    kind: 'skiff',
    closeHauledMainsailAngle: 6,
    closeHauledHeadsailAngle: 8,
    sailAreas: { mainsail: 16.1, jib: 5.1, gennaker: 21.2 },
  },
  tornado: {
    hullPath:
      'M 0 0 L 10.7 0 C 11.2 -11.7 12.2 -19.8 13.2 -30.5 C 14.7 -20.3 15.3 -6.1 15.3 6.1 C 15.3 13.7 14.7 20.8 14.7 30 C 13.7 30.5 12.7 30.5 10.7 30 L 10.7 23.9 L -10.7 23.9 L -10.7 30 C -12.7 30.5 -13.7 30.5 -14.7 30 C -14.7 20.8 -15.3 13.7 -15.3 6.1 C -15.3 -6.1 -14.7 -20.3 -13.2 -30.5 C -12.2 -19.8 -11.2 -11.7 -10.7 0 Z',
    displayScale: 1.25,
    length: 61,
    drawingLength: 61,
    sternPort: [-14.7, 30],
    mast: [0, 0],
    mainsailSize: 30,
    mainsailMaxAngle: 80,
    mainsailSpinMaxAngle: 30,
    jibTack: [0, -20],
    jibSize: 21,
    jibMaxAngle: 45,
    jibSpinMaxAngle: 35,
    spinnakerSize: 0,
    gennakerTack: [0, -40],
    gennakerSize: 45.5,
    poleLength: 40,
    numberPos: [0, 17],
    numberSize: 10,
    kind: 'catamaran',
    closeHauledMainsailAngle: 3,
  },
  vsr: {
    hullPath:
      'M 0 -46 ' +
      'C 3 -44 5.5 -40 7.5 -35 ' +
      'C 10 -29 11.5 -22 12 -14 ' +
      'L 13 31 ' +
      'C 13 35 11.5 38 8.5 39 ' +
      'L 5.5 40 ' +
      'L -5.5 40 ' +
      'L -8.5 39 ' +
      'C -11.5 38 -13 35 -13 31 ' +
      'L -12 -14 ' +
      'C -11.5 -22 -10 -29 -7.5 -35 ' +
      'C -5.5 -40 -3 -44 0 -46 Z',

    displayScale: 0.9,
    length: 57.5,
    drawingLength: 86,
    sternPort: [-13, 36],

    mast: null,
    mainsailSize: 0,
    mainsailMaxAngle: 0,
    mainsailSpinMaxAngle: 0,
    jibTack: null,
    jibSize: 0,
    jibMaxAngle: 0,
    jibSpinMaxAngle: 0,
    spinnakerSize: 0,
    gennakerTack: null,
    gennakerSize: 0,
    poleLength: 0,

    numberPos: [0, 23],
    numberSize: 10,
    kind: 'vsr',
  },
  committee: {
    hullPath: 'M 0 -50 C 30 -20 20 30 17 50 L -17 50 C -20 30 -30 -20 0 -50 Z',
    displayScale: 0.92,
    length: 100,
    drawingLength: 100,
    sternPort: [-17, 50],
    mast: null,
    mainsailSize: 0,
    mainsailMaxAngle: 0,
    mainsailSpinMaxAngle: 0,
    jibTack: null,
    jibSize: 0,
    jibMaxAngle: 0,
    jibSpinMaxAngle: 0,
    spinnakerSize: 0,
    gennakerTack: null,
    gennakerSize: 0,
    poleLength: 0,
    numberPos: [0, 18],
    numberSize: 12,
    kind: 'motor',
  },
  board: {
    hullPath:
      'M 0 -11 C 2.7 -10.9 4.4 -9.2 4.7 -6 L 4.75 7.5 Q 4.7 9.6 4.28 11 L -4.28 11 Q -4.7 9.6 -4.75 7.5 L -4.7 -6 C -4.4 -9.2 -2.7 -10.9 0 -11 Z',
    displayScale: 1.6,
    length: 22,
    drawingLength: 22,
    sternPort: [-4.28, 11],
    mast: [0, -4.5],
    mainsailSize: 15,
    mainsailMaxAngle: 85,
    mainsailSpinMaxAngle: 85,
    jibTack: null,
    jibSize: 0,
    jibMaxAngle: 0,
    jibSpinMaxAngle: 0,
    spinnakerSize: 0,
    gennakerTack: null,
    gennakerSize: 0,
    poleLength: 0,
    numberPos: [0, 6],
    numberSize: 5.5,
    kind: 'board',
    sailAreas: { mainsail: 8 },
  },
  lacustre: {
    hullPath:
      'M 0 -47.5 C 4 -46 9.05 -26 9.05 -2 C 9.05 21 6.5 40 4.5 47.5 L -4.5 47.5 C -6.5 40 -9.05 21 -9.05 -2 C -9.05 -26 -4 -46 0 -47.5 Z',
    displayScale: 0.94,
    length: 95,
    drawingLength: 95,
    sternPort: [-4.5, 47.5],
    mast: [0, -7],
    mainsailSize: 36,
    mainsailMaxAngle: 90,
    mainsailSpinMaxAngle: 65,
    jibTack: [0, -47.5],
    jibSize: 28,
    genoaSize: 52,
    jibMaxAngle: 45,
    jibSpinMaxAngle: 35,
    spinnakerSize: 60,
    gennakerTack: null,
    gennakerSize: 0,
    poleLength: 0,
    numberPos: [0, 34],
    numberSize: 11,
    kind: 'monohull',
    closeHauledMainsailAngle: 6,
    closeHauledHeadsailAngle: 9,
    sailAreas: { upwindTotal: 40, genoa: 22, spinnaker: 65 },
  },
} satisfies Record<string, BoatShapeProfile>

export const BOAT_SHAPES: Record<BoatClass, BoatShapeProfile> = {
  Optimist: profiles.optimist,
  ILCA: profiles.laser,
  'Generic keelboat': profiles.keelboat,
  Lacustre: profiles.lacustre,
  Tornado: profiles.tornado,
  '420': profiles.int420,
  '470': profiles.int470,
  '29er': profiles.int29er,
  '49er': profiles.int49er,
  Windsurf: profiles.board,
  Coachboat: profiles.vsr,
  'Committee boat': profiles.committee,
  'Umpire boat': profiles.vsr,
}

export interface ZoneBoatLengthBasis {
  boatClass: BoatClass
  /** One displayed hull length in canvas units. */
  length: number
  /** Published full-size hull length in canvas units (10 units = 1 metre). */
  hullLength: number
  usesDefault: boolean
}

const boatLengthBasis = (boatClass: BoatClass, usesDefault: boolean): ZoneBoatLengthBasis => {
  const profile = BOAT_SHAPES[boatClass]
  return {
    boatClass,
    length: profile.drawingLength * profile.displayScale,
    hullLength: profile.length,
    usesDefault,
  }
}

/**
 * Racing-rule zones are measured in hull lengths. For mixed fleets we deliberately use the
 * longest class present, falling back to the editor's default ILCA length before a boat is added.
 */
export function longestBoatLengthBasis(objects: ScenarioObject[]): ZoneBoatLengthBasis {
  const boats = objects.filter(
    (object): object is BoatObject =>
      object.type === 'boat' && !isSupportBoatClass(object.boatClass),
  )
  if (!boats.length) {
    return boatLengthBasis('ILCA', true)
  }

  const longest = boats.reduce((current, boat) =>
    BOAT_SHAPES[boat.boatClass].length > BOAT_SHAPES[current.boatClass].length ? boat : current,
  )
  return boatLengthBasis(longest.boatClass, false)
}

export function measurementBoatLengthBasis(
  objects: ScenarioObject[],
  boatClass: BoatClass | null,
): ZoneBoatLengthBasis {
  if (!boatClass || isSupportBoatClass(boatClass)) return longestBoatLengthBasis(objects)
  return boatLengthBasis(boatClass, false)
}

export const relativeWindAngle = (heading: number, windDirection: number) =>
  (((heading - windDirection) % 360) + 360) % 360

export function isCloseHauled(
  heading: number,
  windDirection: number,
  laylineAngle: number,
): boolean {
  const relative = relativeWindAngle(heading, windDirection)
  return relative <= laylineAngle || relative >= 360 - laylineAngle
}

export const tackForHeading = (
  heading: number,
  windDirection: number,
  previousTack: BoatObject['tack'] = 'starboard',
): BoatObject['tack'] => {
  const relative = relativeWindAngle(heading, windDirection)
  if (Math.abs(relative - 180) < 0.0001) return previousTack
  return relative > 180 ? 'port' : 'starboard'
}

export function sailAngleLimits(
  heading: number,
  windDirection: number,
  previousTack?: BoatObject['tack'],
) {
  return tackForHeading(heading, windDirection, previousTack) === 'port'
    ? { min: -100, max: 0 }
    : { min: 0, max: 100 }
}

export function constrainSailAngle(
  angle: number,
  heading: number,
  windDirection: number,
  previousTack?: BoatObject['tack'],
) {
  const { min, max } = sailAngleLimits(heading, windDirection, previousTack)
  return Math.min(max, Math.max(min, angle))
}

export function upwindSailVisibility(boatClass: BoatClass) {
  const profile = BOAT_SHAPES[boatClass]
  const genoaVisible = Boolean(profile.jibTack && profile.genoaSize)
  return {
    mainsailVisible: Boolean(profile.mast && profile.mainsailSize),
    jibVisible: !genoaVisible && Boolean(profile.jibTack && profile.jibSize),
    genoaVisible,
    spinnakerVisible: false,
    gennakerVisible: false,
  }
}

export function automaticSailAngle(
  heading: number,
  windDirection: number,
  laylineAngle: number,
  maxAngle: number,
  previousTack?: BoatObject['tack'],
): number {
  const relative = relativeWindAngle(heading, windDirection)
  if (relative < laylineAngle - 10) return Math.min(laylineAngle - 20, relative)
  if (relative > 360 - (laylineAngle - 10)) return Math.max(-(laylineAngle - 20), relative - 360)
  const safeMax = Math.max(16, maxAngle)
  if (Math.abs(relative - 180) < 0.0001) {
    return tackForHeading(heading, windDirection, previousTack) === 'port' ? -safeMax : safeMax
  }
  const slope = (180 - laylineAngle) / Math.max(1, safeMax - 15)
  const intercept = laylineAngle / slope - 15
  return relative < 180 ? relative / slope - intercept : relative / slope - intercept - 2 * safeMax
}

export function automaticBoatMainsailAngle(
  boatClass: BoatClass,
  heading: number,
  windDirection: number,
  laylineAngle: number,
  maxAngle: number,
  previousTack?: BoatObject['tack'],
): number {
  const profile = BOAT_SHAPES[boatClass]
  const targetAngle = profile.closeHauledMainsailAngle
  const fallback = automaticSailAngle(heading, windDirection, laylineAngle, maxAngle, previousTack)
  return targetAngle == null
    ? fallback
    : smoothCloseHauledAngle(targetAngle, fallback, heading, windDirection, laylineAngle)
}

export function automaticJibAngle(
  heading: number,
  windDirection: number,
  laylineAngle: number,
  maxAngle: number,
  previousTack?: BoatObject['tack'],
): number {
  const relative = relativeWindAngle(heading, windDirection)
  if (relative < laylineAngle - 10) return Math.min(laylineAngle - 20, relative)
  if (relative > 360 - (laylineAngle - 10)) return Math.max(-(laylineAngle - 20), relative - 360)
  const safeMax = Math.max(25, maxAngle)
  if (Math.abs(relative - 180) < 0.0001) {
    return tackForHeading(heading, windDirection, previousTack) === 'port' ? -safeMax : safeMax
  }
  const slope = (180 - laylineAngle) / Math.max(1, safeMax - 20)
  const intercept = laylineAngle / slope - 20
  return relative < 180 ? relative / slope - intercept : relative / slope - intercept - 2 * safeMax
}

export function automaticBoatHeadsailAngle(
  boatClass: BoatClass,
  heading: number,
  windDirection: number,
  laylineAngle: number,
  maxAngle: number,
  previousTack?: BoatObject['tack'],
): number {
  const profile = BOAT_SHAPES[boatClass]
  const targetAngle = profile.closeHauledHeadsailAngle
  const fallback = automaticJibAngle(heading, windDirection, laylineAngle, maxAngle, previousTack)
  return targetAngle == null
    ? fallback
    : smoothCloseHauledAngle(targetAngle, fallback, heading, windDirection, laylineAngle)
}

function smoothCloseHauledAngle(
  targetAngle: number,
  fallbackAngle: number,
  heading: number,
  windDirection: number,
  laylineAngle: number,
): number {
  const relative = relativeWindAngle(heading, windDirection)
  const signedRelative = relative <= 180 ? relative : relative - 360
  const absoluteRelative = Math.abs(signedRelative)
  const safeLaylineAngle = Math.max(1, laylineAngle)
  const direction = Math.sign(signedRelative)

  if (absoluteRelative <= safeLaylineAngle) {
    return direction * targetAngle * (absoluteRelative / safeLaylineAngle)
  }

  const transitionWidth = 20
  if (absoluteRelative >= safeLaylineAngle + transitionWidth) return fallbackAngle
  const linearProgress = (absoluteRelative - safeLaylineAngle) / transitionWidth
  const smoothProgress = linearProgress * linearProgress * (3 - 2 * linearProgress)
  const blendedMagnitude = targetAngle + (Math.abs(fallbackAngle) - targetAngle) * smoothProgress
  return direction * blendedMagnitude
}

export function automaticGennakerAngle(
  heading: number,
  windDirection: number,
  previousTack?: BoatObject['tack'],
): number {
  const relative = relativeWindAngle(heading, windDirection)
  if (relative < 80) return (relative / 80) * 20
  if (relative > 280) return -((360 - relative) / 80) * 20
  const slope = 10
  const intercept = -12
  if (Math.abs(relative - 180) < 0.0001) {
    return tackForHeading(heading, windDirection, previousTack) === 'port' ? -30 : 30
  }
  return relative < 180 ? relative / slope - intercept : relative / slope - intercept - 60
}

export function automaticSpinnakerAngle(
  heading: number,
  windDirection: number,
  previousTack?: BoatObject['tack'],
): number {
  const relative = relativeWindAngle(heading, windDirection)
  const signedRelative = relative <= 180 ? relative : relative - 360
  const direction =
    Math.abs(relative - 180) < 0.0001
      ? tackForHeading(heading, windDirection, previousTack) === 'port'
        ? -1
        : 1
      : signedRelative < 0
        ? -1
        : 1
  const absoluteRelative = Math.abs(signedRelative)

  // A spinnaker luffs on the centreline while the boat points into the wind. Once the wind
  // reaches the beam it fills progressively and opens to at most 100 degrees. Using the signed
  // wind angle here is important: the sail must mirror to the other side after the boat or wind
  // crosses 180 degrees.
  if (absoluteRelative < 80) return signedRelative
  return direction * Math.min(100, absoluteRelative - 20)
}

export const sailIncidenceAngle = (heading: number, windDirection: number, sailAngle: number) =>
  (((relativeWindAngle(heading, windDirection) - sailAngle) % 360) + 360) % 360

export function isSailStalled(heading: number, windDirection: number, sailAngle: number) {
  const relative = relativeWindAngle(heading, windDirection)
  if (relative >= 150 && relative <= 210) return false
  const incidence = sailIncidenceAngle(heading, windDirection, sailAngle)
  return incidence < 10 || incidence > 350 || (incidence > 170 && incidence < 190)
}

export function isGennakerStalled(heading: number, windDirection: number, sailAngle: number) {
  const relative = relativeWindAngle(heading, windDirection)
  if (relative >= 150 && relative <= 210) return false
  const incidence = sailIncidenceAngle(heading, windDirection, sailAngle)
  return incidence < 55 || incidence > 305 || (incidence > 170 && incidence < 190)
}

export const sailSide = (heading: number, windDirection: number, sailAngle: number): -1 | 1 =>
  sailIncidenceAngle(heading, windDirection, sailAngle) < 180 ? 1 : -1

export function curvedSailPath(size: number, side: -1 | 1, stalled: boolean): string {
  if (stalled) {
    return `M 0 0 C ${0.1 * size} ${0.2 * size} ${0.1 * size} ${0.2 * size} 0 ${0.3 * size} C ${-0.1 * size} ${0.4 * size} ${-0.1 * size} ${0.4 * size} 0 ${0.5 * size} C ${0.1 * size} ${0.6 * size} ${0.1 * size} ${0.6 * size} 0 ${0.7 * size} C ${-0.1 * size} ${0.8 * size} ${-0.1 * size} ${0.8 * size} 0 ${size} Z`
  }
  return `M 0 0 C ${side * 0.1 * size} ${0.4 * size} ${side * 0.1 * size} ${0.6 * size} 0 ${size} Z`
}

export function genoaPath(size: number, side: -1 | 1, stalled: boolean): string {
  if (stalled) return curvedSailPath(size, side, true)
  const forwardDraft = Number((side * 0.07 * size).toFixed(3))
  const aftDraft = Number((side * 0.08 * size).toFixed(3))
  const forwardPosition = Number((0.35 * size).toFixed(3))
  const aftPosition = Number((0.65 * size).toFixed(3))
  return `M 0 0 C ${forwardDraft} ${forwardPosition} ${aftDraft} ${aftPosition} 0 ${size} Z`
}

export function gennakerPath(size: number, side: -1 | 1, stalled: boolean): string {
  if (stalled) return curvedSailPath(size, side, true)
  return `M 0 0 C ${side * 0.35 * size} ${0.3 * size} ${side * 0.28 * size} ${0.6 * size} 0 ${size} C ${side * 0.2 * size} ${0.6 * size} ${side * 0.25 * size} ${0.3 * size} 0 0 Z`
}

const pathNumber = (value: number) => Number(value.toFixed(3))

export function luffingSpinnakerPath(
  size: number,
  poleAngle: number,
  downwindAngle: number,
  trailLength = size,
): string {
  const radians = (angle: number) => (angle * Math.PI) / 180
  const vector = (length: number, angle: number) => ({
    x: pathNumber(Math.sin(radians(angle)) * length),
    y: pathNumber(-Math.cos(radians(angle)) * length),
  })
  const pole = vector(size, poleAngle)
  const downwind = vector(1, downwindAngle)
  const normal = { x: -downwind.y, y: downwind.x }
  const point = (along: number, across = 0) =>
    `${pathNumber(pole.x + downwind.x * trailLength * along + normal.x * trailLength * 0.1 * across)} ${pathNumber(pole.y + downwind.y * trailLength * along + normal.y * trailLength * 0.1 * across)}`

  return (
    `M ${point(0)} ` +
    `C ${point(0.2, 1)} ${point(0.2, 1)} ${point(0.3)} ` +
    `C ${point(0.4, -1)} ${point(0.4, -1)} ${point(0.5)} ` +
    `C ${point(0.6, 1)} ${point(0.6, 1)} ${point(0.7)} ` +
    `C ${point(0.8, -1)} ${point(0.8, -1)} ${point(1)} Z`
  )
}

export function spinnakerPath(size: number, side: -1 | 1, stalled: boolean): string {
  if (stalled) return luffingSpinnakerPath(size, side * 90, 180)
  return `M 0 0 C ${side * 0.4 * size} ${0.2 * size} ${side * 0.6 * size} ${0.2 * size} ${side * size} 0 A ${size} ${size} 0 0 ${side === 1 ? 1 : 0} ${side * -0.5 * size} ${0.866 * size} C ${side * -0.12 * size} ${0.62 * size} ${side * -0.03 * size} ${0.44 * size} 0 0 Z`
}

export function headingForNextPosition(previous: BoatObject, x: number, y: number): number {
  const profile = BOAT_SHAPES[previous.boatClass]
  const length = 50 / profile.displayScale
  const radians = (previous.heading * Math.PI) / 180
  const bowX = previous.x + length * Math.sin(radians)
  const bowY = previous.y - length * Math.cos(radians)
  return ((((Math.atan2(x - bowX, -(y - bowY)) * 180) / Math.PI) % 360) + 360) % 360
}

export function boatSequencePath(boats: BoatObject[]): string {
  const ordered = [...boats].sort(
    (first, second) => (first.positionNumber ?? 1) - (second.positionNumber ?? 1),
  )
  if (ordered.length < 2) return ''
  let path = `M ${ordered[0].x} ${ordered[0].y}`
  for (let index = 1; index < ordered.length; index += 1) {
    const previous = ordered[index - 1]
    const current = ordered[index]
    const segment = boatSequenceSegment(previous, current)
    path += ` C ${segment.firstControl.x} ${segment.firstControl.y} ${segment.secondControl.x} ${segment.secondControl.y} ${segment.end.x} ${segment.end.y}`
  }
  return path
}
