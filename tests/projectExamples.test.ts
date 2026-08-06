import { describe, expect, it } from 'vitest'
import {
  createClearAheadAsternExample,
  createPortStarboardExample,
  createWindwardLeewardExample,
} from '../src/features/projects/examples'

describe('situation templates', () => {
  it.each([
    [createPortStarboardExample, 'RRS 10'],
    [createWindwardLeewardExample, 'RRS 11'],
    [createClearAheadAsternExample, 'RRS 12'],
  ])('creates two positioned boats with its rule reference', (createExample, ruleReference) => {
    const scenario = createExample()
    expect(scenario.metadata.ruleReferences).toEqual([ruleReference])
    expect(scenario.objects).toHaveLength(2)
    expect(scenario.objects.every((object) => object.type === 'boat')).toBe(true)
    expect(new Set(scenario.objects.map((object) => object.id)).size).toBe(2)
  })
})
