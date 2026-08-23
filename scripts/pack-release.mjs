import { execFile } from "node:child_process";
import { mkdir, rm } from "node:fs/promises";
import { resolve } from "node:path";
import { promisify } from "node:util";
import { publishablePackageRoots } from "./package-roots.mjs";

const execFileAsync = promisify(execFile);
const destination = resolve(process.argv[2] ?? "artifacts/npm");
await rm(destination, { recursive: true, force: true });
await mkdir(destination, { recursive: true });

for (const packageRoot of publishablePackageRoots) {
  await execFileAsync(
    "npm",
    ["pack", "--pack-destination", destination, resolve(packageRoot)],
    { maxBuffer: 10 * 1024 * 1024 },
  );
  console.log(`${packageRoot}: packed`);
}
