import { smithyVite } from "@smithy-vite/plugin";
import { defineConfig } from "vite";
import solid from "vite-plugin-solid";

export default defineConfig({
  plugins: [
    smithyVite({
      sources: ["model"],
      service: "example.weather#Weather",
      output: "src/generated/weather",
      packageName: "@smithy-vite/example-solid-weather-client",
      tanstackQuery: {
        framework: "solid",
      },
    }),
    solid(),
    {
      name: "weather-service-mock",
      configureServer(server) {
        server.middlewares.use((request, response, next) => {
          if (request.method !== "GET" || request.url !== "/cities/zrh") {
            next();
            return;
          }

          response.setHeader("Content-Type", "application/json");
          response.end(
            JSON.stringify({
              name: "Zurich",
              temperatureCelsius: 21.5,
              humidityPercent: 58,
              windSpeedKph: 7.2,
            }),
          );
        });
      },
    },
  ],
});
