---
title: Konzepte
nav_order: 3
permalink: /concepts
---

# Konzepte
{: .no_toc }

Die zentralen Begriffe in Vance. Jeder verlinkt später auf eine eigene Seite.
{: .fs-5 .fw-300 }

## Inhaltsverzeichnis
{: .no_toc .text-delta }

1. TOC
{:toc}

---

## Auftrag

Was der Nutzer (oder ein anderer Process) erledigt haben will. Hat Kontext,
Werkzeuge und ein Ziel. Wird durch ein Recipe + eine Engine umgesetzt.

## Engine

Java-Algorithmus mit Lifecycle — der LLM steuert den Ablauf **nicht**, der
Code tut es. Die Engine entscheidet, wann ein LLM-Call passiert, welches Tool
gerufen wird und wann ein Auftrag beendet ist.

## Recipe

YAML-Konfiguration: Engine + Default-Params + Prompt-Prefix + Tool-Anpassungen.
Wenige Engines (strukturelle Algorithmen), viele Recipes (benannte
Konfigurationsbündel). Wer einen neuen Auftragstyp will, schreibt ein
Recipe — kein Java.

## Think Process

Laufende Auftragsinstanz, persistiert in MongoDB. Hat Status, Task-Tree,
Inbox und Verlauf. Überlebt Disconnects und Neustarts.

## Scope

Hierarchie: Tenant → Projekt-Gruppe → Projekt → Session → Think-Process.
Memory kaskadiert nach unten, ist seitlich isoliert. Rechte, Quotas und
Settings hängen am Scope.

## Project Kit

Git-Repo mit Skills, Recipes, Tools und Settings, das in ein Projekt
importiert wird. Macht ein Projekt sofort produktiv und ermöglicht
zentrale Pflege von Team-Standards.
