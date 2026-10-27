---
version: 0.1.2
tags: [decision, adr, persona, segment, on-demand]
---

# 0004: Anchor the prototype on on-demand (plumbing/HVAC) businesses

- **Status:** accepted
- **Date:** 2026-10-27

## Context

The case fixes the persona (dispatcher at a business with 7-10 technicians) but not which workflow segment the prototype demonstrates. Route-based businesses optimize for drive distance. On-demand businesses optimize for job revenue.

## Options considered

1. On-demand (plumbing, HVAC): variable job length, qualifications matter, high revenue per job. Disruptions are likely more frequent and harder to resolve (assumption, not yet verified).
2. Route-based (cleaning, pool): many short, predictable stops. Disruptions mean redistributing a whole route by geography.

## Decision

Option 1. It exercises the qualification config and revenue goal directly. Route-based is shown as a Settings choice (scheduling priority: drive time, defined by `drive_distance` in `prototype/config/goals.yaml`; see [0016](0016-scheduling-priority-in-settings.md)) on the same agent, which demonstrates the shared-versus-configurable split.

## AI involvement

Copilot proposed the segmentation and the recommendation, flagged as unverified. The author chose the anchor. The claim about disruption frequency still needs an outside source or a dispatcher conversation.

## Consequences

Synthetic data and the first scenarios will model on-demand work: variable durations, skill requirements, and job values. Route-based data is needed only to show the config switch.
