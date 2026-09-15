# Vancetope — Agent Mode Setup

> Both setup wizards — the Docker Compose scaffolder
> (`--setup-docker-compose`) and the Tenant Bootstrap (`--setup`) — are
> **agent-operable** in addition to the interactive terminal UI: all parameters
> come as YAML config, the wizard validates fail-closed, writes (or
> only renders, with `--dry-run`), and exits with a clear exit code.
> No prompt appears, no terminal is opened — the mode runs in a
> plain `docker run -i` pipe.
>
> See also: [java-cli-module-structure](../java-cli-modulstruktur.md) |
> [permission-system](permission-system.md) (what the Tenant Bootstrap
> implicitly creates: the Tenant Admin)

---

## 1. Purpose & Scope

**Problem.** The wizards are JLine terminal UIs: `install.sh`/`setup.sh`
re-attach `/dev/tty`, and `install.sh` **refuses to operate without an
interactive terminal**. An agent (CLI agent on the user's machine, CI job,
deploy script) can neither answer prompts nor meaningfully ask the
`--dry-run` question "what would happen". And: A config file with passwords
and API keys should not even land on disk.

**Solution.** A third entry point besides "human in terminal":

```
agent-yaml | docker run --rm -i … --setup-docker-compose --config - [--dry-run]
agent-yaml | docker run --rm -i … --setup            --config - [--dry-run]
```

**Not part of the mode:** the interactive wizards themselves remain
unchanged — the same state, the same save paths, just a different
input. And: The agent mode **does not** grant any rights that
interactive operation would not have — the Tenant Bootstrap creates a
Tenant Admin as always, nothing more.

## 2. CLI Interface

| Flag | Meaning |
|---|---|
| `--config <path>` | Config from a file |
| `--config -` | Config from **stdin** — the recommended agent pattern; the config only exists in the process's memory |
| `--dry-run` | Render/plan without writing; secrets are masked |

Rules for Argv (both Bootstraps, `SetupBootstrap` /
`DockerComposeSetupBootstrap`):

- `--config` without a value, `--dry-run` without `--config` → Usage error, Exit 2.
- Without `--config`, the wizard runs interactively as before.
- The flags are stripped from argv before Spring Boot (existing
  bootstrap mechanism).

## 3. The Two Config Forms

### 3.1 Compose Wizard — Flat Kebab-Case Mapping

Each key corresponds to a wizard state field (no expert gate — the
`.env` roundtrips expose the same fields anyway):

```yaml
face-port: 9999
language-name: German
language-code: de
fook-enabled: true
external-access: false        # true requires external-url
anus-password: "login-pw"     # Plaintext, hashed on apply; "" = no login gate
mongo-password: generate      # or literal; absent = value of existing .env
encryption-password: generate
internal-token: generate
expose-mongo-port: false
```

**"Absent = keep" semantics:** The wizard pre-fills its state from an
existing `.env` before the config is applied. A missing key (or YAML
`null`) does not change the pre-filled value — a re-run is idempotent and
does **not** silently rotate the secrets of the Mongo volume lock. `generate`
forces a fresh value.

### 3.2 Tenant Wizard — Three Sections

```yaml
tenant:
  name: acme                 # Required, not '_vance'
  title: Acme Corp
user:
  name: admin                # Required, no '_'-prefix (service accounts)
  title: Mara
  email: ops@example.com
  password: S3cret!           # New: required; existing: same = No-Op, different = error
ai:                          # Optional — 'provider: none' or absent = AI later
  provider: gemini | openai | anthropic | custom | none
  instance: cortecs          # Custom only: settings namespace (normalized)
  model: deepseek-chat       # Custom: required; Presets: default as interactive
  base-url: https://…        # Custom only: required
  api-key: sk-…              # Required if the Tenant is new
  embedding-api-key: …       # Optional, reuses api-key
serper-key: …                # Optional (web research)
```

**Ensure semantics** (instead of "create or pick" of the interactive flow):
An existing Tenant/User is adopted, and **only** fields actually provided by the
config are updated. A missing Tenant/User is created. Running the same config
again is a No-Op. A **different** password for an existing user is an error —
the Bootstrap never changes passwords (the same password is verified against
the hash and overwrites nothing; a silent reset would be a privilege
escalation).

**AI block is declarative — with a limit:** Keys explicitly named by the config
itself (`ai.default.provider`/`ai.default.model` as well as Type,
Base-URL, and Key of the Instance) are re-asserted on each re-run — the
config is the declared desired state. Keys **never** named by the config
(the `ai.alias.default.*`-Tiers, the Embedding wiring) are
*derived* and are only bootstrapped on first setting, never
overwritten: An operator who has split the Tiers in the Web UI retains
this split across config re-runs. (The interactive wizard still writes
the derived keys unconditionally — there, the operator has confirmed the
complete plan including aliases.)

## 4. Fail-Closed — The Three Rules

1. **Unknown keys are errors.** An agent typo must not silently proceed with the
   default. Typos and violations of mandatory fields are collected
   **all at once** and reported as a list — one round trip per
   agent run, not one per error.
2. **No prompt fallback.** In config mode, not a single prompt must
   appear — otherwise the container hangs. Everything the interactive wizard
   catches through prompts (missing External-URL, custom without Instance, AI-Key
   for new Tenant, password policy) is reported as a config error.
3. **All-or-nothing.** First validate completely, then write. The
   interactive wizard may leave behind partially completed states; an agent
   cannot clean up.

## 5. Output Discipline

- **Secrets never appear in stdout/stderr.** Dry-runs mask (`<set>`),
  errors only name the field, never the value. stdout is exactly what
  deploy pipelines log.
- **Clear concluding lines** for machine verification:
  - Compose real: `Setup complete — wrote 4 file(s) to <dir>`
  - Compose dry: `Dry run — nothing written.`
  - Tenant real: `Setup complete — tenant=<t> user=<u>`
  - Tenant dry: `Dry run — nothing written.`
- **Exit codes:** 0 = written/plan printed, 1 = config rejected or
  IO error, 2 = usage error on argv. The exit code propagates through
  `install.sh`/`setup.sh` to the agent.

## 6. Parser Security

Agent input is external input: SnakeYAML runs with `SafeConstructor` —
only plain Maps/Lists/Scalars, no `!!java` types. An invalid YAML
is rejected as an IO error with `config is not valid YAML: …`.

## 7. Wrapper Scripts (`install.sh` / `setup.sh`)

The scripts from `repos/vance-docs` recognize `--config` in argv and switch:

| | Interactive (as before) | Agent (`--config` …) |
|---|---|---|
| TTY | `/dev/tty` re-attach, without terminal: Exit 1 | **No TTY needed**, no re-attach |
| Docker | `docker run --rm -it …` | `docker run --rm -i …` |
| stdin | Terminal | Config pipe |
| Afterwards | `docker compose up -d` + handoff messages | Wizard's exit code |

The headless path is thus also the **first terminal-less install** ever:
`install.sh` without `/dev/tty` fails today — in agent mode, this is no
longer an error, but the normal case.

**Important for `curl … | bash`:** In this case, stdin is the script itself — the
config pipe requires the two-step (`curl -o install.sh` then
`cat setup.yaml | bash install.sh --config -`); the script headers state this.

## 8. What is Deliberately NOT Included

- **No Env variable interface.** Larger leak surface (`docker inspect`,
  `/proc/environ`), flat structure for the Tenant wizard. Stdin YAML is the
  one form; the file remains as a convenience for humans.
- **No `{{secret:…}}` resolution in the config.** Stdin solves the problem for
  agents; those who keep the file form are responsible for the file themselves
  (`confidential/`, never in the generated directory).
- **No password change for existing users** in Tenant mode — a
  different password is an error, an identical one a verified
  No-Op; this vulnerability belongs in dedicated admin commands, not in the
  Bootstrap.

## 9. Reference Implementation

| Component | Location |
|---|---|
| Compose: Config Apply + Validation | `vance-anus` `compose/ComposeSetupConfig` |
| Compose: Headless Runner | `compose/DockerComposeSetupWizard.runHeadless` |
| Tenant: Config Parser (pure) | `setup/SetupConfigParser` |
| Tenant: Ensure Logic + Dry-Run | `setup/SetupWizard.runHeadless` |
| Argv Stripper | `compose/DockerComposeSetupBootstrap`, `setup/SetupBootstrap` |
| Script Switch | `repos/vance-docs/install.sh`, `setup.sh` |
| Tests | `ComposeSetupConfigTest`, `DockerComposeSetupWizardHeadlessTest`, `SetupConfigParserTest` + Bootstrap tests |
