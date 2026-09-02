/* eslint-disable react-refresh/only-export-components */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { defaultSailPlotConfig } from './config/defaultConfig'
import { namespacedStorageKey } from './config/storage'
import type { SailPlotConfig } from './config/types'
import { useSailPlotConfig } from './providers/SailPlotConfigProvider'

export type Language = 'en' | 'de'
type Variables = Record<string, string | number>

const german: Record<string, string> = {
  'Sailing Plot Editor': 'Segelplot-Editor',
  Language: 'Sprache',
  Menu: 'Menü',
  'Licenses & Branding': 'Lizenzen & Branding',
  'Suggest an improvement': 'Verbesserungsvorschlag',
  'Suggest an Improvement': 'Verbesserungsvorschlag',
  'Make your own SailPlot': 'Dein eigenes SailPlot',
  'Make Your Own SailPlot': 'Dein eigenes SailPlot',
  Instructions: 'Anleitung',
  Changelog: 'Changelog',
  'Open Source': 'Open Source',
  English: 'Englisch',
  German: 'Deutsch',
  Scene: 'Szene',
  'Show grid': 'Raster anzeigen',
  'Show laylines': 'Laylines anzeigen',
  Laylines: 'Laylines',
  'Layline area': 'Layline-Fläche',
  'Layline area color': 'Farbe der Layline-Fläche',
  On: 'An',
  Off: 'Aus',
  'Show wind': 'Wind anzeigen',
  'Show zones': 'Zonen anzeigen',
  'Show boat numbers': 'Bootsnummern anzeigen',
  'Boat legend': 'Bootslegende',
  'Endless plot': 'Endlos-Plot',
  'Return to the central plot position': 'Zur zentralen Plot-Position zurückkehren',
  'Removes fixed plot edges. When enabled, the wind indicator and boat legend can be moved freely.':
    'Entfernt feste Plot-Ränder. Wenn aktiviert, lassen sich Windanzeige und Bootslegende frei verschieben.',
  'Plot background': 'Plot-Hintergrund',
  Light: 'Hell',
  Dark: 'Dunkel',
  'Grid size': 'Rastergröße',
  'Grid spacing': 'Rasterabstand',
  '1 BL · {boatClass}': '1 BL · {boatClass}',
  'Grid visibility': 'Rastersichtbarkeit',
  'Wind direction': 'Windrichtung',
  'Layline angle': 'Layline-Winkel',
  'Boat-length basis': 'Bootslängen-Basis',
  'How BL is calculated': 'So wird BL berechnet',
  Default: 'Standard',
  'Default uses the longest sailing boat class in the plot. Committee, jury and coach boats are excluded. Current basis: {boatClass}.':
    'Standard verwendet die längste Segelbootklasse im Plot. Committee-, Jury- und Coachboote werden nicht berücksichtigt. Aktuelle Basis: {boatClass}.',
  'Largest boat class in plot': 'Grösste Bootsklasse im Plot',
  'Selected basis': 'Gewählte Basis',
  'Additional information': 'Zusätzliche Informationen',
  'Wind strength': 'Windstärke',
  'Wind strength (general)': 'Windstärke (allgemein)',
  'Optional, e.g. 12 kn': 'Optional, z. B. 12 kn',
  Value: 'Wert',
  'Information name {number}': 'Name der Information {number}',
  'Information value {number}': 'Wert der Information {number}',
  'Remove information {number}': 'Information {number} entfernen',
  'Add information': 'Information hinzufügen',
  'No additional information.': 'Keine zusätzlichen Informationen.',
  '{count} of 10': '{count} von 10',
  'Powered by Heisel Analytics': 'Powered by Heisel Analytics',
  'Heisel Analytics links': 'Links von Heisel Analytics',
  Information: 'Information',
  Website: 'Webseite',
  Imprint: 'Impressum',
  'Legal Notice': 'Impressum',
  'Operator Legal Notice': 'Impressum des Betreibers',
  'Operator privacy': 'Datenschutz des Betreibers',
  'Operator Privacy': 'Datenschutz des Betreibers',
  'Open this plot': 'Diesen Plot öffnen',
  'QR code for this plot': 'QR-Code für diesen Plot',
  'Open menu': 'Menü öffnen',
  'Duplicate into new tab': 'In neuem Tab duplizieren',
  'Close dialog': 'Dialog schließen',
  '{label} value': 'Wert für {label}',
  '{label} slider': 'Regler für {label}',
  '{label} degrees': '{label} in Grad',
  Projects: 'Projekte',
  'Projects & templates': 'Projekte & Vorlagen',
  New: 'Neu',
  'Empty plot': 'Leerer Plot',
  'Start with a clean canvas.': 'Mit einer leeren Zeichenfläche beginnen.',
  'Port–starboard': 'Backbord–Steuerbord',
  'Opposite-tack crossing under RRS 10.': 'Kreuzung auf entgegengesetzten Schlägen nach RRS 10.',
  'Windward–leeward': 'Luv–Lee',
  'Same-tack overlap under RRS 11.': 'Überlappung auf gleichem Schlag nach RRS 11.',
  'Clear ahead/astern': 'Klar voraus/achteraus',
  'Same-tack positions under RRS 12.': 'Positionen auf gleichem Schlag nach RRS 12.',
  'Windward mark': 'Luvmarke',
  'Static Rule 18 discussion example.': 'Statisches Diskussionsbeispiel zu Regel 18.',
  'Start line': 'Startlinie',
  'Finish line': 'Ziellinie',
  Gate: 'Gate',
  Buoy: 'Tonne',
  Flag: 'Flagge',
  Coachboat: 'Coachboat',
  'Coachboat (reversed)': 'Coachboat (rückwärts)',
  'Start-boat end': 'Startschiff-Seite',
  'Pin end': 'Pin-Ende',
  '{label} flag color': '{label}: Flaggenfarbe',
  'Sailing signal flag palette': 'Signalflaggen-Palette',
  'Starting-line orange': 'Startlinien-Orange',
  'Finishing-line blue': 'Ziellinien-Blau',
  'Signal red': 'Signalrot',
  'Signal yellow': 'Signalgelb',
  'Signal green': 'Signalgrün',
  'Signal black': 'Signalschwarz',
  'Signal white': 'Signalweiß',
  'Finish-boat end': 'Zielschiff-Seite',
  'Outer end': 'Äusseres Ende',
  Length: 'Länge',
  'Angle to wind': 'Winkel zum Wind',
  'Gate width': 'Gate-Breite',
  'Start-line width': 'Startlinienbreite',
  'Boats approaching a start line.': 'Boote bei der Annäherung an eine Startlinie.',
  'Recent local projects': 'Letzte lokale Projekte',
  'No saved projects yet. Create a plot above.':
    'Noch keine Projekte gespeichert. Oben kann ein Plot erstellt werden.',
  Duplicate: 'Duplizieren',
  '{title} copy': '{title} – Kopie',
  Delete: 'Löschen',
  'Delete “{title}” from this browser?': '„{title}“ aus diesem Browser löschen?',
  'Plot details': 'Plotdetails',
  'Rename plot': 'Plot umbenennen',
  'Saved in browser': 'Im Browser gespeichert',
  Downloaded: 'Heruntergeladen',
  'Not saved': 'Nicht gespeichert',
  'Untitled plot': 'Unbenannter Plot',
  Title: 'Titel',
  'Clear title': 'Titel leeren',
  Description: 'Beschreibung',
  'Rule references': 'Regelverweise',
  'For example 18 or 18.2(a)': 'Zum Beispiel 18 oder 18.2(a)',
  'Remove rule reference {reference}': 'Regelverweis {reference} entfernen',
  '{count} more rule references': '{count} weitere Regelverweise',
  'Separate references with commas, for example “RRS 10, RRS 18”.':
    'Regelverweise mit Kommas trennen, zum Beispiel „RRS 10, RRS 18“.',
  Done: 'Fertig',
  'Help & information': 'Hilfe und Informationen',
  Help: 'Hilfe',
  Privacy: 'Datenschutz',
  Terms: 'Nutzungsbedingungen',
  'Terms of service': 'Nutzungsbedingungen',
  'Terms of Service': 'Nutzungsbedingungen',
  'Subscription & invoices': 'Abonnement & Rechnungen',
  'Subscription & Invoices': 'Abonnement & Rechnungen',
  'Cancel Contract': 'Vertrag kündigen',
  'Withdraw from Contract': 'Vertrag widerrufen',
  'SailPlot privacy': 'SailPlot-Datenschutz',
  'SailPlot Privacy': 'SailPlot-Datenschutz',
  'Refund Policy': 'Rückerstattungsrichtlinie',
  'SailPlot Legal Notice': 'SailPlot-Impressum',
  About: 'Über',
  License: 'Lizenz',
  'Build a static sailing explanation': 'Eine statische Segelerklärung erstellen',
  'Add boats, marks, lines and notes from the tool panel. Select an object to edit its properties. Use Player mode to replay numbered boat positions.':
    'Füge Boote, Marken, Linien und Notizen über die Werkzeugleiste hinzu. Wähle ein Objekt aus, um seine Eigenschaften zu bearbeiten. Im Player-Modus werden nummerierte Bootspositionen wiedergegeben.',
  'The Boat tool stays active: each tap adds the next numbered position to the current boat chain. To continue an existing chain, select one of its boats and then choose Boat. Choose Select or another tool when the chain is complete.':
    'Das Boot-Werkzeug bleibt aktiv: Jede Berührung fügt der aktuellen Bootskette die nächste nummerierte Position hinzu. Um eine bestehende Kette fortzusetzen, wähle eines ihrer Boote und danach „Boot“. Wähle „Auswählen“ oder ein anderes Werkzeug, wenn die Kette vollständig ist.',
  'Mouse and keyboard': 'Maus und Tastatur',
  'Scroll to zoom. Choose Pan or hold Space to move the view. Shift-click adds objects to a selection. Use Delete, arrow keys, ⌘/Ctrl+Z, ⌘/Ctrl+Shift+Z and ⌘/Ctrl+D.':
    'Scrolle zum Zoomen. Wähle „Verschieben“ oder halte die Leertaste gedrückt, um die Ansicht zu bewegen. Umschalt-Klick erweitert die Auswahl. Verwende Löschen, die Pfeiltasten, ⌘/Strg+Z, ⌘/Strg+Umschalt+Z und ⌘/Strg+D.',
  'Touch and stylus': 'Touch und Stift',
  'Tap to select and drag objects to move them. Drag drawing tools directly, or click twice to set start and end. Rectangle uses opposite corners; circle uses a centre and outer point. Drawing tools accept mouse, finger and stylus input.':
    'Tippe zum Auswählen und ziehe Objekte, um sie zu verschieben. Ziehe Zeichenwerkzeuge direkt auf oder klicke zweimal für Start und Ende. Das Rechteck verwendet gegenüberliegende Ecken; der Kreis verwendet Mittelpunkt und Aussenpunkt. Zeichenwerkzeuge unterstützen Maus, Finger und Stift.',
  Sharing: 'Teilen',
  'Share links contain a compressed copy of the complete project in the URL fragment. For large projects, export a JSON file instead.':
    'Freigabelinks enthalten eine komprimierte Kopie des vollständigen Projekts im URL-Fragment. Exportiere bei großen Projekten stattdessen eine JSON-Datei.',
  'Local-first privacy': 'Lokaler Datenschutz',
  'Projects and preferences are stored locally in this browser using IndexedDB. JSON and image exports are created on your device. No project data is uploaded to a server.':
    'Projekte und Einstellungen werden mit IndexedDB lokal in diesem Browser gespeichert. JSON- und Bildexporte entstehen auf deinem Gerät. Es werden keine Projektdaten auf einen Server hochgeladen.',
  'A share link contains the project data itself. Anyone who receives that link can access the plot embedded in it.':
    'Ein Freigabelink enthält die Projektdaten selbst. Jede Person mit diesem Link kann auf den darin eingebetteten Plot zugreifen.',
  'A new web-based implementation for creating static sailing and racing-rule diagrams. It is inspired by the historical BOATS application but is implemented from scratch and does not use the old application as a runtime dependency.':
    'Eine neue webbasierte Anwendung zum Erstellen statischer Segel- und Regeldiagramme. Sie ist von der historischen BOATS-Anwendung inspiriert, wurde jedoch vollständig neu entwickelt und verwendet die alte Anwendung nicht als Laufzeitabhängigkeit.',
  'Powered by Heisel Analytics.': 'Powered by Heisel Analytics.',
  'GNU General Public License v3': 'GNU General Public License v3',
  'This project is free software distributed under the GNU GPL v3. See the repository’s LICENSE file for the complete terms.':
    'Dieses Projekt ist freie Software unter der GNU GPL v3. Die vollständigen Bedingungen stehen in der LICENSE-Datei des Repositorys.',
  'Export & share': 'Exportieren und teilen',
  'Export / Share': 'Exportieren / Teilen',
  'Plot JSON': 'Plot-JSON',
  'About Plot JSON': 'Informationen zu Plot-JSON',
  'Best for editing later or transferring a plot between browsers.':
    'Ideal zur späteren Bearbeitung oder zum Übertragen eines Plots zwischen Browsern.',
  'Editable, validated project file': 'Bearbeitbare, validierte Projektdatei',
  'Download JSON': 'JSON herunterladen',
  'PNG image': 'PNG-Bild',
  'About PNG image': 'Informationen zum PNG-Bild',
  'Download PNG': 'PNG herunterladen',
  'Exports the complete plot in high quality with a QR code that reopens this editable plot.':
    'Exportiert den vollständigen Plot in hoher Qualität mit einem QR-Code, der diesen bearbeitbaren Plot wieder öffnet.',
  'Static image without editor handles': 'Statisches Bild ohne Editor-Griffe',
  'Transparent PNG': 'Transparentes PNG',
  'About Transparent PNG': 'Informationen zum transparenten PNG',
  'Download transparent PNG': 'Transparentes PNG herunterladen',
  'Exports in high quality without the plot background while keeping the branding and plot QR code.':
    'Exportiert in hoher Qualität ohne Plot-Hintergrund und behält Branding und Plot-QR-Code bei.',
  'Canvas objects without a background': 'Objekte der Zeichenfläche ohne Hintergrund',
  'Animated GIF': 'Animiertes GIF',
  'Dynamic exports': 'Dynamische Exporte',
  'GIF and MP4 use the speed and boat-tail setting from the Player.':
    'GIF und MP4 verwenden die Geschwindigkeit und Bootsspuren-Einstellung aus dem Player.',
  'Open Player exports': 'Player-Exporte öffnen',
  'Export animation': 'Animation exportieren',
  'Player exports': 'Player-Exporte',
  'Speed {speed}× · Boat tails {tails}': 'Geschwindigkeit {speed}× · Bootsspuren {tails}',
  'About animated GIF': 'Informationen zum animierten GIF',
  'Exports the complete Player sequence as a looping GIF. The transparent variant omits the plot background.':
    'Exportiert den vollständigen Player-Ablauf als wiederholtes GIF. Bei der transparenten Variante entfällt der Plot-Hintergrund.',
  'Looping animation · standard or transparent': 'Wiederholte Animation · normal oder transparent',
  'Add at least two positions to a boat first':
    'Füge einem Boot zuerst mindestens zwei Positionen hinzu',
  'GIF format': 'GIF-Format',
  'Download GIF': 'GIF herunterladen',
  'Transparent GIF': 'Transparentes GIF',
  'MP4 video': 'MP4-Video',
  'About MP4 video': 'Informationen zum MP4-Video',
  'Exports the complete Player sequence as a high-quality MP4 video.':
    'Exportiert den vollständigen Player-Ablauf als hochwertiges MP4-Video.',
  'Smooth video with plot background': 'Flüssiges Video mit Plot-Hintergrund',
  'Download MP4': 'MP4 herunterladen',
  'Exporting {progress}%': 'Export wird erstellt: {progress} %',
  'MP4 export is not supported by this browser': 'Dieser Browser unterstützt den MP4-Export nicht',
  'Exported MP4 video': 'MP4-Video exportiert',
  'Exported animated GIF': 'Animiertes GIF exportiert',
  'Could not export animation': 'Animation konnte nicht exportiert werden',
  'Could not render an animation frame': 'Animationsframe konnte nicht gerendert werden',
  'Could not prepare the animation export': 'Animationsexport konnte nicht vorbereitet werden',
  'Could not finalize the MP4 export': 'MP4-Export konnte nicht abgeschlossen werden',
  'Share link': 'Freigabelink',
  'About Share link': 'Informationen zum Freigabelink',
  'Copies a URL containing the complete editable plot. No upload is required.':
    'Kopiert eine URL mit dem vollständigen bearbeitbaren Plot. Es ist kein Upload erforderlich.',
  'Copy URL with project': 'URL mit Projekt kopieren',
  Copied: 'Kopiert',
  '{count} characters · project stays in the URL':
    '{count} Zeichen · das Projekt bleibt in der URL',
  'PDF document': 'PDF-Dokument',
  'About PDF document': 'Informationen zum PDF-Dokument',
  'Downloads the plot directly as an A4 landscape PDF.':
    'Lädt den Plot direkt als PDF im A4-Querformat herunter.',
  'Download PDF': 'PDF herunterladen',
  'A4 landscape with a clickable plot QR watermark':
    'A4-Querformat mit klickbarem Plot-QR-Wasserzeichen',
  'Unavailable with Endless plot. Turn it off in Scene settings to export an A4 PDF.':
    'Mit Endlos-Plot nicht verfügbar. Deaktiviere ihn in den Szenen-Einstellungen, um ein A4-PDF zu exportieren.',
  'PDF export is unavailable while Endless plot is enabled':
    'Der PDF-Export ist nicht verfügbar, solange Endlos-Plot aktiviert ist',
  'This link is long and may not work in every app. Prefer JSON export for this project.':
    'Dieser Link ist lang und funktioniert möglicherweise nicht in jeder App. Für dieses Projekt ist der JSON-Export vorzuziehen.',
  'Open projects': 'Projekte öffnen',
  'Open projects & templates': 'Projekte & Vorlagen öffnen',
  'Back to editor': 'Zurück zum Editor',
  Download: 'Herunterladen',
  Share: 'Teilen',
  'Import JSON': 'JSON importieren',
  'Delete all': 'Alle löschen',
  'Export and share': 'Exportieren und teilen',
  Undo: 'Rückgängig',
  Redo: 'Wiederholen',
  'Fit canvas': 'Zeichenfläche einpassen',
  'Use light mode': 'Hellen Modus verwenden',
  'Use dark mode': 'Dunklen Modus verwenden',
  'Layout preference': 'Layout-Einstellung',
  View: 'Ansicht',
  'Auto layout': 'Automatisches Layout',
  'Compact layout': 'Kompaktes Layout',
  'Desktop layout': 'Desktop-Layout',
  Create: 'Erstellen',
  Tools: 'Werkzeuge',
  'Return to Select': 'Zu „Auswählen“ zurückkehren',
  'Delete selection': 'Auswahl löschen',
  'Scene settings': 'Szenen-Einstellungen',
  'History controls': 'Verlaufssteuerung',
  'Player mode': 'Player-Modus',
  Player: 'Player',
  'Player controls': 'Player-Steuerung',
  'Playback controls': 'Wiedergabesteuerung',
  'Previous position': 'Vorherige Position',
  'Next position': 'Nächste Position',
  Play: 'Abspielen',
  Pause: 'Pause',
  'Playback timeline': 'Wiedergabe-Zeitleiste',
  Speed: 'Geschwindigkeit',
  'Playback speed': 'Wiedergabegeschwindigkeit',
  'Boat tails': 'Bootsspuren',
  'Position {position} of {count}': 'Position {position} von {count}',
  'Position {from} → {to} of {count}': 'Position {from} → {to} von {count}',
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
  'Hide zone': 'Zone ausblenden',
  Zone: 'Zone',
  'Mark orientation': 'Markenausrichtung',
  Windward: 'Luv',
  Neutral: 'Neutral',
  Leeward: 'Lee',
  'Neutral without laylines': 'Neutral ohne Laylines',
  'Leeward mark': 'Leemarke',
  'Downwind mark': 'Leemarke',
  'Lee mark': 'Leemarke',
  'No selection': 'Keine Auswahl',
  'Select an object on the canvas to edit its properties.':
    'Wähle ein Objekt auf der Zeichenfläche aus, um seine Eigenschaften zu bearbeiten.',
  Selection: 'Auswahl',
  '{count} objects': '{count} Objekte',
  'Move, duplicate, layer, lock or remove the selection together.':
    'Die Auswahl gemeinsam verschieben, duplizieren, anordnen, sperren oder entfernen.',
  Unlock: 'Entsperren',
  Lock: 'Sperren',
  Forward: 'Nach vorne',
  Backward: 'Nach hinten',
  'Layer order': 'Ebenenreihenfolge',
  Properties: 'Eigenschaften',
  'Expand properties': 'Eigenschaften öffnen',
  'Collapse properties': 'Eigenschaften schließen',
  'Mark {number}': 'Marke {number}',
  'Object information': 'Objektinformationen',
  Position: 'Position',
  Tack: 'Bug',
  Port: 'Backbord',
  None: 'Keine',
  Starboard: 'Steuerbord',
  'Overlap line': 'Überlappungslinie',
  'Font size': 'Schriftgröße',
  'Text color': 'Textfarbe',
  'Stroke width': 'Linienstärke',
  'Stroke color': 'Linienfarbe',
  'Fill color': 'Füllfarbe',
  'No fill': 'Keine Füllung',
  Opacity: 'Deckkraft',
  Palette: 'Palette',
  Recent: 'Zuletzt verwendet',
  'Custom color': 'Eigene Farbe',
  'Open {label} selector': '{label}-Farbauswahl öffnen',
  '{label} colors': 'Farben für {label}',
  'Heisel sailing palette': 'Heisel-Segelpalette',
  'Heisel dark sailing palette': 'Heisel-Segelpalette für dunklen Plot',
  'Recently used colors': 'Zuletzt verwendete Farben',
  '{label} custom color': 'Eigene Farbe für {label}',
  'Use {source} color {description}': 'Farbe {description} aus {source} verwenden',
  palette: 'der Palette',
  recent: 'den zuletzt verwendeten Farben',
  'custom color': 'eigene Farbe',
  'palette color': 'Palettenfarbe',
  'recent color': 'zuletzt verwendete Farbe',
  'Sailing plot canvas': 'Zeichenfläche für Segelplots',
  'BOAT LEGEND': 'BOOTLEGENDE',
  'WIND FROM': 'WIND AUS',
  Annotation: 'Beschriftung',
  'Generic keelboat': 'Allgemeines Kielboot',
  'Generic dinghy': 'Allgemeine Jolle',
  'Generic catamaran': 'Allgemeiner Katamaran',
  'Generic skiff': 'Allgemeiner Skiff',
  Windsurf: 'Windsurf',
  'Manual primary sail angle': 'Manueller Winkel des Hauptsegels',
  'Fixed support boat hull color': 'Feste Rumpffarbe des Begleitboots',
  'Jury boat': 'Juryboot',
  'Committee boat': 'Startschiff',
  'Committee boat (reversed)': 'Startschiff (umgekehrt)',
  'Windward mark rounding': 'Rundung der Luvmarke',
  'A static visual example for discussing Rule 18.':
    'Ein statisches Beispiel zur Besprechung von Regel 18.',
  'A static visual example for discussing a mark-rounding situation.':
    'Ein statisches Beispiel zur Besprechung einer Markenrundung.',
  'Start-line situation': 'Startliniensituation',
  'Static positions for discussing a start-line situation.':
    'Statische Positionen zur Besprechung einer Startliniensituation.',
  'Port–starboard crossing': 'Backbord–Steuerbord-Kreuzung',
  'Two boats on opposite tacks approaching a crossing situation.':
    'Zwei Boote auf entgegengesetzten Schlägen vor einer Kreuzungssituation.',
  'Windward–leeward overlap': 'Luv–Lee-Überlappung',
  'Two overlapped boats on the same tack.': 'Zwei überlappende Boote auf gleichem Schlag.',
  'Clear ahead and clear astern': 'Klar voraus und klar achteraus',
  'Two boats on the same tack, one clear ahead of the other.':
    'Zwei Boote auf gleichem Schlag, eines klar voraus.',
  'Static positions approaching a start line. No rule decision is implied.':
    'Statische Positionen bei der Annäherung an eine Startlinie. Es wird keine Regelentscheidung vorweggenommen.',
  'Midnight navy': 'Mitternachtsblau',
  'Glacier blue': 'Gletscherblau',
  'Clear blue': 'Klarblau',
  'Sea glass': 'Meerglas',
  Sage: 'Salbeigrün',
  'Dusty rose': 'Altrosa',
  'Warm copper': 'Warmes Kupfer',
  Silver: 'Silber',
  'Alpine blue': 'Alpenblau',
  'Deep teal': 'Dunkles Türkis',
  'Forest green': 'Waldgrün',
  Burgundy: 'Burgunder',
  Copper: 'Kupfer',
  Slate: 'Schiefer',
  'Heisel amber': 'Heisel-Orange',
  Ready: 'Bereit',
  'Plot opened': 'Plot geöffnet',
  'Opened shared plot': 'Geteilten Plot geöffnet',
  'Could not open the shared plot': 'Der geteilte Plot konnte nicht geöffnet werden',
  'Created plot': 'Plot erstellt',
  'Added boat': 'Boot hinzugefügt',
  'Added mark': 'Marke hinzugefügt',
  'Added downwind mark': 'Leemarke hinzugefügt',
  'Added gate': 'Gate hinzugefügt',
  'Added start line': 'Startlinie hinzugefügt',
  'Added finish line': 'Ziellinie hinzugefügt',
  'Added text': 'Text hinzugefügt',
  'Added line': 'Linie hinzugefügt',
  'Added arrow': 'Pfeil hinzugefügt',
  'Added freehand': 'Freihandzeichnung hinzugefügt',
  'Added rectangle': 'Rechteck hinzugefügt',
  'Added circle': 'Kreis hinzugefügt',
  'Moved boat': 'Boot verschoben',
  'Moved mark': 'Marke verschoben',
  'Moved gate': 'Gate verschoben',
  'Moved start-line': 'Startlinie verschoben',
  'Moved finish-line': 'Ziellinie verschoben',
  'Moved finish-line endpoint': 'Endpunkt der Ziellinie verschoben',
  'Moved text': 'Text verschoben',
  'Moved rectangle': 'Rechteck verschoben',
  'Resized rectangle': 'Rechteckgröße geändert',
  'Moved circle': 'Kreis verschoben',
  'Resized circle': 'Kreisgröße geändert',
  'Transformed boat': 'Boot gedreht',
  'Transformed mark': 'Marke gedreht',
  'Transformed gate': 'Gate gedreht',
  'Transformed start-line': 'Startlinie gedreht',
  'Transformed finish-line': 'Ziellinie gedreht',
  'Transformed text': 'Text gedreht',
  'Updated boat': 'Boot aktualisiert',
  'Updated mark': 'Marke aktualisiert',
  'Updated start-line': 'Startlinie aktualisiert',
  'Updated finish-line': 'Ziellinie aktualisiert',
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
  'Exported plot JSON': 'Plot-JSON exportiert',
  'Exported PNG image': 'PNG-Bild exportiert',
  'Could not export PNG image': 'PNG-Bild konnte nicht exportiert werden',
  'Static sailing plot': 'Statischer Segelplot',
  'Opened share sheet': 'Teilen-Dialog geöffnet',
  'Share link copied': 'Freigabelink kopiert',
  'Downloaded PDF': 'PDF heruntergeladen',
  'Could not export PDF': 'PDF konnte nicht exportiert werden',
  'Could not prepare the PDF download': 'PDF-Download konnte nicht vorbereitet werden',
  'Could not share; copy the address from your browser.':
    'Teilen fehlgeschlagen; kopiere die Adresse aus dem Browser.',
  'Unsupported file type. Choose a plot JSON file.':
    'Nicht unterstützter Dateityp. Wähle eine Plot-JSON-Datei.',
  'Imported plot JSON': 'Plot-JSON importiert',
  'Could not import this file': 'Diese Datei konnte nicht importiert werden',
  'Restored local work': 'Lokalen Arbeitsstand wiederhergestellt',
  'Local storage is unavailable; work remains in this tab.':
    'Der lokale Speicher ist nicht verfügbar; die Arbeit bleibt in diesem Tab erhalten.',
  'Saved locally': 'Lokal gespeichert',
  'Could not autosave locally': 'Lokales automatisches Speichern fehlgeschlagen',
  'The share link contains invalid characters.': 'Der Freigabelink enthält ungültige Zeichen.',
  'The share link is invalid or damaged.': 'Der Freigabelink ist ungültig oder beschädigt.',
  'This file does not contain valid JSON.': 'Diese Datei enthält kein gültiges JSON.',
  'The plot format version is missing.': 'Die Version des Plotformats fehlt.',
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
  if (status.startsWith('Undid: '))
    return `Rückgängig: ${translateStatus(language, status.slice(7))}`
  if (status.startsWith('Redid: '))
    return `Wiederholt: ${translateStatus(language, status.slice(7))}`
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
const LEGACY_STORAGE_KEY = 'sailing-language'

export function resolveInitialLanguage(
  config: SailPlotConfig,
  stored: string | null,
  browserLanguage: string,
): Language {
  void browserLanguage
  if (config.localization.languageMode !== 'both') return config.localization.languageMode
  if (stored === 'de' || stored === 'en') return stored
  return 'en'
}

const initialLanguage = (config: SailPlotConfig): Language => {
  const stored = window.localStorage.getItem(
    namespacedStorageKey(config.storageNamespace, LEGACY_STORAGE_KEY),
  )
  return resolveInitialLanguage(config, stored, window.navigator.language)
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const config = useSailPlotConfig()
  const [language, setLanguage] = useState<Language>(() => initialLanguage(config))
  const languageMode = config.localization.languageMode
  const setConfiguredLanguage = useCallback(
    (nextLanguage: Language) => setLanguage(languageMode === 'both' ? nextLanguage : languageMode),
    [languageMode],
  )

  useEffect(() => {
    if (languageMode !== 'both') setLanguage(languageMode)
  }, [languageMode])

  useEffect(() => {
    window.localStorage.setItem(
      namespacedStorageKey(config.storageNamespace, LEGACY_STORAGE_KEY),
      language,
    )
    document.documentElement.lang = language
    document.title =
      config.pageTitle === defaultSailPlotConfig.pageTitle
        ? translate(language, config.pageTitle)
        : config.pageTitle
  }, [config.pageTitle, config.storageNamespace, language])

  const value = useMemo<I18nValue>(
    () => ({
      language,
      setLanguage: setConfiguredLanguage,
      t: (key, variables) => translate(language, key, variables),
      status: (message) => translateStatus(language, message),
      locale: config.localization.locales[language],
    }),
    [config.localization.locales, language, setConfiguredLanguage],
  )

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}

export function useI18n(): I18nValue {
  const context = useContext(I18nContext)
  if (!context) throw new Error('useI18n must be used inside I18nProvider')
  return context
}
