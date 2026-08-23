<script setup lang="ts">
import { useQueryClient } from "@tanstack/vue-query";
import {
  getCityQueryKey,
  useGetCityQuery,
  useUpdateCityMutation,
} from "./generated/weather/src";

const queryClient = useQueryClient();
const { data, status } = useGetCityQuery({ cityId: "zrh" });
const { isPending: isSaving, mutate } = useUpdateCityMutation({
  onSuccess: (updatedCity, input) => {
    queryClient.setQueryData(
      getCityQueryKey({ cityId: input.cityId }),
      updatedCity,
    );
  },
});
</script>

<template>
  <main>
    <h1>smithy-vite + Vue</h1>
    <pre>{{ JSON.stringify(data ?? { status }, null, 2) }}</pre>
    <button
      :disabled="isSaving"
      @click="mutate({ cityId: 'zrh', temperatureCelsius: 22.5 })"
    >
      {{ isSaving ? "Saving…" : "Set temperature to 22.5 °C" }}
    </button>
  </main>
</template>
