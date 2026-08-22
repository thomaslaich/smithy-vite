import { useQuery } from "@tanstack/react-query";
import {
  WeatherClient,
  getCityQueryOptions,
} from "./generated/weather/src/index";

const client = new WeatherClient({ endpoint: window.location.origin });

export function App() {
  const city = useQuery(getCityQueryOptions(client, { cityId: "zrh" }));

  return (
    <main>
      <h1>Smithy Vite</h1>
      <pre>{JSON.stringify(city.data ?? { status: city.status }, null, 2)}</pre>
    </main>
  );
}
