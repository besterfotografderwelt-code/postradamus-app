# Technische Architektur

## Ziel

Eine hochwertige, webbasierte Workflow-App für Hochzeitsfotografen aufbauen.
Das MVP soll Projektkontext und ausgewählte Bilder nach der Hochzeit in nutzbare Inhalte verwandeln.

## Leitprinzipien

- Die erste Version bewusst schmal und nützlich halten.
- Schwere Bildanalyse in v1 vermeiden.
- Strukturierte Projektdaten vor reine Freitext-Prompts stellen.
- Jeden Schritt auf Desktop und Mobile leicht scanbar machen.
- Ausgaben so speichern, dass sie exportiert, wiederverwendet und später erweitert werden können.

## Vorgeschlagener Stack

- Frontend: Next.js App Router
- Sprache: TypeScript
- Styling: eigenes CSS mit Premium-Dunkel/Hell-Richtung
- Auth: Supabase Auth
- Datenbank: PostgreSQL via Supabase
- Datenzugriff: Repository-Schnittstelle mit lokaler und Supabase-Implementierung
- Lokaler MVP-Speicher: `localStorage` für Projektdaten, IndexedDB für Vorschaubilder
- Produktiv-Speicher: Supabase Storage oder S3-kompatibler Speicher
- KI: OpenAI API
- Deployment: Vercel oder VPS

## Kernmodule

### 1. Konto und Branding

Speichert Identität des Fotografen, Sprachpräferenz, Website, Instagram-Handle und Tonalität.

### 2. Hochzeitsprojekte

Jede Hochzeit ist ein Projekt mit Metadaten, ausgewählten Bildern, Tags und generierten Ausgaben.

### 3. Leichte Bildprüfung

In v1 nur JPG-Vorschauen.
Die App erzeugt verkleinerte Vorschaubilder und speichert sie lokal in IndexedDB oder
kontogebunden im privaten Supabase-Storage.
Sie verwaltet Favoriten, Tags und einfache Reihenfolgevorschläge.

### 4. KI-Textgenerator

Erzeugt:

- Blogartikel
- Instagram-Caption
- Hashtag-Set
- Reel-Ideen
- Galeriebeschreibung
- Dankesmail
- Album- und Storytelling-Struktur

### 5. Sneak-Peek-Modul

20 bis 50 Bilder auswählen, eine Reihenfolge vorschlagen und passenden Text erzeugen.

### 6. Export

Text als Markdown oder TXT exportieren, Bildauswahlen als CSV und ein Projektpaket als ZIP.

## v1-Umsetzungshinweise

- Projektdaten lokal in `localStorage` und Vorschaubilder in IndexedDB speichern.
- Supabase-Schema, RLS, Storage-Policies und typisierte Clients sind vorbereitet.
- Die UI schaltet anhand der Supabase-Konfiguration automatisch zwischen lokalem und
  produktivem Repository um.
- Generierungsantworten strukturiert halten, damit sie später leicht speicherbar sind.
- Klare Seitenzustände für leer, laden und befüllt verwenden.

## Sicherheitsgrenzen

- Der Browser erhält ausschließlich URL und Publishable-/Anon-Key.
- RLS bindet Profile, Projekte, Bilder, Ausgaben und Exporte an `auth.uid()`.
- Der private Bucket `wedding-previews` akzeptiert nur JPEG-Dateien bis 25 MB.
- Storage-Pfade müssen mit Benutzer- und Projekt-ID beginnen.
- Service-Role-Schlüssel gehören nie in Frontend-Umgebungsvariablen.
