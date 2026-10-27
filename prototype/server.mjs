// version: 0.6.0
// tags: [prototype, server, api, state, audit-log, approval, settings, autonomy, goals, scenarios, impact, replay]

// Run: node server.mjs, then open http://127.0.0.1:3000 (localhost only: it uses the author's Copilot login).
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { initAgent, propose, compactContext } from "./lib/agent.mjs";
import { applyMoves, checkPlan, subProposal, undoMoves } from "./lib/plan.mjs";
import { planImpact } from "./lib/impact.mjs";
import { loadRecording, saveRecording, validKey } from "./lib/replay.mjs";
import { loadConfig, loadScenarios, loadWorld } from "./lib/world.mjs";

const PORT = Number(process.env.PORT ?? 3000);
// REPLAY=1 plays back recorded model proposals (no login needed); RECORD=1 saves each successful live proposal (decision 0018).
const REPLAY = process.env.REPLAY === "1";
const RECORD = process.env.RECORD === "1";
const MODES = ["autonomous", "approval", "forbidden"];
const AUTONOMY_LEVELS = ["never", "recommended", "always"];
const STATIC = {
  "/": ["public/index.html", "text/html; charset=utf-8"],
  "/app.js": ["public/app.js", "text/javascript; charset=utf-8"],
  "/styles.css": ["public/styles.css", "text/css; charset=utf-8"],
};

const clone = (x) => JSON.parse(JSON.stringify(x));
const httpError = (status, message) => Object.assign(new Error(message), { status });
const planName = (id) => id.replace("plan-", "Plan ");

let world;
let state;
let pending = null;
let history = [];
let log = [];
let busy = false;
let counter = 0;
let agentInfo = null;
// The dispatcher's autonomy setting; it survives a day reset (decision 0015).
let autonomy = "recommended";
// The dispatcher's scheduling priority (which goal profile the agent optimizes); starts from the config default (decision 0016).
let goal = null;

async function resetDay() {
  world = await loadWorld();
  state = { jobs: clone(world.jobs), technicians: clone(world.technicians) };
  pending = null;
  history = [];
  log = [];
  addLog("system", "The day was reset to the starting schedule.");
}

function addLog(type, text, extra = {}) {
  log.push({ n: log.length + 1, at: new Date().toISOString(), type, text, ...extra });
}

async function effectiveConfig(overrides = {}) {
  const config = await loadConfig();
  config.goals.active_profile = goal;
  const applied = [];
  // Never = every change waits. Always = nothing waits, except what the safety checks and confidence gate stop. Cancelling stays forbidden.
  if (autonomy !== "recommended") {
    for (const [action, rule] of Object.entries(config.permissions.actions)) {
      if (action !== "cancel_job") rule.mode = autonomy === "always" ? "autonomous" : "approval";
    }
    config.permissions.unlocked = autonomy === "always";
  }
  if (overrides.profile) {
    if (!config.goals.profiles[overrides.profile]) throw httpError(400, "Unknown goal profile.");
    config.goals.active_profile = overrides.profile;
    applied.push(`profile: ${overrides.profile}`);
  }
  for (const [action, mode] of Object.entries(overrides.permissions ?? {})) {
    if (!config.permissions.actions[action] || !MODES.includes(mode)) throw httpError(400, "Bad permission override.");
    config.permissions.actions[action].mode = mode;
    applied.push(`${action}: ${mode}`);
  }
  const jobUrgency = {};
  for (const [jobId, tier] of Object.entries(overrides.jobUrgency ?? {})) {
    if (!config.urgency.tiers[tier] || !state.jobs.some((j) => j.id === jobId)) throw httpError(400, "Bad urgency override.");
    jobUrgency[jobId] = tier;
    applied.push(`${jobId} urgency: ${tier}`);
  }
  if (overrides.inject) applied.push("injected unsafe first proposal (test)");
  return { config, jobUrgency, applied };
}

function publicPending(p) {
  if (!p) return null;
  const { ctx, jobsBefore, fixedMoves, ...rest } = p;
  return rest;
}

async function snapshot() {
  const config = await loadConfig();
  const trades = {};
  for (const [type, rule] of Object.entries(config.qualifications.job_types)) trades[type] = rule.required_skills.includes("HVAC") ? "hvac" : "plumbing";
  return {
    busy,
    agent: agentInfo,
    business: world.business,
    technicians: state.technicians,
    jobs: state.jobs,
    customers: Object.fromEntries(world.customers.map((c) => [c.id, c.name])),
    trades,
    profile: goal,
    profiles: Object.entries(config.goals.profiles).map(([id, p]) => ({ id, description: p.description })),
    autonomy,
    modes: Object.fromEntries(Object.entries(config.permissions.actions).map(([k, v]) => [k, v.mode])),
    pending: publicPending(pending),
    canUndo: history.length > 0,
    lastApplied: history.at(-1)?.ids ?? [],
    log,
  };
}

// Applies moves to the schedule and records them under one history entry per plan, so one undo reverses the whole plan.
function applyBatch(planId, moves) {
  if (!moves.length) return;
  let entry = history.find((e) => e.id === planId);
  if (!entry) {
    entry = { id: planId, before: [], ids: [], notices: [] };
    history.push(entry);
  }
  const wasWith = new Map(state.jobs.map((j) => [j.id, j.assigned_to]));
  entry.before.push(...applyMoves(state, moves));
  entry.ids.push(...moves.map((m) => m.job_id));
  for (const move of moves) {
    if (move.kind === "hand_off" || move.kind === "delay" || move.assigned_to === wasWith.get(move.job_id)) continue;
    const job = state.jobs.find((j) => j.id === move.job_id);
    const tech = state.technicians.find((t) => t.id === move.assigned_to);
    const customer = world.customers.find((c) => c.id === job.customer_id)?.name ?? "the customer";
    const notice = { job_id: job.id, text: `Update sent to ${customer} about ${job.id}: ${tech.name} is now your technician (simulated message).` };
    entry.notices.push(notice);
    if (pending?.id === planId) pending.notices.push(notice);
    addLog("notification", notice.text, { plan: planId });
  }
}

const remainder = (proposal) => subProposal(proposal, pending.split.approval);

// A recorded proposal is checked again against the live schedule, so the safety checks are never replayed from a file.
function replayResult(recorded, ctx) {
  const { proposal, attempts, seconds, tokens } = recorded.result;
  return { proposal, check: checkPlan(proposal, ctx), attempts, seconds, tokens, error: null };
}

// The plan's impact is measured against the schedule as it stood before the plan was applied.
const impactContext = (p) => ({ jobs: p.jobsBefore, technicians: p.ctx.technicians, business: world.business, callOut: p.callOut });

function recheck(proposal) {
  pending.ctx.jobs = state.jobs;
  const check = checkPlan(remainder(proposal), pending.ctx, { partial: true });
  pending.proposal = proposal;
  pending.check = { ok: check.ok, errors: check.errors, moves: check.moves ?? [], classification: check.classification };
  if (check.ok && pending.jobsBefore) pending.impact = planImpact([...pending.fixedMoves, ...check.moves], impactContext(pending));
  return check;
}

const handlers = {
  async "/api/propose"(body) {
    if (busy) throw httpError(409, "The agent is already working on a call-out.");
    const scenarioKey = body.scenario === undefined ? null : String(body.scenario);
    if (scenarioKey !== null && !validKey(scenarioKey)) throw httpError(400, "Bad scenario id.");
    const recorded = REPLAY ? await loadRecording(scenarioKey) : null;
    if (REPLAY && !recorded) throw httpError(409, `Replay mode has no recording for ${scenarioKey ?? "a custom report"}. Choose a recorded scenario, or start the server without REPLAY=1.`);
    const tech = state.technicians.find((t) => t.id === body.technician_id);
    if (!tech) throw httpError(400, "Unknown technician.");
    if (tech.status === "out") throw httpError(409, `${tech.name} has already called out.`);
    if (body.until && !/^([01]\d|2[0-3]):[0-5]\d$/.test(body.until)) throw httpError(400, "Bad until time.");
    const note = String(body.note ?? "").slice(0, 500);
    busy = true;
    try {
      const { config, jobUrgency, applied } = await effectiveConfig(body.overrides ?? {});
      tech.status = "out";
      tech.free_at = null;
      const callOut = {
        technician_id: tech.id,
        from: world.business.now,
        until: body.until || null,
        duration: body.until ? `until ${body.until}` : "rest of the day",
        note,
      };
      const ctx = { business: world.business, technicians: state.technicians, jobs: state.jobs, customers: world.customers, config, jobUrgency, callOut };
      addLog("call-out", `${tech.name} called out ${body.until ? `until ${body.until}` : "for the rest of the day"}.${note ? ` Note: ${note}` : ""}`, { overrides: applied });
      const result = recorded ? replayResult(recorded, ctx) : await propose(ctx, { inject: Boolean(body.overrides?.inject) });
      if (RECORD && !recorded && scenarioKey && result.proposal && result.check?.ok) {
        await saveRecording(scenarioKey, {
          scenario: scenarioKey,
          recorded_at: new Date().toISOString(),
          model: `${agentInfo.provider}/${agentInfo.model}`,
          thinking: agentInfo.thinking,
          priority: config.goals.active_profile,
          result: { proposal: result.proposal, attempts: result.attempts, seconds: result.seconds, tokens: result.tokens },
        });
      }
      pending = {
        id: `plan-${++counter}`,
        ctx,
        callOut,
        overrides: applied,
        proposal: result.proposal,
        original: result.proposal ? clone(result.proposal) : null,
        check: result.check ? { ok: result.check.ok, errors: result.check.errors, moves: result.check.moves ?? [], classification: result.check.classification } : null,
        split: { auto: [], approval: [], handoff: [] },
        notices: [],
        attempts: result.attempts,
        seconds: result.seconds,
        tokens: result.tokens,
        inputs: compactContext(ctx),
        status: "proposed",
        handoffReason: null,
        replay: recorded ? { recorded_at: recorded.recorded_at, model: recorded.model, priority: recorded.priority } : null,
      };
      addLog("proposal", `The agent proposed ${planName(pending.id)} in ${Math.round(result.seconds)} seconds${result.attempts.length > 1 ? " after a second attempt" : ""}.`, { plan: pending.id, tokens: result.tokens });
      if (!result.check?.ok) {
        pending.status = "handoff";
        pending.handoffReason = result.error ?? `The plan failed ${result.check?.errors.length ?? 0} safety check(s) after one retry.`;
        addLog("handoff", `Handed off to the dispatcher: ${pending.handoffReason}`, { plan: pending.id });
        return snapshot();
      }

      // Simple reassignments run on their own; everything else waits for the dispatcher (decision 0014).
      const { classification: cls, moves } = result.check;
      let autoMoves = moves.filter((m) => m.kind !== "hand_off" && cls.autoIds.includes(m.job_id));
      if (autoMoves.length) {
        const alone = checkPlan(subProposal(result.proposal, autoMoves.map((m) => m.job_id)), ctx, { partial: true });
        if (!alone.ok) autoMoves = [];
      }
      const handoffMoves = moves.filter((m) => m.kind === "hand_off");
      const approvalMoves = moves.filter((m) => m.kind !== "hand_off" && !autoMoves.includes(m));
      pending.split = { auto: autoMoves.map((m) => m.job_id), approval: approvalMoves.map((m) => m.job_id), handoff: handoffMoves.map((m) => m.job_id) };
      pending.check = { ok: true, errors: [], moves: approvalMoves, classification: cls };
      pending.jobsBefore = clone(state.jobs);
      pending.fixedMoves = [...handoffMoves, ...autoMoves];
      pending.impact = planImpact([...pending.fixedMoves, ...approvalMoves], impactContext(pending));
      applyBatch(pending.id, [...handoffMoves, ...autoMoves]);
      if (autoMoves.length) addLog("auto-applied", `${planName(pending.id)} applied ${[...new Set(autoMoves.map((m) => m.job_id))].join(", ")} automatically (autonomy setting: ${autonomy}).`, { plan: pending.id });
      if (approvalMoves.length) {
        addLog("waiting", `${planName(pending.id)} is waiting for your approval: ${[...new Set(approvalMoves.map((m) => m.job_id))].join(", ")}.`, { plan: pending.id });
      } else if (autoMoves.length) {
        pending.status = "applied";
        pending.appliedHow = "auto";
      } else {
        pending.status = "handoff";
        pending.handoffReason = "The agent handed every job back to the dispatcher.";
        addLog("handoff", pending.handoffReason, { plan: pending.id });
      }
      return snapshot();
    } finally {
      busy = false;
    }
  },

  async "/api/choose"(body) {
    if (!pending || pending.status !== "proposed") throw httpError(409, "There is no proposal to edit.");
    if (!pending.split.approval.includes(body.job_id)) throw httpError(409, "Only changes waiting for approval can be switched.");
    const job = pending.proposal.jobs.find((j) => j.job_id === body.job_id);
    const alt = job?.alternatives?.[body.alt_index];
    if (!alt) throw httpError(400, "Unknown alternative.");
    const edited = clone(pending.proposal);
    Object.assign(edited.jobs.find((j) => j.job_id === body.job_id), {
      outcome: alt.outcome,
      technician_id: alt.technician_id ?? null,
      new_start: alt.new_start ?? null,
      new_end: alt.new_end ?? null,
      handoff_reason: alt.outcome === "hand_off" ? alt.tradeoff : null,
      rationale: `You chose this alternative. Tradeoff: ${alt.tradeoff}`,
    });
    // Prefer the smaller change: drop side effects if the edited plan is valid without them.
    const bare = recheck({ ...edited, side_effects: [] });
    if (!bare.ok) recheck(edited);
    addLog("edit", `You chose an alternative for ${body.job_id}: ${alt.tradeoff}`, { plan: pending.id, valid: pending.check.ok });
    return snapshot();
  },

  async "/api/restore"() {
    if (!pending || pending.status !== "proposed" || !pending.original) throw httpError(409, "Nothing to restore.");
    recheck(clone(pending.original));
    addLog("edit", "You restored the agent's original plan.", { plan: pending.id });
    return snapshot();
  },

  async "/api/approve"() {
    if (!pending || pending.status !== "proposed") throw httpError(409, "There is nothing waiting for approval.");
    const check = recheck(pending.proposal);
    if (!check.ok) throw httpError(409, `The plan no longer passes the safety checks: ${check.errors[0].message}`);
    applyBatch(pending.id, check.moves);
    pending.status = "applied";
    pending.appliedHow = "approved";
    addLog("approved", `You approved ${planName(pending.id)}: ${check.moves.length} change${check.moves.length === 1 ? "" : "s"} applied.`, { plan: pending.id });
    return snapshot();
  },

  async "/api/reject"() {
    if (!pending || pending.status !== "proposed") throw httpError(409, "There is nothing to reject.");
    pending.status = "rejected";
    const kept = pending.split.auto.length > 0;
    addLog("rejected", `You rejected the changes waiting in ${planName(pending.id)}.${kept ? " The automatic reassignments stay in place; use Undo to reverse them." : " The schedule is unchanged."}`, { plan: pending.id });
    return snapshot();
  },

  async "/api/undo"() {
    const last = history.pop();
    if (!last) throw httpError(409, "Nothing to undo.");
    undoMoves(state, last.before.slice().reverse());
    if (pending?.id === last.id) pending.status = "undone";
    addLog("undo", `You undid ${planName(last.id)}. The schedule is back to how it was.${last.notices.length ? " Customers who were told about a new technician are sent a correction (simulated)." : ""}`, { plan: last.id });
    return snapshot();
  },

  async "/api/settings"(body) {
    if (busy) throw httpError(409, "The agent is working; try again when it finishes.");
    const changes = [];
    if (body.autonomy !== undefined) {
      if (!AUTONOMY_LEVELS.includes(body.autonomy)) throw httpError(400, "Unknown autonomy level.");
      autonomy = body.autonomy;
      changes.push(`agent autonomy to \"${autonomy}\"`);
    }
    if (body.priority !== undefined) {
      const { goals } = await loadConfig();
      if (!goals.profiles[body.priority]) throw httpError(400, "Unknown scheduling priority.");
      goal = body.priority;
      changes.push(`scheduling priority to \"${goal}\"`);
    }
    if (!changes.length) throw httpError(400, "No setting to change.");
    addLog("settings", `Settings changed: ${changes.join(" and ")}. It applies to the next call-out.`);
    return snapshot();
  },

  async "/api/reset"() {
    if (busy) throw httpError(409, "The agent is working; try again when it finishes.");
    await resetDay();
    return snapshot();
  },
};

function sendJson(res, status, data) {
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" });
  res.end(JSON.stringify(data));
}

async function readJson(req) {
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > 100_000) throw httpError(413, "Request too large.");
    chunks.push(chunk);
  }
  const text = Buffer.concat(chunks).toString("utf8");
  return text ? JSON.parse(text) : {};
}

// Blocks other web pages from driving this local server: JSON content type forces a CORS preflight, which we never allow.
function guard(req) {
  const origin = req.headers.origin;
  if (origin && origin !== `http://127.0.0.1:${PORT}` && origin !== `http://localhost:${PORT}`) throw httpError(403, "Forbidden origin.");
  if (!String(req.headers["content-type"] ?? "").startsWith("application/json")) throw httpError(415, "Use application/json.");
}

const server = createServer(async (req, res) => {
  try {
    const path = new URL(req.url, `http://${req.headers.host}`).pathname;
    if (req.method === "GET" && STATIC[path]) {
      const [file, type] = STATIC[path];
      res.writeHead(200, { "Content-Type": type, "Cache-Control": "no-store" });
      res.end(await readFile(new URL(file, import.meta.url)));
    } else if (req.method === "GET" && path === "/api/state") {
      sendJson(res, 200, await snapshot());
    } else if (req.method === "GET" && path === "/api/scenarios") {
      sendJson(res, 200, await loadScenarios());
    } else if (req.method === "POST" && handlers[path]) {
      guard(req);
      sendJson(res, 200, await handlers[path](await readJson(req)));
    } else {
      sendJson(res, 404, { error: "Not found." });
    }
  } catch (err) {
    if (!err.status) console.error(err);
    sendJson(res, err.status ?? 500, { error: err.status ? err.message : "Internal error. See the server console." });
  }
});

agentInfo = REPLAY ? { provider: "replay", model: "recorded runs", thinking: "n/a" } : await initAgent();
goal = (await loadConfig()).goals.active_profile;
await resetDay();
server.listen(PORT, "127.0.0.1", () => {
  console.log(`Scheduling agent prototype at http://127.0.0.1:${PORT} using ${agentInfo.provider}/${agentInfo.model} (thinking: ${agentInfo.thinking})`);
});
