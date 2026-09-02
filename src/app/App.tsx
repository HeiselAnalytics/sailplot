import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  ArrowLeftRight,
  Check,
  ChevronDown,
  ChevronUp,
  Download,
  FileDown,
  FileJson,
  FolderOpen,
  HelpCircle,
  ImageDown,
  Info,
  LayoutTemplate,
  Moon,
  MoveRight,
  Pause,
  Play,
  Plus,
  Redo2,
  Rows3,
  Settings,
  Share2,
  SkipBack,
  SkipForward,
  Sun,
  Trash2,
  Undo2,
  View,
  Wind,
  X,
  ZoomIn,
} from 'lucide-react'
import { IconButton } from '../components/ui/IconButton'
import { namespacedStorageKey } from '../config/storage'
import { resolveMarkColor, resolveStartLineFlagColor } from '../config/objectColors'
import { resolvePartnerLinks } from '../config/partnerLinks'
import {
  sailPlotBrandAccentColor,
  sailPlotQrFinderColor,
  sailPlotThemeVariables,
} from '../config/theme'
import { SailPlotNavigation } from '../components/SailPlotNavigation'
import { ScenarioCanvas, type CanvasHandle } from '../editor/canvas/ScenarioCanvas'
import { EditorToolbar } from '../editor/objects/EditorToolbar'
import { PropertiesPanel } from '../editor/objects/PropertiesPanel'
import { measurementBoatLengthBasis } from '../editor/objects/boatShapes'
import {
  createClearAheadAsternExample,
  createPortStarboardExample,
  createStartLineExample,
  createWindwardExample,
  createWindwardLeewardExample,
} from '../features/projects/examples'
import { usePersistence } from '../hooks/usePersistence'
import { useI18n, type Language } from '../i18n'
import {
  createEmptyScenario,
  createId,
  isDarkPlotBackground,
  nextUntitledPlotTitle,
  normalizeSignedAngle,
  now,
  PLOT_BACKGROUNDS,
  sanitizeFilename,
} from '../lib/scenario'
import { boatColorForClass, mapBoatColorBetweenPalettes } from '../lib/boatColors'
import { gridOpacityForBackgroundChange } from '../lib/plotTheme'
import { normalizeRuleReference } from '../lib/ruleReferences'
import { addExportWatermark, createA4PlotPdf } from '../lib/exportImage'
import {
  createGifExport,
  createMp4Export,
  type AnimationExportFormat,
} from '../lib/exportAnimation'
import { createPlotQrCodeDataUrl } from '../lib/exportQrCode'
import {
  deleteAllProjects,
  deleteProject,
  listProjects,
  saveProject,
  type StoredProject,
} from '../services/database'
import { createShareUrl, scenarioFromHash } from '../services/scenarioCodec'
import { parseScenarioJson, serializeScenario } from '../services/scenarioFiles'
import { useEditorStore } from '../stores/editorStore'
import { SAILING_BOAT_CLASSES, type BoatClass, type BoatObject } from '../types/scenario'
import type { SailPlotExtensionContext, SailPlotExtensions } from '../extensions/types'
import { useSailPlotConfig } from '../providers/SailPlotConfigProvider'
import {
  hasPlayableBoatSequence,
  playbackLastPosition,
  PLAYBACK_SEGMENT_DURATION_MS,
} from '../features/playback/playback'

type Dialog = 'projects' | 'scenario' | 'settings' | 'help' | 'export' | 'qr' | null

const triggerDownload = (url: string, filename: string) => {
  const anchor = document.createElement('a')
  anchor.hidden = true
  anchor.rel = 'noopener'
  anchor.href = url
  anchor.download = filename
  document.body.append(anchor)
  anchor.click()
  anchor.remove()
}

const downloadBlob = (contents: BlobPart, filename: string, type: string) => {
  const blob =
    contents instanceof Blob && contents.type === type ? contents : new Blob([contents], { type })
  const url = URL.createObjectURL(blob)
  triggerDownload(url, filename)
  // Keep the object URL alive until Chromium has handed the file to its download manager.
  window.setTimeout(() => URL.revokeObjectURL(url), 30_000)
}

const waitForCanvasPaint = () =>
  new Promise<void>((resolve) => {
    window.requestAnimationFrame(() => window.requestAnimationFrame(() => resolve()))
  })

const downloadPdfBlob = async (pdf: Blob, filename: string) => {
  if (window.isSecureContext) {
    downloadBlob(pdf, filename, 'application/pdf')
    return
  }

  // Chrome warns about blob:http downloads on LAN previews. A data URL makes it explicit that
  // this PDF already exists locally in the browser and is not fetched over an insecure connection.
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () =>
      typeof reader.result === 'string'
        ? resolve(reader.result)
        : reject(new Error('Could not prepare the PDF download'))
    reader.onerror = () => reject(reader.error ?? new Error('Could not prepare the PDF download'))
    reader.readAsDataURL(pdf)
  })
  triggerDownload(dataUrl, filename)
}

function ExportInfo({ label, children }: { label: string; children: string }) {
  return (
    <span className="export-info">
      <button type="button" aria-label={label} className="export-info-button">
        <Info aria-hidden="true" />
      </button>
      <span className="export-info-tooltip" role="tooltip">
        {children}
      </span>
    </span>
  )
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

function SceneSettings({ embedded = false }: { embedded?: boolean }) {
  const { t } = useI18n()
  const [basisInfoOpen, setBasisInfoOpen] = useState(false)
  const basisId = embedded ? 'compact-boat-length-basis' : 'boat-length-basis'
  const basisInfoId = `${basisId}-info`
  const scenario = useEditorStore((state) => state.scenario)
  const updateCanvas = useEditorStore((state) => state.updateCanvas)
  const patchScenario = useEditorStore((state) => state.patchScenario)
  const updateEnvironment = useEditorStore((state) => state.updateEnvironment)
  const measurementBasis = measurementBoatLengthBasis(
    scenario.objects,
    scenario.environment.measurementBoatClass,
  )
  const darkPlot = isDarkPlotBackground(scenario.canvas.background)
  const setPlotBackground = (background: string) => {
    const gridOpacity = gridOpacityForBackgroundChange(
      scenario.canvas.grid.opacity,
      scenario.canvas.background,
      background,
    )
    if (background === scenario.canvas.background && gridOpacity === scenario.canvas.grid.opacity)
      return
    const objects =
      background === scenario.canvas.background
        ? scenario.objects
        : scenario.objects.map((object) =>
            object.type === 'boat' && SAILING_BOAT_CLASSES.includes(object.boatClass)
              ? {
                  ...object,
                  color: boatColorForClass(
                    object.boatClass,
                    mapBoatColorBetweenPalettes(
                      object.color,
                      scenario.canvas.background,
                      background,
                    ),
                  ),
                }
              : object,
          )
    patchScenario({
      canvas: {
        ...scenario.canvas,
        background,
        grid: { ...scenario.canvas.grid, opacity: gridOpacity },
      },
      objects,
    })
  }
  return (
    <section className={`scene-settings ${embedded ? 'scene-settings--embedded' : ''}`}>
      {!embedded && (
        <div className="section-title">
          <Settings aria-hidden="true" />
          <span>{t('Scene')}</span>
        </div>
      )}
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
      <div className="field">
        <span>{t('Plot background')}</span>
        <div className="plot-background-switch" role="group" aria-label={t('Plot background')}>
          <button
            type="button"
            aria-pressed={!darkPlot}
            className={!darkPlot ? 'is-active' : ''}
            onClick={() => setPlotBackground(PLOT_BACKGROUNDS.light)}
          >
            {t('Light')}
          </button>
          <button
            type="button"
            aria-pressed={darkPlot}
            className={darkPlot ? 'is-active' : ''}
            onClick={() => setPlotBackground(PLOT_BACKGROUNDS.dark)}
          >
            {t('Dark')}
          </button>
        </div>
      </div>
      <div className="field">
        <span>{t('Boat legend')}</span>
        <div className="plot-background-switch" role="group" aria-label={t('Boat legend')}>
          <button
            type="button"
            aria-pressed={scenario.canvas.boatLegendVisible}
            className={scenario.canvas.boatLegendVisible ? 'is-active' : ''}
            onClick={() => updateCanvas({ boatLegendVisible: true })}
          >
            {t('On')}
          </button>
          <button
            type="button"
            aria-pressed={!scenario.canvas.boatLegendVisible}
            className={!scenario.canvas.boatLegendVisible ? 'is-active' : ''}
            onClick={() => updateCanvas({ boatLegendVisible: false })}
          >
            {t('Off')}
          </button>
        </div>
      </div>
      <div className="field">
        <div className="field-label-row">
          <label htmlFor={basisId}>BL · {t('Boat-length basis')}</label>
          <button
            type="button"
            className="field-info-button"
            aria-label={t('How BL is calculated')}
            aria-expanded={basisInfoOpen}
            aria-controls={basisInfoId}
            title={t('How BL is calculated')}
            onClick={() => setBasisInfoOpen((open) => !open)}
          >
            <Info aria-hidden="true" />
          </button>
        </div>
        <select
          id={basisId}
          aria-label={t('Boat-length basis')}
          value={scenario.environment.measurementBoatClass ?? ''}
          onChange={(event) =>
            updateEnvironment({
              measurementBoatClass: (event.target.value || null) as BoatClass | null,
            })
          }
        >
          <option value="">
            {t('Default')} - {t(measurementBasis.boatClass)}
          </option>
          {SAILING_BOAT_CLASSES.map((boatClass) => (
            <option key={boatClass} value={boatClass}>
              {t(boatClass)}
            </option>
          ))}
        </select>
        {basisInfoOpen && (
          <p id={basisInfoId} className="field-info" role="status">
            {t(
              'Default uses the longest sailing boat class in the plot. Committee, jury and coach boats are excluded. Current basis: {boatClass}.',
              { boatClass: t(measurementBasis.boatClass) },
            )}
          </p>
        )}
      </div>
      <div className="field grid-spacing-field">
        <span>{t('Grid spacing')}</span>
        <strong>{t('1 BL · {boatClass}', { boatClass: t(measurementBasis.boatClass) })}</strong>
      </div>
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
        label={t('Layline angle')}
        min={0}
        max={90}
        value={scenario.environment.laylineAngle}
        unit="°"
        onChange={(laylineAngle) => updateEnvironment({ laylineAngle })}
      />
    </section>
  )
}

function PlaybackControls({
  compact = false,
  playing,
  position,
  lastPosition,
  speed,
  tailsVisible,
  onPlayingChange,
  onPositionChange,
  onSpeedChange,
  onTailsVisibleChange,
  onExit,
}: {
  compact?: boolean
  playing: boolean
  position: number
  lastPosition: number
  speed: number
  tailsVisible: boolean
  onPlayingChange: (playing: boolean) => void
  onPositionChange: (position: number) => void
  onSpeedChange: (speed: number) => void
  onTailsVisibleChange: (visible: boolean) => void
  onExit: () => void
}) {
  const { t } = useI18n()
  const start = Math.max(1, Math.floor(position))
  const end = Math.min(lastPosition, Math.ceil(position))
  const positionLabel =
    start === end
      ? t('Position {position} of {count}', { position: start, count: lastPosition })
      : t('Position {from} → {to} of {count}', { from: start, to: end, count: lastPosition })
  const togglePlayback = () => {
    if (!playing && position >= lastPosition) onPositionChange(1)
    onPlayingChange(!playing)
  }

  return (
    <section
      className={`playback-controls ${compact ? 'playback-controls--compact' : ''}`}
      aria-label={t('Player controls')}
    >
      {!compact && (
        <div className="panel-header playback-panel-header">
          <div>
            <span className="eyebrow">{t('View')}</span>
            <h2>{t('Player')}</h2>
          </div>
        </div>
      )}
      <div className="playback-transport" role="group" aria-label={t('Playback controls')}>
        <IconButton
          compact
          icon={<SkipBack aria-hidden="true" />}
          label={t('Previous position')}
          disabled={position <= 1}
          onClick={() => {
            onPlayingChange(false)
            onPositionChange(Math.max(1, Math.ceil(position) - 1))
          }}
        />
        <IconButton
          className="playback-primary-button"
          compact
          icon={playing ? <Pause aria-hidden="true" /> : <Play aria-hidden="true" />}
          label={t(playing ? 'Pause' : 'Play')}
          onClick={togglePlayback}
        />
        <IconButton
          compact
          icon={<SkipForward aria-hidden="true" />}
          label={t('Next position')}
          disabled={position >= lastPosition}
          onClick={() => {
            onPlayingChange(false)
            onPositionChange(Math.min(lastPosition, Math.floor(position) + 1))
          }}
        />
      </div>
      <label className="playback-timeline">
        <span>{positionLabel}</span>
        <input
          type="range"
          min="1"
          max={lastPosition}
          step="0.01"
          value={position}
          aria-label={t('Playback timeline')}
          onChange={(event) => {
            onPlayingChange(false)
            onPositionChange(Number(event.target.value))
          }}
        />
      </label>
      <div className="playback-settings">
        <div className="field playback-speed-field">
          <span>{t('Speed')}</span>
          <div className="plot-background-switch" role="group" aria-label={t('Playback speed')}>
            {[0.5, 1, 2].map((option) => (
              <button
                key={option}
                type="button"
                aria-pressed={speed === option}
                className={speed === option ? 'is-active' : ''}
                onClick={() => onSpeedChange(option)}
              >
                {option}×
              </button>
            ))}
          </div>
        </div>
        <div className="field playback-tail-field">
          <span>{t('Boat tails')}</span>
          <div className="plot-background-switch" role="group" aria-label={t('Boat tails')}>
            <button
              type="button"
              aria-pressed={tailsVisible}
              className={tailsVisible ? 'is-active' : ''}
              onClick={() => onTailsVisibleChange(true)}
            >
              {t('On')}
            </button>
            <button
              type="button"
              aria-pressed={!tailsVisible}
              className={!tailsVisible ? 'is-active' : ''}
              onClick={() => onTailsVisibleChange(false)}
            >
              {t('Off')}
            </button>
          </div>
        </div>
      </div>
      <button
        type="button"
        className={`secondary-button playback-exit-button ${compact ? 'tool-cancel-button playback-exit-button--compact' : ''}`}
        aria-label={compact ? t('Back to editor') : undefined}
        title={compact ? t('Back to editor') : undefined}
        onClick={onExit}
      >
        <X aria-hidden="true" />
        {!compact && t('Back to editor')}
      </button>
    </section>
  )
}

function MobileProperties({ hasSelection }: { hasSelection: boolean }) {
  const { t } = useI18n()
  const [open, setOpen] = useState(false)
  const scenario = useEditorStore((state) => state.scenario)
  const selectedIds = useEditorStore((state) => state.selectedIds)
  const selected = scenario.objects.filter((object) => selectedIds.includes(object.id))
  const object = selected[0]
  const typeLabel = object
    ? {
        boat: 'Boat',
        mark: 'Mark',
        gate: 'Gate',
        'start-line': 'Start line',
        'finish-line': 'Finish line',
        line: 'Line',
        arrow: 'Arrow',
        freehand: 'Freehand',
        text: 'Text',
        rectangle: 'Rectangle',
        circle: 'Circle',
      }[object.type]
    : 'Properties'
  const titleParts = [t('Properties')]
  if (selected.length > 1) {
    titleParts.push(t('{count} objects', { count: selected.length }))
  } else if (object?.type === 'boat') {
    titleParts.push(t(object.boatClass))
    if (object.sailNumber.trim()) titleParts.push(object.sailNumber.trim())
    if (object.name.trim()) titleParts.push(object.name.trim())
  } else if (object?.type === 'mark') {
    titleParts.push(t('Mark {number}', { number: object.markNumber }))
  } else if (object) {
    titleParts.push(t(typeLabel))
  }
  const title = titleParts.join(' – ')

  return (
    <div className="mobile-properties" data-selected={hasSelection} data-open={open}>
      {hasSelection && (
        <>
          <button
            type="button"
            className="mobile-properties-toggle"
            aria-label={t(open ? 'Collapse properties' : 'Expand properties')}
            aria-expanded={open}
            aria-controls="mobile-properties-body"
            onClick={() => setOpen((current) => !current)}
          >
            <span className="mobile-properties-title" title={title}>
              {title}
            </span>
            {open ? <ChevronUp aria-hidden="true" /> : <ChevronDown aria-hidden="true" />}
          </button>
          <div id="mobile-properties-body" className="mobile-properties-body" hidden={!open}>
            <PropertiesPanel />
          </div>
        </>
      )}
    </div>
  )
}

function MobileBrandingBar({
  onInfo,
  extensions,
  extensionContext,
}: {
  onInfo: () => void
  extensions: SailPlotExtensions
  extensionContext: SailPlotExtensionContext
}) {
  const { t } = useI18n()
  const config = useSailPlotConfig()
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const partnerLinks = resolvePartnerLinks(config)
  const actionCount = partnerLinks.length + (config.ui.help ? 1 : 0)
  const singlePartnerLink = actionCount === 1 ? partnerLinks[0] : undefined
  const openInfoDirectly = actionCount === 1 && config.ui.help
  const CompactBrandingContent = extensions.compactBrandingContent
  const partnerClassName = `mobile-branding-partner${
    config.branding.partnerLabel ? '' : ' mobile-branding-partner--logo-only'
  }`

  useEffect(() => {
    if (!menuOpen) return
    const closeOnOutsideClick = (event: PointerEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) setMenuOpen(false)
    }
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMenuOpen(false)
    }
    window.addEventListener('pointerdown', closeOnOutsideClick)
    window.addEventListener('keydown', closeOnEscape)
    return () => {
      window.removeEventListener('pointerdown', closeOnOutsideClick)
      window.removeEventListener('keydown', closeOnEscape)
    }
  }, [menuOpen])

  if (!config.ui.footer) return null

  return (
    <aside className="mobile-branding-bar" aria-label={config.texts.footerText}>
      <div className="mobile-branding-product">
        <a href={config.links.app ?? undefined} target="_blank" rel="noopener noreferrer">
          <img src={config.branding.exportProductLogo} alt={config.branding.logoAlt} />
        </a>
      </div>
      <div className="mobile-branding-partner-column">
        <div
          ref={menuRef}
          className={`mobile-branding-partner-menu${
            config.branding.partnerLabel ? '' : ' mobile-branding-partner-menu--logo-only'
          }`}
        >
          {singlePartnerLink ? (
            <a
              className={partnerClassName}
              href={singlePartnerLink.url}
              target={/^https?:/iu.test(singlePartnerLink.url) ? '_blank' : undefined}
              rel={/^https?:/iu.test(singlePartnerLink.url) ? 'noopener noreferrer' : undefined}
              aria-label={`${config.branding.partnerName}: ${t(singlePartnerLink.label)}`}
            >
              {config.branding.partnerLabel && <span>{config.branding.partnerLabel}</span>}
              <img src={config.branding.exportWatermarkLogo} alt={config.branding.partnerName} />
            </a>
          ) : actionCount > 0 ? (
            <button
              type="button"
              className={partnerClassName}
              aria-label={`${config.branding.partnerName}: ${
                openInfoDirectly ? t('Information') : t('Open menu')
              }`}
              aria-haspopup={actionCount > 1 ? 'menu' : undefined}
              aria-expanded={actionCount > 1 ? menuOpen : undefined}
              onClick={() => {
                if (openInfoDirectly) onInfo()
                else setMenuOpen((open) => !open)
              }}
            >
              {config.branding.partnerLabel && <span>{config.branding.partnerLabel}</span>}
              <img src={config.branding.exportWatermarkLogo} alt={config.branding.partnerName} />
            </button>
          ) : (
            <div className={partnerClassName}>
              {config.branding.partnerLabel && <span>{config.branding.partnerLabel}</span>}
              <img src={config.branding.exportWatermarkLogo} alt={config.branding.partnerName} />
            </div>
          )}
          {menuOpen && (
            <div className="mobile-branding-menu-popover" role="menu">
              {config.ui.help && (
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setMenuOpen(false)
                    onInfo()
                  }}
                >
                  {t('Information')}
                </button>
              )}
              {partnerLinks.map((link) => (
                <a
                  key={`${link.label}:${link.url}`}
                  href={link.url}
                  target={/^https?:/iu.test(link.url) ? '_blank' : undefined}
                  rel={/^https?:/iu.test(link.url) ? 'noopener noreferrer' : undefined}
                  role="menuitem"
                  onClick={() => setMenuOpen(false)}
                >
                  {t(link.label)}
                </a>
              ))}
            </div>
          )}
        </div>
      </div>
      <div className="mobile-branding-spacer">
        {CompactBrandingContent && <CompactBrandingContent {...extensionContext} />}
      </div>
    </aside>
  )
}

function CanvasQrCode({ onOpen }: { onOpen: () => void }) {
  const { t } = useI18n()
  const config = useSailPlotConfig()
  const qrFinderColor = sailPlotQrFinderColor(config)
  const scenario = useEditorStore((state) => state.scenario)
  const plotUrl = useMemo(
    () => config.links.qrCode ?? createShareUrl(scenario),
    [config.links.qrCode, scenario],
  )
  const qrCodeUrl = useMemo(() => {
    try {
      return createPlotQrCodeDataUrl(plotUrl, qrFinderColor)
    } catch {
      // Very large plots can still be shared through the export dialog even when
      // they exceed the QR standard's absolute capacity.
      return null
    }
  }, [plotUrl, qrFinderColor])
  if (!qrCodeUrl) return null

  return (
    <button
      type="button"
      className="canvas-plot-qr"
      aria-label={t('Open this plot')}
      aria-haspopup="dialog"
      onClick={onOpen}
    >
      <img src={qrCodeUrl} alt={t('QR code for this plot')} />
    </button>
  )
}

function CanvasBranding({
  onInfo,
  extensions,
  extensionContext,
}: {
  onInfo: () => void
  extensions: SailPlotExtensions
  extensionContext: SailPlotExtensionContext
}) {
  const { t } = useI18n()
  const config = useSailPlotConfig()
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const partnerLinks = resolvePartnerLinks(config)
  const actionCount = partnerLinks.length + (config.ui.help ? 1 : 0)
  const singlePartnerLink = actionCount === 1 ? partnerLinks[0] : undefined
  const openInfoDirectly = actionCount === 1 && config.ui.help
  const partnerClassName = `canvas-branding-partner${
    config.branding.partnerLabel ? '' : ' canvas-branding-partner--logo-only'
  }`
  const Footer = extensions.footer

  useEffect(() => {
    if (!menuOpen) return
    const closeOnOutsideClick = (event: PointerEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) setMenuOpen(false)
    }
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMenuOpen(false)
    }
    window.addEventListener('pointerdown', closeOnOutsideClick)
    window.addEventListener('keydown', closeOnEscape)
    return () => {
      window.removeEventListener('pointerdown', closeOnOutsideClick)
      window.removeEventListener('keydown', closeOnEscape)
    }
  }, [menuOpen])

  if (!config.ui.footer) return null
  return (
    <aside className="canvas-branding" aria-label={config.texts.footerText}>
      {Footer ? (
        <Footer {...extensionContext} />
      ) : (
        <>
          <div className="canvas-branding-visual">
            <div className="canvas-branding-logos">
              <a
                className="canvas-branding-product"
                href={config.links.app ?? undefined}
                target="_blank"
                rel="noopener noreferrer"
              >
                <img src={config.branding.exportProductLogo} alt={config.branding.logoAlt} />
              </a>
              <div ref={menuRef} className="canvas-branding-partner-section">
                {singlePartnerLink ? (
                  <a
                    className={partnerClassName}
                    href={singlePartnerLink.url}
                    target={/^https?:/iu.test(singlePartnerLink.url) ? '_blank' : undefined}
                    rel={
                      /^https?:/iu.test(singlePartnerLink.url) ? 'noopener noreferrer' : undefined
                    }
                    aria-label={`${config.branding.partnerName}: ${t(singlePartnerLink.label)}`}
                  >
                    {config.branding.partnerLabel && <span>{config.branding.partnerLabel}</span>}
                    <img
                      src={config.branding.exportWatermarkLogo}
                      alt={config.branding.partnerName}
                    />
                  </a>
                ) : actionCount > 0 ? (
                  <button
                    type="button"
                    className={partnerClassName}
                    aria-label={`${config.branding.partnerName}: ${
                      openInfoDirectly ? t('Information') : t('Open menu')
                    }`}
                    aria-haspopup={actionCount > 1 ? 'menu' : undefined}
                    aria-expanded={actionCount > 1 ? menuOpen : undefined}
                    onClick={() => {
                      if (openInfoDirectly) onInfo()
                      else setMenuOpen((open) => !open)
                    }}
                  >
                    {config.branding.partnerLabel && <span>{config.branding.partnerLabel}</span>}
                    <img
                      src={config.branding.exportWatermarkLogo}
                      alt={config.branding.partnerName}
                    />
                  </button>
                ) : (
                  <div className={partnerClassName}>
                    {config.branding.partnerLabel && <span>{config.branding.partnerLabel}</span>}
                    <img
                      src={config.branding.exportWatermarkLogo}
                      alt={config.branding.partnerName}
                    />
                  </div>
                )}
                {menuOpen && (
                  <div className="canvas-branding-menu-popover" role="menu">
                    {config.ui.help && (
                      <button
                        type="button"
                        role="menuitem"
                        onClick={() => {
                          setMenuOpen(false)
                          onInfo()
                        }}
                      >
                        {t('Information')}
                      </button>
                    )}
                    {partnerLinks.map((link) => (
                      <a
                        key={`${link.label}:${link.url}`}
                        href={link.url}
                        target={/^https?:/iu.test(link.url) ? '_blank' : undefined}
                        rel={/^https?:/iu.test(link.url) ? 'noopener noreferrer' : undefined}
                        role="menuitem"
                        onClick={() => setMenuOpen(false)}
                      >
                        {t(link.label)}
                      </a>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      )}
      {extensions.footerExtensions?.map((FooterExtension, index) => (
        <FooterExtension key={index} {...extensionContext} />
      ))}
      {config.ui.poweredBySailPlot && (
        <span className="brand-credit-powered-by">{config.texts.poweredByText}</span>
      )}
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

function PlotQrDialog({ onClose }: { onClose: () => void }) {
  const { t } = useI18n()
  const config = useSailPlotConfig()
  const qrFinderColor = sailPlotQrFinderColor(config)
  const scenario = useEditorStore((state) => state.scenario)
  const plotUrl = useMemo(
    () => config.links.qrCode ?? createShareUrl(scenario),
    [config.links.qrCode, scenario],
  )
  const qrCodeUrl = useMemo(
    () => createPlotQrCodeDataUrl(plotUrl, qrFinderColor),
    [plotUrl, qrFinderColor],
  )
  const duplicateInNewTab = () => {
    const newTab = window.open(plotUrl, '_blank', 'noopener,noreferrer')
    if (newTab) newTab.opener = null
  }

  return (
    <Modal title={t('QR code for this plot')} onClose={onClose}>
      <div className="plot-qr-dialog">
        <img className="plot-qr-dialog-code" src={qrCodeUrl} alt={t('QR code for this plot')} />
        <div className="modal-actions">
          <button type="button" className="primary-button" onClick={duplicateInNewTab}>
            {t('Duplicate into new tab')}
          </button>
        </div>
      </div>
    </Modal>
  )
}

function ProjectsDialog({ onClose, onImport }: { onClose: () => void; onImport: () => void }) {
  const { t, locale, language } = useI18n()
  const { storageNamespace } = useSailPlotConfig()
  const [projects, setProjects] = useState<StoredProject[]>([])
  const setScenario = useEditorStore((state) => state.setScenario)
  const scenario = useEditorStore((state) => state.scenario)
  const setDocumentStatus = useEditorStore((state) => state.setDocumentStatus)
  const refresh = useCallback(
    () => listProjects(storageNamespace).then(setProjects),
    [storageNamespace],
  )
  useEffect(() => {
    void refresh()
  }, [refresh])
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
    await saveProject(copy, storageNamespace)
    await refresh()
  }
  const deleteAll = async () => {
    await deleteAllProjects(storageNamespace)
    setProjects([])
  }
  const create = async (
    kind: 'empty' | 'windward' | 'start' | 'port-starboard' | 'windward-leeward' | 'ahead-astern',
  ) => {
    const storedProjects =
      kind === 'empty' ? await listProjects(storageNamespace).catch(() => projects) : projects
    const created = (() => {
      switch (kind) {
        case 'windward':
          return createWindwardExample()
        case 'start':
          return createStartLineExample()
        case 'port-starboard':
          return createPortStarboardExample()
        case 'windward-leeward':
          return createWindwardLeewardExample()
        case 'ahead-astern':
          return createClearAheadAsternExample()
        default:
          return createEmptyScenario(
            nextUntitledPlotTitle(t('Untitled plot'), [
              scenario.metadata.title,
              ...storedProjects.map((project) => project.title),
            ]),
          )
      }
    })()
    if (language === 'de' && kind !== 'empty') {
      const localizedMetadata = {
        windward: ['Windward mark rounding', 'A static visual example for discussing Rule 18.'],
        start: ['Start-line situation', 'Static positions for discussing a start-line situation.'],
        'port-starboard': [
          'Port–starboard crossing',
          'Two boats on opposite tacks approaching a crossing situation.',
        ],
        'windward-leeward': ['Windward–leeward overlap', 'Two overlapped boats on the same tack.'],
        'ahead-astern': [
          'Clear ahead and clear astern',
          'Two boats on the same tack, one clear ahead of the other.',
        ],
      }[kind]
      created.metadata.title = t(localizedMetadata[0])
      created.metadata.description = t(localizedMetadata[1])
    }
    setScenario(created, 'Created plot')
    onClose()
  }
  return (
    <Modal title={t('Projects & templates')} onClose={onClose} wide>
      <div className="template-grid">
        <button
          type="button"
          className="template-card--primary"
          onClick={() => void create('empty')}
        >
          <Plus />
          <strong>{t('Empty plot')}</strong>
          <span>{t('Start with a clean canvas.')}</span>
        </button>
        <button type="button" onClick={() => void create('windward')}>
          <Wind />
          <strong>{t('Windward mark')}</strong>
          <span>{t('Static Rule 18 discussion example.')}</span>
          <RuleReferenceBubbles references={['RRS 18']} />
        </button>
        <button type="button" onClick={() => void create('start')}>
          <LayoutTemplate />
          <strong>{t('Start line')}</strong>
          <span>{t('Boats approaching a start line.')}</span>
        </button>
        <button type="button" onClick={() => void create('port-starboard')}>
          <ArrowLeftRight />
          <strong>{t('Port–starboard')}</strong>
          <span>{t('Opposite-tack crossing under RRS 10.')}</span>
          <RuleReferenceBubbles references={['RRS 10']} />
        </button>
        <button type="button" onClick={() => void create('windward-leeward')}>
          <Rows3 />
          <strong>{t('Windward–leeward')}</strong>
          <span>{t('Same-tack overlap under RRS 11.')}</span>
          <RuleReferenceBubbles references={['RRS 11']} />
        </button>
        <button type="button" onClick={() => void create('ahead-astern')}>
          <MoveRight />
          <strong>{t('Clear ahead/astern')}</strong>
          <span>{t('Same-tack positions under RRS 12.')}</span>
          <RuleReferenceBubbles references={['RRS 12']} />
        </button>
      </div>
      <div className="project-list-heading">
        <h3>{t('Recent local projects')}</h3>
        <div className="project-list-actions">
          <button type="button" className="secondary-button" onClick={onImport}>
            <FileDown aria-hidden="true" />
            {t('Import JSON')}
          </button>
          {projects.length > 0 && (
            <button type="button" className="delete-all-projects" onClick={() => void deleteAll()}>
              <Trash2 aria-hidden="true" />
              {t('Delete all')}
            </button>
          )}
        </div>
      </div>
      {projects.length === 0 ? (
        <div className="inline-empty">{t('No saved projects yet. Create a plot above.')}</div>
      ) : (
        <div className="project-list">
          {projects.map((project) => (
            <article key={project.id}>
              <button type="button" className="project-open" onClick={() => open(project)}>
                <strong>{project.title}</strong>
                <span>{new Date(project.updatedAt).toLocaleString(locale)}</span>
              </button>
              <RuleReferenceBubbles references={project.scenario.metadata.ruleReferences} />
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
                  if (
                    window.confirm(
                      t('Delete “{title}” from this browser?', { title: project.title }),
                    )
                  )
                    void deleteProject(project.id, storageNamespace).then(refresh)
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

function RuleReferenceBubbles({ references }: { references: string[] }) {
  const { t } = useI18n()
  if (!references.length) return null
  const visibleReferences = references.slice(0, 3)
  const hiddenReferences = references.slice(visibleReferences.length)
  const hiddenReferenceCount = hiddenReferences.length
  return (
    <span className="rule-reference-bubbles" aria-label={t('Rule references')}>
      {visibleReferences.map((reference) => (
        <span className="rule-reference-bubble" key={reference}>
          {reference}
        </span>
      ))}
      {hiddenReferenceCount > 0 && (
        <span
          className="rule-reference-bubble rule-reference-bubble--overflow"
          aria-label={t('{count} more rule references', { count: hiddenReferenceCount })}
          tabIndex={0}
        >
          <span aria-hidden="true">...</span>
          <span className="rule-reference-overflow-popover" role="tooltip">
            {hiddenReferences.map((reference) => (
              <span className="rule-reference-overflow-item" key={reference}>
                {reference}
              </span>
            ))}
          </span>
        </span>
      )}
    </span>
  )
}

function ScenarioDialog({ onClose }: { onClose: () => void }) {
  const { t } = useI18n()
  const scenario = useEditorStore((state) => state.scenario)
  const updateMetadata = useEditorStore((state) => state.updateMetadata)
  const updateEnvironment = useEditorStore((state) => state.updateEnvironment)
  const [titleDraft, setTitleDraft] = useState(scenario.metadata.title)
  const [ruleReferencesDraft, setRuleReferencesDraft] = useState(() =>
    scenario.metadata.ruleReferences.map(normalizeRuleReference),
  )
  const [ruleReferenceInput, setRuleReferenceInput] = useState('')
  const [additionalInformationDraft, setAdditionalInformationDraft] = useState(() =>
    scenario.metadata.additionalInformation.map((field) => ({ ...field })),
  )
  const titleInputRef = useRef<HTMLInputElement>(null)
  const ruleReferenceInputRef = useRef<HTMLInputElement>(null)
  const mergeRuleReferences = (references: string[], values: string[]) => {
    const merged = [...references]
    values
      .map(normalizeRuleReference)
      .filter(Boolean)
      .forEach((value) => {
        if (
          !merged.some((reference) => reference.toLocaleLowerCase() === value.toLocaleLowerCase())
        ) {
          merged.push(value)
        }
      })
    return merged
  }
  const addRuleReferences = (values: string[]) => {
    setRuleReferencesDraft((references) => mergeRuleReferences(references, values))
  }
  const commitRuleReferenceInput = () => {
    if (!ruleReferenceInput.trim()) return
    addRuleReferences(ruleReferenceInput.split(','))
    setRuleReferenceInput('')
  }
  const closeWithValidTitle = () => {
    const title = titleDraft.trim() || t('Untitled plot')
    const ruleReferences = mergeRuleReferences(ruleReferencesDraft, ruleReferenceInput.split(','))
    const additionalInformation = additionalInformationDraft
      .map((field, index) => ({
        ...field,
        name: field.name.trim() || (index === 0 && field.value.trim() ? t('Wind strength') : ''),
        value: field.value.trim(),
      }))
      .filter((field) => field.name || field.value)
    const metadataChanged =
      title !== scenario.metadata.title ||
      JSON.stringify(ruleReferences) !== JSON.stringify(scenario.metadata.ruleReferences) ||
      JSON.stringify(additionalInformation) !==
        JSON.stringify(scenario.metadata.additionalInformation)
    if (metadataChanged) updateMetadata({ title, ruleReferences, additionalInformation })
    const windStrength =
      additionalInformation.find((field) => {
        const name = field.name.trim().toLocaleLowerCase()
        return [
          'wind strength',
          'wind strength (general)',
          'windstärke',
          'windstärke (allgemein)',
        ].includes(name)
      })?.value || null
    if (windStrength !== scenario.environment.windStrength) updateEnvironment({ windStrength })
    onClose()
  }
  const updateAdditionalInformation = (
    id: string,
    patch: Partial<(typeof additionalInformationDraft)[number]>,
  ) =>
    setAdditionalInformationDraft((fields) =>
      fields.map((field) => (field.id === id ? { ...field, ...patch } : field)),
    )
  return (
    <Modal title={t('Plot details')} onClose={closeWithValidTitle}>
      <div className="field">
        <label htmlFor="plot-title">{t('Title')}</label>
        <div className="clearable-input">
          <input
            ref={titleInputRef}
            id="plot-title"
            value={titleDraft}
            onChange={(event) => setTitleDraft(event.target.value)}
          />
          <button
            type="button"
            className="input-clear-button"
            aria-label={t('Clear title')}
            title={t('Clear title')}
            disabled={!titleDraft}
            onClick={() => {
              setTitleDraft('')
              titleInputRef.current?.focus()
            }}
          >
            <X aria-hidden="true" />
          </button>
        </div>
      </div>
      <label className="field">
        <span>{t('Description')}</span>
        <textarea
          value={scenario.metadata.description}
          onChange={(event) => updateMetadata({ description: event.target.value })}
        />
      </label>
      <div className="field">
        <label htmlFor="rule-reference-input">{t('Rule references')}</label>
        <div
          className="rule-reference-editor"
          onClick={() => ruleReferenceInputRef.current?.focus()}
        >
          <span className="rule-reference-chips" role="list">
            {ruleReferencesDraft.map((reference) => (
              <span className="rule-reference-chip" role="listitem" key={reference}>
                <span>{reference}</span>
                <button
                  type="button"
                  aria-label={t('Remove rule reference {reference}', { reference })}
                  onClick={(event) => {
                    event.stopPropagation()
                    setRuleReferencesDraft((references) =>
                      references.filter((item) => item !== reference),
                    )
                  }}
                >
                  <X aria-hidden="true" />
                </button>
              </span>
            ))}
          </span>
          <input
            ref={ruleReferenceInputRef}
            id="rule-reference-input"
            aria-label={t('Rule references')}
            placeholder={t('For example 18 or 18.2(a)')}
            value={ruleReferenceInput}
            onChange={(event) => {
              const parts = event.target.value.split(',')
              if (parts.length === 1) {
                setRuleReferenceInput(event.target.value)
                return
              }
              addRuleReferences(parts.slice(0, -1))
              setRuleReferenceInput(parts.at(-1) ?? '')
            }}
            onBlur={commitRuleReferenceInput}
            onKeyDown={(event) => {
              if ((event.key === 'Enter' || event.key === ',') && ruleReferenceInput.trim()) {
                event.preventDefault()
                commitRuleReferenceInput()
              } else if (
                event.key === 'Backspace' &&
                !ruleReferenceInput &&
                ruleReferencesDraft.length
              ) {
                setRuleReferencesDraft((references) => references.slice(0, -1))
              }
            }}
          />
        </div>
        <small>{t('Separate references with commas, for example “RRS 10, RRS 18”.')}</small>
      </div>
      <section className="plot-additional-information">
        <div className="additional-information-heading">
          <div className="section-title section-title--subtle">
            <Info aria-hidden="true" />
            <span>{t('Additional information')}</span>
          </div>
          <span className="additional-information-count">
            {t('{count} of 10', { count: additionalInformationDraft.length })}
          </span>
        </div>
        {additionalInformationDraft.length > 0 ? (
          <>
            <div className="additional-information-labels" aria-hidden="true">
              <span>{t('Name')}</span>
              <span>{t('Value')}</span>
            </div>
            <div className="additional-information-list">
              {additionalInformationDraft.map((field, index) => (
                <div className="additional-information-row" key={field.id}>
                  <label className="field">
                    <span className="visually-hidden">
                      {t('Information name {number}', { number: index + 1 })}
                    </span>
                    <input
                      value={field.name}
                      aria-label={t('Information name {number}', { number: index + 1 })}
                      placeholder={index === 0 ? t('Wind strength') : t('Name')}
                      onChange={(event) =>
                        updateAdditionalInformation(field.id, { name: event.target.value })
                      }
                    />
                  </label>
                  <label className="field">
                    <span className="visually-hidden">
                      {t('Information value {number}', { number: index + 1 })}
                    </span>
                    <input
                      value={field.value}
                      aria-label={t('Information value {number}', { number: index + 1 })}
                      placeholder={index === 0 ? t('Optional, e.g. 12 kn') : t('Value')}
                      onChange={(event) =>
                        updateAdditionalInformation(field.id, { value: event.target.value })
                      }
                    />
                  </label>
                  <button
                    type="button"
                    className="additional-information-remove"
                    aria-label={t('Remove information {number}', { number: index + 1 })}
                    title={t('Remove information {number}', { number: index + 1 })}
                    onClick={() =>
                      setAdditionalInformationDraft((fields) =>
                        fields.filter(({ id }) => id !== field.id),
                      )
                    }
                  >
                    <X aria-hidden="true" />
                  </button>
                </div>
              ))}
            </div>
          </>
        ) : (
          <p className="additional-information-empty">{t('No additional information.')}</p>
        )}
        <button
          type="button"
          className="secondary-button additional-information-add"
          disabled={additionalInformationDraft.length >= 10}
          onClick={() =>
            setAdditionalInformationDraft((fields) => [
              ...fields,
              { id: createId(), name: '', value: '' },
            ])
          }
        >
          <Plus aria-hidden="true" />
          {t('Add information')}
        </button>
      </section>
      <div className="modal-actions">
        <button type="button" className="primary-button" onClick={closeWithValidTitle}>
          {t('Done')}
        </button>
      </div>
    </Modal>
  )
}

function HelpDialog({
  onClose,
  extensions,
  extensionContext,
}: {
  onClose: () => void
  extensions: SailPlotExtensions
  extensionContext: SailPlotExtensionContext
}) {
  const { t } = useI18n()
  const config = useSailPlotConfig()
  const HelpContent = extensions.helpContent
  const [page, setPage] = useState<'help' | 'privacy' | 'about' | 'license'>('help')
  const tabLabels = {
    help: 'Help',
    privacy: 'Privacy',
    about: 'About',
    license: 'License',
  } as const
  return (
    <Modal title={t('Help & information')} onClose={onClose} wide>
      <div className="tabs" role="tablist">
        {(
          ['help', 'privacy', ...(config.ui.about ? (['about'] as const) : []), 'license'] as const
        ).map((id) => (
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
          <p>{t(config.texts.helpText)}</p>
          <p>
            {t(
              'The Boat tool stays active: each tap adds the next numbered position to the current boat chain. To continue an existing chain, select one of its boats and then choose Boat. Choose Select or another tool when the chain is complete.',
            )}
          </p>
          {HelpContent && <HelpContent {...extensionContext} />}
          {(config.links.support || config.links.documentation) && (
            <p className="configured-help-links">
              {config.links.support && (
                <a href={config.links.support} target="_blank" rel="noopener noreferrer">
                  {t('Support')}
                </a>
              )}
              {config.links.documentation && (
                <a href={config.links.documentation} target="_blank" rel="noopener noreferrer">
                  {t('Documentation')}
                </a>
              )}
            </p>
          )}
          <h3>{t('Mouse and keyboard')}</h3>
          <p>
            {t(
              'Scroll to zoom. Choose Pan or hold Space to move the view. Shift-click adds objects to a selection. Use Delete, arrow keys, ⌘/Ctrl+Z, ⌘/Ctrl+Shift+Z and ⌘/Ctrl+D.',
            )}
          </p>
          <h3>{t('Touch and stylus')}</h3>
          <p>
            {t(
              'Tap to select and drag objects to move them. Drag drawing tools directly, or click twice to set start and end. Rectangle uses opposite corners; circle uses a centre and outer point. Drawing tools accept mouse, finger and stylus input.',
            )}
          </p>
          <h3>{t('Sharing')}</h3>
          <p>
            {t(
              'Share links contain a compressed copy of the complete project in the URL fragment. For large projects, export a JSON file instead.',
            )}
          </p>
        </div>
      )}
      {page === 'privacy' && (
        <div className="readable">
          <h3>{t('Local-first privacy')}</h3>
          <p>
            {t(
              'Projects and preferences are stored locally in this browser using IndexedDB. JSON and image exports are created on your device. No project data is uploaded to a server.',
            )}
          </p>
          <p>
            {t(
              'A share link contains the project data itself. Anyone who receives that link can access the plot embedded in it.',
            )}
          </p>
          {config.links.privacy && (
            <p>
              <a href={config.links.privacy} target="_blank" rel="noopener noreferrer">
                {t('Privacy')}
              </a>
            </p>
          )}
        </div>
      )}
      {page === 'about' && (
        <div className="readable">
          <h3>{t(config.branding.appName)}</h3>
          <p>{t(config.texts.aboutText)}</p>
          <p>{t(`${config.texts.footerText}.`)}</p>
        </div>
      )}
      {page === 'license' && (
        <div className="readable">
          <h3>{t('GNU General Public License v3')}</h3>
          <p>
            {t(
              'This project is free software distributed under the GNU GPL v3. See the repository’s LICENSE file for the complete terms.',
            )}
          </p>
        </div>
      )}
    </Modal>
  )
}

function ExportDialog({
  onClose,
  onJson,
  onPng,
  onAnimation,
  onShare,
  onPdf,
  canAnimate,
}: {
  onClose: () => void
  onJson: () => void
  onPng: (transparent?: boolean) => Promise<void>
  onAnimation: (
    format: AnimationExportFormat,
    onProgress: (progress: number) => void,
  ) => Promise<void>
  onShare: () => Promise<boolean>
  onPdf: () => Promise<void>
  canAnimate: boolean
}) {
  const { t, locale } = useI18n()
  const config = useSailPlotConfig()
  const scenario = useEditorStore((state) => state.scenario)
  const shareLength = createShareUrl(scenario).length
  const [copied, setCopied] = useState(false)
  const [copying, setCopying] = useState(false)
  const [animationExport, setAnimationExport] = useState<AnimationExportFormat | null>(null)
  const [animationProgress, setAnimationProgress] = useState(0)
  const copyShareLink = async () => {
    setCopying(true)
    const success = await onShare()
    setCopying(false)
    setCopied(success)
  }
  const exportAnimation = async (format: AnimationExportFormat) => {
    setAnimationExport(format)
    setAnimationProgress(0)
    try {
      await onAnimation(format, setAnimationProgress)
    } finally {
      setAnimationExport(null)
      setAnimationProgress(0)
    }
  }
  const progressLabel = t('Exporting {progress}%', {
    progress: Math.round(animationProgress * 100),
  })
  return (
    <Modal title={t('Export & share')} onClose={onClose}>
      <div className="export-list">
        <section className="export-option export-option--share">
          <Share2 className="export-option-icon" aria-hidden="true" />
          <div className="export-option-copy">
            <div className="export-option-title">
              <strong>{t('Share link')}</strong>
              <ExportInfo label={t('About Share link')}>
                {t('Copies a URL containing the complete editable plot. No upload is required.')}
              </ExportInfo>
            </div>
            <small>
              {t('{count} characters · project stays in the URL', {
                count: shareLength.toLocaleString(locale),
              })}
            </small>
          </div>
          <button
            type="button"
            className={`export-copy-button ${copied ? 'is-copied' : ''}`}
            disabled={copying}
            onClick={() => void copyShareLink()}
          >
            {copied && <Check aria-hidden="true" />}
            {t(copied ? 'Copied' : 'Copy URL with project')}
          </button>
        </section>
        {shareLength > 4000 && (
          <p className="warning">
            {t(
              'This link is long and may not work in every app. Prefer JSON export for this project.',
            )}
          </p>
        )}
        <section className="export-option">
          <FileJson className="export-option-icon" aria-hidden="true" />
          <div className="export-option-copy">
            <div className="export-option-title">
              <strong>{t('Plot JSON')}</strong>
              <ExportInfo label={t('About Plot JSON')}>
                {t('Best for editing later or transferring a plot between browsers.')}
              </ExportInfo>
            </div>
            <small>{t('Editable, validated project file')}</small>
          </div>
          <button type="button" className="export-action-button" onClick={onJson}>
            {t('Download JSON')}
          </button>
        </section>
        <section className="export-option">
          <ImageDown className="export-option-icon" aria-hidden="true" />
          <div className="export-option-copy">
            <div className="export-option-title">
              <strong>{t('PNG image')}</strong>
              <ExportInfo label={t('About PNG image')}>
                {t(config.texts.exportPngDescription)}
              </ExportInfo>
            </div>
            <small>{t('Static image without editor handles')}</small>
          </div>
          <button type="button" className="export-action-button" onClick={() => void onPng()}>
            {t('Download PNG')}
          </button>
        </section>
        <section className="export-option">
          <ImageDown className="export-option-icon" aria-hidden="true" />
          <div className="export-option-copy">
            <div className="export-option-title">
              <strong>{t('Transparent PNG')}</strong>
              <ExportInfo label={t('About Transparent PNG')}>
                {t(config.texts.exportTransparentPngDescription)}
              </ExportInfo>
            </div>
            <small>{t('Canvas objects without a background')}</small>
          </div>
          <button type="button" className="export-action-button" onClick={() => void onPng(true)}>
            {t('Download transparent PNG')}
          </button>
        </section>
        <section className="export-option">
          <Play className="export-option-icon" aria-hidden="true" />
          <div className="export-option-copy">
            <div className="export-option-title">
              <strong>{t('Animated GIF')}</strong>
              <ExportInfo label={t('About animated GIF')}>
                {t(
                  'Exports the complete Player sequence as a looping GIF. The transparent variant omits the plot background.',
                )}
              </ExportInfo>
            </div>
            <small>
              {t(
                canAnimate
                  ? 'Looping animation · standard or transparent'
                  : 'Add at least two positions to a boat first',
              )}
            </small>
          </div>
          <div className="export-format-actions" role="group" aria-label={t('GIF format')}>
            <button
              type="button"
              disabled={!canAnimate || animationExport !== null}
              onClick={() => void exportAnimation('gif')}
            >
              {animationExport === 'gif' ? progressLabel : t('Download GIF')}
            </button>
            <button
              type="button"
              disabled={!canAnimate || animationExport !== null}
              onClick={() => void exportAnimation('gif-transparent')}
            >
              {animationExport === 'gif-transparent' ? progressLabel : t('Transparent GIF')}
            </button>
          </div>
        </section>
        <section className="export-option">
          <FileDown className="export-option-icon" aria-hidden="true" />
          <div className="export-option-copy">
            <div className="export-option-title">
              <strong>{t('MP4 video')}</strong>
              <ExportInfo label={t('About MP4 video')}>
                {t('Exports the complete Player sequence as a high-quality MP4 video.')}
              </ExportInfo>
            </div>
            <small>
              {t(
                canAnimate
                  ? 'Smooth video with plot background'
                  : 'Add at least two positions to a boat first',
              )}
            </small>
          </div>
          <button
            type="button"
            className="export-action-button"
            disabled={!canAnimate || animationExport !== null}
            onClick={() => void exportAnimation('mp4')}
          >
            {animationExport === 'mp4' ? progressLabel : t('Download MP4')}
          </button>
        </section>
        <section className="export-option">
          <FileDown className="export-option-icon" aria-hidden="true" />
          <div className="export-option-copy">
            <div className="export-option-title">
              <strong>{t('PDF document')}</strong>
              <ExportInfo label={t('About PDF document')}>
                {t('Downloads the plot directly as an A4 landscape PDF.')}
              </ExportInfo>
            </div>
            <small>{t('A4 landscape with a clickable plot QR watermark')}</small>
          </div>
          <button type="button" className="export-action-button" onClick={() => void onPdf()}>
            {t('Download PDF')}
          </button>
        </section>
      </div>
    </Modal>
  )
}

interface EditorAppProps {
  extensions: SailPlotExtensions
  extensionContext: SailPlotExtensionContext
}

export default function App({ extensions, extensionContext }: EditorAppProps) {
  usePersistence()
  const config = useSailPlotConfig()
  const setBrandAccentColor = useEditorStore((state) => state.setBrandAccentColor)
  const setObjectColors = useEditorStore((state) => state.setObjectColors)
  const brandAccentColor = sailPlotBrandAccentColor(config)
  const qrFinderColor = sailPlotQrFinderColor(config)
  const markColor = resolveMarkColor(config)
  const startLineFlagColor = resolveStartLineFlagColor(config)
  useEffect(() => setBrandAccentColor(brandAccentColor), [brandAccentColor, setBrandAccentColor])
  useEffect(
    () => setObjectColors(markColor, startLineFlagColor),
    [markColor, setObjectColors, startLineFlagColor],
  )
  const { language, setLanguage, t, status: localizeStatus } = useI18n()
  const EmptySelectionContent = extensions.emptySelectionContent
  const canvasRef = useRef<CanvasHandle>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [dialog, setDialog] = useState<Dialog>(null)
  const [playerMode, setPlayerMode] = useState(false)
  const [playbackPlaying, setPlaybackPlaying] = useState(false)
  const [playbackPosition, setPlaybackPosition] = useState(1)
  const [playbackSpeed, setPlaybackSpeed] = useState(1)
  const [playbackTailsVisible, setPlaybackTailsVisible] = useState(true)
  const [exportPlaybackPosition, setExportPlaybackPosition] = useState<number>()
  const [isCompactViewport, setIsCompactViewport] = useState(
    () => window.matchMedia('(max-width: 980px)').matches,
  )
  const themeStorageKey = namespacedStorageKey(config.storageNamespace, 'sailing-theme')
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    if (config.theme.mode === 'system') {
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
    }
    const stored = localStorage.getItem(themeStorageKey)
    if (stored === 'light' || stored === 'dark') return stored
    return config.theme.mode
  })
  const configuredThemeRef = useRef(config.theme.mode)
  const scenario = useEditorStore((state) => state.scenario)
  const selectedIds = useEditorStore((state) => state.selectedIds)
  const lastPlaybackPosition = useMemo(
    () => playbackLastPosition(scenario.objects),
    [scenario.objects],
  )
  const canPlay = useMemo(() => hasPlayableBoatSequence(scenario.objects), [scenario.objects])
  useEffect(() => {
    if (!config.theme.usePrimaryForBrandAccents) return
    const firstBoat = scenario.objects.find(
      (object): object is BoatObject =>
        object.type === 'boat' && SAILING_BOAT_CLASSES.includes(object.boatClass),
    )
    if (!firstBoat) return

    const normalizedPrimary = brandAccentColor.toUpperCase()
    const sequenceUsesPrimary = scenario.objects
      .filter(
        (object): object is BoatObject =>
          object.type === 'boat' && object.sequenceId === firstBoat.sequenceId,
      )
      .every((object) => object.color.toUpperCase() === normalizedPrimary)
    if (sequenceUsesPrimary) return

    useEditorStore.getState().patchScenario({
      objects: scenario.objects.map((object) =>
        object.type === 'boat' && object.sequenceId === firstBoat.sequenceId
          ? { ...object, color: brandAccentColor }
          : object,
      ),
    })
  }, [brandAccentColor, config.theme.usePrimaryForBrandAccents, scenario.objects])
  const hasVisibleBoatLegend =
    scenario.canvas.boatLegendVisible &&
    scenario.objects.some((object) => object.type === 'boat' && object.visible)
  const pdfScaleMm = 297 / scenario.canvas.width
  const pdfPlotHeightMm = scenario.canvas.height * pdfScaleMm
  const pdfPlotTopMm = (210 - pdfPlotHeightMm) / 2
  const pdfWatermarkBottomMm = hasVisibleBoatLegend
    ? Math.max(5, 210 - (pdfPlotTopMm + (scenario.canvas.height - 24) * pdfScaleMm))
    : 5
  const activeTool = useEditorStore((state) => state.activeTool)
  const layoutPreference = useEditorStore((state) => state.layoutPreference)
  const useCompactBranding =
    layoutPreference === 'compact' || (layoutPreference === 'auto' && isCompactViewport)
  const status = useEditorStore((state) => state.status)
  const documentStatus = useEditorStore((state) => state.documentStatus)
  const history = useEditorStore((state) => state.history)
  const future = useEditorStore((state) => state.future)
  const setScenario = useEditorStore((state) => state.setScenario)
  const setStatus = useEditorStore((state) => state.setStatus)
  const setDocumentStatus = useEditorStore((state) => state.setDocumentStatus)
  const setLayoutPreference = useEditorStore((state) => state.setLayoutPreference)
  const setTool = useEditorStore((state) => state.setTool)
  const select = useEditorStore((state) => state.select)
  const updateObjects = useEditorStore((state) => state.updateObjects)
  const deleteSelected = useEditorStore((state) => state.deleteSelected)
  const duplicateSelected = useEditorStore((state) => state.duplicateSelected)
  const undo = useEditorStore((state) => state.undo)
  const redo = useEditorStore((state) => state.redo)
  const selectionKey = selectedIds.join('|')

  useEffect(() => {
    setPlaybackPosition((current) => Math.min(lastPlaybackPosition, Math.max(1, current)))
  }, [lastPlaybackPosition])

  useEffect(() => {
    if (!playerMode || !playbackPlaying || lastPlaybackPosition <= 1) return
    let animationFrame = 0
    let previousTime: number | undefined
    const animate = (time: number) => {
      if (previousTime === undefined) previousTime = time
      const elapsed = time - previousTime
      previousTime = time
      setPlaybackPosition((current) =>
        Math.min(
          lastPlaybackPosition,
          current + (elapsed * playbackSpeed) / PLAYBACK_SEGMENT_DURATION_MS,
        ),
      )
      animationFrame = window.requestAnimationFrame(animate)
    }
    animationFrame = window.requestAnimationFrame(animate)
    return () => window.cancelAnimationFrame(animationFrame)
  }, [lastPlaybackPosition, playbackPlaying, playbackSpeed, playerMode])

  useEffect(() => {
    if (playbackPlaying && playbackPosition >= lastPlaybackPosition) setPlaybackPlaying(false)
  }, [lastPlaybackPosition, playbackPlaying, playbackPosition])

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    localStorage.setItem(themeStorageKey, theme)
  }, [theme, themeStorageKey])

  useEffect(() => {
    const media = window.matchMedia('(max-width: 980px)')
    const update = () => setIsCompactViewport(media.matches)
    update()
    media.addEventListener('change', update)
    return () => media.removeEventListener('change', update)
  }, [])

  useEffect(() => {
    if (config.theme.mode !== 'system') return
    const media = window.matchMedia('(prefers-color-scheme: dark)')
    const update = () => setTheme(media.matches ? 'dark' : 'light')
    update()
    media.addEventListener('change', update)
    return () => media.removeEventListener('change', update)
  }, [config.theme.mode])

  useEffect(() => {
    const previousMode = configuredThemeRef.current
    configuredThemeRef.current = config.theme.mode
    if (previousMode === config.theme.mode) return
    if (config.theme.mode === 'system') return
    setTheme(config.theme.mode)
  }, [config.theme.mode])

  useEffect(() => {
    extensions.onEvent?.({ type: 'editor-ready', path: extensionContext.currentPath })
    // The ready event belongs to this editor mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    try {
      const shared = scenarioFromHash(window.location.hash)
      if (shared) setScenario(shared, 'Opened shared plot')
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Could not open the shared plot')
    }
    // Only decode the initial URL once.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement
      if (target.matches('input, textarea, select, [contenteditable="true"]')) return
      if (playerMode) {
        if (event.code === 'Space') {
          event.preventDefault()
          setPlaybackPlaying((current) => {
            if (!current && playbackPosition >= lastPlaybackPosition) setPlaybackPosition(1)
            return !current
          })
        } else if (event.key === 'ArrowLeft') {
          event.preventDefault()
          setPlaybackPlaying(false)
          setPlaybackPosition(Math.max(1, Math.ceil(playbackPosition) - 1))
        } else if (event.key === 'ArrowRight') {
          event.preventDefault()
          setPlaybackPlaying(false)
          setPlaybackPosition(Math.min(lastPlaybackPosition, Math.floor(playbackPosition) + 1))
        } else if (event.key === 'Escape') {
          setPlaybackPlaying(false)
          setPlayerMode(false)
        }
        return
      }
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
  }, [
    deleteSelected,
    duplicateSelected,
    lastPlaybackPosition,
    playbackPosition,
    playerMode,
    redo,
    scenario.objects,
    selectedIds,
    undo,
    updateObjects,
  ])

  const exportJson = () => {
    downloadBlob(
      serializeScenario(scenario),
      `${sanitizeFilename(scenario.metadata.title)}.sailplot.json`,
      'application/json',
    )
    setDocumentStatus('downloaded')
    setStatus('Exported plot JSON')
  }
  const exportPng = async (transparent = false) => {
    const plotData = canvasRef.current?.exportPng(transparent, 2)
    if (!plotData) return
    try {
      const data = await addExportWatermark(plotData, {
        plotUrl: config.links.qrCode ?? createShareUrl(scenario),
        primaryColor: qrFinderColor,
        analyticsLogoUrl: config.branding.exportWatermarkLogo,
        productLogoUrl: config.branding.exportProductLogo,
        partnerLabel: config.branding.partnerLabel,
      })
      const anchor = document.createElement('a')
      anchor.href = data
      anchor.download = `${sanitizeFilename(scenario.metadata.title)}${transparent ? '-transparent' : ''}.png`
      anchor.click()
      setDocumentStatus('downloaded')
      setStatus('Exported PNG image')
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Could not export PNG image')
    }
  }
  const exportAnimation = async (
    format: AnimationExportFormat,
    onProgress: (progress: number) => void,
  ) => {
    const renderFrame = async (position: number, transparent: boolean) => {
      setExportPlaybackPosition(position)
      await waitForCanvasPaint()
      const plotData = canvasRef.current?.exportPng(transparent, 1)
      if (!plotData) throw new Error('Could not render an animation frame')
      return addExportWatermark(plotData, {
        plotUrl: config.links.qrCode ?? createShareUrl(scenario),
        primaryColor: qrFinderColor,
        analyticsLogoUrl: config.branding.exportWatermarkLogo,
        productLogoUrl: config.branding.exportProductLogo,
        partnerLabel: config.branding.partnerLabel,
      })
    }

    try {
      const blob =
        format === 'mp4'
          ? await createMp4Export({ lastPosition: lastPlaybackPosition, renderFrame, onProgress })
          : await createGifExport({
              lastPosition: lastPlaybackPosition,
              renderFrame,
              onProgress,
              transparent: format === 'gif-transparent',
            })
      const suffix = format === 'gif-transparent' ? '-transparent.gif' : `.${format}`
      downloadBlob(blob, `${sanitizeFilename(scenario.metadata.title)}${suffix}`, blob.type)
      setDocumentStatus('downloaded')
      setStatus(format === 'mp4' ? 'Exported MP4 video' : 'Exported animated GIF')
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Could not export animation')
    } finally {
      setExportPlaybackPosition(undefined)
    }
  }
  const share = async (): Promise<boolean> => {
    const url = createShareUrl(scenario)
    try {
      await navigator.clipboard.writeText(url)
      setStatus('Share link copied')
      return true
    } catch {
      setStatus('Could not share; copy the address from your browser.')
      return false
    }
  }
  const exportPdf = async () => {
    const data = canvasRef.current?.exportPng(false, 2)
    if (!data) return
    try {
      const pdf = await createA4PlotPdf(data, {
        plotUrl: config.links.qrCode ?? createShareUrl(scenario),
        primaryColor: qrFinderColor,
        analyticsLogoUrl: config.branding.exportWatermarkLogo,
        productLogoUrl: config.branding.exportProductLogo,
        partnerLabel: config.branding.partnerLabel,
        productUrl: config.links.app,
        analyticsUrl: config.links.website,
        title: scenario.metadata.title,
        watermarkBottomMm: pdfWatermarkBottomMm,
      })
      await downloadPdfBlob(pdf, `${sanitizeFilename(scenario.metadata.title)}.pdf`)
      setDocumentStatus('downloaded')
      setStatus('Downloaded PDF')
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Could not export PDF')
    }
  }
  const importFile = async (file?: File) => {
    if (!file) return
    if (!file.name.endsWith('.json')) {
      setStatus('Unsupported file type. Choose a plot JSON file.')
      return
    }
    try {
      setScenario(parseScenarioJson(await file.text()), 'Imported plot JSON')
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Could not import this file')
    }
    if (fileInputRef.current) fileInputRef.current.value = ''
  }
  const createCleanPlot = async () => {
    const projects = await listProjects(config.storageNamespace).catch(() => [])
    const currentTitle = useEditorStore.getState().scenario.metadata.title
    const title = nextUntitledPlotTitle(t('Untitled plot'), [
      currentTitle,
      ...projects.map((project) => project.title),
    ])
    setScenario(createEmptyScenario(title), 'Created plot')
    setTool('select')
  }

  const cycleLayoutPreference = () => {
    const automaticLayout = window.matchMedia('(max-width: 980px)').matches ? 'compact' : 'desktop'
    const alternativeLayout = automaticLayout === 'compact' ? 'desktop' : 'compact'
    const nextLayout =
      layoutPreference === 'auto'
        ? alternativeLayout
        : layoutPreference === alternativeLayout
          ? automaticLayout
          : 'auto'
    setLayoutPreference(nextLayout)
  }

  const layoutPreferenceLabel = t(
    layoutPreference === 'auto'
      ? 'Auto layout'
      : layoutPreference === 'compact'
        ? 'Compact layout'
        : 'Desktop layout',
  )

  const enterPlayerMode = () => {
    if (!canPlay) return
    setTool('select')
    select(null)
    setDialog(null)
    setPlaybackPlaying(false)
    setPlaybackPosition(1)
    setPlayerMode(true)
  }

  const exitPlayerMode = () => {
    setPlaybackPlaying(false)
    setPlayerMode(false)
  }

  return (
    <div
      className="app-shell"
      data-layout={layoutPreference}
      data-player-mode={playerMode}
      style={sailPlotThemeVariables(config.theme[theme], config)}
    >
      <header className="topbar">
        {config.ui.headerLogo && (
          <div className="app-title" role="img" aria-label={config.branding.logoAlt}>
            <span className="app-symbol">
              <img
                className="app-logo app-logo--on-light"
                src={config.branding.logo}
                alt=""
                aria-hidden="true"
              />
              <img
                className="app-logo app-logo--on-dark"
                src={config.branding.logoDark}
                alt=""
                aria-hidden="true"
              />
              <img
                className="app-logo app-logo--compact"
                src={config.branding.compactLogo}
                alt=""
                aria-hidden="true"
              />
            </span>
          </div>
        )}
        <div className="topbar-document">
          <h1 className="topbar-document-title">
            <button
              type="button"
              title={t('Rename plot')}
              aria-label={t('Rename plot')}
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
          {config.ui.newPlot && (
            <IconButton
              className="new-plot-button"
              icon={<Plus />}
              label={t('New')}
              onClick={() => void createCleanPlot()}
            />
          )}
          {config.ui.openProjects && (
            <IconButton
              icon={<FolderOpen />}
              label={t('Open projects & templates')}
              onClick={() => setDialog('projects')}
            />
          )}
          {config.ui.export && (
            <IconButton
              icon={<Download />}
              label={t('Export / Share')}
              onClick={() => setDialog('export')}
            />
          )}
        </div>
        <div className="topbar-actions">
          <IconButton
            compact
            icon={<Undo2 />}
            label={t('Undo')}
            disabled={playerMode || !history.length}
            onClick={undo}
          />
          <IconButton
            compact
            icon={<Redo2 />}
            label={t('Redo')}
            disabled={playerMode || !future.length}
            onClick={redo}
          />
          <button
            type="button"
            className="player-mode-toggle"
            aria-label={t(playerMode ? 'Back to editor' : 'Player mode')}
            title={t(playerMode ? 'Back to editor' : 'Player mode')}
            disabled={!playerMode && !canPlay}
            onClick={playerMode ? exitPlayerMode : enterPlayerMode}
          >
            {playerMode ? <span aria-hidden="true">←</span> : <Play aria-hidden="true" />}
            <span>{t(playerMode ? 'Back to editor' : 'Player')}</span>
          </button>
          <IconButton
            compact
            icon={<ZoomIn />}
            label={t('Fit canvas')}
            onClick={() => canvasRef.current?.fitToScreen()}
          />
          {config.ui.help && (
            <IconButton
              compact
              icon={<HelpCircle />}
              label={t('Help')}
              onClick={() => setDialog('help')}
            />
          )}
          <IconButton
            compact
            icon={theme === 'dark' ? <Sun /> : <Moon />}
            label={t(theme === 'dark' ? 'Use light mode' : 'Use dark mode')}
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          />
          <button
            className="layout-cycle-button"
            type="button"
            title={`${t('View')}: ${layoutPreferenceLabel}`}
            aria-label={`${t('View')}: ${layoutPreferenceLabel}`}
            data-layout-preference={layoutPreference}
            onClick={cycleLayoutPreference}
          >
            <View aria-hidden="true" />
          </button>
          {config.localization.languageMode === 'both' && (
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
          )}
          <SailPlotNavigation items={extensions.navigationItems ?? []} context={extensionContext} />
          {extensions.headerActions?.map((HeaderAction, index) => (
            <HeaderAction key={index} {...extensionContext} />
          ))}
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
        {playerMode ? (
          <PlaybackControls
            playing={playbackPlaying}
            position={playbackPosition}
            lastPosition={lastPlaybackPosition}
            speed={playbackSpeed}
            tailsVisible={playbackTailsVisible}
            onPlayingChange={setPlaybackPlaying}
            onPositionChange={setPlaybackPosition}
            onSpeedChange={setPlaybackSpeed}
            onTailsVisibleChange={setPlaybackTailsVisible}
            onExit={exitPlayerMode}
          />
        ) : (
          <>
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
          </>
        )}
      </aside>
      <main className="canvas-area">
        <ScenarioCanvas
          ref={canvasRef}
          branding={
            config.ui.footer && !useCompactBranding ? (
              <CanvasBranding
                onInfo={() => setDialog('help')}
                extensions={extensions}
                extensionContext={extensionContext}
              />
            ) : undefined
          }
          topRightOverlay={
            config.ui.footer && !useCompactBranding ? (
              <CanvasQrCode onOpen={() => setDialog('qr')} />
            ) : undefined
          }
          playbackPosition={exportPlaybackPosition ?? (playerMode ? playbackPosition : undefined)}
          playbackTailsVisible={playbackTailsVisible}
        />
      </main>
      {!playerMode && (
        <aside className="properties-panel">
          <PropertiesPanel
            emptyContent={
              EmptySelectionContent ? <EmptySelectionContent {...extensionContext} /> : undefined
            }
          />
        </aside>
      )}
      {!playerMode && (
        <MobileProperties
          key={selectionKey || 'no-selection'}
          hasSelection={selectedIds.length > 0}
        />
      )}
      {useCompactBranding && (
        <MobileBrandingBar
          onInfo={() => setDialog('help')}
          extensions={extensions}
          extensionContext={extensionContext}
        />
      )}
      <footer className="mobile-toolbar">
        {playerMode ? (
          <PlaybackControls
            compact
            playing={playbackPlaying}
            position={playbackPosition}
            lastPosition={lastPlaybackPosition}
            speed={playbackSpeed}
            tailsVisible={playbackTailsVisible}
            onPlayingChange={setPlaybackPlaying}
            onPositionChange={setPlaybackPosition}
            onSpeedChange={setPlaybackSpeed}
            onTailsVisibleChange={setPlaybackTailsVisible}
            onExit={exitPlayerMode}
          />
        ) : (
          <div className="mobile-toolbar-inner">
            {activeTool !== 'select' && (
              <IconButton
                compact
                className="tool-cancel-button mobile-tool-action-button"
                icon={<X aria-hidden="true" />}
                label={t('Return to Select')}
                onClick={() => setTool('select')}
              />
            )}
            {selectedIds.length > 0 && (
              <IconButton
                compact
                className="tool-cancel-button mobile-tool-action-button"
                icon={<Trash2 aria-hidden="true" />}
                label={t('Delete selection')}
                onClick={deleteSelected}
              />
            )}
            <IconButton
              compact
              className="mobile-tool-action-button mobile-settings-button"
              icon={<Settings aria-hidden="true" />}
              label={t('Scene settings')}
              onClick={() => setDialog('settings')}
            />
            <span className="mobile-toolbar-divider" aria-hidden="true" />
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
        )}
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
      {dialog === 'settings' && (
        <Modal title={t('Scene settings')} onClose={() => setDialog(null)}>
          <SceneSettings embedded />
        </Modal>
      )}
      {dialog === 'help' && config.ui.help && (
        <HelpDialog
          onClose={() => setDialog(null)}
          extensions={extensions}
          extensionContext={extensionContext}
        />
      )}
      {dialog === 'export' && (
        <ExportDialog
          onClose={() => setDialog(null)}
          onJson={exportJson}
          onPng={exportPng}
          onAnimation={exportAnimation}
          onShare={share}
          onPdf={exportPdf}
          canAnimate={canPlay}
        />
      )}
      {dialog === 'qr' && <PlotQrDialog onClose={() => setDialog(null)} />}
    </div>
  )
}
