import type { BoatObject, ScenarioObject } from '../../types/scenario'
import {
  boatSequenceSegment,
  constantSpeedCurveProgress,
  headingForBoatSequenceTangent,
  partialBoatSequenceSegment,
  pointOnBoatSequenceSegment,
  tangentOnBoatSequenceSegment,
  type BoatSequenceSegment,
} from '../../editor/objects/boatSequenceGeometry'

export const PLAYBACK_SEGMENT_DURATION_MS = 1500

const clamp = (value: number, minimum: number, maximum: number) =>
  Math.min(maximum, Math.max(minimum, value))

export const interpolateAngle = (from: number, to: number, progress: number) => {
  const difference = ((((to - from) % 360) + 540) % 360) - 180
  return (((from + difference * progress) % 360) + 360) % 360
}

export const playbackLastPosition = (objects: ScenarioObject[]) =>
  Math.max(
    1,
    ...objects
      .filter((object): object is BoatObject => object.type === 'boat')
      .map((boat) => boat.positionNumber),
  )

export const hasPlayableBoatSequence = (objects: ScenarioObject[]) => {
  const positionsBySequence = new Map<string, number>()
  for (const object of objects) {
    if (object.type !== 'boat') continue
    positionsBySequence.set(
      object.sequenceId,
      Math.max(positionsBySequence.get(object.sequenceId) ?? 0, object.positionNumber),
    )
  }
  return [...positionsBySequence.values()].some((position) => position > 1)
}

export const boatsAtPlaybackPosition = (
  objects: ScenarioObject[],
  playbackPosition: number,
): BoatObject[] => {
  const sequences = new Map<string, BoatObject[]>()
  for (const object of objects) {
    if (object.type !== 'boat' || !object.visible) continue
    sequences.set(object.sequenceId, [...(sequences.get(object.sequenceId) ?? []), object])
  }

  return [...sequences.values()].map((sequence) => {
    const boats = sequence.sort((first, second) => first.positionNumber - second.positionNumber)
    const maximum = boats.at(-1)?.positionNumber ?? 1
    const position = clamp(playbackPosition, boats[0]?.positionNumber ?? 1, maximum)
    const from = [...boats].reverse().find((boat) => boat.positionNumber <= position) ?? boats[0]
    const to = boats.find((boat) => boat.positionNumber >= position) ?? boats.at(-1)!
    const span = Math.max(1, to.positionNumber - from.positionNumber)
    const progress = from.id === to.id ? 0 : (position - from.positionNumber) / span
    const segment = boatSequenceSegment(from, to)
    const curveProgress = constantSpeedCurveProgress(segment, progress)
    const point = pointOnBoatSequenceSegment(segment, curveProgress)
    const tangent = tangentOnBoatSequenceSegment(segment, curveProgress)
    const heading =
      progress <= 0
        ? from.heading
        : progress >= 1
          ? to.heading
          : headingForBoatSequenceTangent(
              tangent,
              interpolateAngle(from.heading, to.heading, progress),
            )

    return {
      ...(progress >= 1 ? to : from),
      id: boats[0].id,
      x: point.x,
      y: point.y,
      heading,
      rotation: heading,
      locked: true,
      positionNumber: Math.min(maximum, Math.floor(position)),
    }
  })
}

export const objectsAtPlaybackPosition = (
  objects: ScenarioObject[],
  playbackPosition: number,
): ScenarioObject[] =>
  [
    ...objects
      .filter((object) => object.type !== 'boat')
      .map((object) => ({ ...object, locked: true })),
    ...boatsAtPlaybackPosition(objects, playbackPosition),
  ].sort((first, second) => first.zIndex - second.zIndex)

export const boatTailsAtPlaybackPosition = (
  objects: ScenarioObject[],
  playbackPosition: number,
) => {
  const currentBoats = new Map(
    boatsAtPlaybackPosition(objects, playbackPosition).map((boat) => [boat.sequenceId, boat]),
  )
  const sequences = new Map<string, BoatObject[]>()
  for (const object of objects) {
    if (object.type !== 'boat' || !object.visible) continue
    sequences.set(object.sequenceId, [...(sequences.get(object.sequenceId) ?? []), object])
  }

  const pathCommand = (segment: BoatSequenceSegment) =>
    ` C ${segment.firstControl.x} ${segment.firstControl.y} ${segment.secondControl.x} ${segment.secondControl.y} ${segment.end.x} ${segment.end.y}`

  return [...sequences.entries()].map(([id, sequence]) => {
    const ordered = [...sequence].sort(
      (first, second) => first.positionNumber - second.positionNumber,
    )
    const firstPosition = ordered[0]?.positionNumber ?? 1
    const lastPosition = ordered.at(-1)?.positionNumber ?? firstPosition
    const position = clamp(playbackPosition, firstPosition, lastPosition)
    const current = currentBoats.get(id)
    const passed = ordered.filter((boat) => boat.positionNumber <= position)
    const atWaypoint = passed.at(-1)?.positionNumber === position
    const boats = current && !atWaypoint ? [...passed, current] : passed
    let path = ordered.length ? `M ${ordered[0].x} ${ordered[0].y}` : ''
    let hasSegment = false

    for (let index = 1; index < ordered.length; index += 1) {
      const from = ordered[index - 1]
      const to = ordered[index]
      const segment = boatSequenceSegment(from, to)
      if (to.positionNumber <= position) {
        path += pathCommand(segment)
        hasSegment = true
        continue
      }
      if (from.positionNumber < position) {
        const timelineProgress =
          (position - from.positionNumber) / (to.positionNumber - from.positionNumber)
        const curveProgress = constantSpeedCurveProgress(segment, timelineProgress)
        path += pathCommand(partialBoatSequenceSegment(segment, curveProgress))
        hasSegment = true
      }
      break
    }

    return { id, boats, path: hasSegment ? path : '' }
  })
}
