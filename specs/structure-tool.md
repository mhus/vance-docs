---
title: "Structure Tool"
parent: Specs
permalink: /specs/structure-tool
---

<!-- AUTO-GENERATED from specification/public/en/structure-tool.md — do not edit here. -->

---
# Structure Tool

> The **`structure` tool** converts unstructured content into a schema-compliant JSON object. Input is a free-text prompt plus a target structure; output is validated JSON. The schema can be provided directly, loaded by name from a Schema Registry, or inferred from a textual description. The tool is a **Built-in Server Tool** (not an Engine, not a Process) — atomic, synchronous from the caller's perspective, no lifecycle. In case of schema violation, an internal validation loop runs with reason-feedback to the LLM; if there's insufficient input information, the tool returns a `need-more-input` result, which the caller (typically a Chat Engine) relays to the user verbally.
>
> See also: [server-tools](/specs/server-tools) | [structured-engine-output](/specs/structured-engine-output) | [recipes](/specs/recipes) | [llm-resource-management §3a](/specs/llm-resource-management) | [knowledge-graph](/specs/knowledge-graph)

---

## 1. Role and Use Cases

Other Engines, Tools, or Recipes often require structured data from free-form LLM conversations:

- **Records from User Statements** — "Mike broke the build today" → `{ "actor": "Mike", "action": "broke_build", "ts": "2026-05-06T..." }`
- **Form-Filling from Documents** — PDF extract → typed fields
- **Tool Argument Preparation** — Worker Engine calls a Tool whose arguments must first be distilled from free text
- **Knowledge Graph Insertion** — Free-text insight → typed triples
- **Recipe/Settings Builder** — Verbal description "I need an Engine that does X" → Recipe YAML

Provider-strict output modes of LLM APIs alone are insufficient: they have subset restrictions (see §4), and in many cases, the schema itself must first be built.

### 1.1 Why a Tool and not an Engine

Earlier spec iterations modeled `structure` as a one-shot Engine ("Jeltz"). Three points argue against this:

1.  **Atomic.** Input → Output. No user interaction except for the `_need` edge case — and that is handled more cleanly by the caller: Arthur sees the Tool result, asks the user himself (in his language, with his domain context), and retries the Tool. A separate Engine lifecycle for this would be redundant.
2.  **Sub-second to ~10 s runtime.** Clearly Tool territory. Restart resilience, Activity Log visibility, a dedicated Process — no real added value.
3.  **No dedicated Persona.** `structure` has no "self" towards the user. It is a pure transformation. Engines have a Goal, a Plan, a Lifecycle; the Tool does not.

Consequence: no entry in the Think Engine Registry, no `structure` Recipe, no `ThinkProcessDocument`. Instead, an internal `StructureService` and a Built-in Tool that calls it.

### 1.2 What the Tool is NOT

-   **Not a Schema Validator.** To validate JSON against a known schema, call the validator (`networknt/json-schema-validator`) directly — the Tool burns LLM tokens and would be overkill for this.
-   **Not a Data Extractor with Fuzzy Matching.** If required fields are missing from the prompt, the Tool signals `need-more-input`. No hallucinating plausible values.
-   **No Streaming Output.** The JSON is delivered atomically.
-   **No Multi-Record Pipeline.** One call → one JSON object. If a caller wants to extract 100 records from a text, they chunk it themselves.

---

## 2. Public Interface

### 2.1 Tool Definition

`structure` is a **Built-in Server Tool** (Spring Bean, code-only, no Mongo persistence — see [server-tools §1](/specs/server-tools)):

```yaml
name: structure
description: |
  Convert free-form content into a validated JSON object. Provide a
  prompt describing what should be extracted, plus a schema (JSON
  Schema, registry name, or natural-language description). Returns
  the validated JSON, or an error indicating missing information.
params:
  prompt:
    type: string
    required: true
    description: "Free-form input text to be structured."
  schema:
    oneOf:
      - { type: object, description: "JSON Schema 2020-12, inline." }
      - { type: string, description: "Schema name in registry (when schemaMode=named) OR natural-language description (when schemaMode=text)." }
  schemaMode:
    type: string
    enum: ["json", "named", "text"]
    default: "json"
    description: "Disambiguate when 'schema' is a string. Ignored when 'schema' is an object (always 'json')."
  maxLoops:
    type: integer
    default: 3
    minimum: 1
    maximum: 10
returns:
  status:        { type: string, enum: ["ok", "need-more-input", "stale"] }
  data:          { type: object, description: "Validated JSON, present iff status=ok." }
  need:          { type: string, description: "Human-readable description of missing input, present iff status=need-more-input." }
  errors:        { type: array, items: { type: string }, description: "Validator messages from the last failed iteration, present iff status=stale." }
  schemaOrigin:  { type: string, description: "'inline' | 'registry:bundled' | 'registry:tenant:<id>' | 'registry:project:<id>' | 'inferred'. Useful for debugging." }
  iterations:    { type: integer, description: "Number of content-stage iterations consumed." }
```

### 2.2 Service API (internal)

The Tool is a thin wrapper around `StructureService`:

```java
public interface StructureService {
    StructureResult runStructured(StructureRequest request, ScopeContext scope);
}

public record StructureRequest(
    String prompt,
    SchemaInput schema,
    int maxLoops
) {}

public sealed interface SchemaInput {
    record InlineJsonSchema(JsonNode schema) implements SchemaInput {}
    record NamedSchema(String name) implements SchemaInput {}
    record TextDescription(String description) implements SchemaInput {}
}

public record StructureResult(
    Status status,
    @Nullable JsonNode data,
    @Nullable String need,
    List<String> errors,
    String schemaOrigin,
    int iterations
) {
    public enum Status { OK, NEED_MORE_INPUT, STALE }
}
```

The Service can also be called directly by Brain code if there is no LLM caller in between (e.g., a REST endpoint that further processes a user request in a structured way). Tool and Service are the same functionality, just different access points.

### 2.3 Caller Pattern (Example: Arthur)

```
[Arthur LLM-Turn N]
  → Tool-Call: structure(prompt="...", schema="user-action-record", schemaMode="named")

[StructureService]
  → Result: { status: "need-more-input", need: "the timestamp of the action is not in the input" }

[Arthur LLM-Turn N+1]
  → Tool-Result appended, LLM sees the `need` text
  → respond(message: "I can build the entry — when did this happen?")

[User]
  → "today at 2:30 PM"

[Arthur LLM-Turn N+2]
  → Tool-Call: structure(prompt="<original> + today at 2:30 PM", schema="user-action-record", schemaMode="named")
  → Result: { status: "ok", data: { ... } }
```

**Important:** The `need` path is purely a Tool result form, not a separate `BLOCKED` status. Arthur (or whatever Engine) decides whether to ask the user, automatically retry, or abandon the call. The Tool itself is complete after each call.

---

## 3. Schema Modes

Three ways to specify the schema — all lead to a canonical JSON Schema representation (Draft 2020-12) before the Content Stage.

### 3.1 `json` — inline

Caller knows the schema. Fastest path — no LLM interaction in the Schema Stage.

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "type": "object",
  "title": "user-action-record",
  "description": "A single audit entry of a user-performed action.",
  "properties": {
    "userId":    { "type": "string", "pattern": "^[a-zA-Z0-9_-]{3,16}$" },
    "action":    { "type": "string", "description": "verb-phrase, snake-case, past tense" },
    "timestamp": { "type": "string", "format": "date-time" },
    "status":    { "type": "string", "enum": ["success", "failure"] },
    "tags":      { "type": "array", "items": { "type": "string" }, "uniqueItems": true }
  },
  "required": ["userId", "action", "timestamp", "status"],
  "additionalProperties": false
}
```

**Why JSON Schema and not a proprietary format:** JSON Schema Draft 2020-12 is the only schema language that all three major LLM providers accept as native Structured Output input (Anthropic `tools[].input_schema`, OpenAI `response_format.json_schema`, Gemini `responseSchema`). A proprietary format would always force a translation layer — and that costs correctness. Callers who prefer to formulate readably use `text` mode (§3.3).

### 3.2 `named` — from the Schema Registry

Caller only knows a name. The Tool loads the schema from the **Schema Registry** (see §5). Here, the **Manual** is added — a textual description provided to the LLM in the Content Stage as an additional system prompt block (domain knowledge that cannot be expressed in schema constraints).

Lookup cascade along Scope hierarchy: Project → Tenant → Bundled. First match wins, analogous to Recipes.

### 3.3 `text` — infer from Free Text

Caller provides a verbal description of the desired output:

> "I need `name` (string), `description` (string), and `priority` (integer 1-5) — all in English."

The Tool runs a **Schema Builder Stage**:

1.  Dedicated LLM call with system prompt "Convert the following description to JSON Schema 2020-12. Output only the schema, no prose."
2.  Provider Structured Output with **Meta-Schema** (schema describing valid JSON Schema — simplified subset, see §8.1) enforces form.
3.  Result is validated against the Meta-Schema using `JsonSchemaValidator`.
4.  On success: Schema is ready for the Content Stage. On failure: Loop reason to LLM, max 2 attempts; then `stale`.

**Caching:** Builder output is stored under `Hash(normalized text)` in a short-lived Mongo collection (`structure_schema_cache`, TTL 7 days). Saying "name (string), description (string), priority (integer)" twice does not burn LLM tokens twice.

**Schema Confidence:** Builder output includes a `confidence` field plus optional `clarifyingQuestions`. If `confidence < 0.8` or if clarifying questions exist, the Tool returns `need-more-input` with the question as the `need` text — without proceeding to the Content Stage.

---

## 4. Pipeline

```
┌────────────────────────────────────────────────────────────────────────┐
│ Schema Stage                                                            │
│   - json:    passthrough                                                │
│   - named:   Registry Lookup → Schema + Manual                          │
│   - text:    Schema Builder LLM Call → Schema                           │
│ On confidence deficit or builder failure → status=need-more-input/stale │
├────────────────────────────────────────────────────────────────────────┤
│ Content Stage (Loop, max maxLoops iterations)                           │
│   1. LLM Call with Provider Strict Output, input_schema = Schema'       │
│      (Schema' = oneOf[Schema, NeedSchema], see §4.2).                   │
│      System Prompt: Manual (if present) + `_need` convention.           │
│   2. Parse response.                                                    │
│      - Has _need field?      → return need-more-input                   │
│      - Else:                                                            │
│   3. Local Schema Validation (networknt/json-schema-validator)          │
│      against Schema (all constraints, including those not covered by    │
│      Provider Strict — pattern, minimum, maximum, format, …).           │
│      - Valid?                → return ok with data                      │
│      - Invalid?              → Compile reason, continue loop            │
│   4. Increment loop counter. If maxLoops exceeded:                      │
│      → return stale with aggregated errors                              │
└────────────────────────────────────────────────────────────────────────┘
```

### 4.1 Reason Preparation

On Validator failure, the Validator output (list of `ValidationMessage` with JSON Pointer and Constraint Type) is converted into an LLM-suitable reason:

```
The previous output did not conform to the schema:
- /priority: value must be ≤ 5 (was 7)
- /tags/2: value must match pattern "^[a-z][a-z0-9-]+$" (was "Camel-Case")
- /timestamp: value must match format "date-time"

Please correct these and try again. Do not change fields that were valid.
```

The reason is appended as a User Message to the (tool-internal, short-lived) conversation context; the previous LLM output remains as an Assistant Message so the LLM sees the error location before its correction attempt. This conversation context lives only for the duration of the Tool call — no persistence.

### 4.2 `_need` Convention

If the LLM recognizes that the prompt does not provide enough information for required fields, it responds with:

```json
{ "_need": "the timestamp of the action is not in the input" }
```

`_need` is an **out-of-band field** — the actual schema does not contain it. To keep Provider Strict Output active, the schema sent to the Provider becomes:

```json
{
  "oneOf": [
    <TargetSchema>,
    { "type": "object", "properties": { "_need": { "type": "string" } }, "required": ["_need"], "additionalProperties": false }
  ]
}
```

This makes `_need` a valid output path without diluting the Target Schema. The Service checks the output for `_need` existence **before** schema validation; if present, `need-more-input` is returned.

The System Prompt explicitly enforces the convention:

> If — and only if — the input does not contain enough information for a required field, output `{"_need": "<short description of what's missing>"}` and nothing else. Do not invent values to satisfy the schema.

---

## 5. Validation — Two Stages

### 5.1 Provider Strict Output (Stage 1)

The LLM Provider enforces schema conformity on the top-level structure:

| Provider | Mechanism | Restrictions |
|---|---|---|
| Anthropic | `tools[].input_schema` | Fully JSON Schema capable, but strictness classification softer than OpenAI; `pattern`/`minimum` are usually followed by the model but not strictly enforced |
| OpenAI | `response_format: { type: "json_schema", strict: true }` | Subset: no `pattern`, no `minimum`/`maximum`, no `minLength`. Only structural + `enum` + `required` |
| Gemini | `responseSchema` with `responseMimeType: application/json` | OpenAPI subset, own gaps for `format` and `pattern` |

Effect: 80-90% of all schema violations are caught at the Provider API — `type` mismatch, missing required fields, invalid `enum` values. Configuration runs via the langchain4j adapter layer.

### 5.2 Local Full Validation (Stage 2)

After Provider output, the result passes through a local JSON Schema validator (`networknt/json-schema-validator`, JSON Schema Draft 2020-12). Here, constraints not covered by the Provider Strict mode are also checked:

-   `pattern` (regex)
-   `minimum`, `maximum`, `exclusiveMinimum`, `exclusiveMaximum`, `multipleOf`
-   `minLength`, `maxLength`
-   `minItems`, `maxItems`, `uniqueItems`
-   `format` (`date-time`, `email`, `uri`, …)

Validator fail → Loop Reason (§4.1). Validator pass → `ok` with `data`.

**Both stages are necessary** and not redundant: Stage 1 guarantees well-formed JSON in the correct top structure (otherwise Stage 2 would have to handle free-text output, complicating the reason-loop logic). Stage 2 closes the Provider-specific gaps in semantic constraints.

---

## 6. Schema Registry & Manuals

Schemas with reuse value live in a **Schema Registry** with a cascade Project → Tenant → Bundled, analogous to Recipes:

```
vance-brain/src/main/resources/schemas/      # bundled
  user-action-record.json
  user-action-record.manual.md
  insight-record.json
  insight-record.manual.md
  ...

mongo: structure_schemas (collection)         # tenant + project overrides
  - tenantId, projectId, name, schema, manual, version
```

### 6.1 Manual File

For each schema, an optional `<name>.manual.md` file exists. Its content flows as an additional System Prompt block into the Content Stage:

```markdown
# user-action-record

A single audit entry of a user-performed action.

- `userId` is the login name (not the Mongo ID).
- `action` is a verb-phrase in past tense, lower-case, snake-case
  (e.g. `created_project`, `updated_settings`).
- `tags` is an open vocabulary; common tags are `auth`, `api`,
  `data-mutation`. Add more if useful.
- `timestamp` is the time the action happened, not the time of recording.
```

The Manual does not replace the schema descriptions (`description` fields in the schema) but provides **domain knowledge** that is difficult to express in constraints. The schema remains the formal truth, the Manual the linguistic clarification.

### 6.2 Registry API

```java
public interface StructureSchemaRegistry {
    Optional<RegisteredSchema> findByName(String name, ScopeContext scope);
    List<RegisteredSchema> listAvailable(ScopeContext scope);
}

public record RegisteredSchema(
    String name,
    JsonNode schema,
    @Nullable String manual,
    String version,
    String origin   // "bundled" | "tenant:<id>" | "project:<id>"
) {}
```

`origin` is included in the Tool result (`schemaOrigin`) — in case of conflicts ("we thought we'd get the bundled schema, but Tenant override won"), the caller sees which level applies.

### 6.3 Versioning

Schema updates are Major/Minor:
-   **Minor**: backward-compatible (new optional fields, relaxed constraints) — `version` jumps from `1.2` to `1.3`. Existing callers continue to receive `1.3` output, which is subset-compatible.
-   **Major**: breaking — new schema name (`user-action-record-v2`). Old schemas remain in the Registry. Auto-migration of old outputs is v2.

---

## 7. Recipe and Tool Integration

`structure` is **not a separate Recipe** — Tools are building blocks in Recipes, not standalone configurations.

### 7.1 Tool Pool Inclusion

Any Recipe that needs `structure` lists it in `allowedToolsAdd`:

```yaml
- name: arthur
  engine: arthur
  allowedToolsAdd: [structure, ...]
  promptPrefix: |
    ... You can use the `structure` tool to convert user input into
    structured records. Available named schemas: user-action-record,
    insight-record, ...
```

Whether the Tool is default for an Engine is decided by the Engine's Allowed Tool whitelist (see [think-engines §2](/specs/think-engines)).

### 7.2 Dedicated Model Configuration

The Service has two model touchpoints, both controllable via Settings/Aliases (see [llm-resource-management §3a](/specs/llm-resource-management)):

| Setting | Default | Purpose |
|---|---|---|
| `structure.model` | `default:fast` | Content Stage |
| `structure.schemaBuilderModel` | `default:fast` | Schema Builder Stage (`text` mode) |
| `structure.confidenceThreshold` | `0.8` | Cutoff for `need-more-input` from the Builder |
| `structure.requireProviderStrictOutput` | `true` | Disable only for models that cannot do this |

Settings follow the standard cascade Tenant → Project → Session.

---

## 8. What is NOT in v1

-   **Enforcing cross-field constraints from Manual text.** If the Manual says "if `status=failure`, `errorMessage` must be set", the Tool does **not** automatically translate this into schema `if/then` clauses. Such constraints belong in the schema itself.
-   **Schema inference from examples.** `text` mode is description-based. "Here are three JSON examples, give me the schema" is v2.
-   **Streaming Output.** JSON is delivered atomically.
-   **Multi-Record Aggregation.** One call → one JSON object. Lists → Caller chunks.
-   **Auto-retry with a different model.** If `default:fast` fails, it is **not** automatically escalated to `default:analyze` — the caller decides (e.g., a second Tool call with a different `model` override).
-   **Schema version migration.** If a schema in the Registry gets a major bump, callers must explicitly reference the new name. Auto-migration of old outputs is v2.
-   **Long-running variant as an Engine.** If a use case arises that requires background processing with an Activity Log (e.g., "structure 10,000 Inbox items in batches"), that is a separate Engine wrapper — not this Tool.

---

## 9. Open Issues

1.  **Meta-schema for the `text` Builder Stage.** We need a JSON Schema that describes valid JSON Schema Draft 2020-12 to strictly enforce the Builder output. A simplified subset is sufficient (object/array/string/number/integer/boolean + enum/pattern/range/required/additionalProperties). A complete meta-schema would be too rich for reliable LLM generation. First iteration in `vance-brain/src/main/resources/schemas/_meta-schema.json`.
2.  **Manual size limit & Prompt Caching.** If the Manual becomes long (domain definition over several pages), it inflates every Content Stage call. Anthropic prompt caching for the System Prompt block is necessary — cache key over schema name + version.
3.  **Confidence threshold of the Builder Stage.** Default `0.8` is chosen, not measured. Should be adjusted after initial deployment.
4.  **Schema Registry editor in the Web UI.** Currently only file/Mongo direct edit. Editor under `vance-face` is possible but not v1.
5.  **Observability.** Loop counter, average iteration count, most frequent reason categories per schema name — belongs in the Insights Editor (see [knowledge-graph](/specs/knowledge-graph)).
6.  **Provider Capability Detection.** Instead of hardcoding the assumption "OpenAI strict cannot do `pattern`", the langchain4j adapter layer should expose a capability bitset per Provider/Model, so the Tool can automatically remove unsupported constraints from the Provider schema during schema forwarding (they remain active for Stage 2).
7.  **Idempotency.** Two calls with identical `prompt` + `schema` should yield the same `data` (modulo LLM stochasticity). Caching the Content Stage analogous to the Builder Stage is considered but semantically trickier — the prompt often contains dynamic data that should be structured differently even with small wording differences. No cache on the Content Stage for now.

---

## 10. Relation to Other Specs

-   [server-tools.md](/specs/server-tools) — `structure` is a Built-in Server Tool (Spring Bean, code-only).
-   [structured-engine-output.md](/specs/structured-engine-output) — `respond` convention; `structure` must not be called in the same turn as `respond`.
-   [recipes.md](/specs/recipes) — Tool pool inclusion via `allowedToolsAdd`.
-   [llm-resource-management §3a](/specs/llm-resource-management) — Model aliases, prompt caching, per-call client instantiation.
-   [knowledge-graph.md](/specs/knowledge-graph) — Insight Records are a typical consumer; the caller writes the `data` into the KG itself.
-   [user-interaction.md](/specs/user-interaction) — if the caller wants to place the `data` in the User Inbox, that is their decision; the Tool itself only provides the JSON.
-   [mcp-tool-routing.md](/specs/mcp-tool-routing) — Delimitation from Client Tools; `structure` is server-side, no client routing.
