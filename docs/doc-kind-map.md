---
title: "Vance — Document Kind `map`"
parent: Documentation
permalink: /docs/doc-kind-map
---

<!-- AUTO-GENERATED from specification/public/en/doc-kind-map.md — do not edit here. -->

---
# Vance — Document Kind `map`

> Specifies the **`map` payload** for documents that carry geospatial features — markers (points), areas (polygons) and routes (polylines). Rendered in the Web-UI with Leaflet on top of OpenStreetMap tiles by default. JSON and YAML only on disk; markdown is intentionally **not** supported.
> See also: [doc-kind-graph](/docs/doc-kind-graph) | [web-ui](/docs/web-ui)

---

## 1. Purpose

Use cases: travel planning, neighborhood/location maps, simple geographical overviews (office operations, conference venues), route overviews for reports. **Not** a GIS tool — no contour lines, no layer management, no real-time tracks.

**Design principle:** Three feature types are sufficient for 95% of "I want a map with a few points" use cases:

- **Marker** — single point with optional title, color, description.
- **Area** — closed polygon (city boundary, region, zone).
- **Route** — line through an ordered list of waypoints. **As-the-crow-flies**, no street routing.

Locations are **dual-shape**: each position can be specified either as `place: "<Location Name>"` (LLM-friendly, geocoded server-side via Nominatim) or as `lat: X, lon: Y` (unambiguous). If both are set, explicit coordinates take precedence.

**What this spec defines:**
- Three feature models (Marker, Area, Route) with a common Location sub-model.
- View block for initial map position + zoom level.
- Format mapping JSON and YAML — no Markdown.
- Geocoding contract: `place` is resolved via `GET /brain/{tenant}/geocode?q=<name>`, server-side caching.
- Tile provider configuration via Settings `maps.tile.url` + `maps.tile.attribution` (Tenant cascade).
- Web-UI renderer with Leaflet.

**What it does not define:**
- Markdown form. Intentionally excluded — as with `graph`, a textual form would be unwieldy and fragile for round-tripping.
- Street routing. Routes are pure polylines between waypoints. True routing would require OSRM or similar; v2.
- Layer management, cluster markers, heatmaps, GeoJSON import. Out-of-scope.
- Interactive editing in v1 — the renderer is read-only. Editing is done via the Raw Code tab or via LLM tools (see `kind-map-tools` Manual, v2).

---

## 2. Schema

### 2.1 Marker

| Field         | Type                 | Required | Meaning                                                                |
|---------------|----------------------|----------|------------------------------------------------------------------------|
| `name`        | `string`             | no²      | Technical unique identifier. Stable — identity key.                    |
| `title`       | `string`             | no³      | Display name (tooltip, popup header). Alias: `label`.                  |
| `place`       | `string`             | no¹      | Free-text location name for geocoding (e.g., `"Hamburg Altona, Germany"`). |
| `lat`         | `number` (WGS84)     | no¹      | Latitude (-90 … 90).                                                   |
| `lon`         | `number` (WGS84)     | no¹      | Longitude (-180 … 180).                                                |
| `color`       | `string` (HTML-Hex)  | no       | Marker color (`#3b82f6` etc.). Activates the `circleMarker` variant.   |
| `description` | `string`             | no       | Popup body, single-line text.                                          |

¹ Either `place` OR `lat`+`lon` must be set. If both are present, coordinates take precedence. Markers without a position are discarded by the parser.
² If `name` is missing, the codec derives it from the slugified `title` (`"Hamburg Altona"` → `"hamburg-altona"`); if the title is also missing, it assigns `marker_<index>`. This allows LLM outputs that only provide a `label` to survive.
³ `label` is accepted as an alias for `title` — this is the field name an LLM intuitively chooses for "display name". In case of conflict, `title` wins. On disk, `title` is always written during re-serialization.

### 2.2 Area

| Field         | Type                      | Required | Meaning                                                    |
|---------------|---------------------------|----------|------------------------------------------------------------|
| `name`        | `string`                  | no²      | Technical unique identifier.                               |
| `title`       | `string`                  | no³      | Display name (tooltip, popup). Alias: `label`.             |
| `points`      | `Location[]`              | **yes**  | Ring vertices. Min. 3 points; otherwise the Area is dropped. |
| `color`       | `string` (HTML-Hex)       | no       | Border + fill color. Default `#3b82f6`.                    |
| `fillOpacity` | `number` (0…1)            | no       | Default 0.2.                                               |

`points` entries are objects with `place` OR `lat`/`lon` (same rules as for Marker, see §2.1).

### 2.3 Route

| Field       | Type                      | Required | Meaning                                                    |
|-------------|---------------------------|----------|------------------------------------------------------------|
| `name`      | `string`                  | no²      | Technical unique identifier.                               |
| `title`     | `string`                  | no³      | Display name. Alias: `label`.                              |
| `waypoints` | `Location[]`              | **yes**  | Ordered nodes. Min. 2; otherwise the Route is dropped.     |
| `color`     | `string` (HTML-Hex)       | no       | Line color. Default `#ef4444`.                             |
| `width`     | `integer` (Pixel)         | no       | Stroke width. Default 3.                                   |

**Important:** Routes are **as-the-crow-flies** between waypoints, not street routing.

### 2.4 View

| Field    | Type       | Required | Meaning                                                                    |
|----------|------------|----------|----------------------------------------------------------------------------|
| `place`  | `string`   | no       | Center location name (geocoding).                                          |
| `lat`    | `number`   | no       | Center latitude.                                                           |
| `lon`    | `number`   | no       | Center longitude.                                                          |
| `zoom`   | `integer`  | no       | OSM zoom level (0=world, 19=detail).                                       |

If the View block is missing (or the center cannot be resolved), the renderer zooms to the bounding box of all rendered features. If no features are renderable: world overview.

### 2.5 Top-Level

| Field      | Type          | Required | Meaning                                            |
|------------|---------------|----------|----------------------------------------------------|
| `kind`     | `"map"`       | yes      | Dispatcher recognition.                            |
| `view`     | `View`        | no       | Initial map position + zoom.                       |
| `markers`  | `Marker[]`    | no       | Point features.                                    |
| `areas`    | `Area[]`      | no       | Polygon features.                                  |
| `routes`   | `Route[]`     | no       | Polyline features.                                 |

Unknown top-level keys remain in `doc.extra` and are re-emitted verbatim when writing (same pattern as `graph`/`records`).

---

## 3. On-Disk Formats

### 3.1 JSON

```json
{
  "$meta": { "kind": "map" },
  "view": { "place": "Hamburg", "zoom": 11 },
  "markers": [
    { "name": "altona", "title": "Altona",
      "place": "Hamburg Altona, Germany",
      "color": "#3b82f6",
      "description": "Stadtteil im Westen" },
    { "name": "stpauli", "title": "St. Pauli",
      "lat": 53.5570, "lon": 9.9650 }
  ],
  "areas": [
    { "name": "hamburg", "title": "Hamburg",
      "points": [
        { "lat": 53.60, "lon": 9.70 },
        { "lat": 53.60, "lon": 10.30 },
        { "lat": 53.40, "lon": 10.30 },
        { "lat": 53.40, "lon": 9.70 }
      ],
      "color": "#10b981",
      "fillOpacity": 0.15 }
  ],
  "routes": [
    { "name": "hh-berlin", "title": "Hamburg → Berlin",
      "waypoints": [
        { "place": "Hamburg" },
        { "place": "Berlin" }
      ],
      "color": "#ef4444", "width": 4 }
  ]
}
```

### 3.2 YAML

```yaml
$meta:
  kind: map
view:
  place: Hamburg
  zoom: 11
markers:
  - name: altona
    title: Altona
    place: "Hamburg Altona, Germany"
    color: "#3b82f6"
    description: Stadtteil im Westen
  - name: stpauli
    title: St. Pauli
    lat: 53.5570
    lon: 9.9650
areas:
  - name: hamburg
    title: Hamburg
    points:
      - { lat: 53.60, lon: 9.70 }
      - { lat: 53.60, lon: 10.30 }
      - { lat: 53.40, lon: 10.30 }
      - { lat: 53.40, lon: 9.70 }
    color: "#10b981"
    fillOpacity: 0.15
routes:
  - name: hh-berlin
    title: "Hamburg → Berlin"
    waypoints:
      - place: Hamburg
      - place: Berlin
    color: "#ef4444"
    width: 4
```

### 3.3 Markdown

**Intentionally not supported.** Markdown bodies with `kind: map` are rejected by the codec; the Web-UI only offers the Raw editor. See §1 for reasoning.

---

## 4. Server Path

Like list/tree/records: **no dedicated endpoint for the Document**, no server-side Map parser. Editor loads via `GET /documents/{id}`, parses in the browser, writes back via `PUT /documents/{id}`.

**Geocoding Endpoint:** `GET /brain/{tenant}/geocode?q=<query>`. Implemented by `GeocodeService` (vance-brain), which calls Nominatim and caches results in-memory. Response: `GeocodeResult { lat, lon, displayName }` or 404 if not resolvable.

**Nominatim Policy Compliance:**
- Dedicated User-Agent including `vance.geocode.contact` setting (default `contact@vance.local`).
- One request per unique query; repetitions hit the process-wide cache.
- Read-timeout 10 s; errors are not cached.
- Mongo persistence of the cache is v2 (see §6).

---

## 5. Web-UI

### 5.1 Editor Activation (Cortex)

- **`kind === 'map'`** + Format ∈ {json, yaml} → Tabs `Map` (Default, read-only) / `Raw` (CodeEditor).
- Markdown body → only `Raw`.

Content editing in v1 is exclusively via the Raw editor (LLM or manual). Interactive drag/draw editing is v2 (see §6).

### 5.2 Inline + Embedded

`<MapView>` has a `mode` prop (`editor` | `inline` | `embedded`). For v1, all three modes are read-only — geometries are displayed, the user can pan and zoom, but not edit anything.

- **Inline** (` ```map` Fence in chat): `content` prop carries the body. Format detection: first non-whitespace char `{` → JSON, otherwise → YAML. Failures silently revert to an empty map (with `console.warn`).
- **Embedded** (`vance:` link to a map document): `document.inlineText` is parsed with the Document MimeType.

Height is mode-dependent — Editor 65 vh / min 420 px, Embedded 50 vh / min 22 rem, Inline 22 rem / min 16 rem.

### 5.3 Library

**Leaflet** (`leaflet@1.x`, BSD-2, Vue-3 compatible, ~150 KB minified, MapView chunk including own code 154 KB):
- Pan/Zoom built-in.
- Marker, Polygon, Polyline with Popups + Tooltips.
- Tile layer integration via `L.tileLayer(url, { attribution })`.
- No Vue wrapper library — `L.map()` is placed directly on a `<div ref>`, cleanup in `onBeforeUnmount`.

### 5.4 Tile Provider

Default: OpenStreetMap (`https://tile.openstreetmap.org/{z}/{x}/{y}.png` + `© OpenStreetMap contributors`). Allowed for browser-based, interactive single-user viewing — the load is distributed across client IPs (cf. §5.5).

Override per Tenant/Project:
- `maps.tile.url` — Tile URL template with `{z}/{x}/{y}` placeholders.
- `maps.tile.attribution` — HTML snippet that Leaflet renders as attribution.

Cascade: Project → `_vance` Tenant default → Hardcoded OSM defaults in the frontend. Storage: via `SettingService.getStringValueCascade(tenant, projectId, null, key)`.

**Delivery to browser:** `GET /brain/{tenant}/settings/cascade?projectId=X&key=maps.tile.url&key=maps.tile.attribution` (cf. `SettingsCascadeController`). Whitelist in the backend (`PUBLIC_CASCADE_KEYS`) prevents the endpoint from becoming generic. Frontend caches the response per `projectId` (`platform/projectSettings.ts`), `MapView` loads the config asynchronously in `onMounted` before Leaflet boots — fresh settings are applied on project change without re-login.

**Why not via Cookie?** The `vance_data` cookie is minted on login and cannot follow a project change within the session. The cookie remains user-scoped (`webui.*` plus `chat.language`).

### 5.5 OSM Tile Usage Policy

[`https://operations.osmfoundation.org/policies/tiles/`](https://operations.osmfoundation.org/policies/tiles/) — we comply:

| Requirement | Fulfillment |
|---|---|
| Unique User-Agent | Browser UA / WKWebView UA — no generic lib default |
| Valid Referer | Browser/WKWebView sends Referer to Vance domain |
| HTTP Caching ≥ 7 days | Browser respects Tile server headers |
| No Prefetching | Leaflet only loads viewport tiles |
| Attribution | Hardcoded into the renderer |

For very large, commercial deployments, the policy recommends a dedicated tile provider — the `maps.tile.url` setting is precisely for this purpose.

### 5.6 Component

`<MapView>` (`packages/vance-face/src/document/MapView.vue`):

- Receives `mode`, `doc` (editor mode), `content`+`meta` (inline) or `document` (embedded).
- Mounts Leaflet once in `onMounted`, cleans up in `onBeforeUnmount`.
- `watch(resolvedDoc)` triggers `redraw()` on Doc change.
- `redraw()` runs asynchronously (for geocoding); `renderToken` protects against race conditions between calculating resolutions and Doc changes.
- Marker with `color` → `L.circleMarker`. Without color → classic sprite icon.
- Unresolvable `place` entries land in `unresolved` ref and are listed as a warning below the map ("Could not resolve location for: …").

### 5.7 Geocoding Flow

1. Parser yields Locations with `place` and/or `lat`/`lon`.
2. `resolveLocation(loc)` first checks `hasCoords` → returns coordinates directly. Otherwise `needsGeocode` → calls `geocodePlace(place)`.
3. `geocodePlace` caches in-memory per page via `Map<query, Promise<GeocodeResult|null>>`. The first request triggers a `GET /brain/{tenant}/geocode?q=…`, subsequent requests wait for the same Promise.
4. Backend further caches in `GeocodeService` (in-memory, process-wide) — no Mongo, no TTL.

---

## 6. Future (v2+)

### 6.1 Interactive Editing
- Place/move markers by clicking.
- Draw polygons by click sequence.
- Reorder waypoints by dragging.
- LLM tools (`kind-map-tools` Manual) for `marker_add`/`marker_remove`/`marker_set_position`.

### 6.2 Persistent Geocode Cache
Mongo collection `geocode_cache` with TTL index. Prevents re-lookups after Brain restart and shares cache across multiple pods in the cluster.

### 6.3 Street Routing
Dedicated `RoutingService` with OSRM backend (or third-party provider). Routes get a `mode: straight | road` flag; default remains `straight`. Optional `roadDetail` field for expanded polyline points (cached).

### 6.4 GeoJSON Import/Export
Frontend action in the editor: upload GeoJSON file, convert to `kind: map` schema. Export in reverse.

### 6.5 Layer Management
Multiple tile layers, layer toggle (markers on/off, areas on/off). v1 draws everything in **one** Feature Group.

### 6.6 Minimum Required Fields
Schema validation with hard throw (instead of silent drop) for: empty marker name, invalid latitude (>90), polygon with < 3 points, route with < 2 points. v1 drops silently; v2 logs + UI hint.

---

## 7. Open Points

- **Position of fixed marker icons:** v1 uses the Leaflet default sprite for uncolored markers. This occasionally causes path issues (`marker-icon-2x.png`) in the bundler/Vite setup. If this occurs: switch to base64 / CDN via `L.Icon.Default.mergeOptions({...})`.
- **Marker clusters** for many points (>50). Leaflet plugin `markercluster` is standard, but an additional dependency — only integrate when a real use case arises.
- **Nominatim rate limit protection:** v1 has no server-side rate limiter per user. In case of abuse (LLM generating hundreds of `place` markers per second), Nominatim will block us before we notice. v2 should implement a simple `Semaphore(1)` over the service (sequentialization) plus a cap "max N upstream calls per minute per Tenant".
- **`description` format:** v1 is plain text with HTML escape. Markdown support in the popup would be nice, but is XSS-relevant (even if dompurify could handle it) — remains text for now.
