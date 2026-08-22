import { execFile } from "node:child_process";
import { access, cp, mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const smithyTypescriptVersion = "0.52.0";
const integrationVersion = "0.0.1-spike";
const smithyCliPackages = {
  "darwin-arm64": "@smithy-vite/smithy-cli-darwin-arm64",
  "darwin-x64": "@smithy-vite/smithy-cli-darwin-x64",
  "linux-arm64": "@smithy-vite/smithy-cli-linux-arm64",
  "linux-x64": "@smithy-vite/smithy-cli-linux-x64",
  "win32-x64": "@smithy-vite/smithy-cli-win32-x64"
};

async function resolveSmithyCli() {
  if (process.env.SMITHY_VITE_SMITHY) {
    return { executable: process.env.SMITHY_VITE_SMITHY, arguments: [] };
  }

  const packageName = smithyCliPackages[`${process.platform}-${process.arch}`];
  if (!packageName) {
    throw new Error(`Smithy Vite does not yet provide a Smithy CLI for ${process.platform}-${process.arch}`);
  }

  try {
    const platformPackage = await import(packageName);
    await access(platformPackage.smithyCommand.executable);
    return platformPackage.smithyCommand;
  } catch (packageError) {
    try {
      const localPackage = await import(
        pathToFileURL(resolve(packageRoot, "..", packageName.slice("@smithy-vite/".length), "index.js"))
      );
      await access(localPackage.smithyCommand.executable);
      return localPackage.smithyCommand;
    } catch {
      throw new Error(
        `The optional package ${packageName} is unavailable. Reinstall without omitting optional dependencies, `
          + "or set SMITHY_VITE_SMITHY to an existing Smithy CLI executable.",
        { cause: packageError }
      );
    }
  }
}

export async function generate(options) {
  const root = resolve(options.root ?? process.cwd());
  const output = resolve(root, options.output);
  const work = resolve(root, ".smithy-vite");
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
        { id: "smithy-vite", url: pathToFileURL(localMaven).href },
        { id: "central", url: "https://repo.maven.apache.org/maven2" }
      ],
      dependencies: [
        `software.amazon.smithy.typescript:smithy-aws-typescript-codegen:${smithyTypescriptVersion}`,
        `io.github.thomaslaich.smithyvite:smithy-vite-codegen:${integrationVersion}`
      ]
    },
    plugins: {
      "typescript-client-codegen": {
        service: options.service,
        package: options.packageName ?? "@smithy-vite/generated-client",
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
    await execFileAsync(smithy.executable, [
      ...smithy.arguments,
      "build",
      "--config",
      configPath,
      "--output",
      smithyOutput
    ], {
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
