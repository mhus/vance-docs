# Vancetope — Run View

> A **Run View** (`runs.html`) displays the *instances* of all runtimes that produce them: Magrathea workflow runs, plan-shaped ThinkProcesses (Vogon, Marvin), and Damogran Compose runs. It never shows definitions — those have their own editors.
>
> Each runtime is behind the same SPI (`RunSource`), so list, detail, and control only know one case.
>
> See also: [workflows](workflows.md) | [vogon-engine](vogon-engine.md) | [marvin-engine](marvin-engine.md) | [damogran-system](damogran-system.md)

---

## 1. Definition vs. Instance

| | |
|---|---|
| **Definition** | The written artifact — workflow YAML, Vogon strategy, Compose manifest. Lives in the Document Layer. |
| **Run** | A running or completed instance thereof. Has a start, state, and end. |

The view is named `runs.html` and not `workflows.html`: "Workflow" is the definition, and once Vogon runs are included, the name would equate two different things.

---

## 2. `RunSource` — one SPI per runtime

```java
public interface RunSource {
    String sourceId();                                  // "workflow" | "process" | "compose"
    List<RunSummaryDto> list(tenantId, projectId, limit);
    Optional<RunDetailDto> get(tenantId, projectId, nativeId);
    default Set<RunAction> allowedActions(…) { return Set.of(); }
    default void perform(…) { throw new UnsupportedOperationException(); }
}
```

A pure interface without Spring dependency — an addon with its own runs can implement it. `RunSourceRegistry` collects the beans like `KindRegistry` collects the `KindHandler`s.

**Each implementation enforces its own authorization.** The facade does not consolidate this: Magrathea checks the project, the process view checks the Process resource, and merging would silently shift a permission boundary. The controller additionally checks `Project READ`.

A source that throws an exception is logged and skipped — a broken runtime must not empty the list.

**The two control methods have defaults**, so a new source only needs to implement the read side: `allowedActions` then reports an empty set, `perform` throws `UnsupportedOperationException` (the controller translates this to **501**). The three included sources override both — see §6.

### 2.1 Not every engine is a run

The process source does **not** filter by engine names, but queries the engine: `ThinkEngine.planShaped()` (default `false`). Vogon has phases, Marvin has a task tree — both have a plan that can be followed. Ford is an endless worker without a concept of progress, Arthur and Eddie are conversations.

The criterion is thus an engine property, not a list in the view that could become outdated.

---

## 3. Addressing

Composite key in URL and interface: `<source>:<native id>`, e.g., `workflow:2f1c…` or `process:6a7d…`.

The prefix is not decorative: a 32-hex run ID and a Mongo ObjectId are otherwise indistinguishable, and the view would have to guess which source to query. Only the **first** colon separates — a source may include colons in its own IDs.

---

## 4. Common Model

### 4.1 Status Vocabulary

Six values that all runtimes map to:

| Value | Magrathea | ThinkProcess | Compose |
|---|---|---|---|
| `RUNNING` | `RUNNING` | `INIT`, `RUNNING` | running |
| `WAITING` | — | `IDLE`, `BLOCKED` | — |
| `PAUSED` | `PAUSED` | `PAUSED`, `SUSPENDED` | — |
| `STOPPING` | — | — | termination requested |
| `DONE` | `DONE` | `CLOSED`+`DONE`/`AUTO_CLOSE` | completed without error |
| `FAILED` | `FAILED` | `CLOSED`+`INCOMPLETE`/`STALE` | completed with error |
| `STOPPED` | `TERMINATED` | `CLOSED`+`STOPPED`/`ARCHIVED`/`USER_DELETE`/`ABANDONED` | terminated |

The mapping is intentionally lossy. `IDLE` and `BLOCKED` are the same situation for the observer — "waiting for something external" —, and `SUSPENDED` is a halt like a pause, even if the Session owns it and not the user.

### 4.2 `RunDetailDto`

Four blocks that all sources can populate:

| Block | Magrathea | Vogon | Compose |
|---|---|---|---|
| `steps[]` | entered states + task result | `phaseHistory` + current phase | completed tasks |
| `variables` | `storeAs` variables | `flags` | — |
| `children[]` | sub-runs via parent pointer | `workerProcessIds` | — |
| `waitingOnInboxItemId` | Gate item | `pendingCheckpoint.inboxItemId` | — |

Additionally, `errorMessage` — for Magrathea, the reason from the terminal `StatusRecord`. The three ways a run can end without finishing otherwise look identical: someone stopped it, a deadline expired, the watchdog found it unresponsive ([workflows §12a](workflows.md)). A reader must be able to distinguish exactly these.

Also `links[]` (open definition, open session) and `extra` — a source-specific block rendered by its own component. Without it, a lowest-common-denominator effect would occur: Magrathea's start parameters, Vogon's engine and target, Compose's transience would disappear, even though that's precisely why the page was opened.

`allowedActions` indicates what the run offers **at this moment** (§6) — the UI renders its buttons based on this and does not need its own rule.

---

## 5. REST

```
GET /brain/{tenant}/runs?projectId=<p>&limit=<n>     → List<RunSummaryDto>, newest first
GET /brain/{tenant}/runs/{runId}?projectId=<p>       → RunDetailDto
GET  /brain/{tenant}/runs/sources?projectId=<p>      → active source IDs
POST /brain/{tenant}/runs/{runId}/actions/{action}?projectId=<p>&reason=<r>
                                                     → RunDetailDto (fresh state)
```

Project-scoped because this is the axis all sources share: a Magrathea run belongs directly to the project, a ThinkProcess via its Session. A run from an external project responds **404, not 403** — the same form as the workflow controller, so the endpoint does not become an existence test.

The action route requires **`Project WRITE`**, not `READ` — it changes something. Unknown verb → **400**, unknown run → **404**, a source without control → **501**. The freshly read detail state is always returned, not what the caller expected from the action.

**Two ways to do nothing — and they intentionally look different.**

- *Not applicable* ⇒ **No-op, no 409.** The button was rendered from a snapshot, and by the time the click arrives, the run may legitimately have progressed. Stopping an already stopped run is not an error.
- *Not visible* ⇒ **Rejection, 404.** `RunSourceRegistry.perform` filters like any read via `visibleTo`; a run that the source hides from this subject will not be touched for it either. The inverse case would be the worst of both: the effect occurs, and the response is still 404. Indistinguishable from "we don't know it" is intentional — the endpoint must not become an existence test.

The difference is not cosmetic: one says "it was already like that," the other "not yours." A no-op at this point would mislead a UI into thinking it had achieved something.

---

## 6. Control

`RunAction` is a closed vocabulary of three: `PAUSE` (start nothing new, finish what's running), `RESUME` (undo exactly that), `STOP` (pause, wind down what's windable, mark as completed). All three concern **execution** — the *record* of a run always survives.

Which of these are offered is derived by each source from the **current state**, not from a declaration per source. A completed run offers nothing, regardless of who produced it:

| Source | State | Offered |
|---|---|---|
| **process** | `INIT`/`RUNNING` | `PAUSE`, `STOP` |
| | `IDLE`/`BLOCKED` | only `STOP` — see below |
| | `PAUSED` | `RESUME`, `STOP` |
| | `SUSPENDED` | only `STOP` — the halt belongs to the **Session**; a second owner of the same state is how a state starts to flicker |
| | `CLOSED` | — |
| **workflow** | `RUNNING` | `PAUSE`, `STOP` |
| | `PAUSED` | `RESUME`, `STOP` |
| | `DONE`/`FAILED`/`TERMINATED` | — |
| **compose** | running | only `STOP` |
| | terminal / termination already requested | — |

**`IDLE` and `BLOCKED` do not offer pause**, for the simplest reason: `SessionLifecycleService.pauseProcess` only pauses what `isInterruptible` affirms — and these are exclusively `RUNNING` and `INIT`. A button that is rendered, pressed, and then remains without effect is worse than a missing one. It is also not the same as a rejection: that is received by someone who touches a run they are not allowed to see (§5).

**Compose knows no pause**: the runner executes a fixed task list and has no safe breakpoint — a button that silently does nothing would be worse than none. Termination is **cooperative**: the run remains `STOPPING` until the current task is finished.

`perform` is **idempotent** for every source: an unoffered action is a logged no-op, not an error.

## 6a. What v1 does not do

- **No deletion.** Neither per run nor as retention. For Magrathea, this would remove precisely the audit trail that the append-only design protects.
- **No live push.** Snapshot plus refresh button, like the Insights workflows tab.
- **No entry in `index.html`.** Accessible via deep links: from the Cortex flow view after start and from the Insights workflows tab.

### 6a.1 Compose runs are a time window

`ComposeRunRegistry` is an in-memory map: pod-local, capped, terminal runs swept away after ten minutes. There is no history.

This covers the case for which the view exists — "I just started something, where is it" — and nothing beyond. The detail page **names** the transience so that a disappeared run does not look like an error.

---

## 7. Relationship to the Insights Workflows Tab

The tab shows **definitions** from `_vance/workflows/` and their runs; it remains. The Run View shows **runs** from all sources, including those started from documents outside the Cascade path that never appear there. A link leads from the tab to each run.

Design history and action stages: `planning/runs-view.md`.
