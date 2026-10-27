---
version: 0.2.1
tags: [decision, adr, scope, technician, input-channel, persona]
---

# 0005: Technicians report disruptions to the agent

- **Status:** accepted
- **Date:** 2026-10-27

## Context

Disruptions often originate with the technician (a job running long, a call-out, a customer asking to reschedule on site). The question is whether the prototype is dispatcher-only or lets technicians interact with the agent.

## Options considered

1. Dispatcher-only: the dispatcher enters each disruption. Simpler, but hides where disruptions come from.
2. Technician reports to the agent through a full technician interface: realistic, but builds a second app.
3. Technician as a simulated input in a single dispatcher interface: keeps the origin of disruptions visible without a second app.

## Decision

Option 3. The dispatcher is the only persona with a built interface. A technician report (job running long, call-out, possible reschedule) is triggered from the dispatcher view as a canned message, and technician and customer notifications appear as mock previews or log lines. The dispatcher remains the approver, so permissions in `prototype/config/permissions.yaml` still gate every action.

## AI involvement

Copilot drafted the personas and recommended narrowing to the dispatcher, because the case's autonomy, approval, inspect, undo, and recovery requirements all run through that role. The author accepted the narrowing.

## Consequences

One interface to build. Technician and customer depth is covered in the product artifact, not the demo. The tension between a good schedule and a bad outcome for a technician or customer can still show up in the agent's reasoning and in a scenario.
