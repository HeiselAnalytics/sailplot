import type Konva from 'konva'

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
