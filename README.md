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

## Standalone code generation

Vite is optional. Node services, libraries, scripts, and monorepos can install
only the hermetic generator:

```sh
npm install --save-dev @smithy-vite/codegen
```

Create `smithy-vite.json`:

```json
{
  "mode": "client",
  "sources": ["model"],
  "service": "example.weather#Weather",
  "output": "src/generated/weather-client",
  "packageName": "@example/weather-client"
}
```

Then add generation to the project's existing npm workflow:

```json
{
  "scripts": {
    "generate": "smithy-vite"
  }
}
```

```sh
npm run generate
```

The standalone CLI supports the three modes provided by `smithy-typescript`:

| Mode     | Generates                                          | Selector  |
| -------- | -------------------------------------------------- | --------- |
| `client` | A client for a Smithy service                      | `service` |
| `server` | Typed service handlers and protocol serialization  | `service` |
| `types`  | Data shapes and schemas from a model shape closure | `closure` |

For example, a Node service can generate its server scaffold without Vite:

```json
{
  "mode": "server",
  "sources": ["model"],
  "service": "example.weather#Weather",
  "output": "src/generated/weather-server",
  "packageName": "@example/weather-server"
}
```

Client generation from the standalone CLI is framework-neutral by default.
Add `"tanstackQuery": { "framework": "react" }` only when the generated
client should include a TanStack adapter. The Vite plugin continues to default
to React for its browser-oriented workflow.

The [`examples/react-node`](./examples/react-node) application demonstrates the
complete split: Vite generates and watches the React client, while a separate
`smithy-vite` npm script generates the Smithy server handlers consumed by a
plain `node:http` service. Both sides use the same model; the Node service does
not run Vite.

From a source checkout:

```sh
npm run generate:react-node
npm run dev:react-node
```

The example's smoke test starts the generated server on an ephemeral port and
calls it through the generated client:

```sh
npm run smoke --workspace @smithy-vite/example-react-node
```

## Develop this repository

Requirements for working from a source checkout are Node.js 20.19 or newer,
JDK 17, and Gradle. [devenv](https://devenv.sh/getting-started/) provides the
pinned Node.js 24, JDK 17, and Gradle toolchain:

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
npm run prepare:maven
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

The same validation used by GitHub Actions is available locally:

```sh
just ci
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

## Architecture

- `@smithy-vite/codegen` selects a platform-specific optional npm package,
  writes an ephemeral `smithy-build.json`, and invokes its bundled Smithy CLI
  from Node.
- `@smithy-vite/codegen` includes the complete pinned Maven closure for
  `smithy-typescript` and the Smithy Vite integration. The default build uses
  that file repository exclusively.
- Client, server, and types generation use the unified `typescript-codegen`
  plugin. The optional integration emits framework-native TanStack query and
  mutation keys, option factories, a typed service-client provider and facade,
  and named helpers for client mode.
- `@smithy-vite/plugin` runs generation for development and production builds,
  watches model sources, and selects the browser runtime configuration from the
  upstream generated client.

The integration JAR and its complete local Maven repository are generated build
outputs, not committed files. Build and verify them before running from source
or packing the `@smithy-vite/codegen` npm package:

```sh
npm run build:integration
npm run prepare:maven
```

The command uses the Gradle and JDK supplied by devenv, or compatible tools on
`PATH`. `prepare:maven` resolves the pinned closure once, records SHA-256
digests, and proves it by generating again with only the local repository.
Published npm packages include that verified closure, so package consumers do
not need Gradle, a JDK, Maven, or network access during generation.

The platform packages are prepared for publishing from checksum-verified
official Smithy archives. Prepare every supported package with:

```sh
npm run prepare:cli -- --platform all
```

See [PLAN.md](./PLAN.md) for the intended product and remaining milestones.

## CI and releases

Pull requests and pushes to `main` run `devenv shell -- just ci`. That workflow
starts from `npm ci`, prepares the current platform CLI and hermetic Maven
closure, checks formatting, exercises both toolchain modes, generates and
type-checks every framework example, builds them, runs live smoke calls, and
validates the publishable package contents.

Publishing a GitHub Release triggers the release workflow. Its tag supplies the
version for all seven npm packages and the Maven integration. The workflow
prepares every platform package, runs the complete validation suite, packs and
uploads all npm tarballs, and only then starts publishing to Maven Central and
npm in dependency order.

The release workflow expects Maven Central credentials and signing secrets named
`MAVEN_CENTRAL_USERNAME`, `MAVEN_CENTRAL_PASSWORD`, `MAVEN_GPG_PRIVATE_KEY`, and
`MAVEN_GPG_PASSPHRASE`. npm publishing uses
[trusted publishing](https://docs.npmjs.com/trusted-publishers/) through
`release.yml`; `NPM_TOKEN` can be supplied while initially bootstrapping packages
that do not yet have a trusted publisher configured.
