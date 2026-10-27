---
version: 0.5.0
tags: [instructions, copilot, conventions, timeline]
---

# Project Instructions

Interview case prototype: a same-day scheduling agent for Housecall Pro dispatchers. Full brief in [CONTEXT.md](../CONTEXT.md).

## Principles

- Use synthetic data only. Never use proprietary or confidential data.
- Mock integrations; build one end-to-end slice showing an agent decision, a proposed or completed action, and an approval or failure path.
- Keep the code simple enough that the author can explain, reproduce, and extend it.
- Every agent action must be inspectable (show its reasoning and inputs), reversible, and gated by configurable permissions.
- Scheduling goals (for example drive distance vs. job revenue) and technician qualifications are configuration, not hardcoded.
- Prefer choices that are easy to justify over polish.

## Working agreement

- Stay anchored to the actual ask in [CONTEXT.md](../CONTEXT.md): a working prototype and a brief product artifact, within roughly 3-5 hours of active work. Push back, plainly and early, when the author expands scope, over-designs, or drifts from the case. Say what to cut or defer instead of quietly going along.
- Be honest about weak spots: unsourced assumptions, missing evidence, and places where the design does not answer a case question. Separate confirmed requirements (from the case or the author) from assumptions.
- Optimize for the LLM, not hard-coded rules. Put scheduling judgment in the agent: give it the goal, context, tools, and configuration to reason over, and have it explain its decisions. Use deterministic code only for guarantees that must hold regardless of model output (permission gates, validating tool calls, logging, undo). Do not build rule pipelines that a rules engine could replace; the case asks why the agentic approach beats a rule-based one.

## Conventions

- Every file must begin with YAML frontmatter containing `version` (semver, for example `0.1.0`) and `tags` (a list of lowercase keywords for search and indexing). Add it when creating any file, and bump `version` whenever the file's content changes.
- For files where frontmatter is not valid syntax (for example JSON), carry the same `version` and `tags` in the closest native equivalent, such as a top-level field or a comment.
- Record meaningful AI-assisted decisions, including where AI output was wrong, for the AI usage note.
- Append a beat to [TIMELINE.yaml](../product-artifact/TIMELINE.yaml) for every notable milestone (for example plan established, synthetic data created and tested, design pivot, scenarios validated). Do not add beats for individual files or folders. Follow the template in that file. Its sole purpose for now is a running log of completed work that will populate the product artifact; do not use it as a plan or task list. Leave its `planned_steps` section empty until the project plan file is created.
- Record significant design choices as decision records in [product-artifact/decisions](../product-artifact/decisions) using its template. Read existing records before proposing alternatives, and do not reopen accepted decisions without cause.
