export interface GridPoint {
  x: number
  y: number
}

export type GridSegment = [number, number, number, number]

const radians = (degrees: number) => (degrees * Math.PI) / 180

const rotate = (point: GridPoint, degrees: number): GridPoint => {
  const angle = radians(degrees)
  const cosine = Math.cos(angle)
  const sine = Math.sin(angle)
  return {
    x: point.x * cosine - point.y * sine,
    y: point.x * sine + point.y * cosine,
  }
}

export const laylineVector = (angle: number, length: number): GridPoint => {
  const theta = radians(angle)
  return { x: Math.sin(theta) * length, y: Math.cos(theta) * length }
}

export const markLaylineRotation = (windDirection: number, downwind: boolean) =>
  (((windDirection + (downwind ? 180 : 0)) % 360) + 360) % 360

export interface CourseLineLaylineGeometry {
  endsA: [GridPoint, GridPoint]
  endsB: [GridPoint, GridPoint]
  area: [GridPoint, GridPoint, GridPoint, GridPoint]
}

const dot = (left: GridPoint, right: GridPoint) => left.x * right.x + left.y * right.y

export function courseLineLaylineGeometry(
  startA: GridPoint,
  startB: GridPoint,
  laylineAngle: number,
  windDirection: number,
  length: number,
): CourseLineLaylineGeometry {
  const base = laylineVector(laylineAngle, 1)
  const starboard = rotate(base, windDirection)
  const port = rotate({ x: -base.x, y: base.y }, windDirection)
  const endpoint = (start: GridPoint, direction: GridPoint) => ({
    x: start.x + direction.x * length,
    y: start.y + direction.y * length,
  })
  const endsA: [GridPoint, GridPoint] = [endpoint(startA, starboard), endpoint(startA, port)]
  const endsB: [GridPoint, GridPoint] = [endpoint(startB, starboard), endpoint(startB, port)]

  // Left and right are determined from a viewer standing to leeward and looking upwind.
  const crosswindRight = rotate({ x: 1, y: 0 }, windDirection)
  const aIsLeft = dot(startA, crosswindRight) <= dot(startB, crosswindRight)
  const leftStart = aIsLeft ? startA : startB
  const rightStart = aIsLeft ? startB : startA
  const towardRight = { x: rightStart.x - leftStart.x, y: rightStart.y - leftStart.y }
  const leftInnerDirection =
    dot(starboard, towardRight) >= dot(port, towardRight) ? starboard : port
  const rightOuterDirection = leftInnerDirection

  return {
    endsA,
    endsB,
    area: [
      leftStart,
      rightStart,
      endpoint(rightStart, rightOuterDirection),
      endpoint(leftStart, leftInnerDirection),
    ],
  }
}

export function sailingGridSegments(
  width: number,
  height: number,
  size: number,
  laylineAngle: number,
  windDirection: number,
): GridSegment[] {
  const safeSize = Math.max(8, size)
  const starboard = rotate(laylineVector(laylineAngle, 1), windDirection)
  const portBase = laylineVector(laylineAngle, 1)
  const port = rotate({ x: -portBase.x, y: portBase.y }, windDirection)
  const determinant = Math.abs(starboard.x * port.y - starboard.y * port.x)
  const directions = determinant < 0.01 ? [starboard] : [starboard, port]
  const naturalSpacing = safeSize * determinant
  const spacing = naturalSpacing < 1 ? safeSize : naturalSpacing
  const extent = Math.hypot(width, height)
  const estimatedLines = (directions.length * extent * 2) / spacing
  const step = Math.max(1, Math.ceil(estimatedLines / 500))
  const segments: GridSegment[] = []

  for (const direction of directions) {
    const normal = { x: -direction.y, y: direction.x }
    const limit = Math.ceil(extent / spacing)
    for (let index = -limit; index <= limit; index += step) {
      const offset = index * spacing
      const origin = { x: normal.x * offset, y: normal.y * offset }
      segments.push([
        origin.x - direction.x * extent,
        origin.y - direction.y * extent,
        origin.x + direction.x * extent,
        origin.y + direction.y * extent,
      ])
    }
  }

  return segments
}

export function sailingGridSegmentsForBounds(
  x: number,
  y: number,
  width: number,
  height: number,
  size: number,
  laylineAngle: number,
  windDirection: number,
): GridSegment[] {
  const safeSize = Math.max(8, size)
  const starboard = rotate(laylineVector(laylineAngle, 1), windDirection)
  const portBase = laylineVector(laylineAngle, 1)
  const port = rotate({ x: -portBase.x, y: portBase.y }, windDirection)
  const determinant = Math.abs(starboard.x * port.y - starboard.y * port.x)
  const directions = determinant < 0.01 ? [starboard] : [starboard, port]
  const naturalSpacing = safeSize * determinant
  const spacing = naturalSpacing < 1 ? safeSize : naturalSpacing
  const center = { x: x + width / 2, y: y + height / 2 }
  const extent = Math.hypot(width, height)
  const estimatedLines = (directions.length * extent * 2) / spacing
  const step = Math.max(1, Math.ceil(estimatedLines / 500))
  const segments: GridSegment[] = []

  for (const direction of directions) {
    const normal = { x: -direction.y, y: direction.x }
    const normalCenter = dot(normal, center)
    const alongCenter = dot(direction, center)
    const firstIndex = Math.floor((normalCenter - extent) / spacing)
    const lastIndex = Math.ceil((normalCenter + extent) / spacing)
    for (let index = firstIndex; index <= lastIndex; index += step) {
      const offset = index * spacing
      const lineCenter = {
        x: normal.x * offset + direction.x * alongCenter,
        y: normal.y * offset + direction.y * alongCenter,
      }
      segments.push([
        lineCenter.x - direction.x * extent,
        lineCenter.y - direction.y * extent,
        lineCenter.x + direction.x * extent,
        lineCenter.y + direction.y * extent,
      ])
    }
  }

  return segments
}
