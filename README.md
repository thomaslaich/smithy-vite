# smithy-vite

`smithy-vite` is a hermetic npm-native Smithy TypeScript generator with Vite integration and framework-native TanStack Query adapters.

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

## Generation modes

Vite is optional. `@smithy-vite/codegen` also ships a standalone `smithy-vite`
CLI that reads the same options from a `smithy-vite.json` and supports three
modes: `client` generates a client for a `service`, `server` generates typed
service handlers, and `types` generates data shapes from a model `closure`.
Standalone client generation stays framework-neutral unless `tanstackQuery`
is configured. The [`examples/react-node`](./examples/react-node) application
shows the full split: Vite generates and watches the React client, while the
standalone CLI emits server handlers for a plain `node:http` service from the
same model.

## Consuming a published contract

The model does not have to live in the same repository as the frontend. When
the API contract is owned by another team and published as a Maven artifact
(a jar with models under `META-INF/smithy`, the standard Smithy convention),
add it with the `maven` option:

```ts
smithyVite({
  sources: [],
  service: "example.weather#Weather",
  output: "src/generated/weather",
  maven: {
    repositories: [
      { id: "releases", url: "https://maven.example.com/releases" },
    ],
    dependencies: ["example.contracts:weather-model:1.2.0"],
  },
});
```

The shapes in the artifact become part of the assembled model, so `service`
can point at a service the repository never defines locally. `sources` may be
empty, or contain local models that build on the published ones.

`maven.dependencies` are appended to the pinned codegen dependencies and
`maven.repositories` to the toolchain repositories, in both toolchain modes.
The bundled toolchain itself remains hermetic: the generator and its plugins
still come only from the bundled repository. Resolving the model
artifacts naturally contacts the configured repositories. Results are cached
in `.smithy-vite/maven-cache`, and in bundled mode at least one repository
must be configured whenever `maven.dependencies` is present.

Alternatively, a contract can stay inside the npm ecosystem entirely: publish
the `.smithy` files as an npm package and point `sources` at it, for example
`sources: ["node_modules/@example/weather-model/model"]`. This keeps
generation fully offline and version-locked through the package lockfile, and
needs no Maven registry. Prefer it when the contract only uses traits already
on the bundled classpath (the standard Smithy and AWS protocol traits); a
contract that ships custom trait definitions or validators as Java code needs
the Maven route.

## Toolchains

The default toolchain is fully bundled. `@smithy-vite/codegen` supplies the
complete pinned Maven repository, and a platform-specific optional npm package
supplies the Smithy CLI and its Java runtime. Generation emits only a local
`file:` Maven repository and does not contact Maven Central.

Advanced users can select an all-external toolchain instead. In this mode no
bundled executable or Maven artifact is consulted: `smithy-vite` invokes the
configured CLI (or `smithy` from `PATH`) and resolves every codegen plugin from
the explicitly configured repositories.

```ts
smithyVite({
  sources: ["model"],
  service: "example.weather#Weather",
  output: "src/generated/weather",
  toolchain: {
    mode: "external",
    smithy: "smithy",
    maven: {
      repositories: [
        {
          id: "releases",
          url: "https://maven.example.com/releases",
        },
        {
          id: "central",
          url: "https://repo.maven.apache.org/maven2",
        },
      ],
    },
  },
});
```

The repositories must contain the pinned `smithy-vite-codegen` integration as
well as the upstream Smithy TypeScript artifacts, either directly or through
their normal Maven transitive resolution. External mode intentionally has no
fallback to the bundled repository.

`toolchain.maven` configures where the code generator comes from, and setting
`toolchain.maven.dependencies` replaces the default codegen dependencies
entirely. Model dependencies belong in the top-level `maven` option instead,
which appends to the toolchain configuration in both modes.

## Development

The recommended way to work on this repository is with
[Nix](https://nixos.org/) and [devenv](https://devenv.sh/).

1. Install Nix (recommended: [Determinate Nix](https://determinate.systems/nix/))
   and devenv.
2. Optionally install [direnv](https://direnv.net/) and run `direnv allow` to
   activate the environment when entering the repository. Without it, run
   `devenv shell` manually.
3. Use the `just` recipes to prepare, format, and validate the repository:

```sh
just                # list all available recipes
just prepare        # install dependencies and stage the local toolchain
just fmt            # format all code
just validate       # generate, type-check, build, and test packages
just ci             # run the full CI pipeline locally
```
