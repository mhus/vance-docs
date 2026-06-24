---
title: "Vance — Document Kind `chart`"
parent: Documentation
permalink: /docs/doc-kind-chart
---

<!-- AUTO-GENERATED from specification/public/en/doc-kind-chart.md — do not edit here. -->

---
# Vance — Document Kind `chart`

> Specifies the **`chart` payload** for documents that carry one or more data series with chart-rendering metadata. **One kind for all chart types** — the variant (`line`, `bar`, `candlestick`, …) is a discriminator inside the document, not a separate kind. Only JSON and YAML; Markdown is intentionally not supported.
> See also: [doc-kind-graph](/docs/doc-kind-graph) | [doc-kind-records](/docs/doc-kind-records) | [doc-kind-sheet](/docs/doc-kind-sheet) | [web-ui](/docs/web-ui)

---

## 1. Purpose

Use cases: Time-series charts (Line/Area), comparison charts (Bar), distributions (Pie/Donut), correlations (Scatter), financial/OHLC data (Candlestick), density visualizations (Heatmap). Embedded in reports, delivered as Worker output, manually maintained in a Project doc pool.

Distinctions:
- **records**: Tabular without visualization. If the table should have a chart, the chart lives as its own `kind: chart` document, which references the records or duplicates the values.
- **sheet**: 2D sheet with formulas, not intended for visualization.
- **graph**: Nodes + edges, not a numerical data diagram.
- **data**: Unstructured storage. To get a chart, use **this** Kind and not `data` with an ad-hoc structure.

**Design Principle — One Kind, Many Chart Types.** All data diagrams share the same document shape (axes, series, title, legend). The specific type is a field (`chart.chartType`), not a separate Kind. Rationale: the data model is almost identical across types; a user who switches a Line chart to Bar changes one field — no Kind change, no file change. Established libraries (ECharts, Plotly, Vega) do the same.

**Design Principle — Lean custom schema, ECharts option as escape hatch.** We define a custom mini-schema (10-12 fields) in `vance-api` that the Vance Face renderer maps to an ECharts option. Rationale:
- Grafana spec is coupled to panel data sources — we have static document content, not a pull query.
- Vega-Lite is academically clean but too cumbersome for LLM generation (grammar-of-graphics concepts complicate clean YAML generation).
- Raw ECharts option is too library-specific and verbose (~50 fields); we don't want to rewrite all docs if the library changes.
- Custom schema covers 80% of use cases and is AI-friendly; power users get `echartsOptionOverride` as a deep-merge slot.

**What this spec defines:**
- Top-level block `chart` with `chartType` and display metadata.
- Axis model (`xAxis`, `yAxis`).
- Series model with `chartType` discriminator (document-level; v2 allows per-series override).
- Data point shapes per chart type — a closed table.
- Format mapping JSON and YAML — no Markdown.
- Web UI activation with Apache ECharts as renderer.
- Escape hatch `echartsOptionOverride` for power users.

**What it does not define:**
- Markdown form. Deliberately excluded — chart data as CSV-light would be readable, but axis/series configuration would not. Documents with `kind: chart` + Markdown only get the raw editor.
- Data source bindings (live-pull from Records, SQL queries, external APIs). v1 is static; documents carry their data inline. Live bindings are §6.
- Interactive chart features (cross-filter, brush selection, drilldown). v1 is display-only with tooltip + dataZoom for time series.
- Per-document theming beyond colors per series. Theme comes from the DaisyUI layer.
- Chart composition (multiple charts in one document). One document = one chart. Multiple charts = multiple documents.

---

## 2. Data Model

### 2.1 Top-Level

| Field                   | Type                         | Required | Meaning                                                              |
|-------------------------|------------------------------|----------|----------------------------------------------------------------------|
| `kind`                  | `string` = `"chart"`         | yes      | For dispatcher recognition.                                          |
| `chart`                 | `ChartHeader`                | yes      | Chart metadata (type, title, legend, theme hints).                   |
| `xAxis`                 | `Axis`                       | no       | X-axis. Default `{ type: 'category' }`. Ignored for pie/donut.       |
| `yAxis`                 | `Axis`                       | no       | Y-axis. Default `{ type: 'value' }`. Ignored for pie/donut.          |
| `series`                | `Series[]`                   | yes      | At least one series. Data point shape depends on `chartType`.        |
| `echartsOptionOverride` | `object`                     | no       | Raw ECharts option, deep-merged onto the generated option (escape hatch). |

Unknown top-level keys remain in `doc.extra` and are re-emitted verbatim when writing (analogous to all other Kinds).

### 2.2 ChartHeader

| Field        | Type                        | Required | Meaning                                                                                  |
|--------------|-----------------------------|----------|------------------------------------------------------------------------------------------|
| `chartType`  | `enum`                      | **yes**  | One of `line`, `bar`, `area`, `scatter`, `pie`, `donut`, `candlestick`, `heatmap`.       |
| `title`      | `string`                    | no       | Display title above the chart.                                                           |
| `subtitle`   | `string`                    | no       | Second line below the title, rendered smaller.                                           |
| `legend`     | `boolean`                   | no       | Default `true`. Toggles the legend on/off.                                               |
| `stacked`    | `boolean`                   | no       | Default `false`. Only relevant for `bar`/`area`/`line` — series are stacked.             |
| `smooth`     | `boolean`                   | no       | Default `false`. Only for `line`/`area` — cubic spline interpolation instead of polyline. |

### 2.3 Axis

| Field        | Type                                          | Required | Meaning                                                                              |
|--------------|-----------------------------------------------|----------|----------------------------------------------------------------------------------------|
| `type`       | `enum` `category` \| `value` \| `time` \| `log` | no       | Default `category` for `xAxis`, `value` for `yAxis`.                                  |
| `label`      | `string`                                      | no       | Axis label.                                                                            |
| `min`        | `number`                                      | no       | Forces the lower limit (otherwise auto).                                               |
| `max`        | `number`                                      | no       | Forces the upper limit (otherwise auto).                                               |
| `categories` | `string[]`                                    | no       | Only for `type: category` — explicit category order. Otherwise from data points.       |

`type: time` interprets the X-values of data points as ISO-8601 strings or Unix milliseconds. `type: log` requires positive values; for negative values, a codec warning + fallback to `value`.

### 2.4 Series

| Field   | Type                | Required | Meaning                                                                                      |
|---------|---------------------|----------|------------------------------------------------------------------------------------------------|
| `name`  | `string`            | **yes**  | Display name in the legend and tooltip. Unique per document.                                   |
| `color` | `string` (HTML-Hex) | no       | Color of the series. Missing → ECharts theme palette.                                          |
| `data`  | `DataPoint[]`       | **yes**  | At least one data point. Shape depends on `chart.chartType` — see §2.5.                        |

Per-series override of `chartType` (mixed types like Line-on-Bar) is v2 — see §6.

### 2.5 Data Point Shapes per Chart Type

| `chartType`     | Object Form                                          | Tuple Form (alternative)            |
|-----------------|------------------------------------------------------|------------------------------------|
| `line` / `bar` / `area` | `{ x: string\|number, y: number }`           | `[x, y]`                           |
| `scatter`       | `{ x: number, y: number, size?: number }`            | `[x, y]` or `[x, y, size]`       |
| `pie` / `donut` | `{ name: string, value: number, color?: string }`    | —                                  |
| `candlestick`   | `{ t: string\|number, o: number, h: number, l: number, c: number, v?: number }` | `[t, o, h, l, c]` or `[t, o, h, l, c, v]` |
| `heatmap`       | `{ x: string\|number, y: string\|number, v: number }` | `[x, y, v]`                       |

**Rules:**
- Both forms are equivalent in the codec. When reading, tuple-form points are internally normalized to object form; when writing, the form in which the data point was received wins (round-trip stable per point). Mixing within a series is allowed.
- `chartType` and `data` shape must match. Mismatch (e.g., `chartType: candlestick` with `{x, y}` points) → `ChartCodecError("Data shape does not match chartType: <type>")` during parsing.
- `pie`/`donut` have **no** axis semantics; `xAxis`/`yAxis` are ignored (codec drops warnings).
- For `time` axes: `x`/`t` is an ISO-8601 string (`2024-01-02` or `2024-01-02T15:30:00Z`) or Unix milliseconds (`1704153600000`). Inconsistent types within a series → codec warning, fallback to string sort.

### 2.6 Canonical Form (JSON)

```json
{
  "$meta": { "kind": "chart" },
  "chart": {
    "chartType": "line",
    "title": "Daily Active Users",
    "legend": true,
    "smooth": true
  },
  "xAxis": { "type": "time", "label": "Date" },
  "yAxis": { "type": "value", "label": "DAU" },
  "series": [
    {
      "name": "Web",
      "color": "#3b82f6",
      "data": [
        { "x": "2024-01-01", "y": 1200 },
        { "x": "2024-01-02", "y": 1340 },
        { "x": "2024-01-03", "y": 1280 }
      ]
    },
    {
      "name": "Mobile",
      "color": "#10b981",
      "data": [
        ["2024-01-01", 800],
        ["2024-01-02", 920],
        ["2024-01-03", 1010]
      ]
    }
  ]
}
```

**Header Convention per Format:** identical to [doc-kind-graph](/docs/doc-kind-graph) — both JSON and YAML carry `kind` in a `$meta` mapping at the top level. Structured top-level objects (`chart`, `xAxis`, `yAxis`, `series`) remain outside of `$meta`.

---

## 3. On-Disk Formats

### 3.1 JSON

See §2.6 for the canonical form.

**Reading Rules:**
- `kind` from `$meta.kind` (with top-level fallback for legacy documents).
- Top-level keys `chart`, `xAxis?`, `yAxis?`, `series`, `echartsOptionOverride?`. Other keys (except `$meta`) → `doc.extra`.
- `chart.chartType` is required and must be from the enum; otherwise, a codec error.
- `series` must be an array of objects with at least one entry. For each series, `name` and `data` are required; entries without them are dropped.
- Data points: for each series, the shape is validated against `chartType` (see §2.5). Individual malformed points are dropped with a codec warning; the series survives if at least one point remains valid.
- `echartsOptionOverride` is **not** parsed-validated; whatever is in it is fed directly into ECharts during rendering (`merge` strategy). The document owner is responsible for valid ECharts options.

**Writing Rules:**
- 2-space indent.
- Top-level order: `$meta`, `chart`, `xAxis`, `yAxis`, `series`, `echartsOptionOverride`, then `extra` pass-through.
- Series key order: `name`, `color?`, `data`, then unknown pass-through keys.
- Data points: for each point, the input form (object or tuple) wins. For code modification (e.g., a new point inserted from the UI), object form is used.
- Fields that are not set are omitted (no `null` writing).

### 3.2 YAML

```yaml
$meta:
  kind: chart
chart:
  chartType: candlestick
  title: AAPL 2024
xAxis:
  type: time
  label: Date
yAxis:
  type: value
  label: USD
series:
  - name: AAPL
    data:
      - { t: 2024-01-02, o: 187.15, h: 188.44, l: 183.89, c: 185.64, v: 82488700 }
      - { t: 2024-01-03, o: 184.22, h: 185.88, l: 183.43, c: 184.25, v: 58414500 }
      - [2024-01-04, 182.15, 183.09, 180.88, 181.91, 71983600]
```

Single-document: Top-level mapping with `$meta: { kind: chart }` as the first key, followed by `chart`, `xAxis?`, `yAxis?`, `series`, `echartsOptionOverride?` at the same level. Block style for top-level structures, flow style allowed for compact data points (see example above).

### 3.3 Markdown

**Deliberately not supported.** Markdown bodies with `kind: chart` are rejected by the codec; the Web UI offers **only the raw editor** and no chart tab. Rationale in §1 under "What it does not define".

---

## 4. Server Path

Like graph/data/sheet: **no dedicated endpoint**, no server-side chart parser/renderer. Editor loads via `GET /documents/{id}`, parses in the browser, writes back via `PUT /documents/{id}`. `HeaderStrategy` automatically mirrors `kind: chart` to `DocumentDocument.kind`.

Server-side rendering (e.g., PNG export for reports) is not v1 — see §6.

`chart`/`xAxis`/`yAxis`/`series` blocks are transparent to the server; it sees them like all other top-level JSON/YAML keys.

---

## 5. Web UI

### 5.1 Editor Activation

- **`kind === 'chart'`** + Format ∈ {json, yaml} → Tabs `Chart` (Default) / `Raw`.
- **`kind === 'chart'`** + Markdown → only `Raw` editor, no Chart tab.
- Otherwise: only `Raw` editor.

When switching `Chart → Raw`, the parsed model is serialized back; when switching `Raw → Chart`, the codec reparses the current body. Round-trip is idempotent. In case of a parse error, the Chart tab shows a focused error card (same style as [doc-kind-data §5.5](/docs/doc-kind-data)).

### 5.2 Library

**Apache ECharts** (`echarts`, MIT, ~1 MB minified with tree-shakable v5 import):
- **Native Candlestick** (`series.type: 'candlestick'`) including OHLC tooltip; volume overlay as a second series is possible.
- All v1 chart types out-of-the-box: line, bar, area (`line` + `areaStyle`), scatter, pie, candlestick, heatmap.
- Declarative option object — clean mapping from the Vance chart schema.
- Pan/Zoom (`dataZoom` component), tooltip, legend built-in.
- DaisyUI theme integration via CSS variables (background/text colors from `--b1`/`--bc`).

**No Vue wrapper** (`vue-echarts`): direct `echarts.init()` call on a DOM ref is sufficient for v1 and avoids an additional library with its own release cadence. In `<script setup>`, ECharts is initialized on `onMounted`, disposed on `onBeforeUnmount`.

Alternatives considered and rejected:
- **Chart.js**: Candlestick only via external plugin (`chartjs-chart-financial`), insufficiently maintained.
- **Plotly.js**: ~3 MB bundle, too much overhead for our use cases.
- **Vega-Lite**: nice standard, but Candlestick requires manual layer construction — bad for LLM-generated charts.
- **Lightweight Charts** (TradingView): great for OHLC, but only financial charts.

### 5.3 Feature Set v1

| Feature                              | v1  | Note |
|--------------------------------------|-----|------|
| Render all v1 chart types            | ✓   | line, bar, area, scatter, pie, donut, candlestick, heatmap |
| Tooltip on hover                     | ✓   | ECharts standard, formatted per chart type |
| Toggle legend                        | ✓   | Click on legend entry hides series |
| Pan/Zoom on time axis                | ✓   | `dataZoom` slider below the chart for `xAxis.type === 'time'` |
| Theme hook to DaisyUI                | ✓   | Background/text from CSS variables |
| Side panel: Change ChartType         | ✓   | Dropdown in toolbar (line/bar/area/…) — writes `chart.chartType` |
| Side panel: Title, Legend, Stacked   | ✓   | Inputs in toolbar |
| Side panel: Change axis type         | ✓   | xAxis/yAxis `type` dropdown |
| Per-series color picker              | ✓   | HTML5 `<input type="color">` |
| `echartsOptionOverride` editor       | ✓   | Mini JSON textarea in toolbar (power users) |
| Edit data points in UI               | ◯   | best-effort: for pie/bar add-row dialog; for time-series editing via Raw tab |
| Live data binding (Records / SQL)    | ✗   | v2, see §6 |
| Server-side PNG export               | ✗   | v2 |
| Cross-chart brush / drilldown        | ✗   | v3 |

(◯) = best-effort, not fully as spec'd

### 5.4 Components

- `<ChartView>` — Top-level. Receives `:doc: ChartDocument`, emits `update:doc`.
  - Holds a local, mutable copy of `chart`/`xAxis`/`yAxis`/`series`.
  - Maps the Vance schema → ECharts option via `chartSchemaToEChartsOption(doc)` (pure function in `@vance/shared/chart`).
  - Initializes ECharts in `onMounted`, calls `chart.setOption(option, true)` on schema change, disposes in `onBeforeUnmount`.
  - Merges `echartsOptionOverride` via `lodash.merge` over the generated option (document override wins).
  - Side panel on the right: global chart properties (Type, Title, Legend, Axes); when a series is selected (click on legend), Color + Name are editable.
  - Toolbar at the top: `+ Datapoint` (for pie/bar), `+ Series`, `Reset Zoom`, hint to Raw tab for complex edits.

- `<ChartTypePicker>` — Dropdown with icon buttons per chart type, switches `chart.chartType`. When switching, data points are validated against the new shape; if it doesn't fit, a warning dialog shows the incompatibility and offers "Discard data, change type" vs. "Cancel".

### 5.5 Visual Conventions

- Chart container fills editor content to 65 vh / min. 420 px height (analogous to Mindmap/Graph).
- Default theme: ECharts with dynamically calculated colors from DaisyUI CSS variables — background `hsl(var(--b1))`, text `hsl(var(--bc))`, grid lines `hsl(var(--bc) / 0.1)`.
- Series default palette: ECharts standard, overridden per series via `color` field.
- Side panel on the right (or bottom on narrow viewports): properties, structured into sections "Chart", "X-Axis", "Y-Axis", "Series".
- Toolbar at the top: ChartType picker, "Reset Zoom", hint text with cheat sheet for operation.

### 5.6 Changing Chart Type

Data point shapes differ per chart type (§2.5). When switching via the side panel, `<ChartView>` checks:

1. Are the existing data points **compatible** with the new type?
   - `line` ↔ `bar` ↔ `area` ↔ `scatter` → yes, all share `{x, y}`.
   - `pie` ↔ `donut` → yes, both use `{name, value}`.
   - Switching between groups → **no** (e.g., line → pie requires different data points).
2. In case of incompatibility: Modal with two options — "Discard data and change type" or "Cancel". No auto-mapping (e.g., line → pie would guess `{name=x, value=y}` — error-prone and degrades LLM training signal).

---

## 6. Future (not v1)

### 6.1 Live Data Binding

`series.data` becomes `series.dataRef: { document: <docId>, query: <path> }` — the renderer loads another document (e.g., a `kind: records`) at render time and projects it onto the data points. This allows the chart to live on the source data and not require manual updates when data changes. A separate spec point, as query language (JSONPath? jq subset? Records column selector?) and caching/refresh semantics need to be clarified.

### 6.2 Per-Series-ChartType (Mixed Charts)

`series[i].chartType` overrides the document-level `chart.chartType` for that one series. Use case: volume bar below candlestick, line trend over bar comparison. v2 extension; v1 only requires the document-level field because 80% of charts are single-type.

### 6.3 Server-Side Rendering (PNG/SVG Export)

For reports, email embedding, external linking. ECharts can be rendered on the server via Node-Canvas (`echarts-server-renderer` or similar). A separate spec point, as the server pipeline (`vance-brain`) currently has no browser libraries and either a Node sidecar or a JVM-based renderer (JFreeChart?) must be added.

### 6.4 Additional Chart Types

- **Radar** — same shape change effort as pie/heatmap; will come when a use case arises.
- **Boxplot** — 5-number summary per data point, ECharts supports it natively.
- **Treemap** / **Sankey** — tree or node-link structure, different data point shape (recursive / nodes+edges). Worth considering: whether Sankey should rather live in `kind: graph` with a Sankey render variant.
- **Gauge** / **Funnel** — rare, later.

### 6.5 Annotations and Markers

`markPoint`/`markLine` on Series — e.g., "Release date as vertical line", "Min/Max marker". ECharts supports this natively; only schema extension in the Vance schema is needed.

### 6.6 Recipe Tool: chart_create

A `chart_create(documentName, chartType, series)` tool for Workers that creates a chart as a document from the Recipe. Today, Workers can do this via `doc_create(kind="chart", …)` with a YAML body, but a typed tool would be more LLM-friendly. Follows the pattern of the existing `doc_create` routine.

---

## 7. Open Points

- **Default format when creating:** `.json` or `.yaml`? Suggest YAML — consistent with `data`/`graph`, more compact, reliably generated by LLMs.
- **Tuple form vs. object form as default for UI insert:** If the user adds a data point via UI, the codec writes object form (more readable). For large datasets (e.g., > 200 points), tuple form would be more compact — UI could automatically switch above a threshold. v1: always object form for UI insert; LLM output with tuple form is preserved.
- **`echartsOptionOverride` validation:** Raw ECharts options are fed at render time; typos lead to silent render defects, not codec errors. Acceptable as an escape hatch — those who use it know what they are doing. Optional lint warning in the side panel is polish.
- **Bundle size:** ECharts is tree-shakable with v5 modular import (~600 KB for our chart set) — vs. full build ~1.1 MB. We import modularly (`echarts/core` + specific charts and components). Lazy loading of `<ChartView>` analogous to `<MindmapView>`/`<GraphView>` is v1.
- **Time format ambiguity:** `2024-01-02` (date-only) vs. `2024-01-02T15:30:00Z` (datetime). ECharts handles both; codec does not normalize. If LLMs mix, the tooltip format string can appear inconsistent — polish point.
- **Incompatible ChartType change:** Current solution requires "Discard data or cancel". A "Transform data if possible" mode (e.g., line → pie aggregates over X-axis) would be smarter, but this opens up aggregation logic complexity that is not necessary in v1.
