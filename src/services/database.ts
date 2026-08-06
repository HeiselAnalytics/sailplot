import Dexie, { type EntityTable } from 'dexie'
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

  constructor() {
    super('sailing-scenario-editor')
    this.version(1).stores({ projects: 'id, title, updatedAt', preferences: 'key' })
  }
}

export const database = new SailingDatabase()

export async function saveProject(scenario: Scenario): Promise<void> {
  await database.projects.put({
    id: scenario.metadata.id,
    title: scenario.metadata.title,
    updatedAt: scenario.metadata.updatedAt,
    scenario: structuredClone(scenario),
  })
  await database.preferences.put({ key: 'lastProjectId', value: scenario.metadata.id })
}

export async function listProjects(): Promise<StoredProject[]> {
  return database.projects.orderBy('updatedAt').reverse().toArray()
}

export async function loadLastProject(): Promise<Scenario | null> {
  const preference = await database.preferences.get('lastProjectId')
  if (!preference) return null
  return (await database.projects.get(preference.value))?.scenario ?? null
}

export async function deleteProject(id: string): Promise<void> {
  await database.projects.delete(id)
}

export async function deleteAllProjects(): Promise<void> {
  await database.transaction('rw', database.projects, database.preferences, async () => {
    await database.projects.clear()
    await database.preferences.delete('lastProjectId')
  })
}

export async function saveLayoutPreference(value: LayoutPreference): Promise<void> {
  await database.preferences.put({ key: 'layoutPreference', value })
}

export async function loadLayoutPreference(): Promise<LayoutPreference> {
  const value = (await database.preferences.get('layoutPreference'))?.value
  return value === 'compact' || value === 'desktop' ? value : 'auto'
}
