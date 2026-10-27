// version: 0.1.4
// tags: [prototype, agent, pi, prompt, tokens]

import {
  createAgentSession,
  DefaultResourceLoader,
  getAgentDir,
  ModelRuntime,
  SessionManager,
} from "@earendil-works/pi-coding-agent";
import { checkPlan } from "./plan.mjs";
import { travelMinutes } from "./validator.mjs";

const PROVIDER = process.env.PI_PROVIDER ?? "github-copilot";
const MODEL_ID = process.env.PI_MODEL ?? "claude-haiku-5.5";
const THINKING = process.env.PI_THINKING ?? "low";

let runtime = null;

export async function initAgent() {
  const cwd = process.cwd();
  const agentDir = getAgentDir();
  const modelRuntime = await ModelRuntime.create();
  const model = modelRuntime.getModel(PROVIDER, MODEL_ID);
  if (!model) throw new Error(`Model ${PROVIDER}/${MODEL_ID} not found. Run: pi --list-models`);
  const resourceLoader = new DefaultResourceLoader({
    cwd,
    agentDir,
    noExtensions: true,
    noSkills: true,
    noPromptTemplates: true,
    noThemes: true,
    noContextFiles: true,
    systemPrompt: "You are a careful scheduling assistant. Reply with a single JSON object only.",
  });
  await resourceLoader.reload();
  runtime = { cwd, agentDir, modelRuntime, model, resourceLoader };
  return { provider: PROVIDER, model: MODEL_ID, thinking: THINKING };
}

async function newSession() {
  const { cwd, agentDir, modelRuntime, model, resourceLoader } = runtime;
  const { session } = await createAgentSession({
    cwd,
    agentDir,
    modelRuntime,
    model,
    thinkingLevel: THINKING,
    noTools: "all",
    resourceLoader,
    sessionManager: SessionManager.inMemory(cwd),
  });
  return session;
}

// Only what the model needs, as compact JSON: this is where prompt tokens are saved (decision 0013).
export function compactContext(ctx) {
  const { business, technicians, jobs, customers, config, callOut } = ctx;
  const live = jobs.filter((j) => j.status !== "completed");
  const notes = new Map(customers.filter((c) => c.notes).map((c) => [c.id, c.notes]));
  const types = new Set(live.map((j) => j.type));
  const profileName = config.goals.active_profile;

  const places = {};
  for (const t of technicians) places[t.id] = t.current_location;
  for (const j of live) places[j.id] = j.address;
  const travel = {};
  for (const [from, loc] of Object.entries(places)) {
    travel[from] = {};
    for (const j of live.filter((x) => x.status === "scheduled")) {
      if (j.id !== from) travel[from][j.id] = travelMinutes(loc, j.address, business.minutes_per_mile);
    }
  }

  return {
    now: business.now,
    workday_end: business.workday.end,
    call_out: callOut,
    technicians: technicians.map((t) => ({ id: t.id, name: t.name, skills: t.skills, status: t.status, at: t.current_location.label, free_at: t.free_at })),
    jobs: live.map((j) => ({
      id: j.id,
      type: j.type,
      tech: j.assigned_to,
      start: j.start,
      end: j.end,
      usd: j.value_usd,
      at: j.address.label,
      status: j.status,
      urgency: ctx.jobUrgency?.[j.id],
      note: notes.get(j.customer_id),
    })),
    travel_minutes: travel,
    goals: {
      active_profile: profileName,
      ...config.goals.profiles[profileName],
      criteria: Object.fromEntries(
        [...config.goals.profiles[profileName].job_priority, ...config.goals.profiles[profileName].technician_ranking].map((c) => [c, config.goals.criteria?.[c]]),
      ),
    },
    qualifications: {
      job_types: Object.fromEntries([...types].map((t) => [t, config.qualifications.job_types[t]])),
      overrides: config.qualifications.technician_overrides,
    },
    urgency_tiers: config.urgency.tiers,
    permissions: Object.fromEntries(Object.entries(config.permissions.actions).map(([k, v]) => [k, v.mode])),
    handoff_min_confidence: config.permissions.handoff.min_confidence,
  };
}

const SCHEMA = `{"summary":"1-2 sentences","overall_confidence":0.0,"assumptions":["..."],"side_effects":[{"job_id":"J1","technician_id":"T1","new_start":"HH:MM","new_end":"HH:MM","reason":"..."}],"jobs":[{"job_id":"J1","outcome":"reassign|delay|hand_off","technician_id":"T1|null","new_start":"HH:MM|null","new_end":"HH:MM|null","rationale":"...","confidence":0.0,"handoff_reason":"string|null","alternatives":[{"outcome":"reassign|delay|hand_off","technician_id":"T1|null","new_start":"HH:MM|null","new_end":"HH:MM|null","tradeoff":"..."}]}]}`;

export function buildPrompt(ctx) {
  return `You propose how to cover a same-day technician call-out. A human dispatcher approves; you do not act. Think carefully, then reply with JSON only.

Reason with judgment:
1. Find every job that loses its technician because of the call-out (call_out.note may add context; state any assumption you make).
2. Only technicians whose skills cover the job type's required_skills (or an override) may take it.
3. Check availability and travel: the slot must be free, plus the travel_minutes from where the technician will be (a job id as the origin means after finishing that job). No overlaps; finish by workday_end.
4. Among qualified, available technicians, choose using the active goals profile: job_priority says which jobs to cover first; technician_ranking is applied in order (the first criterion decides, the next ones break ties); goals.criteria explains each term. Name the deciding criterion in each job's rationale.
5. If no qualified technician is free in time, consider "delay" (later start, same duration) with a qualified technician who frees up, within the job's urgency limit (urgency_tiers). Otherwise "hand_off" with a reason.
6. "reassign" = new technician, same slot. "delay" = new technician, later slot. "hand_off" = no change.
7. If your plan makes another job move, list it under side_effects with the technician who will do it. Otherwise leave side_effects empty.
8. Prefer a reassignment over a delay when it serves the goal equally well: it disrupts the customer less. The permissions field shows which changes the dispatcher must approve.
9. Be concise: rationale at most 2 sentences, at most 3 assumptions, at most 1 alternative per job (omit if none is meaningful) with its tradeoff (delay, revenue or job at risk).
10. Give confidence from 0 to 1; lower it when an assumption matters.

Reply with exactly this JSON shape and nothing else:
${SCHEMA}

Data:
${JSON.stringify(compactContext(ctx))}`;
}

// A deliberately bad first attempt used to demonstrate the validator; always labelled as injected in the UI.
export function injectedBadProposal(ctx) {
  const affected = ctx.jobs.filter((j) => j.assigned_to === ctx.callOut.technician_id && j.status === "scheduled");
  return {
    summary: "INJECTED TEST PROPOSAL: gives every job to the nearest idle technician.",
    overall_confidence: 0.9,
    assumptions: ["This proposal was injected to test the validator."],
    side_effects: [],
    jobs: affected.map((j) => ({
      job_id: j.id,
      outcome: "reassign",
      technician_id: "T8",
      new_start: j.start,
      new_end: j.end,
      rationale: "Injected: closest idle technician.",
      confidence: 0.9,
      handoff_reason: null,
      alternatives: [],
    })),
  };
}

const stripFences = (text) => text.replace(/^```(?:json)?\s*|\s*```$/g, "").trim();

// One model call, one retry after a validation failure (same session, so context is reused).
export async function propose(ctx, { inject = false } = {}) {
  const started = Date.now();
  const attempts = [];
  let proposal = null;
  let check = null;
  let error = null;
  let session = null;
  let tokens = null;
  try {
    session = await newSession();
    let message = buildPrompt(ctx);
    for (let n = 1; n <= 2; n++) {
      const injected = inject && n === 1;
      let text;
      if (injected) {
        text = JSON.stringify(injectedBadProposal(ctx));
      } else {
        await session.prompt(message);
        text = session.getLastAssistantText() ?? "";
      }
      if (!text.trim()) {
        error = "The model returned an empty response.";
        attempts.push({ n, injected: false, errors: [{ code: "empty", message: error }] });
        message = "Your last reply was empty. Reply with the JSON object only.";
        continue;
      }
      let parsed;
      try {
        parsed = JSON.parse(stripFences(text));
      } catch {
        error = "The model reply was not valid JSON.";
        attempts.push({ n, injected: false, errors: [{ code: "json", message: error }] });
        message = "Your last reply was not valid JSON. Reply with the JSON object only.";
        continue;
      }
      error = null;
      proposal = parsed;
      check = checkPlan(parsed, ctx);
      attempts.push({ n, injected: Boolean(injected), errors: check.errors });
      if (check.ok) break;
      const problems = check.errors.map((e) => `- ${e.message}`).join("\n");
      message = injected
        ? `${buildPrompt(ctx)}\n\nA first plan failed these checks. Produce a correct plan:\n${problems}`
        : `Your plan failed these checks:\n${problems}\nReturn the corrected full JSON object only.`;
    }
  } catch (err) {
    error = `The model call failed: ${err.message}`;
  } finally {
    if (session) {
      try {
        tokens = session.getSessionStats().tokens;
      } catch {
        tokens = null;
      }
      session.dispose();
    }
  }
  return { proposal, check, attempts, error: check?.ok ? null : error, seconds: Number(((Date.now() - started) / 1000).toFixed(1)), tokens };
}
