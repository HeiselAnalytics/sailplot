import type { CSSProperties } from 'react'
import type { SailPlotConfig, SailPlotThemeColors } from './types'

export function sailPlotBrandAccentColor(config: SailPlotConfig): string {
  return config.theme.usePrimaryForBrandAccents
    ? config.theme.light.primary
    : config.theme.light.accent
}

export function sailPlotQrFinderColor(config: SailPlotConfig): string {
  return config.theme.qrFinderColor ?? config.theme.light.primary
}

export function sailPlotThemeVariables(
  colors: SailPlotThemeColors,
  config: SailPlotConfig,
): CSSProperties {
  const highlight = config.theme.usePrimaryForBrandAccents ? colors.primary : colors.accent
  const highlightText = config.theme.usePrimaryForBrandAccents ? colors.primaryText : '#171717'
  const highlightHover = `color-mix(in srgb, ${highlight} 78%, ${highlightText})`

  return {
    '--background': colors.background,
    '--foreground': colors.text,
    '--panel': colors.surface,
    '--sidebar': colors.sidebar,
    '--secondary': colors.secondary,
    '--muted': colors.muted,
    '--border': colors.border,
    '--ring': colors.focusRing,
    '--highlight': highlight,
    '--highlight-text': highlightText,
    '--highlight-hover': highlightHover,
    '--interactive-accent': highlightHover,
    '--interactive-hover': `color-mix(in srgb, ${highlightHover}, transparent 72%)`,
    '--interactive-hover-strong': `color-mix(in srgb, ${highlightHover}, transparent 62%)`,
    '--interactive-hover-subtle': `color-mix(in srgb, ${highlightHover}, transparent 78%)`,
    '--button': colors.primary,
    '--button-text': colors.primaryText,
    '--button-hover': `color-mix(in srgb, ${colors.primary} 70%, ${colors.primaryText})`,
    ...(config.theme.fontFamily ? { '--font-body': config.theme.fontFamily } : {}),
    ...(config.theme.headingFontFamily ? { '--font-heading': config.theme.headingFontFamily } : {}),
    ...(config.theme.borderRadius ? { '--radius': config.theme.borderRadius } : {}),
  } as CSSProperties
}
