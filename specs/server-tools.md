---
title: "Vancetope — Server Tools"
parent: Specs
permalink: /specs/server-tools
---

<!-- AUTO-GENERATED from llm/specification/server-tools.md (translated from the German specification/public/server-tools.md) — do not edit here. -->

# Vancetope — Server Tools

> A **Server Tool** is a configurable instance of a Tool Type, addressed by Engines/Recipes via its `name`. Server Tool configurations live as YAML documents under `server-tools/<name>.yaml` in the [DocumentService](../repos/vance/server/vance-shared/src/main/java/de/mhus/vance/shared/document/DocumentService.java) and are resolved via the standard cascade (`project` → `_tenant` → `classpath:vance-defaults/server-tools/`) — built-in Beans serve as an additional fallback layer. Recipes reference Tools by `name` or by label selector (`@<label>`).
>
> **Storage Refactor (May 2026):** The former Mongo collection path (`server_tools` + `ServerToolDocument` as a persisted entity + `ServerToolBootstrapService`) has been replaced. Implementation status in `readme/server-tools-config.md`, migration plan in `planning/server-tools-to-documents.md`. Where "Mongo" / "ServerToolDocument" still appears below, it is historical — the active architecture is Document-based.
>
> See also: [recipes](/specs/recipes) | [think-engines](/specs/think-engines) | [mcp-tool-routing](/specs/mcp-tool-routing) | [kits](/specs/kits)

---

## 1. Terms and Delimitation

| Term | What it is | Cardinality | Location |
|---|---|---|---|
| **Tool Type** | Implementation class with logic (Java code, Spring Bean `ToolFactory<T>`). Stateless, only knows the schema of its `parameters`. | few (5-15) | `vance-brain/.../tools/types/` |
| **Built-in Tool** | Spring Bean that directly implements `Tool`. Code-only, no Mongo persistence, no configuration. (`whoami`, `web_search`, `process_spawn`, …) | many | `vance-brain/.../tools/` |
| **Server Tool** | YAML document under `server-tools/<name>.yaml`. Instantiates a Tool Type with fixed `parameters` configuration. Lazily expanded into a `Tool` object at runtime. | many (10-200) | `DocumentService` cascade (project / `_tenant` / classpath) |
| **Client Tool** | `ClientTool` in `vance-foot`. Executed locally, registered with Brain via WebSocket. **Not the subject of this spec** — see [mcp-tool-routing](/specs/mcp-tool-routing). | n per Foot | `vance-foot/.../tools/` |

**Tool Types** are rare and structural — a new type is code work (`McpToolFactory`, `RestToolFactory`, `DocLookupToolFactory`, …). **Server Tools** are numerous and feature-driven — a new Server Tool instance is configuration, not code.

**Delimitation from Built-in Tools:** Built-in Tools like `whoami` or `process_spawn` are not parametric — they have no configuration and no Document entry. They remain Spring Beans and appear in the cascade below the classpath resource layer as the very last fallback.

---

## 2. Server Tool Config Schema

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

**Required fields**: `type`, `description`. `name` is derived from the filename — if also specified in YAML, it must match (sanity check on write). `parameters` can be empty if the type does not require configuration.

**Storage**: one `DocumentDocument` per Tool, Path = `server-tools/<name>.yaml`. Cascade resolution runs via `DocumentService.lookupCascade(tenantId, projectId, path)` with the proven Project → `_tenant` → classpath order. Audit fields (`createdAt`/`updatedAt`/`createdBy`) live on the underlying Document — the Tool configuration does not duplicate them.

**`name` convention**: lowercase-snake_case, as with Built-in Tools (`web_search`, `doc_how_to_arthur`). The Recipe Resolver matches case-sensitive.

**Carrier class `ServerToolDocument`**: still exists as a parameter type for `ToolFactory.create(...)` — a pure POJO without persistence, which the loader layer uses to encapsulate its configuration into the format expected by factories. Nothing about it is Mongo-relevant anymore.

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
| `doc_lookup` | Expose a document from the Document Cascade Layer as a Tool — LLM can read it without `tool_list` | `{ path: "documents/how_to_arthur.md" }` |
| `mcp` | Tool call to an MCP server (server-side configured, not client-side) | `{ server: "jira", toolName: "search_issues" }` |
| `rest` | Generic REST call with parameter mapping | `{ url, method, headers, bodyTemplate, responseSchema }` |
| `prompt_template` | LLM call with fixed prompt prefix; easy-to-create "mini-agent" | `{ promptPrefix, model, modelSize }` |
| `scripted` | JavaScript snippet that runs via the sandboxed `GraaljsScriptExecutor`. Inputs are bound as top-level variables, the `vance.*`-host object for sibling tool calls is available. See §3.1. | `{ engine, inputs[], source \| scriptPath, timeoutMs }` |

### 3.1 `scripted` — Tool with Inline JavaScript

A `scripted` Tool bundles a small JavaScript body with declared inputs. Upon invocation, the input values are bound as top-level variables into the script scope. The script runs in the same sandbox profile as the built-in `execute_javascript` Tool (no IO, no threading, no native, statement limit + wall-clock timeout). The `vance.*`-host API is available — scripts can use `vance.tools.call(name, params)` for sibling tool calls.

**Configuration in `ServerToolDocument#parameters`:**

| Field | Type | Meaning |
|---|---|---|
| `engine` | `string` (default `javascript`) | Reserved for future engines (Python via GraalPy). Currently only `javascript` is allowed. |
| `timeoutMs` | `integer` (default `5000`, max `30000`) | Wall-clock timeout per call. |
| `inputs` | `array` (required, can be empty) | List of declared Tool inputs. Each entry: `{ name, type, description?, required? }`. The LLM-visible JSON schema of the Tool is generated from `inputs`. |
| `source` | `string` | Inline JavaScript source. Exactly one of `source` / `scriptPath` is required. |
| `scriptPath` | `string` | Path of a Document (Cascade `Project → _tenant → classpath`) that contains the script source. Read anew per call — edits to the Document become active without Tool reload. |

**Allowed `inputs[].type` values:** `string`, `number`, `integer`, `boolean`, `object`, `array`. Default `required` is `true` — to declare an optional input, set it explicitly. The input name `vance` is reserved (host object).

**Return convention:** The value of the last expression in the script is the Tool result. The Tool returns `{ value, durationMs }` to the LLM; in case of a script error, `{ error: <ErrorClass>, message }` (analogous to `execute_javascript`).

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

**Security Note:** `scripted` Tools have access to all sibling Tools that the spawning Process would see via an allow-filter — i.e., the same sandbox profile as `execute_javascript`. A malicious Kit can potentially cause significant damage via a script Tool. **Kit installation is an act of trust** — review the `source` / `scriptPath` content before import, just like any other configuration from an external source.

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

**First hit wins.** Project override beats `_tenant` beats Built-in. A disabled Document (`enabled=false`) counts as a hit and **breaks the cascade** — meaning a project can specifically disable a system Tool by creating a Document with the same name and `enabled=false`. If the system Tool should take precedence, the Project Document is deleted instead of disabled.

**`projectId == "_tenant"`**: collapses the first two steps into a single read (consistency with `DocumentService.lookupCascade`).

For listing endpoints (`ServerToolService.listAll(tenantId, projectId)`), the cascade is merged outer-to-inner: Built-in → `_tenant` → Project. Inner layer overwrites outer **by `name`**, disabled Documents are removed from the result.

---

## 5. Override Semantics

When a Project Document overrides a `_tenant` Document or a Built-in with the same `name`:

- **Complete Replace, no Field Merge.** The override Document describes the Tool completely — otherwise, it becomes unclear which fields are currently active. Consistent with Recipe Cascade (§3 in [recipes.md](/specs/recipes)).
- **`primary` is explicit.** It is not inherited from the overridden source in the override — `primary` must be set in the Project Document. Default is `false` (Tool is only accessible via `tool_list`). To make a system primary Tool a secondary Tool in the project, set `primary=false`.
- **Labels are replaced, not merged.** The override Document carries the complete list of labels. To retain system labels, copy them into the Project Document.
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

**Convention**: `@`-prefix indicates a label selector. `@` is not allowed in Tool `name`, so no collision.

**Resolver time**: When a `ThinkProcessDocument` is spawned, `RecipeResolver.applyDefaulting` resolves label selectors via `ServerToolService.findByLabel(tenantId, projectId, label)` to concrete Tool names. The result is persisted in `ThinkProcessDocument.allowedToolsOverride` as a flat list of names — a frozen snapshot, no late re-evaluations.

**Consequence**: If a new Tool with the same label is created after spawning, the running Process does not receive it. This is intentional — reproducibility of a spawn result is more important than live updates.

**Built-in Tools can carry labels.** The Built-in layer of the cascade is read at boot; a Bean can implement `Set<String> labels()` on `Tool` (default method, empty set). This allows `@web` to work even if `web_search` does not exist as a `ServerToolDocument`.

---

## 7. Integration into the ToolDispatcher

The existing `ToolDispatcher` currently aggregates `ServerToolSource` (Built-in Beans) + `ClientToolSource`. With Server Tools, a third source is added:

```
ToolDispatcher
  ├── ConfiguredToolSource   ← ServerToolDocument (Project + _tenant)
  ├── BuiltInToolSource      ← Spring Bean Tools  (currently "ServerToolSource")
  └── ClientToolSource       ← Foot Tools via WebSocket
```

**Order of sources** corresponds to the cascade: `ConfiguredToolSource` first-wins over `BuiltInToolSource`. The Dispatcher queries them sequentially.

**The current Spring Bean collector** will be renamed from `ServerToolSource` → `BuiltInToolSource`, so that the new `ConfiguredToolSource` does not inherit the vacated name and remains semantically clear: "configured" = from Document, "built-in" = from code.

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

**Data Sovereignty**: `ServerToolService` is the only place that directly accesses `ServerToolRepository` — other services call `ServerToolService` (see CLAUDE.md "Data Sovereignty"). In particular, neither `RecipeResolver` nor the `ToolDispatcher` itself accesses the repository.

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

**Hot-Reload**: not v1. Classpath resources are fixed at Brain startup. Tenant and Project YAMLs are updated directly via `ServerToolRegistry.refreshOne` — no restart is required for this.

---

## 10. Relationship to MCP Tool Routing

[mcp-tool-routing.md](/specs/mcp-tool-routing) describes when a Tool is executed **server-side** vs. **client-side**. Server Tools clearly fall into the server bucket: their code runs in the Brain. An MCP server that is only reachable locally from the Foot (e.g., `chrome-devtools`-MCP) remains a **Client Tool** and does not belong in `ServerToolDocument`.

The clean separation:

| Where the logic runs | Where it is configured |
|---|---|
| Brain process (incl. Brain-reachable MCP servers) | `ServerToolDocument` (this spec) |
| Foot process (local files, local MCP servers, browser, IDE) | `ClientToolService` in the Foot, registered via WebSocket |

---

## 11. Out of Scope (v1)

- **Per-User-Tools.** Tools are project-scoped, not user-scoped. This covers current use cases and avoids a fourth cascade layer.
- **Tool Versioning.** There is no history Document; updates overwrite in-place (`@Version` only protects against concurrent writes). Auditing comes with the general audit system, not here.
- **Per-Tool Quota / Rate-Limit.** Cross-Tool quotas continue to run via `LlmResourceService` and `CredentialService` — not here.
- **UI for Tool Configuration.** Web UI gets only read-listings in v1 (in the "Tools" editor); editing via CLI / REST.
- **Live Re-evaluation of Label Selectors** in running Processes (see §6).
- **Per-Process Tool Override.** There is currently `ThinkProcessDocument.allowedToolsOverride` — this spec does not change that. To have a fixed list of Tools per Process, continue to use this mechanism.

---

## 12. Migration of Existing Code Tools

For the transition:

1. **All existing Spring Bean Tools remain Built-in** and are resolved via the Built-in layer. No forced migration to `ServerToolDocument`.
2. **`ServerToolSource` is renamed to `BuiltInToolSource`** (see §7).
3. **The new `ConfiguredToolSource` + `ServerToolService` + `ServerToolRepository` + `ServerToolDocument` are created in `vance-shared` (Document/Repository) and `vance-brain` (Service, Source, Factories)** — analogous to the DocumentService split.
4. **`server-tools.yaml`-Bootstrap** creates the default `_tenant` Tools (Doc lookups for the `documents/how_to_*.md` resources, possibly pre-configured MCP stubs).
5. **Recipes-YAML is not touched** — existing `allowedToolsAdd / allowedToolsRemove` lists function unchanged. Label selectors (`@<label>`) are added additively where appropriate.

Timing for migration of individual Built-in Tools to `ServerToolDocument`: only if they actually need to become configurable. No mass migration "just because it's possible".

---

## 13. Discovery Surface — How the LLM Finds Secondary Tools

Primary Tools are included with their full schema in every turn in the manifest; deferred/secondary Tools are not. The path to them involves three meta-Tools (`vance-brain/.../tools/builtins/`, all `primary=true`, `read-only`, `contributesPrak=false`) plus a passive prompt block:

| Surface | What it provides |
|---|---|
| **Discovery Block** (passive, no Tool) | `ContextToolsApi.discoveryBlockMarkdown()` renders the deferred Tools of the allow-set as `name — searchHint`, grouped by pack prefix with a `promptHint` per pack. Names are therefore **in context**, only the schemas are not. |
| **`tool_list(prefix?)`** | Names of **all** callable Tools, without descriptions: `inContext` (schema already in manifest) and `available` (callable, schema on request), plus `packHints` — a usage line per multi-Tool pack (`<prefix>__*`). `prefix` filters case-insensitive on name prefix. |
| **`tool_description(names)`** | Description + `paramsSchema` for a **list** of names (max. 25 per call; overflow lands in `skipped`). Activates deferred Tools via `ThinkProcessService.activateDeferredTool` — from the next turn, they are in the primary manifest (until the decay TTL expires without use). Unknown names go into `unknown`; if **no** name resolves, it's an error. |
| **`invoke_tool(name, params)`** | Named-Call-Indirection via the bound `ContextToolsApi` — same allow-set/role/profile check as a direct Tool call. Unnecessary for the normal case: a deferred Tool can be called directly, the Engine activates it on the first call itself. |

### 13.1 Capability Floor — `tool_list` + `tool_description` are not configurable away

`ContextToolsApi.MANDATORY_TOOLS` = `{tool_list, tool_description}`. `classify` forces these two **after** Role-Gate, Profile-Gate, `allowedToolsRemove`, and `allowedToolsDefer` into the primary bucket — and adds them to an Engine `allowedTools()` that does not list them.

**Why hardcoded:** These two are the exit from a lean manifest. A Recipe (or the allow-set of a new Engine) that removes them does not produce an error, but a model that answers "I can't do that" while the Tool is in the Dispatcher. This failure mode is invisible in logs and expensive in trust; the floor costs two small schemas (~150 tokens).

**The floor provides discovery, not access.** Both Tools are scoped to `invocableToolNames()` — a tightly caged Vogon phase with allow-set `{doc_write}` sees exactly `doc_write` through `tool_list`, and `tool_description` describes nothing outside this cage (non-invocable names return as `unknown`; the discovery pair itself always remains describable). The allow-set remains the authority over what is callable.

**Deliberately not in the floor:** `invoke_tool` (deferred Tools are directly callable → convenience, and its presence tempts models to wrap every call), `how_do_i` (requires Recipe + LLM credentials, may legitimately be missing), `manual_read` (depends on existing Manuals). Extending is a policy decision — `ContextToolsApiClassifyTest` nails down membership so it doesn't silently drift.

Engines may continue to declare the names themselves (Ford, Frankie, Trillian do this): `allowedTools()` is also read as a pure declaration — `RecipeResolver` forms `(engineDefault ∪ add) ∖ remove` from it, the Magrathea controller displays it. The floor makes the declaration optional, not wrong.

Complementary, but **not** a replacement: `how_do_i` ([how-do-i](/specs/how-do-i)) answers intent questions semantically (LLM call over Manuals + Skills + Non-Primary-Tool cards). `tool_list` answers the deterministic question "what exists".

**Design decision (2026-08-05).** `tool_list`/`tool_description` have **replaced** `find_tools`/`describe_tool` (no aliases). Rationale:

- **Names instead of substring search.** ~272 statically registered Tool names cost ~1.3k tokens — cheaper than the old discovery block with searchHints and complete. The old matcher searched by substring over `name` + `description` and completely ignored `searchHint`; a Tool with a brief description was practically undiscoverable. Visible names are filtered better by the model than a server matcher.
- **Batch instead of N roundtrips.** A REST pack has 15–20 sub-Tools; described individually, that's 20 roundtrips before the LLM can act — in practice, this ends in "I can't do that" instead of a Tool call.
- **Pack Hints instead of Pack Descriptions.** Machine-generated names (`gmail_users_messages_modify` = "mark mail as read") are the one case where the name does not convey the intent. A hint line per pack costs one line instead of a description per sub-Tool.

## 14. Tool Surface Budget — Hard `maxTools` Limit of Endpoints

OpenAI wire endpoints validate the length of the `tools` array **before** the model sees anything. A manifest that is too large returns an HTTP 400:

```
Invalid 'tools': array too long. Expected an array with maximum length 128,
but got an array with length 163 instead.   (code=array_above_max_length)
```

No tokens consumed, no inference — and every subsequent chain entry behind the same endpoint responds identically. The limit is thus a property of the **endpoint**, not the model: a gateway (Cortecs, OpenRouter, vLLM) enforces it for all models it serves.

This leads to a requirement that did not exist before: `primary` was a *set* (everything that was primary fit), now it needs an *order*. And because importance is task-dependent (in the workspace `file_*`/`exec_*` count, in document work `doc_*`), it cannot be statically fixed.

### 14.1 Where the Limit Stands

`maxTools` in the model catalog — provider default in `_provider.yaml`, per-model override in the model Document:

| Location | Meaning |
|---|---|
| `_vance/model/<instance>/_provider.yaml` → `maxTools: 128` | Default for every model of this instance. Bundled for `openai` is set. |
| `_vance/model/<instance>/<slug>.yaml` → `maxTools: 64` | Override for a model. |
| `maxTools: 0` in the model Document | Explicitly "this model has no limit" — suppresses the provider default (same convention as an empty `unsupportedParams` list). |
| Field missing everywhere | No known limit; triage is a no-op (Anthropic today). |

**The sidecar is attached to the instance name, not the `wireType`.** `ModelCatalog.providerSpec` looks up `_provider.yaml` under the `<instance>` directory. A gateway instance `ai.provider.cortecs.type=openai` therefore **does not** inherit the bundled `openai` default — it needs its own `_vance/model/cortecs/_provider.yaml` with the limit that *this* gateway enforces. This is intentional: the number is a property of the endpoint, and a gateway is a different endpoint than OpenAI, even if it speaks the same wire format.

**Never from auto-discovery.** No listing endpoint names the number — it is an API limit, not an observation, so a manual layer like pricing.

**Minimum across the Chain.** The manifest is built once per turn, the resilient layer then potentially moves to the fallback. `ToolBudgetService` therefore takes the `min` over primary + all `fallbackModels`; a budget that only knows the first entry produces a manifest that the fallback must reject.

**Self-correction on drift.** If an endpoint still rejects, `ObservedToolLimitRegistry` learns the number from the error message (per Pod, in-memory) and the next turn cuts appropriately. In this case, the resilient layer **does not** advance the chain — the same request form fails identically everywhere — but breaks with a clear message. The permanent correction is `maxTools:` in the catalog; the WARN line states this.

### 14.2 What is Trimmed

`ContextToolsApi.classify` ends the bucket decision with a budget level (`ToolTriage`): as long as `primary ∪ activated` exceeds the budget, **entire Tool families** are moved to deferred. Order — broad class first, measured demand only within a class:

| Class | Source |
|---|---|
| mandatory | `MANDATORY_TOOLS` (§13.1); never demotable |
| activated | `activatedDeferredTools` of the Process — observed task form instead of prediction |
| `allowedToolsKeep` | Recipe: "important" |
| `allowedToolsAdd` | Recipe: named promotion |
| Built-in | hand-written Server Tools |
| Pack | `<pack>__<op>` (REST/MCP/IMAP) — come in bulk per connected account |
| `allowedToolsDropFirst` | Recipe: "less important" |

- **Family = Demotion Unit** (`ToolFamily`): Pack prefix before `__`, otherwise the first `_`-segment. A half-visible pack is the worst state — the model starts and hits a wall.
- **A named hint cuts a Tool out of its family.** `doc_note_add` in `allowedToolsDropFirst` separates it from `doc_*`, instead of taking the whole family with it. An entry can also be a prefix pattern (`doc_*`) to rank a group without 40 names.
- **Order determines membership, not sorting.** The sent array remains alphabetical (`visibleResolved`) — this is for cache prefix stability.
- **Reserve.** `vance.tools.budget.external-reserve` (default 1) keeps the slot free for the Engine action Tool that is appended to the spec list **outside** of classification (`StructuredActionEngine`) — with 128 classified Tools, it would otherwise be 129 on the wire. `activation-headroom` is **0**: any path that increases the manifest after classification runs through triage again — a `tool_description` activation because `tools()` reclassifies, and `withAdditional` (Skill Tools) because it explicitly readjusts. A standing buffer would only park capability without value in the discovery block. `max-activated-tools` (default 40) prevents a long Process from filling the manifest with activations.
- **Subsequent extension is readjusted.** `ContextToolsApi.withAdditional` (Skill Tools) is the only place that increases primary *after* the cut. It re-executes triage on the combined set and ranks the new Tools as "keep" — a Skill is explicitly active, so its Tools beat what the Recipe only had as default in the manifest anyway. For this, the surface carries the budget context (`withBudget`).
- **Floor > Budget** is a configuration error and throws `ToolBudgetException`, instead of silently cutting off the exit.

### 14.3 Nothing Disappears

Demoted Tools remain in the allow-set, retain their discovery line, and are directly callable (auto-activation on first call). The price of a wrong triage decision is **one roundtrip, not capability** — therefore, the rule can be rough and explainable. Every demotion is logged (INFO with families + numbers, TRACE with each Tool name in demotion order); a silently truncated manifest reads to the model as "does not exist".

**The discovery block is therefore split into two parts** — and this is not cosmetic, but the condition for §14.2's alphabetical array to be useful at all:

| Half | Content | Where it is rendered |
|---|---|---|
| `discoveryBlockMarkdown()` | deferred **minus** those demoted this round | in the **static** system prefix, behind the prompt cache marker |
| `demotedDiscoveryBlockMarkdown()` | exactly those demoted this round | in a **separate dynamic** system message behind the marker |

Membership in the second half follows activation recency and measured demand (§14.4), so it changes **between turns**. If it were in the cache-anchored prefix, every shift in ranking would cost a complete re-read of Engine prompt + Recipe prefix + Manual hooks — precisely the property for which the Tool array is sorted alphabetically. This was real: the demoted names were in the static prefix and broke the cache with every turn change.

The second half is **empty in the normal case** (the budget cuts nothing), and its header explicitly tells the model that a call by name still works — the Engine activates the Tool on first use.

### 14.4 Measurement Data

Two clocks, strictly separated:

- **Activation Recency** per Process (`activatedDeferredTools`, timestamp) — the strong signal, free, no leaking between users.
- **Cross-Session Demand** per Project **and Role** (`tool_usage_stats`, `ToolUsageService`): Key is `(tenantId, projectId, recipeName, toolName)`, where `recipeName` falls back to the Engine name if a Process has no Recipe. Role-scoped because demand is role-specific — a coding worker with 153 `file_read` says nothing about what the chat orchestrator in the same project needs; a common pool would let the busiest worker train the ranking of all others. `calls` (successful invocations) **and** `discoveryHits` (`tool_description` lookups) are counted. Counting only calls would be self-reinforcing — what is demoted is called less often and would remain demoted; discovery demand precedes the hurdle and is the more honest signal. **Not** counted is the delegated half of a wrapper call (`file_read` → `client_file_read`): this is a mechanical consequence, not a second demand — for this, `ToolInvocationListener` has its own `beforeDelegate`/`afterDelegate` hooks, which by default act like normal ones (progress pings remain) and are only silenced by the counter. Separate collection, not Micrometer: Tool name as a metric tag is borderline over ~340 Tools, and Prometheus data is not queryable from the Brain. **Visible** in the "Tool Usage" Insights tab (`GET /brain/{tenant}/admin/projects/{project}/insights/tool-usage`) — a table per role with calls, discovery lookups, and last use; read-only, because the numbers are a consequence of agent behavior and there is nothing to configure.

  **No retention, and this is a deliberate omission, not a failure.** Nothing deletes a row — not even for a `_user_<login>` project whose user is gone. The cardinality is `(tenant × project × recipe × tool)`, both repository queries run over the unique index, so an old row costs storage, not query time; and a row that is never written again stops influencing the ranking on its own because the order is comparative. Above all: there is **no project deletion path** in the tree, so a TTL here would be the only cleanup rule in a system that otherwise has none. If one comes, pruning this collection belongs there.
