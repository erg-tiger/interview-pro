---
version: 0.1.0
tags: [decision, adr, demo, reliability, replay, recording]
---

# 0018: A replay mode that plays back recorded model proposals

- **Status:** accepted (product decision made by the author); partly mitigates the single-provider risk in [0010](0010-llm-provider-and-reliability.md)
- **Date:** 2026-10-27

## Context

The prototype depends on one model through one person's Copilot login, with no fallback model. If the model is slow, the login has expired, or the network is down during the review, the live demo stops. A reviewer also cannot run it without their own setup.

## Options considered

1. Accept the risk and describe the failure path.
2. A second live provider as a fallback: needs a new adapter, another login, and more testing.
3. A replay mode: record a few real proposals once, and play them back when the model is unavailable.
4. A fully static, hosted version of the prototype: needs the schedule, approval and undo logic ported to the browser, and still could not call the model.

## Decision

Option 3.

- `RECORD=1` saves each successful live proposal to `prototype/recordings/<scenario id>.json`, with the date, model and priority it was recorded under. `REPLAY=1` returns the recording instead of calling the model, and needs no login.
- Only the model is replayed. The recorded proposal is checked again against the live schedule and config, and approval, undo, settings and the audit log all run for real. A replayed proposal is never trusted from a file.
- The proposal card carries a banner saying it is a recording of a real run, with its date, model and priority.
- Three scenarios are recorded: **S1** (the base call-out), **S5** (the injected unsafe plan with its retry) and **S10** (an easy, fully automatic plan). Any other scenario or a custom report is refused with a message. Each replay needs the day reset first, because the recording assumes the starting schedule.
- Scenario ids are used as file names, so only short plain ids are accepted.

## AI involvement

Copilot argued against the hosted static version and for a small replay mode, and costed it; the author approved it. Copilot implemented it and recorded the three runs.

## Consequences

- The live demo has a safety net, and a reviewer can try the prototype without a login.
- It is a recording, not a live agent, and must be presented as one. It does not replace a second provider for real use.
- The three recorded runs cost about 25,000 tokens in total (S1 about 9,200, S10 about 6,400, S5 about 9,300).
- If the schedule data or config changes in a way that makes a recording fail the safety checks, the replayed plan is handed off instead of applied, and the recordings need to be redone.
