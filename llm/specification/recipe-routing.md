# Vancetope — Recipe Routing

> How a Spawn call reaches a specific **Recipe**. The standard trio **eddie / arthur / ford** handles the default path without LLM dispatch; all other Engines are loaded via their Recipes only upon **explicit request**. Without an explicit `recipe=`, the `RecipeSelectorService` decides: a **curated trigger keyword match** routes deterministically (no LLM), otherwise a **semantic LLM call over the full inventory**. A blind Recipe **name** match on free goal text is deliberately **not** implemented (it cannot separate intent from content — "a mind map *about* Python" is not a Python task).
>
> See also: [recipes](recipes.md) | [think-engines](think-engines.md) | [arthur-engine](arthur-engine.md) | [eddie-engine](eddie-engine.md) | [process-delegate](process-delegate.md)

---

## 1. Motivation

In the first iteration, `process_spawn` could be called without `recipe` and without `engine` — the LLM-driven `RecipeSelectorService` would then guess a Recipe, and if none fit, `SlartibartfastFallback` would synchronously generate a new Recipe. This created two problems:

- **Incorrect Routing**: the Selector chose special Engines (marvin/vogon) where eddie/arthur/ford would have been correct — or conversely, did not choose them where they were needed.
- **Latency and Cost**: each "empty" spawn cost an LLM call (Selector), and for NONE, even a complete Slart run (60–180s).

The new rule: **Default is deterministic.** All non-standard Engines are chosen only if the user (or a Skill) *explicitly requests* them — via a trigger in the text (Engine/Recipe name or configured category phrase). The Selector thus becomes an escalation gate instead of the default dispatcher.

---

## 2. Three Standard Recipes — the Default Path

| Recipe | Engine | Role |
|---|---|---|
| `eddie` | eddie | User Frontend (Hub Project Chat). Talks to Project Arthurs via `DELEGATE_PROJECT` / `STEER_PROJECT` |
| `arthur` | arthur | Project Frontend (Session Chat in User Project). Orchestrates Workers via `process_spawn` |
| `ford` | ford | Worker. Tool loop, Validation, RAG, no sub-spawn |

**Default traffic flow (without trigger):**

```
user ─► eddie (Hub Chat)
          ├─► arthur  (via DELEGATE_PROJECT into a User Project)
          └─► ford     (directly spawned, cross-project)

arthur ─► ford       (via process_spawn, default Recipe `default` or `ford`)
```

Other Engines (marvin, vogon, slartibartfast, hactar, zaphod, jeltz, …) are **not** part of this default path. They exist as Recipes and Engines and are activated only via triggers or explicit Recipe selection.

---

## 3. Entry Points and Default Resolution

Three points resolve Recipes — all go through `RecipeResolver.applyDefaulting(...)`:

| Entry Point | Default Behavior |
|---|---|
| `SessionChatBootstrapper` (Session Chat on login) | Hub Project → Recipe `eddie`; otherwise → Recipe `arthur`. Override possible via setting `session.defaultChatEngine` (emergency exit, no magic path) |
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

The default Recipe name (`default`) is deliberately engine-agnostic — today it points to `ford`, but can be overridden by the Tenant without the code knowing.

---

## 4. `RecipeSelectorService` — Trigger Fast Path + Semantic LLM Routing

The Selector is called via the `goal` variable in `process_spawn` — and only if neither `recipe=` nor `engine=` are set (the explicit Recipe/`preset` path bypasses it entirely). Two stages.

### 4.1 Stage 1 — Trigger Keyword Fast Path (deterministic, no LLM)

Recipes declare curated intent phrases in their YAML (`triggers.keywords`, §5). Substring match, case-insensitive, on the lowercased `goal`. **Exactly one** match → direct `MATCH(recipe=<name>)`, no LLM. Curated phrases are collision-safe: `run python` / `python script` match a real Python execution, but not "a mind map about Python".

### 4.2 Stage 2 — Semantic LLM Routing (full catalog)

Zero or multiple trigger matches → **one** LightLlm call (Recipe `recipe-selector`, `internal: true`) over the **entire** routeable inventory (names + descriptions). The LLM reads the Goal against the entire catalog and responds structurally with `MATCH(recipe)` or `NONE`; the returned name is cross-checked against the candidate list (hallucination → NONE).

The call is deliberately accepted: it runs whenever neither an explicit `preset` (upstream in the Engine) nor an unambiguous trigger has already resolved the Recipe. Compared to the unreliable "magic routing" in early field tests (§1), it is hardened in three points: (a) **structured output** (`MATCH`/`NONE` + name cross-check) instead of free-text guessing, (b) `preset` and the trigger fast path intercept unambiguous cases before the call, (c) a `NONE` no longer triggers a synchronous Slart run, but silently falls back to `default` (§4.3). For a core function like routing, a LightLlm call is the right price for correctness.

### 4.3 NONE Fallback

The `triggerObserved` flag in the `Result` separates the two NONE classes:

- **no trigger fired** → `default` Recipe (= ford via bundled `default.yaml`) — the regular Worker including `doc_write`.
- **trigger fired, but LLM NONE** → `routing.fallback.recipe` (Default `slart-and-run`, §6).

### 4.4 No Blind Recipe Name Match

An earlier version had, as a first stage, a word-boundary match of every Recipe **name** in the Goal text (longest wins). This has been **removed**: a string matcher cannot separate a routing intent ("do Python work") from content ("a mind map *about* Python, Java, Scala") — the content word `python` routed to the `python` Recipe, whose ford worker then had no `doc_write` and entered a spawn cascade without ever writing the document. Intent vs. content is a semantic distinction; it belongs to the model (`preset`), to curated trigger phrases (§4.1), or to the semantic LLM stage (§4.2) — never to a name substring.

### 4.5 When the Selector Runs at All

The Selector is currently called only in `ProcessCreateTool`, and even there, only if neither `recipe=` nor `engine=` are set. **This condition remains.** This means the Selector is explicitly tied to the "you decide" mode of the Spawn tool — it does not interfere with Eddie's or Arthur's chat loop on its own.

If Eddie/Arthur want to route the user text, there are two ways:
- direct `process_spawn(recipe="...", goal="...")` from the Engine prompt (preferable for clear user requests)
- `process_spawn(goal="...")` without Recipe — the Selector then runs with trigger pre-check

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
- Multiple Recipes can carry the same trigger → pre-check delivers multiple candidates to the LLM stage (§4.1 Step 3).
- Engine default Recipes (`marvin.yaml`, `vogon.yaml`, …) carry their Engine names plus 1–2 category phrases (DE/EN).
- Standard Recipes `eddie`, `arthur`, `ford`, `default` have **no** `triggers` list — they are called structurally, not via user text.
- Tenant/Project Recipes can carry their own triggers to introduce their own categories.

**Validation during Recipe Load:**
- Empty list is allowed (effectively no trigger).
- Whitespace-only entries are silently filtered.
- Duplicates are de-duped (case-insensitive).

---

## 6. Fallback Recipe — Configurable via Setting

`SlartibartfastFallback` as a hardcoded class is removed. It is replaced by a **setting-driven fallback Recipe**:

| Setting | Default | Meaning |
|---|---|---|
| `routing.fallback.recipe` | `slart-and-run` | Recipe name that is spawned if the Selector recognized a trigger but could not match a specific Recipe. Empty value = no fallback |

**When the fallback fires:** exclusively if the pre-check recognized a trigger (§4.1 Step 3) and the LLM stage (§4.1 Step 4) returned `NONE`. In the trigger-less default path, it never fires — there, `default` → ford applies.

**Why `slart-and-run` as default:** This Recipe bundles Slart (SCRIPT_JS authoring with evidence binding + audit chain) and Hactar (sandboxed Executor) in one spawn — Slart writes a JavaScript to accomplish the task, Hactar executes it. This is more generic than any standard Engine and covers arbitrary user goals. Slart-only is still usable via `routing.fallback.recipe = slartibartfast`; Hactar-only (for existing scripts) via `hactar-run`. See `planning/script-architect-executor-split.md` §6.4.

**Cascade:** Tenant override beats bundled default (`vance-shared`/`SettingService` as usual). Per-project override theoretically possible, but not planned for v1 — the fallback is a Tenant policy.

**Empty-String Semantics:** `routing.fallback.recipe = ""` disables the fallback only for the trigger-observed path. `ProcessCreateTool` then returns a bare `NONE` to the caller for Trigger-NONE. The no-trigger path is unaffected — it always lands in Recipe `default`.

**Both NONE paths side-by-side:**

| Case | Condition | Behavior |
|---|---|---|
| Default Path | no trigger in Goal | spawns Recipe `default` (= ford via bundled `default.yaml`) |
| Setting Fallback | Trigger recognized, LLM returns NONE | spawns `routing.fallback.recipe` (default `slart-and-run`) |
| Setting Fallback off | Trigger recognized, LLM returns NONE, Setting = `""` | bare NONE to Caller; no spawn |
| `fallbackOnNone=false` | Tool param overrides both | bare NONE; no spawn, regardless of trigger |

**Configuration slot for the future:** As soon as a more flexible authoring Recipe than `slart-and-run` is available (e.g., a later `deep-think` variant), the setting value will change. No code change needed.

---

## 7. Updated `ProcessCreateTool` Mode Matrix

| Call | Routing |
|---|---|
| `process_spawn(recipe="X", goal="…")` | RecipeResolver → apply X |
| `process_spawn(engine="ford", goal="…")` | RecipeResolver → engine-direct (with Recipe `ford` if available) |
| `process_spawn(goal="schreib mir was Schönes")` | Selector → no trigger → semantic LLM stage over full inventory → `MATCH` or `NONE(triggerObserved=false)` → Tool spawns Recipe `default` → ford |
| `process_spawn(goal="nutze Marvin um …")` | Selector → no trigger fast path → semantic LLM stage (sees Marvin's description) → usually `MATCH marvin`. A mere content word "marvin" no longer routes blindly |
| `process_spawn(goal="mach eine Mindmap über Python, Java, Scala")` | no trigger (`python` is content, not an execution phrase) → semantic LLM stage → Authoring Recipe/`NONE`→`default`; **never** `python` |
| `process_spawn(goal="ich brauche tiefgehende Analyse")` | Selector → Trigger keyword `tiefgehend nachdenken`: exactly 1 match → deterministic `MATCH`; multiple → semantic LLM stage → `MATCH` (or NONE-after-trigger → Setting Fallback) |
| `process_spawn(goal="…")`, Selector returns NONE AFTER Trigger Match | Tool consults `routing.fallback.recipe` (Default `slart-and-run`); if setting is empty → NONE returned to Caller |
| `process_spawn(recipe="X", engine="Y", …)` | Conflict → `recipe` wins, `engine` is logged with warning |

`fallbackOnNone` (Tool param) is the hard emergency exit: if `false`, it suppresses **both** fallback paths (Default Recipe and Setting Fallback) — the Caller only sees the bare NONE result and decides itself. Default `true`. The former `asyncFallback` param has been removed because the Setting Fallback is synchronous and fast (no more Slart generation).

---

## 8. What Changes in Existing Code

| Component | Change |
|---|---|
| `recipes.md`, Recipe Schema | `triggers.keywords` documented as optional top-level field |
| `vance-api` Recipe DTO + `vance-brain` `RecipeLoader`/`ResolvedRecipe` | Add trigger field (List<String>, case-insensitive de-duped) |
| `RecipeSelectorService.select(...)` | Pre-check before LLM call; cap logic as today, but only over matched candidates |
| `SlartibartfastFallback.java` | Deleted. Replaced by a generic method in `ProcessCreateTool` / a `RecipeFallbackInvoker` that reads the setting and spawns the configured Recipe |
| `SettingsRegistry` / `application.yaml` | New key `routing.fallback.recipe` registered with default `slart-and-run` |
| `vance-defaults/recipes/marvin.yaml`, `vogon.yaml`, `hactar.yaml`, `slartibartfast.yaml`, `zaphod.yaml` | Each `triggers.keywords: […]` with Engine name + 1–2 category phrases (DE/EN) |
| `vance-defaults/recipes/arthur.yaml`, `eddie.yaml`, `ford.yaml`, `default.yaml` | Unchanged (no triggers — called structurally) |
| `ProcessCreateTool` Schema documentation (`description`/`paramsSchema`) | Clear text on new routing: trigger-based, no magic fallback without trigger |
| Kits `vance-author`, `school-essay` | Review Recipes to see if trigger keywords need to be added (use-case specific) |
| `qa/kits/school-essay-script-kit`, `school-essay-script-loop-kit`, `qa/essay`, `qa/essay-slart`, `qa/school-essay-slart` | Adapt fixtures to new trigger mechanism if they rely on Slart fallback |
| `qa/ai-test` classes that directly use `SlartibartfastFallback` | Migrate to explicit Recipe spawn or to the `routing.fallback.recipe` path |

---

## 9. Migration: What Breaks, What Doesn't

**Existing tests / QA fixtures that relied on the Selector + Slart fallback:**

- A `process_spawn(goal="…")` without a trigger previously landed in the LLM Selector and (on NONE) in Slart. With the new logic, the same call lands directly in the `default` Recipe (= ford). Tests expecting a Slart spawn must either set a trigger or explicitly send `recipe="slartibartfast"`.
- Tests that explicitly mock `SlartibartfastFallback` must be switched to the new setting-driven fallback.
- `essay-slart`, `school-essay-slart` QA fixtures: explicitly switch to `recipe="slartibartfast"` (to specifically test Slart-specific behavior), not via fallback.

**What does not break:**

- `process_spawn(recipe="X", …)` and `process_spawn(engine="X", …)` — both paths are unchanged.
- `SessionChatBootstrapper` — behavior is unchanged (Hub→eddie / otherwise→arthur).
- `RecipeResolver`, `RecipeLoader`, `AppliedRecipe`, `applyDefaulting` — interfaces remain the same.

---

## 10. Open Points

- **Trigger Language Cascade**: currently, DE/EN are default phrases in the bundled Recipes. If more languages are added, a separate trigger catalog (analogous to `engines.yaml`) would be more sensible than per-Recipe duplication. V1: phrases directly in the Recipe YAML.
- **Trigger on Tool Result / Sibling Event**: currently, only the Selector scans the `goal` string from the `process_spawn` call. No scan on Tool Results or Sibling Events. Engine-to-Engine routing remains explicit (`process_spawn(recipe=…)`).
- **Skill Layer over Triggers**: Skills (see `skills.md`) can later register their own trigger phrases as a convenience layer — the mechanism for this is not v1, because the Selector's trigger pre-check already achieves the same today.
- **Recipe Visibility for Selector vs. Trigger**: Recipes with tag `engine-default` are currently filtered from the Selector's inventory list (see `RecipeSelectorService.INTERNAL_TAG`). With the new trigger logic, these Recipes must remain selectable via triggers — their own `triggers.keywords` are considered, the filter only applies to the LLM inventory list.
