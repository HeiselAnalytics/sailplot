import { describe, expect, it } from 'vitest'
import { endlessExportBounds } from '../src/editor/canvas/exportBounds'
import { createBoat, createEmptyScenario } from '../src/lib/scenario'

describe('endless plot export bounds', () => {
  it('keeps the boat legend away from every export edge', () => {
    const scenario = createEmptyScenario()
    scenario.canvas.infinite = true
    scenario.canvas.boatLegendVisible = true
    scenario.canvas.boatLegendPosition = { x: -100, y: -80 }
    scenario.environment.windVisible = false
    scenario.objects = [createBoat(960, 540)]

    const topLeftBounds = endlessExportBounds(scenario, 42.3)
    expect(topLeftBounds.x).toBe(-124)
    expect(topLeftBounds.y).toBe(-104)

    scenario.canvas.boatLegendPosition = { x: 2000, y: 1200 }
    const bottomRightBounds = endlessExportBounds(scenario, 42.3)
    expect(bottomRightBounds.x + bottomRightBounds.width).toBe(2356)
    expect(bottomRightBounds.y + bottomRightBounds.height).toBe(1336)
  })
})
