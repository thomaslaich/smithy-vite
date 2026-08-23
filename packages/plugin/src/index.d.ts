import type { Plugin } from "vite";
import type { ClientGenerateOptions } from "@smithy-vite/codegen";

export function smithyVite(
  options: Omit<ClientGenerateOptions, "root">,
): Plugin;
