import Dexie, { type EntityTable } from 'dexie'
import { namespacedStorageKey } from '../config/storage'
import type { LayoutPreference, Scenario } from '../types/scenario'

export interface StoredProject {
  id: string
  title: string
  updatedAt: string
  scenario: Scenario
}

export interface PreferenceRecord {
  key: string
  value: string
}

class SailingDatabase extends Dexie {
  projects!: EntityTable<StoredProject, 'id'>
  preferences!: EntityTable<PreferenceRecord, 'key'>

  constructor(name: string) {
    super(name)
    this.version(1).stores({ projects: 'id, title, updatedAt', preferences: 'key' })
  }
}

const databases = new Map<string, SailingDatabase>()

export function getDatabase(storageNamespace = ''): SailingDatabase {
  const name = namespacedStorageKey(storageNamespace, 'sailing-scenario-editor')
  const existing = databases.get(name)
  if (existing) return existing
  const created = new SailingDatabase(name)
  databases.set(name, created)
  return created
}

export const database = getDatabase()

export async function saveProject(scenario: Scenario, storageNamespace = ''): Promise<void> {
  const target = getDatabase(storageNamespace)
  await target.projects.put({
    id: scenario.metadata.id,
    title: scenario.metadata.title,
    updatedAt: scenario.metadata.updatedAt,
    scenario: structuredClone(scenario),
  })
  await target.preferences.put({ key: 'lastProjectId', value: scenario.metadata.id })
}

export async function listProjects(storageNamespace = ''): Promise<StoredProject[]> {
  return getDatabase(storageNamespace).projects.orderBy('updatedAt').reverse().toArray()
}

export async function loadLastProject(storageNamespace = ''): Promise<Scenario | null> {
  const target = getDatabase(storageNamespace)
  const preference = await target.preferences.get('lastProjectId')
  if (!preference) return null
  return (await target.projects.get(preference.value))?.scenario ?? null
}

export async function deleteProject(id: string, storageNamespace = ''): Promise<void> {
  await getDatabase(storageNamespace).projects.delete(id)
}

export async function deleteAllProjects(storageNamespace = ''): Promise<void> {
  const target = getDatabase(storageNamespace)
  await target.transaction('rw', target.projects, target.preferences, async () => {
    await target.projects.clear()
    await target.preferences.delete('lastProjectId')
  })
}

export async function saveLayoutPreference(
  value: LayoutPreference,
  storageNamespace = '',
): Promise<void> {
  await getDatabase(storageNamespace).preferences.put({ key: 'layoutPreference', value })
}

export async function loadLayoutPreference(storageNamespace = ''): Promise<LayoutPreference> {
  const value = (await getDatabase(storageNamespace).preferences.get('layoutPreference'))?.value
  return value === 'compact' || value === 'desktop' ? value : 'auto'
}
