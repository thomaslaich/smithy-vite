import { access, readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { smithyCliVersion } from "../packages/codegen/src/versions.js";

const packageJson = JSON.parse(await readFile(resolve("package.json"), "utf8"));
const executable = packageJson.os.includes("win32")
  ? "vendor/bin/java.exe"
  : "vendor/bin/smithy";

try {
  await access(resolve(executable));
  await access(resolve("vendor/legal"));
  await access(resolve(`vendor/lib/smithy-cli-${smithyCliVersion}.jar`));
} catch (error) {
  throw new Error(
    `${packageJson.name} has not been prepared. Run npm run prepare:cli from the repository root.`,
    { cause: error },
  );
}
