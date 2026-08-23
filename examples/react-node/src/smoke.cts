import assert from "node:assert/strict";
import { once } from "node:events";
import { WeatherClient } from "./generated/weather-client/src/WeatherClient";
import { GetCityCommand } from "./generated/weather-client/src/commands/GetCityCommand";
import { UpdateCityCommand } from "./generated/weather-client/src/commands/UpdateCityCommand";
import { createWeatherServer } from "./server.cts";

async function main() {
  const server = createWeatherServer();
  server.listen(0, "127.0.0.1");
  await once(server, "listening");

  try {
    const address = server.address();
    assert(address && typeof address !== "string");

    const client = new WeatherClient({
      endpoint: `http://127.0.0.1:${address.port}`,
    });
    const city = await client.send(new GetCityCommand({ cityId: "zrh" }));
    assert.equal(city.name, "Zurich");
    assert.equal(city.temperatureCelsius, 21.5);

    const updated = await client.send(
      new UpdateCityCommand({
        cityId: "zrh",
        temperatureCelsius: 22.5,
      }),
    );
    assert.equal(updated.name, "Zurich");
    assert.equal(updated.temperatureCelsius, 22.5);

    console.log(
      "react-node: generated client called the generated Node server successfully.",
    );
  } finally {
    server.close();
    await once(server, "close");
  }
}

void main();
