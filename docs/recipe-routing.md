---
title: "Vance — Recipe Routing"
parent: Documentation
permalink: /docs/recipe-routing
---

<!-- AUTO-GENERATED from specification/public/en/recipe-routing.md — do not edit here. -->

{% raw %}
---
# Vance — Recipe Routing

> How a Spawn call reaches a specific **Recipe**. The standard trio **eddie / arthur / ford** handles the default path without LLM dispatch; all other Engines are loaded via their Recipes only upon **explicit request**. "Magical" auto-routing from user text occurs exclusively via a deterministic **Trigger-Scan** and an optional, configurable **Fallback-Recipe**.
>
> See also: [recipes](/docs/recipes) | [think-engines](/docs/think-engines) | [arthur-engine](/docs/arthur-engine) | [eddie-engine](/docs/eddie-engine) | [process-delegate](/docs/process-delegate)

---

## 1. Motivation

In the first iteration, `process_create` could be called without a `recipe` and without an `engine` — the LLM-driven `RecipeSelectorService` would then guess a Recipe, and if none fit, `SlartibartfastFallback` would synchronously generate a new Recipe. This created two problems:

- **Incorrect Routing**: the Selector chose special Engines (marvin/vogon) where eddie/arthur/ford would have been correct — or conversely, did not choose them where they were needed.
- **Latency and Cost**: every "empty" spawn cost an LLM call (Selector), and for NONE, even a complete Slart run (60–180s).

The new rule: **Default is deterministic.** All non-standard Engines are chosen only if the user (or a Skill) *explicitly requests* them — via a trigger in the text (Engine/Recipe name or a configured category phrase). The Selector thus becomes an escalation gateway instead of the default dispatcher.

---

## 2. Three Standard Recipes — the Default Path

| Recipe | Engine | Role |
|---|---|---|
| `eddie` | eddie | User Frontend (Hub Project Chat). Communicates with Project Arthurs via `DELEGATE_PROJECT` / `STEER_PROJECT` |
| `arthur` | arthur | Project Frontend (Session Chat in User Project). Orchestrates Workers via `process_create` |
| `ford` | ford | Worker. Tool loop, Validation, RAG, no sub-spawn |

**Default Traffic Flow (without Trigger):**

```
user ─► eddie (Hub-Chat)
          ├─► arthur  (via DELEGATE_PROJECT into a User Project)
          └─► ford     (directly-spawned, cross-project)

arthur ─► ford       (via process_create, Default Recipe `default` or `ford`)
```

Other Engines (marvin, vogon, slartibartfast, hactar, zaphod, jeltz, …) are **not** part of this default path. They exist as Recipes and Engines and are activated only via triggers or explicit Recipe selection.

---

## 3. Entry Points and Default Resolution

Three points resolve Recipes — all go through `RecipeResolver.applyDefaulting(...)`:

| Entry Point | Default Behavior |
|---|---|
| `SessionChatBootstrapper` (Session Chat upon login) | Hub Project → Recipe `eddie`; otherwise → Recipe `arthur`. Override possible via Setting `session.defaultChatEngine` (emergency exit, no magic path) |
| `ProcessCreateHandler` (WS Message `PROCESS_CREATE`) | Like ProcessCreateTool — explicit recipe / explicit engine / defaulting to Recipe `default` |
| `ProcessCreateTool` (LLM Tool, primary spawn path) | Explicit `recipe=` / explicit `engine=` / selector-routed (see §4) |

**`RecipeResolver.applyDefaulting`** (see `recipes.md` §9):

```
applyDefaulting(recipeName, engineName, ...) →
  recipeName != null         → apply(recipeName)
  recipeName == null,
  engineName == X            → if recipe X exists → apply(X)
                                else                → empty (engine-direct Fallback)
  both null                  → apply("default")     // → bundled Recipe `default` → engine ford
```

The default Recipe name (`default`) is intentionally engine-agnostic — today it points to `ford`, but it can be overridden by the Tenant without the code knowing.

---

## 4. `RecipeSelectorService` — keyword-triggered

The Selector is now only called via the `goal` variable in `process_create` and reacts **only to triggers**. Without a trigger, it immediately returns `NONE`; the caller falls back to the default Recipe (`default` → ford).

### 4.1 Pre-Check (deterministic, no LLM)

Before the Selector starts the LLM call, it scans the `goal` string:

1. **Recipe Name Match** — any Recipe name from the project inventory appears in the text (word-boundary, case-insensitive, longest match wins) → directly return `MATCH(recipe=<name>)`. No LLM. Engine names are automatically included because the Engine default Recipes are named after the Engine (`marvin.yaml`, `hactar.yaml`, …).
2. **Trigger Keyword Match** — one or more Recipes have a trigger list in their YAML, and an entry matches the text (substring, case-insensitive). For multi-matches, the LLM stage (step 3) is started with only the matched Recipes as candidates. For exactly one match, it returns directly (no LLM).
3. **LLM Selection** — only if step 2 yielded multiple candidates: the same prompt as today, but only over the matched candidates. Output `MATCH` or `NONE`.
4. **No Trigger** — step 1+2 without a match → `NONE` with `triggerObserved=false`. Caller falls back to the `default` Recipe (= ford via bundled `default.yaml`).

The `triggerObserved` flag in the `Result` separates the two NONE classes: no trigger → default Recipe (regular path); with trigger but no match → `routing.fallback.recipe` (special escalation, default `slart-and-run`).

The order is strict: Recipe Name (specific) > Engine Name (typical) > Trigger Keywords (category). First match wins between stages; within a stage, the LLM or "longest match" decides.

### 4.2 When the Selector Runs at All

In the current code path, the Selector is only called in `ProcessCreateTool`, and even there, only if neither `recipe=` nor `engine=` are set. **This condition remains.** This means the Selector is explicitly tied to the "you decide" mode of the Spawn tool — it does not interfere with Eddie's or Arthur's chat loop on its own.

If Eddie/Arthur want to route the user text, there are two ways:
- direct `process_create(recipe="...", goal="...")` from the Engine prompt (preferred for clear user requests)
- `process_create(goal="...")` without a Recipe — the Selector then runs with trigger pre-check

---

## 5. Recipe Schema: `triggers.keywords`

Recipes can carry an optional trigger block, which is read by the Selector's pre-check:

```yaml
description: Deep-thinking task-tree decomposition for ambiguous goals.
engine: marvin
triggers:
  keywords:
    - marvin                    # Engine name (redundant, but explicitly OK)
    - "deep think"              # EN category
    - "tiefgehend nachdenken"   # DE category
    - "ausführliche analyse"
```

**Semantics:**

- `triggers.keywords` is a `List<String>`, each entry a match pattern (substring match, case-insensitive — no regex in v1).
- Multiple Recipes can carry the same trigger → pre-check provides multiple candidates to the LLM stage (§4.1 Step 3).
- Engine default Recipes (`marvin.yaml`, `vogon.yaml`, …) carry their Engine names plus 1–2 category phrases (DE/EN).
- Standard Recipes `eddie`, `arthur`, `ford`, `default` have **no** `triggers` list — they are called structurally, not via user text.
- Tenant/Project Recipes can carry their own triggers to introduce their own categories.

**Validation during Recipe Load:**
- Empty list is allowed (effectively no trigger).
- Whitespace-only entries are silently filtered.
- Duplicates are de-duped (case-insensitive).

---

## 6. Fallback Recipe — configurable via Setting

`SlartibartfastFallback` as a hardcoded class is removed. It is replaced by a **Setting-driven Fallback Recipe**:

| Setting | Default | Meaning |
|---|---|---|
| `routing.fallback.recipe` | `slart-and-run` | Recipe name to be spawned if the Selector detected a trigger but could not match a specific Recipe. Empty value = no fallback |

**When the Fallback fires:** exclusively if the pre-check detected a trigger (§4.1 Step 3) and the LLM stage (§4.1 Step 4) returned `NONE`. In the trigger-less default path, it never fires — there, `default` → ford applies.

**Why `slart-and-run` as default:** This Recipe bundles Slart (SCRIPT_JS authoring with Evidence-Binding + Audit-Chain) and Hactar (sandboxed Executor) in one spawn — Slart writes a JavaScript to complete the task, Hactar executes it. This is more generic than any standard Engine and covers arbitrary user goals. Slart-only is still usable via `routing.fallback.recipe = slartibartfast`; Hactar-only (for existing scripts) via `hactar-run`. See `planning/script-architect-executor-split.md` §6.4.

**Cascade:** Tenant override beats bundled default (`vance-shared`/`SettingService` as usual). Per-Project override theoretically possible, but not planned for v1 — the fallback is a Tenant policy.

**Empty-String Semantics:** `routing.fallback.recipe = ""` disables the fallback only for the trigger-observed path. `ProcessCreateTool` then returns a bare `NONE` to the caller for Trigger-NONE. The no-trigger path is unaffected — it always lands in Recipe `default`.

**Both NONE paths side-by-side:**

| Case | Condition | Behavior |
|---|---|---|
| Default Path | no trigger in goal | spawns Recipe `default` (= ford via bundled `default.yaml`) |
| Setting Fallback | Trigger detected, LLM returns NONE | spawns `routing.fallback.recipe` (default `slart-and-run`) |
| Setting Fallback off | Trigger detected, LLM returns NONE, Setting = `""` | bare NONE to caller; no spawn |
| `fallbackOnNone=false` | Tool param overrides both | bare NONE; no spawn, regardless of trigger |

**Configuration Slot for the Future:** As soon as a more flexible authoring Recipe than `slart-and-run` is available (e.g., a later `deep-think` variant), the setting value will change. No code change needed.

---

## 7. Updated `ProcessCreateTool` Mode Matrix

| Call | Routing |
|---|---|
| `process_create(recipe="X", goal="…")` | RecipeResolver → apply X |
| `process_create(engine="ford", goal="…")` | RecipeResolver → engine-direct (with Recipe `ford` if available) |
| `process_create(goal="schreib mir was Schönes")` | Selector → no trigger → `NONE(triggerObserved=false)` → Tool spawns Recipe `default` → ford |
| `process_create(goal="nutze Marvin um …")` | Selector → Recipe Name Match → `MATCH marvin` → spawn `marvin`-Recipe |
| `process_create(goal="ich brauche tiefgehende Analyse")` | Selector → Trigger Keyword `tiefgehend nachdenken` → 1+ Recipes → LLM filters → `MATCH` (or NONE-after-trigger → Setting Fallback) |
| `process_create(goal="…")`, Selector returns NONE AFTER Trigger Match | Tool consults `routing.fallback.recipe` (Default `slart-and-run`); if setting is empty → NONE back to caller |
| `process_create(recipe="X", engine="Y", …)` | Conflict → `recipe` wins, `engine` is logged with warning |

`fallbackOnNone` (Tool param) is the hard emergency exit: if `false`, it suppresses **both** fallback paths (default Recipe as well as setting fallback) — the caller only sees the bare NONE result and decides itself. Default `true`. The former `asyncFallback` param has been removed because the setting fallback is synchronous and fast (no more Slart generation).

---

## 8. What Changes in Existing Code

| Component | Change |
|---|---|
| `recipes.md`, Recipe Schema | `triggers.keywords` documented as optional top-level field |
| `vance-api` Recipe DTO + `vance-brain` `RecipeLoader`/`ResolvedRecipe` | Include trigger field (List<String>, case-insensitive de-duped) |
| `RecipeSelectorService.select(...)` | Pre-check before the LLM call; cap logic as today, but only on matched candidates |
| `SlartibartfastFallback.java` | Deleted. Replaced by a generic method in `ProcessCreateTool` / a `RecipeFallbackInvoker` that reads the setting and spawns the configured Recipe |
| `SettingsRegistry` / `application.yaml` | New key `routing.fallback.recipe` registered with default `slart-and-run` |
| `vance-defaults/recipes/marvin.yaml`, `vogon.yaml`, `hactar.yaml`, `slartibartfast.yaml`, `zaphod.yaml` | Each with `triggers.keywords: […]` including Engine name + 1–2 category phrases (DE/EN) |
| `vance-defaults/recipes/arthur.yaml`, `eddie.yaml`, `ford.yaml`, `default.yaml` | Unchanged (no triggers — called structurally) |
| `ProcessCreateTool` Schema documentation (`description`/`paramsSchema`) | Clear text on new routing: trigger-based, no magic fallback without trigger |
| Kits `vance-author`, `school-essay` | Review Recipes to see if trigger keywords need to be added (use-case specific) |
| `qa/kits/school-essay-script-kit`, `school-essay-script-loop-kit`, `qa/essay`, `qa/essay-slart`, `qa/school-essay-slart` | Adapt fixtures to new trigger mechanism if they rely on Slart fallback |
| `qa/ai-test` classes that directly use `SlartibartfastFallback` | Migrate to explicit Recipe spawn or to the `routing.fallback.recipe` path |

---

## 9. Migration: What Breaks, What Doesn't

**Existing tests / QA fixtures that relied on the Selector + Slart fallback:**

- A `process_create(goal="…")` without a trigger used to land in the LLM Selector and (on NONE) in Slart. With the new logic, the same call lands directly in the `default` Recipe (= ford). Tests expecting a Slart spawn must either set a trigger or explicitly send `recipe="slartibartfast"`.
- Tests that explicitly mock `SlartibartfastFallback` must be converted to the new setting-driven fallback.
- `essay-slart`, `school-essay-slart` QA fixtures: explicitly switch to `recipe="slartibartfast"` (to specifically test Slart-specific behavior), not via fallback.

**What does not break:**

- `process_create(recipe="X", …)` and `process_create(engine="X", …)` — both paths are unchanged.
- `SessionChatBootstrapper` — behavior is unchanged (Hub→eddie / otherwise→arthur).
- `RecipeResolver`, `RecipeLoader`, `AppliedRecipe`, `applyDefaulting` — interfaces remain the same.

---

## 10. Open Points

- **Trigger Language Cascade**: currently, DE/EN are default phrases in the bundled Recipes. If more languages are added, a separate trigger catalog (analogous to `engines.yaml`) would be more sensible than per-Recipe duplication. V1: phrases directly in the Recipe YAML.
- **Trigger on Tool Result / Sibling Event**: currently, only the Selector scans the `goal` string from the `process_create` call. No scan on Tool Results or Sibling Events. Engine-to-Engine routing remains explicit (`process_create(recipe=…)`).
- **Skill Layer over Triggers**: Skills (see `skills.md`) can later register their own trigger phrases as a convenience layer — the mechanism for this is not v1, because the Selector's trigger pre-check already provides the same functionality today.
- **Recipe Visibility for Selector vs. Trigger**: Recipes with tag `engine-default` are currently filtered from the Selector's inventory list (see `RecipeSelectorService.INTERNAL_TAG`). With the new trigger logic, these Recipes must remain selectable via triggers — their own `triggers.keywords` will be considered, the filter only affects the LLM inventory list.
{% endraw %}
