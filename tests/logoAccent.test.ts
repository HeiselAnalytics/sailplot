import { describe, expect, it } from 'vitest'
import { applySailPlotLogoAccent } from '../src/config/logoAccent'

describe('SailPlot logo accent', () => {
  it('replaces every original orange boat fill while preserving the rest of the SVG', () => {
    const svg = '<svg><path fill="#FFAA00"/><path fill="#ffaa00"/><path fill="#171717"/></svg>'

    expect(applySailPlotLogoAccent(svg, '#0f766e')).toBe(
      '<svg><path fill="#0f766e"/><path fill="#0f766e"/><path fill="#171717"/></svg>',
    )
  })

  it('does not inject an invalid color into SVG markup', () => {
    const svg = '<svg><path fill="#FFAA00"/></svg>'

    expect(applySailPlotLogoAccent(svg, 'red')).toBe(svg)
    expect(applySailPlotLogoAccent(svg, '"/><script>')).toBe(svg)
  })
})
