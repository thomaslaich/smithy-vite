export const platformPackageRoots = [
  "packages/smithy-cli-darwin-arm64",
  "packages/smithy-cli-darwin-x64",
  "packages/smithy-cli-linux-arm64",
  "packages/smithy-cli-linux-x64",
  "packages/smithy-cli-win32-x64",
];

export const commonPackageRoots = ["packages/codegen", "packages/plugin"];
export const publishablePackageRoots = [
  ...platformPackageRoots,
  ...commonPackageRoots,
];

export const currentPlatformPackageRoot = `packages/smithy-cli-${process.platform}-${process.arch}`;
