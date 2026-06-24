---
# Vance — Workspace Access (Web-UI ↔ Brain)

> Defines how the Web-UI accesses a Project's Workspace. Workspaces are **pod-sticky** (Folder + Snapshots live on a specific Brain process — the Project's Home Pod), but the Web-UI hits any Brain replica. This spec describes the two-layer routing architecture, pod discovery, routing cache, REST endpoints, and failure behavior.
>
> The Workspace itself (RootDirs, Handler, Lifecycle, Suspend/Recover) is defined in [workspace-management.md](workspace-management.md). This spec builds upon that and **only** governs the access path from the Web-UI.

---

## 1. Purpose

Workspace data resides on the local disk of a Brain process (see [workspace-management.md](workspace-management.md) §3). However, the Web-UI connects to any Brain replica via a Service LoadBalancer and does not know a priori which Brain process (Home Pod) holds the Workspace of a specific Project.

This leads to two requirements:

1. **Routing:** WebUI requests for Workspace access must reach the correct Pod. Layer 1 (Entry Pod) proxies to Layer 2 (Home Pod).
2. **Independence from K8s Configuration:** no assumptions about StatefulSets, Headless Services, or sticky sessions on the LoadBalancer. Works identically in single-pod dev, Docker Compose, and multi-pod K8s.

**What this spec does NOT cover:**
- Write access to the Workspace from the Web-UI — v1 is read-only.
- Live updates (Inotify, file change streaming) — snapshots-on-demand, manually refreshable in the UI.
- Pod reassignment / Workspace migration between Pods — separate mechanism via Suspend/Recover ([workspace-management.md](workspace-management.md) §6).
- Workspace access from CLI clients (Foot, vance-cli). Foot uses WebSocket tools, not this REST path — see [file-transfer.md](file-transfer.md).

---

## 2. Model

```
WebUI ──HTTPS──► Brain-Pod (Layer 1, Entry) ──HTTP──► Brain-Pod (Layer 2, Home) ──► WorkspaceService
                  │                                    │
                  │                                    └─ Brain process holding the Workspace (Disk + Snapshots)
                  └─ any Brain replica, picked by the k8s service
```

| Term | Definition |
|---|---|
| **Layer 1** | WebUI-facing REST Controller. Authenticates user JWT, resolves Home Pod via `Project.homeNode` (→ Endpoint via `ClusterService.resolveEndpoint`), proxies the request via internal HTTP connection to Layer 2. |
| **Layer 2** | Brain-process-internal REST Controller. Accepts only Internal Token (no user JWT). Accesses `WorkspaceService` directly. |
| **Home Pod** | The Brain process that holds a Project's Workspace on its disk. Identified via `ProjectDocument.homeNode` (Cluster Node Name from `brain_pods` registry) — set by the claim system (`ProjectService.claim`, `ProjectManagerService`); the associated `host:port` endpoint comes from `ClusterService.resolveEndpoint(homeNode)`. |
| **Routing Cache** | In-memory map `(tenantId, projectName) → PodEntry` in each Brain process. Reduces Mongo reads, invalidated on connect failure. |

**Why always proxy, even if Entry Pod = Home Pod (Same-Pod case)?**
- A single code path → better testability, no untested branch.
- Same-Pod optimization is premature optimization. Loopback HTTP is sub-millisecond.
- Bypass flag (see §8) for integration tests that should run without a second HTTP layer.

---

## 3. Pod Discovery

### 3.1 `ProjectDocument.homeNode` + Cluster Registry

Vance separates Pod identity (stable per boot) from Pod address (variable across restarts):

- `ProjectDocument.homeNode` (`@Nullable String`) holds the **Cluster Node Name** of the owner Pod (e.g., `maya-prosser`). Each Brain boot assigns a fresh name from the `cluster-node-names.txt` dictionary (`ClusterNodeNameGenerator`) and registers itself in `brain_pods` with Node Name + current Endpoint + Heartbeat.
- `ProjectDocument.claimedAt` marks the last refresh.
- `ProjectDocument.requiresOwnerPod` (boolean) marks Projects with owner-pod-bound in-memory state — they need an active owner for schedulers/workflows to fire (see [project-lifecycle.md](project-lifecycle.md) §6.2).
- `LocationService.getPodAddress()` provides the Brain's own endpoint (Host resolution: `VANCE_POD_IP`, `POD_IP`, `spring.application.host`, DNS via `HOSTNAME`, non-loopback interface, fallback `localhost`; Port from `server.port`). This endpoint lands in its own `brain_pods` row, not directly on the Project.
- `ProjectService.claim(tenantId, name, selfCluster, liveClusters)` is a CAS: sets `homeNode=selfCluster` + `claimedAt` only if `homeNode IS NULL OR == selfCluster OR ∉ liveClusters`. Race-free between multiple Pods.
- `ProjectManagerService.requireOwnedByLocalPod(project)` compares `selfCluster` against `project.getHomeNode()`.
- `ProjectStartupReclaimer` cleans up stale Claims after Pod boot (`updateMulti({homeNode: $nin: liveClusters}, {$set: {homeNode: null}})`, see [project-lifecycle.md](project-lifecycle.md) §6.1).
- `ProjectWakeupTick` actively reclaims RUNNING Projects with `homeNode=null AND requiresOwnerPod=true` (default 60s tick, [project-lifecycle.md](project-lifecycle.md) §6.2).

Workspace routing uses `homeNode` as an indirection: Layer 1 reads the Cluster Name from the Project and calls `ClusterService.resolveEndpoint(homeNode)` for the current `host:port`. The Web-UI never sees an IP — only the Cluster Name (`ProjectDto.homeNode`).

### 3.2 Endpoint Resolution

`ClusterService.resolveEndpoint(node)` looks in `brain_pods.findByClusterIdAndNodeName(clusterId, node)` for the currently registered endpoint. Consequences:

- In K8s, `<pod-ip>:<server-port>` is in the `brain_pods` row (Host via `POD_IP` Downward-API-ref, Port from `server.port`). On Pod restart with IP change, the new Pod gets a fresh Cluster Name — the old `brain_pods` row remains until stale detection drops it, old Project Claims are cleaned up by the Reclaimer.
- In single-pod dev, it's typically `192.168.x.x:8080` / `10.x.x.x:8080` / `localhost:8080`.
- IPv6 is stored with brackets (`[fe80::1]:8080`) so the `:` port separator remains unambiguous.
- If `resolveEndpoint` returns `Optional.empty()`, Layer 1 returns `503` (see §7) — the Cluster Node is not (or no longer) alive in the registry.

Pod DNS names (StatefulSet-stable) are explicitly **not** required here — the Cluster Name + Registry lookup addresses endpoint changes via the `brain_pods` row, not via stable DNS.

### 3.3 Single-Pod Mode

If only one Brain process exists (dev, small deployments), `homeNode` points to its own Node Name. Layer 1 still proxies to Layer 2 — but via loopback. With the bypass flag active (§8), the hop is omitted, Layer 1 calls `WorkspaceService` directly.

### 3.4 Population

- Project creation initially leaves `homeNode = null`. Only the first `claimForLocalPod` call (`ProjectManagerService`) calls `claim(...)` and sets it.
- If `homeNode == null` during Workspace access: `409 Conflict` to the Web-UI with the message "Project not yet claimed by any Home Pod" (see §7).
- If `homeNode != null` but `resolveEndpoint` is empty (dead Cluster Node): `503`; the next Wakeup Tick typically reclaims the Project on a live Pod within the next tick interval.

---

## 4. Routing Cache

Layer 1 maintains an in-memory cache to avoid repeating the cluster lookup path (Mongo + registry resolution) on a hot path for every request.

### 4.1 Schema

```java
record ProjectPodKey(String tenantId, String projectName) {}

record PodEntry(
    String endpoint,        // resolved host:port (via ClusterService.resolveEndpoint)
    Instant lastUsed
) {}
```

Map type: `ConcurrentHashMap<ProjectPodKey, PodEntry>`. Caffeine is allowed but not mandatory — for Vance's scale (≤ a few thousand Projects per Brain process), a simple map with periodic cleanup or `expireAfterAccess` if Caffeine is sufficient.

### 4.2 Lookup Path

```
1. Cache hit on (tenantId, projectName) → use PodEntry, update lastUsed
2. Cache miss → load Project from Mongo, read homeNode,
                ClusterService.resolveEndpoint(homeNode) → Endpoint,
                write PodEntry
3. Attempt connection with Endpoint
4. Connect failure (ConnectException, Timeout) → invalidate Entry, retry once with fresh lookup
5. Second failure → 503 to WebUI
```

### 4.3 Invalidation

- **On Connect Failure:** `cache.remove(key)` and retry exactly once with an endpoint freshly resolved from Mongo + Registry.
- **On Project Reassignment:** if `ProjectWakeupTick` or an admin operation changes `homeNode`, the Mongo update cannot directly reach all routing caches. Strategy: cache entry is invalidated on the next connect failure (lazy). Optionally later: Mongo Change Stream on `ProjectDocument.homeNode` for active invalidation.
- **TTL:** optional, e.g., `expireAfterAccess(30 min)`. Not mandatory — failure-driven invalidation is sufficient for the normal case.

### 4.4 Implementation Choice

`ConcurrentHashMap` is the default. Caffeine is allowed if already on the classpath. A `SoftReference`-map would be possible, but GC-driven eviction makes cache lifetime unpredictable — not recommended unless memory pressure arguments become concrete.

---

## 5. REST Endpoints

### 5.1 Layer 1 (WebUI-facing)

All endpoints under `/brain/{tenant}/projects/{project}/workspace/...`. Authentication via user JWT (standard Brain auth filter).

| Method | Path | Description |
|---|---|---|
| `GET` | `.../tree?path={p}&depth={d}` | Lists directory content recursively up to `depth` (default 1). Returns `WorkspaceTreeNodeDto` tree with Name, Type (`file`/`dir`), Size, MTime. |
| `GET` | `.../file?path={p}` | Returns file content as bytes. Content-Type from file suffix. Size limit configurable (`vance.workspace.access.maxFileSize`, default 10 MiB). |
| `GET` | `.../search?q={query}&path={p}` | Full-text search in the Workspace (see §7). |

Layer 1 does:
1. Validate JWT, authorize Tenant + Project.
2. `(tenantId, projectName)` → Cache lookup → Home Pod endpoint.
3. Issue internal request to Layer 2 (see §5.2), set Internal Token header.
4. Pass through response 1:1 (streaming for `file`).

### 5.2 Layer 2 (Brain-process-internal)

Identical paths, but under `/internal/workspace/{tenant}/{project}/...`. Authentication **exclusively** via Internal Token (see §6). No user JWT, no Tenant validation against user — Layer 1 has already done that.

Layer 2 calls `WorkspaceService` directly, builds DTOs, returns them.

**Network Policy:** Layer 2 (`/internal/...`) must be restricted to intra-cluster traffic via `NetworkPolicy` in K8s. Never expose through the external LoadBalancer/Ingress.

### 5.3 DTOs (in `vance-api`)

```java
@GenerateTypeScript
public record WorkspaceTreeNodeDto(
    String name,
    String path,           // relative to workspace root
    NodeType type,         // FILE | DIR
    long size,             // bytes; 0 for DIR
    Instant lastModified,
    @Nullable List<WorkspaceTreeNodeDto> children   // null if depth-limited
) {}

public enum NodeType { FILE, DIR }
```

`WorkspaceFileDto` is not needed — file content is delivered as raw bytes with a Content-Type header, not JSON-wrapped.

---

## 6. Internal-Auth

Layer 1 → Layer 2 is **not** secured with user JWT. Instead:

- Shared secret in K8s Secret (`vance-internal-token`), mounted as Env in all Brain processes.
- Layer 1 sets header `X-Vance-Internal-Token: <secret>` for every request to Layer 2.
- Layer 2 compares in a Spring filter in constant time (`MessageDigest.isEqual`), rejects without the header (`401`).
- Token rotation: Pod restart after Secret update is sufficient (no graceful reload needed in v1).

**Why not mTLS?** Overkill for the initial setup. mTLS is an option for later if cluster-internal encryption is required (compliance trigger).

**Trust between Layer 1 and Layer 2:** Layer 2 trusts Layer 1 for user identity, and thus for Tenant/Project authorization. It only verifies that the request comes from an authentic Brain process. Consequence: every Layer 1 endpoint **must** validate Tenant+Project against the user JWT **before** proxying. Otherwise, authorization bypass.

---

## 7. Failure Modes

| Scenario | Behavior |
|---|---|
| Home Pod unreachable (ConnectException, Timeout) | Invalidate cache, retry once with fresh lookup. On second error: `503` to WebUI with body `{ "error": "workspace_unavailable", "tenant": "...", "project": "..." }`. |
| `Project.homeNode` is `null` | `409 Conflict` — Project has never been claimed or the Cluster Node has died and the next Wakeup Tick has not yet taken effect. For `requiresOwnerPod=true`, this resolves itself within the tick interval. |
| `Project.homeNode` points to a Cluster Node without an entry in the registry | `ClusterService.resolveEndpoint` returns empty → `503`. Cleaned up by `ProjectStartupReclaimer` on the next affected Pod boot (or by the Wakeup Tick for `requiresOwnerPod=true` Projects). |
| `Project.homeNode` points to a registered endpoint that does not respond | same as ConnectException — `503`. No automatic reassignment. |
| User JWT missing/invalid on Layer 1 | `401`, Layer 2 is never contacted. |
| Internal Token missing/incorrect on Layer 2 | `401`. |
| File exceeds size limit | `413 Payload Too Large` with hint about configured limit. Checked in Layer 2 (`WorkspaceService` knows file size), Layer 1 passes through. |

**No Auto-Reassignment:** if the Home Pod is permanently dead, Vance cannot autonomously move the Workspace to another Brain process — the disk data is gone or inaccessible. Recovery is a manual process (Suspend Snapshot from Mongo + Recover on new Brain process, if snapshot exists; otherwise accept data loss). This spec does not automatically trigger this.

---

## 8. Bypass Flag (Tests)

Spring property:

```yaml
vance:
  workspace:
    access:
      bypass-proxy: false      # default
      max-file-size: 10485760  # 10 MiB
      cache-ttl: 30m
```

If `bypass-proxy: true`, Layer 1 calls `WorkspaceService` directly without contacting Layer 2. Usage:
- **Integration Tests:** without a second Pod, without Internal Token setup.
- **Single-Pod Dev (optional):** if minimizing latency is desired. However, the default remains `false` so that dev and prod test the same path.

Important: the bypass must **never** automatically apply if `Project.homeNode == self`. That would be the same-pod shortcut we explicitly do not want (see §2 "Why always proxy"). The bypass is only activatable via a config flag, not implicitly.

---

## 9. Insights Editor: Workspace Explorer

The Web-UI gets a Workspace Explorer as an editor under Insights. Read-only.

### 9.1 UI Behavior

- Lazy-Loaded Tree-View: initially only root level, clicking a folder loads its children via `GET .../tree?path=<folder>&depth=1`.
- File Click: Preview pane shows content (text files inline, binaries as hex dump or download button).
- Manual Refresh Button — no live updates ([web-ui.md](web-ui.md) §3-§4).
- Search see §7 below — separate input field in the editor topbar.

### 9.2 UI Components

Mandatory shell `<EditorShell>`, all primitives from `packages/vance-face/src/components/` ([CLAUDE.md](../../CLAUDE.md) UI Consistency section). No DaisyUI directly, no custom header.

### 9.3 What the Explorer does NOT do (v1)

- No edits (no rename, delete, upload, download except file preview).
- No drag-and-drop.
- No bulk operations.
- No diffs between snapshots or with Git state.

Write access to the Workspace is an Engine/Tool concern — not UI. If the user wants to store files, it happens via Document Import or File Transfer ([file-transfer.md](file-transfer.md)).

---

## 10. Remote Search

`GET .../workspace/search?q={query}&path={p}` performs full-text search **on the Home Pod** (filesystem-local, e.g., via `ripgrep` as a subprocess or Java-native implementation).

| Aspect | Behavior |
|---|---|
| **Where does the search run?** | Layer 2 (Home Pod). Never aggregated across multiple Pods — one Workspace = one Pod. |
| **Tool** | v1: Java-native recursive search with regex over text files (`.txt`, `.md`, `.json`, …). v2 optional: ripgrep subprocess for performance. |
| **Scope** | Within the Workspace, optionally filtered by `path`-prefix. Never outside the Workspace root (sandbox check like [file-transfer.md](file-transfer.md) §3.3). |
| **Limit** | Max 1000 matches, then truncation flag in the response. |
| **Response DTO** | `WorkspaceSearchResultDto { List<Match> matches; boolean truncated; }` with `Match { path, lineNumber, lineContent }`. |

**What the search does not do (v1):** no fuzzy matching, no indexing, no ranking. Simple substring/regex match, order by file path. Indexed search (Lucene or similar) is v2, if performance issues arise.

---

## 11. Implementation Notes

### 11.1 Module Assignment

| Component | Module |
|---|---|
| `WorkspaceTreeNodeDto`, `WorkspaceSearchResultDto`, `NodeType` | `vance-api` |
| Layer 1 + Layer 2 Controller, Routing Cache, Internal Token Filter | `vance-brain` |
| `WorkspaceService` (exists) | `vance-shared` |
| Workspace Explorer Editor | `client_web/packages/vance-face/src/editors/workspace/` |

### 11.2 HTTP Client for Layer 1 → Layer 2

JDK `HttpClient` (`java.net.http`) is sufficient. No WebClient stack needed — synchronous, simple calls. Connection pool active by default. Streaming for file downloads via `BodyHandlers.ofInputStream()`.

### 11.3 Implementation Order

1. `WorkspaceTreeNodeDto` in `vance-api/projects/`
2. `WorkspaceAccessProperties` in `vance-brain` + `application.yml` block
3. Read API in `WorkspaceService` (`tree(...)`, `readBytes(...)`, virtual top-level over RootDirs)
4. `InternalAccessFilter` for `/internal/**` in `vance-brain`
5. Layer 2 (internal) — Tree/File endpoints, direct `WorkspaceService` calls
6. Routing Cache + Layer 1 (proxy) — including bypass flag
7. Web-UI Explorer Editor (Tree + Preview, without Search)
8. Remote Search (Layer 2 + Layer 1) + UI search field

Pod discovery relies on `ProjectDocument.homeNode` + `ClusterService.resolveEndpoint(node)` (`ProjectService.claim` / `ProjectManagerService` / `brain_pods` registry) — no separate step needed. Search is optional and can be postponed if the tree view is sufficient for initial use cases.
