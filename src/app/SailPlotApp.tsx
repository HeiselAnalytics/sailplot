import { useEffect, useMemo, useState, type ReactNode } from 'react'
import type { DeepPartial, SailPlotConfig } from '../config/types'
import { sailPlotThemeVariables } from '../config/theme'
import type {
  SailPlotExtensionComponent,
  SailPlotExtensionContext,
  SailPlotExtensions,
  SailPlotNavigationItem,
} from '../extensions/types'
import { I18nProvider } from '../i18n'
import { SailPlotConfigProvider, useSailPlotConfig } from '../providers/SailPlotConfigProvider'
import EditorApp from './App'

export interface SailPlotAppProps {
  config?: DeepPartial<SailPlotConfig>
  extensions?: SailPlotExtensions
}

const normalizePath = (path: string) => {
  const normalized = `/${path}`.replace(/\/{2,}/gu, '/').replace(/\/$/u, '')
  return normalized || '/'
}

const normalizeBasename = (basename: string) => {
  const normalized = normalizePath(basename)
  return normalized === '/' ? '' : normalized
}

const pathWithoutBasename = (pathname: string, basename: string) => {
  const normalized = normalizePath(pathname)
  if (!basename) return normalized
  if (normalized === basename) return '/'
  return normalized.startsWith(`${basename}/`)
    ? normalizePath(normalized.slice(basename.length))
    : normalized
}

function resolveConfiguredTheme(config: SailPlotConfig): 'light' | 'dark' {
  if (config.theme.mode !== 'system') return config.theme.mode
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

function useConfiguredTheme(config: SailPlotConfig): 'light' | 'dark' {
  const [theme, setTheme] = useState(() => resolveConfiguredTheme(config))
  useEffect(() => {
    if (config.theme.mode !== 'system') {
      setTheme(config.theme.mode)
      return
    }
    const media = window.matchMedia('(prefers-color-scheme: dark)')
    const update = () => setTheme(media.matches ? 'dark' : 'light')
    update()
    media.addEventListener('change', update)
    return () => media.removeEventListener('change', update)
  }, [config.theme.mode])
  return theme
}

function HeaderLogo({ config }: { config: SailPlotConfig }) {
  if (!config.ui.headerLogo) return null
  return (
    <span className="extension-shell-logo" role="img" aria-label={config.branding.logoAlt}>
      <img src={config.branding.logo} alt="" className="app-logo--on-light" aria-hidden="true" />
      <img src={config.branding.logoDark} alt="" className="app-logo--on-dark" aria-hidden="true" />
    </span>
  )
}

export function SailPlotNavigation({
  items,
  context,
}: {
  items: SailPlotNavigationItem[]
  context: SailPlotExtensionContext
}) {
  if (!items.length) return null
  return (
    <nav className="sailplot-navigation" aria-label="Navigation">
      {items.map((item) =>
        item.href ? (
          <a
            key={item.id}
            href={item.href}
            target={item.external ? '_blank' : undefined}
            rel={item.external ? 'noopener noreferrer' : undefined}
          >
            {item.label}
          </a>
        ) : (
          <button key={item.id} type="button" onClick={() => context.navigate(item.path ?? '/')}>
            {item.label}
          </button>
        ),
      )}
    </nav>
  )
}

function ExtensionComponents({
  components = [],
  context,
}: {
  components?: SailPlotExtensionComponent[]
  context: SailPlotExtensionContext
}) {
  return components.map((Component, index) => <Component key={index} {...context} />)
}

function ExtensionPageShell({
  children,
  context,
  extensions,
}: {
  children: ReactNode
  context: SailPlotExtensionContext
  extensions: SailPlotExtensions
}) {
  const Footer = extensions.footer
  const theme = useConfiguredTheme(context.config)
  return (
    <div
      className="extension-page-shell"
      style={sailPlotThemeVariables(context.config.theme[theme], context.config)}
    >
      <header className="extension-page-header">
        <HeaderLogo config={context.config} />
        <SailPlotNavigation items={extensions.navigationItems ?? []} context={context} />
        <div className="extension-header-actions">
          <ExtensionComponents components={extensions.headerActions} context={context} />
        </div>
      </header>
      <main className="extension-page-content">{children}</main>
      {context.config.ui.footer && (
        <footer className="extension-page-footer">
          {Footer ? <Footer {...context} /> : <span>{context.config.texts.footerText}</span>}
          <ExtensionComponents components={extensions.footerExtensions} context={context} />
          {context.config.ui.poweredBySailPlot && <span>{context.config.texts.poweredByText}</span>}
        </footer>
      )}
    </div>
  )
}

function ConfiguredApplication({ extensions = {} }: { extensions?: SailPlotExtensions }) {
  const config = useSailPlotConfig()
  const basename = normalizeBasename(config.routerBasename)
  const [currentPath, setCurrentPath] = useState(() =>
    pathWithoutBasename(window.location.pathname, basename),
  )

  useEffect(() => {
    const handlePopState = () =>
      setCurrentPath(pathWithoutBasename(window.location.pathname, basename))
    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [basename])

  useEffect(() => {
    let favicon = document.querySelector<HTMLLinkElement>('link[rel~="icon"]')
    if (!favicon) {
      favicon = document.createElement('link')
      favicon.rel = 'icon'
      document.head.append(favicon)
    }
    favicon.setAttribute('href', config.branding.favicon)
  }, [config.branding.favicon])

  const navigate = (path: string) => {
    const target = normalizePath(path)
    window.history.pushState({}, '', `${basename}${target}${window.location.hash}`)
    setCurrentPath(target)
    extensions.onEvent?.({ type: 'navigation', path: target })
  }
  const context = useMemo<SailPlotExtensionContext>(
    () => ({ config, currentPath, navigate }),
    // navigate intentionally follows the active basename and extensions for this render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [basename, config, currentPath, extensions],
  )
  const route = extensions.routes?.find(
    (candidate) => normalizePath(candidate.path) === currentPath,
  )
  const showHome =
    config.ui.home &&
    (currentPath === '/home' || (currentPath === '/' && config.defaults.startPage === 'home'))
  const showEditor =
    currentPath === '/editor' ||
    (currentPath === '/' && config.defaults.startPage === 'editor') ||
    (!route && !showHome)

  useEffect(() => {
    if (showEditor) return
    const theme = resolveConfiguredTheme(config)
    document.documentElement.dataset.theme = theme
    extensions.onEvent?.({ type: 'route-view', path: currentPath })
  }, [config, currentPath, extensions, showEditor])

  useEffect(() => {
    if (!route?.title) return
    const previousTitle = document.title
    document.title = route.title
    return () => {
      document.title = previousTitle
    }
  }, [route?.title])

  if (showEditor) {
    return <EditorApp extensions={extensions} extensionContext={context} />
  }

  if (route) {
    const RouteComponent = route.component
    return (
      <ExtensionPageShell context={context} extensions={extensions}>
        <RouteComponent {...context} />
      </ExtensionPageShell>
    )
  }

  const HomeContent = extensions.homeContent
  return (
    <ExtensionPageShell context={context} extensions={extensions}>
      <section className="sailplot-welcome">
        <h1>{config.texts.welcomeTitle}</h1>
        <p>{config.texts.welcomeText}</p>
        <button type="button" className="primary-button" onClick={() => navigate('/editor')}>
          {config.branding.appName}
        </button>
        {HomeContent && <HomeContent {...context} />}
      </section>
    </ExtensionPageShell>
  )
}

export function SailPlotApp({ config, extensions }: SailPlotAppProps) {
  return (
    <SailPlotConfigProvider config={config}>
      <I18nProvider>
        <ConfiguredApplication extensions={extensions} />
      </I18nProvider>
    </SailPlotConfigProvider>
  )
}
