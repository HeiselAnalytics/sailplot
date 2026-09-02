import { ArrowDown, ArrowUp, Copy, Lock, Trash2, Unlock } from 'lucide-react'
import { IconButton } from '../../components/ui/IconButton'
import {
  BOAT_CLASSES,
  isSupportBoatClass,
  type BoatClass,
  type BoatObject,
  type CourseEndpointType,
  type FinishLineObject,
  type GateObject,
  type MarkObject,
  type ScenarioObject,
  type StartLineObject,
  type UmpireSignalFlag,
} from '../../types/scenario'
import { normalizeHeading } from '../../lib/scenario'
import {
  boatColorPaletteForBackground,
  COACHBOAT_BLUE,
  JURY_BOAT_GREY,
  UMPIRE_BOAT_GREY,
  type ColorPalette,
} from '../../lib/boatColors'
import { SAILING_FLAG_COLOR_PALETTE } from '../../lib/flagColors'
import { isDarkPlotBackground } from '../../lib/plotTheme'
import { useI18n } from '../../i18n'
import { useEditorStore } from '../../stores/editorStore'
import {
  automaticGennakerAngle,
  automaticBoatHeadsailAngle,
  automaticBoatMainsailAngle,
  automaticSpinnakerAngle,
  BOAT_SHAPES,
  constrainSailAngle,
  isGennakerStalled,
  isSailStalled,
  measurementBoatLengthBasis,
  sailAngleLimits,
  tackForHeading,
} from './boatShapes'
import { RecentColorPicker } from './RecentColorPicker'
import { lineMetrics } from './lineMetrics'

const DISPLAY_BOAT_CLASSES: readonly BoatClass[] = BOAT_CLASSES.flatMap((boatClass) =>
  boatClass === 'Coachboat'
    ? [boatClass, 'Umpire boat']
    : boatClass === 'Umpire boat'
      ? []
      : [boatClass],
)

const UMPIRE_SIGNAL_OPTIONS: ReadonlyArray<{ value: UmpireSignalFlag; label: string }> = [
  { value: 'none', label: 'No flag' },
  { value: 'protest', label: 'Protest flag (Y)' },
  { value: 'red', label: 'Red (penalty)' },
  { value: 'green-white', label: 'Green and white (no penalty)' },
  { value: 'yellow', label: 'Yellow' },
  { value: 'blue', label: 'Blue' },
  { value: 'black', label: 'Black (DSQ)' },
]

function Field({ label, children }: { label: React.ReactNode; children: React.ReactNode }) {
  return (
    <label className="field">
      <span>{label}</span>
      {children}
    </label>
  )
}

function ColorField({
  label,
  value,
  onChange,
  palette,
  paletteLabel,
  allowTransparent,
}: {
  label: string
  value: string
  onChange: (color: string) => void
  palette?: ColorPalette
  paletteLabel?: string
  allowTransparent?: boolean
}) {
  return (
    <div className="field">
      <span>{label}</span>
      <RecentColorPicker
        label={label}
        value={value}
        onChange={onChange}
        palette={palette}
        paletteLabel={paletteLabel}
        allowTransparent={allowTransparent}
      />
    </div>
  )
}

function BooleanSegmentField({
  label,
  checked,
  checkedLabel,
  uncheckedLabel,
  onChange,
}: {
  label: string
  checked: boolean
  checkedLabel: string
  uncheckedLabel: string
  onChange: (checked: boolean) => void
}) {
  return (
    <div className="field">
      <span>{label}</span>
      <div className="property-segmented-control" role="group" aria-label={label}>
        <button
          type="button"
          className={checked ? 'is-active' : ''}
          aria-pressed={checked}
          onClick={() => onChange(true)}
        >
          {checkedLabel}
        </button>
        <button
          type="button"
          className={!checked ? 'is-active' : ''}
          aria-pressed={!checked}
          onClick={() => onChange(false)}
        >
          {uncheckedLabel}
        </button>
      </div>
    </div>
  )
}

function BoatOverlapField({
  value,
  onChange,
}: {
  value: BoatObject['overlapIndicator']
  onChange: (value: BoatObject['overlapIndicator']) => void
}) {
  const { t } = useI18n()
  const options: Array<{ value: BoatObject['overlapIndicator']; label: string }> = [
    { value: 'port', label: 'Port' },
    { value: 'none', label: 'None' },
    { value: 'starboard', label: 'Starboard' },
  ]
  return (
    <div className="field">
      <span>{t('Overlap line')}</span>
      <div
        className="property-segmented-control property-segmented-control--three"
        role="group"
        aria-label={t('Overlap line')}
      >
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            className={value === option.value ? 'is-active' : ''}
            aria-pressed={value === option.value}
            onClick={() => onChange(option.value)}
          >
            {t(option.label)}
          </button>
        ))}
      </div>
    </div>
  )
}

function LayerOrderActions({
  onForward,
  onBackward,
}: {
  onForward: () => void
  onBackward: () => void
}) {
  const { t } = useI18n()
  return (
    <>
      <h3 className="action-grid__heading">{t('Layer order')}</h3>
      <div className="action-grid__layer">
        <IconButton icon={<ArrowUp />} label={t('Forward')} onClick={onForward} />
        <IconButton icon={<ArrowDown />} label={t('Backward')} onClick={onBackward} />
      </div>
    </>
  )
}

const numeric = (value: string, fallback = 0) =>
  Number.isFinite(Number(value)) ? Number(value) : fallback

const sailValue = (value: string, min: number, max: number) =>
  Math.min(max, Math.max(min, numeric(value)))
const rounded = (value: number) => Math.round(value * 10) / 10

function SailAngleField({
  label,
  value,
  min,
  max,
  luffing,
  onChange,
}: {
  label: string
  value: number
  min: number
  max: number
  luffing: boolean
  onChange: (value: number) => void
}) {
  const { t } = useI18n()
  return (
    <Field
      label={
        <span className="sail-angle-label">
          <span>{label}</span>
          {luffing && <span className="sail-status">{t('Luffing')}</span>}
        </span>
      }
    >
      <div className="angle-control">
        <input
          type="range"
          min={min}
          max={max}
          step="1"
          value={value}
          aria-label={t('{label} slider', { label })}
          onChange={(event) => onChange(sailValue(event.target.value, min, max))}
        />
        <input
          type="number"
          min={min}
          max={max}
          step="1"
          value={rounded(value)}
          aria-label={t('{label} degrees', { label })}
          onChange={(event) => onChange(sailValue(event.target.value, min, max))}
        />
      </div>
    </Field>
  )
}

function BoatFields({
  object,
  update,
}: {
  object: BoatObject
  update: (patch: Partial<BoatObject>) => void
}) {
  const { t } = useI18n()
  const environment = useEditorStore((state) => state.scenario.environment)
  const plotObjects = useEditorStore((state) => state.scenario.objects)
  const plotBackground = useEditorStore((state) => state.scenario.canvas.background)
  const brandAccentColor = useEditorStore((state) => state.brandAccentColor)
  const hullPalette = boatColorPaletteForBackground(plotBackground, brandAccentColor)
  const profile = BOAT_SHAPES[object.boatClass]
  const hasMainsail = Boolean(profile.mast && profile.mainsailSize)
  const hasJib = Boolean(profile.jibTack && profile.jibSize)
  const hasGenoa = Boolean(profile.jibTack && profile.genoaSize)
  const hasSpinnaker = Boolean(profile.mast && profile.spinnakerSize)
  const hasGennaker = Boolean(profile.gennakerTack && profile.gennakerSize)
  const supportsUmpireFlags = object.boatClass === 'Coachboat' || object.boatClass === 'Umpire boat'
  const plotBoatColors = new Map<string, { color: string; labels: Set<string> }>()
  for (const candidate of plotObjects) {
    if (candidate.type !== 'boat' || isSupportBoatClass(candidate.boatClass)) continue
    const key = candidate.color.toUpperCase()
    const label = [t(candidate.boatClass), candidate.sailNumber || candidate.name]
      .filter(Boolean)
      .join(' · ')
    const existing = plotBoatColors.get(key)
    if (existing) existing.labels.add(label)
    else plotBoatColors.set(key, { color: candidate.color, labels: new Set([label]) })
  }
  if (object.boatFlagColor && !plotBoatColors.has(object.boatFlagColor.toUpperCase())) {
    plotBoatColors.set(object.boatFlagColor.toUpperCase(), {
      color: object.boatFlagColor,
      labels: new Set([t('Stored boat color')]),
    })
  }
  const downwindSailVisible = object.spinnakerVisible || object.gennakerVisible
  const angleLimits = sailAngleLimits(object.heading, environment.windDirection, object.tack)
  const automaticMain = automaticBoatMainsailAngle(
    object.boatClass,
    object.heading,
    environment.windDirection,
    environment.laylineAngle,
    downwindSailVisible ? profile.mainsailSpinMaxAngle : profile.mainsailMaxAngle,
    object.tack,
  )
  const automaticJib = automaticBoatHeadsailAngle(
    object.boatClass,
    object.heading,
    environment.windDirection,
    environment.laylineAngle,
    downwindSailVisible ? profile.jibSpinMaxAngle : profile.jibMaxAngle,
    object.tack,
  )
  const automaticSpinnaker = automaticSpinnakerAngle(
    object.heading,
    environment.windDirection,
    object.tack,
  )
  const automaticGennaker = automaticGennakerAngle(
    object.heading,
    environment.windDirection,
    object.tack,
  )
  const mainsailAngle = constrainSailAngle(
    object.sailMode === 'automatic' ? automaticMain + object.mainsailTrim : object.sailAngle,
    object.heading,
    environment.windDirection,
    object.tack,
  )
  const jibAngle = constrainSailAngle(
    automaticJib + object.jibTrim,
    object.heading,
    environment.windDirection,
    object.tack,
  )
  const spinnakerAngle = constrainSailAngle(
    automaticSpinnaker + object.spinnakerTrim,
    object.heading,
    environment.windDirection,
    object.tack,
  )
  const gennakerAngle = constrainSailAngle(
    automaticGennaker + object.gennakerTrim,
    object.heading,
    environment.windDirection,
    object.tack,
  )

  return (
    <>
      <Field label={t('Boat class')}>
        <select
          value={object.boatClass}
          onChange={(event) => update({ boatClass: event.target.value as BoatObject['boatClass'] })}
        >
          {DISPLAY_BOAT_CLASSES.map((boatClass) => (
            <option key={boatClass} value={boatClass}>
              {t(boatClass)}
            </option>
          ))}
        </select>
      </Field>
      <div className="field-row">
        <Field label={t('Name')}>
          <input value={object.name} onChange={(event) => update({ name: event.target.value })} />
        </Field>
        <Field label={t('Sail no.')}>
          <input
            value={object.sailNumber}
            onChange={(event) => update({ sailNumber: event.target.value })}
          />
        </Field>
      </div>
      <Field label={`${t('Heading')} · ${Math.round(object.heading)}°`}>
        <input
          type="range"
          min="0"
          max="359"
          step="1"
          value={object.heading}
          aria-label={t('Heading slider')}
          onChange={(event) => {
            const heading = normalizeHeading(numeric(event.target.value))
            update({
              heading,
              rotation: heading,
              tack: tackForHeading(heading, environment.windDirection, object.tack),
            })
          }}
        />
      </Field>
      <BoatOverlapField
        value={object.overlapIndicator}
        onChange={(overlapIndicator) => update({ overlapIndicator })}
      />
      {object.boatClass === 'Coachboat' ||
      object.boatClass === 'Jury boat' ||
      object.boatClass === 'Umpire boat' ? (
        <div className="field">
          <span>{t('Hull color')}</span>
          <div className="fixed-color-display" aria-label={t('Fixed support boat hull color')}>
            <span
              className="color-picker-preview"
              style={{
                backgroundColor:
                  object.boatClass === 'Coachboat' ? COACHBOAT_BLUE : UMPIRE_BOAT_GREY,
              }}
            />
            <span className="color-picker-value">
              {object.boatClass === 'Coachboat'
                ? COACHBOAT_BLUE
                : object.boatClass === 'Jury boat'
                  ? JURY_BOAT_GREY
                  : UMPIRE_BOAT_GREY}
            </span>
            <span className="fixed-color-note">{t('Fixed')}</span>
          </div>
        </div>
      ) : (
        <ColorField
          label={t('Hull color')}
          value={object.color}
          onChange={(color) => update({ color })}
          palette={hullPalette}
          paletteLabel={
            isDarkPlotBackground(plotBackground)
              ? 'Heisel dark sailing palette'
              : 'Heisel sailing palette'
          }
        />
      )}
      {supportsUmpireFlags && (
        <section className="property-section" aria-labelledby={`umpire-flags-${object.id}`}>
          <h3 id={`umpire-flags-${object.id}`} className="property-section-title">
            {t('Umpire flags')}
          </h3>
          <Field label={t('Boat identification flag')}>
            <select
              value={object.boatFlagColor ?? ''}
              onChange={(event) => update({ boatFlagColor: event.target.value || null })}
            >
              <option value="">{t('No flag')}</option>
              {[...plotBoatColors.values()].map(({ color, labels }) => (
                <option key={color.toUpperCase()} value={color}>
                  {[...labels].join(' / ')} · {color.toUpperCase()}
                </option>
              ))}
            </select>
          </Field>
          <Field label={t('Umpire signal')}>
            <select
              value={object.umpireSignalFlag}
              onChange={(event) =>
                update({ umpireSignalFlag: event.target.value as UmpireSignalFlag })
              }
            >
              {UMPIRE_SIGNAL_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {t(option.label)}
                </option>
              ))}
            </select>
          </Field>
        </section>
      )}
      <section className="property-section" aria-labelledby={`sails-${object.id}`}>
        <h3 id={`sails-${object.id}`} className="property-section-title">
          {t('Sails')}
        </h3>
        <div className="check-grid sail-toggle-grid">
          {hasMainsail && (
            <label>
              <input
                type="checkbox"
                checked={object.mainsailVisible}
                onChange={(event) => update({ mainsailVisible: event.target.checked })}
              />{' '}
              {t('Mainsail')}
            </label>
          )}
          {hasJib && (
            <label>
              <input
                type="checkbox"
                checked={object.jibVisible}
                onChange={(event) =>
                  update({
                    jibVisible: event.target.checked,
                    genoaVisible: event.target.checked ? false : object.genoaVisible,
                  })
                }
              />{' '}
              {t('Jib')}
            </label>
          )}
          {hasGenoa && (
            <label>
              <input
                type="checkbox"
                checked={object.genoaVisible}
                onChange={(event) =>
                  update({
                    genoaVisible: event.target.checked,
                    jibVisible: event.target.checked ? false : object.jibVisible,
                  })
                }
              />{' '}
              {t('Genoa')}
            </label>
          )}
          {hasSpinnaker && (
            <label>
              <input
                type="checkbox"
                checked={object.spinnakerVisible}
                onChange={(event) =>
                  update({
                    spinnakerVisible: event.target.checked,
                    gennakerVisible: event.target.checked ? false : object.gennakerVisible,
                  })
                }
              />{' '}
              {t('Spinnaker')}
            </label>
          )}
          {hasGennaker && (
            <label>
              <input
                type="checkbox"
                checked={object.gennakerVisible}
                onChange={(event) =>
                  update({
                    gennakerVisible: event.target.checked,
                    spinnakerVisible: event.target.checked ? false : object.spinnakerVisible,
                  })
                }
              />{' '}
              {t('Gennaker')}
            </label>
          )}
        </div>
        {!hasMainsail && !hasJib && !hasGenoa && !hasSpinnaker && !hasGennaker && (
          <p className="inline-empty">{t('No sails for this boat class.')}</p>
        )}
        {hasMainsail && (
          <Field label={t('Positioning')}>
            <select
              value={object.sailMode}
              onChange={(event) => {
                const sailMode = event.target.value as BoatObject['sailMode']
                update(
                  sailMode === 'manual'
                    ? { sailMode, sailAngle: mainsailAngle, mainsailTrim: 0 }
                    : { sailMode, mainsailTrim: 0 },
                )
              }}
            >
              <option value="automatic">{t('Automatic with trim')}</option>
              <option value="manual">{t('Manual primary sail angle')}</option>
            </select>
          </Field>
        )}
        {object.mainsailVisible &&
          hasMainsail &&
          (object.sailMode === 'manual' ? (
            <SailAngleField
              label={`${t('Mainsail')} · ${rounded(mainsailAngle)}°`}
              value={mainsailAngle}
              min={angleLimits.min}
              max={angleLimits.max}
              luffing={isSailStalled(object.heading, environment.windDirection, mainsailAngle)}
              onChange={(sailAngle) => update({ sailAngle })}
            />
          ) : (
            <SailAngleField
              label={`${t('Mainsail')} · ${rounded(mainsailAngle)}°`}
              value={mainsailAngle}
              min={angleLimits.min}
              max={angleLimits.max}
              luffing={isSailStalled(object.heading, environment.windDirection, mainsailAngle)}
              onChange={(angle) => update({ mainsailTrim: angle - automaticMain })}
            />
          ))}
        {object.jibVisible && hasJib && (
          <SailAngleField
            label={`${t('Jib')} · ${rounded(jibAngle)}°`}
            value={jibAngle}
            min={angleLimits.min}
            max={angleLimits.max}
            luffing={isSailStalled(object.heading, environment.windDirection, jibAngle)}
            onChange={(angle) => update({ jibTrim: angle - automaticJib })}
          />
        )}
        {object.genoaVisible && hasGenoa && (
          <SailAngleField
            label={`${t('Genoa')} · ${rounded(jibAngle)}°`}
            value={jibAngle}
            min={angleLimits.min}
            max={angleLimits.max}
            luffing={isSailStalled(object.heading, environment.windDirection, jibAngle)}
            onChange={(angle) => update({ jibTrim: angle - automaticJib })}
          />
        )}
        {object.spinnakerVisible && hasSpinnaker && (
          <SailAngleField
            label={`${t('Spinnaker')} · ${rounded(spinnakerAngle)}°`}
            value={spinnakerAngle}
            min={angleLimits.min}
            max={angleLimits.max}
            luffing={isSailStalled(object.heading, environment.windDirection, spinnakerAngle)}
            onChange={(angle) => update({ spinnakerTrim: angle - automaticSpinnaker })}
          />
        )}
        {object.gennakerVisible && hasGennaker && (
          <SailAngleField
            label={`${t('Gennaker')} · ${rounded(gennakerAngle)}°`}
            value={gennakerAngle}
            min={angleLimits.min}
            max={angleLimits.max}
            luffing={isGennakerStalled(object.heading, environment.windDirection, gennakerAngle)}
            onChange={(angle) => update({ gennakerTrim: angle - automaticGennaker })}
          />
        )}
      </section>
    </>
  )
}

function MarkFields({
  object,
  update,
}: {
  object: MarkObject
  update: (patch: Partial<MarkObject>) => void
}) {
  const { t, language } = useI18n()
  const scenario = useEditorStore((state) => state.scenario)
  const zoneBasis = measurementBoatLengthBasis(
    scenario.objects,
    scenario.environment.measurementBoatClass,
  )
  const hullLengthFormat = new Intl.NumberFormat(language === 'de' ? 'de-CH' : 'en', {
    maximumFractionDigits: 2,
  })
  const orientation = !object.laylinesVisible ? 'neutral' : object.downwind ? 'leeward' : 'windward'
  const orientations = [
    { value: 'windward', label: t('Windward') },
    { value: 'neutral', label: t('Neutral') },
    { value: 'leeward', label: t('Leeward') },
  ] as const

  return (
    <>
      <div className="field">
        <span>{t('Mark orientation')}</span>
        <div
          className="property-segmented-control property-segmented-control--three"
          role="group"
          aria-label={t('Mark orientation')}
        >
          {orientations.map((option) => (
            <button
              key={option.value}
              type="button"
              className={orientation === option.value ? 'is-active' : ''}
              aria-pressed={orientation === option.value}
              aria-label={option.value === 'neutral' ? t('Neutral without laylines') : option.label}
              onClick={() =>
                update(
                  option.value === 'neutral'
                    ? { downwind: false, laylinesVisible: false }
                    : {
                        downwind: option.value === 'leeward',
                        laylinesVisible: true,
                      },
                )
              }
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>
      <BooleanSegmentField
        label={t('Zone')}
        checked={object.zoneVisible}
        checkedLabel={t('Show zone')}
        uncheckedLabel={t('Hide zone')}
        onChange={(zoneVisible) => update({ zoneVisible })}
      />
      <Field label={t('Mark number')}>
        <input
          type="text"
          inputMode="text"
          autoCapitalize="none"
          autoCorrect="off"
          maxLength={6}
          pattern="[1-9][0-9]*[A-Za-z]?"
          value={object.markNumber}
          onChange={(event) => {
            const markNumber = event.target.value.trim().toLowerCase()
            if (/^[1-9]\d*[a-z]?$/.test(markNumber)) update({ markNumber })
          }}
        />
      </Field>
      <Field label={t('Shape')}>
        <select
          value={object.shape}
          onChange={(event) => update({ shape: event.target.value as MarkObject['shape'] })}
        >
          <option value="round">{t('Round buoy')}</option>
          <option value="cylindrical">{t('Cylindrical buoy')}</option>
          <option value="inflatable">{t('Inflatable buoy')}</option>
          <option value="flag">{t('Flag buoy')}</option>
          <option value="gate">{t('Gate mark')}</option>
        </select>
      </Field>
      <div className="field-row">
        <Field label={t('Zone radius')}>
          <div className="input-with-unit">
            <input
              aria-label={t('Zone radius in boat lengths')}
              type="number"
              min="0.5"
              max="20"
              step="0.5"
              value={object.zoneRadius}
              onChange={(event) =>
                update({
                  zoneRadius: numeric(event.target.value, 3),
                  zoneRadiusUnit: 'boat-lengths',
                })
              }
            />
            <span aria-hidden="true">BL</span>
          </div>
        </Field>
        <ColorField
          label={t('Mark color')}
          value={object.color}
          onChange={(color) => update({ color })}
        />
      </div>
      <p className="field-help">
        {t(
          scenario.environment.measurementBoatClass
            ? 'Selected basis'
            : zoneBasis.usesDefault
              ? 'Default basis'
              : 'Longest class',
        )}
        : {t(zoneBasis.boatClass)} ({hullLengthFormat.format(zoneBasis.hullLength / 10)} m).
      </p>
    </>
  )
}

const courseEndpointOptions: Array<{ value: CourseEndpointType; label: string }> = [
  { value: 'committee-boat', label: 'Committee boat' },
  { value: 'committee-boat-reversed', label: 'Committee boat (reversed)' },
  { value: 'buoy', label: 'Buoy' },
  { value: 'flag', label: 'Flag' },
  { value: 'coach-boat', label: 'Coachboat' },
  { value: 'coach-boat-reversed', label: 'Coachboat (reversed)' },
]

function GateFields({
  object,
  update,
}: {
  object: GateObject
  update: (patch: Partial<GateObject>) => void
}) {
  const { t } = useI18n()
  return (
    <>
      <div className="field-row">
        <Field label={t('Zone radius')}>
          <div className="input-with-unit">
            <input
              aria-label={t('Zone radius in boat lengths')}
              type="number"
              min="0.5"
              max="20"
              step="0.5"
              value={object.zoneRadius}
              onChange={(event) =>
                update({
                  zoneRadius: numeric(event.target.value, 3),
                  zoneRadiusUnit: 'boat-lengths',
                })
              }
            />
            <span aria-hidden="true">BL</span>
          </div>
        </Field>
        <ColorField
          label={t('Mark color')}
          value={object.color}
          onChange={(color) => update({ color })}
        />
      </div>
      <BooleanSegmentField
        label={t('Zone')}
        checked={object.zoneVisible}
        checkedLabel={t('Show zone')}
        uncheckedLabel={t('Hide zone')}
        onChange={(zoneVisible) => update({ zoneVisible })}
      />
    </>
  )
}

function CourseLineFields({
  object,
  update,
}: {
  object: StartLineObject | FinishLineObject
  update: (patch: Partial<StartLineObject | FinishLineObject>) => void
}) {
  const { t } = useI18n()
  const isFinishLine = object.type === 'finish-line'
  const endpointSelect = (
    label: string,
    value: CourseEndpointType,
    field: 'startEndType' | 'pinEndType',
    flagColor: string,
    colorField: 'startEndFlagColor' | 'pinEndFlagColor',
  ) => (
    <>
      <Field label={t(label)}>
        <select
          value={value}
          onChange={(event) => update({ [field]: event.target.value as CourseEndpointType })}
        >
          {courseEndpointOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {t(option.label)}
            </option>
          ))}
        </select>
      </Field>
      {value === 'flag' && (
        <ColorField
          label={t('{label} flag color', { label: t(label) })}
          value={flagColor}
          onChange={(color) => update({ [colorField]: color })}
          palette={SAILING_FLAG_COLOR_PALETTE}
          paletteLabel="Sailing signal flag palette"
        />
      )}
    </>
  )
  return (
    <>
      <BooleanSegmentField
        label={t('Laylines')}
        checked={object.laylinesVisible}
        checkedLabel={t('On')}
        uncheckedLabel={t('Off')}
        onChange={(laylinesVisible) => update({ laylinesVisible })}
      />
      <BooleanSegmentField
        label={t('Layline area')}
        checked={object.laylineAreaVisible}
        checkedLabel={t('On')}
        uncheckedLabel={t('Off')}
        onChange={(laylineAreaVisible) => update({ laylineAreaVisible })}
      />
      {object.laylineAreaVisible && (
        <ColorField
          label={t('Layline area color')}
          value={object.laylineAreaColor}
          onChange={(laylineAreaColor) => update({ laylineAreaColor })}
        />
      )}
      {endpointSelect(
        isFinishLine ? 'Finish-boat end' : 'Start-boat end',
        object.startEndType,
        'startEndType',
        object.startEndFlagColor,
        'startEndFlagColor',
      )}
      {endpointSelect(
        isFinishLine ? 'Outer end' : 'Pin end',
        object.pinEndType,
        'pinEndType',
        object.pinEndFlagColor,
        'pinEndFlagColor',
      )}
    </>
  )
}

export function PropertiesPanel({ emptyContent }: { emptyContent?: React.ReactNode } = {}) {
  const { language, t } = useI18n()
  const scenario = useEditorStore((state) => state.scenario)
  const dragPreview = useEditorStore((state) => state.dragPreview)
  const selectedIds = useEditorStore((state) => state.selectedIds)
  const updateObject = useEditorStore((state) => state.updateObject)
  const updateObjects = useEditorStore((state) => state.updateObjects)
  const duplicateSelected = useEditorStore((state) => state.duplicateSelected)
  const deleteSelected = useEditorStore((state) => state.deleteSelected)
  const setLayer = useEditorStore((state) => state.setLayer)
  const brandAccentColor = useEditorStore((state) => state.brandAccentColor)
  const selected = scenario.objects
    .filter((object) => selectedIds.includes(object.id))
    .map((object) =>
      dragPreview?.id === object.id
        ? ({ ...object, ...dragPreview.patch } as ScenarioObject)
        : object,
    )

  if (!selected.length) {
    return (
      <div className={`empty-state${emptyContent ? ' empty-state--with-content' : ''}`}>
        <div className="empty-state-message">
          <MouseHint />
          <h2>{t('No selection')}</h2>
          <p>{t('Select an object on the canvas to edit its properties.')}</p>
        </div>
        {emptyContent && <div className="empty-state-extension">{emptyContent}</div>}
      </div>
    )
  }
  if (selected.length > 1) {
    const allLocked = selected.every((object) => object.locked)
    return (
      <div className="properties-content">
        <div className="panel-heading">
          <div>
            <span className="eyebrow">{t('Selection')}</span>
            <h2>{t('{count} objects', { count: selected.length })}</h2>
          </div>
        </div>
        <p className="muted">
          {t('Move, duplicate, layer, lock or remove the selection together.')}
        </p>
        <div className="action-grid">
          <IconButton icon={<Copy />} label={t('Duplicate')} onClick={duplicateSelected} />
          <IconButton
            icon={allLocked ? <Unlock /> : <Lock />}
            label={t(allLocked ? 'Unlock' : 'Lock')}
            onClick={() =>
              updateObjects(
                selected.map(({ id }) => ({ id, patch: { locked: !allLocked } })),
                allLocked ? 'Unlocked selection' : 'Locked selection',
              )
            }
          />
          <IconButton
            icon={<Trash2 />}
            label={t('Delete')}
            className="danger action-grid__wide"
            onClick={deleteSelected}
          />
          <LayerOrderActions
            onForward={() => setLayer('forward')}
            onBackward={() => setLayer('backward')}
          />
        </div>
      </div>
    )
  }

  const object = selected[0]
  const typeLabel = {
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
  const update = (patch: Partial<ScenarioObject>) =>
    updateObject(object.id, patch, `Updated ${object.type}`)
  const metrics = lineMetrics(
    object,
    scenario.environment.windDirection,
    measurementBoatLengthBasis(scenario.objects, scenario.environment.measurementBoatClass).length,
  )
  const numberFormat = new Intl.NumberFormat(language === 'de' ? 'de-CH' : 'en', {
    maximumFractionDigits: 1,
  })
  return (
    <div className="properties-content">
      <div className="panel-heading">
        <div>
          <span className="eyebrow">{t('Properties')}</span>
          <h2>
            {object.type === 'boat'
              ? t('Boat')
              : object.type === 'mark'
                ? t('Mark {number}', { number: object.markNumber })
                : t(typeLabel)}
          </h2>
        </div>
        <span className="badge">{language === 'en' ? object.type : t(typeLabel)}</span>
      </div>
      <div className="object-meta" aria-label={t('Object information')}>
        <div>
          <span>X</span>
          <strong>{Math.round(object.x)}</strong>
        </div>
        <div>
          <span>Y</span>
          <strong>{Math.round(object.y)}</strong>
        </div>
        {object.type === 'boat' && (
          <>
            <div>
              <span>{t('Position')}</span>
              <strong>{object.positionNumber}</strong>
            </div>
            <div>
              <span>{t('Tack')}</span>
              <strong>
                {tackForHeading(object.heading, scenario.environment.windDirection, object.tack) ===
                'port'
                  ? t('Port')
                  : t('Starboard')}
              </strong>
            </div>
          </>
        )}
        {metrics && (
          <>
            <div>
              <span>{t('Length')}</span>
              <strong>{numberFormat.format(metrics.lengthBoatLengths)} BL</strong>
            </div>
            <div>
              <span>{t('Angle to wind')}</span>
              <strong>{Math.round(metrics.angleToWind)}°</strong>
            </div>
          </>
        )}
      </div>
      {object.type === 'boat' && (
        <BoatFields object={object} update={(patch) => update(patch as Partial<ScenarioObject>)} />
      )}
      {object.type === 'mark' && (
        <MarkFields object={object} update={(patch) => update(patch as Partial<ScenarioObject>)} />
      )}
      {object.type === 'gate' && (
        <GateFields object={object} update={(patch) => update(patch as Partial<ScenarioObject>)} />
      )}
      {object.type === 'start-line' && (
        <CourseLineFields
          object={object}
          update={(patch) => update(patch as Partial<ScenarioObject>)}
        />
      )}
      {object.type === 'finish-line' && (
        <CourseLineFields
          object={object}
          update={(patch) => update(patch as Partial<ScenarioObject>)}
        />
      )}
      {object.type === 'text' && (
        <>
          <Field label={t('Text')}>
            <textarea
              value={object.text}
              onChange={(event) => update({ text: event.target.value })}
            />
          </Field>
          <div className="field-row">
            <Field label={t('Font size')}>
              <input
                type="number"
                min="8"
                value={object.fontSize}
                onChange={(event) => update({ fontSize: numeric(event.target.value, 14) })}
              />
            </Field>
            <ColorField
              label={t('Text color')}
              value={object.color}
              onChange={(color) => update({ color })}
            />
          </div>
        </>
      )}
      {(object.type === 'line' ||
        object.type === 'arrow' ||
        object.type === 'freehand' ||
        object.type === 'rectangle' ||
        object.type === 'circle') && (
        <div className="field-row">
          <Field label={t('Stroke width')}>
            <input
              type="number"
              min="1"
              max="20"
              value={object.strokeWidth}
              onChange={(event) => update({ strokeWidth: numeric(event.target.value, 1) })}
            />
          </Field>
          <ColorField
            label={t('Stroke color')}
            value={object.stroke}
            onChange={(stroke) => update({ stroke })}
          />
        </div>
      )}
      {(object.type === 'rectangle' || object.type === 'circle') && (
        <ColorField
          label={t('Fill color')}
          value={object.fill}
          onChange={(fill) => update({ fill })}
          palette={boatColorPaletteForBackground(scenario.canvas.background, brandAccentColor)}
          paletteLabel={
            isDarkPlotBackground(scenario.canvas.background)
              ? 'Heisel dark sailing palette'
              : 'Heisel sailing palette'
          }
          allowTransparent
        />
      )}
      <Field label={t('Opacity')}>
        <input
          type="range"
          min="0.1"
          max="1"
          step="0.05"
          value={object.opacity}
          onChange={(event) => update({ opacity: numeric(event.target.value, 1) })}
        />
      </Field>
      <div className="action-grid">
        <IconButton icon={<Copy />} label={t('Duplicate')} onClick={duplicateSelected} />
        <IconButton
          icon={object.locked ? <Unlock /> : <Lock />}
          label={t(object.locked ? 'Unlock' : 'Lock')}
          onClick={() => update({ locked: !object.locked })}
        />
        <IconButton
          icon={<Trash2 />}
          label={t('Delete')}
          className="danger action-grid__wide"
          onClick={deleteSelected}
        />
        <LayerOrderActions
          onForward={() => setLayer('forward')}
          onBackward={() => setLayer('backward')}
        />
      </div>
    </div>
  )
}

function MouseHint() {
  return (
    <div className="empty-illustration" aria-hidden="true">
      <span />
    </div>
  )
}
