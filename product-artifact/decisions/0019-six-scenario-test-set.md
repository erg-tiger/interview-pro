---
version: 0.1.0
tags: [decision, adr, scenarios, test-set, renumbering, failure-cases]
---

# 0019: A six-scenario test set, renumbered S1 to S6

- **Status:** accepted (the author chose six scenarios over the proposed eight); supersedes the scenario list in [0017](0017-plan-impact-and-scenarios-in-yaml.md)
- **Date:** 2026-11-05

## Context

The case asks for a small test set of 5 to 8 scenarios, including a failure case. The set had grown to ten ids (S1 to S10). Eight lived in `scenarios.yaml`, two (S7, S8) existed only in the plan, and the artifact showed a different seven. Six of the eight configured scenarios were the same Dana report with one setting changed, so they read as one scenario six times. The drive-time run (S2) was inconclusive, and the approve-everything run (S3) duplicated the Settings "Never" level.

## Options considered

1. Keep the ten ids and only fix the docs.
2. Eight scenarios: six cuts and two new pairs (permissions on Marcus, drive time on Tom).
3. Six scenarios, one per behaviour worth showing, with priority and permission changes left to Settings.

## Decision

Option 3. Each scenario differs in who is out, what the note says, or which safety path it exercises:

| New | Scenario | Agent action | Was |
|---|---|---|---|
| S1 | Easy day, one drain job (Marcus) | Automatic reassignment | S10 |
| S2 | Base call-out, Dana out all day | Mixed: automatic, waiting for approval, then undo | S1 (and S7, now a step) |
| S3 | Ambiguous note | Stated assumption, confidence gate | S6 |
| S4 | HVAC specialist out (Tom) | Displacement or hand-off, never automatic | S9 |
| S5 | **Failure:** no qualified technician free in time | Hand-off with a reason | S4 |
| S6 | **Failure:** injected unsafe first proposal | Rejection, retry, corrected plan | S5 |

Cut: the drive-time run (S2), the approve-everything run (S3), the alternative-choice run (S8, never built) and approve-then-undo as its own scenario (S7). No data, validator or agent code changed. Recordings were renamed to match (S10 to S1, S1 to S2, S5 to S6).

## AI involvement

Copilot reviewed the scenarios against the case and proposed eight; the author chose six. Copilot ran S4 live twice to check it before keeping it.

## Consequences

- Both failure types are covered: the agent stopping on its own judgment (S5) and the safety checks catching a bad plan (S6). A model or tool failure is still untested.
- S4 is not stable: one live run handed J10 off entirely, the other proposed a reassignment that displaced J9. Both waited for approval and nothing applied on its own. The expectation says so.
- Priority (Job revenue or Drive time) and permission changes are shown only in Settings, not as scenarios, so the artifact cannot claim a tested priority effect.
- Older timeline beats and decisions 0014 to 0018 use the old ids and are left as written; use the table above to map them.
- The impact test now checks for 5 to 8 scenarios and at least one labelled failure.
