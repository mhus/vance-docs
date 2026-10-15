---
title: "Vancetope — Skills"
parent: Specs
permalink: /specs/skills
---

<!-- AUTO-GENERATED from llm/specification/skills.md (translated from the German specification/public/skills.md) — do not edit here. -->

# Vancetope — Skills

> A **Skill** is a reusable capability bundle that focuses on a single LLM turn: description + auto-trigger + prompt extension + tool whitelist + reference docs. Skills activate **implicitly** (Arthur recognizes a suitable Skill based on user intent), **explicitly by the user** (`/skill <name>`), or **explicitly by the agent** (`skill_activate` tool — the same funnel as `/skill`, see Agent Tools §4e). Deactivation is mirrored: `/skill clear [name]` on the user side, `skill_clear` as an agent tool (§4e). All paths lead to the same Ford loading code. Skills are orthogonal to Recipes: Recipes configure *how* an Engine runs (Engine choice, defaults, lock), Skills are integrated capabilities that define *what* it does.
>
> **Persistence:** Skills reside as document subtrees under `_vance/skills/<name>/SKILL.md` (frontmatter + Markdown body) plus sibling reference files. Cascade `_user_<login> → project → _tenant → classpath:vance-defaults/_vance/skills/` runs via [`DocumentService`](../repos/vance/server/vance-shared/src/main/java/de/mhus/vance/shared/document/DocumentService.java). There is no longer a separate Mongo collection for Skills — editing is done via the Document Editor.
>
> **Skill Actions:** Beyond the pure prompt extension body, a Skill can fire **Engine command sequences** upon activation/deactivation (`activate:` / `deactivate:`) and control its lifespan via a `lifecycle:` variant: for **one task** (`turn`, the default — active for one turn, then cleans itself up), as a permanent capability (`sticky`), or as a one-shot macro (`shot`). A `shot` Skill with a body is a **Prompt Macro** (the body *is* the fired turn), a `shot` Skill with an empty body and a populated `activate:` is a pure configuration macro — see §2a.
>
> **Execution Location:** A `run:` block decides **where** the activation takes effect — in the calling process (default) or, with `target: spawn`, in a freshly spawned worker that does not inherit the chat history. For review-like work, inheriting is detrimental, not helpful: the reviewer should evaluate the code, not the discussion that led to it — see §2c.
>
> **Activation Level:** Two sides jointly decide how a Skill is offered: the **Recipe** states via `relevantSkills` which Skills make sense for it (labels/names, exclusions with `!`), the **Skill** states via `activation:` at which level of the ladder `hidden < manual < trigger < agent` it then appears. Not selected = `hidden`. No rights concept: every enabled Skill remains consciously activatable. Details §4g, §7e.
>
> **Invocation Arguments:** `/skill <name> <rest>` can render the rest of the line into the Skill (`&#123;{ args.text }}` / `&#123;{ args.<name> }}`) if the Skill declares `arguments:` — see §2b. Authoring instructions as a Manual: `_vance/manuals/skill-authoring.md`.
>
> See also: [recipes](/specs/recipes) | [engine-commands](/specs/engine-commands) (Command Channel behind `activate:`/`deactivate:`) | [shooty](/specs/shooty) (`guard` verb, example Skill `code-guard`) | [ford-engine](/specs/ford-engine) | [arthur-engine](/specs/arthur-engine) | [settings-system](/specs/settings-system)

---

## 1. Terms and Delimitation

| Term | What it is | Cardinality | Location |
|---|---|---|---|
| **Engine** | Algorithm with lifecycle. Java code. | few (3-5) | `vance-brain/.../<name>/` |
| **Recipe** | Engine configuration bundle: which Engine, which defaults, prompt prefix, tool adjustments, lock flag. | many (10-100) | YAML + Mongo |
| **Skill** | Capability bundle: description, auto-trigger, prompt extension, tool whitelist, reference docs. Composable. | many (open-ended, incl. user Skills) | Document subtree `_vance/skills/<name>/SKILL.md` (Cascade) |
| **Process** | Running instance. Has one Recipe and zero-to-N active Skills. | N per Session | Mongo |

**Recipe vs. Skill — the Delimitation:**

- Recipe decides the **Engine path** (Ford? Arthur? with which defaults? locked?). A spawn operation requires **exactly one** Recipe.
- Skill decides the **task coloring** (which domain, which tools, which reference docs). A spawn operation can carry **0..N** Skills.

**Example:** Recipe `analyze` (engine=ford, model=default:analyze, locked=false) is spawned with Skills `[code-review, typescript-style]`. Ford loads Recipe defaults and merges prompt extensions/tool whitelists/reference docs from both Skills.

**What Skills are NOT:**

- Not Engines. Skills do not define a Lane lifecycle, Inbox processing, or status transitions.
- Not Recipes. Skills do not select an Engine, set lock semantics, or have a `default-Recipe` role.
- Not Tools. Tools are atomic capabilities (`web_search`, `process_spawn`); a Skill **uses** Tools but is not one.

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
| `description` | `String` | yes | One line — what does the Skill do? Used (a) for auto-trigger matching (b) displayed in UI tooltip (c) shown as a card in the "Available skills" advertising section of the turn context if the mode is `agent` (§4g) — write it as "use when …" |
| `version` | `String` (semver) | yes | `1.0.0`, `2.3.1`. Manually assigned |
| `triggers` | `List<SkillTrigger>` | no | Auto-activation conditions (pattern match, intent keywords). Empty = only explicitly activatable |
| `tools` | `List<String>` | no | Tool names that the Skill **requires**. When the Skill is active, these are added to the Engine/Recipe whitelist — never removed |
| `manualPaths` | `List<String>` | no | Folder paths (relative to Document root) that the Skill contributes to `manual_read`/`manual_list` as long as it is active. Pattern "short Skill body + detail manuals on demand". Recipe paths from `params.manualPaths` take precedence — Skill paths are appended. Sanitization like `manual_read`: no `..`, no leading `/`, backslashes become `/` |
| `referenceDocs` | `List<SkillReferenceDoc>` | no | Sibling files within the Skill subtree. Appended to the prompt after `promptExtension` or loaded on demand via tool (see §5b) |
| `tags` | `List<String>` | no | Discovery hints **plus group affiliation**: each tag is a selectable `@label` for Recipe `relevantSkills` (§7e) — "I can contribute to `coding`". Domain labels: `coding`, `design`, `decision`, `writing`, `research`. Logic only reads this field for relevance — trigger, activation, and tool logic never read it |
| `category` | `String` | no | Picker grouping key (kebab-case, normalized to trim + lowercase on parse). Pure display metadata — activation, trigger, and tool logic never read this field. Group order and localized labels come from `_vance/config/skill_categories.yaml` (§4f). If the field is missing, the Skill lands in the last "Other" group of the panel |
| `activation` | `manual \| trigger \| agent` | no | Activation mode — **where** the Skill is offered (monotonic: `manual` ⊂ `trigger` ⊂ `agent`, see §4g). If the field is missing → derived from `triggers:` (present → `trigger`, otherwise → `manual`). An unknown value is a load error, not a silent fallback to `manual` |
| `enabled` | `boolean` | default `true` | Disabled Skills are neither explicitly nor implicitly activatable; a disabled override hides outer-layer Skills with the same name |
| `delegation` | `carry \| stay` | default `carry` | Whether the Skill is carried along when its process delegates work to a worker (§7f). `stay` for Skills that concern the conversation rather than the work |
| `lifecycle` | `turn \| sticky \| shot` | default `turn` | Activation lifespan (see §2a). `turn` = applies for **one task**: active for exactly one turn, then auto-clear (`--sticky` keeps it). `sticky` = remains active until `clear`, body goes into the system prompt per turn. `shot` = **never** registers; fires `activate:` once and the **body as a turn prompt** (Prompt Macro), no `deactivate:` |
| `run` | Map (`target`/`recipe`/`inherit`) | no | **Where** the activation takes effect — in the calling process (default) or in a freshly spawned worker without chat history. See §2c |
| `arguments` | `true \| List<SkillArgument>` | no | Does the Skill consume the rest of the invocation line? See §2b. Missing ⇒ no (the rest is injected as a normal user message) |
| `activate` | `List<String>` | no | [Engine Command](/specs/engine-commands) sequence that fires **once** upon activation (control plane, no LLM turn). Command notation like the `//` surface (`verb rest…`, e.g., `guard script _vance/guards/my-guard.js`) |
| `deactivate` | `List<String>` | no | Command sequence that fires **once** upon `clear` (cleanup). **Never** fired for `lifecycle: shot` |

`SkillTrigger`:

| Field | Type | Meaning |
|---|---|---|
| `type` | `PATTERN \| KEYWORDS` | Matching strategy |
| `pattern` | `String` (Regex) | for `type=PATTERN` |
| `keywords` | `List<String>` | for `type=KEYWORDS` |

`SkillArgument` (schema identical to `scripts[].params`, §13.7 — one schema, not a second dialect):

| Field | Type | Required | Meaning |
|---|---|---|---|
| `name` | `String` | yes | Variable name in the template (`&#123;{ args.<name> }}`) |
| `type` | `String` | no (Default `string`) | `string`, `number`, `integer`, `boolean`, `object`, `array` |
| `description` | `String` | no | For authors/UI; v1 not LLM-facing |
| `required` | `boolean` | no (Default `false`) | If the token is missing, **activation** fails (`SkillArgumentException`) |

`SkillReferenceDoc`:

| Field | Type | Meaning |
|---|---|---|
| `title` | `String` | For `INLINE`: Doc header for prompt embed. For `ON_DEMAND`: the `manual_read` argument with which the body is later retrieved |
| `file` | `String` | Path relative to the Skill subtree, e.g., `references/checklist.md` |
| `summary` | `String` | Optional. One-line teaser that appears in the on-demand listing after the title (`- <title> — <summary>`). Ignored for `INLINE` |
| `loadMode` | `INLINE \| ON_DEMAND` | `INLINE` = immediately embedded into the prompt upon Skill activation. `ON_DEMAND` = body is *not* embedded. Instead, a listing block "On-demand references — load via `manual_read`:" appears in the system prompt — fits the pattern "short Skill body + detail manuals on demand" (see `manualPaths`) |

**Reference File Layer Pinning:** A `referenceDocs[i].file` is read **against the cascade level that provided the `SKILL.md` itself** — never re-cascaded. This prevents a user Skill from accidentally pulling a `references/checklist.md` from the `_tenant` layer just because its own layer doesn't have one.

---

## 2a. Skill Actions: `activate:` / `deactivate:` + Lifecycle

A Skill has three optional control ingredients in addition to the prompt body (all may be empty). No `kind:` discriminator — the former "Prompt vs. Config" split is removed: a "config Skill" is simply a Skill with an empty body and a populated `activate:`.

| Ingredient | What | Timing | Level |
|---|---|---|---|
| **body** (`promptExtension`) | Context prompt (may be empty) | `sticky`: **every turn**, as long as active · `shot`: **once** as turn prompt | LLM context / User turn |
| **`activate:`** | [Command](/specs/engine-commands) sequence | **once** upon activation | Control plane (no LLM) |
| **`deactivate:`** | Command sequence (cleanup) | **once** upon `clear` | Control plane |

### Why Commands, Not Prompt

`activate:`/`deactivate:` are **Engine Commands** (`guard script …`, in the future `status.set …`, `mode.set …`) — deterministic, no model, no token. They run via the [Engine Command Channel](/specs/engine-commands): the `SkillCommandRunner` fires the sequence via the `EngineCommandDispatcher`, **on the Lane** (lane-atomic, before the next turn), not scattered across turns. This cleanly separates the cheap, predictable control plane from a model turn.

**Convention: idempotent setters, not imperatives** (`guard script …` / `guard clear` instead of `enableGuard()`). This is the only way double activation and cleanup are well-defined. `deactivate:` runs **best-effort** and robustly even after *partial* activation (fires all steps, even if one fails) — therefore, each cleanup step must stand on its own.

### Lifecycle Variants

| Variant | In `activeSkills`? | Body | `tools:` | `deactivate:` | Purpose |
|---|---|---|---|---|---|
| **turn** (default) | yes, for **1 turn** | 1 turn in system prompt (user/trigger) or as tool result (agent) | yes, this turn | on auto-clear | Instructions for **one task** (write report, debugging procedure, review checklist) |
| **sticky** | yes, until `clear` | every turn in system prompt | yes | on `clear` | Permanent mode (house style, design blueprint over many turns) |
| **shot** | **no** | **once as turn prompt** | **no** | **no** | Prompt macro and/or configuration macro |

- **turn** is the normal case (since 2026-10-13, planning/skill-activation-levels.md §8): most Skills are instructions for a task, not a permanent state. After the turn, the Skill is gone — nothing drags through the context. How the text arrives depends on the timing:
  - **before the turn** (word trigger, `/skill`, panel ▶): body in the system prompt of exactly this turn, including all tool rounds;
  - **mid-turn** (`skill_activate` by the agent): the system prompt is already built — the instructions therefore come back **as a tool result** (*progressive disclosure*, like with Claude Code) and take effect immediately; they appear once in the history, not in every prompt.
- **sticky** must be declared (`lifecycle: sticky`) or is enforced per activation (`/skill <name> --sticky`, `skill_activate(sticky=true)`). Recipe `defaultActiveSkills` are **always** sticky — there, the Recipe decides the duration, not the Skill.
- **`--once`** (`oneShot`) remains the per-activation flag: it shortens any Skill to one turn. `--once` and `--sticky` simultaneously → `--once` wins.
- **shot** (`lifecycle: shot`) **never** registers in `activeSkills` and therefore cannot contribute to the system prompt by design. Its body **is** therefore the turn prompt: `/skill <name>` fires it once, after which nothing is active and nothing needs to be cleaned up. A `shot` Skill with an **empty** body and a populated `activate:` remains the pure configuration macro it always was (`code-guard`) — the configuration set by idempotent setters outlives the Skill, which is precisely the point.
- **Spawn Skills** (`run.target: spawn`) always register sticky in the child, regardless of `lifecycle` — the child exists for exactly this work.

**Migration (conscious break):** Skills without `lifecycle` were `sticky` until 2026-10-13. If a permanent mode is desired, declare `lifecycle: sticky` now. Already saved activations of running processes remain unchanged.

**Third axis: the location.** `lifecycle` and `--once` regulate how long an activation lives. **Where** it takes effect is decided by the independent `run:` block — `target: spawn` shifts the work to a freshly spawned worker without chat history (§2c).

**`shot` vs. `turn`/`oneShot` — different axes, confusing names.** `shot` is **control plane/turn**: never in the system prompt, no tools, no cleanup. `turn` (and the `oneShot` flag) is **prompt plane**: an activation with a lifespan of 1 turn (body in system prompt or as tool result, tools whitelisted, auto-clear afterwards). If instructions for a task are desired, use `turn`; if a command is desired, use `shot`.

### Turn Prompt — Precedence

A Skill can initiate exactly **one** LLM turn upon **fresh explicit** activation. Two sources, in this order:

1. `action:` (see below) — applies to every lifecycle.
2. Only for `lifecycle: shot`: the **body**.

A sticky body is **not** a turn prompt — it goes into the system prompt. Combining both is allowed and the normal case for large Skills: long methodology body (sticky, system prompt) + short `action:` as a kick-off.

The turn prompt is rendered by the `PromptTemplateRenderer` (Pebble, including `args`). The render context is process-derived (`recipe`/`mode`/`profile`/`params`) **without** `tier`/`model`/`provider` — no model is resolved at activation time. This is intentional: a turn prompt is a user message; tier branching belongs in a sticky body that the Engine renders with full context per turn.

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

Activating installs a [Shooty Guard](/specs/shooty) via **one** setter; deactivating removes it. The body is empty — the Skill carries pure control plane configuration.

Why `inline` and not the bundled `guard script _vance/guards/llm-judge.js`: the runtime guard is built as `GuardConfig.scriptPath(path, …)` **without `params`** (only Recipe `guard:` entries carry params). The param-driven `llm-judge.js` would therefore find neither `judge` nor `prompt` and would fail-open. Question and follow-up are therefore carried in the inline body. A **param-free** custom script, however, can be activated without problems via `guard script <path>`.

### Immediate Turn with `action:`

An optional `action:` field carries an **initial prompt that immediately triggers a turn upon fresh activation** — unlike `activate:`, which never touches a model. This allows a Skill to initiate the work itself: `/skill code-review` activates the Skill *and* starts the review without the user typing anything else.

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
- **Only on fresh activation.** An already active Skill (idempotent re-activate) does **not** fire `action:` again.
- **Who fires is decided by the path** (`ActivationRoute`): the user surface (`/skill`, `process-skill`-WS) fires on fresh activation — there, "activate + initiate" is a gesture. The worker activation of a Spawn Skill also fires (§2c: `action:` is the child's first message there). The **agent** consciously **does not** fire on `skill_activate` — the call happens mid-turn, a planned kick-off would duplicate the ongoing work; the agent explicitly initiates with `skill_fire` (§4e). The implicit paths (auto-trigger §4a, guard scripts) never fire — their surrounding turn covers the work.
- **`lifecycle: shot`** also fires `action:` (once), even though the Skill never registers in `activeSkills`.
- **No reentrancy risk:** the turn is **not executed inline**, but is queued as a message in the process's pending queue + a Lane turn is scheduled (`appendPending` + `scheduleTurn`, sender `_skill`) — the same path as for the [Completion Guard](/specs/shooty). Skill activation is already running on the process Lane, a synchronous turn would call it re-entrantly.
- **Optional & empty allowed.** If `action:` is missing (or blank), nothing happens — pure `activate:`/body behavior.

---

## 2b. Invocation Arguments (`arguments:`)

`/skill <name> <rest of line>` passes the rest as **raw arguments** to the Skill. Whether the Skill consumes them is decided solely by the `arguments:` field — and **exactly one** side gets the text:

| `arguments:` | Effect on the rest of the line |
|---|---|
| missing (or `false`) | **Not** bound. Injected as a normal **user message** into the pending queue (with the identity of the calling user) — thus lands in the same Lane turn with the model, just unplaced |
| `true` | Raw consumption: `&#123;{ args.text }}` (entire rest) + `&#123;{ args.words }}` (token list). **No** additional user message |
| List of `SkillArgument` | Raw view **plus** named binding: `&#123;{ args.<name> }}` |

**Binding is positional** (shell convention, identical to the arg grammar of the `//` command surface in [engine-commands](/specs/engine-commands) §42): tokenization on whitespace, each declared argument takes one token, the **last** argument of type `string` binds the rest greedily. Excess tokens are not an error (remain accessible via `args.text`/`args.words`). A missing token for `required: true` causes **activation** to fail (`SkillArgumentException`) — instead of rendering an empty spot in a prompt. Optional arguments without tokens remain unset and render empty in lenient mode. `k=v` parsing is **not** v1.

**Lifespan.** The raw argument string resides on `ActiveSkillRefEmbedded.args` (§5d) — a sticky body is re-rendered every turn and therefore needs the arguments beyond activation. Binding is done freshly per turn against the **current** declaration (no caching of the parsed map: cheap, and a Skill edit takes effect immediately). Re-activating an already active Skill with new arguments is a **parameter update**; the turn prompt does not fire again (rule "only on fresh activation").

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
    required: false # Changed to false for better example
---
Review the current code changes now.
&#123;% if args.scope %}Scope: &#123;{ args.scope }}.&#123;% else %}Gather the diff first (git status / git diff).&#123;% endif %}
Report bugs with a concrete failure scenario; skip style nits.
```

`/skill code-review src/main/java` → `activate:` commands (none here) → body rendered with `args.scope` → one turn → Skill not active.

---

## 2c. Execution Location (`run:`) — Inline or in Freshly Spawned Worker

By default, a Skill takes effect **in the calling process**: the sticky body goes into its system prompt, `action:` into its pending queue. For some Skills, this is incorrect. A code review should evaluate the code, not the discussion that led to it — the caller's chat history is actively detrimental there (anchoring to the author's justifications, context costs, role mixing). The same applies to second opinions, verification steps, and long research that should not clutter the main thread.

The `run:` block is a **separate axis**, orthogonal to `lifecycle:` (lifespan) and the `--once` flag: it decides the *location*, not the duration.

```yaml
run:
  target: spawn          # inline (default) | spawn
  recipe: code-read      # Required for spawn — the worker's Engine path
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
| `activate:` / `deactivate:` | not fired | on the child Lane / on close |
| Turn prompt (`action:`) | not in its own queue | first user message of the child |

The caller therefore retains **nothing**: no active Skill, no injected message, nothing to clean up. The worker reports its terminal status along with the last response via the regular `ProcessEvent` path back to the caller's Inbox; its Lane wakes up and processes the result.

**Implementation without intervention in the process layer:** `SkillSpawnRunner` creates the child via the unchanged `TriggerAction.Recipe` path — **without** `initialMessage`, which is why the Engine starts but does not run a turn. Afterwards, the **child Lane** runs the same `SkillSteerProcessor.activate` that also triggers a `/skill`. There, the Skill is a completely normal sticky Skill: `allowedSkills` of the host Recipe is checked, `args` land on the `ActiveSkillRefEmbedded` (so the body renders them every turn), and `fireAction` appends the rendered `action:` as the first message. The host Recipe does not need to know the Skill.

### Rules and Limitations

- **`action:` is required.** For a Spawn Skill, the body is the worker's system prompt, not its task — without `action:`, the worker would start and idle. If it's missing, Skill loading fails.
- **`lifecycle: shot` is excluded** (load error). `shot` means "never registers anywhere", `spawn` means "registers sticky in the child" — there is no interpretation that satisfies both.
- **Only explicit paths spawn.** User surface (`/skill`) and agent (`skill_activate`) may start the worker — both are conscious gestures. The implicit paths (auto-trigger, guard scripts) activate Skills *during* an ongoing turn; starting a worker as a side effect of a keyword match would be expensive and surprising — there, activating a Spawn Skill is a silent no-op (nothing registered, nothing spawned). `triggers:` on a Spawn Skill are the no-op case → WARN on load.
- **No grandchild.** Activation in the child does not re-run the spawn branch; even a direct `/skill <name>` on the worker does not spawn anything because the Skill is already active there.
- **Child names are indexed** (`code-review-1`, `code-review-2`, …). Process names are unique per session, and a collision at the Executor is **not an error**, but an idempotent soft-success without `processId` — it is detected and retried with the next index, instead of passing as a silent success.
- **"No context" refers to chat history.** The worker is in the same session, so the memory/RAG cascade still filters along Session → Project. For a review, this is exactly what is desired: project knowledge yes, conversation history no.

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

When `lookupByName("code-review", scopeContext)` is called, the `SkillLoader` runs:

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

**Bundled Skills are the source of truth for standard capabilities.** They reside as directories under `vance-brain/src/main/resources/vance-defaults/_vance/skills/<name>/SKILL.md` (+ optional reference doc files). Format see §9.

**Hot Reload:**
- Resource Skills (classpath) require a Brain restart.
- USER-/PROJECT-/`_tenant` Skills are read freshly from Mongo on each lookup.

---

## 4. Activation Paths

### 4a. Implicit (Auto-Trigger by Conversation Engine)

Every Conversation Engine (`Ford`, `Arthur`, more in the future) calls the `SkillTriggerMatcher` as a pre-turn hook as soon as the user message is written to the chat log and before the system prompt is assembled:

1. Build `SkillScopeContext` from the Process (Tenant + Project + User from the Session)
2. `SkillResolver.listAvailable(scope)` — all Skills visible for this scope (Cascade)
3. Filter:
   - `enabled == true`
   - `triggers` not empty
   - Skill is not already active on the Process
   - Effective activation mode ≠ `manual` (§4g — an override to `manual` disarms the triggers)
   - If `process.allowedSkillsOverride != null`: Skill must be in the whitelist
4. Trigger match against the user input (lowercase, PATTERN compile cache):
   - `PATTERN`: Java Regex `find()` on the lowercased input (CASE_INSENSITIVE)
   - `KEYWORDS`: Tokenization of the input (`[^a-z0-9]+ → split`, tokens ≥ 2 characters). Trigger fires if ≥ 50% of keywords occur as whole tokens
5. Per match: `SkillSteerProcessor.activate(process, name, oneShot=true)` — the Skill is active only for this turn. For whitelist violation (race), warning log, turn continues
6. Multiple matches are allowed — the LLM receives the combined prompt extensions and tool whitelists

**One `listAvailable` call per turn** (Mongo + Classpath) plus O(skills × triggers) matching. Compiled Regex patterns are cached in the matcher. No listing cache in v1 — Mongo costs dominate anyway.

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

- **Sticky activation (default):** Skill remains active for subsequent turns of this session until `/skill clear` or session end.
- **Duration:** a `turn` Skill (default) applies for the next turn; `--sticky` keeps it, `--once` shortens any Skill to one turn. `/skill <name> <Text>` immediately starts the turn with the text; `/skill <name>` alone waits for the next message (exception: Skills with `action:` fire immediately).
- **Multiple simultaneously:** `/skill review` followed by `/skill typescript-style` results in active list `[review, typescript-style]`.

**List / Status / Clear:**

| Command | Effect |
|---|---|
| `/skill list` | Lists available Skills in the current scope, marking which are active |
| `/skill clear` | Deactivates all active Skills for this session |
| `/skill clear <name>` | Deactivates only `<name>` |
| `/skill mode <name> manual\|trigger\|agent [user\|project\|tenant]` | Sets the activation mode (§4g) as an override in the user tier — `mode` is the third reserved subcommand word besides `list`/`clear`; REST write path, no `process-skill` roundtrip |

### 4c. Conflict Resolution Implicit ↔ Explicit

**Explicit always wins.** If the user has said `/skill foo`, Arthur's auto-match will not override `foo`. Arthur can implicitly activate additional Skills, but not explicitly deactivate them.

### 4d. UI Visibility

Active Skills are displayed as a badge in the chat UI (`Skill: code-review active`), regardless of the activation path. The Web UI `<EditorShell>` reserves a slot for this above the input line (see `web-ui.md` §7).

The Skill panel of the Web UI (chat, right sidebar) and `/ui-skill` in Foot also list the complete Skill list with status — active (`✓`), one-time, recipe-bound, macro (`lifecycle: shot`) — and offer the same controls as the slash commands: activate (in the web via the composer, so arguments can still be specified; in Foot via dialog with argument prompt), deactivate per Skill (recipe-bound ones remain, §7a — the control is disabled or reports this) and a detail view with all metadata (auto-triggers, arguments, tools, manual paths, reference docs, scripts, activate/deactivate sequences).

### 4e. Agent Tools (`skill_activate` / `skill_fire` / `skill_clear`)

The agent (the LLM in the turn) controls Skills with **three** tools. All are tools in the `BuiltInToolSource` (non-`primary`, labels `eddie`/`skill`/`process`) and call the **same funnel** (`SkillSteerProcessor`) as the `/skill` surface — Recipe whitelist locks, argument binding, disabled refusal, and `deactivate:` cleanup behave identically across all paths:

| Tool | Funnel | Corresponds to |
|---|---|---|
| `skill_activate` | `SkillSteerProcessor.activate(...)` with route `AGENT` | `/skill <name> [--once\|--sticky] [args…]` — **without** `action:` auto-fire: the agent activates mid-turn, a planned kick-off would duplicate the ongoing work. The result carries the **rendered instructions** (`instructions`: body, INLINE reference docs, ON_DEMAND pointers — as the system prompt would carry them) so they take effect in the same turn; Ford and Frankie then rebuild the tool list so that `tools:` of the Skill are available from the next tool round (in Arthur/Eddie/Nutrimat/Wowbagger only from the next turn — so not for a `turn` Skill). A `shot` Skill only runs its `activate:` commands |
| `skill_fire` | `SkillSteerProcessor.fire(...)` | the `action:` part of a fresh `/skill` as an explicit call: schedules the turn prompt as a new turn. Sticky Skills must be active for this (first `skill_activate`), `shot` Skills fire directly (prompt macro execution), Spawn Skills honestly report the worker path. Never runs `activate:` sequences and never registers anything |
| `skill_clear` | `SkillSteerProcessor.clear` / `clearAll` | `/skill clear [name]` — recipe-bound Skills remain (§7a), `deactivate:` fires best-effort |

**All process-bound.** Without `processId` in the invocation context, there is nothing to control — CLI one-shots and MCP calls receive a clear `ToolException` instead of a silent no-op.

**No mode gate (§4g):** the activation mode only regulates where a Skill is offered, not who may activate it. `skill_activate` and `skill_fire` activate any enabled Skill — even a `manual` Skill that the agent found via `how_do_i`. Only `disabled` Skills and Skills outside the Recipe whitelist (`allowedSkills`) are refused. Offered Skills appear under "Available skills" in the context (§4g), the rest remains `how_do_i` discovery.

**Why the activation/fire separation.** On the user surface, "activate + initiate" is a gesture — there, the funnel fires on fresh activation (§2a). The agent, however, calls `skill_activate` mid-turn to get the Skill's instructions for *this* work; an automatically scheduled turn would initiate the same work twice. Therefore: `skill_activate` only switches on, `skill_fire` is the explicit kick-off — the same level separation that `activate:` (control plane) and `action:` (LLM turn) have in the Skill schema.

**`skill_clear` reports honestly instead of silently.** The tool does not guess whether a Skill is still desired; it responds with one of three note sentences: *cleared* (instructions end from the next turn, cleanup commands ran), *was not active*, or *recipe-bound — stays for the process lifetime*. Without `name`, it clears all non-recipe Skills; the tool description guides the model to named clears — clean up a finished phase, not generally delete the user's state.

**Delimitation from §4c.** §4c regulates the *implicit* auto-trigger path: Arthur's trigger match must not deactivate user-explicit Skills. A conscious `skill_clear` call is an *explicit* control path and follows the same rule as the user surface — everything except recipe-bound is clearable. A sharper boundary by activation source (`activatedBy: user|agent`) is a consciously open point (§15).

**Why a Clear Tool for the Agent.** `turn` Skills clean themselves up. A sticky Skill that the agent itself activated keeps its body in every subsequent turn in the system prompt and its tools in the whitelist. If the phase that justified it is over, the agent should end it instead of dragging the context along — the same hygiene that the user applies with `/skill clear`.

### 4f. Categories (`category:` + `_vance/config/skill_categories.yaml`)

The Skill panel of the Web UI and later pickers group the LIST results by the `category:` frontmatter field — the same concept as the Recipe picker ([recipes.md](/specs/recipes) §6e). Involved parts:

- **`SkillCategoriesService`** (Brain) reads `_vance/config/skill_categories.yaml` via `DocumentService.lookupCascade` — `<project>/…` → `_vance` tenant document → bundled resource — the same cascade level through which each Skill is resolved. Without a project in scope (Hub chat), `SkillLoader.effectiveProjectId` accesses `_tenant` as everywhere else.
- **Server-side sorting, in `process-skill`-LIST:** **(1)** Category group — documented categories in doc order, then undocumented categories alphabetically, Skills without `category` last — **(2)** within `title || name`, case-insensitive. The response (`ProcessSkillResponse`) carries the flat list plus the `categories` metadata; the client groups by key on first occurrence and trusts the server sorting — no second roundtrip.
- **Open locale definition:** each entry is `{ id, title: { <lang>: <text> } }`. The server never resolves a locale; the client selects by UI language with fallback chain `title[locale] || title[<base-lang>] || title.en || humanized Id` (`code-read` → "Code Read").
- **Neither complete nor mandatory.** Categories not mentioned in the document still appear (alphabetically after the documented ones); a missing document means alphabetical group order without labels; Skills without `category` form the last "Other" group. A malformed document is logged and ignored (fail-open) — a broken config file must not prevent Skill listing.
- **Pure display metadata.** `category` only controls discovery presentation: activation, auto-trigger, spawns, and tool whitelists never read this field; `/skill <name>` still accepts all Skills regardless of any category.
### 4g. Activation Level: `activation:`, Recipe Relevance, Override Doc and "Available skills"

The level is **configuration** and answers the question *how is this Skill offered here?*
It arises from two sides that do not need to know each other
(planning/skill-activation-levels.md §7):

- **Recipe → Relevance.** `relevantSkills` (§7e) states which Skills make sense for the Recipe.
  What it does not select is `hidden` on processes of this Recipe. If the field is missing, everything is relevant.
- **Skill → Level.** `activation:` states how the Skill appears *if* it is relevant —
  overridable by override doc (below).

Effective level = `hidden` if the Recipe does not select the Skill or its mode is `hidden`;
otherwise the mode. Calculated at **one** place (`SkillLevelResolver`), from which all consumers read.
The Recipe never raises a level — it only filters.

| Level | Skill Panel | Word Trigger | "Available skills" List | consciously activatable |
|---|---|---|---|---|
| `hidden` — not useful | hidden, visible via toggle | – | – | yes |
| `manual` | visible | – | – | yes |
| `trigger` — word | visible | **yes** (`triggers:` provides the patterns) | – | yes |
| `agent` — AI | visible | **no** — the model decides | **yes** | yes |

"Consciously activatable" means: `/skill`, ▶ in the panel, `skill_activate`/`skill_fire`, `defaultActiveSkills`
work at **any** level — the level is not a right. Only `enabled: false` (hard
kill switch) and Skills outside the Recipe whitelist `allowedSkills` are blocked. The active state on the process
(`ActiveSkillRef`) is a **separate axis**: an active Skill remains active and visible in the panel,
even if it is `hidden` in the context.

**`agent` disables triggers.** For `agent`, the model decides based on the list whether the Skill
is suitable; a word match would preempt this decision. A `triggers:` block remains valid and
takes effect as soon as the level (e.g., via override) is `trigger`.

**Derivation for missing field:** `triggers:` present → `trigger`, otherwise → `manual`. The bundled
coding Skills declare `activation: agent` (exception: the macro `commit-message`, `manual`),
`design-blueprint` also; `hidden` is suitable for experimental or internal Skills.

**Override Doc** `_vance/config/skill_activation.yaml` — Map `name → mode`:

```yaml
skills:
  code-review: agent
  typescript-style: hidden
```

Values: `hidden | manual | trigger | agent`. The override changes the **mode**, not the relevance —
a user cannot permanently unhide a Skill hidden in the Recipe, only see it via toggle and
consciously activate it.

- **Merge per entry** across tiers `_tenant` → project → `_user_<login>`: for each Skill, the
  innermost entry wins; Skills not mentioned in any document retain their frontmatter/derived mode.
  Consciously different from Skill cascade and category doc (entire document, first hit): this document
  is a list of independent individual decisions — its entire purpose is to override a field
  without forking the SKILL.md.
- **Read fail-open** (malformed tier is logged and skipped), **write strictly**: a malformed
  existing document is not overwritten — the rewrite would discard its entries. An
  override for a Skill that does not resolve in scope is refused (a typo would otherwise look like
  success).
- **Cache:** parsed tier documents per `(tenant, project)` in RAM, invalidation via
  `RoutedDocumentChangedEvent` (`SkillActivationDocumentListener`), 60s TTL as a net for pods
  that the router does not notify (see document-change-events).
- **Runtime effect:** from the next turn (compose time) — on trigger matching and the context list;
  also in running processes. The same applies to Recipe edits to `relevantSkills` (resolution per turn).

**Effect on the Agent:** no lock — `skill_activate`/`skill_fire` only follow `enabled` and the
Recipe whitelist. The auto-trigger matcher only arms Skills with effective level
`trigger`. It runs before Skill resolve of each turn in all skill-capable Engines: Arthur, Eddie,
Ford, Frankie (incl. `TrillianWorkerEngine`), Nutrimat and Wowbagger (there only on actual
user input, never on pool wakeups).

**"Available skills" list** (all skill-capable Engines with tool loop — Ford, Frankie, Arthur, Eddie, Nutrimat, Wowbagger):

- Own system prompt section directly after the Active Skills section — both change together,
  one cache break instead of two:

  ```
  ## Available skills — activate with the skill_activate tool

  - code-review: Review the current code changes for correctness, security and quality
  ```
- Below the heading is an action line: if a Skill fits the task, activate it before starting work.
  If at least one Skill is in the list, `skill_activate` is **in the manifest** in this turn
  (`SkillTurnSupport.turnTools`) — as a deferred pool tool, it would be invisible in Engines without
  discovery block (Ford, Frankie), and the model could not follow the list.
- A Skill is included if its **effective level is `agent`** — mode `agent` and selected as relevant
  by the process's Recipe (§7e). The list is pure discovery — it activates nothing.
- **Active Skills are removed** — offering something that is already running makes no sense.
- Line = **Name + Description** (Title if description is missing), never the body. Stable
  name sorting, so that identical Skill sets render byte-identically.
- Gates: `enabled`, cascade dedup, `allowedSkillsOverride` whitelist.
- Cap (`MAX_ADVERTIGED = 12`): the section ends with "+M more — use how_do_i", never silently truncated.
- **Not** in the tool description of `skill_activate` (static, but scope-dependent quantity); the
  static description text points to the section. Single-shot surfaces (LightLlm) do not get
  advertising — there, **composition** ([light-llm-service](/specs/light-llm-service) §2a) applies instead.

**`how_do_i`** still finds `hidden` Skills (conscious search), but ranks them per call in a
separate concluding section "Hidden skills" behind everything that makes sense in the process
([how-do-i.md](/specs/how-do-i)); the cached catalog remains process-independent.

**Surfaces for mode change** (§3.5 of the plan):

| Surface | Form |
|---|---|
| foot | `/skill mode <name> hidden\|manual\|trigger\|agent [user\|project\|tenant]` — `mode` is the third reserved subcommand word besides `list`/`clear` (a Skill named `mode` is only accessible via panel/`skill_activate`); `/skill list` shows the level column, with Recipe hiding as `→ hidden(recipe)` |
| Web UI | `/skill mode …` in the Composer (both hosts) + level dropdown (four values) per Skill in the panel detail modal (writes the **USER tier** override; origin hint author vs. own override, hint "not relevant for this Recipe"). The panel lists **process-related** (`ProcessSkillResponse` → `SkillSummaryDto.relevant`): badge shows the effective level, `hidden` Skills are collapsed behind the toggle "Show hidden (N)" (per-viewer preference in the browser) |
| REST | `POST /brain/{tenant}/skills/{name}/activation` (`SkillModeRequest { mode, scope }`) — Scope configuration **without process relation**, therefore no `process-skill` command; F1 enforcement at the Document source. The response states the **effective** mode — if an inner tier overrides the written entry, it says so |

---

## 5. Loading into the Engines

An active Skill affects three places at Lane turn time. **All** skill-capable Engines are involved: `Ford`, `FrankieEngine` (incl. `TrillianWorkerEngine`), `Arthur` and `Eddie` (both via `StructuredActionEngine`), `WowbaggerEngine` and the Nutrimat Natures (`AbstractNutrimat`). Engines without their own chat loop with tools (Benjy, Marvin, Zaphod, Vogon, Slart, Jeltz, Agrajag, Hactar, Zem) do not carry active Skills — Benjy stages compose stage Skills per Recipe (§7, [benjy-engine](/specs/benjy-engine) §4); **Wonko** (LightLlm, no tool loop) composes into **every** model call the Skills selected via Recipe param `skills` (names, `@label`, `!` exclusion — grammar of `relevantSkills`) plus those activated on the process; non-composable ones are mentioned once per run with reason in the report (`WonkoSkills`); the others access Skills via their Ford/Frankie workers. Common entry point is `SkillTurnSupport` in `vance-brain/.../skill/` — cascade resolve of `activeSkills`, prompt section, tool union in one place, so that the Engines do not diverge.

### 5a. System Prompt

Before the LLM call, the Engine assembles the system prompt from:

```
[1] Engine default prompt (Ford.SYSTEM_PROMPT)
[2] Recipe promptPrefix (APPEND/OVERWRITE according to promptMode)
[3] Active Skills, in activation order:
       --- Skill: <name> ---
       <description>
       <promptExtension>
       --- Reference Doc: <title> ---
       <content>     (for each SkillReferenceDoc with loadMode=INLINE)
[4] "## Available skills" — Advertising cards (§4g), directly after [3]:
       - **<name>** — <title>: <description>   *(active)*
       (only Skills with effective mode `agent`, never the body;
        no message if nothing is advertised)
```

Merging occurs in `SkillPromptComposer` (`vance-brain/.../skill/`), called via `SkillTurnSupport.composeSection(process, skills, pebbleContext)`. The section is a **separate** system message, so that a Skill activation does not break the cache marker of the static prompt prefix. The advertising section [4] (`SkillTurnSupport.advertiseSection`) is directly behind it — both change together, one cache break instead of two; active ones are **marked** in it, not filtered out (details §4g).

Each body is rendered per Skill with **its** arguments (`args` from `ActiveSkillRefEmbedded.args`, bound via `SkillArgumentBinder`) — two Skills active in the same turn do not see each other's arguments. A Skill with defective Pebble or no longer binding arguments is skipped with `WARN`; the remaining ones compose normally.

### 5b. Tool Whitelist

The tool pool results from:

```
allowed = (engine.allowedTools()
            ∪ recipe.allowedToolsAdd)
            \ recipe.allowedToolsRemove
            ∪ ⋃ skill.tools (for each active Skill)
```

The union is passed to the turn's `ContextToolsApi` (`withAdditional`) — not just the spec list, because the action loop dispatches tool calls via the same surface; an advertised but not allowed tool would be rejected on invocation.

A `lifecycle: shot` Skill does **not** contribute tools — it never registers. If additional tools are needed for a task: `turn` (default).

Skills can **only add** tools, not remove them. If a Recipe removes a tool `tool_x` from the whitelist, but a Skill explicitly requests `tool_x`, **Skill wins** (tool is available). Rationale: a Skill running without its required tool is defective — Recipe restrictions should not silently break Skills.

### 5c. Reference Docs

`INLINE` docs are appended to the system prompt (see §5a). `ON_DEMAND` docs are lazy-loaded via the tool `skill_reference_doc(skill, title)` — not in v1.

### 5d. Storage Location of Active Skills

`ThinkProcessDocument` gets a new field:

```java
private List<ActiveSkillRef> activeSkills;   // serialized in Mongo

record ActiveSkillRef(
    String name,
    SkillScope resolvedFromScope,    // where it was found
    boolean oneShot,                  // --once flag
    boolean fromRecipe,               // from recipe.defaultActiveSkills
    Instant activatedAt,
    @Nullable String args             // raw invocation rest (§2b)
) {}
```

On the next turn, Ford reads `process.getActiveSkills()`, resolves each via the scope (cache per turn) and merges them as above. One-shot Skills are removed from the list after the turn.

---

## 6. Slash Command `/skill`

### 6a. Client-Side (vance-foot, later Web UI)

Both clients implement `/skill` as a slash command. In vance-foot via new `SkillSlashCommand` (Bean, `SlashCommand` interface) in directory `vance-foot/src/main/java/de/mhus/vance/foot/command/`.

**Subcommands:**

| Input | Output Action |
|---|---|
| `/skill <name> [args...]` | `ProcessSkillRequest{ command=ACTIVATE, skillName, args, oneShot=false }` |
| `/skill <name> --once [args...]` | `ProcessSkillRequest{ command=ACTIVATE, skillName, args, oneShot=true }` |
| `/skill <name> --sticky [args...]` | `ProcessSkillRequest{ command=ACTIVATE, skillName, args, sticky=true }` — keeps a `turn` Skill beyond its turn |
| `/skill list` | REST call `GET /brain/{tenant}/skills/active` + `GET /brain/{tenant}/skills/effective` (no roundtrip through Engine) |
| `/skill clear` | `ExternalCommand("skill.clearAll")` |
| `/skill clear <name>` | `ExternalCommand("skill.clear", { name })` |

The rest of the line goes **exclusively** as `ProcessSkillRequest.args` to the Brain — the client **does not** send its own follow-up message. The client cannot know if the Skill declares `arguments:`; the server decides (§2b) and, in the non-consumption case, injects a `UserChatInput` with the user's identity itself. Previously, the client decided this — with the result that Foot sent a follow-up message and the Web UI silently discarded the rest of the line.

### 6b. Server-Side (vance-brain)

The `ProcessSkillHandler` (WebSocket message `process-skill`) enforces authorization, serializes the mutation to the process Lane, and calls `SkillSteerProcessor`, which either:

- atomically updates the process's `activeSkills` list (`MongoTemplate.findAndModify`), or
- responds directly for listing operations, without an Engine turn.

**Important:** The slash command is a **structured SteerMessage**, not text. The LLM does not see the activation as user input — it only sees the extended system prompt on the next turn. Thus, `/skill foo bar baz` is not interpreted as a question to the LLM, but as a control signal.

### 6c. Auto-Complete

vance-foot uses JLine-3-Completer, which fills `/skill <TAB>` with names from `SkillResolver.listAvailable(scope)`. Web UI uses a `<VSlashCommandPicker>` analogously (see `web-ui.md` §7).

---

## 7. Composition with Recipes

Recipes control Skills on three axes — *which Skills are active from spawn*, *which Skills make sense here*, and *which Skills are allowed to become active at all*. Schema details in [recipes.md](/specs/recipes) §6c; here the Skill view.

| Recipe Field | Type | Meaning for Skills |
|---|---|---|
| `defaultActiveSkills` | `List<String>` | Exact Skill names — written to `process.activeSkills` as sticky `fromRecipe=true` on spawn. An `@label` or `!` entry here is a parse error: activation is always a named decision |
| `relevantSkills` | `List<String>?` | Names, `@label` selectors, and `!` exclusions (§7e): which Skills make sense for the Recipe. Unselected ones are `hidden`; selected ones appear at the level the Skill itself declares (§4g). If the field is missing, everything is relevant; `[]` = nothing. Nothing is activated |
| `allowedSkills` | `List<String>?` | Whitelist. If set, only these Skills may ever become active — trigger match, default active, `/skill`. Snapshot as `process.allowedSkillsOverride` |

### 7a. Spawn Behavior

`RecipeResolver.applyDefaulting(...)` passes both fields to `AppliedRecipe`. `ThinkProcessService.create(...)`:

1. Converts `defaultActiveSkills` names into `ActiveSkillRefEmbedded` entries (`fromRecipe=true`, sticky, `resolvedFromScope=RESOURCE` as default — Engines re-resolve on turn)
2. Persists `allowedSkills` as `Set<String>?` on `allowedSkillsOverride` — snapshot. Subsequent Recipe edits do not affect the running Process

**Validation during Recipe Parse:** if `allowedSkills` is set, `defaultActiveSkills ⊆ allowedSkills` must hold — otherwise `IllegalStateException` in `RecipeLoader.parse`.

### 7b. Whitelist Filter in Activation Path

Three activation paths respect `process.allowedSkillsOverride`:

| Path | Behavior for Skill outside Whitelist |
|---|---|
| `/skill <name>` (User explicit) | `SkillSteerProcessor.activate` throws `SkillNotAllowedByRecipeException` ("Skill 'foo' is not allowed by recipe 'analyze'") |
| Trigger Match (future, [§4a](#4a-implicit-auto-detection-by-arthur)) | `listAvailable` is filtered against the whitelist before matching — trigger Skills outside are invisible |
| `defaultActiveSkills` on Spawn | Already validated during Recipe parse — Recipe would not even load |

`null` whitelist means "no restriction" (current behavior). Empty list `[]` means "lockdown — no Skill ever active".

### 7c. Lock Semantics

| Recipe Lock | User `/skill clear` | Trigger Match | User `/skill <name>` |
|---|---|---|---|
| `locked=false` | allowed (also fromRecipe Skills) | allowed | allowed |
| `locked=true` | only Skills that do NOT originate from the Recipe | allowed (additive, in whitelist) | allowed (additive, in whitelist) |

Recipe-bound Skills (`fromRecipe=true`) are a default — they are active because the Recipe needs them. User may activate additional ones (if in `allowedSkills`), but not disable the Recipe set if `locked=true`.

### 7d. Conflicts Between Recipe Skills and User Skills

If `recipe.defaultActiveSkills = ["typescript-style"]` and the user calls `/skill typescript-style`: idempotent — the existing `fromRecipe=true` entry is retained, no double add. If the user wanted the same Skill as one-shot, the `oneShot` flag flips (sticky remains sticky on conflict — Recipe author intent wins).

Cascade resolution: activation is against the process's cascade visibility scope (`SkillScopeContext` from Tenant + Project + User). Recipe default Skill `typescript-style` resolves at spawn time against the cascade — if a Project override exists, it wins. The Recipe only defines the name, not the source.

### 7e. Relevance by Recipe (`relevantSkills`) — Which Skills Make Sense Here

`relevantSkills` states which Skills **make sense** for the Recipe. A Recipe author does not know all Skills when writing — they state *what kind* of Skill fits; the Skill states with its tag "I can contribute to `coding`" and with `activation:`, *how* it is then offered (§4g). Neither side needs to know the other.

| Entry | Meaning |
|---|---|
| `@label` | any Skill whose `tags:` carry the label (trim + case-insensitive) |
| `name` | exactly this Skill |
| `!@label` / `!name` | exclusion — overrides any inclusion |

- **Field missing → everything relevant** (backward compatible for the many Recipes without Skill relation).
- **Only exclusions → base "everything":** `["!@coding"]` = everything except the coding group. This is the
  form for chat Recipes: new, untagged tenant Skills remain visible there.
- **With inclusions → base "nothing":** `["@coding", "@design"]` = only coding and design group (coding worker).
- **`[]` → nothing relevant**, all Skills `hidden`.

**Relevance ≠ Activation.** A relevant Skill is at most *offered* (level `agent` → "Available skills" list, `trigger` → word activation); a non-relevant one is `hidden`, but remains consciously activatable. Therefore, selectors are only allowed in `relevantSkills` — `defaultActiveSkills` and Benjy stage Skills ([benjy-engine.md](/specs/benjy-engine) §4) only accept exact names; an `@label`/`!` entry there is a parse error. The former field `advertisedSkills` is a load error with a hint to `relevantSkills`.

**Notation collision, field separation:** Tool labels (`@write` in `allowedTools*`) and Skill labels
(`@coding` in `relevantSkills`) share the `@` notation **in the same Recipe file**. The
namespaces are separate because they are bound to different fields.

```yaml
# Chat Recipe (arthur, eddie, discuss) — everything except Coding:
relevantSkills: ["!@coding"]

# Coding Worker (coding, benjy-do-coding, code-read, python) — Coding plus
# Design (designer designs are web files that a coding worker builds):
relevantSkills: ["@coding", "@design"]

# Skill — tags itself into the group and states how it appears there:
tags: [coding, review]
activation: agent
```

**Down to the Worker Recipes.** Evaluation is done **per turn** against the process's Recipe (the same
Recipe resolution that the tool filter does per turn) and against `SkillResolver.listAvailable` of the
process scope (Tenant + Project + User). Each process — chat, Ford/Frankie worker, Benjy doer —
gets the relevance of its own Recipe; nothing is inherited on spawn. Newly tagged Skills and
Recipe edits take effect without respawn. The `RecipeLoader` only validates the form (`@`, `!`, `!@` without content
= parse error). A Recipe that no longer resolves makes everything relevant (logged) — relevance is
presentation and must never cost a turn.

**Rules:**

- Gates for the "Available skills" list remain (§4g): `enabled`, not already active, `allowedSkills` whitelist
- Empty group is **not an error** — `@no-such-label` selects nothing; the bundled Recipes are
  bound to bundled tags by test (`BundledSkillsTest`)
- `allowedSkills` itself remains name-based — labels there would make the whitelist dynamic
- Domain labels for the bundled Skills: `coding`, `design`, `decision`, `writing`, `research`
  (Manual `skill-authoring.md`)

**YAML detail:** `@` and `!` are reserved characters in YAML — selectors must be quoted: `["@coding", "!@design", code-review]`.

### 7f. Passing Skills on Delegation (`delegation:`, `process_spawn.skills`)

When a process delegates work to a worker (`process_spawn`, Arthur's `DELEGATE`), the worker often needs the instructions the delegator had for the task — a report format, a debugging procedure. Retelling the one-line description from "Available skills" in the task text is not enough: format and storage rules are lost in the process (observed in browser test 2026-10-13). Two ways, one mechanism:

| Way | Who decides | Behavior |
|---|---|---|
| **automatically** | the Skill: `delegation: carry` (default) | Active Skills of the delegator are carried along — including `turn` Skills of this turn (word trigger, `/skill`, `skill_activate`). Recipe-bound Skills and `delegation: stay` remain. **Lenient:** if the worker Recipe does not allow a Skill (`allowedSkills`), it is skipped with a log line — no one explicitly requested it |
| **explicitly** | the model: `process_spawn(skills=[…])`, Arthur `DELEGATE.skills` | Names from its own "Available skills" list or the active Skills. **Strict:** unknown, disabled, or not allowed → spawn fails with a clear message, the partially created process is closed |

**In the worker**, passed Skills are activated before the first turn, **always sticky** (the worker exists for exactly this task, regardless of `lifecycle`), route `IMPLICIT` (no `action:` turn — the task is the first message; no spawn from here). Implemented centrally in `SpawnActionExecutor` (`TriggerAction.Recipe.skills` + parent process from `TriggerContext`) — thus applies to every spawn path with a parent process, not just Arthur.

**`delegation: stay`** for Skills that concern the conversation itself rather than the work — `decision-frame` (helps the user decide in chat) is the bundled example. A typo in the value is a load error (treated silently as `carry`, it would give a conversation Skill to every worker).

Consciously not: Eddie's `DELEGATE_PROJECT` transfers to a project chat, not a task worker — nothing is passed there.

---

## 8. CRUD via Document Editor

Skills are Documents — editing therefore happens via the Document layer:

- **Tenant-wide Skill (`_tenant`):** Document subtree with path `_vance/skills/<name>/SKILL.md` in the `_tenant` Project.
- **Project Skill:** same path within the respective user project.
- **User Skill:** same path within the per-user `_user_<login>` system project.
- **Reference files:** Sibling paths under the same Skill directory (`skills/<name>/references/checklist.md` etc.) in the **same Project** — are not resolved via the cascade.
- **Rollback to Default:** Delete SKILL.md → next lookup falls back to the next outer cascade level.

There is no longer a dedicated Skill REST controller. Who is allowed to do what comes from the Document ACL model, once that is defined. The Document paths themselves carry visibility — a user Skill resides in the `_user_<login>` Project and is thus by definition only visible to that user (another user has no access to the Project).

---

## 9. Bundled Skills

Bundled Skills reside as directories under `vance-brain/src/main/resources/vance-defaults/_vance/skills/<name>/`:

```
vance-defaults/_vance/skills/
  code-review/
    SKILL.md             # Frontmatter (YAML) + Markdown Body
    references/
      checklist.md       # ReferenceDoc 1
      patterns.md        # ReferenceDoc 2
  typescript-style/
    SKILL.md
```

`SKILL.md` format (same on every cascade level — also in Mongo documents in `_tenant` / Project / `_user_<login>`):

```markdown
---
title: Code Review
version: 1.0.0
description: Use when user asks to review PRs, diffs, or code changes
tags: [code, coding, review, quality]
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

**Pebble Templating:** The body is passed through the same `PromptTemplateRenderer` at compose time that renders recipe `promptPrefix` and Engine default prompts. The render context is identical (`tier`, `model`, `provider`, `mode`, `profile`, `recipe`, `engine`, `lang`, `params`) — see [recipes](/specs/recipes) §5. This allows a Skill to keep tier-, mode-, or provider-specific variants within its body (`&#123;% if tier == "small" %}…&#123;% endif %}`), instead of writing two Skills per variant. Reference doc content is **not** rendered — docs are author-controlled data, not templates, and literal `&#123;% %}` text in a doc file must pass through unchanged. Skills with Pebble syntax errors are skipped with `WARN` log; other active Skills compose normally.

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
| `SkillScope` | Enum (USER/PROJECT/VANCE/RESOURCE) — cascade source of a resolved Skill |
| `SkillTriggerDto` | Trigger representation (KEYWORDS/PATTERN) |
| `SkillReferenceDocDto` | Reference doc in listing form — title, teaser (`summary`), load mode; the content itself does not go over any listing surface |
| `SkillTriggerType` | Enum (PATTERN/KEYWORDS) |
| `SkillReferenceDocLoadMode` | Enum (INLINE/ON_DEMAND) |
| `SkillSummaryDto` | Complete read-only view for picker (`process-skill` LIST): identity, tags, category (§4f), **effective activation mode + source + override tier** (§4g), auto-trigger, lifecycle (`turn`/`sticky`/`shot`), tools, manual paths, arguments, reference docs, scripts, activate/deactivate sequences. The prompt body is consciously not included — it goes via the Document Editor |
| `SkillArgumentDto` | Declared invocation argument (§2b) — field form identical to `ScriptParamDto` (an author schema) |
| `SkillScriptDto` / `ScriptParamDto` | Skill script descriptor (§13) including parameter contract for the virtual tool |
| `ActiveSkillRefDto` | Active Skill reference in the Process — for UI badge rendering; `fromRecipe` marks recipe-bound entries that a user clear does not remove (§7a) |
| `SkillActivation` / `SkillActivationSource` | Activation mode (`manual`/`trigger`/`agent`) and provenance of the effective mode (frontmatter/derived/override — §4g) |
| `SkillModeScope` / `SkillModeRequest` / `SkillModeResponse` | REST write path `POST /brain/{tenant}/skills/{name}/activation` (§4g): target tier (user/project/tenant), request `{ mode, scope }`, response with the **effective** mode |
| `SkillCategoryDto` | Category metadata from `_vance/config/skill_categories.yaml` (§4f): normalized `id` + open `title` locale map. Only sent in the LIST response of `ProcessSkillResponse` — sorting aid, not a registry |

---

## 13. Skill Scripts (Phase Plan)

A Skill can **bring its own JavaScript snippets**. Unlike external tools referenced in `tools`, scripts are part of the Skill subtree — they are versioned, activated, and pinned to the same cascade level as the SKILL.md.

### 13.1. Schema (Phase 1 — Data Model, Not Yet Implemented in SkillLoader)

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

**Primary Mode (Phase 2):** Script = Tool. When a Skill is active (per Recipe, auto-trigger, or `/skill`), the Engine lifecycle registers a virtual tool per script in the turn's tool loop. Convention: `skill_<skillname>__<scriptname>`. The LLM decides when to call it, just like any other tool. When deactivated, the tool is removed.

Skill triggers (PATTERN/KEYWORDS, §4) explicitly **do not** trigger a script — triggers decide on Skill activation, the LLM tool loop decides on script calls. Cleanly separated.

### 13.3. Execution Location

| `target` | Engine | Purpose |
|---|---|---|
| `BRAIN` | `JsEngine` (Brain, GraalJS/Rhino) | Server-side operations — workspace files, memory, other Brain tools, REST calls. |
| `FOOT` | `ClientJsEngine` (Foot-CLI, GraalJS/Rhino) | Client-side operations on the user's machine — local FS, local subprocess, editor integration. The Brain sends script + args via the WS connection; Foot evaluates and sends the result back. |

`BRAIN` and `FOOT` use the same sandboxed GraalJS (`allowAllAccess(false)`) — no Java interop, no automatic FS access. **What the script can do is decided by injected host bindings** (see §13.4).

### 13.4. Host Bindings — The Trust Boundary (Phase 3, Deferred)

Today, the JS sandbox is tight: pure compute, no project context. For scripts to do useful things, the Engine lifecycle must inject a `vance` global into the GraalJS context per call. The final surface is part of the Phase 3 implementation; proposed sketch:

```js
// in script
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
| `vance.workspace.read/write/list/delete(path)` | Project workspace FS — project-bound, sandboxed like `WorkspaceService` today |
| `vance.context()` | Active Process/Skill/Recipe metadata (read-only) |
| `vance.log(level, msg)` | Trace logging to the Skill output |

Proposed Surface (Foot):

| Binding | Purpose |
|---|---|
| `args` | same as Brain |
| `vance.tool(name, params)` | Client tool from the Foot tool set (e.g., local filesystem tools) |
| `vance.fs.read/write/list/delete(path)` | Local FS, scoped to the user's Foot working directory |
| `vance.exec(cmd, args)` | Local subprocess execution — if at all, then with explicit user approval |
| `vance.log(level, msg)` | Identical to Brain — output lands in Brain trace |

Sandbox boundary: what is not exposed via `vance` cannot be done by the script. Open points (sub-spec): re-entrancy limit, approval flow for `vance.exec`, timeout semantics, quota.

### 13.5. FOOT Routing (Phase 3, Deferred)

When calling a script with `target=FOOT`:

1. Brain serializes `{ skillName, scriptName, args }` into a WS frame `process-skill-script-execute`.
2. Foot receives, evaluates in `ClientJsEngine` with local bindings, sends result back.
3. Brain passes the result as tool result to the LLM loop.

Requires an extension of the client protocol (see `client-protokoll-erweiterbarkeit.md`). Until Phase 3 is implemented, Brain can be configured to respond to FOOT scripts with "ERROR: foot routing not implemented".

### 13.6. Phase Status

| Phase | Content | Status |
|---|---|---|
| 1 | Data model (`scripts` field, DTOs, embedded), editor UI with JS code editor | implemented |
| 2 | Skill-as-tool mounting (Engine lifecycle registers scripts as tools in the loop) | open |
| 3 | Host bindings (`vance.*` surface), sandbox tightening, quota | open |
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

`SkillScriptTool.paramsSchema()` renders the declaration into the JSON schema of the virtual tool: one `properties` property per entry with `type` (+ `description`), `required` parameters land in the `required` array. `additionalProperties` remains `true` — scripts may still read undeclared optional args. Without a `params` block, the tool remains **free-form** (empty `properties`, `additionalProperties: true`) — the script then performs its own shape checks. The benefit of the declaration: even weaker models get an explicit, typed parameter list instead of just the prose in the Skill body — otherwise they call the tool with empty args and the script falls back to its literal defaults.

---

## 14. Visibility & Administration

| Scope | Who can read | Who can write |
|---|---|---|
| `RESOURCE` | all | only code commit (resource file under `vance-defaults/_vance/skills/`) |
| `VANCE` | all Tenant users | Tenant admin via Document Editor in the `_tenant` Project |
| `PROJECT` | all Project members | Project admin via Document Editor in the respective Project |
| `USER` | only the owner | only the owner via Document Editor in the `_user_<login>` Project |

Authorization comes from the Document ACL model — the Document Editor decides who has write access to which Project, and thus indirectly who can edit Skills at which cascade level. A user Skill resides in the `_user_<login>` Project and is thus by definition only writable by that user; another user has no access to the Project.

---

## 15. Open Points

- **Auto-Trigger Language.** Currently Regex + keyword matching. If implicit detection works poorly: subsequent LLM call ("which Skill fits?") as a second stage — separate spec.
- **Skill Marketplace.** Sharing between Tenants is not planned for v1. If needed: extra scope `PUBLIC` with its own sync mechanism.
- **Versioning.** Currently manual `version` strings, no migration. For breaking changes, the user must clean up themselves.
- **Reference-Doc `ON_DEMAND`.** In v1, everything is `INLINE`. `ON_DEMAND` requires a new tool `skill_reference_doc(skill, title)` and dynamically changes the token balance — address separately.
- **Recipe `skills` Lock Granularity.** Currently, `recipe.locked=true` locks *all* Recipe Skills atomically. If finer granularity is needed (individual ones removable): `recipe.skillLocks: [name]` as a later extension.
- **Skill Telemetry.** Which Skills were activated how often (implicitly/explicitly), with what success? Needed as soon as the list grows — separate spec.
- **Argument Grammar.** v1 is positional (§2b). `k=v` / flags only when a concrete need arises — then together with the `//` command surface ([engine-commands](/specs/engine-commands) §42), not as a separate dialect.
- **Argument Form in the Web UI.** The declaration (`arguments:`) already contains everything a form needs (name, type, description, required) — the Skill picker does not yet render it. Separate round, same form engine as wizards/setting forms.
- **`lifecycle` Names.** `shot` (control plane/turn) and `oneShot`/`turn` (prompt plane, 1 turn) sound similar but have completely different meanings. Renaming (`shot` → `macro`) would be clearer, but is embedded in docs/tests/bundles — only with deprecated alias and in a separate step.
- **Models use the list differently.** With `skill_activate` in the manifest and the action line, `deepseek-v4-pro` (Frankie, `coding`) reliably activates on explicit request, but not on its own for a suitable task without a hint; `default:fast` (Ford, E2E) does. Further prompt tuning in the Engine prompt, if necessary.
- **Activation Source (`activatedBy`).** `skill_clear` (§4e) currently follows the same rule as the user surface: everything except recipe-bound is clearable. A sharper boundary would be an `activatedBy: user|agent` marker on `ActiveSkillRefEmbedded`, allowing the agent to clear only its own activations. Requires schema change + migration — only if the agent practically removes user-desired Skills.
