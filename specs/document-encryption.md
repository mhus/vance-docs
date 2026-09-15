---
title: "Vancetope — Document Encryption (age)"
parent: Specs
permalink: /specs/document-encryption
---

<!-- AUTO-GENERATED from llm/specification/document-encryption.md (translated from the German specification/public/document-encryption.md) — do not edit here. -->

# Vancetope — Document Encryption (age)

> Documents whose content the server **never sees in plaintext**. A file `report.md.age` stores only armored age ciphertext; encryption and decryption occur entirely on the client (Web UI for editing, Foot for viewing, standard `age`-CLI everywhere else). The key remains with the user. age is the **second** barrier on content — the server ACL remains the first.
>
> See also: [document-lock](/specs/document-lock) | [document-versioning](/specs/document-versioning) | [documents-channel](/specs/documents-channel) | [webdav](/specs/webdav) | [server-tools](/specs/server-tools)

---

## 1. Purpose & Scope

**Problem.** Backups, Mongo admin access, WebDAV sync targets, LLM context, RAG index: many places see document content that only the owner should read. Permission barriers (Tenant/Project/Permission) regulate *who accesses at all* — here, the focus is on *even the server does not see the content*.

**Solution.** An `age` document kind exclusively carries ciphertext. The server manages metadata and bytes without being able to interpret or open them. Clients decrypt locally: the Web UI opens the normal editor *inside* the ciphertext, Foot displays the plaintext, and a file pulled via WebDAV is a valid age file for `age -d`.

**Threat Model — what it protects:** Content at rest (server, Mongo, backups, admin access, WebDAV consumers without a key, LLM tools/summary/RAG — the latter by exclusion, see §4).

**What it does not protect:** a compromised client (plaintext is in the editor — inherent), metadata (path, title; the double extension reveals the inner type — intentional, otherwise unusable), availability (the server can delete ciphertext), transport (TLS responsibility).

**Distinction from [Document-Lock](/specs/document-lock):** the lock prevents *accidents* (soft lock, crypto-free). Age makes content inaccessible *to the server* — whoever has the key still writes normally.

## 2. Format

[age v1](https://age-encryption.org/v1) (C2SP), exclusively the **armored** text format:

```
-----BEGIN AGE ENCRYPTED FILE-----
YWdlLWVuY3J5cHRpb24ub3JnL3YxCi0+IF...
...
-----END AGE ENCRYPTED FILE-----
```

**Why armored instead of binary format.** The ciphertext passes through the same text seams as any document body: `/content` endpoints, version archives, diff, WebDAV. PEM-like text works there without modification — and is the only form in which a file synchronized via WebDAV remains directly usable for `age -d`. The ~35% Base64 overhead is irrelevant for text documents.

**Standard v1 scope:** X25519 recipients (`age1…`) and scrypt passphrases (workfactor 18). Deliberately excluded: ssh stanzas and typage extras (WebAuthn passkeys, post-quantum) — both are not in the standard format, breaking CLI interop.

**Interop is a design feature:** the reference Go CLI generates the checked-in test fixtures, and the TS and Java implementations must read them (and the reverse direction via `age -d`). A Vance-encrypted document is a normal age file outside of Vance.

## 3. Data Model

The triad **kind `age` — MIME `application/age+armored` — extension `.age`**. The MIME is our own choice (nothing registered); it only needs to be consistent everywhere. All three markers are derived from each other: extension → MIME (upload/WebDAV mapping), MIME → kind (header application), extension appending is enforced by the `doc_encrypt` tool path.

**Body** is the armored ciphertext as bytes in the StorageService — exactly like any other text body. `GET/PUT /documents/{id}/content` unchanged.

**Server Invariant — Armor Form Guard.** A document with `kind: age` stores *only* armored ciphertext. Every write path (`create` with stream peek at the first line, `replaceContent`, `update`, `replaceBinaryContent`) rejects plaintext with a named `AgeContentException` (REST: 400, WebDAV upload as well as Content-PUT). This is the one rule that allows any reader to trust the body without a key roundtrip — and the classic data loss path (plaintext saved over `secret.md.age`) ends in a named error instead of silent destruction of the ciphertext.

**Inner Type.** The double extension (`report.md.age`) is the *hint* to the inner type — not a mandatory field. The inner type is definitively recognized only by the client, after decryption, via normal kind sniffing on the plaintext (front-matter `$meta.kind` etc. — all existing, unchanged). The server knows nothing about the inner type. Regression tests ensure that the armor header is not misinterpreted as front-matter.

**Kind Mirror Skip.** Other kinds mirror their kind from the body header into the Document field. An age body cannot declare its kind — without a skip, every save would set the field to `null`. Skip criterion: Age MIME or set kind `age`.

## 4. Server Behavior — Management Without Crypto

The server **does not encrypt or decrypt anything** and does not see any crypto decisions: it stores, versions, moves, serves bytes. This is an architectural statement, not convenience — if the key were on the server, the feature would only protect against DB reads, not against the server.

Content-reading server features **named** exclude age-Docs:

| Feature | Behavior |
|---|---|
| `autoSummary` | excluded based on MIME |
| RAG (`ragEnabled`, Claim-Queries) | excluded (Jaglan pattern: not reachable via flag) |
| `doc_read` / `doc_read_lines` / `doc_concat` / `doc_grep` / `foreign_doc_read` | named refusal: "age-encrypted, plaintext exists only in the user's client; open in the Web UI" |
| `doc_grep_path` / `rag_add_path` | silently skipped + descriptive hint |
| `doc_write` / `doc_edit` / `doc_append` / `doc_replace_lines` | refuse — the Agent could only destroy ciphertext with plaintext |
| `doc_create_kind` with `kind: age` | refused (model-generated body would be plaintext); *passing through* actual armored bytes via `doc_write` is allowed (workspace copy) |
| `doc_info` | `statsUnavailable` instead of lines/words over ciphertext |

**Unchanged functionality** (all merely copy bytes): Version archives, Trash, Rename, Move, Copy, WebDAV delivery (delivers ciphertext — feature: `age -d` locally), path/title search (reads metadata). Embeds (Chat embeds, Canvas Doc Nodes, Binder) only show an "encrypted" card — no decrypt in external renderers.

## 5. Clients

### 5.1 Web UI (Cortex)

**Age is a content transform, not a separate editor.** Opening: load content → dearmor → decrypt (session key) → recognize inner type → the tab model carries the *inner* kind/mime → normal binding resolution. A decrypted Markdown opens the code editor with preview, a workpage opens the block editor. Without a key: locked view (`AgeDocumentView`) with cipher preview and unlock form; only the *locked* state goes through the Kind Registry (serving Cortex and Embeds with one entry).

**Key Store** (Pinia, **memory only**): multiple identities and passphrases in parallel; all are tried during decryption; the matching one is remembered for re-encryption. Identities before passphrases (X25519 is milliseconds, scrypt is intentionally ~1s CPU per encryption). No localStorage — re-import after reload, that is the conscious price. The key never leaves the browser.

**Manual Save.** Every save generates completely new ciphertext — a 3-way merge over ciphertext would be a merge over noise. Therefore: **no autosave** for age tabs, save explicitly (🔐-button, Ctrl+S, File→Save). The `documents` channel remains subscribed: changed on clean tab → silent reload + re-decrypt; on dirty → banner ("discard & reload" vs. "save own version"); If-Match-409 as race fallback. Run controls and JS tool actions are hidden (the backend loads the body server-side = ciphertext).

**Actions → Encrypt / Decrypt** — the permanent conversion: `text.md` ⇄ `text.md.age`, **new file in the same folder, the original remains untouched** (v1; cleanup is up to the user). Encrypt encrypts to the session identities — without a key, the dialog is the first point of contact: paste, **generate (download keygen file — without it, the document cannot be read later)** or passphrase (with cost hint). Decrypt requires the key like any reader. Target occupied → Server-409 as a clear message. Creating a new age document = writing a document + encrypt; no separate scaffold.

### 5.2 Foot

`/ui-documents` → View: age-Docs decrypt before display — passphrase (masked prompt) or identity file (default path from setting `vance.age.identity-file`; all `AGE-SECRET-KEY-1` lines are tried, like `age -i`). Wrong key → dialog + retry, cancel ends without change. **Download remains encrypted** — the downloaded file is a valid age file. Foot never writes encrypted content (no encrypt in v1).

### 5.3 Agent Tool `doc_encrypt`

A tool, two modes like `doc_write`: `fromPath` (existing plaintext document) or `content` (generated text) — plus `recipients`.

- **`recipients` are raw `age1…` public keys** — public keys are chat-safe, the user pastes them into the conversation. **Never passphrases as tool parameters**: they would end up in history and session memory. Passphrase encryption remains a human task (Web UI dialog).
- `toPath` defaults to `<fromPath>.age`; missing extension is appended (the extension↔MIME↔kind triad is preserved).
- Source remains untouched; age-encrypted source → clear refusal (re-encrypt would require the private key, which only the user has).
- Target is **never overwritten** — the agent cannot check what it would destroy; 409 with a hint to change.
- Metadata: `primary=false`, `deferred=true` — only appears in the manifest when needed. Manual `age-encryption` (triggers + the guiding rules: private key never leaves the user, passphrase never in chat, where the recipient comes from) linked via `manual_read`.

## 6. Key Management

| Location | Lifespan | Purpose |
|---|---|---|
| Web UI Key Store | Browser memory, session | Decrypt + re-encrypt on save |
| Keygen Download | File on user's machine | Backup of generated identity |
| Foot Identity File | File on user's machine, path as setting | Viewing in `/ui-documents` |
| Chat History | — | only `age1…` public keys, never secrets or passphrases |

The server has no key storage. Metadata (path, title, extensions) remain readable — this is the confirmed threat model; randomized names would be "true" E2EE, but unusable.

## 7. Rejected / v2 Candidates

- **`participants` resolution** (usernames instead of keys): v1 has no key directory. With a public key directory (v2 candidate: `_user_*` project setting + "encrypt to project members"), the tool can additionally accept names — the recipient form remains as a universal fallback, no API break.
- Passphrase change / re-encrypt to other recipients (key rotation).
- Plaintext 3-way merge for live collab on age-Docs.
- Binary inner files (`image.png.age` → ImageView after decrypt), ssh stanzas, Web Worker for scrypt.

## 8. Implementation References

| Layer | File |
|---|---|
| Contract Constants | `vance-api/.../api/documents/AgeDocumentKind.java` — kind/MIME/extension/armor marker |
| Marker Management | `vance-shared/.../document/DocumentService.java` — `mimeFromPath`, `applyHeader`-Age branch, Kind-Mirror-Skip, RAG/Summary-Excludes, Armor-Form-Guard, `AgeContentException` |
| Kind Recognition | `vance-shared/.../document/kind/AgeKindHandler.java` (Armor marker, Priority 5) |
| Upload Mapping | `vance-brain/.../documents/DocumentController.java` — `.age` for octet-stream; `AgeContentException` → 400 |
| Tool Guards | `vance-brain/.../tools/document/AgeDocumentGuard.java` |
| Agent Tool | `vance-brain/.../tools/kinds/DocEncryptTool.java` + `_vance/manuals/age-encryption.md` |
| Java Crypto Facade | `vance-age/` — `AgeCipher`, `AgeKeys`, `AgeSecrets` (jagged; consumed by foot **and** brain) |
| TS Crypto | `client/packages/age/` (`@vance/age`) — wrapper around typage, constant twin of `AgeDocumentKind`, Go-CLI fixtures |
| Cortex | `vance-face/.../cortex/ageDocument.ts`, `stores/ageKeyStore.ts`, `kindViews/AgeDocumentView.vue`, `components/AgeTransformDialog.vue` |
| Foot | `vance-foot/.../command/UiDocumentsCommand.java` — `decryptForView` |
| Tests | `vance-shared` `DocumentServiceAgeTest`, `vance-brain` `AgeDocumentGuardTest` / `DocEncryptToolTest`, `vance-age`/`@vance/age` Unit + Interop, `qa/ai-test` `AgeEncryptionE2ETest` |
