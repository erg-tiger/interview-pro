---
version: 0.7.0
tags: [plan, scope, phases, test-criteria, draft]
---

# Project Plan (Draft)

Working plan for the prototype and product artifact. Brief in [CONTEXT.md](CONTEXT.md). Completed work is logged in [TIMELINE.yaml](product-artifact/TIMELINE.yaml).

Conventions for this plan:

- **Given** means the case already establishes it. **TBD** means the author decides. Do not fill TBD items with guesses.
- Any number is a hypothesis: state the formula, inputs, and a confidence level. No proprietary data.
- Keep each section to about a page. Most effort goes to the prototype and scenarios.

## Phase 1: Customer

### 1a. Customers and users

- **Given (focus persona):** Office manager or dispatcher at a home service business with 7-10 field technicians, handling same-day disruptions.
- **Segments:**

  | Segment | Examples | Disruption hurts because |
  |---|---|---|
  | Route-based recurring | Home cleaning, pool | A call-out breaks a whole route of short stops and drive time grows |
  | On-demand, high-value (anchor) | Plumbing, HVAC, electrical | Jobs overrun, qualifications limit who can cover, and a lost job is costly |

- **By role:** buyer (owner), user (dispatcher or office manager; at small shops the owner dispatches), affected (technicians, homeowners).
- **Anchor:** On-demand, see [decision 0004](product-artifact/decisions/0004-anchor-on-on-demand.md). Route-based appears as a config change (`active_profile` in `docs/config/goals.yaml`).
- **Persona rationale:** The case sets the persona. On-demand is the anchor because it exercises qualifications and the revenue goal directly.
- **Evidence (TBD, assumptions until sourced):** Disruption frequency and difficulty for on-demand vs. route-based are unverified. Add outside references or a dispatcher conversation.

#### Personas (on-demand; hypotheses, not yet researched)

**Dispatcher or office manager (primary user, approver)**

- Goals: keep technicians productive, protect high-value jobs, keep customers informed, avoid blame when the day goes wrong.
- Context: interrupted constantly, juggling calendar, phone, and maps, deciding fast with incomplete information. Holds undocumented knowledge of who is good at what.
- Pain: manual juggling, mental load, time pressure.
- Needs: speed without surprise; see what changed and why; keep final say on anything affecting customers or technician pay.
- Fears: losing control, being blamed for an agent's mistake, cleanup after a wrong change.
- Confidence: medium on goals and pain, low on how much knowledge is undocumented.

*Industry variants of the dispatcher (same role, goals, and fears; different day and success measure; see [decision 0007](product-artifact/decisions/0007-industry-default-profile.md)):*

| | Route-based (cleaning, pool) | On-demand (plumbing, HVAC) |
|---|---|---|
| Dispatcher's day | Keeping fixed routes intact | Triage: who covers what, and which jobs matter most |
| Success looks like | Fewer miles, routes preserved | High-value jobs protected, urgent jobs not missed |
| Pain | A call-out breaks a whole route | Overruns and mismatched skills |
| Default goal profile | `drive_distance` | `job_revenue` |

**Field technician (context, not built; simulated input and notification target)**

- Goals: a predictable day, fair job allocation, short drives, jobs they are qualified and equipped for.
- Context: on-site and mid-job, carrying parts and tools for the planned jobs, slow to respond.
- Pain: last-minute changes, being pushed to the next job after an overrun, being sent without the right parts or skills.
- Interaction with the agent: reports a job running long, a call-out, or a possible customer reschedule, and is notified of resulting changes with a reason.
- Fears: being treated as interchangeable, losing good jobs, an unsafe or unqualified assignment.
- Confidence: low; least known persona.

**Customer (context, not built; homeowner with an urgent issue, notified through the dispatcher)**

- Goals: the problem fixed quickly, a reliable arrival window, clear communication.
- Context: disrupted by the issue itself (no heat, a leak), often home waiting.
- Pain: waiting without information, no-shows, being rescheduled without notice.
- Interaction with the agent: does not use it directly; the agent proposes customer messages, which need dispatcher approval.
- Fears: being deprioritized, a no-show, paying more for delay.
- Confidence: low; verify with outside sources.

**Design tension to show in a scenario:** a change that is best for the schedule can be bad for the technician or the customer.

### 1b. Jobs to be done

- **Jobs (dispatcher, on-demand; hypotheses):**

  | # | Trigger | Job |
  |---|---|---|
  | J1 | A job runs long | When a technician reports a job running over, I want to know which later jobs are affected and what my options are, so I can protect high-value and time-critical jobs. |
  | J2 | A technician calls out | When a technician can't work, I want to redistribute their jobs to qualified technicians, so I can avoid cancelling revenue. |
  | J3 | A customer reschedules | When a customer moves or cancels, I want to fill the gap or re-order the day, so I can avoid idle technician time. |
  | J4 | After any change | When the plan changes, I want technicians and customers told clearly and quickly, so I can avoid surprises, no-shows, and angry calls. |
  | J5 | Throughout | When I delegate any of this, I want to see what was done, why, and how to undo it, so I can stay accountable and trust it. |

  J1 to J3 are the case's disruption types. J4 and J5 apply to every disruption. "Recommend no change" is a valid agent outcome.

- **Redistribution rule ([decision 0006](product-artifact/decisions/0006-qualify-availability-proximity.md)):** Check qualification, then availability, then rank by the active goal profile (proximity is primary in the drive-distance profile and a tiebreaker in the revenue profile). If no qualified technician is available, use the remaining time on busy qualified technicians' current jobs to propose a delayed slot (within the job's urgency limit), or hand off. The revenue profile may also propose displacing a lower-priority job; this always needs dispatcher approval. Proximity is dynamic: an idle technician is measured from home or the office, and a technician on a job from that job's address.
- **Other constraints (low confidence):** technician fairness and workload, parts and tools on the truck, and customer promises (arrival windows, urgency such as no heat) outweighing convenience.

### 1c. Friction points

- **TBD:** Friction per job, tagged by type: effort, trust, confusion, delay.

### 1d. Prioritization

- **TBD:** Score each friction point on frequency, severity, and business outcome, with the reasoning for each score.
- **Output:** The disruption type the prototype handles first, recorded as a decision record.

## Phase 2: Strategy

- **2a. Direct value for Housecall Pro (TBD):** Revenue and savings, each with formula, inputs, and confidence.
- **2b. Indirect value for Housecall Pro (TBD):** Engagement, retention, and trust.
- **2c. Customer value (TBD):** What the business saves, earns, or avoids.

## Phase 3: Technology

- **3a. Overarching problem (TBD).**
- **3b. How the AI solution solves it (TBD):**
  - Goal, context, tools, and permissions the agent needs.
  - Autonomous vs. approval-required actions, and when it stops or hands off.
  - One viable rule-based alternative, and why the agentic approach is better for the chosen pain point.
- **3c. Risks (TBD).**

### Scope for the prototype

- **In scope:** One end-to-end slice with synthetic data: an agent decision with visible reasoning, a proposed or completed action, and an approval or failure path. The dispatcher is the only persona with a built interface ([decision 0005](product-artifact/decisions/0005-technician-reports-to-agent.md)). Technician reports (job running long, call-out, possible reschedule) are triggered from the dispatcher view as canned messages, and technician and customer notifications appear as mock previews; the dispatcher approves.
- **Configurable, not hardcoded:** Scheduling goal, technician qualifications, and autonomy versus approval per action (see `docs/config/`).
- **Out of scope:** Real Housecall Pro integrations, real data, authentication, production-grade routing.

### Open technical decisions

- Where the agent logic runs (browser-only mock vs. a small backend).
- Whether the agent uses a real LLM or a scripted stand-in for the demo.

## Phase 4: Trust and Measurement

- **Inspect (TBD):** How the dispatcher sees the inputs and reasoning behind an action.
- **Correct and undo (TBD):** How an action is reversed.
- **Recover (TBD):** What happens when the agent is wrong, uncertain, or a tool fails.
- **Trust over time (TBD):** How autonomy expands as trust builds.
- **Outcome metrics (TBD).**
- **Quality bar before shipping (TBD):** For agent decisions, actions, and handoffs.

## Test scenarios

- 5-8 scenarios stored as data, including at least one failure case.
- Each states the input, expected agent decision, expected action, and expected approval or failure behavior.
- Each traces to a friction point from Phase 1c.

## Steps

To be broken down once the phases above are filled in. Then they move into `planned_steps` in the timeline.
