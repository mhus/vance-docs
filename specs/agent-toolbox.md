---
title: "Agent Toolbox — Baked vs. Self-Installed"
parent: Specs
permalink: /specs/agent-toolbox
---

<!-- AUTO-GENERATED from llm/specification/agent-toolbox.md (translated from the German specification/public/agent-toolbox.md) — do not edit here. -->

# Agent Toolbox — Baked vs. Self-Installed

> The Brain container's toolchain has two layers: a small, deterministic base set **in the image** (`gh`, installer set, JDK 25 via GraalVM base) and everything else as **runtime self-provisioning by the agent** — user-space, without root, to `/app/data/tools`, added to `PATH` at boot via `env.sh`. The `VANCE_EXEC_ENV` marker tells the agent which execution context applies (container vs. workstation); this document is the design reference, the LLM-facing pattern (commands, rules) is in the `self-installed-tools` manual (`_vance/manuals/`).

## 1. Two Layers of the Toolchain

| Layer | Content | Who decides |
|----------|--------|-----------------|
| **Image** | `gh`, installer set (`curl`, `git`, `unzip`, `tar`, `zip`), JDK 25 (GraalVM, incl. `javac`), Node 20 + npm, Python 3.12 + pip | Operator, via Dockerfile change + redeploy |
| **Runtime** | JVM toolchains (Maven, Gradle, other Java versions), static single binaries | The agent, on demand, in the running pod |

The boundary is deliberately drawn as follows:

- **`gh` is baked** because it must be present from the first round — it is the standard interface to GitHub (issues, PRs, releases, clone credentials via `gh auth setup-git`) and thus often precisely the tool needed *before* the first self-installation.
- **JDK/Maven are not baked.** The GraalVM base is already the **current LTS** (JDK 25) as a full JDK — `javac` included; "install current LTS JDK" is covered by the base. Maven & co. are large, moving targets over the wire (cf. the layer discipline in the Dockerfile: "One RUN per concern, ordered most-stable-first"), but have low installation costs in user-space — they belong in the runtime layer.
- **The installer set is baked** (`curl`, `git`, `unzip`, `tar`, `zip`) so that self-provisioning never fails due to missing tools. The agent installs the *tools*, not the *installers*.

## 2. Execution Contexts and the Marker

`exec_run` runs in fundamentally different locations depending on the constellation — a manual describing only one would be **incorrect** rather than just useless for the others:

| Context | Where `exec_run` runs | Marker |
|---|---|---|
| **A. Deployed Brain, WORK-Target** | in the container | `VANCE_EXEC_ENV=container` |
| **B. Local Dev Brain (IDE, MacBook)** | on the developer's workstation | unset |
| **C. Deployed Brain, CLIENT-Target** | on the user's machine via foot (`client_exec_run`) | unset |

**The Marker:** `ENV VANCE_EXEC_ENV=container` in the brain-Dockerfile. It is a deliberate first-class signal instead of path heuristics: set = commands run in the image, unset = workstation. **One value is sufficient** for docker-compose as well as k8s, because the manual formulates persistence against the **pod lifetime**, not against specific volume mounts — if the deployment later provides persistent storage under `/app/data`, the formulation remains correct, only the frequency of installations decreases.

**Sealed-Exec Contract:** The marker is in the INHERITABLE base of `ExecEnvPolicy` (sealed-by-default, Issue #62) — `exec_run` children therefore always see it, otherwise the container would be indistinguishable from a workstation for the manual. The toolchain variables of the `env.sh` hook (`SDKMAN_DIR`, `SDKMAN_CANDIDATES_DIR`, `JAVA_HOME`, `MAVEN_OPTS`, `GRADLE_USER_HOME`, `PIP_CACHE_DIR`, possibly `GH_TOKEN`) are deliberately **not** a base default, but are located as `VANCE_EXEC_ENV_ALLOW` (=`vance.exec.env.allow`) in the brain-Dockerfile next to the marker — everything else, especially the credentials of the deployment environment, remains withheld from subprocesses.

Contexts B and C share the workstation branch of the manual (brew/apt, ask-first, no `/app/data`). The difference: In C, the foot sandbox already provides a **mechanism gate** (deny→allow→ask, default-deny — see [foot-sandbox.md](/specs/foot-sandbox)) before each installation; in B, there is no gate, and prompt discipline ("ask first") bears the same burden alone.

## 3. The Tool Location and its Lifetime

The container mounts `/app/data` and `/app/logs`; in the k8s deployment (mickey), both are **`emptyDir`**. This implies the contract:

- `/app/data/tools` is the agent-writable tool location **for the lifetime of the pod**: it survives container restarts within the same pod, but **every rollout wipes it**. Self-installations are thus **cache, not ownership** — repeatable via a pinned command sequence that the manual itself provides. The manual (in `vance-defaults`, in every Tenant) *is* the persistence layer for installation knowledge.
- **`HOME` (`/app`) is more strictly forbidden than the tools directory:** Pod FS dies even on container restart and additionally counts towards the Node ephemeral quota — full Node disk is a k8s **eviction** path. Caches should therefore be actively directed to `/app/data` (`MAVEN_OPTS=-Dmaven.repo.local=…`, `PIP_CACHE_DIR=…`), not to `~/.m2` and similar.
- **Workspace RootDirs are not a tool location** — not due to ephemerality, but because they are project-scoped and subject to the **suspend/snapshot mechanism**: a 300 MB JDK in the RootDir ends up in Mongo snapshots and consumes project quota. (Deployment-side, the Workspace Root is redirected to `/app/data/workspaces`, see §6 — then checkouts/venvs/node_modules live within the same declared budget as the tools.)
- **Per-pod, not per-Tenant:** `/app/data` is per pod. A second pod installs its own copy on first demand; duplication is accounted for, synchronization would be more expensive.
- **Access only via `exec_run`:** The `work_file_*` tools are confined to the RootDir and deliberately cannot reach `/app/data`. The Exec Isolation feature (work-target.md §8, bubblewrap) also disables install paths when activated.

## 4. The `env.sh` Mechanic

`/app/data/tools/env.sh` is an agent-written file with `export` lines (`PATH`, `JAVA_HOME`, `MAVEN_OPTS`, possibly `GH_TOKEN`). The entrypoint (Phase 2b) sources it **before** the JVM starts:

- The exports land in the JVM's process environment and thus in every `work_exec_run` child process — an installed tool is pod-wide on `PATH` after the **next container restart**, without per-call PATH manipulations.
- **Syntax Guard:** The entrypoint checks the file with `sh -n` before sourcing it. A broken `env.sh` must not prevent Brain boot — it is skipped with a warning; the consequence is that all self-installations disappear from PATH until someone fixes the file. The manual discipline "append-only, one line per tool" is precisely the countermeasure.
- Until restart, the agent sets `PATH` in the call itself (`exec_run` allows full shell syntax, but deliberately has no env parameter).
- A new pod starts with an empty tools directory: no `env.sh` inlining promises anything there that is no longer present.

## 5. Agent Responsibilities

The rules are LLM-facing and documented in the `self-installed-tools` manual; the design rationale is as follows:

| Rule | Why |
|-------|-------|
| Pin versions, never `latest` | Reproducibility; otherwise, each model silently loads something different |
| No parallel installations | sdkman is not concurrency-safe |
| Clean up old versions, direct caches | The volume is a budget, shared with workspaces and exec logs; Node eviction is a hard kill path |
| `gh`-token per call, do not persist | `env.sh` is in plaintext on the volume; persistent tokens only at the explicit request of the user |
| Only touch `/app/data/tools` | "Cleanup" beyond its own directory affects project data |
| On the workstation: ask-first | No gate before an installation on a human's machine (Context B); in C, the foot sandbox applies |

## 6. k8s Measures (mickey, Deployment-Side)

The `emptyDir` remains deliberate — Vance treats pod death as a design case (Workspace suspend/recover from Mongo snapshots), and PVC would duplicate it and introduce Node pinning + storage class costs. The **surrounding measures** are adjusted (mhus-infrastructure, `apps/vance/brain.yaml` / configmap):

1. **Workspace Root to `/app/data/workspaces`** (Env `VANCE_WORKSPACE_ROOT` → Property `vance.workspace.root`): Checkouts/venvs/node_modules then survive container restarts without a recover dance and are within the same budget as tools and exec logs. Pod death remains the snapshot case, as intended.
2. **`sizeLimit` on the data-emptyDir** (e.g., 10Gi): "Node disk fills up diffusely" becomes an attributable pod budget.
3. **`HF_HOME` to `/app/data/.cache`** (Env-Override): Whisper models (~1–3 GB) survive container restarts and are within the budget instead of on the Pod FS.

## 7. Limitations & Rejected Alternatives

- **No Homebrew (in the container):** Default prefix requires root, custom prefix is unsupported, would require a build toolchain that the slim image lacks, ~1 GB mass. sdkman + static binaries cover the same need with two curl calls. On the workstation, brew is naturally the tool of choice — the marker decides.
- **No sdkman template in the image:** Everything under `/app/data` is overwritten by the volume mount — a baked copy would be invisible. The bootstrap installer (`get.sdkman.io`) is the one consciously accepted runtime download; after that, sdkman installs itself.
- **No PVC instead of emptyDir (as of today):** would have introduced Node pinning, storage class discussions, and ReadWriteOnce edges, and duplicated an existing mechanism feature (Snapshot/Recover). The upgrade path remains open: the contract "Tools under `/app/data/tools`, formulation against pod lifetime" survives a later PVC swap unchanged.
- **No second marker value for k8s:** agent behavior does not differ, only expectations — and those are already formulated defensively.
- **Supply chain residual risk:** Runtime self-provisioning means the LLM downloads and executes binaries from the network. Mitigation: pinned releases as a manual requirement, unprivileged user without root, container boundary, opt-in bubblewrap isolation. A deterministic overall image would only be possible with the loss of self-provisioning.
- **Image changes remain the exception:** Every baked addition costs a redeploy of all pods. The threshold for baking in is: "needed from the first round" (gh) or "otherwise no self-provisioning is possible at all" (installer set).

## 8. References

- Manual: `vance-brain/src/main/resources/vance-defaults/_vance/manuals/self-installed-tools.md`
- Implementation: `deployment/docker/brain/Dockerfile` (marker ENV, gh layer, installer set), `deployment/docker/brain/docker-entrypoint.sh` (Phase 2b)
- Execution locations: [work-target.md](/specs/work-target) (CLIENT/WORK/DAEMON, §8 Isolation) · foot gate: [foot-sandbox.md](/specs/foot-sandbox) · Workspace RootDirs: [workspace-management.md](/specs/workspace-management)
