# Smithy React

An npm-native experiment for generating browser clients directly from Smithy
models with `smithy-typescript`, Vite, React, and optional TanStack Query
adapters.

This repository currently contains the Milestone 1 feasibility spike. The API
is intentionally not ready for publication.

## Run the spike

Requirements: Node.js 20.19 or newer. The example does not require a system JDK
or Gradle. While working from this source checkout before the platform packages
are published, prepare the package for the current machine once:

```sh
npm install
npm run prepare:cli
npm run dev
```

Open <http://localhost:5173>. Vite generates the client before starting, and
the example calls a small development-only weather-service mock through the
generated `WeatherClient` and generated `getCityQueryOptions` factory.

Edit `examples/vite-react/model/weather.smithy` while Vite is running to trigger
regeneration and a page reload.

Other useful commands:

```sh
npm run generate
npm run typecheck
npm run build
npm run smoke
```

## Spike architecture

- `@smithy-react/codegen` selects a platform-specific optional npm package,
  writes an ephemeral `smithy-build.json`, and invokes its bundled Smithy CLI
  from Node.
- The Smithy CLI resolves pinned `smithy-typescript` artifacts from Maven
  Central and loads the small integration JAR vendored with the npm package.
- The integration emits TanStack Query keys and query-options factories using
  Smithy's model and generated symbols.
- `@smithy-react/vite` runs generation for development and production builds,
  watches model sources, and selects the browser runtime configuration from the
  upstream generated client.

Gradle is only needed by maintainers after changing the Java integration:

```sh
npm run build:integration
```

The platform packages are prepared for publishing from checksum-verified
official Smithy archives. Prepare every supported package with:

```sh
npm run prepare:cli -- --platform all
```

See [PLAN.md](./PLAN.md) for the intended product and remaining milestones.
