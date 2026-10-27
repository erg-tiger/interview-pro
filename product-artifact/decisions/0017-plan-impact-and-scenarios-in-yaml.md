---
version: 0.1.0
tags: [decision, adr, scenarios, metrics, prompt, yaml]
---

# 0017: Plan impact in code, scenarios in YAML, and sharper goal guidance in the prompt

- **Status:** accepted (product decision made by the author, scoped to be cheap in tokens)
- **Date:** 2026-10-27

## Context

After the scheduling priority became a Settings choice ([0016](0016-scheduling-priority-in-settings.md)), the one drive-time run (S2) was inconclusive and the demo scenarios felt stale. Three causes were identified:

- The model only saw two short keyword lists per profile and no instruction on how to apply them.
- Nothing computed what a plan did, so the effect of a priority could be argued but not seen.
- The scenarios were hardcoded in the UI script, and almost all used the same technician.

## Decision

1. **Sharper guidance (no new model calls).** `goals.yaml` gains a `criteria` glossary that defines each term. The prompt now says: `job_priority` decides which jobs to cover first, `technician_ranking` is applied in order, and each job's rationale names the deciding criterion. Only the criteria in the active profile are sent.
2. **Plan impact, computed in code.** `lib/impact.mjs` returns revenue covered, revenue handed back, and drive minutes to reach the moved jobs, using the schedule from before the plan. The proposal card shows it as one line next to the active priority. It is deterministic and is recomputed when the dispatcher switches an alternative or restores the plan.
3. **Scenarios in YAML.** `config/scenarios.yaml` holds the demo scenarios and the server serves them at `/api/scenarios`. The UI no longer hardcodes them, and a unit test checks that each scenario names a real technician and that ids are unique. Two scenarios were added using existing technicians: **S9** (Tom, an HVAC specialist, is out) and **S10** (Marcus is out with one simple job).
4. **Not done, on purpose:** richer technician personas in the data, a recurring-service dataset, and repeated runs per priority. They cost the most tokens and do not close a case requirement.

## AI involvement

The author asked for these changes after Copilot costed the options and recommended this subset. Copilot implemented them and ran one live scenario (S10) to check them.

## Consequences

- A priority's effect can now be compared by number, but the comparison still needs several runs per side to mean anything.
- S10 ran live under Job revenue: one reassignment applied automatically, the impact line showed $230 covered and 27 drive minutes, and the rationale named `revenue_protected` as the deciding criterion. That confirms the prompt change reaches the output. It does not show that Drive time behaves differently.
- S9 was added but never run, so it is not demonstrated.
- The impact figure counts drive time into the moved jobs only; it is not total route length.
