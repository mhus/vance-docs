# Vance — `process_create_delegate`

> A tool that starts a new Think Process **without the caller needing to know the Recipe name**. Instead, the caller describes the task in natural language; a bundled Selector Recipe selects the appropriate entry from the Project Recipe inventory and delegates to the existing `process_create` spawn path. If nothing matches: `decision: NONE` — the caller decides on the fallback (typically: spawn Slartibartfast for a freshly generated Strategy, or ask the user for clarification).
>
> This tool is **the answer to the Engine/Recipe selection problem**: every caller LLM layer (Arthur, Marvin's PLAN, Slart's PROPOSING) today implicitly selected Recipes, often with pattern-bleed effects ("Slart invents Adams-essay-pipeline for note-taking task"). With `process_create_delegate`, selection is centralized into an explicit, documented layer.
>
> See also: [recipes](recipes.md) | [think-engines](think-engines.md) | [arthur-engine](arthur-engine.md) | [slartibartfast-engine](slartibartfast-engine.md)

---

## 1. Delimitation — when to use which tool?

Vance has two complementary spawn tools for LLM callers:

| Tool | Caller knows | Main Schema Parameter | Use Case |
|---|---|---|---|
| `process_create` | Recipe name | `recipe: <name>` | "Spawn `essay-pipeline` for me" — Recipe choice is made, here is the spec. |
| `process_create_delegate` | Task | `task: <description>` | "Write me a short essay about X" — System should find suitable Recipe. |

Both exist in parallel — no replacement. The LLM chooses based on what it has. If both are available (Recipe name AND description), the explicit form (`process_create`) wins — caller intent is clear.

**Direct `engine: <name>` spawn** via `process_create` remains unchanged for advanced cases. `process_create_delegate` only works with Recipe resolution.

---

## 2. Architecture

```
Caller (Arthur, Marvin's PLAN-LLM, manual CLI call, …)
  │
  ├── process_create_delegate({ name, task, … })
  │
  ▼
ProcessCreateDelegateTool                       [vance-brain.tools.process]
  │
  ├── RecipeSelectorService.select(callerProcess, task)
  │   │
  │   ├── EngineCatalog.renderForPrompt()       [bundled engines.yaml]
  │   ├── RecipeLoader.listAll(tenant, project) [project + tenant + bundled]
  │   ├── single LLM call (callerProcess's model preferences)
  │   └── parse → { decision: MATCH|NONE, recipe, rationale }
  │
  ▼
  ├── decision == NONE → return decision (no spawn)
  │
  └── decision == MATCH → ProcessCreateTool.invoke({ recipe: <picked>, … })
                            │
                            ▼
                          regular spawn path with cascade resolution,
                          profile inheritance, engine start, optional
                          initial steer.
```

Three important characteristics:

1. **Synchronous LLM call, no sub-process spawn** for selection. One round-trip per `delegate` call.
2. **Existing `ProcessCreateTool` as spawn backend** — no duplicated spawn logic. After successful selection, nothing differs from a direct `process_create` call.
3. **`NONE` is first-class**, not an error. The caller receives the Decision object back and decides on the fallback.

---

## 3. Tool Contract

### 3.1 Schema

```json
{
  "name":         "<stable process name, unique per session>",
  "task":         "<natural-language task description>",
  "title":       "<optional human-readable title>",
  "steerContent":"<optional initial USER_CHAT_INPUT>",
  "params":      { … }
}
```

`name` and `task` are mandatory. `title`, `steerContent`, `params` are passed 1:1 to the downstream `process_create` call (with the same semantics).

### 3.2 Output

```json
{
  "decision":  "MATCH" | "NONE",
  "recipe":    "<recipe-name>" | null,
  "engine":    "<engine-name>" | null,
  "rationale": "<why this Recipe or why NONE — 1-2 sentences>",
  "process":   { … }   // only if decision=MATCH; the output of ProcessCreateTool
}
```

If `NONE`, `process` is not set — no spawn occurred. The caller LLM can decide based on the `rationale` whether to call again with a more precise `task` description, spawn Slartibartfast, or ask the user for clarification.

---

## 4. Selector Internals

### 4.1 Engine Catalog

`vance-defaults/catalog/engines.yaml` is the curated description of all Engines. Per Engine: `purpose`, `when_to_use`, `not_for`. Loaded statically at `EngineCatalog` boot time, embedded in the Selector Prompt as a markdown list.

```yaml
engines:
  vogon:
    purpose: "Deterministic linear / branching pipeline runner …"
    when_to_use: "Workflow shape is known in advance. …"
    not_for: "Tasks where the shape of the plan only emerges …"
```

New Engine? Append an entry. No code change. The Catalog is the source for the "which Engine solves what" heuristic of the Selector.

### 4.2 Recipe Inventory

`RecipeLoader.listAll(tenantId, projectId)` aggregates across the Cascade (Project → Tenant → bundled defaults). Only user-pickable Recipes are included in the inventory:

- `_slart/*` excluded (Slart's own outputs are not human-curated workflows)
- `_*` (leading underscore) excluded (system-internal)
- Limit `RECIPE_LIST_LIMIT = 50` as a cap for prompt size

For each Recipe, `name`, `engine`, and `description` are passed to the Selector Prompt. **Recipe description quality is a prerequisite for good Selector performance** — thinly described default Recipes tend to be mismatched or ignored.

### 4.3 Selector Prompt

System Prompt (static):
- Output schema with `decision: MATCH|NONE`, `recipe`, `rationale`
- Decision rules: MATCH only for verbatim Recipe names; NONE if unclear or no fit
- Selection guidance: match on Intent, not surface words; "NONE" is a respectable answer

User Prompt (per call):
- Engine Catalog (rendered)
- Recipe Inventory (list with name/engine/description)
- Task description
- "Pick the matching recipe (or NONE) and emit a single JSON object now."

### 4.4 Existence Check as Defense-in-Depth

Even if the Selector Prompt explicitly says "no inventing names": after parsing, `RecipeSelectorService` checks if the returned `recipe` name exists verbatim in the inventory. If not → `NONE` with diagnostic `"unknown recipe '<x>' — not in inventory"`. Symmetrical to the existing `marvin-recipe-allowed-recipes-exist` validator in [Slart's VALIDATING phase](slartibartfast-engine.md).

### 4.5 LLM Configuration

The Selector calls the LLM with the **model preferences of the Caller Process** — via `ChatBehaviorBuilder.fromProcess(callingProcess, settings, resolver)`. This way, the Selector inherits the same provider/model choice as the caller; no separate configuration is needed.

In tests, `buildChat()` (package-protected) is overridden to bypass the credential cascade.

---

## 5. Decision Flow for the Caller LLM

```
Does the caller have a concrete Recipe name?
├── Yes → process_create(recipe=<name>, …)
└── No → process_create_delegate(task=<description>, …)
            │
            ▼
       decision == ?
            ├── MATCH → spawned, return { process: …, … }
            └── NONE → fallbackOnNone? (default: true)
                        ├── true  → SlartibartfastFallback:
                        │             1. spawn Slart with task
                        │             2. wait for DONE (≤4 min)
                        │             3. spawn generated recipe
                        │             return { decision: NONE, fallback: { … }, process: … }
                        └── false → return { decision: NONE, rationale: … }
                                     Caller decides manually:
                                       - more precise `task` description
                                       - ask user for clarification
                                       - spawn Slart themselves
```

The caller LLM chooses between `process_create` and `process_create_delegate` based on the tool descriptions. Decision cue: does it have a Recipe name or a task description?

### 5.1 Fallback Behavior

`fallbackOnNone: true` (default) makes the tool a **full "give-me-a-running-process" routing layer**:

- Existing Recipe → 1 LLM call, ~5s Latency
- Slart-Fallback (sync) → 1 LLM call + Slart-Pipeline, ~60-180s Latency
- Slart fails → return NONE with Slart-failure-info, no spawn

`fallbackOnNone: false` gives the caller full control — suitable for callers who want to query in case of ambiguity instead of blindly proceeding.

`SlartibartfastFallback` sets a hard wall-clock cutoff (`WAIT_TIMEOUT = 4min`) — if Slart gets stuck, nothing is spawned.

### 5.2 Sync vs. Async Fallback

`asyncFallback: true` (default `false`): Tool spawns Slart and returns immediately with `outcome: PENDING` + `slartProcessId`. Slart runs in the background under the Caller Process (parentProcessId=caller). When Slart reaches CLOSED, the `ParentNotificationListener` fires a process event into the Caller's Pending Queue. The Caller observes this and can manually call `process_create` with the `_slart/<runId>/<name>` Recipe path.

**Auto-spawn of the generated Recipe is omitted in async mode** — the tool call is unblocked, the lifecycle of the spawned Recipe is up to the caller. Suitable for caller LLMs that cannot block for 60-180s (e.g., Foot-CLI user sessions).

| Mode | Tool Wait Time | Auto-Spawn | Caller Task |
|---|---|---|---|
| sync (default) | until Slart DONE | yes | nothing — Recipe is spawned |
| async | immediately | no | observe Slart event, spawn Recipe |

---

## 6. Failure Modes & Fallbacks

| Failure Mode | Selector Behavior |
|---|---|
| Empty `task`-Description | `NONE` with `rationale: "empty task description"` (no LLM call) |
| Project has no Recipes | `NONE` with `rationale: "no recipes available …"` (no LLM call) |
| LLM-Call throws Exception | `NONE` with `rationale: "LLM call failed: <e.getMessage()>"` |
| LLM replies empty / without JSON | `NONE` with `rationale: "LLM reply has no JSON object"` |
| LLM replies with malformed JSON | `NONE` with `rationale: "JSON parse error: …"` |
| LLM-Decision == `MATCH` but `recipe` hallucinated | `NONE` with `rationale: "unknown recipe '<x>' — not in inventory"` |
| LLM-Decision == `NONE` | propagated with LLM-rationale |

Pattern: The Selector shifts every edge case to `NONE` — it never throws, never spawns something incorrect. The caller layer has a consistent failure pattern.

---

## 7. What the tool does **not** do

- **No asynchronous disposition**. The Slart fallback waits synchronously — the caller LLM is blocked during the Slart pipeline. For long Recipes, an async variant (tool returns immediately, Slart runs in the background, caller polls) would be a separate iteration.
- **No Recipe generation within the Selector itself**. If nothing existing fits, Slart takes over — the Selector is single-purpose.
- **No multi-Recipe match**. The Selector selects at most one Recipe. For "do A then B", the caller must split this into two delegate calls OR find a Recipe that encapsulates both steps.
- **No branching into multiple phases**. Linear pipeline through one Engine — if phases are needed, that is a Vogon/Marvin Recipe that phases itself.

---

## 8. Implementation — Location

| Component | File |
|---|---|
| Engine Catalog (Resource) | `vance-brain/src/main/resources/vance-defaults/catalog/engines.yaml` |
| Catalog Loader | `vance-brain/.../delegate/EngineCatalog.java` |
| Selector Service | `vance-brain/.../delegate/RecipeSelectorService.java` |
| Slart Fallback | `vance-brain/.../delegate/SlartibartfastFallback.java` |
| Tool | `vance-brain/.../tools/process/ProcessCreateDelegateTool.java` |
| Unit Tests | `vance-brain/src/test/java/de/mhus/vance/brain/delegate/{EngineCatalog,RecipeSelectorService}Test.java` |

The tool is automatically registered in `BuiltInToolSource` via Spring `@Component`-scan.

---

## 9. What's Next (Open Iterations)

| Item | Description | Status |
|---|---|---|
| **E2E Test** | Probe tests against UC2/UC3 — empirically shows whether delegate closes the hallucination gap | ✅ done |
| **Recipe Description Audit** | Bundled default Recipes often have thin descriptions; for better matching: go through and fill them in | ✅ done (engine-default-tag, web-research polish) |
| **NONE → Slart Auto-Fallback** | Caller-side convenience — if `delegate` returns NONE, automatically spawn Slart, then spawn generated recipe | ✅ done (`fallbackOnNone` default true) |
| **Caller Migration (Arthur)** | DELEGATE-Action: `preset` now optional, without preset Engine routes through `process_create_delegate`. Tool ALLOWED_TOOLS extended with delegate. Prompt documentation in arthur-prompt.md/arthur-prompt-small.md updated with both modes and examples | ✅ done |
| **Caller Migration (Marvin's PLAN)** | WORKER children may now arrive with or without `taskSpec.recipe`. Without recipe, `runWorker` calls `RecipeSelectorService` with `node.goal` as task description and uses the returned Recipe for spawning. Validator accepts recipe-less WORKERs (with non-blank goal). PLAN-system-prompt explains both modes. EXPAND_FROM_DOC childTemplate.recipe remains mandatory (separate iteration). | ✅ done (top-level WORKER) |
| **Marvin EXPAND childTemplate Migration** | `childTemplate.recipe` is now optional. If omitted: each materialized Child lands recipe-less in Marvin's Pre-order-DFS, and runWorker's `pickRecipeViaSelector` routes it during spawn. Cost: 1 Selector-LLM-Call per item — PLAN-Prompt recommends explicit-binding for very large batches | ✅ done |
| **Selector Memoization for EXPAND-Batches** | `runExpandFromDoc` calls the Selector ONCE on the childTemplate-goal-template before `DocumentExpander` materializes. Picked recipe is burned into the childTemplate — all N Children spawn with the same Recipe without further Selector calls. In case of NONE: graceful Fallback to per-child-Selector. Cost reduction: N Calls → 1 Call per EXPAND-Batch. | ✅ done |
| **Async Variant of Fallback** | `asyncFallback: true` parameter on the Tool: spawns Slart and returns immediately with `outcome: PENDING` + `slartProcessId`. Caller observes Slart's terminal event via Parent-Notification (Slart is spawned with `parentProcessId=caller`). Auto-spawn of the generated recipe is omitted in async mode — Caller is responsible. | ✅ done |
| **Catalog Refresh** | `POST /brain/{tenant}/admin/catalog/engines/reload` triggers a re-reading of the bundled `vance-defaults/catalog/engines.yaml` without JVM restart. Idempotent + thread-safe (synchronized + atomic list-replace). In case of parse error, the old entry list remains active. Tenant-scoped by convention (each Tenant-Admin can trigger); refresh effect is global as Catalog is a Singleton. | ✅ done |
| **Tenant Override for Catalog** | ~~Cascade pattern (Project / Tenant / Bundled) for engines.yaml analogous to Recipes.~~ Deliberately rejected: Engines are code-bound and fixed (currently 6, planned max 3-5 more) — a new Engine is always a hard software redeploy. Recipes, however, are 10-100+, dynamic, kit-installable — there, Cascade is worthwhile. Tenant-specific Engine descriptions would have low ROI; Engine-per-Tenant deactivation would be better via Settings/Tool-Allowlists. Existing admin-Reload-Endpoint covers the central update case. | not planned (architecturally unsuitable) |
| **Multi-Match with Score** | ~~Selector returns Top-N Recipe suggestions with confidence scores instead of single-match-or-NONE.~~ Deliberately rejected: no concrete use cases that single-match-or-NONE doesn't already cover. UI picker (show user 3 options) is a Chat-UI feature, not intrinsic to the tool. Council pattern is solved via explicit `council-*`-Recipes. Fallback chain handles Slart-Fallback. If a concrete use case arises: address it specifically. | not planned (solution looking for a problem) |
