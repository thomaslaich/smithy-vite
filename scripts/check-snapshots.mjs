// Compares the generated TanStack Query adapters against committed snapshots.
// Run with --update to rewrite the snapshots after an intended change.
import assert from "node:assert/strict";
import { cp, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { generate } from "../packages/codegen/src/index.js";

const repositoryRoot = resolve(import.meta.dirname, "..");
const fixtureModel = resolve(repositoryRoot, "codegen/src/test/smithy");
const snapshotRoot = resolve(repositoryRoot, "codegen/src/test/snapshots");
const update = process.argv.includes("--update");
const frameworks = ["react", "preact", "solid", "vue", "angular"];
const services = ["Catalog", "Reports", "Commands"];
const concurrency = 4;

const cases = frameworks.flatMap((framework) =>
  services.map((service) => ({ framework, service })),
);
const temporaryRoot = await mkdtemp(join(tmpdir(), "smithy-vite-snapshots-"));
const failures = [];

async function run({ framework, service }) {
  const root = join(temporaryRoot, `${framework}-${service}`);
  await cp(fixtureModel, join(root, "model"), { recursive: true });
  await generate({
    root,
    sources: ["model"],
    service: `example.fixtures#${service}`,
    output: "generated",
    tanstackQuery: { framework },
  });

  const index = await readFile(join(root, "generated/src/index.ts"), "utf8");
  assert.match(
    index,
    /export \* from "\.\/tanstack-query";/,
    `${framework}/${service}: index.ts must re-export the adapter`,
  );

  const actual = (
    await readFile(join(root, "generated/src/tanstack-query.ts"), "utf8")
  ).replaceAll("\r\n", "\n");
  const snapshot = join(snapshotRoot, framework, `${service}.ts.snap`);
  if (update) {
    await mkdir(join(snapshotRoot, framework), { recursive: true });
    await writeFile(snapshot, actual);
    return;
  }
  const expected = await readFile(snapshot, "utf8").catch(() => undefined);
  if (expected === undefined) {
    failures.push(`${framework}/${service}: snapshot is missing`);
  } else if (expected.replaceAll("\r\n", "\n") !== actual) {
    failures.push(`${framework}/${service}: output differs from snapshot`);
  }
}

try {
  const queue = [...cases];
  await Promise.all(
    Array.from({ length: concurrency }, async () => {
      while (queue.length > 0) await run(queue.shift());
    }),
  );
} finally {
  await rm(temporaryRoot, { recursive: true, force: true });
}

if (failures.length > 0) {
  console.error(failures.join("\n"));
  console.error(
    "Run `npm run update:snapshots` and review the diff if the change is intended.",
  );
  process.exit(1);
}
console.log(
  `${update ? "Updated" : "Verified"} ${cases.length} TanStack Query adapter snapshots.`,
);
