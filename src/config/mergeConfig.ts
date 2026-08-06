import { defaultSailPlotConfig } from './defaultConfig'
import type { DeepPartial, SailPlotConfig } from './types'

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === 'object' && !Array.isArray(value)

const mergeObjects = <T extends Record<string, unknown>>(base: T, override: DeepPartial<T>): T => {
  const merged = { ...base }
  for (const key of Object.keys(override) as Array<keyof T>) {
    const next = override[key]
    if (next === undefined) continue
    const current = base[key]
    merged[key] = (
      isPlainObject(current) && isPlainObject(next)
        ? mergeObjects(current, next as DeepPartial<typeof current>)
        : next
    ) as T[keyof T]
  }
  return merged
}

export function mergeSailPlotConfig(config: DeepPartial<SailPlotConfig> = {}): SailPlotConfig {
  return mergeObjects(
    defaultSailPlotConfig as unknown as Record<string, unknown>,
    config as DeepPartial<Record<string, unknown>>,
  ) as unknown as SailPlotConfig
}
