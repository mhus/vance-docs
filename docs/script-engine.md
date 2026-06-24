---
title: "Vance — Script Engine"
parent: Documentation
permalink: /docs/script-engine
render_with_liquid: false
---

<!-- AUTO-GENERATED from specification/public/en/script-engine.md — do not edit here. -->

---
# Vance — Script Engine

> A **Script Engine** is the JVM-internal runtime for inline code executed by Tools, Engines, or Recipes. v1 provides **GraalJS as a Library** (JavaScript), encapsulated behind central `ScriptExecutor` services with their own Host-API, Sandbox-Policy, and Resource-Limits. There are **two** independent implementations — one in the Brain server and one in the Foot client — with different Host-APIs, because the available tooling differs per side. Other languages (GraalPy) are explicitly not part of v1.
>
> See also: [server-tools](/docs/server-tools) | [think-engines](/docs/think-engines) | [llm-resource-management](/docs/llm-resource-management) | [mcp-tool-routing](/docs/mcp-tool-routing)

---

## 1. Terms and Delimitation

| Term | What it is |
|---|---|
| **Script Engine** | Polyglot-Runtime (`org.graalvm.polyglot.Engine`). Singleton per JVM, expensive to build, thread-safe. |
| **Script Context** | `org.graalvm.polyglot.Context` built per run. Carries Sandbox-Policy, Resource-Limits, Host-Bindings. Closed after each run. |
| **Host-API** | Java object injected into the Context, through which scripts gain controlled access to Brain or Foot functions. The surface differs per side. |
| **Script Source** | The executed code string. v1: JavaScript only. Persistence is the responsibility of the caller (Tool definition, Document, Recipe). |
| **ScriptExecutor (Brain)** | Spring-Bean in `vance-brain`. Sole entry point for **server-side** script runs. Host-API: `vance.*` (Tools, Process-Spawn, Context, Log). |
| **ClientScriptExecutor (Foot)** | Spring-Bean in `vance-foot`. Sole entry point for **client-side** script runs, triggered by the Brain via Remote-Tool-Call. Host-API: `client.*` (local client tooling only). |

### 1.1 Two Engines, Two Surfaces

The two executors already exist today as `JsEngine` (`vance-brain/.../tools/js/JsEngine.java`) and `ClientJsEngine` (`vance-foot/.../tools/js/ClientJsEngine.java`). Both will be migrated to the new setup as part of this spec. They share the GraalJS library and the sandbox/limits convention, but **not** the Host-API:

| Aspect | Brain (`ScriptExecutor`) | Foot (`ClientScriptExecutor`) |
|---|---|---|
| Host-API-Namespace | `vance.*` | `client.*` |
| Tool-Surface | Server-Tool-Cascade (`vance.tools.call`) — can also address **Client-Tools** via the Tool-Dispatcher, because the Brain knows the routing | Only **locally registered Client-Tools** (e.g., `client_exec_run`, file-Tools). **Never** Server-Tools, because the Foot knows none. |
| Process-Surface | `vance.process.spawn`, `vance.process.sendEvent` | — (Client knows no Think-Processes) |
| Context-Info | Tenant/Project/Session/Process | Foot-Identity (foot-id, optional Session-Hint), no Process-ID |
| Module-Loading | v1: off, **v2 open** (server environment in Docker image controllable — module paths, whitelist, etc. conceivable) | v1+v2: **permanently off** (user machine, no defined module path) |
| Call Trigger | Engine-/Recipe-/Tool-Call in the Brain | Remote-Tool-Call from the Brain via WebSocket (see [mcp-tool-routing](/docs/mcp-tool-routing)) |
| Code-Isolation | Fresh Context per run | Fresh Context per run |

The separation is **strict**: no common Maven module, no common interface. The spec defines conventions that apply to both sides; the code is independent per module (according to CLAUDE.md rule: `vance-foot` must not depend on `vance-shared`/`vance-brain`, and `vance-api` must not carry Polyglot-Deps).

**Delimitation from Built-in Tools:** Tools like `web_search` are pure Java code with a Tool interface — not a Script Engine. The Script Engine is only used where caller code is to be executed (Brain: `JavaScriptTool` for LLM-driven computations; Foot: `ClientJavaScriptTool` for local scripts triggered remotely by the Brain).

**No `ScriptEngineManager` bridge (JSR-223).** The Engine is instantiated directly via the Polyglot-API. This makes the behavior independent of which engines are reported as services in the JDK classpath. This applies to both Brain **and** Foot.

---

## 2. Engine Setup

### 2.1 Dependency

GraalJS as a Maven library. Centrally managed in the Workbench parent POM (`repos/vance/server/pom.xml`) in `dependencyManagement`:

```xml
<dependency>
  <groupId>org.graalvm.polyglot</groupId>
  <artifactId>polyglot</artifactId>
</dependency>
<dependency>
  <groupId>org.graalvm.polyglot</groupId>
  <artifactId>js-community</artifactId>
  <type>pom</type>
  <scope>runtime</scope>
</dependency>
```

`vance-brain` **and** `vance-foot` pull the Deps; `vance-api`/`vance-shared` **do not**. Versions come from the `graaljs.version` property in the parent POM — Brain and Foot must not allow the version to diverge.

**No** Rhino, **no** Nashorn, **no** `js-scriptengine` (JSR-223 adapter). On both sides. The current probe-and-fallback paths (`tryGraal()` / `tryRhino()`) in `JsEngine` and `ClientJsEngine` are removed without replacement — the library is either there or the build is broken.

### 2.2 Engine-Singleton

```java
@Configuration
public class ScriptEngineConfig {
    @Bean(destroyMethod = "close")
    public Engine scriptEngine() {
        return Engine.newBuilder("js")
            .option("engine.WarnInterpreterOnly", "false") // runs on Stock-OpenJDK without Graal-JIT
            .build();
    }
}
```

**One** `Engine` instance per JVM. Engines are expensive (compiler setup), contexts are cheap — so share the Engine, new Context per run. Brain-JVM and Foot-JVM each have their own `Engine`-Bean (separate Spring-Context, separate `@Configuration` class per module) — the JVMs run separately.

### 2.3 Runtime Assumptions

- Runs on Stock-OpenJDK 25 (standard deploy) — **interpreted mode**, no Graal-JIT, significantly slower than on GraalVM. This is accepted; scripts are not a hot path.
- Also runs on GraalVM — then automatically with JIT.
- Potentially runs under `native-image` — explicit goal, but no CI-gate in v1. If native-image ever becomes mandatory, reflection hints for the Host-API must be provided in `META-INF/native-image/`.

---

## 3. Sandbox / HostAccess / Resource-Limits

### 3.1 HostAccess-Policy

```java
HostAccess hostAccess = HostAccess.newBuilder()
    .allowAccessAnnotatedBy(HostAccess.Export.class)   // only @Export methods visible
    .allowImplementationsAnnotatedBy(HostAccess.Implementable.class)
    .allowMapAccess(true)
    .allowListAccess(true)
    .allowArrayAccess(true)
    .allowIterableAccess(true)
    .allowIteratorAccess(true)
    .denyAccess(Class.class)   // no reflection via JS
    .denyAccess(System.class)
    .build();
```

**Allow-List, not Allow-All.** Only methods with `@HostAccess.Export` are callable from JS. Thus, the `vance.*` surface is the only official bridge.

### 3.2 Context-Builder

```java
Context ctx = Context.newBuilder("js")
    .engine(scriptEngine)
    .hostAccess(hostAccess)
    .allowAllAccess(false)
    .allowIO(IOAccess.NONE)
    .allowCreateThread(false)
    .allowNativeAccess(false)
    .allowHostClassLoading(false)
    .allowHostClassLookup(name -> false)
    .allowExperimentalOptions(false)
    .allowEnvironmentAccess(EnvironmentAccess.NONE)
    .resourceLimits(resourceLimits)
    .build();
```

All dangerous features explicitly disabled. If a future use case requires an extension (e.g., `IOAccess` for read-only access to a workspace path), the policy in `ScriptExecutor` will be extended in *one* place — not per caller.

### 3.3 Resource-Limits

```java
ResourceLimits limits = ResourceLimits.newBuilder()
    .statementLimit(STATEMENT_LIMIT, null)   // CPU throttle, default e.g. 1_000_000
    .build();
```

Additionally, a hard wall-clock timeout via external watchdog: call in an `ExecutorService.submit(...)` with `future.get(timeout)`; on timeout `ctx.close(true)` (cancel-running).

**No** Heap-Limit in v1 (GraalJS does not expose this without a Sandbox-License). If this becomes an issue: separate spec extension.

### 3.4 Lifecycle per Run

1. `ScriptExecutor` builds a fresh `Context`
2. `vance`-Host-Object injected via `ctx.getBindings("js").putMember("vance", api)`
3. `Source` from user code (`Source.newBuilder("js", code, "<run>").build()`)
4. `ctx.eval(source)` in the watchdog future
5. `ctx.close()` in the `finally` block

No context pooling, no re-use. Everything new per run — prevents cross-run leaks (`globalThis` mutations, compromised prototypes, etc.).

### 3.5 Script-Header — Per-Script Overrides

Every script source may provide a **JSDoc block comment** at the beginning, in which the author declares the runtime parameters of their script. The `ScriptHeaderParser` reads **exactly one** block — the first one — and ignores everything after it. This ensures that knowledge like "this script needs 10 minutes and calls `doc_create`" lives with the code, instead of being gathered from separate frontmatter sources.

```js
/**
 * Chapter-loop orchestrator for school-essay-script-loop-kit.
 *
 * @description School-essay chapter-loop orchestrator
 * @version     1.2.0
 * @timeout     30m
 * @statements  500k
 * @requiresTools  process_run, doc_create
 * @allowTools     process_run, doc_create, doc_read
 */
(function () {
    // …
})();
```

#### 3.5.1 Tag-Allowlist v1

| Tag | Value | Effect |
|---|---|---|
| `@timeout` | Duration (`30s`, `10m`, `1h`, bare number = seconds) | Wall-clock timeout for this run. Clamped against `vance.script.timeout.max`. |
| `@statements` | Count (`100k`, `5M`, `1_000_000`) | GraalJS `ResourceLimits.statementLimit`. Clamped against `vance.script.statements.max`. |
| `@allowTools` | Comma- or whitespace-separated tool names | Whitelist for `vance.tools.call`. The Executor clamps this against the `effectiveAllowedTools` of the calling Process — the narrower list wins. |
| `@requiresTools` | Comma- or whitespace-separated tool names | Pre-flight check: all tools declared here must be in the effective allow-set, otherwise `ScriptExecutionException(MISSING_CAPABILITY)` **before** eval. |
| `@description` | Free text until end of line | Cortex editor list, audit. |
| `@version` | Semver string | Cortex diff display, audit. |

Deliberately **not** in v1: `@require`/`@import` (external libs — sandbox hole), `@fixture` (dry-run input for Deep-Thought, comes with the Engine), `@maxSpawnDepth`/`@deterministic`/`@author`/`@retries` (all v2+). Phase 4 (`specification/skills.md` §13.4) has the roadmap slot for this.

#### 3.5.2 Parser Rules

- **First block wins.** Only the first `/** … */` block above the first executable statement is read. Multiple header blocks = warn-log + only use the first; later blocks are regular documentation.
- **Tag format:** `^\s*\*?\s*@(\w+)\s+(.+?)\s*$` per line. Leading `*` (JSDoc-continuation) is removed before matching.
- **Unknown Tags:** warn-log with `tag, value, scriptName`. No exception — the author learns from the warning, the script continues with defaults.
- **Malformed Value:** (`@timeout abc`, `@statements -1`) → `ScriptExecutionException(INVALID_HEADER, "tag=… value=… reason=…")` **before** Eval.
- **Multiple identical tags:** last value wins + warn-log. Avoids silent inconsistencies.

#### 3.5.3 Duration Format

- Bare number: seconds — `300` = 5 min
- Suffix `s`/`m`/`h` — `30s`, `10m`, `1h`
- Underscore thousands separator allowed: `100_000`, `1_000_000`
- Suffix `k`/`M` for statement counts (not durations) — `500k` = 500_000, `1M` = 1_000_000

#### 3.5.4 List Format

Tool lists (`@allowTools`, `@requiresTools`) are comma- OR whitespace-separated. Both parse to the same `Set<String>`. Duplicate entries are deduplicated. Empty string → empty list.

#### 3.5.5 Effective Limits — Clamping Rule

Per limit (`timeout`, `statementLimit`):

```
effective = clamp(
    header  ?? caller-supplied  ?? settings.default  ?? code-default,
    settings.min,
    settings.max
)
```

Header value above `settings.max` is clamped to `settings.max` + warn-log with original and clamped value. Header value below `settings.min` is clamped similarly. Caller (e.g., `SkillScriptTool`) passes the Caller-Supplied value; this is ONLY a fallback if the header says nothing.

#### 3.5.6 Effective Tool Allow List

`effectiveAllow = process.allowedTools ∩ (header.allowTools ?? process.allowedTools)`

A header can only **restrict**, not extend. The `ContextToolsApi` passed to the script sees the clamped list. Tool calls to disallowed names throw `ToolException("not allowed: <name>")` as usual.

#### 3.5.7 application.yaml Configuration

```yaml
vance:
  script:
    timeout:
      default: 30s          # if neither header nor caller-param says anything
      min:     1s
      max:     1h           # hard cap, header value above is clamped
    statements:
      default: 1_000_000
      min:     1000
      max:     100_000_000
    capabilities:
      enforceRequires: true # @requiresTools check on load — if false,
                            # defer to runtime ToolException
```

Settings are overridable per-Tenant via `SettingService` under the keys `vance.script.timeout.default`, `vance.script.timeout.max`, `vance.script.statements.default`, `vance.script.statements.max`. This allows a Tenant-Admin to set tight caps without recompiling.

#### 3.5.8 Error Classes

Supplement `ScriptExecutionException.ErrorClass`:

- `INVALID_HEADER` — Parser found a malformed tag value. Message specifies tag + value + reason.
- `MISSING_CAPABILITY` — `@requiresTools` declares tools that are not in the effective allow-set. Message lists the missing names. Throws **before** Eval, no token consumption for a script that cannot run anyway.

`HOST_EXCEPTION` / `GUEST_EXCEPTION` / `RESOURCE_EXHAUSTED` / `TIMEOUT` / `CANCELLED` remain unchanged.

#### 3.5.9 What happens without a Header

Header is **optional**. A script without a header gets the entire default chain: Caller-Param > Settings-Default > Code-Default. Existing callers (`JavaScriptTool`, `SkillScriptTool`, `ScriptedToolFactory`, `ScriptActionExecutor` — which also runs Ursahook scripts) do not need to change anything.

---

## 4. Host-API

The surface differs per side (see §1.1). Both follow the same principles: **Java-POJO** with `@HostAccess.Export` methods, identity-carrying fields come from the `ExecutionContext` (set by the caller), **not from script parameters**. This prevents a script from leaving its scope.

### 4a. Brain — `vance.*`

```js
// Tools — calls the same Tool-Dispatcher as LLM-Tool-Calls
const result = vance.tools.call("web_search", { query: "graaljs sandboxing" });

// Process-Spawn — thin wrapper over tools.call("process_create", ...)
const handle = vance.process.spawn({ recipe: "analyze", task: "..." });
// Note: sendEvent is not in the API in v1 — there is currently no suitable
// Tool for it. To send events to sibling processes, call the respective
// Tool directly via vance.tools.call(...).

// Read-only Scope-Info
vance.context.tenantId;     // String
vance.context.projectId;    // String
vance.context.sessionId;    // String, possibly null
vance.context.processId;    // String — the Process that triggered the run

// Structured Logging — lands in the Process-Log, not in stdout
vance.log.info("step done", { count: 3 });
```

`vance` is a Java-POJO `VanceScriptApi` in `vance-brain`.

**What the Brain-API DOES NOT do (v1)**

- No direct Mongo access (no `vance.mongo`, no `*Repository` bindings).
- No Service-Bean access (no Spring-Bean lookups via script).
- No Filesystem (`vance.fs` subsystem is a v2 topic, once Workspace-Tools are final).
- No HTTP surface beyond what Tools can already do.
- No WebSocket sending from the script.

If a script needs functionality that does not exist in this surface: **build a Tool** (Built-in or Server-Tool), do not extend the surface. The gate is intentionally narrow.

**Permission/Quota Path**

`vance.tools.call(...)` delegates to the same `ToolDispatcher` that the LLM-Tool-Loop uses. This automatically applies:

- Tool resolution through the Server-Tool-Cascade (Project → `_tenant` → Built-in)
- `enabled`/`primary` flags
- Recipe restrictions (`allowedTools…` list of the Parent-Process)
- Quota buckets from [llm-resource-management](/docs/llm-resource-management)
- Tenant isolation
- **Client-Tool-Routing** via WebSocket (see [mcp-tool-routing](/docs/mcp-tool-routing)) — the script does not need to know if a Tool runs locally in the Brain or remotely in the Foot

Thus, a script can do **nothing** that the executing Process could not also do in the LLM-Tool-Loop.

### 4b. Foot — `client.*`

```js
// Locally registered Client-Tools — what the Foot reported to the Brain at bootstrap
const out = client.tools.call("client_exec_run", { command: "ls", cwd: "/tmp" });
client.tools.call("client_file_read", { path: "/tmp/foo.txt" });

// Read-only Foot-Identity
client.context.footId;       // String — who this Foot is
client.context.sessionId;    // String, possibly null — Session-Hint from the Brain call
client.context.requestId;    // String — unique ID of the Remote-Call, for logging correlation

// Logging — lands in the Foot-Log and is mirrored back to the Brain-Process via WebSocket
client.log.info("script step", { handled: 7 });
```

`client` is a Java-POJO `ClientScriptApi` in `vance-foot`.

**Surface Restriction — strict:**

- **Only local Client-Tools** are visible. The `ClientToolService` in the Foot knows its own tools (`client_exec_run`, `client_file_*`, `client_javascript`, …). This list is the only source for `client.tools.call`.
- **No** Server-Tools, **no** Process-Surface, **no** Recipes. The Foot simply does not know these concepts and should not "invent" them through script code.
- Script runs in the context of a Brain-triggered Remote-Tool-Call. `client.context.requestId` is the key with which the Brain associates the result with the original Tool-Call.

**What the Foot-API DOES NOT do (v1+v2):**

- No WebSocket direct access (no `client.brain.send(...)`). Communication occurs exclusively via Tool-Calls and Tool-Results.
- No Module-Loading. On user machines, there is no reliable module path — the surface remains a flat source permanently.
- No direct Service-Bean access in the Foot.

### 4c. Error Mapping (both sides)

- Java-Exception in Host method → JS-`Error` with `name` = Java class simple name, `message` = `getMessage()`. Stacktrace is **not** exposed in JS.
- JS-Exception (uncaught) → Executor catches `PolyglotException`, wraps in `ScriptExecutionException` with `errorClass` (`HOST_EXCEPTION`, `GUEST_EXCEPTION`, `RESOURCE_EXHAUSTED`, `TIMEOUT`, `CANCELLED`).
- Caller (`JavaScriptTool` in the Brain or `ClientJavaScriptTool` in the Foot) decides how to pass the exception to the LLM or to the Tool-Result.

---

## 5. Call Site

Two independent services — no common interface, because `vance-foot` must not depend on `vance-brain`/`vance-shared` and `vance-api` must not carry Polyglot-Deps. The contracts are **structurally parallel**, but explained separately:

### 5a. Brain — `ScriptExecutor`

```java
public interface ScriptExecutor {
    ScriptResult run(ScriptRequest request);
}

public record ScriptRequest(
    String language,            // "js" — others are rejected in v1
    String code,
    @Nullable String sourceName, // for stacktraces, default "<run>"
    ExecutionContext executionContext,
    Duration timeout            // default from Settings
) {}

public record ScriptResult(
    @Nullable Object value,     // null if script returns no value
    Duration duration,
    long statementsExecuted     // from ResourceLimits, if available
) {}
```

- Located in `vance-brain` under `de.mhus.vance.brain.script` (finalize path during implementation). Replaces `JsEngine`.
- **Sole entry point** in the Brain. No one except `ScriptExecutor` builds `Context`/`Engine` objects.
- `ExecutionContext` carries Tenant/Project/Session/Process plus quota bucket. Mandatory parameter — no default construction without scope.
- Settings for limits (statement limit, default timeout) via [settings-system](/docs/settings-system), scope cascade. Defaults in code.
- `language != "js"` → `IllegalArgumentException`. Jumping-off point for later GraalPy extension; deliberately restrictive in v1.

### 5b. Foot — `ClientScriptExecutor`

```java
public interface ClientScriptExecutor {
    ClientScriptResult run(ClientScriptRequest request);
}

public record ClientScriptRequest(
    String language,            // "js"
    String code,
    @Nullable String sourceName,
    ClientExecutionContext executionContext,  // footId, optional sessionId, requestId
    Duration timeout
) {}

public record ClientScriptResult(
    @Nullable Object value,
    Duration duration,
    long statementsExecuted
) {}
```

- Located in `vance-foot` under `de.mhus.vance.foot.script`. Replaces `ClientJsEngine`.
- **Sole entry point** in the Foot.
- `ClientExecutionContext` carries only Foot-relevant fields — no Tenant, no Project, no quota bucket. These concepts belong to the Brain.
- The Executor is called exclusively by the `ClientJavaScriptTool`, which in turn is triggered by the Brain via WebSocket-Tool-Routing (see [mcp-tool-routing](/docs/mcp-tool-routing)).
- `language != "js"` → `IllegalArgumentException`.

**Note on code duplication:** The two records and service classes are structurally similar but deliberately separated. A common module would violate the dependency rules from CLAUDE.md. The duplication is manageable (~50 lines) and stable — changes to Brain-specific concepts (quotas, scope) do **not** affect the Foot.

### 5c. Script Source: Inline String vs. File

Primary input is **always** a string (`ScriptRequest.code`). This keeps the sandbox tight (`IOAccess` does not need to be opened) and the caller's identity for "who can read which file" remains in the Java code, not in the Polyglot-Context.

**Brain-Convenience.** The Brain-`ScriptExecutor` gets a second method for file loading:

```java
default ScriptResult runFile(Path path, ExecutionContext ctx, Duration timeout) {
    String code = Files.readString(path, StandardCharsets.UTF_8);
    return run(new ScriptRequest("js", code, path.toString(), ctx, timeout));
}
```

- Pure convenience: reads the file with JVM rights and delegates to `run(...)`.
- `sourceName = path.toString()` → Stacktraces carry the real path.
- No new code path, no second eval variant. In particular, **no** GraalJS-`Source`-from-`File` branch — the Polyglot-Context only sees strings.
- The caller is responsible for ensuring that the path may be read (e.g., only from a whitelisted directory in the Docker image, once §8 v2 opens this up). The method does not validate.

**Source-Caching** is explicitly out-of-scope. If the same script runs repeatedly and parsing latency is measured, we will build a separate `CompiledScript` concept later — but only when a concrete use case demands it.

**Foot.** `ClientScriptExecutor` gets **no** file variant. Foot scripts come exclusively as a string from the remote tool call from the Brain — there is no trustworthy Foot path. If a Foot script wants to read files, it does so via a Client-Tool (`client_file_read`), not via the Script-Loader.

---

## 6. Tools on the Executors

### 6a. Brain — `JavaScriptTool`

Existing build (`vance-brain/.../tools/js/JavaScriptTool.java`), will be moved to the `ScriptExecutor`.

- Tool schema unchanged: `{ "code": "...", "timeoutMs": 5000 }` (or similar).
- Tool implementation now only calls `scriptExecutor.run(...)` with the current `ExecutionContext`.
- No more dedicated `ScriptEngine`/Polyglot code in the Tool, no more `JsEngine` singleton.
- Tool-Result contains `value` (made JSON-serializable — complex objects via `JSON.stringify` convention in the script or mapper in the tool) and error info.

### 6b. Foot — `ClientJavaScriptTool`

New (or refactor of the existing Foot-side JS-Tool path, which currently uses `ClientJsEngine`).

- Registered via `ClientToolService` and reported to the Brain at bootstrap (Tool-Inventory-Sync, see [mcp-tool-routing](/docs/mcp-tool-routing)).
- Tool schema analogous to Brain: `{ "code": "...", "timeoutMs": 5000 }`.
- Implementation calls `clientScriptExecutor.run(...)` with the `ClientExecutionContext` from the remote call.
- Tool-Result is passed back to the Brain via the WebSocket-Tool-response — the Brain maps it into the `vance.tools.call`-Result path or the LLM-Tool-Loop.
- No dedicated Polyglot code, no more `ClientJsEngine` singleton.

### 6c. Cleanup

`JsEngine` and `ClientJsEngine` as classes will be **deleted** with the implementation of this spec. They no longer have a raison d'être alongside the executors — simultaneous co-existence is explicitly not intended.

---

## 7. Unit Tests

Mandatory tests that will be delivered with the implementation. **Both sides** get their test suite — Brain tests in `vance-brain/src/test/java/de/mhus/vance/brain/script/`, Foot tests in `vance-foot/src/test/java/de/mhus/vance/foot/script/`. Structures 7.1–7.7 apply to **both** suites; Foot-specific deviations are added in §7.8.

### 7.1 Executor Test (happy paths)

- `run_returnsPrimitiveValue` — `return 42;` results in `ScriptResult.value == 42`.
- `run_returnsString` — String roundtrip.
- `run_returnsNullForVoidScript` — Script without return value.
- `run_executesMultipleStatements` — Variables, loops, normal JS.
- `run_durationIsMeasured` — `duration > Duration.ZERO`.

### 7.2 Sandbox Tests (must-fail)

- `run_deniesJavaTypeAccess` — `Java.type('java.lang.System')` throws `PolyglotException` (no `Java`-builtin visible).
- `run_deniesFileIo` — Attempting `java.io.File` access fails.
- `run_deniesThreadCreation` — `new Thread(...)` or worker constructs are blocked.
- `run_deniesProcessExec` — `Java.type('java.lang.Runtime').getRuntime().exec(...)` throws.
- `run_deniesReflection` — Access to `Class` object of a Host-Object fails.
- `run_deniesEnvAccess` — `process.env`-like accesses are not present or return empty.

### 7.3 Resource Limit Tests

- `run_aborts_onStatementLimitExceeded` — `while(true){}` leads to `ScriptExecutionException(RESOURCE_EXHAUSTED)` within the expected time window.
- `run_aborts_onWallClockTimeout` — Script with long Polyglot operation behind `timeout=200ms` is aborted via `ctx.close(true)`.
- `run_doesNotLeakContext_onTimeout` — after timeout, no open `Context` references remain (smoke check via Engine-State, if API available; otherwise mock verification on `close`).

### 7.4 Host-API Tests

Brain (`vance.*`):

- `vanceContext_isReadable` — `vance.context.tenantId` returns the value from `ExecutionContext`.
- `vanceContext_isReadOnly` — Assignment `vance.context.tenantId = 'x'` throws (or no-op, depending on GraalJS strict mode — test fixes desired behavior).
- `vanceTools_call_dispatchesToToolDispatcher` — Mock-Dispatcher; verifies that Tool-Call was passed with correct `ExecutionContext`, **never** with script-provided Tenant/Project values.
- `vanceTools_call_returnsToolResult` — Roundtrip of a `Map<String,Object>` response as a JS-Object.
- `vanceTools_call_unknownTool_throwsInJs` — Missing tool is converted to JS-`Error`, caught with `try/catch`.
- `vanceTools_call_respectsRecipeRestrictions` — Tool blocked by the Recipe filter also throws via script (Mock-Dispatcher reports block).
- `vanceProcess_spawn_dispatchesToProcessService` — Analogous mock setup for `process.spawn`.
- `vanceLog_info_writesToProcessLogger` — Mock-Logger receives entry with correct Process context.

Foot (`client.*`):

- `clientContext_isReadable` — `client.context.footId` returns the value from `ClientExecutionContext`.
- `clientContext_isReadOnly` — Assignment fails or changes nothing.
- `clientTools_call_dispatchesToClientToolService` — Mock; verifies that the tool is called via the `ClientToolService` (not via a Brain path).
- `clientTools_call_unknownTool_throwsInJs` — Tool not in local inventory throws.
- `clientTools_call_doesNotExposeServerTools` — Test that no "vance" namespace exists in the Foot-Context (`typeof vance === 'undefined'`).
- `clientLog_info_writesToFootLoggerWithRequestId` — Logger-Mock receives the `requestId` of the Remote-Call.

### 7.5 Cross-Run-Isolation

- `run_doesNotShareGlobalsBetweenRuns` — first run sets `globalThis.foo = 1`, second run sees `typeof globalThis.foo === 'undefined'`.
- `run_doesNotShareHostBindingsBetweenRuns` — first run tries to overwrite `vance`, second run has the original `vance`.

### 7.6 Error Mapping

- `run_javaException_inHostMethod_isMappedToJsError` — Mock-Tool throws `RuntimeException`, JS sees `Error` with expected `message`, **no** stacktrace.
- `run_uncaughtJsError_isWrapped` — `throw new Error("boom")` becomes `ScriptExecutionException(GUEST_EXCEPTION)`.

### 7.7 What is not tested

Performance benchmarks, heap leak stress, native-image compatibility — deliberately out-of-scope for the v1 test suite. Native-image smoke test will, if at all, be set up separately as a CI-gate.

Tests may reuse the `Engine`-Singleton from the Spring-Context (test class with `@SpringBootTest` or explicitly built Engine in `@BeforeAll`). A fresh `Executor.run` call per test method (just like in production).

### 7.8 Foot-Specific Tests

In addition to §7.1–§7.7:

- `clientExecutor_rejectsServerToolNames` — Calling `client.tools.call("web_search", …)` (a known server tool) fails because the Foot does not know this tool locally. Prevents someone from "accidentally" expecting server surface in client scripts.
- `clientExecutor_doesNotPersistAcrossRequests` — two consecutive remote calls with different `requestId`s see a fresh Context (analogous to §7.5, but explicitly for the remote call path).

---

## 8. Deliberately NOT in v1

- **GraalPy** — separate spec, once a concrete Python-only tool need exists. Surface (`vance.*` / `client.*`) would then be language-agnostic.
- **Module-Loading** (`import` from filesystem, `require`, npm-resolver) — everything in the script is a flat source. **v2 option for the Brain:** once the Brain runs in a Docker image, the filesystem environment is controlled enough to allow a limited module loader surface (e.g., reading from an `/opt/vance/scripts/` directory with a whitelist). The Foot does **not** get this — on user machines, there is no reliable path.
- **Persistent Script-Sessions** — no resuming a context across runs. If state is needed, it is explicitly persisted via Tools/Documents.
- **Streaming-Output** from the script — return value is a single result. Logging via `vance.log` / `client.log` is a side effect.
- **Heap-Limits / Sandbox-License-Features** — would require GraalVM Sandbox-License, not for v1.
- **Direct Mongo-/Service-Bean access** — only via the `vance.*`-/`client.*` gate.
- **JSR-223 bridge** — no `ScriptEngineManager` path.
- **Shared script module between Brain and Foot** — deliberately kept separate (see §5).

---

## 9. References

- [server-tools](/docs/server-tools) — Tool-Cascade that `vance.tools.call` hooks into
- [mcp-tool-routing](/docs/mcp-tool-routing) — Brain-to-Foot Tool-Routing that carries the `ClientJavaScriptTool` path
- [think-engines](/docs/think-engines) — Engine lifecycle in which scripts run indirectly
- [llm-resource-management](/docs/llm-resource-management) — Quota buckets that the Brain-script call is tied to
- [settings-system](/docs/settings-system) — Defaults for statement limit / timeout
- GraalJS Polyglot-API: `org.graalvm.polyglot.Context`, `Engine`, `HostAccess`, `ResourceLimits`, `IOAccess`
