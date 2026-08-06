import { describe, expect, it } from 'vitest'
import { createPlotQrCodeDataUrl } from '../src/lib/exportQrCode'

const readSvg = (dataUrl: string) => decodeURIComponent(dataUrl.slice(dataUrl.indexOf(',') + 1))

describe('export QR code', () => {
  it('generates a distinct QR matrix for each plot link', () => {
    const first = createPlotQrCodeDataUrl('https://sailplot.app/#plot=first', '#0066cc')
    const second = createPlotQrCodeDataUrl('https://sailplot.app/#plot=second', '#0066cc')

    expect(first).toMatch(/^data:image\/svg\+xml;charset=utf-8,/)
    expect(first).not.toBe(second)
    expect(readSvg(first)).toContain('<svg')
  })

  it('uses the primary colour for all three finder centres', () => {
    const svg = readSvg(createPlotQrCodeDataUrl('https://tenant.sailplot.app/#plot=abc', '#0a84ff'))

    expect(svg.match(/data-finder-centre="true"/g)).toHaveLength(3)
    expect(svg.match(/fill="#0a84ff"/g)).toHaveLength(3)
    expect(svg).toContain('rx="0.22"')
  })

  it('rejects a missing plot link', () => {
    expect(() => createPlotQrCodeDataUrl('', '#171717')).toThrow(
      'Could not create a QR code without a plot link.',
    )
  })
})
