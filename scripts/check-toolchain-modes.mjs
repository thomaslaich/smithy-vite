import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import {
  access,
  cp,
  mkdir,
  mkdtemp,
  readFile,
  rm,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { strToU8, zipSync } from "fflate";
import { generate } from "../packages/codegen/src/index.js";

const repositoryRoot = resolve(import.meta.dirname, "..");
const temporaryRoot = await mkdtemp(join(tmpdir(), "smithy-vite-toolchains-"));
const modelSource = resolve(repositoryRoot, "examples/vite-react/model");
const bundledMaven = resolve(repositoryRoot, "packages/codegen/vendor/maven");
const platformModule = await import(
  pathToFileURL(
    resolve(
      repositoryRoot,
      `packages/smithy-cli-${process.platform}-${process.arch}/index.js`,
    ),
  )
);

async function readGeneratedConfig(root) {
  return JSON.parse(
    await readFile(join(root, ".smithy-vite/smithy-build.json"), "utf8"),
  );
}

// Publishes a contract-only model artifact into a local file: Maven repository,
// the same shape a real registry would serve for a model published from
// another repository.
async function publishContractFixture(repositoryPath) {
  const model = `$version: "2"

namespace example.imported

use aws.protocols#restJson1

@restJson1
service ImportedWeather {
    version: "2026-08-24"
    operations: [GetImportedCity]
}

@readonly
@http(method: "GET", uri: "/imported-cities/{cityId}", code: 200)
operation GetImportedCity {
    input := {
        @required
        @httpLabel
        cityId: String
    }

    output := {
        @required
        name: String
    }
}
`;
  const jar = zipSync({
    "META-INF/smithy/manifest": strToU8("imported.smithy\n"),
    "META-INF/smithy/imported.smithy": strToU8(model),
  });
  const pom = `<?xml version="1.0" encoding="UTF-8"?>
<project xmlns="http://maven.apache.org/POM/4.0.0">
  <modelVersion>4.0.0</modelVersion>
  <groupId>example.contracts</groupId>
  <artifactId>weather-model</artifactId>
  <version>1.0.0</version>
</project>
`;
  const artifactDirectory = join(
    repositoryPath,
    "example/contracts/weather-model/1.0.0",
  );
  await mkdir(artifactDirectory, { recursive: true });
  for (const [name, content] of [
    ["weather-model-1.0.0.jar", jar],
    ["weather-model-1.0.0.pom", pom],
  ]) {
    await writeFile(join(artifactDirectory, name), content);
    await writeFile(
      join(artifactDirectory, `${name}.sha1`),
      createHash("sha1").update(content).digest("hex"),
    );
  }
}

try {
  const bundledRoot = join(temporaryRoot, "bundled");
  await cp(modelSource, join(bundledRoot, "model"), { recursive: true });
  await generate({
    root: bundledRoot,
    sources: ["model"],
    service: "example.weather#Weather",
    output: "generated",
  });
  const bundledConfig = await readGeneratedConfig(bundledRoot);
  assert.deepEqual(bundledConfig.maven.repositories, [
    {
      id: "smithy-vite-bundled",
      url: pathToFileURL(bundledMaven).href,
    },
  ]);
  assert.deepEqual(bundledConfig.plugins["typescript-codegen"].modes, [
    "client",
  ]);
  await assert.rejects(
    access(join(bundledRoot, "generated/src/tanstack-query.ts")),
  );

  const contractRepositoryPath = join(temporaryRoot, "contract-repository");
  await publishContractFixture(contractRepositoryPath);
  const contractRepository = {
    id: "contract-fixture-repository",
    url: pathToFileURL(contractRepositoryPath).href,
  };
  const contractDependency = "example.contracts:weather-model:1.0.0";

  const dependencyRoot = join(temporaryRoot, "dependency");
  await mkdir(dependencyRoot, { recursive: true });
  await generate({
    root: dependencyRoot,
    sources: [],
    service: "example.imported#ImportedWeather",
    output: "generated",
    maven: {
      repositories: [contractRepository],
      dependencies: [contractDependency],
    },
  });
  const dependencyConfig = await readGeneratedConfig(dependencyRoot);
  assert.deepEqual(
    dependencyConfig.maven.repositories.map((repository) => repository.id),
    ["smithy-vite-bundled", contractRepository.id],
  );
  assert.equal(dependencyConfig.maven.dependencies.at(-1), contractDependency);
  await access(join(dependencyRoot, "generated/src/ImportedWeatherClient.ts"));

  await assert.rejects(
    generate({
      root: dependencyRoot,
      sources: [],
      service: "example.imported#ImportedWeather",
      output: "generated",
      maven: { dependencies: [contractDependency] },
    }),
    /requires at least one maven\.repositories entry/,
  );

  const externalRoot = join(temporaryRoot, "external");
  await cp(modelSource, join(externalRoot, "model"), { recursive: true });
  const externalRepository = {
    id: "explicit-external-test-repository",
    url: pathToFileURL(bundledMaven).href,
  };
  await generate({
    root: externalRoot,
    sources: ["model"],
    service: "example.weather#Weather",
    output: "generated",
    toolchain: {
      mode: "external",
      smithy: platformModule.smithyCommand.executable,
      smithyArguments: platformModule.smithyCommand.arguments,
      maven: { repositories: [externalRepository] },
    },
    maven: {
      repositories: [contractRepository],
      dependencies: [contractDependency],
    },
  });
  const externalConfig = await readGeneratedConfig(externalRoot);
  assert.deepEqual(externalConfig.maven.repositories, [
    externalRepository,
    contractRepository,
  ]);
  assert.equal(externalConfig.maven.dependencies.at(-1), contractDependency);

  const serviceModelSource = resolve(
    repositoryRoot,
    "examples/react-node/model",
  );
  const serverRoot = join(temporaryRoot, "server");
  await cp(serviceModelSource, join(serverRoot, "model"), { recursive: true });
  await generate({
    root: serverRoot,
    mode: "server",
    sources: ["model"],
    service: "example.weather#Weather",
    output: "generated",
    disableDefaultValidation: true,
  });
  const serverConfig = await readGeneratedConfig(serverRoot);
  assert.deepEqual(serverConfig.plugins["typescript-codegen"].modes, [
    "server",
  ]);
  await access(join(serverRoot, "generated/src/server/WeatherService.ts"));

  const typesRoot = join(temporaryRoot, "types");
  await cp(serviceModelSource, join(typesRoot, "model"), { recursive: true });
  await generate({
    root: typesRoot,
    mode: "types",
    sources: ["model"],
    closure: "example.weather#weatherTypes",
    output: "generated",
  });
  const typesConfig = await readGeneratedConfig(typesRoot);
  assert.deepEqual(typesConfig.plugins["typescript-codegen"].modes, ["types"]);
  await access(join(typesRoot, "generated/src/models/models_0.ts"));

  console.log(
    "bundled and external toolchains respected their boundaries; model dependencies resolved from an additional repository; client, server, and types modes generated their expected artifacts.",
  );
} finally {
  await rm(temporaryRoot, { recursive: true, force: true });
}
