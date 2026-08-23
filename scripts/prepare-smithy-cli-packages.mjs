import { createHash } from "node:crypto";
import { chmod, mkdir, rm, writeFile } from "node:fs/promises";
import { dirname, resolve, sep } from "node:path";
import { unzipSync } from "fflate";
import { smithyCliVersion } from "../packages/codegen/src/versions.js";

const distributions = {
  "darwin-arm64": {
    asset: "darwin-aarch64",
    digest: "cbeb49c53df026083f2ba0e4ea077828602b5fcd0a3d668f3f90c43354694afc",
  },
  "darwin-x64": {
    asset: "darwin-x86_64",
    digest: "41e6ee64e05399824fc0b6b4fb2b63f94c20f55848f5901e98d56f5230532f44",
  },
  "linux-arm64": {
    asset: "linux-aarch64",
    digest: "5d067d80b9a881b444c64b5a63059be226360cdee4c7b392616854495fe03dfb",
  },
  "linux-x64": {
    asset: "linux-x86_64",
    digest: "05ca13293eb949abfa3a38cefb053b0f91ad9e15b39c9e996258227b866644c1",
  },
  "win32-x64": {
    asset: "windows-x64",
    digest: "d7285a415c2271706becb6c8e62e645746b1802733a471a7c308a463bdc564d2",
  },
};

const platformFlag = process.argv.indexOf("--platform");
const requested =
  platformFlag === -1
    ? `${process.platform}-${process.arch}`
    : process.argv[platformFlag + 1];
const platforms =
  requested === "all" ? Object.keys(distributions) : [requested];

for (const platform of platforms) {
  const distribution = distributions[platform];
  if (!distribution)
    throw new Error(`Unsupported Smithy CLI package platform: ${platform}`);

  const archiveName = `smithy-cli-${distribution.asset}.zip`;
  const url = `https://github.com/smithy-lang/smithy/releases/download/${smithyCliVersion}/${archiveName}`;
  console.log(`Downloading ${archiveName}`);
  const response = await fetch(url);
  if (!response.ok)
    throw new Error(
      `Unable to download ${archiveName}: HTTP ${response.status}`,
    );
  const bytes = Buffer.from(await response.arrayBuffer());
  const actualDigest = createHash("sha256").update(bytes).digest("hex");
  if (actualDigest !== distribution.digest) {
    throw new Error(
      `Checksum mismatch for ${archiveName}: expected ${distribution.digest}, received ${actualDigest}`,
    );
  }

  const packageRoot = resolve(`packages/smithy-cli-${platform}`);
  const vendorRoot = resolve(packageRoot, "vendor");
  const archiveRoot = `smithy-cli-${distribution.asset}/`;
  await rm(vendorRoot, { recursive: true, force: true });

  for (const [name, contents] of Object.entries(unzipSync(bytes))) {
    if (!name.startsWith(archiveRoot))
      throw new Error(`Unexpected archive path: ${name}`);
    const relativeName = name.slice(archiveRoot.length);
    if (!relativeName) continue;
    const destination = resolve(vendorRoot, relativeName);
    if (!destination.startsWith(`${vendorRoot}${sep}`)) {
      throw new Error(`Refusing to extract an unsafe archive path: ${name}`);
    }
    if (name.endsWith("/")) {
      await mkdir(destination, { recursive: true });
      continue;
    }
    await mkdir(dirname(destination), { recursive: true });
    await writeFile(destination, contents);
    if (
      platform !== "win32-x64" &&
      (relativeName.startsWith("bin/") || relativeName === "lib/jspawnhelper")
    ) {
      await chmod(destination, 0o755);
    }
  }

  console.log(
    `Prepared @smithy-vite/smithy-cli-${platform} with Smithy CLI ${smithyCliVersion}`,
  );
}
