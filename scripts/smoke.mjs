import assert from "node:assert/strict";
import { resolve } from "node:path";
import { createServer } from "vite";

for (const framework of ["react", "preact", "solid"]) {
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

    const generated = await server.ssrLoadModule("/src/generated/weather/src/index.ts");
    const client = new generated.WeatherClient({ endpoint: `http://127.0.0.1:${address.port}` });
    const api = generated.createWeatherApi(client);
    const options = api.getCity.queryOptions({ cityId: "zrh" });
    const result = await options.queryFn({ signal: new AbortController().signal });

    assert.equal(result.name, "Zurich");
    assert.equal(result.temperatureCelsius, 21.5);
    console.log(`${framework}: generated TanStack query options called the modeled operation successfully.`);
  } finally {
    await server.close();
  }
}
