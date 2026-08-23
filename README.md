# Smithy Vite

An npm-native experiment for generating browser clients directly from Smithy
models with `smithy-typescript` and Vite, with optional framework adapters such
as TanStack React Query.

This repository currently contains the Milestone 1 feasibility spike. The API
is intentionally not ready for publication.

## Run the spike

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

While working from this source checkout before the platform packages are
published, prepare the package for the current machine once:

```sh
npm install
npm run prepare:cli
npm run build:integration
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

- `@smithy-vite/codegen` selects a platform-specific optional npm package,
  writes an ephemeral `smithy-build.json`, and invokes its bundled Smithy CLI
  from Node.
- The Smithy CLI resolves pinned `smithy-typescript` artifacts from Maven
  Central and loads the small integration JAR vendored with the npm package.
- The integration emits TanStack Query keys and query-options factories using
  Smithy's model and generated symbols.
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
