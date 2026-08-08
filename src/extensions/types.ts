import type { ComponentType } from 'react'
import type { SailPlotConfig } from '../config/types'

export interface SailPlotExtensionContext {
  config: SailPlotConfig
  currentPath: string
  language: 'de' | 'en'
  navigate: (path: string) => void
}

export type SailPlotExtensionComponent = ComponentType<SailPlotExtensionContext>

export interface SailPlotRoute {
  path: string
  title?: string
  footer?: boolean
  component: SailPlotExtensionComponent
}

export interface SailPlotNavigationItem {
  id: string
  label: string
  path?: string
  href?: string
  external?: boolean
  separatorBefore?: boolean
  muted?: boolean
  version?: boolean
}

export interface SailPlotEvent {
  type: 'editor-ready' | 'navigation' | 'route-view'
  path: string
  data?: Record<string, string | number | boolean | null>
}

/** Non-serializable React and integration extension points supplied by a consumer. */
export interface SailPlotExtensions {
  routes?: SailPlotRoute[]
  navigationItems?: SailPlotNavigationItem[]
  headerActions?: SailPlotExtensionComponent[]
  pageFooter?: SailPlotExtensionComponent
  footer?: SailPlotExtensionComponent
  footerExtensions?: SailPlotExtensionComponent[]
  homeContent?: SailPlotExtensionComponent
  helpContent?: SailPlotExtensionComponent
  emptySelectionContent?: SailPlotExtensionComponent
  compactBrandingContent?: SailPlotExtensionComponent
  onEvent?: (event: SailPlotEvent) => void
}
