---
version: 0.7.0
tags: [run-of-show, presentation, rehearsal, interview]
---

# Run of Show: Same-Day Scheduling Agent (60 minutes)

**Framing:** speak as a product manager walking the VP of Product and a few product and engineering peers through a bet on a dispatcher copilot. Don't end with a formal ask. End on the story and open the floor.

| Block | Time | Minutes |
|-------|------|---------|
| Open | 0:00 | 3 |
| Problem and research | 0:03 | 9 |
| Solution design | 0:12 | 9 |
| Trust and failure | 0:21 | 8 |
| Measurement and scenarios | 0:29 | 4 |
| Process and AI use | 0:33 | 5 |
| Prototype demo | 0:38 | 12 |
| Close and discussion | 0:50 | 10 |

Aim to talk for about 40 minutes and leave about 20 for conversation. The artifact comes first and the demo second, as the brief asks. Pause at the end of each block with a check-in question; the panel will likely jump in.

## Before you start
- From `prototype/`, run `node server.mjs`. Open `http://127.0.0.1:3000` in one tab and `docs/index.html` in another.
- Click **Reset the day**.
- Keep the [README architecture diagram](../README.md) open as a backup.
- Use ← / → on the artifact page to move between sections.
- Have replay mode ready (`$env:REPLAY = "1"; node server.mjs`) in case the model call fails; it covers S1, S2 and S6, but not the new partial-day scenario S7. Run S7 live with `REPLAY` unset. See [demo-script.md](demo-script.md).

## Open (3 min)
- **Scene (this is the opening of the artifact):** "Dana, a gas-certified plumber, calls out sick. Three of her jobs are at risk, one a $1,850 install, and covering them pushes another tech's day around."
- "Who's qualified? Who's free? Who's close enough? Which job do you protect, and who do you tell? Today that's all manual."
- **Thesis:** "Dispatchers don't need a smarter schedule. They need one they can trust, inspect and undo." The model proposes, code checks it's safe, the dispatcher stays in control.
- Roadmap: the problem and the design (the artifact), how I built it, then the prototype.

## 1. Problem and research (9 min)
*Artifact: Overview, Problem, Scope.*
- **Headline:** I started from the dispatcher's morning and from what technicians say about being scheduled, then picked the call-out as the sharpest slice.
1. **My product review (3 min):** I signed up for Housecall Pro and reviewed the calendar.
   - What I saw: drive-time optimization and drag-and-drop, but **no feature that flags a technician with overlapping assignments**.
   - "Over-scheduling is the pain I kept reading about, and nothing warns the dispatcher. So the agent checks overlap and shows impact on every job."
   - "The agent works alongside drag-and-drop. The dispatcher can still adjust anything it proposes."
   - Caveat: "First-hand and not checked against documentation."
2. **Reddit reading (3 min):** informal, from home-service professionals. Show the two screenshots in the Problem section.
   - Screenshot 1: technician 12 hours in, offered "one more," goes home. Over-scheduling ends in a declined job.
   - Screenshot 2: one tech sent an hour across town while another sits on standby; reply cites burnout.
   - Themes: over-scheduling, frustration with dispatchers, declining jobs or calling out.
   - "That shaped the prototype: it shows impact on every job and never cancels one."
   - Be upfront: "Anecdotal. It tells me where to look, not how common it is."
3. **Who it's for and why the call-out (2 min):** a dispatcher at a 7 to 10 technician business. A call-out hits several jobs at once and forces qualification, delay versus hand-off, and a natural failure case.
4. **Scope (1 min):** one disruption type, one industry's synthetic data, one dispatcher. The call-out can last all day or end at the prototype's 13:00 return time. Name what's left out.

## 2. Solution design (9 min)
*Artifact: Solution, Configuration.*
- **Headline:** give the model the goal, context and permissions. Keep code for the guarantees.
1. **What the agent gets:** schedule, travel times, skills, goal, permissions. One call.
2. **Three outcomes:**
   - Low-risk (same time, another qualified tech): runs on its own, can be undone.
   - Changed time: needs approval.
   - Infeasible job or model failure: hand-off to the human.
3. **Configurable:** autonomy (Never, Recommended, Always), priority (Job revenue or Drive time), qualifications, urgency.
4. **Why not rules:** free-text notes, ripple effects, different goals per business.
   - "Rules do the safety work. The model does the judgment."

## 3. Trust and failure (8 min)
*Artifact: Trust.*
1. **Inspect:** each job shows reasoning, confidence, and an alternative with its tradeoff.
2. **Undo:** one click reverses the whole plan, automatic part included.
3. **Recover:** the validator checks qualification, travel, overlap, urgency, workday. Retry once, then hand-off.
4. **Trust over time:** start on Recommended, move up as approvals become routine.
5. **Weak spots live at the end of the artifact** ("Where this stands and what's next"). Name the top two here and point to the rest:
   - Confidence is the model's own number, uncalibrated. The gate uses overall confidence; in an earlier drive-time run a 0.6 job auto-applied.
   - Undo leaves the technician marked as called out.
- Check-in: "Which would worry a dispatcher most?"

## 4. Measurement and scenarios (4 min)
*Artifact: Measures, Scenarios.*
1. **Metrics:**
   - Zero applied proposals that break a safety check.
   - Acceptance rate, higher above the confidence threshold than below.
   - Undo rate per automatic action type.
2. "Nothing is measured. 80% and 5% are my placeholders, to set against a real baseline."
3. **Scenarios:** seven are configured. S1-S6 are the established set: automatic reassignment, mixed plan with approve and undo, ambiguous note, HVAC specialist out, agent handoff, and validator rejection of an injected unsafe plan. S7 adds the partial-day return case and has one live run; treat that as a demo check, not repeatable model evidence.
4. "Synthetic data, single runs of a non-deterministic model. Priority and permissions are shown in Settings, not as scenarios; the one drive-time run was inconclusive, so I cut it."
- Check-in: "What's the first number you'd want from a pilot?"

## 5. Process and AI use (5 min)
*Artifact: Research, Process, AI use.*
- **One-line summary (top of the AI section):** Copilot to plan, write and test; AI was wrong in places and I caught it; I made the risk calls.
- **Milestones (the Process section, in order):**
  1. Foundations: brief, conventions, config kept out of code.
  2. Scope and agent design: dispatcher-only, rule pipeline to model judgment.
  3. Customer hypotheses and requirements.
  4. Provider spike: free tier unreliable, moved to Pi on a Copilot login.
  5. First real proposals: what the agent got wrong fixed the prompt and checks.
  6. Validator and dispatcher UI: first call-out end to end.
  7. Autonomy and priority settings: per-action approval, Settings choice.
  8. Plan impact and scenarios.
  9. Replay mode as a demo safety net.
  10. Artifact and this run of show.
- **Design pivots (table under the milestones):** rules to model judgment; tool loop to one call; Gemini to Pi; thinking off to low; all-or-nothing to per-action approval; config file to Settings.
- **Tools:** GitHub Copilot in VS Code (planning, code, tests); Pi SDK on my Copilot login (the scheduling model).
- **Where AI helped:** drafting plan and records, writing and testing code, the agent itself.
- **Where AI was wrong** (say how each was caught):
  1. Ranked by **proximity first**, against the case's revenue goal. I caught it.
  2. Offered **GitHub Models**; a docs check showed it was shut down.
  3. First requirements described **demo mechanics**, not product behavior. I redirected it.
  4. **Undo left the technician marked as called out.** Found by running scenarios, not by tests.
- **What I did without AI:**
  1. The calendar review and user research.
  2. Product calls on risk and autonomy: reassignment is low risk, delays need approval, the Always level.
  3. The trust idea, the level names and the token budget.

## Bridge (30 sec)
- "That's the design. Let me show you the core of it working." Switch to the prototype tab.

## Prototype demo (12 min)
Follow [demo-script.md](demo-script.md). Keep each step to one sentence of "why it matters."

1. **Frame (1 min):** "One case: a technician calls out sick."
2. **S2 base call-out (4 min):** ask the agent and talk over the 20 to 30 second wait. Show what applied on its own (J6 and J7), what's waiting (J5 and J12), expand a job for reasoning and alternative, **Approve remaining changes**, then **Undo last applied plan**. "One undo reverses everything."
3. **S7 partial-day return (2 min, live only):** reset, run S7, and point out that J5 overlaps Dana's unavailability while J6 and J7 remain on her schedule. In the live run, J5 moved to Aisha at 12:19 and her J12 shifted; both waited for approval. Explain that Dana can be considered after 13:00 only when travel and retained-job checks pass; automated tests cover that boundary. S7 is not available in replay mode.
4. **Settings (1 min):** autonomy and scheduling priority. "Safety checks hold at every level." Don't run a Drive time call-out live.
5. **Failures S5 and S6 (3 min):** reset, run S5: "The install is an emergency and nobody qualified is free in time. The agent hands it off with the reason and still proposes the rest." Then reset and run S6: "The first proposal is deliberately unsafe. The checks reject it, the agent retries, and the corrected plan is shown." Label S6 as an injected test.
6. **Wrap (1 min):** "What's real is the decision, the checks, the approval and the undo."

**Be upfront about what's simulated:**
- Customer notices are simulated.
- Data is synthetic and in memory.
- Confidence isn't calibrated.
- If in replay mode, say it out loud: "this is a recording of a real run; the safety checks, approval and undo are live."

## Close and discussion (10 min)
- **Recap (1 min):** a dispatcher copilot that proposes, a validator that guarantees, and a person who decides.
- "The value isn't a clever plan. It's a plan a dispatcher will trust enough to use."
- **Next steps (artifact: "Where this stands and what's next"):** talk to dispatchers; a rules baseline; per-job confidence gating and an undo fix; a settings screen for qualifications.
- Then open the floor. Don't make an ask.

### Prompts if conversation stalls
- "What would a dispatcher need to see before they'd turn on automatic mode?"
- "Which disruption would you take on after call-outs?"
- "How would you get a real baseline for the metrics?"

### Likely questions
- **Is it really an agent?** An AI planner with guardrails: one call, one retry if checks fail, no tool loop.
- **Why not just rules?** Free-text notes, ripple effects and per-business goals. Rules do the safety work. I haven't built a baseline to prove the difference.
- **How reliable is the confidence number?** It's the model's own and uncalibrated. The validator is the real guarantee.
- **Why was the drive-time run cut?** One run couldn't separate the goal profile from run-to-run variation, so it isn't a scenario. Priority is selectable in Settings but untested; I'd run it repeatedly on a case where proximity and revenue truly diverge.
- **How strong is the Reddit research?** Informal and anecdotal. It's a direction, not evidence of prevalence.
- **Does it work outside one industry?** Only one synthetic data set. Priority and qualifications are configuration, but I haven't shown it across industries.
- **Where do the 80% and 5% come from?** Placeholders, to be set against a real baseline.
- **How long did this take, and what would you cut?** Answer honestly with the actual time, then name what you'd defer.
- **What would you do with another month?** Dispatcher interviews, per-job gating, a UI for qualifications, a rules baseline, and calibration.
