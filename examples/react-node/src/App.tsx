import { useQueryClient } from "@tanstack/react-query";
import {
  getCityQueryKey,
  useGetCityQuery,
  useUpdateCityMutation,
} from "./generated/weather-client/src/index";

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
      <h1>smithy-vite: React + Node</h1>
      <p>
        The browser client and Node server are generated from one Smithy model.
      </p>
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
