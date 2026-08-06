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
const PDF_WATERMARK_WIDTH_MM = 72
const PDF_WATERMARK_HEIGHT_MM = 32
const PDF_WATERMARK_BRAND_WIDTH_MM = 40
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
) {
  const scale = Math.min(width / image.naturalWidth, height / image.naturalHeight)
  const renderedWidth = image.naturalWidth * scale
  const renderedHeight = image.naturalHeight * scale
  context.drawImage(
    image,
    x + (width - renderedWidth) / 2,
    y + (height - renderedHeight) / 2,
    renderedWidth,
    renderedHeight,
  )
}

function drawSplitBranding(
  context: CanvasRenderingContext2D,
  analyticsLogo: HTMLImageElement,
  productLogo: HTMLImageElement,
  x: number,
  y: number,
  width: number,
  height: number,
) {
  const halfHeight = height / 2
  const horizontalPadding = width * 0.045
  const productLeftPadding = width * 0.11
  const fontSize = Math.max(9, Math.round(height * 0.08))

  context.strokeStyle = 'rgba(23, 23, 23, 0.18)'
  context.lineWidth = Math.max(1, height * 0.006)
  context.beginPath()
  context.moveTo(x + horizontalPadding, y + halfHeight)
  context.lineTo(x + width - horizontalPadding, y + halfHeight)
  context.stroke()

  drawContainedImage(
    context,
    productLogo,
    x + productLeftPadding,
    y + height * 0.025,
    width - productLeftPadding - horizontalPadding,
    halfHeight * 0.9,
  )

  const partnerY = y + halfHeight
  const poweredWidth = width * 0.3
  const logoWidth = width * 0.56
  context.fillStyle = '#171717'
  context.font = `600 ${fontSize}px Arial, sans-serif`
  context.textAlign = 'center'
  context.textBaseline = 'middle'
  context.fillText(
    'Powered by',
    x + horizontalPadding + poweredWidth / 2,
    partnerY + halfHeight / 2,
  )
  drawContainedImage(
    context,
    analyticsLogo,
    x + width - horizontalPadding - logoWidth,
    partnerY + halfHeight * 0.24,
    logoWidth,
    halfHeight * 0.52,
  )
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
  drawSplitBranding(context, analyticsLogo, productLogo, 0, 0, 800, 640)
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
  const qrSize = Math.max(88, Math.round(Math.min(canvas.width * 0.13, canvas.height * 0.22)))
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
  drawSplitBranding(context, analyticsLogo, productLogo, panelX, panelY, qrX - panelX, panelHeight)
  context.drawImage(qrCode, qrX, panelY, qrSize, qrSize)
  context.restore()
  return canvas.toDataURL('image/png')
}
