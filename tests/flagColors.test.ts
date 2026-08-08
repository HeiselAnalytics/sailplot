import { describe, expect, it } from 'vitest'
import { SAILING_FLAG_COLOR_PALETTE } from '../src/lib/flagColors'

describe('sailing signal flag palette', () => {
  it('offers the high-contrast colors used for sailing and maritime signal flags', () => {
    expect(SAILING_FLAG_COLOR_PALETTE).toEqual([
      { name: 'Starting-line orange', value: '#FF5E00' },
      { name: 'Finishing-line blue', value: '#168DDD' },
      { name: 'Signal red', value: '#D72638' },
      { name: 'Signal yellow', value: '#FFD100' },
      { name: 'Signal green', value: '#00843D' },
      { name: 'Signal black', value: '#171717' },
      { name: 'Signal white', value: '#FFFFFF' },
    ])
  })
})
