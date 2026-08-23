import preact from "@preact/preset-vite";
import { defineConfig } from "vite";
import { smithyVite } from "@smithy-vite/plugin";

export default defineConfig({
  plugins: [
    smithyVite({
      sources: ["model"],
      service: "example.weather#Weather",
      output: "src/generated/weather",
      packageName: "@smithy-vite/example-preact-weather-client",
      tanstackQuery: {
        framework: "preact",
      },
    }),
    preact(),
    {
      name: "weather-service-mock",
      configureServer(server) {
        server.middlewares.use((request, response, next) => {
          if (request.url !== "/cities/zrh") {
            next();
            return;
          }

          const temperatureCelsius = request.method === "PUT" ? 22.5 : 21.5;
          if (request.method !== "GET" && request.method !== "PUT") {
            next();
            return;
          }

          response.setHeader("Content-Type", "application/json");
          response.end(
            JSON.stringify({
              name: "Zurich",
              temperatureCelsius,
              humidityPercent: 58,
              windSpeedKph: 7.2,
            }),
          );
        });
      },
    },
  ],
});
