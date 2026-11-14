import { sep, resolve } from "node:path";
import { generate } from "@smithy-vite/codegen";
import { normalizePath } from "vite";
import { coalesce } from "./regenerate.js";

// Editors often emit several watcher events for one save (write, rename,
// change), so wait briefly for them to settle before regenerating.
const settleMilliseconds = 100;

export function smithyVite(options) {
  if (options.mode && options.mode !== "client") {
    throw new Error("The Vite plugin only supports client generation.");
  }

  let root = process.cwd();
  let generatedSource = resolve(root, options.output, "src");
  // Directories that generation writes: the output, the staging directory it
  // is swapped in from, and the working directory holding Smithy's build.
  let ownedDirectories = [];
  const ownDirectories = (projectRoot) => {
    const output = normalizePath(resolve(projectRoot, options.output));
    ownedDirectories = [
      output,
      `${output}.next`,
      normalizePath(resolve(projectRoot, ".smithy-vite")),
    ];
  };
  ownDirectories(root);
  const isGenerated = (path) => {
    const normalized = normalizePath(path);
    return ownedDirectories.some(
      (directory) =>
        normalized === directory || normalized.startsWith(`${directory}/`),
    );
  };
  const regenerate = coalesce(() =>
    generate({
      root,
      ...options,
      tanstackQuery: options.tanstackQuery ?? { framework: "react" },
    }),
  );

  return {
    name: "smithy-vite",
    enforce: "pre",
    config(config) {
      // Regeneration rewrites these directories, including their tsconfig
      // files, and Vite answers each of those file events with its own full
      // reload. The plugin reloads once per regeneration instead.
      ownDirectories(resolve(config.root ?? process.cwd()));
      return { server: { watch: { ignored: [isGenerated] } } };
    },
    configResolved(config) {
      root = config.root;
      ownDirectories(root);
      generatedSource = resolve(root, options.output, "src");
    },
    resolveId(source, importer) {
      if (
        source === "./runtimeConfig" &&
        importer?.startsWith(generatedSource)
      ) {
        return resolve(generatedSource, "runtimeConfig.browser.ts");
      }
    },
    async buildStart() {
      await regenerate();
    },
    configureServer(server) {
      const sourceRoots = options.sources.map((source) =>
        resolve(root, source),
      );
      server.watcher.add(sourceRoots);

      let settleTimer;
      let lastRun;
      const regenerateAndReload = async () => {
        const run = regenerate();
        // Callers that join an already queued run share its single reload.
        if (run === lastRun) return;
        lastRun = run;
        try {
          await run;
          // Vite does not watch the output, so drop its cached transforms of
          // generated modules before the page reloads and requests them again.
          const moduleGraphs = server.environments
            ? Object.values(server.environments).map(
                (environment) => environment.moduleGraph,
              )
            : [server.moduleGraph];
          for (const moduleGraph of moduleGraphs) {
            for (const [file, modules] of moduleGraph.fileToModulesMap) {
              if (!isGenerated(file)) continue;
              for (const module of modules)
                moduleGraph.invalidateModule(module);
            }
          }
          server.ws.send({ type: "full-reload" });
        } catch (error) {
          server.config.logger.error(
            error instanceof Error ? error.message : String(error),
          );
        }
      };

      server.watcher.on("all", (_event, path) => {
        if (!path.endsWith(".smithy") && !path.endsWith(".json")) return;
        if (
          !sourceRoots.some(
            (source) => path === source || path.startsWith(`${source}${sep}`),
          )
        )
          return;
        clearTimeout(settleTimer);
        settleTimer = setTimeout(regenerateAndReload, settleMilliseconds);
      });
    },
  };
}
