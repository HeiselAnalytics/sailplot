const ORIGINAL_SAILPLOT_ACCENT = /#ffaa00/giu
const HEX_COLOR = /^#[0-9a-f]{6}$/iu

export function applySailPlotLogoAccent(svg: string, accentColor: string): string {
  if (!HEX_COLOR.test(accentColor)) return svg
  return svg.replace(ORIGINAL_SAILPLOT_ACCENT, accentColor)
}

export async function recolorSailPlotLogo(
  source: string,
  accentColor: string,
  signal?: AbortSignal,
): Promise<string> {
  if (!HEX_COLOR.test(accentColor)) return source

  const response = await fetch(source, { signal })
  if (!response.ok) throw new Error(`Could not load SailPlot logo: ${response.status}`)

  const svg = await response.text()
  if (!/<svg(?:\s|>)/iu.test(svg)) return source

  const recolored = applySailPlotLogoAccent(svg, accentColor)
  if (recolored === svg) return source

  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(recolored)}`
}
