# Smithy Vite plan

## Product direction

Smithy Vite should provide an npm-native, framework-neutral Vite development
experience for Smithy services. The first example and query adapter target
React, while the code generation core and Vite lifecycle remain independent of
the UI framework.

The generator must use `smithy-typescript` directly. It must not project Smithy
to OpenAPI or implement a second HTTP client. Optional framework adapters, the
first of which targets TanStack React Query, wrap the generated Smithy client.

The intended user experience is:

```sh
npm install --save-dev @smithy-vite/plugin
npm install @tanstack/react-query
```

```ts
// vite.config.ts
import { defineConfig } from "vite";
import { smithyVite } from "@smithy-vite/plugin";

export default defineConfig({
  plugins: [
    smithyVite({
      sources: ["./model"],
      service: "example.weather#Weather",
      tanstackQuery: {
        hooks: false,
      },
    }),
  ],
});
```

Running `vite` should generate a usable client, watch the Smithy model, and
report validation or generation failures through Vite. Consumers should not
need a Gradle project, a system Java installation, a separate generated-package
build, or manual Maven configuration.

## Decisions

- The GitHub repository is named `smithy-vite`.
- The product is Vite-focused and UI-framework-neutral.
- React Query is the first optional TanStack adapter; Svelte Query and Solid
  Query are compatible future directions rather than second-class use cases.
- A shared code generation core supports both build-tool integrations and a
  standalone CI command.
- `smithy-typescript` owns client types, commands, protocols, serialization,
  middleware, authentication, errors, and transports.
- Generated TanStack code wraps the `smithy-typescript` client.
- TanStack support is optional but first-class.
- Query keys and option factories are the canonical generated API.
- Named hooks are opt-in convenience wrappers over the option factories.
- Generated output is physical source code so TypeScript, editors, tests, and
  non-Vite tools can resolve it.
- Non-Vite build integrations such as Next.js and Nx are deferred until the
  core and generated API are stable.

## Package structure

The initial repository is a monorepo with two user-facing npm packages and
internal platform packages for the Smithy CLI:

```text
smithy-vite/
├── packages/
│   ├── codegen/       # @smithy-vite/codegen
│   ├── plugin/        # @smithy-vite/plugin
│   └── smithy-cli-*/  # platform-specific optional dependencies
├── codegen/
│   └── smithy-vite-codegen/  # JVM smithy-typescript integration
├── examples/
│   ├── vite-client/
│   └── vite-tanstack-query/
└── website/
```

`@smithy-vite/codegen` contains:

- The standalone CLI and programmatic API.
- Smithy CLI acquisition and invocation.
- Pinned Smithy and `smithy-typescript` versions.
- Generation configuration, caching, diagnostics, and output management.
- Optional TanStack React Query generation.

`@smithy-vite/plugin` contains:

- A thin Vite adapter over `@smithy-vite/codegen`.
- Development and production build hooks.
- Model watching and regeneration.
- Vite-compatible diagnostics.

The Vite package depends on the codegen package, so ordinary Vite users only
need to install `@smithy-vite/plugin`. TanStack generation initially remains a
codegen option rather than a separate npm package because the generator only
emits imports from the consumer's `@tanstack/react-query` dependency.

Possible future packages are:

```text
@smithy-vite/react-query
@smithy-vite/svelte-query
@smithy-vite/solid-query
@smithy-vite/nx
```

React Query generation remains a codegen option during the spike. Framework
adapters should become separate packages once their common extension contract
is understood.

## Architecture

```text
Smithy model
    │
    ▼
@smithy-vite/codegen
    │
    ├── native Smithy CLI
    │       └── smithy-typescript
    │               └── generated client, commands, inputs, and outputs
    │
    └── Smithy TypeScript integration
            └── selected framework adapter
                    └── query keys, query options, mutation options,
                        pagination, and optional framework conveniences

@smithy-vite/plugin
    └── invokes and watches the shared generator during Vite development/build
```

The TanStack generator should be implemented as a `smithy-typescript`
integration with access to the Smithy model and generated symbols. It should not
inspect, parse, or rewrite emitted TypeScript.

## Generated API

The lowest-level API remains the upstream Smithy client:

```ts
const result = await client.send(new GetCityCommand(input));
```

The standard TanStack output provides keys and option factories:

```ts
getCityQueryKey(input);
getCityQueryOptions(client, input);
createCityMutationOptions(client);
listCitiesInfiniteQueryOptions(client, input);
```

Typical usage is:

```ts
const city = useQuery(getCityQueryOptions(client, { cityId }));
const createCity = useMutation(createCityMutationOptions(client));
```

An optional client-bound facade may provide:

```ts
const api = useWeatherApi();

const city = useQuery(api.getCity.queryOptions({ cityId }));
const createCity = useMutation(api.createCity.mutationOptions());
```

When named hooks are enabled:

```ts
const city = useGetCityQuery({ cityId });
const createCity = useCreateCityMutation();
```

Named hooks must delegate to option factories so query keys and execution logic
have a single implementation. Explicit suffixes such as `Query`, `Mutation`,
and `InfiniteQuery` are preferred over ambiguous names.

## Smithy-to-TanStack semantics

- Operations with `@readonly` generate query artifacts.
- Other request/response operations generate mutation artifacts.
- `@idempotent` does not imply a query.
- Operations with `@readonly` and `@paginated` generate infinite-query
  artifacts using the modeled input and output tokens.
- Configuration can override classification for exceptional operations.
- TanStack's `AbortSignal` is forwarded through the Smithy request options.
- Query keys include a stable service identifier, operation identifier, and
  normalized input.
- Endpoint, tenant, or authentication scope must be representable in query keys
  to prevent cache reuse across incompatible client contexts.
- Cache invalidation is not inferred automatically. It requires application
  configuration or an explicit custom trait because Smithy generally does not
  model enough domain behavior to infer it safely.
- Streaming operations require separate design and must not be forced into
  ordinary query or mutation hooks.

## Milestone 1: feasibility spike

Status: implemented and validated on macOS ARM64 on 2026-08-22.

Build the smallest end-to-end prototype before committing to the final package
layout.

1. Invoke the standalone native Smithy CLI from Node.
2. Resolve a pinned `smithy-typescript` generator without Gradle.
3. Load a minimal custom `smithy-typescript` integration.
4. Generate a client from a small Smithy model.
5. Import the generated client from a minimal Vite React application.
6. Generate one query-options function that calls a generated command.
7. Regenerate after changing a `.smithy` file.

The spike must answer:

- Whether to bundle native Smithy CLI distributions as optional dependencies or
  download and checksum them on demand.
- How Maven artifacts and their transitive dependencies are pinned and cached.
- Where the upstream generated package lives.
- How generated sources and their runtime npm dependencies are resolved by Vite,
  TypeScript, and editors.
- How an ephemeral or user-owned `smithy-build.json` is constructed.
- Which `smithy-typescript` integration API is sufficiently stable for emitting
  the adapter.

Exit criterion: a clean checkout can install npm dependencies, run the Vite
application, call the generated client, and regenerate after a model edit
without Gradle or system Java.

### Milestone 1 findings

Packaging decision after the spike: replace the on-demand CLI download with
platform-specific optional npm packages in Milestone 2. The download-based
implementation remains in the Milestone 1 commit as validated feasibility
evidence, not as the intended release architecture.

The platform-package implementation uses one package for each supported Node
OS/architecture tuple. `@smithy-vite/codegen` resolves an exact optional
dependency and never downloads tools during installation or generation. A
maintainer-only preparation script downloads the official archives, verifies
their pinned checksums, and stages complete distributions—including their legal
files—for npm publishing.

- The original spike downloaded Smithy CLI 1.73.0 on demand and verified its
  SHA-256 digest. That proved the distribution's bundled Java runtime removes
  the system-Java requirement. The current implementation packages the same
  verified distribution through platform-specific optional npm dependencies;
  `SMITHY_VITE_SMITHY` remains an explicit development override.
- `smithy-typescript` and its AWS protocol integration are resolved directly by
  the Smithy CLI from Maven Central at pinned version 0.52.0. Consumers do not
  need Maven or Gradle configuration.
- The custom `TypeScriptIntegration` is built once by maintainers and included
  in `@smithy-vite/codegen` as a tiny file-based Maven repository. Gradle is
  not invoked during npm installation, generation, or a Vite build.
- `@smithy-vite/codegen` creates `.smithy-vite/smithy-build.json`; it is an
  implementation detail rather than a user-owned configuration file.
- Upstream output is copied atomically to the configured physical source
  directory. The spike uses `src/generated/weather`, which is directly visible
  to Vite, TypeScript, and editors.
- The `TypeScriptIntegration.customize(TypeScriptCodegenContext)` hook provides
  the model, settings, generated symbols, and writer delegator needed to emit
  adapters without parsing generated TypeScript. The API is marked unstable
  upstream, so compatibility tests are required before dependency updates.
- Raw generated source needs special treatment in Vite: the upstream
  `package.json` browser mapping refers to compiled `dist-es` files. The Vite
  adapter therefore resolves `runtimeConfig` to `runtimeConfig.browser.ts` so
  Node HTTP modules do not enter the browser bundle.
- The generated package declares its exact npm runtime dependencies. The spike
  mirrors them in the example application. Milestone 2 must choose and automate
  a package-manager-independent dependency strategy rather than requiring users
  to copy that list.
- Watch regeneration was verified by adding modeled output members while the
  Vite development server was running and observing the regenerated TypeScript.
  Debouncing, last-valid-output behavior, and polished diagnostics remain
  Milestone 3 work.
- The Vite example includes a development-only mock weather endpoint. It proves
  an actual browser request/response path but is not a generated Smithy server
  and is not part of the proposed library API.

## Milestone 2: deterministic generation core

Implement:

- A typed configuration API shared by the CLI and integrations.
- `smithy-vite generate` and `smithy-vite check` commands.
- Tool and generator version pinning.
- Verification of platform-package contents and upstream archive integrity.
- Offline caches with understandable invalidation behavior.
- A generation key derived from the model closure, configuration, dependencies,
  and tool versions.
- Serialized generation so concurrent build hooks cannot corrupt output.
- Atomic replacement of generated output.
- Actionable validation, dependency, protocol, and generation diagnostics.
- A stable generated barrel export.

Exit criterion: repeated generation is deterministic, cached no-op generation
is fast, invalid models do not partially replace valid output, and CI can verify
that generated output is current.

## Milestone 3: Vite integration

Implement:

- Generation before the development server becomes ready.
- Generation before production builds.
- Watching the complete Smithy source and dependency closure.
- Debounced and serialized regeneration.
- Retention of the last valid generated client after temporary model errors.
- Clear development-server diagnostics or an error overlay.
- Correct invalidation or reload behavior after successful regeneration.
- Configuration-file watching where Vite permits it.

Exit criterion: editing a model updates available TypeScript types during Vite
development, and an invalid model produces a useful error without destroying the
last valid client.

## Milestone 4: TanStack React Query integration

Implement:

- Stable query-key factories.
- Query-options factories for `@readonly` operations.
- Mutation-options factories for other operations.
- `AbortSignal` propagation.
- Infinite-query options from `@paginated`.
- Client injection and an optional React provider/facade.
- Classification and naming overrides.
- Optional named query, mutation, and infinite-query hooks.
- Useful generated types for extending options without overriding internal
  `queryKey` or `queryFn` accidentally.

Exit criterion: generated artifacts work for component queries, mutations,
prefetching, invalidation, router loaders, SSR preparation, and tests without
requiring named hooks.

## Milestone 5: verification and release

Add:

- Golden-file tests for generated TypeScript.
- Smithy trait, error, pagination, and protocol fixtures.
- Vite development and production integration tests.
- Browser-level request and cancellation tests.
- Watch-mode invalid-model and recovery tests.
- Supported Node, Vite, React, TanStack Query, and operating-system coverage.
- Offline-generation and corrupted-cache tests.
- Compatibility tests against pinned and candidate `smithy-typescript` updates.
- A five-minute Vite React quickstart.
- Client-only, TanStack-options, and named-hook examples.
- Authentication, client lifetime, SSR, cache scope, and generated-code policy
  documentation.

Publish a prerelease and validate it in at least one real small application
before stabilizing the public configuration API.

## MVP acceptance criteria

A new Vite React application can:

1. Install `@smithy-vite/plugin` from npm.
2. Point the plugin at local Smithy sources and a service shape.
3. Run `vite` and immediately import a generated client.
4. Enable TanStack React Query generation with one configuration block.
5. Receive regenerated types after editing the model.
6. See useful Smithy validation failures during development.
7. Run the same generation deterministically in CI.

The MVP requires no Gradle project, system Java installation, separate generated
package build, or manual Maven setup.

## Deferred scope

- Next.js integration and React Server Component behavior.
- Nx task inference and caching integration.
- Framework adapters beyond the initial React Query integration.
- Automatic mutation invalidation.
- Optimistic-update generation.
- A general plugin marketplace.
- Streaming-operation React abstractions.
- Publishing generated clients as independent npm packages.

After the prerelease, feedback should determine whether the next integration is
Next.js, Nx, or another TanStack framework.

## Reference implementations

- [`smithy-typescript`](https://github.com/smithy-lang/smithy-typescript) is the
  underlying TypeScript client generator.
- [Hey API](https://heyapi.dev/docs/openapi/typescript/plugins/tanstack-query)
  is the closest OpenAPI-based developer-experience benchmark.
- [`@aws/nx-plugin`](https://awslabs.github.io/nx-plugin-for-aws/en/guides/connection/react-smithy/)
  demonstrates Nx-orchestrated Smithy-to-OpenAPI client and TanStack generation.
  Its orchestration and generated API are useful references, but Smithy Vite
  should use `smithy-typescript` directly and should not require Nx or an OpenAPI
  projection.
