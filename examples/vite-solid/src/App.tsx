import { useGetCityQuery } from "./generated/weather/src/index";

export function App() {
  const city = useGetCityQuery({ cityId: "zrh" });

  return (
    <main>
      <h1>smithy-vite + Solid</h1>
      <pre>{JSON.stringify(city.data ?? { status: city.status }, null, 2)}</pre>
    </main>
  );
}
