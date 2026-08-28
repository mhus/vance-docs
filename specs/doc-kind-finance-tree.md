---
title: "Vancetope — Document Kind `finance-tree`"
parent: Specs
permalink: /specs/doc-kind-finance-tree
---

<!-- AUTO-GENERATED from specification/public/en/doc-kind-finance-tree.md — do not edit here. -->

---
# Vancetope — Document Kind `finance-tree`

> Hierarchical financial modeling tool: a tree of income/expense nodes,
> which the system calculates **bottom-up** to a canonical **per-year** figure.
> For project financial planning, budgets, cashflow, and cost/revenue models — a
> *thinking/modeling* tool (calculating scenarios), **not** accounting.
> From the calculated model, interchangeable **Report Processors** generate output
> documents in existing Kinds (`sheet`, `chart`, `markdown`).
> See also: [doc-kind-sheet](/specs/doc-kind-sheet), [doc-kind-chart](/specs/doc-kind-chart)
> (Report target Kinds), [light-llm-service](/specs/light-llm-service) (assessment Report),
> [web-ui](/specs/web-ui) §7. Standalone Addon `vance-addon-brain-finance`.
> Implementation track: `planning/app-finance-tree.md`.

---

## 1. Purpose

A **`kind: finance-tree`** document is a tree of nodes. Each node carries
additive **Value Records** (amounts with period, optional interest) and is
summed **bottom-up**. A node's **sign** flips the entire subtree, so
an expense branch automatically subtracts positively entered amounts. The
result is a simple but hierarchical cost accounting.

Analogy **Compiler**: the `finance-tree` is the source (raw data in human
units), the mathematics (`FinanceCalculator`/`FinanceProjector`) the compiler,
report documents the compiled artifacts.

A `finance-tree` is **a single** document — versionable, exportable, embeddable via
`vance:`-URI. No Doc-per-node.

## 2. Data Model

### 2.1 Annual Invariant

1 year = **365 days = 12 months = 52 weeks**. From this: 1 month = 365/12 ≈ 30.42
days, 1 week = 365/52 ≈ 7.02 days. Everything is canonically normalized to **per year**;
day/week/month are divisions.

### 2.2 Nodes

| Field | Meaning |
|-------|---------|
| `name` | unique business key in the tree (Edges/Reports reference it) |
| `title` / `icon` / `color` | Display |
| `sign` | `+1` / `-1` — affects the **total contribution**: `total = sign × (Σ own Values + Σ children's Total)` |
| `description` / `notesRef` | Description + Ref to a notes document |
| `values` | List of Value Records |
| `children` | recursive sub-nodes |

An **expense branch** is a node with `sign: -1` over positively entered
children — no negative numbers need to be entered.

### 2.3 Value Record

| Field | Meaning |
|-------|---------|
| `value` | Base amount (required) |
| `mode` | `recurring` (rate, Default) \| `one_time` (lump sum at a date) |
| `period` | `{count, unit}`, unit ∈ `day\|week\|month\|year` — required for `recurring` |
| `validFrom` / `validTo` | ISO `yyyy-MM-dd`, optional; for `one_time`, `validFrom` is the date (required) |
| `sign` | optional per-record escape hatch (`+1`/`-1`), multiplies only this record |
| `interest` | optional `{rate (%), period, basis, compound}` — tracked **separately** from the base value |

`basis` ∈ `vom_hundert` \| `im_hundert` \| `auf_hundert`. **v1** implements only
`vom_hundert` (percentage of the base value); the others round-trip but are
calculated like `vom_hundert` (v2).

## 3. On-Disk Format & Web-UI

YAML canonical, JSON dual (`FinanceTreeCodec`, byte-stable model round-trip via
the `$meta`-header). The **Body** only holds **Input**; calculated values are under
`$computed` (derived, regenerable, never Source of Truth). A `version` field is
always set (v1: `1`; missing is read as `1`).

The YAML serialization prepends a fixed **comment header**, which immediately
orients Agent (in `document_read`) and human:

```yaml
# vance finance-tree v1 · amounts are per record; a node's sign flips its whole subtree
# agent: run manual_read('finance-tree') before interpreting · computed values under $computed
$meta:
  kind: finance-tree
version: 1
title: Q1 Finanzplanung
root:
  name: projekt
  sign: 1
  children:
    - name: einnahmen
      values:
        - { value: 50, period: { count: 3, unit: month }, interest: { rate: 5.0, period: { count: 1, unit: year } } }
    - name: ausgaben
      sign: -1
      values:
        - { value: 800, period: { count: 1, unit: month } }
        - { value: 5000, mode: one_time, validFrom: 2026-03-01 }
$computed:
  computedAt: 2026-07-24T10:00:00Z
  nodes:
    projekt: { perYear: -9400, perMonth: -783.33, perWeek: -180.77, perDay: -25.75, base: -9400, interest: 2.5, oneTimeSum: -5000 }
```

**Web-UI**: `kind: finance-tree` opens the `FinanceKind`-editor in Cortex
(Master-Detail): on the left, the tree (Select + CRUD + Reorder/Indent/Outdent), on the right
the detail panel of the selected node (fixed fields at the top, Value blocks below).
Topbar: **Reload** (calculate snapshot, Day/Week/Month/Year toggle) and
**Report** (Processor dropdown + Params → generate, inline or as document).

In the **Embed/Chat channel**, `FinanceSummaryView` renders a data-only card
(Net Annual Value + Top Nodes) with an "Edit" dialog (full editor) —
read-only via `GET /snapshot` (calculates without persistence).

## 4. Calculation Model

The mathematics exists **exactly once** (pure, deterministic, testable), never in a
Processor or Client.

**Snapshot (`FinanceCalculator`, "Reload").** Current value for "today":
RECURRING records whose validity window includes today, normalized to per year
(`value / period.years()`); interest **linear** on the base value
(`value × rate/100 / interestPeriod.years()`), shown separately; sign
rollup `total = sign × (Σ own + Σ children)`. `ONE_TIME` records do **not**
flow into the annual rate, but separately as `oneTimeSum`. The result is written back
to `$computed` as server-authoritative.

**Projection (`FinanceProjector`, Period Table).** Parameterized with
`from`/`to` + `granularity`; buckets are calendar-aligned, each value integrated
over the actual days per bucket. `ONE_TIME` lands in the bucket of its date; interest
**compounds** here (`base × (1+r)^n`) if `compound: true` + `validFrom` is set,
otherwise linear. Pure function of `(root, from, to, granularity)`, **on-demand, not
persisted** (persisted only as a Report document).

## 5. Report Processors

Two-layer architecture: **one** input Kind, **N** interchangeable Processors
(SPI `FinanceReportProcessor`, self-registered Beans; a Kit can contribute its own).
A Processor is **pure presentation** — it calls the shared math with the Params
and writes the Payload **through the Codec of the target Kind** (byte-identical).

| Processor | Target Kind | Content |
|-----------|-------------|---------|
| `table` | `sheet` | Period matrix (rows = nodes, columns = periods, Total) |
| `series` | `chart` | Time series per node, category X-axis, `chartType` line/bar/area/scatter |
| `assessment` | `markdown` | LLM-generated prose report via `LightLlmService` (Recipe `finance-report`, `internal: true`) — **no period**, snapshot with sign applied (expenses negative) |

`table`/`series` are pure; `assessment` is service-backed (receives Scope via
`ReportContext`). Discovery: `finance_report_processors` / `GET .../processors`.

## 6. LLM Tools + REST

**Tools** (`vance-addon-brain-finance`): `finance_tree_create`, `finance_node_add`
(Root without parentName, otherwise child), `finance_node_update`, `finance_node_remove`,
`finance_node_value_set`, `finance_tree_calc` (Reload), `finance_report_generate`
(inline or persist), `finance_report_processors`. Thin adapters over
`FinanceService` — Node/Value params go through the Codec grammar
(`FinanceTreeCodec.nodeFromMap`/`valueFromMap`), a grammar.

**REST** under `/brain/{tenant}/addon/finance/…`: `GET/PUT /tree`, `POST /create`,
`POST /calc`, `GET /project`, `POST /report`, `GET /processors` — with
`RequestAuthority`-Enforcement (READ/WRITE/CREATE).

Both interfaces delegate to the same `FinanceService`; the math is written and
tested once. (Script-API adapter is reserved, once pluggable JS tooling exists.)

## 7. Agent Understanding of Data

If the user asks for an assessment in chat, the Agent reads the tree via
`document_read` as YAML. Three interacting components:

1. **Manual** `_vance/manuals/finance-tree.md` — data model concise, on-demand via
   `manual_read('finance-tree')`.
2. **Engine-Prompt-Hook** `_vance/prompts/arthur/finance-tree.md` — Trigger + Tool-
   Syntax + `manual_read` reference.
3. **In-File-Comment-Hint** — the fixed YAML header (§3), visible in
   `document_read`.

## 8. Anti-Patterns / v1-Scope

- **Not** accounting/administration — a modeling tool (see `vision.md` §7).
- **Single-currency** (pure numbers); multi-currency/conversion is Out of Scope.
- A document holds up to ~hundreds of nodes; no pagination.
- **Interest v1**: only `vom_hundert`, Compound only in projection (not in snapshot).
- **v2**: the three "hundred" types, interest on `ONE_TIME` lumps, Script-API,
  Workbook-Embed/Compose regeneration.
