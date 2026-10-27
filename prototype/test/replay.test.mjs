// version: 0.1.0
// tags: [prototype, test, replay]

import test from "node:test";
import assert from "node:assert/strict";
import { loadRecording, validKey } from "../lib/replay.mjs";

test("recording keys must be short plain ids", () => {
  for (const bad of ["", "../x", "a/b", "a b", "x".repeat(21), null, undefined, 5]) assert.equal(validKey(bad), false, String(bad));
  for (const good of ["S1", "S10", "demo_1", "a-b"]) assert.equal(validKey(good), true, good);
});

test("loading a bad or missing recording returns null and never touches other files", async () => {
  assert.equal(await loadRecording("../package"), null);
  assert.equal(await loadRecording("NOPE_not_recorded"), null);
});
