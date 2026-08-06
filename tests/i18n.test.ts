import { describe, expect, it } from 'vitest'
import { translate, translateStatus } from '../src/i18n'

describe('translations', () => {
  it('translates interface labels and interpolates values', () => {
    expect(translate('de', 'Tools')).toBe('Werkzeuge')
    expect(translate('de', '{count} objects · {zoom}%', { count: 3, zoom: 125 })).toBe(
      '3 Objekte · 125 %',
    )
    expect(translate('de', 'Saved in browser')).toBe('Im Browser gespeichert')
    expect(translate('de', 'Downloaded')).toBe('Heruntergeladen')
    expect(translate('de', 'Not saved')).toBe('Nicht gespeichert')
    expect(translate('de', 'Information')).toBe('Info')
    expect(translate('de', 'Add information')).toBe('Information hinzufügen')
    expect(translate('de', 'Wind strength')).toBe('Windstärke')
    expect(translate('de', 'Share')).toBe('Teilen')
  })

  it('keeps English and unknown product data unchanged', () => {
    expect(translate('en', 'Tools')).toBe('Tools')
    expect(translate('en', 'Information')).toBe('Information')
    expect(translate('de', 'Lacustre')).toBe('Lacustre')
  })

  it('localizes dynamic history and deletion status messages', () => {
    expect(translateStatus('de', 'Undid: Added boat')).toBe('Rückgängig: Boot hinzugefügt')
    expect(translateStatus('de', 'Deleted 1 object')).toBe('1 Objekt gelöscht')
    expect(translateStatus('de', 'Deleted 4 objects')).toBe('4 Objekte gelöscht')
  })
})
