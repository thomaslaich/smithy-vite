import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import {
  commonPackageRoots,
  platformPackageRoots,
  publishablePackageRoots,
} from "./package-roots.mjs";

const version = process.argv[2];
if (
  !version ||
  !/^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-[0-9A-Za-z.-]+)?$/.test(
    version,
  )
) {
  throw new Error(
    `Expected a SemVer release version, received: ${version ?? "<empty>"}`,
  );
}

const releaseRoot = resolve(process.env.SMITHY_VITE_RELEASE_ROOT ?? ".");

const packages = new Map();
for (const packageRoot of publishablePackageRoots) {
  const packagePath = resolve(releaseRoot, packageRoot, "package.json");
  packages.set(packageRoot, {
    packagePath,
    value: JSON.parse(await readFile(packagePath, "utf8")),
  });
}

for (const packageRoot of platformPackageRoots) {
  packages.get(packageRoot).value.version = version;
}

const codegen = packages.get(commonPackageRoots[0]).value;
codegen.version = version;
for (const dependency of Object.keys(codegen.optionalDependencies)) {
  codegen.optionalDependencies[dependency] = version;
}

const plugin = packages.get(commonPackageRoots[1]).value;
plugin.version = version;
plugin.dependencies["@smithy-vite/codegen"] = version;

for (const { packagePath, value } of packages.values()) {
  await writeFile(packagePath, `${JSON.stringify(value, null, 2)}\n`);
}

const versionsPath = resolve(releaseRoot, "packages/codegen/src/versions.json");
const versions = JSON.parse(await readFile(versionsPath, "utf8"));
versions.integration = version;
await writeFile(versionsPath, `${JSON.stringify(versions, null, 2)}\n`);

console.log(
  `Staged ${publishablePackageRoots.length} npm packages and the Maven integration at ${version}`,
);
