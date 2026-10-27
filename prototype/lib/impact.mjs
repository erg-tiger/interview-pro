// version: 0.1.0
// tags: [prototype, impact, metrics, deterministic]

import { toMin, travelMinutes } from "./validator.mjs";

// Deterministic numbers for a proposed plan, so a goal profile's effect can be compared and not only argued.
// `moves` are validated moves; `jobs` must be the schedule from before the plan was applied.
export function planImpact(moves, { jobs, technicians, business, callOut }) {
  const byId = new Map(jobs.map((j) => [j.id, j]));
  const techs = new Map(technicians.map((t) => [t.id, t]));
  const handedOff = new Set(moves.filter((m) => m.kind === "hand_off").map((m) => m.job_id));
  const moved = new Map(moves.filter((m) => m.kind !== "hand_off").map((m) => [m.job_id, m]));

  // The day as it would stand after the plan, per technician.
  const byTech = new Map();
  for (const job of jobs) {
    const move = moved.get(job.id);
    if (job.status === "completed" || handedOff.has(job.id)) continue;
    if (!move && job.assigned_to === callOut.technician_id) continue;
    const tech = move ? move.assigned_to : job.assigned_to;
    const start = toMin(move ? move.start : job.start);
    byTech.set(tech, [...(byTech.get(tech) ?? []), { id: job.id, start, loc: job.address }]);
  }

  let driveMinutes = 0;
  for (const [techId, list] of byTech) {
    list.sort((a, b) => a.start - b.start);
    list.forEach((entry, i) => {
      if (!moved.has(entry.id)) return;
      const origin = i > 0 ? list[i - 1].loc : techs.get(techId)?.current_location;
      if (origin) driveMinutes += travelMinutes(origin, entry.loc, business.minutes_per_mile);
    });
  }

  const sum = (ids) => ids.reduce((total, id) => total + (byId.get(id)?.value_usd ?? 0), 0);
  const covered = moves.filter((m) => m.kind === "reassign" || m.kind === "delay").map((m) => m.job_id);
  return { coveredUsd: sum(covered), atRiskUsd: sum([...handedOff]), handedOff: handedOff.size, moved: moved.size, driveMinutes };
}
