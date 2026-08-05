import { describe, expect, it } from 'vitest'
import { BOAT_COLOR_PALETTE, nextBoatColor } from '../src/lib/boatColors'
import { createBoat } from '../src/lib/scenario'

describe('boat color palette', () => {
  it('uses the first unused palette color for each new chain', () => {
    const first = createBoat(100, 100)
    const secondPosition = {
      ...createBoat(140, 100),
      sequenceId: first.sequenceId,
      positionNumber: 2,
    }
    expect(nextBoatColor([])).toBe(BOAT_COLOR_PALETTE[0].value)
    expect(nextBoatColor([first, secondPosition])).toBe(BOAT_COLOR_PALETTE[1].value)
  })

  it('cycles after every palette color has been used', () => {
    const boats = BOAT_COLOR_PALETTE.map(({ value }, index) => ({
      ...createBoat(index * 40, 100),
      color: value,
    }))
    expect(nextBoatColor(boats)).toBe(BOAT_COLOR_PALETTE[0].value)
  })
})
