import { describe, expect, it } from 'vitest'
import { mergeRecentColors } from '../src/editor/objects/recentColors'

describe('recent colors', () => {
  it('keeps newest unique valid colors first and limits the history', () => {
    expect(
      mergeRecentColors(
        ['#df3f3f', '#2563eb'],
        ['#DF3F3F', '#171717', 'invalid', '#FFFFFF', '#FFAA00', '#123456', '#654321'],
      ),
    ).toEqual(['#DF3F3F', '#2563EB', '#171717', '#FFFFFF', '#FFAA00', '#123456'])
  })
})
