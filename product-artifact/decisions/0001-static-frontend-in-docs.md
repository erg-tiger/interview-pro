---
version: 0.1.0
tags: [decision, adr, frontend, github-pages]
---

# 0001: Static front end in docs/ with no build step

- **Status:** accepted
- **Date:** 2026-10-26

## Context

The prototype needs a front end that can be hosted and shared as a link, and the author must be able to explain, reproduce, and extend it.

## Options considered

1. Static HTML, CSS, and JavaScript in `docs/`: no tooling, deploys directly with GitHub Pages, limited structure as it grows.
2. A framework (for example React with Vite): more structure, but adds a build step and dependencies that must be explained.

## Decision

Option 1. It keeps the code simple and the demo link easy to share. A framework can be introduced later if the UI outgrows it.

## AI involvement

Copilot scaffolded the folder structure. No incorrect output to note.

## Consequences

No bundler or package manager is required yet. Mock data and agent logic must be organized manually in separate JavaScript files.
