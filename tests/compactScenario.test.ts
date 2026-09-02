import { describe, expect, it } from 'vitest'
import {
  createBoat,
  createEmptyScenario,
  createFinishLine,
  createGate,
  createId,
  createMark,
  createStartLine,
} from '../src/lib/scenario'
import { decodeScenario, encodeScenario } from '../src/services/scenarioCodec'
import { compactScenario, expandCompactScenario } from '../src/services/compactScenario'
import type { Scenario, ScenarioObject } from '../src/types/scenario'

const base = (type: ScenarioObject['type'], zIndex: number) => ({
  id: createId(),
  type,
  x: 80 + zIndex * 10,
  y: 120 + zIndex * 10,
  rotation: 0,
  scaleX: 1,
  scaleY: 1,
  visible: true,
  locked: false,
  zIndex,
  opacity: 1,
})

const normalized = (input: Scenario) => {
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

describe('minimal share payload', () => {
  it('preserves neutral marks and legacy mark laylines in compact links', () => {
    const scenario = createEmptyScenario()
    const neutral = createMark(300, 220, 1)
    const windward = createMark(500, 220, 2)
    windward.laylinesVisible = true
    scenario.objects = [neutral, windward]

    const decoded = expandCompactScenario(compactScenario(scenario))
    expect(decoded.objects).toMatchObject([
      { type: 'mark', laylinesVisible: false, downwind: false },
      { type: 'mark', laylinesVisible: true, downwind: false },
    ])
  })

  it('round-trips every object type and every non-default scene section', () => {
    const scenario = createEmptyScenario('Compact regatta')
    scenario.metadata.description = 'A detailed situation'
    scenario.metadata.ruleReferences = ['RRS 10', 'RRS 18.2(a)']
    scenario.metadata.additionalInformation = [
      { id: createId(), name: 'Wind', value: '14 kn' },
      { id: createId(), name: 'Wave', value: '0.5 m' },
    ]
    scenario.canvas = {
      width: 1600,
      height: 900,
      infinite: true,
      background: '#262626',
      boatNumbersVisible: false,
      boatLegendVisible: false,
      grid: { visible: false, size: 32, opacity: 0.4 },
      view: { x: 25, y: -10, scale: 1.5 },
    }
    scenario.environment = {
      windDirection: 32,
      windStrength: '14 kn',
      windVisible: false,
      laylineAngle: 42,
      laylinesVisible: false,
      zonesVisible: false,
      zoneRadiusBoatLengths: 4,
      measurementBoatClass: '470',
    }

    const firstBoat = createBoat(200, 300, 1, '470')
    firstBoat.name = 'Alpha'
    firstBoat.sailNumber = 'SUI 123'
    firstBoat.label = 'Leader'
    firstBoat.color = '#2F5D78'
    firstBoat.heading = 47
    firstBoat.rotation = 47
    firstBoat.tack = 'port'
    firstBoat.jibVisible = true
    firstBoat.spinnakerVisible = true
    firstBoat.mainsailTrim = 12
    firstBoat.sailMode = 'manual'
    firstBoat.sailAngle = 40
    firstBoat.overlapIndicator = 'starboard'
    firstBoat.stateMarker = 'tack'
    firstBoat.opacity = 0.6

    const secondBoat = createBoat(260, 360, 2, '470')
    secondBoat.sequenceId = firstBoat.sequenceId
    secondBoat.positionNumber = 2
    secondBoat.rotation = 15
    secondBoat.heading = 20

    const mark = createMark(500, 220, 3)
    mark.markType = 'finish'
    mark.shape = 'inflatable'
    mark.color = '#D72638'
    mark.label = 'Finish'
    mark.markNumber = '18a'
    mark.downwind = true
    mark.zoneVisible = false
    mark.zoneRadius = 4.5

    const gate = createGate(500, 600, 800, 620, 4, 3, 4)
    gate.color = '#00843D'
    gate.zoneVisible = false

    const start = createStartLine(300, 180, 900, 210, 5)
    start.startEndType = 'committee-boat-reversed'
    start.pinEndType = 'coach-boat-reversed'
    start.startEndFlagColor = '#D72638'
    start.pinEndFlagColor = '#FFD100'
    start.laylinesVisible = true
    start.laylineAreaVisible = true
    start.laylineAreaColor = '#1F6D68'

    const finish = createFinishLine(350, 720, 950, 740, 6)
    finish.color = '#FFFFFF'

    const objects: ScenarioObject[] = [
      firstBoat,
      secondBoat,
      mark,
      gate,
      start,
      finish,
      {
        ...base('line', 7),
        type: 'line',
        points: [0, 0, 120, 50],
        stroke: '#884454',
        strokeWidth: 5,
        dash: [8, 4],
      },
      {
        ...base('arrow', 8),
        type: 'arrow',
        points: [0, 0, 80, -40],
        stroke: '#171717',
        strokeWidth: 3,
        dash: [],
      },
      {
        ...base('freehand', 9),
        type: 'freehand',
        points: [0, 0, 10, 12, 25, 18, 44, 9],
        stroke: '#168DDD',
        strokeWidth: 2,
        dash: [],
      },
      {
        ...base('text', 10),
        type: 'text',
        text: 'Keep clear',
        color: '#FFFFFF',
        fontSize: 36,
        fontWeight: 'bold',
        align: 'center',
        background: '#262626',
      },
      {
        ...base('rectangle', 11),
        type: 'rectangle',
        width: 180,
        height: 90,
        stroke: '#D72638',
        strokeWidth: 4,
        fill: '#FFD100',
      },
      {
        ...base('circle', 12),
        type: 'circle',
        width: 120,
        height: 120,
        stroke: '#171717',
        strokeWidth: 3,
        fill: 'transparent',
      },
    ]
    scenario.objects = objects

    expect(normalized(decodeScenario(encodeScenario(scenario)))).toEqual(normalized(scenario))
  })

  it('reduces an empty plot to a very small payload and does not mutate download JSON', () => {
    const scenario = createEmptyScenario()
    const downloadJson = JSON.stringify(scenario, null, 2)
    const encoded = encodeScenario(scenario)

    expect(encoded.length).toBeLessThan(30)
    expect(JSON.stringify(scenario, null, 2)).toBe(downloadJson)
  })
})
