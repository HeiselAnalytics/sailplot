import { beforeEach, describe, expect, it } from 'vitest'
import {
  createBoat,
  createEmptyScenario,
  createGate,
  createMark,
  createStartLine,
} from '../src/lib/scenario'
import { COACHBOAT_BLUE } from '../src/editor/objects/boatShapes'
import { useEditorStore } from '../src/stores/editorStore'

describe('command history', () => {
  beforeEach(() => {
    useEditorStore.getState().setBrandAccentColor('#FFAA00')
    useEditorStore.getState().setScenario(createEmptyScenario())
  })

  it('uses the configured brand accent for the first new boat and mark', () => {
    const store = useEditorStore.getState()
    store.setBrandAccentColor('#0f766e')

    expect(store.addAt('boat', 100, 120)).toMatchObject({ type: 'boat', color: '#0f766e' })
    expect(useEditorStore.getState().addAt('mark', 200, 120)).toMatchObject({
      type: 'mark',
      color: '#0f766e',
    })
  })

  it('undoes and redoes object creation', () => {
    const boat = createBoat(100, 120)
    useEditorStore.getState().addObject(boat)
    expect(useEditorStore.getState().scenario.objects).toHaveLength(1)
    useEditorStore.getState().undo()
    expect(useEditorStore.getState().scenario.objects).toHaveLength(0)
    useEditorStore.getState().redo()
    expect(useEditorStore.getState().scenario.objects[0].id).toBe(boat.id)
  })

  it('undoes and redoes a composite layout as one command', () => {
    const first = createMark(100, 120)
    const second = { ...createMark(260, 120, 2), markNumber: '2' }
    useEditorStore.getState().addObjects([first, second], 'Added gate')
    expect(useEditorStore.getState().scenario.objects).toHaveLength(2)
    expect(useEditorStore.getState().selectedIds).toEqual([first.id, second.id])
    useEditorStore.getState().undo()
    expect(useEditorStore.getState().scenario.objects).toHaveLength(0)
    useEditorStore.getState().redo()
    expect(useEditorStore.getState().scenario.objects).toHaveLength(2)
  })

  it('moves compound endpoints without splitting the object', () => {
    const startLine = createStartLine(100, 200, 500, 200)
    useEditorStore.getState().addObject(startLine)
    useEditorStore.getState().updateObject(startLine.id, { endAX: -160, endAY: 70 })

    expect(useEditorStore.getState().scenario.objects).toHaveLength(1)
    expect(useEditorStore.getState().scenario.objects[0]).toMatchObject({
      type: 'start-line',
      endAX: -160,
      endAY: 70,
      endBX: 200,
      endBY: 0,
    })
  })

  it('shares drag previews without committing them to the plot or undo history', () => {
    const startLine = createStartLine(100, 200, 500, 200)
    useEditorStore.getState().addObject(startLine)
    const historyLength = useEditorStore.getState().history.length

    useEditorStore.getState().setDragPreview({
      id: startLine.id,
      patch: { endAX: -120, endAY: 80 },
    })

    expect(useEditorStore.getState().dragPreview).toEqual({
      id: startLine.id,
      patch: { endAX: -120, endAY: 80 },
    })
    expect(useEditorStore.getState().scenario.objects[0]).toMatchObject({
      endAX: -200,
      endAY: 0,
    })
    expect(useEditorStore.getState().history).toHaveLength(historyLength)
  })

  it('continues mark numbering after a gate and renumbers duplicated gates', () => {
    const first = createMark(100, 100)
    const second = { ...createMark(160, 100, 2), markNumber: '2' }
    const third = { ...createMark(220, 100, 3), markNumber: '3' }
    const gate = createGate(100, 240, 300, 240, 4, 4)
    useEditorStore.getState().addObjects([first, second, third, gate])

    const next = useEditorStore.getState().addAt('mark', 380, 100)
    expect(next).toMatchObject({ type: 'mark', markNumber: '5' })

    useEditorStore.getState().select(gate.id)
    useEditorStore.getState().duplicateSelected()
    expect(
      useEditorStore
        .getState()
        .scenario.objects.filter((object) => object.type === 'gate')
        .map((object) => object.markNumber),
    ).toEqual([4, 6])
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

  it('keeps overlap indicators individual and resets them on the next chain position', () => {
    const store = useEditorStore.getState()
    store.setTool('boat')
    const first = store.addAt('boat', 100, 200)
    if (!first || first.type !== 'boat') throw new Error('Boat creation failed')

    useEditorStore.getState().updateObject(first.id, { overlapIndicator: 'port' })
    const second = useEditorStore.getState().addAt('boat', 180, 120)

    expect(useEditorStore.getState().scenario.objects).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: first.id, overlapIndicator: 'port' }),
        expect.objectContaining({ id: second?.id, overlapIndicator: 'none' }),
      ]),
    )
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

  it('continues a selected boat chain when the Boat tool is activated', () => {
    const first = createBoat(100, 200)
    useEditorStore.getState().setTool('select')
    useEditorStore.getState().addObject(first)

    useEditorStore.getState().setTool('boat')
    expect(useEditorStore.getState().selectedIds).toEqual([first.id])
    const next = useEditorStore.getState().addAt('boat', 220, 140)

    expect(next).toMatchObject({
      type: 'boat',
      sequenceId: first.sequenceId,
      positionNumber: 2,
    })
  })

  it('starts a new boat chain when Boat is activated without a boat selection', () => {
    const first = createBoat(100, 200)
    const mark = createMark(180, 200)
    useEditorStore.getState().addObject(first)
    useEditorStore.getState().addObject(mark)

    useEditorStore.getState().setTool('boat')
    expect(useEditorStore.getState().selectedIds).toEqual([])
    const next = useEditorStore.getState().addAt('boat', 260, 140)

    expect(next).toMatchObject({ type: 'boat', positionNumber: 1 })
    expect(next?.type === 'boat' && next.sequenceId).not.toBe(first.sequenceId)
  })

  it('clears the selection when another creation tool is activated', () => {
    const mark = createMark(100, 120)
    useEditorStore.getState().addObject(mark)
    expect(useEditorStore.getState().selectedIds).toEqual([mark.id])

    useEditorStore.getState().setTool('finish-line')
    expect(useEditorStore.getState().activeTool).toBe('finish-line')
    expect(useEditorStore.getState().selectedIds).toEqual([])
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
    ).toEqual(['1', '2'])

    if (!second || second.type !== 'mark') return
    useEditorStore.getState().select(second.id)
    useEditorStore.getState().duplicateSelected()
    expect(
      useEditorStore
        .getState()
        .scenario.objects.filter((object) => object.type === 'mark')
        .map((mark) => mark.markNumber),
    ).toEqual(['1', '2', '3'])
    expect(createMark(0, 0)).toMatchObject({ markNumber: '1', downwind: false, label: '' })
  })

  it('continues automatic numbering after an alphanumeric mark number', () => {
    const mark = { ...createMark(100, 100), markNumber: '18z' }
    useEditorStore.getState().addObject(mark)

    expect(useEditorStore.getState().addAt('mark', 200, 100)).toMatchObject({
      type: 'mark',
      markNumber: '19',
    })
  })

  it('creates the downwind-mark tool as a numbered mark with downwind enabled', () => {
    const store = useEditorStore.getState()
    store.addAt('mark', 100, 100)
    const downwindMark = useEditorStore.getState().addAt('downwind-mark', 200, 100)

    expect(downwindMark).toMatchObject({
      type: 'mark',
      markNumber: '2',
      downwind: true,
    })
    expect(useEditorStore.getState().status).toBe('Added downwind mark')
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
    useEditorStore.getState().select(null)
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
      .updateObject(second.id, { boatClass: 'Coachboat' }, 'Changed boat class')

    const boats = useEditorStore
      .getState()
      .scenario.objects.filter((object) => object.type === 'boat')
    expect(
      boats.every(
        (boat) =>
          boat.boatClass === 'Coachboat' &&
          boat.color === COACHBOAT_BLUE &&
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
        .every((boat) => boat.color === COACHBOAT_BLUE),
    ).toBe(true)
  })
})
