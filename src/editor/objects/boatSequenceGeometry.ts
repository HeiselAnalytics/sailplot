import type { BoatObject } from '../../types/scenario'

export interface BoatSequencePoint {
  x: number
  y: number
}

export interface BoatSequenceSegment {
  start: BoatSequencePoint
  firstControl: BoatSequencePoint
  secondControl: BoatSequencePoint
  end: BoatSequencePoint
}

const normalizeAngle = (angle: number) => ((angle % 360) + 360) % 360

export function boatSequenceSegment(
  previous: BoatObject,
  current: BoatObject,
): BoatSequenceSegment {
  const deltaX = current.x - previous.x
  const deltaY = current.y - previous.y
  const distance = Math.hypot(deltaX, deltaY)
  const direction = normalizeAngle((Math.atan2(deltaX, -deltaY) * 180) / Math.PI)
  const factor = (distance * 2) / 5
  const previousAngle = normalizeAngle(direction - previous.heading)
  const currentAngle = normalizeAngle(direction - current.heading)
  const previousRadians = (previous.heading * Math.PI) / 180
  const currentRadians = (current.heading * Math.PI) / 180

  return {
    start: { x: previous.x, y: previous.y },
    firstControl:
      previousAngle >= 90 && previousAngle <= 270
        ? { x: previous.x, y: previous.y }
        : {
            x: previous.x + factor * Math.sin(previousRadians),
            y: previous.y - factor * Math.cos(previousRadians),
          },
    secondControl:
      currentAngle >= 90 && currentAngle <= 270
        ? { x: current.x, y: current.y }
        : {
            x: current.x - factor * Math.sin(currentRadians),
            y: current.y + factor * Math.cos(currentRadians),
          },
    end: { x: current.x, y: current.y },
  }
}

export function pointOnBoatSequenceSegment(
  segment: BoatSequenceSegment,
  progress: number,
): BoatSequencePoint {
  const inverse = 1 - progress
  return {
    x:
      inverse ** 3 * segment.start.x +
      3 * inverse ** 2 * progress * segment.firstControl.x +
      3 * inverse * progress ** 2 * segment.secondControl.x +
      progress ** 3 * segment.end.x,
    y:
      inverse ** 3 * segment.start.y +
      3 * inverse ** 2 * progress * segment.firstControl.y +
      3 * inverse * progress ** 2 * segment.secondControl.y +
      progress ** 3 * segment.end.y,
  }
}

const interpolatePoint = (
  from: BoatSequencePoint,
  to: BoatSequencePoint,
  progress: number,
): BoatSequencePoint => ({
  x: from.x + (to.x - from.x) * progress,
  y: from.y + (to.y - from.y) * progress,
})

/** Returns the unchanged prefix of a cubic Bézier segment using de Casteljau subdivision. */
export function partialBoatSequenceSegment(
  segment: BoatSequenceSegment,
  progress: number,
): BoatSequenceSegment {
  const boundedProgress = Math.min(1, Math.max(0, progress))
  const startToFirst = interpolatePoint(segment.start, segment.firstControl, boundedProgress)
  const firstToSecond = interpolatePoint(
    segment.firstControl,
    segment.secondControl,
    boundedProgress,
  )
  const secondToEnd = interpolatePoint(segment.secondControl, segment.end, boundedProgress)
  const firstSubdivision = interpolatePoint(startToFirst, firstToSecond, boundedProgress)
  const secondSubdivision = interpolatePoint(firstToSecond, secondToEnd, boundedProgress)

  return {
    start: segment.start,
    firstControl: startToFirst,
    secondControl: firstSubdivision,
    end: interpolatePoint(firstSubdivision, secondSubdivision, boundedProgress),
  }
}

export function tangentOnBoatSequenceSegment(
  segment: BoatSequenceSegment,
  progress: number,
): BoatSequencePoint {
  const inverse = 1 - progress
  return {
    x:
      3 * inverse ** 2 * (segment.firstControl.x - segment.start.x) +
      6 * inverse * progress * (segment.secondControl.x - segment.firstControl.x) +
      3 * progress ** 2 * (segment.end.x - segment.secondControl.x),
    y:
      3 * inverse ** 2 * (segment.firstControl.y - segment.start.y) +
      6 * inverse * progress * (segment.secondControl.y - segment.firstControl.y) +
      3 * progress ** 2 * (segment.end.y - segment.secondControl.y),
  }
}

const CONSTANT_SPEED_SAMPLES = 32

export function constantSpeedCurveProgress(segment: BoatSequenceSegment, progress: number): number {
  if (progress <= 0 || progress >= 1) return progress

  const samples: Array<{ curveProgress: number; length: number }> = [
    { curveProgress: 0, length: 0 },
  ]
  let previous = segment.start
  let totalLength = 0
  for (let index = 1; index <= CONSTANT_SPEED_SAMPLES; index += 1) {
    const curveProgress = index / CONSTANT_SPEED_SAMPLES
    const point = pointOnBoatSequenceSegment(segment, curveProgress)
    totalLength += Math.hypot(point.x - previous.x, point.y - previous.y)
    samples.push({ curveProgress, length: totalLength })
    previous = point
  }
  if (totalLength === 0) return progress

  const targetLength = totalLength * progress
  const nextIndex = samples.findIndex((sample) => sample.length >= targetLength)
  const next = samples[Math.max(1, nextIndex)]
  const before = samples[Math.max(0, nextIndex - 1)]
  const span = next.length - before.length
  const intervalProgress = span === 0 ? 0 : (targetLength - before.length) / span
  return before.curveProgress + (next.curveProgress - before.curveProgress) * intervalProgress
}

export function headingForBoatSequenceTangent(
  tangent: BoatSequencePoint,
  fallback: number,
): number {
  if (Math.hypot(tangent.x, tangent.y) < 0.000001) return normalizeAngle(fallback)
  return normalizeAngle((Math.atan2(tangent.x, -tangent.y) * 180) / Math.PI)
}
