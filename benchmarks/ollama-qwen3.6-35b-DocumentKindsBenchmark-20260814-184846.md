# Vance Benchmark - ollama-qwen3.6-35b-DocumentKindsBenchmark-20260814-184846

- **Started:** 2026-08-14T18:48:46.337472Z
- **Judge:** gemini-gemini-2.5-pro
- **Total tests:** 5
- **Passed:** 3 / 5 (60%)
- **Average score:** 0.640
- **Total LLM time:** 143.3s
- **Total tokens (in / out):** 1.02M / 2.6k (20 round-trips)


## document-kinds

| Test | Pass | Score | Time | In | Out | Calls | Reason |
|------|------|-------|------|----|-----|-------|--------|
| `createsApplicationKind` | FAIL | 0.20 | 62.8s | 262.1k | 653 | 5 | kind=application at benchmark/calendar-app/_app.yaml (181 chars); judge: The candidate is missing the required calendar.lanes map. |
| `createsChartKind` | OK | 1.00 | 44.2s | 206.8k | 368 | 4 | kind=chart at benchmark/chart-sales.json (263 chars); judge: All required data points are present and correct. |
| `createsDiagramKind` | FAIL | 0.00 | 19.3s | 250.1k | 948 | 5 | kind=diagram at benchmark/diagram-login-flow.md — body must contain a parseable Mermaid flowchart (either inside a ```mermaid fence in markdown, or as a `source` string in a JSON/YAML body); structural miss: parsed as JSON/YAML but no `source` string holds the Mermaid DSL — head: --- $meta:   kind: diagram ---  flowchart TD     A[User] --> B[Login-Formular<br/>Benutzername + Passwort]     B --> C{Validierung}      C -- Ungültig<br/>Fehlermeldungen --> B     C -- Gültig --> D[A… |

<details><summary>artifacts</summary>

```
=== full body (309 chars) ===
---
$meta:
  kind: diagram
---

flowchart TD
    A[User] --> B[Login-Formular<br/>Benutzername + Passwort]
    B --> C{Validierung}

    C -- Ungültig<br/>Fehlermeldungen --> B
    C -- Gültig --> D[Authentifizierung]

    D -- Authentifizierung<br/>fehlgeschlagen --> C
    D -- Erfolgreich --> E[Dashboard]

```

</details>

| `createsGraphKind` | OK | 1.00 | 10.6s | 199.0k | 405 | 4 | kind=graph at benchmark/graph-diamond.json (341 chars); judge: Candidate correctly implements the required diamond graph structure. |
| `createsMindmapKind` | OK | 1.00 | 6.4s | 99.0k | 264 | 2 | kind=mindmap at benchmark/mindmap-languages.md (385 chars); judge: Candidate meets all structural and content requirements. |
