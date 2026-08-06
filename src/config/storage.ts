export function namespacedStorageKey(namespace: string, legacyKey: string): string {
  const normalized = namespace.trim().replace(/:+$/u, '')
  return normalized ? `${normalized}:${legacyKey}` : legacyKey
}
