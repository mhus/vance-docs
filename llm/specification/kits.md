# Vancetope — Project Kits

> A **Kit** is a bundle of Skills, Recipes, Documents, Settings, and Server Tools imported into a Project from a Git repository. Kits are the clean answer to "my colleague has a good setup, give it to me" and to reusable setups like `kernel-security`, `python-data-science`, `c-development`. Kit contents are persisted in Vancetope's persistence via their respective services — not in the Project's filesystem. The Kit source tree is merely a transport format.
>
> **Multiple Kits per Project.** A Project is specialized by *installing* Kits — `security`, plus `c-development`, plus a colleague's document templates. Each installed Kit remains a managed entity and can be updated individually. Separate from this is the question of whether a Project itself is the **source** of a Kit: this is the role of the Kit developer, explicitly chosen and a prerequisite for `export`.
>
> **Persistence:** Kit contents are written to Mongo during `install`/`apply` (Documents via [`DocumentService`](../repos/vance/server/vance-shared/src/main/java/de/mhus/vance/shared/document/DocumentService.java), Settings via [`SettingService`](../repos/vance/server/vance-shared/src/main/java/de/mhus/vance/shared/settings/SettingService.java)). Server Tool configurations are also Documents (`server-tools/<name>.yaml`) — see [server-tools.md](server-tools.md). What belongs to which Kit is stored under `_vance/kits/` — themselves Documents (§4).
>
> See also: [recipes](recipes.md) | [skills](skills.md) | [settings-system](settings-system.md) | [server-tools](server-tools.md) | [identity-credentials](identity-credentials.md) | [project-kits-catalog](project-kits-catalog.md)
>
> Implementation Track (decisions and discarded alternatives): [`planning/kit-installed-multi.md`](../../planning/kit-installed-multi.md).

---

## 1. Terminology

| Term | Definition |
|---|---|
| **Kit Repo** | Git repository (or sub-path within a mono-repo) containing Kit sources. Has a `kit.yaml`. |
| **Kit Descriptor** | `kit.yaml` in the Kit Repo — name, description, `inherits`, optional metadata. |
| **Installed Kit** | A Kit imported via `install`. Any number per Project. Leaves an **Install Record** — which tracks its contents, enabling `update`/`uninstall`. |
| **Install Record** | `_vance/kits/installed/<id>.yaml`. Machine-generated, completely rewritten with each update. Contains origin, the authored `kit.yaml` descriptor, and all artifacts with hash and contributing layer (§4.1). |
| **Kit Config** | `_vance/kits/config/<id>.yaml`. Optional and **hand-written**: update policy and order. The server reads it, never writes it (§4.2). |
| **Kit Identity** | `(url, path)` of the source — not the name. Installing the same `(url, path)` again *is* an update; two Kits with the same name from different sources coexist; a Kit that renames itself remains the same Kit. |
| **Kit Source / Authoring Manifest** | `_vance/kits/manifest.yaml`. States: *this Project is the Kit* and can be exported. At most one per Project, only by explicit choice (§4.3). |
| **Apply** | A one-time splat of a Kit into the Project, without any management. Files then lose their Kit identity and become "User Files". No update, no export, no policy. |

**Engine ↔ Recipe ↔ Kit**: Engines are code (Java), Recipes are configurations (YAML documents), Kits are **bundles** of Recipes + Skills + Settings + Tools + free Documents. A Kit does not provide new Engines — only configuration material for existing ones.

---

## 2. What's in a Kit?

Two top-level directories, **one file per entity**. This is the basis for clean inherit/override (see §5): a child Kit containing `documents/recipes/analyze.yaml` overwrites the identically named Recipe of its parent Kit — atomically, without merging YAML trees.

| Directory | Content | Persisted via |
|---|---|---|
| `documents/` | **All Documents** — the relative path under `documents/` is 1:1 the Document path in the Project. The path determines the type: `skills/<name>/SKILL.md` is a Skill (see [skills.md](skills.md)), `recipes/<name>.yaml` is a Recipe (see [recipes.md](recipes.md)), `server-tools/<name>.yaml` is a Server Tool Config (see [server-tools.md](server-tools.md)), everything else is a free Document. A Skill may bring its entire folder (helper files, examples). | `DocumentService` with Path = relative path under `documents/` |
| `settings/<key>.yaml` | One file per Setting. Content: `{ type: STRING\|INT\|...\|PASSWORD, value: ..., description?: ..., encoding?: vault\|plain }`. Filename without `.yaml` is the Setting key. `encoding` applies only to encrypted types and determines whether `value` is a Vault blob or the credential itself — §8.1. | `SettingService.set(...)` with `referenceType="project"` |

**Important:** The KitService does not distinguish between Skills, Recipes, Server Tools, and free Documents. Everything under `documents/` is treated equally — its meaning is derived from the path and interpreted by the respective consumers (Recipe loader, Skill resolver, ServerToolLoader, Document browser). This is the only convention the Kit layer knows. Earlier versions had a separate `tools/<name>.tool.yaml` path — this has been removed; Tool configs now travel as normal Documents.

**What is not supported in v1:** ThinkProcess templates, Knowledge Graph content, pre-filled Inboxes. If these come later: each gets its own sub-directory, following the same file-per-entity schema.

---

## 3. Kit Repo Structure

```
my-kit/                           ← Repo root (or sub-path within a mono-repo)
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
artifact: false                   # default. true ⇒ Tuning bundle, must not be in the manifest.
installable: true                 # default. false ⇒ only referencable via `inherits:`, no direct import.
sealed: false                     # default. true ⇒ must not be inherited by other Kits.
policy:                           # optional. Author's update recommendation, see §4.2.
  default: keep
  rules:
    - setting: "ai.alias.*"
      action: ignore
inherits:
  - url: https://github.com/mhus/kits.git
    path: c-development           # optional, sub-path in the repo. Default: repo root.
    branch: main                  # default: main
    commit: 4f3a2b1                # optional, pins SHA. If set, overrides branch.
  - url: file:///abs/path/to/local-kit   # Folder URL for tests
    branch: main
```

**Required fields:** `name`, `description`. All others are optional. `inherits` is an ordered list — see §5.

**`policy`** is a *suggestion*, not a directive: "my `ai.alias.*` are examples, never overwrite them". It is never materialized into the Project, but only applies as long as the installing user has not written their own Config (§4.2). This allows a Kit to improve its recommendation in a later version without ever overwriting a user's decision. Same grammar as the user config — one policy syntax, whether building or installing Kits.

**`name`** logically identifies the Kit and is written to the manifest. **`version`** is only metadata for logs/UI; the true identity for updates comes from `(url, path, commit-sha)`.

### 3.2 Visibility/Security Flags

Three optional boolean fields that the Kit author sets in `kit.yaml` to prevent misuse during import. The defaults correspond to a "normal, complete, installable, and inheritable Kit".

| Field | Default | Meaning |
|---|---|---|
| `artifact` | `false` | `true` = the Kit is a **tuning bundle**, not a complete setup (e.g., only extra tools, local settings). It must not become the **source** of a Project, as `export` would operate on an incomplete basis. **Validation:** an Authoring Manifest is rejected (even retroactively via Promote). Installing and updating is allowed — carrying a tuning bundle is useful and was previously forbidden only because Record and Manifest were the same file. |
| `installable` | `true` | `false` = the Kit may only be used as `inherits:` of another `kit.yaml`, **no direct import** (not even `apply`). Use case: abstract base Kits like `base-arthur-prompts` that are always combined with concrete configuration. |
| `sealed` | `false` | `true` = the Kit **must not be inherited by other Kits**. Use case: customer-specific end-product configurations that should not allow reuse as a base. Direct import remains allowed. |

**Consistency check during parse:** `installable: false` combined with `sealed: true` makes the Kit unusable (neither directly nor via Inherit). The YAML parser rejects this combination with `KitException`.

**What the flags do NOT do:** They do not control anything about the exported state — during export, the top-layer `kit.yaml` is regenerated from the origin repo, so the flags travel via the repo, not via the Project. In the Install Record, they appear as part of the included `descriptor:` block, but there as documentation of what the Kit declared.

---

## 4. What lands in the Project

Three files under `_vance/kits/`, with three different writers — this is the fundamental distinction of the entire subsystem:

```
_vance/kits/installed/<id>.yaml   ← machine-generated, the server writes
_vance/kits/config/<id>.yaml      ← optional, only the user (or UI) writes
_vance/kits/manifest.yaml         ← authoring/export, only by explicit choice
```

All three are normal Documents — not special Mongo tables. This makes them migration-safe and viewable via the Document editors. **Kits must not bring anything under `_vance/kits/`:** a Kit that wrote there could falsify its own record, apply `ignore` to a competing Kit, or rewrite ownership. The installer rejects such paths with an error.

### 4.1 Install Record

`<id>` is `<name-slug>-<hash6(url+path)>`. The hash is why the identity is correct: the name is a display text chosen freely by an author, so two providers can both deliver a `security` Kit. The full origin is in the record, making the hash verifiable.

The name in the filename is **only for readability**. A record is searched by `(url, path)`, not by the derived ID — otherwise, a Kit that renames itself in a new version would branch into a second record during an update: the prune would find nothing to compare, and every already installed file would look like a foreign one under `keep`. The ID assigned by the first install therefore remains; renaming changes the label, never the identity.

A **different source is consequently a different Kit**, not a relocation: moving a Kit to a new repo means uninstalling and reinstalling it.

```yaml
# _vance/kits/installed/kernel-security-a4f32b.yaml
id: kernel-security-a4f32b
kit:
  name: kernel-security
  description: Linux Kernel Vulnerability Research
  version: 1.2.0
origin:
  url: https://github.com/mhus/vance-kits.git
  path: kernel-security
  branch: main
  commit: a4f32b1                  # the installed state
  installedAt: 2026-08-17T10:00:00Z
  installedBy: hummel@sipgate.de
descriptor:                        # the authored kit.yaml, parsed
  artifact: false
  installable: true
  sealed: false
  inherits:
    - url: https://github.com/mhus/vance-kits.git
      path: c-development
      branch: main
artefacts:
  documents:
    - path: skills/cve-analysis/SKILL.md
      hash: sha256:1f0c…
      layer: kernel-security       # top-layer or name of the inherit layer
    - path: skills/code-review/SKILL.md
      hash: sha256:8ba2…
      layer: c-development
  settings:
    - key: ai.alias.default.analyze
      hash: sha256:44de…
      layer: kernel-security
hasEncryptedSecrets: false
```

**`layer` instead of separate sections.** Each artifact carries the layer whose version won by last-writer-wins. Export thus filters by `layer == kit.name`, Prune knows the origin of each entry — one structure instead of two parallel lists.

**`hash`** answers exactly one question: *has the user touched this since installation?* No security purpose — a Kit that could falsify the record could also falsify the hashes; therefore, the path is locked, not the hash hardened. For encrypted Settings, it is `null`: their ciphertext is re-randomized with each write, so a comparison would compare noise.

**`descriptor`** is not an extension, but a summary — it replaces the previously individually copied `inherits`/`resolvedInherits` and makes the record self-explanatory without network access.

**Invariant:** within a record, each artifact appears exactly once. **Across records, it may repeat** — two Kits may bring the same file; which one applies is decided by the layer order (§4.2).

### 4.2 Kit Config: Update Policy and Order

Optional and hand-written. If it is missing — the normal case — `keep` applies without exceptions.

```yaml
# _vance/kits/config/kernel-security-a4f32b.yaml
sortIndex: 20                      # optional; higher wins in case of collisions
overwriteSecrets: false            # optional; default no — see 4.2a
policy:                            # shorthand `policy: keep` allowed
  default: keep
  rules:
    - document: "recipes/*.yaml"
      action: overwrite
    - setting: "ai.alias.*"
      action: ignore
```

**Why a separate file?** Because of write authority. The record is completely rewritten with each update; this file is edited manually. In one file, every Kit update would overwrite a document the user touches — precisely the problem the policy is meant to solve, one level higher.

**The four actions:**

| Action | Meaning | Applies |
|---|---|---|
| `keep` **(Default)** | updates, **as long as the user has not changed the artifact** | only on local change |
| `overwrite` | the Kit always wins | always |
| `ignore` | never write, even if unchanged — frozen | always |
| `merge` | 3-way against the last installed state | only on local change |

`keep` and `ignore` feel similar but are different: `keep` keeps the Kit alive and only protects its own edits, `ignore` freezes it. "Overwrite everything except XYZ" is `default: overwrite` plus an `ignore` line.

**Rule evaluation:** one rule key per namespace (`document:` or `setting:`, exactly one per rule), **last match wins** as with `.gitignore`. For document paths, `*` stops at `/` and `**` crosses it; for setting keys, `*` matches everything, including dots — otherwise `ai.alias.*` would not match `ai.alias.default.fast`, which is not what anyone writing the line means. There is no `tool:` key: Server Tools are Documents and are addressed as `document: "server-tools/*.yaml"`.

**Cascade:** User Config → Suggestion from `kit.yaml` (§3.1) → `keep`. All or nothing, no rule merge: whoever writes a policy has thought about this Kit, and a silent blend would result in behavior neither of them wrote down.

**Order:** without `sortIndex`, `origin.installedAt` applies — last installed wins in case of collisions. To reorder, create a Config.

**Drift is uncritical.** Config without Kit is ignored, but **not deleted** (the user wrote it; it becomes effective again if the Kit is reinstalled). Kit without Config is the normal case.

#### 4.2a `overwriteSecrets` — may an update replace a credential?

Default **no**. A credential stored in the Project is set once and then not touched again.

**Why this is not `overwrite` in the policy.** The policy decides based on hash comparisons, and an encrypted value has no hash — it cannot distinguish "the operator rotated it" from "unchanged since install". `overwrite` would therefore be guessed there, and the wrong guess would reset a working key: an outage, not an update. Furthermore, ODE sources for **documents** default to `overwrite` anyway (§12) — folding credentials into the same word would mean every ODE Kit resets every credential with every update.

**What it's for then.** The opposite direction: a host that rotates **its own** key otherwise has no way to bring the new one to the Projects that read it. The revision pulls, the Kit updates — and the Project retains a key that unlocks nothing.

**It only opens one gate.** With `true`, the `policy` rules still apply and can only **restrict**: a rule that matches the key and says `keep` or `ignore` freezes exactly this one credential again. With `false` (or without the line), **no** rule can replace a credential — an `overwrite` rule written for a neighboring setting key must not accidentally catch a secret.

```yaml
overwriteSecrets: true             # pull host-rotated keys
policy:
  rules:
    - setting: "kit.token.*"       # ... except this one, which I set myself
      action: ignore
```

**No Kit can request this.** Unlike `policy`, the flag has **no** counterpart in `kit.yaml`. A Kit declaring it may overwrite credentials would grant itself permission.

**An unchanged value is not rewritten.** Otherwise, every provisioning round would write the same value again, and the audit log would fill with "Credential changed" for one that did not change. Checked as a predicate (`SettingService.encryptedSecretEquals`) or within `encryptFromImport` — the installer never gets the plaintext. "Cannot determine" counts as "unequal": this costs a superfluous write operation instead of a swallowed rotation.

**What the flag is not:** not a way to *delete* a credential, and ineffective for `apply` (untracked, without a Config document).

### 4.3 Authoring Manifest — "this Project *is* the Kit"

A completely different question than "which Kits are installed here":

| | Install Record | Authoring Manifest |
|---|---|---|
| File | `_vance/kits/installed/<id>.yaml` | `_vance/kits/manifest.yaml` |
| Count | any number | **exactly one** or none |
| Created | with **every** install, automatically | **only** by explicit choice |
| Target Audience | every user | Kit developer |

Content-wise, it is the former `kit-manifest.yaml`: top-layer artifacts, `inherits`, and `inheritArtefacts` — what `export` writes back. It is created in two ways: `writeManifest` during install, or **retroactively via Promote** from an existing record. The second way is more important, because at install time, no one knows they will later adapt the Kit. Because the record already carries origin, descriptor, and layer ownership, Promote costs neither re-clone nor reinstallation.

Once set, the manifest is written with **every** update of this Kit. Being a source is a state, not a one-time act — otherwise, it would remain at the state where the checkbox was ticked, and the next export would push an outdated tree to the repo.

The Kit during Project Create is **not** manifest-managed: "I create a Project and specialize it for `security`" creates a record and nothing else.

---

## 5. Inherit Resolution

Inherits are resolved in order, **last-layer-wins** at the file level (relative path within the Kit tree).

```
Effective-Kit := merge(inherits[0], inherits[1], …, inherits[n-1], top-layer)
                                                                    ↑ wins in case of conflict
```

**Algorithm (KitResolver):**

1. Clone top-layer (into `tmp/<uuid-top>/`).
2. Recursively resolve each element from `kit.yaml#inherits` (DFS, separate Tmp-Dir per Kit).
3. Cycle detection via `(url, path)` as a Visited-Set. Cycle → fail-fast with path.
4. Initialize Build-Tree in `tmp/<uuid-build>/`. Copy layers in order `inherits[0] … top-layer` — the file of the later layer overwrites the earlier one.
5. Build-Tree is the input for service persistence (§6).

**What does not happen:**

- **No Settings merging.** If a parent Kit defines `tracing.llm.yaml` and the child does too, the child wins completely. The `value` is not merged, as that would destroy the file-per-entity rule.
- **No Recipe merging.** Same reason. If a child wants to modify a Recipe only slightly, it copies the entire file.
- **No version resolvers.** If two inherit paths pin the same transitive inherit Kit differently, the **first** one seen in the DFS wins. Conflicts are logged; v1 has no SAT solver.

---

## 6. Operations

### 6.1 Install / Update

**Install** brings a Kit new to the Project, **Update** rolls an installed one to the state of its source. Both run through the same code path; the target is the record with the ID from `(url, path)`.

Installing the same `(url, path)` twice is rejected with a hint to `update` — the user who says "install" does not expect a silent re-write. An update without an explicit source takes URL, path, and branch from the record, **not** the pinned commit: that records what *is* installed, not what *should be* installed.

**Pipeline:**

1. Clone source repo (or read folder) → `tmp/<uuid-src>/`.
2. Resolve inherits → Build-Tree `tmp/<uuid-build>/` (§5). Each loaded inherit layer is checked for `sealed: true` — a chain over a sealed Kit is an error.
3. **Validate resolved layers:** `installable: false` → Error. `artifact: true` together with a requested Authoring Manifest → Error (§3.2).
4. Resolve policy (§4.2) and decide per artifact:

   | Situation | `keep` | `overwrite` | `ignore` | `merge` |
   |---|---|---|---|---|
   | does not exist | write | write | skip | write |
   | exists, hash == record | write | write | skip | write |
   | exists, identical to what the Kit wants to write | write | write | skip | write |
   | exists, demonstrably belongs to **another** installed Kit | write | write | skip | write |
   | exists, modified by user | skip | write | skip | 3-way |

   Line three prevents an artifact from becoming unclaimable: if it falls out of the record (update without prune, uninstall without prune) and the Kit later delivers it again byte-identically, there is nothing to protect. Line four separates "the user edited it" from "a sibling Kit wrote it" — without it, the other Kit's file would be frozen forever.
5. Persist via the services. Settings of type `PASSWORD` are decrypted beforehand with the Vault password (§8) — except for `encoding: plain`, where the credential arrives directly and is only encrypted with the server key (§8.1).
6. **Prune** for artifacts that were in the old record and are missing in the new version: Default is **non-destructive** (they only fall out of the record). With `--prune`, they are deleted — **unless** another installed record also lists them; otherwise, an update would tear open a Kit the user never touched.
7. Write record. If an Authoring Manifest exists for exactly this Kit, it is written along (§4.3).

**Merge in detail.** The common base is the state the Kit last installed — reconstructed from the pinned `origin.commit`, and **lazy**: this costs a second clone plus inherit resolution and only happens if an artifact is truly under `merge` *and* locally changed. Three properties:

- If the base cannot be reconstructed (folder source without commit, removed commit, remote unreachable), `merge` falls back to `keep` and states it in the result. No guessing.
- A **conflict never overwrites**: the marked version lands as `<path>.kit-merge` next to it, the original remains. This file belongs to no Kit, so it is never pruned — cleanup is the user's responsibility, its existence a reminder.
- For **Settings**, `merge` behaves like `keep`. Merging a setting value line by line would be a mess.

After a merge, the record contains the hash of the **merged** text, not the Kit version — otherwise, the next update would read the merge as a fresh user change.

**Atomicity:** the Build-Tree is in the Tmp-Dir, Mongo operations run per service. The operation is considered successful once the record is written; a crash before that leads to the same diff on the next run. Idempotent.

### 6.2 Uninstall

Removes the record. Without `--prune`, the artifacts remain — the user may have built upon them. With `--prune`, they are removed, except those also owned by another installed Kit.

The **Kit Config remains**. It is user input; removing it during uninstall would be the same kind of data destruction we otherwise avoid — and it becomes effective again if the same Kit is reinstalled.

### 6.3 Reapply

Reapplies all installed Kits at their **pinned** state in layer order. Repairs the state on disk after the order has been changed; does not install anything newer — that's what Update is for. The usual policy still applies, so local changes remain protected.

### 6.4 Apply

The one-time splat without any management: no record, no update path, no export.

**Without policy** — and this is not an oversight: without a record, there are no hashes against which "has the user touched this" could be decided, and a splat that skips half due to an invisible policy would simply be broken. The `KIT` lock (see [document-lock](document-lock.md)) and `--keep-passwords` still apply.

### 6.5 Migration of Legacy Projects

Projects set up before this change still carry `_vance/kit-manifest.yaml`. An explicitly callable step (`kit_migrate_legacy` or `POST …/migrate-legacy`) converts it into an Install Record and deletes the old file. This is deliberately explicit rather than automatic on read: a silent conversion in the middle of an unrelated operation is no longer traceable afterwards.

The migration forms the hashes from the **current** Project content. The old manifest carries none, and `null` would mark every artifact as "possibly belonging to the user" and freeze the Kit under `keep` — the manifest itself claims these artifacts belong to the Kit. The Authoring Manifest is only adopted on request: under the old model, *every* tracked install wrote one, so its existence says nothing about whether someone maintains the Kit here.

Kits imported via `apply` are not migratable — by design, they never left a trace.

### 6.6 Export

Publishes the top-layer of the **Kit Source** (§4.3) back to the Origin Repo. Without an Authoring Manifest, there is nothing to export; the error refers to Promote.

**Pipeline:**

1. Initialize `tmp/<uuid-out>/` locally as an empty Git repo (or fresh clone of Origin Repo+Branch).
2. Read all artifacts listed in the manifest from the current Project state and write them file-per-entity to the Tmp-Tree.
3. **PASSWORD Settings**: Decrypt plaintext with the server key, immediately re-encrypt with the user-supplied Vault password, store as `value: <vault-ciphertext>`. The `kit.yaml` then gets `hasEncryptedSecrets: true`.
4. Write `kit.yaml` — `inherits:` passed through.
5. Commit with auto-message, push if Origin is set.

**Important:** Export includes **only** top-layer artifacts. Inherits are referenced via `kit.yaml#inherits`, not copied inline — that is the whole point of file-per-entity + last-layer-wins.

---

## 7. Tech Stack & Pipeline Details

| Component | Technology |
|---|---|
| Git operations | [JGit](https://www.eclipse.org/jgit/) (`org.eclipse.jgit:org.eclipse.jgit`) |
| Tmp directories | `<workspace>/tmp/kits/<uuid>/` — automatic cleanup after successful import/export, on crash the dir remains (for forensics) |
| YAML parsing | SnakeYAML / Jackson (as elsewhere in the Project) |
| Three-way merge | JGit `MergeAlgorithm` / `MergeFormatter` — the same library that already provides the Git layer, so no additional dependency |
| Module | `vance-brain/.../kit/KitService.java` (orchestrates), `KitRepoLoader` (JGit), `KitResolver` (Inherits), `KitInstaller` (Persistence + Policy), `KitRecordStore` (Records, Config, Manifest), `KitPolicy`/`KitGlob`/`KitHash` (Decision), `KitBaseTree`/`KitMerge` (3-way), `KitLegacyMigrator`, `KitExporter` (Push) |
| Tool exposition | `kit_install`, `kit_update`, `kit_uninstall`, `kit_apply`, `kit_export`, `kit_status`, `kit_migrate_legacy` as Server Tools. `kit_update` without arguments updates **all** installed Kits |
| REST | `/brain/{tenant}/admin/kits/{projectId}/…` — `status` (list), `manifest`, `install`, `update`, `update/{kitId}`, `update-all`, `reapply-all`, `uninstall/{kitId}`, `promote/{kitId}`, `config/{kitId}` (GET/PUT), `migrate-legacy`, `apply`, `export` |
| Web-UI | Kit card in `scopes.html`, Kit row in `/documents` (see §10) |

**Tmp-Workspace:** Located below the Brain workspace (e.g., `~/.vancetope/tmp/kits/`), not in the Project itself. Each operation gets its own UUID, lifecycle-managed via `Path.toFile().deleteOnExit()` as a fallback + explicit cleanup in finally.

**JGit-Auth:** Token-based via `UsernamePasswordCredentialsProvider("x-access-token", token)` for GitHub/GitLab. SSH keys are not supported in v1 — tokens are more portable and suffice for 99% of cases. Folder URLs (`file://...` or absolute path) pass directly through JGit without auth.

---

## 8. Settings Crypto: Vault Password as Transport Key

PASSWORD Settings are encrypted in the server with `AesEncryptionService` (see `vance-shared/.../crypto/AesEncryptionService.java`). During export, we must **re-encrypt** them with the user-supplied Vault password so that the resulting repo is portable and does not exfiltrate the server key. The reverse applies during import.

**Required extension in SettingService** (belongs in [settings-system.md](settings-system.md), referenced here):

- `decryptForExport(tenantId, ref, key, vaultPw) → vaultCiphertext` — Get plaintext via server key, encrypt with Vault PW, return vault-ciphertext. Never expose plaintext.
- `encryptFromImport(tenantId, ref, key, vaultPw, vaultCiphertext)` — Decrypt Vault-Ciphertext with Vault PW, re-encrypt with server key, persist.

**Vault PW detection:** `kit.yaml` sets `hasEncryptedSecrets: true` if the Kit (or one of its Inherits) contains PASSWORD Settings **with `encoding: vault`**. The importer then prompts for the Vault PW. The question is "does the install need a Vault password", not "does the Kit provide a credential" — a Kit whose encrypted Settings all arrive as `plain` (§8.1) needs none, and asking for one that is never used cannot be answered incorrectly. Without PW → Skip all PASSWORD Settings + Warning. Wrong PW → Decryption-Fail per Setting → Skip + Warning, no abort.

**Inherits & Vault:** A separate Vault PW may be necessary for each Inherit layer (different repo, different authors). v1: a **single** Vault PW per operation, which is tried on all layers. Wrong PW per layer = skip Settings, continue. If this causes issues in practice, v2 will include a PW map.

### 8.1 `encoding:` — what the Vault password actually protects against

The Vault password protects a credential **at rest in a store from which the reader retrieves it**: a Git repo that anyone who can reach it can clone; a library archive that is a file on a server. This is precisely why it is shared out of band — the store itself cannot be trusted with the secret.

An **ODE source** has no such store. The bundle is built per request and delivered over TLS to a caller authenticated by the host. There is no copy that a Vault password could protect, and no channel over which one would be agreed — an ODE host provisions a Project precisely so that no one has to type anything. This is the same argument already made for signatures with `KitSourceType.ODE`: token and TLS say what the additional mechanism would have said.

`settings/<key>.yaml` therefore carries an `encoding:` field:

| Value | `value:` contains | Allowed by |
|------|------------------|-------------|
| `vault` (Default, can be omitted) | `AesEncryptionService.encryptWith(plaintext, vaultPassword)` blob | any source |
| `plain` | the credential itself; the install encrypts it on arrival with the server key | **only** `ODE` |

**The restriction to ODE is the complete security statement** — it protects nothing else. It is enforced as a gate (`KitPlaintextSecretGate`), **per layer** and **hard**: an ODE top-layer says nothing about a base Kit from a Git repo behind it, and a skipped credential is invisible (the install reports success, the setting is simply missing, and the first symptom is an opaque 401 days later). A `plain` from a non-ODE source breaks the install and names the file.

Two rules on the field itself, both rejections rather than leniency: an unknown word is a typo in a security-relevant field (reading `plian` as `vault` creates a decryption error far from the cause), and `encoding:` on a non-encrypted type means the author believed something about the file that is not true — presumably that it would be encrypted.

What this does **not** change: a delivered credential is set if the Project has none, and then never touched again (§8, `keep`). A rotated key remains rotated.

**The next value, named so it arrives as an addition and not a redesign:** `sealed` — the host encrypts against the reader's public key (hybrid: ephemeral AES key, wrapped with it). What this buys beyond `plain` is real, but narrow: the bundle is unpacked into a temp directory during install, a TLS-terminating proxy in front of the reader sees the body, and a debug dump of a bundle would carry the credential. `sealed` closes all three. It does **not** close an active man-in-the-middle, as long as the public key travels with the build request — whoever can read the request exchanges the key, decrypts, re-encrypts, and forwards, and it again only holds TLS. This is the same error as a Vault password next to its blob, and therefore the key belongs in the registration that issues the host token, not in the call. Additive by design: an unknown `encoding` is already rejected during parsing, the gate gets an additional case, and no Kit written today changes its meaning.

---

## 9. Auth & Source URLs

**Supported URL forms:**

- `https://github.com/org/repo.git` — Standard HTTPS, token via form.
- `https://gitlab.intern.example/group/repo.git` — ditto.
- `file:///absolute/path` or `/absolute/path` — local folder, no clone, JGit reads directly.

**What is not supported:** SSH (`git@github.com:...`) in v1, because it requires system keys; will be supported later via user settings that hold a path to the private key.

**Token storage:** Tokens are a PASSWORD Setting at the user level (`_user_<id>` Project) with key `kit.token.<host>`. In the web form, the value is encrypted and stored on first entry and pre-filled for subsequent operations — like any other provider key.

---

## 10. Web-UI

Kits live in two places: they are managed in `scopes.html`, and interacted with daily in `/documents`.

### 10.1 `scopes.html` — the Kit Card on the Project

Lists the installed Kits in layer order, each with name, version, origin, and artifact counts. Four actions per Kit:

| Action | |
|---|---|
| **Update** | opens the import dialog with pre-filled source — token and Vault password can be different per Kit |
| **Rules…** | Policy editor: default action, order (`sortIndex`), exception list with namespace, pattern, and action |
| **Develop** | Promote (§4.3). Only visible as long as the Project is not already the source of another Kit and the Kit is not an `artifact` |
| **Uninstall** | two separate confirmations: first "Remove entry?", then separately "Also delete files?" with Cancel as the safe answer |

Also **Update All** (from two Kits) and **Install…**.

**Form fields during Install/Update:**

| Field | Type | Note |
|---|---|---|
| Repo URL | `text` | Required for Install. Accepts HTTPS, `file://`, absolute paths. |
| Path in Repo | `text` | Optional. Default: Repo root. |
| Branch | `text` | Default: `main`. |
| Commit SHA | `text` | Optional, pins the state. |
| Token | `password` | Optional, for private repos. |
| Vault Password | `password` | Required if the Kit declares `hasEncryptedSecrets: true`. |
| Manage as installed Kit | `checkbox` | Default **on** = Install/Update with record. Off = `apply`. |
| This Project is the Kit Source | `checkbox` | Default **off**. On = Authoring Manifest (§4.3) — for Kit developers. |
| Cleanup Mode | `checkbox` | `--prune` — only for update. |
| Protect Passwords | `checkbox` | `--keep-passwords` — only for `apply`. |

**Export** has its own form (target URL/branch, token, Vault password, commit message) and only appears if the Project is a Kit source.

### 10.2 `/documents` — Kit Row at Project Root

At the Project root, a line "N Kits installed" with the names and an **Update Kits** button; then the document list reloads because Kits write documents. Deliberately **no** "Update available" badge — that would mean querying every Kit remote on load.

The line silently disappears if the Kit endpoints are not accessible: they require Project `ADMIN`, and for a reader who only views documents, Kits are not a concern.

**Both interfaces are available in every Project** — including the `_tenant` and `_user_<id>` Projects. The latter is even useful: a user Kit can synchronize personal Skills + Settings across multiple Vancetope installations.

---

## 11. What Kits do NOT do

- **No auto-update.** There is no "pull on every login". `update` only runs when someone triggers it.
- **No version resolver / SAT.** Inherit conflicts (same transitive inherit, different branches) are logged, not resolved — first-seen wins.
- **No partial import.** Either the entire Kit (including inherits) or nothing. Those who only want Skills build a Kit with only Skills.
- **No diff viewer in the web.** Update shows a result list of what has changed. Side-by-side diff is editor work.
- **No rematerialization on prune.** If a Kit deletes an artifact that a deeper Kit also owns, it remains — with the content of the deleting Kit, not the owner's. `reapply` (§6.3) restores this.
- **No trust model for foreign Kits.** A Kit brings executable surface — Server Tool Configs, Recipes, Settings. Signature and origin verification are prepared (record identity, locked `_vance/kits/**`), but not built — see §12.
- **No partial inherit pruning.** `--prune` operates on the union of all layers of a Kit; decoupling individual inherit layers and retaining their files is not possible. To get rid of an inherit, remove it from `kit.yaml` and run `update --prune`.

---

## 12. Where Kits may come from

`_vance/config/kit-sources.yaml` in the `_tenant` Project specifies which sources are allowed and under what rules. Optional and purely **additive**: if the file is missing, everything behaves as before.

```yaml
sources:
  - id: vancetope-library
    type: library                    # git | folder | library | ode
    url: https://library.vancetope.com
    signature: required              # off | warn | required
    publicKey: |                     # optional; missing = bundled default key
      -----BEGIN PUBLIC KEY-----
      …
  - id: house-kits
    type: git
    url: https://git.intern.example/kits.git
    signature: off
```

**Assignment via the longest URL prefix.** A host can thus be configured loosely, and a single repo on it strictly. The Kit reference remains a `(url, path)` pair — adding a source never changes the identity of an installed Kit.

A URL that claims no source still gets one: guessed from its form (git or folder), without signature requirement. Rejecting unknown URLs would mean a tenant first registers every colleague's repo before being able to install from it — and every existing installation would break the moment the file appears.

> **YAML trap:** `signature: off` is a *Boolean* in YAML 1.1 and arrives as `false`. The parser catches this. `on`/`true`, however, are rejected instead of guessed — "on" does not say whether it is checked or required.

### 12.1 Signature

A Kit brings executable surface — Server Tool Configs, Recipes, Settings. The signature answers whether it truly comes from the specified source and nothing was added en route. **Vancetope only verifies, it never signs:** signing requires the private key and the delivery context, both belong at the other end.

Detached as `kit.sig.yaml` next to `kit.yaml`:

```yaml
algorithm: Ed25519
keyId: vancetope-library-2026
treeHash: sha256:…
signedAt: 2026-08-17T10:00:00Z
signature: base64…
```

**A purchased file is named `<kitId>.kit`** (media type
`application/vnd.vancetope.kit+zip`). It contains a perfectly ordinary
ZIP — renaming is enough to look inside. The custom extension states *what* the
file is, and silently warns against the obvious error: unpacking, changing something,
and re-zipping results in a Kit whose signature no longer holds, because
the personalized delivery is signed.

**The Tree-Hash** is deliberately not an archive hash: packing order, timestamps, permissions, and compression differ between the machine that signs and the one that verifies — any of these would break a signature without anything being wrong.

```
treeHash = sha256( each file, sorted by path: "<path>\0sha256(content)\n" )
```

Directories are not hashed (Git does not preserve empty ones anyway), and `kit.sig.yaml` is excluded — a signature cannot be part of what it signs.

**The Tree-Hash *plus* the delivery fields** (`licensedTo`, `purchaseId`, `licenseExpiresAt`, §3.1) are signed. Signing only the tree would leave `licensedTo` editable without breaking anything — the tenant binding would then be a recommendation. Missing fields are included as an empty string, otherwise deletion would be a way to keep a signature valid.

### 12.2 Tenant Binding and Expiration

Signature answers whether a Kit is **genuine**. Whether it is **yours** is another question — a correctly signed Kit licensed to a different tenant is completely genuine and completely not yours. Therefore, a second gate:

- `licensedTo` must match the installing tenant.
- `licenseExpiresAt` in the past denies **Install and Update**. Installed items remain untouched — an expired license ceases to authorize new things; removing artifacts from a running system is a different process, not decided by a date in a metadata field. The error message states this explicitly.

**Both only apply with a verified signature.** Unsigned, these fields are text that anyone can edit; enforcing them would stop the honest, no one else, and suggest a guarantee that does not exist. Where they appear without a signature, they are logged and ignored.

### 12.3 Enforcement

Checked **per layer**, not per installation: a Kit's inherits can come from completely different sources, and a trustworthy top-layer says nothing about a base Kit from elsewhere.

| Result | `off` | `warn` | `required` |
|---|---|---|---|
| valid | — | pass | pass |
| no signature | pass | Log | **rejected** |
| no key configured | pass | Log | **rejected** |
| content differs from signed | pass | Log | **rejected** |
| signature invalid | pass | Log | **rejected** |

The four error cases are distinguished because they have different causes and different remedies — "signature verification failed" would leave the operator guessing between four possibilities.

---

## 12a. Provisioning — the source says which Kits should be here

§12 answers "where **may** a Kit come from". This is a different question than "which Kits **should** this Project have", and the second has its own file.

**Two axes, and only one is open.** The reference type (`KitSourceType`: `git`/`folder`/`library`/`ode`) is a closed enum — "get me a directory full of files" is not a question that multiplies, and four core places branch on it. The **provisioning mechanism**, however, is an open handler registry (`KitProvisioningHandler`, string-`id()`, contributable from any module): where a Kit-should-list comes from multiplies — an application host, a list in a Git repo, a sweep over an account's store entitlements.

One mechanism is built-in: **`ode`**. It asks a third-party application which Kits a Project should have, and retrieves them on demand. The counterpart is the `vance-ode-kit` module (see its README); a host implements an interface and is a Kit source without Vancetope knowing it.

### 12a.1 The Declaration in the Project

```yaml
# _vance/kits/provisioning.yaml
provisioning:
  - type: ode                                    # mechanism ID, not KitSourceType
    url: https://crm.intern.example
    token: "{{secret:project:kit.token.crm}}"
    authority: notify                            # notify | update | manage
    params:                                      # what is desired
      lang: de
      modules: [crm, invoicing]
```

**Read without cascade.** Any other Kit document goes through the chain Project → `_tenant` → bundled; this one does not. An entry in `_tenant` would be visible in every Project of the tenant and thus install **everywhere** — the opposite of a Project decision.

**The token is a reference, not a value.** A document is in plaintext in the database and travels in exports. Resolved via the connector path, so a `PASSWORD` target is legitimate (see [settings-system](settings-system.md)). `params` are **not** resolved: they go to a third party, and the token is the field intended for that third party.

**A broken document is reported, not ignored.** Also an unknown `authority` — a typo in `manage` would otherwise mean the opposite of what was written, and the writer would learn it by nothing happening.

### 12a.2 Three Triggers, Three Different Reasons

| Trigger | What it does | Why |
|---|---|---|
| **Project Start** | provision | a new or long-dormant Project does not yet have its Kits |
| **Change to `provisioning.yaml`** | provision | someone has entered a source and expects it to arrive |
| **Every 4 hours** | only **check** | the *host* has published something while the Project was open |

The division is not arbitrary: the first two react to a change **on our side** and may therefore install; the third reacts to a change **on the host's side** and may only do so if the entry allows it.

The tick runs over the Projects owned by this Pod. Thus, "only as long as the Project is running" and "exactly once" are the same fact — a Project belongs to a Pod. Interval: `vance.kits.provisioning.check-interval` (default 4h), can be disabled via `check-enabled`. A Kit is not a feed.

### 12a.3 How much authority the host gets

| Level | The host may |
|---|---|
| `notify` (Default) | nothing unsupervised — deviations are sent as Inbox items |
| `update` | update **installed** Kits |
| `manage` | additionally pull **new** Kits |

Graduated instead of boolean, because the two operations are of different magnitude: "a Kit has a new revision" changes the *content* of what is installed, "this Project should now also have X" changes the *tool surface* of the Project. One flag for both would mean granting the second to get the first.

The higher the level, the more the host is an **administrator of this Project**. For a corporate host, this is the purpose; therefore, it is in the entry and not in the code, and therefore writing `_vance/**` requires ADMIN.

**Uninstall is not in any level.** A deleted line removes nothing. A desired state that deletes documents from the Project when a line is deleted turns a typo into data loss; `uninstall` is a verb someone types intentionally. Honestly named: bootstrap-and-pull-along, not a reconciler.

**Credentials via this path.** Provisioning does not carry a Vault password — there is no one who could type one, and that is the point. A Kit can therefore only deliver a `PASSWORD` Setting here if it uses `encoding: plain`, and only ODE sources are allowed to do that (§8.1). An `encoding: vault` in this path is skipped.

**Every round lands in the [Megadodo Feed](megadodo-system.md)** — see §12b. An uneventful round writes **nothing**; the tick runs every four hours over each Project.

### 12a.4 How "has something changed" is answered

The host declares a **revision** per Kit on a cheap, cacheable call — so the regular query does not cost a download. During installation, it is folded together with the `params` into a `provisioningStamp` on the Install Record.

**The params must be included.** They go to the build, not to the cacheable call — so the revision never saw them. Without the folding: change `params:`, revision same, check says "nothing to do", new params **never** take effect. Silently.

Four cases remain deliberately silent, each for its own reason:

- **Host unreachable** — not a deviation, but someone's outage.
- **Record without stamp** — installed manually or before the field; otherwise, the first tick after an upgrade would be noisy.
- **Source without revision** — not checked instead of guessed; guessing would mean fetching anew every tick or never.
- **An open Inbox item for the same Kit** — six unanswered notifications a day are a reason to disable the feature. The open item is also the memory that saves a "last seen" storage.

The recipient of the message is the **author** of `provisioning.yaml`. Whoever enters a source is the one concerned by its deviation; notifying all tenant admins would turn a Project configuration into everyone's Inbox.

### 12a.4a The Policy Default depends on the Reference Type

If no one writes a policy — no `_vance/kits/config/<id>.yaml`, no `policy:` in `kit.yaml` —, then the reference type decides, and for `ode` **differently per artifact class**:

| Artifact | Default for `ode` | Why |
|---|---|---|
| Documents | `overwrite` | The host assembles the bundle; a new revision *is* the statement "this has changed". With `keep`, the change would be fetched and then discarded — the mechanism would appear functional and silently do nothing |
| Settings | `keep` | A setting is a *configured* value, and whoever set it is usually right about their own installation |

The difference stems from the first live run: there, the Centauri endpoint address was skipped because it was a setting and someone had set it manually — with a blanket `overwrite`, the Kit would have overwritten it and Centauri would silently point to the wrong address.

> This source configuration is now a **Document** (`_vance/config/feeds/<id>.yaml`, see [centauri-service](centauri-service.md) §10) and thus falls into the `overwrite` class — which is exactly right for a `{{ accessUrl }}` calculated per request. The division above remains valid; it describes two artifact-*classes*, not this one example.

**A written policy applies to both classes.** Whoever writes a `default:` has thought about this Kit; the division only exists if no one has. Credentials are protected one level further (§12a.5) and are never replaced even under `overwrite`.

### 12a.5 What a provisioned Kit is not allowed to do

**No provider config, no Vault binding.** `vance.kits.setting-deny-keys` (default `ai.provider.*,vault.*`) keeps a Kit away from the settings with which it could redirect the Project's model traffic or secret resolution. Origin-independent: provisioning writes as `USER`, a pure agent filter would have bypassed it. The button is the operator's — there is deliberately no extension per entry, because it would be a bypass on the import request.

**No overwriting secrets.** A delivered `PASSWORD` value is set if none exists, and then never touched again — even under `overwrite`. An encrypted value has no comparable hash, so the policy *cannot* distinguish "unchanged" and "rotated", and a run that resets a rotated key is an outage, not an update.

**Nothing under `_vance/kits/**`.** This prevents any Kit from provisioning another Kit — the self-propagation path is closed.

**No mount with `protocol: local`.** A mount document (`_vance/config/mounts/<name>.yaml`) may be provided by a Kit — an `ode`-mount is a connector like a feed source, and an archive serving its own files is the case for which provisioning exists. `local` is different: it points to the filesystem of *this* Pod. `KitInstaller.requireNotLocalMount` rejects it, and a mount document that cannot be read as a YAML mapping also — on this path, "cannot recognize" must mean no. Second barrier next to `vance.jaglan.local.allowed-roots`: the property says which trees may be mounted at all, this guard says who may decide that.

**No signature.** With an `ode` host, author and deliverer are the same machine; a signature would prove nothing that TLS and token do not already say. `signature` is `off` for this type, and that is a decision, not a loophole. The trust anchor is the hand-written entry in `kit-sources.yaml`.

### 12a.6 What the host learns

Instance (`vance.instance.name`, no default — not set means omit field), tenant, Project name, the ID of a **previous** installation, the URL under which we reached it, and the `params`. So *location* — enough to build the correct Kit and find a failure in its own log.

**No persons.** No `userId`, no display name, no "who triggered it". The field list is closed; `params` is next to it and open, because it says *what* and not *who*.

The instance label is self-declared and **not an authorization basis** — the host authorizes via the token.

The accessUrl is inserted into the Kit files on **our** side (the host declares in `kit.yaml` under `render:` which files carry placeholders). If the host inserted it itself, it could respond with a different address than the one used.

---

## 12b. What lands in the Activity Feed

A Kit is the only thing that **software** installs into a Project: documents, recipes, tool definitions, credentials. Whether this happened — and whether **all** of it happened — must be traceable by the Project owner. Every operation therefore writes a line to the [Megadodo Feed](megadodo-system.md).

| Action | Outcome | When |
|---|---|---|
| `kit.lifecycle` | `success` | installed, updated, applied |
| `kit.lifecycle` | `incomplete` (**WARN**) | written, but something withheld — typically an undelivered credential (§8.1) |
| `kit.lifecycle` | `failure` (**ERROR**) | Resolve or write thrown |
| `kit.lifecycle` | `success` (**WARN**) | uninstalled; the line says whether artifacts were removed |
| `kit.provisioning` | `failure` (**ERROR**) | Host unreachable or `provisioning.yaml` unreadable |

`traceId` is **one operation** — the UI folds lines by it into one entry; a longer-lived ID would collapse the entire history of a Kit into a single one.

**Emitted in `KitService`**, not at the caller: this way, Admin REST, LLM Tools, Project Create, and Provisioning generate the same lines — and the one path that runs unsupervised is not the one that is silent. This is the fix for a real error pattern: the result of the install was discarded in the provisioning path, making an incomplete install indistinguishable from a complete one. The first symptom was a 401 days later from what the Kit configured, and the only trace a log line on the Pod that currently owned the Project.

Three distinctions, all intentional: what was skipped due to a **Document Lock** is not `incomplete` (that's the lock at work); **argument errors** like "apply plus writeManifest" write nothing (the caller sees them immediately); and `kit.provisioning` remains a **separate action** because it fires before a Kit has a name.

---

## 13. Open Points

**Kit Library and Shop.** The `library` source type is defined and configurable, the loader for it does not yet exist — a correspondingly configured source reports this explicitly on load. Delivery, purchase, and fingerprinting: see `planning/kit-shop.md`.

**No copy protection.** Kit content is prompt text that must go into the model in plaintext and resides as a Document in the Project. Copying cannot be prevented; the signature answers origin, not redistribution. Considerations for this are in `planning/kit-shop.md` §2.

**Kit Catalog.** The tenant-wide catalog of pre-configured Kits (see [project-kits-catalog](project-kits-catalog.md)) is the natural place for entries from a remote source.

---

## 14. Example: kernel-security

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
# _vance/kits/installed/kernel-security-a4f32b.yaml
id: kernel-security-a4f32b
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
descriptor:
  inherits:
    - url: https://github.com/mhus/kits.git
      path: c-development
    - url: https://github.com/mhus/kits.git
      path: security-base
artefacts:
  documents:
    - path: skills/cve-analysis/SKILL.md
      hash: sha256:1f0c…
      layer: kernel-security
    - path: recipes/triage.yaml
      hash: sha256:7c31…
      layer: kernel-security
    - path: skills/code-review/SKILL.md
      hash: sha256:8ba2…
      layer: c-development
    - path: skills/threat-modeling/SKILL.md
      hash: sha256:e550…
      layer: security-base
  settings:
    - key: ai.alias.default.analyze
      hash: sha256:44de…
      layer: kernel-security
    - key: format.tabwidth
      hash: sha256:9a17…
      layer: c-development
```

Installing a second Kit alongside is the normal case — it gets its own record, and in case of colliding paths, the later installed one wins (or the one with a higher `sortIndex`).

If `c-development` removes `skills/code-review/SKILL.md` in a later version: the next `update --prune` sees the path in the old record with `layer: c-development`, but **not** in the new Build-Tree → the file is deleted, provided no other installed Kit also owns it.

To further develop this Kit, make the Project a Kit source via **Promote**. Only then is `_vance/kits/manifest.yaml` created, and only then can `export` write back the top-layer — Inherit artifacts remain with their Kits, referenced via `kit.yaml#inherits`.
