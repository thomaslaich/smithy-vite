import { VueQueryPlugin } from "@tanstack/vue-query";
import { createApp } from "vue";
import App from "./App.vue";
import { provideWeatherClient, WeatherClient } from "./generated/weather/src";

const weatherClient = new WeatherClient({ endpoint: window.location.origin });

createApp(App)
  .use(VueQueryPlugin)
  .use(provideWeatherClient(weatherClient))
  .mount("#app");
