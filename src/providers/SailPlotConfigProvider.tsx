/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useMemo, type ReactNode } from 'react'
import { mergeSailPlotConfig } from '../config/mergeConfig'
import type { DeepPartial, SailPlotConfig } from '../config/types'

const SailPlotConfigContext = createContext<SailPlotConfig | null>(null)

export function SailPlotConfigProvider({
  config,
  children,
}: {
  config?: DeepPartial<SailPlotConfig>
  children: ReactNode
}) {
  const value = useMemo(() => mergeSailPlotConfig(config), [config])
  return <SailPlotConfigContext.Provider value={value}>{children}</SailPlotConfigContext.Provider>
}

export function useSailPlotConfig(): SailPlotConfig {
  const config = useContext(SailPlotConfigContext)
  if (!config) {
    throw new Error('useSailPlotConfig must be used inside SailPlotConfigProvider')
  }
  return config
}
