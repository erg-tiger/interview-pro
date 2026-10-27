// version: 0.4.0
// tags: [prototype, test, validator, approval]

// Run: npm test   (or: node --test test/validator.test.mjs)
import test from "node:test";
import assert from "node:assert/strict";
import { loadConfig, loadWorld } from "../lib/world.mjs";
import { checkPlan, subProposal } from "../lib/plan.mjs";

const world = await loadWorld();
const baseConfig = await loadConfig();
const clone = (x) => JSON.parse(JSON.stringify(x));
const makeCtx = (config = clone(baseConfig), jobUrgency = {}) => ({
  ...clone(world),
  config,
  jobUrgency,
  callOut: { technician_id: "T3", from: "10:30", until: null, note: "" },
});

const job = (job_id, outcome, technician_id, new_start, new_end) => ({
  job_id,
  outcome,
  technician_id,
  new_start,
  new_end,
  rationale: "test",
  confidence: 0.8,
  handoff_reason: null,
  alternatives: [],
});

// J5 is the water heater install, J6 a drain cleaning, J7 a faucet repair, J12 Aisha's toilet repair.
const goodPlan = () => ({
  summary: "test",
  overall_confidence: 0.8,
  assumptions: [],
  side_effects: [{ job_id: "J12", technician_id: "T6", new_start: "16:00", new_end: "17:00", reason: "install runs long" }],
  jobs: [
    job("J5", "delay", "T6", "12:19", "15:19"),
    job("J6", "reassign", "T1", "14:30", "15:30"),
    job("J7", "reassign", "T2", "15:45", "16:45"),
  ],
});

const codes = (result) => result.errors.map((e) => e.code);

test("a sound plan passes; simple reassignments run on their own and the rest waits", () => {
  const result = checkPlan(goodPlan(), makeCtx());
  assert.deepEqual(result.errors, []);
  assert.equal(result.classification.planMode, "mixed");
  assert.deepEqual(result.classification.autoIds.sort(), ["J6", "J7"]);
  assert.deepEqual(result.classification.approvalIds.sort(), ["J12", "J5"]);
});

test("the simple reassignments are valid on their own", () => {
  const alone = checkPlan(subProposal(goodPlan(), ["J6", "J7"]), makeCtx(), { partial: true });
  assert.deepEqual(alone.errors, []);
  assert.equal(alone.classification.planMode, "auto");
});

test("delays and shifts always need approval, even if the config says autonomous", () => {
  const config = clone(baseConfig);
  for (const name of ["propose_delayed_slot", "shift_job_time", "displace_job", "reschedule_to_another_day"]) config.permissions.actions[name].mode = "autonomous";
  const result = checkPlan(goodPlan(), makeCtx(config));
  assert.ok(result.classification.approvalIds.includes("J5"));
  assert.ok(result.classification.approvalIds.includes("J12"));
});

test("a business can require approval for reassignments too", () => {
  const config = clone(baseConfig);
  config.permissions.actions.reassign_job.mode = "approval";
  const result = checkPlan(goodPlan(), makeCtx(config));
  assert.equal(result.classification.planMode, "approval");
  assert.deepEqual(result.classification.autoIds, []);
});

test("a business that sets autonomy to always can let delays and their side effects run on their own", () => {
  const config = clone(baseConfig);
  for (const rule of Object.values(config.permissions.actions)) if (rule.mode !== "forbidden") rule.mode = "autonomous";
  config.permissions.unlocked = true;
  const result = checkPlan(goodPlan(), makeCtx(config));
  assert.deepEqual(result.errors, []);
  assert.equal(result.classification.planMode, "auto");
  config.permissions.actions.cancel_job.mode = "forbidden";
  const unsure = goodPlan();
  unsure.overall_confidence = 0.4;
  assert.deepEqual(checkPlan(unsure, makeCtx(config)).classification.autoIds, []);
});

test("low confidence keeps everything waiting for a human", () => {
  const plan = goodPlan();
  plan.overall_confidence = 0.4;
  const result = checkPlan(plan, makeCtx());
  assert.deepEqual(result.classification.autoIds, []);
  assert.equal(result.classification.planMode, "approval");
});

test("a plan of only reassignments and handoffs applies without approval", () => {
  const plan = goodPlan();
  plan.side_effects = [];
  plan.jobs[0] = { ...job("J5", "hand_off", null, null, null), handoff_reason: "no qualified technician is free in time" };
  const result = checkPlan(plan, makeCtx());
  assert.deepEqual(result.errors, []);
  assert.equal(result.classification.planMode, "auto");
});

test("an unqualified technician is rejected", () => {
  const plan = goodPlan();
  plan.jobs[0] = job("J5", "reassign", "T8", "11:00", "14:00");
  assert.ok(codes(checkPlan(plan, makeCtx())).includes("unqualified"));
});

test("an affected job with no outcome is rejected", () => {
  const plan = goodPlan();
  plan.jobs.pop();
  assert.ok(codes(checkPlan(plan, makeCtx())).includes("missing"));
});

test("a start that ignores travel time is rejected", () => {
  const plan = goodPlan();
  plan.jobs[2] = job("J7", "reassign", "T1", "15:45", "16:45");
  assert.ok(codes(checkPlan(plan, makeCtx())).includes("travel"));
});

test("a collision with another job must be resolved by a side effect", () => {
  const plan = goodPlan();
  plan.side_effects = [];
  assert.ok(codes(checkPlan(plan, makeCtx())).includes("overlap"));
});

test("a delay beyond the urgency limit is rejected", () => {
  const result = checkPlan(goodPlan(), makeCtx(clone(baseConfig), { J5: "emergency" }));
  assert.ok(codes(result).includes("urgency"));
});

test("a forbidden action is rejected", () => {
  const config = clone(baseConfig);
  config.permissions.actions.reassign_job.mode = "forbidden";
  assert.ok(codes(checkPlan(goodPlan(), makeCtx(config))).includes("forbidden"));
});

test("handing off every job is valid and applies nothing", () => {
  const plan = {
    summary: "test",
    overall_confidence: 0.8,
    assumptions: [],
    side_effects: [],
    jobs: ["J5", "J6", "J7"].map((id) => ({ ...job(id, "hand_off", null, null, null), handoff_reason: "no one fits" })),
  };
  const result = checkPlan(plan, makeCtx());
  assert.deepEqual(result.errors, []);
  assert.equal(result.classification.planMode, "handoff");
});
