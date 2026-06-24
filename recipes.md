---
title: Recipes
nav_order: 8
permalink: /recipes/
---

# Bundled Recipes
{: .no_toc }

All recipes shipped under `vance-defaults/_vance/recipes/`. Tenants and projects can override any of them — see [`recipes`](/specs/recipes) for the cascade rules and the full schema.
{: .fs-5 .fw-300 }

<!-- AUTO-GENERATED from vance-brain/.../recipes/ by scripts/sync-recipes.sh — do not edit here. -->

## Table of contents
{: .no_toc .text-delta }

1. TOC
{:toc}

---

## Recipe vs. Engine

An **engine** is a Java algorithm (one of the dozen think engines). A **recipe** is a YAML config that picks an engine + sets defaults + attaches a prompt prefix + adjusts tool availability. Few engines, many recipes — to add a new type of assignment, you write a recipe, not Java. Spec: [recipes](/specs/recipes).

Each recipe below lists:

- **engine** — which engine runs it
- **Model** — the model alias used (e.g. `default:fast`, `default:analyze`); resolved per tenant via the alias cascade ([`llm-resource-management`](/specs/llm-resource-management) §3a)
- **Max iterations** — for engines that loop (most do)
- **Tags** — non-authoritative hints used by the selector and tooling

The `promptPrefix` (Pebble template) is **not** shown here — these get long and reference variables the recipe doesn't carry alone. Follow the Source link on each recipe to read it.

---

## User-facing recipes

Recipes the user / orchestrator can pick directly when spawning a session or process (`listed: true`). These show up in the Web UI recipe selector and in `vance-foot --recipe <name>`.

### `analyze`
{: .d-inline-block }

engine: `ford`
{: .label .label-blue }

Substantive analysis with multiple tool calls. Reads files,
inspects state, returns findings with cited evidence.

**Model:** `default:analyze`

**Max iterations:** 10

**Tags:** `analysis`, `research`

[Source](https://github.com/mhus/vance/blob/main/server/vance-brain/src/main/resources/vance-defaults/_vance/recipes/analyze.yaml){: .btn .btn-purple .fs-3 .mr-2 }

### `arthur`
{: .d-inline-block }

engine: `arthur`
{: .label .label-blue }

**Arthur — Reactive Chat**

Reactive session-chat orchestrator. Talks to the user, delegates
operational work to worker recipes, synthesises worker results
back into the chat. Default for engine 'arthur' when no specific
recipe is named.

**Model:** `default:arthur` (fallbacks: `default:analyze`)

**Max iterations:** 6

**Tags:** `chat`, `orchestrator`, `engine-default`

[Source](https://github.com/mhus/vance/blob/main/server/vance-brain/src/main/resources/vance-defaults/_vance/recipes/arthur.yaml){: .btn .btn-purple .fs-3 .mr-2 }

### `code-read`
{: .d-inline-block }

engine: `ford`
{: .label .label-blue }

**Code Read**

Read-only codebase inspection. Reads files, follows references,
summarises structure and call sites.

**Model:** `default:code-read` (fallbacks: `default:code`)

**Max iterations:** 10

**Tags:** `code`, `read`

[Source](https://github.com/mhus/vance/blob/main/server/vance-brain/src/main/resources/vance-defaults/_vance/recipes/code-read.yaml){: .btn .btn-purple .fs-3 .mr-2 }

### `coding`
{: .d-inline-block }

engine: `lunkwill`
{: .label .label-blue }

Coding worker. Reads and edits files at the active work target,
runs build/test commands, spawns deep-think workers for strategy
questions. Use for: bug fixes, adding tests, small refactors, code
reviews with edits. Not for large architecture decisions — delegate
those to Marvin.

**Model:** `default:code` (fallbacks: `default:fast`)

**Tags:** `worker`, `coding`

[Source](https://github.com/mhus/vance/blob/main/server/vance-brain/src/main/resources/vance-defaults/_vance/recipes/coding.yaml){: .btn .btn-purple .fs-3 .mr-2 }

### `eddie`
{: .d-inline-block }

engine: `eddie`
{: .label .label-blue }

**Eddie — Personal Hub**

Personal hub assistant. Single conversational entry point that
speaks across the user's projects, delegates operational work to
project chats (DELEGATE_PROJECT / STEER_PROJECT), posts inbox
items for follow-up, and keeps her own scratchpad in the user
project. Default for engine 'eddie' when no specific recipe is
named.

**Model:** `default:eddie` (fallbacks: `default:analyze`)

**Max iterations:** 6

**Tags:** `hub`, `engine-default`

[Source](https://github.com/mhus/vance/blob/main/server/vance-brain/src/main/resources/vance-defaults/_vance/recipes/eddie.yaml){: .btn .btn-purple .fs-3 .mr-2 }

### `ford`
{: .d-inline-block }

engine: `ford`
{: .label .label-blue }

**Ford — Generalist Worker**

Generalist Ford-engine default. Auto-applied when a process
is spawned with `engine="ford"` but no specific recipe.
Specialised recipes (analyze, web-research, code-read…) sit on
top of this — pick the most specific one when applicable.

**Model:** `default:ford` (fallbacks: `default:analyze`)

**Max iterations:** 8

**Tags:** `generalist`, `engine-default`

[Source](https://github.com/mhus/vance/blob/main/server/vance-brain/src/main/resources/vance-defaults/_vance/recipes/ford.yaml){: .btn .btn-purple .fs-3 .mr-2 }

### `lunkwill`
{: .d-inline-block }

engine: `lunkwill`
{: .label .label-blue }

**Lunkwill — Focused Worker**

Generic Lunkwill worker — Pi-style loop, drains inbox, calls the LLM,
executes tools, repeats until natural stop or tool-driven terminate.
Specialise via coding / lunkwill-repair / lunkwill-fook-upstream.

**Model:** `default:fast`

**Tags:** `worker`, `engine-default`

[Source](https://github.com/mhus/vance/blob/main/server/vance-brain/src/main/resources/vance-defaults/_vance/recipes/lunkwill.yaml){: .btn .btn-purple .fs-3 .mr-2 }

### `marvin`
{: .d-inline-block }

engine: `marvin`
{: .label .label-blue }

**Marvin — Deep Think**

Marvin v2 — autonomous-worker deep-think engine. Every node is
a marvin-worker that walks the 5-phase state-machine. The tree
grows dynamically: nodes decide for themselves whether to call
a specialist recipe, decompose into children, ask the user, or
conclude. The Plan IS the Tree — every LLM call receives a live
snapshot of the entire tree as context.

Specialist recipes (web-research, analyze, code-read) are invoked
via the CALL_RECIPE action and run in their native mode — Marvin
does NOT layer the structured output contract on top of them.

**Model:** `default:marvin` (fallbacks: `default:analyze`)

**Tags:** `deep-think`, `orchestrator`

[Source](https://github.com/mhus/vance/blob/main/server/vance-brain/src/main/resources/vance-defaults/_vance/recipes/marvin.yaml){: .btn .btn-purple .fs-3 .mr-2 }

### `quick-lookup`
{: .d-inline-block }

engine: `ford`
{: .label .label-blue }

**Quick Lookup**

Cheap one-shot fact retrieval. Use when one tool call with a
short answer suffices — file existence, current date, single
shell command.

**Model:** `default:quick-lookup` (fallbacks: `default:fast`)

**Max iterations:** 3

**Tags:** `fast`, `lookup`

[Source](https://github.com/mhus/vance/blob/main/server/vance-brain/src/main/resources/vance-defaults/_vance/recipes/quick-lookup.yaml){: .btn .btn-purple .fs-3 .mr-2 }

### `web-research`
{: .d-inline-block }

engine: `ford`
{: .label .label-blue }

**Web Research**

Multi-source web research with summarisation. Use this when the
user wants up-to-date information from the public web — comparison
reports, current best-practices, vendor-feature lookups, news /
status checks. Performs several `research_search` / `web_fetch`
calls, cross-checks sources, and returns a synthesis with inline
source attributions ([source: url]). Single-shot worker (no
sub-tasks); not for tasks that need decomposition into phases.

**Model:** `default:web-research` (fallbacks: `default:web`)

**Max iterations:** 12

**Tags:** `research`, `web`

[Source](https://github.com/mhus/vance/blob/main/server/vance-brain/src/main/resources/vance-defaults/_vance/recipes/web-research.yaml){: .btn .btn-purple .fs-3 .mr-2 }

---

## Worker & engine-default recipes

Recipes spawned by orchestrators (Arthur, Marvin, Vogon, …) for operational subtasks, plus engine defaults that fire when a process is created with an engine name but no specific recipe. Not shown in the user-facing selector but spawnable through the orchestrator path.

### `agrajag`
{: .d-inline-block }

engine: `agrajag`
{: .label .label-blue }

Tool-health diagnostic service engine. Triggered when the synchronous
AgrajagChecker cannot classify a tool error from patterns. Investigates
the failure, probes the tool with safe read-only calls if helpful,
and writes a structured diagnosis into the tool-health document.

**Model:** `default:agrajag` (fallbacks: `default:fast`)

**Max iterations:** 3

**Tags:** `service`, `tool-health`, `diagnostic`

[Source](https://github.com/mhus/vance/blob/main/server/vance-brain/src/main/resources/vance-defaults/_vance/recipes/agrajag.yaml){: .btn .btn-purple .fs-3 .mr-2 }

### `council-bmad-build`
{: .d-inline-block }

engine: `zaphod`
{: .label .label-blue }

BMAD-METHOD-orientiertes Council für Software-Build-Anfragen:
drei Rollen aus dem agilen Team — Product Manager (Was/Warum),
Architect (Wie/Struktur), Developer (Konkrete Umsetzung). Jede
Rolle bewertet die Anfrage aus ihrer Perspektive; Synthese
kombiniert die Sichten zu einem koordinierten Build-Vorschlag.
Geeignet für: Feature-Anfragen, Architektur-Entscheidungen,
Story-Aufrisse vor der eigentlichen Implementierung.

**Tags:** `council`, `multi-head`, `bmad`, `software-build`

[Source](https://github.com/mhus/vance/blob/main/server/vance-brain/src/main/resources/vance-defaults/_vance/recipes/council-bmad-build.yaml){: .btn .btn-purple .fs-3 .mr-2 }

### `council-three-perspectives`
{: .d-inline-block }

engine: `zaphod`
{: .label .label-blue }

3-Personen-Beratung zu einer Entscheidungsfrage: Optimist,
Skeptiker, Pragmatiker. Jeder gibt seine Sicht ab, dann
Synthese. Geeignet für Architektur-/Design-/Strategie-Fragen
bei denen mehrere Sichten Wert bringen.

**Tags:** `council`, `multi-head`, `decision`

[Source](https://github.com/mhus/vance/blob/main/server/vance-brain/src/main/resources/vance-defaults/_vance/recipes/council-three-perspectives.yaml){: .btn .btn-purple .fs-3 .mr-2 }

### `debate-pro-contra`
{: .d-inline-block }

engine: `zaphod`
{: .label .label-blue }

Pro/Contra-Debatte zu einer Entscheidungsfrage. Pro argumentiert
für den Vorschlag, Contra dagegen. Nach jeder Round prüft ein
LightLlm-Check, ob Konsens erreicht ist; sonst läuft die nächste
Round (bis zu 3). Der Synthesizer fasst die finale Position
zusammen — explizit getrennt, ob Konsens erreicht wurde oder die
Köpfe nach maxRounds noch dissentieren. Geeignet für Entscheidungen
bei denen Positionen sich realistisch unter Pressure shiften
können (Ship-jetzt-oder-warten, Buy-vs-Build, Security-Audit etc.).

**Tags:** `debate`, `multi-head`, `decision`, `pro-contra`

[Source](https://github.com/mhus/vance/blob/main/server/vance-brain/src/main/resources/vance-defaults/_vance/recipes/debate-pro-contra.yaml){: .btn .btn-purple .fs-3 .mr-2 }

### `default`
{: .d-inline-block }

engine: `ford`
{: .label .label-blue }

Generalist worker fallback — used when a process is spawned
without recipe AND without engine. Conservative defaults: ford
with a basic 'helpful assistant' prompt and validation on.

**Model:** `default:analyze`

**Max iterations:** 8

**Tags:** `default`, `generalist`

[Source](https://github.com/mhus/vance/blob/main/server/vance-brain/src/main/resources/vance-defaults/_vance/recipes/default.yaml){: .btn .btn-purple .fs-3 .mr-2 }

### `hactar`
{: .d-inline-block }

engine: `hactar`
{: .label .label-blue }

Hactar engine default — pure script executor (v2). Loads a
JavaScript orchestrator from a project document, runs minimal
pre-flight validation (parse + JSDoc header + tool-allowlist
intersect via HactarService.validate), optionally runs deep
LLM-review (HactarService.deepValidate via the script-review
recipe), and executes the script in a sandboxed GraalJS context.

Script authoring lives in Slartibartfast with
outputSchemaType=SCRIPT_JS — see the bundled `slart-and-run`
recipe for "generate-and-execute in one step".

Engine params (required + optional):
  scriptRef          string — document path to the script (REQUIRED)
  language           string — "js" (default; only supported v1)
  validateBeforeRun  bool   — true → opt-in LLM-review before EXEC (default false)
  scriptAllowedTools list   — tool names the script may call (caller-supplied)
  scriptParams       map    — bindings the script sees as vance.params.*
  timeout            int|str — wall-clock cap, seconds or "30s"/"5m"/"1h"

**Tags:** `default`, `script-executor`, `engine-default`

[Source](https://github.com/mhus/vance/blob/main/server/vance-brain/src/main/resources/vance-defaults/_vance/recipes/hactar.yaml){: .btn .btn-purple .fs-3 .mr-2 }

### `hactar-run`
{: .d-inline-block }

engine: `hactar`
{: .label .label-blue }

Hactar-Run — runs an existing JavaScript orchestrator script in
one step. Pure executor — no authoring, no LLM-review (unless
`validateBeforeRun: true` is set on the call).

Use this recipe when:
  - A scheduler fires periodically and the script already lives
    at a known document path (cron-driven mail-bot, daily-briefing
    generator, etc.).
  - A tool / LLM wants to invoke a known-good script by name.
  - The user clicks "Run" on a script in Cortex.

Required engine-params from the caller:
  scriptRef          — document path to the script (e.g.
                        "scripts/mail-bot.js")
Optional engine-params:
  language           — "js" (default; only supported v1)
  validateBeforeRun  — bool, default false. true → Hactar runs
                        HactarService.deepValidate (LightLlm
                        script-review) before EXECUTING.
  scriptAllowedTools — list, tools the script may call via
                        vance.tools.call(...). Inherited from
                        the parent recipe when unset.
  scriptParams       — map, bindings the script sees as
                        vance.params.*
  timeout            — int (seconds) or duration string ("30s",
                        "5m", "1h"). Wall-clock cap.

**Tags:** `script-executor`, `scheduler-friendly`

[Source](https://github.com/mhus/vance/blob/main/server/vance-brain/src/main/resources/vance-defaults/_vance/recipes/hactar-run.yaml){: .btn .btn-purple .fs-3 .mr-2 }

### `jeltz`
{: .d-inline-block }

engine: `jeltz`
{: .label .label-blue }

Single-shot structured-query engine. Caller provides `prompt` and
`schema` (JSON Schema subset, top-level type object) via engineParams;
Jeltz returns one schema-validated JSON object wrapped with
success/attempts/data (or error/message/lastInvalid) as the final
assistant message, then closes the process with CloseReason.DONE.

**Model:** `default:jeltz` (fallbacks: `default:fast`)

**Tags:** `structured`, `engine-default`

[Source](https://github.com/mhus/vance/blob/main/server/vance-brain/src/main/resources/vance-defaults/_vance/recipes/jeltz.yaml){: .btn .btn-purple .fs-3 .mr-2 }

### `marvin-architect`
{: .d-inline-block }

engine: `slartibartfast`
{: .label .label-blue }

Slartibartfast variant that generates a Marvin v2 recipe
(engine: marvin, autonomous-worker tree with the 5-phase
state-machine) from a free-text request. Same Slart lifecycle
(FRAMING → … → PERSISTING → EXECUTING → EXECUTION_VALIDATING),
only the PROPOSING and VALIDATING phases produce/check a
Marvin-recipe shape instead of a Vogon strategy.

Use this when the task needs **deep, recursive decomposition**
with possible user-input mid-flow — "research X systematically
and write a report", "analyse this codebase and produce an
architecture document", "help me decide between A and B, ask
me what you need to know first". The hallmark is dynamic
task-tree growth: Marvin's autonomous workers spawn additional
sub-tasks (NEEDS_SUBTASKS) or USER_INPUT nodes as they discover
what's needed.

For linear pipelines with a fixed shape ("write the document
with these phases") use plain `slartibartfast` (vogon-strategy).
For multi-perspective debate use `zaphod-architect`.

**Model:** `default:marvin-architect` (fallbacks: `default:analyze`)

**Tags:** `architect`, `deep-think`, `engine-default`

[Source](https://github.com/mhus/vance/blob/main/server/vance-brain/src/main/resources/vance-defaults/_vance/recipes/marvin-architect.yaml){: .btn .btn-purple .fs-3 .mr-2 }

### `marvin-worker`
{: .d-inline-block }

engine: `marvin`
{: .label .label-blue }

Marvin v2 worker contract. The Marvin engine itself drives every
WORKER node through the five-phase state machine
(SCOPE → REFLECT → POST_CHILDREN → CONCLUDE → VALIDATE); the
engine is the actual driver, this recipe just supplies the
shared system prompt that explains the phases and the live
PLAN snapshot mechanic to the LLM.

This recipe is referenced by name from MarvinEngine.WORKER_RECIPE_NAME
but isn't spawned as a regular Ford process — its prompt is read
through the document cascade at prompts/marvin-worker-system.md.

Listed here so the recipe registry can surface it and so model /
thinking-budget defaults can be overridden per project.

**Model:** `default:marvin-worker` (fallbacks: `default:analyze`)

**Tags:** `marvin`, `worker`, `engine-default`

[Source](https://github.com/mhus/vance/blob/main/server/vance-brain/src/main/resources/vance-defaults/_vance/recipes/marvin-worker.yaml){: .btn .btn-purple .fs-3 .mr-2 }

### `python`
{: .d-inline-block }

engine: `ford`
{: .label .label-blue }

Python worker — manages a Python workspace RootDir with a local
venv, installs packages with pip, runs scripts. The python_*
tools are promoted to primary so they sit in the default tool
catalog without find_tools discovery.

**Model:** `default:python` (fallbacks: `default:code`)

**Max iterations:** 12

**Tags:** `python`, `code`, `worker`

[Source](https://github.com/mhus/vance/blob/main/server/vance-brain/src/main/resources/vance-defaults/_vance/recipes/python.yaml){: .btn .btn-purple .fs-3 .mr-2 }

### `slart-and-run`
{: .d-inline-block }

engine: `slartibartfast`
{: .label .label-blue }

Slart-and-Run — generates a JavaScript orchestrator script from a
free-text goal and runs it in one step. Combines Slart's
evidence-based authoring (SCRIPT_JS schema with audit chain)
with Hactar's executor lifecycle. Replaces the legacy
"hactar" default-fallback recipe.

Workflow:
  1. Slart's authoring pipeline runs (FRAMING → CONFIRMING →
     GATHERING → CLASSIFYING → DECOMPOSING → BINDING → PROPOSING
     → VALIDATING) and writes the validated script body to
     `_vance/scripts/_slart/<runId>/<name>.js`.
  2. Slart's EXECUTING phase spawns Hactar with the persisted
     script ref. Hactar's LOADING re-validates (parse + header +
     tool-allowlist), then EXECUTES the script.
  3. Slart's EXECUTION_VALIDATING phase checks the Hactar run
     outcome and either marks DONE or treats validation
     failures as recovery hints for another PROPOSING pass.

Use this recipe when:
  - The user types a free-text goal and the selector has no
    better match (`routing.fallback.recipe` default).
  - A caller (LLM tool, scheduler) explicitly wants "generate +
    run a script for this goal" without thinking about Slart vs.
    Hactar plumbing.

Use the `hactar-run` recipe instead when:
  - The script already exists at a known path and you just want
    to execute it (scheduler-driven cron jobs, etc.).

**Tags:** `default`, `script-architect`, `script-executor`, `engine-default`

[Source](https://github.com/mhus/vance/blob/main/server/vance-brain/src/main/resources/vance-defaults/_vance/recipes/slart-and-run.yaml){: .btn .btn-purple .fs-3 .mr-2 }

### `slart-script-author`
{: .d-inline-block }

engine: `slartibartfast`
{: .label .label-blue }

Slart-Script-Author — generates a JavaScript orchestrator script
from a free-text goal and **stops at PERSISTING**. No self-execute
via Hactar — the caller (Cortex's Generate/Update buttons, future
hot-fix scaffolding flows) decides whether and when to run the
generated script.

Companion to `slart-and-run`:

| Recipe                | planOnly | Use case                                |
|-----------------------|----------|-----------------------------------------|
| `slart-and-run`       | false    | Free-text goal → generate + execute     |
| `slart-script-author` | true     | Cortex Generate/Update: code only       |

Both share `engine: slartibartfast` + `outputSchemaType: SCRIPT_JS`.
The difference is the EXECUTING phase: planOnly=true stops cleanly
at DONE after PERSISTING; planOnly=false spawns Hactar.

**Tags:** `script-author`, `internal-cortex`

[Source](https://github.com/mhus/vance/blob/main/server/vance-brain/src/main/resources/vance-defaults/_vance/recipes/slart-script-author.yaml){: .btn .btn-purple .fs-3 .mr-2 }

### `slartibartfast`
{: .d-inline-block }

engine: `slartibartfast`
{: .label .label-blue }

Plan-architect / meta-engine. Frames a free-text user goal, gathers
evidence from project manuals, decomposes into subgoals, and emits a
NEW recipe (Vogon-strategy by default) tailored to the goal. Output
is a recipe YAML, not a final document. Slart auto-executes the
generated recipe synchronously unless `planOnly=true`.

Use via `arthur_action DELEGATE preset="slartibartfast"` when a task
is substantial enough to deserve its own multi-phase plan (school
essays, multi-chapter reports, research deliverables, …) and no
pre-built recipe in the catalog fits. Slart reads the project's
kit-installed manuals as evidence, so installed skill-/genre-kits
steer the generated plan automatically.

**Model:** `default:slartibartfast` (fallbacks: `default:analyze`)

**Tags:** `architect`, `engine-default`

[Source](https://github.com/mhus/vance/blob/main/server/vance-brain/src/main/resources/vance-defaults/_vance/recipes/slartibartfast.yaml){: .btn .btn-purple .fs-3 .mr-2 }

### `trillian`
{: .d-inline-block }

engine: `trillian-control`
{: .label .label-blue }

Trillian (current-default Nature). Reactive chat host that
discusses tasks with the human and enqueues them into a paired
Trillian-User worker. Aliases to trillian-0 today.

**Model:** `default:analyze` (fallbacks: `default:fast`)

**Tags:** `trillian`, `control`, `chat`, `default-alias`

[Source](https://github.com/mhus/vance/blob/main/server/vance-brain/src/main/resources/vance-defaults/_vance/recipes/trillian.yaml){: .btn .btn-purple .fs-3 .mr-2 }

### `trillian-0`
{: .d-inline-block }

engine: `trillian-control`
{: .label .label-blue }

Trillian Control — Nature-0. Reactive chat host that discusses tasks
with the human and enqueues them into a paired Trillian UserProcess.

**Model:** `default:analyze` (fallbacks: `default:fast`)

**Tags:** `trillian`, `control`, `chat`

[Source](https://github.com/mhus/vance/blob/main/server/vance-brain/src/main/resources/vance-defaults/_vance/recipes/trillian-0.yaml){: .btn .btn-purple .fs-3 .mr-2 }

### `trillian-user-0`
{: .d-inline-block }

engine: `trillian-user`
{: .label .label-blue }

Trillian User worker-loop — Nature-0 v2. Picks task_request events,
spawns workers via process_create, observes, validates, reports
back to Control via task_complete / task_failed / task_needs_input.
Runs as _trillian-0XXXX in its own headless session.

**Model:** `default:analyze` (fallbacks: `default:fast`)

**Tags:** `trillian`, `user`, `worker`, `orchestrator`

[Source](https://github.com/mhus/vance/blob/main/server/vance-brain/src/main/resources/vance-defaults/_vance/recipes/trillian-user-0.yaml){: .btn .btn-purple .fs-3 .mr-2 }

### `trillian-worker-0`
{: .d-inline-block }

engine: `lunkwill`
{: .label .label-blue }

Trillian-User worker. Lunkwill loop with a hard termination contract:
call trillian_done(summary=…) when the task is finished so the
parent gets a clean DONE event. Otherwise behaves like a coding-
style worker (file_*/exec_*/doc_* via Lunkwill defaults).

**Model:** `default:fast` (fallbacks: `default:analyze`)

**Tags:** `trillian`, `worker`

[Source](https://github.com/mhus/vance/blob/main/server/vance-brain/src/main/resources/vance-defaults/_vance/recipes/trillian-worker-0.yaml){: .btn .btn-purple .fs-3 .mr-2 }

### `waterfall-feature`
{: .d-inline-block }

engine: `vogon`
{: .label .label-blue }

Vogon-driven sequential plan: planning → implementation → review.
User approval gates between phases. Use this when a request
genuinely needs phased execution with checkpoints, not when a
single Marvin/Ford worker would suffice.

**Tags:** `strategy`, `waterfall`, `feature`

[Source](https://github.com/mhus/vance/blob/main/server/vance-brain/src/main/resources/vance-defaults/_vance/recipes/waterfall-feature.yaml){: .btn .btn-purple .fs-3 .mr-2 }

### `zaphod`
{: .d-inline-block }

engine: `zaphod`
{: .label .label-blue }

Zaphod engine default — bewusst minimal. Verlangt explizit
pattern + heads via params. Catch-all für engine-direct-Spawns
(Tests). Für echte Use-Cases das spezifische Council-Recipe
wählen (z.B. council-three-perspectives).

**Tags:** `default`, `multi-head`, `engine-default`

[Source](https://github.com/mhus/vance/blob/main/server/vance-brain/src/main/resources/vance-defaults/_vance/recipes/zaphod.yaml){: .btn .btn-purple .fs-3 .mr-2 }

### `zaphod-architect`
{: .d-inline-block }

engine: `slartibartfast`
{: .label .label-blue }

Slartibartfast variant that generates a Zaphod council recipe
(engine: zaphod, heads + personae + synthesisPrompt) from a
free-text request. Same Slart lifecycle (FRAMING → … → PERSISTING
→ EXECUTING → EXECUTION_VALIDATING), only the PROPOSING and
VALIDATING phases produce/check a council shape instead of a
Vogon strategy.

Use this when the user wants multiple distinct perspectives on
a topic, with a final synthesis — "set up a council of …", "give
me three viewpoints on … and a recommendation", "build a debate
panel for …". For workflow-style tasks ("write the document with
these phases") use plain `slartibartfast` (which defaults to
vogon-strategy) instead.

**Model:** `default:zaphod-architect` (fallbacks: `default:analyze`)

**Tags:** `architect`, `council`, `engine-default`

[Source](https://github.com/mhus/vance/blob/main/server/vance-brain/src/main/resources/vance-defaults/_vance/recipes/zaphod-architect.yaml){: .btn .btn-purple .fs-3 .mr-2 }

---

## Internal service profiles

`internal: true` recipes are **not** spawnable as think-processes. They act as configuration profiles for the [`LightLlmService`](/specs/light-llm-service) — a single-shot LLM call with the recipe's prompt and schema, no engine lifecycle, no lane lock. Backing services like Follow-Up, Fook triage, Discovery (`how-do-i`) and the image-title generator use them directly.

### `_prak`
{: .d-inline-block }

engine: `jeltz`
{: .label .label-blue }

Internal config profile for PrakService — the LLM-driven
classifier that the memory-evaluation pipeline runs over a span
(chat-history compaction window, hot-path marker turn, autodream
aggregation slice). NOT spawnable — marked `internal: true` so the
standard recipe selector skips it.

See planning/memory-evaluation-pipeline.md §4 for the schema and §5
for the trigger taxonomy. The Pebble vars rendered into promptPrefix
are `messages` (the formatted span body), `expectedItemsHint`
(a soft "X to Y items expected" line, blank when unknown), and
`windowHint` (caller-supplied context: scope name, recipe label).

**Model:** `default:_prak` (fallbacks: `default:fast`)

**Tags:** `internal`, `memory-evaluation`

[Source](https://github.com/mhus/vance/blob/main/server/vance-brain/src/main/resources/vance-defaults/_vance/recipes/_prak.yaml){: .btn .btn-purple .fs-3 .mr-2 }

### `action-loop-judge`
{: .d-inline-block }

engine: `jeltz`
{: .label .label-blue }

Internal LightLlmService config profile used by
ActionLoopJudgeService when an action-loop hits its maxIters budget
without the LLM committing to a final action. The judge decides
whether to extend the loop (give the model another budget) or to
synthesise an answer from what's already been gathered.

NOT spawnable — marked `internal: true` so the standard recipe
selector skips it.

Pebble variables:
  userGoal       — the user's most recent message in this turn
                   (the question/instruction that triggered the loop)
  gatheredText   — best free text the LLM emitted across the loop
                   ("bestFreeText" from the action engine)
  toolsUsed      — newline-separated list of tool calls made this
                   turn, in order. Each line is "name(arg-preview)".
  iterations     — how many iterations have been consumed so far
  extensionsLeft — how many more budget extensions the engine is
                   willing to grant after this judgment (0 = this
                   is the last call; must synthesise unless really
                   making progress)

Output: ONE JSON object, no markdown fences, no prose around it.

**Model:** `default:fast` (fallbacks: `default:analyze`)

**Tags:** `internal`, `action-loop-judge`

[Source](https://github.com/mhus/vance/blob/main/server/vance-brain/src/main/resources/vance-defaults/_vance/recipes/action-loop-judge.yaml){: .btn .btn-purple .fs-3 .mr-2 }

### `document-summary`
{: .d-inline-block }

engine: `jeltz`
{: .label .label-blue }

Internal config profile for the LightLlmService consumed by
DocumentSummaryDriver. Generates a 1-3 sentence summary plus 3-8
topical tags per dirty document so the project-RAG indexer has a
searchable kind=summary chunk per file. NOT spawnable — marked
`internal: true` so the standard recipe selector skips it.

Tenants override this recipe to swap the summariser model, change
the tag policy ("German tags only", "single-word only"), or relax
the JSON contract — no Java change required.

**Model:** `default:document-summary` (fallbacks: `default:fast`)

**Tags:** `summary`, `system`, `internal`

[Source](https://github.com/mhus/vance/blob/main/server/vance-brain/src/main/resources/vance-defaults/_vance/recipes/document-summary.yaml){: .btn .btn-purple .fs-3 .mr-2 }

### `engine-output-translator`
{: .d-inline-block }

engine: `jeltz`
{: .label .label-blue }

Internal LightLlmService config profile used by
ParentNotificationListener to translate the technical output of
engines that do NOT produce user-facing replies (Hactar, Slartibartfast,
…) into a natural-language answer matching the original user goal.

NOT spawnable — marked `internal: true` so the standard recipe
selector skips it. Called only when an engine returns
`producesUserFacingOutput() == false` AND the lifecycle event is
DONE or FAILED.

Pebble variables:
  userGoal      — the goal the spawning user typed (the child
                  process's `goal` field), in whatever language it
                  was written
  eventType     — DONE | FAILED
  engineName    — emitting engine (slartibartfast / hactar / …)
                  so the LLM knows what kind of plumbing it's looking at
  rawSummary    — the engine's technical humanSummary
                  (Hactar's "executed ... return value", Slart's
                  "Recipe persisted at ...", etc.)

Output: ONE short natural-language reply, in the language of the
user goal, that answers the user's request based on what the engine
produced. Plain text — no markdown, no code fences, no header
decorations. The reply lands verbatim as the new `humanSummary` of
the outgoing ProcessEvent, where the parent engine (Arthur) will
RELAY it to the user.

**Model:** `default:fast` (fallbacks: `default:analyze`)

**Tags:** `internal`, `engine-translation`

[Source](https://github.com/mhus/vance/blob/main/server/vance-brain/src/main/resources/vance-defaults/_vance/recipes/engine-output-translator.yaml){: .btn .btn-purple .fs-3 .mr-2 }

### `follow-up`
{: .d-inline-block }

engine: `jeltz`
{: .label .label-blue }

Internal config profile for the LightLlmService consumed by
FollowUpService (backend of the follow-up suggestion REST endpoint).
NOT spawnable — marked `internal: true` so the standard recipe
selector skips it.

Two structural modes, selected by which Pebble variables are set:

- Edit mode: `textBefore` + `textAfter` set, `precedingContext`
  absent. The user is editing a text and the cursor sits between
  the two fragments. Suggestions are inserted VERBATIM at the
  cursor — write text the user could plausibly have typed next.
- Reply mode: `precedingContext` set, `textBefore`/`textAfter`
  absent. The user is looking at the given text (typically the last
  assistant message in a chat) and wants suggestions for how to
  react — a follow-up question, a clarification, an acknowledgement.

`mode` is an optional free-form UI-surface hint passed through
verbatim, orthogonal to the edit/reply branch.

**Model:** `default:follow-up` (fallbacks: `default:fast`)

**Tags:** `internal`, `followup`

[Source](https://github.com/mhus/vance/blob/main/server/vance-brain/src/main/resources/vance-defaults/_vance/recipes/follow-up.yaml){: .btn .btn-purple .fs-3 .mr-2 }

### `fook`
{: .d-inline-block }

engine: `jeltz`
{: .label .label-blue }

Internal config profile for the LightLlmService consumed by
FookService (backend of the bug/feature ticket triage system).
NOT spawnable — marked `internal: true` so the standard recipe
selector skips it.

FookService pre-loads up to N candidate tickets (text-similarity
match against the submission text) and renders them via the
Pebble variable `{{ candidates }}`. The submission itself is one
free-form text blob exposed as `{{ text }}` — the reporter does
NOT supply type/title/severity, Fook derives them.

The LLM must classify the report, decide whether it's a new
ticket, a duplicate of an existing one, or not a ticket at all,
and (for new tickets) derive title, type, and severity from the
text.

See `planning/fook-service.md`.

**Model:** `default:fook` (fallbacks: `default:analyze`)

**Tags:** `internal`, `fook`, `triage`

[Source](https://github.com/mhus/vance/blob/main/server/vance-brain/src/main/resources/vance-defaults/_vance/recipes/fook.yaml){: .btn .btn-purple .fs-3 .mr-2 }

### `hactar-args-extract`
{: .d-inline-block }

engine: `jeltz`
{: .label .label-blue }

Internal LightLlmService config profile used by Hactar's
ArgsResolver. Given a JavaScript script and a free-text user
intent, extract concrete values for the parameters the script
expects via `vance.params.<name>` references.

NOT spawnable — marked `internal: true` so the standard recipe
selector skips it.

Pebble variables:
  code            — full script source
  intent          — free-text user intent / process goal
  requiredKeys    — comma-separated list of params the script
                    reads via vance.params.X (Hactar's regex scan)
  suppliedKeys    — comma-separated list of keys the caller
                    already provided (so the LLM ignores them)

Output schema (Jeltz-loop):
  {
    "params": { "<name>": <value>, ... },
    "unresolved": [ "<name>", ... ]   // params the LLM couldn't infer
  }

Hactar merges `params` with the caller-supplied scriptParams
before EXECUTING. `unresolved` entries trigger a FAILED status
with a clear "missing required parameter" message.

**Model:** `default:fast` (fallbacks: `default:analyze`)

**Tags:** `internal`, `hactar`

[Source](https://github.com/mhus/vance/blob/main/server/vance-brain/src/main/resources/vance-defaults/_vance/recipes/hactar-args-extract.yaml){: .btn .btn-purple .fs-3 .mr-2 }

### `how-do-i`
{: .d-inline-block }

engine: `jeltz`
{: .label .label-blue }

Internal config profile for the LightLlmService consumed by
DiscoveryService (backend of the `how_do_i` tool). NOT spawnable —
marked `internal: true` so the standard recipe selector skips it.
The service reads model alias, fallback list, max-attempts budget
and promptPrefix from here; the LLM is called directly without a
process spawn.

**Model:** `default:how-do-i` (fallbacks: `default:fast`)

**Tags:** `internal`, `discovery`

[Source](https://github.com/mhus/vance/blob/main/server/vance-brain/src/main/resources/vance-defaults/_vance/recipes/how-do-i.yaml){: .btn .btn-purple .fs-3 .mr-2 }

### `image-title`
{: .d-inline-block }

engine: `jeltz`
{: .label .label-blue }

Internal config profile for the LightLlmService consumed by
FenchurchService. Used to generate a short human-readable title +
ASCII slug from an image prompt — the title lands in
DocumentDocument.title (UI), the slug becomes the file-name
fragment (images/<uuid>-<slug>.png).

NOT spawnable — marked `internal: true` so the standard recipe
selector skips it. Single Pebble variable: `prompt` (the user's
image-generation prompt).

**Model:** `default:fast`

**Tags:** `internal`, `fenchurch`

[Source](https://github.com/mhus/vance/blob/main/server/vance-brain/src/main/resources/vance-defaults/_vance/recipes/image-title.yaml){: .btn .btn-purple .fs-3 .mr-2 }

### `kit-resolver`
{: .d-inline-block }

engine: `jeltz`
{: .label .label-blue }

Internal config profile for the LightLlmService consumed by
KitNameResolverService. Maps a free-text kit wish (typed by a user
or emitted by Eddie) to a canonical entry name in the tenant's
project-kits catalog. NOT spawnable — marked `internal: true` so
the standard recipe selector skips it.

Tenants override this recipe to swap the matching model, tighten
the prompt rules ("our 'creative-essay' kit handles all Aufsatz
wishes, prefer it over the bundled school-essay"), or relax the
JSON contract when their catalog grows complex enough to need
explanations.

**Model:** `default:kit-resolver` (fallbacks: `default:fast`)

**Tags:** `resolver`, `system`, `internal`

[Source](https://github.com/mhus/vance/blob/main/server/vance-brain/src/main/resources/vance-defaults/_vance/recipes/kit-resolver.yaml){: .btn .btn-purple .fs-3 .mr-2 }

### `recipe-selector`
{: .d-inline-block }

engine: `jeltz`
{: .label .label-blue }

Internal config profile for the LightLlmService consumed by
RecipeSelectorService. Picks one project recipe from a small,
trigger-matched candidate list, given a free-text task description.
NOT spawnable — marked `internal: true` so the standard recipe
selector skips it (self-reference would be funny).

The deterministic pre-stages in the service (recipe-name word
boundary + trigger-keyword substring) run BEFORE this recipe is
consulted. The LLM only sees ambiguity cases — typically 2-4
candidates that all matched the same trigger keyword.

Tenants override this recipe to bias the disambiguation prompt
("our 'analyze' recipe is always more specific than 'deep-think'"),
swap the model, or relax the JSON contract — no Java change
required.

**Model:** `default:recipe-selector` (fallbacks: `default:fast`)

**Tags:** `routing`, `system`, `internal`

[Source](https://github.com/mhus/vance/blob/main/server/vance-brain/src/main/resources/vance-defaults/_vance/recipes/recipe-selector.yaml){: .btn .btn-purple .fs-3 .mr-2 }

### `script-review`
{: .d-inline-block }

engine: `jeltz`
{: .label .label-blue }

Internal config profile for the LightLlmService consumed by
HactarService.deepValidate(...). Used for semantic LLM-Review of
a script before execution (Hactar's opt-in VALIDATING phase, plus
Cortex's POST /scripts/validate-deep endpoint).

NOT spawnable — marked `internal: true` so the standard recipe
selector skips it. Pebble variables:

- `code`        — the full script source
- `language`    — "js" (only supported v1; later also "py")
- `sourceName`  — identifier for the script (path or "<inline>")

Output is a verdict-plus-issues object. The caller (HactarService)
parses `ok` (boolean) and `issues` (array of severity-coded
problems) — see HactarServiceImpl.parseLlmReviewReply.

**Model:** `default:script-review` (fallbacks: `default:fast`)

**Tags:** `internal`, `hactar`

[Source](https://github.com/mhus/vance/blob/main/server/vance-brain/src/main/resources/vance-defaults/_vance/recipes/script-review.yaml){: .btn .btn-purple .fs-3 .mr-2 }

### `session-metadata`
{: .d-inline-block }

engine: `jeltz`
{: .label .label-blue }

Internal config profile for the LightLlmService consumed by
SessionMetadataSuggester. Proposes a short {title}, a single-emoji
{icon} and one of twelve named {color}s for a freshly-opened chat
session, based on its first user/assistant exchange. NOT spawnable —
marked `internal: true` so the standard recipe selector skips it.

Tenants override this recipe to change the colour palette, switch
to a stronger model, or relax the icon rules — no Java change
required.

**Model:** `default:session-metadata` (fallbacks: `default:fast`)

**Tags:** `session`, `system`, `internal`

[Source](https://github.com/mhus/vance/blob/main/server/vance-brain/src/main/resources/vance-defaults/_vance/recipes/session-metadata.yaml){: .btn .btn-purple .fs-3 .mr-2 }

### `zaphod-consensus`
{: .d-inline-block }

engine: `jeltz`
{: .label .label-blue }

Internal config profile for the LightLlmService consumed by
ZaphodEngine's between-round consensus check (debate pattern).
Per round, the engine renders the current heads' last-round
replies into the template variables below and asks for a binary
JSON verdict { consensus: bool, reason: string }. NOT spawnable —
marked `internal: true` so the standard recipe selector skips it.

Tenants override this recipe to swap the check model, tighten or
loosen the consensus threshold ("only count as consensus when ALL
heads explicitly agree"), or change the language of the reason
field — no Java change required.

**Model:** `default:zaphod-consensus` (fallbacks: `default:fast`)

**Tags:** `internal`, `zaphod`, `consensus`

[Source](https://github.com/mhus/vance/blob/main/server/vance-brain/src/main/resources/vance-defaults/_vance/recipes/zaphod-consensus.yaml){: .btn .btn-purple .fs-3 .mr-2 }

### `zarniwoop-research-evaluate`
{: .d-inline-block }

engine: `jeltz`
{: .label .label-blue }

Internal config profile for the LightLlmService consumed by
ZarniwoopResearchService — phase 3 of the research_investigate
pipeline. NOT spawnable — marked `internal: true`.

Sees the original question plus every hit the execute phase
collected (deduplicated by URL) and decides per-hit whether to
keep, drop, or — for v1.5+ — flag for deepening. Produces a
relevance score on a 0..1 scale calibrated against the other hits
on screen. The service multiplies that score with the plan's
source-affinity later.

See `planning/zarniwoop-service.md` §13.

**Model:** `default:research` (fallbacks: `default:analyze`)

**Tags:** `internal`, `zarniwoop`, `research`

[Source](https://github.com/mhus/vance/blob/main/server/vance-brain/src/main/resources/vance-defaults/_vance/recipes/zarniwoop-research-evaluate.yaml){: .btn .btn-purple .fs-3 .mr-2 }

### `zarniwoop-research-plan`
{: .d-inline-block }

engine: `jeltz`
{: .label .label-blue }

Internal config profile for the LightLlmService consumed by
ZarniwoopResearchService — phase 1 of the research_investigate
pipeline. NOT spawnable — marked `internal: true`.

Reads the original question plus the current project's provider
inventory (`{{ providers }}`) and decides which searches to run,
which modalities apply, and how heavily each modality / instance
should weight against the relevance score the evaluate-recipe
produces later. The recipe owns the search strategy; the service
owns the execution mechanics and the deterministic affinity
multiplication.

See `planning/zarniwoop-service.md` §13.

**Model:** `default:research` (fallbacks: `default:analyze`)

**Tags:** `internal`, `zarniwoop`, `research`

[Source](https://github.com/mhus/vance/blob/main/server/vance-brain/src/main/resources/vance-defaults/_vance/recipes/zarniwoop-research-plan.yaml){: .btn .btn-purple .fs-3 .mr-2 }
