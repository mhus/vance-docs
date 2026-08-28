# Trillian Nature-A — `adam`

> The first Nature with its own behavior. What is written here is adam's
> concern; the framework it sits on is described in
> `specification/public/trillian-engine.md`.

## 1. What adam is

Nature `void` proves the architecture and does nothing else: two Sessions,
a Service Account, attributes in `engineParams` that die with the
Process lines. adam is the first Nature that makes someone out of this.

Three things distinguish him, and they are related:

- He **is someone** — name, gender, a trait of temperament, assigned
  upon creation (§2).
- His attributes **survive** the Process lines, as a document that
  a human can read and modify (§3).
- He **learns** from completed tasks, into a journal that he reads
  again in the next prompt (§4).

The order is not arbitrary: no journal without a persistent location, no
learning without a journal. What is still pending — typed personality,
mode switch, token budget — will use the same hooks and the same
documents.

**Class structure.** `TrillianNatureAdam extends TrillianNatureBase`,
**not** `TrillianNatureVoid`. Nature `void` is currently exactly the base and
nothing more, which makes derivation tempting; however, it would combine
"what every Trillian does" and "what Generation 0 does" into one class,
and the first `void`-Nature-specific change would silently end up in adam.

**Recipes.** `trillian-adam` (Control, `listed: true` — adam is a
conscious choice, not a default), `trillian-user-adam` (Loop),
`trillian-worker-adam` (Per-Task-Worker), `trillian-adam-reflect`
(internal LightLlm profile for §4). The first three are derived by the
Bootstrap from the Nature ID; no one types them.

**Account.** `_trillian-adam-<instance>` — the ID is included as its own
name part, see Engine Spec §2.

## 2. Character upon Creation

A newly minted adam receives three pre-assigned attributes during the
first bootstrap: `name` (first name from a curated A-list — A because the
Nature is called adam, which makes the origin readable without lookup),
`gender`, and `character` (a line of temperament, formulated as a
working style, not as a feeling — a trait that cannot be acted upon is
decoration and costs prompt on every turn).

**The pools are a document, not a constant.**
`_vance/trillian/adam-characters.yaml`, read via the usual Cascade —
Project, then `_tenant`, then the bundled copy in the Classpath. A Tenant
who wants German names, or a test project with intentionally silly ones,
replaces a file; Java remains untouched. The same reasoning applies to why
Recipes, Prompts, and Manuals are documents.

No cache: it is read once per minted Trillian, which is rare enough that
the lookup costs nothing — and a change takes effect with the next
Trillian instead of the next restart. A defective override is treated as
absent (WARN, bundled fallback); a Trillian with a boring name is better
than one that cannot be created.

**Gender is in the list; it is not derived.** Andrea is female in German
and male in Italian, Alex is both; a derivation guesses, and guessing here
is a small avoidable offense.

The character is written **immediately into the attribute store** upon
generation — otherwise, the account would get a different name on the next
boot, and an identity that is re-rolled on restart is not an identity. It
ends up as ordinary attributes: `//trillian attr set name …` changes it,
like any other attribute. A generated character is a starting value, not a
fact about the Trillian.

The given name is handled by the Nature: `TrillianNature.callName(attributes)`
defaults to `"Trillian"` — correct for any Nature that does not name its
instances — and adam returns the `name` attribute. This way, the bootstrap
message in the Control chat greets with "Ada is ready..." instead of a
class name, and a `//trillian attr set name` takes effect there without a
second location needing to know about it. The account name is still in the
same message — it is what an operator needs to grant the worker access to
another project.

The `name` is also set as `UserDocument.title` during **minting**, so that
the UI shows "Ada" instead of "Trillian adam-4711". Only during minting:
after that, the title belongs to the human, and overwriting it on every
bootstrap would undo a renaming. Names are not unique — two Adas in a
project are possible and harmless, because all technical aspects depend on
the account name.

## 3. Persistent Attributes

Under Nature `void`, an attribute lives only as long as the Process lines.
It is only carried over via an Archive/Reactivate because code specifically
written for it passes it on: `TrillianSessionLifecycleHook` parks the map
of the outgoing worker on the closed Control Process, and the next
Bootstrap reads it there. This is viable for exactly this one transition —
not as a general answer. The human sees the value nowhere, cannot edit it,
and every further lifetime transition would require its own carrying code.

**`adam` instead stores the map as a document:**
`_vance/trillian/<account>.yaml`, in the pair's project.

- **The key is the account name** — the only identifier that survives
  Archive and Reactivate unchanged.
- **The location is the project** where the account already holds its
  grant: whoever is allowed to read the Trillian's work is also allowed
  to read what it was instructed to be.
- **It is a document**, thus visible in Cortex and manually editable. A
  YAML header in the file explains itself; if edited incorrectly, it is
  treated as absent (WARN, Trillian starts without attributes — not fails
  to start at all).

**No second Source-of-Truth.** At runtime, only `engineParams` continues
to be read. The document is written after *every* change and read *once*
when a worker starts without passed attributes. If the prompt were to read
from the document per turn, two copies would be in play.

Two hooks on `TrillianNature`, both default no-op — Nature `void` thus
remains ephemerally unchanged:

| Hook | Who calls | Purpose |
|---|---|---|
| `initialAttributes(tenant, project, account)` | `TrillianSessionBootstrapper`, if nothing was passed | Seed for a fresh worker loop |
| `attributesChanged(worker, attributes)` | `TrillianInternalApi` after each mutation | Write mirror |
| `attributesDiscarded(tenant, project, account)` | `TrillianSessionLifecycleHook`, directly before account deletion | Release stored data |

The document dies with the **Account**, not with the Session: it is named
after it, accounts are never renamed, and a new Trillian gets a new name —
leftovers would be unreadable and unreachable at the same time. Therefore,
nothing happens during archiving (a Trillian that returns with an empty
file has not returned); deletion occurs at the same place where grants and
accounts are dropped.

`attributesChanged` is deliberately tied to the **mutation funnel** in
`TrillianInternalApi`, not to the tools: `user_attr_set` and
`//trillian attr set` share this API, and a Nature that only learned from
one of the two would be worse than one that learned from neither. Both
hooks swallow errors — the authoritative write to `engineParams` has
already happened at this point, persistence is no reason to let it fail.

What `adam` **does not yet** do: its own home project, reflection after
task completion, typed personality. The document is the prerequisite for
this — a Nature that reflects needs a persistent place for its result.

## 4. Reflection after Task Completion

Built 2026-08-13. The starting point is
`TrillianInternalApi.dispatchTaskEvent(...)` — the only funnel for
`task_request` / `task_done` / `task_failed` / `task_needs_input`. The
hook `TrillianNature.taskConcluded(worker, taskId, outcome, summary)`
fires **only** for the two conclusions: a posed task or a query is not
something to reflect upon.

It fires **after** the dispatch. The human hearing the result is the
purpose of the call and must neither wait for it nor lose it; if the
dispatch fails, the Nature learns nothing (otherwise, the journal would
contain a result that never arrived).

**adam** calls `LightLlmService` with the Recipe `trillian-adam-reflect`
(`internal: true`, `default:fast`, Jeltz schema loop) and passes Task ID,
outcome, result, and the current journal tail. The model responds
`{keep, entry}`; only if `keep` is true, **one** Markdown line is appended
to `_vance/trillian/<account>.journal.md`. The prompt explicitly states
that silence is the normal case — a journal of "Task X completed" lines
costs context on every subsequent turn and teaches nothing.

**Failures also** are reflected. That is where the benefit lies; a
Trillian that only reviews its successes learns nothing.

**Journal ≠ Attributes.** Both are per-account documents in the same
folder but have different owners: attributes are what a human has
configured, the journal is what the Trillian has concluded about its own
work. A shared file would allow the agent to write in what belongs to the
human and would create a race between manual editing and the next
reflection. The journal is **append-only**: a Trillian that is allowed to
rewrite its history can delete exactly the entry that would have prevented
it from repeating a mistake.

**Return path to the Prompt:** adam overrides `userPromptAddendum` —
attributes (from the base) plus a block "What you learned earlier," capped
at `PROMPT_BUDGET_CHARS` (4,000) and cut at an entry boundary. Without this
path, reflection would be writing without a reader.

Fail-open throughout: a reflection call that fails, hangs, or yields
nothing leaves a Trillian that has learned nothing from that task — never
one whose result is missing.

Cost: a small LLM call per completed task, synchronous in the reporting
tool call.

**Open: correcting incorrect entries.** A journal entry can be factually
incorrect — during the first live `keep: true`, the note named an incorrect
cause (WRITER right instead of document lock) because the example in the
prompt was copied. The example is now a placeholder, but incorrect
conclusions remain possible, and from that moment on, the note guides every
subsequent turn.

Today, **only the human** can fix this: the journal is a document, so
delete the line in Cortex. adam has no tool for this, and pointing it out
achieves nothing.

The intended way is **correction by appending**, not by deleting — an
entry of the form "correction: the earlier note on X was wrong, the cause
was Y". This preserves what append-only is for: an agent who is allowed to
strike will eventually strike the inconvenient entry, and no one will see
it. An agent who corrects leaves both, and the correction itself is
information. Necessary for this: a convention "later correction overrides
earlier note" in the prompt and, if the file hits the budget, a
compaction. Neither is built yet.

## 5. Worker Episodes and Continuity

adam is designed as a **User**, and this determines where memory resides.
A human does not get a new memory per task — but when they start a task,
they redo the work themselves: they reopen the files. What they bring is
knowledge, not the state of the last session.

This results in three layers that were previously mixed:

| Layer | Where it lives | Example |
|---|---|---|
| **Persistent knowledge** about the project | Journal (§4) | "reports/ is locked for AI" |
| **Working memory** of the session | Loop transcript + Compaction | "The inventory is in reports/inventory.md, eight documents" |
| **Focus** on a task | Worker episode | one assignment, one result, end |

Continuity therefore belongs in the **Loop**, not in the Worker. A
topic-sticky worker that lives across multiple tasks would place memory in
the episode instead of the persona — and carry failure from task A into
task B, which models anchor on. Therefore, it remains **one worker per
assignment**.

Two consequences are built from this:

**The Loop provides what it knows.** Before spawning, the assignment text
should include what is already established — where something is located,
how the project is structured, what a previous worker found, what is
blocked. Otherwise, the worker spends its first turns rediscovering. Facts,
not impressions: what has been determined is passed on, not the conclusion
drawn from it.

**A query does not end an episode.** A worker who needed to know something
called `trillian_done` and was done; the Loop reported `task_needs_input`,
and the answer created a **new**, cold worker who repeated everything. An
interrupted human also does not start from scratch.

The first attempt was a prompt instruction: *ask as plain text and do not
call a tool* — a Natural Stop parks the process, a terminating tool closes
it. In the first live run, the worker still asked its question via
`trillian_done` and terminated itself; the answer could never reach it, its
preliminary work was gone.

**This was not disobedience.** In a tool-calling loop, "end the turn by
calling nothing" competes with every tool on the list and loses. The model
took the only tool with the form "return something" and wrote its question
into a field called `summary`. The same reasoning applies to Arthur's
structured actions: text and a completion tool are two slots that interfere
with each other.

**Questions therefore get their own tool.** `trillian_ask` provides
Frankie's `_terminate` like `trillian_done` — the loop ends in both cases
— but the **consequence** differs: `TrillianWorkerEngine` (a derivation of
Frankie) parks the worker on IDLE instead of closing it. It retains its
context, `process_steer` carries the answer into it, and it continues where
it left off. It is only respawned if it is gone or CLOSED.

**Frankie itself remains unchanged.** It exposes exactly one seam —
`onWorkerTerminate` — which states what a termination means for a worker;
Frankie's answer to this is still "close". The protocol, the loop, the
tools, the wallclock network still belong to it. The model's choice is thus
between two named tools instead of between a tool and an omission.

**Deliberately not built:** topic-sticky workers with TTL. They would
require a topic identifier, an expiration rule, and an answer to context
bleed, and the decision "same topic?" would be made by a model per task.
Before building, two numbers would need to be measured: how often a task
follows the same topic, and what percentage of worker turns is
rediscovery (`tool_usage_stats` per Recipe). If the first is below one
third, the mechanism is expensive for a edge case.

## 6. Worker Time Limit

`trillian-worker-adam` sets `params.maxWallclockMinutes: 20`, thereby
narrowing Frankie's global 60 minutes. A Trillian task is a limited errand
— list, read, write, report; twenty minutes in **one** uninterrupted turn
means it's spinning, not working. Exceeding this sets `BLOCKED`, which the
Loop reads as a terminal event and can pass to Control — so it doesn't
hang, it gets a rejection.

The budget applies **per turn**, not per process lifetime. A worker
waiting for an answer (§5) burns nothing and starts with a full budget
after `process_steer`. Without this interpretation, the time limit and
query pause would have canceled each other out.

## 7. Self-Check: The Wake-Up Call

A Trillian that only reacts is a mailbox with an opinion. To notice what
no one pushes to it — a worker waiting for an unanswered question, a
promise it made — it wakes itself up.

**Only in silence.** As long as it is working, nothing is armed: a running
per-task worker reports itself, and a timer next to it would be a second
alarm for the same appointment. The clock therefore measures **silence**,
not time since the last turn — a busy Trillian is never woken by it.

**Unless silence is the problem.** A worker waiting IDLE for a question is
exactly the case that never generates an event. That is not "in transit,"
that is hanging, and it is the primary reason why a wake-up call is
worthwhile.

**Cadence** 10 → 20 → 40 → 60 minutes, at night (8 PM–8 AM) at least 120,
reset to the first stage as soon as something real happens. Otherwise, a
Trillian that has slipped to the two-hour stage over a quiet night would
remain there through the next busy afternoon.

**Exact times don't matter**, and this tolerance is why the whole thing
consists of a query and manages without scheduler state:
`TrillianHeartbeatTick` scans at a rough pace, never catches up on missed
rounds, and allows for drift. The due date is in `engineParamOverrides` on
the Loop process — so a Brain restart resumes the schedule instead of
forgetting it.

**One Pod per Project.** The tick runs on every Pod but only sees projects
from `findRunningByHomeNode(selfNode)`. This is not an optimization but a
correctness condition: three Pods waking the same Trillian give it three
turns for one appointment. **Podless Projects** (`_user_*`, System) have
no home Pod and migrate on reconnect — there, a Trillian is not even
created (`TrillianSessionBootstrapper` rejects it with WARN), instead of
minting one that would never be woken.

**Whether it is woken at all is decided by the Nature** — before each turn,
in Java. `TrillianNature.selfCheckFindings(loop)` provides what does not
resolve itself; an **empty list discards the wake-up call** and rearms.
Thus, an inactive Trillian costs one query and no tokens, and a turn only
occurs if there is something to decide. This is also why a self-standby
(self-archiving) was not built: the cost justification for it is gone.

adam derives its findings from **states**, not from notes that someone
should have written in time — from process status, and from the unread
index of its own inbox:

| Type | Location | What the Loop should do |
|---|---|---|
| `worker_waiting` | Worker IDLE after a question | follow up with Control; answer via `process_steer` into the **same** worker |
| `worker_blocked` | Safety-Net has stopped, context intact | read transcript: progress → continue, repetition → report |
| `worker_silent` | RUNNING, but 45 min without activity | report to Control instead of waiting further |
| `inbox_unread` | unread [Maximegalon](maximegalon-system.md) thread for its account | read with `thread_get`; reply, acknowledge, hand over, or unsubscribe (§7.2a) |

Nature `void` yields nothing and therefore never wakes up — correct for a
baseline that is intended to be purely reactive.

### 7.0 The Inbox is the only finding that someone *writes*

adam derives the three worker findings from process states: the worker
parks itself. A thread lands because a human or an agent put it there —
and without this finding, the Loop never notices. The only other address
is Control's chat, which is exactly the channel a human uses when they are
*sitting in front of it*; for the case that they are not, there was none.

The quantity is the same as behind the badge (`unreadFor`, not archived)
— deliberately via a method next to `countBadge`: two answers to "what is
unread for me" could diverge. It is sorted **oldest first**, unlike any
other list there: the reader is an agent processing a queue, and a queue is
processed from the front. Capped at five per round; a backlog of forty
threads is not forty reasons to wake up, but one.

### 7.1 Reported means read — and by code

**The `inbox_unread` finding is the only one whose delivery is not
bookkeeping, but the termination condition.** An unread thread remains
unread until someone marks it. A self-check that only reports it produces
the same finding in the next round, and again in the round after that — a
Trillian that is forever woken by the same message.

Therefore, `selfCheckDelivered` marks it as read **in Java**. Leaving it
to the model would be the wrong place: a forgotten tool call would then not
be a forgotten tool call, but an infinite loop.

And that is why it is in `selfCheckDelivered` and not in the collection —
for the same reason that the hook exists at all (§7): a due round that
does not result in a wake-up call must not have marked anything as read.
Otherwise, the thread would be silently swallowed, and that is the only
error case worse than repeating.

`markRead` **does not touch the status**. A decision assigned to the
Trillian remains open and continues to wait for the one who has to make it
— viewing is not answering (`maximegalon-system.md` §3a).

### 7.2 The Handle, not the Text

The finding carries handle, sender, title, and whether a reply is expected
— not the text. The listing already projects the contributions out, and an
excerpt of the excerpt would be the worst of both: long enough to cost
tokens every silent round, short enough for the Loop to reply from a
fragment. It gets the handle and reads if it concerns it.

For this, the Loop needs tools — and these are tied to the **Recipe, not
the Engine**: `trillian-user-adam.yaml` brings the `thread_*` family via
`allowedToolsAdd`, `trillian-user-void.yaml` does not. This is not
cosmetic: void never gets the `inbox_unread` finding, a manifest full of
thread tools would be a surface for void that no one told it about. For the
same reason, the prompt section "Your inbox" is in the adam Recipe as
`promptPrefix` (mode `APPEND`) and not in `trillian-user-prompt.md`.
**Rule of thumb: what follows from a Nature finding belongs in the Nature
Recipe.**

### 7.2a Control over its own Thread Life

Being woken up has a downside: whoever has `WRITE` access to this
account's Inbox can invite the Trillian to a thread, and from then on,
every contribution in it is a reason to wake up. Without an exit, an
invitation would be a one-way street. The set of tools is therefore
deliberately cut as a whole:

| Tool | Purpose | Constraint |
|---|---|---|
| `thread_get` | read the thread that the finding only names | `maySee` |
| `thread_message_add` | reply where asked | `maySee`; **does not close an Ask** |
| `thread_react` | the silent acknowledgment — "seen, nothing needed" | `maySee`; six allowed keys |
| `thread_invite` | bring in someone who is needed | `WRITE` on **their** Inbox |
| `thread_leave` | unsubscribe itself | only itself; assignee of an open Ask is rejected |
| `thread_delegate` | hand over the Ask to a human | `mayDecide` + `WRITE` on the target Inbox |

Three points on which the selection depends:

**`thread_leave` only unsubscribes oneself.** Removing *someone else* is
a different question — it decides who is in the room, requires `mayDecide`,
and belongs to the one leading the matter. The path exists via REST and is
deliberately **not** a tool: an agent throwing a human out of a discussion
with a call is not a move it should be able to make.

**`thread_delegate` had to be included.** The service rejects unsubscribing
the assignee of an open Ask and explicitly refers to delegating in the
error text. Without this tool, the Loop would run into a 409 without access
for exactly the threads that bother it most.

**`thread_react` has a whitelist of six shortcodes** (`eyes`, `thumbsup`,
`white_check_mark`, `question`, `warning`, `hourglass`) — not a style
question, but a meaning constraint: the value of a wordless signal lies in
everyone reading it the same way. A free field would allow a model to
invent a private vocabulary on the only channel without words. And then the
prompt rule, because the tool is the cheapest action in the entire
inventory: **a reaction is an acknowledgment, not a result** — it is only
the complete answer if there was nothing to do. Its utility is real: the
read status is person-specific and invisible to others; without a reaction,
the sender cannot distinguish "seen, all good" from "never arrived."

### 7.3 "You don't talk to the human" means: not in chat

The prompt rule was absolute ("You don't reply to the human") and never
was: it refers to the **chat**, and that belongs to Control. A thread is
something else — it is addressed to *this account*, awaits a written
response, and no one else can give it. A response via Control would appear
at a different location than the question was asked.

The rule is therefore rephrased instead of softened — in two parts, along
the same seam as the tools: the **Engine Prompt** now only states "no chat,
never" (applies to both Natures), the exception is in the **adam Recipe**.
A void loop thus does not read a line about threads it does not have. And
the fallback edge remains — as soon as it concerns an ongoing task or a
human decision is needed, the Loop reports to Control. A contribution in
the thread is **not a substitute** for `task_needs_input`.

This is also not a backdoor to making decisions: `thread_message_add`
**does not close an Ask** — it remains open until a human answers it, and
there is no tool that takes that burden off them (`maximegalon-system.md`,
"No reply tool"). The Loop can contribute, not determine.

Two side effects that are correct: its own contribution makes the thread
unread for the **other** participants (that is the delivery) and not for
itself — so it does not wake itself up with its own answer.

**The `blocked` case carries the one judgment that the model must not make
anew every round.** Continuing is correct if the worker made progress, and
wrong if it is spinning; only someone looking at the transcript sees this.
But a model asked "one more try?" four times will say yes four times.
Therefore, Java counts how often a worker has been reported as blocked, and
from the third round, the finding explicitly states **not** to resume it.
It is counted upon reporting, not upon resuming — resuming is a model
decision, and the limit must not rely on that.

What the findings **do not** see: a promise from the conversation, an "I'll
check again on Friday." This requires a written list of open threads and is
not yet built. First the derivable, then the written — the process states
cover the most common case and cannot fail at any point because someone
forgot to note something.

The frame is called `<self-check>`, lists the findings, and carries no
`taskId`, so `task_complete` has nothing to answer at all. If, after
looking, there is nothing to do, the **turn ends without a tool call and
without a message to Control**.

### 7.1 A successful wake-up call lands in Megadodo

A Trillian that starts working at four in the morning otherwise leaves
nothing from which the *why* could be reconstructed: the ladder lives in
`engineParamOverrides` and is overwritten at the next arming, and the
`<self-check>` command is consumed by the turn it triggers. Therefore,
`TrillianHeartbeatTick` writes a line to the [Megadodo feed](megadodo-system.md)
— `trillian.wakeup`, `SINGLE`, `refType: PROCESS`, `refId` = Loop process,
`actor` = the `_trillian-*` service account, `traceId` = the idempotency
key that the command already carries. The message includes the findings,
because those are precisely the reason.

**Only the successful wake-up call.** The silent round — due, Nature finds
nothing, rearmed — is the normal case and runs hourly per Loop forever; a
line for it would bury the lines that mean something. A wake-up call whose
queue append fails also writes nothing: what happened is reported.

The write operation is next to `selfCheckDelivered` for the same reason
and not in `wake()` — a feed error must not make a wake-up call that has
landed appear to have failed.

## 8. Retry, Check, Give Up

The same decision occurs in this system at four points, and we have
answered it four times individually. It is: *something didn't work or is
pending — do I try again, do I check, or do I give up?*

Humans make this decision all day, and the three ways to make it wrong are
reproached in professional life:

- **didn't try again** → "you don't work independently"
- **kept trying the same thing** → "you don't realize it's not working"
- **tried again, but too expensively** → "you burned resources"

All three are avoidable if you break the question into four and ask them
in this order.

### 8.1 Am I allowed to retry at all?

The distinction is **transient vs. permanent**, as reliability research
(Avižienis et al., Taxonomy of Dependable and Secure Computing) defines it.
Retrying a temporary error is rational; retrying a permanent one is the
second reproach: same action, same world, different expectation.

Translated: a **state** may have changed (a lock, a missing file, a busy
port), a **decision** has not — it remains open until a human makes it.
Only the state justifies a second attempt.

The actor at the moment of failure knows this. Therefore, the information
belongs at the source and not in a later reconstruction from the error
text.

### 8.2 When, and at what intervals?

Whether uniform or increasing intervals are correct depends on **how the
waiting time is distributed**. For memoryless events, uniform checking is
optimal. However, human response times are bursty and heavy-tailed
(Barabási et al. on the dynamics of human activity): someone who has not
responded for an hour is more likely to respond in many hours than in the
next minute.

This leads to **exponential backoff** — not as a borrowed network
convention, but as the correct answer to this distribution. From the same
corner comes **jitter**: as soon as multiple agents query the same resource
or the same human, the intervals must be scattered, otherwise they run
synchronously.

### 8.3 Check myself or ask the human?

The most expensive of the four questions, and the one with the clearest
precedent: Horvitz, *Principles of Mixed-Initiative User Interfaces*
(1999). The core is that **interruption is its own, expensive currency** —
not just another step — and that an agent weighs the expected benefit
against these costs. Behind this is the value of information from decision
theory (Howard): is the check worthwhile, measured by what it costs and
what it reveals?

Practical order: **first check cheaply yourself, then disturb expensively.**
The first reproach above is the cost side of this — an interruption that
would have saved a two-second check is wasted attention.

### 8.4 When to stop?

**Circuit Breaker** (Nygard) with three states: closed (act), open (stop
trying), half-open (a trial attempt after a waiting period). More formally,
it is optimal stopping — Weitzman's *Pandora's box*: each check costs a
known amount, the return is uncertain, and there is a threshold beyond
which one no longer opens.

### 8.5 The four places where we have already answered this

| Location | 8.1 transient? | 8.2 Interval | 8.3 self or ask | 8.4 stop |
|---|---|---|---|---|
| Wake-up cadence (§7) | — | 10/20/40/60 ±20% Jitter, nights 120 | — | never (Reset on activity) |
| `BLOCKED`-Worker (§7) | Safety-Net means "spinning" | coupled to cadence | Loop reads transcript, decides | **stopped** after 3 rounds — no half-open |
| Outdated Journal Note (§4) | State vs. Functionality | on use | check cheaply before rejecting | strike entry |
| Parked Worker (§5) | `blocker: state\|decision` when asking | Cadence | State: first check self; Decision: ask immediately | open after 3 checks, **half-open** after 2 h (one trial) |

**Jitter** (2026-08-14): the ladder is deterministic, so Trillians armed
at the same second wake up forever at the same second — and whoever has
three of them gets three nudges simultaneously. The intervals now scatter
by ±20%. Deliberately not the full jitter of network retries (uniform
distribution over the entire interval): here it's not about an overloaded
server, but about a rhythm that should remain recognizable. "About every
twenty minutes" survives ±20% and does not survive "sometime in the next
twenty minutes."

**Half-open — but only at one of the two places**, and that is the point
where the table shows more than a symmetry gap.

For the **parked worker**, it makes sense: after three unsuccessful checks,
the breaker opens, but after two hours, **exactly one** further trial is
allowed, and the cooldown restarts, whatever it finds. A lock that has
survived three rounds can still be gone in the afternoon; without this,
giving up would mean giving up *permanently* — at the cost of one worker
turn every two hours.

For the **`BLOCKED`-worker**, it makes no sense. Frankie's two safety-nets
— Wallclock and Idle-Stuck — mean "it's spinning in circles," and circles
don't heal by waiting; a trial every two hours would revive a worker who
runs into the same net for the same reason. What was actually missing there
was the opposite: the episode never ended. The finding said "do not resume,"
no one closed it, so the same worker was reported again in every round.
After the third round, it is now **stopped** — in Java, because stopping
follows from a counter and not from a judgment, and because a cleanup that
waits for the model to remember it eventually does not happen.

The gap for the parked worker is closed (2026-08-14): `trillian_ask` now
requires a `blocker` field. The worker knows at the moment of failure what
is holding it back, and no one knows it better afterward; unknowns fall to
`decision`, because an unnecessary attempt is more expensive than a missed
one. A state gets **one** cheap re-check steered into the parked worker
before a human is even disturbed — they might have fixed it long ago. After
three unsuccessful rounds, the breaker opens: the state has behaved like a
decision long enough, so it is treated like one.

### 8.6 What we deliberately do not build

No expected utility calculation. It would require probabilities that we do
not have and for which there is no honest estimate — inventing a number
only to multiply it does not make the decision better, just more
unassailable.

What the literature gives us is the **structure**: four questions in a
fixed order. In the next case, the question is no longer "what do we do
here," but "which of the four is open here" — and where one remains
unanswered, it stands above in the table instead of in no one's head.

## 9. Alignment: What an Obstacle Means

On 2026-08-14, a worker ran against an AI-locked target document,
diverted to `reports/inventory-locked.md`, reported this transparently —
Worker, Loop, and Control all mentioned it — and the reflection turned it
into a journal line: *"X is locked; use a fallback like Y."*

Nothing about it was deception, and a human would probably have done the
same. Nevertheless, two distinctions are necessary that humans implicitly
bring and a model does not get for free.

**Obstacle in the way vs. Obstacle at the destination.** A failing tool, a
file somewhere other than expected, an approach that doesn't work — no one
chose that, that's the world, and working around it is the task. If, on the
other hand, the **destination** is blocked — what should have been
produced, or where it should have gone — then this destination comes from a
human. Taking a different one means doing a different task; stating it is
necessary but not sufficient.

A special case that looks like a technical error and is not: a **lock, a
denied permission, an explicit "don't touch X"** is an expressed
intention. A broken tool says "this doesn't work," a lock says "I don't
want this." Only the first may be circumvented.

**Restriction vs. Workaround — in the Journal.** A note records **how the
world is**: a restriction, a fact, a mode of operation. It does **not**
record what the Trillian once did about it, as long as no human has agreed
to it. Once written down, an improvisation ceases to be an isolated case
and becomes standing policy for every subsequent task — no one agreed to
it. "X is locked" belongs in the journal, "X is locked, so write to Y" does
not.

The check question is in the reflection prompt: *Would this note still be
correct if the next task were completely different?* A restriction survives
this, a workaround usually does not.

Both are formulated as concepts, not as rules about locks — the lock was
just the case where it became apparent. And both rely on §5: asking now
costs a round trip because the worker remains alive.

## 10. References

- `specification/public/trillian-engine.md` — Framework: Two-Session
  architecture, account names, Nature SPI, lifecycle cascade.
- `specification/light-llm-service.md` — the single-shot path that
  reflection uses.
- `specification/public/document-lock.md` — the lock from which
  reflection drew its first real lesson.
- `specification/memory-compaction.md` — what happens to the loop's
  working memory when it gets too long.

To §8, in the order of the four questions:

- Avižienis, Laprie, Randell, Landwehr — *Basic Concepts and Taxonomy of
  Dependable and Secure Computing* (2004): transient, intermittent, and
  permanent faults.
- Barabási — *The origin of bursts and heavy tails in human dynamics*
  (2005): why human response times are not memoryless, and thus the
  justification for increasing intervals.
- Horvitz — *Principles of Mixed-Initiative User Interfaces* (1999):
  interruption as a distinct cost type, and when an agent should act
  itself instead of asking.
- Howard — *Information Value Theory* (1966): the value of a check,
  measured by its costs.
- Nygard — *Release It!* (2007): Circuit Breaker with half-open state.
- Weitzman — *Optimal Search for the Best Alternative* (1979), "Pandora's
  box": when to stop searching.
