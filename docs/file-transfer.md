---
title: "Vance — File Transfer (Foot ↔ Brain)"
parent: Documentation
permalink: /docs/file-transfer
render_with_liquid: false
---

<!-- AUTO-GENERATED from specification/public/en/file-transfer.md — do not edit here. -->

---
# Vance — File Transfer (Foot ↔ Brain)

> Defines the protocol for transferring files between Foot client and Brain server in both directions. Data lands on the respective receiver's disk (Brain: Workspace-RootDir, Foot: Foot-Workspace). What the Agent does with received files (e.g., Document-Import) is explicitly *not* part of this spec — transfer ends on the HDD.

---

## 1. Purpose

Vance Agents need files beyond what fits into chat messages:
- User uploads audio/PDF/image for analysis (Foot → Brain)
- Agent generates report/audio/binary, user downloads it (Brain → Foot)

Both directions are transported over the existing WebSocket channel between Foot and Brain. No separate HTTP upload path — `vance-foot` is WS-only (CLAUDE.md Tech Stack).

**What this Spec does NOT cover:**
- Processing of the file after reception (Document-Import, RAG-Indexing, Audio-Transcription) — separate tools, separate specs.
- User confirmation on the Foot side before upload/download — will come later as an extension of the `transfer_init_response` step.
- Resume after WS-reconnect mid-stream — V2.
- Compression of chunks — V2 (if needed via WS-permessage-deflate at the transport layer).

---

## 2. Workspace `ephemeral` RootDir Type

Extension of [workspace-management.md](/docs/workspace-management) §5 with a new handler type `ephemeral`. The entry here is definitional; it should be updated in `workspace-management.md` §5 during implementation.

| Phase | Behavior |
|---|---|
| `init` | Creates an empty folder. Optional: immediately creates the 0-byte target file for an expected transfer within it (service helper, not mandatory). |
| `suspend` | **No-op.** Content is not persisted — `ephemeral` does **not** survive Pod migration / Project suspend. |
| `recover` | Creates an empty folder. Content after recovery is gone. |
| `close` | Recursive delete of the folder. |

**Distinction from `temp`:**
- `temp` is the default container for worker tempfiles (see Workspace Spec §7.3, lazy via `createTempFile`/`createTempDirectory`, shared per `(projectId, creatorProcessId)`).
- `ephemeral` is the type explicitly intended for transfer/drop-box. Each transfer (or bundle of transfers) gets its own RootDir, its own `dirName`, consciously created and named by the worker.

**Default Settings:**
- `deleteOnCreatorClose: true` (standard, overridable by caller)
- `metadata`: handler-specific fields optional (e.g., `purpose: "user-upload"`, `originatingTransferId: "..."`)

**Anti-Pattern:** Using `ephemeral` as a persistence layer for files that "only need to be there briefly but should survive suspend." If the file needs to survive a suspend, it belongs as a Document in the DocumentService — not as RootDir content.

---

## 3. Foot-Workspace-Root

Foot gets its own root anchor on the local user disk, comparable to the Brain-Workspace-Root, but much simpler — no RootDir hierarchy, no snapshot, no handlers.

### 3.1 Configuration

Spring property in `vance-foot`:

```
vance.foot.workspace.root = ${user.home}/.vance/foot
```

Default: `~/.vance/foot/`. Override via `application.yml` or Env (`VANCE_FOOT_WORKSPACE_ROOT`).

### 3.2 Layout

```
<footWorkspaceRoot>/
  <tenant>/
    <projectId>/
      <userPath>                           # specified by Brain-LLM, sandboxed
```

**Example:** Brain calls `client_file_download(dirName="reports", remotePath="2026-q2.pdf", localPath="reports/2026-q2.pdf")` with active Tenant `acme`, Project `proj-research`. File lands at:

```
~/.vance/foot/acme/proj-research/reports/2026-q2.pdf
```

### 3.3 Sandbox

Foot validates before each write or read access:

1. Path resolution: `Paths.get(footRoot, tenant, projectId, userPath).normalize().toAbsolutePath()`.
2. Sandbox check: `resolved.startsWith(Paths.get(footRoot, tenant, projectId).normalize().toAbsolutePath())`.
3. On failure: `transfer_init_response {ok=false, error="path escapes project sandbox"}`.

Symlinks in the Foot-Workspace are **not** followed (`LinkOption.NOFOLLOW_LINKS` for `Files.write`/`Files.readAttributes`). This prevents an LLM from writing outside the sandbox via a crafted symlink.

### 3.4 Auto-Create

Sub-directories are created lazily on first write access (`Files.createDirectories`). The Foot-Workspace-Root itself (`~/.vance/foot/`) is created on Foot boot if it doesn't exist.

---

## 4. Frame Schema

All frames are JSON messages on the existing WS channel (`client-protokoll-erweiterbarkeit.md`). If a generic request-response correlation pattern already exists there, it will be used for `transferId` — otherwise, `transferId` is a standalone field per frame.

### 4.1 Common Fields

| Field | Type | Meaning |
|---|---|---|
| `type` | string | Frame type discriminator (`transfer_init`, `transfer_chunk`, ...) |
| `transferId` | string (UUID) | Correlation ID, valid for the entire transfer lifecycle |

### 4.2 `transfer_init` (Sender → Receiver)

```json
{
  "type": "transfer_init",
  "transferId": "01J...",
  "source": "/Users/hummel/sounds/test.wav",   // informative, from sender
  "target": "soundfiles/test.wav",              // path relative to Receiver-Root
  "dirName": "user-upload-2026-05-01",          // only for Brain-as-Receiver: RootDir
  "totalSize": 12345678,                        // Bytes, exact
  "hash": "sha256:8f3c...",                      // Hex-encoded Hash of the entire file
  "attrs": {                                    // optional, all fields optional
    "mode": "0755",                              // POSIX bits octal as string
    "mtime": "2026-05-01T14:23:11Z"              // ISO-Instant
  }
}
```

`dirName` is set **only when Brain is the receiver** (i.e., in `transfer_init` from Foot during upload). When Foot is the receiver, `target` is sandboxed against `<footRoot>/<tenant>/<projectId>/`.

### 4.3 `transfer_init_response` (Receiver → Sender)

```json
{
  "type": "transfer_init_response",
  "transferId": "01J...",
  "ok": true,
  "error": null                                  // null if ok, otherwise string
}
```

At this point, the receiver has:
- Checked path sandbox
- Checked available disk space (`totalSize` < available)
- Created 0-byte target file (or not, if `ok=false`)

### 4.4 `transfer_chunk` (Sender → Receiver)

```json
{
  "type": "transfer_chunk",
  "transferId": "01J...",
  "seq": 0,
  "bytes": "<base64>",                           // Base64-encoded Chunk data
  "last": false                                  // true for the last chunk
}
```

- `seq` starts at 0, monotonically increasing per transfer
- `bytes` Base64 (33% overhead, V1 accepts; V2 potentially binary WS frames)
- `last=true` marks the final chunk
- Receiver appends to the 0-byte file (`StandardOpenOption.APPEND`)

**Edge Case `totalSize=0`:** Sender sends a single chunk with `seq=0, bytes="", last=true`. Receiver appends 0 bytes (no-op), responds `transfer_complete`.

**Chunk Size:** Default 64 KiB raw data (before Base64). Configurable via setting `vance.transfer.chunk-size`. Hard limit 1 MiB per chunk (against memory pressure on receiver side).

### 4.5 `transfer_complete` (Receiver → Sender)

```json
{
  "type": "transfer_complete",
  "transferId": "01J...",
  "ok": true,
  "error": null,
  "bytesWritten": 12345678,
  "hashCheck": "ok"                              // "ok", "mismatch" or null if no hash
}
```

At this point, the receiver has:
- Received and appended the last chunk (`last=true`)
- Closed the file
- Incrementally calculated hash and compared it against `transfer_init.hash`
- Set `attrs.mode` and `attrs.mtime` (see §7.2 Mode Mask)

In case of hash mismatch: `ok=false`, `error="hash mismatch"`, file is deleted. Receiver cleans up, ensuring the corrupt file is not left behind.

### 4.6 `transfer_finish` (Sender → Receiver)

```json
{
  "type": "transfer_finish",
  "transferId": "01J...",
  "ok": true                                     // reflects the final status
}
```

Last frame in the lifecycle. Receiver removes `transferId` from its pending map. Sender removes its `transferId` after sending.

`transfer_finish` does **not** respond — otherwise, an endless ACK chain would be created.

### 4.7 `client.file.upload.request` (Upload only, Brain → Foot)

```json
{
  "type": "client.file.upload.request",
  "transferId": "01J...",
  "localPath": "/Users/hummel/sounds/test.wav",
  "dirName": "user-upload-2026-05-01",
  "remotePath": "test.wav",
  "attrs": {                                     // optional, default determined by Foot
    "mode": "0644",
    "mtime": "2026-05-01T14:23:11Z"
  }
}
```

Trigger frame from Brain to Foot. Foot reads the local file (with its own sandbox validation), calculates `totalSize` and `hash`, responds with `transfer_init` (Foot is now the sender). In case of error (file not found, path sandbox violation): Foot responds directly with `transfer_init_response {ok=false}` pattern or a dedicated error frame — **we do not use the latter**, instead Foot sends a pseudo-`transfer_init` with minimal fields and the error comes back in `transfer_init_response`. Simplification: **Foot sends `transfer_finish {ok=false, error}` directly on local error** and skips the lifecycle. This is the only place where `transfer_finish` can carry an error in the initial phase.

---

## 5. Lifecycle

### 5.1 Successful Transfer

```
Sender                                      Receiver
  │                                            │
  │ ──── transfer_init ────────────────────►   │  validates path, allocates 0-byte file
  │                                            │
  │  ◄─── transfer_init_response {ok=true} ─── │
  │                                            │
  │ ──── transfer_chunk seq=0 ─────────────►   │  appends
  │ ──── transfer_chunk seq=1 ─────────────►   │  appends
  │ ──── ...                                   │
  │ ──── transfer_chunk seq=N last=true ───►   │  appends, closes, hash-check
  │                                            │
  │  ◄─── transfer_complete {ok=true} ──────── │
  │                                            │
  │ ──── transfer_finish {ok=true} ────────►   │  cleanup pending-map
  │ cleanup pending-map                        │
```

### 5.2 Init-Failure (Path / Disk-Space)

```
Sender                                      Receiver
  │ ──── transfer_init ────────────────────►   │  path check fails
  │  ◄─── transfer_init_response {ok=false} ── │
  │ ──── transfer_finish {ok=false} ───────►   │  cleanup
```

Sender propagates `error` from `transfer_init_response` to the tool result. No chunks sent.

### 5.3 Mid-Stream-Failure (e.g., Disk-Full during Append)

```
Sender                                      Receiver
  │ ──── transfer_init ────────────────────►   │
  │  ◄─── transfer_init_response {ok=true} ─── │
  │ ──── transfer_chunk seq=0 ─────────────►   │  appends
  │ ──── transfer_chunk seq=1 ─────────────►   │  disk full!
  │  ◄─── transfer_complete {ok=false, error} ─│  closes, deletes partial file
  │ ──── transfer_finish {ok=false} ───────►   │  cleanup
```

Receiver sends `transfer_complete {ok=false}` **mid-stream** as soon as a write error occurs. Sender must asynchronously listen for incoming frames with the same `transferId` during its chunk loop — if a status frame is received, break the loop and send `transfer_finish`.

### 5.4 Local-File-Failure during Upload (Foot → Brain)

```
Brain                                       Foot
  │ ──── client.file.upload.request ───────►   │  local file not found
  │  ◄─── transfer_finish {ok=false, error} ── │
```

Special case: Foot skips `transfer_init` and responds directly with `transfer_finish`. Brain recognizes from the missing init phase that the upload never started.

### 5.5 Timeouts

A timeout per phase (default 30s, configurable via `vance.transfer.phase-timeout`):

| Phase | Timeout Meaning |
|---|---|
| after `transfer_init` | Sender waits for `transfer_init_response`. On timeout: Tool failure with `error="init timeout"`, sender sends `transfer_finish {ok=false}` and cleans up. |
| between `transfer_chunk`s | Receiver expects next chunk within 30s. On timeout: Receiver sends `transfer_complete {ok=false, error="chunk timeout"}`, deletes partial file. |
| after `last=true` Chunk | Sender waits for `transfer_complete`. On timeout: Tool failure, `transfer_finish {ok=false}`. |
| after `transfer_complete` | Receiver expects `transfer_finish`. On timeout: Receiver autonomously cleans up pending map — no further failure needed, sender already has its status via `transfer_complete`. |

### 5.6 Cleanup Rules (Memory-Leak Prevention)

Both sides maintain a `Map<transferId, TransferState>`. Entries are removed:
- **Receiver:** upon receiving `transfer_finish` (success or error variant) OR after timeout sweep (`vance.transfer.cleanup-interval`, default 5min).
- **Sender:** after sending `transfer_finish` and resolving the Tool-Result-Future.

---

## 6. Tool Definitions

Both tools are registered in the **Brain** as LLM tools. They encapsulate the frame lifecycle and expose a synchronous Tool API to the LLM.

### 6.1 `client_file_upload`

**Purpose:** Copy file from Foot disk to Brain Workspace.

```
Tool: client_file_upload
Parameters:
  localPath:    string    # required, path relative to Foot-Workspace-Root
  dirName:      string    # required, RootDir in Brain-Workspace
  remotePath:   string    # required, path relative to Brain-RootDir
  attrs:        object    # optional, mode + mtime Override
Returns:
  ok:           boolean
  bytesWritten: number
  hash:         string
  error:        string?   # if ok=false
```

**Pre-Conditions:**
- `dirName` must exist in the Brain-Workspace — the LLM explicitly creates RootDirs (its own tool, e.g., `workspace_create_ephemeral_dir`, or existing `git_checkout`).
- If `dirName` does not exist: Tool returns `ok=false, error="dirName not found"`, without sending `client.file.upload.request`.

**Implementation:**
1. Validate `dirName` exists and is writable.
2. Generate `transferId`, register `CompletableFuture<TransferResult>` in pending map.
3. Send `client.file.upload.request {transferId, localPath, dirName, remotePath, attrs}` to Foot.
4. Wait for `transfer_init` from Foot OR `transfer_finish {ok=false}` (Local-File-Failure).
5. On `transfer_init`: Path-sandbox check against RootDir, create 0-byte file, send `transfer_init_response`.
6. Receive chunks, append, calculate hash incrementally.
7. On `last=true` chunk: close file, compare hash, send `transfer_complete`.
8. Receive `transfer_finish`, resolve Future, return Tool result.

### 6.2 `client_file_download`

**Purpose:** Copy file from Brain-Workspace to Foot disk.

```
Tool: client_file_download
Parameters:
  dirName:      string    # required, RootDir in Brain-Workspace
  remotePath:   string    # required, path relative to Brain-RootDir
  localPath:    string    # required, path relative to Foot-Workspace-Root
  attrs:        object    # optional, mode + mtime Override (otherwise taken from Brain-File)
Returns:
  ok:           boolean
  bytesWritten: number
  hash:         string
  error:        string?   # if ok=false
```

**Pre-Conditions:**
- `dirName` + `remotePath` must exist in the Brain-Workspace and be readable.
- Tool reads file stats (size, mtime), calculates hash before stream start.

**Implementation:**
1. Validate Brain path, read stats, calculate hash.
2. Generate `transferId`, register Future.
3. Send `transfer_init {transferId, source, target=localPath, totalSize, hash, attrs}` to Foot.
4. Wait for `transfer_init_response`.
5. On `ok=true`: stream chunks from file (64 KiB default, last chunk `last=true`).
6. Receive `transfer_complete`, send `transfer_finish`, resolve Future.

---

## 7. Security

### 7.1 Path-Sandbox

**Brain-Side:** RootDir sandbox from [workspace-management.md](/docs/workspace-management) §12.2 (path resolution with `startsWith` check against `<workspaceRoot>/<projectId>/<dirName>/`).

**Foot-Side:** §3.3 of this Spec.

Both sides: no symlink resolution (`LinkOption.NOFOLLOW_LINKS`).

### 7.2 Mode-Mask

`attrs.mode` is AND-masked against a mask during writing — this prevents a malicious LLM from setting setuid or world-writable bits.

| Receiver | Default Mask | Effect |
|---|---|---|
| Brain (Workspace) | `0644` | No execute bits, owner-write only — Brain does not execute anything directly |
| Foot (User-Disk) | `0755` | Execute bits allowed (for scripts) — User decides via mode setting |

Configurable via settings:
- `vance.transfer.brain-mode-mask` (default `0644`)
- `vance.transfer.foot-mode-mask` (default `0755`)

`mtime` is adopted unfiltered (no security risk — incorrect mtime is at most an audit hint).

### 7.3 Total-Size-Limit

A hard limit per direction:
- `vance.transfer.max-upload-size` (default 100 MiB)
- `vance.transfer.max-download-size` (default 100 MiB)

Receiver checks `transfer_init.totalSize` against the limit, responds with `transfer_init_response {ok=false, error="exceeds size limit"}` if exceeded.

### 7.4 Hash-Verification

SHA-256 over the raw file. Sender calculates pre-stream and sends in `transfer_init`. Receiver calculates incrementally during append. On mismatch: `transfer_complete {ok=false}`, file is deleted.

Hash is **mandatory** in v1 — no "without hash" variant. This makes hash mismatch detection deterministic.

---

## 8. What this Spec does NOT cover

- **User-Confirmation** on Foot side before upload/download — extension of the `transfer_init_response` step with a user prompt (Inbox item or TUI dialog). The protocol remains 1:1 the same, only the latency for the first frame increases by the user response time.
- **Resume-after-Reconnect** mid-stream — V2. Currently: WS-disconnect mid-transfer = transfer aborted, receiver cleans up via timeout, sender gets tool failure. LLM can retry.
- **Compression** of chunks — V2. If needed via WS-permessage-deflate (transport layer, transparent).
- **Binary-Frames** for chunks (instead of Base64-JSON) — V2 optimization if bandwidth becomes an issue.
- **Document-Import** after reception — separate tool, separate spec.
- **Multi-File-Transfer** (directory sync) — V2. Currently one transfer = one file.
- **Refcount for `ephemeral` RootDirs** with multiple transfers — V1: each transfer gets its own RootDir, or LLM creates a shared RootDir and all transfers land there (LLM decision, no service refcount).

---

## 9. Relation to other Specs

- [workspace-management.md](/docs/workspace-management) — Brain-Workspace, new `ephemeral` RootDir type (§2 of this Spec), Path-Sandbox.
- [client-protokoll-erweiterbarkeit.md](/docs/client-protokoll-erweiterbarkeit) — WS-Frame layer, generic request-response correlation pattern (if existent → for `transferId`).
- [architektur-scopes-clients.md](/docs/architektur-scopes-clients) — Tenant/Project scope for Foot-Workspace layout.
- [user-interaction.md](/docs/user-interaction) — for later confirm extension: Inbox item path as alternative to direct TUI dialog.

---

## 10. Implementation Order (V1)

1. `ephemeral` handler in `vance-shared` (analogous to `TempHandler`, §2).
2. Foot-Workspace-Service in `vance-foot` (properties, sandbox, §3).
3. WS-Frame-DTOs in `vance-api` (`@GenerateTypeScript` for later Web-UI use), §4.
4. `TransferService` in `vance-brain` and `vance-foot` (pending map, Future resolution, timeout sweep, §5).
5. Brain tools `client_file_upload` and `client_file_download` (§6).
6. Foot handler for inbound frames (`transfer_init`, `transfer_chunk`, ..., `client.file.upload.request`).
7. Tests: Round-trip, hash mismatch, path sandbox violation, disk-full-mid-stream, timeout, empty file.
