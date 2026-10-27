// version: 0.1.0
// tags: [prototype, test, impact, scenarios]

import test from "node:test";
import assert from "node:assert/strict";
import { loadScenarios, loadWorld } from "../lib/world.mjs";
import { planImpact } from "../lib/impact.mjs";

const world = await loadWorld();
const ctx = { jobs: world.jobs, technicians: world.technicians, business: world.business, callOut: { technician_id: "T3" } };

test("handing every job back covers no revenue and adds no drive time", () => {
  const moves = ["J5", "J6", "J7"].map((job_id) => ({ job_id, kind: "hand_off" }));
  const impact = planImpact(moves, ctx);
  assert.equal(impact.coveredUsd, 0);
  assert.equal(impact.atRiskUsd, 1850 + 220 + 180);
  assert.equal(impact.driveMinutes, 0);
});

test("reassigned jobs count as covered and add drive minutes to reach them", () => {
  const moves = [
    { job_id: "J6", kind: "reassign", assigned_to: "T1", start: "14:30", end: "15:30" },
    { job_id: "J7", kind: "reassign", assigned_to: "T2", start: "15:45", end: "16:45" },
    { job_id: "J5", kind: "hand_off" },
  ];
  const impact = planImpact(moves, ctx);
  assert.equal(impact.coveredUsd, 220 + 180);
  assert.equal(impact.atRiskUsd, 1850);
  assert.ok(impact.driveMinutes > 0);
});

test("every scenario names a real technician and ids are unique", async () => {
  const scenarios = await loadScenarios();
  const techIds = new Set(world.technicians.map((t) => t.id));
  assert.ok(scenarios.length >= 8);
  for (const s of scenarios) assert.ok(techIds.has(s.technician_id), `${s.id}: unknown technician ${s.technician_id}`);
  assert.equal(new Set(scenarios.map((s) => s.id)).size, scenarios.length);
});
