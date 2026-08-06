export const PLOT_BACKGROUNDS = {
  light: '#F8FBFC',
  dark: '#262626',
} as const

export const PLOT_GRID_OPACITY = {
  light: 1,
  dark: 0.4,
} as const

export const normalizePlotBackground = (color: string) =>
  color.toUpperCase() === '#20262B' ? PLOT_BACKGROUNDS.dark : color

export const isDarkPlotBackground = (color: string) => {
  const match = /^#([0-9a-f]{6})$/i.exec(color)
  if (!match) return false
  const value = Number.parseInt(match[1], 16)
  const red = (value >> 16) & 0xff
  const green = (value >> 8) & 0xff
  const blue = value & 0xff
  return red * 0.299 + green * 0.587 + blue * 0.114 < 128
}

export function gridOpacityForBackgroundChange(
  opacity: number,
  fromBackground: string,
  toBackground: string,
) {
  const fromDefault = isDarkPlotBackground(fromBackground)
    ? PLOT_GRID_OPACITY.dark
    : PLOT_GRID_OPACITY.light
  const toDefault = isDarkPlotBackground(toBackground)
    ? PLOT_GRID_OPACITY.dark
    : PLOT_GRID_OPACITY.light

  if (fromBackground === toBackground) {
    return isDarkPlotBackground(toBackground) && opacity === PLOT_GRID_OPACITY.light
      ? PLOT_GRID_OPACITY.dark
      : opacity
  }
  return opacity === fromDefault ? toDefault : opacity
}
