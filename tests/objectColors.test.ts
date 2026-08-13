import { describe, expect, it } from 'vitest'
import {
  MARK_RED,
  MARK_YELLOW,
  resolveMarkColor,
  resolveStartLineFlagColor,
  SAILPLOT_ORANGE,
} from '../src/config/objectColors'
import { mergeSailPlotConfig } from '../src/config/mergeConfig'
import { START_FLAG_COLOR } from '../src/lib/scenario'

const configured = (
  markColorMode: 'sailplot' | 'primary' | 'yellow' | 'red' | 'custom',
  markCustomColor: string | null = null,
) =>
  mergeSailPlotConfig({
    theme: { light: { primary: '#0f766e' } },
    objectColors: { markColorMode, markCustomColor },
  })

describe('configured object colors', () => {
  it('uses independent defaults for marks and start-line flags', () => {
    const config = mergeSailPlotConfig()

    expect(resolveMarkColor(config)).toBe(SAILPLOT_ORANGE)
    expect(resolveStartLineFlagColor(config)).toBe(START_FLAG_COLOR)
  })

  it('resolves every supported mark color mode centrally', () => {
    expect(resolveMarkColor(configured('sailplot'))).toBe(SAILPLOT_ORANGE)
    expect(resolveMarkColor(configured('primary'))).toBe('#0f766e')
    expect(resolveMarkColor(configured('yellow'))).toBe(MARK_YELLOW)
    expect(resolveMarkColor(configured('red'))).toBe(MARK_RED)
    expect(resolveMarkColor(configured('custom', '#663399'))).toBe('#663399')
  })

  it('keeps start-line flags independent from the primary and mark colors', () => {
    const config = configured('primary')

    expect(resolveMarkColor(config)).toBe('#0f766e')
    expect(resolveStartLineFlagColor(config)).toBe(START_FLAG_COLOR)
  })

  it('safely falls back when an advanced custom color is invalid', () => {
    expect(resolveMarkColor(configured('custom', 'red'))).toBe(SAILPLOT_ORANGE)
    expect(
      resolveStartLineFlagColor(
        mergeSailPlotConfig({ objectColors: { startLineFlagColor: 'orange' } }),
      ),
    ).toBe(START_FLAG_COLOR)
  })
})
