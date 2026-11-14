import assert from "node:assert/strict";
import { test } from "node:test";
import { coalesce } from "../src/regenerate.js";

function deferredRuns() {
  const runs = [];
  const run = () =>
    new Promise((resolve, reject) => runs.push({ resolve, reject }));
  return { runs, run };
}

test("runs immediately when idle", async () => {
  let calls = 0;
  const regenerate = coalesce(async () => ++calls);
  assert.equal(await regenerate(), 1);
  assert.equal(await regenerate(), 2);
});

test("coalesces calls made during a run into one follow-up run", async () => {
  const { runs, run } = deferredRuns();
  const regenerate = coalesce(run);

  const first = regenerate();
  const followUps = [regenerate(), regenerate(), regenerate()];
  assert.equal(runs.length, 1);
  assert.equal(followUps[0], followUps[1]);
  assert.equal(followUps[1], followUps[2]);

  runs[0].resolve("first");
  assert.equal(await first, "first");
  await new Promise(setImmediate);
  assert.equal(runs.length, 2);

  runs[1].resolve("second");
  assert.deepEqual(await Promise.all(followUps), [
    "second",
    "second",
    "second",
  ]);
});

test("a failed run still lets the queued run start, and rejects only its own callers", async () => {
  const { runs, run } = deferredRuns();
  const regenerate = coalesce(run);

  const first = regenerate();
  const second = regenerate();
  runs[0].reject(new Error("invalid model"));
  await assert.rejects(first, /invalid model/);
  await new Promise(setImmediate);

  runs[1].resolve("recovered");
  assert.equal(await second, "recovered");
});

test("calls made during the follow-up run queue another run", async () => {
  const { runs, run } = deferredRuns();
  const regenerate = coalesce(run);

  regenerate();
  const second = regenerate();
  runs[0].resolve();
  await new Promise(setImmediate);
  const third = regenerate();
  assert.notEqual(second, third);

  runs[1].resolve("second");
  await second;
  await new Promise(setImmediate);
  runs[2].resolve("third");
  assert.equal(await third, "third");
});
