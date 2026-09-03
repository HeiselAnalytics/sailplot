import { describe, expect, it } from 'vitest'
import QRCode from 'qrcode'
import { deflate } from 'pako'
import { createBoat, createEmptyScenario } from '../src/lib/scenario'
import {
  createQrShareUrl,
  createShareUrl,
  decodeScenario,
  encodeScenario,
  scenarioFromHash,
} from '../src/services/scenarioCodec'

const withoutTechnicalIdentity = (input: ReturnType<typeof createEmptyScenario>) => {
  const scenario = structuredClone(input)
  scenario.metadata.id = ''
  scenario.metadata.createdAt = ''
  scenario.metadata.updatedAt = ''
  scenario.metadata.additionalInformation.forEach((entry) => (entry.id = ''))
  scenario.canvas.view = { x: 0, y: 0, scale: 1 }
  const sequences = new Map<string, number>()
  scenario.objects.forEach((object) => {
    object.id = ''
    if (object.type !== 'boat') return
    if (!sequences.has(object.sequenceId)) sequences.set(object.sequenceId, sequences.size)
    object.sequenceId = String(sequences.get(object.sequenceId))
  })
  return scenario
}

describe('compressed share links', () => {
  it('compresses, QR-optimizes and decodes a plot without visible information loss', () => {
    const scenario = createEmptyScenario('Shared situation')
    scenario.objects.push(createBoat(100, 200))
    const encoded = encodeScenario(scenario)

    expect(encoded).toMatch(/^[A-Za-z0-9_-]+$/)
    expect(withoutTechnicalIdentity(decodeScenario(encoded))).toEqual(
      withoutTechnicalIdentity(scenario),
    )
  })

  it('creates the versioned plot URL without query parameters', () => {
    const scenario = createEmptyScenario()
    const url = createShareUrl(scenario, {
      origin: 'https://example.test',
      pathname: '/boats/',
    } as Location)

    expect(url).toMatch(/^https:\/\/example\.test\/boats\/#2[A-Za-z0-9_-]+$/)
    expect(withoutTechnicalIdentity(scenarioFromHash(new URL(url).hash)!)).toEqual(
      withoutTechnicalIdentity(scenario),
    )
  })

  it('omits pan and zoom state and always opens shared plots at 100%', () => {
    const scenario = createEmptyScenario()
    const encodedAt100Percent = encodeScenario(scenario)
    scenario.canvas.view = { x: 240, y: -80, scale: 3.25 }
    const encodedWhileZoomed = encodeScenario(scenario)

    const opened = decodeScenario(encodedWhileZoomed)

    expect(encodedWhileZoomed).toBe(encodedAt100Percent)
    expect(opened.canvas.view).toEqual({ x: 0, y: 0, scale: 1 })
  })

  it('produces a substantially smaller QR matrix than compressed full JSON', () => {
    const scenario = createEmptyScenario('Shared situation')
    scenario.objects.push(createBoat(100, 200))
    const compactUrl = createQrShareUrl(scenario, {
      origin: 'https://sailplot.app',
      pathname: '/',
    } as Location)
    const oldPayload = Buffer.from(deflate(JSON.stringify(scenario), { level: 9 })).toString(
      'base64url',
    )
    const oldUrl = `https://sailplot.app/#plot=${oldPayload}`

    const compactQr = QRCode.create(compactUrl, { errorCorrectionLevel: 'L' })
    const oldQr = QRCode.create(oldUrl, { errorCorrectionLevel: 'M' })
    expect(compactQr.modules.size).toBeLessThan(oldQr.modules.size * 0.7)
  })

  it('keeps version 1 QR and legacy message links readable', () => {
    const scenario = createEmptyScenario('Legacy-compatible plot')
    scenario.objects.push(createBoat(100, 200))
    const legacyUrl = createQrShareUrl(scenario, {
      origin: 'https://sailplot.app',
      pathname: '/',
    } as Location)

    expect(legacyUrl).toMatch(/^https:\/\/sailplot\.app\/#1[0-9A-Z*./:-]+$/)
    expect(withoutTechnicalIdentity(scenarioFromHash(new URL(legacyUrl).hash)!)).toEqual(
      withoutTechnicalIdentity(scenario),
    )
  })

  it('rejects unsupported future share formats', () => {
    expect(() => scenarioFromHash('#3ABC')).toThrow(/future share format version 3/i)
  })

  it('fails defensively for damaged links', () => {
    expect(() => decodeScenario('NOT:VALID*COMPACT/DATA')).toThrow(/invalid or damaged/i)
  })
})
