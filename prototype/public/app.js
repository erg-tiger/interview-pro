/*
version: 0.9.0
tags: [prototype, frontend, dispatcher, javascript, settings, goals, scenarios, impact, replay]
*/

// All text from the server and the model is inserted with textContent (never innerHTML).

// Demo scenarios come from config/scenarios.yaml through the server; each fills in a report and may change a setting for one run.
const CUSTOM_SCENARIO = { id: "none", label: "Custom report (no scenario)", description: "Enter your own report below.", technician_id: "T3", until: "", note: "", overrides: {} };
let SCENARIOS = [CUSTOM_SCENARIO];

const STATUS_LABELS = { idle: "Idle", on_job: "On job", out: "Out", scheduled: "Scheduled", in_progress: "In progress", completed: "Completed" };
const PLAN_STATUS = { applied: ["Applied", "ok"], proposed: ["Waiting for your approval", "warn"], handoff: ["Handed off to the dispatcher", "bad"], rejected: ["Rejected: remaining changes not made", ""], undone: ["Applied, then undone", ""] };

let snap = null;
let working = false;
let startedAt = 0;
let timer = null;
let lastError = "";
let confirmReset = false;
let logOpen = false;
let settingsOpen = false;
let form = { scenario: "none", technician_id: CUSTOM_SCENARIO.technician_id, until: "", note: "" };

const $ = (selector) => document.querySelector(selector);
const toMin = (hhmm) => {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
};

function h(tag, attrs = {}, ...kids) {
  const el = document.createElement(tag);
  for (const [key, value] of Object.entries(attrs)) {
    if (key === "class") el.className = value;
    else if (key.startsWith("on")) el.addEventListener(key.slice(2), value);
    else if (value !== false && value != null) el.setAttribute(key, value === true ? "" : value);
  }
  for (const kid of kids.flat()) el.append(kid instanceof Node ? kid : document.createTextNode(String(kid ?? "")));
  return el;
}

async function api(path, body) {
  const options = body === undefined ? {} : { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) };
  const res = await fetch(path, options);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? res.statusText);
  return data;
}

async function act(path, body = {}) {
  lastError = "";
  try {
    snap = await api(path, body);
  } catch (err) {
    lastError = err.message;
  }
  render();
}

async function runCallOut() {
  const scenario = SCENARIOS.find((s) => s.id === form.scenario);
  lastError = "";
  working = true;
  startedAt = Date.now();
  render();
  timer = setInterval(renderProposal, 500);
  try {
    snap = await api("/api/propose", { technician_id: form.technician_id, until: form.until || undefined, note: form.note, overrides: scenario.overrides, scenario: scenario.id === "none" ? undefined : scenario.id });
  } catch (err) {
    lastError = err.message;
  } finally {
    working = false;
    clearInterval(timer);
    render();
  }
}

const techName = (id) => snap.technicians.find((t) => t.id === id)?.name ?? id ?? "Nobody";
const slotText = (start, end) => (start && end ? `${start}-${end}` : (start ?? ""));
const planLabel = (id) => id.replace("plan-", "Plan ");
const tokenText = (t) => (t ? `${t.input + t.cacheRead + t.cacheWrite} in (${t.cacheRead} read from cache, ${t.cacheWrite} written to cache), ${t.output} out` : "tokens unavailable");

function renderHeader() {
  $("#header").replaceChildren(
    h("h1", {}, "Same-day scheduling agent"),
    h("span", { class: "meta" }, `${snap.business.name} | ${snap.business.date} | Now ${snap.business.now}`),
    h("button", { class: "header-button", "aria-expanded": String(settingsOpen), onclick: () => { settingsOpen = !settingsOpen; renderHeader(); renderSettings(); } }, "Settings"),
  );
}

const AUTONOMY_OPTIONS = [
  ["never", "Never", "Every change waits for your approval, including simple reassignments."],
  ["recommended", "Recommended", "Moving a job to another qualified technician at the same time runs on its own, and the customer is updated. Delays and other schedule changes wait for your approval."],
  ["always", "Always", "No approvals required: every change that passes the safety checks is applied, and you can undo it. Plans the agent is unsure about, and cancelling a job, still go to you."],
];

// Labels for the goal profiles defined in config/goals.yaml; an unknown profile falls back to its description.
const PRIORITY_LABELS = {
  job_revenue: ["Job revenue", "Protect high-value and urgent jobs. Typical for plumbing and HVAC."],
  drive_distance: ["Drive time", "Minimize driving and keep routes intact. Typical for cleaning and pool."],
};

function renderSettings() {
  const panel = $("#settings");
  panel.hidden = !settingsOpen;
  if (!settingsOpen) return;
  const locked = working || snap.busy;
  panel.replaceChildren(
    h("h2", {}, "Settings"),
    h(
      "fieldset",
      { class: "autonomy", disabled: locked },
      h("legend", {}, "Agent autonomy: when can the agent change the schedule without your approval?"),
      ...AUTONOMY_OPTIONS.map(([value, label, text]) =>
        h(
          "label",
          { class: "autonomy-option" },
          h("input", { type: "radio", name: "autonomy", value, checked: snap.autonomy === value, onchange: () => act("/api/settings", { autonomy: value }) }),
          h("span", {}, h("strong", {}, label), h("span", { class: "muted" }, ` ${text}`)),
        ),
      ),
    ),
    h(
      "fieldset",
      { class: "autonomy", disabled: locked },
      h("legend", {}, "Scheduling priority: what should the agent optimize when it picks who covers a job?"),
      ...snap.profiles.map(({ id, description }) => {
        const [label, text] = PRIORITY_LABELS[id] ?? [id, description];
        return h(
          "label",
          { class: "autonomy-option" },
          h("input", { type: "radio", name: "priority", value: id, checked: snap.profile === id, onchange: () => act("/api/settings", { priority: id }) }),
          h("span", {}, h("strong", {}, label), h("span", { class: "muted" }, ` ${text}`)),
        );
      }),
    ),
    h("p", { class: "muted" }, "A change applies to the next call-out. Every automatic change is logged and can be undone."),
  );
}

function selectScenario(id) {
  const scenario = SCENARIOS.find((s) => s.id === id);
  Object.assign(form, { scenario: id, technician_id: scenario.technician_id, until: scenario.until, note: scenario.note });
  renderControls();
}

function renderControls() {
  const p = snap.pending;
  const scenario = SCENARIOS.find((s) => s.id === form.scenario);
  const chosen = snap.technicians.find((t) => t.id === form.technician_id);
  const alreadyOut = chosen?.status === "out";
  const blocked = working || snap.busy || p?.status === "proposed" || alreadyOut;
  const techSelect = h(
    "select",
    { onchange: (e) => { form.technician_id = e.target.value; renderControls(); } },
    ...snap.technicians.map((t) => h("option", { value: t.id, selected: t.id === form.technician_id, disabled: t.status === "out" }, `${t.name} (${t.skills.join(", ")})${t.status === "out" ? " - Called out" : ""}`)),
  );
  const untilSelect = h(
    "select",
    { onchange: (e) => (form.until = e.target.value) },
    h("option", { value: "", selected: form.until === "" }, "Rest of the day"),
    h("option", { value: "13:00", selected: form.until === "13:00" }, "Until 13:00"),
  );
  const scenarioSelect = h("select", { onchange: (e) => selectScenario(e.target.value) }, ...SCENARIOS.map((s) => h("option", { value: s.id, selected: s.id === form.scenario }, s.label)));
  const resetControl = confirmReset
    ? [
        h("span", { class: "muted" }, "Reset the whole day?"),
        h("button", { class: "danger", onclick: async () => { confirmReset = false; await act("/api/reset"); } }, "Yes, reset"),
        h("button", { class: "secondary", onclick: () => { confirmReset = false; renderControls(); } }, "Cancel"),
      ]
    : h("button", { class: "secondary", onclick: () => { confirmReset = true; renderControls(); }, disabled: working }, "Reset the day");
  $("#controls").replaceChildren(
    h(
      "div",
      { class: "demo" },
      h("span", { class: "demo-tag" }, "Demo only: not part of the product"),
      h("div", { class: "row" }, h("label", {}, "Test scenario", scenarioSelect), h("span", { class: "muted" }, `${scenario.description} Choosing a scenario fills in the report below.`)),
    ),
    h("h2", {}, "Report a technician call-out"),
    h(
      "div",
      { class: "row" },
      h("label", {}, "Technician", techSelect),
      h("label", {}, "Unavailable", untilSelect),
      h("label", {}, "Note (optional)", h("textarea", { oninput: (e) => (form.note = e.target.value) }, form.note)),
      h("button", { onclick: runCallOut, disabled: blocked }, "Ask the agent"),
      h("button", { class: "secondary", onclick: () => act("/api/undo"), disabled: !snap.canUndo || working, title: snap.canUndo ? "" : "Nothing has been applied yet" }, "Undo last applied plan"),
      resetControl,
    ),
    p?.status === "proposed" ? h("p", { class: "muted" }, "Approve or reject the current proposal before reporting another call-out.") : "",
    alreadyOut ? h("p", { class: "muted" }, `${chosen.name} has already called out today. Reset the day to run this report again.`) : "",
  );
}

function renderDay() {
  const { business, technicians, jobs, trades } = snap;
  const dayStart = toMin(business.workday.start);
  const dayEnd = toMin(business.workday.end);
  const pct = (m) => ((m - dayStart) / (dayEnd - dayStart)) * 100;
  const p = snap.pending;
  const proposed = p?.status === "proposed" && p.check?.ok;
  const ghosts = proposed ? p.check.moves.filter((m) => m.kind !== "hand_off") : [];
  const moving = new Set(ghosts.map((g) => g.job_id));
  const handoff = new Set(proposed ? p.check.moves.filter((m) => m.kind === "hand_off").map((m) => m.job_id) : []);
  const changed = new Set(snap.lastApplied);

  const block = (job, start, end, cls) =>
    h(
      "div",
      {
        class: `job ${trades[job.type] ?? "plumbing"} ${job.status} ${cls}`,
        style: `left:${pct(toMin(start))}%;width:${((toMin(end) - toMin(start)) / (dayEnd - dayStart)) * 100}%`,
        title: `${job.id} ${job.type}, ${start}-${end}, $${job.value_usd}, ${snap.customers[job.customer_id]}`,
      },
      h("strong", {}, job.id),
      h("span", {}, job.type),
    );

  const hours = [];
  for (let m = dayStart; m < dayEnd; m += 60) hours.push(h("span", {}, `${String(m / 60).padStart(2, "0")}:00`));

  const rows = technicians.map((t) => {
    const blocks = jobs
      .filter((j) => j.assigned_to === t.id)
      .map((j) => block(j, j.start, j.end, [moving.has(j.id) ? "moving" : "", handoff.has(j.id) || j.needs_dispatcher ? "handoff" : "", changed.has(j.id) ? "changed" : ""].join(" ")));
    const ghostBlocks = ghosts.filter((g) => g.assigned_to === t.id).map((g) => block(jobs.find((j) => j.id === g.job_id), g.start, g.end, "ghost"));
    const nowLine = h("div", { class: "now", style: `left:${pct(toMin(business.now))}%`, title: `Now ${business.now}` });
    return h(
      "div",
      { class: "line" },
      h("div", { class: "name" }, h("strong", {}, t.id), " ", t.status === "out" ? h("span", { class: "out" }, `${t.name} (Out)`) : t.name, h("small", {}, `${t.skills.join(", ")} | ${STATUS_LABELS[t.status] ?? t.status}`)),
      h("div", { class: "track" }, nowLine, ...blocks, ...ghostBlocks),
    );
  });

  $("#day").replaceChildren(
    h("h2", {}, "Day view"),
    h("div", { class: "days" }, h("div", { class: "grid" }, h("div", { class: "line" }, h("div", { class: "name" }), h("div", { class: "hours" }, ...hours)), ...rows)),
    h(
      "div",
      { class: "legend" },
      h("span", {}, h("i", { style: "background:#b6dcf7" }), "Plumbing"),
      h("span", {}, h("i", { style: "background:#f7d9a8" }), "HVAC"),
      h("span", {}, h("i", { style: "background:#e4e7eb" }), "Completed"),
      h("span", {}, "Striped: in progress"),
      h("span", {}, "Dashed outline: proposed move"),
      h("span", {}, "Green outline: just applied"),
      h("span", {}, "Red line: now"),
    ),
  );
}

// One filled highlight per row (the outcome). Approval need and confidence are plain text; alternatives get their own outlined flag.
function jobRow(p, pj) {
  const original = p.inputs.jobs.find((j) => j.id === pj.job_id);
  const isAuto = p.split.auto.includes(pj.job_id);
  const awaiting = p.status === "proposed" && p.split.approval.includes(pj.job_id);
  const where = pj.outcome === "hand_off" ? "Hand off to the dispatcher" : `${techName(pj.technician_id)}, ${slotText(pj.new_start ?? original.start, pj.new_end ?? original.end)}${pj.outcome === "delay" ? " (later)" : ""}`;
  let mode = "Not applied";
  if (pj.outcome === "hand_off") mode = "Needs your decision";
  else if (isAuto) mode = "Applied automatically, no approval needed";
  else if (awaiting) mode = "Needs approval";
  else if (p.status === "applied") mode = "Applied after your approval";
  const alts = awaiting ? (pj.alternatives ?? []) : [];
  const body = [h("p", {}, h("strong", {}, "Agent's choice: "), pj.rationale)];
  if (pj.outcome === "hand_off" && pj.handoff_reason) body.push(h("p", { class: "muted" }, `Handoff reason: ${pj.handoff_reason}`));
  for (const notice of p.notices.filter((n) => n.job_id === pj.job_id)) body.push(h("p", { class: "notice" }, notice.text));
  alts.forEach((alt, index) => {
    const label = alt.outcome === "hand_off" ? "Hand off to the dispatcher" : `${techName(alt.technician_id)}, ${slotText(alt.new_start, alt.new_end)}`;
    body.push(
      h(
        "div",
        { class: "alt-option" },
        h("span", { class: "alt-arrow", "aria-hidden": "true" }, "→"),
        h("div", { class: "alt-text" }, h("strong", {}, `Alternative for ${pj.job_id}: ${label}`), h("div", { class: "muted" }, `Tradeoff: ${alt.tradeoff}`)),
        h("button", { class: "alt-button", "aria-label": `Switch ${pj.job_id} to ${label}`, onclick: () => act("/api/choose", { job_id: pj.job_id, alt_index: index }) }, `Switch ${pj.job_id} to this option`),
      ),
    );
  });
  return h(
    "details",
    { class: "jobrow" },
    h(
      "summary",
      {},
      h("strong", {}, `${pj.job_id} ${original.type}`),
      h("span", { class: "muted" }, `was ${original.start}-${original.end}`),
      h("span", { class: `badge ${pj.outcome === "hand_off" ? "bad" : "ok"}` }, where),
      h("span", { class: "muted" }, `${mode} | ${Math.round((pj.confidence ?? 0) * 100)}% confident`),
      alts.length ? h("span", { class: "alt-flag" }, `⇄ ${alts.length} alternative${alts.length === 1 ? "" : "s"}`) : "",
    ),
    ...body,
  );
}

function proposalCards(p) {
  const [label, tone] = PLAN_STATUS[p.status] ?? [p.status, ""];
  const confidence = p.proposal ? ` | ${Math.round((p.proposal.overall_confidence ?? 0) * 100)}% confident` : "";
  const hasAuto = p.split.auto.length > 0;
  const out = [
    h(
      "div",
      { class: "statusbar" },
      h("div", {}, h("div", { class: `status-title ${tone}` }, label), h("div", { class: "muted" }, `${planLabel(p.id)} | ${techName(p.callOut.technician_id)} | ${p.callOut.duration}${confidence}`)),
      p.status === "proposed"
        ? h(
            "div",
            { class: "actions" },
            h("button", { onclick: () => act("/api/approve"), disabled: !p.check?.ok, title: p.check?.ok ? "" : "The plan fails the safety checks" }, hasAuto ? "Approve remaining changes" : "Approve plan"),
            h("button", { class: "danger", onclick: () => act("/api/reject") }, "Reject"),
            h("button", { class: "secondary", onclick: () => act("/api/restore") }, "Restore the agent's plan"),
          )
        : "",
    ),
  ];
  if (p.overrides.length) out.push(h("div", { class: "banner demo-banner" }, `Demo scenario settings in effect: ${p.overrides.join("; ")}`));
  if (p.replay) out.push(h("div", { class: "banner demo-banner" }, `Replay: this proposal is a recording of a real model run (${p.replay.recorded_at.slice(0, 10)}, ${p.replay.model}, priority ${p.replay.priority}). The safety checks, approval and undo run live.`));
  if (p.attempts[0]?.injected) out.push(h("div", { class: "banner demo-banner" }, "Demo test: the first proposal was injected (not from the model) to show the safety checks. The agent then had to produce a correct plan."));
  if (p.status === "handoff") out.push(h("div", { class: "banner bad" }, `Handoff: ${p.handoffReason} No change was made to the schedule.`));
  if (hasAuto) out.push(h("div", { class: "banner" }, h("strong", {}, `Applied automatically: ${[...new Set(p.split.auto)].join(", ")}. `), "Your autonomy setting allows these without approval. Customers whose technician changed are sent an update (simulated)."));
  if (p.status === "proposed") out.push(h("div", { class: "banner" }, h("strong", {}, `Waiting for your approval: ${[...new Set(p.split.approval)].join(", ")}. `), "Your autonomy setting requires your approval for these."));
  if (p.status === "applied" && p.appliedHow === "approved") out.push(h("div", { class: "banner" }, "The remaining changes were applied after your approval."));
  if (p.proposal) {
    out.push(h("p", { class: "summary" }, p.proposal.summary));
    if (p.impact) out.push(impactLine(p));
    out.push(h("p", { class: "section-label" }, h("strong", {}, "Affected Jobs:")));
    out.push(...(p.proposal.jobs ?? []).map((pj) => (p.inputs.jobs.some((j) => j.id === pj.job_id) ? jobRow(p, pj) : "")));
    if (p.proposal.side_effects?.length) {
      out.push(h("p", { class: "also" }, h("strong", {}, "Also moves (needs approval): "), p.proposal.side_effects.map((s) => `${s.job_id} to ${techName(s.technician_id)}, ${s.new_start}-${s.new_end}. `).join(" ")));
    }
  }
  if (p.check && !p.check.ok && p.status === "proposed") out.push(h("div", { class: "banner bad" }, h("strong", {}, "The current plan fails the safety checks and cannot be approved:"), h("ul", { class: "errors" }, ...p.check.errors.map((e) => h("li", {}, e.message)))));
  const checks = p.attempts.map((a) => h("li", {}, `Attempt ${a.n}${a.injected ? " (injected test)" : ""}: ${a.errors.length ? "Failed the safety checks" : "Passed the safety checks"}`, a.errors.length ? h("ul", { class: "errors" }, ...a.errors.map((e) => h("li", {}, e.message))) : ""));
  out.push(
    h(
      "details",
      { class: "more", open: p.status === "handoff" },
      h("summary", {}, "Details: assumptions and safety checks"),
      p.proposal?.assumptions?.length ? h("div", {}, h("h3", {}, "Assumptions"), h("ul", {}, ...p.proposal.assumptions.map((a) => h("li", {}, a)))) : "",
      h("h3", {}, "Safety checks"),
      h("ul", {}, ...checks),
      h("p", { class: "muted" }, `Agent time ${p.seconds}s | Tokens: ${tokenText(p.tokens)}`),
    ),
  );
  return out;
}

// Deterministic numbers computed by the server, so the effect of the scheduling priority can be compared between runs.
function impactLine(p) {
  const { coveredUsd, atRiskUsd, handedOff, driveMinutes } = p.impact;
  const priority = PRIORITY_LABELS[p.inputs.goals.active_profile]?.[0] ?? p.inputs.goals.active_profile;
  const money = (n) => `$${n.toLocaleString("en-US")}`;
  return h(
    "p",
    { class: "impact" },
    h("strong", {}, `Plan impact (priority: ${priority}): `),
    `${money(coveredUsd)} of work covered`,
    atRiskUsd ? `, ${money(atRiskUsd)} handed back to you (${handedOff} job${handedOff === 1 ? "" : "s"})` : "",
    `; ${driveMinutes} drive minutes to reach the moved jobs.`,
  );
}

function renderProposal() {
  const kids = [h("h2", {}, "Agent proposal")];
  if (working) kids.push(h("p", {}, h("span", { class: "spinner" }), `The agent is working on a plan (${Math.round((Date.now() - startedAt) / 1000)}s). This can take up to half a minute.`));
  if (lastError) kids.push(h("div", { class: "banner bad" }, lastError));
  if (!working && !snap.pending) kids.push(h("p", { class: "muted" }, "No proposal yet. Report a call-out above."));
  if (!working && snap.pending) kids.push(...proposalCards(snap.pending));
  $("#proposal").replaceChildren(...kids);
}

function renderTray() {
  const p = snap.pending;
  const items = [];
  for (const j of snap.jobs.filter((x) => x.needs_dispatcher)) {
    const reason = p?.proposal?.jobs.find((x) => x.job_id === j.id)?.handoff_reason ?? "";
    items.push(h("li", {}, h("strong", {}, j.id), ` ${j.type} (${snap.customers[j.customer_id]}): ${reason}`));
  }
  if (p?.status === "handoff") {
    for (const j of p.inputs.jobs.filter((x) => x.tech === p.callOut.technician_id && x.status === "scheduled")) {
      items.push(h("li", {}, h("strong", {}, j.id), ` ${j.type} (${j.at}): ${p.handoffReason}`));
    }
  }
  $("#tray").replaceChildren(h("h2", {}, "Needs the dispatcher", items.length ? h("span", { class: "badge bad count" }, items.length) : ""), items.length ? h("ul", { class: "compact" }, ...items) : h("p", { class: "muted" }, "Nothing handed off."));
}

// Collapsed by default; the latest event stays visible in the summary line.
function renderLog() {
  const last = snap.log.at(-1);
  const clock = (iso) => new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  const list = snap.log.length ? h("ol", { class: "logs" }, ...snap.log.map((e) => h("li", { title: e.at }, h("span", { class: "muted" }, `${clock(e.at)} `), e.text))) : h("p", { class: "muted" }, "Nothing has happened yet.");
  $("#log").replaceChildren(
    h("h2", {}, "Audit log"),
    h("details", { class: "logbox", open: logOpen, ontoggle: (e) => (logOpen = e.currentTarget.open) }, h("summary", {}, `${snap.log.length} event${snap.log.length === 1 ? "" : "s"}. Latest: ${last ? last.text : "none"}`), list),
  );
  if (logOpen && snap.log.length) list.scrollTop = list.scrollHeight;
}

function render() {
  renderHeader();
  renderSettings();
  renderControls();
  renderDay();
  renderProposal();
  renderTray();
  renderLog();
}

try {
  const [state, scenarios] = await Promise.all([api("/api/state"), api("/api/scenarios")]);
  snap = state;
  SCENARIOS = [CUSTOM_SCENARIO, ...scenarios];
  const first = SCENARIOS[1];
  if (first) Object.assign(form, { scenario: first.id, technician_id: first.technician_id, until: first.until, note: first.note });
  render();
} catch (err) {
  document.body.append(h("p", { class: "banner bad" }, `Could not load the app state: ${err.message}`));
}
