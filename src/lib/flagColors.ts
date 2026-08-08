import { SAILPLOT_AMBER, type ColorPalette, withBrandAccent } from './boatColors'

export const SAILING_FLAG_COLOR_PALETTE = [
  { name: 'Starting-line orange', value: '#FFAA00' },
  { name: 'Finishing-line blue', value: '#168DDD' },
  { name: 'Signal red', value: '#D72638' },
  { name: 'Signal yellow', value: '#FFD100' },
  { name: 'Signal green', value: '#00843D' },
  { name: 'Signal black', value: '#171717' },
  { name: 'Signal white', value: '#FFFFFF' },
] as const satisfies ColorPalette

export function sailingFlagColorPalette(brandAccentColor = SAILPLOT_AMBER): ColorPalette {
  return withBrandAccent(SAILING_FLAG_COLOR_PALETTE, brandAccentColor)
}
