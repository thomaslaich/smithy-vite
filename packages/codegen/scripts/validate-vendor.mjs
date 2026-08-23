import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { dirname, join, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import {
  codegenDependencies,
  integrationVersion,
  smithyTypescriptVersion,
} from "../src/versions.js";

const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const mavenRepo = resolve(packageRoot, "vendor", "maven");

let manifest;
try {
  manifest = JSON.parse(
    await readFile(join(mavenRepo, "manifest.json"), "utf8"),
  );
} catch (error) {
  throw new Error(
    "The bundled Maven repository manifest is missing. Run `npm run prepare:maven` from the repository root before packing @smithy-vite/codegen.",
    { cause: error },
  );
}

if (
  manifest.schemaVersion !== 1 ||
  manifest.smithyTypescriptVersion !== smithyTypescriptVersion ||
  manifest.integrationVersion !== integrationVersion ||
  JSON.stringify(manifest.dependencies) !== JSON.stringify(codegenDependencies)
) {
  throw new Error(
    "The bundled Maven repository manifest does not match the pinned codegen versions. Run `npm run build:integration` and `npm run prepare:maven`.",
  );
}

if (!Array.isArray(manifest.artifacts) || manifest.artifacts.length === 0) {
  throw new Error("The bundled Maven repository manifest has no artifacts.");
}

for (const artifact of manifest.artifacts) {
  const artifactPath = resolve(mavenRepo, artifact.path);
  if (!artifactPath.startsWith(`${mavenRepo}${sep}`)) {
    throw new Error(`Unsafe bundled Maven artifact path: ${artifact.path}`);
  }
  const contents = await readFile(artifactPath);
  const digest = createHash("sha256").update(contents).digest("hex");
  if (contents.length !== artifact.size || digest !== artifact.sha256) {
    throw new Error(
      `Bundled Maven artifact verification failed: ${artifact.path}`,
    );
  }
}

const jars = manifest.artifacts.filter((artifact) =>
  artifact.path.endsWith(".jar"),
);
if (jars.length < 2) {
  throw new Error(
    "The bundled Maven repository does not contain its full JAR closure.",
  );
}
