package io.github.thomaslaich.smithyvite.codegen;

import software.amazon.smithy.typescript.codegen.TypeScriptWriter;

/**
 * Solid, Vue, and Angular: helpers run once and hand TanStack Query a function that builds the
 * options, so the framework can track reactive inputs read inside it.
 */
abstract class ReactiveAdapter extends FrameworkAdapter {

  /** The expression that reads the current value of a query helper's {@code input}. */
  abstract String resolveInput();

  /**
   * Whether the options builder spells out the query key and function rather than reusing the
   * operation's option factory.
   */
  boolean inlineQueryOptions() {
    return true;
  }

  @Override
  void writeApiAccessor(TypeScriptWriter writer) {
    writer.write(
        """
        export const use$service:LApi = () => {
          const client = use$service:LClient();
          return create$service:LApi(client);
        };\
        """);
  }

  @Override
  final void writeQueryHookBody(TypeScriptWriter writer) {
    writer.putContext("resolveInput", resolveInput());
    writer.write(
        """
        return $prefix:LQuery<
          $output:L,
          Error,
          TData,
          ReturnType<typeof $fn:LQueryKey>
        >(() => {
          const resolvedInput = $resolveInput:L;\
        """);
    writer.indent();
    if (inlineQueryOptions()) {
      writer.write(
          """
          return {
            ...options,
            queryKey: $fn:LQueryKey(resolvedInput),
            queryFn: ({ signal }) => client.send(new $command:L(resolvedInput), { abortSignal: signal }),
          };\
          """);
    } else {
      writer.write(
          """
          const { queryKey, queryFn } = $fn:LQueryOptions(client, resolvedInput);
          return { ...options, queryKey, queryFn };\
          """);
    }
    writer.dedent();
    writer.write("});");
  }

  @Override
  final void writeMutationHookBody(TypeScriptWriter writer) {
    writer.write(
        """
        return $prefix:LMutation<
          $output:L,
          Error,
          $input:L,
          TOnMutateResult
        >(() => {
          const { mutationKey, mutationFn } = $fn:LMutationOptions(client);
          return { ...options, mutationKey, mutationFn };
        });\
        """);
  }

  /** A {@code resolveMaybeAccessor} helper for inputs given either as a value or an accessor. */
  static void writeMaybeAccessor(TypeScriptWriter writer, String unionMember, String accessor) {
    writer.putContext("unionMember", unionMember);
    writer.putContext("accessor", accessor);
    writer.write(
        """

        type MaybeAccessor<T> = T | $unionMember:L;

        const resolveMaybeAccessor = <T>(value: MaybeAccessor<T>): T =>
          typeof value === "function" ? (value as $accessor:L)() : value;\
        """);
  }
}
