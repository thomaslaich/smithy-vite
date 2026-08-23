import react from "@vitejs/plugin-react";
import { smithyVite } from "@smithy-vite/plugin";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [
    smithyVite({
      sources: ["model"],
      service: "example.weather#Weather",
      output: "src/generated/weather-client",
      packageName: "@smithy-vite/example-full-stack-weather-client",
      tanstackQuery: { framework: "react" },
    }),
    react(),
  ],
  server: {
    proxy: {
      "/cities": "http://127.0.0.1:3000",
    },
  },
});
