const MAX_RECENT_COLORS = 6

const normalizeColor = (color: string) => {
  const normalized = color.trim().toUpperCase()
  return /^#[0-9A-F]{6}$/.test(normalized) ? normalized : null
}

export const mergeRecentColors = (
  incoming: string[],
  existing: string[] = [],
  maximum = MAX_RECENT_COLORS,
) => {
  const unique: string[] = []
  for (const color of [...incoming, ...existing]) {
    const normalized = normalizeColor(color)
    if (normalized && !unique.includes(normalized)) unique.push(normalized)
    if (unique.length === maximum) break
  }
  return unique
}
