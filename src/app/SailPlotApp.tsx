import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { Moon, Sun } from 'lucide-react'
import { SailPlotNavigation } from '../components/SailPlotNavigation'
import { IconButton } from '../components/ui/IconButton'
import type { DeepPartial, SailPlotConfig } from '../config/types'
import { namespacedStorageKey } from '../config/storage'
import { sailPlotThemeVariables } from '../config/theme'
import type {
  SailPlotExtensionComponent,
  SailPlotExtensionContext,
  SailPlotExtensions,
} from '../extensions/types'
import { I18nProvider, useI18n } from '../i18n'
import { SailPlotConfigProvider, useSailPlotConfig } from '../providers/SailPlotConfigProvider'
import { createShareUrl } from '../services/scenarioCodec'
import { useEditorStore } from '../stores/editorStore'
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

function useConfiguredTheme(config: SailPlotConfig) {
  const storageKey = namespacedStorageKey(config.storageNamespace, 'sailing-theme')
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    if (config.theme.mode === 'system') return resolveConfiguredTheme(config)
    const stored = window.localStorage.getItem(storageKey)
    return stored === 'light' || stored === 'dark' ? stored : config.theme.mode
  })

  useEffect(() => {
    if (config.theme.mode !== 'system') return
    const media = window.matchMedia('(prefers-color-scheme: dark)')
    const update = () => setTheme(media.matches ? 'dark' : 'light')
    media.addEventListener('change', update)
    return () => media.removeEventListener('change', update)
  }, [config.theme.mode])

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    window.localStorage.setItem(storageKey, theme)
  }, [storageKey, theme])

  return { theme, setTheme }
}

function HeaderLogo({ context }: { context: SailPlotExtensionContext }) {
  const { config, navigate } = context
  const { t } = useI18n()
  if (!config.ui.headerLogo) return null
  return (
    <button
      type="button"
      className="extension-shell-logo"
      aria-label={`${t('Back to editor')}: ${config.branding.shortName}`}
      onClick={() => navigate('/editor')}
    >
      <img src={config.branding.logo} alt="" className="app-logo--on-light" aria-hidden="true" />
      <img src={config.branding.logoDark} alt="" className="app-logo--on-dark" aria-hidden="true" />
    </button>
  )
}

export { SailPlotNavigation } from '../components/SailPlotNavigation'

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
  showFooter = true,
}: {
  children: ReactNode
  context: SailPlotExtensionContext
  extensions: SailPlotExtensions
  showFooter?: boolean
}) {
  const Footer = extensions.pageFooter ?? extensions.footer
  const { theme, setTheme } = useConfiguredTheme(context.config)
  const { language, setLanguage, t } = useI18n()
  const nextTheme = theme === 'dark' ? 'light' : 'dark'
  return (
    <div
      className="extension-page-shell"
      style={sailPlotThemeVariables(context.config.theme[theme], context.config)}
    >
      <header className="extension-page-header">
        <HeaderLogo context={context} />
        <div className="extension-header-actions">
          <button
            type="button"
            className="extension-editor-back"
            aria-label={t('Back to editor')}
            onClick={() => context.navigate('/editor')}
          >
            <span aria-hidden="true">←</span>
            <span className="extension-editor-back-label">{t('Back to editor')}</span>
          </button>
          <IconButton
            compact
            icon={theme === 'dark' ? <Sun /> : <Moon />}
            label={t(nextTheme === 'light' ? 'Use light mode' : 'Use dark mode')}
            onClick={() => setTheme(nextTheme)}
          />
          <ExtensionComponents components={extensions.headerActions} context={context} />
          {context.config.localization.languageMode === 'both' && (
            <div className="language-switch" role="group" aria-label={t('Language')}>
              {(['de', 'en'] as const).map((code) => (
                <button
                  key={code}
                  type="button"
                  className={language === code ? 'is-active' : ''}
                  aria-pressed={language === code}
                  aria-label={code === 'de' ? 'Deutsch' : 'English'}
                  onClick={() => setLanguage(code)}
                >
                  {code.toUpperCase()}
                </button>
              ))}
            </div>
          )}
        </div>
        <SailPlotNavigation items={extensions.navigationItems ?? []} context={context} />
      </header>
      <main className="extension-page-content">{children}</main>
      {showFooter && context.config.ui.footer && (
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
  const { language } = useI18n()
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
  const navigate = (path: string) => {
    const target = normalizePath(path)
    const plotHash =
      showEditor && target !== '/editor'
        ? new URL(createShareUrl(useEditorStore.getState().scenario)).hash
        : window.location.hash
    window.history.pushState({}, '', `${basename}${target}${plotHash}`)
    setCurrentPath(target)
    extensions.onEvent?.({ type: 'navigation', path: target })
  }
  const context = useMemo<SailPlotExtensionContext>(
    () => ({ config, currentPath, language, navigate }),
    // navigate intentionally follows the active basename and extensions for this render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [basename, config, currentPath, extensions, language, showEditor],
  )

  useEffect(() => {
    if (showEditor) return
    extensions.onEvent?.({ type: 'route-view', path: currentPath })
  }, [currentPath, extensions, showEditor])

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
      <ExtensionPageShell
        context={context}
        extensions={extensions}
        showFooter={route.footer !== false}
      >
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
