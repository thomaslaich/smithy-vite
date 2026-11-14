package io.github.thomaslaich.smithyvite.codegen;

import software.amazon.smithy.typescript.codegen.Dependency;
import software.amazon.smithy.typescript.codegen.TypeScriptWriter;

/** Solid: query inputs may be accessors, and the provider is a component without JSX. */
final class SolidAdapter extends ReactiveAdapter {

  private static final Dependency TANSTACK_QUERY =
      NpmDependency.dependency("@tanstack/solid-query", "^5.90.0");
  private static final Dependency SOLID =
      NpmDependency.peerDependency("solid-js", ">=1.0.0 <2.0.0");

  @Override
  Dependency tanstackQuery() {
    return TANSTACK_QUERY;
  }

  @Override
  String queryOptionsType() {
    return "QueryOptions";
  }

  @Override
  String mutationOptionsType() {
    return "MutationOptions";
  }

  @Override
  void addFrameworkImports(TypeScriptWriter writer, boolean hasQueries) {
    writer.addImport("createComponent", null, SOLID);
    writer.addImport("createContext", null, SOLID);
    writer.addImport("useContext", null, SOLID);
    if (hasQueries) {
      writer.addTypeImport("Accessor", null, SOLID);
    }
    writer.addTypeImport("JSX", null, SOLID);
  }

  @Override
  void writeQueryInputHelpers(TypeScriptWriter writer) {
    writeMaybeAccessor(writer, "Accessor<T>", "Accessor<T>");
  }

  @Override
  void writeClientProvider(TypeScriptWriter writer) {
    writeContextClientProvider(
        writer,
        "JSX.Element",
        """
        export const $service:LClientProvider = (
          props: $service:LClientProviderProps,
        ) =>
          createComponent($service:LClientContext.Provider, {
            get value() { return props.client; },
            get children() { return props.children; },
          });\
        """);
  }

  @Override
  String queryInputType(String inputType) {
    return "MaybeAccessor<" + inputType + ">";
  }

  @Override
  boolean queryOptionsOmitInitialData() {
    return true;
  }

  @Override
  String resolveInput() {
    return "resolveMaybeAccessor(input)";
  }

  @Override
  boolean inlineQueryOptions() {
    return false;
  }
}
