import { describe, expect, it } from 'vitest'
import {
  gridOpacityForBackgroundChange,
  PLOT_BACKGROUNDS,
  PLOT_GRID_OPACITY,
} from '../src/lib/plotTheme'

describe('plot theme defaults', () => {
  it('maps the default grid visibility between light and dark plots', () => {
    expect(gridOpacityForBackgroundChange(1, PLOT_BACKGROUNDS.light, PLOT_BACKGROUNDS.dark)).toBe(
      PLOT_GRID_OPACITY.dark,
    )
    expect(gridOpacityForBackgroundChange(0.4, PLOT_BACKGROUNDS.dark, PLOT_BACKGROUNDS.light)).toBe(
      PLOT_GRID_OPACITY.light,
    )
  })

  it('preserves custom visibility and can apply the dark default to an existing dark plot', () => {
    expect(
      gridOpacityForBackgroundChange(0.65, PLOT_BACKGROUNDS.light, PLOT_BACKGROUNDS.dark),
    ).toBe(0.65)
    expect(gridOpacityForBackgroundChange(1, PLOT_BACKGROUNDS.dark, PLOT_BACKGROUNDS.dark)).toBe(
      PLOT_GRID_OPACITY.dark,
    )
  })
})
