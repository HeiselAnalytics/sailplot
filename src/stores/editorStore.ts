import { create } from 'zustand'
import {
  createBoat,
  createEmptyScenario,
  createId,
  createMark,
  duplicateObject,
  now,
} from '../lib/scenario'
import { applyObjectCommand, type ObjectCommand } from '../editor/commands/types'
import {
  headingForNextPosition,
  upwindSailVisibility,
} from '../editor/objects/boatShapes'
import {
  boatColorForClass,
  nextBoatColor,
  VSR_COACHBOAT_BLUE,
} from '../lib/boatColors'
import { migrateScenario } from '../services/migrations'
import type {
  BoatClass,
  BoatObject,
  EditorTool,
  LayoutPreference,
  Scenario,
  ScenarioObject,
} from '../types/scenario'

const BOAT_CHAIN_FIELDS: Array<keyof BoatObject> = ['boatClass', 'color', 'name', 'sailNumber']
const CREATION_TOOLS = new Set<EditorTool>([
  'boat',
  'mark',
  'line',
  'arrow',
  'freehand',
  'text',
  'rectangle',
  'circle',
])

const nextMarkNumber = (objects: ScenarioObject[]) =>
  objects.reduce(
    (highest, object) => (object.type === 'mark' ? Math.max(highest, object.markNumber) : highest),
    0,
  ) + 1

const documentStatusAfterChange = (status: EditorState['documentStatus']) =>
  status === 'downloaded' ? 'unsaved' : status

interface EditorState {
  scenario: Scenario
  selectedIds: string[]
  activeTool: EditorTool
  layoutPreference: LayoutPreference
  defaultBoatClass: BoatClass
  history: ObjectCommand[]
  future: ObjectCommand[]
  status: string
  documentStatus: 'unsaved' | 'browser' | 'downloaded'
  hydrated: boolean
  setHydrated: (hydrated: boolean) => void
  setStatus: (status: string) => void
  setDocumentStatus: (status: EditorState['documentStatus']) => void
  setTool: (tool: EditorTool) => void
  setLayoutPreference: (preference: LayoutPreference) => void
  setScenario: (scenario: Scenario, status?: string) => void
  patchScenario: (patch: Partial<Scenario>) => void
  updateMetadata: (patch: Partial<Scenario['metadata']>) => void
  updateCanvas: (patch: Partial<Scenario['canvas']>) => void
  updateEnvironment: (patch: Partial<Scenario['environment']>) => void
  select: (id: string | null, additive?: boolean) => void
  selectIds: (ids: string[]) => void
  addAt: (type: EditorTool, x: number, y: number) => ScenarioObject | null
  addObject: (object: ScenarioObject, label?: string) => void
  updateObject: (id: string, patch: Partial<ScenarioObject>, label?: string) => void
  updateObjects: (
    updates: Array<{ id: string; patch: Partial<ScenarioObject> }>,
    label?: string,
  ) => void
  deleteSelected: () => void
  duplicateSelected: () => void
  duplicateAsPosition: () => void
  setLayer: (direction: 'forward' | 'backward' | 'front' | 'back') => void
  undo: () => void
  redo: () => void
}

const updatedScenario = (scenario: Scenario, objects: ScenarioObject[]): Scenario => ({
  ...scenario,
  metadata: { ...scenario.metadata, updatedAt: now() },
  objects: objects
    .map((object) =>
      object.type === 'boat'
        ? { ...object, color: boatColorForClass(object.boatClass, object.color) }
        : object,
    )
    .sort((a, b) => a.zIndex - b.zIndex),
})

export const useEditorStore = create<EditorState>((set, get) => {
  const commit = (command: ObjectCommand) => {
    set((state) => ({
      scenario: updatedScenario(
        state.scenario,
        applyObjectCommand(state.scenario.objects, command.affectedIds, command.after),
      ),
      history: [...state.history.slice(-99), command],
      future: [],
      status: command.label,
      documentStatus: documentStatusAfterChange(state.documentStatus),
    }))
  }

  return {
    scenario: createEmptyScenario(),
    selectedIds: [],
    activeTool: 'select',
    layoutPreference: 'auto',
    defaultBoatClass: 'ILCA / Laser',
    history: [],
    future: [],
    status: 'Ready',
    documentStatus: 'unsaved',
    hydrated: false,
    setHydrated: (hydrated) => set({ hydrated }),
    setStatus: (status) => set({ status }),
    setDocumentStatus: (documentStatus) => set({ documentStatus }),
    setTool: (activeTool) =>
      set((state) => {
        const restartsActiveCreation =
          state.activeTool === activeTool && CREATION_TOOLS.has(activeTool)
        const startsBoatChain = activeTool === 'boat' && state.activeTool !== 'boat'
        return {
          activeTool,
          selectedIds:
            restartsActiveCreation || startsBoatChain ? [] : state.selectedIds,
        }
      }),
    setLayoutPreference: (layoutPreference) => set({ layoutPreference }),
    setScenario: (scenario, status = 'Scenario opened') => {
      const migrated = migrateScenario(structuredClone(scenario))
      const latestBoat = [...migrated.objects]
        .reverse()
        .find((object): object is BoatObject => object.type === 'boat')
      set((state) => ({
        scenario: migrated,
        selectedIds: [],
        history: [],
        future: [],
        status,
        documentStatus: 'unsaved',
        defaultBoatClass: latestBoat?.boatClass ?? state.defaultBoatClass,
      }))
    },
    patchScenario: (patch) =>
      set((state) => ({
        scenario: { ...state.scenario, ...patch } as Scenario,
        documentStatus: documentStatusAfterChange(state.documentStatus),
      })),
    updateMetadata: (patch) =>
      set((state) => ({
        scenario: {
          ...state.scenario,
          metadata: { ...state.scenario.metadata, ...patch, updatedAt: now() },
        },
        documentStatus: documentStatusAfterChange(state.documentStatus),
      })),
    updateCanvas: (patch) =>
      set((state) => ({
        scenario: { ...state.scenario, canvas: { ...state.scenario.canvas, ...patch } },
        documentStatus: documentStatusAfterChange(state.documentStatus),
      })),
    updateEnvironment: (patch) =>
      set((state) => ({
        scenario: {
          ...state.scenario,
          environment: { ...state.scenario.environment, ...patch },
          metadata: { ...state.scenario.metadata, updatedAt: now() },
        },
        documentStatus: documentStatusAfterChange(state.documentStatus),
      })),
    select: (id, additive = false) =>
      set((state) => {
        if (!id) return { selectedIds: [] }
        if (!additive) return { selectedIds: [id] }
        return {
          selectedIds: state.selectedIds.includes(id)
            ? state.selectedIds.filter((selectedId) => selectedId !== id)
            : [...state.selectedIds, id],
        }
      }),
    selectIds: (selectedIds) => set({ selectedIds }),
    addAt: (type, x, y) => {
      const state = get()
      const zIndex = Math.max(0, ...state.scenario.objects.map((object) => object.zIndex)) + 1
      let object: ScenarioObject | null = null
      if (type === 'boat') {
        const previous = state.scenario.objects.find(
          (candidate) =>
            candidate.type === 'boat' &&
            state.selectedIds.length === 1 &&
            candidate.id === state.selectedIds[0],
        )
        if (previous?.type === 'boat') {
          const sequence = state.scenario.objects.filter(
            (candidate) =>
              candidate.type === 'boat' && candidate.sequenceId === previous.sequenceId,
          )
          const heading = headingForNextPosition(previous, x, y)
          object = {
            ...structuredClone(previous),
            id: createId(),
            x,
            y,
            heading,
            rotation: heading,
            opacity: 1,
            locked: false,
            visible: true,
            zIndex,
            positionNumber:
              Math.max(
                previous.positionNumber,
                ...sequence.map((candidate) =>
                  candidate.type === 'boat' ? candidate.positionNumber : 1,
                ),
              ) + 1,
          }
        } else {
          object = {
            ...createBoat(x, y, zIndex, state.defaultBoatClass),
            ...upwindSailVisibility(state.defaultBoatClass),
            color: boatColorForClass(
              state.defaultBoatClass,
              nextBoatColor(state.scenario.objects),
            ),
          }
        }
      } else if (type === 'mark') {
        object = {
          ...createMark(x, y, zIndex),
          markNumber: nextMarkNumber(state.scenario.objects),
          zoneRadius: state.scenario.environment.zoneRadiusBoatLengths,
        }
      }
      if (object) {
        get().addObject(object, `Added ${type}`)
        set({ selectedIds: [object.id], activeTool: type === 'boat' ? 'boat' : 'select' })
      }
      return object
    },
    addObject: (object, label = 'Added object') => {
      commit({ label, affectedIds: [object.id], before: [], after: [object] })
      set({ selectedIds: [object.id] })
    },
    updateObject: (id, patch, label = 'Updated object') => {
      const before = get().scenario.objects.find((object) => object.id === id)
      if (!before) return
      if (before.type === 'boat') {
        const boatPatch = patch as Partial<BoatObject>
        const sharedPatch = Object.fromEntries(
          BOAT_CHAIN_FIELDS.filter((field) => field in boatPatch).map((field) => [
            field,
            boatPatch[field],
          ]),
        ) as Partial<BoatObject>
        if (boatPatch.boatClass === 'VSR Coachboat' && !boatPatch.color) {
          sharedPatch.color = VSR_COACHBOAT_BLUE
        }
        if (Object.keys(sharedPatch).length) {
          const classSails = boatPatch.boatClass ? upwindSailVisibility(boatPatch.boatClass) : {}
          const chain = get().scenario.objects.filter(
            (object) => object.type === 'boat' && object.sequenceId === before.sequenceId,
          )
          commit({
            label,
            affectedIds: chain.map(({ id: chainId }) => chainId),
            before: chain,
            after: chain.map(
              (object) => ({ ...object, ...sharedPatch, ...classSails }) as ScenarioObject,
            ),
          })
          if (boatPatch.boatClass) set({ defaultBoatClass: boatPatch.boatClass })
          return
        }
      }
      const after = { ...before, ...patch } as ScenarioObject
      commit({ label, affectedIds: [id], before: [before], after: [after] })
    },
    updateObjects: (updates, label = 'Updated objects') => {
      const objects = get().scenario.objects
      const before = updates
        .map(({ id }) => objects.find((object) => object.id === id))
        .filter((object): object is ScenarioObject => Boolean(object))
      const after = before.map((object) => ({
        ...object,
        ...updates.find((update) => update.id === object.id)?.patch,
      })) as ScenarioObject[]
      if (before.length) commit({ label, affectedIds: before.map(({ id }) => id), before, after })
    },
    deleteSelected: () => {
      const { scenario, selectedIds } = get()
      const deleted = scenario.objects.filter((object) => selectedIds.includes(object.id))
      if (!deleted.length) return
      const affectedSequences = new Set(
        deleted.filter((object) => object.type === 'boat').map((object) => object.sequenceId),
      )
      const survivors = scenario.objects.filter(
        (object) =>
          object.type === 'boat' &&
          affectedSequences.has(object.sequenceId) &&
          !selectedIds.includes(object.id),
      )
      const renumbered = survivors.map((object) => {
        if (object.type !== 'boat') return object
        const ordered = survivors
          .filter(
            (candidate) => candidate.type === 'boat' && candidate.sequenceId === object.sequenceId,
          )
          .sort((first, second) =>
            first.type === 'boat' && second.type === 'boat'
              ? first.positionNumber - second.positionNumber
              : 0,
          )
        return { ...object, positionNumber: ordered.findIndex(({ id }) => id === object.id) + 1 }
      })
      const before = [...deleted, ...survivors]
      commit({
        label: `Deleted ${deleted.length} object${deleted.length === 1 ? '' : 's'}`,
        affectedIds: before.map(({ id }) => id),
        before,
        after: renumbered,
      })
      set({ selectedIds: [] })
    },
    duplicateSelected: () => {
      const { scenario, selectedIds } = get()
      const before: ScenarioObject[] = []
      const after: ScenarioObject[] = []
      const colorContext = [...scenario.objects]
      for (const object of scenario.objects.filter((candidate) =>
        selectedIds.includes(candidate.id),
      )) {
        const duplicate = duplicateObject(object)
        if (duplicate.type === 'boat') {
          const boat = {
            ...duplicate,
            sequenceId: createId(),
            positionNumber: 1,
            color: boatColorForClass(duplicate.boatClass, nextBoatColor(colorContext)),
          }
          after.push(boat)
          colorContext.push(boat)
        } else if (duplicate.type === 'mark') {
          after.push({
            ...duplicate,
            markNumber: nextMarkNumber([...scenario.objects, ...after]),
          })
        } else {
          after.push(duplicate)
        }
      }
      if (!after.length) return
      commit({
        label: 'Duplicated selection',
        affectedIds: after.map(({ id }) => id),
        before,
        after,
      })
      set({ selectedIds: after.map(({ id }) => id) })
    },
    duplicateAsPosition: () => {
      const selected = get().scenario.objects.find((object) =>
        get().selectedIds.includes(object.id),
      )
      if (!selected || selected.type !== 'boat') return
      const sequenceId = selected.sequenceId
      const sequence = get().scenario.objects.filter(
        (object) => object.type === 'boat' && object.sequenceId === sequenceId,
      )
      const next = duplicateObject({ ...selected, opacity: 1 }, 48)
      next.positionNumber =
        Math.max(
          selected.positionNumber,
          ...sequence.map((object) => (object.type === 'boat' ? object.positionNumber : 1)),
        ) + 1
      get().addObject(next, 'Added static boat position')
    },
    setLayer: (direction) => {
      const { scenario, selectedIds } = get()
      const selected = scenario.objects.filter((object) => selectedIds.includes(object.id))
      if (!selected.length) return
      const min = Math.min(...scenario.objects.map((object) => object.zIndex))
      const max = Math.max(...scenario.objects.map((object) => object.zIndex))
      const delta = direction === 'forward' ? 1 : direction === 'backward' ? -1 : 0
      get().updateObjects(
        selected.map((object, index) => ({
          id: object.id,
          patch: {
            zIndex:
              direction === 'front'
                ? max + index + 1
                : direction === 'back'
                  ? min - selected.length + index
                  : object.zIndex + delta,
          },
        })),
        'Changed layer order',
      )
    },
    undo: () => {
      const state = get()
      const command = state.history.at(-1)
      if (!command) return
      set({
        scenario: updatedScenario(
          state.scenario,
          applyObjectCommand(state.scenario.objects, command.affectedIds, command.before),
        ),
        history: state.history.slice(0, -1),
        future: [command, ...state.future],
        selectedIds: command.before.map(({ id }) => id),
        status: `Undid: ${command.label}`,
        documentStatus: documentStatusAfterChange(state.documentStatus),
      })
    },
    redo: () => {
      const state = get()
      const command = state.future[0]
      if (!command) return
      set({
        scenario: updatedScenario(
          state.scenario,
          applyObjectCommand(state.scenario.objects, command.affectedIds, command.after),
        ),
        history: [...state.history, command],
        future: state.future.slice(1),
        selectedIds: command.after.map(({ id }) => id),
        status: `Redid: ${command.label}`,
        documentStatus: documentStatusAfterChange(state.documentStatus),
      })
    },
  }
})
