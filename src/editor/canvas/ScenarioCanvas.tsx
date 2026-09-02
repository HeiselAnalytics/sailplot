import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import {
  Arrow,
  Circle,
  Group,
  Layer,
  Line,
  Path,
  Rect,
  Shape,
  Stage,
  Text,
  Transformer,
} from 'react-konva'
import Konva from 'konva'
import type { KonvaEventObject } from 'konva/lib/Node'
import {
  createFinishLine,
  createGate,
  createId,
  createStartLine,
  isDarkPlotBackground,
  nextMarkSequenceNumber,
} from '../../lib/scenario'
import { useI18n } from '../../i18n'
import { useEditorStore } from '../../stores/editorStore'
import type {
  BoatObject,
  CourseEndpointType,
  EditorTool,
  LineObject,
  MarkObject,
  ScenarioObject,
} from '../../types/scenario'
import {
  automaticGennakerAngle,
  automaticBoatHeadsailAngle,
  automaticBoatMainsailAngle,
  automaticSpinnakerAngle,
  boatSequencePath,
  BOAT_SHAPES,
  constrainSailAngle,
  curvedSailPath,
  genoaPath,
  gennakerPath,
  isGennakerStalled,
  isSailStalled,
  measurementBoatLengthBasis,
  luffingSpinnakerPath,
  relativeWindAngle,
  sailSide,
  spinnakerPath,
  tackForHeading,
} from '../objects/boatShapes'
import { JURY_BOAT_GREY, UMPIRE_BOAT_GREY } from '../../lib/boatColors'
import {
  courseLineLaylineGeometry,
  laylineVector,
  markLaylineRotation,
  sailingGridSegments,
  sailingGridSegmentsForBounds,
} from './gridGeometry'
import {
  BOAT_LEGEND_COLUMN_WIDTH,
  BOAT_LEGEND_ROW_HEIGHT,
  boatLegendLayoutForCount,
  endlessExportBounds,
} from './exportBounds'
import {
  BOAT_ROTATE_ANCHOR_OFFSET,
  DEFAULT_ROTATE_ANCHOR_OFFSET,
  pinTransformBoundsToNamedNode,
} from './rotationBounds'
import {
  courseEndpointAccentColor,
  courseEndpointBoatAppearance,
  courseEndpointShowsSignalFlag,
} from '../objects/courseEndpoints'
import {
  boatTailsAtPlaybackPosition,
  objectsAtPlaybackPosition,
} from '../../features/playback/playback'

export interface CanvasHandle {
  fitToScreen: () => void
  resetView: () => void
  exportPng: (transparent?: boolean, pixelRatio?: number) => string
}

type View = { x: number; y: number; scale: number }
type Point = { x: number; y: number }
type DrawingDraft = { tool: EditorTool; start: Point; points: number[] }

const touchHitStrokeWidth = (interactionScale: number) => 44 / Math.max(interactionScale, 0.01)
const shapeHitStrokeWidth = (interactionScale: number, strokeWidth: number) =>
  Math.max(strokeWidth, 24 / Math.max(interactionScale, 0.01))
const shapeHasVisibleFill = (fill: string) => fill.trim().toLowerCase() !== 'transparent'

const DRAWING_TOOLS: EditorTool[] = [
  'gate',
  'start-line',
  'finish-line',
  'line',
  'arrow',
  'freehand',
  'rectangle',
  'circle',
]
const TWO_CLICK_DRAWING_TOOLS = new Set<EditorTool>(['line', 'arrow', 'rectangle', 'circle'])
const DEFAULT_DRAWING_STROKE_WIDTH = 3
const MIN_DRAWING_DRAG_DISTANCE_PX = 12
const DEFAULT_TRANSFORM_ANCHORS = [
  'top-left',
  'top-center',
  'top-right',
  'middle-left',
  'middle-right',
  'bottom-left',
  'bottom-center',
  'bottom-right',
]

const RECTANGLE_CORNER_ANCHORS = ['top-left', 'top-right', 'bottom-left', 'bottom-right']
const NON_SCALABLE_TYPES = new Set<ScenarioObject['type']>([
  'boat',
  'mark',
  'gate',
  'start-line',
  'finish-line',
  'text',
  'circle',
])

const darkenHexColor = (color: string, factor = 0.76) => {
  const match = /^#([0-9a-f]{6})$/i.exec(color)
  if (!match) return color
  const value = Number.parseInt(match[1], 16)
  const channels = [(value >> 16) & 0xff, (value >> 8) & 0xff, value & 0xff]
  return `#${channels
    .map((channel) =>
      Math.round(channel * factor)
        .toString(16)
        .padStart(2, '0'),
    )
    .join('')}`
}

const LIGHT_PLOT_INK = '#171717'
const DARK_PLOT_INK = '#F5F5F5'
const DARK_PLOT_OUTLINE = '#A3A3A3'

const visiblePlotColor = (color: string, inkColor: string) =>
  inkColor === DARK_PLOT_INK && color.toUpperCase() === LIGHT_PLOT_INK.toUpperCase()
    ? inkColor
    : color

function Grid({
  id,
  x = 0,
  y = 0,
  width,
  height,
  size,
  opacity,
  color,
  laylineAngle,
  windDirection,
  infinite = false,
}: {
  id?: string
  x?: number
  y?: number
  width: number
  height: number
  size: number
  opacity: number
  color: string
  laylineAngle: number
  windDirection: number
  infinite?: boolean
}) {
  const segments = useMemo(
    () =>
      infinite
        ? sailingGridSegmentsForBounds(x, y, width, height, size, laylineAngle, windDirection)
        : sailingGridSegments(width, height, size, laylineAngle, windDirection),
    [height, infinite, laylineAngle, size, width, windDirection, x, y],
  )
  return (
    <Group
      id={id}
      clipX={x}
      clipY={y}
      clipWidth={width}
      clipHeight={height}
      opacity={opacity}
      listening={false}
    >
      <Shape
        sceneFunc={(context, shape) => {
          context.beginPath()
          for (const [x1, y1, x2, y2] of segments) {
            context.moveTo(x1, y1)
            context.lineTo(x2, y2)
          }
          context.fillStrokeShape(shape)
        }}
        stroke={color}
        strokeWidth={1.2}
        dash={[4, 7]}
        perfectDrawEnabled={false}
        listening={false}
      />
    </Group>
  )
}

interface BoatLegendEntry {
  sequenceId: string
  boatClass: BoatObject['boatClass']
  color: string
  name: string
  sailNumber: string
}

function BoatLegend({
  entries,
  canvasHeight,
  dark,
  position,
  draggable = false,
  onPositionChange,
}: {
  entries: BoatLegendEntry[]
  canvasHeight: number
  dark: boolean
  position?: Point | null
  draggable?: boolean
  onPositionChange?: (position: Point) => void
}) {
  const { t } = useI18n()
  if (!entries.length) return null
  const {
    width,
    height,
    x: defaultX,
    y: defaultY,
  } = boatLegendLayoutForCount(entries.length, canvasHeight)
  const maximumRows = Math.max(1, Math.floor((canvasHeight - 112) / BOAT_LEGEND_ROW_HEIGHT))
  const x = position?.x ?? defaultX
  const y = position?.y ?? defaultY
  const ink = dark ? DARK_PLOT_INK : LIGHT_PLOT_INK
  const mutedInk = dark ? '#C8D0D4' : '#5F6B70'

  return (
    <Group
      x={x}
      y={y}
      draggable={draggable}
      listening={draggable}
      onMouseDown={(event) => {
        if (draggable) event.cancelBubble = true
      }}
      onTouchStart={(event) => {
        if (draggable) event.cancelBubble = true
      }}
      onDragEnd={(event) => onPositionChange?.({ x: event.target.x(), y: event.target.y() })}
    >
      <Rect
        width={width}
        height={height}
        fill={dark ? 'rgba(23,23,23,0.74)' : 'rgba(255,255,255,0.68)'}
        stroke={ink}
        strokeWidth={2}
        cornerRadius={10}
        shadowColor="rgba(23,23,23,0.18)"
        shadowBlur={12}
        shadowOffsetY={4}
      />
      <Text
        x={16}
        y={15}
        text={t('BOAT LEGEND')}
        fill={ink}
        fontSize={17}
        fontStyle="bold"
        letterSpacing={1.2}
      />
      <Line
        points={[16, 45, width - 16, 45]}
        stroke={dark ? '#59646A' : '#D7DEE1'}
        strokeWidth={1}
      />
      {entries.map((entry, index) => {
        const column = Math.floor(index / maximumRows)
        const row = index % maximumRows
        const primary = [entry.sailNumber, entry.name].filter(Boolean).join(' · ')
        const secondary = primary ? t(entry.boatClass) : ''
        return (
          <Group
            key={entry.sequenceId}
            x={16 + column * BOAT_LEGEND_COLUMN_WIDTH}
            y={56 + row * BOAT_LEGEND_ROW_HEIGHT}
          >
            <Rect
              x={0}
              y={3}
              width={26}
              height={26}
              fill={entry.color}
              stroke={ink}
              strokeWidth={1.5}
              cornerRadius={4}
            />
            <Text
              x={38}
              y={secondary ? 0 : 5}
              width={BOAT_LEGEND_COLUMN_WIDTH - 50}
              height={secondary ? undefined : 26}
              verticalAlign={secondary ? 'top' : 'middle'}
              text={primary || t(entry.boatClass)}
              fill={ink}
              fontSize={17}
              fontStyle="bold"
              ellipsis
              wrap="none"
            />
            {secondary && (
              <Text
                x={38}
                y={23}
                width={BOAT_LEGEND_COLUMN_WIDTH - 50}
                text={secondary}
                fill={mutedInk}
                fontSize={13}
                ellipsis
                wrap="none"
              />
            )}
          </Group>
        )
      })}
    </Group>
  )
}

function CoachboatHull({
  hullColor,
  hullStroke = '#0D639F',
}: {
  hullColor: string
  hullStroke?: string
}) {
  return (
    <>
      <Path
        data="M -3 -40 L 0 -40 C -1.4 -38.5 -2.8 -34 -4 -30 C -5.5 -24 -6 -17 -6 -8 L -6 37 Q -6 39.5 -8 39.5 L -9.5 39.5 Q -13 39.5 -13 36 L -13 -10 C -13 -18 -12 -24 -9.5 -29 C -7 -34 -4.5 -38.5 -3 -40 Z"
        fill={hullColor}
        stroke={hullStroke}
        strokeWidth={1}
      />
      <Path
        data="M 3 -40 L 0 -40 C 1.4 -38.5 2.8 -34 4 -30 C 5.5 -24 6 -17 6 -8 L 6 37 Q 6 39.5 8 39.5 L 9.5 39.5 Q 13 39.5 13 36 L 13 -10 C 13 -18 12 -24 9.5 -29 C 7 -34 4.5 -38.5 3 -40 Z"
        fill={hullColor}
        stroke={hullStroke}
        strokeWidth={1}
      />
      <Path
        data="M -3 -40 L 3 -40 C 3.2 -38 3.5 -35 3.8 -33 L -3.8 -33 C -3.5 -35 -3.2 -38 -3 -40 Z"
        fill={hullColor}
        stroke={hullStroke}
        strokeWidth={1}
      />
      <Path
        data="M -2.7 -34 L 2.7 -34 C 2.7 -30 4.8 -23 5.5 -17 L 5.5 34 L -5.5 34 L -5.5 -17 C -4.8 -23 -2.7 -30 -2.7 -34 Z"
        fill="#737A82"
        stroke="#565D63"
        strokeWidth={1}
      />
      <Rect
        x={-4}
        y={-5}
        width={8}
        height={13}
        cornerRadius={1.5}
        fill="#AEB3B8"
        stroke="#343A40"
        strokeWidth={1}
      />
      <Rect
        x={-4.5}
        y={13}
        width={9}
        height={7}
        cornerRadius={1.5}
        fill="#646B72"
        stroke="#343A40"
        strokeWidth={1}
      />
      <Rect
        x={-3.25}
        y={35}
        width={6.5}
        height={9}
        cornerRadius={2}
        fill="#343A40"
        stroke="#202428"
        strokeWidth={1}
      />
    </>
  )
}

const UMPIRE_FLAG_COLORS = {
  red: '#D72638',
  yellow: '#FFD100',
  blue: '#168DDD',
  black: '#171717',
  green: '#00843D',
  white: '#FFFFFF',
} as const

function UmpireFlagFace({
  signal,
  color,
  outlineColor,
}: {
  signal?: BoatObject['umpireSignalFlag']
  color?: string
  outlineColor: string
}) {
  const width = 30
  const height = 20
  const solidColor =
    color ??
    (signal === 'red' || signal === 'yellow' || signal === 'blue' || signal === 'black'
      ? UMPIRE_FLAG_COLORS[signal]
      : UMPIRE_FLAG_COLORS.white)

  return (
    <Group>
      <Group clipX={0} clipY={0} clipWidth={width} clipHeight={height}>
        <Rect width={width} height={height} fill={solidColor} />
        {signal === 'green-white' && (
          <>
            <Rect width={width / 2} height={height / 2} fill={UMPIRE_FLAG_COLORS.green} />
            <Rect
              x={width / 2}
              y={height / 2}
              width={width / 2}
              height={height / 2}
              fill={UMPIRE_FLAG_COLORS.green}
            />
          </>
        )}
        {signal === 'protest' && (
          <>
            <Rect width={width} height={height} fill={UMPIRE_FLAG_COLORS.yellow} />
            {[-16, -4, 8, 20, 32].map((offset) => (
              <Line
                key={offset}
                points={[offset, 0, offset + height, height]}
                stroke={UMPIRE_FLAG_COLORS.red}
                strokeWidth={6}
              />
            ))}
          </>
        )}
      </Group>
      <Rect width={width} height={height} stroke={outlineColor} strokeWidth={1.5} />
    </Group>
  )
}

function SupportBoatFlags({
  boatFlagColor,
  signal,
  inkColor,
  outlineColor,
}: {
  boatFlagColor: string | null
  signal: BoatObject['umpireSignalFlag']
  inkColor: string
  outlineColor: string
}) {
  const flags = [
    ...(boatFlagColor ? [{ id: 'boat', color: boatFlagColor, side: -1 as const }] : []),
    ...(signal !== 'none' ? [{ id: 'signal', signal, side: 1 as const }] : []),
  ]
  const poleLength = 35

  return (
    <Group name="support-boat-flags">
      {flags.map((flag) => (
        <Group
          key={flag.id}
          x={flag.side * 3.5}
          y={-18}
          rotation={flag.side * 20}
        >
          <Line points={[0, 0, 0, -poleLength]} stroke={inkColor} strokeWidth={2} />
          <Group x={flag.side < 0 ? -30 : 0} y={-poleLength}>
            <UmpireFlagFace
              color={'color' in flag ? flag.color : undefined}
              signal={'signal' in flag ? flag.signal : undefined}
              outlineColor={outlineColor}
            />
          </Group>
        </Group>
      ))}
    </Group>
  )
}

function BoatGraphic({
  object,
  selected,
  onSelect,
  onChange,
  onPreviewChange,
  windDirection,
  laylineAngle,
  boatNumbersVisible,
  inkColor,
  outlineColor,
}: ObjectGraphicProps) {
  if (object.type !== 'boat') return null
  const profile = BOAT_SHAPES[object.boatClass]
  const downwindSailVisible = object.spinnakerVisible || object.gennakerVisible
  const automaticMain = automaticBoatMainsailAngle(
    object.boatClass,
    object.heading,
    windDirection,
    laylineAngle,
    downwindSailVisible ? profile.mainsailSpinMaxAngle : profile.mainsailMaxAngle,
    object.tack,
  )
  const sailAngle = constrainSailAngle(
    object.sailMode === 'automatic' ? automaticMain + object.mainsailTrim : object.sailAngle,
    object.heading,
    windDirection,
    object.tack,
  )
  const automaticJib = automaticBoatHeadsailAngle(
    object.boatClass,
    object.heading,
    windDirection,
    laylineAngle,
    downwindSailVisible ? profile.jibSpinMaxAngle : profile.jibMaxAngle,
    object.tack,
  )
  const jibAngle = constrainSailAngle(
    automaticJib + object.jibTrim,
    object.heading,
    windDirection,
    object.tack,
  )
  const spinnakerAngle = constrainSailAngle(
    automaticSpinnakerAngle(object.heading, windDirection, object.tack) + object.spinnakerTrim,
    object.heading,
    windDirection,
    object.tack,
  )
  const gennAngle = constrainSailAngle(
    automaticGennakerAngle(object.heading, windDirection, object.tack) + object.gennakerTrim,
    object.heading,
    windDirection,
    object.tack,
  )
  const relative = relativeWindAngle(object.heading, windDirection)
  const mainsailStalled = isSailStalled(object.heading, windDirection, sailAngle)
  const jibStalled = isSailStalled(object.heading, windDirection, jibAngle)
  const spinnakerStalled = isSailStalled(object.heading, windDirection, spinnakerAngle)
  const gennakerStalled = isGennakerStalled(object.heading, windDirection, gennAngle)
  const spinnakerSide = sailSide(object.heading, windDirection, spinnakerAngle)
  const tack = tackForHeading(object.heading, windDirection, object.tack)
  const deadDownwind = Math.abs(relative - 180) < 0.0001
  const spinPoleRotation =
    deadDownwind && tack === 'starboard'
      ? 90
      : deadDownwind && tack === 'port'
        ? -90
        : relative > 90 && relative < 180
          ? 90
          : relative >= 180 && relative < 270
            ? -90
            : relative
  const spinPoleAngle = spinnakerAngle - relative + spinPoleRotation
  const downwindAngleInSpinnaker = 180 - relative + spinnakerAngle
  const hullColor = selected ? darkenHexColor(object.color) : object.color
  const sternY = (profile.kind === 'vsr' ? 40 : profile.drawingLength / 2) * profile.displayScale
  const displayedBoatLength = profile.drawingLength * profile.displayScale
  const overlapLineLength = displayedBoatLength
  const overlapDirection = object.overlapIndicator === 'port' ? -1 : 1
  const sailStrokeWidth = 1.6 / profile.displayScale
  const sailDetailStrokeWidth = 1.15 / profile.displayScale
  const primarySailFill = inkColor === DARK_PLOT_INK ? '#FFFFFF' : '#F8FAFC'
  const secondarySailFill = inkColor === DARK_PLOT_INK ? '#E8EEF2' : '#E2E8EC'
  return (
    <Group
      id={`object-${object.id}`}
      x={object.x}
      y={object.y}
      rotation={object.heading}
      opacity={object.opacity}
      draggable={!object.locked}
      onClick={onSelect}
      onTap={onSelect}
      onDragMove={(event) => onPreviewChange({ x: event.target.x(), y: event.target.y() })}
      onDragEnd={(event) => onChange({ x: event.target.x(), y: event.target.y() }, 'Moved boat')}
      onTransform={(event) => {
        const heading = ((event.target.rotation() % 360) + 360) % 360
        onPreviewChange({
          heading,
          rotation: heading,
          tack: tackForHeading(heading, windDirection, object.tack),
        })
      }}
      onTransformEnd={(event) => {
        const node = event.target
        const heading = ((node.rotation() % 360) + 360) % 360
        onChange(
          {
            x: node.x(),
            y: node.y(),
            heading,
            rotation: heading,
            tack: tackForHeading(heading, windDirection, object.tack),
          },
          'Transformed boat',
        )
      }}
    >
      <Rect
        name="selection-bounds-ignore"
        x={-52}
        y={-62}
        width={104}
        height={128}
        fill="transparent"
        listening={false}
      />
      <Group scaleX={profile.displayScale} scaleY={profile.displayScale}>
        <Path
          name="rotation-bounds"
          data={profile.hullPath}
          fill={profile.kind === 'vsr' ? 'transparent' : hullColor}
          stroke={profile.kind === 'vsr' ? 'transparent' : outlineColor}
          strokeWidth={1.5 / profile.displayScale}
          lineJoin="round"
        />
        {profile.kind === 'motor' && (
          <>
            <Rect
              x={-7}
              y={2}
              width={14}
              height={18}
              cornerRadius={2}
              fill="#f5f5f5"
              stroke={outlineColor}
              strokeWidth={1}
            />
            <Line points={[-6, 8, 6, 8]} stroke="#737373" strokeWidth={1} />
          </>
        )}
        {profile.kind === 'vsr' && (
          <CoachboatHull
            hullColor={hullColor}
            hullStroke={
              object.boatClass === 'Jury boat'
                ? darkenHexColor(JURY_BOAT_GREY)
                : object.boatClass === 'Umpire boat'
                  ? darkenHexColor(UMPIRE_BOAT_GREY)
                  : undefined
            }
          />
        )}
        {(object.boatClass === 'Coachboat' || object.boatClass === 'Umpire boat') && (
          <SupportBoatFlags
            boatFlagColor={object.boatFlagColor}
            signal={object.umpireSignalFlag}
            inkColor={inkColor}
            outlineColor={outlineColor}
          />
        )}
        {boatNumbersVisible && (
          <Group
            name="boat-position-number"
            x={profile.numberPos[0]}
            y={profile.numberPos[1]}
            scaleX={1 / profile.displayScale}
            scaleY={1 / profile.displayScale}
          >
            <Circle radius={11} fill="#737373" stroke={inkColor} strokeWidth={1.5} />
            <Text
              text={String(object.positionNumber)}
              x={-11}
              y={-6.5}
              width={22}
              align="center"
              fill="#ffffff"
              fontSize={16}
              fontStyle="bold"
            />
          </Group>
        )}
        {profile.mast && object.mainsailVisible && profile.mainsailSize > 0 && (
          <Group name="boat-sail" x={profile.mast[0]} y={profile.mast[1]} rotation={-sailAngle}>
            <Path
              data={curvedSailPath(
                profile.mainsailSize,
                sailSide(object.heading, windDirection, sailAngle),
                mainsailStalled,
              )}
              fill={primarySailFill}
              stroke={outlineColor}
              strokeWidth={sailStrokeWidth}
              opacity={0.98}
              lineJoin="round"
            />
            <Line
              points={[0, 0, 0, profile.mainsailSize]}
              stroke={outlineColor}
              strokeWidth={sailDetailStrokeWidth}
            />
          </Group>
        )}
        {profile.jibTack && object.jibVisible && profile.jibSize > 0 && (
          <Group
            name="boat-sail"
            x={profile.jibTack[0]}
            y={profile.jibTack[1]}
            rotation={-jibAngle}
          >
            <Path
              data={curvedSailPath(
                profile.jibSize,
                sailSide(object.heading, windDirection, jibAngle),
                jibStalled,
              )}
              fill={secondarySailFill}
              stroke={outlineColor}
              strokeWidth={sailStrokeWidth}
              opacity={0.98}
              lineJoin="round"
            />
          </Group>
        )}
        {profile.jibTack && object.genoaVisible && (profile.genoaSize ?? 0) > 0 && (
          <Group
            name="boat-sail"
            x={profile.jibTack[0]}
            y={profile.jibTack[1]}
            rotation={-jibAngle}
          >
            <Path
              data={genoaPath(
                profile.genoaSize ?? 0,
                sailSide(object.heading, windDirection, jibAngle),
                jibStalled,
              )}
              fill={secondarySailFill}
              stroke={outlineColor}
              strokeWidth={sailStrokeWidth}
              opacity={0.98}
              lineJoin="round"
            />
          </Group>
        )}
        {profile.mast && object.spinnakerVisible && profile.spinnakerSize > 0 && (
          <Group
            name="boat-sail"
            x={profile.mast[0]}
            y={profile.mast[1]}
            rotation={-spinnakerAngle}
          >
            <Path
              data={
                spinnakerStalled
                  ? luffingSpinnakerPath(
                      profile.spinnakerSize,
                      spinPoleAngle,
                      downwindAngleInSpinnaker,
                    )
                  : spinnakerPath(profile.spinnakerSize, spinnakerSide, false)
              }
              rotation={spinnakerStalled ? 0 : spinPoleAngle - spinnakerSide * 90}
              fill={primarySailFill}
              stroke={outlineColor}
              strokeWidth={sailStrokeWidth}
              opacity={0.98}
              lineJoin="round"
            />
            <Line
              points={[0, 0, 0, -profile.spinnakerSize]}
              stroke={outlineColor}
              strokeWidth={sailDetailStrokeWidth}
              rotation={spinPoleAngle}
            />
          </Group>
        )}
        {profile.gennakerTack && object.gennakerVisible && profile.gennakerSize > 0 && (
          <Group name="boat-sail" x={profile.gennakerTack[0]} y={profile.gennakerTack[1]}>
            {profile.poleLength > 0 && (
              <Line
                points={[0, 0, 0, profile.poleLength]}
                stroke={outlineColor}
                strokeWidth={sailDetailStrokeWidth}
              />
            )}
            <Path
              data={gennakerPath(
                profile.gennakerSize,
                sailSide(object.heading, windDirection, gennAngle),
                gennakerStalled,
              )}
              fill={primarySailFill}
              stroke={outlineColor}
              strokeWidth={sailStrokeWidth}
              opacity={0.98}
              lineJoin="round"
              rotation={-gennAngle}
            />
          </Group>
        )}
      </Group>
      {object.overlapIndicator !== 'none' && (
        <Line
          points={[0, sternY, overlapDirection * overlapLineLength, sternY]}
          stroke={inkColor}
          strokeWidth={2}
          dash={[2, 5]}
          lineCap="round"
          opacity={0.78}
          listening={false}
        />
      )}
    </Group>
  )
}

function MarkGraphic({
  object,
  selected,
  onSelect,
  onChange,
  onPreviewChange,
  inkColor,
  outlineColor,
  brandAccentColor,
}: ObjectGraphicProps) {
  if (object.type !== 'mark') return null
  const isFlag = object.shape === 'flag'
  const isPin = object.shape === 'pin'
  const markLabel = String(object.markNumber)
  const labelBounds = isFlag
    ? { x: 1, y: -49, width: 32, height: 20 }
    : isPin
      ? { x: -1, y: -28, width: 22, height: 20 }
      : object.shape === 'round'
        ? { x: -18, y: -18, width: 36, height: 36 }
        : { x: -15, y: -24, width: 30, height: 48 }
  const labelFontSize = Math.min(
    isFlag ? 17 : isPin ? 16 : 18,
    markLabel.length <= 2 ? 18 : markLabel.length <= 4 ? 13 : 10,
  )
  const markColor = selected ? darkenHexColor(object.color) : object.color
  const normalizedColor = markColor.replace('#', '')
  const colorValue = /^[0-9a-f]{6}$/i.test(normalizedColor)
    ? Number.parseInt(normalizedColor, 16)
    : Number.parseInt(brandAccentColor.slice(1), 16)
  const red = (colorValue >> 16) & 0xff
  const green = (colorValue >> 8) & 0xff
  const blue = colorValue & 0xff
  const labelColor = red * 0.299 + green * 0.587 + blue * 0.114 > 150 ? '#171717' : '#ffffff'

  return (
    <Group
      id={`object-${object.id}`}
      x={object.x}
      y={object.y}
      opacity={object.opacity}
      draggable={!object.locked}
      onClick={onSelect}
      onTap={onSelect}
      onDragMove={(event) => onPreviewChange({ x: event.target.x(), y: event.target.y() })}
      onDragEnd={(event) => onChange({ x: event.target.x(), y: event.target.y() }, 'Moved mark')}
    >
      {object.shape === 'round' ? (
        <Circle
          radius={18}
          fill={markColor}
          stroke={outlineColor}
          strokeWidth={2}
          hitStrokeWidth={28}
        />
      ) : object.shape === 'flag' ? (
        <>
          <Line points={[0, 0, 0, -50]} stroke={inkColor} strokeWidth={3} />
          <Rect
            x={0}
            y={-50}
            width={34}
            height={22}
            cornerRadius={1}
            fill={markColor}
            stroke={outlineColor}
            strokeWidth={2}
          />
        </>
      ) : object.shape === 'pin' ? (
        <>
          <Line points={[0, 20, 0, -28]} stroke={inkColor} strokeWidth={3} />
          <Line
            points={[0, -28, 28, -18, 0, -8]}
            closed
            fill={markColor}
            stroke={outlineColor}
            strokeWidth={2}
          />
        </>
      ) : (
        <Rect
          x={-15}
          y={-24}
          width={30}
          height={48}
          cornerRadius={object.shape === 'inflatable' ? 10 : 3}
          fill={markColor}
          stroke={outlineColor}
          strokeWidth={2}
        />
      )}
      <Text
        text={markLabel}
        x={labelBounds.x}
        y={labelBounds.y}
        width={labelBounds.width}
        height={labelBounds.height}
        align="center"
        verticalAlign="middle"
        lineHeight={1}
        fill={labelColor}
        fontSize={labelFontSize}
        fontStyle="bold"
        listening={false}
      />
    </Group>
  )
}

function CourseEndpointGraphic({
  type,
  windDirection,
  selected,
  accentColor,
  showSignalFlag,
  inkColor,
  outlineColor,
}: {
  type: CourseEndpointType
  windDirection: number
  selected: boolean
  accentColor: string
  showSignalFlag: boolean
  inkColor: string
  outlineColor: string
}) {
  const markColor = selected ? darkenHexColor(accentColor) : accentColor
  if (type === 'buoy') {
    return (
      <Rect
        x={-15}
        y={-24}
        width={30}
        height={48}
        cornerRadius={3}
        fill={markColor}
        stroke={outlineColor}
        strokeWidth={2}
      />
    )
  }
  if (type === 'flag') {
    return (
      <Group>
        <Line points={[0, 0, 0, -50]} stroke={inkColor} strokeWidth={3} />
        <Rect
          x={0}
          y={-50}
          width={34}
          height={22}
          cornerRadius={1}
          fill={markColor}
          stroke={outlineColor}
          strokeWidth={2}
        />
      </Group>
    )
  }
  const appearance = courseEndpointBoatAppearance(type)
  if (!appearance) return null
  const profile = BOAT_SHAPES[appearance.boatClass]
  const boatRotation = windDirection + (appearance.reversed ? 180 : 0)
  return (
    <Group rotation={boatRotation} scaleX={profile.displayScale} scaleY={profile.displayScale}>
      <Path
        data={profile.hullPath}
        fill={
          profile.kind === 'vsr'
            ? 'transparent'
            : selected
              ? darkenHexColor(appearance.color)
              : appearance.color
        }
        stroke={profile.kind === 'vsr' ? 'transparent' : outlineColor}
        strokeWidth={1.5 / profile.displayScale}
        lineJoin="round"
      />
      {profile.kind === 'vsr' && (
        <CoachboatHull hullColor={selected ? darkenHexColor(appearance.color) : appearance.color} />
      )}
      {showSignalFlag && (
        <Group rotation={-boatRotation}>
          <Line points={[0, 0, 0, -34]} stroke={inkColor} strokeWidth={2.5} />
          <Rect
            x={0}
            y={-34}
            width={22}
            height={14}
            cornerRadius={1}
            fill={markColor}
            stroke={outlineColor}
            strokeWidth={1.5}
          />
        </Group>
      )}
    </Group>
  )
}

function CourseGraphic({
  object,
  selected,
  onSelect,
  onChange,
  onPreviewChange,
  windDirection,
  laylineAngle,
  inkColor,
  outlineColor,
  interactionScale,
  configuredMarkColor,
}: ObjectGraphicProps) {
  const [activeEndpoint, setActiveEndpoint] = useState<'a' | 'b' | null>(null)
  if (object.type !== 'gate' && object.type !== 'start-line' && object.type !== 'finish-line')
    return null
  const baseLineColor = object.type === 'gate' ? '#A3A3A3' : object.color
  const lineColor = selected ? darkenHexColor(baseLineColor) : baseLineColor
  const courseLaylines =
    object.type === 'gate'
      ? null
      : courseLineLaylineGeometry(
          { x: object.endAX, y: object.endAY },
          { x: object.endBX, y: object.endBY },
          laylineAngle,
          windDirection,
          500,
        )
  const moveEndpoint = (
    endpoint: 'a' | 'b',
    event: KonvaEventObject<DragEvent>,
    commit: boolean,
  ) => {
    event.cancelBubble = true
    const patch =
      endpoint === 'a'
        ? { endAX: event.target.x(), endAY: event.target.y() }
        : { endBX: event.target.x(), endBY: event.target.y() }
    if (commit) onChange(patch, `Moved ${object.type} endpoint`)
    else onPreviewChange(patch)
  }
  const endpointEvents = (endpoint: 'a' | 'b') => ({
    onMouseDown: (event: KonvaEventObject<MouseEvent>) => {
      setActiveEndpoint(endpoint)
      onSelect(event)
    },
    onTouchStart: (event: KonvaEventObject<TouchEvent>) => {
      setActiveEndpoint(endpoint)
      onSelect(event)
    },
    onDragMove: (event: KonvaEventObject<DragEvent>) => moveEndpoint(endpoint, event, false),
    onDragEnd: (event: KonvaEventObject<DragEvent>) => moveEndpoint(endpoint, event, true),
  })
  return (
    <Group
      id={`object-${object.id}`}
      x={object.x}
      y={object.y}
      opacity={object.opacity}
      draggable={!object.locked}
      onClick={onSelect}
      onTap={onSelect}
      onDragMove={(event) => {
        if (event.target !== event.currentTarget) return
        onPreviewChange({ x: event.target.x(), y: event.target.y() })
      }}
      onDragEnd={(event) => {
        if (event.target !== event.currentTarget) return
        onChange({ x: event.target.x(), y: event.target.y() }, `Moved ${object.type}`)
      }}
    >
      {object.type !== 'gate' && object.laylineAreaVisible && courseLaylines && (
        <Line
          points={courseLaylines.area.flatMap(({ x, y }) => [x, y])}
          closed
          fill={object.laylineAreaColor}
          opacity={0.2}
          listening={false}
        />
      )}
      {object.type !== 'gate' && object.laylinesVisible && courseLaylines && (
        <>
          {courseLaylines.endsA.map((end, index) => (
            <Line
              key={`layline-a-${index}`}
              points={[object.endAX, object.endAY, end.x, end.y]}
              stroke={baseLineColor}
              dash={[12, 10]}
              strokeWidth={2}
              opacity={0.62}
              listening={false}
            />
          ))}
          {courseLaylines.endsB.map((end, index) => (
            <Line
              key={`layline-b-${index}`}
              points={[object.endBX, object.endBY, end.x, end.y]}
              stroke={baseLineColor}
              dash={[12, 10]}
              strokeWidth={2}
              opacity={0.62}
              listening={false}
            />
          ))}
        </>
      )}
      <Line
        points={[object.endAX, object.endAY, object.endBX, object.endBY]}
        stroke={lineColor}
        strokeWidth={object.type === 'gate' ? 2.5 : 4}
        dash={[16, 10]}
        opacity={0.72}
        hitStrokeWidth={touchHitStrokeWidth(interactionScale)}
      />
      {object.type === 'gate' ? (
        <>
          {(['a', 'b'] as const).map((endpoint, index) => (
            <Group
              key={endpoint}
              x={endpoint === 'a' ? object.endAX : object.endBX}
              y={endpoint === 'a' ? object.endAY : object.endBY}
              draggable={!object.locked}
              {...endpointEvents(endpoint)}
            >
              <Rect
                x={-15}
                y={-24}
                width={30}
                height={48}
                cornerRadius={3}
                fill={
                  selected && activeEndpoint === endpoint
                    ? darkenHexColor(object.color)
                    : object.color
                }
                stroke={outlineColor}
                strokeWidth={2}
              />
              <Text
                text={`${object.markNumber}${index === 0 ? 'a' : 'b'}`}
                x={-15}
                y={-24}
                width={30}
                height={48}
                align="center"
                verticalAlign="middle"
                fill="#171717"
                fontSize={15}
                fontStyle="bold"
                listening={false}
              />
            </Group>
          ))}
        </>
      ) : (
        <>
          <Group
            x={object.endAX}
            y={object.endAY}
            draggable={!object.locked}
            {...endpointEvents('a')}
          >
            <CourseEndpointGraphic
              type={object.pinEndType}
              windDirection={windDirection}
              selected={selected && activeEndpoint === 'a'}
              accentColor={courseEndpointAccentColor(
                object.pinEndType,
                configuredMarkColor,
                object.pinEndFlagColor,
              )}
              showSignalFlag={courseEndpointShowsSignalFlag(object.pinEndType)}
              inkColor={inkColor}
              outlineColor={outlineColor}
            />
          </Group>
          <Group
            x={object.endBX}
            y={object.endBY}
            draggable={!object.locked}
            {...endpointEvents('b')}
          >
            <CourseEndpointGraphic
              type={object.startEndType}
              windDirection={windDirection}
              selected={selected && activeEndpoint === 'b'}
              accentColor={courseEndpointAccentColor(
                object.startEndType,
                configuredMarkColor,
                object.startEndFlagColor,
              )}
              showSignalFlag={courseEndpointShowsSignalFlag(object.startEndType)}
              inkColor={inkColor}
              outlineColor={outlineColor}
            />
          </Group>
        </>
      )}
    </Group>
  )
}

interface ObjectGraphicProps {
  object: ScenarioObject
  selected: boolean
  onSelect: (event: KonvaEventObject<MouseEvent | TouchEvent>) => void
  onChange: (patch: Partial<ScenarioObject>, label: string) => void
  onPreviewChange: (patch: Partial<ScenarioObject>) => void
  windDirection: number
  laylineAngle: number
  zoneBoatLength: number
  boatNumbersVisible: boolean
  inkColor: string
  outlineColor: string
  brandAccentColor: string
  configuredMarkColor: string
  interactionScale: number
}

function TwoPointLineGraphic({
  object,
  selected,
  onSelect,
  onChange,
  onPreviewChange,
  inkColor,
  brandAccentColor,
  interactionScale,
}: ObjectGraphicProps) {
  if (object.type !== 'line' && object.type !== 'arrow') return null
  const points = [
    object.points[0] ?? 0,
    object.points[1] ?? 0,
    object.points.at(-2) ?? 0,
    object.points.at(-1) ?? 0,
  ]
  const Component = object.type === 'arrow' ? Arrow : Line
  const moveEndpoint = (
    endpoint: 'start' | 'end',
    event: KonvaEventObject<DragEvent>,
    commit: boolean,
  ) => {
    event.cancelBubble = true
    const nextPoints = [...points]
    const offset = endpoint === 'start' ? 0 : 2
    nextPoints[offset] = event.target.x()
    nextPoints[offset + 1] = event.target.y()
    const patch: Partial<LineObject> = { points: nextPoints }
    if (commit) onChange(patch, `Moved ${object.type} endpoint`)
    else onPreviewChange(patch)
  }
  const endpointEvents = (endpoint: 'start' | 'end') => ({
    onMouseDown: (event: KonvaEventObject<MouseEvent>) => onSelect(event),
    onTouchStart: (event: KonvaEventObject<TouchEvent>) => onSelect(event),
    onDragMove: (event: KonvaEventObject<DragEvent>) => moveEndpoint(endpoint, event, false),
    onDragEnd: (event: KonvaEventObject<DragEvent>) => moveEndpoint(endpoint, event, true),
  })
  return (
    <Group
      id={`object-${object.id}`}
      x={object.x}
      y={object.y}
      rotation={object.rotation}
      scaleX={object.scaleX}
      scaleY={object.scaleY}
      opacity={object.opacity}
      draggable={!object.locked}
      onClick={onSelect}
      onTap={onSelect}
      onDragMove={(event) => {
        if (event.target !== event.currentTarget) return
        onPreviewChange({ x: event.target.x(), y: event.target.y() })
      }}
      onDragEnd={(event) => {
        if (event.target !== event.currentTarget) return
        onChange({ x: event.target.x(), y: event.target.y() }, `Moved ${object.type}`)
      }}
    >
      <Component
        points={points}
        stroke={visiblePlotColor(object.stroke, inkColor)}
        fill={visiblePlotColor(object.stroke, inkColor)}
        strokeWidth={object.strokeWidth}
        dash={object.dash}
        lineCap="round"
        lineJoin="round"
        pointerLength={object.type === 'arrow' ? 14 : undefined}
        pointerWidth={object.type === 'arrow' ? 12 : undefined}
        hitStrokeWidth={touchHitStrokeWidth(interactionScale)}
      />
      {selected &&
        (['start', 'end'] as const).map((endpoint, index) => (
          <Circle
            key={endpoint}
            x={points[index * 2]}
            y={points[index * 2 + 1]}
            radius={8 / Math.max(interactionScale, 0.01)}
            fill={brandAccentColor}
            stroke={inkColor}
            strokeWidth={2 / Math.max(interactionScale, 0.01)}
            hitStrokeWidth={touchHitStrokeWidth(interactionScale)}
            draggable={!object.locked}
            {...endpointEvents(endpoint)}
          />
        ))}
    </Group>
  )
}

function ObjectGraphic(props: ObjectGraphicProps) {
  const {
    object,
    selected,
    onSelect,
    onChange,
    onPreviewChange,
    inkColor,
    interactionScale,
    brandAccentColor,
  } = props
  if (object.type === 'boat') return <BoatGraphic {...props} />
  if (object.type === 'mark') return <MarkGraphic {...props} />
  if (object.type === 'gate' || object.type === 'start-line' || object.type === 'finish-line')
    return <CourseGraphic {...props} />
  if (object.type === 'line' || object.type === 'arrow') return <TwoPointLineGraphic {...props} />
  if (object.type === 'text') {
    return (
      <Text
        id={`object-${object.id}`}
        x={object.x}
        y={object.y}
        text={object.text}
        fill={visiblePlotColor(object.color, inkColor)}
        fontSize={object.fontSize}
        fontStyle={object.fontWeight}
        align={object.align}
        rotation={object.rotation}
        opacity={object.opacity}
        padding={8}
        draggable={!object.locked}
        stroke={selected ? inkColor : undefined}
        strokeWidth={selected ? 0.5 : 0}
        onClick={onSelect}
        onTap={onSelect}
        onDragMove={(event) => onPreviewChange({ x: event.target.x(), y: event.target.y() })}
        onDragEnd={(event) => onChange({ x: event.target.x(), y: event.target.y() }, 'Moved text')}
        onTransformEnd={(event) =>
          onChange(
            {
              x: event.target.x(),
              y: event.target.y(),
              rotation: event.target.rotation(),
            },
            'Transformed text',
          )
        }
      />
    )
  }
  if (object.type === 'rectangle') {
    const hasVisibleFill = shapeHasVisibleFill(object.fill)
    return (
      <Rect
        id={`object-${object.id}`}
        x={object.x}
        y={object.y}
        width={object.width}
        height={object.height}
        fill={hasVisibleFill ? object.fill : undefined}
        fillEnabled={hasVisibleFill}
        stroke={visiblePlotColor(object.stroke, inkColor)}
        strokeWidth={object.strokeWidth}
        hitStrokeWidth={shapeHitStrokeWidth(interactionScale, object.strokeWidth)}
        hitFunc={
          hasVisibleFill
            ? undefined
            : (context, shape) => {
                context.beginPath()
                context.rect(0, 0, object.width, object.height)
                context.closePath()
                context.strokeShape(shape)
              }
        }
        rotation={object.rotation}
        scaleX={object.scaleX}
        scaleY={object.scaleY}
        opacity={object.opacity}
        draggable={!object.locked}
        onClick={onSelect}
        onTap={onSelect}
        onDragMove={(event) => onPreviewChange({ x: event.target.x(), y: event.target.y() })}
        onDragEnd={(event) =>
          onChange({ x: event.target.x(), y: event.target.y() }, 'Moved rectangle')
        }
        onTransformEnd={(event) => {
          const node = event.target
          const width = object.width * Math.abs(node.scaleX())
          const height = object.height * Math.abs(node.scaleY())
          node.scale({ x: 1, y: 1 })
          onChange(
            {
              x: node.x(),
              y: node.y(),
              width: Math.max(8, width),
              height: Math.max(8, height),
              scaleX: 1,
              scaleY: 1,
            },
            'Resized rectangle',
          )
        }}
      />
    )
  }
  if (object.type === 'circle') {
    const radius =
      (Math.max(object.width, object.height) / 2) *
      Math.max(Math.abs(object.scaleX), Math.abs(object.scaleY))
    const hasVisibleFill = shapeHasVisibleFill(object.fill)
    const resizeCircle = (event: KonvaEventObject<DragEvent>, commit: boolean) => {
      event.cancelBubble = true
      const nextRadius = Math.max(
        4,
        Math.hypot(event.target.x() - object.x, event.target.y() - object.y),
      )
      event.target.position({ x: object.x, y: object.y - nextRadius })
      const patch = {
        width: nextRadius * 2,
        height: nextRadius * 2,
        scaleX: 1,
        scaleY: 1,
      }
      if (commit) onChange(patch, 'Resized circle')
      else onPreviewChange(patch)
    }
    return (
      <>
        <Circle
          id={`object-${object.id}`}
          x={object.x}
          y={object.y}
          radius={radius}
          fill={hasVisibleFill ? object.fill : undefined}
          fillEnabled={hasVisibleFill}
          stroke={visiblePlotColor(object.stroke, inkColor)}
          strokeWidth={object.strokeWidth}
          hitStrokeWidth={shapeHitStrokeWidth(interactionScale, object.strokeWidth)}
          hitFunc={
            hasVisibleFill
              ? undefined
              : (context, shape) => {
                  context.beginPath()
                  context.arc(0, 0, radius, 0, Math.PI * 2, false)
                  context.closePath()
                  context.strokeShape(shape)
                }
          }
          rotation={object.rotation}
          opacity={object.opacity}
          draggable={!object.locked}
          onClick={onSelect}
          onTap={onSelect}
          onDragMove={(event) => onPreviewChange({ x: event.target.x(), y: event.target.y() })}
          onDragEnd={(event) =>
            onChange({ x: event.target.x(), y: event.target.y() }, 'Moved circle')
          }
        />
        {selected && !object.locked && (
          <Circle
            x={object.x}
            y={object.y - radius}
            radius={8 / Math.max(interactionScale, 0.01)}
            fill={brandAccentColor}
            stroke={inkColor}
            strokeWidth={2 / Math.max(interactionScale, 0.01)}
            hitStrokeWidth={touchHitStrokeWidth(interactionScale)}
            draggable
            onMouseDown={(event) => {
              event.cancelBubble = true
            }}
            onTouchStart={(event) => {
              event.cancelBubble = true
            }}
            onDragMove={(event) => resizeCircle(event, false)}
            onDragEnd={(event) => resizeCircle(event, true)}
          />
        )}
      </>
    )
  }
  if (!('points' in object)) return null
  return (
    <Line
      id={`object-${object.id}`}
      x={object.x}
      y={object.y}
      points={object.points}
      stroke={visiblePlotColor(object.stroke, inkColor)}
      fill={visiblePlotColor(object.stroke, inkColor)}
      strokeWidth={object.strokeWidth}
      dash={object.dash}
      lineCap="round"
      lineJoin="round"
      tension={object.type === 'freehand' ? 0.35 : 0}
      hitStrokeWidth={24}
      rotation={object.rotation}
      scaleX={object.scaleX}
      scaleY={object.scaleY}
      opacity={object.opacity}
      draggable={!object.locked}
      onClick={onSelect}
      onTap={onSelect}
      onDragMove={(event) => onPreviewChange({ x: event.target.x(), y: event.target.y() })}
      onDragEnd={(event) =>
        onChange({ x: event.target.x(), y: event.target.y() }, `Moved ${object.type}`)
      }
    />
  )
}

interface ScenarioCanvasProps {
  branding?: ReactNode
  topRightOverlay?: ReactNode
  playbackPosition?: number
  playbackTailsVisible?: boolean
}

const EDITOR_BRANDING_MAX_WIDTH = 341.55
const EDITOR_BRANDING_COMPACT_WIDTH = 273.24
const EDITOR_BRANDING_ASPECT_RATIO = 72 / 32
const EDITOR_QR_WIDTH_RATIO = 32 / 72
const EDITOR_BRANDING_PLOT_MARGIN = 12
const EDITOR_BRANDING_VIEWPORT_MARGIN = 6

export const ScenarioCanvas = forwardRef<CanvasHandle, ScenarioCanvasProps>(function ScenarioCanvas(
  { branding, topRightOverlay, playbackPosition, playbackTailsVisible = true },
  ref,
) {
  const { t } = useI18n()
  const containerRef = useRef<HTMLDivElement>(null)
  const brandingRef = useRef<HTMLDivElement>(null)
  const stageRef = useRef<Konva.Stage>(null)
  const transformerRef = useRef<Konva.Transformer>(null)
  const [size, setSize] = useState({ width: 800, height: 600 })
  const [measuredBrandingHeight, setMeasuredBrandingHeight] = useState(0)
  const [view, setView] = useState<View>({ x: 0, y: 0, scale: 1 })
  const [draft, setDraft] = useState<DrawingDraft | null>(null)
  const draftRef = useRef<DrawingDraft | null>(null)
  const drawingGesture = useRef<{ start: Point } | null>(null)
  const awaitingSecondClick = useRef(false)
  const [spacePressed, setSpacePressed] = useState(false)
  const touchGesture = useRef<{ distance: number; center: Point } | null>(null)
  const scenario = useEditorStore((state) => state.scenario)
  const dragPreview = useEditorStore((state) => state.dragPreview)
  const selectedIds = useEditorStore((state) => state.selectedIds)
  const activeTool = useEditorStore((state) => state.activeTool)
  const addAt = useEditorStore((state) => state.addAt)
  const addObject = useEditorStore((state) => state.addObject)
  const select = useEditorStore((state) => state.select)
  const updateObject = useEditorStore((state) => state.updateObject)
  const updateCanvas = useEditorStore((state) => state.updateCanvas)
  const setTool = useEditorStore((state) => state.setTool)
  const setDragPreview = useEditorStore((state) => state.setDragPreview)
  const brandAccentColor = useEditorStore((state) => state.brandAccentColor)
  const markColor = useEditorStore((state) => state.markColor)
  const startLineFlagColor = useEditorStore((state) => state.startLineFlagColor)
  const darkPlot = isDarkPlotBackground(scenario.canvas.background)
  const infinitePlot = scenario.canvas.infinite
  const inkColor = darkPlot ? DARK_PLOT_INK : LIGHT_PLOT_INK
  const outlineColor = darkPlot ? DARK_PLOT_OUTLINE : LIGHT_PLOT_INK
  const gridColor = darkPlot ? '#71808A' : '#BCCDD3'
  const fitScale = Math.max(
    0.01,
    Math.min(size.width / scenario.canvas.width, size.height / scenario.canvas.height),
  )
  const fitX = Math.max(0, (size.width - scenario.canvas.width * fitScale) / 2)
  const fitY = Math.max(0, (size.height - scenario.canvas.height * fitScale) / 2)
  const actualScale = fitScale * view.scale
  const visibleWorld = {
    x: -view.x / actualScale,
    y: -view.y / actualScale,
    width: size.width / actualScale,
    height: size.height / actualScale,
  }
  const infiniteOverscan = Math.max(visibleWorld.width, visibleWorld.height) * 0.5
  const renderedPlotBounds = infinitePlot
    ? {
        x: visibleWorld.x - infiniteOverscan,
        y: visibleWorld.y - infiniteOverscan,
        width: visibleWorld.width + infiniteOverscan * 2,
        height: visibleWorld.height + infiniteOverscan * 2,
      }
    : { x: 0, y: 0, width: scenario.canvas.width, height: scenario.canvas.height }
  const brandingWidth = Math.max(
    1,
    Math.min(
      size.width <= 640 ? EDITOR_BRANDING_COMPACT_WIDTH : EDITOR_BRANDING_MAX_WIDTH,
      size.width - EDITOR_BRANDING_VIEWPORT_MARGIN * 2,
      (size.height - EDITOR_BRANDING_VIEWPORT_MARGIN * 2) * EDITOR_BRANDING_ASPECT_RATIO,
    ),
  )
  const brandingHeight = measuredBrandingHeight || brandingWidth / EDITOR_BRANDING_ASPECT_RATIO
  const topRightOverlaySize = brandingWidth * EDITOR_QR_WIDTH_RATIO
  const canvasRight = view.x + scenario.canvas.width * actualScale
  const canvasTop = view.y
  const canvasBottom = view.y + scenario.canvas.height * actualScale
  const brandingRight = infinitePlot
    ? EDITOR_BRANDING_VIEWPORT_MARGIN
    : Math.min(
        Math.max(
          EDITOR_BRANDING_VIEWPORT_MARGIN,
          size.width - canvasRight + EDITOR_BRANDING_PLOT_MARGIN,
        ),
        Math.max(
          EDITOR_BRANDING_VIEWPORT_MARGIN,
          size.width - brandingWidth - EDITOR_BRANDING_VIEWPORT_MARGIN,
        ),
      )
  const brandingBottom = infinitePlot
    ? EDITOR_BRANDING_VIEWPORT_MARGIN
    : Math.min(
        Math.max(
          EDITOR_BRANDING_VIEWPORT_MARGIN,
          size.height - canvasBottom + EDITOR_BRANDING_PLOT_MARGIN,
        ),
        Math.max(
          EDITOR_BRANDING_VIEWPORT_MARGIN,
          size.height - brandingHeight - EDITOR_BRANDING_VIEWPORT_MARGIN,
        ),
      )
  const topRightOverlayRight = infinitePlot
    ? EDITOR_BRANDING_VIEWPORT_MARGIN
    : Math.min(
        Math.max(
          EDITOR_BRANDING_VIEWPORT_MARGIN,
          size.width - canvasRight + EDITOR_BRANDING_PLOT_MARGIN,
        ),
        Math.max(
          EDITOR_BRANDING_VIEWPORT_MARGIN,
          size.width - topRightOverlaySize - EDITOR_BRANDING_VIEWPORT_MARGIN,
        ),
      )
  const topRightOverlayTop = infinitePlot
    ? EDITOR_BRANDING_VIEWPORT_MARGIN
    : Math.min(
        Math.max(EDITOR_BRANDING_VIEWPORT_MARGIN, canvasTop + EDITOR_BRANDING_PLOT_MARGIN),
        Math.max(
          EDITOR_BRANDING_VIEWPORT_MARGIN,
          size.height - topRightOverlaySize - EDITOR_BRANDING_VIEWPORT_MARGIN,
        ),
      )
  const layline = laylineVector(scenario.environment.laylineAngle, 500)
  const zoneBoatLength = useMemo(
    () =>
      measurementBoatLengthBasis(scenario.objects, scenario.environment.measurementBoatClass)
        .length,
    [scenario.environment.measurementBoatClass, scenario.objects],
  )
  const gridSize = zoneBoatLength
  const isPlaybackMode = playbackPosition !== undefined
  const overlaysAreDraggable = infinitePlot && !isPlaybackMode
  const windIndicatorPosition =
    infinitePlot && scenario.canvas.windIndicatorPosition
      ? scenario.canvas.windIndicatorPosition
      : { x: 120, y: 130 }

  const selectionCanScale = useMemo(
    () =>
      selectedIds.length > 0 &&
      selectedIds.every((id) => {
        const object = scenario.objects.find((candidate) => candidate.id === id)
        return object ? !NON_SCALABLE_TYPES.has(object.type) : false
      }),
    [scenario.objects, selectedIds],
  )
  const selectionCanRotate = useMemo(
    () =>
      selectedIds.length === 1 &&
      scenario.objects.some(
        (object) =>
          object.id === selectedIds[0] &&
          object.type !== 'mark' &&
          object.type !== 'gate' &&
          object.type !== 'start-line' &&
          object.type !== 'finish-line' &&
          object.type !== 'line' &&
          object.type !== 'arrow' &&
          object.type !== 'rectangle' &&
          object.type !== 'circle',
      ),
    [scenario.objects, selectedIds],
  )
  const selectionIsBoat = useMemo(
    () =>
      selectedIds.length === 1 &&
      scenario.objects.some((object) => object.id === selectedIds[0] && object.type === 'boat'),
    [scenario.objects, selectedIds],
  )
  const selectionIsRectangle = useMemo(
    () =>
      selectedIds.length === 1 &&
      scenario.objects.some(
        (object) => object.id === selectedIds[0] && object.type === 'rectangle',
      ),
    [scenario.objects, selectedIds],
  )

  const orderedObjects = useMemo(
    () => [...scenario.objects].sort((a, b) => a.zIndex - b.zIndex),
    [scenario.objects],
  )
  const editorDisplayObjects = useMemo(
    () =>
      orderedObjects.map((object) =>
        dragPreview?.id === object.id
          ? ({ ...object, ...dragPreview.patch } as ScenarioObject)
          : object,
      ),
    [dragPreview, orderedObjects],
  )
  const displayObjects = useMemo(
    () =>
      isPlaybackMode
        ? objectsAtPlaybackPosition(orderedObjects, playbackPosition)
        : editorDisplayObjects,
    [editorDisplayObjects, isPlaybackMode, orderedObjects, playbackPosition],
  )
  const boatTracks = useMemo(() => {
    if (isPlaybackMode) {
      if (!playbackTailsVisible) return []
      return boatTailsAtPlaybackPosition(orderedObjects, playbackPosition).filter(
        ({ path }) => path,
      )
    }

    const sequences = new Map<string, BoatObject[]>()
    for (const object of displayObjects) {
      if (object.type !== 'boat' || !object.visible) continue
      sequences.set(object.sequenceId, [...(sequences.get(object.sequenceId) ?? []), object])
    }
    return [...sequences.entries()]
      .map(([id, boats]) => ({ id, boats, path: boatSequencePath(boats) }))
      .filter(({ path }) => path)
  }, [displayObjects, isPlaybackMode, orderedObjects, playbackPosition, playbackTailsVisible])
  const boatLegendEntries = useMemo(() => {
    const entries = new Map<string, BoatObject>()
    for (const object of orderedObjects) {
      if (object.type !== 'boat' || !object.visible) continue
      const current = entries.get(object.sequenceId)
      if (!current || object.positionNumber < current.positionNumber)
        entries.set(object.sequenceId, object)
    }
    return [...entries.values()].map(
      ({ sequenceId, boatClass, color, name, sailNumber }): BoatLegendEntry => ({
        sequenceId,
        boatClass,
        color,
        name,
        sailNumber,
      }),
    )
  }, [orderedObjects])

  const fitToScreen = () => {
    const next = {
      x: fitX,
      y: fitY,
      scale: 1,
    }
    setView(next)
    updateCanvas({ view: next })
  }

  useImperativeHandle(ref, () => ({
    fitToScreen,
    resetView: () => {
      const next = {
        x: fitX,
        y: fitY,
        scale: 1,
      }
      setView(next)
      updateCanvas({ view: next })
    },
    exportPng: (transparent = false, pixelRatio = 2) => {
      const stage = stageRef.current
      if (!stage) return ''
      const transformer = transformerRef.current
      const background = stage.findOne('#canvas-background')
      const canvasGrid = stage.findOne('#canvas-grid')
      const previous = {
        x: stage.x(),
        y: stage.y(),
        scaleX: stage.scaleX(),
        scaleY: stage.scaleY(),
        width: stage.width(),
        height: stage.height(),
        background: background
          ? {
              x: background.x(),
              y: background.y(),
              width: background.width(),
              height: background.height(),
              visible: background.visible(),
            }
          : null,
      }
      transformer?.hide()
      if (transparent) background?.hide()
      if (infinitePlot) {
        const bounds = endlessExportBounds(scenario, zoneBoatLength)
        const maximumDimension = 8192
        const maximumPixels = 32_000_000
        const exportScale = Math.min(
          pixelRatio,
          maximumDimension / bounds.width,
          maximumDimension / bounds.height,
          Math.sqrt(maximumPixels / (bounds.width * bounds.height)),
        )
        const outputWidth = Math.max(1, Math.ceil(bounds.width * exportScale))
        const outputHeight = Math.max(1, Math.ceil(bounds.height * exportScale))
        const layer = background?.getLayer()
        const exportGrid: Konva.Group | null = scenario.canvas.grid.visible
          ? new Konva.Group({
              clipX: bounds.x,
              clipY: bounds.y,
              clipWidth: bounds.width,
              clipHeight: bounds.height,
              opacity: scenario.canvas.grid.opacity,
              listening: false,
            })
          : null

        try {
          canvasGrid?.hide()
          background?.setAttrs(bounds)
          if (exportGrid && layer) {
            const gridSegments = sailingGridSegmentsForBounds(
              bounds.x,
              bounds.y,
              bounds.width,
              bounds.height,
              gridSize,
              scenario.environment.laylineAngle,
              scenario.environment.windDirection,
            )
            exportGrid.add(
              new Konva.Shape({
                sceneFunc: (context, shape) => {
                  context.beginPath()
                  for (const [x1, y1, x2, y2] of gridSegments) {
                    context.moveTo(x1, y1)
                    context.lineTo(x2, y2)
                  }
                  context.fillStrokeShape(shape)
                },
                stroke: gridColor,
                strokeWidth: 1.2,
                dash: [4, 7],
                perfectDrawEnabled: false,
                listening: false,
              }),
            )
            layer.add(exportGrid)
            exportGrid.moveToBottom()
            background?.moveToBottom()
          }
          stage.position({ x: -bounds.x * exportScale, y: -bounds.y * exportScale })
          stage.scale({ x: exportScale, y: exportScale })
          stage.size({ width: outputWidth, height: outputHeight })
          stage.draw()
          return stage.toDataURL({ pixelRatio: 1, mimeType: 'image/png' })
        } finally {
          exportGrid?.destroy()
          canvasGrid?.show()
          stage.position({ x: previous.x, y: previous.y })
          stage.scale({ x: previous.scaleX, y: previous.scaleY })
          stage.size({ width: previous.width, height: previous.height })
          if (background && previous.background) background.setAttrs(previous.background)
          transformer?.show()
          stage.draw()
        }
      }
      stage.position({ x: 0, y: 0 })
      stage.scale({ x: 1, y: 1 })
      stage.size({ width: scenario.canvas.width, height: scenario.canvas.height })
      const uri = stage.toDataURL({ pixelRatio, mimeType: 'image/png' })
      stage.position({ x: previous.x, y: previous.y })
      stage.scale({ x: previous.scaleX, y: previous.scaleY })
      stage.size({ width: previous.width, height: previous.height })
      if (background && previous.background) background.visible(previous.background.visible)
      transformer?.show()
      return uri
    },
  }))

  useEffect(() => {
    if (!containerRef.current) return
    const observer = new ResizeObserver(([entry]) => {
      setSize({
        width: Math.max(1, entry.contentRect.width),
        height: Math.max(1, entry.contentRect.height),
      })
    })
    observer.observe(containerRef.current)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    const element = brandingRef.current
    if (!element) {
      setMeasuredBrandingHeight(0)
      return
    }
    const observer = new ResizeObserver(([entry]) => {
      setMeasuredBrandingHeight(entry.contentRect.height)
    })
    observer.observe(element)
    return () => observer.disconnect()
  }, [branding])

  useEffect(() => {
    if (size.width && size.height && scenario.canvas.view.scale <= 1) fitToScreen()
    else setView(scenario.canvas.view)
    // Keep a non-zoomed plot fully visible when the editor changes between layouts or sizes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    scenario.metadata.id,
    scenario.canvas.width,
    scenario.canvas.height,
    scenario.canvas.infinite,
    size.width,
    size.height,
  ])

  useEffect(() => {
    const stage = stageRef.current
    const transformer = transformerRef.current
    if (!stage || !transformer) return
    const nodes = (isPlaybackMode ? [] : selectedIds)
      .map((id) => {
        const object = scenario.objects.find((candidate) => candidate.id === id)
        return object?.type === 'mark' ||
          object?.type === 'gate' ||
          object?.type === 'start-line' ||
          object?.type === 'finish-line' ||
          object?.type === 'line' ||
          object?.type === 'arrow' ||
          object?.type === 'circle'
          ? null
          : stage.findOne(`#object-${id}`)
      })
      .filter((node): node is Konva.Node => Boolean(node))
    const restoreMeasurements = nodes.flatMap((node) => {
      if (node.getType() !== 'Group') return []
      const group = node as Konva.Group
      return group.findOne('.rotation-bounds') ? [pinTransformBoundsToNamedNode(group)] : []
    })
    transformer.nodes(nodes)
    transformer.forceUpdate()
    const rotationGuide = transformer.findOne('.back') as Konva.Shape | undefined
    rotationGuide?.visible(selectionCanRotate)
    rotationGuide?.sceneFunc((context, shape) => {
      if (!selectionCanRotate) return
      const owner = shape.getParent() as Konva.Transformer
      context.beginPath()
      context.moveTo(shape.width() / 2, 0)
      context.lineTo(shape.width() / 2, -owner.rotateAnchorOffset())
      context.strokeShape(shape)
    })
    transformer.getLayer()?.batchDraw()
    return () => restoreMeasurements.forEach((restore) => restore())
  }, [isPlaybackMode, selectedIds, scenario.objects, selectionCanRotate])

  useEffect(() => {
    const down = (event: KeyboardEvent) => event.code === 'Space' && setSpacePressed(true)
    const up = (event: KeyboardEvent) => event.code === 'Space' && setSpacePressed(false)
    window.addEventListener('keydown', down)
    window.addEventListener('keyup', up)
    return () => {
      window.removeEventListener('keydown', down)
      window.removeEventListener('keyup', up)
    }
  }, [])

  useEffect(() => {
    setDraft((current) => {
      if (!current || current.tool === activeTool) return current
      draftRef.current = null
      drawingGesture.current = null
      awaitingSecondClick.current = false
      return null
    })
  }, [activeTool])

  const canvasPoint = (): Point | null => {
    const pointer = stageRef.current?.getPointerPosition()
    return pointer
      ? { x: (pointer.x - view.x) / actualScale, y: (pointer.y - view.y) / actualScale }
      : null
  }

  const handlePointerDown = (event: KonvaEventObject<MouseEvent | TouchEvent>) => {
    if (isPlaybackMode) return
    const empty = event.target === event.target.getStage()
    const point = canvasPoint()
    if (!point || activeTool === 'pan' || spacePressed) return
    const currentDraft = draftRef.current
    if (
      currentDraft &&
      currentDraft.tool === activeTool &&
      TWO_CLICK_DRAWING_TOOLS.has(activeTool) &&
      awaitingSecondClick.current
    ) {
      const completedDraft = {
        ...currentDraft,
        points: [currentDraft.start.x, currentDraft.start.y, point.x, point.y],
      }
      completeDraft(completedDraft)
      return
    }
    if (!empty) return
    if (activeTool === 'select') {
      select(null)
      return
    }
    if (activeTool === 'boat' || activeTool === 'mark' || activeTool === 'downwind-mark') {
      addAt(activeTool, point.x, point.y)
      return
    }
    if (activeTool === 'text') {
      addObject(
        {
          id: createId(),
          type: 'text',
          x: point.x,
          y: point.y,
          rotation: 0,
          scaleX: 1,
          scaleY: 1,
          visible: true,
          locked: false,
          zIndex: orderedObjects.length + 1,
          opacity: 1,
          text: t('Annotation'),
          color: '#171717',
          fontSize: 28,
          fontWeight: 'normal',
          align: 'left',
          background: 'transparent',
        },
        'Added text',
      )
      setTool('select')
      return
    }
    if (DRAWING_TOOLS.includes(activeTool)) {
      const nextDraft = {
        tool: activeTool,
        start: point,
        points: [point.x, point.y, point.x, point.y],
      }
      draftRef.current = nextDraft
      drawingGesture.current = TWO_CLICK_DRAWING_TOOLS.has(activeTool) ? { start: point } : null
      awaitingSecondClick.current = false
      setDraft(nextDraft)
    }
  }

  const handlePointerMove = () => {
    if (!draftRef.current) return
    const point = canvasPoint()
    if (!point) return
    setDraft((current) => {
      if (!current) return null
      const next = {
        ...current,
        points:
          current.tool === 'freehand'
            ? [...current.points, point.x, point.y]
            : [current.start.x, current.start.y, point.x, point.y],
      }
      draftRef.current = next
      return next
    })
  }

  const handleTouchStart = (event: KonvaEventObject<TouchEvent>) => {
    if (event.evt.touches.length !== 2) {
      handlePointerDown(event)
      return
    }
    event.evt.preventDefault()
    draftRef.current = null
    drawingGesture.current = null
    awaitingSecondClick.current = false
    setDraft(null)
    const rect = containerRef.current?.getBoundingClientRect()
    const [first, second] = Array.from(event.evt.touches)
    if (!rect || !first || !second) return
    touchGesture.current = {
      distance: Math.hypot(second.clientX - first.clientX, second.clientY - first.clientY),
      center: {
        x: (first.clientX + second.clientX) / 2 - rect.left,
        y: (first.clientY + second.clientY) / 2 - rect.top,
      },
    }
  }

  const handleTouchMove = (event: KonvaEventObject<TouchEvent>) => {
    if (event.evt.touches.length !== 2 || !touchGesture.current) {
      handlePointerMove()
      return
    }
    event.evt.preventDefault()
    const rect = containerRef.current?.getBoundingClientRect()
    const [first, second] = Array.from(event.evt.touches)
    if (!rect || !first || !second) return
    const distance = Math.hypot(second.clientX - first.clientX, second.clientY - first.clientY)
    const center = {
      x: (first.clientX + second.clientX) / 2 - rect.left,
      y: (first.clientY + second.clientY) / 2 - rect.top,
    }
    const minimumScale = infinitePlot ? 0.1 : 1
    const scale = Math.min(
      8,
      Math.max(minimumScale, view.scale * (distance / Math.max(1, touchGesture.current.distance))),
    )
    const world = {
      x: (touchGesture.current.center.x - view.x) / actualScale,
      y: (touchGesture.current.center.y - view.y) / actualScale,
    }
    const nextScale = fitScale * scale
    const next =
      scale === 1 && !infinitePlot
        ? {
            scale,
            x: fitX,
            y: fitY,
          }
        : { scale, x: center.x - world.x * nextScale, y: center.y - world.y * nextScale }
    setView(next)
    touchGesture.current = { distance, center }
  }

  const handleTouchEnd = () => {
    if (touchGesture.current) {
      touchGesture.current = null
      updateCanvas({ view })
      return
    }
    handlePointerUp()
  }

  function completeDraft(draftToComplete: DrawingDraft) {
    let [x1, y1, x2, y2] =
      draftToComplete.points.length > 4
        ? [
            draftToComplete.points[0],
            draftToComplete.points[1],
            draftToComplete.points.at(-2)!,
            draftToComplete.points.at(-1)!,
          ]
        : draftToComplete.points
    if (
      (draftToComplete.tool === 'gate' ||
        draftToComplete.tool === 'start-line' ||
        draftToComplete.tool === 'finish-line') &&
      Math.hypot(x2 - x1, y2 - y1) < 32
    ) {
      const halfSpan = gridSize * (draftToComplete.tool === 'gate' ? 3 : 5)
      const angle = (scenario.environment.windDirection * Math.PI) / 180
      const centerX = x1
      const centerY = y1
      const offsetX = Math.cos(angle) * halfSpan
      const offsetY = Math.sin(angle) * halfSpan
      x1 = centerX - offsetX
      y1 = centerY - offsetY
      x2 = centerX + offsetX
      y2 = centerY + offsetY
    }
    const nextZIndex = Math.max(0, ...orderedObjects.map(({ zIndex }) => zIndex)) + 1
    const base = {
      id: createId(),
      x: 0,
      y: 0,
      rotation: 0,
      scaleX: 1,
      scaleY: 1,
      visible: true,
      locked: false,
      zIndex: nextZIndex,
      opacity: 1,
    }
    if (draftToComplete.tool === 'gate') {
      addObject(
        createGate(
          x1,
          y1,
          x2,
          y2,
          nextZIndex,
          nextMarkSequenceNumber(scenario.objects),
          scenario.environment.zoneRadiusBoatLengths,
          markColor,
        ),
        'Added gate',
      )
    } else if (draftToComplete.tool === 'start-line') {
      addObject(createStartLine(x1, y1, x2, y2, nextZIndex, startLineFlagColor), 'Added start line')
    } else if (draftToComplete.tool === 'finish-line') {
      addObject(createFinishLine(x1, y1, x2, y2, nextZIndex), 'Added finish line')
    } else if (draftToComplete.tool === 'rectangle' || draftToComplete.tool === 'circle') {
      const radius = Math.max(4, Math.hypot(x2 - x1, y2 - y1))
      addObject(
        {
          ...base,
          type: draftToComplete.tool,
          x: draftToComplete.tool === 'circle' ? x1 : Math.min(x1, x2),
          y: draftToComplete.tool === 'circle' ? y1 : Math.min(y1, y2),
          width: draftToComplete.tool === 'circle' ? radius * 2 : Math.max(8, Math.abs(x2 - x1)),
          height: draftToComplete.tool === 'circle' ? radius * 2 : Math.max(8, Math.abs(y2 - y1)),
          stroke: '#171717',
          strokeWidth: DEFAULT_DRAWING_STROKE_WIDTH,
          fill: 'transparent',
        },
        `Added ${draftToComplete.tool}`,
      )
    } else {
      addObject(
        {
          ...base,
          type: draftToComplete.tool as 'line' | 'arrow' | 'freehand',
          points: draftToComplete.points,
          stroke: '#171717',
          strokeWidth: DEFAULT_DRAWING_STROKE_WIDTH,
          dash: [],
        },
        `Added ${draftToComplete.tool}`,
      )
    }
    draftRef.current = null
    drawingGesture.current = null
    awaitingSecondClick.current = false
    setDraft(null)
    setTool('select')
  }

  const handlePointerUp = () => {
    const currentDraft = draftRef.current
    if (!currentDraft) return
    if (TWO_CLICK_DRAWING_TOOLS.has(currentDraft.tool)) {
      const point = canvasPoint()
      const finishedDraft = point
        ? {
            ...currentDraft,
            points: [currentDraft.start.x, currentDraft.start.y, point.x, point.y],
          }
        : currentDraft
      const gesture = drawingGesture.current
      drawingGesture.current = null
      const dragDistance = gesture
        ? Math.hypot(
            finishedDraft.points[2] - gesture.start.x,
            finishedDraft.points[3] - gesture.start.y,
          ) * actualScale
        : 0
      if (dragDistance >= MIN_DRAWING_DRAG_DISTANCE_PX) {
        completeDraft(finishedDraft)
        return
      }
      awaitingSecondClick.current = true
      draftRef.current = finishedDraft
      setDraft(finishedDraft)
      return
    }
    completeDraft(currentDraft)
  }

  const handleWheel = (event: KonvaEventObject<WheelEvent>) => {
    event.evt.preventDefault()
    const stage = stageRef.current
    const pointer = stage?.getPointerPosition()
    if (!stage || !pointer) return
    const mousePoint = {
      x: (pointer.x - view.x) / actualScale,
      y: (pointer.y - view.y) / actualScale,
    }
    const direction = event.evt.deltaY > 0 ? -1 : 1
    const minimumScale = infinitePlot ? 0.1 : 1
    const scale = Math.min(
      8,
      Math.max(minimumScale, direction > 0 ? view.scale * 1.08 : view.scale / 1.08),
    )
    const nextScale = fitScale * scale
    const next =
      scale === 1 && !infinitePlot
        ? {
            scale,
            x: fitX,
            y: fitY,
          }
        : {
            scale,
            x: pointer.x - mousePoint.x * nextScale,
            y: pointer.y - mousePoint.y * nextScale,
          }
    setView(next)
    updateCanvas({ view: next })
  }

  return (
    <div ref={containerRef} className="editor-canvas" aria-label={t('Sailing plot canvas')}>
      <Stage
        ref={stageRef}
        width={size.width}
        height={size.height}
        x={view.x}
        y={view.y}
        scaleX={actualScale}
        scaleY={actualScale}
        draggable={!isPlaybackMode && (activeTool === 'pan' || spacePressed)}
        onDragMove={(event) => {
          if (!infinitePlot || event.target !== stageRef.current) return
          setView((current) => ({ ...current, x: event.target.x(), y: event.target.y() }))
        }}
        onDragEnd={(event) => {
          if (event.target !== stageRef.current) return
          const next =
            view.scale === 1 && !infinitePlot
              ? {
                  ...view,
                  x: fitX,
                  y: fitY,
                }
              : { ...view, x: event.target.x(), y: event.target.y() }
          setView(next)
          updateCanvas({ view: next })
        }}
        onWheel={handleWheel}
        onMouseDown={handlePointerDown}
        onTouchStart={handleTouchStart}
        onMouseMove={handlePointerMove}
        onTouchMove={handleTouchMove}
        onMouseUp={handlePointerUp}
        onTouchEnd={handleTouchEnd}
      >
        <Layer>
          <Rect
            id="canvas-background"
            x={renderedPlotBounds.x}
            y={renderedPlotBounds.y}
            width={renderedPlotBounds.width}
            height={renderedPlotBounds.height}
            fill={scenario.canvas.background}
            listening={false}
          />
          {scenario.canvas.grid.visible && (
            <Grid
              id="canvas-grid"
              x={renderedPlotBounds.x}
              y={renderedPlotBounds.y}
              width={renderedPlotBounds.width}
              height={renderedPlotBounds.height}
              size={gridSize}
              opacity={scenario.canvas.grid.opacity}
              color={gridColor}
              laylineAngle={scenario.environment.laylineAngle}
              windDirection={scenario.environment.windDirection}
              infinite={infinitePlot}
            />
          )}
          {scenario.environment.zonesVisible &&
            displayObjects.flatMap((object) => {
              if (object.type === 'mark' && object.visible && object.zoneVisible) {
                return [
                  <Circle
                    key={`zone-${object.id}`}
                    x={object.x}
                    y={object.y}
                    radius={object.zoneRadius * zoneBoatLength}
                    fill={object.color}
                    opacity={0.07}
                    stroke={object.color}
                    dash={[10, 8]}
                    strokeWidth={2}
                    listening={false}
                  />,
                ]
              }
              if (object.type === 'gate' && object.visible && object.zoneVisible) {
                return (['a', 'b'] as const).map((endpoint) => (
                  <Circle
                    key={`zone-${object.id}-${endpoint}`}
                    x={object.x + (endpoint === 'a' ? object.endAX : object.endBX)}
                    y={object.y + (endpoint === 'a' ? object.endAY : object.endBY)}
                    radius={object.zoneRadius * zoneBoatLength}
                    fill={object.color}
                    opacity={0.07}
                    stroke={object.color}
                    dash={[10, 8]}
                    strokeWidth={2}
                    listening={false}
                  />
                ))
              }
              return []
            })}
          {boatTracks.map(({ id, boats, path }) => (
            <Path
              key={`track-${id}`}
              data={path}
              stroke={boats[0].color}
              strokeWidth={3}
              opacity={isPlaybackMode ? 0.7 : 0.52}
              lineCap="round"
              lineJoin="round"
              listening={false}
            />
          ))}
          {scenario.environment.laylinesVisible &&
            displayObjects
              .filter(
                (object): object is MarkObject => object.type === 'mark' && object.laylinesVisible,
              )
              .map((mark) => (
                <Group
                  key={`laylines-${mark.id}`}
                  x={mark.x}
                  y={mark.y}
                  rotation={markLaylineRotation(scenario.environment.windDirection, mark.downwind)}
                  listening={false}
                >
                  <Line
                    points={[0, 0, layline.x, layline.y]}
                    stroke={mark.color}
                    dash={[12, 10]}
                    strokeWidth={2}
                    opacity={0.62}
                  />
                  <Line
                    points={[0, 0, -layline.x, layline.y]}
                    stroke={mark.color}
                    dash={[12, 10]}
                    strokeWidth={2}
                    opacity={0.62}
                  />
                </Group>
              ))}
          {scenario.environment.windVisible && (
            <Group
              x={windIndicatorPosition.x}
              y={windIndicatorPosition.y}
              draggable={overlaysAreDraggable}
              listening={overlaysAreDraggable}
              onMouseDown={(event) => {
                if (overlaysAreDraggable) event.cancelBubble = true
              }}
              onTouchStart={(event) => {
                if (overlaysAreDraggable) event.cancelBubble = true
              }}
              onDragEnd={(event) =>
                updateCanvas({
                  windIndicatorPosition: { x: event.target.x(), y: event.target.y() },
                })
              }
            >
              {overlaysAreDraggable && (
                <Rect x={-80} y={-116} width={160} height={204} fill="rgba(0,0,0,0.001)" />
              )}
              <Group rotation={scenario.environment.windDirection}>
                <Circle
                  x={0}
                  y={-72}
                  radius={6}
                  fill={brandAccentColor}
                  stroke={outlineColor}
                  strokeWidth={2}
                />
                <Arrow
                  points={[0, -62, 0, 72]}
                  stroke={inkColor}
                  fill={inkColor}
                  strokeWidth={5}
                  pointerLength={18}
                  pointerWidth={16}
                />
              </Group>
              <Text
                text={`${t('WIND FROM')}${scenario.environment.windStrength ? ` · ${scenario.environment.windStrength}` : ''}`}
                x={-70}
                y={-104}
                width={140}
                align="center"
                fill={inkColor}
                fontSize={15}
                fontStyle="bold"
              />
            </Group>
          )}
          {displayObjects
            .filter((object) => object.visible)
            .map((object) => {
              const renderedObject =
                object.type === 'mark' && !scenario.environment.zonesVisible
                  ? { ...object, zoneVisible: false }
                  : object
              return (
                <ObjectGraphic
                  key={object.id}
                  object={renderedObject}
                  selected={!isPlaybackMode && selectedIds.includes(object.id)}
                  onSelect={(event) => {
                    if (isPlaybackMode) return
                    event.cancelBubble = true
                    const canSelect =
                      activeTool === 'select' || (activeTool === 'boat' && object.type === 'boat')
                    if (!canSelect) return
                    select(
                      object.id,
                      activeTool === 'select' && 'shiftKey' in event.evt && event.evt.shiftKey,
                    )
                  }}
                  onChange={(patch, label) => {
                    updateObject(object.id, patch, label)
                    if (dragPreview?.id === object.id) setDragPreview(null)
                  }}
                  onPreviewChange={(patch) => setDragPreview({ id: object.id, patch })}
                  windDirection={scenario.environment.windDirection}
                  laylineAngle={scenario.environment.laylineAngle}
                  zoneBoatLength={zoneBoatLength}
                  boatNumbersVisible={!isPlaybackMode && scenario.canvas.boatNumbersVisible}
                  inkColor={inkColor}
                  outlineColor={outlineColor}
                  interactionScale={actualScale}
                  brandAccentColor={brandAccentColor}
                  configuredMarkColor={markColor}
                />
              )
            })}
          {scenario.canvas.boatLegendVisible && (
            <BoatLegend
              entries={boatLegendEntries}
              canvasHeight={scenario.canvas.height}
              dark={darkPlot}
              position={infinitePlot ? scenario.canvas.boatLegendPosition : null}
              draggable={overlaysAreDraggable}
              onPositionChange={(boatLegendPosition) => updateCanvas({ boatLegendPosition })}
            />
          )}
          {!isPlaybackMode &&
            draft &&
            (draft.tool === 'rectangle' ? (
              <Group listening={false}>
                <Rect
                  x={Math.min(draft.points[0], draft.points[2])}
                  y={Math.min(draft.points[1], draft.points[3])}
                  width={Math.abs(draft.points[2] - draft.points[0])}
                  height={Math.abs(draft.points[3] - draft.points[1])}
                  stroke={inkColor}
                  strokeWidth={DEFAULT_DRAWING_STROKE_WIDTH}
                  dash={[8, 6]}
                />
                <Circle
                  x={draft.points[0]}
                  y={draft.points[1]}
                  radius={6}
                  fill={brandAccentColor}
                  stroke={inkColor}
                  strokeWidth={2}
                />
                <Circle
                  x={draft.points[2]}
                  y={draft.points[3]}
                  radius={6}
                  fill={brandAccentColor}
                  stroke={inkColor}
                  strokeWidth={2}
                />
              </Group>
            ) : draft.tool === 'circle' ? (
              <Group listening={false}>
                <Circle
                  x={draft.points[0]}
                  y={draft.points[1]}
                  radius={Math.hypot(
                    draft.points[2] - draft.points[0],
                    draft.points[3] - draft.points[1],
                  )}
                  stroke={inkColor}
                  strokeWidth={DEFAULT_DRAWING_STROKE_WIDTH}
                  dash={[8, 6]}
                />
                <Circle
                  x={draft.points[0]}
                  y={draft.points[1]}
                  radius={6}
                  fill={brandAccentColor}
                  stroke={inkColor}
                  strokeWidth={2}
                />
                <Circle
                  x={draft.points[2]}
                  y={draft.points[3]}
                  radius={6}
                  fill={brandAccentColor}
                  stroke={inkColor}
                  strokeWidth={2}
                />
              </Group>
            ) : draft.tool === 'arrow' ? (
              <Group listening={false}>
                <Arrow
                  points={draft.points}
                  stroke={inkColor}
                  fill={inkColor}
                  strokeWidth={DEFAULT_DRAWING_STROKE_WIDTH}
                  pointerLength={14}
                  pointerWidth={12}
                />
                {[0, 1].map((index) => (
                  <Circle
                    key={index}
                    x={draft.points[index * 2]}
                    y={draft.points[index * 2 + 1]}
                    radius={6}
                    fill={brandAccentColor}
                    stroke={inkColor}
                    strokeWidth={2}
                  />
                ))}
              </Group>
            ) : draft.tool === 'line' ? (
              <Group listening={false}>
                <Line
                  points={draft.points}
                  stroke={inkColor}
                  strokeWidth={DEFAULT_DRAWING_STROKE_WIDTH}
                  lineCap="round"
                  lineJoin="round"
                />
                {[0, 1].map((index) => (
                  <Circle
                    key={index}
                    x={draft.points[index * 2]}
                    y={draft.points[index * 2 + 1]}
                    radius={6}
                    fill={brandAccentColor}
                    stroke={inkColor}
                    strokeWidth={2}
                  />
                ))}
              </Group>
            ) : (
              <Line
                points={draft.points}
                stroke={inkColor}
                strokeWidth={DEFAULT_DRAWING_STROKE_WIDTH}
                dash={
                  draft.tool === 'gate' ||
                  draft.tool === 'start-line' ||
                  draft.tool === 'finish-line'
                    ? [16, 10]
                    : undefined
                }
                lineCap="round"
                lineJoin="round"
                tension={draft.tool === 'freehand' ? 0.35 : 0}
                listening={false}
              />
            ))}
          <Transformer
            ref={transformerRef}
            rotateEnabled={selectionCanRotate}
            rotateLineVisible={selectionCanRotate}
            rotateAnchorOffset={
              selectionCanRotate
                ? selectionIsBoat
                  ? BOAT_ROTATE_ANCHOR_OFFSET
                  : DEFAULT_ROTATE_ANCHOR_OFFSET
                : 0
            }
            borderEnabled={selectionCanRotate}
            resizeEnabled={selectionCanScale}
            enabledAnchors={
              selectionIsRectangle ? RECTANGLE_CORNER_ANCHORS : DEFAULT_TRANSFORM_ANCHORS
            }
            keepRatio={!selectionIsRectangle}
            anchorSize={18}
            borderStroke={inkColor}
            borderStrokeWidth={2}
            anchorFill={brandAccentColor}
            anchorStroke={inkColor}
            anchorCornerRadius={4}
          />
        </Layer>
      </Stage>
      {branding && (
        <div
          ref={brandingRef}
          className="canvas-branding-anchor"
          style={{ width: brandingWidth, right: brandingRight, bottom: brandingBottom }}
        >
          {branding}
        </div>
      )}
      {topRightOverlay && (
        <div
          className="canvas-top-right-overlay"
          style={{
            width: topRightOverlaySize,
            height: topRightOverlaySize,
            top: topRightOverlayTop,
            right: topRightOverlayRight,
          }}
        >
          {topRightOverlay}
        </div>
      )}
    </div>
  )
})
