# Lokaler MVP-Test

## Start

```bash
npm install
npm run dev
```

Danach `http://localhost:3000` öffnen. Ohne Supabase- und OpenAI-Konfiguration läuft die App
vollständig im lokalen Demo-Modus.

## Empfohlener Testfluss

1. Ein neues Hochzeitsprojekt anlegen.
2. Das Projekt öffnen und ein oder mehrere JPGs hochladen.
3. Bilder als Favorit markieren und Tags vergeben.
4. Im Content-Studio einen Inhaltstyp auswählen und einen Zusatzwunsch eintragen.
5. Inhalt generieren, bearbeiten und speichern.
6. Seite neu laden und prüfen, ob Bilder, Auswahl und Inhalte erhalten bleiben.
7. Zur Projektübersicht wechseln und den Status `Textphase` prüfen.

## Automatische Prüfung

Den laufenden Dev-Server vor der Gesamtprüfung beenden, damit `next build` und `next dev`
nicht gleichzeitig auf den `.next`-Ordner zugreifen.

```bash
npm run verify
npm audit --audit-level=high
```

`npm run verify` führt Lint, TypeScript, Produktions-Build und die Playwright-Browser-Tests aus.

## Optionale echte Dienste

- Supabase: Werte aus `.env.example` in `.env.local` eintragen und beide Migrationen anwenden.
- OpenAI: `OPENAI_API_KEY` ausschließlich serverseitig in `.env.local` setzen.
- Modell: `OPENAI_MODEL` ist optional und verwendet standardmäßig `gpt-5.4-mini`.
- DeepSeek: `DEEPSEEK_API_KEY` ist optional und verbessert den schnellen Caption-Fallback aus Tags/Dateinamen.
