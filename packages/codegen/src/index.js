import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import { chmod, cp, mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { dirname, join, resolve, sep } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { promisify } from "node:util";
import { unzipSync } from "fflate";

const execFileAsync = promisify(execFile);
const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const smithyTypescriptVersion = "0.52.0";
const integrationVersion = "0.0.1-spike";
const smithyVersion = "1.73.0";
const smithyDistributions = {
  "darwin-arm64": ["darwin-aarch64", "daf789553a20822138bc90b913233374613e1a4515a61358241d5c5489be0be9"],
  "darwin-x64": ["darwin-x86_64", "eb6f7e72245ecf0e3df992314c80dde080e4215716214874a0c3b94f9813562f"],
  "linux-arm64": ["linux-aarch64", "f69295411846274b9e8128f31ffa1d7ad02fa078047e2c4e46d5d85bcba4fc20"],
  "linux-x64": ["linux-x86_64", "9071a7db052da81ab6f4be1b4d43ea152b44b78217be0dd21d37d9ea5ec1942d"],
  "win32-x64": ["windows-x64", "32e00abc06f6d1ac9201d8f574bd7a2d62d65eaeb2ea16b3877be18d8febafc2"]
};

async function extractArchive(bytes, destination) {
  const files = unzipSync(bytes);
  for (const [name, contents] of Object.entries(files)) {
    const path = resolve(destination, name);
    if (!path.startsWith(`${destination}${sep}`)) {
      throw new Error(`Refusing to extract an unsafe Smithy CLI path: ${name}`);
    }
    if (name.endsWith("/")) {
      await mkdir(path, { recursive: true });
      continue;
    }
    await mkdir(dirname(path), { recursive: true });
    await writeFile(path, contents);
    if (process.platform !== "win32" && (name.includes("/bin/") || name.endsWith("/lib/jspawnhelper"))) {
      await chmod(path, 0o755);
    }
  }
}

async function resolveSmithyCli() {
  if (process.env.SMITHY_REACT_SMITHY) return process.env.SMITHY_REACT_SMITHY;

  const distribution = smithyDistributions[`${process.platform}-${process.arch}`];
  if (!distribution) {
    throw new Error(`Smithy React does not yet provide a Smithy CLI for ${process.platform}-${process.arch}`);
  }

  const [platformName, expectedDigest] = distribution;
  const archiveName = `smithy-cli-${platformName}.zip`;
  const cacheRoot = resolve(
    process.env.SMITHY_REACT_CACHE ?? join(homedir(), ".cache", "smithy-react"),
    `smithy-cli-${smithyVersion}`
  );
  const executable = join(
    cacheRoot,
    `smithy-cli-${platformName}`,
    "bin",
    process.platform === "win32" ? "smithy.bat" : "smithy"
  );

  try {
    await chmod(executable, 0o755);
    return executable;
  } catch {
    // The pinned distribution has not been installed in the cache yet.
  }

  const staging = `${cacheRoot}.next`;
  const url = `https://github.com/smithy-lang/smithy/releases/download/${smithyVersion}/${archiveName}`;
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Unable to download Smithy CLI ${smithyVersion}: HTTP ${response.status}`);
  const bytes = Buffer.from(await response.arrayBuffer());
  const actualDigest = createHash("sha256").update(bytes).digest("hex");
  if (actualDigest !== expectedDigest) {
    throw new Error(`Smithy CLI checksum mismatch: expected ${expectedDigest}, received ${actualDigest}`);
  }

  await rm(staging, { recursive: true, force: true });
  await mkdir(dirname(cacheRoot), { recursive: true });
  await extractArchive(bytes, staging);
  await rm(cacheRoot, { recursive: true, force: true });
  await rename(staging, cacheRoot);
  if (process.platform !== "win32") await chmod(executable, 0o755);
  return executable;
}

export async function generate(options) {
  const root = resolve(options.root ?? process.cwd());
  const output = resolve(root, options.output);
  const work = resolve(root, ".smithy-react");
  const smithyOutput = join(work, "smithy-output");
  const generated = join(smithyOutput, "source", "typescript-client-codegen");
  const staged = `${output}.next`;
  const localMaven = resolve(packageRoot, "vendor", "maven");
  const smithy = await resolveSmithyCli();

  const config = {
    version: "1.0",
    sources: options.sources.map(source => resolve(root, source)),
    maven: {
      repositories: [
        { id: "smithy-react", url: pathToFileURL(localMaven).href },
        { id: "central", url: "https://repo.maven.apache.org/maven2" }
      ],
      dependencies: [
        `software.amazon.smithy.typescript:smithy-aws-typescript-codegen:${smithyTypescriptVersion}`,
        `dev.smithy-react:smithy-react-codegen:${integrationVersion}`
      ]
    },
    plugins: {
      "typescript-client-codegen": {
        service: options.service,
        package: options.packageName ?? "@smithy-react/generated-client",
        packageVersion: "0.0.0",
        private: true
      }
    }
  };

  await rm(smithyOutput, { recursive: true, force: true });
  await rm(staged, { recursive: true, force: true });
  await mkdir(work, { recursive: true });
  const configPath = join(work, "smithy-build.json");
  await writeFile(configPath, `${JSON.stringify(config, null, 2)}\n`);

  try {
    await execFileAsync(smithy, ["build", "--config", configPath, "--output", smithyOutput], {
      cwd: root,
      maxBuffer: 10 * 1024 * 1024
    });
  } catch (error) {
    const details = [error.stdout, error.stderr].filter(Boolean).join("\n");
    throw new Error(`Smithy generation failed${details ? `:\n${details}` : ""}`, { cause: error });
  }

  await mkdir(dirname(output), { recursive: true });
  await cp(generated, staged, { recursive: true });
  await rm(output, { recursive: true, force: true });
  await rename(staged, output);

  return {
    output,
    generatedPackageJson: JSON.parse(await readFile(join(output, "package.json"), "utf8"))
  };
}
