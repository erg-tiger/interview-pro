---
version: 0.1.1
tags: [decision, adr, agent, llm, prompt, scope]
---

# 0011: One structured LLM call with inputs in the prompt; no tool loop

- **Status:** accepted
- **Date:** 2026-10-27

## Context

Decision 0009 chose a bounded tool-calling loop with three read-only tools. Since then:

- The author clarified that only a simulated tool call is needed for the prototype.
- Time is limited (about 2-4 hours remaining).
- Reliability was the main argument against a loop, but Copilot models through Pi answered one-line prompts in about 1.5 seconds, so effort is the remaining cost.
- With Pi, a tool loop needs the SDK and custom-tool setup. A single call with no tools can use Pi's print mode (`--no-tools`), which cannot touch files or run commands.

## Options considered

1. One structured call: code puts the schedule, technician statuses, travel times, and config in the prompt, and the model returns a structured proposal.
2. Tool loop with mocked tool data: the model chooses what to look up. More agentic, but more build work.

## Decision

Option 1.

- Code assembles the inputs and the model makes the scheduling judgment: qualification, availability, ranking under the active profile, delay versus handoff, and when to hand off. It returns the action, technician and time, rationale, confidence, assumptions, and alternatives rejected.
- The validator, approval gates, handoff on failure, logging, and undo from 0009 are unchanged.
- The UI labels the inputs as "inputs provided to the agent". It does not call them tool calls, because the model did not choose them.
- The provider was meant to stay behind a neutral interface (Pi print mode with tools disabled, or an OpenAI-compatible endpoint). As built, the prototype uses Pi's SDK only; see the correction in [0010](0010-llm-provider-and-reliability.md).

## AI involvement

Copilot originally recommended this option and proposed the tool loop as a stretch. The author chose the loop (0009), then reverted to a single call after the time and tooling costs became clear. Copilot's one condition was honest labelling: inputs must not be shown as tool calls.

## Consequences

- Supersedes the tool loop and three-tool design in [0009](0009-llm-agent-with-read-only-tools.md). The rest of 0009 stands.
- Weaker evidence for "the agent decides what to look up". The case for an agent rests on judgment and explanation, which a rules engine cannot provide. The tool loop becomes future work.
- The tool-calling spike (`prototype/spike.mjs`) is no longer needed for the runtime. The next test is single-call JSON output through Pi print mode and through Gemini.
