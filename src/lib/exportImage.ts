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
const PDF_WATERMARK_WIDTH_MM = 91.08
const PDF_WATERMARK_HEIGHT_MM = 40.48
const PDF_WATERMARK_BRAND_WIDTH_MM = 50.6
const PDF_WATERMARK_RIGHT_MM = 5
const WATERMARK_BRAND_TO_QR_RATIO = PDF_WATERMARK_BRAND_WIDTH_MM / PDF_WATERMARK_HEIGHT_MM

interface ExportWatermarkOptions {
  plotUrl: string
  primaryColor: string
  analyticsLogoUrl: string
  productLogoUrl: string
}

interface PdfExportOptions extends ExportWatermarkOptions {
  productUrl: string | null
  analyticsUrl: string | null
  title: string
  watermarkBottomMm?: number
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

  drawContainedImage(
    context,
    productLogo,
    x + productLeftPadding,
    y - onePixelNudge,
    width - productLeftPadding - rightPadding,
    halfHeight * 0.98,
    'end',
  )

  const partnerY = y + halfHeight + onePixelNudge + height * 0.0132 + (offsets.partnerY ?? 0)
  const logoWidth = width * 0.65
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
  context.textBaseline = 'bottom'
  const poweredX = x + leftPadding
  const poweredBottom = analyticsBounds.y + analyticsBounds.height
  context.fillText('Powered by', poweredX, poweredBottom)
}

function createPdfWatermark(
  qrCode: HTMLImageElement,
  analyticsLogo: HTMLImageElement,
  productLogo: HTMLImageElement,
): string {
  // Twenty pixels per millimetre keeps the small logos and QR code sharp in print.
  const canvas = document.createElement('canvas')
  canvas.width = 1440
  canvas.height = 640
  const context = canvas.getContext('2d')
  if (!context) throw new Error('Could not prepare the PDF watermark')

  context.save()
  context.fillStyle = 'rgba(255, 255, 255, 0.86)'
  context.beginPath()
  context.roundRect(0, 0, canvas.width, canvas.height, 64)
  context.fill()
  context.clip()
  drawSplitBranding(context, analyticsLogo, productLogo, 0, 0, 800, 640, {
    dividerY: 28,
    partnerY: 43,
  })
  context.drawImage(qrCode, 800, 0, 640, 640)
  context.restore()

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
  const boundedWatermarkBottomMm = Math.min(
    Math.max(5, options.watermarkBottomMm ?? 5),
    A4_LANDSCAPE_HEIGHT_MM - PDF_WATERMARK_HEIGHT_MM,
  )
  const watermarkX = A4_LANDSCAPE_WIDTH_MM - PDF_WATERMARK_RIGHT_MM - PDF_WATERMARK_WIDTH_MM
  const watermarkY = A4_LANDSCAPE_HEIGHT_MM - boundedWatermarkBottomMm - PDF_WATERMARK_HEIGHT_MM

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
    createPdfWatermark(qrCode, analyticsLogo, productLogo),
    'PNG',
    watermarkX,
    watermarkY,
    PDF_WATERMARK_WIDTH_MM,
    PDF_WATERMARK_HEIGHT_MM,
    undefined,
    'FAST',
  )

  if (options.productUrl) {
    pdf.link(watermarkX, watermarkY, PDF_WATERMARK_BRAND_WIDTH_MM, PDF_WATERMARK_HEIGHT_MM / 2, {
      url: options.productUrl,
    })
  }
  if (options.analyticsUrl) {
    pdf.link(
      watermarkX,
      watermarkY + PDF_WATERMARK_HEIGHT_MM / 2,
      PDF_WATERMARK_BRAND_WIDTH_MM,
      PDF_WATERMARK_HEIGHT_MM / 2,
      { url: options.analyticsUrl },
    )
  }
  pdf.link(
    watermarkX + PDF_WATERMARK_BRAND_WIDTH_MM,
    watermarkY,
    PDF_WATERMARK_WIDTH_MM - PDF_WATERMARK_BRAND_WIDTH_MM,
    PDF_WATERMARK_HEIGHT_MM,
    { url: options.plotUrl },
  )

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
  const baseQrSize = Math.max(88, Math.round(Math.min(canvas.width * 0.13, canvas.height * 0.22)))
  const qrSize = Math.round(baseQrSize * 1.265)
  const brandWidth = Math.round(qrSize * WATERMARK_BRAND_TO_QR_RATIO)
  const panelWidth = brandWidth + qrSize
  const panelHeight = qrSize
  const margin = Math.max(16, Math.round(qrSize * 0.09))
  const panelX = canvas.width - panelWidth - margin
  const panelY = canvas.height - panelHeight - margin
  const panelRadius = Math.max(10, Math.round(qrSize * 0.1))
  const qrX = panelX + brandWidth

  context.save()
  context.fillStyle = 'rgba(255, 255, 255, 0.86)'
  context.beginPath()
  context.roundRect(panelX, panelY, panelWidth, panelHeight, panelRadius)
  context.fill()
  context.clip()
  drawSplitBranding(
    context,
    analyticsLogo,
    productLogo,
    panelX,
    panelY,
    qrX - panelX,
    panelHeight,
    { dividerY: 28, partnerY: 43 },
  )
  context.drawImage(qrCode, qrX, panelY, qrSize, qrSize)
  context.restore()
  return canvas.toDataURL('image/png')
}
