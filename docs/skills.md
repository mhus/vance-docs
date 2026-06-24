---
title: "Vance — Skills"
parent: Documentation
permalink: /docs/skills
---

<!-- AUTO-GENERATED from specification/public/en/skills.md — do not edit here. -->

{% raw %}
---
# Vance — Skills

> A **Skill** is a reusable capability bundle focused on a single LLM turn: description + auto-trigger + prompt extension + tool whitelist + reference docs. Skills activate either **implicitly** (Arthur recognizes a suitable Skill based on user intent) or **explicitly** (user types `/skill <name>`). Both paths lead to the same Ford loading code. Skills are orthogonal to Recipes: Recipes configure *how* an Engine runs (Engine choice, defaults, lock), Skills are attached capabilities that define *what* it does.
>
> **Persistence:** Skills reside as document subtrees under `skills/<name>/SKILL.md` (frontmatter + Markdown body) plus sibling reference files. The cascade `_user_<login> → project → _tenant → classpath:vance-defaults/skills/` runs via [`DocumentService`](../repos/vance/server/vance-shared/src/main/java/de/mhus/vance/shared/document/DocumentService.java). There is no longer a separate Mongo collection for Skills — editing is done via the Document Editor.
>
> See also: [recipes](/docs/recipes) | [ford-engine](/docs/ford-engine) | [arthur-engine](/docs/arthur-engine) | [settings-system](/docs/settings-system)

---

## 1. Terms and Delimitation

| Term | What it is | Cardinality | Location |
|---|---|---|---|
| **Engine** | Algorithm with lifecycle. Java code. | few (3-5) | `vance-brain/.../<name>/` |
| **Recipe** | Engine configuration bundle: which Engine, which defaults, prompt prefix, tool adjustments, lock flag. | many (10-100) | YAML + Mongo |
| **Skill** | Capability bundle: description, auto-trigger, prompt extension, tool whitelist, reference docs. Composable. | many (open-ended, incl. user Skills) | Document subtree `skills/<name>/SKILL.md` (Cascade) |
| **Process** | Running instance. Has one Recipe and zero-to-N active Skills. | N per Session | Mongo |

**Recipe vs. Skill — the Delimitation:**

- Recipe decides the **Engine path** (Ford? Arthur? with which defaults? locked?). A spawn operation requires **exactly one** Recipe.
- Skill decides the **task coloring** (which domain, which tools, which reference docs). A spawn operation can carry **0..N** Skills.

**Example:** Recipe `analyze` (engine=ford, model=default:analyze, locked=false) is spawned with Skills `[code-review, typescript-style]`. Ford loads Recipe defaults and merges prompt extensions/tool whitelists/reference docs from both Skills.

**What Skills are NOT:**

- Not Engines. Skills do not define a Lane lifecycle, Inbox processing, or status transitions.
- Not Recipes. Skills do not select an Engine, set lock semantics, or have a `default-Recipe` role.
- Not Tools. Tools are atomic capabilities (`web_search`, `process_create`); a Skill **uses** Tools, but is not one.

---

## 2. Skill Schema (YAML Frontmatter + Markdown Body)

A Skill is a Document subtree:

```
skills/
  <name>/
    SKILL.md                  # frontmatter + body (= promptExtension)
    references/
      <something>.md          # associated reference documents
```

`<name>` comes from the directory name, not from a `name:` field. The SKILL.md contains YAML frontmatter (between `---` fences) followed by the Markdown body. The body is the `promptExtension`.

| Frontmatter Field | Type | Required | Meaning |
|---|---|---|---|
| `title` | `String` | yes | Display name (UI, Skill picker) |
| `description` | `String` | yes | One line — what does the Skill do? Used (a) for auto-trigger matching (b) displayed in UI tooltip (c) given to Arthur in Skill selection description |
| `version` | `String` (semver) | yes | `1.0.0`, `2.3.1`. Manually assigned |
| `triggers` | `List<SkillTrigger>` | no | Auto-activation conditions (pattern match, intent keywords). Empty = only explicitly activatable |
| `tools` | `List<String>` | no | Tool names that the Skill **requires**. When the Skill is active, these are added to the Engine/Recipe whitelist — never removed |
| `manualPaths` | `List<String>` | no | Folder paths (relative to Document root) that the Skill contributes to `manual_read`/`manual_list` as long as it is active. Pattern "short Skill body + detailed Manuals on demand". Recipe paths from `params.manualPaths` retain precedence — Skill paths are appended. Sanitization like `manual_read`: no `..`, no leading `/`, backslashes become `/` |
| `referenceDocs` | `List<SkillReferenceDoc>` | no | Sibling files within the Skill subtree. Appended to the prompt after `promptExtension` or loaded on demand via Tool (see §5b) |
| `tags` | `List<String>` | no | Discovery hints |
| `enabled` | `boolean` | default `true` | Disabled Skills are neither explicitly nor implicitly activatable; a disabled-override hides outer-layer Skills with the same name |

`SkillTrigger`:

| Field | Type | Meaning |
|---|---|---|
| `type` | `PATTERN \| KEYWORDS` | Matching strategy |
| `pattern` | `String` (Regex) | for `type=PATTERN` |
| `keywords` | `List<String>` | for `type=KEYWORDS` |

`SkillReferenceDoc`:

| Field | Type | Meaning |
|---|---|---|
| `title` | `String` | For `INLINE`: Doc header for prompt embed. For `ON_DEMAND`: the `manual_read` argument used to retrieve the body later |
| `file` | `String` | Path relative to the Skill subtree, e.g., `references/checklist.md` |
| `summary` | `String` | Optional. One-line teaser that appears after the title in the On-Demand listing (`- <title> — <summary>`). Ignored for `INLINE` |
| `loadMode` | `INLINE \| ON_DEMAND` | `INLINE` = immediately embedded in the prompt upon Skill activation. `ON_DEMAND` = body is *not* embedded. Instead, a listing block "On-demand references — load via `manual_read`:" appears in the system prompt — fits the pattern "short Skill body + detailed Manuals on demand" (see `manualPaths`) |

**Reference-File-Layer-Pinning:** A `referenceDocs[i].file` is read **against the cascade level that provided the `SKILL.md` itself** — never re-cascaded. This prevents a user Skill from accidentally pulling a `references/checklist.md` from the `_tenant` layer just because its own layer doesn't have one.

---

## 3. Cascade — How a Skill is Resolved

For `lookupByName("code-review", scopeContext)`, the `SkillLoader` runs:

```
load(tenantId, userId, projectId, name) → Optional<ResolvedSkill> :=
  1. _user_<userId>/skills/<name>/SKILL.md          → source = USER
  2. DocumentService.lookupCascade(tenantId, projectId,
                                   "skills/" + name + "/SKILL.md")
       a. <project>/skills/<name>/SKILL.md          → source = PROJECT
       b. _vance/skills/<name>/SKILL.md             → source = VANCE
       c. classpath:vance-defaults/skills/<name>/SKILL.md → source = RESOURCE
  3. → empty
```

**First hit wins.** User override beats Project, Project beats `_tenant`, which beats Resource. Step 1 is skipped if `userId` is null (system spawn without user binding). Step 2 runs with `_tenant` as Project default if `projectId` is null.

**Listing (Skill picker, auto-trigger search):** `listAvailable(scopeContext)` returns the **union** of all levels with cascade dedup by `name` (inner layer beats outer). For auto-trigger matching, Arthur iterates over this list. `enabled: false` in a layer removes a Skill from the result — even if outer layers provide it.

**Bundled Skills are the source of truth for standard capabilities.** They are located as directories under `vance-brain/src/main/resources/vance-defaults/skills/<name>/SKILL.md` (+ optional reference doc files). Format see §9.

**Hot-Reload:**
- Resource Skills (classpath) require a Brain restart.
- USER/PROJECT/`_tenant` Skills are read fresh from Mongo on each lookup.

---

## 4. Activation Paths

### 4a. Implicit (Auto-Trigger by Conversation Engine)

Every Conversation Engine (`Ford`, `Arthur`, future ones) calls the `SkillTriggerMatcher` as a pre-turn hook, as soon as the user message is written to the chat log and before the system prompt is assembled:

1. Build `SkillScopeContext` from the Process (Tenant + Project + User from the Session)
2. `SkillResolver.listAvailable(scope)` — all Skills visible for this scope (Cascade)
3. Filter:
   - `enabled == true`
   - `triggers` not empty
   - Skill is not already active on the Process
   - If `process.allowedSkillsOverride != null`: Skill must be in the whitelist
4. Trigger match against the user input (lowercase, PATTERN compile cache):
   - `PATTERN`: Java Regex `find()` on the lowercased input (CASE_INSENSITIVE)
   - `KEYWORDS`: Tokenization of the input (`[^a-z0-9]+ → split`, tokens ≥ 2 characters). Trigger fires if ≥ 50% of keywords occur as whole tokens
5. Per match: `SkillSteerProcessor.activate(process, name, oneShot=true)` — the Skill is active only for this turn. In case of whitelist violation (race), a warning log is issued, turn continues
6. Multiple matches are allowed — the LLM receives the combined prompt extensions and tool whitelists

**One `listAvailable` call per turn** (Mongo + Classpath) plus O(skills × triggers) matching. Compiled Regex patterns are cached in the matcher. No listing cache in v1 — Mongo costs dominate anyway.

**Sub-Process Spawn is orthogonal.** If Arthur wants to spawn a worker, he calls `process_create(recipe=…)` — the worker Recipe carries its own Skill configuration (`defaultActiveSkills` / `allowedSkills` from §7). Auto-trigger and spawn decide independently.

### 4b. Explicit (User Command)

User types in chat:

```
/skill code-review
```

Optionally with user message on the same line:

```
/skill code-review look at PR #42
```

**Behavior:**

- **Sticky Activation (Default):** Skill remains active for subsequent turns of this session until `/skill clear` or session end.
- **One-Shot with `--once`:** `/skill code-review --once` activates only for the next turn.
- **Multiple Simultaneously:** `/skill review` followed by `/skill typescript-style` results in active list `[review, typescript-style]`.

**List / Status / Clear:**

| Command | Effect |
|---|---|
| `/skill list` | Lists available Skills in the current scope, marking which are active |
| `/skill clear` | Deactivates all active Skills for this session |
| `/skill clear <name>` | Deactivates only `<name>` |

### 4c. Conflict Resolution Implicit ↔ Explicit

**Explicit always wins.** If the user has said `/skill foo`, Arthur's auto-match will not override `foo`. Arthur can implicitly activate additional Skills, but not explicitly deactivate explicit ones.

### 4d. UI Visibility

Active Skills are displayed in the chat UI as a badge (`Skill: code-review active`), regardless of the activation path. The Web UI `<EditorShell>` reserves a slot for this above the input line (see `web-ui.md` §7).

---

## 5. Loading in Ford

An active Skill affects three places at Lane turn time:

### 5a. System Prompt

Before the LLM call, Ford assembles the system prompt from:

```
[1] Engine default prompt (Ford.SYSTEM_PROMPT)
[2] Recipe-promptPrefix (APPEND/OVERWRITE according to promptMode)
[3] Active Skills, in activation order:
       --- Skill: <name> ---
       <description>
       <promptExtension>
       --- Reference-Doc: <title> ---
       <content>     (for each SkillReferenceDoc with loadMode=INLINE)
```

Merging occurs in a new class `SkillPromptComposer` in `vance-brain/.../skill/`. `SystemPrompts.compose(...)` calls it for the active Skills from the Process.

### 5b. Tool Whitelist

The tool pool results from:

```
allowed = (engine.allowedTools()
            ∪ recipe.allowedToolsAdd)
            \ recipe.allowedToolsRemove
            ∪ ⋃ skill.tools (for each active Skill)
```

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
    boolean oneShot,                  // --once flag
    Instant activatedAt
) {}
```

On the next turn, Ford reads `process.getActiveSkills()`, resolves each via the scope (cache per turn), and merges them as above. One-shot Skills are removed from the list after the turn.

---

## 6. Slash Command `/skill`

### 6a. Client-Side (vance-foot, later Web-UI)

Both clients implement `/skill` as a slash command. In vance-foot via new `SkillSlashCommand` (Bean, `SlashCommand` interface) in directory `vance-foot/src/main/java/de/mhus/vance/foot/command/`.

**Subcommands:**

| Input | Output Action |
|---|---|
| `/skill <name> [args...]` | `ExternalCommand("skill.activate", { name, args, oneShot=false })` |
| `/skill <name> --once [args...]` | `ExternalCommand("skill.activate", { name, args, oneShot=true })` |
| `/skill list` | REST call `GET /brain/{tenant}/skills/active` + `GET /brain/{tenant}/skills/effective` (no roundtrip through Engine) |
| `/skill clear` | `ExternalCommand("skill.clearAll")` |
| `/skill clear <name>` | `ExternalCommand("skill.clear", { name })` |

If the user specifies **another message** on the same line (`/skill foo look here`), the client sends two messages: first the `ExternalCommand` activation, then the normal `UserChatInput`. Both land idempotently in the same pending queue, drained in the same Lane turn.

### 6b. Server-Side (vance-brain)

The existing `ProcessSteerHandler` (WebSocket) forwards `process-steer` with `command="skill.*"` to a new `SkillSteerProcessor`, which either:

- atomically updates the `activeSkills` list of the Process (`MongoTemplate.findAndModify`), or
- responds directly for listing operations, without an Engine turn.

**Important:** The slash command is a **structured SteerMessage**, not text. The LLM does not see the activation as user input — it only sees the extended system prompt on the next turn. Thus, `/skill foo bar baz` is not interpreted as a question to the LLM, but as a control signal.

### 6c. Auto-Complete

Vance-foot uses JLine-3-Completer, which fills `/skill <TAB>` with names from `SkillResolver.listAvailable(scope)`. Web-UI uses a `<VSlashCommandPicker>` analogously (see `web-ui.md` §7).

---

## 7. Composition with Recipes

Recipes control Skills on two axes — *which Skills are active upon spawn* and *which Skills are allowed to become active at all*. Schema details in [recipes.md](/docs/recipes) §6c; here the Skill view.

| Recipe Field | Type | Meaning for Skills |
|---|---|---|
| `defaultActiveSkills` | `List<String>` | Skills written to `process.activeSkills` as sticky `fromRecipe=true` upon spawn |
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
| `defaultActiveSkills` on Spawn | Already validated during Recipe parse — Recipe would not load at all |

A `null` whitelist means "no restriction" (current behavior). An empty list `[]` means "lockdown — no Skill ever active".

### 7c. Lock Semantics

| Recipe Lock | User `/skill clear` | Trigger Match | User `/skill <name>` |
|---|---|---|---|
| `locked=false` | allowed (also fromRecipe Skills) | allowed | allowed |
| `locked=true` | only Skills NOT originating from the Recipe | allowed (additive, in whitelist) | allowed (additive, in whitelist) |

Recipe-bound Skills (`fromRecipe=true`) are a default — they are active because the Recipe needs them. The user may activate additional ones (if in `allowedSkills`), but cannot disable the Recipe set if `locked=true`.

### 7d. Conflicts Between Recipe Skills and User Skills

If `recipe.defaultActiveSkills = ["typescript-style"]` and the user calls `/skill typescript-style`: idempotent — the existing `fromRecipe=true` entry is retained, no double-add. If the user wanted the same Skill as one-shot, the `oneShot` flag flips (sticky remains sticky on conflict — Recipe author intent wins).

Cascade resolution: activation is against the cascade visibility of the Process (`SkillScopeContext` from Tenant + Project + User). Recipe default Skill `typescript-style` resolves against the cascade at spawn time — if a Project override exists, it wins. The Recipe only defines the name, not the source.

---

## 8. CRUD via the Document Editor

Skills are Documents — editing therefore happens via the Document layer:

- **Tenant-wide Skill (`_tenant`):** Document subtree with path `skills/<name>/SKILL.md` in the `_tenant` Project.
- **Project Skill:** same path within the respective user Project.
- **User Skill:** same path within the per-user `_user_<login>` system Project.
- **Reference files:** Sibling paths under the same Skill directory (`skills/<name>/references/checklist.md` etc.) in the **same Project** — not resolved via the cascade.
- **Rollback to Default:** Delete SKILL.md → next lookup falls back to the next outer cascade level.

There is no longer a dedicated Skill REST controller. Who is allowed to do what comes from the Document ACL model, once that is defined. The Document paths themselves carry visibility — a user Skill is in the `_user_<login>` Project and is therefore by definition only visible to that user (another user has no access to that Project).

---

## 9. Bundled Skills

Bundled Skills are located as directories under `vance-brain/src/main/resources/vance-defaults/skills/<name>/`:

```
vance-defaults/skills/
  code-review/
    SKILL.md             # Frontmatter (YAML) + Markdown body
    references/
      checklist.md       # ReferenceDoc 1
      patterns.md        # ReferenceDoc 2
  typescript-style/
    SKILL.md
```

`SKILL.md` format (same at every cascade level — also in Mongo documents in `_tenant` / Project / `_user_<login>`):

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

**Pebble Templating:** The body is passed through the same `PromptTemplateRenderer` at compose time that renders recipe `promptPrefix` and Engine default prompts. The render context is identical (`tier`, `model`, `provider`, `mode`, `profile`, `recipe`, `engine`, `lang`, `params`) — see [recipes](/docs/recipes) §5. This allows a Skill to hold tier-, mode-, or provider-specific variants within its body (`{% if tier == "small" %}…{% endif %}`) instead of writing two Skills per variant. Reference doc content is **not** rendered — docs are author-controlled data, not templates, and literal `{% %}` text in a doc file must pass through unchanged. Skills with Pebble syntax errors are skipped with a `WARN` log; other active Skills compose normally.

`BundledSkillRegistry` parses on boot:
- Iterates `classpath:skills/*/SKILL.md`
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

`ResolvedSkill` additionally carries `source: SkillScope` (USER/PROJECT/VANCE/RESOURCE) so UI/logging can display the origin.

---

## 11. Data Sovereignty

`SkillLoader` is the only place that materializes Skills — it calls `DocumentService.lookupCascade` and `findByPath`, no one else does this for Skill paths. Other services call `SkillResolver.resolve(...)` / `listAvailable(...)`. Convention is strict, according to CLAUDE.md.

---

## 12. DTOs (vance-api)

With `@GenerateTypeScript` annotation for Web-UI generation:

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

A Skill can **bring its own JavaScript snippets**. Unlike external tools referenced in `tools`, scripts are part of the Skill subtree — they are versioned, activated, and pinned to the same cascade level as the SKILL.md.

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
  - name: post-comment
    target: FOOT
    file: scripts/post-comment.js
```

Multiple scripts per Skill are explicitly allowed — a Skill bundles thematically related operations ("PR review" with `fetch_diff`, `lint`, `post_comment`). Lookup for script files runs via the same sibling reader as ReferenceDocs (same layer, no cross-layer lookup).

### 13.2. Trigger Model

**Primary Mode (Phase 2):** Script = Tool. When a Skill is active (per Recipe, auto-trigger, or `/skill`), the Engine lifecycle registers a virtual tool per script in the turn's tool loop. Convention: `skill_<skillname>__<scriptname>`. The LLM decides when to call it, like any other tool. When deactivated, the tool is removed.

Skill triggers (PATTERN/KEYWORDS, §4) explicitly **do not** trigger a script — triggers decide Skill activation, the LLM tool loop decides script calls. Cleanly separated.

### 13.3. Execution Location

| `target` | Engine | Purpose |
|---|---|---|
| `BRAIN` | `JsEngine` (Brain, GraalJS/Rhino) | Server-side operations — workspace files, memory, other Brain tools, REST calls. |
| `FOOT` | `ClientJsEngine` (Foot-CLI, GraalJS/Rhino) | Client-side operations on the user's machine — local FS, local subprocess, editor integration. The Brain sends script + args over the WS connection; the Foot evaluates and sends the result back. |

`BRAIN` and `FOOT` use the same sandboxed GraalJS (`allowAllAccess(false)`) — no Java interop, no automatic FS access. **What the script can do is decided by injected host bindings** (see §13.4).

### 13.4. Host Bindings — the Trust Boundary (Phase 3, deferred)

Today, the JS sandbox is tight: pure compute, no project context. For scripts to do useful things, the Engine lifecycle must inject a `vance` global into the GraalJS context per call. The final surface is part of the Phase 3 implementation; proposed sketch:

```js
// in the script
const diff = vance.tool('git_diff', { range: 'HEAD~1' });          // Call Brain tool
vance.workspace.write('reports/diff.md', diff);                    // Brain only
return { lines: diff.split('\n').length };
```

Proposed Surface (Brain):

| Binding | Purpose |
|---|---|
| `args` | Input parameters from the LLM tool call (JSON object) |
| `vance.tool(name, params)` | Synchronously call another registered Brain tool — re-entrancy depth limited |
| `vance.workspace.read/write/list/delete(path)` | Project workspace FS — project-bound, sandboxed like `WorkspaceService` today |
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
| 3 | Host bindings (`vance.*` surface), sandbox tightening, quota | open |
| 4 | FOOT routing (WS protocol extension) | open |

In v1 (Phase 1), the `scripts` field is only **stored and edited** — the Engine lifecycle ignores it. This is intentional: editor and data model are in place, the runtime contract is not rushed.

---

## 14. Visibility & Administration

| Scope | Who can read | Who can write |
|---|---|---|
| `RESOURCE` | all | only code commit (Resource file under `vance-defaults/skills/`) |
| `VANCE` | all Tenant users | Tenant Admin via Document Editor in the `_tenant` Project |
| `PROJECT` | all Project members | Project Admin via Document Editor in the respective Project |
| `USER` | only the owner | only the owner via Document Editor in the `_user_<login>` Project |

Authorization comes from the Document ACL model — the Document Editor decides who has write access to which Project, and thus indirectly, who can edit Skills at which cascade level. A user Skill is in the `_user_<login>` Project and is therefore by definition only writable by that user; another user has no access to the Project.

---

## 15. Open Points

- **Auto-Trigger Language.** Currently Regex + keyword matching. If implicit detection works poorly: a subsequent LLM call ("which Skill fits?") as a second stage — separate spec.
- **Skill Marketplace.** Sharing between Tenants is not planned for v1. If needed: extra `PUBLIC` scope with its own sync mechanism.
- **Versioning.** Currently manual `version` strings, no migration. For breaking changes, the user must clean up themselves.
- **Reference-Doc `ON_DEMAND`.** v1 is all `INLINE`. `ON_DEMAND` requires a new tool `skill_reference_doc(skill, title)` and dynamically changes the token balance — address separately.
- **Recipe `skills` Lock Granularity.** Today, `recipe.locked=true` atomically locks *all* Recipe Skills. If finer granularity is needed (individual ones removable): `recipe.skillLocks: [name]` as a later extension.
- **Skill Telemetry.** Which Skills were activated how often (implicitly/explicitly), with what success? Needed once the list grows — separate spec.
{% endraw %}
