import { readdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const mavenRepo = resolve(packageRoot, "vendor", "maven");

let files = [];
try {
  files = await readdir(mavenRepo, { recursive: true });
} catch (error) {
  if (error.code !== "ENOENT") {
    throw error;
  }
}

const hasJar = files.some(file => file.endsWith(".jar"));
const hasPom = files.some(file => file.endsWith(".pom"));

if (!hasJar || !hasPom) {
  throw new Error(
    "The bundled Maven repository is empty. Run `npm run build:integration` from the repository root before packing @smithy-vite/codegen."
  );
}
