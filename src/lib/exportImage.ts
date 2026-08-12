import { createPlotQrCodeDataUrl } from './exportQrCode'

const loadImage = (source: string) =>
  new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image()
    image.decoding = 'async'
    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error(`Could not load export image: ${source}`))
    image.src = source
  })

const A4_LANDSCAPE_WIDTH_MM = 297
const A4_LANDSCAPE_HEIGHT_MM = 210
const PDF_QR_SIZE_MM = 40.48
const PDF_BRANDING_WIDTH_MM = 50.6
const PDF_BRANDING_HEIGHT_MM = 31.625
const PDF_OVERLAY_MARGIN_MM = 5
const EXPORT_BRANDING_ASPECT_RATIO = 40 / 25
const EXPORT_BRANDING_TO_QR_WIDTH_RATIO = PDF_BRANDING_WIDTH_MM / PDF_QR_SIZE_MM

interface ExportWatermarkOptions {
  plotUrl: string
  primaryColor: string
  analyticsLogoUrl: string
  productLogoUrl: string
  partnerLabel: string
}

interface PdfExportOptions extends ExportWatermarkOptions {
  productUrl: string | null
  analyticsUrl: string | null
  title: string
  watermarkBottomMm?: number
}

interface ExportOverlayRect {
  x: number
  y: number
  width: number
  height: number
}

export interface RasterExportOverlayLayout {
  branding: ExportOverlayRect
  qrCode: ExportOverlayRect
  radius: number
}

export interface PdfExportOverlayLayout {
  branding: ExportOverlayRect
  qrCode: ExportOverlayRect
}

export function calculateRasterExportOverlayLayout(
  canvasWidth: number,
  canvasHeight: number,
): RasterExportOverlayLayout {
  const baseQrSize = Math.max(88, Math.round(Math.min(canvasWidth * 0.13, canvasHeight * 0.22)))
  const qrSize = Math.round(baseQrSize * 1.265)
  const brandingWidth = Math.round(qrSize * EXPORT_BRANDING_TO_QR_WIDTH_RATIO)
  const brandingHeight = Math.round(brandingWidth / EXPORT_BRANDING_ASPECT_RATIO)
  const margin = Math.max(16, Math.round(qrSize * 0.09))
  const radius = Math.max(5, Math.round(qrSize * 0.033))

  return {
    branding: {
      x: canvasWidth - brandingWidth - margin,
      y: canvasHeight - brandingHeight - margin,
      width: brandingWidth,
      height: brandingHeight,
    },
    qrCode: {
      x: canvasWidth - qrSize - margin,
      y: margin,
      width: qrSize,
      height: qrSize,
    },
    radius,
  }
}

export function calculatePdfExportOverlayLayout(watermarkBottomMm = 5): PdfExportOverlayLayout {
  const boundedBrandingBottomMm = Math.min(
    Math.max(5, watermarkBottomMm),
    A4_LANDSCAPE_HEIGHT_MM - PDF_BRANDING_HEIGHT_MM,
  )

  return {
    branding: {
      x: A4_LANDSCAPE_WIDTH_MM - PDF_OVERLAY_MARGIN_MM - PDF_BRANDING_WIDTH_MM,
      y: A4_LANDSCAPE_HEIGHT_MM - boundedBrandingBottomMm - PDF_BRANDING_HEIGHT_MM,
      width: PDF_BRANDING_WIDTH_MM,
      height: PDF_BRANDING_HEIGHT_MM,
    },
    qrCode: {
      x: A4_LANDSCAPE_WIDTH_MM - PDF_OVERLAY_MARGIN_MM - PDF_QR_SIZE_MM,
      y: PDF_OVERLAY_MARGIN_MM,
      width: PDF_QR_SIZE_MM,
      height: PDF_QR_SIZE_MM,
    },
  }
}

function drawContainedImage(
  context: CanvasRenderingContext2D,
  image: HTMLImageElement,
  x: number,
  y: number,
  width: number,
  height: number,
  verticalAlign: 'start' | 'center' | 'end' = 'center',
) {
  const scale = Math.min(width / image.naturalWidth, height / image.naturalHeight)
  const renderedWidth = image.naturalWidth * scale
  const renderedHeight = image.naturalHeight * scale
  const renderedX = x + (width - renderedWidth) / 2
  const renderedY =
    verticalAlign === 'start'
      ? y
      : verticalAlign === 'end'
        ? y + height - renderedHeight
        : y + (height - renderedHeight) / 2
  context.drawImage(image, renderedX, renderedY, renderedWidth, renderedHeight)
  return { x: renderedX, y: renderedY, width: renderedWidth, height: renderedHeight }
}

function drawSplitBranding(
  context: CanvasRenderingContext2D,
  analyticsLogo: HTMLImageElement,
  productLogo: HTMLImageElement,
  x: number,
  y: number,
  width: number,
  height: number,
  partnerLabel: string,
  offsets: { dividerY?: number; partnerY?: number } = {},
) {
  const halfHeight = height / 2
  const leftPadding = width * 0.05
  const rightPadding = width * 0.02
  const productLeftPadding = width * 0.05
  const fontSize = Math.max(8, Math.round(height * 0.064))
  const onePixelNudge = height / 120

  context.strokeStyle = 'rgba(23, 23, 23, 0.18)'
  context.lineWidth = Math.max(1, height * 0.006)
  context.beginPath()
  context.moveTo(x + leftPadding, y + halfHeight + (offsets.dividerY ?? 0))
  context.lineTo(x + width - rightPadding, y + halfHeight + (offsets.dividerY ?? 0))
  context.stroke()

  const partnerY = y + onePixelNudge + height * 0.0132 + (offsets.partnerY ?? 0)
  const hasPartnerLabel = Boolean(partnerLabel.trim())
  const logoWidth = width * (hasPartnerLabel ? 0.65 : 0.9)
  context.fillStyle = '#171717'
  context.font = `600 ${fontSize}px Arial, sans-serif`
  context.textAlign = 'left'
  const analyticsBounds = drawContainedImage(
    context,
    analyticsLogo,
    x + width - rightPadding - logoWidth,
    partnerY + halfHeight * 0.05,
    logoWidth,
    halfHeight * 0.75,
    'start',
  )
  if (hasPartnerLabel) {
    context.textBaseline = 'bottom'
    const labelX = x + leftPadding
    const labelBottom = analyticsBounds.y + analyticsBounds.height
    context.fillText(partnerLabel, labelX, labelBottom)
  }

  drawContainedImage(
    context,
    productLogo,
    x + productLeftPadding,
    y + halfHeight - onePixelNudge,
    width - productLeftPadding - rightPadding,
    halfHeight * 0.98,
    'end',
  )
}

function drawRoundedPanel(
  context: CanvasRenderingContext2D,
  rect: ExportOverlayRect,
  radius: number,
  fillStyle: string,
  drawContent: () => void,
  shadow = false,
) {
  context.save()
  if (shadow) {
    context.shadowColor = 'rgba(23, 23, 23, 0.12)'
    context.shadowBlur = Math.max(4, radius * 0.8)
    context.shadowOffsetY = Math.max(1, radius * 0.2)
  }
  context.fillStyle = fillStyle
  context.beginPath()
  context.roundRect(rect.x, rect.y, rect.width, rect.height, radius)
  context.fill()
  context.shadowColor = 'transparent'
  context.beginPath()
  context.roundRect(rect.x, rect.y, rect.width, rect.height, radius)
  context.clip()
  drawContent()
  context.restore()
}

function createPdfBrandingPanel(
  analyticsLogo: HTMLImageElement,
  productLogo: HTMLImageElement,
  partnerLabel: string,
): string {
  // Twenty pixels per millimetre keeps the small logos sharp in print.
  const canvas = document.createElement('canvas')
  canvas.width = 1012
  canvas.height = 633
  const context = canvas.getContext('2d')
  if (!context) throw new Error('Could not prepare the PDF branding')

  const panel = { x: 0, y: 0, width: canvas.width, height: canvas.height }
  drawRoundedPanel(context, panel, 26, 'rgba(255, 255, 255, 0.86)', () => {
    drawSplitBranding(
      context,
      analyticsLogo,
      productLogo,
      0,
      0,
      canvas.width,
      canvas.height,
      partnerLabel,
    )
  })

  return canvas.toDataURL('image/png')
}

function createPdfQrPanel(qrCode: HTMLImageElement): string {
  const canvas = document.createElement('canvas')
  canvas.width = 810
  canvas.height = 810
  const context = canvas.getContext('2d')
  if (!context) throw new Error('Could not prepare the PDF QR code')

  const panel = { x: 0, y: 0, width: canvas.width, height: canvas.height }
  drawRoundedPanel(context, panel, 27, '#fff', () => {
    context.drawImage(qrCode, 0, 0, canvas.width, canvas.height)
  })
  return canvas.toDataURL('image/png')
}

export async function createA4PlotPdf(
  plotDataUrl: string,
  options: PdfExportOptions,
): Promise<Blob> {
  const qrCodeUrl = createPlotQrCodeDataUrl(options.plotUrl, options.primaryColor)
  const [{ jsPDF }, plot, qrCode, analyticsLogo, productLogo] = await Promise.all([
    import('jspdf'),
    loadImage(plotDataUrl),
    loadImage(qrCodeUrl),
    loadImage(options.analyticsLogoUrl),
    loadImage(options.productLogoUrl),
  ])
  const pdf = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4',
    compress: true,
  })
  const plotHeightMm = A4_LANDSCAPE_WIDTH_MM * (plot.naturalHeight / plot.naturalWidth)
  const plotTopMm = (A4_LANDSCAPE_HEIGHT_MM - plotHeightMm) / 2
  const layout = calculatePdfExportOverlayLayout(options.watermarkBottomMm)

  pdf.setProperties({ title: options.title })
  pdf.addImage(
    plotDataUrl,
    'PNG',
    0,
    plotTopMm,
    A4_LANDSCAPE_WIDTH_MM,
    plotHeightMm,
    undefined,
    'FAST',
  )
  pdf.addImage(
    createPdfBrandingPanel(analyticsLogo, productLogo, options.partnerLabel),
    'PNG',
    layout.branding.x,
    layout.branding.y,
    layout.branding.width,
    layout.branding.height,
    undefined,
    'FAST',
  )
  pdf.addImage(
    createPdfQrPanel(qrCode),
    'PNG',
    layout.qrCode.x,
    layout.qrCode.y,
    layout.qrCode.width,
    layout.qrCode.height,
    undefined,
    'FAST',
  )

  if (options.productUrl) {
    pdf.link(
      layout.branding.x,
      layout.branding.y + layout.branding.height / 2,
      layout.branding.width,
      layout.branding.height / 2,
      {
        url: options.productUrl,
      },
    )
  }
  if (options.analyticsUrl) {
    pdf.link(
      layout.branding.x,
      layout.branding.y,
      layout.branding.width,
      layout.branding.height / 2,
      { url: options.analyticsUrl },
    )
  }
  pdf.link(layout.qrCode.x, layout.qrCode.y, layout.qrCode.width, layout.qrCode.height, {
    url: options.plotUrl,
  })

  return pdf.output('blob')
}

export async function addExportWatermark(
  plotDataUrl: string,
  options: ExportWatermarkOptions,
): Promise<string> {
  const qrCodeUrl = createPlotQrCodeDataUrl(options.plotUrl, options.primaryColor)
  const [plot, qrCode, analyticsLogo, productLogo] = await Promise.all([
    loadImage(plotDataUrl),
    loadImage(qrCodeUrl),
    loadImage(options.analyticsLogoUrl),
    loadImage(options.productLogoUrl),
  ])
  const canvas = document.createElement('canvas')
  canvas.width = plot.naturalWidth
  canvas.height = plot.naturalHeight
  const context = canvas.getContext('2d')
  if (!context) throw new Error('Could not prepare the watermarked export image')

  context.drawImage(plot, 0, 0)
  const layout = calculateRasterExportOverlayLayout(canvas.width, canvas.height)

  drawRoundedPanel(
    context,
    layout.branding,
    layout.radius,
    'rgba(255, 255, 255, 0.86)',
    () => {
      drawSplitBranding(
        context,
        analyticsLogo,
        productLogo,
        layout.branding.x,
        layout.branding.y,
        layout.branding.width,
        layout.branding.height,
        options.partnerLabel,
      )
    },
    true,
  )
  drawRoundedPanel(
    context,
    layout.qrCode,
    layout.radius,
    '#fff',
    () => {
      context.drawImage(
        qrCode,
        layout.qrCode.x,
        layout.qrCode.y,
        layout.qrCode.width,
        layout.qrCode.height,
      )
    },
    true,
  )
  return canvas.toDataURL('image/png')
}
