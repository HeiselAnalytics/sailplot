import type { BoatClass, ScenarioObject } from '../types/scenario'

export const VSR_COACHBOAT_BLUE = '#168DDD'

export function boatColorForClass(boatClass: BoatClass, color: string): string {
  return boatClass === 'VSR Coachboat' ? VSR_COACHBOAT_BLUE : color
}

export const BOAT_COLOR_PALETTE = [
  { name: 'Ocean blue', value: '#2563EB' },
  { name: 'Signal red', value: '#DF3F3F' },
  { name: 'Deep teal', value: '#0F766E' },
  { name: 'Regatta violet', value: '#7C3AED' },
  { name: 'Burnt orange', value: '#C2410C' },
  { name: 'Racing magenta', value: '#BE185D' },
  { name: 'Slate', value: '#475569' },
  { name: 'Heisel amber', value: '#FFAA00' },
] as const

const normalized = (color: string) => color.toUpperCase()

export function nextBoatColor(objects: ScenarioObject[]): string {
  const seenSequences = new Set<string>()
  const chainColors: string[] = []

  for (const object of objects) {
    if (object.type !== 'boat' || seenSequences.has(object.sequenceId)) continue
    seenSequences.add(object.sequenceId)
    chainColors.push(normalized(object.color))
  }

  const unused = BOAT_COLOR_PALETTE.find(({ value }) => !chainColors.includes(normalized(value)))
  if (unused) return unused.value

  const lastColor = chainColors.at(-1)
  const lastIndex = BOAT_COLOR_PALETTE.findIndex(({ value }) => normalized(value) === lastColor)
  return BOAT_COLOR_PALETTE[(lastIndex + 1) % BOAT_COLOR_PALETTE.length].value
}
