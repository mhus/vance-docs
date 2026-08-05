---
title: Benchmarks
nav_order: 7
permalink: /benchmarks/
---

# Benchmarks

How well do different LLM models perform when driving Vance? The benchmark
suite runs 61 tests across 10 capability groups — anti-hallucination, document
kinds, tool selection, Mermaid rendering, script execution, voice style, and
more — against each model and reports pass/fail with a quality score.

The full matrix is available as a standalone page:

→ **[Open the benchmark matrix](/benchmarks/index.html)**

Each cell links to a detailed `.md` report for that specific test run. The
matrix is regenerated from `qa/benchmark/results/` via `./wb docs benchmarks`.
