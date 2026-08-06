import { describe, expect, it } from 'vitest'
import { normalizeRuleReference } from '../src/lib/ruleReferences'

describe('normalizeRuleReference', () => {
  it.each([
    ['18', 'RRS 18'],
    ['18a', 'RRS 18(a)'],
    ['18.2', 'RRS 18.2'],
    ['18.2a', 'RRS 18.2(a)'],
    ['18.2(a)', 'RRS 18.2(a)'],
    ['18.2(a)(1)', 'RRS 18.2(a)(1)'],
    ['A5.2', 'RRS A5.2'],
    ['rss 10', 'RRS 10'],
  ])('formats %s as %s', (input, expected) => {
    expect(normalizeRuleReference(input)).toBe(expected)
  })

  it('keeps non-RRS references unchanged', () => {
    expect(normalizeRuleReference('Case 123')).toBe('Case 123')
  })
})
