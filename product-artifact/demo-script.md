---
version: 0.4.0
tags: [demo, script, presentation, rehearsal]
---

# Demo script (about 5 minutes)

Run the prototype with `node server.mjs` from `prototype/`, open http://127.0.0.1:3000, and click Reset the day first. One model call takes about 20 to 30 seconds; start it, then talk over the wait.

## 0. Frame it (30 seconds)

- "Remember Dana, the plumber who called out sick with three jobs at risk? That's the case I built for."
- "The model proposes. Code checks it is safe. The dispatcher stays in control, because they need a schedule they can trust, inspect and undo."

## 1. S2 base call-out (2 minutes)

1. Pick **S2 Base call-out** and click Ask the agent. While it works: "One model call. It gets the schedule, travel times, skills, the goal and the permissions."
2. Point out what applied on its own: the two simple reassignments (J6 and J7), with the simulated customer update. "Same time, another qualified technician: low risk, so it runs and can be undone."
3. Point out what is waiting: J5 (the $1,850 install, delayed) and J12 (a job pushed by it). "A changed time needs me."
4. Expand a job: reasoning, confidence, an alternative with its tradeoff. "This is how I inspect it."
5. Click **Approve remaining changes**, then **Undo last applied plan**. "One undo reverses the whole plan, including the automatic part."

## 2. Settings (45 seconds)

- Click **Settings**. Show Never, Recommended, Always, and the **Scheduling priority** choice (Job revenue or Drive time). "This is how much it may do alone, and what it optimizes: revenue for plumbing and HVAC, drive time for cleaning and pool. Safety checks, no cancelling and the low-confidence gate hold at every level."
- Leave the priority on **Job revenue** for S2; don't run a Drive time call-out live (the one drive-time run was inconclusive).
- Don't run it again unless asked (a run takes time and tokens).

## 3. Failures: S5 and S6 (2 minutes)

- **S5, the agent stops (30 seconds):** reset the day, pick **S5** and ask. "The install is now an emergency and nobody qualified is free within the limit. The agent hands it off with the reason and still proposes the other two jobs."
- **S6, the safety net (1 minute):** reset, pick **S6** and ask. "The first proposal is deliberately unsafe: an unqualified technician. The safety checks reject it, the agent retries, and the corrected plan is shown." Label it as an injected test.
- Optional extras if asked, one sentence each: **S1** (Marcus out, one drain job, applied on its own), **S3** (ambiguous note, stated assumption, everything waits) and **S4** (Tom out, HVAC; the outcome varies between runs).

## 4. Close (30 seconds)

- "What's weak: no dispatcher interviews, confidence is the model's own number, only the call-out is built, and the drive-distance goal's effect is inconclusive. The full list is in the last section of the artifact. Next I'd talk to dispatchers and add settings for goal and qualifications."

## If asked

- **How is Pi used?** "It's the connection to the model. One request, one proposed plan, then my code checks it. The model is Claude Haiku through my Copilot login."
- **Is it really an agent?** "It's an AI planner with guardrails. One call, and one retry if the checks fail. No tool loop."
- **Why not rules?** "Free-text notes, moves that affect other jobs, and different goals per business. Rules still do the safety work."
- **How long did this take?** Answer honestly, and say what you'd cut.

## If the live model fails: replay mode

- Stop the server (Ctrl+C) and start it again with `$env:REPLAY = "1"; node server.mjs` from `prototype/`. No model login is needed.
- It plays back three recordings of real runs: **S1, S2 and S6**. Reset the day before each one. Custom reports and other scenarios are refused with a clear message.
- The proposal card says it is a recording. Say so out loud: "this is a recording of a real run; the safety checks, approval and undo are live."
- To re-record, start with `$env:RECORD = "1"; node server.mjs`, run the scenario live, and the proposal is saved to `prototype/recordings/`.

## Don't do live

- Don't run S4 as the main demo: its outcome varies between runs. S1, S3 and S5 ran live and are safe extras (S1 is a quick, fully automatic plan). In replay mode only S1, S2 and S6 work.
- Don't touch the config files unless you are doing the qualification demo.
- If the model call fails or hangs, say so, hit Reset, and describe the S2 result from the artifact.
