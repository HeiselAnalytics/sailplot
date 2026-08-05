import { scenarioSchema } from '../schemas/scenario'
import { migrateScenario } from './migrations'
import type { Scenario } from '../types/scenario'

export function parseScenarioJson(value: string): Scenario {
  let parsed: unknown
  try {
    parsed = JSON.parse(value)
  } catch {
    throw new Error('This file does not contain valid JSON.')
  }
  const version = (parsed as { version?: unknown })?.version
  if (typeof version === 'number' && version > 1) {
    throw new Error(`Format version ${version} is not supported by this app.`)
  }
  const result = scenarioSchema.safeParse(parsed)
  if (!result.success) {
    const first = result.error.issues[0]
    throw new Error(`Invalid scenario at ${first.path.join('.') || 'root'}: ${first.message}`)
  }
  return migrateScenario(result.data) as Scenario
}

export const serializeScenario = (scenario: Scenario) => JSON.stringify(scenario, null, 2)
