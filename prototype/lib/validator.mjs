// version: 0.1.1
// tags: [prototype, validator, guarantees]

// The only hard rules in the system. The model proposes; this decides whether a proposal is safe to show or apply.

export const toMin = (hhmm) => {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
};
export const toHHMM = (min) => `${String(Math.floor(min / 60)).padStart(2, "0")}:${String(min % 60).padStart(2, "0")}`;
const HHMM = /^([01]\d|2[0-3]):[0-5]\d$/;

export const travelMinutes = (a, b, perMile) => Math.round(Math.hypot(a.x - b.x, a.y - b.y) * perMile);

export function qualified(tech, job, qualifications) {
  const rule = qualifications.job_types[job.type];
  if (!rule) return false;
  const overrides = qualifications.technician_overrides?.[tech.id];
  if (overrides?.block?.includes(job.type)) return false;
  if (overrides?.allow?.includes(job.type)) return true;
  return rule.required_skills.every((skill) => tech.skills.includes(skill));
}

export function urgencyTier(job, ctx) {
  return ctx.jobUrgency?.[job.id] ?? ctx.config.qualifications.job_types[job.type]?.urgency;
}

// null in the config means "any time until the end of the working day".
export function urgencyLimit(job, ctx) {
  const limit = ctx.config.urgency.tiers[urgencyTier(job, ctx)]?.max_delay_minutes;
  if (limit === null) return Infinity;
  return limit ?? 0;
}

export function affectedJobs(ctx) {
  const now = toMin(ctx.callOut.from);
  const until = ctx.callOut.until ? toMin(ctx.callOut.until) : Infinity;
  return ctx.jobs.filter(
    (job) =>
      job.assigned_to === ctx.callOut.technician_id &&
      job.status !== "completed" &&
      toMin(job.end) > now &&
      toMin(job.start) < until,
  );
}

// opts.partial skips the "every affected job needs an outcome" check, to validate part of a plan on its own.
export function validate(proposal, ctx, opts = {}) {
  const errors = [];
  const moves = [];
  const fail = (code, message, job_id = null) => errors.push({ code, message, job_id });
  const { jobs, technicians, business, callOut } = ctx;
  const techs = new Map(technicians.map((t) => [t.id, t]));
  const byId = new Map(jobs.map((j) => [j.id, j]));
  const dayStart = toMin(business.workday.start);
  const dayEnd = toMin(business.workday.end);
  const now = toMin(callOut.from);

  if (!proposal || typeof proposal !== "object" || !Array.isArray(proposal.jobs)) {
    fail("schema", "The response must be an object with a jobs array.");
    return { ok: false, errors, moves };
  }
  if (typeof proposal.overall_confidence !== "number" || proposal.overall_confidence < 0 || proposal.overall_confidence > 1) {
    fail("schema", "overall_confidence must be a number from 0 to 1.");
  }

  // Checks one placement: who, when, how long. Returns true when no error was added.
  const place = (job, techId, start, end) => {
    const before = errors.length;
    const tech = techs.get(techId);
    if (!tech) {
      fail("unknown_technician", `${job.id}: technician ${techId} does not exist.`, job.id);
    } else {
      if (tech.id === callOut.technician_id) fail("absent_technician", `${job.id}: ${tech.name} is the technician who called out.`, job.id);
      if (!qualified(tech, job, ctx.config.qualifications)) fail("unqualified", `${job.id}: ${tech.name} is not qualified for ${job.type}.`, job.id);
    }
    if (!HHMM.test(start ?? "") || !HHMM.test(end ?? "")) {
      fail("time_format", `${job.id}: times must be HH:MM.`, job.id);
    } else {
      const s = toMin(start);
      const e = toMin(end);
      const duration = toMin(job.end) - toMin(job.start);
      if (e - s !== duration) fail("duration", `${job.id}: the job lasts ${duration} minutes but the slot is ${e - s}.`, job.id);
      if (s < dayStart || e > dayEnd) fail("workday", `${job.id}: ${start}-${end} is outside the workday ${business.workday.start}-${business.workday.end}.`, job.id);
      if (s < now) fail("in_the_past", `${job.id}: ${start} is before the current time ${callOut.from}.`, job.id);
    }
    return errors.length === before;
  };

  const affected = affectedJobs(ctx);
  const affectedIds = new Set(affected.map((j) => j.id));
  const seen = new Set();

  for (const p of proposal.jobs) {
    const job = byId.get(p?.job_id);
    if (!job) {
      fail("unknown_job", `Job ${p?.job_id} does not exist.`);
      continue;
    }
    if (!affectedIds.has(job.id)) {
      fail("not_affected", `${job.id} is not affected by this call-out; if it must move, list it under side_effects.`, job.id);
      continue;
    }
    if (seen.has(job.id)) {
      fail("duplicate", `${job.id} appears more than once.`, job.id);
      continue;
    }
    seen.add(job.id);
    if (!["reassign", "delay", "hand_off"].includes(p.outcome)) {
      fail("outcome", `${job.id}: outcome must be reassign, delay, or hand_off.`, job.id);
      continue;
    }
    if (typeof p.rationale !== "string" || !p.rationale.trim()) fail("rationale", `${job.id}: a rationale is required.`, job.id);
    if (typeof p.confidence !== "number" || p.confidence < 0 || p.confidence > 1) fail("confidence", `${job.id}: confidence must be 0 to 1.`, job.id);

    if (p.outcome === "hand_off") {
      if (typeof p.handoff_reason !== "string" || !p.handoff_reason.trim()) fail("handoff_reason", `${job.id}: a handoff needs a reason.`, job.id);
      moves.push({ job_id: job.id, kind: "hand_off" });
      continue;
    }

    const start = p.outcome === "reassign" ? (p.new_start ?? job.start) : p.new_start;
    const end = p.outcome === "reassign" ? (p.new_end ?? job.end) : p.new_end;
    if (p.outcome === "reassign" && (start !== job.start || end !== job.end)) {
      fail("reassign_time", `${job.id}: a reassign keeps the slot ${job.start}-${job.end}; use delay to change the time.`, job.id);
    }
    if (p.outcome === "delay" && HHMM.test(start ?? "")) {
      const delay = toMin(start) - toMin(job.start);
      const limit = urgencyLimit(job, ctx);
      if (delay <= 0) fail("delay_not_later", `${job.id}: a delay must start later than ${job.start}.`, job.id);
      else if (delay > limit) fail("urgency", `${job.id}: a ${delay}-minute delay exceeds the ${limit}-minute limit for its urgency (${urgencyTier(job, ctx)}).`, job.id);
    }
    if (place(job, p.technician_id, start, end)) moves.push({ job_id: job.id, kind: p.outcome, assigned_to: p.technician_id, start, end });
  }

  if (!opts.partial) {
    for (const job of affected) {
      if (!seen.has(job.id)) fail("missing", `${job.id} is affected by the call-out but has no outcome.`, job.id);
    }
  }

  for (const s of proposal.side_effects ?? []) {
    const job = byId.get(s?.job_id);
    if (!job || job.status !== "scheduled") {
      fail("side_effect_job", `Side effect ${s?.job_id}: only an existing scheduled job can move.`);
      continue;
    }
    if (affectedIds.has(job.id)) {
      fail("side_effect_affected", `${job.id} belongs under jobs, not side_effects.`, job.id);
      continue;
    }
    const techId = s.technician_id ?? job.assigned_to;
    if (place(job, techId, s.new_start, s.new_end)) moves.push({ job_id: job.id, kind: "side_effect", assigned_to: techId, start: s.new_start, end: s.new_end });
  }

  // Build the resulting schedule and check every changed job against its neighbours.
  const changed = new Set(moves.filter((m) => m.kind !== "hand_off").map((m) => m.job_id));
  const handedOff = new Set(moves.filter((m) => m.kind === "hand_off").map((m) => m.job_id));
  const schedule = jobs
    .filter((j) => j.status !== "completed" && !handedOff.has(j.id) && j.assigned_to !== callOut.technician_id)
    .map((j) => ({ id: j.id, tech: j.assigned_to, start: toMin(j.start), end: toMin(j.end), loc: j.address }));
  for (const m of moves.filter((x) => x.kind !== "hand_off")) {
    const j = byId.get(m.job_id);
    schedule.push({ id: j.id, tech: m.assigned_to, start: toMin(m.start), end: toMin(m.end), loc: j.address });
  }
  const dedup = new Map(schedule.map((s) => [s.id, s]));
  // A moved job replaces its original entry; later entries win.
  const byTech = new Map();
  for (const s of dedup.values()) byTech.set(s.tech, [...(byTech.get(s.tech) ?? []), s]);

  for (const [techId, list] of byTech) {
    const tech = techs.get(techId);
    if (!tech) continue;
    list.sort((a, b) => a.start - b.start);
    const first = list[0];
    if (tech.status === "idle" && changed.has(first.id)) {
      const need = travelMinutes(tech.current_location, first.loc, business.minutes_per_mile);
      if (first.start < now + need) fail("travel", `${tech.name} is at ${tech.current_location.label} and needs ${need} minutes to reach ${first.id}, so the earliest start is ${toHHMM(now + need)}.`, first.id);
    }
    for (let i = 0; i + 1 < list.length; i++) {
      const a = list[i];
      const b = list[i + 1];
      if (!changed.has(a.id) && !changed.has(b.id)) continue;
      const gap = b.start - a.end;
      const need = travelMinutes(a.loc, b.loc, business.minutes_per_mile);
      if (gap < 0) fail("overlap", `${tech.name}: ${a.id} (${toHHMM(a.start)}-${toHHMM(a.end)}) overlaps ${b.id} (${toHHMM(b.start)}-${toHHMM(b.end)}).`, b.id);
      else if (gap < need) fail("travel", `${tech.name}: only ${gap} minutes between ${a.id} and ${b.id} but the drive takes ${need}.`, b.id);
    }
  }

  return { ok: errors.length === 0, errors, moves };
}
