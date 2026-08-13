import type { SailPlotConfig } from './types'
import { START_FLAG_COLOR } from '../lib/scenario'
import type { Scenario } from '../types/scenario'

export const SAILPLOT_ORANGE = START_FLAG_COLOR
export const MARK_YELLOW = '#FFAA00'
export const MARK_RED = '#9A031E'

const HEX_COLOR = /^#[0-9a-f]{6}$/iu

export function resolveMarkColor(config: SailPlotConfig): string {
  switch (config.objectColors.markColorMode) {
    case 'primary':
      return config.theme.light.primary
    case 'yellow':
      return MARK_YELLOW
    case 'red':
      return MARK_RED
    case 'custom':
      return config.objectColors.markCustomColor &&
        HEX_COLOR.test(config.objectColors.markCustomColor)
        ? config.objectColors.markCustomColor
        : SAILPLOT_ORANGE
    case 'sailplot':
    default:
      return SAILPLOT_ORANGE
  }
}

export function resolveStartLineFlagColor(config: SailPlotConfig): string {
  return HEX_COLOR.test(config.objectColors.startLineFlagColor)
    ? config.objectColors.startLineFlagColor
    : START_FLAG_COLOR
}

export function applyResolvedObjectColors(
  scenario: Scenario,
  markColor: string,
  startLineFlagColor: string,
): Scenario {
  return {
    ...scenario,
    objects: scenario.objects.map((object) => {
      if (object.type === 'mark' || object.type === 'gate') {
        return { ...object, color: markColor }
      }
      if (object.type === 'start-line') {
        return {
          ...object,
          startEndFlagColor: startLineFlagColor,
          pinEndFlagColor: startLineFlagColor,
        }
      }
      return object
    }),
  }
}
