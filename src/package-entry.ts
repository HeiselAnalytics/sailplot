import './styles.css'

export { SailPlotApp, SailPlotNavigation } from './app/SailPlotApp'
export type { SailPlotAppProps } from './app/SailPlotApp'
export { defaultSailPlotConfig } from './config/defaultConfig'
export { mergeSailPlotConfig } from './config/mergeConfig'
export type {
  DeepPartial,
  SailPlotBranding,
  SailPlotConfig,
  SailPlotDefaults,
  SailPlotLanguage,
  SailPlotLinks,
  SailPlotLocalization,
  SailPlotStartPage,
  SailPlotTexts,
  SailPlotTheme,
  SailPlotThemeColors,
  SailPlotThemeMode,
  SailPlotUiVisibility,
} from './config/types'
export type {
  SailPlotEvent,
  SailPlotExtensionComponent,
  SailPlotExtensionContext,
  SailPlotExtensions,
  SailPlotNavigationItem,
  SailPlotRoute,
} from './extensions/types'
export { SailPlotConfigProvider, useSailPlotConfig } from './providers/SailPlotConfigProvider'
