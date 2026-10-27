---
version: 0.1.1
tags: [decision, adr, product, permissions, autonomy, risk, approval, customer-update]
---

# 0014: Simple reassignments need no approval; delays and schedule changes always do

- **Status:** accepted (product decision made by the author); the fixed rule for delays is overridable only through the Always setting in [0015](0015-autonomy-setting-never-recommended-always.md)
- **Date:** 2026-10-27

## Context

The case asks what the agent can do on its own and what needs the dispatcher. Until now the prototype required approval for every change and gated a whole plan by its strictest action. Review of real proposals showed two different kinds of change in the same plan:

- Moving a job to another qualified technician at the same time slot (for example J6 and J7 in the base call-out).
- Pushing or changing the schedule: a delayed start for the $1,850 install, and another job (J12) that has to move because of it.

## Options considered

1. Approve everything: safest, but the dispatcher must click through changes that carry almost no risk, which defeats the point of an agent.
2. Everything configurable, with simple reassignments autonomous by default: flexible, but a business could switch on autonomous delays, which carry real risk.
3. Reassignments run on their own (configurable); delays, shifts, displacement, and rescheduling always need approval, enforced in code.

## Decision

Option 3, decided by the author.

- **Reassigning a job to another qualified technician at the same time needs no human input.** The risk is very low: the customer still gets the job at the same time, the technician is validated as qualified and free with enough travel time, and the dispatcher can undo it. The customer is sent an update that a new technician is assigned (simulated in the prototype).
- **Schedule disruptions and pushes absolutely need dispatcher approval:** delayed slots, shifted times, displaced jobs, and moves to another day. The risk is real, because a customer's promised time changes. The code enforces this even if the configuration file says autonomous.
- A job that moves only because another change forced it (a side effect) waits with that change, so it can never be applied without its cause.
- Low model confidence still sends everything to the dispatcher.
- A business can make reassignments require approval as well (scenario S3), or forbid them.

## AI involvement

Copilot had proposed plan-level gating and flagged per-action approval as future work. The author's rule made per-action gating necessary, so it was built now. Copilot noted the tension with "everything configurable" and recorded that the high-risk side is deliberately fixed.

## Consequences

- A plan can be **mixed**: reassignments are applied immediately, while delays and their side effects wait for approval. One undo reverses the whole plan, including the automatic part.
- The automatic part is validated on its own first; if it cannot stand alone, it waits too.
- The case's "what it can do on its own" is demonstrated by default, and one setting flips it.
- The customer update for reassignments is simulated. Drafted messages for delays remain a future enhancement (FE2).
- Replaces the plan-level "strictest action decides" simplification from the first prototype build.
