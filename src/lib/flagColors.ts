import type { ColorPalette } from './boatColors'

export const SAILING_FLAG_COLOR_PALETTE = [
  { name: 'Starting-line orange', value: '#FF5E00' },
  { name: 'Finishing-line blue', value: '#168DDD' },
  { name: 'Signal red', value: '#D72638' },
  { name: 'Signal yellow', value: '#FFD100' },
  { name: 'Signal green', value: '#00843D' },
  { name: 'Signal black', value: '#171717' },
  { name: 'Signal white', value: '#FFFFFF' },
] as const satisfies ColorPalette
