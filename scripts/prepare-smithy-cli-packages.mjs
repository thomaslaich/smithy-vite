import { createHash } from "node:crypto";
import { chmod, mkdir, rm, writeFile } from "node:fs/promises";
import { dirname, resolve, sep } from "node:path";
import { unzipSync } from "fflate";

const smithyVersion = "1.73.0";
const distributions = {
  "darwin-arm64": {
    asset: "darwin-aarch64",
    digest: "daf789553a20822138bc90b913233374613e1a4515a61358241d5c5489be0be9",
  },
  "darwin-x64": {
    asset: "darwin-x86_64",
    digest: "eb6f7e72245ecf0e3df992314c80dde080e4215716214874a0c3b94f9813562f",
  },
  "linux-arm64": {
    asset: "linux-aarch64",
    digest: "f69295411846274b9e8128f31ffa1d7ad02fa078047e2c4e46d5d85bcba4fc20",
  },
  "linux-x64": {
    asset: "linux-x86_64",
    digest: "9071a7db052da81ab6f4be1b4d43ea152b44b78217be0dd21d37d9ea5ec1942d",
  },
  "win32-x64": {
    asset: "windows-x64",
    digest: "32e00abc06f6d1ac9201d8f574bd7a2d62d65eaeb2ea16b3877be18d8febafc2",
  },
};

const platformFlag = process.argv.indexOf("--platform");
const requested = platformFlag === -1 ? `${process.platform}-${process.arch}` : process.argv[platformFlag + 1];
const platforms = requested === "all" ? Object.keys(distributions) : [requested];

for (const platform of platforms) {
  const distribution = distributions[platform];
  if (!distribution) throw new Error(`Unsupported Smithy CLI package platform: ${platform}`);

  const archiveName = `smithy-cli-${distribution.asset}.zip`;
  const url = `https://github.com/smithy-lang/smithy/releases/download/${smithyVersion}/${archiveName}`;
  console.log(`Downloading ${archiveName}`);
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Unable to download ${archiveName}: HTTP ${response.status}`);
  const bytes = Buffer.from(await response.arrayBuffer());
  const actualDigest = createHash("sha256").update(bytes).digest("hex");
  if (actualDigest !== distribution.digest) {
    throw new Error(`Checksum mismatch for ${archiveName}: expected ${distribution.digest}, received ${actualDigest}`);
  }

  const packageRoot = resolve(`packages/smithy-cli-${platform}`);
  const vendorRoot = resolve(packageRoot, "vendor");
  const archiveRoot = `smithy-cli-${distribution.asset}/`;
  await rm(vendorRoot, { recursive: true, force: true });

  for (const [name, contents] of Object.entries(unzipSync(bytes))) {
    if (!name.startsWith(archiveRoot)) throw new Error(`Unexpected archive path: ${name}`);
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
    if (platform !== "win32-x64" && (relativeName.startsWith("bin/") || relativeName === "lib/jspawnhelper")) {
      await chmod(destination, 0o755);
    }
  }

  console.log(`Prepared @smithy-vite/smithy-cli-${platform} with Smithy CLI ${smithyVersion}`);
}
