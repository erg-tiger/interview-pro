---
version: 0.1.0
tags: [decision, adr, product, tokens, cost, thinking, accuracy]
---

# 0013: Optimize token usage while keeping thinking on for accuracy

- **Status:** accepted (product decision)
- **Date:** 2026-10-27

## Context

Runs against the base data showed that accuracy depends on the model's thinking. With thinking off, a run took 8 seconds but ignored travel time, proposed an infeasible 15:45 start, and left a collision with another job unresolved. With thinking on (low), runs took 20 to 28 seconds and were coherent. Thinking tokens are the largest and least controllable cost, and model usage is the author's Copilot allowance, whose limits are unverified. Prompt trimming alone barely changed latency (28.8s before, 26.2s after).

## Options considered

1. Turn thinking off to save tokens and time: cheapest, but the errors above made the plans unreliable.
2. Keep thinking on at the lowest effective level and cut every other token: accuracy preserved, cost reduced where it is controllable.
3. Use a larger model with more thinking: possibly more accurate, but higher cost and latency with no evidence it is needed.

## Decision

Option 2.

- Thinking stays on at `low` for the agent call. It is not a tuning knob to turn off; `minimal` gave no savings and `off` failed accuracy checks.
- Reduce the tokens we control: send only live jobs and the active goal profile, compact JSON, no YAML comments, only customer notes (not whole customer records), and a concise output contract (short rationale, few assumptions, at most one alternative per job).
- Use the smaller model (`claude-haiku-5.5`) by default and make the model a setting.
- Retry at most once, and only after a validation failure, continuing the same session so context is reused.
- Measure it: record input, output, and cache tokens per proposal and show them in the UI and the audit log.

## AI involvement

The author set the priority (token use matters, but thinking is needed for accuracy). Copilot supplied the evidence from the runs and implemented the reductions. Copilot had predicted prompt trimming would speed things up; the runs showed thinking time dominates.

## Consequences

- Latency stays around 20 to 30 seconds, so the UI must make the wait visible.
- Token counts per proposal become a metric for the product artifact (cost per resolved call-out).
- The accuracy bar is enforced by the validator, not by spending more tokens.
- If the Copilot allowance proves limiting, a cheaper provider can be swapped in through configuration (0010).
