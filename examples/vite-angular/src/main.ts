import { provideZonelessChangeDetection } from "@angular/core";
import { bootstrapApplication } from "@angular/platform-browser";
import {
  provideTanStackQuery,
  QueryClient,
} from "@tanstack/angular-query-experimental";
import { AppComponent } from "./app.component";
import { provideWeatherClient, WeatherClient } from "./generated/weather/src";

const weatherClient = new WeatherClient({ endpoint: window.location.origin });

bootstrapApplication(AppComponent, {
  providers: [
    provideZonelessChangeDetection(),
    provideTanStackQuery(new QueryClient()),
    provideWeatherClient(weatherClient),
  ],
}).catch((error: unknown) => console.error(error));
