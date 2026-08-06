import type { SailPlotConfig } from './types'

const asset = (path: string) => `${import.meta.env.BASE_URL}${path}`

export const defaultSailPlotConfig: SailPlotConfig = {
  branding: {
    appName: 'Sailing Plot Editor',
    shortName: 'SailPlot',
    logo: asset('icons/sailplot-logo-on-light.svg'),
    logoDark: asset('icons/sailplot-logo-on-dark.svg'),
    compactLogo: asset('icons/sailplot-icon.svg'),
    logoAlt: 'SailPlot',
    favicon: './icons/sailplot-icon.svg',
    partnerName: 'Heisel Analytics',
    partnerLogo: asset('assets/heisel-analytics-logo-on-dark.png'),
    exportWatermarkLogo: asset('assets/heisel-analytics-logo-on-light.png'),
    exportWatermarkQr: asset('assets/heiselanalytics-website-qr.svg'),
    exportProductLogo: asset('icons/sailplot-logo-on-light.svg'),
  },
  theme: {
    mode: 'dark',
    light: {
      primary: '#171717',
      primaryText: '#fafafa',
      accent: '#ffaa00',
      background: '#ffffff',
      surface: '#ffffff',
      sidebar: '#fafafa',
      secondary: '#f5f5f5',
      text: '#171717',
      muted: '#737373',
      border: '#e5e5e5',
      focusRing: '#a3a3a3',
    },
    dark: {
      primary: '#fafafa',
      primaryText: '#262626',
      accent: '#ffaa00',
      background: '#171717',
      surface: '#262626',
      sidebar: '#262626',
      secondary: '#404040',
      text: '#fafafa',
      muted: '#a3a3a3',
      border: 'rgba(255, 255, 255, 0.1)',
      focusRing: '#737373',
    },
    fontFamily: null,
    headingFontFamily: null,
    borderRadius: null,
  },
  texts: {
    welcomeTitle: 'Sailing Plot Editor',
    welcomeText: 'Create and share static sailing plots without a backend.',
    footerText: 'Powered by Heisel Analytics',
    helpText:
      'Add boats, marks, lines and notes from the tool panel. Select an object to edit its properties. This editor deliberately has no playback or sailing simulation.',
    aboutText:
      'A new web-based implementation for creating static sailing and racing-rule diagrams. It is inspired by the historical BOATS application but is implemented from scratch and does not use the old application as a runtime dependency.',
    poweredByText: 'Powered by SailPlot',
    exportPngDescription:
      'Exports the complete plot with a QR code that reopens this editable plot. Choose 2× for screens and everyday use, or 4× for sharper print and detailed output.',
    exportTransparentPngDescription:
      'Exports without the plot background while keeping the branding and plot QR code. Choose 2× for screens and everyday use, or 4× for sharper print and detailed output.',
  },
  links: {
    app: 'https://sailplot.app/',
    support: null,
    website: 'https://heiselanalytics.one/',
    privacy: null,
    imprint: 'https://heiselanalytics.one/impressum',
    documentation: null,
  },
  ui: {
    headerLogo: true,
    footer: true,
    poweredBySailPlot: false,
    help: true,
    about: true,
    home: false,
    newPlot: true,
    openProjects: true,
    export: true,
  },
  defaults: {
    language: 'auto',
    startPage: 'editor',
  },
  localization: {
    locales: { de: 'de-CH', en: 'en-GB' },
  },
  pageTitle: 'SailPlot.app',
  storageNamespace: '',
  routerBasename: '',
}
