---
title: "Vance — Fook Upstream Transport"
parent: Documentation
permalink: /docs/fook-upstream
render_with_liquid: false
---

<!-- AUTO-GENERATED from specification/public/en/fook-upstream.md — do not edit here. -->

---
# Vance — Fook Upstream Transport

> Locally triaged Fook tickets are forwarded to an external ticket system
> (Default: GitHub Issues). Vance thus acts as the
> **collector/preparation pipeline**, while the target system is the
> **single source of truth** — Lunkwill and the Maintainers work there,
> not in Vance. Reporters receive a link in their Inbox and
> track the ticket in the external tracker; status updates and
> Maintainer comments are polled back and also appear
> as Inbox items.
>
> v1 has exactly one adapter: **GitHub Issues**. The interface
> {@code TicketProvider} is provider-agnostic; additional adapters
> (GitLab, Gitea, Jira, …) can be added as extra Spring Beans.
>
> See also: [fook-service](/docs/fook-service) |
> [user-interaction](/docs/user-interaction) |
> [setting-forms](/docs/setting-forms)

---

## 1. Purpose & Scope

**Problem.** Fook produces locally triaged tickets. For Maintainers to
see them and Lunkwill to process them, they must go to a central
ticket system — specifically:

- **anonymized** (no user/Tenant leak),
- **with approval mode** (no accidental sending),
- **bidirectional** (status + comments flow back),
- **multi-pod safe** (only one Pod sends per cluster).

**Solution.** A small transport pipeline with three components:

1. **{@code TicketProvider}** — Adapter interface to the target system.
   v1 implementation: {@code GitHubTicketProvider} via REST
   API v3.
2. **{@code FookTicketAnonymizer}** — Pure-logic component that
   hashes Reporter identity and scrubs free text using configurable
   regex patterns before anything leaves the Tenant boundary.
3. **{@code FookUpstreamService}** — Cluster-Master-Pod-gated
   scheduler with two ticks: Sender (local → Provider) and Poll
   (Provider → local).

**What it is not:**

- Not its own Vance-HQ-Brain — the goal is a real ticket system
  (GitHub Issues); Vance remains a collector. Lunkwill operates
  exclusively against the target system, not against Vance-internal
  storage.
- No federation, no multi-hop, no custom webhook — Vance
  pulls.
- No data recycling guarantee back to Vance — closed
  tickets can be deleted/restructured in GitHub without Vance
  noticing. This is accepted.

---

## 2. Mode Enum

Setting: {@code fook.upstream.mode}, Default {@code never}.

| Value | Behavior |
|-------|----------|
| {@code never} | Nothing is sent. Sender tick and Poll tick run but return immediately. Inbox item during Triage says "stays local". Day-1 default. |
| {@code automatic} | Every ticket triaged as {@code new_ticket} gets {@code transportApproval=auto} and is pushed by the next Sender tick. |
| {@code manual} | Triage sets {@code transportApproval=pending}. Only when an Admin sets {@code approved} (Admin UI or direct DB) does the tick send. |

**Changing the mode** only affects *future* tickets — tickets already
tagged with `none` are not suddenly sent if the mode later
switches to `automatic`.

---

## 3. Sender Tick — {@code @Scheduled}

```
@Scheduled(fixedDelayString="${vance.fook.upstream.sendTick:PT5M}")
public void sendTick() {
    if (!masterService.isLocalPodMaster()) return;
    if ("never".equals(currentMode())) return;
    TicketProvider provider = currentProvider();
    if (provider == null) return;

    for (TicketDocument ticket : ticketService.listPendingTransport()) {
        try {
            ProviderTicketDraft draft = anonymizer.buildDraft(ticket, ...);
            ProviderTicketRef ref = provider.create(draft);
            ticketService.markTransferred(ticket.id,
                provider.name(), ref.externalId, ref.url);
            inboxItemService.updateContent(
                reporterTenant, ticket.inboxItemId,
                "Ticket transferred", body, payload, "fook");
        } catch (ProviderException e) {
            if (e.isRetryable()) {
                // log + retry next tick
            } else {
                ticketService.markTransferFailed(...);
                inboxItemService.updateContent(... failure body ...);
            }
        }
    }
}
```

**Important — Multi-Pod Guard.** {@code ClusterMasterService.isLocalPodMaster}
is the *first* check. Follower Pods return immediately and don't even
read settings. This is the same pattern as {@code ClusterDistributorTick}
and {@code ClusterCleanupTick}. If the Master crashes, another Pod takes
over after lease expiry.

**Pending List.** {@code FookTicketService.listPendingTransport()}
filters tickets in the local store for {@code status=new} AND
{@code transportApproval ∈ {auto, approved}}.

**Retryable vs. permanent failure.** Providers throw {@code ProviderException}
with an {@code isRetryable()}-flag:

- {@code 429}, {@code 5xx}, Network error → retryable. Ticket remains
  in {@code new}; the next tick tries again. No Inbox update.
- {@code 4xx} except 429 → permanent. Ticket goes to
  {@code status=failed}; the Inbox item is updated to "Transfer failed";
  an Admin must intervene.

---

## 4. Poll Tick — Status + Comments Back

```
@Scheduled(fixedDelayString="${vance.fook.upstream.pollTick:PT1H}")
public void pollTick() {
    if (!masterService.isLocalPodMaster()) return;
    if ("never".equals(currentMode())) return;
    if (!pollEnabled()) return;
    TicketProvider provider = currentProvider();

    List<TicketDocument> mine = ticketService.listTransferredForPolling()
        .stream()
        .filter(t -> provider.name().equals(t.upstreamProvider))
        .toList();

    Instant since = oldestLastSyncedAt(mine).orElse(EPOCH);
    List<ProviderTicketUpdate> updates = provider.pollUpdates(refs, since);

    for (ProviderTicketUpdate u : updates) {
        TicketDocument local = lookup(u.ref.externalId);
        if (u.state != null && !u.state.equals(local.upstreamState)) {
            ticketService.markUpstreamState(local.id, u.state);
            // Status-Inbox-Item OUTPUT_TEXT, criticality LOW
        }
        for (ProviderComment c : u.newComments) {
            // Comment-Inbox-Item FEEDBACK, criticality NORMAL,
            // requiresAction=true
        }
    }
}
```

**Polling Anchor.** We use the minimum of {@code upstreamLastSyncedAt}
of all transferred tickets as the `since` anchor — no update is
missed, even with arbitrarily long Pod downtimes. For the first poll,
it falls back to {@code transferredAt}.

**Provider Filter.** Tickets that were once transferred by Provider A
(e.g., GitHub) are only polled by Provider A — even if the Brain has
since switched to GitLab, the old tickets remain in their original
connection.

**Inbox items for status changes** use {@code InboxItemType.OUTPUT_TEXT}
+ {@code Criticality.LOW} + {@code tags=[fook, fook-status]} +
{@code requiresAction=false}. They inform without forcing an action.

**Inbox items for new comments** use {@code InboxItemType.FEEDBACK}
+ {@code Criticality.NORMAL} + {@code tags=[fook, fook-comment]} +
{@code requiresAction=true}. Reporter clicks "Reply" → Inbox reply
handler calls {@code provider.postComment(ref, replyText)} (see §7).

---

## 5. Anonymization Pipeline

`FookTicketAnonymizer.buildDraft(ticket, instanceSecret,
instanceFingerprint, anonymize, scrubPatterns, extraLabels)`:

### 5.1 Identity Hashing

Reporter identity is replaced by a 16-hex-char hash:

```
reporterHash = sha256(tenantId + "|" + userId + "|" + instanceSecret)[:16]
```

- **Deterministic** across Brain restarts (even for the
  same Reporter → same hash). Lunkwill can recognize "same Reporter, three
  reports" without ever seeing the real name.
- **Salted** (Brain-Instance-Secret) — other Vance instances
  produce different hashes for the same Reporter. Cross-instance
  correlation is explicitly *not* possible, privacy by design.

If {@code anonymize=false}: everything as literal {@code "anonymous"} —
maximum privacy, but no correlation.

### 5.2 Content Scrubbing

Four regex patterns are built-in, each optionally activatable:

| Pattern | Regex (simplified) | Replacement |
|---------|--------------------|-------------|
| {@code email} | `[\w.+-]+@[\w.-]+\.\w{2,}` | {@code [redacted-email]} |
| {@code ipv4} | `\d{1,3}(\.\d{1,3}){3}` | {@code [redacted-ip]} |
| {@code apiKey} | `sk-…`, `ghp_…`, `xox[bpa]-…` (Anthropic, OpenAI, GitHub, Slack) | {@code [redacted-key]} |
| {@code guid} | `[0-9a-f]{8}-…-[0-9a-f]{12}` | {@code [redacted-uuid]} |

The operator selects via setting {@code fook.upstream.scrub.patterns}
(comma-separated). Default: all four enabled. Unknown pattern names
are ignored (with warning); known ones apply in the specified
order.

Application: title, description, triageNote. Not: structured
metadata (type/severity/timestamps).

### 5.3 Bilingual Body (Language)

Before sending, another detail applies: the target system (GitHub
Issues) is read by a Maintainer community that primarily
works in English. However, Reporters may write in their native language.

The **Triage-LLM** provides both versions
(see [`fook-service.md §6.1`](/docs/fook-service#61-new_ticket)):

- `derivedTitle` → always English
- `englishTranslation` → English translation of the description, or
  empty string if the original was already English

`FookService.bilingualDescription(original, englishTranslation)`
assembles the final `description` as:

```
<englishTranslation>

--- Original:

<original report>
```

— if `englishTranslation` is non-empty. Otherwise, only the
original remains. Reporters see the bilingual body in their Inbox (English
at the top), Maintainers on GitHub see the same. The original audit trail
is preserved — the LLM can sometimes translate incorrectly.

Anonymization applies **after** translation, meaning scrubber
patterns run over the final bilingual text — email addresses
and tokens are redacted in both languages.

### 5.4 What is not sent

| Field | Treatment |
|-------|-----------|
| {@code reporter.userId} | → reporterHash |
| {@code reporter.tenantId} | → instanceFingerprint |
| {@code context.projectId/sessionId/processId} | **strip** — Tenant-internal |
| {@code context.recipe/engine} | remains — Vance constants, helpful |
| {@code id} (Fook-UUID) | remains — as {@code fookTicketId} in the Body footer for reverse lookup |

---

## 6. GitHub Convention

The Vance-flavored GitHub Convention is defined by the {@code GitHubTicketProvider}.
Other Providers must align with it.

### 6.1 Issue Title

```
[fook] <derivedTitle>
```

The prefix makes Maintainer filtering trivial — Issues search via
{@code label:fook} or directly in the title filter.

### 6.2 Issue Body

```markdown
> Auto-generated by Vance Fook from a user/engine support request.
> Source: `vance-7f3a2c1d` · Reporter: `b2f1a3c4d5e6f789`

## What was reported

<scrubbed description>

## Triage notes

<scrubbed triageNote, optional>

## Metadata

- type: bug
- severity: high
- recipe: arthur
- engine: arthur
- triagedAt: 2026-06-09T16:00:00Z
- fookTicketId: `7e3f1c2a-...`
```

### 6.3 Labels (automatic)

Each Issue carries:

- {@code fook} (filter anchor)
- {@code fook/<type>} (`fook/bug`, `fook/feature`, `fook/question`, `fook/other`)
- For {@code type=bug}: {@code fook/severity-<level>} ({@code low}/{@code medium}/{@code high})
- Plus {@code fook.upstream.github.extraLabels} (Tenant-configurable)

### 6.4 Comment Body (Reporter Reply)

```markdown
> Reply from reporter `<reporterHash>` via Vance Fook bridge.

<scrubbed reply text>
```

Reporters **do not need a GitHub account** — the Vance Bot posts on
behalf of the bridge. Maintainers see the hash and can reply
via the bridge if needed.

### 6.5 Auth

Personal Access Token (fine-grained) with {@code issues:write} and
{@code metadata:read} on the target repository. **Recommended:** dedicated
Bot account {@code vance-fook-bot} instead of Maintainer PAT. The token is
stored as a {@code PASSWORD} setting (encrypted at-rest).

### 6.6 API Base URL for Enterprise

Default {@code https://api.github.com}. The operator overrides
{@code fook.upstream.github.apiBase} for GitHub Enterprise Server
(e.g., {@code https://github.acme.de/api/v3}).

---

## 7. Comment Reply Bridge

When a Reporter receives a FEEDBACK Inbox item and clicks "Reply",
the reply must go back to the target system.

**v1 implementation:** existing Inbox reply handler calls a
new method {@code FookUpstreamService.postReply(inboxItem,
replyText)}, which in turn calls {@code TicketProvider.postComment(ref,
scrubbedText)}. (Anonymization also applies here — reply
text is processed by {@code FookTicketAnonymizer.scrubText}, then the body template
with hash prefix.)

The Inbox item payload already carries everything necessary:
{@code upstreamProvider}, {@code upstreamUrl},
{@code commentExternalId} (for threading), {@code ticketId}.

*Implementation note:* Reply wiring is a task for Phase 2 — the
v1 scope builds the receiving side + the FEEDBACK Inbox item. Reply
routing can be integrated with the already existing Inbox answer handlers.

---

## 8. Settings — Complete

All settings at the Brain-Instance-Scope ({@code tenant=_vance,
scope=project, refId=_tenant}) — manageable via Setting-Form
{@code _vance/setting_forms/fook-upstream.yaml}.

```
fook.upstream.mode: never                       # never | automatic | manual
fook.upstream.providerType: github              # v1: only github

fook.upstream.github.owner: ""                  # GH org/user
fook.upstream.github.repo: ""                   # GH repo
fook.upstream.github.token: ""                  # PASSWORD (encrypted)
fook.upstream.github.apiBase: https://api.github.com
fook.upstream.github.extraLabels: ""            # comma-csv

fook.upstream.anonymize: true                   # default on
fook.upstream.scrub.patterns: email,ipv4,apiKey,guid

fook.upstream.statusPoll.enabled: true
fook.upstream.statusPoll.interval: PT1H         # via vance.fook.upstream.pollTick
                                                 # (Spring-prop, not setting-form)

fook.upstream.instanceFingerprint: ""           # auto-generated on first send
fook.upstream.instanceSecret: ""                # auto-generated on first send
```

**Read path** is always {@code SettingService.getStringValueCascade(
tenant=_vance, projectId=null, processId=null, key)} — lands on
{@code (SCOPE_PROJECT, _tenant)}, where the Setting-Form writes.

**Auto-Generate on first send** (via
{@code SettingService.set(...)}): fingerprint = `vance-<8hex>`,
secret = random UUID. Remain stable across restarts.

---

## 9. Ticket Schema Extension

Ticket-{@code $meta} is extended with these scalars (existing fields
from {@code fook-service.md} §7 remain):

```yaml
$meta:
  ...                                # unchanged
  status: new | transferred | failed   # local transport lifecycle
  transportApproval: auto | pending | approved | none
  inboxItemId: <inbox-id>              # back-pointer for in-place update
  transferredAt: <ISO>                 # set after successful send
  upstreamProvider: github
  upstreamExternalId: "4287"
  upstreamUrl: "https://github.com/mhus/vance/issues/4287"
  upstreamState: open | closed         # mirror
  upstreamLastSyncedAt: <ISO>          # poll-tick anchor
```

All fields are optional ({@code null} on non-transferred tickets).

---

## 10. Cluster Master Pod

Both ticks are **master-only**:

```java
if (!masterService.isLocalPodMaster()) return;
```

Exactly one Pod in the cluster sends/polls. Other Pods run the same
Spring scheduler but return immediately. In case of Master failover (lease
expiry), another Pod takes over seamlessly without configuration changes.

**Why this is so important:** without a guard, every Pod would push every pending ticket
→ N-times GitHub Issues, N-times GH-API-Rate-Limit
waste, N-times Inbox items per status change. The lock is
not optional, but mandatory security.

---

## 11. Inbox Items

### 11.1 Tracker Item (attached to the ticket)

Written by {@code FookService} directly after Triage. Updated by
{@code FookUpstreamService} on transfer success/failure
**in-place** via {@code InboxItemService.updateContent}.

```
title:           "Ticket created" → "Ticket transferred" / "Ticket transfer failed"
type:            OUTPUT_TEXT
criticality:     LOW
requiresAction:  false
tags:            ["fook"]
body:            Text as below
payload:         { decision, ticketId, status, upstreamProvider?,
                   upstreamExternalId?, upstreamUrl? }
```

| Phase | Body |
|-------|------|
| Triage (mode=automatic) | "Your submission was opened as ticket `<uuid>`. It is being forwarded to the upstream ticket system; this item updates with the link once the transfer completes." |
| Triage (mode=manual) | "… waiting for an admin to approve forwarding …" |
| Triage (mode=never) | "… stays local — upstream forwarding is disabled on this brain." |
| Transfer-Success | "Your submission was transferred to the upstream ticket system. Track it at \<URL\>" |
| Transfer-Failure | "Forwarding your submission to the upstream ticket system failed permanently. Reason: \<msg\>. Contact an admin to retry." |

### 11.2 Status Update Item

A **new** item per upstream status change (not in-place):

```
title:           "Ticket status: open" / "Ticket status: closed"
type:            OUTPUT_TEXT
criticality:     LOW
requiresAction:  false
tags:            ["fook", "fook-status"]
```

### 11.3 Comment Item

A **new** item per new Maintainer comment:

```
title:           "New comment from <author>"
type:            FEEDBACK
criticality:     NORMAL
requiresAction:  true
tags:            ["fook", "fook-comment"]
payload:         { ticketId, upstreamProvider, upstreamUrl,
                   commentExternalId, author }
```

Reporter clicks "Reply" → Reply goes back to the Provider via {@code postComment}
(see §7).

---

## 12. Failure Modes

| Failure | Treatment |
|---------|-----------|
| {@code _vance} lacks LLM credentials (Triage) | Fallback to Reporter Tenant — see [fook-service.md §5](/docs/fook-service#5-triage-flow) |
| Provider HTTP 429 / 5xx | Retryable — Ticket remains {@code new}, next tick |
| Provider HTTP 4xx (except 429) | Permanent — {@code status=failed}, Inbox item to "transfer failed" |
| Provider down during Poll | Log + skip, next tick tries again |
| {@code _vance} has no {@code instanceFingerprint} | Auto-generate + persist on first send |
| Master Pod failover | New Master takes over seamlessly — no duplicate sends due to lease guarantee |
| Reporter gone (User/Tenant deleted) | Inbox write fails → Log, no retry |
| Setting-Form empty + mode != never | Provider-`checkConnection()` shows red, transferOne throws permanent + Inbox failure |

---

## 13. Observability

Metric Convention (Micrometer, see CLAUDE.md):

- {@code vance.fook.upstream.transfers} with tag {@code outcome ∈ {success, retry, failed}}
- {@code vance.fook.upstream.polls} with tag {@code outcome ∈ {success, error}}
- {@code vance.fook.upstream.comments_in} (incoming comments from Provider)
- {@code vance.fook.upstream.comments_out} (Reporter replies to Provider)
- {@code vance.fook.upstream.queue.pending} (Gauge, current pending count)
- {@code vance.fook.upstream.queue.transferred} (Gauge)

No high-cardinality tags ({@code reporterHash}, {@code ticketId}
NEVER).

Audit trail via existing {@code AuditService} for
{@code SettingService.set(...)} for token updates.

---

## 14. Out of Scope (v2+)

- **Webhook instead of Polling** — if GH Issue webhooks are
  configured for the Brain's public URL, pollTick can be replaced
  by push reception. v2.
- **Federation / Multi-Sink** — one Brain, multiple sinks simultaneously
  (e.g., GitHub for bugs, Jira for features). v3+.
- **Pre-Send User-Approval-UI** — today, the Admin writes
  {@code transportApproval=approved} directly; a dedicated
  "Pending Tickets" Admin Dashboard would be v2.
- **OAuth-linked Reporter Identity** — Reporter logs in
  once with a GH account, replies appear under their
  GitHub identity instead of the Bot. v3.
- **LLM-based Scrubber** — Regex doesn't catch everything (no
  "My boss Max Mustermann said …"). v2 with a small
  LightLlm pass.
- **Bulk Export** — import existing tickets from a second Brain.
  Out of scope.

---

## 15. References

- [fook-service](/docs/fook-service) — the local Triage pipeline,
  which is further processed here.
- [user-interaction](/docs/user-interaction) — Inbox subsystem.
- [setting-forms](/docs/setting-forms) — Setting-Form format.
- [light-llm-service](/docs/light-llm-service) — used by the Triage path;
  transport itself communicates directly with the Provider.
- {@code de.mhus.vance.brain.cluster.ClusterMasterService} — the
  Master lease to which the ticks are tied.
