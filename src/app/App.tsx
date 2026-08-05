import { useEffect, useRef, useState } from 'react'
import {
  Download,
  FileDown,
  FileJson,
  FolderOpen,
  HelpCircle,
  ImageDown,
  Info,
  LayoutTemplate,
  Moon,
  MoreHorizontal,
  Plus,
  Printer,
  Redo2,
  Settings,
  Share2,
  Sun,
  Undo2,
  Wind,
  X,
  ZoomIn,
} from 'lucide-react'
import { IconButton } from '../components/ui/IconButton'
import { ScenarioCanvas, type CanvasHandle } from '../editor/canvas/ScenarioCanvas'
import { EditorToolbar } from '../editor/objects/EditorToolbar'
import { PropertiesPanel } from '../editor/objects/PropertiesPanel'
import { createStartLineExample, createWindwardExample } from '../features/projects/examples'
import { usePersistence } from '../hooks/usePersistence'
import { useI18n, type Language } from '../i18n'
import {
  createEmptyScenario,
  createId,
  normalizeSignedAngle,
  now,
  sanitizeFilename,
} from '../lib/scenario'
import { deleteProject, listProjects, saveProject, type StoredProject } from '../services/database'
import { createShareUrl, scenarioFromHash } from '../services/scenarioCodec'
import { parseScenarioJson, serializeScenario } from '../services/scenarioFiles'
import { useEditorStore } from '../stores/editorStore'
import type { LayoutPreference } from '../types/scenario'

type Dialog = 'projects' | 'scenario' | 'help' | 'export' | null

const downloadBlob = (contents: BlobPart, filename: string, type: string) => {
  const url = URL.createObjectURL(new Blob([contents], { type }))
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.click()
  URL.revokeObjectURL(url)
}

function SceneRangeField({
  label,
  min,
  max,
  value,
  unit,
  centered = false,
  onChange,
}: {
  label: string
  min: number
  max: number
  value: number
  unit: string
  centered?: boolean
  onChange: (value: number) => void
}) {
  const { t } = useI18n()
  const update = (rawValue: string) => {
    const parsed = Number(rawValue)
    onChange(Math.min(max, Math.max(min, Number.isFinite(parsed) ? parsed : min)))
  }
  return (
    <label className="field scene-range-field">
      <span>{label}</span>
      <div className="scene-range-control">
        <div className="input-with-unit">
          <input
            type="number"
            min={min}
            max={max}
            step="1"
            value={value}
            aria-label={t('{label} value', { label })}
            onChange={(event) => update(event.target.value)}
          />
          <span>{unit}</span>
        </div>
        {centered ? (
          <div className="scene-range-slider scene-range-slider--centered">
            <input
              type="range"
              min={min}
              max={max}
              step="1"
              value={value}
              aria-label={t('{label} slider', { label })}
              onChange={(event) => update(event.target.value)}
            />
            <span className="scene-range-scale" aria-hidden="true">
              <span>−180°</span>
              <span>0°</span>
              <span>+180°</span>
            </span>
          </div>
        ) : (
          <input
            type="range"
            min={min}
            max={max}
            step="1"
            value={value}
            aria-label={t('{label} slider', { label })}
            onChange={(event) => update(event.target.value)}
          />
        )}
      </div>
    </label>
  )
}

function SceneSettings() {
  const { t } = useI18n()
  const scenario = useEditorStore((state) => state.scenario)
  const updateCanvas = useEditorStore((state) => state.updateCanvas)
  const updateEnvironment = useEditorStore((state) => state.updateEnvironment)
  return (
    <section className="scene-settings">
      <div className="section-title">
        <Settings aria-hidden="true" />
        <span>{t('Scene')}</span>
      </div>
      <div className="scene-toggle-grid">
        <label className="check-row">
          <input
            type="checkbox"
            checked={scenario.canvas.grid.visible}
            onChange={(event) =>
              updateCanvas({
                grid: { ...scenario.canvas.grid, visible: event.target.checked },
              })
            }
          />{' '}
          {t('Show grid')}
        </label>
        <label className="check-row">
          <input
            type="checkbox"
            checked={scenario.canvas.grid.snap}
            onChange={(event) =>
              updateCanvas({ grid: { ...scenario.canvas.grid, snap: event.target.checked } })
            }
          />{' '}
          {t('Snap to grid')}
        </label>
        <label className="check-row">
          <input
            type="checkbox"
            checked={scenario.environment.laylinesVisible}
            onChange={(event) => updateEnvironment({ laylinesVisible: event.target.checked })}
          />{' '}
          {t('Show laylines')}
        </label>
        <label className="check-row">
          <input
            type="checkbox"
            checked={scenario.environment.windVisible}
            onChange={(event) => updateEnvironment({ windVisible: event.target.checked })}
          />{' '}
          {t('Show wind')}
        </label>
        <label className="check-row">
          <input
            type="checkbox"
            checked={scenario.environment.zonesVisible}
            onChange={(event) => updateEnvironment({ zonesVisible: event.target.checked })}
          />
          {t('Show zones')}
        </label>
        <label className="check-row">
          <input
            type="checkbox"
            checked={scenario.canvas.boatNumbersVisible}
            onChange={(event) => updateCanvas({ boatNumbersVisible: event.target.checked })}
          />
          {t('Show boat numbers')}
        </label>
      </div>
      <SceneRangeField
        label={t('Grid size')}
        min={8}
        max={200}
        value={scenario.canvas.grid.size}
        unit="px"
        onChange={(size) => updateCanvas({ grid: { ...scenario.canvas.grid, size } })}
      />
      <SceneRangeField
        label={t('Grid visibility')}
        min={0}
        max={100}
        value={Math.round(scenario.canvas.grid.opacity * 100)}
        unit="%"
        onChange={(opacity) =>
          updateCanvas({ grid: { ...scenario.canvas.grid, opacity: opacity / 100 } })
        }
      />
      <SceneRangeField
        label={t('Wind direction')}
        min={-180}
        max={180}
        value={normalizeSignedAngle(scenario.environment.windDirection)}
        unit="°"
        centered
        onChange={(windDirection) => updateEnvironment({ windDirection })}
      />
      <SceneRangeField
        label={t('Layline angle')}
        min={0}
        max={90}
        value={scenario.environment.laylineAngle}
        unit="°"
        onChange={(laylineAngle) => updateEnvironment({ laylineAngle })}
      />
      <div className="scene-additional-information">
        <div className="section-title section-title--subtle">
          <Info aria-hidden="true" />
          <span>{t('Additional information')}</span>
        </div>
        <label className="field">
          <span>{t('Wind strength (general)')}</span>
          <input
            value={scenario.environment.windStrength ?? ''}
            placeholder={t('Optional, e.g. 12 kn')}
            onChange={(event) => updateEnvironment({ windStrength: event.target.value || null })}
          />
        </label>
      </div>
    </section>
  )
}

function BrandCredit({ onInfo }: { onInfo: () => void }) {
  const { t } = useI18n()
  return (
    <aside className="brand-credit" aria-label={t('Powered by Heisel Analytics')}>
      <img
        className="brand-logo"
        src={`${import.meta.env.BASE_URL}assets/heisel-analytics-logo-on-dark.png`}
        alt="Heisel Analytics"
      />
      <div className="brand-credit-copy">
        <div className="brand-credit-title">{t('Powered by Heisel Analytics')}</div>
        <nav aria-label={t('Heisel Analytics links')}>
          <button type="button" onClick={onInfo}>
            {t('Info')}
          </button>
          <span aria-hidden="true">|</span>
          <a href="https://heiselanalytics.one/" target="_blank" rel="noopener noreferrer">
            {t('Website')}
          </a>
          <span aria-hidden="true">|</span>
          <a href="https://heiselanalytics.one/impressum" target="_blank" rel="noopener noreferrer">
            {t('Imprint')}
          </a>
        </nav>
      </div>
    </aside>
  )
}

function Modal({
  title,
  children,
  onClose,
  wide = false,
}: {
  title: string
  children: React.ReactNode
  onClose: () => void
  wide?: boolean
}) {
  const { t } = useI18n()
  useEffect(() => {
    const handler = (event: KeyboardEvent) => event.key === 'Escape' && onClose()
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])
  return (
    <div
      className="modal-backdrop"
      role="presentation"
      onMouseDown={(event) => event.target === event.currentTarget && onClose()}
    >
      <section
        className={`modal ${wide ? 'modal--wide' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
      >
        <header>
          <h2 id="modal-title">{title}</h2>
          <button
            type="button"
            className="close-button"
            onClick={onClose}
            aria-label={t('Close dialog')}
          >
            ×
          </button>
        </header>
        <div className="modal-body">{children}</div>
      </section>
    </div>
  )
}

function ProjectsDialog({
  onClose,
  onImport,
}: {
  onClose: () => void
  onImport: () => void
}) {
  const { t, locale, language } = useI18n()
  const [projects, setProjects] = useState<StoredProject[]>([])
  const setScenario = useEditorStore((state) => state.setScenario)
  const setDocumentStatus = useEditorStore((state) => state.setDocumentStatus)
  const refresh = () => listProjects().then(setProjects)
  useEffect(() => {
    void refresh()
  }, [])
  const open = (project: StoredProject) => {
    setScenario(project.scenario)
    setDocumentStatus('browser')
    onClose()
  }
  const duplicate = async (project: StoredProject) => {
    const copy = structuredClone(project.scenario)
    const timestamp = now()
    copy.metadata = {
      ...copy.metadata,
      id: createId(),
      title: t('{title} copy', { title: copy.metadata.title }),
      createdAt: timestamp,
      updatedAt: timestamp,
    }
    await saveProject(copy)
    await refresh()
  }
  const create = (kind: 'empty' | 'windward' | 'start') => {
    const created =
      kind === 'windward'
        ? createWindwardExample()
        : kind === 'start'
          ? createStartLineExample()
          : createEmptyScenario(t('Untitled scenario'))
    if (language === 'de' && kind === 'windward') {
      created.metadata.title = t('Windward mark rounding')
      created.metadata.description = t('A static visual example for discussing Rule 18.')
    }
    if (language === 'de' && kind === 'start') {
      created.metadata.title = t('Start-line situation')
      created.metadata.description = t('Static positions for discussing a start-line situation.')
    }
    setScenario(created, 'Created scenario')
    onClose()
  }
  return (
    <Modal title={t('Projects')} onClose={onClose} wide>
      <div className="project-dialog-actions">
        <button type="button" className="secondary-button" onClick={onImport}>
          <FileDown aria-hidden="true" />
          {t('Import JSON')}
        </button>
      </div>
      <div className="template-grid">
        <button type="button" onClick={() => create('empty')}>
          <Plus />
          <strong>{t('Empty scenario')}</strong>
          <span>{t('Start with a clean canvas.')}</span>
        </button>
        <button type="button" onClick={() => create('windward')}>
          <Wind />
          <strong>{t('Windward mark')}</strong>
          <span>{t('Static Rule 18 discussion example.')}</span>
        </button>
        <button type="button" onClick={() => create('start')}>
          <LayoutTemplate />
          <strong>{t('Start line')}</strong>
          <span>{t('Boats approaching a start line.')}</span>
        </button>
      </div>
      <h3>{t('Recent local projects')}</h3>
      {projects.length === 0 ? (
        <div className="inline-empty">{t('No saved projects yet. Create a scenario above.')}</div>
      ) : (
        <div className="project-list">
          {projects.map((project) => (
            <article key={project.id}>
              <button type="button" className="project-open" onClick={() => open(project)}>
                <strong>{project.title}</strong>
                <span>{new Date(project.updatedAt).toLocaleString(locale)}</span>
              </button>
              <button
                type="button"
                className="project-action"
                onClick={() => void duplicate(project)}
              >
                {t('Duplicate')}
              </button>
              <button
                type="button"
                className="danger-link"
                onClick={() => {
                  if (window.confirm(t('Delete “{title}” from this browser?', { title: project.title })))
                    void deleteProject(project.id).then(refresh)
                }}
              >
                {t('Delete')}
              </button>
            </article>
          ))}
        </div>
      )}
    </Modal>
  )
}

function ScenarioDialog({ onClose }: { onClose: () => void }) {
  const { t } = useI18n()
  const scenario = useEditorStore((state) => state.scenario)
  const updateMetadata = useEditorStore((state) => state.updateMetadata)
  return (
    <Modal title={t('Scenario details')} onClose={onClose}>
      <label className="field">
        <span>{t('Title')}</span>
        <input
          value={scenario.metadata.title}
          onChange={(event) => updateMetadata({ title: event.target.value || t('Untitled scenario') })}
        />
      </label>
      <label className="field">
        <span>{t('Description')}</span>
        <textarea
          value={scenario.metadata.description}
          onChange={(event) => updateMetadata({ description: event.target.value })}
        />
      </label>
      <label className="field">
        <span>{t('Rule references')}</span>
        <input
          value={scenario.metadata.ruleReferences.join(', ')}
          onChange={(event) =>
            updateMetadata({
              ruleReferences: event.target.value
                .split(',')
                .map((value) => value.trim())
                .filter(Boolean),
            })
          }
        />
        <small>{t('Separate references with commas, for example “RRS 10, RRS 18”.')}</small>
      </label>
      <div className="modal-actions">
        <button type="button" className="primary-button" onClick={onClose}>
          {t('Done')}
        </button>
      </div>
    </Modal>
  )
}

function HelpDialog({ onClose }: { onClose: () => void }) {
  const { t } = useI18n()
  const [page, setPage] = useState<'help' | 'privacy' | 'about' | 'license'>('help')
  const tabLabels = { help: 'Help', privacy: 'Privacy', about: 'About', license: 'License' } as const
  return (
    <Modal title={t('Help & information')} onClose={onClose} wide>
      <div className="tabs" role="tablist">
        {(['help', 'privacy', 'about', 'license'] as const).map((id) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={page === id}
            className={page === id ? 'is-active' : ''}
            onClick={() => setPage(id)}
          >
            {t(tabLabels[id])}
          </button>
        ))}
      </div>
      {page === 'help' && (
        <div className="readable">
          <h3>{t('Build a static sailing explanation')}</h3>
          <p>{t('Add boats, marks, lines and notes from the tool panel. Select an object to edit its properties. This editor deliberately has no playback or sailing simulation.')}</p>
          <p>{t('The Boat tool stays active: each tap adds the next numbered position to the current boat chain. Choose Select or another tool when the chain is complete.')}</p>
          <h3>{t('Mouse and keyboard')}</h3>
          <p>{t('Scroll to zoom. Choose Pan or hold Space to move the view. Shift-click adds objects to a selection. Use Delete, arrow keys, ⌘/Ctrl+Z, ⌘/Ctrl+Shift+Z and ⌘/Ctrl+D.')}</p>
          <h3>{t('Touch and stylus')}</h3>
          <p>{t('Tap to select and drag objects to move them. Boats, marks and text can be rotated but keep their size. Drawing tools accept mouse, finger and stylus input.')}</p>
          <h3>{t('Sharing')}</h3>
          <p>{t('Share links contain a compressed copy of the complete project in the URL fragment. For large projects, export a JSON file instead.')}</p>
        </div>
      )}
      {page === 'privacy' && (
        <div className="readable">
          <h3>{t('Local-first privacy')}</h3>
          <p>{t('Projects and preferences are stored locally in this browser using IndexedDB. JSON and image exports are created on your device. No project data is uploaded to a server.')}</p>
          <p>{t('A share link contains the project data itself. Anyone who receives that link can access the scenario embedded in it.')}</p>
        </div>
      )}
      {page === 'about' && (
        <div className="readable">
          <h3>{t('Sailing Scenario Editor')}</h3>
          <p>{t('A new web-based implementation for creating static sailing and racing-rule diagrams. It is inspired by the historical BOATS application but is implemented from scratch and does not use the old application as a runtime dependency.')}</p>
          <p>{t('Powered by Heisel Analytics.')}</p>
        </div>
      )}
      {page === 'license' && (
        <div className="readable">
          <h3>{t('GNU General Public License v3')}</h3>
          <p>{t('This project is free software distributed under the GNU GPL v3. See the repository’s LICENSE file for the complete terms.')}</p>
        </div>
      )}
    </Modal>
  )
}

function ExportDialog({
  onClose,
  onJson,
  onPng,
  onShare,
  onPrint,
}: {
  onClose: () => void
  onJson: () => void
  onPng: (ratio: number, transparent?: boolean) => void
  onShare: () => void
  onPrint: () => void
}) {
  const { t, locale } = useI18n()
  const scenario = useEditorStore((state) => state.scenario)
  const shareLength = createShareUrl(scenario).length
  return (
    <Modal title={t('Export & share')} onClose={onClose}>
      <div className="export-list">
        <button type="button" onClick={onJson}>
          <FileJson />
          <span>
            <strong>{t('Scenario JSON')}</strong>
            <small>{t('Editable, validated project file')}</small>
          </span>
        </button>
        <button type="button" onClick={() => onPng(2)}>
          <ImageDown />
          <span>
            <strong>{t('PNG image · 2×')}</strong>
            <small>{t('Static image without editor handles')}</small>
          </span>
        </button>
        <button type="button" onClick={() => onPng(4)}>
          <ImageDown />
          <span>
            <strong>{t('PNG image · 4×')}</strong>
            <small>{t('High-resolution static image')}</small>
          </span>
        </button>
        <button type="button" onClick={() => onPng(2, true)}>
          <ImageDown />
          <span>
            <strong>{t('Transparent PNG · 2×')}</strong>
            <small>{t('Canvas objects without a background')}</small>
          </span>
        </button>
        <button type="button" onClick={onShare}>
          <Share2 />
          <span>
            <strong>{t('Share link')}</strong>
            <small>{t('{count} characters · project stays in the URL', { count: shareLength.toLocaleString(locale) })}</small>
          </span>
        </button>
        <button type="button" onClick={onPrint}>
          <Printer />
          <span>
            <strong>{t('Print or save PDF')}</strong>
            <small>{t('Use the browser’s print dialog')}</small>
          </span>
        </button>
      </div>
      {shareLength > 7500 && (
        <p className="warning">
          {t('This link is long and may not work in every app. Prefer JSON export for this project.')}
        </p>
      )}
    </Modal>
  )
}

export default function App() {
  usePersistence()
  const { language, setLanguage, t, status: localizeStatus } = useI18n()
  const canvasRef = useRef<CanvasHandle>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [dialog, setDialog] = useState<Dialog>(null)
  const [theme, setTheme] = useState<'light' | 'dark'>(() =>
    localStorage.getItem('sailing-theme') === 'light' ? 'light' : 'dark',
  )
  const scenario = useEditorStore((state) => state.scenario)
  const selectedIds = useEditorStore((state) => state.selectedIds)
  const activeTool = useEditorStore((state) => state.activeTool)
  const layoutPreference = useEditorStore((state) => state.layoutPreference)
  const status = useEditorStore((state) => state.status)
  const documentStatus = useEditorStore((state) => state.documentStatus)
  const history = useEditorStore((state) => state.history)
  const future = useEditorStore((state) => state.future)
  const setScenario = useEditorStore((state) => state.setScenario)
  const setStatus = useEditorStore((state) => state.setStatus)
  const setDocumentStatus = useEditorStore((state) => state.setDocumentStatus)
  const setLayoutPreference = useEditorStore((state) => state.setLayoutPreference)
  const setTool = useEditorStore((state) => state.setTool)
  const updateObjects = useEditorStore((state) => state.updateObjects)
  const deleteSelected = useEditorStore((state) => state.deleteSelected)
  const duplicateSelected = useEditorStore((state) => state.duplicateSelected)
  const undo = useEditorStore((state) => state.undo)
  const redo = useEditorStore((state) => state.redo)

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    localStorage.setItem('sailing-theme', theme)
  }, [theme])

  useEffect(() => {
    try {
      const shared = scenarioFromHash(window.location.hash)
      if (shared) setScenario(shared, 'Opened shared scenario')
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Could not open the shared scenario')
    }
    // Only decode the initial URL once.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement
      if (target.matches('input, textarea, select, [contenteditable="true"]')) return
      const command = event.metaKey || event.ctrlKey
      if (command && event.key.toLowerCase() === 'z') {
        event.preventDefault()
        if (event.shiftKey) redo()
        else undo()
        return
      }
      if (command && event.key.toLowerCase() === 'y') {
        event.preventDefault()
        redo()
        return
      }
      if (command && event.key.toLowerCase() === 'd') {
        event.preventDefault()
        duplicateSelected()
        return
      }
      if (event.key === 'Delete' || event.key === 'Backspace') {
        event.preventDefault()
        deleteSelected()
        return
      }
      if (
        ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.key) &&
        selectedIds.length
      ) {
        event.preventDefault()
        const amount = event.shiftKey ? 10 : 1
        const dx = event.key === 'ArrowLeft' ? -amount : event.key === 'ArrowRight' ? amount : 0
        const dy = event.key === 'ArrowUp' ? -amount : event.key === 'ArrowDown' ? amount : 0
        updateObjects(
          scenario.objects
            .filter((object) => selectedIds.includes(object.id) && !object.locked)
            .map((object) => ({ id: object.id, patch: { x: object.x + dx, y: object.y + dy } })),
          'Nudged selection',
        )
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [deleteSelected, duplicateSelected, redo, scenario.objects, selectedIds, undo, updateObjects])

  const exportJson = () => {
    downloadBlob(
      serializeScenario(scenario),
      `${sanitizeFilename(scenario.metadata.title)}.sailing-scenario.json`,
      'application/json',
    )
    setDocumentStatus('downloaded')
    setStatus('Exported scenario JSON')
  }
  const exportPng = (ratio: number, transparent = false) => {
    const data = canvasRef.current?.exportPng(transparent, ratio)
    if (!data) return
    const anchor = document.createElement('a')
    anchor.href = data
    anchor.download = `${sanitizeFilename(scenario.metadata.title)}${transparent ? '-transparent' : ''}.png`
    anchor.click()
    setDocumentStatus('downloaded')
    setStatus('Exported PNG image')
  }
  const share = async () => {
    const url = createShareUrl(scenario)
    const nativeShare = (navigator as unknown as { share?: (data?: ShareData) => Promise<void> })
      .share
    try {
      if (nativeShare)
        await nativeShare.call(navigator, {
          title: scenario.metadata.title,
          text: t('Static sailing scenario'),
          url,
        })
      else await navigator.clipboard.writeText(url)
      setStatus(nativeShare ? 'Opened share sheet' : 'Share link copied')
    } catch (error) {
      if ((error as DOMException).name !== 'AbortError')
        setStatus('Could not share; copy the address from your browser.')
    }
  }
  const importFile = async (file?: File) => {
    if (!file) return
    if (!file.name.endsWith('.json')) {
      setStatus('Unsupported file type. Choose a scenario JSON file.')
      return
    }
    try {
      setScenario(parseScenarioJson(await file.text()), 'Imported scenario JSON')
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Could not import this file')
    }
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  return (
    <div className="app-shell" data-layout={layoutPreference}>
      <header className="topbar">
        <div
          className="app-title"
          role="img"
          aria-label="SailPlot"
        >
          <span className="app-symbol">
            <img
              className="app-logo app-logo--on-light"
              src={`${import.meta.env.BASE_URL}icons/sailplot-logo-on-light.svg`}
              alt=""
              aria-hidden="true"
            />
            <img
              className="app-logo app-logo--on-dark"
              src={`${import.meta.env.BASE_URL}icons/sailplot-logo-on-dark.svg`}
              alt=""
              aria-hidden="true"
            />
            <img
              className="app-logo app-logo--compact"
              src={`${import.meta.env.BASE_URL}icons/sailplot-icon.svg`}
              alt=""
              aria-hidden="true"
            />
          </span>
        </div>
        <div className="topbar-document">
          <h1 className="topbar-document-title">
            <button
              type="button"
              title={t('Rename scenario')}
              aria-label={t('Rename scenario')}
              onClick={() => setDialog('scenario')}
            >
              {scenario.metadata.title}
            </button>
          </h1>
          <span
            className="document-save-status"
            data-state={documentStatus}
            role="status"
            aria-live="polite"
            title={t(
              documentStatus === 'browser'
                ? 'Saved in browser'
                : documentStatus === 'downloaded'
                  ? 'Downloaded'
                  : 'Not saved',
            )}
          >
            <span className="document-save-status-dot" aria-hidden="true" />
            <span className="document-save-status-label">
              {t(
                documentStatus === 'browser'
                  ? 'Saved in browser'
                  : documentStatus === 'downloaded'
                    ? 'Downloaded'
                    : 'Not saved',
              )}
            </span>
          </span>
        </div>
        <div className="topbar-actions topbar-actions--file">
          <IconButton
            icon={<FolderOpen />}
            label={t('Open projects & templates')}
            onClick={() => setDialog('projects')}
          />
          <IconButton
            icon={<Download />}
            label={t('Download')}
            onClick={() => setDialog('export')}
          />
        </div>
        <div className="topbar-actions">
          <IconButton
            compact
            icon={<Undo2 />}
            label={t('Undo')}
            disabled={!history.length}
            onClick={undo}
          />
          <IconButton
            compact
            icon={<Redo2 />}
            label={t('Redo')}
            disabled={!future.length}
            onClick={redo}
          />
          <IconButton
            compact
            icon={<ZoomIn />}
            label={t('Fit canvas')}
            onClick={() => canvasRef.current?.fitToScreen()}
          />
          <IconButton
            compact
            icon={<HelpCircle />}
            label={t('Help')}
            onClick={() => setDialog('help')}
          />
          <IconButton
            compact
            icon={theme === 'dark' ? <Sun /> : <Moon />}
            label={t(theme === 'dark' ? 'Use light mode' : 'Use dark mode')}
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          />
          <label className="layout-select" title={t('Layout preference')}>
            <MoreHorizontal aria-hidden="true" />
            <select
              value={layoutPreference}
              onChange={(event) => setLayoutPreference(event.target.value as LayoutPreference)}
              aria-label={t('Layout preference')}
            >
              <option value="auto">{t('Auto layout')}</option>
              <option value="compact">{t('Compact layout')}</option>
              <option value="desktop">{t('Desktop layout')}</option>
            </select>
          </label>
          <div className="language-switch" role="group" aria-label={t('Language')}>
            {(['de', 'en'] as Language[]).map((code) => (
              <button
                key={code}
                type="button"
                className={language === code ? 'is-active' : ''}
                aria-pressed={language === code}
                aria-label={code === 'de' ? 'Deutsch' : 'English'}
                onClick={() => setLanguage(code)}
              >
                {code.toUpperCase()}
              </button>
            ))}
          </div>
        </div>
        <input
          ref={fileInputRef}
          className="visually-hidden"
          type="file"
          accept="application/json,.json"
          onChange={(event) => void importFile(event.target.files?.[0])}
        />
      </header>
      <aside className="tools-panel">
        <div className="panel-header panel-header--tools">
          <div>
            <span className="eyebrow">{t('Create')}</span>
            <h2>{t('Tools')}</h2>
          </div>
          {activeTool !== 'select' && (
            <IconButton
              compact
              className="tool-cancel-button"
              icon={<X aria-hidden="true" />}
              label={t('Return to Select')}
              onClick={() => setTool('select')}
            />
          )}
        </div>
        <EditorToolbar />
        <SceneSettings />
      </aside>
      <main className="canvas-area">
        <ScenarioCanvas ref={canvasRef} />
        <BrandCredit onInfo={() => setDialog('help')} />
      </main>
      <aside className="properties-panel">
        <PropertiesPanel />
      </aside>
      <div className="mobile-properties" data-open={selectedIds.length > 0}>
        <PropertiesPanel />
      </div>
      <footer className="mobile-toolbar">
        <div className="mobile-toolbar-inner">
          <EditorToolbar compact />
          <div className="mobile-history" aria-label={t('History controls')}>
            <IconButton
              compact
              icon={<Undo2 />}
              label={t('Undo')}
              disabled={!history.length}
              onClick={undo}
            />
            <IconButton
              compact
              icon={<Redo2 />}
              label={t('Redo')}
              disabled={!future.length}
              onClick={redo}
            />
          </div>
        </div>
      </footer>
      <div className="statusbar">
        <span aria-live="polite">{localizeStatus(status)}</span>
        <span>
          {t('{count} objects · {zoom}%', {
            count: scenario.objects.length,
            zoom: Math.round(scenario.canvas.view.scale * 100),
          })}
        </span>
      </div>
      {dialog === 'projects' && (
        <ProjectsDialog
          onClose={() => setDialog(null)}
          onImport={() => {
            setDialog(null)
            fileInputRef.current?.click()
          }}
        />
      )}
      {dialog === 'scenario' && <ScenarioDialog onClose={() => setDialog(null)} />}
      {dialog === 'help' && <HelpDialog onClose={() => setDialog(null)} />}
      {dialog === 'export' && (
        <ExportDialog
          onClose={() => setDialog(null)}
          onJson={exportJson}
          onPng={exportPng}
          onShare={() => void share()}
          onPrint={() => window.print()}
        />
      )}
    </div>
  )
}
