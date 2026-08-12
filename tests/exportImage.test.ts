import { describe, expect, it } from 'vitest'
import {
  calculatePdfExportOverlayLayout,
  calculateRasterExportOverlayLayout,
} from '../src/lib/exportImage'

describe('export overlay layout', () => {
  it('keeps the QR code separate at the upper right and branding at the bottom', () => {
    const layout = calculateRasterExportOverlayLayout(1920, 1080)

    expect(layout.qrCode.y).toBeLessThan(layout.branding.y)
    expect(layout.qrCode.x + layout.qrCode.width).toBe(layout.branding.x + layout.branding.width)
    expect(layout.branding.y + layout.branding.height).toBe(1080 - layout.qrCode.y)
    expect(layout.branding.width / layout.branding.height).toBeCloseTo(40 / 25, 2)
  })

  it('keeps both PDF overlays inside the actual plot instead of the A4 margins', () => {
    const plot = { x: 0, y: 21.5, width: 297, height: 167 }
    const layout = calculatePdfExportOverlayLayout(plot)

    expect(layout.qrCode.y).toBe(plot.y + 5)
    expect(layout.qrCode.x + layout.qrCode.width).toBeCloseTo(
      layout.branding.x + layout.branding.width,
    )
    expect(layout.qrCode.y).toBeGreaterThanOrEqual(plot.y)
    expect(layout.branding.y + layout.branding.height).toBeLessThanOrEqual(plot.y + plot.height)
    expect(layout.branding.y).toBeGreaterThan(layout.qrCode.y + layout.qrCode.height)
    expect(layout.branding.width / layout.branding.height).toBeCloseTo(40 / 25)
  })

  it('keeps PDF overlays inside a short plot by scaling both panels together', () => {
    const plot = { x: 0, y: 61, width: 297, height: 88 }
    const layout = calculatePdfExportOverlayLayout(plot)

    expect(layout.qrCode.y).toBeGreaterThanOrEqual(plot.y)
    expect(layout.qrCode.y + layout.qrCode.height).toBeLessThan(layout.branding.y)
    expect(layout.branding.y + layout.branding.height).toBeLessThanOrEqual(plot.y + plot.height)
    expect(layout.qrCode.x + layout.qrCode.width).toBeCloseTo(
      layout.branding.x + layout.branding.width,
    )
  })
})
