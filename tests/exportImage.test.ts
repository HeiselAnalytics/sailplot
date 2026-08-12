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

  it('uses the same upper-right and lower-right arrangement in PDF exports', () => {
    const layout = calculatePdfExportOverlayLayout()

    expect(layout.qrCode.y).toBe(5)
    expect(layout.qrCode.x + layout.qrCode.width).toBeCloseTo(
      layout.branding.x + layout.branding.width,
    )
    expect(layout.branding.y).toBeGreaterThan(layout.qrCode.y + layout.qrCode.height)
    expect(layout.branding.width / layout.branding.height).toBeCloseTo(40 / 25)
  })

  it('only adjusts the PDF branding bottom offset', () => {
    const defaultLayout = calculatePdfExportOverlayLayout()
    const raisedBranding = calculatePdfExportOverlayLayout(12)

    expect(raisedBranding.branding.y).toBe(defaultLayout.branding.y - 7)
    expect(raisedBranding.qrCode).toEqual(defaultLayout.qrCode)
  })
})
