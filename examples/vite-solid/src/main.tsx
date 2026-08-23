import { QueryClient, QueryClientProvider } from "@tanstack/solid-query";
import { render } from "solid-js/web";
import { App } from "./App";
import {
  WeatherClient,
  WeatherClientProvider,
} from "./generated/weather/src/index";

const queryClient = new QueryClient();
const weatherClient = new WeatherClient({ endpoint: window.location.origin });

render(
  () => (
    <QueryClientProvider client={queryClient}>
      <WeatherClientProvider client={weatherClient}>
        <App />
      </WeatherClientProvider>
    </QueryClientProvider>
  ),
  document.getElementById("app")!,
);
