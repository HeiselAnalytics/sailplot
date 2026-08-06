import type { BoatClass, ScenarioObject } from '../types/scenario'
import { isDarkPlotBackground } from './plotTheme'

export const COACHBOAT_BLUE = '#168DDD'
export const JURY_BOAT_GREY = '#4B5563'

export function boatColorForClass(boatClass: BoatClass, color: string): string {
  if (boatClass === 'Coachboat') return COACHBOAT_BLUE
  if (boatClass === 'Jury boat') return JURY_BOAT_GREY
  return color
}

export const BOAT_COLOR_PALETTE = [
  { name: 'Heisel amber', value: '#FFAA00' },
  { name: 'Midnight navy', value: '#18324A' },
  { name: 'Alpine blue', value: '#2F5D78' },
  { name: 'Deep teal', value: '#1F6D68' },
  { name: 'Forest green', value: '#4F6B52'},
  { name: 'Burgundy', value: '#884454' },
  { name: 'Copper', value: '#B46632' },
  { name: 'Slate', value: '#5B6572' },
] as const

export const DARK_BOAT_COLOR_PALETTE = [
  { name: 'Heisel amber', value: '#FFAA00' },
  { name: 'Glacier blue', value: '#79B8D1' },
  { name: 'Clear blue', value: '#5F9FC2' },
  { name: 'Sea glass', value: '#55B5AA' },
  { name: 'Sage', value: '#89AA8C' },
  { name: 'Dusty rose', value: '#D2879E' },
  { name: 'Warm copper', value: '#D99A68' },
  { name: 'Silver', value: '#B8C1C9' },
] as const

export type ColorPalette = ReadonlyArray<{ name: string; value: string }>

const normalized = (color: string) => color.toUpperCase()

export const boatColorPaletteForBackground = (background: string): ColorPalette =>
  isDarkPlotBackground(background) ? DARK_BOAT_COLOR_PALETTE : BOAT_COLOR_PALETTE

export function mapBoatColorBetweenPalettes(
  color: string,
  fromBackground: string,
  toBackground: string,
): string {
  const source = boatColorPaletteForBackground(fromBackground)
  const target = boatColorPaletteForBackground(toBackground)
  const sourceIndex = source.findIndex(({ value }) => normalized(value) === normalized(color))
  return sourceIndex >= 0 ? target[sourceIndex].value : color
}

export function nextBoatColor(
  objects: ScenarioObject[],
  palette: ColorPalette = BOAT_COLOR_PALETTE,
): string {
  const seenSequences = new Set<string>()
  const chainColors: string[] = []

  for (const object of objects) {
    if (object.type !== 'boat' || seenSequences.has(object.sequenceId)) continue
    seenSequences.add(object.sequenceId)
    chainColors.push(normalized(object.color))
  }

  const unused = palette.find(({ value }) => !chainColors.includes(normalized(value)))
  if (unused) return unused.value

  const lastColor = chainColors.at(-1)
  const lastIndex = palette.findIndex(({ value }) => normalized(value) === lastColor)
  return palette[(lastIndex + 1) % palette.length].value
}
