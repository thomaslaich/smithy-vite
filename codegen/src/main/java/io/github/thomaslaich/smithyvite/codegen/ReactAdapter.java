package io.github.thomaslaich.smithyvite.codegen;

import software.amazon.smithy.typescript.codegen.Dependency;
import software.amazon.smithy.typescript.codegen.TypeScriptWriter;

/** React and Preact: hooks that take plain inputs and rerun on every render. */
final class ReactAdapter extends FrameworkAdapter {

  private static final NpmDependency REACT =
      NpmDependency.of(
          "react",
          NpmDependency.entry("peerDependencies", "react", ">=18.0.0 <20.0.0"),
          NpmDependency.entry("devDependencies", "@types/react", "^19.0.0"));
  private static final NpmDependency PREACT =
      NpmDependency.peerDependency("preact", ">=10.0.0 <12.0.0");

  static final ReactAdapter REACT_ADAPTER =
      new ReactAdapter(
          NpmDependency.dependency("@tanstack/react-query", "^5.90.0"), REACT, REACT, "ReactNode");
  static final ReactAdapter PREACT_ADAPTER =
      new ReactAdapter(
          NpmDependency.dependency("@tanstack/preact-query", "^5.90.0"),
          PREACT,
          PREACT.subpath("hooks"),
          "ComponentChildren");

  private final Dependency tanstackQuery;
  private final Dependency core;
  private final Dependency hooks;
  private final String childrenType;

  private ReactAdapter(
      Dependency tanstackQuery, Dependency core, Dependency hooks, String childrenType) {
    this.tanstackQuery = tanstackQuery;
    this.core = core;
    this.hooks = hooks;
    this.childrenType = childrenType;
  }

  @Override
  Dependency tanstackQuery() {
    return tanstackQuery;
  }

  @Override
  void addFrameworkImports(TypeScriptWriter writer, boolean hasQueries) {
    writer.addImport("createContext", null, core);
    writer.addImport("createElement", null, core);
    writer.addTypeImport(childrenType, null, core);
    writer.addImport("useContext", null, hooks);
    writer.addImport("useMemo", null, hooks);
  }

  @Override
  void writeClientProvider(TypeScriptWriter writer) {
    writeContextClientProvider(
        writer,
        childrenType,
        """
        export const $service:LClientProvider = ({
          client,
          children,
        }: $service:LClientProviderProps) =>
          createElement($service:LClientContext.Provider, { value: client }, children);\
        """);
  }

  @Override
  void writeApiAccessor(TypeScriptWriter writer) {
    writer.write(
        """
        export const use$service:LApi = () => {
          const client = use$service:LClient();
          return useMemo(() => create$service:LApi(client), [client]);
        };\
        """);
  }

  @Override
  void writeQueryHookBody(TypeScriptWriter writer) {
    writer.write(
        """
        const { queryKey, queryFn } = $fn:LQueryOptions(client, input);
        return useQuery<
          $output:L,
          Error,
          TData,
          ReturnType<typeof $fn:LQueryKey>
        >({ ...options, queryKey, queryFn });\
        """);
  }

  @Override
  void writeMutationHookBody(TypeScriptWriter writer) {
    writer.write(
        """
        const { mutationKey, mutationFn } = $fn:LMutationOptions(client);
        return useMutation<
          $output:L,
          Error,
          $input:L,
          TOnMutateResult
        >({ ...options, mutationKey, mutationFn });\
        """);
  }
}
