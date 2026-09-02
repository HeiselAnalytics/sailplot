import type Konva from 'konva'

export const DEFAULT_ROTATE_ANCHOR_OFFSET = 50
export const BOAT_ROTATE_ANCHOR_OFFSET = DEFAULT_ROTATE_ANCHOR_OFFSET / 2

export function pinTransformBoundsToNamedNode(
  group: Konva.Group,
  selector = '.rotation-bounds',
): () => void {
  const originalGetClientRect = group.getClientRect

  group.getClientRect = (config = {}) => {
    if (config.skipTransform) {
      const bounds = group.findOne(selector)
      if (bounds) {
        return bounds.getClientRect({
          relativeTo: group,
          skipShadow: config.skipShadow,
          skipStroke: config.skipStroke,
        })
      }
    }
    return originalGetClientRect.call(group, config)
  }

  return () => {
    group.getClientRect = originalGetClientRect
  }
}
