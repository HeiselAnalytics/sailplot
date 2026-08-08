import type { CSSProperties } from 'react'
import type { SailPlotConfig, SailPlotThemeColors } from './types'

export function sailPlotBrandAccentColor(config: SailPlotConfig): string {
  return config.theme.usePrimaryForBrandAccents
    ? config.theme.light.primary
    : config.theme.light.accent
}

export function sailPlotThemeVariables(
  colors: SailPlotThemeColors,
  config: SailPlotConfig,
): CSSProperties {
  return {
    '--background': colors.background,
    '--foreground': colors.text,
    '--panel': colors.surface,
    '--sidebar': colors.sidebar,
    '--secondary': colors.secondary,
    '--muted': colors.muted,
    '--border': colors.border,
    '--ring': colors.focusRing,
    '--highlight': config.theme.usePrimaryForBrandAccents ? colors.primary : colors.accent,
    ...(config.theme.usePrimaryForBrandAccents ? { '--highlight-text': colors.primaryText } : {}),
    '--button': colors.primary,
    '--button-text': colors.primaryText,
    ...(config.theme.fontFamily ? { '--font-body': config.theme.fontFamily } : {}),
    ...(config.theme.headingFontFamily ? { '--font-heading': config.theme.headingFontFamily } : {}),
    ...(config.theme.borderRadius ? { '--radius': config.theme.borderRadius } : {}),
  } as CSSProperties
}
