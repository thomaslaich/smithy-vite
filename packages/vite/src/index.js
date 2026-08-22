import { sep, resolve } from "node:path";
import { generate } from "@smithy-react/codegen";

export function smithyReact(options) {
  let root = process.cwd();
  let generatedSource = resolve(root, options.output, "src");
  let running = Promise.resolve();

  const regenerate = () => {
    running = running.catch(() => undefined).then(() => generate({ root, ...options }));
    return running;
  };

  return {
    name: "smithy-react",
    enforce: "pre",
    configResolved(config) {
      root = config.root;
      generatedSource = resolve(root, options.output, "src");
    },
    resolveId(source, importer) {
      if (source === "./runtimeConfig" && importer?.startsWith(generatedSource)) {
        return resolve(generatedSource, "runtimeConfig.browser.ts");
      }
    },
    async buildStart() {
      await regenerate();
    },
    configureServer(server) {
      const sourceRoots = options.sources.map(source => resolve(root, source));
      server.watcher.add(sourceRoots);
      server.watcher.on("all", async (_event, path) => {
        if (!path.endsWith(".smithy") && !path.endsWith(".json")) return;
        if (!sourceRoots.some(source => path === source || path.startsWith(`${source}${sep}`))) return;
        try {
          await regenerate();
          server.ws.send({ type: "full-reload" });
        } catch (error) {
          server.config.logger.error(error instanceof Error ? error.message : String(error));
        }
      });
    }
  };
}
