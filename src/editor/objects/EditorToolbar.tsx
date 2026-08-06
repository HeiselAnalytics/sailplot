import {
  ArrowUpRight,
  Circle,
  Cylinder,
  Flag,
  FlagTriangleRight,
  MousePointer2,
  Move,
  Pencil,
  Sailboat,
  Square,
  TextCursorInput,
  Minus,
} from 'lucide-react'
import type { ComponentType, SVGProps } from 'react'
import { IconButton } from '../../components/ui/IconButton'
import { useI18n } from '../../i18n'
import { useEditorStore } from '../../stores/editorStore'
import type { EditorTool } from '../../types/scenario'

type ToolIcon = ComponentType<SVGProps<SVGSVGElement>>

function GateIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      data-icon="sailing-gate"
      {...props}
    >
      <path d="M3.5 7.5c0-1 4.5-1 4.5 0v9c0 1-4.5 1-4.5 0Z" />
      <path d="M3.5 7.5c0 1 4.5 1 4.5 0" />
      <path d="M16 7.5c0-1 4.5-1 4.5 0v9c0 1-4.5 1-4.5 0Z" />
      <path d="M16 7.5c0 1 4.5 1 4.5 0" />
      <path d="M8 12h8" strokeDasharray="2 2" />
    </svg>
  )
}

const tools: Array<{ id: EditorTool; label: string; icon: ToolIcon }> = [
  { id: 'select', label: 'Select', icon: MousePointer2 },
  { id: 'pan', label: 'Pan', icon: Move },
  { id: 'boat', label: 'Boat', icon: Sailboat },
  { id: 'mark', label: 'Mark', icon: Cylinder },
  { id: 'downwind-mark', label: 'Lee mark', icon: Cylinder },
  { id: 'gate', label: 'Gate', icon: GateIcon },
  { id: 'start-line', label: 'Start line', icon: FlagTriangleRight },
  { id: 'finish-line', label: 'Finish line', icon: Flag },
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
  const visibleTools = compact ? tools.filter(({ id }) => id !== 'downwind-mark') : tools
  return (
    <nav
      className={compact ? 'tool-grid tool-grid--compact' : 'tool-grid'}
      aria-label={t('Editor tools')}
    >
      {visibleTools.map(({ id, label, icon: Icon }) => (
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
