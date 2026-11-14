import { createRequire } from "node:module";

// versions.json is the single source of these versions: the Gradle build of the
// integration and the release scripts read it too.
const versions = createRequire(import.meta.url)("./versions.json");

export const smithyCliVersion = versions.smithyCli;
export const smithyTypescriptVersion = versions.smithyTypescript;
export const smithyLibraryVersion = versions.smithyLibrary;
export const integrationVersion = versions.integration;
export const typesCodegenDependencies = [
  `software.amazon.smithy.typescript:smithy-typescript-codegen:${smithyTypescriptVersion}`,
  `software.amazon.smithy:smithy-aws-traits:${smithyLibraryVersion}`,
];

export const codegenDependencies = [
  `software.amazon.smithy.typescript:smithy-aws-typescript-codegen:${smithyTypescriptVersion}`,
  `io.github.thomaslaich.smithyvite:smithy-vite-codegen:${integrationVersion}`,
];

export function defaultCodegenDependencies(mode) {
  return mode === "types" ? typesCodegenDependencies : codegenDependencies;
}
