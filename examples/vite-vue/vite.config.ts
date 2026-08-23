import vue from "@vitejs/plugin-vue";
import { smithyVite } from "@smithy-vite/plugin";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [
    smithyVite({
      sources: ["model"],
      service: "example.weather#Weather",
      output: "src/generated/weather",
      packageName: "@smithy-vite/example-vue-weather-client",
      tanstackQuery: {
        framework: "vue",
      },
    }),
    vue(),
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
