import { describe, expect, it } from 'vitest'
import {
  BOAT_COLOR_PALETTE,
  boatColorPaletteForBackground,
  DARK_BOAT_COLOR_PALETTE,
  mapBoatColorBetweenPalettes,
  nextBoatColor,
} from '../src/lib/boatColors'
import { createBoat, PLOT_BACKGROUNDS } from '../src/lib/scenario'

describe('boat color palette', () => {
  it('uses the Heisel-aligned premium sailing colors in their creation order', () => {
    expect(BOAT_COLOR_PALETTE).toEqual([
      { name: 'Heisel amber', value: '#FFAA00' },
      { name: 'Midnight navy', value: '#18324A' },
      { name: 'Alpine blue', value: '#2F5D78' },
      { name: 'Deep teal', value: '#1F6D68' },
      { name: 'Forest green', value: '#4F6B52' },
      { name: 'Burgundy', value: '#884454' },
      { name: 'Copper', value: '#B46632' },
      { name: 'Slate', value: '#5B6572' },
    ])
  })

  it('uses a brighter premium palette on dark plots', () => {
    expect(DARK_BOAT_COLOR_PALETTE).toEqual([
      { name: 'Heisel amber', value: '#FFAA00' },
      { name: 'Glacier blue', value: '#79B8D1' },
      { name: 'Clear blue', value: '#5F9FC2' },
      { name: 'Sea glass', value: '#55B5AA' },
      { name: 'Sage', value: '#89AA8C' },
      { name: 'Dusty rose', value: '#D2879E' },
      { name: 'Warm copper', value: '#D99A68' },
      { name: 'Silver', value: '#B8C1C9' },
    ])
    expect(boatColorPaletteForBackground(PLOT_BACKGROUNDS.light)).toBe(BOAT_COLOR_PALETTE)
    expect(boatColorPaletteForBackground(PLOT_BACKGROUNDS.dark)).toBe(DARK_BOAT_COLOR_PALETTE)
  })

  it('replaces the first amber swatch with a configured tenant primary color', () => {
    const palette = boatColorPaletteForBackground(PLOT_BACKGROUNDS.light, '#0f766e')

    expect(palette[0]).toEqual({ name: 'Brand primary', value: '#0f766e' })
    expect(palette.slice(1)).toEqual(BOAT_COLOR_PALETTE.slice(1))
  })

  it('maps standard colors between plot palettes and preserves custom colors', () => {
    expect(
      mapBoatColorBetweenPalettes('#18324a', PLOT_BACKGROUNDS.light, PLOT_BACKGROUNDS.dark),
    ).toBe('#79B8D1')
    expect(
      mapBoatColorBetweenPalettes('#79b8d1', PLOT_BACKGROUNDS.dark, PLOT_BACKGROUNDS.light),
    ).toBe('#18324A')
    expect(
      mapBoatColorBetweenPalettes('#DF3F3F', PLOT_BACKGROUNDS.light, PLOT_BACKGROUNDS.dark),
    ).toBe('#DF3F3F')
  })

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

  it('uses the dark palette creation order on a dark plot', () => {
    const first = { ...createBoat(100, 100), color: DARK_BOAT_COLOR_PALETTE[0].value }
    expect(nextBoatColor([first], DARK_BOAT_COLOR_PALETTE)).toBe(DARK_BOAT_COLOR_PALETTE[1].value)
  })
})
