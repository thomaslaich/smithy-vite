import assert from "node:assert/strict";
import { resolve } from "node:path";
import { createServer } from "vite";

const server = await createServer({
  root: resolve("examples/vite-react"),
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
  const options = generated.getCityQueryOptions(client, { cityId: "zrh" });
  const result = await options.queryFn({ signal: new AbortController().signal });

  assert.equal(result.name, "Zurich");
  assert.equal(result.temperatureCelsius, 21.5);
  console.log("Generated TanStack query options called the modeled weather operation successfully.");
} finally {
  await server.close();
}
