import {
  SailPlotApp,
  type DeepPartial,
  type SailPlotConfig,
  type SailPlotExtensions,
} from '@heiselanalytics/sailplot'
import '@heiselanalytics/sailplot/styles.css'
import genericLogo from './generic-logo.svg'

function GuidePage() {
  return (
    <article>
      <h1>Getting started</h1>
      <p>This generic page is supplied entirely by the consumer application.</p>
    </article>
  )
}

const tenantConfig = {
  branding: {
    appName: 'Harbour Plot',
    shortName: 'Harbour',
    logo: genericLogo,
    logoDark: genericLogo,
    compactLogo: genericLogo,
    logoAlt: 'Harbour Plot',
    favicon: genericLogo,
  },
  theme: {
    light: { primary: '#075985', accent: '#0ea5e9' },
    dark: { primary: '#e0f2fe', accent: '#38bdf8' },
  },
  storageNamespace: 'harbour-plot',
  links: { app: 'https://plots.harbour.example/' },
} satisfies DeepPartial<SailPlotConfig>

const platformExtensions = {
  routes: [{ path: '/guide', title: 'Getting started', component: GuidePage }],
  navigationItems: [{ id: 'guide', label: 'Guide', path: '/guide' }],
  onEvent: (event) => console.info('SailPlot event', event),
} satisfies SailPlotExtensions

export default function App() {
  return <SailPlotApp config={tenantConfig} extensions={platformExtensions} />
}
