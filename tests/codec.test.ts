import { describe, expect, it } from 'vitest'
import { createBoat, createEmptyScenario } from '../src/lib/scenario'
import {
  createShareUrl,
  decodeScenario,
  encodeScenario,
  scenarioFromHash,
} from '../src/services/scenarioCodec'

describe('compressed share links', () => {
  it('compresses, URL-safe encodes and decodes a plot', () => {
    const scenario = createEmptyScenario('Shared situation')
    scenario.objects.push(createBoat(100, 200))
    const encoded = encodeScenario(scenario)
    expect(encoded).toMatch(/^[A-Za-z0-9_-]+$/)
    expect(decodeScenario(encoded)).toEqual(scenario)
  })

  it('creates and reads the plot URL fragment', () => {
    const scenario = createEmptyScenario()
    const url = createShareUrl(scenario, {
      origin: 'https://example.test',
      pathname: '/boats/',
    } as Location)
    expect(url).toMatch(/^https:\/\/example\.test\/boats\/#plot=/)
    expect(scenarioFromHash(new URL(url).hash)).toEqual(scenario)
  })

  it('continues to read legacy scenario URL fragments', () => {
    const scenario = createEmptyScenario()
    expect(scenarioFromHash(`#scenario=${encodeScenario(scenario)}`)).toEqual(scenario)
  })

  it('fails defensively for damaged links', () => {
    expect(() => decodeScenario('not-a-valid-compressed-plot')).toThrow(/invalid or damaged/i)
  })
})
