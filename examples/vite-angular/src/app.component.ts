import { JsonPipe } from "@angular/common";
import { ChangeDetectionStrategy, Component, inject } from "@angular/core";
import { QueryClient } from "@tanstack/angular-query-experimental";
import {
  getCityQueryKey,
  injectGetCityQuery,
  injectUpdateCityMutation,
} from "./generated/weather/src";

@Component({
  selector: "app-root",
  standalone: true,
  imports: [JsonPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: "./app.component.html",
})
export class AppComponent {
  private readonly queryClient = inject(QueryClient);

  readonly city = injectGetCityQuery({ cityId: "zrh" });
  readonly updateCity = injectUpdateCityMutation({
    onSuccess: (updatedCity, input) => {
      this.queryClient.setQueryData(
        getCityQueryKey({ cityId: input.cityId }),
        updatedCity,
      );
    },
  });

  save() {
    this.updateCity.mutate({ cityId: "zrh", temperatureCelsius: 22.5 });
  }
}
