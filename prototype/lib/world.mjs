// version: 0.2.0
// tags: [prototype, data, config, loader, scenarios]

import { readFile } from "node:fs/promises";
import { load } from "js-yaml";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");
const json = async (path) => JSON.parse(await read(path));

export async function loadWorld() {
  const [business, technicians, jobs, customers] = await Promise.all([
    json("data/business.json"),
    json("data/technicians.json"),
    json("data/jobs.json"),
    json("data/customers.json"),
  ]);
  return {
    business,
    technicians: technicians.technicians,
    jobs: jobs.jobs,
    customers: customers.customers,
  };
}

// Read on every call so editing a YAML file and reloading takes effect without a restart.
export async function loadConfig() {
  const names = ["goals", "permissions", "qualifications", "urgency"];
  const loaded = await Promise.all(names.map(async (name) => load(await read(`config/${name}.yaml`))));
  return Object.fromEntries(names.map((name, i) => [name, loaded[i]]));
}

// Demo scenarios live in config/scenarios.yaml; each fills in a call-out report and may override a setting.
export async function loadScenarios() {
  const { scenarios } = load(await read("config/scenarios.yaml"));
  const ids = new Set();
  for (const s of scenarios) {
    for (const key of ["id", "label", "description", "technician_id"]) {
      if (typeof s[key] !== "string" || !s[key]) throw new Error(`scenarios.yaml: scenario ${s.id ?? "?"} needs a text field "${key}".`);
    }
    if (ids.has(s.id)) throw new Error(`scenarios.yaml: duplicate scenario id ${s.id}.`);
    ids.add(s.id);
  }
  return scenarios.map((s) => ({ until: "", note: "", overrides: {}, ...s }));
}
