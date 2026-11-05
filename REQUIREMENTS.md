---
version: 0.3.0
tags: [requirements, product, prototype, scheduling-agent, acceptance-criteria]
---

# Product requirements: Same-day scheduling agent

**Status:** Build specification for the interview prototype  
**Source brief:** [CONTEXT.md](./CONTEXT.md)  
**Scope decisions:** [Decision 0012](./product-artifact/decisions/0012-scope-technician-call-out-only.md), [Decision 0014](./product-artifact/decisions/0014-reassignments-autonomous-delays-approval.md), [Decision 0015](./product-artifact/decisions/0015-autonomy-setting-never-recommended-always.md), [Decision 0016](./product-artifact/decisions/0016-scheduling-priority-in-settings.md), [Decision 0019](./product-artifact/decisions/0019-six-scenario-test-set.md), and [Decision 0020](./product-artifact/decisions/0020-partial-day-callout-return-time.md).

## 1. Product outcome

Help a dispatcher respond to a same-day technician call-out by producing a safe, explainable plan for the affected jobs. The dispatcher should be able to see what the agent considered, understand which actions will happen automatically and which need approval, and recover from an unwanted change.

The prototype succeeds when a dispatcher can run the call-out workflow end to end using synthetic data, see both an automatic action and a failure or approval path, and undo an applied plan.

## 2. User and prototype scope

### Primary user

An office manager or dispatcher at a home-service business with 7-10 field technicians. The dispatcher is the only person with an interactive interface.

### In scope

- One simulated service day and one disruption type: a technician reports that they are unavailable for some or all of the day. The current UI offers rest of day or return at 13:00.
- The dispatcher selects a technician, enters or selects the report, and starts the agent workflow.
- The agent reasons over that technician's affected jobs and the remaining schedule, then proposes reassignments, delayed slots, displacement of a lower-priority job, or a handoff.
- The dispatcher can set scheduling priority and an autonomy level.
- The system validates proposals, applies permitted actions to a mock schedule, records changes, and supports undo.
- Technician and customer messages are previews or log entries only.

### Out of scope

- Job-overrun and customer-reschedule workflows; multiple disruption types in one run.
- Real calendar, maps, messaging, customer, or technician integrations.
- A technician-facing or customer-facing application, multiple businesses, multiple days, concurrent dispatchers, or durable production storage.
- Agent-initiated job cancellation. A cancellation is never an available agent action.
- Production claims about time saved, decision accuracy, revenue impact, or customer outcomes.

## 3. Product rules and terminology

- **Reassignment:** Assign a job to another qualified technician without changing its scheduled time.
- **Schedule change:** A delayed or shifted time within the simulated service day, or a displacement of a lower-priority job to another slot in that day. No action may create another service day.
- **Partial-day call-out:** The technician is unavailable before the reported return time. A job that overlaps that interval needs an outcome; a job starting at or after the return time remains assigned unless the agent proposes a change. The return boundary is inclusive for new job starts, subject to travel and schedule validation.
- **Handoff:** Stop proposing an action the agent cannot safely or confidently make, and tell the dispatcher what needs attention and why.
- **Plan:** The set of proposed actions and their dependencies for one call-out. A plan may contain both automatic and approval-required actions.
- **Safe to apply:** The proposal passes every deterministic validation in PR-04. The model's confidence or rationale cannot override a failed validation.
- **Prototype configuration:** Qualifications, goal-profile definitions, urgency limits, and per-action permission defaults are stored in configuration files. The dispatcher-facing Settings controls the autonomy level and scheduling priority; it does not edit qualification rules.

## 4. Functional requirements and acceptance criteria

### PR-01 - Report a technician call-out

The dispatcher must be able to start a call-out using a selected technician, an unavailability end time (including the rest of the day), and an optional free-text note.

**Acceptance criteria**

- **AC-01.1** Given the dispatcher opens the call-out workflow, when they choose a technician and submit a report, then the system identifies the selected technician and the affected jobs in that day's schedule.
- **AC-01.2** Given the dispatcher selects a 13:00 return, when the agent plans, then jobs assigned to the caller that overlap the call-out (start before 13:00 and end after the current time) are affected; jobs starting at or after 13:00 remain on that technician's schedule unless the proposal changes them. Any new assignment to the returning technician must start at or after 13:00. Given rest-of-day is selected, then all remaining jobs assigned to the caller are affected.
- **AC-01.3** Given the selected technician is missing or the return time is invalid, when the dispatcher submits, then the system explains what must be corrected and does not call the agent or change the schedule. The report note is optional.
- **AC-01.4** Technician reports are simulated in the dispatcher interface; the prototype does not imply that it received a real technician message.

### PR-02 - Give the agent sufficient context and a structured proposal

The system must provide the agent with the call-out report, current schedule, technician status and skills, job requirements and urgency, travel-time data, active scheduling priority, and applicable permissions. The agent, not a hard-coded ranking pipeline, decides how to cover the work.

**Acceptance criteria**

- **AC-02.1** Given a valid call-out, when the agent is invoked, then it receives the current synthetic data and active settings needed to reason about affected jobs and available options.
- **AC-02.2** Given the agent returns a proposal, then it includes each proposed action and affected job, the proposed technician and/or time where applicable, a concise rationale, confidence, assumptions, and relevant rejected alternatives.
- **AC-02.3** Given the agent is uncertain about an ambiguous report, then its assumption is visible and reflected in confidence; the interface does not present an assumption as a confirmed fact.
- **AC-02.4** The interface labels schedule, status, travel, and configuration data as inputs provided to the agent. It does not claim that the model looked them up or called tools.
- **AC-02.5** The agent does not write to the schedule. Only the application can apply an accepted, validated action.

### PR-03 - Support different scheduling priorities

The dispatcher must be able to choose **Job revenue** or **Drive time** as the scheduling priority. These settings influence the agent's judgment, not the safety checks.

**Acceptance criteria**

- **AC-03.1** Given the dispatcher opens Settings, then both Job revenue and Drive time are available choices with a plain-language description of the trade-off.
- **AC-03.2** Given Job revenue is selected, when a call-out is planned, then the active profile directs the agent to protect higher-value and urgent work according to the configured criteria.
- **AC-03.3** Given Drive time is selected, when a call-out is planned, then the active profile directs the agent to favor shorter travel and preserving routes according to the configured criteria.
- **AC-03.4** Given either priority is active, then qualification, availability, travel feasibility, urgency limits, and validation rules remain in force. A priority cannot make an unqualified or unavailable technician eligible. The called-out technician is unavailable before the return time and eligible afterward only if travel and schedule checks pass.
- **AC-03.5** Given no dispatcher selection has been made, then the configured starting profile is used. A priority change is logged, applies to the next call-out, and remains selected when the simulated day is reset.

### PR-04 - Validate every proposed action before applying it

The application must enforce safety and permission invariants independently of model output.

**Acceptance criteria**

- **AC-04.1** Given a proposal refers to a technician who does not exist or is not qualified for the job, then the validator rejects that proposal.
- **AC-04.2** Given a proposal creates an overlapping assignment, omits a required displacement side effect, or leaves less travel time than the configured travel estimate, then the validator rejects the plan. Existing non-affected jobs assigned to a returning technician remain in the schedule used for those checks.
- **AC-04.3** Given a proposed delayed slot exceeds the job's configured urgency limit, then the validator rejects that proposal.
- **AC-04.4** Given a proposal requests an action that its effective permission does not allow, then that action is not applied.
- **AC-04.5** Given the first proposal fails validation, then the application returns the validation errors to the agent for one retry. Given the retry is still invalid, then the system hands off with the reason and applies none of that invalid plan.
- **AC-04.6** Given the model confidence is below 0.70, then the plan is sent to the dispatcher for review regardless of the selected autonomy level.
- **AC-04.7** Given the agent cannot safely cover a job, then it hands off that job with a specific reason (for example, no qualified technician is available within the permitted delay) rather than inventing an eligible option.
- **AC-04.8** The agent cannot cancel a job. If cancellation would be a possible business response, the system hands the decision to the dispatcher.

### PR-05 - Let the dispatcher configure autonomy

The dispatcher must be able to select a clear autonomy level that determines whether validated actions run automatically or wait for approval.

**Acceptance criteria**

- **AC-05.1** Settings offers **Never**, **Recommended**, and **Always**, explains each level, and defaults to Recommended.
- **AC-05.2** Given Never is selected, then every proposed change waits for dispatcher approval.
- **AC-05.3** Given Recommended is selected, then a same-time reassignment to a qualified, available technician may apply automatically; delays, shifts, displacements, and other schedule changes wait for approval.
- **AC-05.4** Given Always is selected, then every supported action that passes validation may apply automatically, except that low confidence still requires review and cancellation remains unavailable.
- **AC-05.5** Given the selected autonomy level conflicts with a per-action setting, then the dispatcher-facing level takes precedence. The validator still enforces the non-overridable safety checks.
- **AC-05.6** Given the dispatcher changes the autonomy level, then the change is logged, applies to the next call-out, and remains selected when the simulated day is reset.

### PR-06 - Inspect, approve, and reject a plan

The dispatcher must be able to understand the proposed changes before deciding on approval-required actions.

**Acceptance criteria**

- **AC-06.1** Given a plan is displayed, then the dispatcher can inspect the report, affected jobs, relevant technician skills and availability, active priority, proposed changes, rationale, confidence, assumptions, and validation or handoff messages.
- **AC-06.2** Given a plan contains an automatic reassignment and an approval-required delay or displacement, then the interface labels each action separately and makes clear which action has already applied and which is waiting.
- **AC-06.3** Given an approval-required action is pending, when the dispatcher approves it, then only the validated pending action and its required side effects are applied to the mock schedule.
- **AC-06.4** Given an approval-required action is pending, when the dispatcher rejects it, then that action is discarded and the schedule remains unchanged by that action.
- **AC-06.5** Given the dispatcher reviews the plan, then the displayed before-and-after schedule and computed impact use the same current schedule and are refreshed after an action or undo.

### PR-07 - Apply changes, log them, and support undo

All schedule mutations must be explicit, auditable, and reversible in the prototype.

**Acceptance criteria**

- **AC-07.1** Given an action is permitted to run automatically or has been approved, then the application applies it to the mock schedule and displays the resulting assignment or time.
- **AC-07.2** Given a plan contains both automatic and approval-required changes, then the automatic part is validated independently before it applies. A pending action and its side effects do not apply without approval.
- **AC-07.3** Given any setting or schedule action is applied, then the activity history records what changed, when, the source (dispatcher or agent), the reason, and whether it was automatic, approved, rejected, or undone.
- **AC-07.4** Given an applied plan has not been superseded, when the dispatcher selects Undo, then the entire plan is restored to its pre-plan schedule, including its automatic actions, and the undo is recorded in history.
- **AC-07.5** Given a customer or technician would need an update, then the prototype shows a simulated preview or history entry; it does not send a real message.

### PR-08 - Recover clearly from model, replay, or system failures

The dispatcher must receive an honest handoff instead of a success-shaped result when the system cannot complete a safe plan.

**Acceptance criteria**

- **AC-08.1** Given the model times out, returns an error, or cannot produce a usable structured proposal, then the interface shows a clear handoff reason and makes no schedule changes for that run.
- **AC-08.2** Given no eligible technician can cover a job within its urgency limit, then that job is handed off with the limiting reason; other independently valid actions may proceed.
- **AC-08.3** Given replay mode returns a recorded proposal, then the interface identifies it as a replay, shows the recording metadata, and sends it through the current validation, permission, approval, logging, and undo flows.
- **AC-08.4** Given a replay is unavailable for the selected scenario or fails current validation, then the interface explains that replay cannot be used and does not apply the recording.

### PR-09 - Provide a small, repeatable scenario set

The prototype must provide seven synthetic call-out scenarios. Expected model choices are scenario hypotheses; acceptance is based on the stated behavior and safety invariants, not a single exact wording or ranking.

| Scenario | Required behavior |
|---|---|
| **S1 - Easy day, one drain job** | A safe same-time reassignment can be applied automatically under Recommended, with a simulated customer notice and history entry. |
| **S2 - Base call-out, Dana out all day** | Demonstrate a mixed plan: safe same-time reassignments can apply automatically; a delayed install and its displacement wait for approval. Approve the pending changes, then undo the plan and verify the schedule is restored. |
| **S3 - Ambiguous note** | The agent states its assumption. Confidence below 0.70 causes all changes to wait for dispatcher review. |
| **S4 - HVAC specialist out** | Demonstrate pressure on scarce qualified technicians. A proposed displacement must wait for approval; if the agent cannot form a safe plan, it hands off with a reason. Either outcome is acceptable. |
| **S5 - Failure: no qualified technician free in time** | The emergency job is handed off with the reason it cannot be delayed; any other independently valid same-time reassignments may still proceed. |
| **S6 - Failure: injected unsafe first proposal** | Validation rejects the injected unsafe proposal, the agent receives one retry, and only a corrected proposal that passes validation can proceed. |
| **S7 - Partial-day return** | Dana is unavailable until 13:00. J5 overlaps the call-out and needs an outcome; J6 and J7 remain on Dana's schedule. A plan may assign Dana work only at or after 13:00 and only if travel and retained-job checks pass. |

**Acceptance criteria**

- **AC-09.1** Given the dispatcher opens the scenario selector, then S1-S7 are available and each has a distinct description of the behavior it demonstrates.
- **AC-09.2** Given any scenario is run, then its configured synthetic inputs are used and it can be run again after resetting the simulated day.
- **AC-09.3** Given the seven scenarios are evaluated, then both agent judgment handoff (S5) and validator-detected unsafe output (S6) are covered.
- **AC-09.4** Given a scenario's expected model behavior is variable, then the test checks the required safety, approval, or handoff behavior instead of asserting an exact technician choice.
- **AC-09.5** Given S7 is run, then only jobs overlapping the call-out need an outcome, later existing jobs remain assigned, and any proposed assignment to Dana before 13:00 or conflicting with her retained jobs is rejected.

## 5. Data and integration constraints

- Use synthetic technician, job, schedule, skill, revenue, urgency, location, and travel-time data only.
- Keep qualifications, urgency limits, goal-profile definitions, and default per-action permissions in prototype configuration, not hard-coded into agent reasoning.
- Use a mock schedule and simulated notifications. No prototype action may contact a real customer, technician, calendar, or external service.
- The prototype is single-process and single-day. Settings may be held in memory; they are not represented as production account persistence.

## 6. Completion bar

The prototype is ready to demonstrate when:

1. AC-01.1 through AC-09.5 pass for the implemented workflow and seven scenarios.
2. No action that fails validation is applied; no job is cancelled by the agent.
3. The dispatcher can inspect a mixed plan, approve or reject pending actions, and undo an applied plan.
4. At least one successful scenario, one approval path, and both failure scenarios can be demonstrated with synthetic data.
5. The product artifact distinguishes confirmed case requirements from assumptions, explains why an agent is appropriate for the chosen judgment task versus a rule-based alternative, and does not claim unmeasured production outcomes.

## 7. Explicitly deferred

- Supporting job overruns and customer reschedules.
- Editing qualifications, urgency rules, or the definitions of goal profiles in the UI.
- Choosing among multiple alternative plans or editing individual proposed assignments.
- Real customer and technician communications, production integrations, persistence, access control, and multi-user behavior.
- Proving that one scheduling priority produces better outcomes. The prototype exposes the setting and its configured criteria; the current scenario set does not establish a comparative result.
