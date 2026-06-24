---
title: Kits
nav_order: 7
permalink: /kits/
---

# Project Kits
{: .no_toc }

Bundled skills, recipes, tools and settings that make a project productive on day one. Pulled from the [`vance-kits`](https://github.com/mhus/vance-kits) catalog.
{: .fs-5 .fw-300 }

<!-- AUTO-GENERATED from repos/vance-kits/ by scripts/sync-kits.sh — do not edit here. -->

## Table of contents
{: .no_toc .text-delta }

1. TOC
{:toc}

---

## What a Kit is

A Kit is a Git bundle with manuals, skills, recipes, server tools and settings, designed to drop into a project and make it productive immediately. Install via `kit install <name>` (Web UI, Foot `/kit-list`, or Anus) — kit contents land in MongoDB through the normal services, not on the filesystem of the project. The kit source tree is only the transport format.

Details, install/apply/export flow, vault-crypto for password settings, manifest format: see [`kits`](/specs/kits) in the specs.

## Inheritance overview

Many kits build on top of `basic`. Two-layer chains are common (`security` → `code-development` → `basic`). Application kits stand alone.

```
basic
    └─ code-development
        └─ security
    └─ communication
    └─ finance-thinking
    └─ learning
    └─ legal-thinking
    └─ research
    └─ vance-author
    └─ writing
mail-assistant
school-essay-script-loop-kit
```

---

## Catalog

### `basic`
{: .d-inline-block }

v1.0
{: .label .label-blue }

Foundation-Kit für das Pattern „kurzer Skill-Body + Manuals on
demand". Inspiriert von Claude Code's Skill-Architektur, aber an
Vance' Engine-Push-Modell angepasst: Trigger aktivieren den Skill,
Skill-Body listet Manuals als Speisekarte, Modell zieht via
manual_read die Detail-Tiefe nach.

Erster Skill: decision-frame — Entscheidungsstruktur mit
Manual-driven Detail-Tiefe (Vollprotokoll, Kriterien-Katalog).
Plus shared-Manuals für skill-übergreifende Konventionen
(when-to-stop).

Verbraucht Brain-Erweiterungen aus planning/kit-skill-manual-pattern.md:
Skill-eigene manualPaths (additive zu Recipe), ON_DEMAND-Refs als
Listing-Block (heute nicht genutzt, der Skill listet Manuals
direkt im Body — bewusst minimal, damit sich auch ältere Brain-
Versionen am Pattern orientieren können).

**Skills (4):** `decision-frame`, `review-output`, `rubber-duck`, `stuck`

**Manuals:** 12 files across 5 topics (decision, review, rubber-duck, shared, stuck)

[Source](https://github.com/mhus/vance-kits/tree/main/kits/basic){: .btn .btn-purple .fs-3 .mr-2 }

### `code-development`
{: .d-inline-block }

v1.0
{: .label .label-blue }

Coding-Kit für Software-Entwicklung. Erbt vom basic-Kit
(decision-frame, stuck, rubber-duck, review-output) und ergänzt
fünf code-spezifische Skills:

  code-review   — Pull-Request- und Diff-Reviews
  debug         — systematisches Bug-Hunting
  refactor      — Refactoring-Strategie
  test-craft    — Tests schreiben (TDD-freundlich, aber nicht
                  dogmatisch)
  commit-craft  — gute Commits, Message-Conventions

Pattern wie basic: Skill-Body kurz (≤ ~70 Zeilen),
Detail-Wissen lebt in Manuals on demand. Sprachunabhängig
formuliert — Java/TS/Python/Rust haben gemeinsame
Denkmuster, sprachspezifische Konventionen kommen separat.

Inherit-Reihenfolge: basic-Skills bleiben erreichbar, das
Coding-Kit fügt nur hinzu. decision-frame greift bei
„refactor vs. rewrite", stuck bei zähen Debug-Sessions,
review-output ist der generische Vorgänger von
code-review (specialised here for code).

**Inherits from:** [`basic`](#basic)

**Skills (5):** `code-review`, `commit-craft`, `debug`, `refactor`, `test-craft`

**Manuals:** 15 files across 5 topics (code-review, commit, debug, refactor, test)

[Source](https://github.com/mhus/vance-kits/tree/main/kits/code-development){: .btn .btn-purple .fs-3 .mr-2 }

### `communication`
{: .d-inline-block }

v1.0
{: .label .label-blue }

Communication-Kit. Vier Skills für die Stellen, an denen
Kommunikation typisch reibt: schwierige Gespräche,
Feedback (geben und nehmen), schriftliche Kommunikation.
Inherits von basic — decision-frame greift bei
Konflikten („Was sind die Optionen?"), stuck wenn ein
Gespräch festhängt, rubber-duck beim Vorbereiten dessen,
was man eigentlich sagen will.

  difficult-conversation — high-stakes Gespräche planen
                           und führen
  feedback-giving        — direkt, fair, brauchbar
                           feedbacken
  feedback-receiving     — Kritik trennen von ihrer
                           Verpackung; was tun damit
  written-comms          — Mails, Slack, async — wo
                           Mimik und Stimmlage fehlen

Domain-frei: Arbeit, Teams, persönliche Beziehungen,
Verhandlungen. Vance ist Think-Tool — diese Skills
helfen vor und nach den Gesprächen, ersetzen weder
Therapie noch professionelle Mediation. Bei
hochpersönlichen Themen ist der Hinweis auf
professionelle Hilfe Teil des Skill-Body.

Synergie zum writing-Kit: written-comms überlappt mit
tone-and-voice (Audience-Fit ist beides). Communication
ergänzt writing um die zwischenmenschliche Schicht.

**Inherits from:** [`basic`](#basic)

**Skills (4):** `difficult-conversation`, `feedback-giving`, `feedback-receiving`, `written-comms`

**Manuals:** 12 files across 4 topics (conversation, feedback-give, feedback-receive, written)

[Source](https://github.com/mhus/vance-kits/tree/main/kits/communication){: .btn .btn-purple .fs-3 .mr-2 }

### `finance-thinking`
{: .d-inline-block }

v1.0
{: .label .label-blue }

Finance-thinking Kit — Strukturen für Geld-Entscheidungen,
nicht Beratung. Inherits von basic (decision-frame greift
bei größeren Geld-Fragen).

  budget-design        — Cashflow-Strukturen
  financial-decision   — Größere Geld-Entscheidungen
                         (kaufen vs. mieten, Job-Wechsel,
                         Geräte-Anschaffung)
  debt-and-credit      — Schulden-Typen und Priorisierung
  investment-thinking  — Investitions-Denkmuster
                         (NICHT specific picks)

#### Wichtig: KEIN finance advice

Vance ist Think-Tool, kein Finanzberater. Diese Skills
helfen dir Strukturen für eigenes Denken zu finden — sie
ersetzen keine Beratung, kein Tax-Planning, keine
Investment-Empfehlung. Konkrete Entscheidungen mit
substantiellen Geldsummen brauchen einen
fee-only-fiduciary advisor in deiner Jurisdiktion und
einen Steuerberater.

Skills haben harte Regeln:
- Keine spezifischen Stocks / Funds / Crypto-Picks.
- Keine Tax-Claims für deine Jurisdiktion.
- Keine "you should" über substantielle Entscheidungen.
- Bei Hinweisen auf Schulden-Krise / fraud / scam: Hinweis
  auf professionelle Hilfe (debt counsellor, attorney,
  police).

Domain-frei genug für persönliche und kleine
Geschäfts-Finanzen. Nicht designed für corporate finance.

**Inherits from:** [`basic`](#basic)

**Skills (4):** `budget-design`, `debt-and-credit`, `financial-decision`, `investment-thinking`

**Manuals:** 12 files across 4 topics (budget, debt, decision, investment)

[Source](https://github.com/mhus/vance-kits/tree/main/kits/finance-thinking){: .btn .btn-purple .fs-3 .mr-2 }

### `learning`
{: .d-inline-block }

v1.0
{: .label .label-blue }

Learning-Kit. Vier Skills für Verstehen-und-Behalten:
Feynman-Methode (durch Erklären verstehen), Active
Recall (durch Abrufen festigen), Spaced Repetition
(durch Intervalle behalten), Reading Strategies
(Lesen für Behalten, nicht für Volumen).

Inherits von basic — rubber-duck überlappt mit Feynman
(beides ist „erklären um zu finden, was du nicht
verstehst"); decision-frame hilft bei "was lernen vs.
was nicht"; stuck wenn Lernen festhängt.

  feynman-method            — explain-to-find-gaps
  active-recall             — Retrieval-Praxis
  spaced-repetition-design  — Karten und Intervalle
  reading-strategies        — Lesen für Lernen

Domain-frei: funktioniert für akademisches Lernen,
Berufs-Skill-Aufbau, Sprachenlernen, Selbststudium,
Vorbereitung auf Vorträge oder Prüfungen.

Synergie zu rubber-duck (basic): die Erklären-Technik
ist der Kern beider — der learning-Skill rahmt sie als
Lernmethode, basic/rubber-duck als Debug-für-eigene-
Verständnis.

Synergie zu research-Kit: progressive-summarisation
(notes) und retrieval-cues sind Lern-Werkzeuge, die in
research für Note-Taking eingesetzt werden. Wer beide
Kits installiert, hat parallele Sicht.

**Inherits from:** [`basic`](#basic)

**Skills (4):** `active-recall`, `feynman-method`, `reading-strategies`, `spaced-repetition-design`

**Manuals:** 12 files across 4 topics (feynman, reading, recall, srs)

[Source](https://github.com/mhus/vance-kits/tree/main/kits/learning){: .btn .btn-purple .fs-3 .mr-2 }

### `legal-thinking`
{: .d-inline-block }

v1.0
{: .label .label-blue }

Legal-thinking Kit — Strukturen für Legal-Texte und
Streitfälle, KEINE Rechtsberatung. Inherits von basic.

  contract-reading        — Verträge als Layperson lesen
  tos-and-policy-parsing  — AGB / Privacy Policy / ToS
                            prüfen vor "Akzeptieren"
  dispute-framing         — Konflikt vorbereiten,
                            Doku-Disziplin
  legal-question-routing  — Was ist Layperson-Frage,
                            was braucht Anwalt

#### Wichtig: KEINE Rechtsberatung

Vance ist Think-Tool, kein Anwalt. Diese Skills helfen
dir, Legal-Texte zu verstehen und Streitfälle zu
strukturieren. Sie ersetzen keinen Rechtsanwalt, keine
Steuerberatung, keine spezifische rechtliche Empfehlung
für deine Jurisdiktion und Situation.

Skills haben harte Regeln:
- Keine Auslegungen von Gesetzen als verbindlich.
- Keine jurisdiktion-spezifischen Claims.
- Keine Strategie für aktive Litigation.
- Bei substantiellen rechtlichen Fragen / aktivem
  Verfahren / drohender Klage / Festnahme / Vollzug:
  direkt zu lizensiertem Anwalt in deiner Jurisdiktion.

Domain-frei: persönliche Verträge, Mietverträge, ToS /
Privacy, kleine Geschäfts-Verträge. Nicht designed für
Corporate-Legal oder spezifische Litigation-Strategie.

Specifically NOT covered:
- Strafrecht (egal welche Seite).
- Immigration.
- Steuerstrategie.
- Familien-Rechts-Litigation.
- Patent / Trademark / IP-Strategie.
- Anything involving police / arrest / charges.

Für all diese: spezialisierter Anwalt. Sofort.

**Inherits from:** [`basic`](#basic)

**Skills (4):** `contract-reading`, `dispute-framing`, `legal-question-routing`, `tos-and-policy-parsing`

**Manuals:** 12 files across 4 topics (contract, dispute, routing, tos)

[Source](https://github.com/mhus/vance-kits/tree/main/kits/legal-thinking){: .btn .btn-purple .fs-3 .mr-2 }

### `mail-assistant`
{: .d-inline-block }

v0.2
{: .label .label-blue }

Mail-Triage Kit — automatisch eingehende Mails klassifizieren,
wichtige Mails als Inbox-Item an den User dropen, unwichtige
automatisch ins Archiv verschieben.

Architektur: ein Cortex-JS-Skript (`mail-triage.js`) ruft pro
ungelesener Mail das IMAP-Tool für Header+Body, klassifiziert per
LightLlm-Recipe `mail-rate` (Jeltz-Schema-Loop, JSON-Output), und
führt set_seen + move oder inbox_post aus. Synchron im Skript,
kein Process-Spawn, kein Lane-Lock.

Konfiguration über Settings (Cascade think-process → project →
_tenant), gelesen im Skript via `vance.settings.get(...)`.

Setting-Keys:
  mail.pack          — Name des IMAP-Tool-Packs (REQUIRED, kein Default)
  mail.inboxFolder   — Quell-Folder (default "INBOX")
  mail.archiveFolder — Ziel-Folder für Unwichtige (default "Archive/Auto")
  mail.maxPerRun     — Mails pro Lauf (default 5)
  mail.recipeName    — Klassifikations-Recipe (default "mail-rate")
  mail.rulesDoc      — Pfad zum Regel-Doc (default "documents/mail-rules.md")

Defaults für alle außer `mail.pack` werden beim Kit-Install in
den Project-Scope geschrieben. Bedienung über das Setting-Form
"Mail-Triage" im Workspace-Editor-Tab.

Voraussetzungen vor erstem Lauf:
  1. IMAP-Tool-Pack als ServerToolDocument anlegen (Type
     `imap_mailbox`, `readonly: false`, host/user/password als
     Settings).
  2. Im Setting-Form "Mail-Triage" das Feld `mail.pack` auf den
     Namen aus (1) setzen.
  3. mail-rules.md auf die eigene Whitelist/Triage-Logik anpassen.

Manuals `scripts`, `inbox-post`, `vance-script-llm` (in
vance-defaults/) helfen der Engine, ähnliche Skripte zu schreiben
oder zu modifizieren.

Scheduler `_vance/scheduler/mail-check.yaml` läuft alle 30 Min —
löschen wenn nur manueller Cortex-Run gewünscht. Scheduler-`params`
überschreiben Settings per-Lauf.

**Recipes:** `mail-rate`

**Schedulers:** `mail-check`

[Source](https://github.com/mhus/vance-kits/tree/main/kits/mail-assistant){: .btn .btn-purple .fs-3 .mr-2 }

### `research`
{: .d-inline-block }

v1.0
{: .label .label-blue }

Research-Kit. Vier Skills für Recherche, Synthese und
Verifikation: source-evaluation, synthesis, note-taking,
claim-verification. Inherits von basic — decision-frame
hilft bei "welche Quelle gewichten", stuck bei
Recherche-Sackgassen, rubber-duck beim Strukturieren von
Lärm zu Verständnis.

  source-evaluation  — Quellen einschätzen (Credibility-
                       Ladder, Trust-Signale, Bias)
  synthesis          — N Claims aggregieren, Widersprüche
                       handhaben, mit Quellen-Verankerung
                       schreiben
  note-taking        — Zettelkasten-Basics, Progressive
                       Summarisation, Retrieval-Cues
  claim-verification — Citation-Chasing, Fact-Checking-
                       Protokoll, Bullshit erkennen

Domain-frei: funktioniert für akademische Recherche,
Journalismus, Markt-Analyse, Hintergrund für Schreibarbeit
(siehe writing-Kit), Due-Diligence. Code-Recherche
("welche Library für X") profitiert auch.

Synergie zum writing-Kit: Recherche liefert das Material,
writing strukturiert die Ausgabe. Wer beide installiert,
hat einen kompletten Recherche-zu-Veröffentlichung-Loop.

Hinweis: Skills denken über Recherche-Strukturen, nicht
über fachspezifische Methoden (klinische Studien,
rechtliche Recherche, OSINT-spezifische Tools). Solche
Spezialisierungen kommen über Domain-Sub-Kits.

**Inherits from:** [`basic`](#basic)

**Skills (4):** `claim-verification`, `note-taking`, `source-evaluation`, `synthesis`

**Manuals:** 12 files across 4 topics (notes, source, synthesis, verification)

[Source](https://github.com/mhus/vance-kits/tree/main/kits/research){: .btn .btn-purple .fs-3 .mr-2 }

### `school-essay-script-loop-kit`
{: .d-inline-block }

v1.0
{: .label .label-blue }

Third variant of the school-essay kit. Like school-essay-script-kit
the orchestration sits in a JavaScript skill-script — but unlike
v1 the drafting of each chapter is delegated to its own Ford
sub-worker via process_run. Each sub-worker is fed:

  - the topic + sources (shared context),
  - the user-stated style constraints,
  - a summary of every previous chapter, so it sees what already
    exists and can write its chapter consistently.

Pattern mirrors the Slart/Vogon chapter-loop: one LLM turn per
chapter, the script collects + persists, then concatenates.
Compared to school-essay-script-kit it's slower (5 sub-worker
turns instead of 1 outer LLM doing all drafts inline) but each
chapter gets dedicated focus.

Same OUTPUT.md contract as the other school-essay kits — final
essay layout under essay/.

[Source](https://github.com/mhus/vance-kits/tree/main/kits/school-essay-script-loop-kit){: .btn .btn-purple .fs-3 .mr-2 }

### `security`
{: .d-inline-block }

v1.0
{: .label .label-blue }

Security-Kit. Zwei-Layer-Inherit: erbt von code-development (was
wiederum von basic erbt). Damit hat ein Projekt mit installiertem
security-Kit alle vier Layer aktiv:

  basic              — decision-frame, stuck, rubber-duck, review-output
  code-development   — code-review, debug, refactor, test-craft, commit-craft
  security           — security-review, threat-modeling,
                       secrets-handling, incident-response

Skills sind defensiv-fokussiert: Vulnerability-Klassen erkennen,
Threat-Models bauen, Secrets sicher handhaben, Incidents
strukturiert moderieren. Bewusst keine offensive Angriffs-
Werkzeuge — das ist Pen-Test-Territorium und gehört in einen
eigenen, eingegrenzten Kontext.

Pattern wie basic + code-development: kurzer Skill-Body
(≤ ~70 Zeilen), Detail-Wissen lebt in Manuals on demand.
security-review baut auf code-review/security-categories aus
code-development auf — code-review/security-categories liefert
die Kurzliste während Reviews, security-review/vulnerability-
classes geht in die Tiefe.

**Inherits from:** [`code-development`](#code-development)

**Skills (4):** `incident-response`, `secrets-handling`, `security-review`, `threat-modeling`

**Manuals:** 12 files across 4 topics (incident, secrets, security-review, threat-modeling)

[Source](https://github.com/mhus/vance-kits/tree/main/kits/security){: .btn .btn-purple .fs-3 .mr-2 }

### `vance-author`
{: .d-inline-block }

v1.0
{: .label .label-blue }

Meta-Kit für Vance-Konfigurations-Authoring: Recipes und Skills
schreiben für Vance selbst. Inherits von basic — die
Decision-Frame / Stuck / Rubber-Duck / Review-Output Skills
helfen auch beim Authoring (z.B. „decision-frame" wenn man
zwischen Engine-Optionen schwankt, „review-output" zum Review
eines Recipe-Drafts).

Skills:
  recipe-author      — Recipes schreiben: welche Engine, welche
                       params, welcher promptPrefix. Manuals
                       decken Engine-Cheatsheet, Param-Reference,
                       Recipe-Patterns ab.
  skill-author       — Skills schreiben (meta!): Frontmatter,
                       Body-Format, Trigger-Design, Manual-
                       Strukturierung. Self-applying — der Skill
                       erklärt das Format, das er selbst nutzt.
  workflow-author    — Workflows schreiben: Task-Types, Gates,
                       Transitions, Anatomy.
  event-author       — Events schreiben: Webhook-Patterns, Auth,
                       Anatomy.
  application-author — Application Manifests (`_app.yaml`)
                       schreiben: kind:application, app-Types,
                       Calendar-App-Patterns (Lane-Design, Tag-
                       Konventionen, Refresh-Flow). Erst-Ziel ist
                       `app: calendar`; weitere App-Types werden
                       später ergänzt.

Zielgruppe: Vance-Power-User und Tenant-Admins, die das
Verhalten anpassen. Nicht für Endbenutzer.

Hinweis: Diese Skills werden Brain-intern interessant, weil
ihr Wissen aus den Brain-Sources stammt (specification/
recipes.md, specification/skills.md, vance-defaults). Bei
Brain-Changes sind die Manuals die ersten, die updaten
müssen.

**Inherits from:** [`basic`](#basic)

**Skills (5):** `application-author`, `event-author`, `recipe-author`, `skill-author`, `workflow-author`

**Manuals:** 16 files across 5 topics (application, event, recipe, skill, workflow)

[Source](https://github.com/mhus/vance-kits/tree/main/kits/vance-author){: .btn .btn-purple .fs-3 .mr-2 }

### `writing`
{: .d-inline-block }

v1.0
{: .label .label-blue }

Schreib-Kit. Vier Skills entlang der typischen
Schreibphasen: drafting → structural-edit → copy-edit →
tone-and-voice. Inherits von basic — decision-frame und
stuck sind beim Schreiben oft nützlich (welche Variante?
blank-page-stuck), rubber-duck hilft beim Klären eines
unklaren Gedankens, review-output hat einen
schreibbaren Output-Review.

  drafting        — vom leeren Blatt zum ersten Entwurf
  structural-edit — Inhalte umstellen, Outline aus Draft
                    ziehen, kürzen
  copy-edit       — Satz-Ebene, Klarheit, schwache Wörter
  tone-and-voice  — Audience-Fit, Register, Stimm-
                    konsistenz

Domain-frei: funktioniert für Essays, Reports,
Marketingtexte, Mails, Artikel, Buchkapitel. Code-
Kommentare oder Spec-Texte profitieren auch — copy-edit
greift dort ebenso.

Hinweis: Skills decken Denkmuster ab, nicht Genre-
Konventionen. Wer fiction / academic-writing /
technical-docs spezifisch braucht, kann darüber einen
Spezial-Kit bauen, der von writing erbt.

**Inherits from:** [`basic`](#basic)

**Skills (4):** `copy-edit`, `drafting`, `structural-edit`, `tone-and-voice`

**Manuals:** 12 files across 4 topics (copy, drafting, structural, tone)

**Recipes:** `writing`

[Source](https://github.com/mhus/vance-kits/tree/main/kits/writing){: .btn .btn-purple .fs-3 .mr-2 }
