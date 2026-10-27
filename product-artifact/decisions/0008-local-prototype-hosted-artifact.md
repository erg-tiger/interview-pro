---
version: 0.1.0
tags: [decision, adr, delivery, github-pages, local-first]
---

# 0008: Pages hosts the product artifact; the prototype runs locally

- **Status:** accepted
- **Date:** 2026-10-27

## Context

The prototype needs an LLM call, which needs a secret key and therefore a server. GitHub Pages serves only static files, so it cannot run the agent without exposing the key.

## Options considered

1. Hybrid: Pages plays recorded agent runs, and the live demo runs locally. Reviewers can click through, but it adds a recording mode to build.
2. Local-only prototype, with Pages hosting the product artifact: simplest and cuts scope.
3. Hosted backend: live link, but needs hosting, key management, and a cost cap.

## Decision

Option 2. Pages hosts the product artifact. The prototype is delivered as a repo link or zip with a README and `.env.example`, and is shown live in the session. A short screen recording serves as backup in case the demo fails.

## AI involvement

Copilot proposed the hybrid. The author questioned whether hosting a replay was needed and chose the simpler option. Copilot agreed and noted the trade-offs: no pre-session click-through for reviewers and a higher demo risk.

## Consequences

Supersedes [0002](0002-data-and-config-inside-docs.md): data and config no longer need to live in `docs/`, and the prototype front end moves out of `docs/`, which becomes the artifact site. Reviewers who want to run the prototype need their own LLM key.
