/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'

export type Language = 'en' | 'de'
type Variables = Record<string, string | number>

const german: Record<string, string> = {
  'Sailing Scenario Editor': 'Segelszenario-Editor',
  Language: 'Sprache',
  English: 'Englisch',
  German: 'Deutsch',
  Scene: 'Szene',
  'Show grid': 'Raster anzeigen',
  'Snap to grid': 'Am Raster einrasten',
  'Show laylines': 'Laylines anzeigen',
  'Show wind': 'Wind anzeigen',
  'Show zones': 'Zonen anzeigen',
  'Show boat numbers': 'Bootsnummern anzeigen',
  'Grid size': 'Rastergröße',
  'Grid visibility': 'Rastersichtbarkeit',
  'Wind direction': 'Windrichtung',
  'Layline angle': 'Layline-Winkel',
  'Additional information': 'Zusätzliche Informationen',
  'Wind strength (general)': 'Windstärke (allgemein)',
  'Optional, e.g. 12 kn': 'Optional, z. B. 12 kn',
  'Powered by Heisel Analytics': 'Powered by Heisel Analytics',
  'Heisel Analytics links': 'Links von Heisel Analytics',
  Info: 'Info',
  Website: 'Webseite',
  Imprint: 'Impressum',
  'Close dialog': 'Dialog schließen',
  '{label} value': 'Wert für {label}',
  '{label} slider': 'Regler für {label}',
  '{label} degrees': '{label} in Grad',
  Projects: 'Projekte',
  'Empty scenario': 'Leeres Szenario',
  'Start with a clean canvas.': 'Mit einer leeren Zeichenfläche beginnen.',
  'Windward mark': 'Luvmarke',
  'Static Rule 18 discussion example.': 'Statisches Diskussionsbeispiel zu Regel 18.',
  'Start line': 'Startlinie',
  'Boats approaching a start line.': 'Boote bei der Annäherung an eine Startlinie.',
  'Recent local projects': 'Letzte lokale Projekte',
  'No saved projects yet. Create a scenario above.':
    'Noch keine Projekte gespeichert. Oben kann ein Szenario erstellt werden.',
  Duplicate: 'Duplizieren',
  '{title} copy': '{title} – Kopie',
  Delete: 'Löschen',
  'Delete “{title}” from this browser?': '„{title}“ aus diesem Browser löschen?',
  'Scenario details': 'Szenariodetails',
  'Rename scenario': 'Szenario umbenennen',
  'Saved in browser': 'Im Browser gespeichert',
  Downloaded: 'Heruntergeladen',
  'Not saved': 'Nicht gespeichert',
  'Untitled scenario': 'Unbenanntes Szenario',
  Title: 'Titel',
  Description: 'Beschreibung',
  'Rule references': 'Regelverweise',
  'Separate references with commas, for example “RRS 10, RRS 18”.':
    'Regelverweise mit Kommas trennen, zum Beispiel „RRS 10, RRS 18“.',
  Done: 'Fertig',
  'Help & information': 'Hilfe und Informationen',
  Help: 'Hilfe',
  Privacy: 'Datenschutz',
  About: 'Über',
  License: 'Lizenz',
  'Build a static sailing explanation': 'Eine statische Segelerklärung erstellen',
  'Add boats, marks, lines and notes from the tool panel. Select an object to edit its properties. This editor deliberately has no playback or sailing simulation.':
    'Füge Boote, Marken, Linien und Notizen über die Werkzeugleiste hinzu. Wähle ein Objekt aus, um seine Eigenschaften zu bearbeiten. Dieser Editor besitzt bewusst keine Wiedergabe oder Segelsimulation.',
  'The Boat tool stays active: each tap adds the next numbered position to the current boat chain. Choose Select or another tool when the chain is complete.':
    'Das Boot-Werkzeug bleibt aktiv: Jede Berührung fügt der aktuellen Bootskette die nächste nummerierte Position hinzu. Wähle „Auswählen“ oder ein anderes Werkzeug, wenn die Kette vollständig ist.',
  'Mouse and keyboard': 'Maus und Tastatur',
  'Scroll to zoom. Choose Pan or hold Space to move the view. Shift-click adds objects to a selection. Use Delete, arrow keys, ⌘/Ctrl+Z, ⌘/Ctrl+Shift+Z and ⌘/Ctrl+D.':
    'Scrolle zum Zoomen. Wähle „Verschieben“ oder halte die Leertaste gedrückt, um die Ansicht zu bewegen. Umschalt-Klick erweitert die Auswahl. Verwende Löschen, die Pfeiltasten, ⌘/Strg+Z, ⌘/Strg+Umschalt+Z und ⌘/Strg+D.',
  'Touch and stylus': 'Touch und Stift',
  'Tap to select and drag objects to move them. Boats, marks and text can be rotated but keep their size. Drawing tools accept mouse, finger and stylus input.':
    'Tippe zum Auswählen und ziehe Objekte, um sie zu verschieben. Boote, Marken und Text können gedreht werden, behalten aber ihre Größe. Zeichenwerkzeuge unterstützen Maus, Finger und Stift.',
  Sharing: 'Teilen',
  'Share links contain a compressed copy of the complete project in the URL fragment. For large projects, export a JSON file instead.':
    'Freigabelinks enthalten eine komprimierte Kopie des vollständigen Projekts im URL-Fragment. Exportiere bei großen Projekten stattdessen eine JSON-Datei.',
  'Local-first privacy': 'Lokaler Datenschutz',
  'Projects and preferences are stored locally in this browser using IndexedDB. JSON and image exports are created on your device. No project data is uploaded to a server.':
    'Projekte und Einstellungen werden mit IndexedDB lokal in diesem Browser gespeichert. JSON- und Bildexporte entstehen auf deinem Gerät. Es werden keine Projektdaten auf einen Server hochgeladen.',
  'A share link contains the project data itself. Anyone who receives that link can access the scenario embedded in it.':
    'Ein Freigabelink enthält die Projektdaten selbst. Jede Person mit diesem Link kann auf das darin eingebettete Szenario zugreifen.',
  'A new web-based implementation for creating static sailing and racing-rule diagrams. It is inspired by the historical BOATS application but is implemented from scratch and does not use the old application as a runtime dependency.':
    'Eine neue webbasierte Anwendung zum Erstellen statischer Segel- und Regeldiagramme. Sie ist von der historischen BOATS-Anwendung inspiriert, wurde jedoch vollständig neu entwickelt und verwendet die alte Anwendung nicht als Laufzeitabhängigkeit.',
  'Powered by Heisel Analytics.': 'Powered by Heisel Analytics.',
  'GNU General Public License v3': 'GNU General Public License v3',
  'This project is free software distributed under the GNU GPL v3. See the repository’s LICENSE file for the complete terms.':
    'Dieses Projekt ist freie Software unter der GNU GPL v3. Die vollständigen Bedingungen stehen in der LICENSE-Datei des Repositorys.',
  'Export & share': 'Exportieren und teilen',
  'Scenario JSON': 'Szenario-JSON',
  'Editable, validated project file': 'Bearbeitbare, validierte Projektdatei',
  'PNG image · 2×': 'PNG-Bild · 2×',
  'Static image without editor handles': 'Statisches Bild ohne Editor-Griffe',
  'PNG image · 4×': 'PNG-Bild · 4×',
  'High-resolution static image': 'Hochauflösendes statisches Bild',
  'Transparent PNG · 2×': 'Transparentes PNG · 2×',
  'Canvas objects without a background': 'Objekte der Zeichenfläche ohne Hintergrund',
  'Share link': 'Freigabelink',
  '{count} characters · project stays in the URL':
    '{count} Zeichen · das Projekt bleibt in der URL',
  'Print or save PDF': 'Drucken oder als PDF speichern',
  'Use the browser’s print dialog': 'Den Druckdialog des Browsers verwenden',
  'This link is long and may not work in every app. Prefer JSON export for this project.':
    'Dieser Link ist lang und funktioniert möglicherweise nicht in jeder App. Für dieses Projekt ist der JSON-Export vorzuziehen.',
  'Open projects': 'Projekte öffnen',
  'Open projects & templates': 'Projekte & Vorlagen öffnen',
  Download: 'Herunterladen',
  'Import JSON': 'JSON importieren',
  'Export and share': 'Exportieren und teilen',
  Undo: 'Rückgängig',
  Redo: 'Wiederholen',
  'Fit canvas': 'Zeichenfläche einpassen',
  'Use light mode': 'Hellen Modus verwenden',
  'Use dark mode': 'Dunklen Modus verwenden',
  'Layout preference': 'Layout-Einstellung',
  'Auto layout': 'Automatisches Layout',
  'Compact layout': 'Kompaktes Layout',
  'Desktop layout': 'Desktop-Layout',
  Create: 'Erstellen',
  Tools: 'Werkzeuge',
  'Return to Select': 'Zu „Auswählen“ zurückkehren',
  'History controls': 'Verlaufssteuerung',
  '{count} objects · {zoom}%': '{count} Objekte · {zoom} %',
  Select: 'Auswählen',
  Pan: 'Verschieben',
  Boat: 'Boot',
  Mark: 'Marke',
  Line: 'Linie',
  Arrow: 'Pfeil',
  Freehand: 'Freihand',
  Text: 'Text',
  Rectangle: 'Rechteck',
  Circle: 'Kreis',
  'Editor tools': 'Editor-Werkzeuge',
  'Boat class': 'Bootsklasse',
  Name: 'Name',
  'Sail no.': 'Segelnummer',
  Heading: 'Kurs',
  'Heading slider': 'Kursregler',
  'Hull color': 'Rumpffarbe',
  'Fixed VSR Coachboat hull color': 'Feste Rumpffarbe des VSR-Coachboots',
  Fixed: 'Fest',
  Sails: 'Segel',
  Mainsail: 'Großsegel',
  Jib: 'Fock',
  Genoa: 'Genua',
  Spinnaker: 'Spinnaker',
  Gennaker: 'Gennaker',
  Luffing: 'Flattert',
  'No sails for this boat class.': 'Diese Bootsklasse hat keine Segel.',
  Positioning: 'Positionierung',
  'Automatic with trim': 'Automatisch mit Trimm',
  'Manual mainsail angle': 'Manueller Großsegelwinkel',
  'Mark number': 'Markennummer',
  'Mark type': 'Markentyp',
  'Racing mark': 'Bahnmarke',
  'Starting mark': 'Startmarke',
  'Finish mark': 'Zielmarke',
  Shape: 'Form',
  'Round buoy': 'Runde Boje',
  'Cylindrical buoy': 'Zylindrische Boje',
  'Inflatable buoy': 'Aufblasbare Boje',
  'Flag buoy': 'Flaggenboje',
  'Gate mark': 'Tormarke',
  'Pin-end mark': 'Pin-End-Marke',
  'Mark color': 'Markenfarbe',
  'Zone radius': 'Zonenradius',
  'Zone radius in boat lengths': 'Zonenradius in Bootslängen',
  'Default basis': 'Standardbasis',
  'Longest class': 'Längste Klasse',
  'Show zone': 'Zone anzeigen',
  'Downwind mark': 'Leemarke',
  'No selection': 'Keine Auswahl',
  'Select an object on the canvas to edit its properties.':
    'Wähle ein Objekt auf der Zeichenfläche aus, um seine Eigenschaften zu bearbeiten.',
  Selection: 'Auswahl',
  '{count} objects': '{count} Objekte',
  'Move, duplicate, layer, lock or remove the selection together.':
    'Die Auswahl gemeinsam verschieben, duplizieren, anordnen, sperren oder entfernen.',
  Unlock: 'Entsperren',
  Lock: 'Sperren',
  'Bring forward': 'Nach vorne',
  'Send backward': 'Nach hinten',
  Properties: 'Eigenschaften',
  'Mark {number}': 'Marke {number}',
  'Object information': 'Objektinformationen',
  Position: 'Position',
  Tack: 'Bug',
  Port: 'Backbord',
  Starboard: 'Steuerbord',
  'Font size': 'Schriftgröße',
  'Text color': 'Textfarbe',
  'Stroke width': 'Linienstärke',
  'Stroke color': 'Linienfarbe',
  Opacity: 'Deckkraft',
  'Add static position': 'Statische Position hinzufügen',
  Hide: 'Ausblenden',
  Show: 'Einblenden',
  Palette: 'Palette',
  Recent: 'Zuletzt verwendet',
  'Custom color': 'Eigene Farbe',
  'Open {label} selector': '{label}-Farbauswahl öffnen',
  '{label} colors': 'Farben für {label}',
  'Regatta color palette': 'Regatta-Farbpalette',
  'Recently used colors': 'Zuletzt verwendete Farben',
  '{label} custom color': 'Eigene Farbe für {label}',
  'Use {source} color {description}': 'Farbe {description} aus {source} verwenden',
  palette: 'der Palette',
  recent: 'den zuletzt verwendeten Farben',
  'custom color': 'eigene Farbe',
  'palette color': 'Palettenfarbe',
  'recent color': 'zuletzt verwendete Farbe',
  'Sailing scenario canvas': 'Zeichenfläche für Segelszenarien',
  'BOAT LEGEND': 'BOOTLEGENDE',
  'WIND FROM': 'WIND AUS',
  Annotation: 'Beschriftung',
  'Generic keelboat': 'Allgemeines Kielboot',
  'Generic dinghy': 'Allgemeine Jolle',
  'Generic catamaran': 'Allgemeiner Katamaran',
  'Generic skiff': 'Allgemeiner Skiff',
  Windsurfer: 'Windsurfer',
  'Wingfoil board': 'Wingfoil-Board',
  'VSR Coachboat': 'VSR-Coachboot',
  'Coach boat': 'Trainerboot',
  'Jury boat': 'Juryboot',
  'Committee boat': 'Startschiff',
  'Windward mark rounding': 'Rundung der Luvmarke',
  'A static visual example for discussing Rule 18.':
    'Ein statisches Beispiel zur Besprechung von Regel 18.',
  'A static visual example for discussing a mark-rounding situation.':
    'Ein statisches Beispiel zur Besprechung einer Markenrundung.',
  'Start-line situation': 'Startliniensituation',
  'Static positions for discussing a start-line situation.':
    'Statische Positionen zur Besprechung einer Startliniensituation.',
  'Static positions approaching a start line. No rule decision is implied.':
    'Statische Positionen bei der Annäherung an eine Startlinie. Es wird keine Regelentscheidung vorweggenommen.',
  'Ocean blue': 'Ozeanblau',
  'Signal red': 'Signalrot',
  'Deep teal': 'Dunkles Türkis',
  'Regatta violet': 'Regattaviolett',
  'Burnt orange': 'Gebranntes Orange',
  'Racing magenta': 'Regattamagenta',
  Slate: 'Schiefer',
  'Heisel amber': 'Heisel-Orange',
  Ready: 'Bereit',
  'Scenario opened': 'Szenario geöffnet',
  'Opened shared scenario': 'Geteiltes Szenario geöffnet',
  'Could not open the shared scenario': 'Das geteilte Szenario konnte nicht geöffnet werden',
  'Created scenario': 'Szenario erstellt',
  'Added boat': 'Boot hinzugefügt',
  'Added mark': 'Marke hinzugefügt',
  'Added text': 'Text hinzugefügt',
  'Added line': 'Linie hinzugefügt',
  'Added arrow': 'Pfeil hinzugefügt',
  'Added freehand': 'Freihandzeichnung hinzugefügt',
  'Added rectangle': 'Rechteck hinzugefügt',
  'Added circle': 'Kreis hinzugefügt',
  'Moved boat': 'Boot verschoben',
  'Moved mark': 'Marke verschoben',
  'Moved text': 'Text verschoben',
  'Moved rectangle': 'Rechteck verschoben',
  'Moved circle': 'Kreis verschoben',
  'Transformed boat': 'Boot gedreht',
  'Transformed mark': 'Marke gedreht',
  'Transformed text': 'Text gedreht',
  'Updated boat': 'Boot aktualisiert',
  'Updated mark': 'Marke aktualisiert',
  'Updated text': 'Text aktualisiert',
  'Updated line': 'Linie aktualisiert',
  'Updated arrow': 'Pfeil aktualisiert',
  'Updated freehand': 'Freihandzeichnung aktualisiert',
  'Updated rectangle': 'Rechteck aktualisiert',
  'Updated circle': 'Kreis aktualisiert',
  'Updated objects': 'Objekte aktualisiert',
  'Duplicated selection': 'Auswahl dupliziert',
  'Added static boat position': 'Statische Bootsposition hinzugefügt',
  'Changed layer order': 'Ebenenreihenfolge geändert',
  'Unlocked selection': 'Auswahl entsperrt',
  'Locked selection': 'Auswahl gesperrt',
  'Nudged selection': 'Auswahl verschoben',
  'Exported scenario JSON': 'Szenario-JSON exportiert',
  'Exported PNG image': 'PNG-Bild exportiert',
  'Static sailing scenario': 'Statisches Segelszenario',
  'Opened share sheet': 'Teilen-Dialog geöffnet',
  'Share link copied': 'Freigabelink kopiert',
  'Could not share; copy the address from your browser.':
    'Teilen fehlgeschlagen; kopiere die Adresse aus dem Browser.',
  'Unsupported file type. Choose a scenario JSON file.':
    'Nicht unterstützter Dateityp. Wähle eine Szenario-JSON-Datei.',
  'Imported scenario JSON': 'Szenario-JSON importiert',
  'Could not import this file': 'Diese Datei konnte nicht importiert werden',
  'Restored local work': 'Lokalen Arbeitsstand wiederhergestellt',
  'Local storage is unavailable; work remains in this tab.':
    'Der lokale Speicher ist nicht verfügbar; die Arbeit bleibt in diesem Tab erhalten.',
  'Saved locally': 'Lokal gespeichert',
  'Could not autosave locally': 'Lokales automatisches Speichern fehlgeschlagen',
  'The share link contains invalid characters.': 'Der Freigabelink enthält ungültige Zeichen.',
  'The share link is invalid or damaged.': 'Der Freigabelink ist ungültig oder beschädigt.',
  'This file does not contain valid JSON.': 'Diese Datei enthält kein gültiges JSON.',
  'The scenario format version is missing.': 'Die Version des Szenarioformats fehlt.',
}

export function translate(language: Language, key: string, variables: Variables = {}): string {
  const template = language === 'de' ? (german[key] ?? key) : key
  return Object.entries(variables).reduce(
    (text, [name, value]) => text.replaceAll(`{${name}}`, String(value)),
    template,
  )
}

export function translateStatus(language: Language, status: string): string {
  if (language === 'en') return status
  if (status.startsWith('Undid: ')) return `Rückgängig: ${translateStatus(language, status.slice(7))}`
  if (status.startsWith('Redid: ')) return `Wiederholt: ${translateStatus(language, status.slice(7))}`
  const deleted = /^Deleted (\d+) objects?$/.exec(status)
  if (deleted) return `${deleted[1]} ${deleted[1] === '1' ? 'Objekt' : 'Objekte'} gelöscht`
  return translate(language, status)
}

interface I18nValue {
  language: Language
  setLanguage: (language: Language) => void
  t: (key: string, variables?: Variables) => string
  status: (message: string) => string
  locale: string
}

const I18nContext = createContext<I18nValue | null>(null)
const STORAGE_KEY = 'sailing-language'

const initialLanguage = (): Language => {
  const stored = window.localStorage.getItem(STORAGE_KEY)
  if (stored === 'de' || stored === 'en') return stored
  return window.navigator.language.toLowerCase().startsWith('de') ? 'de' : 'en'
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [language, setLanguage] = useState<Language>(initialLanguage)

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, language)
    document.documentElement.lang = language
    document.title = translate(language, 'Sailing Scenario Editor')
  }, [language])

  const value = useMemo<I18nValue>(
    () => ({
      language,
      setLanguage,
      t: (key, variables) => translate(language, key, variables),
      status: (message) => translateStatus(language, message),
      locale: language === 'de' ? 'de-CH' : 'en-GB',
    }),
    [language],
  )

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}

export function useI18n(): I18nValue {
  const context = useContext(I18nContext)
  if (!context) throw new Error('useI18n must be used inside I18nProvider')
  return context
}
