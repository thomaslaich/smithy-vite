# smithy-vite

`smithy-vite` generates type-safe browser clients and framework-native TanStack Query bindings from Smithy models as part of your Vite build.

## Why?

The official [`smithy-typescript` documentation](https://github.com/smithy-lang/smithy-typescript#using-smithy-typescript-with-gradle)
describes a Gradle workflow for generating TypeScript clients. That is a natural
fit for the Smithy and JVM ecosystem, but frontend developers generally do not
want to introduce and maintain a second build system just to generate their
client. They already have one: Vite.

`smithy-vite` makes client generation part of that existing workflow. Running
Vite generates the client, watches the model, and exposes errors where frontend
developers already expect them, while still using the official
`smithy-typescript` generator underneath.

## Getting started

Install the Vite plugin, the generated client's Smithy runtime dependencies,
and the TanStack adapter for your framework. For React:

```sh
npm install --save-dev @smithy-vite/plugin
npm install @aws-sdk/core @smithy/core @smithy/fetch-http-handler @smithy/node-http-handler @smithy/types @tanstack/react-query react react-dom tslib
```

Create a model at `model/weather.smithy`:

```smithy
$version: "2"

namespace example.weather

use aws.protocols#restJson1

@restJson1
service Weather {
    version: "2026-08-22"
    operations: [GetCity, UpdateCity]
}

@readonly
@http(method: "GET", uri: "/cities/{cityId}", code: 200)
operation GetCity {
    input := {
        @required
        @httpLabel
        cityId: String
    }

    output := {
        @required
        name: String

        @required
        temperatureCelsius: Float
    }
}

@idempotent
@http(method: "PUT", uri: "/cities/{cityId}", code: 200)
operation UpdateCity {
    input := {
        @required
        @httpLabel
        cityId: String

        @required
        temperatureCelsius: Float
    }

    output := {
        @required
        name: String

        @required
        temperatureCelsius: Float
    }
}
```

Add `smithyVite` before the React plugin in `vite.config.ts`:

```ts
import react from "@vitejs/plugin-react";
import { smithyVite } from "@smithy-vite/plugin";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [
    smithyVite({
      sources: ["model"],
      service: "example.weather#Weather",
      output: "src/generated/weather",
      packageName: "@example/weather-client",
    }),
    react(),
  ],
});
```

Create the Smithy client once and provide it alongside TanStack Query:

```tsx
// src/main.tsx
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import { WeatherClient, WeatherClientProvider } from "./generated/weather/src";

const queryClient = new QueryClient();
const weatherClient = new WeatherClient({ endpoint: window.location.origin });

createRoot(document.getElementById("root")!).render(
  <QueryClientProvider client={queryClient}>
    <WeatherClientProvider client={weatherClient}>
      <App />
    </WeatherClientProvider>
  </QueryClientProvider>,
);
```

Readonly Smithy operations get named, type-safe query helpers:

```tsx
// src/App.tsx
import { useGetCityQuery } from "./generated/weather/src";

export function App() {
  const city = useGetCityQuery({ cityId: "zrh" });

  if (city.isPending) return <p>Loading…</p>;
  if (city.isError) return <p>{city.error.message}</p>;
  return <p>{city.data.name}</p>;
}
```

Operations without `@readonly` get mutation helpers. This includes operations
marked `@idempotent`: idempotency makes repeating an operation safe, but does
not make a state-changing operation a query.

```tsx
import { useQueryClient } from "@tanstack/react-query";
import {
  getCityQueryKey,
  useUpdateCityMutation,
} from "./generated/weather/src";

export function UpdateCityButton() {
  const queryClient = useQueryClient();
  const updateCity = useUpdateCityMutation({
    onSuccess: (updatedCity, input) => {
      queryClient.setQueryData(
        getCityQueryKey({ cityId: input.cityId }),
        updatedCity,
      );
    },
  });

  return (
    <button
      disabled={updateCity.isPending}
      onClick={() =>
        updateCity.mutate({ cityId: "zrh", temperatureCelsius: 22.5 })
      }
    >
      Save
    </button>
  );
}
```

`smithy-vite` generates mutation keys and option factories as well as named
helpers, so mutations can also be configured outside components. Cache updates
and invalidation remain explicit because a Smithy operation does not generally
identify every cached query affected by its side effects.

Run `vite` as usual. The client is generated before the development server or
production build starts, and changes to the model trigger regeneration and a
full reload.

## Develop this repository

Requirements for working from a source checkout are Node.js 20.19 or newer,
JDK 17, and Gradle. [devenv](https://devenv.sh/getting-started/) provides the
pinned Node.js 22, JDK 17, and Gradle toolchain:

```sh
devenv shell
```

With [direnv](https://direnv.net/) installed, run `direnv allow` once instead
to activate that environment when entering the repository. Using devenv is not
required; the standard npm workflow continues to work with locally installed
tools.

Prepare the package for the current machine once:

```sh
npm install
npm run prepare:cli
npm run build:integration
npm run dev
```

Open <http://localhost:5173>. Vite generates the React client before starting,
and the example calls a small development-only weather-service mock through the
generated `WeatherClientProvider` and `useGetCityQuery` hook. Run the equivalent
Preact example with:

```sh
npm run dev:preact
```

Or run the Solid example with:

```sh
npm run dev:solid
```

The Vue and Angular examples are available in the same way:

```sh
npm run dev:vue
npm run dev:angular
```

Edit the active example's `model/weather.smithy` while Vite is running to
trigger regeneration and a page reload.

Other useful commands:

```sh
npm run generate
npm run typecheck
npm run build
npm run smoke
```

## Framework adapters

React is the default adapter and emits imports from `react` and
`@tanstack/react-query`. Other projects select their native adapter in the Vite
configuration:

```ts
smithyVite({
  sources: ["model"],
  service: "example.weather#Weather",
  output: "src/generated/weather",
  tanstackQuery: {
    framework: "preact",
  },
});
```

| Framework | TanStack dependency                    | Configuration                    | Example                 |
| --------- | -------------------------------------- | -------------------------------- | ----------------------- |
| React     | `@tanstack/react-query`                | Default, or `framework: "react"` | `examples/vite-react`   |
| Preact    | `@tanstack/preact-query`               | `framework: "preact"`            | `examples/vite-preact`  |
| Solid     | `@tanstack/solid-query`                | `framework: "solid"`             | `examples/vite-solid`   |
| Vue       | `@tanstack/vue-query`                  | `framework: "vue"`               | `examples/vite-vue`     |
| Angular   | `@tanstack/angular-query-experimental` | `framework: "angular"`           | `examples/vite-angular` |

Each adapter generates service-specific providers, bound API facades, named
query and mutation helpers, option factories, and cache keys. No framework-specific
`@smithy-vite/*` runtime package is required: generated code depends directly
on the selected framework and its native TanStack Query package. The
context-free option factories remain usable in loaders, SSR, prefetching, and
tests.

Solid query helpers accept either a plain input or an accessor. Use an accessor
when the input depends on a signal, for example
`useGetCityQuery(() => ({ cityId: cityId() }))`, and keep the returned query
store intact so Solid can track property access.

Vue helpers accept a plain input, ref, computed ref, or getter and retain that
input's reactivity. Install the generated service plugin next to
`VueQueryPlugin` with `app.use(provideWeatherClient(weatherClient))`.

Angular generates DI-native providers and `inject...` helpers rather than
hooks. Add `provideWeatherClient(weatherClient)` next to
`provideTanStackQuery(queryClient)`, then call helpers such as
`injectGetCityQuery` and `injectUpdateCityMutation` in an injection context.
TanStack Angular Query is currently published as an experimental package, so
applications should pin its patch version deliberately.

## Architecture

- `@smithy-vite/codegen` selects a platform-specific optional npm package,
  writes an ephemeral `smithy-build.json`, and invokes its bundled Smithy CLI
  from Node.
- The Smithy CLI resolves pinned `smithy-typescript` artifacts from Maven
  Central and loads the small integration JAR vendored with the npm package.
- The integration emits framework-native TanStack query and mutation keys,
  option factories, a typed service-client provider and facade, and named
  helpers using Smithy's model and generated symbols.
- `@smithy-vite/plugin` runs generation for development and production builds,
  watches model sources, and selects the browser runtime configuration from the
  upstream generated client.

The integration JAR and its local Maven repository are generated build outputs,
not committed files. Build them before running from source or packing the
`@smithy-vite/codegen` npm package:

```sh
npm run build:integration
```

The command uses the Gradle and JDK supplied by devenv, or compatible tools on
`PATH`. Published npm packages include the generated integration JAR, so package
consumers do not need Gradle or a JDK.

The platform packages are prepared for publishing from checksum-verified
official Smithy archives. Prepare every supported package with:

```sh
npm run prepare:cli -- --platform all
```

See [PLAN.md](./PLAN.md) for the intended product and remaining milestones.
