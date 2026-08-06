import QRCode from 'qrcode'

const QUIET_ZONE = 4
const FINDER_SIZE = 7
const QR_DARK = '#171717'

const escapeXml = (value: string) =>
  value.replace(/[&<>"']/g, (character) => {
    const entities: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&apos;',
    }
    return entities[character]
  })

const isFinderModule = (row: number, column: number, size: number) =>
  (row < FINDER_SIZE && column < FINDER_SIZE) ||
  (row < FINDER_SIZE && column >= size - FINDER_SIZE) ||
  (row >= size - FINDER_SIZE && column < FINDER_SIZE)

export function createPlotQrCodeDataUrl(plotUrl: string, primaryColor: string): string {
  if (!plotUrl) throw new Error('Could not create a QR code without a plot link.')

  let code: ReturnType<typeof QRCode.create>
  try {
    // The clean export surface does not need high damage resistance. Level L keeps
    // long, self-contained plot links noticeably less dense and easier to scan.
    code = QRCode.create(plotUrl, { errorCorrectionLevel: 'L' })
  } catch {
    throw new Error('This plot link is too long for a QR code. Use the JSON export instead.')
  }

  const size = code.modules.size
  const canvasSize = size + QUIET_ZONE * 2
  const modules: string[] = []

  for (let row = 0; row < size; row += 1) {
    for (let column = 0; column < size; column += 1) {
      if (!code.modules.get(row, column) || isFinderModule(row, column, size)) continue
      modules.push(
        `<rect x="${column + QUIET_ZONE + 0.08}" y="${row + QUIET_ZONE + 0.08}" width="0.84" height="0.84" rx="0.22"/>`,
      )
    }
  }

  const primary = escapeXml(primaryColor)
  const finder = (column: number, row: number) => {
    const x = column + QUIET_ZONE
    const y = row + QUIET_ZONE
    return [
      `<rect x="${x}" y="${y}" width="7" height="7" rx="1.35" fill="${QR_DARK}"/>`,
      `<rect x="${x + 1}" y="${y + 1}" width="5" height="5" rx="0.9" fill="#fff"/>`,
      `<rect data-finder-centre="true" x="${x + 2}" y="${y + 2}" width="3" height="3" rx="0.7" fill="${primary}"/>`,
    ].join('')
  }
  const svg = [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${canvasSize} ${canvasSize}" shape-rendering="geometricPrecision">`,
    `<rect width="${canvasSize}" height="${canvasSize}" rx="2" fill="#fff"/>`,
    `<g fill="${QR_DARK}">${modules.join('')}</g>`,
    finder(0, 0),
    finder(size - FINDER_SIZE, 0),
    finder(0, size - FINDER_SIZE),
    '</svg>',
  ].join('')

  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
}
