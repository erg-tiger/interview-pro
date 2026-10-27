---
version: 0.1.0
tags: [decision, adr, product, settings, autonomy, permissions, approval]
---

# 0015: A dispatcher-facing autonomy setting (Never, Recommended, Always)

- **Status:** accepted (product decision made by the author); amends [0014](0014-reassignments-autonomous-delays-approval.md)
- **Date:** 2026-10-27

## Context

The case says the agent "should allow users to set" what it can change on its own and when it needs approval. Until now that lived only in `permissions.yaml`, with a demo-only dropdown for tests, so a dispatcher had no way to set it. A review against the case flagged this as the largest gap.

## Options considered

1. Keep YAML only and describe a future settings screen: cheapest, but the case's core ask is not demonstrable.
2. A full per-action permissions screen: faithful to the config, but too much for this time box and hard for a dispatcher to reason about.
3. One setting with three plain levels (Never, Recommended, Always) in a Settings panel opened from the header.

## Decision

Option 3, requested by the author.

- **Never:** every change waits for approval, including simple reassignments.
- **Recommended (default):** the decision 0014 behavior. Reassignments run on their own with a customer update; delays and other schedule changes wait.
- **Always:** no approvals required. Every change that passes the safety checks is applied and can be undone.
- Under every level, code still enforces what no setting can waive: the safety checks (qualification, availability, travel, urgency), cancelling a job is never done by the agent, and a plan with confidence below the threshold goes to the dispatcher.
- The level applies to the next call-out, is kept when the day is reset, and each change is logged.
- Fine-grained per-action modes remain in `permissions.yaml`; the level overwrites them. Per-action control is a future enhancement.

## Tension with decision 0014

0014 made delays, shifts, displacement, and rescheduling impossible to automate. Always overrides that, on purpose and only when the business chooses it. A delay changes a customer's promised time, which is the risk 0014 was protecting against, so "Always" needs a plain warning and the undo path must hold. The default stays Recommended, so the safe behavior is what a new business gets.

## AI involvement

The author asked for the setting and chose the three level names. Copilot flagged that "Always" contradicts 0014 and asked it be recorded, then implemented it.

## Consequences

- The case's "what types of changes it can make on its own" is now something a dispatcher sets, not only something a developer edits.
- The model's prompt no longer states that approvals are fixed; it sees the permissions in effect and prefers reassignments only because they disrupt the customer less.
- With Always, a delayed job and its side effects apply immediately, so undo and the customer-update story for delays (FE2) matter more.
- The level is held in the server's memory for the prototype; a real product would store it per business.
