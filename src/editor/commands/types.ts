import type { ScenarioObject } from '../../types/scenario'

export interface ObjectCommand {
  label: string
  affectedIds: string[]
  before: ScenarioObject[]
  after: ScenarioObject[]
}

export function applyObjectCommand(
  objects: ScenarioObject[],
  affectedIds: string[],
  commandObjects: ScenarioObject[],
): ScenarioObject[] {
  const affected = new Set(affectedIds)
  const unchanged = objects.filter((object) => !affected.has(object.id))
  return [...unchanged, ...structuredClone(commandObjects)].sort((a, b) => a.zIndex - b.zIndex)
}
