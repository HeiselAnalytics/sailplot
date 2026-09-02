export const BOAT_CLASSES = [
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
  'Committee boat',
  'Umpire boat',
] as const

export type BoatClass = (typeof BOAT_CLASSES)[number]
export const SUPPORT_BOAT_CLASSES = [
  'Coachboat',
  'Committee boat',
  'Umpire boat',
] as const satisfies readonly BoatClass[]
export const isSupportBoatClass = (value: unknown) =>
  SUPPORT_BOAT_CLASSES.some((boatClass) => boatClass === value)
export const SAILING_BOAT_CLASSES: readonly BoatClass[] = BOAT_CLASSES.filter(
  (boatClass) => !isSupportBoatClass(boatClass),
)
export type Tack = 'port' | 'starboard'
export const UMPIRE_SIGNAL_FLAGS = [
  'none',
  'protest',
  'red',
  'green-white',
  'yellow',
  'blue',
  'black',
] as const
export type UmpireSignalFlag = (typeof UMPIRE_SIGNAL_FLAGS)[number]

export interface BaseObject {
  id: string
  type:
    | 'boat'
    | 'mark'
    | 'gate'
    | 'start-line'
    | 'finish-line'
    | 'line'
    | 'arrow'
    | 'text'
    | 'rectangle'
    | 'circle'
    | 'freehand'
  x: number
  y: number
  rotation: number
  scaleX: number
  scaleY: number
  visible: boolean
  locked: boolean
  zIndex: number
  opacity: number
}

export interface BoatObject extends BaseObject {
  type: 'boat'
  boatClass: BoatClass
  name: string
  sailNumber: string
  label: string
  color: string
  heading: number
  tack: Tack
  mainsailVisible: boolean
  jibVisible: boolean
  genoaVisible: boolean
  spinnakerVisible: boolean
  gennakerVisible: boolean
  mainsailTrim: number
  jibTrim: number
  spinnakerTrim: number
  gennakerTrim: number
  sailMode: 'automatic' | 'manual'
  sailAngle: number
  sequenceId: string
  positionNumber: number
  overlapIndicator: 'port' | 'none' | 'starboard'
  protestFlagVisible: boolean
  boatFlagColor: string | null
  umpireSignalFlag: UmpireSignalFlag
  stateMarker?: 'none' | 'tack' | 'gybe' | 'head-to-wind' | 'reverse' | 'drift'
}

export interface MarkObject extends BaseObject {
  type: 'mark'
  markType: 'racing' | 'starting' | 'finish'
  shape: 'round' | 'cylindrical' | 'inflatable' | 'flag' | 'gate' | 'pin'
  color: string
  label: string
  markNumber: string
  downwind: boolean
  laylinesVisible: boolean
  zoneVisible: boolean
  zoneRadius: number
  zoneRadiusUnit: 'boat-lengths'
}

export type CourseEndpointType =
  | 'committee-boat'
  | 'committee-boat-reversed'
  | 'buoy'
  | 'flag'
  | 'coach-boat'
  | 'coach-boat-reversed'

export interface GateObject extends BaseObject {
  type: 'gate'
  endAX: number
  endAY: number
  endBX: number
  endBY: number
  markNumber: number
  color: string
  zoneVisible: boolean
  zoneRadius: number
  zoneRadiusUnit: 'boat-lengths'
}

export interface StartLineObject extends BaseObject {
  type: 'start-line'
  endAX: number
  endAY: number
  endBX: number
  endBY: number
  color: string
  startEndType: CourseEndpointType
  pinEndType: CourseEndpointType
  startEndFlagColor: string
  pinEndFlagColor: string
  laylinesVisible: boolean
  laylineAreaVisible: boolean
  laylineAreaColor: string
}

export interface FinishLineObject extends BaseObject {
  type: 'finish-line'
  endAX: number
  endAY: number
  endBX: number
  endBY: number
  color: string
  startEndType: CourseEndpointType
  pinEndType: CourseEndpointType
  startEndFlagColor: string
  pinEndFlagColor: string
  laylinesVisible: boolean
  laylineAreaVisible: boolean
  laylineAreaColor: string
}

export interface LineObject extends BaseObject {
  type: 'line' | 'arrow' | 'freehand'
  points: number[]
  stroke: string
  strokeWidth: number
  dash: number[]
}

export interface TextObject extends BaseObject {
  type: 'text'
  text: string
  color: string
  fontSize: number
  fontWeight: 'normal' | 'bold'
  align: 'left' | 'center' | 'right'
  background: string
}

export interface ShapeObject extends BaseObject {
  type: 'rectangle' | 'circle'
  width: number
  height: number
  stroke: string
  strokeWidth: number
  fill: string
}

export type ScenarioObject =
  | BoatObject
  | MarkObject
  | GateObject
  | StartLineObject
  | FinishLineObject
  | LineObject
  | TextObject
  | ShapeObject

export interface Scenario {
  format: 'sailplot'
  version: 1
  metadata: {
    id: string
    title: string
    description: string
    ruleReferences: string[]
    additionalInformation: Array<{
      id: string
      name: string
      value: string
    }>
    createdAt: string
    updatedAt: string
  }
  canvas: {
    width: number
    height: number
    infinite: boolean
    background: string
    boatNumbersVisible: boolean
    boatLegendVisible: boolean
    windIndicatorPosition: { x: number; y: number } | null
    boatLegendPosition: { x: number; y: number } | null
    grid: { visible: boolean; size: number; opacity: number }
    view: { x: number; y: number; scale: number }
  }
  environment: {
    windDirection: number
    windStrength: string | null
    windVisible: boolean
    laylineAngle: number
    laylinesVisible: boolean
    zonesVisible: boolean
    zoneRadiusBoatLengths: number
    measurementBoatClass: BoatClass | null
  }
  objects: ScenarioObject[]
  [key: string]: unknown
}

export type EditorTool =
  | 'select'
  | 'pan'
  | 'boat'
  | 'mark'
  | 'downwind-mark'
  | 'gate'
  | 'start-line'
  | 'finish-line'
  | 'line'
  | 'arrow'
  | 'freehand'
  | 'text'
  | 'rectangle'
  | 'circle'

export type LayoutPreference = 'auto' | 'compact' | 'desktop'
