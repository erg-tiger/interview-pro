---
version: 0.1.0
tags: [decision, adr, scope, call-out, demo]
---

# 0012: Scope the prototype and demo to technician call-outs only

- **Status:** accepted
- **Date:** 2026-10-27

## Context

The case covers three same-day disruptions: a job running long, a technician calling out, and a customer rescheduling. Phase 1 scored the call-out highest (8 of 9, hypotheses) and the prototype was already planned to handle it first. Time is limited, and the case asks for one end-to-end slice.

## Options considered

1. Support all three disruption types in the prototype: broader, but more to build, test, and explain.
2. Support the call-out only and treat the other two as roadmap: one clear demo story, and every scenario is a variant of the same disruption.

## Decision

Option 2. The demo is framed on one situation: a technician calls out the day of service, and the agent handles the rescheduling of that technician's jobs. A job running long and a customer reschedule are out of scope for the prototype and appear in the artifact as future work that reuses the same reasoning.

## AI involvement

The author set the scope. Copilot recorded it and noted that the call-out is the best case for showing qualification limits, delay versus handoff, and a failure path, and that all test scenarios can be call-out variants (different technician, time of day, skills, and failure modes).

## Consequences

- Narrows [0005](0005-technician-reports-to-agent.md): the only simulated technician report is a call-out.
- The scenarios become variants of one disruption, which keeps testing and the story focused.
- The partial-unavailability case (a job running long) is not demonstrated, and the artifact should say so.
