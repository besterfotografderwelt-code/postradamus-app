# FeedFlow AI

FeedFlow AI ist ein webbasiertes MVP für professionelle Hochzeitsfotografen.
Die App hilft dabei, aus Hochzeitsprojekten, Kundendaten und ausgewählten Vorschaubildern nach der Hochzeit Marketing- und Workflow-Inhalte zu erzeugen.

## MVP-Umfang

Phase 1 fokussiert auf:

- Benutzerkonto und Profil-Grundlage
- Hochzeitsprojekte anlegen
- Projektübersicht im Dashboard anzeigen
- Datenbankmodell und Produktstruktur planen
- UI-Gerüst für Upload und KI in späteren Phasen vorbereiten

Bereits lokal umgesetzt:

- Bild-Upload und Tagging
- Erzeugung verkleinerter JPG-Vorschauen
- Projektbezogene Speicherung in IndexedDB
- Content-Studio mit sieben Inhaltstypen, Bearbeitung und Historie
- Lokaler Demo-Generator ohne API-Kosten

Spätere Phasen ergänzen:

- KI-Textgenerierung
- Sneak-Peek-Reihenfolge
- Export-Workflows
- Deployment und Betrieb gegen ein echtes Supabase-Projekt

## Technik

- Frontend: Next.js
- Backend: Next.js Route Handler oder später FastAPI
- Datenbank: Supabase/PostgreSQL, Schema und RLS als Migration vorbereitet
- Auth: Supabase Auth
- Lokaler MVP-Speicher: `localStorage` für Projektdaten, IndexedDB für Vorschaubilder
- Produktiv-Speicher: Supabase Storage oder S3-kompatibler Speicher
- KI: OpenAI API
- Deployment: Vercel oder VPS

## Lokaler Start

```bash
npm install
npm run dev
```

Dann `http://localhost:3000` öffnen.

Ohne weitere Konfiguration erzeugt das Content-Studio projektbezogene Demo-Texte. Für echte
KI-Generierung `OPENAI_API_KEY` serverseitig in `.env.local` setzen. Das optionale
`OPENAI_MODEL` verwendet standardmäßig `gpt-5.4-mini`; der API-Key wird nie an den Browser
ausgeliefert.

Für Posting-Captions gibt es zwei Stufen: `OPENAI_API_KEY` aktiviert echte Bildanalyse.
`DEEPSEEK_API_KEY` aktiviert einen schnellen Text-Fallback aus Tags und Dateinamen, wenn keine
OpenAI-Bildanalyse verfügbar ist. Ohne `OPENAI_API_KEY` kann `DEEPSEEK_API_KEY` außerdem die
normale Textgenerierung im Content-Studio übernehmen.

Vollständige technische Prüfung:

```bash
npm run check
```

Browser-Smoke-Tests:

```bash
npm run test:e2e
```

Komplette lokale Verifikation:

```bash
npm run verify
```

Die manuelle Test-Checkliste liegt in `docs/testing.md`.

## Supabase vorbereiten

Die Codebasis enthält typisierte Browser- und Server-Clients, Registrierung/Login,
Session-Middleware sowie eine vollständige Migration für Tabellen, Trigger, RLS und den privaten
Storage-Bucket `wedding-previews`.
Es wurde bewusst noch kein externes Supabase-Projekt angelegt oder verändert.

```bash
cp .env.example .env.local
```

Danach URL und Publishable Key des eigenen Supabase-Projekts eintragen und die Migration
`supabase/migrations/20260614221500_initial_schema.sql` über die Supabase CLI oder den SQL Editor
anwenden. Storage-Pfade folgen dem Schema `<user-id>/<project-id>/<filename>`.

## Projektstruktur

- `app/` - UI-Routen und Layout
- `components/` - Wiederverwendbare UI-Bausteine
- `lib/` - Gemeinsame Typen und lokale Persistenz-Hilfen
- `lib/repositories/` - Austauschbare lokale und Supabase-Datenzugriffe
- `lib/supabase/` - Typisierte Supabase-Clients und Datenbanktypen
- `supabase/migrations/` - Datenbankschema, RLS und Storage-Policies
- `docs/` - Produkt- und Technikdokumentation

Sobald die Supabase-Variablen gesetzt sind, verwenden Dashboard, Projektübersicht,
Projektanlage, Projektdetail und Bildspeicher automatisch Supabase. Ohne Variablen bleibt
derselbe UI-Flow mit `localStorage` und IndexedDB verfügbar.
