import { describe, expect, it } from 'vitest'
import { defaultSailPlotConfig } from '../src/config/defaultConfig'
import { mergeSailPlotConfig } from '../src/config/mergeConfig'
import { namespacedStorageKey } from '../src/config/storage'

describe('SailPlot configuration', () => {
  it('deeply merges partial settings without losing sibling defaults', () => {
    const merged = mergeSailPlotConfig({
      branding: { appName: 'Harbour Plot' },
      theme: { light: { accent: '#0066cc' } },
      ui: { help: false },
    })

    expect(merged.branding.appName).toBe('Harbour Plot')
    expect(merged.branding.shortName).toBe(defaultSailPlotConfig.branding.shortName)
    expect(merged.theme.light.accent).toBe('#0066cc')
    expect(merged.theme.light.background).toBe(defaultSailPlotConfig.theme.light.background)
    expect(merged.ui.help).toBe(false)
    expect(merged.ui.export).toBe(true)
  })

  it('falls back to all defaults when optional configuration is absent', () => {
    expect(mergeSailPlotConfig()).toEqual(defaultSailPlotConfig)
    expect(mergeSailPlotConfig({ branding: {} }).links).toEqual(defaultSailPlotConfig.links)
  })

  it('remains JSON serializable', () => {
    expect(JSON.parse(JSON.stringify(defaultSailPlotConfig))).toEqual(defaultSailPlotConfig)
  })

  it('preserves legacy storage keys unless a namespace is explicitly supplied', () => {
    expect(namespacedStorageKey('', 'sailing-language')).toBe('sailing-language')
    expect(namespacedStorageKey('generic', 'sailing-language')).toBe('generic:sailing-language')
  })
})
