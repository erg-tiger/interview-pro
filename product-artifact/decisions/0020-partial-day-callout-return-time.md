---
version: 0.1.0
tags: [decision, adr, call-out, partial-day, availability, validation, scenarios]
---

# 0020: Treat a partial-day call-out end time as a return time

- **Status:** accepted
- **Date:** 2026-11-05

## Context

The call-out form already offered "Until 13:00", but the server marked the technician out for the whole day. The affected-job filter used the time, while the agent prompt and validator did not let the technician return to the schedule. That made the visible option misleading and left no guarantee that later assignments would be preserved or checked.

## Options considered

1. Remove the partial-day option for the presentation. This avoids incorrect behavior but hides a control the prototype already exposes.
2. Implement the existing 13:00 option as a bounded return-time behavior. This fixes the demonstrated path while avoiding a general availability editor.
3. Build arbitrary availability windows and a general recurring scheduling engine. This is broader than the remaining presentation scope.

## Decision

Option 2.

- "Until 13:00" means the technician can be considered for work starting at or after 13:00; the return boundary is inclusive, but travel time still applies.
- Any existing job assigned to the caller that overlaps the unavailable interval needs an outcome. Jobs starting at or after the return time remain on the caller's schedule unless the agent proposes a change.
- Qualification, travel, overlap, workday, and urgency validation continue to apply. Retained later jobs are included when checking proposed assignments.
- The UI continues to show the caller as out for this report, with the return time visible. This is a simulated day, not a live clock.
- Add S7 as a partial-day scenario and automated validator tests for the affected-job boundary, return eligibility, travel, and retained-job conflicts. Keep arbitrary return times out of scope.

## AI involvement

Copilot identified that the existing UI offered a partial-day choice but the implementation treated the technician as absent for the whole day. The author confirmed that the choice should work and asked to include it in the test cases, run of show, and product artifact.

## Consequences

- The scenario set grows from six to seven; the original six runs and replay recordings remain unchanged.
- S7 is not available in replay mode. The run of show must run it live or clearly describe its automated validator coverage without claiming a recorded model result.
- Full availability editing, a live clock, and additional return-time choices remain deferred.
