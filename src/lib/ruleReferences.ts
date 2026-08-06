const NUMERIC_RULE_REFERENCE = /^(\d+(?:\.\d+)*)(?:\(([a-z])\))?(?:\((\d+)\))?$/i
const COMPACT_NUMERIC_RULE_REFERENCE = /^(\d+(?:\.\d+)*)([a-z])$/i
const APPENDIX_RULE_REFERENCE = /^([a-z]\d+(?:\.\d+)*)(?:\(([a-z])\))?(?:\((\d+)\))?$/i

function formatRuleParts(base: string, letter?: string, paragraph?: string) {
  return `${base.toUpperCase()}${letter ? `(${letter.toLowerCase()})` : ''}${paragraph ? `(${paragraph})` : ''}`
}

export function normalizeRuleReference(input: string) {
  const trimmed = input.trim()
  if (!trimmed) return ''

  const hasRrsPrefix = /^(?:RRS|RSS)\b/i.test(trimmed)
  const reference = (hasRrsPrefix ? trimmed.replace(/^(?:RRS|RSS)\b\s*/i, '') : trimmed).replace(
    /\s+/g,
    '',
  )
  const compactMatch = reference.match(COMPACT_NUMERIC_RULE_REFERENCE)
  const numericMatch = reference.match(NUMERIC_RULE_REFERENCE)
  const appendixMatch = reference.match(APPENDIX_RULE_REFERENCE)
  const formatted = compactMatch
    ? formatRuleParts(compactMatch[1], compactMatch[2])
    : numericMatch
      ? formatRuleParts(numericMatch[1], numericMatch[2], numericMatch[3])
      : appendixMatch
        ? formatRuleParts(appendixMatch[1], appendixMatch[2], appendixMatch[3])
        : null

  if (formatted) return `RRS ${formatted}`
  return trimmed
}
