import type { BoatObject, ScenarioObject } from '../../types/scenario'

export const PLAYBACK_SEGMENT_DURATION_MS = 1500

const clamp = (value: number, minimum: number, maximum: number) =>
  Math.min(maximum, Math.max(minimum, value))

const interpolate = (from: number, to: number, progress: number) => from + (to - from) * progress

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

    return {
      ...(progress >= 1 ? to : from),
      id: boats[0].id,
      x: interpolate(from.x, to.x, progress),
      y: interpolate(from.y, to.y, progress),
      heading: interpolateAngle(from.heading, to.heading, progress),
      rotation: interpolateAngle(from.rotation, to.rotation, progress),
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
    if (object.type !== 'boat' || !object.visible || object.positionNumber >= playbackPosition)
      continue
    sequences.set(object.sequenceId, [...(sequences.get(object.sequenceId) ?? []), object])
  }
  for (const [sequenceId, boat] of currentBoats) {
    sequences.set(sequenceId, [...(sequences.get(sequenceId) ?? []), boat])
  }
  return [...sequences.entries()].map(([id, boats]) => ({ id, boats }))
}
