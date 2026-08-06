import type { ScenarioObject } from '../../types/scenario'

export interface LineMetrics {
  lengthBoatLengths: number
  angleToWind: number
}

const isCourseLine = (object: ScenarioObject) =>
  object.type === 'gate' || object.type === 'start-line' || object.type === 'finish-line'

const transformedVector = (
  dx: number,
  dy: number,
  rotation: number,
  scaleX: number,
  scaleY: number,
) => {
  const radians = (rotation * Math.PI) / 180
  const scaledX = dx * scaleX
  const scaledY = dy * scaleY
  return {
    x: scaledX * Math.cos(radians) - scaledY * Math.sin(radians),
    y: scaledX * Math.sin(radians) + scaledY * Math.cos(radians),
  }
}

export function lineMetrics(
  object: ScenarioObject,
  windDirection: number,
  boatLength: number,
): LineMetrics | null {
  const points = isCourseLine(object)
    ? [object.endAX, object.endAY, object.endBX, object.endBY]
    : object.type === 'line' || object.type === 'arrow' || object.type === 'freehand'
      ? object.points
      : null
  if (!points || points.length < 4 || boatLength <= 0) return null

  let length = 0
  for (let index = 0; index <= points.length - 4; index += 2) {
    const segment = transformedVector(
      points[index + 2] - points[index],
      points[index + 3] - points[index + 1],
      object.rotation,
      object.scaleX,
      object.scaleY,
    )
    length += Math.hypot(segment.x, segment.y)
  }

  const direction = transformedVector(
    points.at(-2)! - points[0],
    points.at(-1)! - points[1],
    object.rotation,
    object.scaleX,
    object.scaleY,
  )
  if (Math.hypot(direction.x, direction.y) < Number.EPSILON) return null

  const heading = ((Math.atan2(direction.x, -direction.y) * 180) / Math.PI + 360) % 360
  const signedDifference = ((heading - windDirection + 540) % 360) - 180
  const axisDifference = Math.min(Math.abs(signedDifference), 180 - Math.abs(signedDifference))
  const deviationFromSquare = 90 - axisDifference

  return {
    lengthBoatLengths: length / boatLength,
    angleToWind: deviationFromSquare,
  }
}
