import { execFile } from "node:child_process";
import {
  access,
  cp,
  mkdir,
  readFile,
  rename,
  rm,
  writeFile,
} from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { promisify } from "node:util";
import { defaultCodegenDependencies } from "./versions.js";

const execFileAsync = promisify(execFile);
const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const smithyCliPackages = {
  "darwin-arm64": "@smithy-vite/smithy-cli-darwin-arm64",
  "darwin-x64": "@smithy-vite/smithy-cli-darwin-x64",
  "linux-arm64": "@smithy-vite/smithy-cli-linux-arm64",
  "linux-x64": "@smithy-vite/smithy-cli-linux-x64",
  "win32-x64": "@smithy-vite/smithy-cli-win32-x64",
};

async function resolveBundledSmithyCli() {
  const packageName = smithyCliPackages[`${process.platform}-${process.arch}`];
  if (!packageName) {
    throw new Error(
      `Smithy Vite does not yet provide a Smithy CLI for ${process.platform}-${process.arch}`,
    );
  }

  try {
    const platformPackage = await import(packageName);
    await access(platformPackage.smithyCommand.executable);
    return platformPackage.smithyCommand;
  } catch (packageError) {
    try {
      const localPackage = await import(
        pathToFileURL(
          resolve(
            packageRoot,
            "..",
            packageName.slice("@smithy-vite/".length),
            "index.js",
          ),
        )
      );
      await access(localPackage.smithyCommand.executable);
      return localPackage.smithyCommand;
    } catch {
      throw new Error(
        `The optional package ${packageName} is unavailable. Reinstall without omitting optional dependencies, or select the external toolchain mode.`,
        { cause: packageError },
      );
    }
  }
}

export async function generate(options) {
  const root = resolve(options.root ?? process.cwd());
  const output = resolve(root, options.output);
  const work = resolve(root, ".smithy-vite");
  const smithyOutput = join(work, "smithy-output");
  const mavenCache = join(work, "maven-cache");
  const generated = join(smithyOutput, "source", "typescript-codegen");
  const staged = `${output}.next`;
  const localMaven = resolve(packageRoot, "vendor", "maven");
  const mode = options.mode ?? "client";
  const toolchain = options.toolchain ?? { mode: "bundled" };
  const toolchainMode = toolchain.mode ?? "bundled";
  let smithy;
  let repositories;
  let dependencies;

  if (toolchainMode === "bundled") {
    await access(join(localMaven, "manifest.json")).catch((error) => {
      throw new Error(
        "The bundled Maven toolchain is unavailable. Reinstall @smithy-vite/codegen, or run `npm run build:integration` followed by `npm run prepare:maven` in a source checkout.",
        { cause: error },
      );
    });
    smithy = await resolveBundledSmithyCli();
    repositories = [
      { id: "smithy-vite-bundled", url: pathToFileURL(localMaven).href },
    ];
    dependencies = defaultCodegenDependencies(mode);
  } else if (toolchainMode === "external") {
    if (
      !Array.isArray(toolchain.maven?.repositories) ||
      toolchain.maven.repositories.length === 0
    ) {
      throw new Error(
        "The external toolchain mode requires at least one explicit Maven repository.",
      );
    }
    smithy = {
      executable: toolchain.smithy ?? "smithy",
      arguments: toolchain.smithyArguments ?? [],
    };
    repositories = toolchain.maven.repositories;
    dependencies =
      toolchain.maven?.dependencies ?? defaultCodegenDependencies(mode);
  } else {
    throw new Error(`Unsupported Smithy Vite toolchain mode: ${toolchainMode}`);
  }
  const tanstackFramework = options.tanstackQuery?.framework ?? "none";

  if (mode !== "client" && mode !== "server" && mode !== "types") {
    throw new Error(`Unsupported TypeScript codegen mode: ${mode}`);
  }

  if (mode === "types" && !options.closure) {
    throw new Error("TypeScript types mode requires a shape closure.");
  }

  if (mode !== "types" && !options.service) {
    throw new Error(`TypeScript ${mode} mode requires a service.`);
  }

  if (mode !== "client" && options.tanstackQuery) {
    throw new Error(
      "TanStack Query adapters can only be generated in client mode.",
    );
  }

  if (
    tanstackFramework !== "none" &&
    tanstackFramework !== "react" &&
    tanstackFramework !== "preact" &&
    tanstackFramework !== "solid" &&
    tanstackFramework !== "vue" &&
    tanstackFramework !== "angular"
  ) {
    throw new Error(
      `Unsupported TanStack Query framework: ${tanstackFramework}`,
    );
  }

  const config = {
    version: "1.0",
    sources: options.sources.map((source) => resolve(root, source)),
    maven: {
      repositories,
      dependencies,
    },
    plugins: {
      "typescript-codegen": {
        package:
          options.packageName ??
          `@smithy-vite/generated-${mode === "types" ? "types" : mode}`,
        packageVersion: "0.0.0",
        private: true,
        modes: [mode],
        ...(mode === "types"
          ? { closure: options.closure }
          : { service: options.service }),
        ...(mode === "server" && options.disableDefaultValidation !== undefined
          ? { disableDefaultValidation: options.disableDefaultValidation }
          : {}),
      },
    },
  };

  await rm(smithyOutput, { recursive: true, force: true });
  await rm(staged, { recursive: true, force: true });
  await mkdir(work, { recursive: true });
  const configPath = join(work, "smithy-build.json");
  await writeFile(configPath, `${JSON.stringify(config, null, 2)}\n`);

  try {
    await execFileAsync(
      smithy.executable,
      [
        ...smithy.arguments,
        "build",
        "--config",
        configPath,
        "--output",
        smithyOutput,
      ],
      {
        cwd: root,
        env: {
          ...process.env,
          SMITHY_MAVEN_CACHE: mavenCache,
          SMITHY_VITE_TANSTACK_FRAMEWORK: tanstackFramework,
        },
        maxBuffer: 10 * 1024 * 1024,
      },
    );
  } catch (error) {
    const details = [error.stdout, error.stderr].filter(Boolean).join("\n");
    throw new Error(
      `Smithy generation failed${details ? `:\n${details}` : ""}`,
      { cause: error },
    );
  }

  await mkdir(dirname(output), { recursive: true });
  await cp(generated, staged, { recursive: true });
  await rm(output, { recursive: true, force: true });
  await rename(staged, output);

  return {
    output,
    generatedPackageJson: JSON.parse(
      await readFile(join(output, "package.json"), "utf8"),
    ),
  };
}
