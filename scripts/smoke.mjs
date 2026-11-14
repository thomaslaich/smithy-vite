import assert from "node:assert/strict";
import { resolve } from "node:path";
import { createServer, normalizePath } from "vite";

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

    const generatedSource = normalizePath(
      resolve(server.config.root, "src/generated/weather/src"),
    );
    const runtimeConfig = await server.pluginContainer.resolveId(
      "./runtimeConfig",
      `${generatedSource}/WeatherClient.ts`,
    );
    assert.equal(
      runtimeConfig?.id,
      `${generatedSource}/runtimeConfig.browser.ts`,
      "the generated client must resolve the browser runtime config",
    );

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
