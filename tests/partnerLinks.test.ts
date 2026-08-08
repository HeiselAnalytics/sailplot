import { describe, expect, it } from 'vitest'
import { mergeSailPlotConfig } from '../src/config/mergeConfig'
import { resolvePartnerLinks } from '../src/config/partnerLinks'

describe('partner logo links', () => {
  it('uses website and imprint as the default logo destinations', () => {
    const config = mergeSailPlotConfig()

    expect(resolvePartnerLinks(config)).toEqual([
      { label: 'Website', url: 'https://heiselanalytics.one/' },
      { label: 'Imprint', url: 'https://heiselanalytics.one/impressum' },
    ])
  })

  it('supports one or multiple tenant-defined logo destinations', () => {
    const single = mergeSailPlotConfig({
      branding: { partnerLinks: [{ label: 'Club', url: 'https://club.example/' }] },
    })
    const multiple = mergeSailPlotConfig({
      branding: {
        partnerLinks: [
          { label: 'Club', url: 'https://club.example/' },
          { label: 'Events', url: 'https://events.example/' },
        ],
      },
    })

    expect(resolvePartnerLinks(single)).toHaveLength(1)
    expect(resolvePartnerLinks(multiple)).toHaveLength(2)
  })

  it('allows all logo destinations to be disabled explicitly', () => {
    const config = mergeSailPlotConfig({ branding: { partnerLinks: [] } })

    expect(resolvePartnerLinks(config)).toEqual([])
  })
})
