import { createBoat, createEmptyScenario, createMark, createStartLine } from '../../lib/scenario'
import type { Scenario } from '../../types/scenario'

export function createWindwardExample(): Scenario {
  const scenario = createEmptyScenario('Windward mark rounding')
  scenario.metadata.description =
    'A static visual example for discussing a mark-rounding situation.'
  scenario.metadata.ruleReferences = ['RRS 18']
  const mark = createMark(960, 380, 1)
  mark.markNumber = '1'
  mark.laylinesVisible = true
  const first = createBoat(790, 650, 2)
  first.label = 'Alpine blue'
  first.color = '#2F5D78'
  first.heading = 330
  first.rotation = 330
  first.sequenceId = 'blue-sequence'
  first.positionNumber = 1
  const second = createBoat(910, 560, 3)
  second.label = 'Alpine blue'
  second.color = '#2F5D78'
  second.heading = 350
  second.rotation = 350
  second.sequenceId = 'blue-sequence'
  second.positionNumber = 2
  first.opacity = 0.42
  const red = createBoat(1050, 650, 4)
  red.label = 'Burgundy'
  red.color = '#884454'
  red.heading = 15
  red.rotation = 15
  scenario.objects = [mark, first, second, red]
  return scenario
}

export function createStartLineExample(): Scenario {
  const scenario = createEmptyScenario('Start-line situation')
  scenario.metadata.description =
    'Static positions approaching a start line. No rule decision is implied.'
  const startLine = createStartLine(540, 420, 1380, 420, 1)
  const boat = createBoat(860, 700, 2)
  boat.heading = 0
  scenario.objects = [startLine, boat]
  return scenario
}

export function createPortStarboardExample(): Scenario {
  const scenario = createEmptyScenario('Port–starboard crossing')
  scenario.metadata.description = 'Two boats on opposite tacks approaching a crossing situation.'
  scenario.metadata.ruleReferences = ['RRS 10']
  const starboard = createBoat(760, 700, 1)
  starboard.heading = 45
  starboard.rotation = 45
  starboard.color = '#2F5D78'
  starboard.label = 'Alpine blue'
  const port = createBoat(1160, 700, 2)
  port.heading = 315
  port.rotation = 315
  port.tack = 'port'
  port.color = '#884454'
  port.label = 'Burgundy'
  scenario.objects = [starboard, port]
  return scenario
}

export function createWindwardLeewardExample(): Scenario {
  const scenario = createEmptyScenario('Windward–leeward overlap')
  scenario.metadata.description = 'Two overlapped boats on the same tack.'
  scenario.metadata.ruleReferences = ['RRS 11']
  const leeward = createBoat(850, 620, 1)
  leeward.heading = 35
  leeward.rotation = 35
  leeward.color = '#2F5D78'
  leeward.label = 'Alpine blue'
  const windward = createBoat(1040, 570, 2)
  windward.heading = 35
  windward.rotation = 35
  windward.color = '#884454'
  windward.label = 'Burgundy'
  scenario.objects = [leeward, windward]
  return scenario
}

export function createClearAheadAsternExample(): Scenario {
  const scenario = createEmptyScenario('Clear ahead and clear astern')
  scenario.metadata.description = 'Two boats on the same tack, one clear ahead of the other.'
  scenario.metadata.ruleReferences = ['RRS 12']
  const ahead = createBoat(960, 450, 1)
  ahead.color = '#2F5D78'
  ahead.label = 'Alpine blue'
  const astern = createBoat(960, 750, 2)
  astern.color = '#884454'
  astern.label = 'Burgundy'
  scenario.objects = [ahead, astern]
  return scenario
}
