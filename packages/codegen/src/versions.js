export const smithyCliVersion = "1.72.1";
export const smithyTypescriptVersion = "0.52.0";
export const smithyLibraryVersion = "1.72.1";
export const integrationVersion = "0.0.1-spike";
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
