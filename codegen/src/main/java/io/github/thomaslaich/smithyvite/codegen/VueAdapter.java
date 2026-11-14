package io.github.thomaslaich.smithyvite.codegen;

import software.amazon.smithy.typescript.codegen.Dependency;
import software.amazon.smithy.typescript.codegen.TypeScriptWriter;

/** Vue: query inputs may be refs or getters, and the client is provided by an app plugin. */
final class VueAdapter extends ReactiveAdapter {

  private static final Dependency TANSTACK_QUERY =
      NpmDependency.dependency("@tanstack/vue-query", "^5.90.0");
  private static final Dependency VUE = NpmDependency.peerDependency("vue", ">=3.3.0 <4.0.0");

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
  String queryResultType() {
    return "UseQueryReturnType";
  }

  @Override
  String mutationResultType() {
    return "UseMutationReturnType";
  }

  @Override
  void addFrameworkImports(TypeScriptWriter writer, boolean hasQueries) {
    writer.addImport("inject", null, VUE);
    writer.addImport("toValue", null, VUE);
    writer.addTypeImport("App", null, VUE);
    writer.addTypeImport("InjectionKey", null, VUE);
    writer.addTypeImport("MaybeRefOrGetter", null, VUE);
    writer.addTypeImport("Plugin", null, VUE);
  }

  @Override
  void writeClientProvider(TypeScriptWriter writer) {
    writer.write(
        """

        const $service:LClientKey: InjectionKey<$client:L> = Symbol("$service:LClient");

        export const provide$service:LClient = (client: $client:L): Plugin => ({
          install(app: App) {
            app.provide($service:LClientKey, client);
          },
        });

        export const use$service:LClient = () => {
          const client = inject($service:LClientKey);
          if (!client) {
            throw new Error("use$service:LClient requires app.use(provide$service:LClient(client))");
          }
          return client;
        };\
        """);
  }

  @Override
  String queryInputType(String inputType) {
    return "MaybeRefOrGetter<" + inputType + ">";
  }

  @Override
  boolean queryOptionsTakeQueryData() {
    return true;
  }

  @Override
  String resolveInput() {
    return "toValue(input)";
  }
}
