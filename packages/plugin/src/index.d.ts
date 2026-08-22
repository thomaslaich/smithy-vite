import type { Plugin } from "vite";
import type { GenerateOptions } from "@smithy-vite/codegen";

export function smithyVite(options: Omit<GenerateOptions, "root">): Plugin;
