# Datenbankmodell

## Tabellen

### `profiles`

Konto- und Brandingdaten des Fotografen.

- `id` UUID, primary key, matches auth user
- `full_name` text
- `website` text
- `instagram_handle` text
- `tone_of_voice` text
- `language_preference` text, `DE` or `EN`
- `created_at` timestamp
- `updated_at` timestamp

### `projects`

Metadaten des Hochzeitsprojekts.

- `id` UUID, primary key
- `profile_id` UUID, foreign key to `profiles.id`
- `couple_name` text
- `wedding_date` date
- `location` text
- `style` text
- `special_notes` text
- `desired_tone` text
- `language` text, `DE` or `EN`
- `image_count` integer
- `uploaded_image_count` integer
- `favorite_count` integer
- `tag_count` integer
- `internal_notes` text
- `status` text, default `brief`
- `created_at` timestamp
- `updated_at` timestamp
- `updated_at` timestamp

### `project_images`

Hochgeladene JPG-Vorschauen und Prüfmetadaten.

- `id` UUID, primary key
- `project_id` UUID, foreign key to `projects.id`
- `storage_path` text
- `thumbnail_path` text
- `filename` text
- `sort_order` integer
- `is_favorite` boolean
- `tags` text array
- `created_at` timestamp
- `updated_at` timestamp

### `project_outputs`

KI-generierte oder manuell überarbeitete Inhalte.

- `id` UUID, primary key
- `project_id` UUID, foreign key to `projects.id`
- `output_type` text
- `content_markdown` text
- `content_text` text
- `payload_json` jsonb
- `created_at` timestamp
- `updated_at` timestamp

### `export_jobs`

Export-Tracking für ZIP-, CSV-, TXT- oder Markdown-Bundles.

- `id` UUID, primary key
- `project_id` UUID, foreign key to `projects.id`
- `export_type` text
- `status` text
- `download_url` text
- `error_message` text
- `created_at` timestamp
- `updated_at` timestamp

## Beziehungen

- Ein Profil hat viele Projekte
- Ein Projekt hat viele Bilder
- Ein Projekt hat viele generierte Ausgaben
- Ein Projekt hat viele Export-Jobs

## Umsetzung

- Das verbindliche Schema liegt in `supabase/migrations/20260614221500_initial_schema.sql`.
- RLS ist für alle fachlichen Tabellen aktiviert.
- Untertabellen prüfen den Projektbesitz über `projects.profile_id`.
- Ein Trigger legt nach der Registrierung automatisch das Profil an.
- Ein Trigger hält Bildanzahl, Favoriten, Tags und den ersten Statuswechsel des Projekts synchron.
- Der private Bucket `wedding-previews` ist auf JPEG und 25 MB pro Datei begrenzt.

## Sinnvolle Erweiterungen als Nächstes

- `project_templates` später für wiederkehrende Strukturen einführen
- `audit_events` ergänzen, falls Zusammenarbeit oder Historie wichtig werden
