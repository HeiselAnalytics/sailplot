import { describe, expect, it } from 'vitest'
import {
  createBoat,
  createEmptyScenario,
  createFinishLine,
  createGate,
  createMark,
  createStartLine,
  FINISH_FLAG_COLOR,
  isDarkPlotBackground,
  nextUntitledPlotTitle,
  normalizeHeading,
  normalizeSignedAngle,
  PLOT_BACKGROUNDS,
  sanitizeFilename,
  START_FLAG_COLOR,
} from '../src/lib/scenario'
import { SAILPLOT_AMBER } from '../src/lib/boatColors'
import { scenarioSchema } from '../src/schemas/scenario'
import { COACHBOAT_BLUE } from '../src/editor/objects/boatShapes'
import { parseScenarioJson, serializeScenario } from '../src/services/scenarioFiles'

describe('plot format', () => {
  it('round-trips a complete plot without information loss', () => {
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

  it('imports the legacy scenario format and normalizes it to sailplot', () => {
    const legacy = { ...createEmptyScenario(), format: 'sailing-scenario' }
    expect(parseScenarioJson(JSON.stringify(legacy)).format).toBe('sailplot')
  })

  it('migrates legacy wind strength into removable additional information', () => {
    const legacy = createEmptyScenario()
    delete (legacy.metadata as Partial<typeof legacy.metadata>).additionalInformation
    legacy.environment.windStrength = '12 kn'

    const migrated = parseScenarioJson(JSON.stringify(legacy))
    expect(migrated.metadata.additionalInformation).toEqual([
      expect.objectContaining({ name: 'Wind strength', value: '12 kn' }),
    ])
  })

  it('preserves an intentionally empty additional-information list', () => {
    const scenario = createEmptyScenario()
    scenario.metadata.additionalInformation = []
    expect(parseScenarioJson(serializeScenario(scenario)).metadata.additionalInformation).toEqual(
      [],
    )
  })

  it('limits additional information to ten fields', () => {
    const scenario = createEmptyScenario()
    scenario.metadata.additionalInformation = Array.from({ length: 11 }, (_, index) => ({
      id: `information-${index}`,
      name: `Name ${index}`,
      value: `Value ${index}`,
    }))
    expect(() => parseScenarioJson(serializeScenario(scenario))).toThrow(
      /metadata\.additionalInformation/,
    )
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

  it('numbers untitled plots after the highest local default title', () => {
    expect(nextUntitledPlotTitle('Untitled plot', [])).toBe('Untitled plot 1')
    expect(
      nextUntitledPlotTitle('Untitled plot', [
        'Untitled plot',
        'Untitled plot 2',
        'Unbenannter Plot 7',
        'Untitled plot notes',
      ]),
    ).toBe('Untitled plot 8')
    expect(nextUntitledPlotTitle('Unbenannter Plot', ['Untitled plot 3'])).toBe(
      'Unbenannter Plot 4',
    )
  })

  it('provides persistent light and dark plot backgrounds', () => {
    const scenario = createEmptyScenario()
    expect(scenario.canvas.background).toBe(PLOT_BACKGROUNDS.light)
    expect(isDarkPlotBackground(PLOT_BACKGROUNDS.light)).toBe(false)
    expect(isDarkPlotBackground(PLOT_BACKGROUNDS.dark)).toBe(true)

    scenario.canvas.background = PLOT_BACKGROUNDS.dark
    expect(parseScenarioJson(serializeScenario(scenario)).canvas.background).toBe(
      PLOT_BACKGROUNDS.dark,
    )

    scenario.canvas.background = '#20262B'
    expect(parseScenarioJson(serializeScenario(scenario)).canvas.background).toBe(
      PLOT_BACKGROUNDS.dark,
    )
  })

  it('creates mark zones as three boat lengths by default', () => {
    expect(createMark(100, 200)).toMatchObject({
      markNumber: '1',
      downwind: false,
      label: '',
      zoneRadius: 3,
      zoneRadiusUnit: 'boat-lengths',
    })
  })

  it('accepts independent configured defaults for boats, marks, gates, and start flags', () => {
    expect(createBoat(100, 200, 1, 'ILCA', '#0f766e').color).toBe('#0f766e')
    expect(createMark(100, 200, 1, '#D72638').color).toBe('#D72638')
    expect(createGate(100, 200, 300, 200, 1, 1, 3, '#F97316').color).toBe('#F97316')
    expect(createStartLine(100, 200, 500, 200, 1, '#663399')).toMatchObject({
      startEndFlagColor: '#663399',
      pinEndFlagColor: '#663399',
      laylineAreaColor: SAILPLOT_AMBER,
    })
  })

  it('preserves alphanumeric mark numbers and migrates legacy numeric values', () => {
    const scenario = createEmptyScenario()
    scenario.objects = [{ ...createMark(100, 200), markNumber: '18z' }]
    expect(parseScenarioJson(serializeScenario(scenario)).objects[0]).toMatchObject({
      type: 'mark',
      markNumber: '18z',
    })

    const legacy = createEmptyScenario()
    const legacyMark = createMark(100, 200) as unknown as { markNumber: number }
    legacyMark.markNumber = 18
    legacy.objects = [legacyMark as unknown as ReturnType<typeof createMark>]
    expect(parseScenarioJson(serializeScenario(legacy)).objects[0]).toMatchObject({
      type: 'mark',
      markNumber: '18',
    })
  })

  it('creates a gate as one compound object', () => {
    const gate = createGate(100, 200, 300, 200, 4, 4, 3)
    expect(gate).toMatchObject({
      type: 'gate',
      x: 200,
      y: 200,
      endAX: -100,
      endAY: 0,
      endBX: 100,
      endBY: 0,
      markNumber: 4,
      rotation: 0,
      zIndex: 4,
      zoneRadius: 3,
    })
  })

  it('creates a start line as one object with exchangeable endpoints', () => {
    const startLine = createStartLine(100, 200, 500, 200, 3)
    expect(startLine).toMatchObject({
      type: 'start-line',
      x: 300,
      y: 200,
      endAX: -200,
      endAY: 0,
      endBX: 200,
      endBY: 0,
      rotation: 0,
      startEndType: 'committee-boat',
      pinEndType: 'flag',
      startEndFlagColor: START_FLAG_COLOR,
      pinEndFlagColor: START_FLAG_COLOR,
      laylinesVisible: false,
      laylineAreaVisible: false,
      laylineAreaColor: SAILPLOT_AMBER,
    })
  })

  it('creates a finish line with a committee boat and blue signal-flag endpoint', () => {
    const finishLine = createFinishLine(100, 200, 500, 200, 4)
    expect(finishLine).toMatchObject({
      type: 'finish-line',
      x: 300,
      y: 200,
      endAX: -200,
      endAY: 0,
      endBX: 200,
      endBY: 0,
      rotation: 0,
      startEndType: 'committee-boat',
      pinEndType: 'flag',
      startEndFlagColor: FINISH_FLAG_COLOR,
      pinEndFlagColor: FINISH_FLAG_COLOR,
      laylinesVisible: false,
      laylineAreaVisible: false,
      laylineAreaColor: FINISH_FLAG_COLOR,
      zIndex: 4,
    })
  })

  it('persists line options and supplies defaults to legacy lines', () => {
    const scenario = createEmptyScenario()
    const startLine = {
      ...createStartLine(100, 200, 500, 200),
      startEndType: 'flag' as const,
      startEndFlagColor: '#DF3F3F',
      pinEndFlagColor: '#1F6D68',
      laylinesVisible: true,
      laylineAreaVisible: true,
      laylineAreaColor: '#884454',
    }
    scenario.objects = [startLine]
    expect(parseScenarioJson(serializeScenario(scenario)).objects[0]).toEqual(startLine)

    const legacyLine = createFinishLine(100, 200, 500, 200) as Partial<
      ReturnType<typeof createFinishLine>
    >
    delete legacyLine.startEndFlagColor
    delete legacyLine.pinEndFlagColor
    delete legacyLine.laylinesVisible
    delete legacyLine.laylineAreaVisible
    delete legacyLine.laylineAreaColor
    scenario.objects = [legacyLine as ReturnType<typeof createFinishLine>]
    expect(parseScenarioJson(serializeScenario(scenario)).objects[0]).toMatchObject({
      startEndFlagColor: FINISH_FLAG_COLOR,
      pinEndFlagColor: FINISH_FLAG_COLOR,
      laylinesVisible: false,
      laylineAreaVisible: false,
      laylineAreaColor: FINISH_FLAG_COLOR,
    })
  })

  it('numbers a legacy gate after existing marks regardless of object order', () => {
    const scenario = createEmptyScenario()
    const legacyGate = {
      ...createGate(100, 200, 340, 200),
      width: 240,
    } as Partial<ReturnType<typeof createGate>> & { width: number }
    delete legacyGate.endAX
    delete legacyGate.endAY
    delete legacyGate.endBX
    delete legacyGate.endBY
    delete legacyGate.markNumber
    const thirdMark = { ...createMark(500, 200), markNumber: '3' }
    scenario.objects = [legacyGate, thirdMark] as typeof scenario.objects

    expect(parseScenarioJson(serializeScenario(scenario)).objects[0]).toMatchObject({
      type: 'gate',
      markNumber: 4,
      endAX: -120,
      endBX: 120,
    })
  })

  it('migrates legacy pixel zones to boat lengths', () => {
    const scenario = createEmptyScenario()
    const legacyMark = createMark(100, 200) as Partial<ReturnType<typeof createMark>>
    legacyMark.zoneRadius = 108
    legacyMark.rotation = 87
    legacyMark.shape = 'pin'
    delete legacyMark.zoneRadiusUnit
    scenario.objects = [legacyMark as ReturnType<typeof createMark>]

    expect(parseScenarioJson(serializeScenario(scenario)).objects[0]).toMatchObject({
      type: 'mark',
      rotation: 0,
      shape: 'flag',
      zoneRadius: 3,
      zoneRadiusUnit: 'boat-lengths',
    })
  })

  it('adds full grid visibility to older plots', () => {
    const scenario = createEmptyScenario()
    delete (scenario.canvas.grid as Partial<typeof scenario.canvas.grid>).opacity

    expect(parseScenarioJson(serializeScenario(scenario)).canvas.grid.opacity).toBe(1)
  })

  it('shows boat numbers and the boat legend by default and preserves both settings', () => {
    const legacy = createEmptyScenario()
    delete (legacy.canvas as Partial<typeof legacy.canvas>).boatNumbersVisible
    delete (legacy.canvas as Partial<typeof legacy.canvas>).boatLegendVisible
    delete (legacy.environment as Partial<typeof legacy.environment>).measurementBoatClass
    expect(parseScenarioJson(serializeScenario(legacy)).canvas.boatNumbersVisible).toBe(true)
    expect(parseScenarioJson(serializeScenario(legacy)).canvas.boatLegendVisible).toBe(true)
    expect(parseScenarioJson(serializeScenario(legacy)).environment.measurementBoatClass).toBeNull()

    const scenario = createEmptyScenario()
    scenario.canvas.boatNumbersVisible = false
    scenario.canvas.boatLegendVisible = false
    expect(parseScenarioJson(serializeScenario(scenario)).canvas.boatNumbersVisible).toBe(false)
    expect(parseScenarioJson(serializeScenario(scenario)).canvas.boatLegendVisible).toBe(false)
  })

  it('removes support boats from a legacy measurement basis selection', () => {
    const scenario = createEmptyScenario()
    scenario.environment.measurementBoatClass = 'Committee boat'
    expect(
      parseScenarioJson(serializeScenario(scenario)).environment.measurementBoatClass,
    ).toBeNull()
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
    delete legacyBoat.overlapIndicator
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
      overlapIndicator: 'none',
    })
    expect(parsed.objects[0].type === 'boat' && parsed.objects[0].sequenceId).toBeTruthy()
  })

  it('migrates legacy coachboats to Coachboat and preserves its fixed blue', () => {
    const scenario = createEmptyScenario()
    const oldDefault = {
      ...createBoat(120, 240, 1, 'Coachboat'),
      boatClass: 'VSR Coachboat',
      color: '#1677B8',
    }
    const custom = {
      ...createBoat(240, 240, 2, 'Coachboat'),
      boatClass: 'VSR Coachboat',
      color: '#DF3F3F',
    }
    scenario.objects = [oldDefault, custom] as unknown as typeof scenario.objects

    const migrated = parseScenarioJson(serializeScenario(scenario))
    expect(migrated.objects[0]).toMatchObject({
      boatClass: 'Coachboat',
      color: COACHBOAT_BLUE,
    })
    expect(migrated.objects[1]).toMatchObject({
      boatClass: 'Coachboat',
      color: COACHBOAT_BLUE,
    })
  })

  it('migrates retired selectable boat classes to the current boat list', () => {
    const scenario = createEmptyScenario()
    scenario.environment.measurementBoatClass = 'ILCA' as never
    const legacyClasses = [
      ['ILCA / Laser', 'ILCA'],
      ['Windsurfer', 'Windsurf'],
      ['Wingfoil board', 'Windsurf'],
      ['Wingfoil', 'Windsurf'],
      ['kitefoil', 'Windsurf'],
      ['Coach boat', 'Coachboat'],
      ['Slim coachboat', 'Coachboat'],
      ['Generic catamaran', 'Tornado'],
      ['Generic skiff', '49er'],
    ] as const
    scenario.objects = legacyClasses.map(([legacyClass], index) => ({
      ...createBoat(100 + index * 20, 100, index + 1),
      boatClass: legacyClass,
    })) as unknown as typeof scenario.objects

    const migrated = parseScenarioJson(serializeScenario(scenario))
    expect(
      migrated.objects.map((object) => (object.type === 'boat' ? object.boatClass : null)),
    ).toEqual(legacyClasses.map(([, currentClass]) => currentClass))
    expect(migrated.objects[5]).toMatchObject({ color: COACHBOAT_BLUE })
    expect(migrated.objects[6]).toMatchObject({ color: COACHBOAT_BLUE })
  })

  it('migrates legacy slim Coachboat line endpoints', () => {
    const scenario = createEmptyScenario()
    scenario.objects = [
      {
        ...createStartLine(100, 200, 500, 200),
        startEndType: 'slim-coach-boat',
        pinEndType: 'slim-coach-boat-reversed',
      },
    ] as unknown as typeof scenario.objects

    const migrated = parseScenarioJson(serializeScenario(scenario))
    expect(migrated.objects[0]).toMatchObject({
      startEndType: 'coach-boat',
      pinEndType: 'coach-boat-reversed',
    })
  })
})
