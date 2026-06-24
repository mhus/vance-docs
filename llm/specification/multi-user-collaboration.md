---
# Vance — Multi-User, Teams & Collaboration

> Defines how Tenants, Teams, Users, and Project Sharing work.
> Builds upon [architektur-scopes-clients](architektur-scopes-clients.md), extending the Scope hierarchy.
> Status: Concept — not in v1, but data model prepared from the start.

---

## 1. Scope Hierarchy (Extended)

The existing hierarchy (see [architektur-scopes-clients](architektur-scopes-clients.md)) is extended with the top levels:

```
Tenant (Organization)
  └→ Team (Workgroup)
       └→ Project Group
            └→ Project
                 └→ Session
                      └→ Think-Process
```

Orthogonal to this: **User**.

---

## 2. Entities

### 2.1 Tenant

The hardest isolation boundary. Data from different Tenants is completely invisible to each other.

```yaml
id: tenant_acme
name: "ACME Research Institute"
plan: team              # free | personal | team | enterprise
settings:
  default_llm_provider: anthropic
  max_think_processes_parallel: 10
  linker_budget_per_day: 1000    # LLM-Calls for Brain Linker
  storage_limit_gb: 50
created_at: 2026-04-23
```

| Aspect | Description |
|--------|-------------|
| Isolation | Complete — no cross-Tenant access, no shared data |
| Billing | Billing at Tenant level |
| Admin | Tenant has at least one admin who manages Teams and Users |
| v1 | Implicit default Tenant. `tenant_id` field exists everywhere, set to Default |

### 2.2 Team

A workgroup within a Tenant.

```yaml
id: team_nlp_research
tenant_id: tenant_acme
name: "NLP Research Group"
description: "Research on efficient Transformer architectures"
members:
  - user_id: user_mike
    role: owner              # owner | admin | member | viewer
  - user_id: user_sarah
    role: member
  - user_id: user_tom
    role: viewer
settings:
  shared_memory: true        # Team has its own Memory (facts, documents)
  default_project_visibility: team
created_at: 2026-04-23
```

| Aspect | Description |
|--------|-------------|
| Membership | Users can be in multiple Teams |
| Roles | owner (everything), admin (manage Team), member (use Projects), viewer (read-only) |
| Memory | Teams can have their own Memory (Team knowledge, shared documents) |
| v1 | No Team concept. Implicitly: one User = one Team = one Tenant |

### 2.3 User

```yaml
id: user_mike
tenant_id: tenant_acme
email: mike@acme.org
name: "Mike Hummel"
teams: [team_nlp_research, team_engineering]
preferences:
  default_llm: claude-sonnet
  language: de
  notification_channels: [email, push]
role: admin                  # Tenant role: admin | user
api_keys:
  anthropic: "sk-..."       # encrypted
  google: "..."
created_at: 2026-04-23
```

### 2.4 Project Visibility

Projects have a visibility that determines who can access them:

| Visibility | Who sees it | Use Case |
|-------------|-------------|----------|
| `private` | Only the creator | Personal work, drafts |
| `team` | All members of the assigned Team | Normal teamwork mode |
| `tenant` | All Users in the Tenant | Organization-wide knowledge |

```yaml
# Project Document (extended)
id: proj_transformer_review
tenant_id: tenant_acme
team_id: team_nlp_research        # null for private
owner_id: user_mike
visibility: team                   # private | team | tenant
collaborators:                     # additional explicit access
  - user_id: user_anna
    role: editor                   # editor | viewer
    invited_at: 2026-04-23
```

---

## 3. Collaboration Model

### 3.1 Basic Principle

**Collaboration means: multiple Users work on the same Project — but not on the same tree simultaneously.**

This is intentionally simpler than Google Docs-style real-time collaboration. Reasons:
- A Think-Process has one Lane → only one Task runs simultaneously
- A Session has max 1 Client → no multiplayer on the same tree
- Brain thinks autonomously → there is no "shared cursor"

Instead: **Parallel work on different Think-Processes** within the same Project.

### 3.2 What Collaboration Specifically Means

| Feature | Description |
|---------|-------------|
| **Shared Project** | All Team members see the same Project, the same Think-Processes, the same Memory |
| **Own Sessions** | Each User has their own Sessions on their own Think-Processes |
| **Parallel Think-Processes** | Mike works on Think-Process A, Sarah on Think-Process B — simultaneously, in the same Project |
| **Shared Memory** | Results from Think-Process A are visible to Think-Process B (Project Scope) |
| **Shared Knowledge Graph** | Insights and Relations are visible across Projects |
| **Think-Process Ownership** | Think-Processes have an Owner; others can read them, but only the Owner (or Admin) can modify them |
| **Review & Approval** | A User can review and approve another's results |
| **Activity Feed** | Everyone sees what happens in the Project (new Think-Processes, results, insights) |

### 3.3 Access Matrix

| Action | Owner | Team Admin | Team Member | Team Viewer | Explicit Editor | Explicit Viewer |
|--------|-------|-----------|-------------|-------------|-------------------|-------------------|
| View Project | yes | yes | yes | yes | yes | yes |
| Create Think-Process | yes | yes | yes | no | yes | no |
| Edit own Think-Process | yes | yes | yes | no | yes | no |
| Edit others' Think-Process | yes | yes | no | no | no | no |
| Read others' Think-Process | yes | yes | yes | yes | yes | yes |
| Add Memory | yes | yes | yes | no | yes | no |
| Read Memory | yes | yes | yes | yes | yes | yes |
| Create Relations | yes | yes | yes | no | yes | no |
| View Knowledge Graph | yes | yes | yes | yes | yes | yes |
| Change Project Settings | yes | yes | no | no | no | no |
| Invite User | yes | yes | no | no | no | no |

### 3.4 Think-Process Ownership

In v1, a Think-Process is firmly tied to exactly one Session (see [architektur-scopes-clients §2](architektur-scopes-clients.md) and [think-engines §5](think-engines.md)). The Session, in turn, belongs to exactly one User. This automatically implies:

- **No separate locking needed:** the Session binding is the lock. Only the Session Owner can edit, control, or terminate the Think-Process.
- **Other Users see the Think-Process read-only** — within the access matrix above. Live viewing of another User's active Session is not a v1 feature.
- **Other Users start their own Think-Processes** in their own Sessions within the same Project.
- **Upon Client disconnect**, the Session goes to `suspended`, as do all its Think-Processes (suspend cascade). The Session Owner can resume them later; other Users **cannot** take them over.
- **Admin-Override** (Session force-close including its Think-Processes) remains an Admin feature — v2, when Team roles are actually active.

Transferring a Think-Process to another Session (including Autonomous Session for remote control) is explicitly **v2** — see [think-engines §10](think-engines.md).

---

## 4. Memory & Knowledge Graph in Collaboration

### 4.1 Extended Memory Visibility

The Memory cascade gains a Team level:

```
Tenant Memory (organization-wide knowledge)
  └→ Team Memory (Team-specific knowledge)
       └→ Project Group Memory
            └→ Project Memory (shared Project knowledge)
                 └→ Session Memory
                      └→ Think-Process Memory (Think-Process-specific, Owner sees everything)
```

When Sarah performs a RAG query in her Think-Process Task, she searches:
1. Her own Think-Process Scope
2. Session Memory
3. Project Memory (including results from Mike's Think-Processes, if promoted)
4. Team Memory
5. Tenant Memory (if available)

### 4.2 Auto-Promotion in Collaboration

In a shared Project, auto-promotion of Think-Process results to Project Scope is more important because other Users need these results.

Options:
- **Auto:** All Think-Process results are visible at Project level (Default for Team Projects)
- **Manual:** Owner must explicitly promote results (Default for Private)
- **Review:** Results are marked as `pending_promotion`, Project Owner approves release

### 4.3 Knowledge Graph in Collaboration

Particularly valuable: different Users find different insights, and the Brain Linker (v3+) can find connections between the insights of different Users.

Example:
- Mike finds: "Flash Attention optimizes IO" (Think-Process A)
- Sarah finds: "MoE reduces Compute" (Think-Process B)
- Brain Linker recognizes: "Flash + MoE are orthogonal and combinable" → new Insight at Project level

This is the collaboration added value that goes beyond "two people on the same document".

---

## 5. Notifications & Activity

### 5.1 Activity Feed per Project

```yaml
activities:
  - type: think_process_created
    user: user_sarah
    engine: "MoE Efficiency Analysis"
    at: 2026-04-23T10:00:00

  - type: think_process_completed
    user: user_mike
    engine: "Flash Attention Review"
    results: 5 Insights, 3 Claims
    at: 2026-04-23T14:00:00

  - type: insight_proposed
    source: brain_linker
    insight: "Flash + MoE are orthogonal"
    confidence: 0.85
    at: 2026-04-23T14:30:00

  - type: contradiction_found
    source: brain_linker
    claim_a: "Sparse Attention scales linearly"
    claim_b: "Practical measurements show O(n log n)"
    at: 2026-04-23T15:00:00
```

### 5.2 Notifications

| Event | Who is notified | Channel |
|-------|------------------------|-------|
| New Think-Process started | Project members | Activity Feed |
| Think-Process completed | Project members | Push + Feed |
| Approval needed | Think-Process Owner or Project Admin | Push + Feed |
| Contradiction found (Brain Linker) | All with relevant Think-Processes | Push + Feed |
| New Insight proposed | Project members | Feed |
| User invited | Invited User | Email + Push |

---

## 6. Technical Consequences

### 6.1 MongoDB Collections (Extended)

```javascript
// New Collections
db.tenants        // Tenant configuration
db.teams          // Teams with member list
db.users          // User profiles
db.invitations    // Invitations to Teams/Projects

// Extended indexes on existing Collections
db.projects       // + tenant_id, team_id, visibility, owner_id, collaborators
db.engines        // + locked_by, locked_at
db.entities       // + tenant_id (already prepared)
db.relations      // + tenant_id (already prepared)
db.sessions       // + user_id
db.activities     // New Activity Feed
```

### 6.2 Auth & Access Control

| Aspect | Solution |
|--------|--------|
| Authentication | OAuth2 / OpenID Connect (Keycloak, Auth0, or custom provider) |
| Authorization | Role-Based Access Control (RBAC) at Tenant/Team/Project/Think-Process level |
| API Security | JWT Token on each request, WebSocket Auth on connect |
| Tenant Isolation | Every DB query has `tenant_id` filter (Middleware) |
| Encryption | API Keys and Credentials encrypted in DB |

### 6.3 WebSocket in Multi-User

- Each User has their own WebSocket connection
- Brain can broadcast Notifications to all Project members
- Activity Events are pushed via Project Channel
- Think-Process Lock Events are sent to all Project Sessions

---

## 7. Implementation Phases

The Multi-User concept will be introduced incrementally:

### v1: Single-User (Implicit)
- [ ] `tenant_id`, `team_id`, `user_id` fields exist everywhere
- [ ] Default values: one Tenant, one Team, one User
- [ ] No Auth, no access control
- [ ] Everything is "private" and belongs to the single User

### v2: Multi-User Basis
- [ ] User registration and login (OAuth2)
- [ ] Tenant creation
- [ ] Private Projects per User
- [ ] Tenant isolation in all queries
- [ ] JWT Auth on API and WebSocket

### v3: Teams & Sharing
- [ ] Team creation and management
- [ ] Project visibility: private / team / tenant
- [ ] Explicit Collaborator invitation
- [ ] Think-Process locking in collaboration
- [ ] Team Memory
- [ ] Activity Feed

### v4: Collaboration
- [ ] Parallel Sessions in the same Project
- [ ] Cross-Think-Process visibility in the Project
- [ ] Auto-Promotion strategies
- [ ] Notifications (Push, Email)
- [ ] Review & Approval workflows
- [ ] Brain Linker finds cross-User connections

---

## 8. Open Questions

1. **Shared LLM Keys vs. User Keys:** Does the Team use common API keys (simpler, Tenant pays), or does each User bring their own (cheaper for Tenant, more complex)?

2. **Think-Process Locking Granularity:** Locking at the Think-Process level is probably sufficient. But what if two Users want to edit different sub-trees of the same Think-Process? For now: not allowed. Later: Sub-Tree locking as an extension.

3. **Permissions Model:** RBAC is sufficient for the beginning. Long-term, possibly ABAC (Attribute-Based Access Control) for finer rules like "Viewer may see Insights but no Claims".

4. **Data Residency:** Relevant for Enterprise Tenants — where is the data located? MongoDB Atlas regions? Self-hosted option?

5. **SSO Integration:** Enterprise Tenants want SAML/OIDC with their Identity Provider. In which phase?

---

*See also: [architektur-scopes-clients](architektur-scopes-clients.md) | [vision](vision.md) | [knowledge-graph](knowledge-graph.md)*
