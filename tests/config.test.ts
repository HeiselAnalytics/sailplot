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
    expect(merged.branding.partnerLabel).toBe('Powered by')
    expect(merged.branding.partnerLinks).toBeNull()
    expect(merged.branding.logoAccentColor).toBeNull()
    expect(merged.branding.shortName).toBe(defaultSailPlotConfig.branding.shortName)
    expect(merged.theme.light.accent).toBe('#0066cc')
    expect(merged.theme.usePrimaryForBrandAccents).toBe(false)
    expect(merged.theme.qrFinderColor).toBe('#FFAA00')
    expect(merged.objectColors).toEqual({
      markColorMode: 'sailplot',
      markCustomColor: null,
      startLineFlagColor: '#FF5E00',
    })
    expect(merged.localization.languageMode).toBe('both')
    expect(merged.theme.light.background).toBe(defaultSailPlotConfig.theme.light.background)
    expect(merged.ui.help).toBe(false)
    expect(merged.ui.export).toBe(true)
    expect(merged.links.app).toBe('https://sailplot.app/')
  })

  it('allows the optional partner label to be hidden without removing partner branding', () => {
    const merged = mergeSailPlotConfig({ branding: { partnerLabel: '' } })

    expect(merged.branding.partnerLabel).toBe('')
    expect(merged.branding.partnerName).toBe('Heisel Analytics')
    expect(merged.branding.exportWatermarkLogo).toBe(
      defaultSailPlotConfig.branding.exportWatermarkLogo,
    )
  })

  it('accepts a tenant-specific SailPlot logo accent', () => {
    const merged = mergeSailPlotConfig({ branding: { logoAccentColor: '#0f766e' } })

    expect(merged.branding.logoAccentColor).toBe('#0f766e')
    expect(merged.branding.logo).toBe(defaultSailPlotConfig.branding.logo)
  })

  it('can apply the tenant primary color to all built-in brand accents', () => {
    const merged = mergeSailPlotConfig({ theme: { usePrimaryForBrandAccents: true } })

    expect(merged.theme.usePrimaryForBrandAccents).toBe(true)
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
