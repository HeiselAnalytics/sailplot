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
const PDF_WATERMARK_WIDTH_MM = 55
const PDF_WATERMARK_HEIGHT_MM = 19
const PDF_WATERMARK_RIGHT_MM = 5

function createPdfWatermark(
  qrCode: HTMLImageElement,
  analyticsLogo: HTMLImageElement,
  productLogo: HTMLImageElement,
): string {
  // Twenty pixels per millimetre keeps the small logos and QR code sharp in print.
  const canvas = document.createElement('canvas')
  canvas.width = 1100
  canvas.height = 380
  const context = canvas.getContext('2d')
  if (!context) throw new Error('Could not prepare the PDF watermark')

  context.save()
  context.fillStyle = 'rgba(255, 255, 255, 0.78)'
  context.beginPath()
  context.roundRect(0, 0, canvas.width, canvas.height, 60)
  context.fill()
  context.clip()

  const brandX = 40
  const brandWidth = 600
  const qrX = 720
  const qrSize = 380
  const productAspectRatio = productLogo.naturalWidth / productLogo.naturalHeight
  const productHeight = brandWidth / productAspectRatio
  const rowGap = 16
  const analyticsWidth = 280
  const analyticsAspectRatio = analyticsLogo.naturalWidth / analyticsLogo.naturalHeight
  const analyticsHeight = analyticsWidth / analyticsAspectRatio
  const partnerHeight = Math.max(analyticsHeight, 72)
  const brandHeight = productHeight + rowGap + partnerHeight
  const brandY = (canvas.height - brandHeight) / 2

  context.drawImage(productLogo, brandX, brandY, brandWidth, productHeight)

  const partnerY = brandY + productHeight + rowGap
  context.fillStyle = '#171717'
  context.font = '600 42px Arial, sans-serif'
  context.textAlign = 'center'
  context.textBaseline = 'middle'
  context.fillText(
    'Powered by',
    brandX + (brandWidth - analyticsWidth) / 2,
    partnerY + partnerHeight * 0.55,
  )
  context.drawImage(
    analyticsLogo,
    brandX + brandWidth - analyticsWidth,
    partnerY + (partnerHeight - analyticsHeight) / 2,
    analyticsWidth,
    analyticsHeight,
  )
  context.drawImage(qrCode, qrX, 0, qrSize, qrSize)
  context.restore()

  return canvas.toDataURL('image/png')
}

export async function createA4PlotPdf(
  plotDataUrl: string,
  qrCodeUrl: string,
  analyticsLogoUrl: string,
  productLogoUrl: string,
  websiteUrl: string,
  title: string,
  watermarkBottomMm = 5,
): Promise<Blob> {
  const [{ jsPDF }, plot, qrCode, analyticsLogo, productLogo] = await Promise.all([
    import('jspdf'),
    loadImage(plotDataUrl),
    loadImage(qrCodeUrl),
    loadImage(analyticsLogoUrl),
    loadImage(productLogoUrl),
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
    Math.max(5, watermarkBottomMm),
    A4_LANDSCAPE_HEIGHT_MM - PDF_WATERMARK_HEIGHT_MM,
  )
  const watermarkX = A4_LANDSCAPE_WIDTH_MM - PDF_WATERMARK_RIGHT_MM - PDF_WATERMARK_WIDTH_MM
  const watermarkY = A4_LANDSCAPE_HEIGHT_MM - boundedWatermarkBottomMm - PDF_WATERMARK_HEIGHT_MM

  pdf.setProperties({ title })
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
  pdf.link(watermarkX, watermarkY, PDF_WATERMARK_WIDTH_MM, PDF_WATERMARK_HEIGHT_MM, {
    url: websiteUrl,
  })

  return pdf.output('blob')
}

export async function addExportWatermark(
  plotDataUrl: string,
  qrCodeUrl: string,
  analyticsLogoUrl: string,
  productLogoUrl: string,
): Promise<string> {
  const [plot, qrCode, analyticsLogo, productLogo] = await Promise.all([
    loadImage(plotDataUrl),
    loadImage(qrCodeUrl),
    loadImage(analyticsLogoUrl),
    loadImage(productLogoUrl),
  ])
  const canvas = document.createElement('canvas')
  canvas.width = plot.naturalWidth
  canvas.height = plot.naturalHeight
  const context = canvas.getContext('2d')
  if (!context) throw new Error('Could not prepare the watermarked export image')

  context.drawImage(plot, 0, 0)
  const qrSize = Math.max(64, Math.round(Math.min(canvas.width * 0.095, canvas.height * 0.15)))
  const padding = Math.max(10, Math.round(qrSize * 0.07))
  const brandWidth = Math.round(qrSize * 1.75)
  const panelWidth = padding * 2 + brandWidth + qrSize
  const panelHeight = qrSize
  const margin = Math.max(16, Math.round(qrSize * 0.09))
  const panelX = canvas.width - panelWidth - margin
  const panelY = canvas.height - panelHeight - margin
  const panelRadius = Math.max(10, Math.round(qrSize * 0.1))

  context.save()
  context.fillStyle = 'rgba(255, 255, 255, 0.78)'
  context.beginPath()
  context.roundRect(panelX, panelY, panelWidth, panelHeight, panelRadius)
  context.fill()
  context.clip()

  const productAspectRatio = productLogo.naturalWidth / productLogo.naturalHeight
  const productHeight = brandWidth / productAspectRatio
  const rowGap = Math.max(5, Math.round(qrSize * 0.04))
  const analyticsWidth = Math.round(brandWidth * 0.55)
  const analyticsAspectRatio = analyticsLogo.naturalWidth / analyticsLogo.naturalHeight
  const analyticsHeight = analyticsWidth / analyticsAspectRatio
  const partnerHeight = Math.max(analyticsHeight, qrSize * 0.19)
  const brandHeight = productHeight + rowGap + partnerHeight
  const brandX = panelX + padding
  const brandY = panelY + (panelHeight - brandHeight) / 2
  context.drawImage(productLogo, brandX, brandY, brandWidth, productHeight)

  const partnerY = brandY + productHeight + rowGap
  const poweredFontSize = Math.max(9, Math.round(qrSize * 0.09))
  context.fillStyle = '#171717'
  context.font = `600 ${poweredFontSize}px Arial, sans-serif`
  context.textAlign = 'center'
  context.textBaseline = 'middle'
  context.fillText(
    'Powered by',
    brandX + (brandWidth - analyticsWidth) / 2,
    partnerY + partnerHeight * 0.55,
  )
  context.save()
  context.globalAlpha = 1
  context.drawImage(
    analyticsLogo,
    brandX + brandWidth - analyticsWidth,
    partnerY + (partnerHeight - analyticsHeight) / 2,
    analyticsWidth,
    analyticsHeight,
  )
  context.restore()
  context.drawImage(qrCode, panelX + padding * 2 + brandWidth, panelY, qrSize, qrSize)
  context.restore()
  return canvas.toDataURL('image/png')
}
