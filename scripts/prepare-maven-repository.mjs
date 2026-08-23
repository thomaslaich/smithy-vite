import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import {
  access,
  cp,
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  rm,
  stat,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, relative, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { promisify } from "node:util";
import {
  codegenDependencies,
  integrationVersion,
  smithyTypescriptVersion,
} from "../packages/codegen/src/versions.js";

const execFileAsync = promisify(execFile);
const repositoryRoot = resolve(import.meta.dirname, "..");
const bundledMaven = resolve(repositoryRoot, "packages/codegen/vendor/maven");
const integrationPath = join(
  "io",
  "github",
  "thomaslaich",
  "smithyvite",
  "smithy-vite-codegen",
);
const integrationJar = join(
  bundledMaven,
  integrationPath,
  integrationVersion,
  `smithy-vite-codegen-${integrationVersion}.jar`,
);

await access(integrationJar).catch(() => {
  throw new Error(
    "The Smithy Vite integration is missing. Run `npm run build:integration` first.",
  );
});

const smithyOverride = process.env.SMITHY_VITE_PREPARE_SMITHY;
let smithyCommand;
if (smithyOverride) {
  smithyCommand = { executable: smithyOverride, arguments: [] };
} else {
  const platform = `${process.platform}-${process.arch}`;
  const platformModule = await import(
    pathToFileURL(
      resolve(repositoryRoot, `packages/smithy-cli-${platform}/index.js`),
    )
  );
  smithyCommand = platformModule.smithyCommand;
}
await access(smithyCommand.executable);

const temporaryRoot = await mkdtemp(join(tmpdir(), "smithy-vite-maven-"));
const seedRepository = join(temporaryRoot, "seed");
const resolvedRepository = join(temporaryRoot, "resolved");
const offlineCache = join(temporaryRoot, "offline-cache");

async function runBuild({ repositories, cache, output, configName }) {
  const configPath = join(temporaryRoot, configName);
  const config = {
    version: "1.0",
    sources: [resolve(repositoryRoot, "examples/vite-react/model")],
    maven: {
      repositories,
      dependencies: codegenDependencies,
    },
    plugins: {
      "typescript-client-codegen": {
        service: "example.weather#Weather",
        package: "@smithy-vite/toolchain-verification",
        packageVersion: "0.0.0",
        private: true,
      },
    },
  };
  await writeFile(configPath, `${JSON.stringify(config, null, 2)}\n`);
  try {
    await execFileAsync(
      smithyCommand.executable,
      [
        ...smithyCommand.arguments,
        "build",
        "--config",
        configPath,
        "--output",
        output,
      ],
      {
        cwd: repositoryRoot,
        env: {
          ...process.env,
          SMITHY_MAVEN_CACHE: cache,
          SMITHY_VITE_TANSTACK_FRAMEWORK: "react",
        },
        maxBuffer: 10 * 1024 * 1024,
      },
    );
  } catch (error) {
    const details = [error.stdout, error.stderr].filter(Boolean).join("\n");
    throw new Error(
      `Unable to prepare the bundled Maven repository${details ? `:\n${details}` : ""}`,
      { cause: error },
    );
  }
}

async function listFiles(root, current = root) {
  const files = [];
  for (const entry of await readdir(current, { withFileTypes: true })) {
    const path = join(current, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await listFiles(root, path)));
    } else if (entry.isFile()) {
      files.push(relative(root, path));
    }
  }
  return files;
}

try {
  await mkdir(join(seedRepository, dirname(integrationPath)), {
    recursive: true,
  });
  await cp(
    join(bundledMaven, integrationPath),
    join(seedRepository, integrationPath),
    { recursive: true },
  );

  console.log("Resolving the pinned Smithy TypeScript Maven closure");
  await runBuild({
    repositories: [
      { id: "smithy-vite", url: pathToFileURL(seedRepository).href },
      { id: "central", url: "https://repo.maven.apache.org/maven2" },
    ],
    cache: resolvedRepository,
    output: join(temporaryRoot, "online-output"),
    configName: "online-smithy-build.json",
  });

  for (const entry of await readdir(bundledMaven)) {
    if (entry === ".gitignore" || entry === ".npmignore") continue;
    await rm(join(bundledMaven, entry), { recursive: true, force: true });
  }
  for (const entry of await readdir(resolvedRepository)) {
    await cp(join(resolvedRepository, entry), join(bundledMaven, entry), {
      recursive: true,
    });
  }

  const artifactFiles = (await listFiles(bundledMaven))
    .filter(
      (file) =>
        file !== ".gitignore" &&
        file !== ".npmignore" &&
        file !== "manifest.json",
    )
    .sort();
  const artifacts = [];
  for (const file of artifactFiles) {
    const contents = await readFile(join(bundledMaven, file));
    artifacts.push({
      path: file,
      size: (await stat(join(bundledMaven, file))).size,
      sha256: createHash("sha256").update(contents).digest("hex"),
    });
  }
  await writeFile(
    join(bundledMaven, "manifest.json"),
    `${JSON.stringify(
      {
        schemaVersion: 1,
        smithyTypescriptVersion,
        integrationVersion,
        dependencies: codegenDependencies,
        artifacts,
      },
      null,
      2,
    )}\n`,
  );

  console.log("Verifying generation with the bundled repository only");
  await runBuild({
    repositories: [
      {
        id: "smithy-vite-bundled",
        url: pathToFileURL(bundledMaven).href,
      },
    ],
    cache: offlineCache,
    output: join(temporaryRoot, "offline-output"),
    configName: "offline-smithy-build.json",
  });

  const jars = artifactFiles.filter((file) => file.endsWith(".jar")).length;
  console.log(
    `Prepared and verified ${jars} bundled Maven JARs for smithy-typescript ${smithyTypescriptVersion}`,
  );
} finally {
  await rm(temporaryRoot, { recursive: true, force: true });
}
