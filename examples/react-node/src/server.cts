import { createServer } from "node:http";
import { convertRequest, writeResponse } from "@smithy/server-node";
import {
  getWeatherServiceHandler,
  type WeatherService,
} from "./generated/weather-server/src/server/WeatherService";

const temperatures = new Map([["zrh", 21.5]]);

function requireValue<T>(value: T | undefined, name: string): T {
  if (value === undefined) {
    throw new Error(`${name} is required`);
  }
  return value;
}

const weatherService: WeatherService<Record<string, never>> = {
  async GetCity(input) {
    const cityId = requireValue(input.cityId, "cityId");
    return {
      name: cityId === "zrh" ? "Zurich" : cityId,
      temperatureCelsius: temperatures.get(cityId) ?? 20,
      humidityPercent: 58,
      windSpeedKph: 7.2,
    };
  },
  async UpdateCity(input) {
    const cityId = requireValue(input.cityId, "cityId");
    const temperatureCelsius = requireValue(
      input.temperatureCelsius,
      "temperatureCelsius",
    );
    temperatures.set(cityId, temperatureCelsius);
    return {
      name: cityId === "zrh" ? "Zurich" : cityId,
      temperatureCelsius,
      humidityPercent: 58,
      windSpeedKph: 7.2,
    };
  },
};

const weatherHandler = getWeatherServiceHandler(
  weatherService,
  () => undefined,
);

export function createWeatherServer() {
  return createServer(async (request, response) => {
    try {
      const smithyResponse = await weatherHandler.handle(
        convertRequest(request),
        {},
      );
      writeResponse(smithyResponse, response);
    } catch (error) {
      console.error(error);
      response.statusCode = 500;
      response.end("Internal Server Error");
    }
  });
}
