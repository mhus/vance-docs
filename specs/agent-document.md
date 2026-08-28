---
title: "Agent Document — `agent.md` per Project"
parent: Specs
permalink: /specs/agent-document
---

<!-- AUTO-GENERATED from specification/public/en/agent-document.md — do not edit here. -->

---
# Agent Document — `agent.md` per Project

> A Markdown document in the **project root** that is provided to every Think Process
> of this project during prompt construction: the standing instructions for all
> agents working here — conventions, vocabulary, house rules.
> No tool call, no hook, no registration: the file exists, so it is included in
> the system prompt.
>
> Status: v1 productive. Implementation in
> `vance-brain/.../memory/MemoryContextLoader.java` as a layer of the
> Memory Block.
>
> See also [`prompts-and-manuals.md`](/specs/prompts-and-manuals) (Prompt Discipline,
> Manuals as on-demand counterpart), [`settings-system.md`](/specs/settings-system)
> (`memory.*` settings), and [`memory-compaction.md`](/specs/memory-compaction)
> (the block in which it is transported).

## 1. Purpose and Delimitation

`agent.md` answers **one** question: *what does every agent in this project
need to know before reading the first word?* The analogy is `CLAUDE.md` in the
repo root — project knowledge that is assumed, not to be worked out.

Four channels are adjacent and deliberately separated:

| Channel | Question | Load Time |
|---|---|---|
| **`agent.md`** | How is work done in this project? | always, unprompted |
| **Manual / Skill** | How does *this one* capability work? | on-demand (`manual_read`) |
| **`memory.*`-Settings** | Tenant/Project policy as Key-Value | always, cascading |
| **Persona / Facts** | Who is this person, what did they say? | always, but from `_user_<login>` |

The separation is a cost issue: `agent.md` is paid for without anyone asking for
it. Anything irrelevant to the majority of processes belongs in a Manual — the
same rule of thumb as for Engine Prompts (`prompts-and-manuals.md` §2).

## 2. Location and Cascade

Path: **`agent.md` in the project root**, default constant
`MemoryContextLoader.DEFAULT_AGENT_DOC_PATH`.

Resolved via `DocumentService.lookupCascade` — **first-hit-wins, no merge**:

1. `agent.md` in the Project
2. `agent.md` in the `_vance` Project of the Tenant
3. Classpath Default (currently **none** bundled — the stage exists but is empty)

A project that writes its own `agent.md` **replaces** the tenant-wide one. This
is the intention: the project author should not have to write against an
invisible second source. To use tenant-wide rules that a project cannot disable,
use `memory.*`-Settings — which cascade additively.

**Why not `_vance/agent.md`:** `_vance/` is a Reserved-Prefix
([`permission-system.md`](/specs/permission-system) R4) and requires ADMIN to write.
The very WRITER who maintains their project's conventions would then be unable
to touch the file. It is user content, not a configuration artifact — and
therefore lies visibly in the root, where it also appears in the document tree
and in searches.

## 3. Who Reads It

Every Think Process whose Engine composes the Memory Block: **Arthur**,
**Eddie**, **Ford**, **Frankie**, **Trillian** (Control + User-Loop). This
includes **Workers**, and that is intentional — the Worker is the one who
writes; a Coding Worker without the project conventions is exactly the case for
which the file is created. A single Worker type that does not need it disables
it in its Recipe (§5), rather than the code drawing a class boundary.

It is **not** read by [`LightLlmService`](/specs/light-llm-service) calls
(Discovery, Follow-up, Title Generation, Classification). This is structural and
requires no filter: these calls have no Think Process and never invoke the
loader.

## 4. Form in the Prompt

The content travels in the **Memory Block**, a *dynamic* system message — thus
behind the prompt cache marker, so that an edit to `agent.md` does not
invalidate the cached Engine prefix. Heading depends on the cascade level:

```
## Agent Notes (agent.md)                       ← Project
## Agent Notes (from _vance: agent.md)          ← Tenant
## Agent Notes (system default: agent.md)       ← Classpath
```

**Dedup via the Read-State:** the full body is sent **once per process**; from
the next turn with an unchanged content hash, only a stub sentence ("Agent notes
unchanged from an earlier turn ...") appears, because the text is already in the
history of this process. Costs are thus per process, not per turn. An edit
changes the hash and re-injects the full text.

An existing but empty document renders only the heading — visibly intentionally
empty instead of silently absent.

## 5. Disabling and Redirecting per Recipe

Recipe parameter `agentDocument` (constant `AGENT_DOC_PARAM`), under `params:`:

| Value | Effect |
|---|---|
| *not set* | **Default: on**, path `agent.md` |
| `""` (or `null`) | off — this Recipe type receives no Agent Document |
| `"notes/team.md"` | different path, same cascade |

## 6. Client-Side Variant

A CLI client can additionally upload a **local** file from its working directory
— `VANCETOPE.md` → `AGENT.md` → `CLAUDE.md`, overridable via `--agent-file`. It
lands as its own block `## Agent Notes (from client: <file>)` with the same
deduplication behavior and is **opt-in per profile** via the parameter
`useClientAgentDoc` (set in the `foot:` profiles of the Recipes).

The two are deliberately separate blocks: the project `agent.md` describes the
**project**, the client file describes the **machine** the human is currently
using. From the Brain, the latter is not writable.

## 7. What Belongs In — and What Doesn't

**Belongs in:** Conventions (naming, folder layout, report format), vocabulary
(what an internal term means *here*), hard rules ("`export/` goes to customers —
no drafts there"), target audience and tone of results.

**Does not belong in:**

- **Secrets.** The body goes to the model. Reference instead of value —
  [`vault-access.md`](/specs/vault-access).
- **One-time facts** ("Deadline is this Friday") — this is Memory, not a
  document that every process pays for.
- **How-to knowledge** for a capability — this is a Manual or a Skill.
- **Length.** Goal: one screen. A page that no one remembers will also be
  skimmed by the model.

## 8. Deliberately Not

- **No merge across the cascade.** Two combined sets of instructions will
  eventually contradict each other, and no one will see where the second half
  comes from.
- **No dedicated tool.** `agent.md` is a regular document; `doc_read` /
  `doc_write` / `doc_edit` are sufficient. An `agent_doc_set` would be a
  second write path bypassing lock, versioning, and writer identity.
- **No reload.** The effect takes place on the next turn, because the loader
  checks with every prompt construction.
