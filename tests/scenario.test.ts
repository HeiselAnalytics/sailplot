import { describe, expect, it } from 'vitest'
import {
  createBoat,
  createEmptyScenario,
  createMark,
  normalizeHeading,
  normalizeSignedAngle,
  sanitizeFilename,
} from '../src/lib/scenario'
import { scenarioSchema } from '../src/schemas/scenario'
import { VSR_COACHBOAT_BLUE } from '../src/editor/objects/boatShapes'
import { parseScenarioJson, serializeScenario } from '../src/services/scenarioFiles'

describe('scenario format', () => {
  it('round-trips a complete scenario without information loss', () => {
    const scenario = createEmptyScenario('Rule 18 example')
    scenario.objects.push(createBoat(120, 240))
    expect(parseScenarioJson(serializeScenario(scenario))).toEqual(scenario)
  })

  it('rejects invalid objects with an understandable path', () => {
    const scenario = createEmptyScenario()
    scenario.objects = [{ type: 'boat' }] as never
    expect(() => parseScenarioJson(JSON.stringify(scenario))).toThrow(/objects\.0/)
  })

  it('rejects future format versions', () => {
    const scenario = { ...createEmptyScenario(), version: 99 }
    expect(() => parseScenarioJson(JSON.stringify(scenario))).toThrow(/version 99/i)
  })

  it('normalizes headings and filenames', () => {
    expect(normalizeHeading(-10)).toBe(350)
    expect(normalizeHeading(725)).toBe(5)
    expect(normalizeSignedAngle(270)).toBe(-90)
    expect(normalizeSignedAngle(-90)).toBe(-90)
    expect(normalizeSignedAngle(180)).toBe(180)
    expect(sanitizeFilename(' Windward Mark / RRS 18 ')).toBe('windward-mark-rrs-18')
    expect(scenarioSchema.safeParse(createEmptyScenario()).success).toBe(true)
  })

  it('creates mark zones as three boat lengths by default', () => {
    expect(createMark(100, 200)).toMatchObject({
      markNumber: 1,
      downwind: false,
      label: '',
      zoneRadius: 3,
      zoneRadiusUnit: 'boat-lengths',
    })
  })

  it('migrates legacy pixel zones to boat lengths', () => {
    const scenario = createEmptyScenario()
    const legacyMark = createMark(100, 200) as Partial<ReturnType<typeof createMark>>
    legacyMark.zoneRadius = 108
    delete legacyMark.zoneRadiusUnit
    scenario.objects = [legacyMark as ReturnType<typeof createMark>]

    expect(parseScenarioJson(serializeScenario(scenario)).objects[0]).toMatchObject({
      type: 'mark',
      zoneRadius: 3,
      zoneRadiusUnit: 'boat-lengths',
    })
  })

  it('adds full grid visibility to older scenarios', () => {
    const scenario = createEmptyScenario()
    delete (scenario.canvas.grid as Partial<typeof scenario.canvas.grid>).opacity

    expect(parseScenarioJson(serializeScenario(scenario)).canvas.grid.opacity).toBe(1)
  })

  it('shows boat numbers by default and preserves the scene visibility setting', () => {
    const legacy = createEmptyScenario()
    delete (legacy.canvas as Partial<typeof legacy.canvas>).boatNumbersVisible
    expect(parseScenarioJson(serializeScenario(legacy)).canvas.boatNumbersVisible).toBe(true)

    const scenario = createEmptyScenario()
    scenario.canvas.boatNumbersVisible = false
    expect(parseScenarioJson(serializeScenario(scenario)).canvas.boatNumbersVisible).toBe(false)
  })

  it('normalizes legacy boats into numbered chains with spinnaker defaults', () => {
    const scenario = createEmptyScenario()
    const legacyBoat = createBoat(120, 240) as Partial<ReturnType<typeof createBoat>>
    delete legacyBoat.sequenceId
    delete legacyBoat.positionNumber
    delete legacyBoat.genoaVisible
    delete legacyBoat.spinnakerVisible
    delete legacyBoat.spinnakerTrim
    delete legacyBoat.mainsailTrim
    scenario.canvas.view.scale = 0.42
    scenario.objects = [legacyBoat as ReturnType<typeof createBoat>]

    const parsed = parseScenarioJson(serializeScenario(scenario))
    expect(parsed.canvas.view.scale).toBe(1)
    expect(parsed.objects[0]).toMatchObject({
      type: 'boat',
      positionNumber: 1,
      genoaVisible: false,
      spinnakerVisible: false,
      spinnakerTrim: 0,
      mainsailTrim: 0,
    })
    expect(parsed.objects[0].type === 'boat' && parsed.objects[0].sequenceId).toBeTruthy()
  })

  it('normalizes every VSR Coachboat to its fixed blue', () => {
    const scenario = createEmptyScenario()
    const oldDefault = { ...createBoat(120, 240, 1, 'VSR Coachboat'), color: '#1677B8' }
    const custom = { ...createBoat(240, 240, 2, 'VSR Coachboat'), color: '#DF3F3F' }
    scenario.objects = [oldDefault, custom]

    const migrated = parseScenarioJson(serializeScenario(scenario))
    expect(migrated.objects[0]).toMatchObject({ color: VSR_COACHBOAT_BLUE })
    expect(migrated.objects[1]).toMatchObject({ color: VSR_COACHBOAT_BLUE })
  })
})
