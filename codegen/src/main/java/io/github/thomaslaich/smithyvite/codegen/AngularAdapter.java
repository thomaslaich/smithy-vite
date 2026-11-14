package io.github.thomaslaich.smithyvite.codegen;

import software.amazon.smithy.typescript.codegen.Dependency;
import software.amazon.smithy.typescript.codegen.TypeScriptWriter;

/** Angular: the client comes from dependency injection, and helpers are {@code inject...}. */
final class AngularAdapter extends ReactiveAdapter {

  private static final Dependency TANSTACK_QUERY =
      NpmDependency.dependency("@tanstack/angular-query-experimental", "5.102.1");
  private static final Dependency ANGULAR_CORE =
      NpmDependency.peerDependency("@angular/core", ">=19.0.0 <23.0.0");

  @Override
  Dependency tanstackQuery() {
    return TANSTACK_QUERY;
  }

  @Override
  String helperPrefix() {
    return "inject";
  }

  @Override
  String queryOptionsType() {
    return "CreateQueryOptions";
  }

  @Override
  String mutationOptionsType() {
    return "CreateMutationOptions";
  }

  @Override
  String queryResultType() {
    return "CreateQueryResult";
  }

  @Override
  String mutationResultType() {
    return "CreateMutationResult";
  }

  @Override
  void addFrameworkImports(TypeScriptWriter writer, boolean hasQueries) {
    writer.addImport("inject", null, ANGULAR_CORE);
    writer.addImport("InjectionToken", null, ANGULAR_CORE);
    writer.addTypeImport("Provider", null, ANGULAR_CORE);
  }

  @Override
  void writeQueryInputHelpers(TypeScriptWriter writer) {
    writeMaybeAccessor(writer, "(() => T)", "() => T");
  }

  @Override
  void writeClientProvider(TypeScriptWriter writer) {
    writer.write(
        """

        const $service:LClientToken = new InjectionToken<$client:L>("$service:LClient");

        export const provide$service:LClient = (client: $client:L): Provider => ({
          provide: $service:LClientToken,
          useValue: client,
        });

        export const inject$service:LClient = () => inject($service:LClientToken);\
        """);
  }

  @Override
  void writeApiAccessor(TypeScriptWriter writer) {
    writer.write(
        """
        export const inject$service:LApi = () =>
          create$service:LApi(inject$service:LClient());\
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
}
