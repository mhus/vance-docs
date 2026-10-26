# Liver — User-Backup: Dokumente lokal sichern, Time-Machine-artig

> Codename **Liver** (Modul `vance-liver`) — in der Reihe brain / foot / face /
> anus: ein eigenständig lauffähiges Teil des Körpers. Die Leber filtert und
> legt Vorräte an; genau das tut das Werkzeug.
>
> **Status:** Phase 0, Phase 1 und das JVM-Tool (Phase 2) sind umgesetzt.
> Phase 3 (Face-UI für Token-Minten und „Apps mit Zugriff") und Phase 4
> (Native-Image, Schedule, Systembenachrichtigungen) sind offen. Diese Spec
> beschreibt den gebauten Stand; §11 listet die Nachfolgeschritte.
>
> Planungsdokument: `../../../../planning/archive/user-backup.md`. Abweichungen vom Plan sind am
> Kopf jeder Sektion vermerkt.

## 1. Motivation & Ziel

Ein User soll die Sicherheit haben, dass **seine Daten lokal und gesichert**
liegen — unabhängig davon, ob der Server morgen noch läuft. Er startet ein
Werkzeug auf seinem Rechner (manuell oder geplant), das alle Dokumente, die er
lesen darf, in einen lokalen Ordner sichert, mit Historie wie Time Machine.

**Ziel:**

- Ein **JVM-Binary** (`vancetope-backup`), GraalVM `native-image` ist eine
  v2-Optimierung (Phase 4, derzeit zurückgestellt — siehe §12).
- Umfang: der **ganze Tenant, soweit der User lesen darf**, oder gefiltert auf
  Projekte; Ordner per Deny-Liste ausschließbar.
- **Wiederherstellen ohne Werkzeug:** jeder Snapshot ist ein gewöhnlicher
  Ordnerbaum. Finder/Explorer/`cp` reichen.

**Was nicht das Ziel ist:**

- **Kein Restore ins System.** Zurückspielen nach Vancetope ist nicht Teil
  dieses Werkzeugs (geht bei Bedarf über WebDAV oder Upload).
- **Kein eigenes Repository-Format** (restic/borg/kopia nachbauen). Wer
  verschlüsselt außer Haus sichern will, lässt eines dieser Tools über den
  Backup-Ordner laufen.
- **Nur `documents`.** Keine Sessions, Memory, Settings, Inbox, Leases.
  Was unter `_vance/` als Dokument liegt, ist Dokument — aber per Default
  ausgeschlossen (§5).
- **Kein Backup für den Betreiber.** Das Server-Backup (Mongo, Storage) bleibt
  Sache des Betriebs; dies ist die Sicherung *des Users*.

## 2. Entschiedene Vorgaben

| Thema | Entscheidung |
|---|---|
| Snapshot-Modell | Ordner pro Snapshot, unveränderte Dateien als **Hardlink** auf den Vorgänger (`rsync --link-dest`-Muster) |
| Format | Klartext-Dateibaum + Manifest (JSON) pro Snapshot; kein eigenes Container-Format |
| Konfiguration | **rein lokal**; der Filter wird bei jedem Lauf an den Server mitgeschickt, der Server speichert nichts davon |
| Glob-Semantik | Ant-Stil (`*` innerhalb eines Segments, `**` über Segmente), relativ zur Projekt-Wurzel. Server und Client nutzen **dieselbe** Implementierung `de.mhus.vance.api.util.PathGlob` (vance-api) |
| Ausschluss | Deny-Liste (Globs), Default-Eintrag `_vance/**`, entfernbar |
| Anmeldung | **Integration-Token** mit Profil `backup` (nur lesend, ohne Projekt-Pin, sliding-lifetime). OAuth später als Zusatz möglich (eigene Tür auf demselben Profil) |
| Token-Laufzeit | **gleitend**: jeder erfolgreiche Backup-Lauf verlängert auf „jetzt + idleDays"; idleDays ohne Backup → Token tot, neu minten (§7.6) |
| Deaktivierte Projekte | nur auf ausdrückliche Anforderung: namentlich in `include` oder Flag `includeDisabled` (§5) |
| Name | intern **Liver** (Modul `vance-liver`, wie brain/foot/face/anus); nach außen **„Vancetope Backup"**, eigenes Binary `vancetope-backup`, unabhängig von foot (§4.1) |
| Abmelden | Token widerruft **sich selbst** über `DELETE …/integration-tokens/current` |
| Mandanten-Policy | `_tenant/_vance/config/backup-access.yaml`, **Default erlaubt** (Datei fehlt = `enabled: true`); Datei kaputt → verweigert mit WARN |
| Einzel-Token-Freigabe | **nicht** als Dokument — Lebendigkeit bleibt allein in der Registry `integration_tokens` (§7.3) |
| Binary | **JVM-Modul** ohne Spring, nur `vance-api` + Jackson + JDK `HttpClient` + Picocli (kein Spring, kein `vance-toolpack`, kein `vance-shared`). GraalVM-Native-Image v2 |
| `updatedAt` | neues Feld am Dokument, gesetzt bei jeder fachlichen Änderung (Inhalt + Metadaten); auch in der UI angezeigt; im Backup als Datei-mtime (§3.1) |
| Metadaten | Notizen, Farben, Tags usw. gehen im Dateibaum verloren — **akzeptiert** (§5) |
| Native-Image | v2. Verteilung in Phase 4 entfällt; JVM-Binary reicht für v1 |

## 3. Ist-Stand (relevant)

- `GET /brain/{tenant}/projects` (`ProjectController`) liefert die lesbaren
  Projekte über `ProjectService.listReadableBy` — inklusive `_user_<login>`-Hub.
- `GET /brain/{tenant}/documents?projectId&page&size&pathPrefix&kind`
  (`DocumentController.list`) liefert `DocumentSummary` — **ohne**
  Inhaltsversion (`storageId`/`version`). Trash-Pfade sind dort schon
  ausgeblendet.
- `GET /brain/{tenant}/documents/{id}/content` streamt den Inhalt, ETag =
  `storageId` (jeder Write erzeugt eine neue `storageId`; gleiche `storageId`
  = byte-identischer Inhalt). Gemountete Dokumente (`_ext/`) haben keine
  ehrliche Version (`no-store`).
- `DocumentDocument` hat `@Version version`, `storageId`, `lineageId`, und seit
  Phase 0 auch `updatedAt`.
- `@EnableMongoAuditing` ist im Brain aktiv (`VanceBrainApplication`),
  `SettingDocument` und `MaximegalonDocument` nutzen `@LastModifiedDate`.
- Integration-Tokens (`integration-tokens.md`): Profile als
  `IntegrationScopeProfile`-Beans (Vorbild `WebGrabScopeProfile`,
  `BackupScopeProfile`), Verbindungs-String `vancetope1.<…>` mit `brainUrl`,
  `tenant`, `profile`, `expiresAt`, optional `idleDays`; Default-Laufzeit 90
  Tage für festes Ende; Sliding-Lifetime-Profile tragen `idleDays` und werden
  per `IntegrationTokenService.extend()` (§7.6) verlängert; Widerruf
  `DELETE …/integration-tokens/{tokenId}` und Self-Revoke
  `DELETE …/integration-tokens/current` (siehe §7.4).

### 3.1 `updatedAt` am Dokument — **umgesetzt in Phase 0**

`DocumentDocument` hat `updatedAt` (Instant, `@Nullable`). Nutzen über das
Backup hinaus: die UI zeigt „zuletzt geändert" und das Backup-Tool verwendet
es als mtime der lokalen Datei-Kopie.

- **Bedeutung:** letzte *fachliche* Änderung — Inhalt oder vom User/Agenten
  gesetzte Metadaten (Titel, Tags, Farbe, Notizen, Pfad/Rename). **Nicht:**
  interne Buchführung (`summarizedAt`, `claimedAt`, `ragClaimedAt`,
  `lastDeepReviewedAt`, `mountFreshUntil`, `lastArchivedAt`).
- **Deshalb kein `@LastModifiedDate`:** Auditing feuert bei jedem `save()`,
  auch bei Buchführungs-Saves — „zuletzt geändert" wanderte dann ohne
  Zutun des Users. Gesetzt wird explizit in den Schreibpfaden des
  `DocumentService` über den privaten Helper `markChanged(doc)`.
- **Bestand:** `SchemaMigration` `Migrator_2026_10_21_001_DocumentUpdatedAt`
  setzt `updatedAt = max(createdAt, lastArchivedAt)` für Dokumente ohne Wert
  (eine Näherung, besser als leer).
- In `DocumentSummary` / `DocumentDto` als `updatedAtMs`.
- WebDAV `DavFileResource.getModifiedDate()` liefert `updatedAt` (mit
  `createdAt`-Fallback für sehr alte Rows).
- **Fürs Backup nicht der Änderungs-Detektor.** Der Abgleich läuft über
  `contentVersion` (= `storageId`): eine reine Metadaten-Änderung bumpt
  `updatedAt`, aber nicht den Inhalt, und soll keinen Download auslösen.

## 4. Werkzeug

### 4.1 Modul & Binary

- Modul `vance-liver` im Reactor `repos/vance/server/` (AGPL). Der Codename
  bleibt intern (Modul, Packages `de.mhus.vance.liver`); nach außen heißt es
  **„Vancetope Backup"** — wie foot nach außen `vancetope` heißt.
- **Eigenes Binary `vancetope-backup`**, unabhängig von foot: keine
  gemeinsame Installation, keine Weiterleitung über den `vancetope`-CLI. Liver
  läuft dort, wo kein foot installiert ist (launchd/cron, NAS).
- Abhängigkeiten: `vance-api` + Jackson 3 (`tools.jackson.*`) + JDK
  `HttpClient` + Picocli (ohne Spring-Integration). **Kein Spring, kein
  `vance-toolpack`, kein `vance-shared`.**
- **GraalVM `native-image` zurückgestellt** — Verteilung als JVM-Fat-JAR für
  v1; Native-Build ist v2.
- Distribution als Brew Cask ist eine spätere Aufräumarbeit (Q4 2026).

### 4.2 Kommandos

| Kommando | Zweck | Exit |
|---|---|---|
| `vancetope-backup init` | Erstkonfiguration interaktiv (URL, Tenant, Credentials, idleDays); mintet Backup-Token und schreibt Config | 0/2/4 |
| `vancetope-backup info` | Server-Status (Token, Policy, idleDays-Ceiling) | 0/2/4 |
| `vancetope-backup run` | Snapshot erstellen; Hardlinks vom Vorgänger; `POST /backup/runs` verlängert Token | 0/1/2/3/4 |
| `vancetope-backup list` | Snapshots unter `target/`, neueste zuerst | 0 |
| `vancetope-backup status` | Server-Sicht + lokale Sicht (letzter Snapshot, Counts, Drift) | 0/2/4 |
| `vancetope-backup verify [snapshot]` | Dateien gegen SHA-256 im Manifest prüfen | 0/1/4 |
| `vancetope-backup prune [--dry-run]` | Time-Machine-Retention (hourly/daily/weekly) | 0/2/4 |
| `vancetope-backup find <regex> [--title]` | Manifest-only Suche über alle Snapshots | 0/4 |
| `vancetope-backup history <projekt>/<pfad>` | Versionen über alle Snapshots, lineage-basiert | 0/4 |
| `vancetope-backup extract <projekt>/<pfad> [--at <id>] [--to <dir>]` | Datei aus Snapshot extrahieren | 0/2/4 |
| `vancetope-backup logout` | Token am Server widerrufen (Self-Revoke) | 0/2/4 |

Exit-Codes (planning §4.2):

- `0` ok
- `1` Teilfehler (verifiziert oder Backup mit Failures)
- `2` Anmeldung/Token abgelaufen oder widerrufen oder Policy geschlossen
- `3` Ziel nicht beschreibbar oder Lock aktiv
- `4` Config-Fehler

### 4.3 Config

```yaml
# ~/.vancetope/liver/backup.yaml  (oder --config <datei>)
server:
  url: "https://brain.example"   # komplette URL zum Brain, inkl. Schema
  tenant: acme                   # Mandant
token: "eyJhbGciOi…"             # das rohe JWT (POST /integration-tokens, profile 'backup')
# tokenFile: /secure/path/to/token   # Alternative für teilbare Configs
target: ~/VancetopeBackup
projects:
  include: ["*"]                 # Default: alles, was ich lesen darf
  exclude: ["scratch-*"]         # optional
  includeDisabled: false         # deaktivierte Projekte nur auf Anforderung (§5)
deny:                            # Globs, gelten in allen Projekten
  - "_vance/**"                  # Default-Eintrag, entfernbar
projectDeny:                     # optional pro Projekt
  wiki-alt: ["drafts/**"]
retention:
  hourly: 24
  daily: 30
  weekly: 52
notify: true                     # Systembenachrichtigung bei Fehlschlag/Token-Ablauf
```

**Wichtig (Abweichung vom ursprünglichen Plan):** Die frühere Skizze
`connection: vancetope1.<host>/<tenant>/<profile>/<token>` ist **nicht
das Wire-Format** des Werkzeugs. Das Tool erwartet drei explizite Felder
(`server.url`, `server.tenant`, `token`), weil der Plan-Placeholder das
Schema auf `https` festgenagelt und Host/Tenant vermischt hätte. Dev-Brain
auf `http://localhost:9991` ist damit ohne Heuristik möglich.

`tokenFile` ist die Alternative zu `token`: liest das JWT aus einer Datei,
damit eine team-shared Config ohne Secret verteilt werden kann.

### 4.4 Ablage auf der Platte

```
<target>/<tenant>/
  2026-10-21T09-30-00Z/
    manifest.json
    entries.jsonl
    projects/<project>/<pfad…>
  2026-10-21T10-30-00Z/ …
  .in-progress-2026-10-21T11-30-00Z/     ← laufender Snapshot
  LATEST                                  ← Textdatei mit dem Namen des letzten vollständigen Snapshots
  .lock
```

- **Atomar:** geschrieben wird in `.in-progress-…`; erst nach erfolgreichem
  Abschluss Umbenennung in den Zeitstempel und Aktualisieren von `LATEST`.
- `LATEST` ist eine Datei, kein Symlink (Windows-kompatibel).
- `.lock` (Datei-Lock): ein Lauf pro Ziel.
- **Hardlinks** pro Datei mit Fallback auf Kopie (per-Datei-Entscheidung,
  siehe §4.4-Logik in `../../../../planning/archive/user-backup.md` §4.4). Speziell:
  Netzlaufwerke mit Link-Limit (NTFS 1023, ext4 65000) und exFAT/FAT sind
  unterstützt.

### 4.5 Pfad-Abbildung

- **Groß/Klein:** APFS und NTFS sind case-insensitiv. `Notes.md` und
  `notes.md` kollidieren. Kollision → Suffix `notes~2.md`; Manifest hält die
  Zuordnung.
- **Unzulässige Zeichen/Namen** (Windows: `<>:"|?*`, `CON`, `NUL`,
  abschließender Punkt/Leerzeichen) → Prozent-Escaping.
- **Datei vs. Ordner:** ein Dokument `a` neben Dokumenten unter `a/…` →
  das Dokument wird `a~doc` abgelegt.
- **mtime:** jede geschriebene Datei bekommt `updatedAt` des Dokuments als
  mtime — Finder/Explorer sortieren dann nach echter letzter Änderung.

### 4.6 Manifest

`manifest.json` (Kopf):

```json
{
  "format": 1,
  "tool": "vancetope-backup 0.3.0",
  "server": "https://eddie.mhus.de",
  "tenant": "acme",
  "user": "mike",
  "startedAt": "2026-10-21T09:30:00Z",
  "finishedAt": "2026-10-21T09:31:12Z",
  "filter": { "projects": {…}, "deny": [...], "projectDeny": {…} },
  "filterHash": "sha256:…",
  "counts": { "documents": 1234, "downloaded": 17, "linked": 1217, "copied": 2, "failed": 0 },
  "bytes": { "total": 52100000, "downloaded": 210000 }
}
```

`entries.jsonl` (eine Zeile pro Dokument, JSON Lines):

```json
{"project":"wiki","path":"notes/idee.md","file":"projects/wiki/notes/idee.md","id":"…","lineageId":"…","kind":"markdown","title":"Idee","mimeType":"text/markdown","size":2048,"createdAt":"…","updatedAt":"…","contentVersion":"…","sha256":"…","encrypted":false,"stored":"linked"}
```

Felder, die der Client setzt: `file`, `sha256`, `stored` (downloaded /
linked / failed). Server-seitige Felder: alles andere.

### 4.7 Ablauf eines Laufs

1. Config + `.lock`; `GET …/backup/info` → Policy-Status und aktuelles
   Token-Ende.
2. `POST …/backup/projects` mit dem Projekt-Filter → lesbare Projekte.
3. Pro Projekt `POST …/backup/projects/{project}/entries` mit Deny-Liste,
   seitenweise (Cursor) → Metadaten inkl. `contentVersion`.
4. Abgleich mit dem Vorgänger-Manifest (Index `contentVersion → file`):
   gleich → Hardlink oder Kopie; neu/geändert → `GET …/backup/documents/{id}/content`.
   Mit `If-None-Match: <etag>` → 304 Not Modified, der Hardlink gewinnt.
5. Einzelfehler (404 = inzwischen gelöscht, 5xx) → im Manifest als `failed`,
   Lauf läuft weiter, Exit 1. 401/403 auf Token-Ebene → Abbruch, Exit 2.
6. Abschluss: Manifest schreiben, umbenennen, `LATEST`, dann Ausdünnen.
7. `POST …/backup/runs` (Lauf-Zusammenfassung) — **verlängert den Token**
   (§7.6). Nur nach erfolgreichem Abschluss.

### 4.8 Ausdünnen

Wie Time Machine: alle Snapshots der letzten 24 h, danach einer pro Tag für
30 Tage, danach einer pro Woche. Gelöscht wird nur ganze Snapshot-Ordner;
geteilte Dateien bleiben durch Hardlinks in den übrigen Snapshots erhalten.

### 4.9 In der Zeit zurückgehen

`history <projekt>/<pfad>`, `find <muster>`, `extract <projekt>/<pfad> [--at <zeit>]`.
Arbeiten **nur lokal** auf den Manifesten, ohne Server, ohne Token. Manifeste
werden beim ersten Aufruf in einen `.index` (verwerfbar) gecacht.

## 5. Umfang

- **Projekte:** alle lesbaren aus `ProjectService.listReadableBy` (inklusive
  Hub), dann `projects.include/exclude`. Standard ist „deaktivierte raus".
- **Deaktivierte Projekte** nur auf ausdrückliche Anforderung: exakter Name
  in `include` oder `includeDisabled: true`.
- **Dokumente:** lebende Dokumente des Projekts.
- **Immer ausgeschlossen** (serverseitig, nicht konfigurierbar):
  `_ext/`-Mounts, Trash, Archiv-Versionen (`document_archives`).
- **Per Default ausgeschlossen:** `_vance/**` (entfernbar).
- Inhalt wird **roh** gesichert — kein Rendern, kein Export.
- **Metadaten gehen verloren — akzeptiert.** Notizen, Farben, Tags,
  Lock-State und Ähnliches leben am Dokument, nicht im Inhalt. Manifest trägt
  nur Pfad, Titel, Kind, Zeitstempel, Version.

## 6. Server-Fläche — **umgesetzt in Phase 1**

Alle Endpunkte unter `/brain/{tenant}/backup/…`. Auth läuft über
`IntegrationTokenAuthService` + `NarrowedCredentialCheck` mit Profil `backup`.

### 6.1 Endpunkte

| Route | Zweck | Body / Antwort |
|---|---|---|
| `GET  /backup/info` | Policy-Status für den Aufrufer, aktuelles Token-Ende, Server-Version, `format`, `idleDaysCeiling`, `allowedSurfaces` | `BackupInfoResponse` |
| `POST /backup/projects` | Filter (include/exclude Globs, `includeDisabled`) → lesbare Projekte | `BackupProjectsRequest` / `BackupProjectsResponse` |
| `POST /backup/projects/{project}/entries` | Deny-Globs + Cursor + Size → Seite von `BackupEntryDto` mit `nextCursor` | `BackupEntriesRequest` / `BackupEntriesResponse` |
| `GET  /backup/documents/{id}/content` | Inhalt streamen, ETag = `contentVersion` (`storageId` oder `id` für Inline/Leer) | `InputStreamResource`, unterstützt `If-None-Match` → 304 |
| `POST /backup/runs` | Lauf-Zusammenfassung; **verlängert den Token** (§7.6) | `BackupRunsRequest` / `BackupRunsResponse` |

- **POST für Listen**: Filter-Body wäre in der Query-String unhandlich und
  landet in Access-Logs (Globs enthalten Pfade!).
- `entries` paginiert per **Cursor** (stabile Sortierung nach `_id`),
  nicht per Seitennummer.
- Eigene Routen statt Wiederverwendung von `/documents/…`: die Fläche des
  Profils bleibt klein und eindeutig, das Policy-Gate hängt an genau einem
  Controller.
- Token-Identität auf `/backup/runs` kommt aus den verifizierten Claims,
  nie aus dem Body.

### 6.2 `BackupEntryDto`

Felder: `id`, `projectId`, `path`, `lineageId`, `kind`, `title`, `mimeType`,
`size`, `createdAtMs`, `updatedAtMs`, `contentVersion`, `encrypted`,
`snapshotDenyPatterns` (client-only), `stored` (client-only).

- `contentVersion` = `storageId` (für storage-backed) oder `id` (für
  Inline/Leer) — dieselbe Regel wie `DocumentController.contentEtag`.
- `encrypted` aus der Armor-Erkennung (`AgeDocumentKind.isAgeEncrypted`).
- `@GenerateTypeScript("backup")` aktiv (Phase-3-Face-Client profitiert).
  *Abweichung vom Plan: der Plan sagte „nicht nötig", aber die
  Annotation ist günstig und öffnet die Tür für eine künftige Web-UI-
  Anbindung, ohne den Vertrag zu ändern.*

### 6.3 Filter serverseitig

`DocumentService.listBackupPage(tenant, project, denyGlobs, cursor, size)`:

- **Zwei-stufige Filterung:** Präfix-only-Globs (`_vance/**`,
  `drafts/**`) werden in einen Mongo-Pfad-Regex übersetzt und am Index
  gefiltert. Globs mit intra-segment `*` oder `?` werden post-fetch über
  dieselbe `PathGlob`-Implementierung gefiltert.
- **Trash + Mounts** (`_ext/`) immer ausgeschlossen.
- Default-Deny `_vance/**`, vom Client entfernbar.
- Der Client wendet denselben Filter zusätzlich an — defence-in-depth.

### 6.4 Verschlüsselte Dokumente

Werden als Ciphertext (age-Armor) gesichert, 1:1 wie gespeichert. Das
Manifest markiert sie (`encrypted: true`). Entschlüsseln kann der User lokal
mit seinem Schlüssel (`age`-CLI oder Vancetope-Werkzeuge).

## 7. Anmeldung & Sicherheit — **umgesetzt in Phase 1**

### 7.1 Profil `backup` — `BackupScopeProfile`

```java
@Component
public class BackupScopeProfile implements IntegrationScopeProfile {
    public String id()       { return "backup"; }
    public String label()    { return "Back up all your documents (read-only)"; }
    public List<IntegrationSurface> surfaces() {
        return List.of(
            IntegrationSurface.of("GET",  "/backup/info"),
            IntegrationSurface.of("POST", "/backup/projects"),
            IntegrationSurface.of("POST", "/backup/projects/*/entries"),
            IntegrationSurface.of("GET",  "/backup/documents/*/content"),
            IntegrationSurface.of("POST", "/backup/runs"));
    }
    public boolean requiresProject()  { return false; }   // tenant-wide
    public boolean slidingLifetime()  { return true; }    // sliding
}
```

- `requiresProject() = false`: das Tool liest aus jedem Projekt, nicht aus
  einem gepinnten.
- `slidingLifetime() = true`: jeder erfolgreiche `POST /backup/runs`
  verlängert den Token.

### 7.2 Mandanten-Policy — `BackupAccessService`

`_tenant/_vance/config/backup-access.yaml`:

```yaml
enabled: true          # Default, wenn die Datei fehlt — Backup ist erlaubt
users: []              # leer = jeder; sonst nur diese Accounts
idleDays: 90           # Leerlauf-Frist: Decke für idleDays des Tokens
```

- **Default erlaubt** (Datei fehlt → `enabled: true`). Begründung: Lesen geht
  ohnehin über REST/WebDAV mit dem Passwort; ein Default-Verbot schützt nichts,
  es verhindert nur das Backup. Ein Unternehmens-Tenant schließt den Schalter.
- **Fail-Closed** bei Parse-Fehler mit WARN-Log. Wer die Datei anlegt, will
  etwas einschränken, ein Tippfehler darf das nicht in „alles offen" verkehren.
- Geprüft beim **Minten** (Profil `backup` + gewählte `idleDays ≤
  idleDays`-Ceiling) und bei **jedem Request** an `/backup/**` (gecached
  mit 30 s TTL, invalidiert per `RoutedDocumentChangedEvent` auf der
  Config-Pfad).
- `BackupAccessConfig.admits(username)` ist die einzige Authorisierungs-
  Entscheidung; `effectiveIdleDaysCeiling()` clampet auf das globale Max
  (365 Tage, gleiches Maximum wie `IntegrationTokenController.MAX_EXPIRES_IN_DAYS`).

### 7.3 Keine Einzel-Freigaben als Dokument

Erwogen: ein Dokument im `_tenant`/`_user_*` mit Token-Hashes als Freigabe.
**Verworfen** aus drei Gründen:

1. **Zwei Quellen der Wahrheit** — die Registry `integration_tokens`
   (`jti`, `revokedAt`) trägt die Lebendigkeit; ein zweites Dokument
   erzeugt Widersprüche.
2. **Widerruf muss endgültig sein.** `revokedAt` fällt nie zurück auf
   `null`. „Zeile gelöscht" ließe sich durch Wiedereinfügen rückgängig
   machen.
3. **Dokumente haben viele Schreiber** — Agenten, WebDAV, Kit-Updates.
   Ein per Prompt-Injection gesteuerter Agent darf nie einen widerrufenen
   Backup-Token wiederbeleben.

### 7.4 Selbst-Widerruf: `DELETE /brain/{tenant}/integration-tokens/current`

Widerruft genau den Integration-Token, mit dem der Request kommt (`jti` des
Aufrufers). Anderer Credential-Typ (ACCESS, OAuth) → 400.

**Auth-Pfad:** dokumentierte Ausnahme in `NarrowedCredentialCheck` für
`INTEGRATION`-Tokens auf `DELETE /integration-tokens/current` — kein
„self-revoke"-Profil nötig. Begründung: Profile stehen seit dem Minten
fest im `scp`-Claim; ein Pseudo-Profil, das jeder Token implizit trägt,
weicht die Regel auf, dass ein Profil genau das ist, was beim Minten
gewählt wurde. Die Ausnahme spiegelt OAuths `POST revoke` (für jeden
Client offen).

Schlimmster Fall: ein Dieb widerruft den gestohlenen Token — Backup
stoppt, was ohnehin die richtige Folge ist. Audit (`auth.integration-
token.revoke`) wird mit Vermerk `self` emittiert.

### 7.5 Minten & Sichtbarkeit

- **Ort des Minzens** (Regel „Minten nur am Ort des Bedarfs"): ein
  Abschnitt „Backup-Zugang erstellen" in den User-Einstellungen bzw. auf
  `connected-accounts.html` — Leerlauf-Frist wählbar, Verbindungs-String
  **einmal** zum Kopieren.
- **Warnung beim Minten**: „Dieser Zugang kann alle deine Dokumente
  lesen. Gib ihn nur in Vancetope Backup ein — niemals in eine Website
  oder eine fremde App."
- **Sichtbarkeit statt Vertrauen**: „Apps mit Zugriff" zeigt
  Backup-Tokens mit `lastUsedAt`, **letzter IP** (Feld auf
  `IntegrationTokenDocument`, gesetzt im selben lazy-`$set` wie
  `lastUsedAt` beim Liveness-Check), und dem letzten Lauf (Dokumente,
  Bytes, Zeitpunkt — aus `POST /backup/runs`, als „vom Client gemeldet"
  beschriftet). Fremdnutzung fällt dort auf.

### 7.6 Gleitende Laufzeit — `IntegrationTokenService.extend()`

Ein Backup-Token lebt, **solange Backups passieren**: jeder erfolgreiche
Lauf setzt das Ende auf `now + idleDays` (Default 90 Tage). Kommt 90 Tage
kein Backup, ist der Token tot und muss neu gemintet werden.

**Felder am Dokument:**
- `idleDays` (Integer, gesetzt beim Mint, nur für gleitende Tokens)
- `lastUsedAt` (Instant, lazy geschrieben — siehe `IntegrationTokenService`)
- `lastUsedIp` (String, aus `X-Forwarded-For`/RemoteAddr, beim selben
  `$set` wie `lastUsedAt`)

**Umsetzung — ohne Token-Rotation:**

- Verbindungs-String bleibt **derselbe**.
- Das JWT eines gleitenden Tokens trägt **kein `exp`**. Die Lebendigkeit
  steht allein in der Registry-Zeile: `IntegrationTokenService` prüft
  `expiresAt` dort schon heute zusätzlich zur Signatur.
- `IntegrationTokenService.extend(tokenId)`: **ein** atomares `$set` auf
  `expiresAt = now + idleDays`, bedingt auf `revokedAt == null` **und**
  `expiresAt > now` — ein abgelaufener oder widerrufener Token kann nicht
  wiederbelebt werden. Lokale Cache-Eviction, damit der nächste
  `isActive()` die neue Expiry sofort sieht.
- Verlängert wird **nur** durch `POST /backup/runs` mit `succeeded=true` —
  nicht durch jeden Request, sonst hielte ein Tool, das nur `status`
  fragt, den Token am Leben ohne zu sichern.
- Gleitend ist eine Eigenschaft des Profils
  (`IntegrationScopeProfile.slidingLifetime()`, Default `false`); andere
  Profile bleiben beim festen Ende.

**Im Tool:** `status` und jeder Lauf zeigen „Zugang gültig bis …". Warnung,
wenn das Ende näher als 14 Tage ist.

### 7.7 Bedrohungsbild

Der Token ist ein „Export-alles"-Ausweis — Lesen auf alles, was der User
sieht, ungepinnt, sliding lifetime, unbeaufsichtigt außer Haus.
Hauptrisiko: **Phishing / falsche Backup-App**. Diebstahl von der Platte
ist zweitrangig (dort liegt das Backup selbst). Ein Insider kann heute
schon alles über REST/WebDAV lesen; neu ist nur „dauerhaft und
unbeaufsichtigt". Daraus die Leitplanken §7.2, §7.4, §7.5.

## 8. Phasen — **Stand**

| # | Phase | Status | Commit-Reihe |
|---|---|---|---|
| 0 | `updatedAt`-Feld + Migration + Schreibpfade | ✅ umgesetzt | `e95623506`, `7448b4036`, `2d995425b` |
| 1 | Server-Basis (PathGlob, idleDays, lastUsedIp, sliding lifetime, BackupController, Mandanten-Policy, Self-Revoke) | ✅ umgesetzt | `f5fd72835` … `4631e55ca` |
| 2 | Tool `vance-liver` (JVM-Modul, CLI, Hardlink-Logik, Manifest, Ausdünnen, `find`/`history`/`extract`) | ✅ umgesetzt | `551aa602e` … `9cb46abd5` |
| 3 | Face-UI für Token-Minten, „Apps mit Zugriff"-Erweiterung | ✅ umgesetzt | `31a6ba323`, `47c3339e6`, `2ce220250`, `8aad2dced` |
| 4 | Native-Build, Schedule-Integration, Systembenachrichtigungen | ⏳ v2 (Native zurückgestellt) | — |

Live-Verifikation am 22.10.2026:
  1. `info` über `http://localhost:9991` mit Backup-Token: 5 Surfaces, idleDays-Ceiling 90 (Policy-clamped).
  2. `run` 1: 1689 Dokumente, 36 MB heruntergeladen, 16 s.
  3. `run` 2 (Hardlinks): 1689 Dokumente, 0 Bytes, gleiche Inodes verifiziert (`stat -f '%i'`).
  4. Token automatisch von 2026-10-29 → 2026-11-21 verlängert (sliding lifetime funktioniert).
  5. **Phase 3 — End-to-End durch UI**: Header → „Apps with access" → BackupTokenSection
     → Mint mit `label=phase-3-final`, `idleDays=30`. Token im Browser kopiert,
     in `~/.vancetope/liver/backup.yaml` gepastet. `vancetope-backup run` läuft
     durch (1689 Dokumente), danach listet die verbundene-App-Ansicht denselben
     Token mit `lastUsedAt` + `lastUsedIp` + Sliding-Badge. Vollständiger
     User-Loop ohne Copy-Paste aus dem Terminal.

## 9. Sicherheit — Pflicht-Tests

Live-Status der Tests (Mock-basiert, mocken NICHT die Policy — die wird im
Integration-Test verifiziert, sobald die Testcontainers-Lane freigeschaltet
ist; siehe §12):

- ✅ Backup-Token ohne Pin wird akzeptiert; mit Pin → Mint 400.
- ✅ Backup-Token erreicht **nur** die deklarierten Flächen
  (`/documents/…`, `/ws`, Schreib-Routen → 403). Gepinnt durch
  `IntegrationSurface`-Matching + `NarrowedCredentialCheck`.
- ✅ Policy `enabled: false` → Mint abgelehnt **und** bestehender Token an
  `/backup/**` abgewiesen. `users`-Liste greift. `idleDays > Decke` →
  Mint 400.
- ✅ Gleitende Laufzeit: `backup/runs` verlängert; andere Requests
  verlängern nicht; abgelaufener oder widerrufener Token wird durch
  `extend` **nicht** wiederbelebt; Profil ohne `slidingLifetime()` wird
  nie verlängert.
- ✅ Deaktivierte Projekte: `*` liefert sie nicht; exakter Name oder
  `includeDisabled` liefert sie.
- ✅ Self-Revoke: `integration-tokens/current` widerruft nur den eigenen
  Token; mit ACCESS-Token → 400; ein widerrufener Token kann sich nicht
  wieder beleben.
- ✅ `entries` liefert nie `_ext/`, Trash oder Projekte ohne READ; Deny-Globs
  wirken (Präfix- und Nicht-Präfix-Fall).
- ✅ `content` auf ein Dokument ohne READ → 404/403 wie `DocumentController`.

## 10. Betroffene Stellen

**vance-api**
- `de.mhus.vance.api.util.PathGlob` — geteilter Glob-Matcher
- `de.mhus.vance.api.access.IntegrationTokenCreateRequest` — neues Feld
  `idleDays`
- `de.mhus.vance.api.backup.*` — DTOs (`BackupInfoResponse`,
  `BackupProjectsRequest/Response`, `BackupEntriesRequest/Response`,
  `BackupRunsRequest/Response`, `BackupProjectDto`, `BackupEntryDto`,
  `Stored`)

**vance-shared**
- `DocumentDocument.updatedAt` + `Migrator_2026_10_21_001_DocumentUpdatedAt`
- `DocumentService.markChanged(doc)` + Aufrufe in create/replaceContent/
  update/trash/restore/setLockedFor; `DocumentService.listBackupPage`
- `IntegrationTokenDocument.idleDays`, `lastUsedIp`
- `IntegrationTokenService.extend(tokenId)`, `isActive(..., clientIp)`-
  Overload
- `IntegrationTokenService.create(..., idleDays)`-Parameter

**vance-brain**
- `IntegrationScopeProfile.slidingLifetime()` (default false)
- `NarrowedCredentialCheck` — Self-Revoke-Ausnahme (`INTEGRATION` + `DELETE`
  + `/integration-tokens/current`)
- `IntegrationTokenController.revokeCurrent()`,
  `IntegrationTokenController.create(..., idleDays)`-Propagierung
- `IntegrationTokenAuthService.clientIp(request)` — IP-Extraktion
- `backup.BackupAccessConfig` + `backup.BackupAccessService`
- `backup.BackupScopeProfile` (`backup`-Profil)
- `backup.BackupController` (5 Routen)
- `document.WebDav.AbstractDavResource` (Javadoc-Klarstellung) +
  `DavFileResource.getModifiedDate()` benutzt `updatedAt`
- face: `DocumentExplorerApp.vue` „Modified"-Spalte, `i18n/en.ts`
  `explorer.colUpdated`

## 11. Später

- **Phase 3 — Face-UI**: Token-Minten aus dem User-Settings-Dialog
  (kein Copy-Paste aus init), „Apps mit Zugriff"-Erweiterung mit
  IP-Sichtbarkeit pro Token (das `lastUsedIp`-Feld gibt es schon, die
  Anzeige fehlt).
- **`vancetope-backup browse`**: interaktive Zeitleiste (TUI im Terminal oder
  lokale Web-Seite auf Loopback) — Dokument wählen, Versionen durchblättern,
  Vorschau, `extract` per Tastendruck. Baut auf den Manifest-Index auf.
- OAuth-Tür `backup` auf demselben Profil (Desktop-Login ohne Copy-Paste).
- Benachrichtigung bei Nutzung von neuer IP.
- **GraalVM native-image** für `vancetope-backup` (v2). Native-Build ist eine
  reine Verteilungs-Optimierung, ändert das Tool-Interface nicht.
- Delta-Listing für sehr große Tenants: geänderte Einträge seit einem
  Server-Wasserzeichen + reine ID-Liste für Löschungen.
- Streaming write+hash (v1 puffert die ganze Datei im Speicher).
- ETag gegen den vorherigen Snapshot-Inhalt — verhindert den Download
  identischer Dateien bei *jedem* Lauf.
- `updatedBy` analog zu `createdBy` („zuletzt geändert von" in der UI).
- Optionales lokales Entschlüsseln (`vance-age`) in eine getrennte Ablage.
- Archiv-Versionen mitsichern (nur falls Bedarf entsteht — die Snapshots
  decken die Historie ab Beginn des Backups ab).
- **Testcontainers-Integrationstest** für die BackupController-Routen +
  Policy-Gate — opt-in gemäß `agent/build-test.md` „MongoDB-Integrationstests
  sind opt-in".
- **Distribution als Brew Cask**: liver + foot im gleichen Cask, mit
  Wrapper-Script `vancetope-backup` (analog zu `wb`).
- **Server-Bug-Fix** (Nachfolge-Commit auf der Server-Seite):
  `DocumentService.listBackupPage` muss einen leeren Cursor als
  „erste Seite" behandeln, nicht `new ObjectId("")` aufrufen. Aktuell
  umgeht liver das durch das Weglassen des `cursor`-Feldes; der Server
  sollte robust gegen beide Varianten sein.

- **Sliding-Lifetime-Rechnung kürzer als erwartet** (Beobachtung 22.10.2026):
  Ein Token mit `idleDays=30` und 7-Tage-`expiresInDays` wurde nach dem ersten
  `run` mit einem neuen Expiry von +23 Tagen verlängert — nicht +30.
  `IntegrationTokenService.extend()` rechnet `now + idleDays` für die neue
  Expiry, aber der Effekt deutet auf `now + idleDays - existingExpiresInDays`
  (oder einen ähnlichen Bug). Phase-1-Verhalten, nicht Phase-3 — gehört in
  einen Phase-1-Nachfolge-Commit. Aktuell harmlos, weil `+23d` immer noch
  weiter in der Zukunft liegt als `+7d`; aber die UI-Anzeige
  „renews on use ({days}d idle)" sollte korrekt sein, sonst versteht der
  Operator seine Token-Lebenszeit nicht.

## 12. Offene Fragen / Abweichungen vom Plan

**Abweichungen:**
- **Native-Build** ist v2 (war im Plan Phase 4). Verteilung als JVM-Fat-JAR
  reicht für v1.
- **`lastUsedIp`** ist eigener Commit (Feld + Write-Path zusammen), getrennt
  vom Sliding-Lifetime-Commit. Grund: ein Feld ohne Schreiber wäre toter
  Code.
- **Self-Revoke** ohne Pseudo-Profil, als dokumentierte Ausnahme in
  `NarrowedCredentialCheck`. Grund: ein Profil, das jeder Token implizit
  mitträgt, weicht die Regel auf, dass ein Profil genau das ist, was beim
  Minten gewählt wurde.
- **`BackupAccessConfig`**: Default-Allow bei fehlender Datei
  (anders als `McpGlobalAccessService`, das fail-closed bei fehlender Datei
  ist). Begründung: wer Backup einschränken will, schreibt die Datei; ein
  Tippfehler darf nicht in „alles offen" verkehren.
- **`@GenerateTypeScript("backup")`** an den Backup-DTOs (Plan sagte
  „nicht nötig"). Annotation ist günstig und öffnet die Tür für eine
  künftige Face-Anbindung, ohne den Vertrag zu ändern.
- **Connection-String-Format**: Der ursprüngliche Plan-Skizze
  `connection: vancetope1.<host>/<tenant>/<profile>/<token>` wurde
  ersetzt durch drei explizite Felder (`server.url`, `server.tenant`,
  `token`). Begründung: das Platzhalter-Format hätte das Schema auf
  `https` festgenagelt und Host/Tenant vermischt; explizite Felder
  lassen Dev-Brain auf `http://localhost:9991` ohne Heuristik zu.
- **`idleDays`-Default**: Plan §7.6 schlug 90 Tage vor; die Policy
  kann diesen Wert über `backup-access.yaml.idleDays` enger setzen.
  Tatsächlich-Wert für `road.runner@acme`: 90 Tage (= Policy-Wert,
  nicht das absolute Maximum 365).

**Offene Punkte:**
- Testcontainers-basierter Integration-Test für `BackupController` —
  opt-in, weil der Plan explizit als Test-Driven ausgelegt ist, aber die
  CI-Lane dafür erst freigeschaltet werden muss.
- Face-UI für „Backup-Zugang erstellen" (Phase 3) — kein Server-Code
  nötig, reines Form-Routing gegen die existierende `POST
  /integration-tokens`.
- Server-Bug in `DocumentService.listBackupPage`: ein leerer
  Cursor-String führt zu `new ObjectId("")` und IllegalArgumentException.
  Liver umgeht das aktuell durch das Weglassen des `cursor`-Feldes bei
  der ersten Seite; der Server sollte den ersten Seite-Pfad ohne
  Cursor-Param sauber handhaben.
