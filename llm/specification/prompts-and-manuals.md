# Vance — Prompts and Manuals

> How Engine and Recipe Prompts stay compact: Capabilities, How-Tos, and domain knowledge reside in **Manuals**, which the LLM loads on demand via `manual_read('name')`. The Prompt only specifies **what exists** and **when to load it**, not the content itself.
>
> This spec defines the convention — Manual anatomy, Prompt hook syntax, When-to-split, Engine vs. Skill Scope. It applies to **all** Engines (Arthur, Eddie, Ford, Marvin, Vogon, Slartibartfast, …) and all Skills (`repos/vance-kits/`).
>
> See also: [recipes](recipes.md) | [skills](skills.md) | [arthur-engine](arthur-engine.md) | [eddie-engine](eddie-engine.md) | [tool-availability](tool-availability.md)

---

## 1. Problem and Principle

**Problem:** Engine Prompts grow linearly with each new Capability. Three severe effects:

1. **Linear Token Costs** — every turn pays for the full Prompt. Even when the respective Capability is irrelevant in 99% of turns.
2. **Attention Dilution** — empirically, instruction-following quality drops ("lost in the middle") from ~5–8k tokens System Prompt. More rules → less reliable adherence to important ones.
3. **Maintainability** — each new Capability means: touching all relevant Prompts + guaranteed documentation drift.

**Principle:** **Lazy Loading via Manuals.** The Prompt contains only stable identity, anti-patterns, tool inventory, and **Hooks** to Manuals. Manuals are loaded by the LLM via `manual_read('name')` on-demand. What is unused in 99 out of 100 turns does not belong in the Prompt.

**Lesson from the Lisbon Incident** (2026-05-26, Arthur told the user "I cannot embed images" even though the Web-UI renders Markdown images out-of-the-box):

The bug was not "Capability missing," but "Capability was not described in the Prompt — and there was no Manual the model could have consulted." Instead of extending the Arthur Prompt by 30 lines "how to embed images," we write a Manual + Hook. Three advantages: future Capabilities follow the same pattern, the Prompt remains small, the knowledge lives thematically in its place.

---

## 2. Layered Picture

We have **four** layers for how LLM context is created. Each has a clear purpose:

| Layer | What it contains | When injected | Optimized for |
|---|---|---|---|
| **Prompt** | Identity, Anti-Patterns, Tool Inventory, Action Schema, Manual Hooks | every turn | stable, fixed rules |
| **Manual** | How-Tos, Capability Details, Domain Conventions, Examples | LLM calls `manual_read('name')` | thematically focused, compact |
| **RAG** | Project documents, Memory learnings (later) | semantic match on content | unlimited scalability, user-generated content |
| **User-Memory** (Eddie) | Facts about User & Session | every turn (small, fixed) | user-specific context |

**Where does what belong?**

- **Prompt:** Rules that apply to **every** turn and that the model cannot infer on its own (identity, validation schema, action obligation).
- **Manual:** Capability-specific "how to do X" that is only relevant in **some** turns.
- **RAG:** User content that the LLM never needs to know by heart.
- **User-Memory:** Facts about *this* User that may be relevant in every turn.

**Rule of thumb:** If a Prompt section describes >5 lines of Capability detail and is not needed in a majority of turns → out of the Prompt, into a Manual + Hook.

---

## 3. Manual Anatomy

**File format:** Pure Markdown. Optionally, a **Manual Header** at the beginning — a simple key-value block between `---` lines. The header is **not YAML**: no YAML parser needed, no lists, no quoting, no nested objects. One line per field, `key: value`. Pure metadata (not for runtime configuration), but read by Discovery (`how_do_i`) and the LoRA training set generator.

**Header fields:**

```markdown
---
audience: eddie
triggers: keyword1, Schlüsselwort, kw2, …
summary: Ein-Zeilen-Beschreibung des Themas.
requires-tools: research_investigate, web_fetch
---
```

- **`audience:`** — Engine name (`eddie`, `arthur`, …), if the Manual is only useful for a specific Engine. **Missing** is the default and means "applies to all Engines." Even Engine-specific Manuals (e.g., under `eddie/manuals/`) should carry the marker so that training/documentation pipelines can find it machine-readable — the folder convention alone is not reliable.
- **`triggers:`** — bilingual keyword list (German + English), comma-separated. Used by the Discovery service as a routing hint; the more precise, the less often the wrong Manual is loaded.
- **`summary:`** — one line describing what the Manual covers. Displayed in the source list (`how_do_i`-Catalog) — if the LLM has to decide which Manual to load, it only reads the summary, not the entire file.
- **`requires-tools:`** — comma-separated tool names. Optional. If set, `how_do_i` hides the Manual from suggestions/catalog as soon as **one** of the tools is not in the Engine's allow-set of the calling worker. Missing = "fits everywhere." Example: a Manual about `research_*`-workflows carries `requires-tools: research_investigate, research_search` — Engines without research tools won't even see it.

All fields are **optional**, but expected for new Manuals (at least `triggers` + `summary`). Existing Manuals without a header are legacy — update them on the next edit.

**Size discipline:**

- **Goal:** under 100 lines.
- **Hard limit:** ~200 lines. If exceeded, **must** split (see §5).
- **Routing-Overview:** under 50 lines, contains exclusively "if X → `manual_read('Y')`" references.

**Content structure (recommendation):**

```markdown
# <Topic>

<1-2 sentences: what this Manual covers, what it does not.>

## When to use

<1-3 bullet points: specific triggers/situations.>

## Instructions / Examples

<The actual content. Concrete examples > abstract rules.>

## Cross-References (optional)

- For X, see `manual_read('sibling')`
```

**No** redundant repetition of the hook from the Prompt — the hook in the Prompt says *when* to load; the Manual itself says *what* to do.

---

## 4. Prompt Hook Convention

Three strict rules for the hook in the Prompt:

### Rule 1: Exact Tool Call Syntax

The Prompt contains the **concrete call form**, not a prose reference.

| ❌ Weak (model ignores) | ✅ Strong (model calls) |
|---|---|
| "For UI embedding, see the Embedding Manual." | `manual_read('embed-images')` |
| "Consult the Manuals on topic X." | "Before answering about X: `manual_read('X')`." |

Reason: the model sees the exact tool signature and copies it. Prose references disappear in attention.

### Rule 2: Trigger per Manual

Each Manual in the hook gets a line **when to load**, not *what it contains*. The Manual explains itself — the hook is just the triage.

```markdown
- `manual_read('embed-images')` — if the user wants to see images/photos/screenshots
- `manual_read('embed-fences')` — for mindmap, chart, youtube, and other inline renderers
- `manual_read('embed-documents')` — when linking own Project documents
```

### Rule 3: Explicitly Catch Anti-Patterns / Negation

If a Manual addresses a failure mode that the model **frequently** goes through, explicitly forbid it:

```markdown
**Never say "I cannot show / display / embed X"** without first
checking the relevant manual. The UI renders more than you think.
```

Reason: models have default reflexes ("I'm a text model, I can't show images") that the **Vance setup refutes**. The negation block prevents the model from prematurely saying "cannot do" without having performed the Manual check.

### Complete Hook Example

```markdown
## Showing things to the user

When the user wants to see images, diagrams, videos, documents,
or any embedded content — **before** answering, consult the
relevant manual:

- `manual_read('embed-overview')` — entry point, routes to specifics
- `manual_read('embed-images')` — external URLs, web_search results, project images
- `manual_read('embed-fences')` — mindmap, chart, youtube inline blocks
- `manual_read('embed-documents')` — vance: URIs, document_link

**Never say "I cannot show/display/embed X"** without first
checking. The UI renders more than you think.
```

---

## 5. When to Split a Manual

**Criteria (any "Yes" → split):**

- Manual >150 lines.
- Three or more distinct topics that each make sense standalone.
- "Load frequency" of topics diverges strongly (Topic A relevant in 80% of turns, Topic B in 5%).
- Cross-references within the Manual accumulate (>3 self-references).

**Split Pattern: Routing-Overview + Specialized Manuals**

```
manuals/embedding/
  overview.md       ~40 lines — only "if X → manual_read('Y')" table
  images.md         ~70 lines
  fences.md         ~70 lines
  documents.md      ~70 lines
```

**Procedure:**

1. Write the Routing-Overview Manual first. It is the cheapest first point of contact.
2. Sub-Manuals contain **1–2 complete examples**, not just rules. Examples are more powerful than abstract instructions in the LLM context.
3. In the Prompt hook, list the Overview **plus** the most frequent specialized Manuals. The Overview is not mandatory — if the hook already routes precisely, the model can load the specialized Manual directly.

**Anti-Patterns when splitting:**

- Splitting into <30-line fragments. Manual overhead (header, cross-refs) destroys compaction.
- "API-Reference style" with one Manual per constant/function. Manuals are grouped thematically, not alphabetically.

---

## 6. Engine Manual vs. Skill Manual

Manuals reside in two places — the choice is **architectural**, not stylistic.

| Property | **Engine Manual** | **Skill Manual** |
|---|---|---|
| Location | `vance-brain/.../vance-defaults/_vance/manuals/` or `vance-addon-brain-<id>/.../vance-defaults/_vance/manuals/` (Cascade) | `<kit>/documents/skills/<skill>/manuals/` (Skill-bundled) |
| Activation | Recipe `manualPaths` — always available | Skill Trigger (Keywords/Intent) — only when Skill is active |
| Available in | every Worker with the Recipe | only in turns with active Skill |
| Best example | UI embedding, Tool families (rest/imap/smtp), Process lifecycle | Synthesis methodology, Threat modeling, Test crafting, Code review style |

**Decision tree:**

- **Capability is intrinsic to the client or server** (UI renders X, tool family does Y) → **Engine Manual**.
- **Capability is a domain method** (how to do synthesis; how to conduct a threat modeling workshop) → **Skill Manual**.
- **Capability is user-/project-specific** (customer style guide) → **Skill Manual** in the Kit.

**Engine Manuals live in the Document Cascade.** Tenants/Projects can override them via Document Editor (`_vance/manuals/<topic>/...` or `<project>/manuals/<topic>/...`). Recipe order in `manualPaths` determines precedence in case of name conflicts.

### 6.1 Kind Manuals — Two-Form Convention

Manuals for **inline-renderable** Document Kinds (`kind-chart`, `kind-graph`, `kind-mindmap`, `kind-diagram`) must explicitly distinguish **both forms** for the LLM, because the same payload must be delivered with or without a fence wrapper depending on the context:

| Context | Form | Consequence |
|---|---|---|
| User wants to render *now in chat* | ` ```<kind>\n<payload>\n``` ` Fence | Web-UI renders inline (live in the Assistant message) |
| User wants to *save* via `doc_create` | Raw JSON or YAML (Body **without** Fence) | Codec persists, Web-UI renders in the Document tab |

Wrong form → User sees either plain text (fence in stored body → Web-UI falls back to raw editor) or Markdown code fence instead of render (raw body as inline message). Both modes result in "no render," but for different reasons.

**Mandatory Manual structure** for inline-renderable Kind Manuals:

1. **Decision table at the top** with clear user phrases per path
2. **Inline form FIRST** — complete code example in the ` ```<kind> ` block, plus explicit reminder *"The reply must CONTAIN this fence verbatim — narrating without the actual fenced block leaves the user with no render."*
3. **Stored form SECOND** — `doc_create(kind="<kind>", content=<raw>)`-call with raw content, plus explicit warning *"The content must NOT be wrapped in a ```<kind> fence."*
4. **Anti-Pattern section** names at least (a) library defaults from training data (Chart.js instead of Vance-Chart, Cytoscape instead of Vance-Graph, OPML/Freemind instead of Vance-Mindmap) and (b) wrap-the-stored-body errors

**Order justification:** LLMs often pattern-match the *first seen* code example. If the stored example comes first, the model will omit the fence for inline requests. If the inline example comes first, the decision table at the top is the safety net for stored requests — reinforced by the hard rule in the Engine Prompt (see §6.2).

**Exception — `kind-diagram`:** Diagram is the only Vance Kind where the fence in the stored body **is desired** (Markdown with a `\`\`\`mermaid`-fence is the canonical on-disk form per `doc-kind-diagram` §1.5). The Manual makes this exception explicit; the Engine Prompt hard rule (§6.2) references it as a special case.

### 6.2 Hard-Rule Pattern in the Engine Prompt

Some tools have conventions that the Manual lazy-load path **does not enforce on its own**. Example: `doc_create(kind=X, content=…)` with the wrong body format produces a syntactically valid Document that does not render in the Web-UI — no compile error, no codec error, just broken UX. Models without a strong bias towards Vance conventions (especially cloud models NOT fine-tuned on Vance) then guess based on training data and usually miss.

**Solution:** a **"Hard rule"** in the Engine Prompt (Arthur, Eddie, …) that forces the model to call `how_do_i('…')` or `manual_read('<topic>')` before the tool call. The Hard-Rule provides:

- the **trigger** (which tool call triggers it)
- the **concrete action** (`how_do_i(…)` with recommended intent string)
- the **reasoning with concrete library defaults** against which it is delimited (Chart.js, Cytoscape, OPML, harmony-format) — otherwise the model thinks "I know the format" and skips
- the **symptoms** of the failure case in one line ("User opens the chart doc and sees plain text instead of a chart") — gives the model a concrete picture
- if applicable, **exceptions** explicitly (`kind: diagram` with `\`\`\`mermaid`-fence is exactly right in the stored body — see §6.1)

**When a Hard-Rule is useful** (not for every tool call!):

- Tool call may only load the Manual **once per session** for a specific topic — Hard-Rule says "before the first time this session, …"
- Training data bias is strong enough that the decision table in the Manual alone is not sufficient (typical when popular OSS libs define a divergent schema)
- Consequence of an error is a silently broken UX, not a clear codec error

**Existing Hard-Rules:**
- **Inline-Fence-Hard-Rule** in `arthur-prompt.md` / `eddie-prompt.md` (Inline-Fence ≠ training data — before first ` ```mindmap `/` ```graph `/` ```chart `/` ```mermaid `, ` ```records `/` ```tree `/` ```list ` → `how_do_i('show a <kind> inline')`)
- **Stored-Doc-Hard-Rule** in both Prompts (Stored-Schema ≠ training data — before first `doc_create(kind=X, content=…)` → `how_do_i('save a <X> as a stored document')` or `manual_read('kind-<X>')`)

Both rules sit directly next to the "Quick channel choice" section in the Prompt so they take effect next when reading the tool inventory.

**Structurally mitigated via Tool Consolidation:** An earlier third Hard-Rule candidate ("model chose text tool due to `.md` file extension instead of kind-typed tool") was dropped with the unification of the former three legacy tools (`doc_create_text` / `doc_create_kind` / `doc_write_text`) into the single `doc_create(kind, path, content)` upsert tool. With only one tool and mandatory `kind` parameter, the "which tool" decision is gone — the model only needs to choose the correct Kind value, which is structurally more reliable than a Prompt hint (see benchmark `MermaidVarietyBenchmark` — 3/9 → 9/9 after consolidation). The old aliases have been completely removed since 2026-06-09.

---

## 7. Directory Conventions

**Engine Manuals** under `vance-defaults/_vance/manuals/` in the respective
module:

- **Core Manuals** (for host capability): `vance-brain/src/main/resources/vance-defaults/_vance/manuals/`
- **Addon-specific Manuals**: `vance-addon-brain-<id>/src/main/resources/vance-defaults/_vance/manuals/`

Both are treated equally by the Cascade Loader — Spring scans with
`classpath*:vance-defaults/...` across all JARs (Brain + Loader-Path-
Addons), no central registration. Addons MIGRATE their Manuals
with them when they are cut out of `vance-brain` (Example:
Calendar Stage 2.x — `git mv` of 6 Manuals was sufficient). Details see
[addon-system §7a](addon-system.md).

- **Flat:** one topic, one file (`processes.md`, `python.md`).
- **Hierarchical:** sub-directory per topic family (`embedding/overview.md`, `embedding/images.md`, `slartibartfast/zaphod-architect/SHAPE.md`).
- **Engine-specific:** `eddie/manuals/<topic>.md` for Manuals that only concern one Engine.

**Manual name in `manual_read`:** the **basename without extension**. `manuals/embedding/images.md` becomes `manual_read('images')`. Conflicts between sub-directories are resolved by Recipe `manualPaths` order (first match wins).

**Recipe Patch** for activation:

```yaml
params:
  manualPaths:
    - manuals/embedding/   # ← new topic
    - manuals/             # ← existing
```

Recipe order = precedence. When extending, list new topic directories **before** the fallback wildcards.

---

## 7a. Addon Fragments — Pebble Snippets per Engine

Manuals cover the on-demand path (hook in Prompt → `manual_read` as needed). However, some capabilities require **always-visible trigger instructions** in the Prompt — e.g., *"if user says `Calendar` → use `calendar_create`"*. These lines are useless if the corresponding Addon (Calendar, Kanban, …) is not installed, and false promises if the Engine default Prompt includes them unconditionally. Solution: **Addon Fragments**.

**Convention** — One Markdown snippet per Engine per Addon, in the Addon JAR:

```
vance-addon-brain-<id>/src/main/resources/vance-defaults/_vance/prompts/<engine>/<addon-id>.md
```

Example: `vance-addon-brain-calendar/.../prompts/arthur/calendar.md` injects the Calendar trigger instructions into the Arthur Prompt as soon as the Calendar Addon JAR is in the classpath. Engines for which the Addon does not provide a fragment (e.g., Marvin) remain untouched.

**Mechanism** — `AddonPromptFragmentRegistry` scans on boot via `classpath*:vance-defaults/_vance/prompts/*/*.md` across all JARs, validates each fragment via Pebble compile (fail-fast), caches per Engine sorted by Addon ID (deterministic). `SystemPromptComposer` (`@Service` in `vance-brain.thinkengine`) bundles Pebble Renderer + Fragment Registry, so Engines inject **one** Bean instead of two and do **not need to know** the fragment wiring themselves.

**Composer API — four render paths:**

| Method | When | Who uses it today |
|---|---|---|
| `compose(process, engineDefault, ctxBuilder)` | Standard path — one LLM call per turn with Engine default + Recipe override + Profile append + Addons merged | Arthur, Eddie, Ford (via `StructuredActionEngine.composer`) |
| `withAddons(engine, ctxBuilder)` | Engine builds its System Prompt itself, only wants the Addon block as a Pebble variable | Zaphod (Synthesis), Marvin (Worker node) |
| `renderAddons(engine, ctxMap)` | Engine works with a **Map** instead of a Builder (custom variables like `goal`, `toolInventory`) | Hactar/DraftingPhase, Hactar/FramingPhase |
| `render(template, ctx)` / `compile(template)` | Pure Pebble pass-through without Addon mechanism | Marvin (postAction templates), Slart/MarvinArchitect (compile validation) |

**Currently addon-enabled Engines** (fragment under `prompts/<engine>/<addon-id>.md` is deployed on boot): `arthur`, `eddie`, `ford`, `zaphod`, `marvin`, `hactar`. Other Engines (`jeltz`, `vogon`, `agrajag`, `slartibartfast`) are deliberately **not** addon-enabled — they are internal mechanics pipelines (schema loop, architecture validation, strategy runner) and not a user-facing Prompt loop.

`SystemPrompts.compose` remains static pure logic (override mode blending, auto-append fallback) — the Composer service is the Spring orchestration above it.

**Placement in the Engine Default Prompt** — The Engine default template explicitly references the variable:

```
{% if addonSections %}

{{ addonSections }}
{% endif %}
```

If the template does **not** reference `{{ addonSections }}`, `SystemPrompts.compose` automatically appends the block at the end (analogous to `profileAppend`). Recipe overrides may also reference the variable — an OVERWRITE Recipe without reference deliberately drops the Addon content.

**Fragment vs. Manual — when to use what?**

| Content | Where |
|---|---|
| Trigger instruction *"if user says X → use Tool Y"* | Fragment (always in Prompt) |
| Hard-Rule *"Before first call this session, `manual_read('Z')`"* | Fragment (Hook remains in Prompt) |
| Schema details, RRULE syntax, color palette | Manual (on-demand) |
| Cross-reference between tools | Manual |

Fragments are compact (≤50 lines per Engine): trigger word list, tool call pattern, anti-hand-write warning, hook to the detail Manual. Everything beyond that belongs in the Manual.

**Pebble Context** — Fragments see the same render context as the Engine default (`tier`, `provider`, `mode`, `profile`, `recipe`, `engine`, `lang`, `params`, `voiceMode`), so they can branch tier-specifically if necessary.

---

## 8. Anti-Patterns

What should **no longer** be in the Prompt when the convention is applied:

| Anti-Pattern | Instead |
|---|---|
| 30 lines of Capability explanation in the Prompt | Hook + Manual |
| "See the Manual for X" (without tool call syntax) | `manual_read('X')` |
| Manual list without trigger description | One line per Manual with *when to load* |
| Huge monolithic Manual (>200 lines) | Routing-Overview + Sub-Manuals |
| Hook missing for known failure pattern | Negation block ("Never say 'I cannot' without checking") |
| Engine-specific Manual without `audience:` marker | Manual header with `audience: <engine>` (§3) |
| Manual duplication (same content under two names) | One source, cross-refs |
| Duplicating Capability lists per Engine | Engine Manual (once centrally) |
| Trigger instructions for Addon tools (`calendar_create`, `kanban_move`, …) in the Core Engine Prompt | Addon Fragment under `prompts/<engine>/` in the Addon JAR (§7a) |

---

## 9. Migration of Existing Prompts

Existing Engine Prompts (Arthur ~700 lines, Eddie ~600 lines) are **not** to be refactored in one go. Iterative approach:

1. **Identify:** Which Prompt sections are >5 lines of Capability detail and irrelevant in the majority of turns?
2. **Write Manual** under `manuals/<topic>/<name>.md` (Convention §3).
3. **Insert Hook into Prompt** according to §4. **Completely** replace the old section, do not keep it in parallel.
4. **Recipe Patch** if new topic path is needed (`manualPaths`).
5. **Anti-Pattern known?** Add negation block in the hook.
6. **One Prompt per PR.** No collective refactorings — risk of overlapping behavior regressions.

**Validation:** For each migration, add an end-to-end test in `qa/ai-test/` that verifies the Manual pull (Example: `manual-pull-test` Skill in `repos/vance-kits/qa/`). Optional: ChatLog assertion *"`manual_read('name')` was called"*.

---

## 10. Tool Contract

`manual_list()` and `manual_read(name)` are the two tools through which the pattern operates. Implementation:

- `vance-brain/.../tools/manual/ManualListTool.java` — lists Manuals from `params.manualPaths` (Recipe + active Skills additive).
- `vance-brain/.../tools/manual/ManualReadTool.java` — loads a single Manual from the Cascade. Cascade automatically considers classpath resources from Addon JARs (Spring `classpath*:`).
- `vance-brain/.../tools/manual/ManualPaths.java` — collects paths from Recipe + Skill frontmatter.

**Tool Description** (seen by the model, in `ManualListTool.java`):

> *"List the manuals available in this scope (see params.manualPaths). Read one with `manual_read(name)`. Consult these whenever the user …"*

This is the **self-documentation** of the tool — models that receive a tool inventory already learn the call here. The Prompt hook is the **additional** triage per topic.

---

## 11. Scaling Limit — When Manual Hooks Are No Longer Sufficient

The `manual_read('name')`-pattern scales well up to ~20 Manuals. Beyond that, Prompt hooks grow linearly with the number of capabilities, and the original three problems (§1) return — this time per hook instead of per section.

**Escalation Path:** From ~30 Engine Manuals plus Skill Manuals (i.e., when the discovery question is truly non-trivial), the Discovery tool `how_do_i(intent)` supplements the pattern. The Prompt gets **one** Discovery line instead of N Manual hooks; internally, the `DiscoveryService` uses the Recipe `how-do-i` as a config profile and calls `ChatModel` directly (Jeltz-style single-shot with schema loop — no Process spawn). The complete source catalog (Manuals + Skills + Tool Descriptions) is injected via Pebble variable `{{ sources }}`; Prompt caching makes this cost-effective. The LLM responds with `{ loaded }`, `{ alternatives }`, or `{ hint }`.

Spec on this: [how-do-i](how-do-i.md). Spec decision 2026-05-26: in v1, `how_do_i` runs **in parallel** to the Manual hooks — no Prompt migration. Hot-path topics with negation traps (e.g., `embed-*`) remain explicitly hooked because the trap is topic-specific.

---

## 12. Status & Next Steps

This spec is binding as of 2026-05-26 for **new** Capabilities. Planned migrations, iteratively:

| Step | What | Status |
|---|---|---|
| M1 | UI Embedding: 4 Manuals + Arthur Prompt Hook | completed 2026-05-26 |
| M2 | Scan Eddie and other Engine Prompts for >5-line Capability sections | open |
| M3 | Check convention in pre-commit or linter (warn for Manuals >200 lines) | later |
| L1–L4 | `LightLlmService` as central single-shot helper (see [light-llm-service](light-llm-service.md)) | completed 2026-05-26 — 18 tests green |
| D1–D5 | Implement `how_do_i`-tool (see [how-do-i §12](how-do-i.md#12-phased-rollout)) | completed 2026-05-26 — Unit tests + E2E (Gemini-2.5-flash) green |
| D8 | Replace Manual hooks in Prompt with `how_do_i`, unless a negation trap is needed | open (v2) |
| F1 | Addon Prompt Fragment mechanism (`AddonPromptFragmentRegistry`, `{{ addonSections }}`, Arthur + Eddie wired) | completed 2026-06-05 |
| F2 | Calendar and Kanban trigger blocks extracted from `arthur-prompt.md` into `vance-addon-brain-{calendar,kanban}` | completed 2026-06-05 |
| F3 | `SystemPromptComposer` introduced as Spring service — bundles Renderer + Registry, `StructuredActionEngine` passes it to subclasses | completed 2026-06-05 |
| F4 | Composer wiring for all render-active Engines: Ford, Zaphod (Synthesis), Marvin (Worker + postAction), Hactar (Drafting + Framing), Slart/MarvinArchitect (compile-Validation) | completed 2026-06-05 |
