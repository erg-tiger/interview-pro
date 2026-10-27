// version: 0.3.0
// tags: [prototype, plan, permissions, undo, approval, autonomy]

import { validate } from "./validator.mjs";

// Decisions 0014 and 0015: unless the business sets autonomy to "always" (permissions.unlocked), delays, shifts,
// displacement, and rescheduling need the dispatcher, whatever the config says.
const ALWAYS_APPROVE = new Set(["propose_delayed_slot", "shift_job_time", "displace_job", "reschedule_to_another_day"]);

// Maps each move to a permission action and decides which moves may run without approval.
export function classify(moves, proposal, ctx) {
  const perms = ctx.config.permissions;
  const unlocked = perms.unlocked === true;
  const modeOf = (action) => {
    const mode = perms.actions[action]?.mode ?? "approval";
    return mode === "autonomous" && ALWAYS_APPROVE.has(action) && !unlocked ? "approval" : mode;
  };
  const lowConfidence = proposal.overall_confidence < perms.handoff.min_confidence;
  const actions = [];
  for (const move of moves) {
    if (move.kind === "hand_off") continue;
    const job = ctx.jobs.find((j) => j.id === move.job_id);
    let action = move.kind === "delay" ? "propose_delayed_slot" : "reassign_job";
    if (move.kind === "side_effect") action = move.assigned_to === job.assigned_to ? "shift_job_time" : "reassign_job";
    let mode = modeOf(action);
    // A side effect only exists because of another change, so it waits with that change.
    if (move.kind === "side_effect" && mode === "autonomous" && !unlocked) mode = "approval";
    actions.push({ job_id: move.job_id, action, mode });
  }
  const autoIds = lowConfidence ? [] : actions.filter((a) => a.mode === "autonomous").map((a) => a.job_id);
  const approvalIds = actions.filter((a) => a.mode !== "forbidden" && !autoIds.includes(a.job_id)).map((a) => a.job_id);
  let planMode = "mixed";
  if (actions.length === 0) planMode = "handoff";
  else if (approvalIds.length === 0) planMode = "auto";
  else if (autoIds.length === 0) planMode = "approval";
  return { actions, autoIds, approvalIds, planMode, lowConfidence, forbidden: actions.filter((a) => a.mode === "forbidden") };
}

export function subProposal(proposal, ids) {
  const keep = new Set(ids);
  return {
    ...proposal,
    jobs: proposal.jobs.filter((j) => keep.has(j.job_id)),
    side_effects: (proposal.side_effects ?? []).filter((s) => keep.has(s.job_id)),
  };
}

export function checkPlan(proposal, ctx, opts = {}) {
  const result = validate(proposal, ctx, opts);
  if (!result.ok) return { ...result, classification: null };
  const classification = classify(result.moves, proposal, ctx);
  const errors = classification.forbidden.map((a) => ({
    code: "forbidden",
    message: `${a.job_id}: ${a.action} is forbidden by the permissions; hand this job off instead.`,
    job_id: a.job_id,
  }));
  return { ok: errors.length === 0, errors, moves: result.moves, classification };
}

export function applyMoves(state, moves) {
  const before = [];
  for (const move of moves) {
    const job = state.jobs.find((j) => j.id === move.job_id);
    before.push({ job_id: job.id, assigned_to: job.assigned_to, start: job.start, end: job.end, needs_dispatcher: Boolean(job.needs_dispatcher) });
    if (move.kind === "hand_off") job.needs_dispatcher = true;
    else Object.assign(job, { assigned_to: move.assigned_to, start: move.start, end: move.end });
  }
  return before;
}

export function undoMoves(state, before) {
  for (const b of before) {
    const job = state.jobs.find((j) => j.id === b.job_id);
    Object.assign(job, { assigned_to: b.assigned_to, start: b.start, end: b.end });
    if (b.needs_dispatcher) job.needs_dispatcher = true;
    else delete job.needs_dispatcher;
  }
}
