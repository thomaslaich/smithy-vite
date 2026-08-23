import { execFile } from "node:child_process";
import { resolve } from "node:path";
import { promisify } from "node:util";
import {
  commonPackageRoots,
  currentPlatformPackageRoot,
  publishablePackageRoots,
} from "./package-roots.mjs";

const execFileAsync = promisify(execFile);
const packageRoots = process.argv.includes("--all")
  ? publishablePackageRoots
  : [currentPlatformPackageRoot, ...commonPackageRoots];

for (const packageRoot of packageRoots) {
  await execFileAsync("npm", ["pack", "--dry-run", resolve(packageRoot)], {
    maxBuffer: 10 * 1024 * 1024,
  });
  console.log(`${packageRoot}: package contents validated`);
}
