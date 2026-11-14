package io.github.thomaslaich.smithyvite.codegen;

import java.nio.file.Paths;
import java.util.List;
import software.amazon.smithy.codegen.core.Symbol;
import software.amazon.smithy.codegen.core.SymbolProvider;
import software.amazon.smithy.model.shapes.OperationShape;
import software.amazon.smithy.model.shapes.ServiceShape;
import software.amazon.smithy.typescript.codegen.TypeScriptWriter;
import software.amazon.smithy.utils.StringUtils;

/**
 * Writes {@code src/tanstack-query.ts} for one service: cache keys and option factories for every
 * operation, a bound API facade, and the framework-specific provider and helpers supplied by a
 * {@link FrameworkAdapter}.
 */
final class TanStackQueryWriter {

  /** The symbols an operation's generated helpers refer to. */
  private record Operation(
      String name, String functionName, String id, Symbol command, Symbol input, Symbol output) {}

  private final FrameworkAdapter framework;
  private final ServiceShape service;
  private final Symbol client;
  private final List<Operation> queries;
  private final List<Operation> mutations;

  TanStackQueryWriter(
      FrameworkAdapter framework,
      ServiceShape service,
      SymbolProvider symbols,
      List<OperationShape> queries,
      List<OperationShape> mutations) {
    this.framework = framework;
    this.service = service;
    this.client = symbols.toSymbol(service);
    this.queries = queries.stream().map(operation -> describe(symbols, operation)).toList();
    this.mutations = mutations.stream().map(operation -> describe(symbols, operation)).toList();
  }

  private Operation describe(SymbolProvider symbols, OperationShape operation) {
    Symbol command = symbols.toSymbol(operation);
    String name = operation.getId().getName(service);
    return new Operation(
        name,
        StringUtils.uncapitalize(name),
        operation.getId().toString(),
        command,
        command.expectProperty("inputType", Symbol.class),
        command.expectProperty("outputType", Symbol.class));
  }

  void write(TypeScriptWriter writer) {
    writer.pushState();
    writer.putContext("service", service.getId().getName());
    writer.putContext("serviceId", service.getId().toString());
    writer.putContext("client", client.getName());
    writer.putContext("prefix", framework.helperPrefix());

    addImports(writer);
    if (!queries.isEmpty()) {
      framework.writeQueryInputHelpers(writer);
    }
    forEach(writer, queries, () -> writeQueryOptions(writer));
    forEach(writer, mutations, () -> writeMutationOptions(writer));
    framework.writeClientProvider(writer);
    writeApi(writer);
    forEach(writer, queries, () -> writeQueryHook(writer));
    forEach(writer, mutations, () -> writeMutationHook(writer));

    writer.popState();
  }

  private void addImports(TypeScriptWriter writer) {
    var tanstackQuery = framework.tanstackQuery();
    if (!queries.isEmpty()) {
      writer.addImport("queryOptions", null, tanstackQuery);
      writer.addImport(framework.helperPrefix() + "Query", null, tanstackQuery);
      writer.addTypeImport(framework.queryOptionsType(), null, tanstackQuery);
      writer.addTypeImport(framework.queryResultType(), null, tanstackQuery);
    }
    if (!mutations.isEmpty()) {
      writer.addImport("mutationOptions", null, tanstackQuery);
      writer.addImport(framework.helperPrefix() + "Mutation", null, tanstackQuery);
      writer.addTypeImport(framework.mutationOptionsType(), null, tanstackQuery);
      writer.addTypeImport(framework.mutationResultType(), null, tanstackQuery);
    }
    framework.addFrameworkImports(writer, !queries.isEmpty());
    writer.addRelativeTypeImport(client.getName(), null, Paths.get(".", client.getNamespace()));
    for (Operation operation : queries) {
      addOperationImports(writer, operation);
    }
    for (Operation operation : mutations) {
      addOperationImports(writer, operation);
    }
  }

  private static void addOperationImports(TypeScriptWriter writer, Operation operation) {
    for (Symbol type : List.of(operation.input(), operation.output())) {
      writer.addRelativeTypeImport(type.getName(), null, Paths.get(".", type.getNamespace()));
    }
    writer.addRelativeImport(
        operation.command().getName(), null, Paths.get(".", operation.command().getNamespace()));
  }

  /** Runs {@code body} once per operation, with that operation's names in the writer context. */
  private static void forEach(TypeScriptWriter writer, List<Operation> operations, Runnable body) {
    for (Operation operation : operations) {
      writer.pushState();
      writer.putContext("op", operation.name());
      writer.putContext("fn", operation.functionName());
      writer.putContext("operationId", operation.id());
      writer.putContext("command", operation.command().getName());
      writer.putContext("input", operation.input().getName());
      writer.putContext("output", operation.output().getName());
      body.run();
      writer.popState();
    }
  }

  private void writeQueryOptions(TypeScriptWriter writer) {
    writer.write(
        """

        export const $fn:LQueryKey = (input: $input:L) =>
          ["$serviceId:L", "$operationId:L", input] as const;

        export const $fn:LQueryOptions = (
          client: $client:L,
          input: $input:L,
        ) =>
          queryOptions({
            queryKey: $fn:LQueryKey(input),
            queryFn: ({ signal }) => client.send(new $command:L(input), { abortSignal: signal }),
          });\
        """);
  }

  private void writeMutationOptions(TypeScriptWriter writer) {
    writer.write(
        """

        export const $fn:LMutationKey = () =>
          ["$serviceId:L", "$operationId:L"] as const;

        export const $fn:LMutationOptions = (
          client: $client:L,
        ) =>
          mutationOptions({
            mutationKey: $fn:LMutationKey(),
            mutationFn: (input: $input:L) =>
              client.send(new $command:L(input)),
          });\
        """);
  }

  private void writeApi(TypeScriptWriter writer) {
    writer.write(
        """

        export const create$service:LApi = (client: $client:L) => ({\
        """);
    writer.indent();
    forEach(
        writer,
        queries,
        () ->
            writer.write(
                """
                $fn:L: {
                  queryKey: $fn:LQueryKey,
                  queryOptions: (input: $input:L) =>
                    $fn:LQueryOptions(client, input),
                },\
                """));
    forEach(
        writer,
        mutations,
        () ->
            writer.write(
                """
                $fn:L: {
                  mutationKey: $fn:LMutationKey,
                  mutationOptions: () => $fn:LMutationOptions(client),
                },\
                """));
    writer.dedent();
    writer.write(
        """
        });

        export type $service:LApi = ReturnType<typeof create$service:LApi>;
        """);
    framework.writeApiAccessor(writer);
  }

  private void writeQueryHook(TypeScriptWriter writer) {
    writer.putContext("queryOptionsType", framework.queryOptionsType());
    writer.putContext("queryResultType", framework.queryResultType());
    writer.putContext(
        "queryInput", framework.queryInputType(writer.getContext("input", String.class)));
    writer.putContext("queryData", framework.queryOptionsTakeQueryData());
    writer.putContext("omitInitialData", framework.queryOptionsOmitInitialData());
    writer.write(
        """

        export type $op:LQueryOptions<TData = $output:L> = Omit<
          $queryOptionsType:L<
            $output:L,
            Error,
            TData,
            ${?queryData}
            $output:L,
            ${/queryData}
            ReturnType<typeof $fn:LQueryKey>
          >,
          "queryKey" | "queryFn"${?omitInitialData} | "initialData"${/omitInitialData}
        >${?omitInitialData} & { initialData?: undefined }${/omitInitialData};

        export const $prefix:L$op:LQuery = <TData = $output:L>(
          input: $queryInput:L,
          options?: $op:LQueryOptions<TData>,
        ): $queryResultType:L<TData, Error> => {
          const client = $prefix:L$service:LClient();\
        """);
    writer.indent();
    framework.writeQueryHookBody(writer);
    writer.dedent();
    writer.write("};");
  }

  private void writeMutationHook(TypeScriptWriter writer) {
    writer.putContext("mutationOptionsType", framework.mutationOptionsType());
    writer.putContext("mutationResultType", framework.mutationResultType());
    writer.write(
        """

        export type $op:LMutationOptions<TOnMutateResult = unknown> = Omit<
          $mutationOptionsType:L<
            $output:L,
            Error,
            $input:L,
            TOnMutateResult
          >,
          "mutationKey" | "mutationFn"
        >;

        export const $prefix:L$op:LMutation = <TOnMutateResult = unknown>(
          options?: $op:LMutationOptions<TOnMutateResult>,
        ): $mutationResultType:L<
          $output:L,
          Error,
          $input:L,
          TOnMutateResult
        > => {
          const client = $prefix:L$service:LClient();\
        """);
    writer.indent();
    framework.writeMutationHookBody(writer);
    writer.dedent();
    writer.write("};");
  }
}
