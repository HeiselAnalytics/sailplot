import { beforeEach, describe, expect, it } from 'vitest'
import { createBoat, createEmptyScenario, createMark } from '../src/lib/scenario'
import { VSR_COACHBOAT_BLUE } from '../src/editor/objects/boatShapes'
import { useEditorStore } from '../src/stores/editorStore'

describe('command history', () => {
  beforeEach(() => useEditorStore.getState().setScenario(createEmptyScenario()))

  it('undoes and redoes object creation', () => {
    const boat = createBoat(100, 120)
    useEditorStore.getState().addObject(boat)
    expect(useEditorStore.getState().scenario.objects).toHaveLength(1)
    useEditorStore.getState().undo()
    expect(useEditorStore.getState().scenario.objects).toHaveLength(0)
    useEditorStore.getState().redo()
    expect(useEditorStore.getState().scenario.objects[0].id).toBe(boat.id)
  })

  it('combines a position update into one command and duplicates with a stable new id', () => {
    const boat = createBoat(100, 120)
    useEditorStore.getState().addObject(boat)
    useEditorStore.getState().updateObject(boat.id, { x: 180, y: 210 }, 'Moved boat')
    expect(useEditorStore.getState().scenario.objects[0]).toMatchObject({ x: 180, y: 210 })
    useEditorStore.getState().undo()
    expect(useEditorStore.getState().scenario.objects[0]).toMatchObject({ x: 100, y: 120 })
    useEditorStore.getState().select(boat.id)
    useEditorStore.getState().duplicateSelected()
    const objects = useEditorStore.getState().scenario.objects
    expect(objects).toHaveLength(2)
    expect(new Set(objects.map(({ id }) => id)).size).toBe(2)
  })

  it('keeps placing numbered positions in one boat chain', () => {
    const store = useEditorStore.getState()
    store.setTool('boat')
    store.addAt('boat', 100, 200)
    useEditorStore.getState().addAt('boat', 180, 120)
    const boats = useEditorStore
      .getState()
      .scenario.objects.filter((object) => object.type === 'boat')

    expect(useEditorStore.getState().activeTool).toBe('boat')
    expect(boats.map((boat) => boat.positionNumber)).toEqual([1, 2])
    expect(new Set(boats.map((boat) => boat.sequenceId)).size).toBe(1)
    expect(new Set(boats.map((boat) => boat.color)).size).toBe(1)
    expect(boats.every((boat) => boat.label === '')).toBe(true)
  })

  it('starts a new boat chain when the active Boat tool is clicked again', () => {
    const store = useEditorStore.getState()
    store.setTool('boat')
    const first = store.addAt('boat', 100, 200)
    expect(first?.type).toBe('boat')

    useEditorStore.getState().setTool('boat')
    expect(useEditorStore.getState().activeTool).toBe('boat')
    expect(useEditorStore.getState().selectedIds).toEqual([])
    const second = useEditorStore.getState().addAt('boat', 260, 200)

    expect(second).toMatchObject({ type: 'boat', positionNumber: 1 })
    expect(second?.type === 'boat' && second.sequenceId).not.toBe(
      first?.type === 'boat' ? first.sequenceId : '',
    )
    expect(second?.type === 'boat' && second.color).not.toBe(
      first?.type === 'boat' ? first.color : '',
    )
  })

  it('numbers new and duplicated marks automatically', () => {
    const store = useEditorStore.getState()
    store.addAt('mark', 100, 100)
    const second = store.addAt('mark', 200, 100)
    expect(
      useEditorStore
        .getState()
        .scenario.objects.filter((object) => object.type === 'mark')
        .map((mark) => mark.markNumber),
    ).toEqual([1, 2])

    if (!second || second.type !== 'mark') return
    useEditorStore.getState().select(second.id)
    useEditorStore.getState().duplicateSelected()
    expect(
      useEditorStore
        .getState()
        .scenario.objects.filter((object) => object.type === 'mark')
        .map((mark) => mark.markNumber),
    ).toEqual([1, 2, 3])
    expect(createMark(0, 0)).toMatchObject({ markNumber: 1, downwind: false, label: '' })
  })

  it('renumbers the remaining chain after deleting a position', () => {
    const first = createBoat(100, 200)
    const second = { ...createBoat(180, 120), sequenceId: first.sequenceId, positionNumber: 2 }
    const third = { ...createBoat(260, 80), sequenceId: first.sequenceId, positionNumber: 3 }
    useEditorStore.getState().addObject(first)
    useEditorStore.getState().addObject(second)
    useEditorStore.getState().addObject(third)
    useEditorStore.getState().select(second.id)
    useEditorStore.getState().deleteSelected()

    const boats = useEditorStore
      .getState()
      .scenario.objects.filter((object) => object.type === 'boat')
    expect(boats.map((boat) => boat.positionNumber)).toEqual([1, 2])
  })

  it('shares legend details across a chain', () => {
    const first = createBoat(100, 200)
    const second = { ...createBoat(180, 120), sequenceId: first.sequenceId, positionNumber: 2 }
    useEditorStore.getState().addObject(first)
    useEditorStore.getState().addObject(second)
    useEditorStore
      .getState()
      .updateObject(second.id, { boatClass: '470', color: '#DF3F3F' }, 'Updated track')
    useEditorStore.getState().updateObject(second.id, { name: 'Ari' }, 'Updated track name')
    useEditorStore
      .getState()
      .updateObject(first.id, { sailNumber: 'SUI 42' }, 'Updated sail number')

    const boats = useEditorStore
      .getState()
      .scenario.objects.filter((object) => object.type === 'boat')
    expect(
      boats.every(
        (boat) =>
          boat.boatClass === '470' &&
          boat.color === '#DF3F3F' &&
          boat.name === 'Ari' &&
          boat.sailNumber === 'SUI 42' &&
          boat.mainsailVisible &&
          boat.jibVisible &&
          !boat.spinnakerVisible &&
          !boat.gennakerVisible,
      ),
    ).toBe(true)
  })

  it('uses the last selected class for each subsequent new boat chain', () => {
    const store = useEditorStore.getState()
    store.setTool('boat')
    const first = store.addAt('boat', 100, 200)
    expect(first?.type).toBe('boat')
    if (!first || first.type !== 'boat') return
    useEditorStore.getState().updateObject(first.id, { boatClass: '470' }, 'Changed boat class')
    useEditorStore.getState().setTool('select')
    useEditorStore.getState().setTool('boat')
    const nextChain = useEditorStore.getState().addAt('boat', 300, 200)

    expect(nextChain).toMatchObject({ type: 'boat', boatClass: '470', positionNumber: 1 })
    expect(nextChain).toMatchObject({
      mainsailVisible: true,
      jibVisible: true,
      spinnakerVisible: false,
      gennakerVisible: false,
    })
    expect(nextChain?.type === 'boat' && nextChain.sequenceId).not.toBe(first.sequenceId)
    expect(nextChain?.type === 'boat' && nextChain.color).not.toBe(first.color)
  })

  it('applies VSR alpine blue to the complete coachboat chain', () => {
    const first = createBoat(100, 200)
    const second = { ...createBoat(180, 120), sequenceId: first.sequenceId, positionNumber: 2 }
    useEditorStore.getState().addObject(first)
    useEditorStore.getState().addObject(second)

    useEditorStore
      .getState()
      .updateObject(second.id, { boatClass: 'VSR Coachboat' }, 'Changed boat class')

    const boats = useEditorStore
      .getState()
      .scenario.objects.filter((object) => object.type === 'boat')
    expect(
      boats.every(
        (boat) =>
          boat.boatClass === 'VSR Coachboat' &&
          boat.color === VSR_COACHBOAT_BLUE &&
          !boat.mainsailVisible &&
          !boat.jibVisible,
      ),
    ).toBe(true)

    useEditorStore
      .getState()
      .updateObject(first.id, { color: '#DF3F3F' }, 'Tried to recolor fixed VSR')
    expect(
      useEditorStore
        .getState()
        .scenario.objects.filter((object) => object.type === 'boat')
        .every((boat) => boat.color === VSR_COACHBOAT_BLUE),
    ).toBe(true)
  })
})
