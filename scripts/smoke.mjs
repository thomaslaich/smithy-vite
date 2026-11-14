import assert from "node:assert/strict";
import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { createServer } from "vite";

for (const framework of ["react", "preact", "solid", "vue", "angular"]) {
  const server = await createServer({
    root: resolve(`examples/vite-${framework}`),
    logLevel: "error",
    server: {
      host: "127.0.0.1",
      port: 0,
    },
  });

  try {
    await server.listen();
    const address = server.httpServer?.address();
    assert(address && typeof address !== "string");

    const generated = await server.ssrLoadModule(
      "/src/generated/weather/src/index.ts",
    );
    const client = new generated.WeatherClient({
      endpoint: `http://127.0.0.1:${address.port}`,
    });
    const api = generated.createWeatherApi(client);
    const options = api.getCity.queryOptions({ cityId: "zrh" });
    const result = await options.queryFn({
      signal: new AbortController().signal,
    });

    assert.equal(result.name, "Zurich");
    assert.equal(result.temperatureCelsius, 21.5);

    const mutation = api.updateCity.mutationOptions();
    const updated = await mutation.mutationFn({
      cityId: "zrh",
      temperatureCelsius: 22.5,
    });

    assert.equal(updated.name, "Zurich");
    assert.equal(updated.temperatureCelsius, 22.5);
    console.log(
      `${framework}: generated TanStack query and mutation options called modeled operations successfully.`,
    );
  } finally {
    await server.close();
  }
}

// A burst of model writes must regenerate once, reload the page once, and
// serve the regenerated code afterwards.
{
  const root = resolve("examples/vite-react");
  const server = await createServer({
    root,
    logLevel: "error",
    server: { host: "127.0.0.1", port: 0 },
  });
  const modelPath = resolve(root, "model/weather.smithy");
  const model = await readFile(modelPath, "utf8");
  const commandModule = "/src/generated/weather/src/schemas/schemas_0.ts";
  let reloads = 0;
  const send = server.ws.send.bind(server.ws);
  server.ws.send = (payload, ...rest) => {
    if (payload?.type === "full-reload") reloads += 1;
    return send(payload, ...rest);
  };

  try {
    await server.listen();
    await server.ssrLoadModule(commandModule);
    const renamed = model.replace(
      'uri: "/cities/{cityId}", code: 200)\noperation GetCity',
      'uri: "/towns/{cityId}", code: 200)\noperation GetCity',
    );
    assert.notEqual(renamed, model, "the smoke test must change the model");
    for (let write = 0; write < 5; write += 1) {
      await writeFile(modelPath, `${renamed}\n// burst ${write}\n`);
      await new Promise((resolve) => setTimeout(resolve, 5));
    }
    const deadline = Date.now() + 30_000;
    while (reloads === 0 && Date.now() < deadline) {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
    // Give any redundant regeneration time to finish and reload again.
    await new Promise((resolve) => setTimeout(resolve, 3_000));
    // File events can straddle the settle window, in which case one run is in
    // progress and one is queued; coalescing guarantees no more than that.
    assert(
      reloads <= 2,
      `a burst of model writes must reload at most twice, reloaded ${reloads} times`,
    );

    const transformed = await server.transformRequest(commandModule, {
      ssr: true,
    });
    assert.match(
      transformed.code,
      /\/towns\//,
      "the dev server must serve the regenerated module",
    );
    console.log(
      `watch: a burst of model writes regenerated, reloaded ${reloads} time(s), and served fresh code.`,
    );
  } finally {
    await writeFile(modelPath, model);
    await server.close();
  }
}
