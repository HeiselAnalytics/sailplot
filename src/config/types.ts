export type SailPlotLanguage = 'auto' | 'de' | 'en'
export type SailPlotThemeMode = 'light' | 'dark' | 'system'
export type SailPlotStartPage = 'editor' | 'home'

export interface SailPlotBranding {
  appName: string
  shortName: string
  logo: string
  logoDark: string
  compactLogo: string
  logoAlt: string
  favicon: string
  partnerName: string
  partnerLogo: string
  exportWatermarkLogo: string
  /** @deprecated QR codes are generated from the current plot share link. */
  exportWatermarkQr: string
  exportProductLogo: string
}

export interface SailPlotThemeColors {
  primary: string
  primaryText: string
  accent: string
  background: string
  surface: string
  sidebar: string
  secondary: string
  text: string
  muted: string
  border: string
  focusRing: string
}

export interface SailPlotTheme {
  mode: SailPlotThemeMode
  light: SailPlotThemeColors
  dark: SailPlotThemeColors
  fontFamily: string | null
  headingFontFamily: string | null
  borderRadius: string | null
}

export interface SailPlotTexts {
  welcomeTitle: string
  welcomeText: string
  footerText: string
  helpText: string
  aboutText: string
  poweredByText: string
  exportPngDescription: string
  exportTransparentPngDescription: string
}

export interface SailPlotLinks {
  app: string | null
  support: string | null
  website: string | null
  privacy: string | null
  imprint: string | null
  documentation: string | null
}

export interface SailPlotUiVisibility {
  headerLogo: boolean
  footer: boolean
  poweredBySailPlot: boolean
  help: boolean
  about: boolean
  home: boolean
  newPlot: boolean
  openProjects: boolean
  export: boolean
}

export interface SailPlotDefaults {
  language: SailPlotLanguage
  startPage: SailPlotStartPage
}

export interface SailPlotLocalization {
  locales: Record<'de' | 'en', string>
}

/**
 * Serializable configuration for SailPlot. It deliberately contains no React nodes or callbacks.
 */
export interface SailPlotConfig {
  branding: SailPlotBranding
  theme: SailPlotTheme
  texts: SailPlotTexts
  links: SailPlotLinks
  ui: SailPlotUiVisibility
  defaults: SailPlotDefaults
  localization: SailPlotLocalization
  pageTitle: string
  storageNamespace: string
  routerBasename: string
}

export type DeepPartial<T> = {
  [Key in keyof T]?: T[Key] extends readonly unknown[]
    ? T[Key]
    : T[Key] extends object
      ? DeepPartial<T[Key]>
      : T[Key]
}
