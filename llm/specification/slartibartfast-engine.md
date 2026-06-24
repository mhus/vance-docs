# Slartibartfast Engine — Plan-Architect

> **Status: Implemented (M0–M6).** This spec describes the
> actual implementation status. The original pre-implementation
> sketch (Template-Selection + Slot-Filling) was discarded — the
> actual implementation is an evidence-based phased workflow with
> hard validation gates. See §2.

> **Naming Note:** In the Adams universe, Slartibartfast is the
> planet designer who won an award for the Norwegian fjords
> — an architect with a love for structured detail. This is precisely
> the role of this Engine.

## 1. Role and Classification

Slartibartfast generates executable **Plans** (Recipes) from a
free user description. Input: description + output schema type
(see §4). Output: a parser-validated Recipe YAML, persisted
as a Document, plus a complete audit chain (which assumptions,
which evidence, which subgoals, which LLM calls).

**Default: Slartibartfast plans AND executes.** After PERSISTING,
the Engine spawns the generated Recipe itself as a Child-Process,
waits for its `ProcessEvent`, checks the produced artifacts
against the Acceptance-Criteria (EXECUTION_VALIDATING +
ContentValidatingPhase), and only then concludes with DONE. If
artifacts are missing or too small, a Recovery-Loop is triggered
back to PROPOSING. With `planOnly=true` (Engine parameter, see
§6), Slartibartfast stops after PERSISTING and leaves execution
to the caller.

**Identity Feature — the only LLM-driven write path into the
Project configuration.** Other Engines write outputs *within*
a Project (Documents, Tasks, Chat-Replies); they do not change
Recipes, Skill frontmatter, or Settings. **Kits** also write
to the Project configuration, but deterministically from
a Git bundle and explicitly triggered by the user. Slartibartfast
is the only place where the Project architecture (Recipes,
strategies) is created or grown **through an LLM dialogue**.
Hactar v2 is the corresponding **Script-Execution-Engine**
(Phase 3 of the Split-Refactor, see
`planning/script-architect-executor-split.md`): no authoring,
only loading + validating + executing sandboxed JS. Thus, Slart
is the **only LLM-driven authoring Engine** in Vance —
JavaScript scripts (`outputSchemaType=SCRIPT_JS`) now belong
to Slart's output family, not Hactar's.

| Engine | Mental Model | Use-Case Class |
|---|---|---|
| Vogon | Strict Workflow — Plan upfront, deterministic execution | "Implement Feature X using this procedure with gates" |
| Marvin | Task-Decomposition — Tree grows through NEEDS_SUBTASKS | "Break this down into manageable pieces" |
| Trillian | Goal-Anchored Refinement — iterative approximation | "Goal = X, find the path and adapt it" |
| Hactar (v2) | Pure Script-Executor — no LLM, only Load + Validate + Execute | "Run this script with these args" |
| **Slartibartfast** | **Evidence-Based Authoring: Goal + Manuals + Reasoning → Recipe-YAML OR Script (+ optional Self-Execute)** | **"Generate the workflow / script for this task — and ideally execute it immediately"** |

**When Slartibartfast instead of Trillian?** When the task fits into
a conclusive plan form that a downstream Engine
(Vogon/Marvin/Zaphod) can execute. Trillian is the open variant for
long-running refinement tasks without a fixed endpoint.

## 2. Phased Workflow

Slartibartfast is a state-machine-based Engine with 12
lifecycle phases (10 plan phases + 2 execute phases when
`planOnly=false`). Each phase is a Spring `@Component` under
`vance-brain/src/main/java/de/mhus/vance/brain/slartibartfast/phases/`,
operates on the common `ArchitectState` structure, and explicitly
records its audit trail (PhaseIteration, Rationale, LlmCallRecord).
**Each LLM phase has a hard re-prompt loop** with specific
validation hints.

```
READY
  ↓
FRAMING            LLM: User-Text → FramedGoal with
                   statedCriteria (USER_STATED) + assumedCriteria
                   (INFERRED_CONVENTION/DOMAIN/CONTEXT, with
                   confidence + rationale).
  ↓
CONFIRMING         Pure logic: stated + high-conf assumed →
                   acceptanceCriteria. Low-conf assumed according to
                   confirmationMode (DROP_LOW_CONF | KEEP_ALL |
                   ASK_LOW_CONF). For ASK_LOW_CONF: Inbox dialog,
                   Engine parks.
  ↓
GATHERING          Tool calls via DocumentService:
                   all manuals/-Documents are read as
                   EvidenceSources, with
                   gatheringRationaleId per Source.
  ↓
CLASSIFYING        One LLM call per EvidenceSource: extracts
                   atomic Claims, classifies each as
                   FACT / EXAMPLE / OPINION / OUTDATED. Non-FACT
                   Claims carry classificationRationaleId.
  ↓
DECOMPOSING        ◄─────────┐  Recovery-Loop on BINDING-Fail
                   LLM: From │  (max maxRecoveries, default 5)
                   acceptanceCriteria + Claims, Subgoals are created,
                   each Subgoal evidence-tied (evidenceRefs to
                   Claim-IDs) OR speculative=true with Rationale.
                   decompositionRationaleId for the plan form.
  ↓                          │
BINDING            Hard validator-gate (6 rules):              │
                   - each Subgoal has evidence OR is speculative
                   - claim-refs resolve                         │
                   - criterion-refs resolve                     │
                   - non-speculative cite at least 1 FACT/EXAMPLE
                   - each acceptanceCriterion is addressed by ≥1
                     Subgoal (Coverage)                         │
                   - speculation-ratio ≤ maxSpeculativeRatio
                   On Fail: pendingRecovery → DECOMPOSING ─────┘
  ↓ (pass)
PROPOSING          ◄─────────┐  Recovery-Loop on VALIDATING-Fail
                   LLM-Call with System-Prompt switched to
                   outputSchemaType:
                   - VOGON_STRATEGY: generates Recipe-YAML with
                     engine: vogon + inline strategyPlanYaml
                   - MARVIN_RECIPE: generates Recipe-YAML with
                     engine: marvin + params + promptPrefix
                   Delivers RecipeDraft with yaml + justifications-
                   Map (constraint-key → sg-id) + shapeRationale.
  ↓                          │
VALIDATING         Hard validator-gate (6 rules):              │
                   - YAML parses + is Mapping                   │
                   - recipe.name + recipe.engine present        │
                   - VOGON_STRATEGY: embedded strategyPlanYaml
                     parses via StrategyResolver
                   - MARVIN_RECIPE: promptPrefix non-blank +
                     params block present
                   - justification refs resolve to subgoal-IDs  │
                   On Fail: pendingRecovery → PROPOSING ───────┘
  ↓ (pass)
PERSISTING         DocumentService writes
                   recipes/_slart/<runId>/<recipe-name>.yaml
                   (see §8) + sibling audit.json with complete
                   ArchitectState. Builds TerminationRationale.
  ↓
                   (planOnly=true: → DONE; else → EXECUTING)
  ↓
EXECUTING          ◄─────────┐  Recovery-Loop on
                   RecipeResolver loads the Recipe written in PERSISTING,
                   ThinkEngineService spawns a Child with the target Engine (Vogon /
                   Marvin / …). Slart's Process parks BLOCKED
                   until the Child's ProcessEvent arrives.
                   On Child-DONE → EXECUTION_VALIDATING. On
                   Child-FAILED/STOPPED → FAILED.
  ↓                          │   EXECUTION_VALIDATING-Fail
EXECUTION_VALIDATING          │
                   Pure logic (regex on Subgoal texts): extracts
                   expected file paths from non-speculative
                   Subgoals, checks via DocumentService.findByPath
                   if each path exists + has ≥200 characters.
                   Then optional ContentValidatingPhase
                   (LLM-Judge against User-Criteria), if any
                   are set.
                   On Fail: pendingRecovery → PROPOSING ───────┘
                   with detailed Hint (what's missing, what
                   remains, Phase-Add/Phase-Extend suggestions).
  ↓ (pass)
DONE
```

Recovery branches at BINDING, VALIDATING, and EXECUTION_VALIDATING
collectively count against `maxRecoveries`. Upon exhaustion: according
to `escalationMode`, either directly `ESCALATED` or via `ESCALATING`
→ Inbox dialog → User decides.

**LLM Hardening per Phase (Pattern):** SystemPrompt with "EXACTLY one
JSON object", "no Markdown wrapper". Output schema strictly
checked. On schema violation: Re-Prompt with concrete
validator output as hint. Max 2 corrections per LLM call.

## 3. ArchitectState

Persisted on
`ThinkProcessDocument.engineParams.architectState`. Single source
of truth for the audit chain. Most important fields:

```
runId                      "3a4f7c91"  — 8-hex UUIDv4-prefix, assigned once
                                        at spawn, Storage-
                                        Bucket key
userDescription            verbatim user text
outputSchemaType           VOGON_STRATEGY | MARVIN_RECIPE | ZAPHOD_RECIPE | SCRIPT_JS
mode                       CREATE | EDIT | UPDATE — drives the
                                        invent vs. patch branch, the
                                        LOADING_EXISTING phase, and the
                                        PERSISTING write-path
existingScriptRef          String — SCRIPT_JS UPDATE only; document
                                        path of the existing script
existingScriptCode         String — loaded body for UPDATE mode
                                        (filled by LOADING_EXISTING)
priorFailureReason         String — UPDATE-mode optional context from
                                        a prior Hactar-FAILED run
status                     ArchitectStatus enum
goal                       FramedGoal { framed, sourceUserText,
                                        statedCriteria[], assumedCriteria[] }
acceptanceCriteria         Criterion[] — Output of CONFIRMING
evidenceSources            EvidenceSource[] — Output of GATHERING
evidenceClaims             Claim[] — Output of CLASSIFYING
subgoals                   Subgoal[] — Output of DECOMPOSING
decompositionRationaleId   Rationale-Ref for the plan form
proposedRecipe             RecipeDraft — Output of PROPOSING
rationales                 Rationale[] — append-only Pool, each
                                        phase appends its justifications
iterations                 PhaseIteration[] — one entry per phase run,
                                        audit history
llmCallRecords             LlmCallRecord[] — one entry per LLM call
                                        (auditLlmCalls=true)
validationReport           ValidationCheck[] — last gate results
pendingRecovery            RecoveryRequest — set by
                                        BINDING/VALIDATING on Fail
recoveryCount              int — total recoveries (BINDING +
                                        VALIDATING combined)
maxRecoveries              int (default 5)
confirmationThreshold      double (default 0.85)
maxSpeculativeRatio        double (default 0.30)
auditLlmCalls              boolean (default true)
confirmationMode           ConfirmationMode (see §6)
escalationMode             EscalationMode (see §6)
pendingInboxItemId         String — InboxItem-ID the Engine
                                        is currently waiting for (see §7)
pendingInboxKind           CONFIRMATION | ESCALATION | NONE
terminationRationale       TerminationRationale — set by
                                        PERSISTING
persistedRecipePath        recipes/_slart/<runId>/<name>.yaml
failureReason              String on FAILED
```

All structures in `vance-api/.../slartibartfast/`, Lombok-Builder,
Jackson-roundtrip-stable.

### Audit-Chain Invariant

Every non-trivial artifact references another by ID:

```
EvidenceSource.gatheringRationaleId        → Rationale.id
Claim.sourceId                             → EvidenceSource.id
Claim.classificationRationaleId            → Rationale.id (non-FACT only)
Criterion(assumed).rationaleId             → Rationale.id (INFERRED_*)
Subgoal.evidenceRefs[]                     → Claim.id
Subgoal.criterionRefs[]                    → Criterion.id
RecipeDraft.shapeRationaleId               → Rationale.id
RecipeDraft.justifications[constraint-key] → Subgoal.id
PhaseIteration.llmCallRecordId             → LlmCallRecord.id
TerminationRationale.criterionCoverage[c]  → Subgoal.id[]
```

Validators (BINDING, VALIDATING) check referential integrity
and demand re-generation for dangling refs.

## 4. Output Schema Types

Which schema types Slartibartfast can generate. The set is
**additively extensible** — each schema type carries a
schema-specific System-Prompt (for PROPOSING) and a
schema-specific parser (for VALIDATING); the rest of the lifecycle
(FRAMING, GATHERING, CLASSIFYING, DECOMPOSING, BINDING, PERSISTING,
EXECUTING, EXECUTION_VALIDATING) is schema-agnostic.

| Schema Type | Status | Validator (in VALIDATING) | Spawn Engine |
|---|---|---|---|
| `vogon-strategy` | **production** | `VogonArchitect` — `StrategyResolver.parseStrategy` + worker-recipe-existence-Check | Vogon |
| `marvin-recipe` | **production** | `MarvinArchitect` — promptPrefix non-blank + Pebble-Template-Compile + `params`-Map + `allowedSubTaskRecipes`/`recipesOnlyViaExpand` resolve via `RecipeLoader` | Marvin |
| `zaphod-recipe` | **production** | `ZaphodArchitect` — `ZaphodHeadsParser.parseRecipe` (mirrors `ZaphodEngine.buildInitialState` validation) | Zaphod |
| `script-js` | **production** | `JsScriptArchitect` — delegates to `HactarService.validate(...)` (parse + JSDoc-Header + Tool-Allowlist) | Hactar (via `DirectExecutionSpawn`) |

Schema-specific knowledge lives in `SchemaArchitect`-Beans under
`de.mhus.vance.brain.slartibartfast.architect.*`. The lifecycle
phases (`ProposingPhase`, `ValidatingPhase`, `PersistingPhase`) are
schema-agnostic and resolve the Architect via
`Map<OutputSchemaType, SchemaArchitect>`. New schema type ⇒
new Bean, no edits in the phase classes.

**Recipe Schemas vs. Script Schemas:** `vogon-strategy`,
`marvin-recipe`, `zaphod-recipe` produce Recipe YAML
(persisted under `_vance/recipes/_slart/<runId>/<name>.yaml`,
EXECUTING goes through the `RecipeResolver`).
`script-js` produces JavaScript (persisted under
`_vance/scripts/_slart/<runId>/<name>.js`, EXECUTING spawns
Hactar directly via `architect.directExecutionSpawn(...)` — see
`SchemaArchitect.DirectExecutionSpawn`). VALIDATING skips
the recipe-specific YAML-Parse + `engine:`-
Field-Checks for `script-js` (controlled by `architect.isRecipeOutput()`).

**MARVIN_RECIPE Output Form:**
```yaml
name:        <recipe-name>
description: |
  <description>
engine: marvin
params:
  rootTaskKind: PLAN
  maxPlanCorrections: 2
  # optional Marvin-Constraints (from Phase M-Q)
  allowedSubTaskRecipes: [...]
  recipesOnlyViaExpand: [...]
  allowedExpandDocumentRefPaths: [...]
  requiredChildTemplateRecipeParams: { ... }
  disallowedTaskKinds: [AGGREGATE]
  defaultExecutionMode: SEQUENTIAL | PARALLEL
promptPrefix: |
  You are the <name>-PLAN-node.
  Generate EXACTLY N Children: ...
```

Slartibartfast matches Shape **plus** Sub-Recipe existence: each
name in `allowedSubTaskRecipes` / `recipesOnlyViaExpand` must
resolve via the Project-`RecipeLoader`, otherwise
`MarvinArchitect`-VALIDATING rejects the Recipe and drives Re-PROPOSE.

**VOGON_STRATEGY Output Form:**
```yaml
name:        <recipe-name>
description: ...
engine: vogon
params:
  strategyPlanYaml: |
    name: <strategy-name>
    version: "1"
    phases:
      - name: <phase>
        worker: <recipe or ford>
        workerInput: |
          <prompt>
        gate: { requires: [<phase>_completed] }
```

**ZAPHOD_RECIPE Output Form:**
```yaml
name:        <recipe-name>
description: ...
engine: zaphod
params:
  pattern: COUNCIL
  heads:
    - name: <unique kebab-case head-name>
      recipe: <recipe-name from project, typically ford>
      persona: |
        <distinct perspective / bias / role>
    - ...
  synthesisPrompt: |
    <instruction for the synthesizer turn>
```

Council-Shape rules (validated by `ZaphodHeadsParser`):
2-5 Heads sweet-spot, hard cap at
`ZaphodEngine.MAX_HEADS`, unique Head names, each Head
references a Project Recipe. The Architect's `appendProposingContext`
provides the Slart-LLM with the Project Recipe list,
so Head-Recipes are not hallucinated.

**SCRIPT_JS Output Form** (JavaScript Orchestrator Script, NOT
Recipe YAML):
```js
/**
 * @description <one-liner>
 * @timeout 30m
 * @statements 10M
 * @requiresTools imap_fetch, light_llm_call, inbox_create
 * @allowTools imap_fetch, light_llm_call, inbox_create, mail_move
 */
(function () {
    // …Orchestrator logic, vance.tools.call(...), vance.process.spawn(...)…
})();
```

`JsScriptArchitect` is a Schema-Architect-Bean like the
others, but with three key differences:

1. `isRecipeOutput()` returns `false` — VALIDATING skips
   YAML-Parse, `engine:`-Field-Check and path-persistence-Check.
2. `outputPathSegment()` / `outputExtension()` return `"scripts"`
   / `".js"` — PERSISTING writes under
   `_vance/scripts/_slart/<runId>/<name>.js`.
3. `directExecutionSpawn(state)` returns a
   `DirectExecutionSpawn(engineName="hactar", engineParams={scriptRef,
   language})` — EXECUTING bypasses the `RecipeResolver` and spawns
   Hactar directly with the persisted Script.

Validation: `JsScriptArchitect.validateDraftShape` delegates to
`HactarService.validate(...)` — parse + JSDoc-Header + Tool-
Allowlist-Intersect (single owner from
`planning/script-architect-executor-split.md` §5.6).

**Mode CREATE/UPDATE for SCRIPT_JS** (Engine-Param
`mode`, default `CREATE`):
- `CREATE` — Generate script from scratch from Goal + Manuals.
- `UPDATE` — Caller provides `existingScriptRef` (+ optional
  `failureReason`). `LoadingExistingPhase` loads the body into
  `state.existingScriptCode`; `JsScriptArchitect.appendProposingContext`
  injects it as an "EXISTING SCRIPT" block into the User-Prompt.
  PERSISTING writes a new version in the `_slart/<newRunId>/`-
  Bucket — no in-place edit of the original file (analogous to the
  EDIT guarantee in §8 for Recipes).

**Output Form is additively extensible.** A new
`SchemaArchitect`-Bean ⇒ new Enum value in `OutputSchemaType` ⇒
new Output Form section here. `ProposingPhase`,
`ValidatingPhase`, and `PersistingPhase` are NOT changed
(the latter reads `outputPathSegment` + `outputExtension` from
the Architect).

## 5. Lifecycle and Recovery

### Engine.runTurn

Lane-triggered like all Engines. Pseudocode:

```
runTurnInner:
  state = loadState(process)

  // Terminal check FIRST (avoid spurious flickers).
  if state.status in {DONE, FAILED, ESCALATED}:
    closeProcess; return

  // Drain — InboxAnswer flips state in place.
  for msg in ctx.drainPending():
    if msg is InboxAnswer:
      handleInboxAnswer(state, msg)
        // Matches state.pendingInboxItemId; depending on
        // pendingInboxKind calls applyConfirmationAnswer or
        // applyEscalationAnswer.

  advanceOnePhase(state)
  persistState(state)

  // Park check: Inbox dialog running?
  if state.pendingInboxItemId != null:
    process.status := BLOCKED
    return

  if state.status in {DONE, FAILED, ESCALATED}:
    closeProcess
    return

  process.status := IDLE
  scheduleTurn
```

### Recovery Mechanism

```
advanceOnePhase:
  // 1. Recovery consumption FIRST.
  if state.pendingRecovery != null:
    recoveryCount++
    if recoveryCount > maxRecoveries:
      switch escalationMode:
        case FAIL:     state.status := ESCALATED
        case ASK_USER: postEscalationInbox(); state.status := ESCALATING
      pendingRecovery := null
      return
    state.status := pendingRecovery.toPhase
    // pendingRecovery remains set for now — the target phase
    // reads the hint, resets it after Acting.

  // 2. Phase dispatch.
  switch state.status:
    case READY:        → FRAMING
    case FRAMING:      framingPhase.execute() → CONFIRMING
    case CONFIRMING:   confirmingPhase.execute() → GATHERING (unless parked)
    case GATHERING:    gatheringPhase.execute() → CLASSIFYING
    case CLASSIFYING:  classifyingPhase.execute() → DECOMPOSING
    case DECOMPOSING:  decomposingPhase.execute() → BINDING
    case BINDING:      bindingPhase.execute()
                       if pendingRecovery: stay (rolled-back next turn)
                       else: → PROPOSING
    case PROPOSING:    proposingPhase.execute() → VALIDATING
    case VALIDATING:   validatingPhase.execute()
                       if pendingRecovery: stay
                       else: → PERSISTING
    case PERSISTING:   persistingPhase.execute()
                       if planOnly: → DONE
                       else:        → EXECUTING
    case EXECUTING:    executeChildIfNeeded() (idempotent spawn);
                       Process parks BLOCKED until ProcessEvent
                       of the Child arrives via drainPending.
                       Child-DONE     → EXECUTION_VALIDATING
                       Child-FAILED   → FAILED
    case EXECUTION_VALIDATING:
                       executionValidatingPhase.execute()
                       + ContentValidatingPhase (if User-Criteria)
                       if pendingRecovery: → PROPOSING (Recovery-Loop)
                       else: → DONE
    case ESCALATING:   no-op (parked, drainPending wakes us)

  // 3. Safety-net: clear stale recovery if phase didn't.
  if pendingRecovery == consumedRecovery:
    pendingRecovery := null
```

Re-entry after Recovery: the target phase (DECOMPOSING or PROPOSING)
reads `state.pendingRecovery.hint` as the first step and puts it
into the next LLM-Prompt — then it clears pendingRecovery.
Engine's safety-net clear is only relevant for stub/no-op phases.

## 6. Engine Parameters (Control)

Recipe-Author or Spawn-Caller sets these on `engineParams`:

| Param | Values | Default | Effect |
|---|---|---|---|
| `userDescription` | string | (fallback to `process.goal`) | Free-text User task |
| `outputSchemaType` | see §4 | `vogon-strategy` | Which Recipe form is generated |
| `planOnly` | boolean | `false` | `true` ⇒ Engine stops after PERSISTING with DONE; `false` ⇒ Engine spawns the generated Recipe as a Child and validates its outputs (EXECUTING + EXECUTION_VALIDATING, see §2) |
| `proposingHints` | string | (empty) | Free-text-Append to the PROPOSING-System-Prompt — used by Kits/Wrapper-Recipes to inject Recipe-Shape conventions without changing the Engine-Prompts |
| `confirmationMode` | `DROP_LOW_CONF` \| `KEEP_ALL` \| `ASK_LOW_CONF` | `DROP_LOW_CONF` | How low-conf assumed criteria are handled — see §7 |
| `escalationMode` | `FAIL` \| `ASK_USER` | `FAIL` | What happens when the Recovery budget is exhausted — see §7 |
| `confirmationThreshold` | double 0..1 | 0.85 | Confidence threshold for "high-conf assumed" |
| `maxSpeculativeRatio` | double 0..1 | 0.30 | Max proportion of speculative Subgoals |
| `maxRecoveries` | int | 5 | Total budget for BINDING+VALIDATING-Recoveries |
| `auditLlmCalls` | boolean | true | Append LlmCallRecord per LLM-Call |
| `mode` | `CREATE` \| `EDIT` \| `UPDATE` | inferred | Explicit mode selection. Default derivation: `existingScriptRef` set → UPDATE; `targetRecipeName` set → EDIT; otherwise CREATE. EDIT is recipe-only (in-place overwrite in `_user/`); UPDATE writes to a new `_slart/<runId>/`-Bucket |
| `existingScriptRef` | string | (empty) | UPDATE-mode for SCRIPT_JS: Document path to the existing Script. Mandatory for UPDATE; LOADING_EXISTING reads the body and stashes it on `state.existingScriptCode` |
| `failureReason` | string | (empty) | UPDATE-mode optional: Hactar-`TerminationRationale.failureReason` from a prior FAILED run. Surface in the PROPOSING-Prompt as "what went wrong last time" context. Internally mapped to `state.priorFailureReason` |
| `targetRecipeName` | string | (empty) | EDIT-mode: existing recipe to patch in `_vance/recipes/_user/<name>.yaml`. FRAMING-LLM can also extract from User description |

Values are case-insensitive and tolerant of Dash↔Underscore.
Unknown values → Default with WARN-Log.

## 7. Inbox Dialog (M6.2)

Two places can make the Engine wait for a User response:

### CONFIRMATION (mode=ASK_LOW_CONF)

**Trigger:** At least one assumed Criterion has
`confidence < confirmationThreshold`.

**Mechanism:**
1. ConfirmingPhase posts an `InboxItemType.APPROVAL` with:
   - `title`: "Slartibartfast: Confirm N assumption(s)?"
   - `body`: List of low-conf Criteria with text + confidence
   - `payload.kind = "slartibartfast.confirmation"`,
     `payload.criteria = [{id, text, origin, confidence, rationaleId}]`
2. Phase sets `pendingInboxItemId` + `pendingInboxKind=CONFIRMATION`,
   returns without setting `acceptanceCriteria`.
3. Engine sees pendingInboxItemId, sets process status `BLOCKED`.
4. User responds via Inbox: `{approved: true|false}`.
5. Engine.drainPending matches inboxItemId, calls
   `applyConfirmationAnswer`:
   - `approved=true`: each low-conf assumed Criterion gets
     `origin → USER_CONFIRMED` (then passes through).
   - `approved=false`: no update (passive abort — the
     originals remain low-conf INFERRED_* and are dropped in the
     next ConfirmingPhase round).
6. ConfirmingPhase runs again, sees pendingInboxItemId=null,
   no more low-conf (either USER_CONFIRMED or already)
   → normal partition → status → GATHERING.

### ESCALATION (mode=ASK_USER)

**Trigger:** `recoveryCount > maxRecoveries`.

**Mechanism:**
1. Engine recovery-handler posts `InboxItemType.APPROVAL` with:
   - `title`: "Slartibartfast: Recovery budget exhausted — retry?"
   - `body`: Last Recovery Reason + Hint
   - `payload.kind = "slartibartfast.escalation"`,
     `payload.validationReport`, `payload.recipeDraft`.
2. Engine sets `pendingInboxItemId` +
   `pendingInboxKind=ESCALATION`, status `ESCALATING`.
3. Process status → BLOCKED.
4. User responds `{approved: true|false}`.
5. drainPending → `applyEscalationAnswer`:
   - `approved=true`: `recoveryCount=0`, status → PROPOSING
     (fresh attempt).
   - `approved=false`: status → ESCALATED (terminal close).

### Response Granularity (v1)

Both dialogues are binary (yes/no for the entire batch). Per-
Criterion decisions would be possible via `InboxItemType.STRUCTURE_EDIT`
— if practice shows that the binary answer is too coarse.

## 8. Storage Convention for Generated Artifacts

Slartibartfast persists Recipes as Documents under the
standard path `recipes/<name>.yaml`. To prevent generated Recipes from
colliding with hand-authored or Kit-installed Recipes, each
Slartibartfast-Spawn runs in its own **Run-Bucket**:

```
recipes/_slart/<runId>/<recipe-name>.yaml
recipes/_slart/<runId>/audit.json
```

| Component | Meaning |
|---|---|
| `_slart/` | Namespace prefix; matches the convention of `_tenant` for System Projects |
| `<runId>` | 8-Hex-Char-Prefix of a UUIDv4, assigned once at spawn (`architectState.runId`) |
| `<recipe-name>` | Name from `RecipeDraft.name` (LLM-generated, kebab-case) |
| `audit.json` | Pretty-printed Jackson-Dump of the complete ArchitectState — Audit + Reproducibility |

The Recipe can be spawned directly with `process_create(engine="vogon"|"marvin",
recipe="_slart/<runId>/<recipe-name>")` —
`RecipeLoader` reads subdirectories under `recipes/` transparently.

PERSISTING is idempotent (find-or-update). Audit-Write-Failure is
non-fatal — if the Recipe is written, the run is considered
successful.

**Guarantee of Bucket Separation.** As long as Slartibartfast
writes exclusively to `recipes/_slart/<runId>/`, its outputs and
Kit-installed Recipes (`recipes/<name>.yaml` at the same level)
**cannot physically overwrite each other**. This guarantee is the
basis for the two write paths into the Project configuration
(deterministic Kit import, LLM-driven Slart run) to coexist
conflict-free today. Any future extension that would allow
Slartibartfast to patch existing Recipes outside the `_slart/`-Bucket
(Edit mode) must explicitly renegotiate this guarantee — otherwise,
a `kit update` would silently overwrite a Slart patch or vice versa.

## 9. DONE Payload (Contract)

When the run reaches DONE, the Engine emits a ProcessEvent
with the ArchitectState as Payload. Key fields for the
Caller:

| Field | Content |
|---|---|
| `runId` | 8-hex bucket id |
| `outputSchemaType` | see §4 |
| `persistedRecipePath` | `recipes/_slart/<runId>/<name>.yaml` |
| `proposedRecipe.name` | Recipe name (Resolver form: `_slart/<runId>/<name>`) |
| `proposedRecipe.confidence` | 0..1 |
| `childExecutionProcessId` | (only if `planOnly=false`) ID of the Child-Execution-Process that executed the generated Recipe |
| `childExecutionOutcome` | (only if `planOnly=false`) `DONE` \| `FAILED` \| `STOPPED` of the Child run |
| `terminationRationale.statedCriteriaSatisfied` | IDs of addressed stated Criteria |
| `terminationRationale.assumedCriteriaTakenForGranted` | high-conf inferred assumptions |
| `terminationRationale.assumedCriteriaUserConfirmed` | confirmed via Inbox (M6.2) |
| `terminationRationale.evidenceCoverage` | 1.0 - speculative-ratio |
| `terminationRationale.iterationCount` | how many PhaseIterations |
| `terminationRationale.recoveryEvents` | how many Recoveries passed through |
| `terminationRationale.finalConfidence` | RecipeDraft.confidence |

If `planOnly=true`, the Caller (typically Arthur) reads the
Payload and either:
- direct spawn: `process_create(recipe="_slart/<runId>/<name>")`
- User Approval: shows Recipe + TerminationRationale in chat,
  asks for confirmation, then spawns.

If `planOnly=false`, the Recipe has already been executed — the Caller
shows the result (`childExecutionOutcome` plus the output documents
checked in EXECUTION_VALIDATING) and typically has nothing more to spawn.

## 10. Relationship to Trillian

Trillian (not yet implemented) would be **the open variant** —
Goal without a fixed endpoint, iterative skeleton building with
reflection. When to use which?

| Aspect | Slartibartfast | Trillian |
|---|---|---|
| Input | Description + Schema Type | Goal (free text) |
| Setup | Phased Workflow (10 Stages) | Goal Internalization |
| Output | Persisted Recipe YAML | Live Run with Skeleton+Detail |
| Adaptive | No (finished after DONE) | Yes (skeleton can mutate mid-run) |
| Latency | Low (~30-90s typical, 6-8 LLM calls) | High (Reflection per step) |
| Determinism | High | Medium |
| When | Task fits into Recipe form | Truly open, long-running task |

They are not mutually exclusive: Trillian could internally call
Slartibartfast for skeleton generation, and otherwise
generate freely.

## 11. Open Points

- **Self-execute loop for all schemas is implemented.**
  EXECUTING + EXECUTION_VALIDATING (+ ContentValidatingPhase +
  Recovery-Loop back to PROPOSING, see §2 + §5) is
  schema-agnostic and applies to Vogon, Marvin, and Zaphod.
- **Sub-recipe generation for MARVIN_RECIPE output**: today
  `MarvinArchitect.validateDraftShape` checks via `RecipeLoader`
  that each name in `allowedSubTaskRecipes` /
  `recipesOnlyViaExpand` is an existing Project Recipe;
  missing names cause VALIDATING to fail and drive Re-PROPOSE
  with a concrete Recipe inventory hint. What remains open: if the
  LLM needs a truly new Sub-Recipe, today the User must
  install an extended Kit — a recursive
  Slartibartfast-Spawn per missing Sub-Recipe could
  automate this.
- **Per-Criterion Decisions in the Inbox dialog** (extension of M6.2):
  Instead of binary for the batch — `InboxItemType.STRUCTURE_EDIT` with
  a boolean per Criterion. Awaiting concrete UX feedback.
- **Cost-Caps** (`maxLlmCallsPerSpawn`): Currently unlimited. With
  6-15 calls per run (FRAMING + N×CLASSIFYING + DECOMPOSING +
  PROPOSING + Recoveries) ~$0.005-0.02 per Run — acceptable, but
  a hard cap for runaway Recovery loops would be useful.
- **Constraint-Recursion** (informational): If Slartibartfast
  itself spawns a Marvin-Recipe via `marvin-recipe`-output, its
  own controlling Recipe is also a Marvin-Recipe. This is
  Level-3 recursion from `instructions/engines.md` §"Level
  three". Mechanism unchanged — each layer is a normal run.
- **Edit mode for existing Recipes (Future):** "Replace Persona-Head Y with Z in Recipe X" — today architecturally
  excluded because PERSISTING writes exclusively to
  `recipes/_slart/<runId>/` (see §8 Guarantee). If
  implemented, bucket separation against `kit update` must be
  renegotiated.

## 12. Implementation Status

**Status: Implemented (M0–M6).** All phases are real, all Engine-
Parameters controllable, Inbox dialog functional.

| Milestone | What | Tests |
|---|---|---|
| M0 | Data Model (DTOs, Enums) | Roundtrip test green |
| M1 | Engine Skeleton with Stub Phases | Lifecycle test green |
| M2 | FRAMING (real LLM) | + ai-test |
| M3.1 | CONFIRMING (pure logic) | unit |
| M3.2 | GATHERING (DocumentService) | unit |
| M3.3 | CLASSIFYING (real LLM) | unit |
| M4.1 | DECOMPOSING + BINDING + Recovery | unit |
| M4.2 | PROPOSING + VALIDATING | unit |
| M4.3 | PERSISTING + TerminationRationale | unit + ai-test (full pipeline) |
| M5 | MARVIN_RECIPE Output — production via `MarvinArchitect` (System-Prompt + 4 Shape-Validators incl. `allowedSubTaskRecipes`-Resolve). | unit + ai-test (`SlartibartfastMarvinRecipeLlmTest`) |
| EX | EXECUTING + EXECUTION_VALIDATING + ContentValidatingPhase | unit + ai-test (FullPipeline) |
| AR | Schema-Architects-Refactor — `SchemaArchitect`-Interface + `VogonArchitect` / `MarvinArchitect` / `ZaphodArchitect`-Beans; `ProposingPhase` + `ValidatingPhase` schema-agnostic. Plus ZAPHOD_RECIPE as third Output-Schema production-ready. | unit (`ZaphodHeadsParserTest`) + ai-test (`ZaphodArchitectRecipeShapeLlmTest`) |
| M6.1 | confirmationMode + escalationMode (DROP/KEEP/FAIL) | unit |
| M6.2 | ASK_LOW_CONF + ASK_USER (Inbox-Dialog) | (Test gap; see §11) |

Prerequisites — all met:
- Phase F (Vogon-Inline-strategyPlanYaml) — Slartibartfast emits
  inline `params.strategyPlanYaml` for VOGON_STRATEGY.
- §2.5/§2.6 Vogon-Branch-Actions — internal Decider/JSON-Output-
  Patterns as templates for the Phase-System-Prompts.
- Phase M/L/O/Q (Marvin-Constraint-Params) — the configuration
  buttons that Slartibartfast sets for MARVIN_RECIPE.
- Phase N (Marvin-Sequencing) + Phase P (idempotent postActions) —
  so that a generated Marvin-Recipe runs end-to-end.

**Empirically verified (M5+M4.3 ai-tests):**
- VOGON_STRATEGY-Output with completely parser-valid Vogon-Recipe
  incl. inline strategyPlanYaml (4-6 phases)
- MARVIN_RECIPE-Output with engine: marvin, params (auto.
  defaultExecutionMode + disallowedTaskKinds + allowedExpandDocumentRefPaths
  matching Manuals), structured promptPrefix
- Recovery-Loop works live (VALIDATING #1 → PROPOSING #2 → VALIDATING #2)
- 0 hallucinations in the tested runs against the essay-slart Kit
