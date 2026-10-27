---
version: 0.1.0
tags: [decision, adr, product, settings, goals, scheduling, industries]
---

# 0016: Scheduling priority (job revenue or drive time) is a Settings choice

- **Status:** accepted (product decision made by the author); extends [0007](0007-industry-default-profile.md) and [0015](0015-autonomy-setting-never-recommended-always.md)
- **Date:** 2026-10-27

## Context

The case says the agent must support different workflows by industry: recurring work (home cleaning, pool) optimizes **drive distance** between jobs, and plumbing and HVAC optimize **potential job revenue**. Until now the choice lived in `active_profile` in `prototype/config/goals.yaml`, a file a dispatcher cannot edit. The review against the case flagged this: the case says users should be able to set it.

## Options considered

1. Keep the file and describe a future screen.
2. A Settings option that chooses between the profiles the config defines, with the config as the source of the profiles and the starting default.
3. A Settings screen that also edits what each profile means (ordering of criteria).

## Decision

Option 2, requested by the author.

- The Settings panel (alongside agent autonomy) has a **Scheduling priority** choice: **Job revenue** (protect high-value and urgent jobs; typical for plumbing and HVAC) or **Drive time** (minimize driving and keep routes intact; typical for cleaning and pool).
- The choice replaces editing `active_profile` and applies to the next call-out. It is logged and kept when the day is reset. The profiles themselves (the ordered criteria) stay defined in `goals.yaml`, which also provides the starting value.
- It changes only what the model optimizes. Qualification, availability, travel time, urgency and the safety checks apply under either priority.
- The test scenario S2 still applies the drive-time override on its own so it can be run without touching Settings. S1 and the others use whatever priority Settings has, so the demo should start on Job revenue.
- Technician qualifications are not part of this change and remain in `qualifications.yaml`.

## AI involvement

The author asked for the change and tied it to the case's industry examples. Copilot implemented it and flagged that profile definitions stay in config.

## Consequences

- The case's industry-workflow requirement is now something a dispatcher sets, not a developer edit.
- Choosing a priority does not prove it works: the one drive-distance run (S2) was inconclusive, and all the data is plumbing and HVAC. A recurring-service dataset is still needed to show the effect.
- The setting is one global choice per business, held in the server's memory in the prototype. A real product would store it per business, and could default it from the business's industry.
