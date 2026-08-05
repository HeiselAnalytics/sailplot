import { createBoat, createEmptyScenario, createId, createMark } from '../../lib/scenario'
import type { Scenario } from '../../types/scenario'

export function createWindwardExample(): Scenario {
  const scenario = createEmptyScenario('Windward mark rounding')
  scenario.metadata.description =
    'A static visual example for discussing a mark-rounding situation.'
  scenario.metadata.ruleReferences = ['RRS 18']
  const mark = createMark(960, 380, 1)
  mark.markNumber = 1
  const first = createBoat(790, 650, 2)
  first.label = 'Blue'
  first.color = '#2563eb'
  first.heading = 330
  first.rotation = 330
  first.sequenceId = 'blue-sequence'
  first.positionNumber = 1
  const second = createBoat(910, 560, 3)
  second.label = 'Blue'
  second.color = '#2563eb'
  second.heading = 350
  second.rotation = 350
  second.sequenceId = 'blue-sequence'
  second.positionNumber = 2
  first.opacity = 0.42
  const red = createBoat(1050, 650, 4)
  red.label = 'Red'
  red.color = '#DF3F3F'
  red.heading = 15
  red.rotation = 15
  scenario.objects = [mark, first, second, red]
  return scenario
}

export function createStartLineExample(): Scenario {
  const scenario = createEmptyScenario('Start-line situation')
  scenario.metadata.description =
    'Static positions approaching a start line. No rule decision is implied.'
  const pin = createMark(540, 420, 1)
  pin.markNumber = 1
  pin.shape = 'pin'
  const committee = createBoat(1380, 420, 2)
  committee.boatClass = 'Committee boat'
  committee.label = 'RC'
  committee.color = '#404040'
  const line = {
    id: createId(),
    type: 'line' as const,
    x: 0,
    y: 0,
    rotation: 0,
    scaleX: 1,
    scaleY: 1,
    visible: true,
    locked: false,
    zIndex: 0,
    opacity: 1,
    points: [540, 420, 1380, 420],
    stroke: '#171717',
    strokeWidth: 4,
    dash: [16, 10],
  }
  const boat = createBoat(860, 700, 3)
  boat.heading = 0
  scenario.objects = [line, pin, committee, boat]
  return scenario
}
