---
version: 0.1.2
tags: [decision, adr, data, github-pages]
---

# 0002: Keep data and config inside docs/

- **Status:** superseded by [0008](0008-local-prototype-hosted-artifact.md)
- **Date:** 2026-10-26

## Context

GitHub Pages serves only the published folder. The front end must load synthetic data and configuration at runtime, and the author does not want to edit HTML or copy files whenever data changes.

## Options considered

1. Keep data and config inside `docs/`: one copy, no tooling, fetchable directly.
2. Publish Pages from the repo root: lets pages fetch `../data/`, but publishes the entire repo and weakens `docs/` as a self-contained front end.
3. Copy files into `docs/` with a GitHub Action: no manual copying, but adds a build step that conflicts with decision 0001.

## Decision

Option 1. Data lives in `docs/data/` and configuration will live in `docs/config/`. `index.html` stays a thin shell that loads these files with JavaScript.

## AI involvement

Copilot proposed the three options. The author chose option 1. Data and config file formats were decided separately in 0003.

## Consequences

No sync step and no build step. Data and config are publicly served with the site, which is acceptable because they are synthetic. Changes made by the agent during a demo are held in memory or `localStorage`, not written back to files.
