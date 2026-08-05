import { describe, expect, it } from 'vitest'
import { createBoat, createEmptyScenario } from '../src/lib/scenario'
import {
  createShareUrl,
  decodeScenario,
  encodeScenario,
  scenarioFromHash,
} from '../src/services/scenarioCodec'

describe('compressed share links', () => {
  it('compresses, URL-safe encodes and decodes a scenario', () => {
    const scenario = createEmptyScenario('Shared situation')
    scenario.objects.push(createBoat(100, 200))
    const encoded = encodeScenario(scenario)
    expect(encoded).toMatch(/^[A-Za-z0-9_-]+$/)
    expect(decodeScenario(encoded)).toEqual(scenario)
  })

  it('reads only the scenario URL fragment', () => {
    const scenario = createEmptyScenario()
    const url = createShareUrl(scenario, {
      origin: 'https://example.test',
      pathname: '/boats/',
    } as Location)
    expect(url).toMatch(/^https:\/\/example\.test\/boats\/#scenario=/)
    expect(scenarioFromHash(new URL(url).hash)).toEqual(scenario)
  })

  it('fails defensively for damaged links', () => {
    expect(() => decodeScenario('not-a-valid-compressed-scenario')).toThrow(/invalid or damaged/i)
  })
})
