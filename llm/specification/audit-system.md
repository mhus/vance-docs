# Vance — Audit System

> Central audit pipeline for Vance Server (Brain + Anus). Producers emit typed audit events; an `AuditService` normalizes, buffers, and fans them out to a configurable list of `AuditConsumer` implementations. Synchronous or asynchronous, switchable at runtime, with a bounded queue + drop counter and guaranteed drain on shutdown.
>
> See also: [llm-resource-management](llm-resource-management.md) | [identity-credentials](identity-credentials.md) | [settings-system](settings-credentials.md)

---

## 1. Purpose & Scope

**Problem.** Various parts of the system already emit, or will want to emit, operations that are relevant for security and compliance review:

- Login/Logout, failed authentication attempts, token refresh
- Settings changes (Vault crypto, model aliases, bootstrap flags)
- Project/Tenant lifecycle (Create, Delete, Owner change)
- Permission grants & denies, role changes
- Vault access (PASSWORD setting decrypt, Keystore read)
- Kit Install/Update/Apply, code execution (scripts, tool calls with Exec)
- Service account operations

Currently, there is no unified collection point — anyone who wants to audit writes directly to the log or nothing at all. This is:

- **Inconsistent** — Loggers have different levels and filters, schema varies per caller.
- **Not aggregatable** — no central filtering, no common sink for SIEM integration.
- **Prone to loss on shutdown** — async loggers drop buffers without drain guarantee.

**Solution.** A `@Service` in `vance-shared` that clearly separates the two layers:

1. **Producer → AuditService:** typed DTO, fire-and-forget.
2. **AuditService → AuditConsumer(s):** central fan-out, bounded queue, lifecycle management.

Consumer implementations are interchangeable. For v1, there is **NoopAuditConsumer** (effectively: empty consumer list — no separate no-op bean needed) and an optional **LogAuditConsumer**. Later consumers (Mongo-Sink, SIEM-Forwarder, Webhook) will implement the same interface — no code changes to the service.

**What it is not:**

- **Not a logger replacement.** Loggers retain their purpose (debugging, operator visibility). Audit is *what happened, who did it, with what outcome* — not *which code path was traversed*.
- **No persistence in v1.** The default consumer is Noop; `LogAuditConsumer` is opt-in. A Mongo consumer with retention policy is in scope for later, not for the initial implementation.
- **Not a real-time alerting engine.** Audit is a collection point + fan-out — alerting builds on top of it, not within the service itself.
- **No event versioning API.** The DTO has a generic `details` map; we will introduce strict schema versions when a consumer requires it.

---

## 2. Architecture

```
┌─────────────────┐
│  Producers      │  Services everywhere: AuthService, SettingsService,
│  (Brain, Anus)  │  KitService, ProjectService, …
└────────┬────────┘
         │ auditService.record(AuditEventDto)
         ▼
┌─────────────────────────────────────────────┐
│                AuditService                 │
│  • Set defaults (timestamp, severity)       │
│  • Mode switch (SYNC ↔ ASYNC)               │
│  • Bounded Queue + Drop-Counter             │
│  • Lifecycle (PostConstruct / PreDestroy)   │
└────────┬────────────────────────────────────┘
         │ for each consumer: consumer.consume(event)
         ▼
┌────────────────┐ ┌─────────────────┐ ┌──────────────┐
│ LogAuditCons.  │ │ MongoAuditCons. │ │  SiemAdapter │
│  (opt-in)      │ │  (later)        │ │   (later)    │
└────────────────┘ └─────────────────┘ └──────────────┘
```

**Module Placement:** `vance-shared`, package `de.mhus.vance.shared.audit`. This allows both `vance-brain` and `vance-anus` to use the same service without duplicate implementation — Anus runs as a short interactive shell, Brain as a long-running server.

---

## 3. API

### 3.1 AuditEventDto

```java
@Data
@Builder
public class AuditEventDto {
    Instant timestamp;          // auto-set on record() if null
    String action;              // dotted, lowercase, verb-last
    AuditSeverity severity;     // INFO | WARN | CRITICAL — default INFO
    String outcome;             // "success" | "failure" | "denied" — nullable
    String actor;               // userId / service-account name — nullable
    String tenantId;            // scope — nullable
    String projectId;           // scope — nullable
    String sessionId;           // scope — nullable
    String target;              // affected entity ref, e.g. "user:_admin"
    String message;             // human-readable summary — nullable
    Map<String, Object> details; // free-form payload — nullable
}
```

**Naming convention for `action`:** dotted, lowercase, verb-last. Examples:

| action | severity | outcome | target |
|---|---|---|---|
| `auth.login` | INFO | success | `user:alice` |
| `auth.login` | WARN | failure | `user:alice` |
| `auth.token.refresh` | INFO | success | `user:alice` |
| `settings.update` | INFO | success | `setting:ai.default.provider` |
| `settings.password.read` | WARN | success | `setting:api.anthropic.key` |
| `project.create` | INFO | success | `project:acme/p-001` |
| `project.delete` | CRITICAL | success | `project:acme/p-001` |
| `permission.grant` | WARN | success | `user:_daemon-01,role:admin` |
| `permission.check` | INFO | denied | `tool:exec.shell` |
| `kit.install` | INFO | success | `kit:test-kit-v1@1.2.3` |

**`target` format:** `<kind>:<identifier>`. Kinds: `user`, `setting`, `project`, `tenant`, `session`, `kit`, `tool`, `role`, `keystore-entry`. Comma-separated if multiple targets are relevant.

**`details` map:** use sparingly — keep it JSON-serializable. Example `settings.update`:

```java
details = Map.of(
    "key", "ai.default.provider",
    "oldValue", "openai",
    "newValue", "anthropic")
```

### 3.2 AuditConsumer

```java
@FunctionalInterface
public interface AuditConsumer {
    void consume(AuditEventDto event);
}
```

Thread-safe — calls come from the caller thread (SYNC) or worker (ASYNC), and even concurrently during a mode switch. RuntimeExceptions are caught by the `AuditService`, logged, and counted via `vance.exceptions{source=<ConsumerClass>,context=audit.consume}` — a faulty consumer does not kill the pipeline.

### 3.3 AuditService

```java
public class AuditService {

    // === Generic Producer Path ===
    void record(AuditEventDto event);

    // === Specialized Emitters (one method per call site) ===
    // Auth (Brain)
    void authLoginSuccess(String tenantId, String username);
    void authLoginFailure(String tenantId, String username, String reason);
    void authTokenRefresh(String tenantId, String username);
    void authLogout(String tenantId, @Nullable String username);
    // Auth (Anus shell — single-user, no Tenant)
    void anusLoginSuccess();
    void anusLoginFailure();
    // Settings
    void settingsUpdate(String tenantId, String refType, String refId, String key, SettingType type);
    void settingsPasswordRead(String tenantId, String refType, String refId, String key);
    // Projects
    void projectCreate(String tenantId, String projectName);
    void projectClose(String tenantId, String projectName, String closedGroupId);
    // LLM (engine path)
    void llmEngineCall(@Nullable String tenantId, @Nullable String projectId,
                       @Nullable String sessionId, @Nullable String processId,
                       String engine, @Nullable String modelAlias,
                       @Nullable Integer tokensIn, @Nullable Integer tokensOut,
                       long elapsedMs, boolean success, @Nullable String errorMessage);
    // LLM (LightLlmService path)
    void llmLightCall(@Nullable String tenantId, @Nullable String projectId,
                      String recipe, @Nullable String modelAlias,
                      @Nullable Integer tokensIn, @Nullable Integer tokensOut,
                      long elapsedMs, boolean success, @Nullable String errorMessage);

    // === Consumer Management (list is internal, mutable, Spring collects initially) ===
    void addConsumer(AuditConsumer consumer);
    boolean removeConsumer(AuditConsumer consumer);
    List<AuditConsumer> getConsumers();

    // === Mode Control ===
    AuditMode getMode();
    void setMode(AuditMode newMode);  // global, threadsafe
    int getQueueDepth();
}
```

**The constructor collects all `AuditConsumer` beans** from the Spring context via `List<AuditConsumer>` injection. At runtime, additional consumers can be added via `addConsumer(...)` — e.g., a test, a per-Tenant webhook, an on-demand activated sink. The list is a `CopyOnWriteArrayList`, iteration is safe against modification during dispatch.

**Specialized methods instead of DTO building at the caller.** Convention: for **every** producing call site, there is a dedicated method on `AuditService` that builds the `AuditEventDto` internally. Caller code remains a single line (`auditService.authLoginSuccess(tenant, user)`), action vocabulary and severity choice are centralized. New producers add a new method instead of directly using the builder.

---

## 4. Delivery Modes

| Mode | Behavior | When to use |
|---|---|---|
| `SYNC` | Caller thread dispatches inline. Producer bears full consumer cost. | Anus (short CLI sessions, no worker overhead, guaranteed flush before prompt return), tests, diagnostic phase with heavy consumers. |
| `ASYNC` | Event lands in bounded queue, a dedicated worker thread (`vance-audit-worker`, daemon) dispatches. | Brain (long-running, producer latency must not be blocked by consumer I/O). |

**Boot Sequence:** The service **always** starts in `SYNC`. In `@PostConstruct`, it switches to the configured mode. This ensures that events emitted by other `@PostConstruct` methods during bean wiring are guaranteed to pass through — even if the worker is not yet running.

**Shutdown Sequence (`@PreDestroy`):**

1. Call `setMode(SYNC)` — flips the flag (new records go directly), then drains the existing queue on the caller thread.
2. `worker.shutdown()` + `awaitTermination(drainTimeoutMs)` — waits for any ongoing dispatch in the worker.
3. Belt-and-suspenders: clear the queue again (in case a producer offered an event in the race window between flag flip and queue drain).

This prevents event loss — modulo hard-killing the JVM.

**Runtime Switch `ASYNC → SYNC`** (e.g., via JMX, admin endpoint, on-incident):

```
synchronized(modeLock) {
    mode = SYNC          // 1. Flip the flag — new producers go directly
    while (poll() != null) dispatch(event)   // 2. Drain the queue on the caller thread
}
```

Ordering is preserved *within a producer thread*; *between* different producer threads, audit ordering is generally not guaranteed (applies to SYNC and ASYNC alike — wall-clock on `timestamp` remains the anchor).

**Runtime Switch `SYNC → ASYNC`:** Start worker (if not already active), flip flag. Trivial operation.

---

## 5. Backpressure

The async queue is **bounded** (default 10,000, configurable via `vance.audit.queueSize`). If the queue is full:

- `record()` does **not** block — audit must never hold up a producer.
- Event is dropped.
- Counter `vance.audit.dropped` is incremented (Micrometer, via [MetricService](../README.md)).
- WARN log with `action` and `actor` for forensics.

**Default 10,000 is sufficient** in practice, far exceeding typical burst lengths. If events are regularly dropped, there is either a runaway producer (bug) or a consumer that is too slow (Mongo with fsync on every write, webhook without batching). Both are separate discussions, not a matter of queue size tuning.

**Deliberately not implemented:**

- Block-on-Full: would make audit a critical path.
- Spill-to-Disk: persistence is a consumer concern (see future Mongo consumer), not a service concern.
- Drop-Oldest instead of Drop-Newest: with a full queue, both are bad choices — we opt for the simpler variant.

---

## 6. Consumer Inventory

### 6.1 Default: Empty (Noop)

If neither `LogAuditConsumer` is enabled nor external `AuditConsumer` beans are present in the context, the consumer list is empty. `record()` only writes the metrics counters — no I/O, no log. This is v1's "the default does nothing."

(An explicit `NoopAuditConsumer` bean was **deliberately** not created — the empty list is semantically identical and saves a class.)

### 6.2 LogAuditConsumer (opt-in)

Activation:

```yaml
vance:
  audit:
    consumers:
      log:
        enabled: true
```

Writes each event as SLF4J INFO to the `de.mhus.vance.shared.audit.LogAuditConsumer` logger. Schema:

```
AUDIT ts=2026-05-27T19:42:17.293Z action=auth.login severity=INFO outcome=success
      actor=alice tenant=acme project=null session=null target=user:alice
      message="login via password" details={ip=10.0.1.4, ua="Mozilla/5.0…"}
```

For stable action vocabulary phases or dev environments. **Default off in Production**, to prevent immature action names from flooding the log.

### 6.3 Planned Consumers (not in v1)

| Consumer | Sink | Notes |
|---|---|---|
| `MongoAuditConsumer` | `audit_log` Collection in MongoDB | With retention TTL, indexed on `tenantId`, `actor`, `action`, `timestamp`. Webview-capable. |
| `WebhookAuditConsumer` | HTTPS-POST to external endpoint | Per-Tenant config, batch + retry, HMAC signature. SIEM integration. |
| `JsonlAuditConsumer` | Rotating `.jsonl` file on disk | For air-gapped deployments without external backend. |

All implement the same interface. Order of registration determines dispatch order (irrelevant, as consumers are independent of each other).

---

## 7. Configuration (application.yml)

```yaml
vance:
  audit:
    mode: async              # sync | async — Mode after @PostConstruct
    queueSize: 10000         # bounded; drop + counter when full
    drainTimeoutMs: 5000     # @PreDestroy drain budget
    consumers:
      log:
        enabled: false       # Enable LogAuditConsumer
```

**Brain Default:** `mode: async`, `consumers.log.enabled: false`.
**Anus Default:** `mode: sync`, `consumers.log.enabled: false`. Anus runs as a short interactive shell — no worker overhead needed, each command flushes its audit trail before the next prompt.

The properties class is `AuditServiceProperties` with `@ConfigurationProperties(prefix = "vance.audit")` and is registered in `VanceBrainApplication` and `VanceAnusApplication` via `@EnableConfigurationProperties` (same convention as `WorkspaceProperties`).

---

## 8. Metrics

| Metric | Type | Tags | Description |
|---|---|---|---|
| `vance.audit.events` | Counter | `severity={info,warn,critical}` | All accepted events. |
| `vance.audit.dropped` | Counter | — | Events dropped due to full queue. |
| `vance.exceptions` | Counter | `source=<ConsumerClass>`, `context=audit.consume` | Thrown consumer exceptions (central exception counter, see `MetricService`). |

Tag cardinality remains low: `severity` has 3 values. **No** `tenantId`/`actor`/`action` as a tag — that is the Prometheus footgun. To see action distribution, query the audit sink (Mongo consumer later).

---

## 9. Producer Patterns

**Rule:** Producers call the specialized method — they do **not** build `AuditEventDto`s themselves. The `record(AuditEventDto)` API exists for custom sites (tests, new producers in development), not as the preferred path.

```java
// Auth — login success/failure
auditService.authLoginSuccess(tenant, username);
auditService.authLoginFailure(tenant, username, "bad-password");

// Settings — caller passes SettingType; Severity is determined by the service
auditService.settingsUpdate(tenantId, refType, refId, key, SettingType.PASSWORD);
auditService.settingsPasswordRead(tenantId, refType, refId, key);

// Project — close is CRITICAL, create is INFO (also set by the service)
auditService.projectCreate(tenantId, projectName);
auditService.projectClose(tenantId, projectName, closedGroupId);

// LLM — Engine vs. Light. Token counts come from ChatResponse, the caller
// extracts them (vance-shared must not depend on langchain4j).
auditService.llmEngineCall(tenantId, projectId, sessionId, processId,
        engineName, modelAlias, tokensIn, tokensOut, elapsedMs, success, errorMsg);
auditService.llmLightCall(tenantId, projectId,
        recipeName, modelAlias, tokensIn, tokensOut, elapsedMs, success, errorMsg);
```

**New Producers (Convention):**

- Write a dedicated method on `AuditService` (one method per call site).
- The method builds the `AuditEventDto` internally — no `Builder` calls in service code.
- `action` follows the dotted convention, severity belongs to the action definition (not the caller).
- **Do not** expose sensitive values (passwords, tokens, plaintext secrets) in `details`/`message`.
- For "actor"-missing sites (e.g., bootstrap calls without SecurityContext): `actor=null` — separate PR to plumb SecurityContext.

---

## 10. What is deliberately excluded (v1)

- **Async persistence with at-least-once guarantee.** Hard crash losses are accepted; those who do not accept this should write a synchronous consumer.
- **Per-event filtering in the service.** Filtering is a consumer concern — if `LogAuditConsumer` should only log CRITICAL events, it checks that itself. Generic service-level filtering will only be added if multiple consumers require the same filtering behavior.
- **Action schema registry.** Action names are free strings with a convention; no compile-time enumeration. If the action list becomes stable, a registry with lookup for documentation/tooling can be added later.
- **Multi-consumer routing/topics.** There is a flat list, no pub-sub with subscriptions. If Consumer X only wants `auth.*`, it filters itself.
- **Async worker pool > 1.** A single thread is sufficient for realistic volumes. More workers introduce ordering breaks between producers and are not worth the cost/benefit.

---

## 11. Implementation Status

Available (as of 2026-05-28):

**Service Infrastructure** (`vance-shared/src/main/java/de/mhus/vance/shared/audit/`):
- `AuditService` (`@Service`, Spring-managed) — generic `record(...)` path + 12 specialized methods.
- `AuditEventDto`, `AuditConsumer`, `AuditMode`, `AuditSeverity`.
- `LogAuditConsumer` (`@ConditionalOnProperty`).
- `AuditServiceProperties` (`@ConfigurationProperties`).
- Properties registered in `VanceBrainApplication` and `VanceAnusApplication`.
- Default YAML blocks in both `application.yml` (Brain ASYNC, Anus SYNC).

**Producer Integrations** (all live with tests):

| Producer | File | Audit Method(s) |
|---|---|---|
| Brain Login (success) | `AccessController.createToken` | `authLoginSuccess` |
| Brain Login (failure) | `AccessController.rejectLogin` (Helper for all 9 reject paths) | `authLoginFailure` |
| Brain Token Refresh | `AccessController.refreshToken` | `authTokenRefresh` |
| Brain Logout | `AccessController.logout` | `authLogout` |
| Anus Shell Login | `anus/AccessService.login` | `anusLoginSuccess`/`anusLoginFailure` |
| Anus Shell Logout | `anus/AccessService.logout` | `authLogout` (with null-Tenant) |
| Settings Write | `SettingService.set` (central funnel — all typed setters route here including `setEncryptedPassword`) | `settingsUpdate` |
| Vault Decrypt | `SettingService.getDecryptedPassword` | `settingsPasswordRead` |
| Project Create | `ProjectService.create` (shared layer — Brain + Anus + Bootstrap use the same path) | `projectCreate` |
| Project Close | `ProjectService.close` | `projectClose` |
| LLM Engine Call | `EngineChatFactory.applyDefaults` Trace-Writer-Lambda — fires for **every** roundtrip (success + error via `resp==null`), regardless of `ctx.traceLlm()` | `llmEngineCall` |
| LLM Light Call | `LightLlmServiceImpl.buildChatModel` Trace-Writer-Lambda — same mechanism, `recipe.name()` as target | `llmLightCall` |

**Coverage (488 vance-shared + 2007 vance-brain + 44 vance-anus Tests green):**
- `AuditServiceTest` (21 Tests): generic path + each specialized method + SYNC/ASYNC Dispatch, mode switch + queue drain, shutdown drain, drop-on-full, consumer exception isolation, empty-list noop, default-fill timestamp/severity.
- Producer tests (`AccessControllerTest`, `AccessServiceTest` (Anus), `LightLlmServiceImplTest`) — constructor extension considered; tests green.

**Open for later PRs:**

- **Actor Plumbing.** `SettingService` and `ProjectService.create/close` call Audit with `actor=null` — the current User is not available in the shared layer. SecurityContext propagation is a separate PR.
- **MongoAuditConsumer.** Persistent Sink with TTL index. Only then is a webview editor worthwhile.
- **Webview** in Brain (editor "audit") — filter/search on the Mongo sink.
- **Permission Audit.** `PermissionService.check` does not emit anything yet. If audit is added there, naming `permission.check` + outcome=denied/granted.
- **Kit Lifecycle Audit.** `kit.install/update/apply/export` — analogous to Project.
- **OAuth Audit.** Connect/disconnect/refresh paths in `OAuthController` / `OAuthTokenRefresher`.
