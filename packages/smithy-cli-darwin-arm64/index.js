import { fileURLToPath } from "node:url";

export const smithyCommand = {
  executable: fileURLToPath(new URL("./vendor/bin/smithy", import.meta.url)),
  arguments: [],
};
