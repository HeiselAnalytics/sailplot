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
  ((windDirection + (downwind ? 180 : 0)) % 360 + 360) % 360

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

export function snapToSailingGrid(
  point: GridPoint,
  size: number,
  laylineAngle: number,
  windDirection: number,
): GridPoint {
  const safeSize = Math.max(8, size)
  const starboard = rotate(laylineVector(laylineAngle, safeSize), windDirection)
  const portBase = laylineVector(laylineAngle, safeSize)
  const port = rotate({ x: -portBase.x, y: portBase.y }, windDirection)
  const determinant = starboard.x * port.y - starboard.y * port.x
  if (Math.abs(determinant) < 0.01) return point

  const starboardSteps = Math.round((point.x * port.y - point.y * port.x) / determinant)
  const portSteps = Math.round((starboard.x * point.y - starboard.y * point.x) / determinant)
  return {
    x: starboardSteps * starboard.x + portSteps * port.x,
    y: starboardSteps * starboard.y + portSteps * port.y,
  }
}
