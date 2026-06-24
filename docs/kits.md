---
title: "Vance — Project Kits"
parent: Documentation
permalink: /docs/kits
---

<!-- AUTO-GENERATED from specification/public/en/kits.md — do not edit here. -->

{% raw %}
---
# Vance — Project Kits

> A **Kit** is a bundle of Skills, Recipes, Documents, Settings, and Server Tools, imported into a Project from a Git repo. Kits are the clean answer to "my colleague has a good setup, give it to me" and to reusable setups like `kernel-security`, `python-data-science`, `c-development`. Kit contents land in Vance persistence via the respective services — not in the Project's filesystem. The Kit source tree is merely a transport format.
>
> **Persistence:** Kit contents are written to Mongo during `install`/`apply` (Documents via [`DocumentService`](../repos/vance/server/vance-shared/src/main/java/de/mhus/vance/shared/document/DocumentService.java), Settings via [`SettingService`](../repos/vance/server/vance-shared/src/main/java/de/mhus/vance/shared/settings/SettingService.java)). Server Tool configurations are also Documents (`server-tools/<name>.yaml`) — see [server-tools.md](/docs/server-tools). A `_vance/kit-manifest.yaml` file (itself a Document!) keeps track of what belongs to the active Kit.
>
> See also: [recipes](/docs/recipes) | [skills](/docs/skills) | [settings-system](/docs/settings-system) | [server-tools](/docs/server-tools) | [identity-credentials](/docs/identity-credentials)

---

## 1. Terminology

| Term | Definition |
|---|---|
| **Kit Repo** | Git repo (or sub-path within a mono-repo) containing Kit sources. Has a `kit.yaml`. |
| **Kit Descriptor** | `kit.yaml` in the Kit Repo — name, description, `inherits`, optional metadata. |
| **Active Kit** | Exactly one Kit per Project, installed via `install`/`update`. Leaves `_vance/kit-manifest.yaml` in the Project — we know what belongs to it, can `update` and `export`. |
| **Kit Manifest** | `_vance/kit-manifest.yaml` in the Project. Lists only the artifacts of the **Top Layer** (the Kit itself, not its `inherits`). Automatically written during import. |
| **Apply** | One-time splat of a Kit into the Project, without tracking. Files lose their Kit identity afterwards and become "User Files". No update, no export. |

**Engine ↔ Recipe ↔ Kit**: Engines are code (Java), Recipes are configurations (YAML Documents), Kits are **Bundles** of Recipes + Skills + Settings + Tools + free Documents. A Kit does not provide new Engines — only configuration material for existing ones.

---

## 2. What's in a Kit?

Two top-level directories, **one file per entity**. This is the basis for clean Inherit/Override (see §5): a child Kit containing `documents/recipes/analyze.yaml` overwrites the identically named Recipe of its parent Kit — atomically, without merging YAML trees.

| Directory | Content | Persisted via |
|---|---|---|
| `documents/` | **All Documents** — the relative path under `documents/` is 1:1 the Document path in the Project. The path determines the type: `skills/<name>/SKILL.md` is a Skill (see [skills.md](/docs/skills)), `recipes/<name>.yaml` is a Recipe (see [recipes.md](/docs/recipes)), `server-tools/<name>.yaml` is a Server Tool configuration (see [server-tools.md](/docs/server-tools)), everything else is a free Document. A Skill may bring its entire folder (helper files, examples). | `DocumentService` with Path = relative path under `documents/` |
| `settings/<key>.yaml` | One file per Setting. Content: `{ type: STRING\|INT\|...\|PASSWORD, value: ..., description?: ... }`. Filename without `.yaml` is the Setting Key. | `SettingService.set(...)` with `referenceType="project"` |

**Important:** The KitService does not distinguish between Skills, Recipes, Server Tools, and free Documents. Everything under `documents/` is treated equally — its meaning is derived from the path and interpreted by the respective consumers (Recipe Loader, Skill Resolver, ServerToolLoader, Document Browser). This is the only convention the Kit layer knows. Earlier versions had a separate `tools/<name>.tool.yaml` path — this has been removed; Tool configurations now travel as normal Documents.

**What is not supported in v1:** ThinkProcess templates, Knowledge Graph content, pre-filled Inboxes. If these come later: each will have its own sub-directory, following the same file-per-entity schema.

---

## 3. Kit Repo Structure

```
my-kit/                           ← Repo Root (or sub-path within a mono-repo)
  kit.yaml                        ← Descriptor (see §3.1)
  documents/
    onboarding.md
    architecture/overview.md
    skills/
      cve-analysis/
        SKILL.md
        examples.md
      kernel-navigation/SKILL.md
    recipes/
      analyze.yaml
      deep-think.yaml
    server-tools/
      grep-codebase.yaml
  settings/
    ai.alias.default.fast.yaml
    ai.alias.default.analyze.yaml
    tracing.llm.yaml
```

### 3.1 `kit.yaml`

```yaml
name: kernel-security
description: Linux Kernel Vulnerability Research
version: 1.2.0                    # optional, semver string, for audit logs
artifact: false                   # default. true ⇒ Tuning Bundle, must not end up in the manifest.
installable: true                 # default. false ⇒ only referencable via `inherits:`, no direct import.
sealed: false                     # default. true ⇒ must not be inherited by other Kits.
inherits:
  - url: https://github.com/mhus/kits.git
    path: c-development           # optional, sub-path in the repo. Default: Repo Root.
    branch: main                  # default: main
    commit: 4f3a2b1                # optional, pins SHA. If set, overrides branch.
  - url: file:///abs/path/to/local-kit   # Folder URL for tests
    branch: main
```

**Required fields:** `name`, `description`. All others are optional. `inherits` is an ordered list — see §5.

**`name`** logically identifies the Kit and is written to the manifest. **`version`** is only metadata for logs/UI; the true identity for updates comes from `(url, path, commit-sha)`.

### 3.2 Visibility/Security Flags

Three optional boolean fields that the Kit author sets in `kit.yaml` to prevent misuse during import. The defaults correspond to a "normal, complete, installable, and inheritable Kit".

| Field | Default | Meaning |
|---|---|---|
| `artifact` | `false` | `true` = the Kit is a **Tuning Bundle**, not a complete setup (e.g., only extra tools, local Settings). Must not be included in `kit-manifest.yaml` — `update`/`export` would operate on an incomplete basis. **Validation:** `install`/`update` (with manifest tracking) is rejected; `apply` is the only allowed mode. |
| `installable` | `true` | `false` = the Kit may only be used as `inherits:` of another `kit.yaml`, **no direct import** (not even `apply`). Use case: abstract base Kits like `base-arthur-prompts` that are always combined with concrete configuration. |
| `sealed` | `false` | `true` = the Kit **must not be inherited by other Kits**. Use case: customer-specific end-product configurations that should not allow reuse as a base. Direct import remains allowed. |

**Consistency Check during Parse:** `installable: false` combined with `sealed: true` makes the Kit unusable (neither directly nor via Inherit). The YAML parser rejects this combination with `KitException`.

**What the flags DO NOT do:** They do not end up in `kit-manifest.yaml` nor in the exported state — during export, the top-layer `kit.yaml` is regenerated from the origin repo, so the flags travel via the repo, not via the Project.

---

## 4. Project Manifest

`_vance/kit-manifest.yaml` is a normal Document in the Project — not a special Mongo table. This makes the manifest itself migration-safe (it resides with the Documents) and viewable by the user via the Document editors.

```yaml
# _vance/kit-manifest.yaml — written by KitService, read-only.
kit:
  name: kernel-security
  description: Linux Kernel Vulnerability Research
  version: 1.2.0
origin:
  url: https://github.com/mhus/kits.git
  path: kernel-security
  branch: main
  commit: 4f3a2b1                  # SHA of the installed state — source of truth for "update"
  installedAt: 2026-04-30T12:00:00Z
  installedBy: hummel@sipgate.de
documents:                          # only Top Layer, without inherits — paths relative to Document Root
  - onboarding.md
  - skills/cve-analysis/SKILL.md
  - skills/cve-analysis/examples.md
  - recipes/analyze.yaml
settings:                           # only Top Layer, without inherits
  - ai.alias.default.fast
  - ai.alias.default.analyze
  - tracing.llm
tools:                              # only Top Layer
  - grep-codebase
inherits:                           # original kit.yaml#inherits — passed through for export
  - url: https://github.com/mhus/kits.git
    path: c-development
    branch: main
resolvedInherits:                   # Diagnosis: names of all loaded Inherit Layers
  - c-development
inheritArtefacts:                   # per-Inherit-Ownership by last-writer-wins
  - name: c-development
    documents:
      - skills/code-review/SKILL.md
    settings:
      - format.tabwidth
hasEncryptedSecrets: false
```

**Design Decision — two sections:**

- **Top-Layer Artifacts** (`documents`/`settings`/`tools` directly under `kit:`/`origin:`): the files/keys/names whose installed version came from the **Top Layer**. This is exactly what `export` writes back to the repo.
- **`inheritArtefacts[]`**: for each Inherit Layer, a list of artifacts whose installed version came from this Inherit (after last-writer-wins across the entire Inherit Chain). Layers that were completely shadowed are missing — only contributors appear.

**Invariant:** Every path / Setting Key / Tool Name appears in the manifest **exactly once** — either in the Top-Layer section or in **one** `inheritArtefacts` entry. Never in both. This makes prune-on-update simple: `oldOwned = top ∪ ⋃ inheritArtefacts`, `newOwned = scan-of-the-new-build-tree`, deleted is `oldOwned − newOwned`.

The `inherits:` list is a 1:1 copy of the original `kit.yaml#inherits` — its sole purpose is to reconstruct `kit.yaml` during **export** (see §6.3) without re-cloning.

---

## 5. Inherit Resolution

Inherits are resolved in order, **last-layer-wins** at the file level (relative path within the Kit tree).

```
Effective-Kit := merge(inherits[0], inherits[1], …, inherits[n-1], top-layer)
                                                                    ↑ wins in case of conflict
```

**Algorithm (KitResolver):**

1. Clone Top Layer (to `tmp/<uuid-top>/`).
2. Recursively resolve each element from `kit.yaml#inherits` (DFS, separate Tmp Dir per Kit).
3. Cycle detection using `(url, path)` as a Visited Set. Cycle → fail-fast with path.
4. Initialize Build Tree in `tmp/<uuid-build>/`. Copy layers in order `inherits[0] … top-layer` — the file from the later layer overwrites the earlier one.
5. The Build Tree is the input for service persistence (§6).

**What does not happen:**

- **No Setting merging.** If a parent Kit defines `tracing.llm.yaml` and the child also does, the child wins completely. The `value` is not merged because that would break the file-per-entity rule.
- **No Recipe merging.** Same reason. If a child wants to modify a Recipe slightly, it copies the entire file.
- **No version resolvers.** If two Inherit paths pin the same transitive Inherit Kit differently, the **first one** seen in the DFS wins. Conflicts are logged; v1 has no SAT solver.

---

## 6. Operations

### 6.1 Install / Update

**Install** is the first import into a Project without an active Kit. **Update** is the repetition with the same Kit (URL+path known from `kit-manifest.yaml`). Both go through the same code path.

**Pipeline:**

1. Clone source repo (or read folder) → `tmp/<uuid-src>/`.
2. Resolve inherits → Build Tree `tmp/<uuid-build>/` (see §5). During resolution, each loaded Inherit Layer is checked for `sealed: true` — an Inherit chain over a sealed Kit is an error.
2a. **Validate Resolved Layer** (before each Mongo write operation):
   - Top Layer has `installable: false` → Error ("kit '<name>' is not installable, only inheritable").
   - Top Layer has `artifact: true` and mode is `install` or `update` → Error ("kit '<name>' is an artifact and cannot be tracked in a manifest — use apply"). Only `apply` may proceed.
3. **Diff** against current Mongo state:
   - Files: what is added, what is overwritten, what was in the old manifest and is now gone.
   - Settings: same.
   - Tools: same.
4. Persist via the services. The **new** manifest is maintained at each step.
5. Settings of type `PASSWORD` are decrypted with the Vault password before `SettingService.setEncryptedPassword(...)` (see §8).
6. **Cleanup behavior** for Files/Settings/Tools that were in the old manifest (Top Layer **or** `inheritArtefacts`) but no longer appear in the new Build Tree:
   - **Default (non-destructive):** only omit from the new manifest. The Mongo entries remain — the user may have touched them, and we do not want to destroy data.
   - **Option `--prune`** (Tool param / Web checkbox): Delete Mongo entry. Diff covers the union of **all layers** of the old manifest — if an Inherit has removed a file in its new version (and no other layer replaced it), it is cleaned up here. Mongo entries manually created by the user in between remain untouched.
7. Atomically write new manifest (`DocumentService` handles this).

**Atomicity:** The Build Tree resides in the Tmp Dir, Mongo operations are performed individually per service. We achieve "atomic" via the manifest: the operation is considered successful as soon as the new manifest is written. Crash before that → the next `update` sees the old manifest state and performs the same diff again. Idempotent.

### 6.2 Apply

**Apply** is the one-time splat without tracking. No manifest, no update path, no export.

**Pipeline:**

1. Clone source repo + resolve inherits (exactly like §6.1, steps 1-2 including `sealed` check of inherits).
1a. **Validate Resolved Layer**: Top Layer has `installable: false` → Error. The `artifact` flag is not relevant here — `apply` may splat any Kit.
2. Persist via the services — **Mongo entries with the same key are overwritten**, done.
3. **Option `--keep-passwords`**: PASSWORD Settings in the Build Tree are skipped. Default is overwrite (analogous to the default for other files). Protection only for Passwords, because an accidentally overwritten API key is more costly than an overwritten Skill file.
4. Tool response lists all overwritten paths/keys — the user should see what happened, even if we do not warn.

**What Apply does not do:** Write manifest, offer pruning (nothing to prune), open export path.

### 6.3 Export

**Export** publishes the active Top Layer as a new state back to the Origin Repo (or to another repo).

**Pipeline:**

1. Initialize `tmp/<uuid-out>/` locally as an empty Git repo (or freshly clone Origin Repo+Branch if `kit-manifest.origin.url` is set and write permissions exist).
2. Read all artifacts listed in `kit-manifest.documents`/`settings`/`tools` from the current Project state and write them to the Tmp Tree — file-per-entity, same directory structure as during import.
3. **PASSWORD Settings**: Decrypt plaintext from server storage (server key), immediately re-encrypt with the user-supplied Vault password, store in YAML as `value: <vault-ciphertext>`. The `kit.yaml` then marks the Kit with `hasEncryptedSecrets: true` — importers without a Vault password cannot install it.
4. Write `kit.yaml` — pass through `inherits:` from the Top Layer.
5. Git commit with auto-message (`vance-export: <kit-name>@<sha-short>`), push if Origin is set.

**Important:** Export includes **only** the Top-Layer artifacts. Inherits are referenced via `kit.yaml#inherits`, not copied inline — that is the whole point of file-per-entity + last-layer-wins.

---

## 7. Tech Stack & Pipeline Details

| Component | Technology |
|---|---|
| Git Operations | [JGit](https://www.eclipse.org/jgit/) (`org.eclipse.jgit:org.eclipse.jgit`) |
| Tmp Directories | `<workspace>/tmp/kits/<uuid>/` — automatic cleanup after successful import/export, on crash the Dir remains (for forensics) |
| YAML Parsing | SnakeYAML / Jackson (as elsewhere in the Project) |
| Module | `vance-brain/.../kit/KitService.java` (orchestrates), `KitRepoLoader` (JGit), `KitResolver` (Inherits), `KitInstaller` (Persistence), `KitExporter` (Push) |
| Tool Exposition | `kit_install`, `kit_update`, `kit_apply`, `kit_export`, `kit_status` as Server Tools |
| Web Editor | dedicated editor `kit.html` with form (see [web-ui.md](/docs/web-ui) §6 for editor convention) |

**Tmp Workspace:** Located under the Brain Workspace (e.g., `~/.vance/tmp/kits/`), not in the Project itself. Each operation gets its own UUID, lifecycle-managed via `Path.toFile().deleteOnExit()` as fallback + explicit cleanup in finally block.

**JGit Auth:** Token-based via `UsernamePasswordCredentialsProvider("x-access-token", token)` for GitHub/GitLab. SSH keys are not supported in v1 — tokens are more portable and sufficient for 99% of cases. Folder URLs (`file://...` or absolute path) pass directly through JGit without Auth.

---

## 8. Setting Crypto: Vault Password as Transport Key

PASSWORD Settings are encrypted on the server with `AesEncryptionService` (see `vance-shared/.../crypto/AesEncryptionService.java`). During export, we must **re-encrypt** them with the user-supplied Vault password so that the resulting repo is portable and does not exfiltrate the server key. The reverse happens during import.

**Required extension in SettingService** (belongs in [settings-system.md](/docs/settings-system), referenced here):

- `decryptForExport(tenantId, ref, key, vaultPw) → vaultCiphertext` — Get plaintext via server key, encrypt with Vault PW, return vault-ciphertext. Never expose plaintext.
- `encryptFromImport(tenantId, ref, key, vaultPw, vaultCiphertext)` — Decrypt Vault Ciphertext with Vault PW, re-encrypt with server key, persist.

**Vault PW Detection:** `kit.yaml` sets `hasEncryptedSecrets: true` if the Kit (or one of its Inherits) contains PASSWORD Settings. The importer then prompts for the Vault PW. Without PW → Skip all PASSWORD Settings + Warning. Incorrect PW → Decryption-Fail per Setting → Skip + Warning, no abort.

**Inherits & Vault:** A separate Vault PW may be necessary per Inherit Layer (different repo, different authors). v1: a **single** Vault PW per operation, which is tried on all layers. Incorrect PW per layer = skip Settings, continue. If this becomes an issue in practice, v2 will include a PW map.

---

## 9. Auth & Source URLs

**Supported URL forms:**

- `https://github.com/org/repo.git` — Standard HTTPS, token via form.
- `https://gitlab.intern.example/group/repo.git` — same.
- `file:///absolute/path` or `/absolute/path` — local folder, no clone, JGit reads directly.

**What is not supported:** SSH (`git@github.com:...`) in v1, because it requires system keys; will be supported later via user settings that hold a path to the private key.

**Token Storage:** Tokens are a PASSWORD Setting at the user level (`_user_<id>`-Project) with key `kit.token.<host>`. In the web form, the value is encrypted and stored upon first entry and pre-filled for subsequent operations — like any other provider key.

---

## 10. Web UI

**Editor:** `kit.html` (dedicated MPA entry, see [web-ui.md](/docs/web-ui) §6 for editor convention).

**Form fields for Install/Update:**

| Field | Type | Remark |
|---|---|---|
| Repo URL | `text` | Required. Accepts HTTPS, `file://`, absolute paths. |
| Path in Repo | `text` | Optional. Default: Repo Root. |
| Branch | `text` | Default: `main`. |
| Commit SHA | `text` | Optional, pins the state. Update pulls the branch HEAD without SHA. |
| Token | `password` | Optional. Pre-filled from `kit.token.<host>` Setting, if available. |
| Vault Password | `password` | Required if the Kit declares `hasEncryptedSecrets: true`. |
| Write Manifest? | `checkbox` | Default `true` = `install`/`update`. Off = `apply`. |
| Cleanup Mode | `radio` | "Keep" (default) / "Delete (`--prune`)" — only for `update`. |
| Protect Passwords | `checkbox` | Default `false`. On = `--keep-passwords` — only for `apply`. |

**Form fields for Export:**

| Field | Type | Remark |
|---|---|---|
| Target URL / Branch | `text` | Default from `kit-manifest.origin`. |
| Token | `password` | Pre-filled as above. |
| Vault Password | `password` | Required if PASSWORD Settings are in the manifest. |
| Commit Message | `text` | Default: `vance-export: <kit-name>@<server-sha>`. |

**The UI is available in every Project** — including `_tenant`- and `_user_<id>`-Project. The latter is even useful: a User Kit can synchronize personal Skills + Settings across multiple Vance installations.

---

## 11. What Kits DO NOT do (v1)

- **No Multi-Active-Kit-Stack.** Exactly one active Kit per Project. To combine multiple setups, build a parent Kit with `inherits`. Multiple `apply` calls over different Kits are fine — they operate without tracking, that's the point.
- **No Auto-Update.** There is no `kit.yaml` with "pull on every login". `update` only runs when the user triggers it.
- **No Version Resolver / SAT.** Inherit conflicts (same transitive Inherit, different branches) are logged, not resolved — first-seen wins.
- **No Partial Import.** Either the entire Kit (including Inherits) or nothing. To get only Skills, build a Kit with only Skills.
- **No Diff Viewer in Web v1.** Update shows a Tool Response list of what has changed. Side-by-side diff is editor work and can come later.
- **No User Override Tracking.** If the user manually changes a file after an install, the manifest knows nothing about it. During `update` with `--prune`, the file is still removed from the manifest — but user changes to the content remain (we only overwrite if the new Kit version brings the same file).
- **No Partial Inherit Pruning.** `--prune` operates on the union of all layers; decoupling individual Inherit Layers from the manifest and keeping their files is not supported in v1. To get rid of an Inherit entirely, remove it from `kit.yaml` and run `update --prune`.

---

## 12. Open Points / Prerequisites

These points must be clarified before `KitService` can be implemented:

1. **`SettingService.decryptForExport` / `encryptFromImport`** — see §8. Spec update in `settings-system.md` necessary.
2. **`hasEncryptedSecrets` flag** in `kit.yaml` — automatically set during export if PASSWORD Settings are in the manifest. Minimal schema extension.
3. ~~**Server Tool Schema in YAML**~~ — done: Server Tools are normal Documents under `documents/server-tools/<name>.yaml`, read by `ServerToolLoader`. No more Kit-specific Tool path.
4. **JGit Dependency** — must be added to `vance-brain/pom.xml`.

---

## 13. Example: kernel-security

```yaml
# kernel-security/kit.yaml
name: kernel-security
description: Linux Kernel Vulnerability Research
inherits:
  - url: https://github.com/mhus/kits.git
    path: c-development
  - url: https://github.com/mhus/kits.git
    path: security-base
```

```
kernel-security/
  kit.yaml
  documents/
    skills/cve-analysis/SKILL.md
    skills/custom-triage/SKILL.md
    references/kernel-api.md
    references/project-notes.md
    recipes/triage.yaml
  settings/
    ai.alias.default.analyze.yaml      # value: anthropic:claude-opus
```

After `install` in Project `kvuln`:

```yaml
# _vance/kit-manifest.yaml in Project kvuln
kit:
  name: kernel-security
  description: Linux Kernel Vulnerability Research
origin:
  url: https://github.com/mhus/kits.git
  path: kernel-security
  branch: main
  commit: a4f32b1
  installedAt: 2026-04-30T14:23:00Z
  installedBy: hummel@sipgate.de
documents:
  - skills/cve-analysis/SKILL.md
  - skills/custom-triage/SKILL.md
  - references/kernel-api.md
  - references/project-notes.md
  - recipes/triage.yaml
settings:
  - ai.alias.default.analyze
inheritArtefacts:
  - name: c-development
    documents:
      - skills/code-review/SKILL.md
    settings:
      - format.tabwidth
  - name: security-base
    documents:
      - skills/threat-modeling/SKILL.md
```

During `export`, the rewritten repo would only contain the Top-Layer files (`documents`/`settings`) plus the unchanged `kit.yaml#inherits` list — Inherit artifacts reside in the Project Mongo (and in `inheritArtefacts:` tracking), but do not migrate to the Top-Layer repo.

If `c-development` removes `skills/code-review/SKILL.md` in a later version: the next `kit_update --prune` sees the path in the old `inheritArtefacts.c-development.documents` list, but **no longer** in the new Build Tree → file is deleted from the Project.
{% endraw %}
