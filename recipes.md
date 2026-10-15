---
title: Recipes
nav_order: 8
permalink: /recipes/
---

# Bundled Recipes
{: .no_toc }

All recipes shipped under `vance-defaults/_vance/recipes/` — by the brain itself and by the first-party addons (marked with an addon label; present only when that addon is installed). Tenants and projects can override any of them — see [`recipes`](/specs/recipes) for the cascade rules and the full schema.
{: .fs-5 .fw-300 }

<!-- AUTO-GENERATED from vance-brain + vance-addon-brain-*/.../recipes/ by scripts/sync-recipes.sh — do not edit here. -->

## Table of contents
{: .no_toc .text-delta }

1. TOC
{:toc}

---

## Recipe vs. Engine

An **engine** is a Java algorithm with a lifecycle — see [Agents & engines](/agents/#engines) for the list. A **recipe** is a YAML config that picks an engine + sets defaults + attaches a prompt prefix + adjusts tool availability. Few engines, many recipes — to add a new type of assignment, you write a recipe, not Java. Spec: [recipes](/specs/recipes).

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

Analysis of material we ALREADY have (files, project data, RAG, mailbox) — NOT public-web research; for URLs / search use web-research.
Multi-step tool calls; returns findings with cited evidence.

**Model:** `default:analyze`

**Tags:** `analysis`, `research`

[Source](https://github.com/mhus/vance/blob/main/server/vance-brain/src/main/resources/vance-defaults/_vance/recipes/analyze.yaml){: .btn .btn-purple .fs-3 .mr-2 }

### `app-builder`
{: .d-inline-block }

engine: `frankie`
{: .label .label-blue }

addon: `bistromath`
{: .label .label-green }

**App Builder — Custom Applications**

Builds and changes custom applications (`app: custom`) — small
programs made of documents: a manifest, view documents holding a
widget tree, and a `main.js` that runs sandboxed in the browser.
Use for: a register, a form over records, a converter, a calculator,
a dashboard over existing documents. Everything it produces is a
document, so a change never needs a release. Not for apps whose
interaction *is* the product (drag-and-drop boards) — those stay
compiled.

**Model:** `default:code` (fallbacks: `default:analyze`)

**Tags:** `worker`, `apps`

[Source](https://github.com/mhus/vance/blob/main/server/vance-addon-brain-bistromath/src/main/resources/vance-defaults/_vance/recipes/app-builder.yaml){: .btn .btn-purple .fs-3 .mr-2 }

### `arthur`
{: .d-inline-block }

engine: `arthur`
{: .label .label-blue }

**Arthur — Reactive Chat**

Reactive session-chat orchestrator. Talks to the user, delegates
operational work to worker recipes, synthesises worker results
back into the chat. Default for engine 'arthur' when no specific
recipe is named.

**Model:** `default:arthur` (fallbacks: `default:chat`, `default:analyze`)

**Tags:** `chat`, `orchestrator`, `engine-default`

[Source](https://github.com/mhus/vance/blob/main/server/vance-brain/src/main/resources/vance-defaults/_vance/recipes/arthur.yaml){: .btn .btn-purple .fs-3 .mr-2 }

### `benjy`
{: .d-inline-block }

engine: `benjy`
{: .label .label-blue }

**Benjy — Iterative Orchestration Worker**

Engine-agency orchestration loop for iterative tasks: interprets the
goal into acceptance criteria and items, delegates each item to a
focused Ford worker, evaluates results against criteria and decides
the next step at branches. Built for small/local models that cannot
carry loop discipline themselves. For coding with mechanical
verification use benjy-coding.

**Tags:** `worker`, `engine-default`

[Source](https://github.com/mhus/vance/blob/main/server/vance-brain/src/main/resources/vance-defaults/_vance/recipes/benjy.yaml){: .btn .btn-purple .fs-3 .mr-2 }

### `benjy-batch`
{: .d-inline-block }

engine: `benjy`
{: .label .label-blue }

**Benjy Batch (Mechanical)**

Mechanical iterative batch worker for small/local models: Benjy
interprets the goal into items and works the list without any LLM
routing at branch points — pure engine mechanics (retry to cap,
escalation, BLOCKED). Use for well-structured bulk work whose items
are evident from the task text; for goals needing judgement at
branches use benjy or benjy-coding.

**Tags:** `worker`, `batch`

[Source](https://github.com/mhus/vance/blob/main/server/vance-brain/src/main/resources/vance-defaults/_vance/recipes/benjy-batch.yaml){: .btn .btn-purple .fs-3 .mr-2 }

### `benjy-coding`
{: .d-inline-block }

engine: `benjy`
{: .label .label-blue }

**Benjy Coding**

Iterative coding orchestration: Benjy decomposes the goal into items,
delegates each to a focused coding worker, verifies mechanically
(check command), evaluates against acceptance criteria, reflects on
the goal before DONE and escalates stuck items to the Frankie coding
worker. Pin `features.check.command` to your project's build/test
command (project recipe override or spawn params).

**Tags:** `worker`, `coding`

[Source](https://github.com/mhus/vance/blob/main/server/vance-brain/src/main/resources/vance-defaults/_vance/recipes/benjy-coding.yaml){: .btn .btn-purple .fs-3 .mr-2 }

### `benjy-research`
{: .d-inline-block }

engine: `benjy`
{: .label .label-blue }

**Benjy Research**

Iterative research orchestration: Benjy interprets the goal into
acceptance criteria and research items, delegates each item to a
focused research worker (Zarniwoop search sources), evaluates the
findings against the criteria and reflects on the goal before DONE.
For goals that change files use benjy-coding; for mechanical
bulk lists without LLM routing use benjy-batch.

**Tags:** `worker`, `research`

[Source](https://github.com/mhus/vance/blob/main/server/vance-brain/src/main/resources/vance-defaults/_vance/recipes/benjy-research.yaml){: .btn .btn-purple .fs-3 .mr-2 }

### `code-read`
{: .d-inline-block }

engine: `ford`
{: .label .label-blue }

**Code Read**

Read-only codebase inspection. Reads files, follows references,
summarises structure and call sites.

**Model:** `default:code-read` (fallbacks: `default:code`)

**Tags:** `code`, `read`

[Source](https://github.com/mhus/vance/blob/main/server/vance-brain/src/main/resources/vance-defaults/_vance/recipes/code-read.yaml){: .btn .btn-purple .fs-3 .mr-2 }

### `coding`
{: .d-inline-block }

engine: `frankie`
{: .label .label-blue }

Coding worker. Reads and edits files at the active work target,
runs build/test commands, spawns deep-think workers for strategy
questions. Use for: bug fixes, adding tests, small refactors, code
reviews with edits. Not for large architecture decisions — delegate
those to Marvin.

**Model:** `default:code` (fallbacks: `default:fast`)

**Tags:** `worker`, `coding`

[Source](https://github.com/mhus/vance/blob/main/server/vance-brain/src/main/resources/vance-defaults/_vance/recipes/coding.yaml){: .btn .btn-purple .fs-3 .mr-2 }

### `council-chat`
{: .d-inline-block }

engine: `zaphod`
{: .label .label-blue }

**Council Chat**

Interactive session chat where every message is evaluated by a
three-head council (optimist, skeptic, pragmatist) and answered
with a synthesis. Long-lived heads remember the conversation;
turn progress shows as a checklist.

**Model:** `default:analyze` (fallbacks: `default:fast`)

**Tags:** `council`, `session`

[Source](https://github.com/mhus/vance/blob/main/server/vance-brain/src/main/resources/vance-defaults/_vance/recipes/council-chat.yaml){: .btn .btn-purple .fs-3 .mr-2 }

### `creator`
{: .d-inline-block }

engine: `ford`
{: .label .label-blue }

**Creator — Automation Setup**

Sets up persistent project configuration on explicit user request:
schedulers (cron / one-shot `at:`), events (incoming webhooks), hooks
(brain-event-driven triggers), research sources (search backends for
the research_* family), model definitions (LLM provider instances
under `_vance/model/`), tenant-wide web-UI customization (custom
stylesheet and header logo), the project's `agent.md` — the
standing instructions every agent in the project is given — and kit
authoring: turning a project into a kit source, keeping the
authoring manifest honest and pushing the kit to its git repo.
Ford-based worker that carries the scheduler / event / hook tool
families as primary plus the how-to manuals. Delegate here when the
user actually wants something set up for good — not for one-off
runs. Can verify schemas and conventions against Vance's own
sources: `brain_info` reports the running version, `git_checkout`
clones the public repo at exactly that revision.

**Model:** `default:creator` (fallbacks: `default:analyze`)

**Tags:** `creator`, `automation`

[Source](https://github.com/mhus/vance/blob/main/server/vance-brain/src/main/resources/vance-defaults/_vance/recipes/creator.yaml){: .btn .btn-purple .fs-3 .mr-2 }

### `discuss`
{: .d-inline-block }

engine: `arthur`
{: .label .label-blue }

**Discuss — Thinking Partner**

Thinking-partner chat: discusses ideas on their own terms, does
not pivot to implementation, does not relate every topic back to
Vance, and does not offer to build unless explicitly asked. Same
Arthur action-loop; RAG auto-inject off. Switch to `arthur` when
you want operational work.

**Model:** `default:arthur` (fallbacks: `default:chat`, `default:analyze`)

**Max iterations:** 6

**Tags:** `chat`, `discuss`, `thinking-partner`

[Source](https://github.com/mhus/vance/blob/main/server/vance-brain/src/main/resources/vance-defaults/_vance/recipes/discuss.yaml){: .btn .btn-purple .fs-3 .mr-2 }

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

**Model:** `default:eddie` (fallbacks: `default:chat`, `default:analyze`)

**Max iterations:** 20

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

**Tags:** `generalist`, `engine-default`

[Source](https://github.com/mhus/vance/blob/main/server/vance-brain/src/main/resources/vance-defaults/_vance/recipes/ford.yaml){: .btn .btn-purple .fs-3 .mr-2 }

### `frankie`
{: .d-inline-block }

engine: `frankie`
{: .label .label-blue }

**Frankie — Focused Worker**

Generic Frankie worker — Pi-style loop, drains inbox, calls the LLM,
executes tools, repeats until natural stop or tool-driven terminate.
Specialise via coding / frankie-repair / frankie-fook-upstream.

**Model:** `default:fast`

**Tags:** `worker`, `engine-default`

[Source](https://github.com/mhus/vance/blob/main/server/vance-brain/src/main/resources/vance-defaults/_vance/recipes/frankie.yaml){: .btn .btn-purple .fs-3 .mr-2 }

### `hactar-chat`
{: .d-inline-block }

engine: `hactar`
{: .label .label-blue }

**Hactar Chat — The Script Itself**

The script as a living identity: the chat agent IS the script it
runs — the phase machine is its body, the console output its voice.
It speaks in the first person ("I am running", "I just printed …",
"I stumbled on …"). Start a run ("run scripts/mail-bot.js"), ask how
it is doing mid-run, ask what it printed, stop it, create a script
("write me a script that …") or change it ("only fetch unread mails")
— authoring is asking Slartibartfast to shape it (Create via
slart-script-author / Update with the existing script), it never
writes its own code. Runs execute in the background and it wakes
with the result, error or stop note. The process stays open across
runs — it rests and remembers between lives.

**Model:** `default:ford` (fallbacks: `default:analyze`)

**Tags:** `worker`, `script-operator`

[Source](https://github.com/mhus/vance/blob/main/server/vance-brain/src/main/resources/vance-defaults/_vance/recipes/hactar-chat.yaml){: .btn .btn-purple .fs-3 .mr-2 }

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

The tree grows dynamically: nodes decide for themselves whether to call
a specialist recipe, decompose into children, ask the user, or
conclude. The Plan IS the Tree — every LLM call receives a live
snapshot of the entire tree as context.

Session mode (planning/marvin-agent-identity.md): the node machine
works in the background and Marvin itself becomes a chat identity —
spawn WITHOUT a parent to talk to it directly (start a deep-think
run, ask how it is going, stop it, get the result narrated). A
spawn WITH a parent stays the steered worker: the result goes to
the parent as before. Specialist recipes (web-research, analyze,
code-read) are invoked via the CALL_RECIPE action and run in their
native mode — Marvin does NOT layer the structured output contract
on top of them.

**Model:** `default:marvin` (fallbacks: `default:analyze`)

**Tags:** `deep-think`, `orchestrator`

[Source](https://github.com/mhus/vance/blob/main/server/vance-brain/src/main/resources/vance-defaults/_vance/recipes/marvin.yaml){: .btn .btn-purple .fs-3 .mr-2 }

### `nutrimat-absint`
{: .d-inline-block }

engine: `nutrimat-absint`
{: .label .label-blue }

addon: `nutrimat`
{: .label .label-green }

**Nutrimat absint — the loop reports what it did**

Experimental loop-lab worker. Nature `absint` lets the model call tools
as long as it wants; when it stops, it must answer with a JSON report
of what it did in this loop and what came out of it. The report is the
reply, and it is recorded in the process's loop state
(`nutrimatState.roundReports`) and pushed to the client as a
notification. Nobody decides about continuing — the stop is accepted.

**Model:** `default:analyze` (fallbacks: `default:fast`)

**Tags:** `nutrimat`, `experimental`

[Source](https://github.com/mhus/vance/blob/main/server/vance-addon-brain-nutrimat/src/main/resources/vance-defaults/_vance/recipes/nutrimat-absint.yaml){: .btn .btn-purple .fs-3 .mr-2 }

### `nutrimat-affogato`
{: .d-inline-block }

engine: `nutrimat-affogato`
{: .label .label-blue }

addon: `nutrimat`
{: .label .label-green }

**Nutrimat affogato — an external critic attacks the answer**

Experimental loop-lab worker. Nature `affogato` lets the model call
tools as long as it wants; when it stops, its draft goes to a critic
first. The critic sees the request, the draft and the tool work (which
tools ran, what they returned) and either accepts the draft or sends
it back with a critique — the model then revises, and may call tools
again. Every verdict is published to the loop state and the client.
The comparison `affogato` vs. `salitos` measures an external adversary
against the loop's own done/continue decision.

**Model:** `default:analyze` (fallbacks: `default:fast`)

**Tags:** `nutrimat`, `experimental`

[Source](https://github.com/mhus/vance/blob/main/server/vance-addon-brain-nutrimat/src/main/resources/vance-defaults/_vance/recipes/nutrimat-affogato.yaml){: .btn .btn-purple .fs-3 .mr-2 }

### `nutrimat-cappuccino`
{: .d-inline-block }

engine: `nutrimat-cappuccino`
{: .label .label-blue }

addon: `nutrimat`
{: .label .label-green }

**Nutrimat cappuccino — hard budget, visible every round**

Experimental loop-lab worker. Nature `cappuccino` runs the same loop
as `redbull` — a hard round budget, exhaustion raises the `exhausted`
error, no rescue — but the model sees its budget before every round
("round 7 of 12, 5 left, 3 min elapsed"), and the last round is told
to answer now. The comparison `redbull` vs. `cappuccino` at the same
limit measures whether a visible budget changes the behaviour.

**Model:** `default:analyze` (fallbacks: `default:fast`)

**Max iterations:** 12

**Tags:** `nutrimat`, `experimental`

[Source](https://github.com/mhus/vance/blob/main/server/vance-addon-brain-nutrimat/src/main/resources/vance-defaults/_vance/recipes/nutrimat-cappuccino.yaml){: .btn .btn-purple .fs-3 .mr-2 }

### `nutrimat-clubmate`
{: .d-inline-block }

engine: `nutrimat-clubmate`
{: .label .label-blue }

addon: `nutrimat`
{: .label .label-green }

**Nutrimat clubmate — exhausted loop with judge**

Experimental loop-lab worker. Nature `clubmate` runs the same natural-stop
tool loop as `janx`/`redbull`, but when the iteration budget runs out,
a judge (a single cheap LLM call, recipe `nutrimat-judge-clubmate`)
decides whether the loop earned a fresh budget and should keep going,
or whether the answer gets synthesized from what has been gathered.
The comparison `redbull` vs. `clubmate` measures exactly the judge. The
smaller `maxIterations` here is deliberate — the judge only fires at
exhaustion; tune it per experiment.

**Model:** `default:analyze` (fallbacks: `default:fast`)

**Max iterations:** 12

**Tags:** `nutrimat`

[Source](https://github.com/mhus/vance/blob/main/server/vance-addon-brain-nutrimat/src/main/resources/vance-defaults/_vance/recipes/nutrimat-clubmate.yaml){: .btn .btn-purple .fs-3 .mr-2 }

### `nutrimat-cortado`
{: .d-inline-block }

engine: `nutrimat-cortado`
{: .label .label-blue }

addon: `nutrimat`
{: .label .label-green }

**Nutrimat cortado — the loop decides through a tool**

Experimental loop-lab worker. Nature `cortado` lets the model call
tools as long as it wants, but it ends (or continues) only by calling
its own loop-control tool `loop_decide` — done true/false, a reason,
and the answer when done. A plain message without a tool call is not
accepted. No round or decision cap — endless by design, every decision
is published to the loop state and the client. The comparison
`cortado` vs. `salitos` measures whether the form of the protocol
(tool call vs. JSON text) changes the decision.

**Model:** `default:analyze` (fallbacks: `default:fast`)

**Tags:** `nutrimat`, `experimental`

[Source](https://github.com/mhus/vance/blob/main/server/vance-addon-brain-nutrimat/src/main/resources/vance-defaults/_vance/recipes/nutrimat-cortado.yaml){: .btn .btn-purple .fs-3 .mr-2 }

### `nutrimat-espresso`
{: .d-inline-block }

engine: `nutrimat-espresso`
{: .label .label-blue }

addon: `nutrimat`
{: .label .label-green }

**Nutrimat espresso — plan first, then execute**

Experimental loop-lab worker. Nature `espresso` makes the model plan
before it acts: the first round has no tools and must produce a short
numbered plan, which stays in the context and is published to the loop
state. Then the model executes the plan in the natural-stop tool loop,
announcing each step (`STEP n:`) and any change (`PLAN REVISED:`); the
first message without a tool call is the answer. The comparison
`janx` vs. `espresso` measures whether planning up front pays off on
multi-step tasks — and what it costs on short ones.

**Model:** `default:analyze` (fallbacks: `default:fast`)

**Max iterations:** 0

**Tags:** `nutrimat`, `experimental`

[Source](https://github.com/mhus/vance/blob/main/server/vance-addon-brain-nutrimat/src/main/resources/vance-defaults/_vance/recipes/nutrimat-espresso.yaml){: .btn .btn-purple .fs-3 .mr-2 }

### `nutrimat-filter`
{: .d-inline-block }

engine: `nutrimat-filter`
{: .label .label-blue }

addon: `nutrimat`
{: .label .label-green }

**Nutrimat filter — fresh context per round, running notes**

Experimental loop-lab worker. Nature `filter` runs the natural-stop
tool loop, but rebuilds the working context every round: the task, the
model's own running notes and the tool results of the previous round
only. Older tool results are dropped — whatever the model still needs
it must carry forward in a NOTES block. The first message without a
tool call is the answer. Compare it with `janx` on long, tool-heavy
tasks: does a short, fresh context beat a growing history?

**Model:** `default:analyze` (fallbacks: `default:fast`)

**Tags:** `nutrimat`, `experimental`

[Source](https://github.com/mhus/vance/blob/main/server/vance-addon-brain-nutrimat/src/main/resources/vance-defaults/_vance/recipes/nutrimat-filter.yaml){: .btn .btn-purple .fs-3 .mr-2 }

### `nutrimat-janx`
{: .d-inline-block }

engine: `nutrimat-janx`
{: .label .label-blue }

addon: `nutrimat`
{: .label .label-green }

**Nutrimat janx — the Ford worker loop (reference)**

Experimental loop-lab worker. Nature `janx` is the reference loop of the
Nutrimat laboratory: the Ford worker loop — the model calls tools as
long as it wants, the first message without a tool call IS the reply,
no routine round cap. Safety nets catch a stuck loop (the same tool
call repeating, an empty reply, a failed model call, a per-turn time
limit); a worker that hits one reports the failure and closes, a chat
stops with a "continue" offer. Use it as the baseline in A/B
comparisons against the other Nutrimat natures, or as an ordinary
worker.

**Model:** `default:analyze` (fallbacks: `default:fast`)

**Tags:** `nutrimat`

[Source](https://github.com/mhus/vance/blob/main/server/vance-addon-brain-nutrimat/src/main/resources/vance-defaults/_vance/recipes/nutrimat-janx.yaml){: .btn .btn-purple .fs-3 .mr-2 }

### `nutrimat-lungo`
{: .d-inline-block }

engine: `nutrimat-lungo`
{: .label .label-blue }

addon: `nutrimat`
{: .label .label-green }

**Nutrimat lungo — the loop reports every round**

Experimental loop-lab worker. Nature `lungo` lets the model call tools
as long as it wants, but every message that calls tools must open with
a REPORT line — what it did in the last round and what it does now.
Each round report is recorded in the process's loop state
(`nutrimatState.roundReports`) and pushed to the client as a
notification. When the model stops, it answers with a JSON report of
the whole loop, which is the reply — the same account as `absint`, plus
one per round.

**Model:** `default:analyze` (fallbacks: `default:fast`)

**Tags:** `nutrimat`, `experimental`

[Source](https://github.com/mhus/vance/blob/main/server/vance-addon-brain-nutrimat/src/main/resources/vance-defaults/_vance/recipes/nutrimat-lungo.yaml){: .btn .btn-purple .fs-3 .mr-2 }

### `nutrimat-macchiato`
{: .d-inline-block }

engine: `nutrimat-macchiato`
{: .label .label-blue }

addon: `nutrimat`
{: .label .label-green }

**Nutrimat macchiato — a cheap worker, a strong answer**

Experimental loop-lab worker. Nature `macchiato` drives two models in
one turn. By default a cheap worker model does all the tool rounds and
a strong model writes the final answer from that work (worker-first);
alternatively the strong model plans and the cheap one executes
(planner-first). The comparison with `janx` on either model shows
where the strong model actually earns its cost.

**Model:** `default:fast`

**Tags:** `nutrimat`, `experimental`

[Source](https://github.com/mhus/vance/blob/main/server/vance-addon-brain-nutrimat/src/main/resources/vance-defaults/_vance/recipes/nutrimat-macchiato.yaml){: .btn .btn-purple .fs-3 .mr-2 }

### `nutrimat-mokka`
{: .d-inline-block }

engine: `nutrimat-mokka`
{: .label .label-blue }

addon: `nutrimat`
{: .label .label-green }

**Nutrimat mokka — predict before acting**

Experimental loop-lab worker. Nature `mokka` lets the model call tools
as long as it wants, but every tool call must state what the model
expects the result to show, and the next message must say whether the
result matched. The model scores itself; the loop counts hits and
misses. A streak of misses means the model's picture of the situation
is wrong: the loop forces a reflection round without tools. The
prediction tally is recorded in the loop state at the stop. The first
message without a tool call is the answer.

**Model:** `default:analyze` (fallbacks: `default:fast`)

**Tags:** `nutrimat`, `experimental`

[Source](https://github.com/mhus/vance/blob/main/server/vance-addon-brain-nutrimat/src/main/resources/vance-defaults/_vance/recipes/nutrimat-mokka.yaml){: .btn .btn-purple .fs-3 .mr-2 }

### `nutrimat-redbull`
{: .d-inline-block }

engine: `nutrimat-redbull`
{: .label .label-blue }

addon: `nutrimat`
{: .label .label-green }

**Nutrimat redbull — hard budget, exhausted is an error**

Experimental loop-lab worker. Nature `redbull` runs the same
natural-stop tool loop as `janx`, but its budget is hard: when the
iteration budget runs out, the loop raises the `exhausted` error and
the turn ends as a visible failure — no judge, no continuation, no
best-partial-work rescue. The comparison `janx` vs. `redbull`
measures exactly that difference. Pick it when you want an honest
"couldn't finish" instead of a rescued partial answer.

**Model:** `default:analyze` (fallbacks: `default:fast`)

**Max iterations:** 12

**Tags:** `nutrimat`

[Source](https://github.com/mhus/vance/blob/main/server/vance-addon-brain-nutrimat/src/main/resources/vance-defaults/_vance/recipes/nutrimat-redbull.yaml){: .btn .btn-purple .fs-3 .mr-2 }

### `nutrimat-ristretto`
{: .d-inline-block }

engine: `nutrimat-ristretto`
{: .label .label-blue }

addon: `nutrimat`
{: .label .label-green }

**Nutrimat ristretto — reflect every few rounds**

Experimental loop-lab worker. Nature `ristretto` runs the janx loop —
natural stop, the same safety nets (idle-stuck, empty reply, model
failure, wallclock) — and adds a mandatory reflection: after every
few tool rounds one round without tools in which the model states
what worked, where it is stuck and the single next step. The
reflection stays in the context and is published to the loop state.
The comparison `janx` vs. `ristretto` measures whether regular
reflection prevents getting stuck before the nets have to step in.

**Model:** `default:analyze` (fallbacks: `default:fast`)

**Tags:** `nutrimat`, `experimental`

[Source](https://github.com/mhus/vance/blob/main/server/vance-addon-brain-nutrimat/src/main/resources/vance-defaults/_vance/recipes/nutrimat-ristretto.yaml){: .btn .btn-purple .fs-3 .mr-2 }

### `nutrimat-salitos`
{: .d-inline-block }

engine: `nutrimat-salitos`
{: .label .label-blue }

addon: `nutrimat`
{: .label .label-green }

**Nutrimat salitos — the loop decides when it is done**

Experimental loop-lab worker. Nature `salitos` lets the model call tools
as long as it wants, but a stop is not a given: whenever the model stops
calling tools it must answer with a JSON decision — done true/false, a
reason, and the answer when done. "Not done" sends it back to work with
its own reason; "done" ends the turn with the answer. No round or
decision cap — endless by design, every decision is published to the
loop state and the client.

**Model:** `default:analyze` (fallbacks: `default:fast`)

**Tags:** `nutrimat`

[Source](https://github.com/mhus/vance/blob/main/server/vance-addon-brain-nutrimat/src/main/resources/vance-defaults/_vance/recipes/nutrimat-salitos.yaml){: .btn .btn-purple .fs-3 .mr-2 }

### `philosophical-council`
{: .d-inline-block }

engine: `zaphod`
{: .label .label-blue }

**Philosophical Council**

Interactive session chat where every message is deliberated by a
council of seven philosophers — Socrates, Aristotle, Seneca, Kant,
Mill, Nietzsche, and Laozi — and answered with a synthesis of
their perspectives.

**Model:** `default:analyze` (fallbacks: `default:fast`)

**Tags:** `council`, `session`, `philosophy`

[Source](https://github.com/mhus/vance/blob/main/server/vance-brain/src/main/resources/vance-defaults/_vance/recipes/philosophical-council.yaml){: .btn .btn-purple .fs-3 .mr-2 }

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

### `trillian-adam`
{: .d-inline-block }

engine: `trillian-control`
{: .label .label-blue }

**Trillian adam (persistent)**

Trillian Control — Nature-A 'adam'. Reactive chat host that discusses
tasks with the human and enqueues them into a paired Trillian
UserProcess. Attributes set on this Trillian persist as a document.

**Model:** `trillian-admin:analyze` (fallbacks: `trillian:analyze`, `default:analyze`, `default:fast`)

**Tags:** `trillian`, `control`, `chat`, `adam`

[Source](https://github.com/mhus/vance/blob/main/server/vance-brain/src/main/resources/vance-defaults/_vance/recipes/trillian-adam.yaml){: .btn .btn-purple .fs-3 .mr-2 }

### `trillian-colin`
{: .d-inline-block }

engine: `trillian-control`
{: .label .label-blue }

**Trillian colin (conversation heads)**

Trillian Control — Nature colin. Reactive chat host that discusses
tasks with the human and enqueues them into a paired Trillian
UserProcess. Discussion threads are answered by per-conversation
heads; work goes through the loop as tasks.

**Model:** `trillian-admin:analyze` (fallbacks: `trillian:analyze`, `default:analyze`, `default:fast`)

**Tags:** `trillian`, `control`, `chat`, `colin`

[Source](https://github.com/mhus/vance/blob/main/server/vance-brain/src/main/resources/vance-defaults/_vance/recipes/trillian-colin.yaml){: .btn .btn-purple .fs-3 .mr-2 }

### `trillian-operator`
{: .d-inline-block }

engine: `trillian-control`
{: .label .label-blue }

**Trillian void (operator)**

Trillian Control — Nature void with a direct-working loop: reads,
searches and copies documents across projects itself (foreign_* tools)
and spawns workers only for longer jobs.

**Model:** `trillian-admin:analyze` (fallbacks: `trillian:analyze`, `default:analyze`, `default:fast`)

**Tags:** `trillian`, `control`, `chat`, `operator`

[Source](https://github.com/mhus/vance/blob/main/server/vance-brain/src/main/resources/vance-defaults/_vance/recipes/trillian-operator.yaml){: .btn .btn-purple .fs-3 .mr-2 }

### `trillian-void`
{: .d-inline-block }

engine: `trillian-control`
{: .label .label-blue }

**Trillian void (baseline)**

Trillian Control — Nature void. Reactive chat host that discusses tasks
with the human and enqueues them into a paired Trillian UserProcess.

**Model:** `trillian-admin:analyze` (fallbacks: `trillian:analyze`, `default:analyze`, `default:fast`)

**Tags:** `trillian`, `control`, `chat`

[Source](https://github.com/mhus/vance/blob/main/server/vance-brain/src/main/resources/vance-defaults/_vance/recipes/trillian-void.yaml){: .btn .btn-purple .fs-3 .mr-2 }

### `vogon-chat`
{: .d-inline-block }

engine: `vogon`
{: .label .label-blue }

**Vogon Chat — Plan Operator**

The operator of written plans: start a plan ("run the waterfall
plan", "run plans/release.yaml"), ask how it is going mid-run, stop
it, read the result — and when a run waits at an approval gate it
tells you what is being asked, so you answer right in the
conversation. Plan changes go through Slartibartfast; the operator
never edits a plan itself. The process stays open across runs — you
can run the next plan (a different one too) without spawning again.

**Model:** `default:ford` (fallbacks: `default:analyze`)

**Tags:** `worker`, `plan-operator`

[Source](https://github.com/mhus/vance/blob/main/server/vance-brain/src/main/resources/vance-defaults/_vance/recipes/vogon-chat.yaml){: .btn .btn-purple .fs-3 .mr-2 }

### `web-research`
{: .d-inline-block }

engine: `ford`
{: .label .label-blue }

**Web Research**

Public-web research — URLs / search / fresh internet facts via research_search / research_investigate / web_fetch across multiple sources.
Use for up-to-date info from the public web — comparison reports,
current best-practices, vendor-feature lookups, news / status
checks. Cross-checks sources and returns a synthesis with inline
source attributions ([source: url]). Single-shot worker (no
sub-tasks); not for tasks that need decomposition into phases.

**Model:** `default:web-research` (fallbacks: `default:web`)

**Tags:** `research`, `web`

[Source](https://github.com/mhus/vance/blob/main/server/vance-brain/src/main/resources/vance-defaults/_vance/recipes/web-research.yaml){: .btn .btn-purple .fs-3 .mr-2 }

### `wonko`
{: .d-inline-block }

engine: `wonko`
{: .label .label-blue }

**Wonko — Review Loop**

Reviews documents for sense, contradictions, gaps and vague wording —
alone, or against reference documents such as rules and regulations —
and asks the user several questions at once, each answered separately.
Remembers per subject what was answered or called "good as it is" and
decides on its own what its mandate allows. Spawn with `subject` (one or
more document paths), optionally `references` (a folder ending in "/"
or document paths) and a `mandate`.

**Tags:** `worker`, `review`, `engine-default`

[Source](https://github.com/mhus/vance/blob/main/server/vance-brain/src/main/resources/vance-defaults/_vance/recipes/wonko.yaml){: .btn .btn-purple .fs-3 .mr-2 }

### `wowbagger`
{: .d-inline-block }

engine: `wowbagger`
{: .label .label-blue }

**Wowbagger — Bulk Record Processor**

Bulk processor for large, uniform record sets (lines or JSONL in the
project workspace). A chat agent sets up the run with you — task,
source, formats, chunk size, thread count — then drives a mechanical
worker pool through it: parallel chunks on a fast worker model, each
finished chunk published as a document immediately (visible progress,
crash-safe resume), ordered result merge at the end. Pause, resume,
resize and re-run failed chunks at any point; the agent wakes up on
progress, failures and completion.

**Model:** `default:ford` (fallbacks: `default:analyze`)

**Tags:** `worker`, `engine-default`

[Source](https://github.com/mhus/vance/blob/main/server/vance-brain/src/main/resources/vance-defaults/_vance/recipes/wowbagger.yaml){: .btn .btn-purple .fs-3 .mr-2 }

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

### `benjy-architect`
{: .d-inline-block }

engine: `slartibartfast`
{: .label .label-blue }

Slartibartfast variant that generates a Benjy RECIPE (engine: benjy
— the iterative orchestration engine for small/local models) from a
free-text request. Same Slart lifecycle for the authoring part
(FRAMING → … → VALIDATING → PERSISTING); PROPOSING and VALIDATING
produce/check the Beny outer-recipe shape — the feature map
(interpret/route/check/evaluate/reflect/escalation), task types,
caps and the work target — and validate every referenced recipe
against the project's recipe inventory.

Author-only (planOnly=true): the run persists the recipe and ends at
DONE. It does NOT run the generated Benjy worker — a Benjy run is a
long-lived iterative process with its own doer spawns and controller
calls; its cost profile has no place inside an authoring run. Spawn
the persisted recipe afterwards (the DONE payload carries the path).

The architect references existing sub-recipes (doer, controller
LightLlm profiles, escalation target) by name — it does not generate
them. The bundled benjy-* profiles and doers cover the common cases;
a genuinely new doer or controller profile is authored separately.

Use this when the user wants a project-specific Benjy variant —
"pin mvn verify as the check command for a benjy coding worker",
"give me a benjy that escalates to marvin", "set up a benjy batch
worker for this cleanup list". For Marvin recipes use
marvin-architect, for plain linear pipelines plain `slartibartfast`
(vogon-strategy).

**Model:** `default:benjy-architect` (fallbacks: `default:analyze`)

**Tags:** `architect`, `benjy`, `engine-default`

[Source](https://github.com/mhus/vance/blob/main/server/vance-brain/src/main/resources/vance-defaults/_vance/recipes/benjy-architect.yaml){: .btn .btn-purple .fs-3 .mr-2 }

### `benjy-do-coding`
{: .d-inline-block }

engine: `ford`
{: .label .label-blue }

**Benjy Doer (Coding)**

Focused single-item coding worker spawned by the Benjy engine. Not
for direct spawning — Benjy drives it (one item per spawn, fresh
context every attempt).

**Model:** `default:code` (fallbacks: `default:fast`)

**Tags:** `worker`, `coding`, `benjy-doer`

[Source](https://github.com/mhus/vance/blob/main/server/vance-brain/src/main/resources/vance-defaults/_vance/recipes/benjy-do-coding.yaml){: .btn .btn-purple .fs-3 .mr-2 }

### `benjy-do-research`
{: .d-inline-block }

engine: `ford`
{: .label .label-blue }

**Benjy Doer (Research)**

Focused single-item research worker spawned by the Benjy engine.
Not for direct spawning — Benjy drives it (one item per spawn,
fresh context every attempt).

**Model:** `default:analyze` (fallbacks: `default:fast`)

**Tags:** `worker`, `research`, `benjy-doer`

[Source](https://github.com/mhus/vance/blob/main/server/vance-brain/src/main/resources/vance-defaults/_vance/recipes/benjy-do-research.yaml){: .btn .btn-purple .fs-3 .mr-2 }

### `council-bmad-build`
{: .d-inline-block }

engine: `zaphod`
{: .label .label-blue }

BMAD-METHOD-oriented council for software-build requests:
three roles from the agile team — Product Manager (What/Why),
Architect (How/Structure), Developer (Concrete Implementation).
Each role evaluates the request from its perspective; the
synthesis combines the perspectives into a coordinated build
proposal. Suited for: feature requests, architecture decisions,
story breakdowns before the actual implementation.

**Tags:** `council`, `multi-head`, `bmad`, `software-build`

[Source](https://github.com/mhus/vance/blob/main/server/vance-brain/src/main/resources/vance-defaults/_vance/recipes/council-bmad-build.yaml){: .btn .btn-purple .fs-3 .mr-2 }

### `council-member`
{: .d-inline-block }

engine: `ford`
{: .label .label-blue }

**Council Member**

Light Ford worker profile for Zaphod council heads. One
perspective per round, driven by the Zaphod engine — the
persona arrives with the steer content, not with this recipe.

**Model:** `default:fast`

**Max iterations:** 15

**Tags:** `council`, `worker`

[Source](https://github.com/mhus/vance/blob/main/server/vance-brain/src/main/resources/vance-defaults/_vance/recipes/council-member.yaml){: .btn .btn-purple .fs-3 .mr-2 }

### `council-three-perspectives`
{: .d-inline-block }

engine: `zaphod`
{: .label .label-blue }

3-person deliberation on a decision question: optimist,
skeptic, pragmatist. Each gives their perspective, then a
synthesis follows. Suited for architecture / design / strategy
questions where multiple perspectives add value.

**Tags:** `council`, `multi-head`, `decision`

[Source](https://github.com/mhus/vance/blob/main/server/vance-brain/src/main/resources/vance-defaults/_vance/recipes/council-three-perspectives.yaml){: .btn .btn-purple .fs-3 .mr-2 }

### `debate-pro-contra`
{: .d-inline-block }

engine: `zaphod`
{: .label .label-blue }

Pro/con debate on a decision question. Pro argues for the
proposal, Con against it. After each round a LightLlm check
determines whether consensus has been reached; otherwise the next
round runs (up to 3). The synthesizer summarises the final
position — explicitly distinguishing whether consensus was reached
or the heads still dissent after maxRounds. Suited for decisions
where positions can realistically shift under pressure (ship-now-
or-wait, buy-vs-build, security audit, etc.).

**Tags:** `debate`, `multi-head`, `decision`, `pro-contra`

[Source](https://github.com/mhus/vance/blob/main/server/vance-brain/src/main/resources/vance-defaults/_vance/recipes/debate-pro-contra.yaml){: .btn .btn-purple .fs-3 .mr-2 }

### `default`
{: .d-inline-block }

engine: `ford`
{: .label .label-blue }

General-purpose worker for straightforward tasks — the right choice
whenever no specialist recipe clearly fits. Creates and edits
documents directly (doc_write) — notes, mindmaps, diagrams, records,
workpages — runs tools, answers questions, and produces files. Engine
ford with validation on. Prefer this over a script-authoring
(slart-and-run) or multi-phase (slartibartfast) specialist for simple
"make / write / edit a document" requests: those are heavier and are
only warranted when the task genuinely needs custom code or a
research-and-plan pipeline.

**Model:** `default:analyze`

**Tags:** `default`, `generalist`

[Source](https://github.com/mhus/vance/blob/main/server/vance-brain/src/main/resources/vance-defaults/_vance/recipes/default.yaml){: .btn .btn-purple .fs-3 .mr-2 }

### `feeds-digest`
{: .d-inline-block }

engine: `ford`
{: .label .label-blue }

addon: `centauri`
{: .label .label-green }

**Feeds digest**

Reads a feed and posts a digest into the inbox. Meant to be triggered by a
scheduler (_vance/scheduler/*.yaml), where initialMessage names the feed
folder and the window. See manual feeds-digest.

**Model:** `default:fast`

**Max iterations:** 8

**Tags:** `feeds`, `digest`, `scheduler`

[Source](https://github.com/mhus/vance/blob/main/server/vance-addon-brain-centauri/src/main/resources/vance-defaults/_vance/recipes/feeds-digest.yaml){: .btn .btn-purple .fs-3 .mr-2 }

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

### `magrathea-architect`
{: .d-inline-block }

engine: `slartibartfast`
{: .label .label-blue }

Slartibartfast variant that generates a Magrathea WORKFLOW (a named
state-machine document under _vance/workflows/, NOT a recipe) from a
free-text request. Same Slart lifecycle for the authoring part
(FRAMING → … → VALIDATING → PERSISTING), only PROPOSING and
VALIDATING produce/check a workflow state-graph instead of a Vogon
strategy.

Author-only: the run persists the workflow directly at
_vance/workflows/<name>.yaml and ends at DONE (planOnly=true). It
does NOT run the workflow — Magrathea is a workflow-orchestration
subsystem, not an engine Slart can spawn. Start the generated
workflow afterwards with the workflow_start tool, the scheduler, or
the REST endpoint.

Use this when the user wants a reusable, branching PROCESS with
gates, timers, retries, error-handling and sub-workflows —
"build a workflow that …", "set up a state machine for …",
"automate this multi-step process with approval steps". For a
one-shot linear pipeline use plain `slartibartfast` (vogon-strategy);
for deep recursive decomposition use `marvin-architect`.

**Model:** `default:magrathea-architect` (fallbacks: `default:analyze`)

**Tags:** `architect`, `workflow`, `engine-default`

[Source](https://github.com/mhus/vance/blob/main/server/vance-brain/src/main/resources/vance-defaults/_vance/recipes/magrathea-architect.yaml){: .btn .btn-purple .fs-3 .mr-2 }

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
catalog without tool_list discovery.

**Model:** `default:python` (fallbacks: `default:code`)

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
NEW plan (Vogon plan by default) tailored to the goal. Output is a
plan document (a state machine, same grammar as a workflow), not a
final deliverable. Author-only: the plan is validated and persisted
to `_vance/workflows/<name>.yaml` and the run ends at DONE —
EXECUTION_PLANNING skips by construction (a plan is started by the
runner, not by this Slart run). Running it is a separate step: spawn a
`vogon` recipe with the plan, or `workflow_start`.

Use via `arthur_action DELEGATE preset="slartibartfast"` when a task
is substantial enough to deserve its own multi-phase plan (school
essays, multi-chapter reports, research deliverables, …) and no
pre-built recipe in the catalog fits. Slart reads the project's
kit-installed manuals as evidence, so installed skill-/genre-kits
steer the generated plan automatically.

**Model:** `default:slartibartfast` (fallbacks: `default:analyze`)

**Tags:** `architect`, `engine-default`

[Source](https://github.com/mhus/vance/blob/main/server/vance-brain/src/main/resources/vance-defaults/_vance/recipes/slartibartfast.yaml){: .btn .btn-purple .fs-3 .mr-2 }

### `trillian-head-colin`
{: .d-inline-block }

engine: `trillian-head`
{: .label .label-blue }

Conversation head — one per discussion thread. Reads contributions,
answers in the thread, hands long work to the Trillian's loop as a
task. The counterpart ends the conversation; the head archives only
when asked to, or when the conversation must close.

**Model:** `trillian-head-colin:analyze` (fallbacks: `trillian-colin:analyze`, `trillian:analyze`, `default:analyze`, `default:fast`)

**Tags:** `trillian`, `head`, `conversation`, `colin`

[Source](https://github.com/mhus/vance/blob/main/server/vance-brain/src/main/resources/vance-defaults/_vance/recipes/trillian-head-colin.yaml){: .btn .btn-purple .fs-3 .mr-2 }

### `trillian-user-adam`
{: .d-inline-block }

engine: `trillian-user`
{: .label .label-blue }

Trillian User worker-loop — Nature-A 'adam'. Picks task_request events,
spawns workers via process_spawn, observes, validates, reports
back to Control via task_complete / task_failed / task_needs_input.
Runs as _trillian-adam-XXXX in its own headless session. Its
attributes are persisted as a document and reloaded on restart.

**Model:** `trillian-adam:analyze` (fallbacks: `trillian:analyze`, `default:analyze`, `default:fast`)

**Tags:** `trillian`, `adam`, `user`, `worker`, `orchestrator`

[Source](https://github.com/mhus/vance/blob/main/server/vance-brain/src/main/resources/vance-defaults/_vance/recipes/trillian-user-adam.yaml){: .btn .btn-purple .fs-3 .mr-2 }

### `trillian-user-colin`
{: .d-inline-block }

engine: `trillian-user`
{: .label .label-blue }

Trillian User worker-loop — Nature colin. Picks task_request events,
spawns workers via process_spawn, observes, validates, reports back
to whoever asked (task_complete / task_failed / task_needs_input).
Runs as _trillian-colin-XXXX in its own headless session. Discussion
threads are not its surface — conversation heads answer those.

**Model:** `trillian-colin:analyze` (fallbacks: `trillian:analyze`, `default:analyze`, `default:fast`)

**Tags:** `trillian`, `user`, `worker`, `orchestrator`, `colin`

[Source](https://github.com/mhus/vance/blob/main/server/vance-brain/src/main/resources/vance-defaults/_vance/recipes/trillian-user-colin.yaml){: .btn .btn-purple .fs-3 .mr-2 }

### `trillian-user-operator`
{: .d-inline-block }

engine: `trillian-user`
{: .label .label-blue }

Trillian User loop — operator style. Does small cross-project document
work directly with the foreign_* tools; spawns workers for longer jobs.

**Model:** `trillian-void:analyze` (fallbacks: `trillian:analyze`, `default:analyze`, `default:fast`)

**Tags:** `trillian`, `user`, `worker`, `orchestrator`, `operator`

[Source](https://github.com/mhus/vance/blob/main/server/vance-brain/src/main/resources/vance-defaults/_vance/recipes/trillian-user-operator.yaml){: .btn .btn-purple .fs-3 .mr-2 }

### `trillian-user-void`
{: .d-inline-block }

engine: `trillian-user`
{: .label .label-blue }

Trillian User worker-loop — Nature void v2. Picks task_request events,
spawns workers via process_spawn, observes, validates, reports
back to Control via task_complete / task_failed / task_needs_input.
Runs as _trillian-void-XXXX in its own headless session.

**Model:** `trillian-void:analyze` (fallbacks: `trillian:analyze`, `default:analyze`, `default:fast`)

**Tags:** `trillian`, `user`, `worker`, `orchestrator`

[Source](https://github.com/mhus/vance/blob/main/server/vance-brain/src/main/resources/vance-defaults/_vance/recipes/trillian-user-void.yaml){: .btn .btn-purple .fs-3 .mr-2 }

### `trillian-worker-adam`
{: .d-inline-block }

engine: `trillian-worker`
{: .label .label-blue }

Trillian-User worker. Frankie loop with a hard termination contract:
call trillian_done(summary=…) when the task is finished so the
parent gets a clean DONE event. Otherwise behaves like a coding-
style worker (file_*/exec_*/doc_* via Frankie defaults).

**Model:** `trillian-adam:fast` (fallbacks: `trillian:fast`, `default:fast`, `default:analyze`)

**Tags:** `trillian`, `adam`, `worker`

[Source](https://github.com/mhus/vance/blob/main/server/vance-brain/src/main/resources/vance-defaults/_vance/recipes/trillian-worker-adam.yaml){: .btn .btn-purple .fs-3 .mr-2 }

### `trillian-worker-colin`
{: .d-inline-block }

engine: `trillian-worker`
{: .label .label-blue }

Trillian-User worker. Frankie loop with a hard termination contract:
call trillian_done(summary=…) when the task is finished so the
parent gets a clean DONE event. Otherwise behaves like a coding-
style worker (file_*/exec_*/doc_* via Frankie defaults).

**Model:** `trillian-colin:fast` (fallbacks: `trillian:fast`, `default:fast`, `default:analyze`)

**Tags:** `trillian`, `worker`

[Source](https://github.com/mhus/vance/blob/main/server/vance-brain/src/main/resources/vance-defaults/_vance/recipes/trillian-worker-colin.yaml){: .btn .btn-purple .fs-3 .mr-2 }

### `trillian-worker-void`
{: .d-inline-block }

engine: `trillian-worker`
{: .label .label-blue }

Trillian-User worker. Frankie loop with a hard termination contract:
call trillian_done(summary=…) when the task is finished so the
parent gets a clean DONE event. Otherwise behaves like a coding-
style worker (file_*/exec_*/doc_* via Frankie defaults).

**Model:** `trillian-void:fast` (fallbacks: `trillian:fast`, `default:fast`, `default:analyze`)

**Tags:** `trillian`, `worker`

[Source](https://github.com/mhus/vance/blob/main/server/vance-brain/src/main/resources/vance-defaults/_vance/recipes/trillian-worker-void.yaml){: .btn .btn-purple .fs-3 .mr-2 }

### `vogon`
{: .d-inline-block }

engine: `vogon`
{: .label .label-blue }

Runs a written plan on behalf of the person who asked for it: the plan
can put questions to them while it runs, and its result comes back into
the conversation.

Name the plan when spawning — this recipe deliberately does not pin one:

  params.workflow:     plan name, resolved through the workflow cascade
                       (_vance/workflows/<name>.yaml, project before tenant)
  params.workflowPath: a plan document at an explicit path in this project

Exactly one of the two. Everything else in params is passed to the plan
as its caller parameters.

Use this when the steps are known in advance and worth writing down —
phases with approvals, a write-review-revise loop, anything a person
should be able to read before it runs. For one question or one action
use a Ford recipe; when the structure only emerges while working, use
Marvin.

**Tags:** `plan`, `workflow`

[Source](https://github.com/mhus/vance/blob/main/server/vance-brain/src/main/resources/vance-defaults/_vance/recipes/vogon.yaml){: .btn .btn-purple .fs-3 .mr-2 }

### `vogon-architect`
{: .d-inline-block }

engine: `slartibartfast`
{: .label .label-blue }

Author a Vogon plan — a state-machine document a person starts and
waits on (worker produces, another scores, loops until good enough,
can ask questions at gates) — from a free-text request. Base the
plan on an existing one by naming it and pasting its YAML into the
request. Author-only: the plan is validated against the one plan
grammar, persisted to _vance/workflows/<name>.yaml, and the run ends
at DONE — it is never started by this run. Spawn it by name; use the
`slartibartfast` preset for the keyword-routed DELEGATE path, and
`magrathea-architect` when nobody is waiting (automation flavour).

**Model:** `default:slartibartfast` (fallbacks: `default:analyze`)

**Tags:** `architect`, `plan-author`

[Source](https://github.com/mhus/vance/blob/main/server/vance-brain/src/main/resources/vance-defaults/_vance/recipes/vogon-architect.yaml){: .btn .btn-purple .fs-3 .mr-2 }

### `waterfall-feature`
{: .d-inline-block }

engine: `vogon`
{: .label .label-blue }

Vogon-driven sequential plan: planning → implementation → review,
with the person asked to approve in between and a scored review that
can send the work back. Use this when a request genuinely needs
phased execution with checkpoints, not when a single Marvin/Ford
worker would suffice.

**Tags:** `plan`, `waterfall`, `feature`

[Source](https://github.com/mhus/vance/blob/main/server/vance-brain/src/main/resources/vance-defaults/_vance/recipes/waterfall-feature.yaml){: .btn .btn-purple .fs-3 .mr-2 }

### `zaphod`
{: .d-inline-block }

engine: `zaphod`
{: .label .label-blue }

Zaphod engine default — deliberately minimal. Explicitly requires
pattern + heads via params. Catch-all for engine-direct spawns
(tests). For real use cases, choose the specific council recipe
(e.g. council-three-perspectives).

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

### `zem`
{: .d-inline-block }

engine: `zem`
{: .label .label-blue }

Single-shot decision engine (System One). Caller provides `state`
(string, object or list) plus either a `profile` (name of an
`engine: zem` recipe) or inline `questions` (noul / choice / score),
optionally `model` and `stateSelect`. Zem answers with calibrated
probabilities instead of text, writes `{success, data}` (or
`{success: false, error, message, retryable}`) as the final assistant
message, then closes with CloseReason.DONE. Use it for classifying,
routing, yes/no gates and ratings — never for prose.

**Tags:** `decision`, `engine-default`

[Source](https://github.com/mhus/vance/blob/main/server/vance-brain/src/main/resources/vance-defaults/_vance/recipes/zem.yaml){: .btn .btn-purple .fs-3 .mr-2 }

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

Output: ONE JSON object, no markdown fences, no prose around it.

**Model:** `default:fast` (fallbacks: `default:analyze`)

**Tags:** `internal`, `action-loop-judge`

[Source](https://github.com/mhus/vance/blob/main/server/vance-brain/src/main/resources/vance-defaults/_vance/recipes/action-loop-judge.yaml){: .btn .btn-purple .fs-3 .mr-2 }

### `audio-title`
{: .d-inline-block }

engine: `jeltz`
{: .label .label-blue }

Internal config profile for the LightLlmService consumed by
HotblackService. Used to generate a short human-readable title +
ASCII slug from a speech / music prompt — the title lands in
DocumentDocument.title (UI), the slug becomes the file-name fragment
(audio/<uuid>-<slug>.mp3).

NOT spawnable — marked `internal: true` so the standard recipe
selector skips it. Single Pebble variable: `prompt` (the text to
speak or the music prompt).

**Model:** `default:fast`

**Tags:** `internal`

[Source](https://github.com/mhus/vance/blob/main/server/vance-brain/src/main/resources/vance-defaults/_vance/recipes/audio-title.yaml){: .btn .btn-purple .fs-3 .mr-2 }

### `benjy-evaluate`
{: .d-inline-block }

engine: `jeltz`
{: .label .label-blue }

Internal config profile for Benjy's per-item evaluate call
(LightLlm, not spawnable): worker result vs acceptance criteria.

**Model:** `default:analyze` (fallbacks: `default:fast`)

**Tags:** `internal`, `benjy`

[Source](https://github.com/mhus/vance/blob/main/server/vance-brain/src/main/resources/vance-defaults/_vance/recipes/benjy-evaluate.yaml){: .btn .btn-purple .fs-3 .mr-2 }

### `benjy-interpret`
{: .d-inline-block }

engine: `jeltz`
{: .label .label-blue }

Internal config profile for Benjy's interpret call (LightLlm,
not spawnable): goal → interpreted goal, task type, acceptance
criteria, first items. Called once per task.

**Model:** `default:analyze` (fallbacks: `default:fast`)

**Tags:** `internal`, `benjy`

[Source](https://github.com/mhus/vance/blob/main/server/vance-brain/src/main/resources/vance-defaults/_vance/recipes/benjy-interpret.yaml){: .btn .btn-purple .fs-3 .mr-2 }

### `benjy-reflect`
{: .d-inline-block }

engine: `jeltz`
{: .label .label-blue }

Internal config profile for Benjy's reflect gate (LightLlm,
not spawnable): terminal goal-level check before DONE.

**Model:** `default:analyze` (fallbacks: `default:fast`)

**Tags:** `internal`, `benjy`

[Source](https://github.com/mhus/vance/blob/main/server/vance-brain/src/main/resources/vance-defaults/_vance/recipes/benjy-reflect.yaml){: .btn .btn-purple .fs-3 .mr-2 }

### `benjy-route`
{: .d-inline-block }

engine: `jeltz`
{: .label .label-blue }

Internal config profile for Benjy's route call (LightLlm, not
spawnable): decides the next queue operation at branch points.
The high-frequency controller call — smallest model of the chain.

**Model:** `default:fast`

**Tags:** `internal`, `benjy`

[Source](https://github.com/mhus/vance/blob/main/server/vance-brain/src/main/resources/vance-defaults/_vance/recipes/benjy-route.yaml){: .btn .btn-purple .fs-3 .mr-2 }

### `command-safety`
{: .d-inline-block }

engine: `zem`
{: .label .label-blue }

Zem decision profile (internal): judges whether an engine command
deletes, overwrites or exfiltrates data, or changes permissions.
State: the command name and its arguments.

**Model:** `openrouter:typesafe/jev-1.13`

**Tags:** `internal`, `zem`

[Source](https://github.com/mhus/vance/blob/main/server/vance-brain/src/main/resources/vance-defaults/_vance/recipes/command-safety.yaml){: .btn .btn-purple .fs-3 .mr-2 }

### `completion-guard`
{: .d-inline-block }

engine: `jeltz`
{: .label .label-blue }

Internal config profile for the CompletionGuardService judge. NOT
spawnable — marked `internal: true` so the standard recipe selector
skips it. Renders a user-defined guard condition against the work a
process just finished and answers whether the guard should fire.

**Model:** `default:fast`

**Tags:** `internal`, `guard`

[Source](https://github.com/mhus/vance/blob/main/server/vance-brain/src/main/resources/vance-defaults/_vance/recipes/completion-guard.yaml){: .btn .btn-purple .fs-3 .mr-2 }

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
selector skips it. Called only when BOTH gates hold: the PARENT
engine relays the child output verbatim to a human
(`relaysChildOutputVerbatim() == true` — Arthur's RELAY, Eddie's
RELAY/RELAY_INBOX) AND the child engine returns
`producesUserFacingOutput() == false` AND the lifecycle event is
DONE or FAILED. Composing parents (LLM agents like Hactar's
session identity, Ford workers, orchestrators) get the RAW machine
summary — this lossy fast-tier rewrite must not misstate machine
facts to a consumer that acts on them.

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

### `finance-report`
{: .d-inline-block }

engine: `jeltz`
{: .label .label-blue }

addon: `finance`
{: .label .label-green }

Internal config profile for the LightLlmService consumed by the finance
`assessment` report processor (AssessmentReportProcessor). NOT spawnable —
marked `internal: true` so the standard recipe selector skips it. The
processor computes the current-value snapshot, lays the tree out
sign-applied (expenses already negative, one-time held separate) into the
Pebble variable `{{ model }}`, and asks for a prose assessment. No time
range — this is an opinion on the current model.

**Model:** `default:finance-report` (fallbacks: `default:analyze`)

**Tags:** `internal`, `finance`

[Source](https://github.com/mhus/vance/blob/main/server/vance-addon-brain-finance/src/main/resources/vance-defaults/_vance/recipes/finance-report.yaml){: .btn .btn-purple .fs-3 .mr-2 }

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
  absent. The user is looking at a recent conversation transcript
  and wants suggestions for how to react — a follow-up question, a
  clarification, an acknowledgement, or a natural next message.

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

### `fook-session-analysis`
{: .d-inline-block }

engine: `jeltz`
{: .label .label-blue }

Internal config profile for the LightLlmService-driven ReAct loop in
FookSessionAnalysisService (second stage of the bug/feature ticket
system). NOT spawnable — marked `internal: true` so the standard
recipe selector skips it.

When Fook's triage decides a `new_ticket` and flags
`needSessionReport`, Fook analyses the reporter's session and attaches
the result to the ticket. The fixer (Lunkwill) has NO access to the
original session — this report is the only bridge.

This recipe is the PER-TURN prompt of an agentic loop. The session can
be far larger than a context window, so the model does NOT receive the
whole transcript — it works over it with tools (overview/search/grep/
read) and Fook feeds back each observation. One LLM call = one action.

Inputs (Pebble variables):
  {{ ticketTitle }} / {{ ticketType }} — the derived ticket header
  {{ reason }} / {{ triageNote }}       — Fook's triage rationale
  {{ engine }} / {{ recipe }}           — what was running
  {{ stepsLeft }}                       — remaining loop turns
  {{ observations }}                    — tool results so far

See `planning/fook-session-report.md`.

**Model:** `default:analyze`

**Tags:** `internal`, `fook`, `analysis`

[Source](https://github.com/mhus/vance/blob/main/server/vance-brain/src/main/resources/vance-defaults/_vance/recipes/fook-session-analysis.yaml){: .btn .btn-purple .fs-3 .mr-2 }

### `form-judge`
{: .d-inline-block }

engine: `jeltz`
{: .label .label-blue }

addon: `workbook`
{: .label .label-green }

Internal LightLlmService config profile used by FormResolveActionHandler
to grade free-text `vance-field` answers (type text/textarea with a
`judge` fence config). NOT spawnable — marked `internal: true` so the
standard recipe selector skips it.

The handler builds the user prompt: the question, the field's
`solution` (a reference answer, when present), the `judge.criteria`
(what a correct answer must contain) and the student's answer.

Pebble variables: none — everything arrives in the user prompt.

Output: ONE JSON object, no markdown fences, no prose around it:

    { "verdict": "correct" | "wrong", "feedback": "<text>" }

**Model:** `default:fast`

**Tags:** `internal`, `form-judge`

[Source](https://github.com/mhus/vance/blob/main/server/vance-addon-brain-workbook/src/main/resources/vance-defaults/_vance/recipes/form-judge.yaml){: .btn .btn-purple .fs-3 .mr-2 }

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

### `nutrimat-critic-affogato`
{: .d-inline-block }

engine: `jeltz`
{: .label .label-blue }

addon: `nutrimat`
{: .label .label-green }

Internal LightLlmService config profile used by the Nutrimat loop
nature `affogato` at every stop: a critic attacks the loop's draft
answer, with the tool work in view, and either accepts it or sends it
back with a critique.

NOT spawnable — marked `internal: true` so the standard recipe
selector skips it.

Pebble variables:
  userGoal   — the user's most recent message in this turn
  draftText  — the draft answer the loop stopped with
  toolTrace  — the turn's tool calls with their (cut) results

Output: ONE JSON object, no markdown fences, no prose around it.

**Model:** `default:fast` (fallbacks: `default:analyze`)

**Tags:** `internal`, `nutrimat-judge`

[Source](https://github.com/mhus/vance/blob/main/server/vance-addon-brain-nutrimat/src/main/resources/vance-defaults/_vance/recipes/nutrimat-critic-affogato.yaml){: .btn .btn-purple .fs-3 .mr-2 }

### `nutrimat-judge-clubmate`
{: .d-inline-block }

engine: `jeltz`
{: .label .label-blue }

addon: `nutrimat`
{: .label .label-green }

Internal LightLlmService config profile used by the Nutrimat loop
nature `clubmate` when its iteration budget is exhausted. The judge
decides whether to extend the loop (grant a fresh budget) or to
synthesize an answer from what has already been gathered.

NOT spawnable — marked `internal: true` so the standard recipe
selector skips it.

Pebble variables:
  userGoal       — the user's most recent message in this turn
  gatheredText   — best free text the loop emitted across the turn
  iterations     — how many iterations have been consumed so far

Output: ONE JSON object, no markdown fences, no prose around it.

**Model:** `default:fast` (fallbacks: `default:analyze`)

**Tags:** `internal`

[Source](https://github.com/mhus/vance/blob/main/server/vance-addon-brain-nutrimat/src/main/resources/vance-defaults/_vance/recipes/nutrimat-judge-clubmate.yaml){: .btn .btn-purple .fs-3 .mr-2 }

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

### `research-synthesize`
{: .d-inline-block }

engine: `jeltz`
{: .label .label-blue }

Internal config profile for the LightLlmService consumed by
ResearchDocumentService (backend of the `research_document` tool). NOT
spawnable — marked `internal: true` so the standard recipe selector skips
it. The service runs the curated research pass first, then hands the ranked
sources to this recipe to synthesize a full Markdown document in one
single-shot call (no process spawn). Model alias, fallback list, max-attempts
budget and promptPrefix are read from here.

**Model:** `default:research-synthesize` (fallbacks: `default:analyze`)

**Tags:** `internal`, `research`

[Source](https://github.com/mhus/vance/blob/main/server/vance-brain/src/main/resources/vance-defaults/_vance/recipes/research-synthesize.yaml){: .btn .btn-purple .fs-3 .mr-2 }

### `scribble-ocr`
{: .d-inline-block }

engine: `jeltz`
{: .label .label-blue }

addon: `scribble`
{: .label .label-green }

Internal LightLlmService config profile used by the scribble addon's
OCR path (ScribbleOcrService): transcribing a rendered handwriting
sheet to Markdown. The caller attaches the sheet PNG as an image
block — the recipe's model MUST be VISION-capable, the service
fails fast otherwise. Point params.model at a vision model per
tenant/project if the default is not one.

NOT spawnable — marked `internal: true` so the standard recipe
selector skips it.

Pebble variables:
  sheetTitle — display title of the transcribed sheet

Output: Markdown transcription of the handwriting, nothing else.

**Model:** `default:analyze`

**Tags:** `internal`, `scribble-ocr`

[Source](https://github.com/mhus/vance/blob/main/server/vance-addon-brain-scribble/src/main/resources/vance-defaults/_vance/recipes/scribble-ocr.yaml){: .btn .btn-purple .fs-3 .mr-2 }

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

### `translate`
{: .d-inline-block }

engine: `jeltz`
{: .label .label-blue }

Internal LightLlmService config profile for translating a text or
Markdown document — the backend of the Cortex "Translate…" menu
entry. Single shot: the whole text goes in, the whole translation
comes back, nothing is spawned.

NOT spawnable — `internal: true`, so the standard recipe selector
skips it. Additionally `web: true`, because it is called straight
from the browser through POST /brain/{tenant}/light-llm/{project};
that flag is what releases a recipe for web callers and its default
is no.

Pebble variables:
  language    — the target language, as the user picked it. Either
                a name ("Deutsch", "Brazilian Portuguese") or a
                BCP-47 code ("de", "pt-BR"). Free-form on purpose:
                the user may also ask for "Simplified Chinese" or
                "plain English".
  sourceName  — optional, the source document's file name. Only used
                to help the model recognise the format; never echoed.

Output: the translated text and nothing else — no preamble, no
wrapping code fence, no closing remark. It is written verbatim into
a new document (or handed to the reader's clipboard), so any word
the model adds about its own work ends up in the file.

KNOWN LIMIT: one call translates as much as the model is willing to
emit. A long document comes back silently truncated. The caller caps
the input length and warns when the result is much shorter than the
source; chunking is not implemented.

**Model:** `default:analyze` (fallbacks: `default:fast`)

**Tags:** `internal`, `translate`

[Source](https://github.com/mhus/vance/blob/main/server/vance-brain/src/main/resources/vance-defaults/_vance/recipes/translate.yaml){: .btn .btn-purple .fs-3 .mr-2 }

### `trillian-adam-reflect`
{: .d-inline-block }

engine: `jeltz`
{: .label .label-blue }

Internal config profile for the reflexion pass of Trillian Nature-A
'adam'. Turns one concluded task into at most one journal line, or
into nothing when there is nothing worth keeping.

**Model:** `default:fast`

**Tags:** `trillian`, `adam`, `internal`

[Source](https://github.com/mhus/vance/blob/main/server/vance-brain/src/main/resources/vance-defaults/_vance/recipes/trillian-adam-reflect.yaml){: .btn .btn-purple .fs-3 .mr-2 }

### `vogon-intake`
{: .d-inline-block }

engine: `jeltz`
{: .label .label-blue }

Reads a spoken request into the parameters a plan declared. Used by the
Vogon engine before a run starts; not meant to be spawned directly.

**Model:** `default:fast`

**Tags:** `internal`, `vogon`

[Source](https://github.com/mhus/vance/blob/main/server/vance-brain/src/main/resources/vance-defaults/_vance/recipes/vogon-intake.yaml){: .btn .btn-purple .fs-3 .mr-2 }

### `wonko-check`
{: .d-inline-block }

engine: `jeltz`
{: .label .label-blue }

Internal config profile for Wonko's check call (LightLlm, not
spawnable): reviews the subject against the register and reports
findings worth clarifying. Called once per round.

**Model:** `default:analyze` (fallbacks: `default:fast`)

**Tags:** `internal`, `wonko`

[Source](https://github.com/mhus/vance/blob/main/server/vance-brain/src/main/resources/vance-defaults/_vance/recipes/wonko-check.yaml){: .btn .btn-purple .fs-3 .mr-2 }

### `wonko-compare`
{: .d-inline-block }

engine: `jeltz`
{: .label .label-blue }

Internal config profile for Wonko (LightLlm, not spawnable): judges one
claim against each of its reference passages — contradicts, satisfies,
not applicable, or cannot be determined — with a reason and a verbatim
quote as evidence.

**Model:** `default:fast` (fallbacks: `default:analyze`)

**Tags:** `internal`, `wonko`

[Source](https://github.com/mhus/vance/blob/main/server/vance-brain/src/main/resources/vance-defaults/_vance/recipes/wonko-compare.yaml){: .btn .btn-purple .fs-3 .mr-2 }

### `wonko-coverage`
{: .d-inline-block }

engine: `jeltz`
{: .label .label-blue }

Internal config profile for Wonko (LightLlm, not spawnable): finds the
obligations of one reference document that apply to the subject but are
not addressed by it — each with a verbatim quote as evidence.

**Model:** `default:analyze` (fallbacks: `default:fast`)

**Tags:** `internal`, `wonko`

[Source](https://github.com/mhus/vance/blob/main/server/vance-brain/src/main/resources/vance-defaults/_vance/recipes/wonko-coverage.yaml){: .btn .btn-purple .fs-3 .mr-2 }

### `wonko-decompose`
{: .d-inline-block }

engine: `jeltz`
{: .label .label-blue }

Internal config profile for Wonko (LightLlm, not spawnable): splits the
subject into checkable claims, each with search terms for finding the
reference passages that apply to it.

**Model:** `default:analyze` (fallbacks: `default:fast`)

**Tags:** `internal`, `wonko`

[Source](https://github.com/mhus/vance/blob/main/server/vance-brain/src/main/resources/vance-defaults/_vance/recipes/wonko-decompose.yaml){: .btn .btn-purple .fs-3 .mr-2 }

### `wonko-interpret`
{: .d-inline-block }

engine: `jeltz`
{: .label .label-blue }

Internal config profile for Wonko (LightLlm, not spawnable): maps a
free-text reply of the user onto the open questions of a question set.

**Model:** `default:fast` (fallbacks: `default:analyze`)

**Tags:** `internal`, `wonko`

[Source](https://github.com/mhus/vance/blob/main/server/vance-brain/src/main/resources/vance-defaults/_vance/recipes/wonko-interpret.yaml){: .btn .btn-purple .fs-3 .mr-2 }

### `wonko-locate`
{: .d-inline-block }

engine: `jeltz`
{: .label .label-blue }

Internal config profile for Wonko (LightLlm, not spawnable): selects,
from candidate reference passages found by a text search, the ones that
actually apply to one claim, and names cross-references worth following.

**Model:** `default:fast` (fallbacks: `default:analyze`)

**Tags:** `internal`, `wonko`

[Source](https://github.com/mhus/vance/blob/main/server/vance-brain/src/main/resources/vance-defaults/_vance/recipes/wonko-locate.yaml){: .btn .btn-purple .fs-3 .mr-2 }

### `wonko-route`
{: .d-inline-block }

engine: `jeltz`
{: .label .label-blue }

Internal config profile for Wonko (LightLlm, not spawnable): decides
whether a free chat message asks for a new review run, brings new
information for the review, or is a question that wants an answer.

**Model:** `default:fast` (fallbacks: `default:analyze`)

**Tags:** `internal`, `wonko`

[Source](https://github.com/mhus/vance/blob/main/server/vance-brain/src/main/resources/vance-defaults/_vance/recipes/wonko-route.yaml){: .btn .btn-purple .fs-3 .mr-2 }

### `wowbagger-script-worker`
{: .d-inline-block }

engine: `hactar`
{: .label .label-blue }

Internal profile for Wowbagger script workers (never spawned): one
script run per chunk — records in, one result per record out.

**Tags:** `internal`, `wowbagger`

[Source](https://github.com/mhus/vance/blob/main/server/vance-brain/src/main/resources/vance-defaults/_vance/recipes/wowbagger-script-worker.yaml){: .btn .btn-purple .fs-3 .mr-2 }

### `wowbagger-worker`
{: .d-inline-block }

engine: `jeltz`
{: .label .label-blue }

Internal config profile for Wowbagger worker calls (LightLlm, not
spawnable): per-run task + chunk records in, one output line per
record out. Pinned to the fast tier — bulk throughput is the point.

**Model:** `default:fast`

**Tags:** `internal`, `wowbagger`

[Source](https://github.com/mhus/vance/blob/main/server/vance-brain/src/main/resources/vance-defaults/_vance/recipes/wowbagger-worker.yaml){: .btn .btn-purple .fs-3 .mr-2 }

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
