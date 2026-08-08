import type { SailPlotConfig, SailPlotPartnerLink } from './types'

export function resolvePartnerLinks(config: SailPlotConfig): SailPlotPartnerLink[] {
  if (config.branding.partnerLinks !== null) return config.branding.partnerLinks

  return [
    ...(config.links.website ? [{ label: 'Website', url: config.links.website }] : []),
    ...(config.links.imprint ? [{ label: 'Imprint', url: config.links.imprint }] : []),
  ]
}
