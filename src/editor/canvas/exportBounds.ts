import type { BoatObject, Scenario, ScenarioObject } from '../../types/scenario'

interface Point {
  x: number
  y: number
}

interface PlotBounds {
  x: number
  y: number
  width: number
  height: number
}

export const BOAT_LEGEND_ROW_HEIGHT = 48
export const BOAT_LEGEND_COLUMN_WIDTH = 300
const BOAT_LEGEND_MARGIN = 24

export const boatLegendLayoutForCount = (entryCount: number, canvasHeight: number) => {
  const maximumRows = Math.max(1, Math.floor((canvasHeight - 112) / BOAT_LEGEND_ROW_HEIGHT))
  const rowCount = Math.min(maximumRows, entryCount)
  const columnCount = Math.ceil(entryCount / maximumRows)
  const width = columnCount * BOAT_LEGEND_COLUMN_WIDTH + 32
  const height = 64 + rowCount * BOAT_LEGEND_ROW_HEIGHT
  return {
    width,
    height,
    x: BOAT_LEGEND_MARGIN,
    y: Math.max(BOAT_LEGEND_MARGIN, canvasHeight - height - BOAT_LEGEND_MARGIN),
  }
}

const transformObjectPoint = (object: ScenarioObject, x: number, y: number): Point => {
  const angle = (object.rotation * Math.PI) / 180
  const scaledX = x * object.scaleX
  const scaledY = y * object.scaleY
  return {
    x: object.x + scaledX * Math.cos(angle) - scaledY * Math.sin(angle),
    y: object.y + scaledX * Math.sin(angle) + scaledY * Math.cos(angle),
  }
}

export const endlessExportBounds = (scenario: Scenario, zoneBoatLength: number): PlotBounds => {
  let minX = 0
  let minY = 0
  let maxX = scenario.canvas.width
  let maxY = scenario.canvas.height
  const include = (x: number, y: number, padding = 0) => {
    minX = Math.min(minX, x - padding)
    minY = Math.min(minY, y - padding)
    maxX = Math.max(maxX, x + padding)
    maxY = Math.max(maxY, y + padding)
  }

  for (const object of scenario.objects) {
    if (!object.visible) continue
    if (object.type === 'boat') {
      include(object.x, object.y, 180)
      continue
    }
    if (object.type === 'mark') {
      const zoneRadius =
        scenario.environment.zonesVisible && object.zoneVisible
          ? object.zoneRadius * zoneBoatLength
          : 0
      const laylineRadius = scenario.environment.laylinesVisible && object.laylinesVisible ? 520 : 0
      include(object.x, object.y, Math.max(72, zoneRadius + 4, laylineRadius))
      continue
    }
    if (object.type === 'gate' || object.type === 'start-line' || object.type === 'finish-line') {
      const endpointPadding =
        object.type === 'gate' && scenario.environment.zonesVisible && object.zoneVisible
          ? object.zoneRadius * zoneBoatLength + 4
          : object.type !== 'gate' && (object.laylinesVisible || object.laylineAreaVisible)
            ? 520
            : 72
      include(object.x + object.endAX, object.y + object.endAY, endpointPadding)
      include(object.x + object.endBX, object.y + object.endBY, endpointPadding)
      continue
    }
    if (object.type === 'text') {
      const lines = object.text.split('\n')
      const width = Math.max(16, ...lines.map((line) => line.length * object.fontSize * 0.68)) + 16
      const height = Math.max(1, lines.length) * object.fontSize * 1.25 + 16
      for (const [x, y] of [
        [0, 0],
        [width, 0],
        [width, height],
        [0, height],
      ]) {
        const point = transformObjectPoint(object, x, y)
        include(point.x, point.y, 4)
      }
      continue
    }
    if (object.type === 'rectangle') {
      for (const [x, y] of [
        [0, 0],
        [object.width, 0],
        [object.width, object.height],
        [0, object.height],
      ]) {
        const point = transformObjectPoint(object, x, y)
        include(point.x, point.y, object.strokeWidth + 2)
      }
      continue
    }
    if (object.type === 'circle') {
      const radius =
        (Math.max(object.width, object.height) / 2) *
        Math.max(Math.abs(object.scaleX), Math.abs(object.scaleY))
      include(object.x, object.y, radius + object.strokeWidth + 2)
      continue
    }
    if (!('points' in object)) continue
    for (let index = 0; index + 1 < object.points.length; index += 2) {
      const point = transformObjectPoint(object, object.points[index], object.points[index + 1])
      include(point.x, point.y, object.strokeWidth + (object.type === 'arrow' ? 16 : 4))
    }
  }

  if (scenario.environment.windVisible) {
    const position = scenario.canvas.windIndicatorPosition ?? { x: 120, y: 130 }
    include(position.x, position.y, 120)
  }
  if (scenario.canvas.boatLegendVisible) {
    const entryCount = new Set(
      scenario.objects
        .filter((object): object is BoatObject => object.type === 'boat' && object.visible)
        .map((object) => object.sequenceId),
    ).size
    if (entryCount > 0) {
      const layout = boatLegendLayoutForCount(entryCount, scenario.canvas.height)
      const position = scenario.canvas.boatLegendPosition ?? { x: layout.x, y: layout.y }
      include(position.x, position.y, BOAT_LEGEND_MARGIN)
      include(position.x + layout.width, position.y + layout.height, BOAT_LEGEND_MARGIN)
    }
  }

  return {
    x: Math.floor(minX),
    y: Math.floor(minY),
    width: Math.max(1, Math.ceil(maxX) - Math.floor(minX)),
    height: Math.max(1, Math.ceil(maxY) - Math.floor(minY)),
  }
}
