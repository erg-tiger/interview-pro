---
version: 0.1.2
tags: [decision, adr, agent, llm, tools, validator]
---

# 0009: Agent uses an LLM with read-only tools; code only validates and applies

- **Status:** accepted; the tool loop is superseded by [0011](0011-single-call-inputs-in-prompt.md), the rest stands
- **Date:** 2026-10-27

## Context

The case asks why an agentic approach beats a rule-based one. Earlier decision 0006 described qualification, availability, and ranking as a fixed filter pipeline, which a rules engine could replace. The author asked to optimize for the LLM instead of hard-coded rules.

## Options considered

1. One structured LLM call with all context in the prompt: simple and cheap, but the model cannot look anything up, so it is less clearly an agent.
2. Full tool-calling loop with many tools: most agentic, but slow to build and risky to demo.
3. One bounded loop with a few read-only tools, ending in a structured proposal: more agentic than option 1, much cheaper than option 2.

## Decision

Option 3.

- **In the prompt as context:** goals, urgency, and permissions from `config/`.
- **Read-only tools (three):** `get_schedule`, `get_technician_status`, `get_travel_minutes`. There is no qualification-check tool, so qualification stays the model's judgment over skills and job requirements.
- **The model decides** qualification, availability, ranking, delays, and when to hand off, and explains its reasoning, assumptions, and rejected alternatives.
- **The agent never writes.** Code applies approved proposals to the mock calendar.
- **Validator (the only hard rules):** schema is valid; the technician exists and is qualified; the slot has no overlap; the gap between consecutive jobs for a technician is at least the travel time (added after a real run proposed a 15:45 start that was infeasible by four minutes); every overlap the plan creates is resolved by a listed side effect (a run left a collision with another job unresolved); the action respects its mode in `permissions.yaml`; delayed slots respect the urgency limit. One retry with errors fed back, then hand off.
- **Loop cap:** 6 tool rounds. Timeout, LLM error, or low confidence leads to a handoff with no calendar change.
- **Spike first:** verify tool calling and structured output with the chosen provider before building on it. If it fails, fall back to option 1.

## AI involvement

Copilot proposed the three options and the design. The author directed the shift to LLM-first logic and accepted the validator list, including enforcing the urgency limit.

## Consequences

Supersedes the filter pipeline in [0006](0006-qualify-availability-proximity.md). Its order (qualification, availability, then profile ranking) and fallback behavior become prompt guidance and scenarios, not code. The LLM provider is not yet decided.
