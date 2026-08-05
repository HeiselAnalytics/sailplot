export const BOAT_CLASSES = [
  'Optimist',
  'ILCA / Laser',
  'Generic keelboat',
  'Lacustre',
  'Tornado',
  '420',
  '470',
  '29er',
  '49er',
  'Firefly',
  'Topper',
  'Generic dinghy',
  'Generic catamaran',
  'Generic skiff',
  'Windsurfer',
  'Wingfoil board',
  'VSR Coachboat',
  'Coach boat',
  'Jury boat',
  'Committee boat',
] as const

export type BoatClass = (typeof BOAT_CLASSES)[number]
export type Tack = 'port' | 'starboard'

export interface BaseObject {
  id: string
  type: 'boat' | 'mark' | 'line' | 'arrow' | 'text' | 'rectangle' | 'circle' | 'freehand'
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
  stateMarker?: 'none' | 'tack' | 'gybe' | 'head-to-wind' | 'reverse' | 'drift'
}

export interface MarkObject extends BaseObject {
  type: 'mark'
  markType: 'racing' | 'starting' | 'finish'
  shape: 'round' | 'cylindrical' | 'inflatable' | 'flag' | 'gate' | 'pin'
  color: string
  label: string
  markNumber: number
  downwind: boolean
  zoneVisible: boolean
  zoneRadius: number
  zoneRadiusUnit: 'boat-lengths'
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

export type ScenarioObject = BoatObject | MarkObject | LineObject | TextObject | ShapeObject

export interface Scenario {
  format: 'sailing-scenario'
  version: 1
  metadata: {
    id: string
    title: string
    description: string
    ruleReferences: string[]
    createdAt: string
    updatedAt: string
  }
  canvas: {
    width: number
    height: number
    background: string
    boatNumbersVisible: boolean
    grid: { visible: boolean; size: number; snap: boolean; opacity: number }
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
  }
  objects: ScenarioObject[]
  [key: string]: unknown
}

export type EditorTool =
  | 'select'
  | 'pan'
  | 'boat'
  | 'mark'
  | 'line'
  | 'arrow'
  | 'freehand'
  | 'text'
  | 'rectangle'
  | 'circle'

export type LayoutPreference = 'auto' | 'compact' | 'desktop'
