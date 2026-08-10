/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { recolorSailPlotLogo } from '../config/logoAccent'
import { mergeSailPlotConfig } from '../config/mergeConfig'
import type { DeepPartial, SailPlotConfig } from '../config/types'

const SailPlotConfigContext = createContext<SailPlotConfig | null>(null)

const productLogoKeys = ['logo', 'logoDark', 'compactLogo', 'favicon', 'exportProductLogo'] as const

type ProductLogoKey = (typeof productLogoKeys)[number]
type ProductLogoOverrides = Partial<Pick<SailPlotConfig['branding'], ProductLogoKey>>

const transparentProductLogo =
  'data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns=%22http://www.w3.org/2000/svg%22/%3E'
const transparentProductLogos = Object.fromEntries(
  productLogoKeys.map((key) => [key, transparentProductLogo]),
) as ProductLogoOverrides

function useLogoAccent(config: SailPlotConfig): SailPlotConfig {
  const logoAccentColor = config.theme.usePrimaryForBrandAccents
    ? config.theme.light.primary
    : config.branding.logoAccentColor
  const sources = productLogoKeys.map((key) => config.branding[key])
  const requestKey = JSON.stringify([logoAccentColor, ...sources])
  const [resolved, setResolved] = useState<{
    requestKey: string
    assets: ProductLogoOverrides
  } | null>(null)

  useEffect(() => {
    if (!logoAccentColor) return

    const controller = new AbortController()
    const recoloredBySource = new Map<string, Promise<string>>()
    const recolor = (source: string) => {
      const existing = recoloredBySource.get(source)
      if (existing) return existing
      const pending = recolorSailPlotLogo(source, logoAccentColor, controller.signal).catch(
        () => source,
      )
      recoloredBySource.set(source, pending)
      return pending
    }

    void Promise.all(
      productLogoKeys.map(async (key) => [key, await recolor(config.branding[key])] as const),
    ).then((entries) => {
      if (!controller.signal.aborted) {
        setResolved({ requestKey, assets: Object.fromEntries(entries) as ProductLogoOverrides })
      }
    })

    return () => controller.abort()
  }, [config, logoAccentColor, requestKey])

  return useMemo(() => {
    if (!logoAccentColor) return config
    return {
      ...config,
      branding: {
        ...config.branding,
        ...(resolved?.assets ?? transparentProductLogos),
      },
    }
  }, [config, logoAccentColor, resolved])
}

export function SailPlotConfigProvider({
  config,
  children,
}: {
  config?: DeepPartial<SailPlotConfig>
  children: ReactNode
}) {
  const mergedConfig = useMemo(() => mergeSailPlotConfig(config), [config])
  const value = useLogoAccent(mergedConfig)
  return <SailPlotConfigContext.Provider value={value}>{children}</SailPlotConfigContext.Provider>
}

export function useSailPlotConfig(): SailPlotConfig {
  const config = useContext(SailPlotConfigContext)
  if (!config) {
    throw new Error('useSailPlotConfig must be used inside SailPlotConfigProvider')
  }
  return config
}
