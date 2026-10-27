// version: 0.1.0
// tags: [prototype, replay, recording, demo]

import { mkdir, readFile, writeFile } from "node:fs/promises";

const DIR = new URL("../recordings/", import.meta.url);
const KEY = /^[A-Za-z0-9_-]{1,20}$/;

// Keys become file names, so only short plain ids are allowed.
export const validKey = (key) => typeof key === "string" && KEY.test(key);

export async function loadRecording(key) {
  if (!validKey(key)) return null;
  try {
    return JSON.parse(await readFile(new URL(`${key}.json`, DIR), "utf8"));
  } catch (err) {
    if (err.code === "ENOENT") return null;
    throw err;
  }
}

export async function saveRecording(key, recording) {
  if (!validKey(key)) throw new Error("Bad recording key.");
  await mkdir(DIR, { recursive: true });
  const file = { version: "0.1.0", tags: ["recording", "replay", "synthetic"], ...recording };
  await writeFile(new URL(`${key}.json`, DIR), `${JSON.stringify(file, null, 2)}\n`);
}
