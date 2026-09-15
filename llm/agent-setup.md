# Installing Vancetope headless — the agent guide

> Everything an agent, script or CI job needs to install and bootstrap a local
> Vancetope stack without answering a single prompt: two YAML configs in, a
> running stack out. `--dry-run` shows the plan first, exit codes tell the truth.

You are the audience if you are an LLM agent (or a deploy script) operating on a
user's machine with Docker installed. Both setup wizards run headless: all
parameters come from a YAML config, validation is fail-closed, no prompt can
ever appear, and the process ends with a machine-checkable status.

The human (interactive) variant of the same flow is
[Get started](https://www.vancetope.com/getting-started) — same wizards, same
files, typed answers instead of YAML.

## TL;DR

```bash
# 1. Download the two scripts (needed because 'curl … | bash' would eat stdin).
curl -fsSL https://www.vancetope.com/install.sh -o install.sh
curl -fsSL https://www.vancetope.com/setup.sh   -o setup.sh

# 2. Scaffold + start the stack. Config comes from stdin — never a file.
cat compose-config.yaml | bash install.sh --config -

# 3. Create tenant + user + AI provider on the running stack.
cat tenant-config.yaml | bash setup.sh --setup --config -

# 4. Verify and report.
open http://localhost:9999
```

Step 2 writes `docker-compose.yml`, `.env`, `Caddyfile` and `README.md` into
`~/.vancetope/` (override with `VANCE_DIR`), then runs `docker compose up -d`.
Step 3 talks to the running MongoDB through the compose network.

## The contract you can rely on

- `--config <file>` reads the config from a file, `--config -` from **stdin**.
  Prefer stdin: the config carries passwords and API keys and should never have
  to land on the user's filesystem. Nothing of it is persisted.
- `--dry-run` validates and prints the plan **without writing anything**.
  Secret values are masked (`<set>`) — stdout may end up in logs.
- **Fail-closed, no prompts:** unknown config keys are errors (a typo never
  runs with defaults), every problem is reported at once as a complete list,
  and validation finishes before anything is written.
- **Secrets never appear on stdout/stderr.** Error messages name the offending
  key, never its value. Generated secrets land only in the written `.env`.
- **Exit codes:** `0` = written / plan printed, `1` = config rejected or I/O
  error, `2` = usage error (bad argv). The scripts propagate them.
- **Status lines** for machine verification:
  - `Setup complete — wrote 4 file(s) to <dir>` (compose, real run)
  - `Setup complete — tenant=<t> user=<u>` (tenant, real run)
  - `Dry run — nothing written.`
- **Idempotence:** re-running the same config is a no-op. Values a config key
  does not supply are kept from a previous run (the `.env` round-trip), a
  tenant/user that already exists is adopted, and an unchanged user password
  is verified and left alone — never reset, never duplicated.

## Phase 1 — compose config (`install.sh --config -`)

A flat kebab-case mapping. Every key is optional; absent means "keep the
previous value" (fresh install: the wizard default).

```yaml
# ── what to install ──────────────────────────────────────────────
image-tag: latest            # image release tag
language-name: English       # default assistant/UI language
language-code: en
fook-enabled: true           # local bug/feature triage (analysis); reports
                             # stay local — forwarding out is a separate
                             # admin consent, never taken here

# ── secrets: 'generate' mints a fresh value, a literal uses it as-is ──
mongo-password: generate
encryption-password: generate
internal-token: generate
anus-password: "admin-login-pw"   # admin-shell login; "" = no login gate

# ── network ──────────────────────────────────────────────────────
external-access: false       # true requires external-url below
external-url: https://vance.example.de
caddy-tls: true              # bundled Caddy auto-HTTPS for that URL
face-port: 9999              # the single published front-door port

# ── expert knobs (default: internal to the compose network) ───────
redis-enabled: true
tools-enabled: false         # mongo-express + redis-commander debug UIs
anus-service-enabled: false
expose-brain-port: false
expose-mongo-port: false
expose-redis-port: false
brain-port: 9990
mongo-port: 27017
redis-port: 6379
mongo-express-port: 9081
redis-ui-port: 8082
mongo-express-user: admin
mongo-express-password: admin
```

A validation error looks like this (all problems, one round-trip):

```
Config rejected — 2 problem(s):
  - face-potr: unknown setting (config keys are kebab-case, …)
  - external-url: required when external-access is true
Setup failed — nothing written.
```

## Phase 2 — tenant config (`setup.sh --setup --config -`)

Three sections plus one optional key. The wizard *ensures*: existing
tenant/user are adopted (only supplied fields updated), missing ones created.

```yaml
tenant:
  name: acme                # required, not '_vance'
  title: Acme Corp          # optional display name
user:
  name: admin               # required, no leading '_' (service accounts)
  title: Mara                # optional
  email: ops@example.com    # optional
  password: S3cret-Pass!     # required when the user is new. On an EXISTING
                             # user: identical password = verified no-op,
                             # a different one = rejected (no password
                             # changes through setup)
ai:                          # optional — omit entirely or use 'none' to skip
  provider: gemini | openai | anthropic | custom | none
  instance: cortecs          # custom only: the settings namespace, lower-case
  model: deepseek-chat      # custom: required; presets: default if omitted
  base-url: https://api.cortecs.ai/v1   # custom only: required
  api-key: sk-…             # required when the tenant is new; stored encrypted
  embedding-api-key: …       # optional, reuses api-key when blank
serper-key: …                # optional web-research key
```

The same config run twice is a no-op — safe for deploy scripts.

## Gotchas

- **`curl … | bash` eats stdin.** In that mode the script itself arrives on
  stdin, so a config pipe needs the two-step download shown in the TL;DR.
  Piping config into `bash install.sh` (file-based script) works normally.
- **A leading `--` argument disables positional-argument handling** in
  `install.sh` (`install.sh mydir` = target directory, `install.sh --config …`
  = wizard flags; target then comes from `VANCE_DIR`, default `~/.vancetope`).
- **Fresh secrets on an existing Mongo volume lock it out.** `generate` on
  `mongo-password` mints a *new* root password; with an existing
  `./data/mongo` bind-mount the stack will not start. On re-runs, absent keys
  keep the previous values — that is the safe default.
- **Fook (analysis) is local.** Enabling it turns on triage into the tenant's
  own tickets; forwarding anything to an external tracker is a separate admin
  consent in the settings (`fook.upstream.mode`, default `never`).

## Verify

- After phase 2: `docker compose ps` shows brain/mongodb/face/caddy healthy;
  the login at `http://localhost:9999` works with the tenant/user/password
  from the config; the assistant answers (phase-2 `ai` section configured).
- Dry-runs (`--dry-run`) are the cheap pre-flight for both phases: same
  validation, masked plan, nothing written.
