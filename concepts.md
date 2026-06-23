---
title: Concepts
nav_order: 3
permalink: /concepts
---

# Concepts
{: .no_toc }

The core terms in Vance. Each will later link to its own page.
{: .fs-5 .fw-300 }

## Table of contents
{: .no_toc .text-delta }

1. TOC
{:toc}

---

## Assignment

What the user (or another process) wants done. Has context, tools and a goal.
It's executed by a recipe + an engine.

## Engine

A Java algorithm with a lifecycle — the LLM does **not** drive the flow, the
code does. The engine decides when an LLM call happens, which tool is called,
and when an assignment is finished.

## Recipe

YAML configuration: engine + default params + prompt prefix + tool adjustments.
Few engines (structural algorithms), many recipes (named configuration
bundles). If you want a new type of assignment, you write a recipe — no Java.

## Think Process

A running assignment instance, persisted in MongoDB. Has status, task tree,
inbox and history. Survives disconnects and restarts.

## Scope

Hierarchy: tenant → project group → project → session → think-process.
Memory cascades downward and is isolated laterally. Permissions, quotas and
settings hang off the scope.

## Project Kit

A Git repo with skills, recipes, tools and settings that gets imported into
a project. Makes a project productive immediately and enables central
maintenance of team standards.
