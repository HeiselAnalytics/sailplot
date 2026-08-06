import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'
import { SailPlotApp } from './app/SailPlotApp'
import { defaultSailPlotConfig } from './config/defaultConfig'
import './styles.css'

registerSW({ immediate: true })

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <SailPlotApp config={defaultSailPlotConfig} />
  </StrictMode>,
)
