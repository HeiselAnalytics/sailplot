export type SailPlotLanguage = 'auto' | 'de' | 'en'
export type SailPlotLanguageMode = 'de' | 'en' | 'both'
export type SailPlotThemeMode = 'light' | 'dark' | 'system'
export type SailPlotStartPage = 'editor' | 'home'
export type SailPlotMarkColorMode = 'sailplot' | 'primary' | 'red' | 'orange' | 'custom'

export interface SailPlotPartnerLink {
  label: string
  url: string
}

export interface SailPlotBranding {
  appName: string
  shortName: string
  logo: string
  logoDark: string
  compactLogo: string
  logoAlt: string
  favicon: string
  /** Replaces the orange SailPlot boat accent in product SVGs. Use a six-digit hex color. */
  logoAccentColor: string | null
  partnerName: string
  partnerLabel: string
  partnerLogo: string
  /** Optional logo destinations. Null uses the configured website and imprint links. */
  partnerLinks: SailPlotPartnerLink[] | null
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
  /** Uses the tenant's primary color for product branding, UI accents, and the first boat color. */
  usePrimaryForBrandAccents: boolean
  /** Color of the three QR finder-centre dots. Null follows the light primary color. */
  qrFinderColor: string | null
  light: SailPlotThemeColors
  dark: SailPlotThemeColors
  fontFamily: string | null
  headingFontFamily: string | null
  borderRadius: string | null
}

export interface SailPlotObjectColors {
  markColorMode: SailPlotMarkColorMode
  markCustomColor: string | null
  startLineFlagColor: string
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
  /** Optional fixed QR destination. Null encodes the current editable plot. */
  qrCode: string | null
  support: string | null
  website: string | null
  privacy: string | null
  imprint: string | null
  documentation: string | null
}

export interface SailPlotUiVisibility {
  headerLogo: boolean
  footer: boolean
  canvasBrandingLinks: boolean
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
  /** Fixed German/English hides the switch; both keeps the language switch available. */
  languageMode: SailPlotLanguageMode
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
  objectColors: SailPlotObjectColors
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
