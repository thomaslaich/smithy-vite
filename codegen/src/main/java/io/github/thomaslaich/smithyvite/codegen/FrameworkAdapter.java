package io.github.thomaslaich.smithyvite.codegen;

import software.amazon.smithy.typescript.codegen.Dependency;
import software.amazon.smithy.typescript.codegen.TypeScriptWriter;

/**
 * Everything that differs between the supported TanStack Query frameworks.
 *
 * <p>{@link TanStackQueryWriter} emits the framework-neutral parts of the adapter (keys, option
 * factories, the API facade) and delegates the rest here. Templates use the writer context set up
 * by {@link TanStackQueryWriter}: {@code service} and {@code client} for the whole file, plus
 * {@code op}, {@code fn}, {@code input}, {@code output}, and {@code command} inside an operation.
 */
abstract class FrameworkAdapter {

  static FrameworkAdapter forName(String name) {
    return switch (name) {
      case "react" -> ReactAdapter.REACT_ADAPTER;
      case "preact" -> ReactAdapter.PREACT_ADAPTER;
      case "solid" -> new SolidAdapter();
      case "vue" -> new VueAdapter();
      case "angular" -> new AngularAdapter();
      default ->
          throw new IllegalArgumentException("Unsupported TanStack Query framework: " + name);
    };
  }

  /** The framework's TanStack Query package. */
  abstract Dependency tanstackQuery();

  /** Prefix of helpers that read the client from the framework's context or injector. */
  String helperPrefix() {
    return "use";
  }

  String queryOptionsType() {
    return "UseQueryOptions";
  }

  String mutationOptionsType() {
    return "UseMutationOptions";
  }

  String queryResultType() {
    return "UseQueryResult";
  }

  String mutationResultType() {
    return "UseMutationResult";
  }

  /** Imports from the framework itself, beyond its TanStack Query package. */
  abstract void addFrameworkImports(TypeScriptWriter writer, boolean hasQueries);

  /** Declarations that query helpers rely on, written once before any operation. */
  void writeQueryInputHelpers(TypeScriptWriter writer) {}

  /** The provider that makes a client available, and the accessor that reads it back. */
  abstract void writeClientProvider(TypeScriptWriter writer);

  /** The accessor that binds {@code create<Service>Api} to the provided client. */
  abstract void writeApiAccessor(TypeScriptWriter writer);

  /** The type accepted as input by query helpers, wrapping {@code inputType} when reactive. */
  String queryInputType(String inputType) {
    return inputType;
  }

  /** Whether the framework's query options take the query data type as a separate parameter. */
  boolean queryOptionsTakeQueryData() {
    return false;
  }

  /** Whether {@code initialData} is excluded, because it changes the result type. */
  boolean queryOptionsOmitInitialData() {
    return false;
  }

  /** The statements of a query helper, after the client has been read into {@code client}. */
  abstract void writeQueryHookBody(TypeScriptWriter writer);

  /** The statements of a mutation helper, after the client has been read into {@code client}. */
  abstract void writeMutationHookBody(TypeScriptWriter writer);

  /** The context-based provider shared by React, Preact, and Solid. */
  static void writeContextClientProvider(
      TypeScriptWriter writer, String childrenType, String providerComponent) {
    writer.putContext("children", childrenType);
    writer.write(
        """

        const $service:LClientContext = createContext<$client:L | undefined>(undefined);

        export interface $service:LClientProviderProps {
          client: $client:L;
          children?: $children:L;
        }
        """);
    writer.write(providerComponent);
    writer.write(
        """

        export const use$service:LClient = () => {
          const client = useContext($service:LClientContext);
          if (!client) {
            throw new Error("use$service:LClient must be used within a $service:LClientProvider");
          }
          return client;
        };\
        """);
  }
}
