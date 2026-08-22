import { fileURLToPath } from "node:url";

const vendor = new URL("./vendor/", import.meta.url);

export const smithyCommand = {
  executable: fileURLToPath(new URL("bin/java.exe", vendor)),
  arguments: [
    "-XX:-UsePerfData",
    "-classpath",
    fileURLToPath(new URL("lib/*", vendor)),
    "software.amazon.smithy.cli.SmithyCli",
  ],
};
