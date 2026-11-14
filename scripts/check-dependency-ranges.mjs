// Every generated client declares the npm packages it needs, with ranges that
// are pinned in the code generators. Check that each example installs versions
// inside those ranges, so a dependency bump in an example that outgrows a
// pinned range fails here instead of drifting silently.
import { readFile, readdir } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import semver from "semver";

const repositoryRoot = resolve(import.meta.dirname, "..");
const examplesRoot = join(repositoryRoot, "examples");

// Resolved by walking node_modules rather than require.resolve, because
// package exports maps often hide package.json.
async function installedVersion(project, name) {
  for (let directory = project; ; directory = dirname(directory)) {
    const manifest = join(directory, "node_modules", name, "package.json");
    const version = await readFile(manifest, "utf8")
      .then((content) => JSON.parse(content).version)
      .catch(() => undefined);
    if (version) return version;
    if (directory === repositoryRoot || directory === dirname(directory)) {
      return undefined;
    }
  }
}

const failures = [];
let checked = 0;
for (const example of await readdir(examplesRoot)) {
  const project = join(examplesRoot, example);
  const configs = (await readdir(project)).filter(
    (file) => file.startsWith("smithy") && file.endsWith(".json"),
  );
  for (const config of configs) {
    const { output } = JSON.parse(
      await readFile(join(project, config), "utf8"),
    );
    const generated = JSON.parse(
      await readFile(join(project, output, "package.json"), "utf8"),
    );
    for (const field of ["dependencies", "peerDependencies"]) {
      for (const [name, range] of Object.entries(generated[field] ?? {})) {
        checked += 1;
        const version = await installedVersion(project, name);
        if (!version) {
          failures.push(`${example}/${config}: ${name} is not installed`);
        } else if (!semver.satisfies(version, range)) {
          failures.push(
            `${example}/${config}: ${name}@${version} is outside the generated ${field} range ${range}`,
          );
        }
      }
    }
  }
}

if (failures.length > 0) {
  console.error(failures.join("\n"));
  console.error(
    "Update the ranges in the code generator, or the example's dependency, so they agree.",
  );
  process.exit(1);
}
console.log(
  `Examples satisfy all ${checked} dependency ranges declared by their generated clients.`,
);
