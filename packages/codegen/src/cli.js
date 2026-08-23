#!/usr/bin/env node
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { generate } from "./index.js";

const configFlag = process.argv.indexOf("--config");
const configPath = resolve(
  configFlag === -1 ? "smithy-vite.json" : process.argv[configFlag + 1],
);
const options = JSON.parse(await readFile(configPath, "utf8"));
const result = await generate({ root: process.cwd(), ...options });
console.log(
  `Generated ${result.generatedPackageJson.name} in ${result.output}`,
);
