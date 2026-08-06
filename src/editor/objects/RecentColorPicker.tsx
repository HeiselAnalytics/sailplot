import { ChevronDown } from 'lucide-react'
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { namespacedStorageKey } from '../../config/storage'
import { BOAT_COLOR_PALETTE, type ColorPalette } from '../../lib/boatColors'
import { useI18n } from '../../i18n'
import { useSailPlotConfig } from '../../providers/SailPlotConfigProvider'
import { mergeRecentColors } from './recentColors'

const LEGACY_STORAGE_KEY = 'sailing-scenario-editor:recent-colors'
const EMPTY_COLORS: string[] = []

const cachedColors = new Map<string, string[]>()
const listeners = new Map<string, Set<() => void>>()

const loadColors = (storageKey: string) => {
  const cached = cachedColors.get(storageKey)
  if (cached) return cached
  if (typeof window === 'undefined') return EMPTY_COLORS
  try {
    const stored = JSON.parse(window.localStorage.getItem(storageKey) ?? '[]')
    const colors = mergeRecentColors([], Array.isArray(stored) ? stored : [])
    cachedColors.set(storageKey, colors)
    return colors
  } catch {
    cachedColors.set(storageKey, EMPTY_COLORS)
    return EMPTY_COLORS
  }
}

const subscribe = (storageKey: string, listener: () => void) => {
  const keyListeners = listeners.get(storageKey) ?? new Set<() => void>()
  keyListeners.add(listener)
  listeners.set(storageKey, keyListeners)
  return () => keyListeners.delete(listener)
}

const rememberColors = (storageKey: string, ...colors: string[]) => {
  const nextColors = mergeRecentColors(colors, loadColors(storageKey))
  cachedColors.set(storageKey, nextColors)
  try {
    window.localStorage.setItem(storageKey, JSON.stringify(nextColors))
  } catch {
    // The picker still works when storage is unavailable (for example, in private browsing).
  }
  listeners.get(storageKey)?.forEach((listener) => listener())
}

interface RecentColorPickerProps {
  label: string
  value: string
  onChange: (color: string) => void
  palette?: ColorPalette
  paletteLabel?: string
  allowTransparent?: boolean
}

function ColorSwatch({
  color,
  name,
  source,
  selected,
  onClick,
}: {
  color: string
  name?: string
  source: 'palette' | 'recent'
  selected: boolean
  onClick: () => void
}) {
  const { t } = useI18n()
  const description = name ? `${t(name)} ${color}` : color
  return (
    <button
      type="button"
      className="color-swatch"
      aria-label={t('Use {source} color {description}', {
        source: t(source),
        description,
      })}
      aria-pressed={selected}
      title={description}
      onClick={onClick}
    >
      <span style={{ backgroundColor: color }} />
    </button>
  )
}

export function RecentColorPicker({
  label,
  value,
  onChange,
  palette = BOAT_COLOR_PALETTE,
  paletteLabel = 'Heisel sailing palette',
  allowTransparent = false,
}: RecentColorPickerProps) {
  const { t } = useI18n()
  const { storageNamespace } = useSailPlotConfig()
  const storageKey = namespacedStorageKey(storageNamespace, LEGACY_STORAGE_KEY)
  const subscribeToColors = useCallback(
    (listener: () => void) => subscribe(storageKey, listener),
    [storageKey],
  )
  const getColors = useCallback(() => loadColors(storageKey), [storageKey])
  const isTransparent = value.toLowerCase() === 'transparent'
  const recentColors = useSyncExternalStore(subscribeToColors, getColors, () => EMPTY_COLORS)
  const displayedColors = mergeRecentColors([value], recentColors)
  const [open, setOpen] = useState(false)
  const pickerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const closeOutside = (event: PointerEvent) => {
      if (!pickerRef.current?.contains(event.target as Node)) setOpen(false)
    }
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('pointerdown', closeOutside)
    document.addEventListener('keydown', closeOnEscape)
    return () => {
      document.removeEventListener('pointerdown', closeOutside)
      document.removeEventListener('keydown', closeOnEscape)
    }
  }, [open])

  const chooseColor = (color: string) => {
    rememberColors(storageKey, color, value)
    onChange(color.toLowerCase())
    setOpen(false)
  }

  return (
    <div className="recent-color-picker" ref={pickerRef}>
      <button
        type="button"
        className="color-picker-trigger"
        aria-label={t('Open {label} selector', { label })}
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
      >
        <span
          className={`color-picker-preview${isTransparent ? ' is-transparent' : ''}`}
          style={{ backgroundColor: isTransparent ? undefined : value }}
        />
        <span className="color-picker-value">
          {isTransparent ? t('No fill') : value.toUpperCase()}
        </span>
        <ChevronDown aria-hidden="true" />
      </button>
      {open && (
        <div
          className="color-picker-popover"
          role="dialog"
          aria-label={t('{label} colors', { label })}
        >
          {allowTransparent && (
            <button
              type="button"
              className="transparent-color-option"
              aria-pressed={isTransparent}
              onClick={() => chooseColor('transparent')}
            >
              <span className="color-picker-preview is-transparent" aria-hidden="true" />
              {t('No fill')}
            </button>
          )}
          <div className="color-options">
            <span className="color-options-label">{t('Palette')}</span>
            <div className="color-swatches" aria-label={t(paletteLabel)}>
              {palette.map((color) => (
                <ColorSwatch
                  key={color.value}
                  color={color.value}
                  name={color.name}
                  source="palette"
                  selected={color.value.toLowerCase() === value.toLowerCase()}
                  onClick={() => chooseColor(color.value)}
                />
              ))}
            </div>
          </div>
          <div className="color-options">
            <span className="color-options-label">{t('Recent')}</span>
            <div className="color-swatches" aria-label={t('Recently used colors')}>
              {displayedColors.map((color) => (
                <ColorSwatch
                  key={color}
                  color={color}
                  source="recent"
                  selected={color.toLowerCase() === value.toLowerCase()}
                  onClick={() => chooseColor(color)}
                />
              ))}
            </div>
          </div>
          <label className="color-picker-custom">
            <span>{t('Custom color')}</span>
            <input
              type="color"
              value={/^#[0-9a-f]{6}$/i.test(value) ? value : '#ffaa00'}
              aria-label={t('{label} custom color', { label })}
              onChange={(event) => chooseColor(event.target.value)}
            />
          </label>
        </div>
      )}
    </div>
  )
}
