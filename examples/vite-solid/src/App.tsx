import { useQueryClient } from "@tanstack/solid-query";
import {
  getCityQueryKey,
  useGetCityQuery,
  useUpdateCityMutation,
} from "./generated/weather/src/index";

export function App() {
  const queryClient = useQueryClient();
  const city = useGetCityQuery({ cityId: "zrh" });
  const updateCity = useUpdateCityMutation({
    onSuccess: (updatedCity, input) => {
      queryClient.setQueryData(
        getCityQueryKey({ cityId: input.cityId }),
        updatedCity,
      );
    },
  });

  return (
    <main>
      <h1>smithy-vite + Solid</h1>
      <pre>{JSON.stringify(city.data ?? { status: city.status }, null, 2)}</pre>
      <button
        disabled={updateCity.isPending}
        onClick={() =>
          updateCity.mutate({ cityId: "zrh", temperatureCelsius: 22.5 })
        }
      >
        {updateCity.isPending ? "Saving…" : "Set temperature to 22.5 °C"}
      </button>
    </main>
  );
}
