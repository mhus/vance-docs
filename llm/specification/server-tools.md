# Vance — Server Tools

> A **Server Tool** is a configurable instance of a Tool Type, addressed by Engines/Recipes via its `name`. Server Tool configurations live as YAML documents under `server-tools/<name>.yaml` in the [DocumentService](../repos/vance/server/vance-shared/src/main/java/de/mhus/vance/shared/document/DocumentService.java) and are resolved via the standard cascade (`project` → `_tenant` → `classpath:vance-defaults/server-tools/`) — Built-in Beans serve as an additional fallback layer. Recipes reference Tools by `name` or by label selector (`@<label>`).
>
> **Storage Refactor (May 2026):** The former Mongo collection path (`server_tools` + `ServerToolDocument` as persisted entity + `ServerToolBootstrapService`) has been replaced. Implementation status in [`readme/server-tools-config.md`](../../readme/server-tools-config.md), migration plan in [`planning/server-tools-to-documents.md`](../../planning/server-tools-to-documents.md). Where "Mongo" / "ServerToolDocument" still appears below, it is historical — the active architecture is Document-based.
>
> See also: [recipes](recipes.md) | [think-engines](think-engines.md) | [mcp-tool-routing](mcp-tool-routing.md) | [kits](kits.md)

---

## 1. Terms and Delimitation

| Term | What it is | Cardinality | Location |
|---|---|---|---|
| **Tool Type** | Implementation class with logic (Java code, Spring Bean `ToolFactory<T>`). Stateless, only knows the schema of its `parameters`. | few (5-15) | `vance-brain/.../tools/types/` |
| **Built-in Tool** | Spring Bean that directly implements `Tool`. Code-only, no Mongo persistence, no configuration. (`whoami`, `web_search`, `process_create`, …) | many | `vance-brain/.../tools/` |
| **Server Tool** | YAML document under `server-tools/<name>.yaml`. Instantiates a Tool Type with a fixed `parameters` configuration. Lazily expanded into a `Tool` object at runtime. | many (10-200) | `DocumentService` cascade (project / `_tenant` / classpath) |
| **Client Tool** | `ClientTool` in `vance-foot`. Executed locally, registered with Brain via WebSocket. **Not covered by this spec** — see [mcp-tool-routing](mcp-tool-routing.md). | n per Foot | `vance-foot/.../tools/` |

**Tool Types** are rare and structural — a new type is code work (`McpToolFactory`, `RestToolFactory`, `DocLookupToolFactory`, …). **Server Tools** are numerous and feature-driven — a new Server Tool instance is configuration, not code.

**Delimitation from Built-in Tools:** Built-in Tools like `whoami` or `process_create` are not parametric — they have no configuration and no Document entry. They remain Spring Beans and appear in the cascade below the classpath resource layer as the very last fallback.

---

## 2. Server Tool Configuration Schema

Server Tool configurations are YAML documents in the Document Store, read by the `ServerToolLoader` and parsed into the record [`ServerToolConfig`](../repos/vance/server/vance-shared/src/main/java/de/mhus/vance/shared/servertool/ServerToolConfig.java).

```yaml
# documents/server-tools/<name>.yaml
name: my_tool             # optional, must match filename if set
type: mcp_server          # required, ToolFactory.typeId()
description: "…"          # required
enabled: true             # default true; false stops the cascade
primary: false            # default false
labels: ["external"]      # optional
disabledSubTools: []      # optional (Multi-Tool-Packs)
defaultDeferred: false    # default false (Multi-Tool-Packs)
parameters:               # type-specific (see §3); lazily validated on lookup
  …
```

**Required fields**: `type`, `description`. `name` is derived from the filename — if also specified in the YAML, it must match (sanity check on write). `parameters` can be empty if the type does not require configuration.

**Storage**: one `DocumentDocument` per Tool, Path = `server-tools/<name>.yaml`. Cascade resolution runs via `DocumentService.lookupCascade(tenantId, projectId, path)` with the proven Project → `_tenant` → classpath order. Audit fields (`createdAt`/`updatedAt`/`createdBy`) live on the underlying Document — the Tool configuration does not duplicate them.

**`name` convention**: lowercase-snake_case, as with Built-in Tools (`web_search`, `doc_how_to_arthur`). The Recipe Resolver matches case-sensitive.

**Carrier class `ServerToolDocument`**: still exists as a parameter type for `ToolFactory.create(...)` — a pure POJO without persistence, which the loader layer uses to encapsulate its configuration into the format expected by Factories. Nothing about it is Mongo-relevant anymore.

---

## 3. Tool Types

A Tool Type is a Spring Bean that implements `ToolFactory`:

```java
public interface ToolFactory {
    /** Stable Type Identifier — value of ServerToolDocument#type. */
    String typeId();

    /** JSON schema for ServerToolDocument#parameters (for UI/CLI validation). */
    Map<String, Object> parametersSchema();

    /** Creates a configured Tool from the Document. */
    Tool create(ServerToolDocument doc);
}
```

Built-in Types in v1 (proposal, final catalog will be maintained via implementation tasks):

| Type | Purpose | `parameters` |
|---|---|---|
| `doc_lookup` | Expose a document from the Document Cascade Layer as a Tool — LLM can read it without `find_tools` | `{ path: "documents/how_to_arthur.md" }` |
| `mcp` | Tool call to an MCP server (server-side configured, not client-side) | `{ server: "jira", toolName: "search_issues" }` |
| `rest` | Generic REST call with parameter mapping | `{ url, method, headers, bodyTemplate, responseSchema }` |
| `prompt_template` | LLM call with fixed prompt prefix; easy-to-create "mini-agent" | `{ promptPrefix, model, modelSize }` |
| `scripted` | JavaScript snippet that runs via the sandboxed `GraaljsScriptExecutor`. Inputs are bound as top-level variables, the `vance.*` host object for sibling tool calls is available. See §3.1. | `{ engine, inputs[], source \| scriptPath, timeoutMs }` |

### 3.1 `scripted` — Tool with Inline JavaScript

A `scripted` Tool bundles a small JavaScript body with declared inputs. When called, the input values are bound as top-level variables into the script scope. The script runs in the same sandbox profile as the built-in `execute_javascript` Tool (no IO, no threading, no native, statement limit + wall-clock timeout). The `vance.*` host API is available — scripts can use `vance.tools.call(name, params)` for sibling tool calls.

**Configuration in `ServerToolDocument#parameters`:**

| Field | Type | Meaning |
|---|---|---|
| `engine` | `string` (default `javascript`) | Reserved for future engines (Python via GraalPy). Currently only `javascript` is allowed. |
| `timeoutMs` | `integer` (default `5000`, max `30000`) | Wall-clock timeout per call. |
| `inputs` | `array` (required, can be empty) | List of declared Tool inputs. Each entry: `{ name, type, description?, required? }`. The LLM-visible JSON schema of the Tool is generated from `inputs`. |
| `source` | `string` | Inline JavaScript source. Exactly one of `source` / `scriptPath` is required. |
| `scriptPath` | `string` | Path of a Document (Cascade `Project → _tenant → classpath`) that contains the script source. Read anew for each call — edits to the Document become active without Tool reload. |

**Allowed `inputs[].type` values:** `string`, `number`, `integer`, `boolean`, `object`, `array`. Default `required` is `true` — to declare an optional input, set it explicitly. The input name `vance` is reserved (host object).

**Return convention:** The value of the last expression in the script is the Tool result. The Tool returns `{ value, durationMs }` to the LLM; in case of a script error `{ error: <ErrorClass>, message }` (analogous to `execute_javascript`).

**Example `tools/add.tool.yaml`:**

```yaml
name: add_numbers
type: scripted
description: Add two numbers and return the sum.
enabled: true
parameters:
  engine: javascript
  timeoutMs: 1000
  inputs:
    - name: a
      type: number
      description: First operand
    - name: b
      type: number
      description: Second operand
  source: |
    a + b
```

**Example with `scriptPath` (separate Document editor, syntax highlighting):**

```yaml
# tools/jira_summary.tool.yaml
name: jira_summary
type: scripted
description: Summarise a Jira ticket via the configured 'jira_get_issue' tool.
parameters:
  inputs:
    - name: ticket
      type: string
      description: Jira ticket id, e.g. ABC-123
  scriptPath: scripts/jira_summary.js
```

```javascript
// documents/scripts/jira_summary.js
const issue = vance.tools.call("jira_get_issue", { id: ticket });
({ summary: issue.summary, status: issue.status })
```

**Security note:** `scripted` Tools have access to all sibling Tools that the spawning Process would see via the Allow filter — i.e., the same sandbox profile as `execute_javascript`. A malicious Kit can potentially cause significant damage via a script Tool. **Kit installation is an act of trust** — review the `source` / `scriptPath` content before import, just like any other configuration from an external source.

Tool Types are **always code** and not configurable via `ServerToolDocument` themselves — otherwise, we would have a circular dependency.

---

## 4. Cascade — How a Tool Name is Resolved

`ServerToolService.lookup(tenantId, projectId, name)` runs analogously to `DocumentService.lookupCascade`:

```
1. Project Layer:   ServerToolRepository.find(tenantId, projectId, name) — if projectId != "_tenant"
2. _tenant Layer:    ServerToolRepository.find(tenantId, "_tenant",   name)
3. Built-in Layer:  BuiltInToolRegistry.find(name)   — Spring Bean Tool
4. Optional.empty()
```

**First match wins.** Project override beats `_tenant` beats Built-in. A disabled Document (`enabled=false`) counts as a match and **breaks the cascade** — meaning a project can specifically disable a system Tool by creating a Document with the same name and `enabled=false`. If the system Tool should take precedence, the Project Document is deleted instead of disabled.

**`projectId == "_tenant"`**: collapses the first two steps into a single read (consistency with `DocumentService.lookupCascade`).

For listing endpoints (`ServerToolService.listAll(tenantId, projectId)`), the cascade is merged outer-to-inner: Built-in → `_tenant` → Project. Inner layers overwrite outer layers **by `name`**, and disabled Documents are removed from the result.

---

## 5. Override Semantics

When a Project Document overrides a `_tenant` Document or a Built-in with the same `name`:

- **Complete Replace, no Field Merge.** The override Document describes the Tool completely — otherwise, it becomes unclear which fields are currently active. Consistent with Recipe Cascade (§3 in [recipes.md](recipes.md)).
- **`primary` is explicit.** It is not inherited from the overridden source in the override — `primary` must be set in the Project Document. Default is `false` (Tool is only reachable via `find_tools`). If a system primary Tool should become a secondary Tool in the project, set `primary=false`.
- **Labels are replaced, not merged.** The override Document contains the complete list of labels. To retain system labels, copy them into the Project Document.
- **`type` may change.** A Project Document may use a different `type` than the overridden `_tenant` Document — the override is conceptually a new Tool with the same name.

---

## 6. Labels and Recipe Assignment

Recipes currently reference Tools by name (`allowedToolsAdd: ["web_search"]`). With Server Tools, a second selector form is added:

```yaml
allowedToolsAdd:
  - web_search          # by name (as before)
  - "@web"              # by label — all Tools with label `web` from the Project lookup
  - "@docs"
allowedToolsRemove:
  - "@destructive"
```

**Convention**: `@`-prefix indicates a label selector. `@` is not allowed in Tool `name`, so there is no collision.

**Resolver time**: When a `ThinkProcessDocument` is spawned, `RecipeResolver.applyDefaulting` resolves label selectors via `ServerToolService.findByLabel(tenantId, projectId, label)` to concrete Tool names. The result is persisted in `ThinkProcessDocument.allowedToolsOverride` as a flat list of names — a frozen snapshot, no late re-evaluations.

**Consequence**: If a new Tool with the same label is created after spawning, the running Process will not receive it. This is intentional — reproducibility of a spawn result is more important than live updates.

**Built-in Tools can carry labels.** The Built-in layer of the cascade is read at boot; a Bean can implement `Set<String> labels()` on `Tool` (default method, empty set). This allows `@web` to work even if `web_search` does not exist as a `ServerToolDocument`.

---

## 7. Integration into the ToolDispatcher

The existing `ToolDispatcher` currently aggregates `ServerToolSource` (Built-in Beans) + `ClientToolSource`. With Server Tools, a third source is added:

```
ToolDispatcher
  ├── ConfiguredToolSource   ← ServerToolDocument (Project + _tenant)
  ├── BuiltInToolSource      ← Spring Bean Tools  (today "ServerToolSource")
  └── ClientToolSource       ← Foot Tools via WebSocket
```

**Order of sources** corresponds to the cascade: `ConfiguredToolSource` first-wins over `BuiltInToolSource`. The Dispatcher queries them sequentially.

**The current Spring Bean collector** will be renamed from `ServerToolSource` → `BuiltInToolSource`, so that the new `ConfiguredToolSource` does not inherit the freed name and the semantics remain clear: "configured" = from Document, "built-in" = from code.

`ContextToolsApi` (Engine whitelist filter) remains unchanged — it still sees flat Tool names from the resolved Recipe.

---

## 8. ServerToolService — API

```java
public interface ServerToolService {

    // ────────── Cascade Lookup ──────────
    Optional<Tool> lookup(String tenantId, String projectId, String name);
    List<Tool> listAll(String tenantId, String projectId);
    List<Tool> findByLabel(String tenantId, String projectId, String label);

    // ────────── CRUD in the Project Layer ──────────
    ServerToolDocument create(String tenantId, String projectId, ServerToolDocument doc);
    ServerToolDocument update(String tenantId, String projectId, String name, ServerToolDocument doc);
    void delete(String tenantId, String projectId, String name);

    // ────────── Type Registry (read-only) ──────────
    List<ToolFactory> listTypes();
    Optional<ToolFactory> findType(String typeId);
}
```

**Data Sovereignty**: `ServerToolService` is the only place that directly accesses `ServerToolRepository` — other services call `ServerToolService` (see CLAUDE.md "Data Sovereignty"). In particular, neither `RecipeResolver` nor the `ToolDispatcher` itself accesses the Repository.

**Caching**: v1 none. Lookups are Mongo reads per spawn — the spawn path is not hot enough to justify a cache. If Tool listing becomes a bottleneck during WebSocket connect, a simple per-project LRU will be added.

---

## 9. Bundled Defaults

Bundled System Tools are no longer mirrored to Mongo during Tenant boot. Instead, **one YAML per default Tool** is located as a Classpath Resource in the Brain JAR:

```
vance-brain/src/main/resources/vance-defaults/server-tools/
   doc_getting_started.yaml
   doc_processes_overview.yaml
   doc_tools_overview.yaml
   …
```

`DocumentService.lookupCascade` automatically includes the resource layer entries if neither `_tenant` nor the user project says anything about the same name. Tenant overrides occur as soon as a Tenant explicitly writes a `_vance/server-tools/<name>.yaml` — after that, the Tenant YAML wins. To revert to default = delete the Tenant Document.

The former `ServerToolBootstrapService` has been removed; there is no longer a Tenant seed step.

**Hot-Reload**: not v1. Classpath resources are fixed at Brain startup. Tenant and Project YAMLs are updated directly via `ServerToolRegistry.refreshOne` — a restart is not required for this.

---

## 10. Relationship to MCP Tool Routing

[mcp-tool-routing.md](mcp-tool-routing.md) describes when a Tool is executed **server-side** vs. **client-side**. Server Tools clearly fall into the server bucket: their code runs in the Brain. An MCP server that is only reachable locally from the Foot (e.g., `chrome-devtools`-MCP) remains a **Client Tool** and does not belong in `ServerToolDocument`.

The clear separation:

| Where the logic runs | Where it is configured |
|---|---|
| Brain process (incl. Brain-reachable MCP servers) | `ServerToolDocument` (this spec) |
| Foot process (local files, local MCP servers, browser, IDE) | `ClientToolService` in the Foot, registered via WebSocket |

---

## 11. Out of Scope (v1)

- **Per-User-Tools.** Tools are project-scoped, not user-scoped. This covers current use cases and avoids a fourth cascade layer.
- **Tool Versioning.** There is no history Document; updates overwrite in-place (`@Version` only protects against concurrent writes). Auditing comes with the general audit system, not here.
- **Per-Tool Quota / Rate-Limit.** Cross-Tool Quotas continue to run via `LlmResourceService` and `CredentialService` — not here.
- **UI for Tool Configuration.** The Web UI will only get read listings in v1 (in the "Tools" editor); editing via CLI / REST.
- **Live Re-evaluation of Label Selectors** in running Processes (see §6).
- **Per-Process Tool Override.** There is currently `ThinkProcessDocument.allowedToolsOverride` — this spec does not change that. To have a fixed list of Tools per Process, continue to use this mechanism.

---

## 12. Migration of Existing Code Tools

For the transition:

1. **All existing Spring Bean Tools remain Built-in** and are resolved via the Built-in layer. No forced migration to `ServerToolDocument`.
2. **`ServerToolSource` is renamed to `BuiltInToolSource`** (see §7).
3. **The new `ConfiguredToolSource` + `ServerToolService` + `ServerToolRepository` + `ServerToolDocument` will be created in `vance-shared` (Document/Repository) and `vance-brain` (Service, Source, Factories)** — analogous to the DocumentService split.
4. **`server-tools.yaml` bootstrap** creates the default `_tenant` Tools (Doc lookups for the `documents/how_to_*.md` resources, possibly pre-configured MCP stubs).
5. **Recipes YAML is not touched** — existing `allowedToolsAdd / allowedToolsRemove` lists function unchanged. Label selectors (`@<label>`) are added additively where appropriate.

Timing for migrating individual Built-in Tools to `ServerToolDocument`: only if they actually need to become configurable. No mass migration "just because it's possible".
