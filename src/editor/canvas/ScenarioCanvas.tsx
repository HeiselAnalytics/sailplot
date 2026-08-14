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
  Stage,
  Text,
  Transformer,
} from 'react-konva'
import type Konva from 'konva'
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
import { JURY_BOAT_GREY } from '../../lib/boatColors'
import {
  courseLineLaylineGeometry,
  laylineVector,
  markLaylineRotation,
  sailingGridSegments,
  snapToSailingGrid,
} from './gridGeometry'
import { pinTransformBoundsToNamedNode } from './rotationBounds'
import {
  courseEndpointAccentColor,
  courseEndpointBoatAppearance,
  courseEndpointShowsSignalFlag,
} from '../objects/courseEndpoints'

export interface CanvasHandle {
  fitToScreen: () => void
  resetView: () => void
  exportPng: (transparent?: boolean, pixelRatio?: number) => string
}

type View = { x: number; y: number; scale: number }
type Point = { x: number; y: number }
type DrawingDraft = { tool: EditorTool; start: Point; points: number[] }

const touchHitStrokeWidth = (interactionScale: number) => 44 / Math.max(interactionScale, 0.01)

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
const SHAPE_CORNER_ANCHORS = ['top-left', 'top-right', 'bottom-left', 'bottom-right']
const NON_SCALABLE_TYPES = new Set<ScenarioObject['type']>([
  'boat',
  'mark',
  'gate',
  'start-line',
  'finish-line',
  'text',
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
  width,
  height,
  size,
  opacity,
  color,
  laylineAngle,
  windDirection,
}: {
  width: number
  height: number
  size: number
  opacity: number
  color: string
  laylineAngle: number
  windDirection: number
}) {
  const segments = useMemo(
    () => sailingGridSegments(width, height, size, laylineAngle, windDirection),
    [height, laylineAngle, size, width, windDirection],
  )
  return (
    <Group
      clipX={0}
      clipY={0}
      clipWidth={width}
      clipHeight={height}
      opacity={opacity}
      listening={false}
    >
      {segments.map((points, index) => (
        <Line
          key={index}
          points={points}
          stroke={color}
          strokeWidth={1.2}
          dash={[4, 7]}
          listening={false}
        />
      ))}
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
}: {
  entries: BoatLegendEntry[]
  canvasHeight: number
  dark: boolean
}) {
  const { t } = useI18n()
  if (!entries.length) return null
  const rowHeight = 48
  const columnWidth = 300
  const maximumRows = Math.max(1, Math.floor((canvasHeight - 112) / rowHeight))
  const rowCount = Math.min(maximumRows, entries.length)
  const columnCount = Math.ceil(entries.length / maximumRows)
  const width = columnCount * columnWidth + 32
  const height = 64 + rowCount * rowHeight
  const x = 24
  const y = Math.max(24, canvasHeight - height - 24)
  const ink = dark ? DARK_PLOT_INK : LIGHT_PLOT_INK
  const mutedInk = dark ? '#C8D0D4' : '#5F6B70'

  return (
    <Group x={x} y={y} listening={false}>
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
          <Group key={entry.sequenceId} x={16 + column * columnWidth} y={56 + row * rowHeight}>
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
              width={columnWidth - 50}
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
                width={columnWidth - 50}
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
  const sternY = (profile.kind === 'vsr' ? 40 : profile.length / 2) * profile.displayScale
  const displayedBoatLength = (profile.kind === 'vsr' ? 86 : profile.length) * profile.displayScale
  const overlapLineLength = displayedBoatLength
  const overlapDirection = object.overlapIndicator === 'port' ? -1 : 1
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
              object.boatClass === 'Jury boat' ? darkenHexColor(JURY_BOAT_GREY) : undefined
            }
          />
        )}
        {profile.mast && object.mainsailVisible && profile.mainsailSize > 0 && (
          <Group x={profile.mast[0]} y={profile.mast[1]} rotation={-sailAngle}>
            <Path
              data={curvedSailPath(
                profile.mainsailSize,
                sailSide(object.heading, windDirection, sailAngle),
                mainsailStalled,
              )}
              fill="#ffffff"
              stroke={outlineColor}
              strokeWidth={0.8}
              opacity={0.94}
            />
            <Line
              points={[0, 0, 0, profile.mainsailSize]}
              stroke={outlineColor}
              strokeWidth={0.65}
            />
          </Group>
        )}
        {profile.jibTack && object.jibVisible && profile.jibSize > 0 && (
          <Group x={profile.jibTack[0]} y={profile.jibTack[1]} rotation={-jibAngle}>
            <Path
              data={curvedSailPath(
                profile.jibSize,
                sailSide(object.heading, windDirection, jibAngle),
                jibStalled,
              )}
              fill="#e5e5e5"
              stroke={outlineColor}
              strokeWidth={0.7}
              opacity={0.94}
            />
          </Group>
        )}
        {profile.jibTack && object.genoaVisible && (profile.genoaSize ?? 0) > 0 && (
          <Group x={profile.jibTack[0]} y={profile.jibTack[1]} rotation={-jibAngle}>
            <Path
              data={genoaPath(
                profile.genoaSize ?? 0,
                sailSide(object.heading, windDirection, jibAngle),
                jibStalled,
              )}
              fill="#F2F2F2"
              stroke={outlineColor}
              strokeWidth={0.75}
              opacity={0.94}
            />
          </Group>
        )}
        {profile.mast && object.spinnakerVisible && profile.spinnakerSize > 0 && (
          <Group x={profile.mast[0]} y={profile.mast[1]} rotation={-spinnakerAngle}>
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
              fill="#ffffff"
              stroke={outlineColor}
              strokeWidth={0.8}
              opacity={0.94}
            />
            <Line
              points={[0, 0, 0, -profile.spinnakerSize]}
              stroke={outlineColor}
              strokeWidth={0.75}
              rotation={spinPoleAngle}
            />
          </Group>
        )}
        {profile.gennakerTack && object.gennakerVisible && profile.gennakerSize > 0 && (
          <Group x={profile.gennakerTack[0]} y={profile.gennakerTack[1]}>
            {profile.poleLength > 0 && (
              <Line
                points={[0, 0, 0, profile.poleLength]}
                stroke={outlineColor}
                strokeWidth={0.8}
              />
            )}
            <Path
              data={gennakerPath(
                profile.gennakerSize,
                sailSide(object.heading, windDirection, gennAngle),
                gennakerStalled,
              )}
              fill="#ffffff"
              stroke={outlineColor}
              strokeWidth={0.8}
              opacity={0.9}
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
      {boatNumbersVisible && (
        <>
          <Circle
            x={profile.numberPos[0] * profile.displayScale}
            y={profile.numberPos[1] * profile.displayScale}
            radius={11}
            fill="#737373"
            stroke={inkColor}
            strokeWidth={1.5}
          />
          <Text
            text={String(object.positionNumber)}
            x={profile.numberPos[0] * profile.displayScale - 11}
            y={profile.numberPos[1] * profile.displayScale - 6.5}
            width={22}
            align="center"
            fill="#ffffff"
            fontSize={16}
            fontStyle="bold"
          />
        </>
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
  const { object, selected, onSelect, onChange, onPreviewChange, inkColor } = props
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
    return (
      <Rect
        id={`object-${object.id}`}
        x={object.x}
        y={object.y}
        width={object.width}
        height={object.height}
        fill={object.fill}
        stroke={visiblePlotColor(object.stroke, inkColor)}
        strokeWidth={object.strokeWidth}
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
    return (
      <Circle
        id={`object-${object.id}`}
        x={object.x}
        y={object.y}
        radius={Math.max(object.width, object.height) / 2}
        fill={object.fill}
        stroke={visiblePlotColor(object.stroke, inkColor)}
        strokeWidth={object.strokeWidth}
        rotation={object.rotation}
        scaleX={object.scaleX}
        scaleY={object.scaleY}
        opacity={object.opacity}
        draggable={!object.locked}
        onClick={onSelect}
        onTap={onSelect}
        onDragMove={(event) => onPreviewChange({ x: event.target.x(), y: event.target.y() })}
        onDragEnd={(event) =>
          onChange({ x: event.target.x(), y: event.target.y() }, 'Moved circle')
        }
        onTransformEnd={(event) => {
          const node = event.target
          const diameter =
            Math.max(object.width, object.height) *
            Math.max(Math.abs(node.scaleX()), Math.abs(node.scaleY()))
          node.scale({ x: 1, y: 1 })
          onChange(
            {
              x: node.x(),
              y: node.y(),
              width: Math.max(8, diameter),
              height: Math.max(8, diameter),
              scaleX: 1,
              scaleY: 1,
            },
            'Resized circle',
          )
        }}
      />
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
}

const EDITOR_BRANDING_MAX_WIDTH = 341.55
const EDITOR_BRANDING_COMPACT_WIDTH = 273.24
const EDITOR_BRANDING_ASPECT_RATIO = 72 / 32
const EDITOR_QR_WIDTH_RATIO = 32 / 72
const EDITOR_BRANDING_PLOT_MARGIN = 12
const EDITOR_BRANDING_VIEWPORT_MARGIN = 6

export const ScenarioCanvas = forwardRef<CanvasHandle, ScenarioCanvasProps>(function ScenarioCanvas(
  { branding, topRightOverlay },
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
  const twoClickCompletion = useRef<DrawingDraft | null>(null)
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
  const brandingRight = Math.min(
    Math.max(
      EDITOR_BRANDING_VIEWPORT_MARGIN,
      size.width - canvasRight + EDITOR_BRANDING_PLOT_MARGIN,
    ),
    Math.max(
      EDITOR_BRANDING_VIEWPORT_MARGIN,
      size.width - brandingWidth - EDITOR_BRANDING_VIEWPORT_MARGIN,
    ),
  )
  const brandingBottom = Math.min(
    Math.max(
      EDITOR_BRANDING_VIEWPORT_MARGIN,
      size.height - canvasBottom + EDITOR_BRANDING_PLOT_MARGIN,
    ),
    Math.max(
      EDITOR_BRANDING_VIEWPORT_MARGIN,
      size.height - brandingHeight - EDITOR_BRANDING_VIEWPORT_MARGIN,
    ),
  )
  const topRightOverlayRight = Math.min(
    Math.max(
      EDITOR_BRANDING_VIEWPORT_MARGIN,
      size.width - canvasRight + EDITOR_BRANDING_PLOT_MARGIN,
    ),
    Math.max(
      EDITOR_BRANDING_VIEWPORT_MARGIN,
      size.width - topRightOverlaySize - EDITOR_BRANDING_VIEWPORT_MARGIN,
    ),
  )
  const topRightOverlayTop = Math.min(
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
  const selectionIsCircle = useMemo(
    () =>
      selectedIds.length === 1 &&
      scenario.objects.some((object) => object.id === selectedIds[0] && object.type === 'circle'),
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
  const displayObjects = useMemo(
    () =>
      orderedObjects.map((object) =>
        dragPreview?.id === object.id
          ? ({ ...object, ...dragPreview.patch } as ScenarioObject)
          : object,
      ),
    [dragPreview, orderedObjects],
  )
  const boatTracks = useMemo(() => {
    const sequences = new Map<string, BoatObject[]>()
    for (const object of displayObjects) {
      if (object.type !== 'boat' || !object.visible) continue
      sequences.set(object.sequenceId, [...(sequences.get(object.sequenceId) ?? []), object])
    }
    return [...sequences.entries()]
      .map(([id, boats]) => ({ id, boats, path: boatSequencePath(boats) }))
      .filter(({ path }) => path)
  }, [displayObjects])
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
      const previous = {
        x: stage.x(),
        y: stage.y(),
        scaleX: stage.scaleX(),
        scaleY: stage.scaleY(),
        width: stage.width(),
        height: stage.height(),
      }
      transformer?.hide()
      if (transparent) background?.hide()
      stage.position({ x: 0, y: 0 })
      stage.scale({ x: 1, y: 1 })
      stage.size({ width: scenario.canvas.width, height: scenario.canvas.height })
      const uri = stage.toDataURL({ pixelRatio, mimeType: 'image/png' })
      stage.position({ x: previous.x, y: previous.y })
      stage.scale({ x: previous.scaleX, y: previous.scaleY })
      stage.size({ width: previous.width, height: previous.height })
      background?.show()
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
  }, [scenario.metadata.id, scenario.canvas.width, scenario.canvas.height, size.width, size.height])

  useEffect(() => {
    const stage = stageRef.current
    const transformer = transformerRef.current
    if (!stage || !transformer) return
    const nodes = selectedIds
      .map((id) => {
        const object = scenario.objects.find((candidate) => candidate.id === id)
        return object?.type === 'mark' ||
          object?.type === 'gate' ||
          object?.type === 'start-line' ||
          object?.type === 'finish-line' ||
          object?.type === 'line' ||
          object?.type === 'arrow'
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
  }, [selectedIds, scenario.objects, selectionCanRotate])

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
      twoClickCompletion.current = null
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
      twoClickCompletion.current = completedDraft
      draftRef.current = completedDraft
      setDraft(completedDraft)
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
      twoClickCompletion.current = null
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
      if (twoClickCompletion.current) twoClickCompletion.current = next
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
    twoClickCompletion.current = null
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
    const scale = Math.min(
      8,
      Math.max(1, view.scale * (distance / Math.max(1, touchGesture.current.distance))),
    )
    const world = {
      x: (touchGesture.current.center.x - view.x) / actualScale,
      y: (touchGesture.current.center.y - view.y) / actualScale,
    }
    const nextScale = fitScale * scale
    const next =
      scale === 1
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

  const completeDraft = (draftToComplete: DrawingDraft) => {
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
      const halfSpan = scenario.canvas.grid.size * (draftToComplete.tool === 'gate' ? 3 : 5)
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
    twoClickCompletion.current = null
    setDraft(null)
    setTool('select')
  }

  const handlePointerUp = () => {
    const currentDraft = draftRef.current
    if (!currentDraft) return
    if (TWO_CLICK_DRAWING_TOOLS.has(currentDraft.tool)) {
      if (twoClickCompletion.current) {
        completeDraft(twoClickCompletion.current)
        return
      }
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
    const scale = Math.min(8, Math.max(1, direction > 0 ? view.scale * 1.08 : view.scale / 1.08))
    const nextScale = fitScale * scale
    const next =
      scale === 1
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
        draggable={activeTool === 'pan' || spacePressed}
        onDragEnd={(event) => {
          if (event.target !== stageRef.current) return
          const next =
            view.scale === 1
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
            width={scenario.canvas.width}
            height={scenario.canvas.height}
            fill={scenario.canvas.background}
            listening={false}
          />
          {scenario.canvas.grid.visible && (
            <Grid
              width={scenario.canvas.width}
              height={scenario.canvas.height}
              size={scenario.canvas.grid.size}
              opacity={scenario.canvas.grid.opacity}
              color={gridColor}
              laylineAngle={scenario.environment.laylineAngle}
              windDirection={scenario.environment.windDirection}
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
              opacity={0.52}
              lineCap="round"
              lineJoin="round"
              listening={false}
            />
          ))}
          {scenario.environment.laylinesVisible &&
            displayObjects
              .filter((object) => object.type === 'mark')
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
            <Group x={120} y={130} listening={false}>
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
                  selected={selectedIds.includes(object.id)}
                  onSelect={(event) => {
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
                    const next = { ...patch }
                    if (scenario.canvas.grid.snap) {
                      const hasX = typeof next.x === 'number'
                      const hasY = typeof next.y === 'number'
                      if (hasX || hasY) {
                        const snapped = snapToSailingGrid(
                          {
                            x: hasX ? next.x! : object.x,
                            y: hasY ? next.y! : object.y,
                          },
                          scenario.canvas.grid.size,
                          scenario.environment.laylineAngle,
                          scenario.environment.windDirection,
                        )
                        if (hasX) next.x = snapped.x
                        if (hasY) next.y = snapped.y
                      }
                    }
                    updateObject(object.id, next, label)
                    if (dragPreview?.id === object.id) setDragPreview(null)
                  }}
                  onPreviewChange={(patch) => setDragPreview({ id: object.id, patch })}
                  windDirection={scenario.environment.windDirection}
                  laylineAngle={scenario.environment.laylineAngle}
                  zoneBoatLength={zoneBoatLength}
                  boatNumbersVisible={scenario.canvas.boatNumbersVisible}
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
            />
          )}
          {draft &&
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
            rotateAnchorOffset={selectionCanRotate ? 50 : 0}
            borderEnabled={selectionCanRotate}
            resizeEnabled={selectionCanScale}
            enabledAnchors={
              selectionIsCircle || selectionIsRectangle
                ? SHAPE_CORNER_ANCHORS
                : DEFAULT_TRANSFORM_ANCHORS
            }
            keepRatio={!selectionIsRectangle}
            centeredScaling={selectionIsCircle}
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
