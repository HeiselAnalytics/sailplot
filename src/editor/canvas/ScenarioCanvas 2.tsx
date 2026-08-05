import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react'
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
import { createId } from '../../lib/scenario'
import { useEditorStore } from '../../stores/editorStore'
import type { BoatObject, EditorTool, ScenarioObject } from '../../types/scenario'
import {
  automaticGennakerAngle,
  automaticJibAngle,
  automaticSailAngle,
  automaticSpinnakerAngle,
  boatSequencePath,
  BOAT_SHAPES,
  constrainSailAngle,
  curvedSailPath,
  gennakerPath,
  isGennakerStalled,
  isSailStalled,
  longestBoatLengthBasis,
  relativeWindAngle,
  sailSide,
  spinnakerPath,
} from '../objects/boatShapes'
import { laylineVector, sailingGridSegments, snapToSailingGrid } from './gridGeometry'

export interface CanvasHandle {
  fitToScreen: () => void
  resetView: () => void
  exportPng: (transparent?: boolean, pixelRatio?: number) => string
}

type View = { x: number; y: number; scale: number }
type Point = { x: number; y: number }

const DRAWING_TOOLS: EditorTool[] = ['line', 'arrow', 'freehand', 'rectangle', 'circle']
const NON_SCALABLE_TYPES = new Set<ScenarioObject['type']>(['boat', 'mark', 'text'])

function Grid({
  width,
  height,
  size,
  laylineAngle,
  windDirection,
}: {
  width: number
  height: number
  size: number
  laylineAngle: number
  windDirection: number
}) {
  const segments = useMemo(
    () => sailingGridSegments(width, height, size, laylineAngle, windDirection),
    [height, laylineAngle, size, width, windDirection],
  )
  return (
    <Group clipX={0} clipY={0} clipWidth={width} clipHeight={height} listening={false}>
      {segments.map((points, index) => (
        <Line
          key={index}
          points={points}
          stroke="#d7e1e5"
          strokeWidth={1}
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
}: {
  entries: BoatLegendEntry[]
  canvasHeight: number
}) {
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

  return (
    <Group x={x} y={y} listening={false}>
      <Rect
        width={width}
        height={height}
        fill="rgba(255,255,255,0.96)"
        stroke="#171717"
        strokeWidth={2}
        cornerRadius={10}
        shadowColor="rgba(23,23,23,0.18)"
        shadowBlur={12}
        shadowOffsetY={4}
      />
      <Text
        x={16}
        y={15}
        text="BOAT LEGEND"
        fill="#171717"
        fontSize={17}
        fontStyle="bold"
        letterSpacing={1.2}
      />
      <Line points={[16, 45, width - 16, 45]} stroke="#D7DEE1" strokeWidth={1} />
      {entries.map((entry, index) => {
        const column = Math.floor(index / maximumRows)
        const row = index % maximumRows
        const primary = [entry.sailNumber, entry.name].filter(Boolean).join(' · ')
        const secondary = primary ? entry.boatClass : ''
        return (
          <Group key={entry.sequenceId} x={16 + column * columnWidth} y={56 + row * rowHeight}>
            <Rect
              x={0}
              y={3}
              width={26}
              height={26}
              fill={entry.color}
              stroke="#171717"
              strokeWidth={1.5}
              cornerRadius={4}
            />
            <Text
              x={38}
              y={0}
              width={columnWidth - 50}
              text={primary || entry.boatClass}
              fill="#171717"
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
                fill="#5F6B70"
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

function BoatGraphic({
  object,
  selected,
  onSelect,
  onChange,
  windDirection,
  laylineAngle,
}: ObjectGraphicProps) {
  if (object.type !== 'boat') return null
  const profile = BOAT_SHAPES[object.boatClass]
  const downwindSailVisible = object.spinnakerVisible || object.gennakerVisible
  const sailAngle = constrainSailAngle(
    object.sailMode === 'automatic'
      ? automaticSailAngle(
          object.heading,
          windDirection,
          laylineAngle,
          downwindSailVisible ? profile.mainsailSpinMaxAngle : profile.mainsailMaxAngle,
        ) + object.mainsailTrim
      : object.sailAngle,
    object.heading,
    windDirection,
  )
  const jibAngle = constrainSailAngle(
    automaticJibAngle(
      object.heading,
      windDirection,
      laylineAngle,
      downwindSailVisible ? profile.jibSpinMaxAngle : profile.jibMaxAngle,
    ) + object.jibTrim,
    object.heading,
    windDirection,
  )
  const spinnakerAngle = constrainSailAngle(
    automaticSpinnakerAngle(object.heading, windDirection) + object.spinnakerTrim,
    object.heading,
    windDirection,
  )
  const gennAngle = constrainSailAngle(
    automaticGennakerAngle(object.heading, windDirection) + object.gennakerTrim,
    object.heading,
    windDirection,
  )
  const relative = relativeWindAngle(object.heading, windDirection)
  const mainsailStalled = isSailStalled(object.heading, windDirection, sailAngle)
  const jibStalled = isSailStalled(object.heading, windDirection, jibAngle)
  const spinnakerStalled = isSailStalled(object.heading, windDirection, spinnakerAngle)
  const gennakerStalled = isGennakerStalled(object.heading, windDirection, gennAngle)
  const spinPoleRotation =
    relative > 90 && relative < 180 ? 90 : relative >= 180 && relative < 270 ? -90 : relative
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
      onDragEnd={(event) => onChange({ x: event.target.x(), y: event.target.y() }, 'Moved boat')}
      onTransformEnd={(event) => {
        const node = event.target
        onChange(
          {
            x: node.x(),
            y: node.y(),
            heading: ((node.rotation() % 360) + 360) % 360,
            rotation: ((node.rotation() % 360) + 360) % 360,
          },
          'Transformed boat',
        )
      }}
    >
      <Rect x={-52} y={-62} width={104} height={128} fill="transparent" />
      <Group scaleX={profile.displayScale} scaleY={profile.displayScale}>
        <Path
          data={profile.hullPath}
          fill={object.color}
          stroke={profile.kind === 'vsr' ? '#0D639F' : '#171717'}
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
              stroke="#171717"
              strokeWidth={1}
            />
            <Line points={[-6, 8, 6, 8]} stroke="#737373" strokeWidth={1} />
          </>
        )}
        {profile.kind === 'vsr' && (
          <>
            <Path
              data="M -1.4 -42 L 1.4 -42 C 3.5 -37 4.8 -30 5.3 -23 C 5.5 -18 5.5 -11 5.5 -5 L 5.5 40 L -5.5 40 L -5.5 -5 C -5.5 -11 -5.5 -18 -5.3 -23 C -4.8 -30 -3.5 -37 -1.4 -42 Z"
              fill="#737A82"
              stroke="#565D63"
              strokeWidth={1}
            />
            <Rect
              x={-4}
              y={-2}
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
        )}
        {profile.kind === 'board' && (
          <Line points={[0, -20, 0, 24]} stroke="#171717" strokeWidth={1} opacity={0.55} />
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
              stroke="#171717"
              strokeWidth={0.8}
              opacity={0.94}
            />
            <Line points={[0, 0, 0, profile.mainsailSize]} stroke="#171717" strokeWidth={0.65} />
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
              stroke="#171717"
              strokeWidth={0.7}
              opacity={0.94}
            />
          </Group>
        )}
        {profile.mast && object.spinnakerVisible && profile.spinnakerSize > 0 && (
          <Group x={profile.mast[0]} y={profile.mast[1]} rotation={-spinnakerAngle}>
            <Line
              points={[0, 0, 0, -profile.spinnakerSize]}
              stroke="#171717"
              strokeWidth={0.75}
              rotation={spinnakerAngle - relative + spinPoleRotation}
            />
            <Path
              data={spinnakerPath(
                profile.spinnakerSize,
                sailSide(object.heading, windDirection, spinnakerAngle),
                spinnakerStalled,
              )}
              fill="#ffffff"
              stroke="#171717"
              strokeWidth={0.8}
              opacity={0.94}
            />
          </Group>
        )}
        {profile.gennakerTack && object.gennakerVisible && profile.gennakerSize > 0 && (
          <Group x={profile.gennakerTack[0]} y={profile.gennakerTack[1]}>
            {profile.poleLength > 0 && (
              <Line points={[0, 0, 0, profile.poleLength]} stroke="#171717" strokeWidth={0.8} />
            )}
            <Path
              data={gennakerPath(
                profile.gennakerSize,
                sailSide(object.heading, windDirection, gennAngle),
                gennakerStalled,
              )}
              fill="#ffffff"
              stroke="#171717"
              strokeWidth={0.8}
              opacity={0.9}
              rotation={-gennAngle}
            />
          </Group>
        )}
      </Group>
      <Circle
        x={profile.numberPos[0] * profile.displayScale}
        y={profile.numberPos[1] * profile.displayScale}
        radius={11}
        fill="#737373"
        stroke="#171717"
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
      {selected && (
        <Rect
          x={-48}
          y={-58}
          width={96}
          height={118}
          cornerRadius={6}
          stroke="#171717"
          dash={[5, 5]}
          strokeWidth={1}
          listening={false}
        />
      )}
    </Group>
  )
}

function MarkGraphic({ object, selected, onSelect, onChange, zoneBoatLength }: ObjectGraphicProps) {
  if (object.type !== 'mark') return null
  const isFlag = object.shape === 'flag' || object.shape === 'pin'
  const labelX = isFlag ? 10 : 0
  const labelY = isFlag ? -18 : 0
  const labelWidth = isFlag ? 24 : 36
  const labelFontSize = object.label.length <= 2 ? 14 : object.label.length <= 4 ? 10 : 8
  const normalizedColor = object.color.replace('#', '')
  const colorValue = /^[0-9a-f]{6}$/i.test(normalizedColor)
    ? Number.parseInt(normalizedColor, 16)
    : 0xffaa00
  const red = (colorValue >> 16) & 0xff
  const green = (colorValue >> 8) & 0xff
  const blue = colorValue & 0xff
  const labelColor = red * 0.299 + green * 0.587 + blue * 0.114 > 150 ? '#171717' : '#ffffff'

  return (
    <Group
      id={`object-${object.id}`}
      x={object.x}
      y={object.y}
      rotation={object.rotation}
      opacity={object.opacity}
      draggable={!object.locked}
      onClick={onSelect}
      onTap={onSelect}
      onDragEnd={(event) => onChange({ x: event.target.x(), y: event.target.y() }, 'Moved mark')}
      onTransformEnd={(event) => {
        const node = event.target
        onChange(
          {
            x: node.x(),
            y: node.y(),
            rotation: node.rotation(),
          },
          'Transformed mark',
        )
      }}
    >
      {object.zoneVisible && (
        <Circle
          radius={object.zoneRadius * zoneBoatLength}
          fill={object.color}
          opacity={0.08}
          stroke={object.color}
          dash={[10, 8]}
          strokeWidth={2}
        />
      )}
      {object.shape === 'round' ? (
        <Circle
          radius={18}
          fill={object.color}
          stroke="#171717"
          strokeWidth={2}
          hitStrokeWidth={28}
        />
      ) : object.shape === 'flag' || object.shape === 'pin' ? (
        <>
          <Line points={[0, 20, 0, -28]} stroke="#171717" strokeWidth={3} />
          <Line
            points={[0, -28, 28, -18, 0, -8]}
            closed
            fill={object.color}
            stroke="#171717"
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
          fill={object.color}
          stroke="#171717"
          strokeWidth={2}
        />
      )}
      {object.label && (
        <Group x={labelX} y={labelY} rotation={-object.rotation} listening={false}>
          <Text
            text={object.label}
            x={-labelWidth / 2}
            y={-labelFontSize * 0.65}
            width={labelWidth}
            align="center"
            fill={labelColor}
            fontSize={labelFontSize}
            fontStyle="bold"
          />
        </Group>
      )}
      {selected && (
        <Circle radius={32} stroke="#171717" dash={[5, 5]} strokeWidth={1} listening={false} />
      )}
    </Group>
  )
}

interface ObjectGraphicProps {
  object: ScenarioObject
  selected: boolean
  onSelect: (event: KonvaEventObject<MouseEvent | TouchEvent>) => void
  onChange: (patch: Partial<ScenarioObject>, label: string) => void
  windDirection: number
  laylineAngle: number
  zoneBoatLength: number
}

function ObjectGraphic(props: ObjectGraphicProps) {
  const { object, selected, onSelect, onChange } = props
  if (object.type === 'boat') return <BoatGraphic {...props} />
  if (object.type === 'mark') return <MarkGraphic {...props} />
  if (object.type === 'text') {
    return (
      <Text
        id={`object-${object.id}`}
        x={object.x}
        y={object.y}
        text={object.text}
        fill={object.color}
        fontSize={object.fontSize}
        fontStyle={object.fontWeight}
        align={object.align}
        rotation={object.rotation}
        opacity={object.opacity}
        padding={8}
        draggable={!object.locked}
        stroke={selected ? '#171717' : undefined}
        strokeWidth={selected ? 0.5 : 0}
        onClick={onSelect}
        onTap={onSelect}
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
        stroke={object.stroke}
        strokeWidth={object.strokeWidth}
        rotation={object.rotation}
        scaleX={object.scaleX}
        scaleY={object.scaleY}
        opacity={object.opacity}
        draggable={!object.locked}
        onClick={onSelect}
        onTap={onSelect}
        onDragEnd={(event) =>
          onChange({ x: event.target.x(), y: event.target.y() }, 'Moved rectangle')
        }
      />
    )
  }
  if (object.type === 'circle') {
    return (
      <Circle
        id={`object-${object.id}`}
        x={object.x}
        y={object.y}
        radiusX={object.width / 2}
        radiusY={object.height / 2}
        fill={object.fill}
        stroke={object.stroke}
        strokeWidth={object.strokeWidth}
        rotation={object.rotation}
        scaleX={object.scaleX}
        scaleY={object.scaleY}
        opacity={object.opacity}
        draggable={!object.locked}
        onClick={onSelect}
        onTap={onSelect}
        onDragEnd={(event) =>
          onChange({ x: event.target.x(), y: event.target.y() }, 'Moved circle')
        }
      />
    )
  }
  if (!('points' in object)) return null
  const Component = object.type === 'arrow' ? Arrow : Line
  return (
    <Component
      id={`object-${object.id}`}
      x={object.x}
      y={object.y}
      points={object.points}
      stroke={object.stroke}
      fill={object.stroke}
      strokeWidth={object.strokeWidth}
      dash={object.dash}
      lineCap="round"
      lineJoin="round"
      tension={object.type === 'freehand' ? 0.35 : 0}
      pointerLength={object.type === 'arrow' ? 14 : undefined}
      pointerWidth={object.type === 'arrow' ? 12 : undefined}
      hitStrokeWidth={24}
      rotation={object.rotation}
      scaleX={object.scaleX}
      scaleY={object.scaleY}
      opacity={object.opacity}
      draggable={!object.locked}
      onClick={onSelect}
      onTap={onSelect}
      onDragEnd={(event) =>
        onChange({ x: event.target.x(), y: event.target.y() }, `Moved ${object.type}`)
      }
    />
  )
}

export const ScenarioCanvas = forwardRef<CanvasHandle>(function ScenarioCanvas(_, ref) {
  const containerRef = useRef<HTMLDivElement>(null)
  const stageRef = useRef<Konva.Stage>(null)
  const transformerRef = useRef<Konva.Transformer>(null)
  const [size, setSize] = useState({ width: 800, height: 600 })
  const [view, setView] = useState<View>({ x: 0, y: 0, scale: 1 })
  const [draft, setDraft] = useState<{ tool: EditorTool; start: Point; points: number[] } | null>(
    null,
  )
  const [spacePressed, setSpacePressed] = useState(false)
  const touchGesture = useRef<{ distance: number; center: Point } | null>(null)
  const scenario = useEditorStore((state) => state.scenario)
  const selectedIds = useEditorStore((state) => state.selectedIds)
  const activeTool = useEditorStore((state) => state.activeTool)
  const addAt = useEditorStore((state) => state.addAt)
  const addObject = useEditorStore((state) => state.addObject)
  const select = useEditorStore((state) => state.select)
  const updateObject = useEditorStore((state) => state.updateObject)
  const updateCanvas = useEditorStore((state) => state.updateCanvas)
  const setTool = useEditorStore((state) => state.setTool)
  const fitScale = Math.max(0.01, size.width / scenario.canvas.width)
  const actualScale = fitScale * view.scale
  const layline = laylineVector(scenario.environment.laylineAngle, 500)
  const zoneBoatLength = useMemo(
    () => longestBoatLengthBasis(scenario.objects).length,
    [scenario.objects],
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

  const orderedObjects = useMemo(
    () => [...scenario.objects].sort((a, b) => a.zIndex - b.zIndex),
    [scenario.objects],
  )
  const boatTracks = useMemo(() => {
    const sequences = new Map<string, BoatObject[]>()
    for (const object of scenario.objects) {
      if (object.type !== 'boat' || !object.visible) continue
      sequences.set(object.sequenceId, [...(sequences.get(object.sequenceId) ?? []), object])
    }
    return [...sequences.entries()]
      .map(([id, boats]) => ({ id, boats, path: boatSequencePath(boats) }))
      .filter(({ path }) => path)
  }, [scenario.objects])
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
      x: 0,
      y: Math.max(0, (size.height - scenario.canvas.height * fitScale) / 2),
      scale: 1,
    }
    setView(next)
    updateCanvas({ view: next })
  }

  useImperativeHandle(ref, () => ({
    fitToScreen,
    resetView: () => {
      const next = {
        x: 0,
        y: Math.max(0, (size.height - scenario.canvas.height * fitScale) / 2),
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
    if (size.width && scenario.canvas.view.scale <= 1) fitToScreen()
    else setView(scenario.canvas.view)
    // Fit only when a project is first opened or the container gets its initial measurement.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scenario.metadata.id, size.width === 800])

  useEffect(() => {
    const stage = stageRef.current
    const transformer = transformerRef.current
    if (!stage || !transformer) return
    const nodes = selectedIds
      .map((id) => stage.findOne(`#object-${id}`))
      .filter((node): node is Konva.Node => Boolean(node))
    transformer.nodes(nodes)
    transformer.getLayer()?.batchDraw()
  }, [selectedIds, scenario.objects])

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

  const canvasPoint = (): Point | null => {
    const pointer = stageRef.current?.getPointerPosition()
    return pointer
      ? { x: (pointer.x - view.x) / actualScale, y: (pointer.y - view.y) / actualScale }
      : null
  }

  const handlePointerDown = (event: KonvaEventObject<MouseEvent | TouchEvent>) => {
    const empty = event.target === event.target.getStage()
    const point = canvasPoint()
    if (!point || !empty || activeTool === 'pan' || spacePressed) return
    if (activeTool === 'select') {
      select(null)
      return
    }
    if (activeTool === 'boat' || activeTool === 'mark') {
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
          text: 'Annotation',
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
    if (DRAWING_TOOLS.includes(activeTool))
      setDraft({ tool: activeTool, start: point, points: [point.x, point.y, point.x, point.y] })
  }

  const handlePointerMove = () => {
    if (!draft) return
    const point = canvasPoint()
    if (!point) return
    setDraft((current) =>
      current
        ? {
            ...current,
            points:
              current.tool === 'freehand'
                ? [...current.points, point.x, point.y]
                : [current.start.x, current.start.y, point.x, point.y],
          }
        : null,
    )
  }

  const handleTouchStart = (event: KonvaEventObject<TouchEvent>) => {
    if (event.evt.touches.length !== 2) {
      handlePointerDown(event)
      return
    }
    event.evt.preventDefault()
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
            x: 0,
            y: Math.max(0, (size.height - scenario.canvas.height * fitScale) / 2),
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

  const handlePointerUp = () => {
    if (!draft) return
    const [x1, y1, x2, y2] =
      draft.points.length > 4
        ? [draft.points[0], draft.points[1], draft.points.at(-2)!, draft.points.at(-1)!]
        : draft.points
    const base = {
      id: createId(),
      x: 0,
      y: 0,
      rotation: 0,
      scaleX: 1,
      scaleY: 1,
      visible: true,
      locked: false,
      zIndex: orderedObjects.length + 1,
      opacity: 1,
    }
    if (draft.tool === 'rectangle' || draft.tool === 'circle') {
      addObject(
        {
          ...base,
          type: draft.tool,
          x: Math.min(x1, x2),
          y: Math.min(y1, y2),
          width: Math.max(8, Math.abs(x2 - x1)),
          height: Math.max(8, Math.abs(y2 - y1)),
          stroke: '#171717',
          strokeWidth: 3,
          fill: 'rgba(255,170,0,0.12)',
        },
        `Added ${draft.tool}`,
      )
    } else {
      addObject(
        {
          ...base,
          type: draft.tool as 'line' | 'arrow' | 'freehand',
          points: draft.points,
          stroke: '#171717',
          strokeWidth: 4,
          dash: [],
        },
        `Added ${draft.tool}`,
      )
    }
    setDraft(null)
    setTool('select')
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
            x: 0,
            y: Math.max(0, (size.height - scenario.canvas.height * fitScale) / 2),
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
    <div ref={containerRef} className="editor-canvas" aria-label="Sailing scenario canvas">
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
                  x: 0,
                  y: Math.max(0, (size.height - scenario.canvas.height * fitScale) / 2),
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
              laylineAngle={scenario.environment.laylineAngle}
              windDirection={scenario.environment.windDirection}
            />
          )}
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
            orderedObjects
              .filter((object) => object.type === 'mark')
              .map((mark) => (
                <Group
                  key={`laylines-${mark.id}`}
                  x={mark.x}
                  y={mark.y}
                  rotation={scenario.environment.windDirection}
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
            <Group x={120} y={130} rotation={scenario.environment.windDirection} listening={false}>
              <Circle x={0} y={-72} radius={6} fill="#FFAA00" stroke="#171717" strokeWidth={2} />
              <Arrow
                points={[0, -62, 0, 72]}
                stroke="#171717"
                fill="#171717"
                strokeWidth={5}
                pointerLength={18}
                pointerWidth={16}
              />
              <Text
                text={`WIND FROM${scenario.environment.windStrength ? ` · ${scenario.environment.windStrength}` : ''}`}
                x={-70}
                y={-104}
                width={140}
                align="center"
                fill="#171717"
                fontSize={15}
                fontStyle="bold"
                rotation={-scenario.environment.windDirection}
              />
            </Group>
          )}
          {orderedObjects
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
                    select(object.id, 'shiftKey' in event.evt && event.evt.shiftKey)
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
                  }}
                  windDirection={scenario.environment.windDirection}
                  laylineAngle={scenario.environment.laylineAngle}
                  zoneBoatLength={zoneBoatLength}
                />
              )
            })}
          <BoatLegend entries={boatLegendEntries} canvasHeight={scenario.canvas.height} />
          {draft &&
            (draft.tool === 'rectangle' ? (
              <Rect
                x={Math.min(draft.points[0], draft.points[2])}
                y={Math.min(draft.points[1], draft.points[3])}
                width={Math.abs(draft.points[2] - draft.points[0])}
                height={Math.abs(draft.points[3] - draft.points[1])}
                stroke="#171717"
                dash={[8, 6]}
              />
            ) : draft.tool === 'circle' ? (
              <Circle
                x={draft.points[0]}
                y={draft.points[1]}
                radiusX={Math.abs(draft.points[2] - draft.points[0])}
                radiusY={Math.abs(draft.points[3] - draft.points[1])}
                stroke="#171717"
                dash={[8, 6]}
              />
            ) : draft.tool === 'arrow' ? (
              <Arrow
                points={draft.points}
                stroke="#171717"
                fill="#171717"
                strokeWidth={4}
                pointerLength={14}
                pointerWidth={12}
              />
            ) : (
              <Line
                points={draft.points}
                stroke="#171717"
                strokeWidth={4}
                lineCap="round"
                lineJoin="round"
                tension={draft.tool === 'freehand' ? 0.35 : 0}
              />
            ))}
          <Transformer
            ref={transformerRef}
            rotateEnabled
            resizeEnabled={selectionCanScale}
            anchorSize={18}
            borderStroke="#171717"
            borderDash={[5, 5]}
            anchorFill="#FFAA00"
            anchorStroke="#171717"
            anchorCornerRadius={4}
          />
        </Layer>
      </Stage>
    </div>
  )
})
