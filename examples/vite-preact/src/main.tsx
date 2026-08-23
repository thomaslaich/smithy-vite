import { QueryClient, QueryClientProvider } from "@tanstack/preact-query";
import { render } from "preact";
import { App } from "./App";
import {
  WeatherClient,
  WeatherClientProvider,
} from "./generated/weather/src/index";

const queryClient = new QueryClient();
const weatherClient = new WeatherClient({ endpoint: window.location.origin });

render(
  <QueryClientProvider client={queryClient}>
    <WeatherClientProvider client={weatherClient}>
      <App />
    </WeatherClientProvider>
  </QueryClientProvider>,
  document.getElementById("app")!,
);
