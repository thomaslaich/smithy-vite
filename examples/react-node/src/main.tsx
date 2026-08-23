import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import {
  WeatherClient,
  WeatherClientProvider,
} from "./generated/weather-client/src/index";

const queryClient = new QueryClient();
const weatherClient = new WeatherClient({ endpoint: window.location.origin });

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <WeatherClientProvider client={weatherClient}>
        <App />
      </WeatherClientProvider>
    </QueryClientProvider>
  </StrictMode>,
);
