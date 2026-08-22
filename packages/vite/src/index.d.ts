import type { Plugin } from "vite";
import type { GenerateOptions } from "@smithy-react/codegen";

export function smithyReact(options: Omit<GenerateOptions, "root">): Plugin;
