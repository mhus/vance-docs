---
title: "Vancetope — Skills"
parent: Specs
permalink: /specs/skills
---

<!-- AUTO-GENERATED from specification/public/en/skills.md — do not edit here. -->

---
# Vancetope — Skills

> A **Skill** is a reusable capability bundle that focuses on a single LLM turn: description + auto-trigger + prompt extension + tool whitelist + reference docs. Skills activate either **implicitly** (Arthur recognizes a suitable Skill based on user intent) or **explicitly** (user types `/skill <name>`). Both paths lead to the same Ford loading code. Skills are orthogonal to Recipes: Recipes configure *how* an Engine runs (Engine choice, defaults, lock), while Skills are integrated capabilities that define *what* it does.
>
> **Persistence:** Skills are stored as document subtrees under `_vance/skills/<name>/SKILL.md` (frontmatter + Markdown body) plus sibling reference files. The cascade `_user_<login> → project → _tenant → classpath:vance-defaults/_vance/skills/` runs via [`DocumentService`](../repos/vance/server/vance-shared/src/main/java/de/mhus/vance/shared/document/DocumentService.java). There is no longer a separate Mongo collection for Skills — editing is done via the Document Editor.
>
> **Skill Actions:** Beyond the pure prompt extension body, a Skill can fire **Engine command sequences** upon activation/deactivation (`activate:` / `deactivate:`) and control whether it remains a permanent capability (`sticky`) or fires once and disappears (`shot`) via a `lifecycle:` variant. A `shot` Skill with a body is a **prompt macro** (the body *is* the fired turn), a `shot` Skill with an empty body and a populated `activate:` is a pure configuration macro — see §2a.
>
> **Execution Location:** A `run:` block decides **where** the activation takes effect — in the calling process (default) or, with `target: spawn`, in a freshly spawned worker that does not inherit the chat history. For review-like work, inheriting is harmful, not helpful: the reviewer should evaluate the code, not the discussion that led to it — see §2c.
>
> **Invocation Arguments:** `/skill <name> <rest>` can render the rest of the line into the Skill (`&#123;{ args.text }}` / `&#123;{ args.<name> }}`) if the Skill declares `arguments:` — see §2b. Authoring instructions as a Manual: `_vance/manuals/skill-authoring.md`.
>
> See also: [recipes](/specs/recipes) | [engine-commands](/specs/engine-commands) (Command Channel behind `activate:`/`deactivate:`) | [completion-guard](/specs/completion-guard) (`guard` verb, example Skill `code-guard`) | [ford-engine](/specs/ford-engine) | [arthur-engine](/specs/arthur-engine) | [settings-system](/specs/settings-system)

---

## 1. Terms and Delimitation

| Term | What it is | Cardinality | Location |
|---|---|---|---|
| **Engine** | Algorithm with lifecycle. Java code. | few (3-5) | `vance-brain/.../<name>/` |
| **Recipe** | Engine configuration bundle: which Engine, which defaults, prompt prefix, tool adaptations, lock flag. | many (10-100) | YAML + Mongo |
| **Skill** | Capability bundle: description, auto-trigger, prompt extension, tool whitelist, reference docs. Composable. | many (open-ended, incl. user Skills) | Document subtree `_vance/skills/<name>/SKILL.md` (Cascade) |
| **Process** | Running instance. Has one Recipe and zero-to-N active Skills. | N per Session | Mongo |

**Recipe vs. Skill — the Delimitation:**

- A Recipe determines the **Engine path** (Ford? Arthur? with which defaults? locked?). A spawn operation requires **exactly one** Recipe.
- A Skill determines the **task coloring** (which domain, which tools, which reference docs). A spawn operation can carry **0..N** Skills.

**Example:** Recipe `analyze` (engine=ford, model=default:analyze, locked=false) is spawned with Skills `[code-review, typescript-style]`. Ford loads Recipe defaults and merges prompt extensions/tool whitelists/reference docs from both Skills.

**What Skills are NOT:**

- Not Engines. Skills do not define a Lane lifecycle, Inbox processing, or status transitions.
- Not Recipes. Skills do not select an Engine, set lock semantics, or have a `default-Recipe` role.
- Not Tools. Tools are atomic capabilities (`web_search`, `process_spawn`); a Skill **uses** Tools but is not one itself.

---

## 2. Skill Schema (YAML Frontmatter + Markdown Body)

A Skill is a Document subtree:

```
_vance/skills/
  <name>/
    SKILL.md                  # frontmatter + body (= promptExtension)
    references/
      <something>.md          # associated reference documents
```

`<name>` comes from the directory name, not from a `name:` field. The SKILL.md contains YAML frontmatter (between `---` fences) followed by the Markdown body. The body is the `promptExtension` — it **may be empty** (a config-only Skill only carries `activate:`/`deactivate:`, see §2a).

| Frontmatter Field | Type | Required | Meaning |
|---|---|---|---|
| `title` | `String` | yes | Display name (UI, Skill picker) |
| `description` | `String` | yes | One line — what does the Skill do? Used (a) for auto-trigger matching (b) displayed in UI tooltip (c) given to Arthur in Skill selection description |
| `version` | `String` (semver) | yes | `1.0.0`, `2.3.1`. Manually assigned |
| `triggers` | `List<SkillTrigger>` | no | Auto-activation conditions (pattern match, intent keywords). Empty = only explicitly activatable |
| `tools` | `List<String>` | no | Tool names that the Skill **requires**. When the Skill is active, these are added to the Engine/Recipe whitelist — never removed |
| `manualPaths` | `List<String>` | no | Folder paths (relative to Document root) that the Skill contributes to `manual_read`/`manual_list` as long as it is active. Pattern "short Skill body + detailed Manuals on demand". Recipe paths from `params.manualPaths` take precedence — Skill paths are appended. Sanitization like `manual_read`: no `..`, no leading `/`, backslashes become `/` |
| `referenceDocs` | `List<SkillReferenceDoc>` | no | Sibling files within the Skill subtree. Appended to the prompt after `promptExtension` or loaded on demand via Tool (see §5b) |
| `tags` | `List<String>` | no | Discovery hints |
| `enabled` | `boolean` | default `true` | Disabled Skills are neither explicitly nor implicitly activatable; a disabled override hides outer-layer Skills with the same name |
| `lifecycle` | `sticky \| shot` | default `sticky` | Activation lifespan (see §2a). `sticky` = remains active until `clear`, body goes into system prompt per turn. `shot` = **never** registers; fires `activate:` once and the **body as a turn prompt** (prompt macro), no `deactivate:` |
| `run` | Map (`target`/`recipe`/`inherit`) | no | **Where** the activation takes effect — in the calling process (default) or in a freshly spawned worker without chat history. See §2c |
| `arguments` | `true \| List<SkillArgument>` | no | Does the Skill consume the rest of the invocation line? See §2b. Missing ⇒ no (the rest is injected as a normal user message) |
| `activate` | `List<String>` | no | [Engine command](/specs/engine-commands) sequence that fires **once** upon activation (Control Plane, no LLM turn). Command notation like the `//` surface (`verb rest…`, e.g., `guard script _vance/guards/my-guard.js`) |
| `deactivate` | `List<String>` | no | Command sequence that fires **once** upon `clear` (Cleanup). **Never** fired for `lifecycle: shot` |

`SkillTrigger`:

| Field | Type | Meaning |
|---|---|---|
| `type` | `PATTERN \| KEYWORDS` | Matching strategy |
| `pattern` | `String` (Regex) | for `type=PATTERN` |
| `keywords` | `List<String>` | for `type=KEYWORDS` |

`SkillArgument` (Schema identical to `scripts[].params`, §13.7 — one schema, no second dialect):

| Field | Type | Required | Meaning |
|---|---|---|---|
| `name` | `String` | yes | Variable name in the template (`&#123;{ args.<name> }}`) |
| `type` | `String` | no (Default `string`) | `string`, `number`, `integer`, `boolean`, `object`, `array` |
| `description` | `String` | no | For authors/UI; v1 not LLM-facing |
| `required` | `boolean` | no (Default `false`) | If the token is missing, **activation** fails (`SkillArgumentException`) |

`SkillReferenceDoc`:

| Field | Type | Meaning |
|---|---|---|
| `title` | `String` | For `INLINE`: Doc header for prompt embed. For `ON_DEMAND`: the `manual_read` argument used to retrieve the body later |
| `file` | `String` | Path relative to the Skill subtree, e.g., `references/checklist.md` |
| `summary` | `String` | Optional. One-line teaser that appears behind the title in the on-demand listing (`- <title> — <summary>`). Ignored for `INLINE` |
| `loadMode` | `INLINE \| ON_DEMAND` | `INLINE` = immediately embedded in the prompt upon Skill activation. `ON_DEMAND` = body is *not* embedded. Instead, a listing block "On-demand references — load via `manual_read`:" appears in the system prompt — fits the pattern "short Skill body + detailed Manuals on demand" (see `manualPaths`) |

**Reference File Layer Pinning:** A `referenceDocs[i].file` is read **against the cascade level that provided the `SKILL.md` itself** — never re-cascaded. This way, a user Skill cannot accidentally pull a `references/checklist.md` from the `_tenant` layer just because its own layer doesn't have one.

---

## 2a. Skill Actions: `activate:` / `deactivate:` + Lifecycle

In addition to the prompt body, a Skill has three optional control ingredients (all may be empty). No `kind:` discriminator — the former "Prompt vs. Config" split is removed: a "config Skill" is simply a Skill with an empty body and a populated `activate:`.

| Ingredient | What | Timing | Level |
|---|---|---|---|
| **body** (`promptExtension`) | Context prompt (may be empty) | `sticky`: **every turn**, as long as active · `shot`: **once** as turn prompt | LLM context / User turn |
| **`activate:`** | [Command](/specs/engine-commands) sequence | **once** upon activation | Control Plane (no LLM) |
| **`deactivate:`** | Command sequence (Cleanup) | **once** upon `clear` | Control Plane |

### Why Commands, not Prompt

`activate:`/`deactivate:` are **Engine commands** (`guard script …`, in the future `status.set …`, `mode.set …`) — deterministic, no model, no token. They run via the [Engine Command Channel](/specs/engine-commands): the `SkillCommandRunner` fires the sequence via the `EngineCommandDispatcher`, **on the Lane** (lane-atomic, before the next turn), not scattered across turns. This cleanly separates the cheap, predictable Control Plane from a model turn.

**Convention: idempotent setters, no imperatives** (`guard script …` / `guard clear` instead of `enableGuard()`). Only then are double activation and cleanup well-defined. `deactivate:` runs **best-effort** and robustly even after *partial* activation (fires all steps, even if one fails) — therefore, each cleanup step must stand on its own.

### Lifecycle Variants

| Variant | In `activeSkills`? | Body | `tools:` | `deactivate:` | Purpose |
|---|---|---|---|---|---|
| **sticky** (default) | yes, until `clear` | every turn in system prompt | yes | upon `clear` | permanent capability/mode |
| **oneShot** | yes, for 1 turn | 1 turn in system prompt | yes | upon auto-clear | one-time prompt injection (`/skill --once`, see §4b) |
| **shot** | **no** | **once as turn prompt** | **no** | **no** | prompt macro and/or configuration macro |

- **sticky** is the normal case: the Skill remains in `activeSkills`, its body is injected every turn, `deactivate:` runs upon `clear`.
- **oneShot** is the existing per-activation mode (the `--once` flag, orthogonal to `lifecycle:`): the body is injected for exactly one turn, then auto-clear including `deactivate:`.
- **shot** (`lifecycle: shot`) **never** registers in `activeSkills` and therefore, by design, cannot contribute anything to the system prompt. Its body **is** therefore the turn prompt: `/skill <name>` fires it once, after which nothing is active and nothing needs to be cleaned up. A `shot` Skill with an **empty** body and a populated `activate:` remains the pure configuration macro it always was (`code-guard`) — the configuration set by idempotent setters outlives the Skill, which is precisely the point.

**Third axis: the location.** `lifecycle` and `--once` govern how long an activation lives. **Where** it takes effect is decided by the independent `run:` block — `target: spawn` shifts the work to a freshly spawned worker without chat history (§2c).

**`shot` vs. `oneShot` — different axes, confusing names.** `shot` is **Control Plane/Turn**: never in the system prompt, no tools, no cleanup. `oneShot` is **Prompt Plane**: a sticky activation with a lifespan of 1 turn (body in system prompt, tools whitelisted, auto-clear afterwards). If you want a mode for exactly one turn, use `--once`; if you want a command, use `shot`.

### Turn Prompt — Precedence

A Skill can initiate exactly **one** LLM turn upon **fresh explicit** activation. Two sources, in this order:

1. `action:` (see below) — applies to every lifecycle.
2. Only for `lifecycle: shot`: the **body**.

A sticky body is **not** a turn prompt — it goes into the system prompt. Both combined are allowed and the normal case for large Skills: long methodology body (sticky, system prompt) + short `action:` as kick-off.

The turn prompt is rendered by the `PromptTemplateRenderer` (Pebble, including `args`). The render context is derived from the process (`recipe`/`mode`/`profile`/`params`) **without** `tier`/`model`/`provider` — no model is resolved at activation time. This is intentional: a turn prompt is a user message; tier branching belongs in a sticky body that the Engine renders with full context per turn.

### Example — `code-guard` (sticky, empty body)

```yaml
---
title: Code Guard
description: If code is finished, ask for build and spec
version: 1.0.0
activate:
  - |
    guard inline
    const res = vance.llm.callForJson("completion-guard", "Evaluate the guard condition.", {
      judge: "Has a development task of the user been completed?",
      task: vance.guard.task,
      output: vance.guard.output,
    });
    if (res && res.fire) {
      vance.guard.continueWith("Was the build run and the specification updated?");
    }
deactivate:
  - guard clear
---
```

Activating installs a [Completion Guard](/specs/completion-guard) via **one** setter; deactivating removes it again. The body is empty — the Skill carries pure Control Plane configuration.

Why `inline` and not the bundled `guard script _vance/guards/llm-judge.js`: the runtime guard is built as `GuardConfig.scriptPath(path, …)` **without `params`** (only Recipe `guard:` entries carry params). The param-driven `llm-judge.js` would therefore find neither `judge` nor `prompt` and would fail-open. Question and follow-up are therefore included in the inline body. A **param-free** custom script, however, can be activated without problems via `guard script <path>`.

### Immediate Turn with `action:`

An optional `action:` field carries an **initial prompt that immediately triggers a turn upon fresh activation** — unlike `activate:`, which never touches a model. This allows a Skill to initiate the work itself: `/skill code-review` activates the Skill *and* starts the review, without the user having to type anything else.

```yaml
---
title: Code Review
description: Review the current changes
version: 1.0.0
action: |
  Review the current code changes now. Gather the diff first, then report.
---
# Skill Body (Review Method) …
```

Rules:

- **Order:** `activate:` commands run **first** (set mode/status/config), **then** the `action:` turn — so the turn sees the new state.
- **Only upon fresh activation.** An already active Skill (idempotent re-activate) does **not** fire `action:` again.
- **`lifecycle: shot`** also fires `action:` (once), even though the Skill never registers in `activeSkills`.
- **No reentrancy risk:** the turn is **not executed inline**, but is added as a message to the process's pending queue + a Lane turn is scheduled (`appendPending` + `scheduleTurn`, sender `_skill`) — the same path as for the [Completion Guard](/specs/completion-guard). Skill activation is already running on the process Lane; a synchronous turn would call it re-entrantly.
- **Optional & empty allowed.** If `action:` is missing (or blank), nothing happens — pure `activate:`/body behavior.

---

## 2b. Invocation Arguments (`arguments:`)

`/skill <name> <rest of line>` passes the rest as **raw arguments** to the Skill. Whether the Skill consumes them is decided solely by the `arguments:` field — and **exactly one** side gets the text:

| `arguments:` | Effect on the rest of the line |
|---|---|
| missing (or `false`) | **Not** bound. Injected as a normal **user message** into the pending queue (with the identity of the calling user) — thus lands in the same Lane turn with the model, just unplaced |
| `true` | Raw consumption: `&#123;{ args.text }}` (entire rest) + `&#123;{ args.words }}` (token list). **No** additional user message |
| List of `SkillArgument` | Raw view **plus** named binding: `&#123;{ args.<name> }}` |

**Binding is positional** (shell convention, identical to the arg grammar of the `//` command surface in [engine-commands](/specs/engine-commands) §42): tokenization by whitespace, each declared argument takes one token, the **last** argument of type `string` binds the rest greedily. Excess tokens are not an error (remain accessible via `args.text`/`args.words`). A missing token for `required: true` causes **activation** to fail (`SkillArgumentException`) — instead of rendering an empty spot in a prompt. Optional arguments without tokens remain unset and render empty in lenient mode. `k=v` parsing is **not** v1.

**Lifespan.** The raw argument string is on `ActiveSkillRefEmbedded.args` (§5d) — a sticky body is re-rendered every turn and therefore needs the arguments beyond activation. Binding is done freshly per turn against the **current** declaration (no caching of the parsed map: cheap, and a Skill edit takes effect immediately). Re-activating an already active Skill with new arguments is a **parameter update**; the turn prompt does not fire again (rule "only upon fresh activation").

**Security boundary.** Arguments go as **data into the render context**, never into the template *source*. Otherwise, a `/skill` line could smuggle template syntax into an untrusted author template, bypassing the `DenyMethodAccessValidator` ([recipes](/specs/recipes) §5.2).

**Example — Prompt Macro with Argument:**

```yaml
---
title: Code Review
description: Review the current changes
version: 1.0.0
lifecycle: shot
arguments:
  - name: scope
    type: string
    description: What to review — a path, a git range, or empty for the working tree.
---
Review the current code changes now.
&#123;% if args.scope %}Scope: &#123;{ args.scope }}.&#123;% else %}Gather the diff first (git status / git diff).&#123;% endif %}
Report bugs with a concrete failure scenario; skip style nits.
```

`/skill code-review src/main/java` → `activate:` commands (none here) → body rendered with `args.scope` → one turn → Skill not active.

---

## 2c. Execution Location (`run:`) — Inline or in the Freshly Spawned Worker

By default, a Skill takes effect **in the calling process**: the sticky body goes into its system prompt, `action:` into its pending queue. For some Skills, this is incorrect. A code review should evaluate the code, not the discussion that led to it — the caller's chat history is actively harmful there (anchoring on the author's justifications, context costs, role mixing). The same applies to second opinions, verification steps, and long research that should not clutter the main thread.

The `run:` block is a **separate axis**, orthogonal to `lifecycle:` (lifespan) and the `--once` flag: it decides the *location*, not the duration.

```yaml
run:
  target: spawn          # inline (default) | spawn
  recipe: code-read      # Required for spawn — the Engine path of the worker
  inherit: none          # Default for spawn
```

| Field | Type | Required | Meaning |
|---|---|---|---|
| `run.target` | `inline \| spawn` | no (Default `inline`) | Where the Skill takes effect |
| `run.recipe` | `String` | yes for `spawn` | Recipe of the child process |
| `run.inherit` | `String` | no (Default `none` for spawn) | Like the Recipe param `inheritContext` — `none` starts the worker without the caller's chat history |

### What Happens with `target: spawn`

| | Caller | Child |
|---|---|---|
| `activeSkills` entry | **no** | **yes, sticky** |
| Body (`promptExtension`) | not injected | System prompt every turn |
| `tools:` / `manualPaths:` | not merged | merged |
| `activate:` / `deactivate:` | not fired | on the child Lane / upon close |
| Turn prompt (`action:`) | not in its own queue | first user message of the child |

The caller therefore retains **nothing**: no active Skill, no injected message, nothing to clean up. The worker reports its terminal status along with the last response via the regular `ProcessEvent` path back to the caller's Inbox; its Lane wakes up and processes the result.

**Implementation without intervention in the process layer:** `SkillSpawnRunner` creates the child via the unchanged `TriggerAction.Recipe` path — **without** `initialMessage`, which means the Engine starts but does not drive a turn. Afterwards, the same `SkillSteerProcessor.activate` that also triggers a `/skill` runs on the **child Lane**. There, the Skill is a completely normal sticky Skill: `allowedSkills` of the host Recipe is checked, `args` land on the `ActiveSkillRefEmbedded` (so the body renders them every turn), and `fireAction` appends the rendered `action:` as the first message. The host Recipe does not need to know the Skill.

### Rules and Limitations

- **`action:` is required.** For a spawn Skill, the body is the worker's system prompt, not its task — without `action:`, the worker would start and idle. If it's missing, Skill loading fails.
- **`lifecycle: shot` is excluded** (load error). `shot` means "registers nowhere", `spawn` means "registers sticky in the child" — there is no interpretation that satisfies both.
- **Only the explicit path spawns.** The auto-trigger activates Skills *during* a running turn; starting a worker as a side effect of a keyword match would be expensive and surprising. `triggers:` on a spawn Skill are a no-op there → WARN on load, `/skill` continues to work.
- **No grandchild.** Activation in the child does not re-run the spawn branch; even a direct `/skill <name>` on the worker does not spawn anything because the Skill is already active there.
- **Child names are indexed** (`code-review-1`, `code-review-2`, …). Process names are unique per session, and a collision is **not an error** at the Executor, but an idempotent soft-success without `processId` — it is detected and retried with the next index, instead of passing as a silent success.
- **"No context" refers to chat history.** The worker is in the same session, so the Memory/RAG cascade still filters along Session → Project. For a review, this is exactly what is desired: project knowledge yes, conversation history no.

### Example

```yaml
---
title: Code Review
description: Review the current changes in a fresh worker, without the chat history
version: 2.0.0
arguments: true
run:
  target: spawn
  recipe: code-read
  inherit: none
action: |
  Review the current code changes now. Gather the diff first, then report.
  &#123;% if args.text %}Scope: &#123;{ args.text }}.&#123;% endif %}
---
# Review Methodology … (System prompt of the worker, not the chat)
```

---

## 3. Cascade — How a Skill is Resolved

For `lookupByName("code-review", scopeContext)`, the `SkillLoader` runs:

```
load(tenantId, userId, projectId, name) → Optional<ResolvedSkill> :=
  1. _user_<userId>/_vance/skills/<name>/SKILL.md   → source = USER
  2. DocumentService.lookupCascade(tenantId, projectId,
                                   "_vance/skills/" + name + "/SKILL.md")
       a. <project>/_vance/skills/<name>/SKILL.md   → source = PROJECT
       b. _tenant/_vance/skills/<name>/SKILL.md     → source = VANCE
       c. classpath:vance-defaults/_vance/skills/<name>/SKILL.md → source = RESOURCE
  3. → empty
```

**First hit wins.** User override beats Project, Project beats `_tenant`, which beats Resource. Step 1 is skipped if `userId` is null (system spawn without user binding). Step 2 runs with `_tenant` as Project default if `projectId` is null.

**Listing (Skill picker, auto-trigger search):** `listAvailable(scopeContext)` returns the **union** of all levels with cascade dedup by `name` (inner layer beats outer). For auto-trigger matching, Arthur iterates over this list. `enabled: false` in a layer removes a Skill from the result — even if outer layers provide it.

**Bundled Skills are the source of truth for standard capabilities.** They are located as directories under `vance-brain/src/main/resources/vance-defaults/_vance/skills/<name>/SKILL.md` (+ optional reference doc files). Format see §9.

**Hot Reload:**
- Resource Skills (classpath) require a Brain restart.
- USER/PROJECT/`_tenant` Skills are read freshly from Mongo with each lookup.

---

## 4. Activation Paths

### 4a. Implicit (Auto-Trigger by Conversation Engine)

Every Conversation Engine (`Ford`, `Arthur`, others in the future) calls the `SkillTriggerMatcher` as a pre-turn hook, as soon as the user message is written to the chat log and before the system prompt is assembled:

1. Build `SkillScopeContext` from the Process (Tenant + Project + User from the Session)
2. `SkillResolver.listAvailable(scope)` — all Skills visible for this Scope (Cascade)
3. Filter:
   - `enabled == true`
   - `triggers` not empty
   - Skill is not already active on the Process
   - If `process.allowedSkillsOverride != null`: Skill must be in the whitelist
4. Trigger match against the user input (lowercase, PATTERN compile cache):
   - `PATTERN`: Java Regex `find()` on the lowercased input (CASE_INSENSITIVE)
   - `KEYWORDS`: Tokenization of the input (`[^a-z0-9]+ → split`, tokens ≥ 2 characters). Trigger fires if ≥ 50% of keywords occur as whole tokens
5. Per match: `SkillSteerProcessor.activate(process, name, oneShot=true)` — the Skill is active only for this turn. For whitelist violation (race), a warning log, turn continues
6. Multiple matches are allowed — the LLM receives the combined prompt extensions and tool whitelists

**One `listAvailable` call per turn** (Mongo + Classpath) plus O(skills × triggers) matching. Compiled Regex patterns are cached in the Matcher. No listing cache in v1 — Mongo costs dominate anyway.

**Sub-Process Spawn is orthogonal.** If Arthur wants to spawn a worker, he calls `process_spawn(recipe=…)` — the worker Recipe carries its own Skill configuration (`defaultActiveSkills` / `allowedSkills` from §7). Auto-trigger and spawn decide independently.

### 4b. Explicit (User Command)

User types in chat:

```
/skill code-review
```

Optional with user message on the same line:

```
/skill code-review look at PR #42
```

**Behavior:**

- **Sticky Activation (Default):** Skill remains active for subsequent turns of this session, until `/skill clear` or session end.
- **One-Shot with `--once`:** `/skill code-review --once` activates only for the next turn.
- **Multiple simultaneously:** `/skill review` followed by `/skill typescript-style` results in active list `[review, typescript-style]`.

**List / Status / Clear:**

| Command | Effect |
|---|---|
| `/skill list` | Lists available Skills in the current Scope, marks which are active |
| `/skill clear` | Deactivates all active Skills for this session |
| `/skill clear <name>` | Deactivates only `<name>` |

### 4c. Conflict Resolution Implicit ↔ Explicit

**Explicit always wins.** If the user has said `/skill foo`, Arthur's auto-match will not override `foo`. Arthur can implicitly activate additional Skills, but not explicitly deactivate them.

### 4d. UI Visibility

Active Skills are displayed as a badge in the chat UI (`Skill: code-review active`), regardless of the activation path. The Web UI `<EditorShell>` reserves a slot for this above the input line (see `web-ui.md` §7).

---

## 5. Loading into the Engines

An active Skill affects three places at Lane turn time. **All** skill-capable Engines are involved: `Ford`, `FrankieEngine`, as well as `Arthur` and `Eddie` (both via `StructuredActionEngine`). The common entry point is `SkillTurnSupport` in `vance-brain/.../skill/` — cascade resolve of `activeSkills`, prompt section, tool union in one place, so the Engines don't diverge.

### 5a. System Prompt

Before the LLM call, the Engine assembles the system prompt from:

```
[1] Engine default prompt (Ford.SYSTEM_PROMPT)
[2] Recipe-promptPrefix (APPEND/OVERWRITE according to promptMode)
[3] Active Skills, in activation order:
       --- Skill: <name> ---
       <description>
       <promptExtension>
       --- Reference Doc: <title> ---
       <content>     (for each SkillReferenceDoc with loadMode=INLINE)
```

Merging occurs in `SkillPromptComposer` (`vance-brain/.../skill/`), called via `SkillTurnSupport.composeSection(process, skills, pebbleContext)`. The section is a **separate** system message, so a Skill activation does not break the cache marker of the static prompt prefix.

Each body is rendered per Skill with **its** arguments (`args` from `ActiveSkillRefEmbedded.args`, bound via `SkillArgumentBinder`) — two Skills active in the same turn do not see each other's arguments. A Skill with a broken Pebble or no longer binding arguments is skipped with `WARN`; the others compose normally.

### 5b. Tool Whitelist

The tool pool results from:

```
allowed = (engine.allowedTools()
            ∪ recipe.allowedToolsAdd)
            \ recipe.allowedToolsRemove
            ∪ ⋃ skill.tools (for each active Skill)
```

The union is passed to the turn's `ContextToolsApi` (`withAdditional`) — not just the spec list, because the action loop dispatches tool calls via the same surface; an advertised but not allowed tool would be rejected upon invocation.

A `lifecycle: shot` Skill contributes **no** tools — it never registers. If additional tools are needed in the macro: `sticky` + `--once`.

Skills can **only add** tools, not remove them. If a Recipe removes a tool `tool_x` from the whitelist, but a Skill explicitly requires `tool_x`, **Skill wins** (tool is available). Rationale: a Skill running without its required tool is broken — Recipe restrictions should not silently break Skills.

### 5c. Reference Docs

`INLINE` docs are appended to the system prompt (see §5a). `ON_DEMAND` docs are lazy-loaded via the tool `skill_reference_doc(skill, title)` — not in v1.

### 5d. Storage Location of Active Skills

`ThinkProcessDocument` gets a new field:

```java
private List<ActiveSkillRef> activeSkills;   // serialized in Mongo

record ActiveSkillRef(
    String name,
    SkillScope resolvedFromScope,    // where it was found
    boolean oneShot,                  // --once Flag
    boolean fromRecipe,               // from recipe.defaultActiveSkills
    Instant activatedAt,
    @Nullable String args             // raw invocation rest (§2b)
) {}
```

On the next turn, Ford reads `process.getActiveSkills()`, resolves each via the Scope (cache per turn), and merges them as above. One-shot Skills are removed from the list after the turn.

---

## 6. Slash Command `/skill`

### 6a. Client-Side (vance-foot, later Web UI)

Both clients implement `/skill` as a slash command. In vance-foot via new `SkillSlashCommand` (Bean, `SlashCommand` interface) in directory `vance-foot/src/main/java/de/mhus/vance/foot/command/`.

**Subcommands:**

| Input | Output Action |
|---|---|
| `/skill <name> [args...]` | `ProcessSkillRequest{ command=ACTIVATE, skillName, args, oneShot=false }` |
| `/skill <name> --once [args...]` | `ProcessSkillRequest{ command=ACTIVATE, skillName, args, oneShot=true }` |
| `/skill list` | REST call `GET /brain/{tenant}/skills/active` + `GET /brain/{tenant}/skills/effective` (no roundtrip through Engine) |
| `/skill clear` | `ExternalCommand("skill.clearAll")` |
| `/skill clear <name>` | `ExternalCommand("skill.clear", { name })` |

The rest of the line goes **exclusively** as `ProcessSkillRequest.args` to the Brain — the client **does not** send its own follow-up message. The client cannot know if the Skill declares `arguments:`; the server decides (§2b) and, in the case of non-consumption, injects a `UserChatInput` with the user's identity itself. Previously, the client decided this — with the result that Foot sent a follow-up message and the Web UI silently discarded the rest of the line.

### 6b. Server-Side (vance-brain)

The `ProcessSkillHandler` (WebSocket message `process-skill`) enforces authorization, serializes the mutation to the process Lane, and calls `SkillSteerProcessor`, which either:

- atomically updates the process's `activeSkills` list (`MongoTemplate.findAndModify`), or
- responds directly for listing operations, without an Engine turn.

**Important:** The slash command is a **structured SteerMessage**, not text. The LLM does not see the activation as user input — it only sees the extended system prompt on the next turn. Thus, `/skill foo bar baz` is not interpreted as a question to the LLM, but as a control signal.

### 6c. Auto-Complete

vance-foot uses JLine-3-Completer, which fills `/skill <TAB>` with names from `SkillResolver.listAvailable(scope)`. Web UI uses a `<VSlashCommandPicker>` analogously (see `web-ui.md` §7).

---

## 7. Composition with Recipes

Recipes control Skills on two axes — *which Skills are active upon spawn* and *which Skills are allowed to become active at all*. Schema details in [recipes.md](/specs/recipes) §6c; here the Skill view.

| Recipe Field | Type | Meaning for Skills |
|---|---|---|
| `defaultActiveSkills` | `List<String>` | Skills that are written to `process.activeSkills` as sticky `fromRecipe=true` upon spawn |
| `allowedSkills` | `List<String>?` | Whitelist. If set, only these Skills may ever become active — trigger match, default-active, `/skill`. Snapshot as `process.allowedSkillsOverride` |

### 7a. Spawn Behavior

`RecipeResolver.applyDefaulting(...)` passes both fields to `AppliedRecipe`. `ThinkProcessService.create(...)`:

1. Converts `defaultActiveSkills` names into `ActiveSkillRefEmbedded` entries (`fromRecipe=true`, sticky, `resolvedFromScope=RESOURCE` as default — Engines re-resolve on turn)
2. Persists `allowedSkills` as `Set<String>?` on `allowedSkillsOverride` — snapshot. Later Recipe edits do not affect the running Process

**Validation during Recipe Parse:** if `allowedSkills` is set, `defaultActiveSkills ⊆ allowedSkills` must hold — otherwise `IllegalStateException` in `RecipeLoader.parse`.

### 7b. Whitelist Filter in the Activation Path

Three activation paths respect `process.allowedSkillsOverride`:

| Path | Behavior for Skill outside Whitelist |
|---|---|
| `/skill <name>` (User explicit) | `SkillSteerProcessor.activate` throws `SkillNotAllowedByRecipeException` ("Skill 'foo' is not allowed by recipe 'analyze'") |
| Trigger Match (future, [§4a](#4a-implicit-auto-trigger-by-conversation-engine)) | `listAvailable` is filtered against the whitelist before the match — trigger Skills outside are invisible |
| `defaultActiveSkills` on Spawn | Already validated during Recipe parse — Recipe would not load at all |

`null` whitelist means "no restriction" (current behavior). Empty list `[]` means "lockdown — no Skill ever active".

### 7c. Lock Semantics

| Recipe Lock | User `/skill clear` | Trigger Match | User `/skill <name>` |
|---|---|---|---|
| `locked=false` | allowed (also fromRecipe Skills) | allowed | allowed |
| `locked=true` | only Skills NOT originating from the Recipe | allowed (additive, in whitelist) | allowed (additive, in whitelist) |

Recipe-bound Skills (`fromRecipe=true`) are a default — they are active because the Recipe needs them. User may activate additional ones (if in `allowedSkills`), but cannot disable the Recipe set if `locked=true`.

### 7d. Conflicts Between Recipe Skills and User Skills

If `recipe.defaultActiveSkills = ["typescript-style"]` and the user calls `/skill typescript-style`: idempotent — the existing `fromRecipe=true` entry is retained, no double add. If the user wanted the same Skill as one-shot, the `oneShot` flag flips (sticky remains sticky on conflict — Recipe author intent wins).

Cascade resolution: activation is against the process's cascade visibility (`SkillScopeContext` from Tenant + Project + User). Recipe default Skill `typescript-style` resolves against the cascade at spawn time — if a Project override exists, it wins. The Recipe only defines the name, not the source.

---

## 8. CRUD via the Document Editor

Skills are Documents — editing therefore happens via the Document layer:

- **Tenant-wide Skill (`_tenant`):** Document subtree with path `_vance/skills/<name>/SKILL.md` in the `_tenant` Project.
- **Project Skill:** same path within the respective user Project.
- **User Skill:** same path within the per-user `_user_<login>` system Project.
- **Reference files:** Sibling paths under the same Skill directory (`skills/<name>/references/checklist.md` etc.) in the **same Project** — not resolved via the cascade.
- **Rollback to Default:** Delete SKILL.md → next lookup falls to the next outer cascade level.

There is no longer a dedicated Skill REST controller. Who is allowed to do what comes from the Document ACL model, once that is defined. The Document paths themselves carry visibility — a user Skill is in the `_user_<login>` Project and is therefore by definition only visible to that user (another user has no access to the Project).

---

## 9. Bundled Skills

Bundled Skills are located as directories under `vance-brain/src/main/resources/vance-defaults/_vance/skills/<name>/`:

```
vance-defaults/_vance/skills/
  code-review/
    SKILL.md             # Frontmatter (YAML) + Markdown body
    references/
      checklist.md       # ReferenceDoc 1
      patterns.md        # ReferenceDoc 2
  typescript-style/
    SKILL.md
```

`SKILL.md` format (same on every cascade level — also in Mongo Documents in `_tenant` / Project / `_user_<login>`):

```markdown
---
title: Code Review
version: 1.0.0
description: Use when user asks to review PRs, diffs, or code changes
tags: [review, quality]
triggers:
  - type: KEYWORDS
    keywords: [review, diff, PR, pull request]
  - type: PATTERN
    pattern: "schau.*(diff|PR|änderung)"
tools:
  - file_read
  - shell_exec
referenceDocs:
  - file: references/checklist.md
    title: Review Checklist
    loadMode: INLINE
  - file: references/patterns.md
    title: Common Patterns
    loadMode: INLINE
---

# Skill Body (= promptExtension)

You are in code review mode. Your task:
- ...
```

The Markdown body **after** the frontmatter is the `promptExtension`. Reference doc files are separate because they can become large.

**Pebble Templating:** The body is passed through the same `PromptTemplateRenderer` that renders recipe `promptPrefix` and Engine default prompts at compose time. The render context is identical (`tier`, `model`, `provider`, `mode`, `profile`, `recipe`, `engine`, `lang`, `params`) — see [recipes](/specs/recipes) §5. This allows a Skill to maintain tier-, mode-, or provider-specific variants within its body (`&#123;% if tier == "small" %}…&#123;% endif %}`), instead of writing two Skills per variant. Reference doc content is **not** rendered — docs are author-controlled data, not templates, and literal `&#123;% %}` text in a doc file must pass through unchanged. Skills with Pebble syntax errors are skipped with a `WARN` log; other active Skills compose normally.

`BundledSkillRegistry` parses on boot:
- Iterates `classpath:vance-defaults/_vance/skills/*/SKILL.md`
- Parses frontmatter (SnakeYAML) + body
- Loads referenced reference doc files from the **same layer** as the SKILL.md
- Validates (`<name>` matches directory, `triggers`/`tools` well-formed)
- Parse errors on a single Skill are logged and skipped — the Brain continues to start, defective Skills are invisible in `recipe_list`/`/skill list`.

---

## 10. Service API

`SkillLoader` in `vance-brain/.../skill/` is the sole source:

```java
public Optional<ResolvedSkill> load(
    String tenantId, @Nullable String userId,
    @Nullable String projectId, String name);

public List<ResolvedSkill> listAvailable(
    String tenantId, @Nullable String userId, @Nullable String projectId);
```

`SkillResolver` is a thin facade:

```java
public Optional<ResolvedSkill> resolve(SkillScopeContext ctx, String name);
public List<ResolvedSkill> resolveAll(SkillScopeContext ctx, List<String> names);
public List<ResolvedSkill> listAvailable(SkillScopeContext ctx);
```

`SkillScopeContext` is a record `(tenantId, userId, projectId)` — analogous to `ToolInvocationContext`, stripped for Skill lookups.

`ResolvedSkill` additionally carries `source: SkillScope` (USER/PROJECT/VANCE/RESOURCE), so UI/logging can display the origin.

---

## 11. Data Sovereignty

`SkillLoader` is the only place that materializes Skills — it calls `DocumentService.lookupCascade` and `findByPath`, no one else does this for Skill paths. Other services call `SkillResolver.resolve(...)` / `listAvailable(...)`. Convention is strict, according to CLAUDE.md.

---

## 12. DTOs (vance-api)

With `@GenerateTypeScript` annotation for Web UI generation:

| Class | Purpose |
|---|---|
| `SkillScope` | Enum (USER/PROJECT/VANCE/RESOURCE) — Cascade source of a resolved Skill |
| `SkillTriggerDto` | Trigger representation |
| `SkillReferenceDocDto` | Reference Doc |
| `SkillTriggerType` | Enum (PATTERN/KEYWORDS) |
| `SkillReferenceDocLoadMode` | Enum (INLINE/ON_DEMAND) |
| `ActiveSkillRefDto` | Active Skill reference in the Process — for UI badge rendering |

---

## 13. Skill Scripts (Phase Plan)

A Skill can **bring its own JavaScript snippets**. Unlike external tools referenced in `tools`, scripts are part of the Skill subtree — they are versioned with the Skill, activated, and pinned to the same cascade level as the SKILL.md.

### 13.1. Schema (Phase 1 — Data Model, not yet implemented in SkillLoader)

In the Skill subtree:

```
skills/<name>/
  SKILL.md
  scripts/
    fetch-diff.js       — one file per script
    post-comment.js
```

Frontmatter lists the scripts:

```yaml
scripts:
  - name: fetch-diff
    target: BRAIN
    file: scripts/fetch-diff.js
    params:
      - name: range
        type: string
        description: Git range for the diff.
        required: true
  - name: post-comment
    target: FOOT
    file: scripts/post-comment.js
```

The optional `params` block declares the input parameters of a script (see §13.7). Multiple scripts per Skill are explicitly allowed — a Skill bundles thematically related operations ("PR review" with `fetch_diff`, `lint`, `post_comment`). Lookup for the script files runs via the same sibling reader as ReferenceDocs (same layer, no cross-layer lookup).

### 13.2. Trigger Model

**Primary Mode (Phase 2):** Script = Tool. When a Skill is active (per Recipe, auto-trigger, or `/skill`), the Engine lifecycle registers a virtual tool per script in the turn's tool loop. Convention: `skill_<skillname>__<scriptname>`. The LLM decides when to call it, like any other tool. When deactivated, the tool is removed.

Skill triggers (PATTERN/KEYWORDS, §4) explicitly **do not** trigger a script — triggers decide on Skill activation, the LLM tool loop decides on script calls. Cleanly separated.

### 13.3. Execution Location

| `target` | Engine | Purpose |
|---|---|---|
| `BRAIN` | `JsEngine` (Brain, GraalJS/Rhino) | Server-side operations — Workspace files, Memory, other Brain tools, REST calls. |
| `FOOT` | `ClientJsEngine` (Foot-CLI, GraalJS/Rhino) | Client-side operations on the user's machine — local FS, local subprocess, editor integration. The Brain sends script + args over the WS connection; Foot evaluates and sends the result back. |

`BRAIN` and `FOOT` use the same sandboxed GraalJS (`allowAllAccess(false)`) — no Java interop, no automatic FS access. **What the script can do is decided by injected host bindings** (see §13.4).

### 13.4. Host Bindings — The Trust Boundary (Phase 3, deferred)

Today, the JS sandbox is tight: pure compute, no project context. For scripts to do useful things, the Engine lifecycle must inject a `vance`-global into the GraalJS context per call. The final surface is part of the Phase 3 implementation; proposed sketch:

```js
// in the script
const diff = vance.tool('git_diff', { range: 'HEAD~1' });          // Call Brain tool
vance.workspace.write('reports/diff.md', diff);                    // Brain only
// Result = value of the last expression (no top-level `return` — that would be a SyntaxError)
({ lines: diff.split('\n').length });
```

Proposed Surface (Brain):

| Binding | Purpose |
|---|---|
| `args` | Input parameters from the LLM tool call (JSON object) |
| `vance.tool(name, params)` | Synchronously call another registered Brain tool — re-entrancy depth limited |
| `vance.workspace.read/write/list/delete(path)` | Project Workspace FS — project-bound, sandboxed like `WorkspaceService` today |
| `vance.context()` | Active Process/Skill/Recipe metadata (read-only) |
| `vance.log(level, msg)` | Trace logging to Skill output |

Proposed Surface (Foot):

| Binding | Purpose |
|---|---|
| `args` | same as Brain |
| `vance.tool(name, params)` | Client tool from the Foot tool set (e.g., local filesystem tools) |
| `vance.fs.read/write/list/delete(path)` | Local FS, scoped to the user's Foot working directory |
| `vance.exec(cmd, args)` | Local subprocess execution — if at all, then with explicit user approval |
| `vance.log(level, msg)` | Identical to Brain — output lands in Brain trace |

Sandbox boundary: what is not exposed via `vance` cannot be done by the script. Open points (sub-spec): re-entrancy limit, approval flow for `vance.exec`, timeout semantics, quota.

### 13.5. FOOT Routing (Phase 3, deferred)

When calling a script with `target=FOOT`:

1. Brain serializes `{ skillName, scriptName, args }` into a WS frame `process-skill-script-execute`.
2. Foot receives, evaluates in `ClientJsEngine` with local bindings, sends result back.
3. Brain passes the result as tool result to the LLM loop.

Requires an extension of the client protocol (see `client-protokoll-erweiterbarkeit.md`). Until Phase 3 is implemented, Brain can be configured to respond to FOOT scripts with "ERROR: foot routing not implemented".

### 13.6. Phase Status

| Phase | Content | Status |
|---|---|---|
| 1 | Data model (`scripts` field, DTOs, Embedded), Editor UI with JS CodeEditor | implemented |
| 2 | Skill-as-Tool mounting (Engine lifecycle registers scripts as tools in the loop) | open |
| 3 | Host bindings (`vance.*` surface), Sandbox tightening, Quota | open |
| 4 | FOOT routing (WS protocol extension) | open |

In v1 (Phase 1), the `scripts` field is only **stored and edited** — the Engine lifecycle ignores it. This is intentional: editor and data model are in place, the runtime contract is not rushed.

### 13.7. Script Param Schema

A script entry can declare its input parameters with types:

```yaml
scripts:
  - name: greet
    target: BRAIN
    file: scripts/greet.js
    params:
      - name: name
        type: string
        description: The person to greet.
        required: true
```

| Field | Type | Required | Meaning |
|---|---|---|---|
| `name` | `String` | yes | Parameter name — the key the LLM passes and the script reads from `args` |
| `type` | `String` | yes | JSON Schema primitive: `string`, `number`, `integer`, `boolean`, `object`, `array` |
| `description` | `String` | no | Description visible to the LLM |
| `required` | `Boolean` | no (Default `false`) | Whether the LLM must provide the parameter |

`SkillScriptTool.paramsSchema()` renders the declaration into the virtual tool's JSON schema: one `properties` property per entry with `type` (+ `description`), `required` parameters land in the `required` array. `additionalProperties` remains `true` — scripts may still read undeclared optional args. Without a `params` block, the tool remains **free-form** (empty `properties`, `additionalProperties: true`) — the script then performs its own shape checks. The benefit of the declaration: even weaker models get an explicit, typed parameter list instead of just the prose in the Skill body — otherwise they call the tool with empty args and the script falls back to its literal defaults.

---

## 14. Visibility & Administration

| Scope | Who can read | Who can write |
|---|---|---|
| `RESOURCE` | all | only code commit (resource file under `vance-defaults/_vance/skills/`) |
| `VANCE` | all Tenant users | Tenant admin via Document Editor in the `_tenant` Project |
| `PROJECT` | all Project members | Project admin via Document Editor in the respective Project |
| `USER` | only the owner | only the owner via Document Editor in the `_user_<login>` Project |

Authorization comes from the Document ACL model — the Document Editor decides who has write access to which Project, and thus indirectly who can edit Skills at which cascade level. A user Skill is in the `_user_<login>` Project and is therefore by definition only writable by that user; another user has no access to the Project.

---

## 15. Open Points

- **Auto-Trigger Language.** Currently Regex + keyword matching. If implicit detection works poorly: a subsequent LLM call ("which Skill fits?") as a second stage — separate spec.
- **Skill Marketplace.** Sharing between Tenants is not planned for v1. If needed: extra Scope `PUBLIC` with its own sync mechanism.
- **Versioning.** Currently manual `version` strings, no migration. For breaking changes, the user must clean up themselves.
- **Reference-Doc `ON_DEMAND`.** In v1, everything is `INLINE`. `ON_DEMAND` requires a new tool `skill_reference_doc(skill, title)` and dynamically changes the token balance — address separately.
- **Recipe `skills` Lock Granularity.** Currently, `recipe.locked=true` atomically locks *all* Recipe Skills. If finer granularity is needed (individual ones removable): `recipe.skillLocks: [name]` as a later extension.
- **Skill Telemetry.** Which Skills were activated how often (implicitly/explicitly), with what success? Needed as soon as the list grows — separate spec.
- **Argument Grammar.** v1 is positional (§2b). `k=v` / flags only when a concrete need arises — then together with the `//` command surface ([engine-commands](/specs/engine-commands) §42), not as a separate dialect.
- **Argument Form in the Web UI.** The declaration (`arguments:`) already contains everything a form needs (name, type, description, required) — the Skill picker does not yet render it. Separate round, same form engine as Wizards/Setting forms.
- **`lifecycle` Names.** `shot` (Control Plane/Turn) and `oneShot` (Prompt Plane, 1 Turn) differ by one letter with completely different meanings. Rename (`shot` → `macro`) would be clearer, but is embedded in docs/tests/bundles — only with deprecated alias and in a separate step.
