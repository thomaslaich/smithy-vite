import assert from "node:assert/strict";
import { access, cp, mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
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
  });
  const externalConfig = await readGeneratedConfig(externalRoot);
  assert.deepEqual(externalConfig.maven.repositories, [externalRepository]);

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
    "bundled and external toolchains respected their boundaries; client, server, and types modes generated their expected artifacts.",
  );
} finally {
  await rm(temporaryRoot, { recursive: true, force: true });
}
