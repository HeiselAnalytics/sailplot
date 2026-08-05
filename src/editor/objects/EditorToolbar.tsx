import {
  ArrowUpRight,
  Circle,
  Cylinder,
  MousePointer2,
  Move,
  Pencil,
  Sailboat,
  Square,
  TextCursorInput,
  Minus,
} from 'lucide-react'
import { IconButton } from '../../components/ui/IconButton'
import { useI18n } from '../../i18n'
import { useEditorStore } from '../../stores/editorStore'
import type { EditorTool } from '../../types/scenario'

const tools: Array<{ id: EditorTool; label: string; icon: typeof MousePointer2 }> = [
  { id: 'select', label: 'Select', icon: MousePointer2 },
  { id: 'pan', label: 'Pan', icon: Move },
  { id: 'boat', label: 'Boat', icon: Sailboat },
  { id: 'mark', label: 'Mark', icon: Cylinder },
  { id: 'line', label: 'Line', icon: Minus },
  { id: 'arrow', label: 'Arrow', icon: ArrowUpRight },
  { id: 'freehand', label: 'Freehand', icon: Pencil },
  { id: 'text', label: 'Text', icon: TextCursorInput },
  { id: 'rectangle', label: 'Rectangle', icon: Square },
  { id: 'circle', label: 'Circle', icon: Circle },
]

export function EditorToolbar({ compact = false }: { compact?: boolean }) {
  const { t } = useI18n()
  const activeTool = useEditorStore((state) => state.activeTool)
  const setTool = useEditorStore((state) => state.setTool)
  return (
    <nav
      className={compact ? 'tool-grid tool-grid--compact' : 'tool-grid'}
      aria-label={t('Editor tools')}
    >
      {tools.map(({ id, label, icon: Icon }) => (
        <IconButton
          key={id}
          icon={<Icon aria-hidden="true" />}
          label={t(label)}
          compact={compact}
          active={activeTool === id}
          onClick={() => setTool(id)}
        />
      ))}
    </nav>
  )
}
