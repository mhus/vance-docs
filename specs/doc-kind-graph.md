---
title: "Vance — Document Kind `graph`"
parent: Specs
permalink: /specs/doc-kind-graph
---

<!-- AUTO-GENERATED from specification/public/en/doc-kind-graph.md — do not edit here. -->

---
# Vance — Document Kind `graph`

> Specifies the **`graph` payload** for documents that carry a (typically directed) graph: top-level `nodes` and `edges` arrays where edges are first-class entities with their own metadata. Layout matches the convention used by Cytoscape, GraphML/GEXF, vue-flow internally, and the JSON Graph Spec. Markdown is intentionally **not** supported on disk; only JSON and YAML.
> See also: [doc-kind-records](/specs/doc-kind-records) | [doc-kind-mindmap](/specs/doc-kind-mindmap) | [web-ui](/specs/web-ui)

---

## 1. Purpose

Use cases: dependency graphs, concept maps with real cross-links, small state machines, roadmap diagrams, anything where nodes are **m:n linked** and do not fit into a tree hierarchy.

Distinctions:
- **records**: tabular, without connections between rows.
- **tree**: strictly hierarchical, each node has exactly one parent.
- **mindmap**: special case of tree with a different renderer.
- **graph**: nodes + free edges between them, directed or not. Layout is calculated by the editor (or fixed by the user via drag).

**Design Principle:** Node IDs and edge structure are central. Edges are **first-class entities** at the top level (not as a sub-field of a node) — same convention as Cytoscape, vue-flow, GraphML. This allows clean encapsulation of edge metadata (label, color, later style/weight), and multi-graphs and self-loops can be naturally represented in the schema. Visual metadata (`label`, `color`, `position`) are all optional — a graph with only `nodes: [{ id }]` is valid.

**What this spec defines:**
- Node model (id, label?, color?, position?).
- Edge model as a top-level array (id?, source, target, label?, color?).
- Top-level `graph: { directed }` block.
- Format mapping JSON and YAML — no Markdown.
- Web-UI activation with `vue-flow` as renderer + editor.
- Backward compatibility rule for legacy Documents with `node.edges: string[]`.

**What it does not define:**
- Markdown form. Deliberately excluded — edges + position tuples + color in CSV-light would be unreadable and fragile for round-tripping. Markdown bodies with `kind: graph` fall back to the raw editor.
- Per-edge metadata (label, color, style). Edges are pure ID references in v1. Extensible, see §6.
- Per-edge direction. Direction is document-level (`graph.directed`), applies uniformly to all edges. Mixed-direction graphs are rare enough that v1 does not pay the complexity for them.
- Graph algorithms (shortest path, cycle detection, etc.). Pure data/edit layer; analysis is a separate spec item.

---

## 2. Node and Edge Model

### 2.1 Node

| Field      | Type                           | Required | Meaning                                                                   |
|------------|--------------------------------|----------|---------------------------------------------------------------------------|
| `id`       | `string`                       | **yes**  | Unique, stable identifier. Multiple occurrences are an error.             |
| `label`    | `string`                       | no       | Display name. If missing, the editor renders the `id`.                    |
| `color`    | `string` (HTML-Hex)            | no       | Node background/border. Format as in mindmap (`#rrggbb`/`#rgb`).          |
| `position` | `{ x: number, y: number }`     | no       | Persisted layout coordinates. Missing → Auto-layout on first render.      |

**ID Rules:**
- Required and non-empty (after trim).
- Unique within the Document — Codec throws `GraphCodecError("Duplicate node id: <id>")` on parse if two nodes have the same ID.
- Can contain letters, digits, `-`, `_`, `.`; technically, anything JSON/YAML accepts as a string is allowed. Recommendation: kebab-case or snake_case, not mandatory.
- When renaming in the UI (see §5.4): every edge that had the old ID as `source` or `target` is re-routed to the new one.

**Resilience on Read (Nodes):**
- Position missing or non-numeric: Auto-layout, no throw.
- Color in unknown format: Codec normalizes as in mindmap.
- Unknown per-node fields: remain in `node.extra`.

### 2.2 Edge

| Field    | Type               | Required | Meaning                                                                                 |
|----------|--------------------|----------|-----------------------------------------------------------------------------------------|
| `source` | `string`           | **yes**  | ID of a node — source node of the edge.                                                 |
| `target` | `string`           | **yes**  | ID of a node — target node. If `directed: true`, the arrow points here.                 |
| `id`     | `string`           | no       | Stable edge ID. Missing → Renderer/Editor synthesizes `<source>-><target>` as key; the `id` field remains absent on disk. |
| `label`  | `string`           | no       | Display text on the edge (vue-flow renders it in the middle of the line).               |
| `color`  | `string` (HTML-Hex)| no       | Stroke color; default is vue-flow's theme color.                                        |

**Edge Rules:**
- `source`/`target` must point to existing node IDs. An edge with an unknown ID remains in the Document (round-trip stable) but is not rendered by the editor — this prevents data loss if a target node is accidentally deleted; as soon as the node returns, the edge becomes visible again.
- **Self-loops** (`source === target`) are allowed in the schema. The v1 editor blocks them during manual connection via `onConnect`, but existing self-loops in the Document are rendered.
- **Multi-graphs** (multiple edges between the same pair) are allowed by the schema once `id` is explicitly set; without `id`, the editor blocks duplicates (same `source`+`target`).
- Unknown per-edge fields: remain in `edge.extra`, round-trip stable.

### 2.3 Top-Level

| Field             | Type                            | Required | Meaning                                                                    |
|-------------------|---------------------------------|----------|----------------------------------------------------------------------------|
| `kind`            | `string` = `"graph"`            | yes      | For dispatcher recognition.                                                |
| `graph.directed`  | `boolean`                       | no       | Default `true`. Determines whether the renderer shows arrowheads.          |
| `nodes`           | `Node[]`                        | yes      | List of all nodes. Order has no semantic meaning, round-trip stable.       |
| `edges`           | `Edge[]`                        | no       | List of all edges. Missing / empty = isolated nodes.                       |

Unknown top-level keys remain in `doc.extra` and are re-emitted verbatim when writing.

### 2.4 Backward-Compat: legacy `node.edges`

Earlier versions of this spec stored edges as `string[]` directly on the node. The codec continues to read this old format and automatically lifts the entries into the top-level `edges` array (each string becomes `{ source: <node.id>, target: <string>, extra: {} }`). Only the new format is produced when writing; a single save is sufficient for migration. Existing top-level `edges` entries take precedence over legacy `node.edges` in case of conflict.

**Canonical Form** (JSON):

```json
{
  "$meta": { "kind": "graph" },
  "graph": { "directed": true },
  "nodes": [
    { "id": "alice", "label": "Alice", "color": "#3b82f6", "position": { "x": 100, "y": 50 } },
    { "id": "bob",   "label": "Bob" },
    { "id": "carol" }
  ],
  "edges": [
    { "source": "alice", "target": "bob",   "label": "depends-on" },
    { "source": "alice", "target": "carol", "color": "#888" },
    { "source": "bob",   "target": "carol" }
  ]
}
```

**Header Convention per Format:** identical to [doc-kind-items](/specs/doc-kind-items) — both JSON and YAML carry `kind` in a `$meta` mapping at the top level. `graph: { directed }` remains as a structured top-level object outside of `$meta` (a nested object would be filtered by `JsonHeaderStrategy`/`YamlHeaderStrategy` anyway).

---

## 3. On-Disk Formats

### 3.1 JSON

```json
{
  "$meta": { "kind": "graph" },
  "graph": { "directed": true },
  "nodes": [
    { "id": "alice", "label": "Alice" },
    { "id": "bob",   "label": "Bob" }
  ],
  "edges": [
    { "source": "alice", "target": "bob" }
  ]
}
```

**Reading Rules:**
- `kind` from `$meta.kind` (with top-level fallback for legacy Documents).
- Top-level keys `graph?`, `nodes`, `edges?`. Other keys (except `$meta`) → `doc.extra`.
- `nodes` must be an array. Non-object entries are dropped (resilience).
- Per node: `id` is required (non-empty string); if missing, the node is dropped with a Codec warning.
- `edges` is an array of objects. `source` and `target` (strings) are required; without them, entries are dropped. Optional: `id`, `label`, `color`, plus arbitrary pass-through fields.
- Backward-Compat: legacy `node.edges: string[]` is automatically promoted to top-level Edges on read (see §2.4).

**Writing Rules:**
- 2-space indent.
- Top-level order: `$meta`, `graph`, `nodes`, `edges`, then `extra` pass-through.
- Node key order: `id`, `label`, `color`, `position`, then unknown pass-through keys.
- Edge key order: `id?`, `source`, `target`, `label?`, `color?`, then unknown pass-through.
- Fields that are not set are omitted (no `null` writing). Synthetic edge IDs (`<source>-><target>`) are **not** written to disk — `id` only appears if the user explicitly set it.
- `position` is only emitted if both axes are numbers.

### 3.2 YAML

```yaml
$meta:
  kind: graph
graph:
  directed: true
nodes:
  - id: alice
    label: Alice
  - id: bob
    label: Bob
edges:
  - source: alice
    target: bob
```

Single-Document: Top-level mapping with `$meta: { kind: graph }` as the first key, followed by `graph: { directed }`, `nodes` array, and `edges` array at the same level. Block-style mapping per node and edge.

### 3.3 Markdown

**Deliberately not supported.** Markdown bodies with `kind: graph` are rejected by the codec; the Web-UI offers **only the Raw Editor** and no Graph tab. If a graph is needed in Markdown, change the Document's MIME type to `application/json` or `application/yaml` and convert the body.

Justification in §1 under "What it does not define".

---

## 4. Server Path

Like list/tree/records: **no dedicated endpoint**, no server-side graph parser. Editor loads via `GET /documents/{id}`, parses in the browser, writes back via `PUT /documents/{id}`. `HeaderStrategy` automatically mirrors `kind: graph` to `DocumentDocument.kind`.

The `graph:` block and `nodes` array are transparent to the server — it sees them like all top-level JSON/YAML keys.

---

## 5. Web-UI

### 5.1 Editor Activation

- **`kind === 'graph'`** + Format ∈ {json, yaml} → Tabs `Graph` (Default) / `Raw`.
- **`kind === 'graph'`** + Markdown → only `Raw` editor, no Graph tab.
- Otherwise: only `Raw` editor as before.

When switching `Graph → Raw`, the parsed model is serialized back; when switching `Raw → Graph`, the codec re-parses the current body. Round-trip is idempotent.

### 5.1a Inline and Embedded Modes

`<GraphView>` has a `mode` prop with three values — `editor` (Default, fully editable), `inline` (read-only, from fence body), and `embedded` (read-only, from loaded Document). Spec analogous to Mindmap/Chart-View.

- **Inline** (` ```graph` fence in chat): `content` prop carries the body. The parser decides based on the first non-whitespace char: `{` → JSON, otherwise → YAML. Failures silently fall back to an empty graph — `console.warn` with the original error.
- **Embedded** (`vance:` link to a graph document): `document.inlineText` is parsed with the Document MIME type (Default: `application/json`).

In non-editor mode:
- Toolbar, side panel, and empty selection hint are hidden.
- `nodes-draggable`, `nodes-connectable`, `elements-selectable`, `edges-updatable` are pinned to `false` — vue-flow ignores user interaction except pan/zoom.
- `onNodesChange`/`onEdgesChange`/`onConnect`/`onKeyDown` are inert via `isEditor.value`-guard; defensive protection against vue-flow internal re-layout events.
- `emitDoc()` and `toggleDirected()` are no-ops — nothing is returned.
- Canvas height `22 rem` (min `16 rem`) instead of 65 vh — more compact for the chat viewport.

**Auto-Layout in read-only mode:** If **no** node has a `position` (typical for LLM-emitted inline-graphs), Dagre runs once in a `computed` (`layoutPositions`) and provides a `Map<nodeId, {x,y}>`. `vfNodes` uses this order: `node.position` → `layoutPositions.get(id)` → Grid fallback. As soon as **at least one** node has a position (user dragged it in the editor), the renderer respects this and skips auto-layout — mixing dagre + manual would produce unreadable mixed layouts.

**Save-as-Document** from the chat fence: via `InlineKindBox`-action, the body is persisted as `documents/graph-<ts>.json` with `application/json` (MIME type mapping in `extForKind`/`mimeForKind`). YAML bodies remain valid because JSON is syntactically a YAML subset.

### 5.2 Library

**vue-flow** (`@vue-flow/core`, MIT, Vue-3-native, ~80 KB minified):
- Node drag with auto-save of position.
- Drag-from-handle-to-create-Edge — the renderer has implicit in/out handles per node.
- Pan/Zoom built-in.
- Auto-layout for nodes without `position` during the initial render phase (vue-flow then positions at `(0,0)` and the user drags them into place — alternatively, a layouter like `dagre` can be integrated, which is v3).

DaisyUI has nothing comparable; writing a custom SVG renderer would be 2-3× more code for identical v1 functionality.

### 5.3 Functionality v1

| Feature                          | v1 | Note |
|----------------------------------|----|------|
| Render nodes + edges             | ✓  | vue-flow `<VueFlow>` |
| Pan / Zoom                       | ✓  | vue-flow built-in |
| Move nodes (Drag)                | ✓  | Position is persisted |
| Add nodes                        | ✓  | Toolbar button `+ Node`, default ID `node_<N>` |
| Rename nodes (id + label)        | ✓  | Side panel with two inputs |
| Delete nodes                     | ✓  | Side panel or `Delete` key on selection |
| Add edge                         | ✓  | Drag from node handle to target |
| Delete edge                      | ✓  | Click on edge + `Delete` key |
| Change node color                | ✓  | Side panel color input (HTML5 `<input type="color">`) |
| Per-edge label                   | ✓  | Side panel input when edge is selected |
| Per-edge color                   | ✓  | Side panel color picker when edge is selected |
| Auto-Layout (dagre)              | ✓v2| Toolbar button `Auto-Layout` recalculates all positions via `@dagrejs/dagre` — see §5.7. |
| Per-edge style (dashed/weight)   | ✗  | v3 |
| Subgraph / Cluster               | ✗  | v3 |
| Snap-to-Grid                     | ✗  | v3 |

(◯) = best-effort, not fully as spec'd

### 5.4 Components

- `<GraphView>` — Top-level. Receives `:doc: GraphDocument`, emits `update:doc`.
  - Holds local, mutable copies of `nodes` and `edges` (`localNodes`/`localEdges`).
  - Maps `GraphNode` → vue-flow-Node (`{ id, position, data: { label }, type: 'default', style? }`).
  - Maps `GraphEdge` → vue-flow-Edge (`{ id: edgeKey(e), source, target, label, type: 'default', markerEnd?, style? }`) — no adapter layer for the edge form, as `source`/`target` naming fits natively.
  - Listens to `@nodes-change` (position on drag-end, remove), `@edges-change` (remove), `@connect` (insert new Edge into `localEdges`).
  - Side panel on the right: for node selection, edit `id`/`label`/`color`+Delete; for edge selection, display `source → target` (read-only) plus edit `label`/`color`+Delete; without selection, a subtle hint.

### 5.5 Keyboard and Mouse

| Action                    | Operation |
|---------------------------|-----------|
| Move node                 | Drag |
| Create edge               | Drag from node handle (right/bottom) to target node |
| Select                    | Click on node or edge |
| Delete node/edge          | Select, then `Delete` or `Backspace` |
| Pan                       | Drag in empty canvas |
| Zoom                      | Mouse wheel |

### 5.6 Visual Conventions

- Canvas fills the editor content to 65 vh / min. 420 px height (analogous to Mindmap).
- Default theme: vue-flow's theme injected via CSS variables from DaisyUI — nodes with `hsl(var(--b1))` background, `hsl(var(--bc) / 0.4)` border.
- Selected node: stronger border stroke, primary color.
- Side panel on the right (or bottom on narrow viewports): inputs for ID, Label, Color, Delete button.
- Toolbar at the top: `+ Node`, `Auto-Layout`, `Directed`-checkbox, small hint text with operation cheat sheet.

### 5.7 Auto-Layout (v2)

Toolbar button `Auto-Layout` calls `@dagrejs/dagre` and recalculates node positions for **all** nodes — even those manually positioned by the user. Deliberately no "only undetermined positions" — mixing dagre-positioned and manual nodes produces ugly layouts.

Configuration v2:
- `rankdir: 'LR'` — Left-to-Right, readable for directed flow graphs.
- `nodesep: 50`, `ranksep: 90` — compact but airy enough for default node sizes.
- Node box size: 160×44 px, fits vue-flow default nodes.

Dagre provides center coordinates; the editor subtracts half the box size to fit vue-flow's top-left convention.

Future extensions (not v2): Direction dropdown (TB/BT/LR/RL), tweak sliders for nodesep/ranksep, manual protection of certain nodes against auto-layout. The library (~50 KB) is only included because it serves real use cases in v2.

---

## 6. Future (not v1, not v2)

### 6.1 Edge Style (dashed/weight/marker-types)

The current edge model carries `id`/`source`/`target`/`label`/`color`. Extensions would be `style: 'solid'|'dashed'|'dotted'`, `weight: number` (stroke width), or additional marker types (`markerStart`/`markerEnd` with arrow/diamond/circle). vue-flow supports this out-of-the-box; purely a UI extension.

### 6.2 Subgraphs / Clustering

Nodes can belong to a group (`group: <name>`). The renderer draws a bordered bounding box around all members. A separate spec item — storage and editor UX need clarification.

### 6.3 Per-Edge Direction

Today, direction is document-level. If real use cases emerge that require mixed direction: `edges: [{ to: id, directed: false }]` as an extension. The renderer draws undirected edges without an arrowhead.

### 6.4 Graph Algorithms

Cycle detection, topological sorting, reachability queries. This would be a separate toolchain at the GraphDocument layer — not an editor feature, more for Recipes/Tools that work with `kind: graph` Documents.

---

## 7. Open Points

- **Default layout for nodes without position:** vue-flow positions them at `(0,0)` and stacks them on top of each other. Acceptable for small graphs (≤ ~5 nodes); for larger ones, §6.1 dagre is the solution. Until then, a simple random spread (`x: i * 180`, `y: i * 90`) would automatically distribute nodes when added — sensible as an interim solution, left open here whether this is too hacky.
- **Color format:** canonical HTML-Hex as in mindmap (`#rrggbb`). Named colors and `rgb()`/`hsl()` are tolerated on read; Hex on write. Consistent across kinds.
- **ID validation in the UI:** On rename, uniqueness + non-empty must be checked, analogous to the Records schema editor. Default IDs for new nodes: `node_<N>` with smallest-free N.
- **Position persistence granularity:** Each drag-end event saves the new position and triggers an `update:doc` emit, which activates the Save button. In collaborative editing, this would create a save point per drag operation — okay for v1, as there is no real-time sync.
- **Bundle size:** vue-flow is ~80 KB minified (on top of the already ~1.2 MB documents bundle). Lazy-loading `<GraphView>` (and similarly `<MindmapView>`) would be a separate polish PR; v1 without.
