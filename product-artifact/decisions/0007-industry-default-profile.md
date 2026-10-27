---
version: 0.1.2
tags: [decision, adr, industry, goals, profile, config]
---

# 0007: Industry sets a default goal profile; the business overrides it

- **Status:** accepted
- **Date:** 2026-10-27

## Context

The case says scheduling workflows vary across industries and customers. Recurring industries optimize for drive distance, while plumbing and HVAC optimize for job revenue. Individual businesses may differ from their industry norm.

## Options considered

1. Hardcode industry to goal: simple, but a plumber with recurring contracts could not choose differently.
2. Industry sets a default profile and each business can override it: matches the case's "industries and customers" wording.

## Decision

Option 2. `prototype/config/goals.yaml` maps industries to default profiles, and the business's `active_profile` overrides the default. Industry is also a segment variant on the dispatcher persona in the plan. *Update: the business now chooses the profile in the Settings panel, with the config value as the starting default ([0016](0016-scheduling-priority-in-settings.md)).*

## AI involvement

The author proposed industry as a persona and scheduling dimension. Copilot recommended treating it as a variant of one dispatcher persona plus a config default, not separate personas.

## Consequences

Adding an industry means adding a line to config, not code. Industry defaults are examples and need a source before being presented as fact.
