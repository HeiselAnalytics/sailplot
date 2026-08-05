import { ArrowDown, ArrowUp, Copy, Eye, EyeOff, Lock, Plus, Trash2, Unlock } from 'lucide-react'
import { IconButton } from '../../components/ui/IconButton'
import {
  BOAT_CLASSES,
  type BoatObject,
  type MarkObject,
  type ScenarioObject,
} from '../../types/scenario'
import { normalizeHeading } from '../../lib/scenario'
import { VSR_COACHBOAT_BLUE } from '../../lib/boatColors'
import { useI18n } from '../../i18n'
import { useEditorStore } from '../../stores/editorStore'
import {
  automaticGennakerAngle,
  automaticJibAngle,
  automaticSailAngle,
  automaticSpinnakerAngle,
  BOAT_SHAPES,
  constrainSailAngle,
  isGennakerStalled,
  isCloseHauled,
  isSailStalled,
  longestBoatLengthBasis,
  sailAngleLimits,
  tackForHeading,
} from './boatShapes'
import { RecentColorPicker } from './RecentColorPicker'

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
}: {
  label: string
  value: string
  onChange: (color: string) => void
}) {
  return (
    <div className="field">
      <span>{label}</span>
      <RecentColorPicker label={label} value={value} onChange={onChange} />
    </div>
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
  const profile = BOAT_SHAPES[object.boatClass]
  const hasMainsail = Boolean(profile.mast && profile.mainsailSize)
  const hasJib = Boolean(profile.jibTack && profile.jibSize)
  const hasGenoa = Boolean(profile.jibTack && profile.genoaSize)
  const hasSpinnaker = Boolean(profile.mast && profile.spinnakerSize)
  const hasGennaker = Boolean(profile.gennakerTack && profile.gennakerSize)
  const downwindSailVisible = object.spinnakerVisible || object.gennakerVisible
  const angleLimits = sailAngleLimits(object.heading, environment.windDirection)
  const lacustreCloseHauled =
    object.boatClass === 'Lacustre' &&
    isCloseHauled(object.heading, environment.windDirection, environment.laylineAngle)
  const automaticMain = lacustreCloseHauled
    ? 0
    : automaticSailAngle(
        object.heading,
        environment.windDirection,
        environment.laylineAngle,
        downwindSailVisible ? profile.mainsailSpinMaxAngle : profile.mainsailMaxAngle,
      )
  const automaticJib = lacustreCloseHauled
    ? 0
    : automaticJibAngle(
        object.heading,
        environment.windDirection,
        environment.laylineAngle,
        downwindSailVisible ? profile.jibSpinMaxAngle : profile.jibMaxAngle,
      )
  const automaticSpinnaker = automaticSpinnakerAngle(object.heading, environment.windDirection)
  const automaticGennaker = automaticGennakerAngle(object.heading, environment.windDirection)
  const mainsailAngle = constrainSailAngle(
    object.sailMode === 'automatic' ? automaticMain + object.mainsailTrim : object.sailAngle,
    object.heading,
    environment.windDirection,
  )
  const jibAngle = constrainSailAngle(
    automaticJib + object.jibTrim,
    object.heading,
    environment.windDirection,
  )
  const spinnakerAngle = constrainSailAngle(
    automaticSpinnaker + object.spinnakerTrim,
    object.heading,
    environment.windDirection,
  )
  const gennakerAngle = constrainSailAngle(
    automaticGennaker + object.gennakerTrim,
    object.heading,
    environment.windDirection,
  )

  return (
    <>
      <Field label={t('Boat class')}>
        <select
          value={object.boatClass}
          onChange={(event) => update({ boatClass: event.target.value as BoatObject['boatClass'] })}
        >
          {BOAT_CLASSES.map((boatClass) => (
            <option key={boatClass}>{t(boatClass)}</option>
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
            update({ heading, rotation: heading })
          }}
        />
      </Field>
      {object.boatClass === 'VSR Coachboat' ? (
        <div className="field">
          <span>{t('Hull color')}</span>
          <div className="fixed-color-display" aria-label={t('Fixed VSR Coachboat hull color')}>
            <span
              className="color-picker-preview"
              style={{ backgroundColor: VSR_COACHBOAT_BLUE }}
            />
            <span className="color-picker-value">{VSR_COACHBOAT_BLUE}</span>
            <span className="fixed-color-note">{t('Fixed')}</span>
          </div>
        </div>
      ) : (
        <ColorField label={t('Hull color')} value={object.color} onChange={(color) => update({ color })} />
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
              <option value="manual">{t('Manual mainsail angle')}</option>
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
  const { t } = useI18n()
  const objects = useEditorStore((state) => state.scenario.objects)
  const zoneBasis = longestBoatLengthBasis(objects)

  return (
    <>
      <Field label={t('Mark number')}>
        <input
          type="number"
          min="1"
          step="1"
          value={object.markNumber}
          onChange={(event) =>
            update({ markNumber: Math.max(1, Math.round(numeric(event.target.value, 1))) })
          }
        />
      </Field>
      <Field label={t('Mark type')}>
        <select
          value={object.markType}
          onChange={(event) => update({ markType: event.target.value as MarkObject['markType'] })}
        >
          <option value="racing">{t('Racing mark')}</option>
          <option value="starting">{t('Starting mark')}</option>
          <option value="finish">{t('Finish mark')}</option>
        </select>
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
          <option value="pin">{t('Pin-end mark')}</option>
        </select>
      </Field>
      <div className="field-row">
        <ColorField
          label={t('Mark color')}
          value={object.color}
          onChange={(color) => update({ color })}
        />
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
      </div>
      <p className="field-help">
        {t(zoneBasis.usesDefault ? 'Default basis' : 'Longest class')}: {t(zoneBasis.boatClass)} (
        {zoneBasis.length / 10} m).
      </p>
      <label className="check-row">
        <input
          type="checkbox"
          checked={object.zoneVisible}
          onChange={(event) => update({ zoneVisible: event.target.checked })}
        />{' '}
        {t('Show zone')}
      </label>
      <label className="check-row">
        <input
          type="checkbox"
          role="switch"
          checked={object.downwind}
          onChange={(event) => update({ downwind: event.target.checked })}
        />{' '}
        {t('Downwind mark')}
      </label>
    </>
  )
}

export function PropertiesPanel() {
  const { language, t } = useI18n()
  const scenario = useEditorStore((state) => state.scenario)
  const selectedIds = useEditorStore((state) => state.selectedIds)
  const updateObject = useEditorStore((state) => state.updateObject)
  const updateObjects = useEditorStore((state) => state.updateObjects)
  const duplicateSelected = useEditorStore((state) => state.duplicateSelected)
  const duplicateAsPosition = useEditorStore((state) => state.duplicateAsPosition)
  const deleteSelected = useEditorStore((state) => state.deleteSelected)
  const setLayer = useEditorStore((state) => state.setLayer)
  const selected = scenario.objects.filter((object) => selectedIds.includes(object.id))

  if (!selected.length) {
    return (
      <div className="empty-state">
        <MouseHint />
        <h2>{t('No selection')}</h2>
        <p>{t('Select an object on the canvas to edit its properties.')}</p>
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
        <p className="muted">{t('Move, duplicate, layer, lock or remove the selection together.')}</p>
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
            icon={<ArrowUp />}
            label={t('Bring forward')}
            onClick={() => setLayer('forward')}
          />
          <IconButton
            icon={<ArrowDown />}
            label={t('Send backward')}
            onClick={() => setLayer('backward')}
          />
          <IconButton
            icon={<Trash2 />}
            label={t('Delete')}
            className="danger"
            onClick={deleteSelected}
          />
        </div>
      </div>
    )
  }

  const object = selected[0]
  const typeLabel = {
    boat: 'Boat',
    mark: 'Mark',
    line: 'Line',
    arrow: 'Arrow',
    freehand: 'Freehand',
    text: 'Text',
    rectangle: 'Rectangle',
    circle: 'Circle',
  }[object.type]
  const update = (patch: Partial<ScenarioObject>) =>
    updateObject(object.id, patch, `Updated ${object.type}`)
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
                {tackForHeading(object.heading, scenario.environment.windDirection) === 'port'
                  ? t('Port')
                  : t('Starboard')}
              </strong>
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
      {(object.type === 'line' || object.type === 'arrow' || object.type === 'freehand') && (
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
        {object.type === 'boat' && (
          <IconButton icon={<Plus />} label={t('Add static position')} onClick={duplicateAsPosition} />
        )}
        <IconButton
          icon={object.locked ? <Unlock /> : <Lock />}
          label={t(object.locked ? 'Unlock' : 'Lock')}
          onClick={() => update({ locked: !object.locked })}
        />
        <IconButton
          icon={object.visible ? <EyeOff /> : <Eye />}
          label={t(object.visible ? 'Hide' : 'Show')}
          onClick={() => update({ visible: !object.visible })}
        />
        <IconButton icon={<ArrowUp />} label={t('Bring forward')} onClick={() => setLayer('forward')} />
        <IconButton
          icon={<ArrowDown />}
          label={t('Send backward')}
          onClick={() => setLayer('backward')}
        />
        <IconButton icon={<Trash2 />} label={t('Delete')} className="danger" onClick={deleteSelected} />
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
