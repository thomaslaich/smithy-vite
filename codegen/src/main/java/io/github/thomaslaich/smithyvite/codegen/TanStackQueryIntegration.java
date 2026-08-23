package io.github.thomaslaich.smithyvite.codegen;

import java.nio.file.Paths;
import java.util.Comparator;
import java.util.List;
import software.amazon.smithy.codegen.core.Symbol;
import software.amazon.smithy.codegen.core.SymbolDependency;
import software.amazon.smithy.model.knowledge.TopDownIndex;
import software.amazon.smithy.model.shapes.OperationShape;
import software.amazon.smithy.model.shapes.ServiceShape;
import software.amazon.smithy.model.traits.ReadonlyTrait;
import software.amazon.smithy.typescript.codegen.Dependency;
import software.amazon.smithy.typescript.codegen.TypeScriptCodegenContext;
import software.amazon.smithy.typescript.codegen.TypeScriptSettings;
import software.amazon.smithy.typescript.codegen.integration.TypeScriptIntegration;
import software.amazon.smithy.utils.StringUtils;

/** Emits typed TanStack Query adapters for the supported component frameworks. */
public final class TanStackQueryIntegration implements TypeScriptIntegration {
  private static final Dependency TANSTACK_REACT_QUERY =
      new Dependency() {
        private final SymbolDependency dependency =
            SymbolDependency.builder()
                .dependencyType("dependencies")
                .packageName("@tanstack/react-query")
                .version("^5.90.0")
                .build();

        @Override
        public String getPackageName() {
          return "@tanstack/react-query";
        }

        @Override
        public List<SymbolDependency> getDependencies() {
          return List.of(dependency);
        }
      };

  private static final Dependency TANSTACK_PREACT_QUERY =
      new Dependency() {
        private final SymbolDependency dependency =
            SymbolDependency.builder()
                .dependencyType("dependencies")
                .packageName("@tanstack/preact-query")
                .version("^5.90.0")
                .build();

        @Override
        public String getPackageName() {
          return "@tanstack/preact-query";
        }

        @Override
        public List<SymbolDependency> getDependencies() {
          return List.of(dependency);
        }
      };

  private static final Dependency TANSTACK_SOLID_QUERY =
      new Dependency() {
        private final SymbolDependency dependency =
            SymbolDependency.builder()
                .dependencyType("dependencies")
                .packageName("@tanstack/solid-query")
                .version("^5.90.0")
                .build();

        @Override
        public String getPackageName() {
          return "@tanstack/solid-query";
        }

        @Override
        public List<SymbolDependency> getDependencies() {
          return List.of(dependency);
        }
      };

  private static final Dependency TANSTACK_VUE_QUERY =
      new Dependency() {
        private final SymbolDependency dependency =
            SymbolDependency.builder()
                .dependencyType("dependencies")
                .packageName("@tanstack/vue-query")
                .version("^5.90.0")
                .build();

        @Override
        public String getPackageName() {
          return "@tanstack/vue-query";
        }

        @Override
        public List<SymbolDependency> getDependencies() {
          return List.of(dependency);
        }
      };

  private static final Dependency TANSTACK_ANGULAR_QUERY =
      new Dependency() {
        private final SymbolDependency dependency =
            SymbolDependency.builder()
                .dependencyType("dependencies")
                .packageName("@tanstack/angular-query-experimental")
                .version("5.102.1")
                .build();

        @Override
        public String getPackageName() {
          return "@tanstack/angular-query-experimental";
        }

        @Override
        public List<SymbolDependency> getDependencies() {
          return List.of(dependency);
        }
      };

  private static final Dependency REACT =
      new Dependency() {
        private final List<SymbolDependency> dependencies =
            List.of(
                SymbolDependency.builder()
                    .dependencyType("peerDependencies")
                    .packageName("react")
                    .version(">=18.0.0 <20.0.0")
                    .build(),
                SymbolDependency.builder()
                    .dependencyType("devDependencies")
                    .packageName("@types/react")
                    .version("^19.0.0")
                    .build());

        @Override
        public String getPackageName() {
          return "react";
        }

        @Override
        public List<SymbolDependency> getDependencies() {
          return dependencies;
        }
      };

  private static final Dependency PREACT =
      new Dependency() {
        private final SymbolDependency dependency =
            SymbolDependency.builder()
                .dependencyType("peerDependencies")
                .packageName("preact")
                .version(">=10.0.0 <12.0.0")
                .build();

        @Override
        public String getPackageName() {
          return "preact";
        }

        @Override
        public List<SymbolDependency> getDependencies() {
          return List.of(dependency);
        }
      };

  private static final Dependency PREACT_HOOKS =
      new Dependency() {
        @Override
        public String getPackageName() {
          return "preact/hooks";
        }

        @Override
        public List<SymbolDependency> getDependencies() {
          return PREACT.getDependencies();
        }
      };

  private static final Dependency SOLID =
      new Dependency() {
        private final SymbolDependency dependency =
            SymbolDependency.builder()
                .dependencyType("peerDependencies")
                .packageName("solid-js")
                .version(">=1.0.0 <2.0.0")
                .build();

        @Override
        public String getPackageName() {
          return "solid-js";
        }

        @Override
        public List<SymbolDependency> getDependencies() {
          return List.of(dependency);
        }
      };

  private static final Dependency VUE =
      new Dependency() {
        private final SymbolDependency dependency =
            SymbolDependency.builder()
                .dependencyType("peerDependencies")
                .packageName("vue")
                .version(">=3.3.0 <4.0.0")
                .build();

        @Override
        public String getPackageName() {
          return "vue";
        }

        @Override
        public List<SymbolDependency> getDependencies() {
          return List.of(dependency);
        }
      };

  private static final Dependency ANGULAR_CORE =
      new Dependency() {
        private final SymbolDependency dependency =
            SymbolDependency.builder()
                .dependencyType("peerDependencies")
                .packageName("@angular/core")
                .version(">=19.0.0 <23.0.0")
                .build();

        @Override
        public String getPackageName() {
          return "@angular/core";
        }

        @Override
        public List<SymbolDependency> getDependencies() {
          return List.of(dependency);
        }
      };

  private enum Framework {
    REACT,
    PREACT,
    SOLID,
    VUE,
    ANGULAR;

    private static Framework fromEnvironment() {
      String value = System.getenv().getOrDefault("SMITHY_VITE_TANSTACK_FRAMEWORK", "none");
      return switch (value) {
        case "react" -> REACT;
        case "preact" -> PREACT;
        case "solid" -> SOLID;
        case "vue" -> VUE;
        case "angular" -> ANGULAR;
        default ->
            throw new IllegalArgumentException("Unsupported TanStack Query framework: " + value);
      };
    }
  }

  @Override
  public boolean matchesSettings(TypeScriptSettings settings) {
    return settings.generateClient()
        && settings.getOptionalService().isPresent()
        && !System.getenv().getOrDefault("SMITHY_VITE_TANSTACK_FRAMEWORK", "none").equals("none");
  }

  @Override
  public void customize(TypeScriptCodegenContext context) {
    ServiceShape service = context.settings().getService(context.model());
    Symbol client = context.symbolProvider().toSymbol(service);
    List<OperationShape> operations =
        TopDownIndex.of(context.model()).getContainedOperations(service).stream()
            .sorted(Comparator.comparing(operation -> operation.getId().toString()))
            .toList();
    List<OperationShape> readonlyOperations =
        operations.stream().filter(operation -> operation.hasTrait(ReadonlyTrait.class)).toList();
    List<OperationShape> mutationOperations =
        operations.stream().filter(operation -> !operation.hasTrait(ReadonlyTrait.class)).toList();

    if (operations.isEmpty()) {
      return;
    }

    Framework framework = Framework.fromEnvironment();
    Dependency tanstackQuery =
        switch (framework) {
          case REACT -> TANSTACK_REACT_QUERY;
          case PREACT -> TANSTACK_PREACT_QUERY;
          case SOLID -> TANSTACK_SOLID_QUERY;
          case VUE -> TANSTACK_VUE_QUERY;
          case ANGULAR -> TANSTACK_ANGULAR_QUERY;
        };
    String childrenType =
        switch (framework) {
          case REACT -> "ReactNode";
          case PREACT -> "ComponentChildren";
          case SOLID -> "JSX.Element";
          case VUE -> "";
          case ANGULAR -> "";
        };
    String queryOptionsType =
        switch (framework) {
          case SOLID, VUE -> "QueryOptions";
          case ANGULAR -> "CreateQueryOptions";
          default -> "UseQueryOptions";
        };
    String mutationOptionsType =
        switch (framework) {
          case SOLID, VUE -> "MutationOptions";
          case ANGULAR -> "CreateMutationOptions";
          default -> "UseMutationOptions";
        };
    String queryResultType =
        switch (framework) {
          case VUE -> "UseQueryReturnType";
          case ANGULAR -> "CreateQueryResult";
          default -> "UseQueryResult";
        };
    String mutationResultType =
        switch (framework) {
          case VUE -> "UseMutationReturnType";
          case ANGULAR -> "CreateMutationResult";
          default -> "UseMutationResult";
        };
    String queryFunction = framework == Framework.ANGULAR ? "injectQuery" : "useQuery";
    String mutationFunction = framework == Framework.ANGULAR ? "injectMutation" : "useMutation";

    context
        .writerDelegator()
        .useFileWriter(
            "src/tanstack-query.ts",
            "",
            writer -> {
              if (!readonlyOperations.isEmpty()) {
                writer.addImport("queryOptions", null, tanstackQuery);
                writer.addImport(queryFunction, null, tanstackQuery);
                writer.addTypeImport(queryOptionsType, null, tanstackQuery);
                writer.addTypeImport(queryResultType, null, tanstackQuery);
              }
              if (!mutationOperations.isEmpty()) {
                writer.addImport("mutationOptions", null, tanstackQuery);
                writer.addImport(mutationFunction, null, tanstackQuery);
                writer.addTypeImport(mutationOptionsType, null, tanstackQuery);
                writer.addTypeImport(mutationResultType, null, tanstackQuery);
              }
              if (framework == Framework.PREACT) {
                writer.addImport("createContext", null, PREACT);
                writer.addImport("createElement", null, PREACT);
                writer.addTypeImport("ComponentChildren", null, PREACT);
                writer.addImport("useContext", null, PREACT_HOOKS);
                writer.addImport("useMemo", null, PREACT_HOOKS);
              } else if (framework == Framework.SOLID) {
                writer.addImport("createComponent", null, SOLID);
                writer.addImport("createContext", null, SOLID);
                writer.addImport("useContext", null, SOLID);
                if (!readonlyOperations.isEmpty()) {
                  writer.addTypeImport("Accessor", null, SOLID);
                }
                writer.addTypeImport("JSX", null, SOLID);
              } else if (framework == Framework.VUE) {
                writer.addImport("inject", null, VUE);
                writer.addImport("toValue", null, VUE);
                writer.addTypeImport("App", null, VUE);
                writer.addTypeImport("InjectionKey", null, VUE);
                writer.addTypeImport("MaybeRefOrGetter", null, VUE);
                writer.addTypeImport("Plugin", null, VUE);
              } else if (framework == Framework.ANGULAR) {
                writer.addImport("inject", null, ANGULAR_CORE);
                writer.addImport("InjectionToken", null, ANGULAR_CORE);
                writer.addTypeImport("Provider", null, ANGULAR_CORE);
              } else {
                writer.addImport("createContext", null, REACT);
                writer.addImport("createElement", null, REACT);
                writer.addImport("useContext", null, REACT);
                writer.addImport("useMemo", null, REACT);
                writer.addTypeImport("ReactNode", null, REACT);
              }
              writer.addRelativeTypeImport(
                  client.getName(), null, Paths.get(".", client.getNamespace()));

              if (framework == Framework.SOLID && !readonlyOperations.isEmpty()) {
                writer.write("");
                writer.write("type MaybeAccessor<T> = T | Accessor<T>;");
                writer.write("");
                writer.write("const resolveMaybeAccessor = <T>(value: MaybeAccessor<T>): T =>");
                writer.indent();
                writer.write("typeof value === \"function\" ? (value as Accessor<T>)() : value;");
                writer.dedent();
              } else if (framework == Framework.ANGULAR && !readonlyOperations.isEmpty()) {
                writer.write("");
                writer.write("type MaybeAccessor<T> = T | (() => T);");
                writer.write("");
                writer.write("const resolveMaybeAccessor = <T>(value: MaybeAccessor<T>): T =>");
                writer.indent();
                writer.write("typeof value === \"function\" ? (value as () => T)() : value;");
                writer.dedent();
              }

              for (OperationShape operation : readonlyOperations) {
                Symbol command = context.symbolProvider().toSymbol(operation);
                Symbol input = command.expectProperty("inputType", Symbol.class);
                Symbol output = command.expectProperty("outputType", Symbol.class);
                String operationName = operation.getId().getName(service);
                String functionName = StringUtils.uncapitalize(operationName);

                writer.addRelativeImport(
                    command.getName(), null, Paths.get(".", command.getNamespace()));
                writer.addRelativeTypeImport(
                    input.getName(), null, Paths.get(".", input.getNamespace()));
                writer.addRelativeTypeImport(
                    output.getName(), null, Paths.get(".", output.getNamespace()));
                writer.write("");
                writer.write(
                    "export const "
                        + functionName
                        + "QueryKey = (input: "
                        + input.getName()
                        + ") =>");
                writer.indent();
                writer.write(
                    "[\""
                        + service.getId()
                        + "\", \""
                        + operation.getId()
                        + "\", input] as const;");
                writer.dedent();
                writer.write("");
                writer.write("export const " + functionName + "QueryOptions = (");
                writer.indent();
                writer.write("client: " + client.getName() + ",");
                writer.write("input: " + input.getName() + ",");
                writer.dedent();
                writer.write(") =>");
                writer.indent();
                writer.write("queryOptions({");
                writer.indent();
                writer.write("queryKey: " + functionName + "QueryKey(input),");
                writer.write(
                    "queryFn: ({ signal }) => client.send(new "
                        + command.getName()
                        + "(input), { abortSignal: signal }),");
                writer.dedent();
                writer.write("});");
                writer.dedent();
              }

              for (OperationShape operation : mutationOperations) {
                Symbol command = context.symbolProvider().toSymbol(operation);
                Symbol input = command.expectProperty("inputType", Symbol.class);
                Symbol output = command.expectProperty("outputType", Symbol.class);
                String operationName = operation.getId().getName(service);
                String functionName = StringUtils.uncapitalize(operationName);

                writer.addRelativeImport(
                    command.getName(), null, Paths.get(".", command.getNamespace()));
                writer.addRelativeTypeImport(
                    input.getName(), null, Paths.get(".", input.getNamespace()));
                writer.addRelativeTypeImport(
                    output.getName(), null, Paths.get(".", output.getNamespace()));
                writer.write("");
                writer.write("export const " + functionName + "MutationKey = () =>");
                writer.indent();
                writer.write(
                    "[\"" + service.getId() + "\", \"" + operation.getId() + "\"] as const;");
                writer.dedent();
                writer.write("");
                writer.write("export const " + functionName + "MutationOptions = (");
                writer.indent();
                writer.write("client: " + client.getName() + ",");
                writer.dedent();
                writer.write(") =>");
                writer.indent();
                writer.write("mutationOptions({");
                writer.indent();
                writer.write("mutationKey: " + functionName + "MutationKey(),");
                writer.write("mutationFn: (input: " + input.getName() + ") =>");
                writer.indent();
                writer.write("client.send(new " + command.getName() + "(input)),");
                writer.dedent();
                writer.dedent();
                writer.write("});");
                writer.dedent();
              }

              String serviceName = service.getId().getName();
              if (framework == Framework.ANGULAR) {
                writer.write("");
                writer.write(
                    "const "
                        + serviceName
                        + "ClientToken = new InjectionToken<"
                        + client.getName()
                        + ">(\""
                        + serviceName
                        + "Client\");");
                writer.write("");
                writer.write(
                    "export const provide"
                        + serviceName
                        + "Client = (client: "
                        + client.getName()
                        + "): Provider => ({");
                writer.indent();
                writer.write("provide: " + serviceName + "ClientToken,");
                writer.write("useValue: client,");
                writer.dedent();
                writer.write("});");
                writer.write("");
                writer.write(
                    "export const inject"
                        + serviceName
                        + "Client = () => inject("
                        + serviceName
                        + "ClientToken);");
              } else if (framework == Framework.VUE) {
                writer.write("");
                writer.write(
                    "const "
                        + serviceName
                        + "ClientKey: InjectionKey<"
                        + client.getName()
                        + "> = Symbol(\""
                        + serviceName
                        + "Client\");");
                writer.write("");
                writer.write(
                    "export const provide"
                        + serviceName
                        + "Client = (client: "
                        + client.getName()
                        + "): Plugin => ({");
                writer.indent();
                writer.write("install(app: App) {");
                writer.indent();
                writer.write("app.provide(" + serviceName + "ClientKey, client);");
                writer.dedent();
                writer.write("},");
                writer.dedent();
                writer.write("});");
                writer.write("");
                writer.write("export const use" + serviceName + "Client = () => {");
                writer.indent();
                writer.write("const client = inject(" + serviceName + "ClientKey);");
                writer.write("if (!client) {");
                writer.indent();
                writer.write(
                    "throw new Error(\"use"
                        + serviceName
                        + "Client requires app.use(provide"
                        + serviceName
                        + "Client(client))\");");
                writer.dedent();
                writer.write("}");
                writer.write("return client;");
                writer.dedent();
                writer.write("};");
              } else {
                writer.write("");
                writer.write(
                    "const "
                        + serviceName
                        + "ClientContext = createContext<"
                        + client.getName()
                        + " | undefined>(undefined);");
                writer.write("");
                writer.write("export interface " + serviceName + "ClientProviderProps {");
                writer.indent();
                writer.write("client: " + client.getName() + ";");
                writer.write("children?: " + childrenType + ";");
                writer.dedent();
                writer.write("}");
                writer.write("");
                if (framework == Framework.SOLID) {
                  writer.write("export const " + serviceName + "ClientProvider = (");
                  writer.indent();
                  writer.write("props: " + serviceName + "ClientProviderProps,");
                  writer.dedent();
                  writer.write(") =>");
                  writer.indent();
                  writer.write("createComponent(" + serviceName + "ClientContext.Provider, {");
                  writer.indent();
                  writer.write("get value() { return props.client; },");
                  writer.write("get children() { return props.children; },");
                  writer.dedent();
                  writer.write("});");
                  writer.dedent();
                } else {
                  writer.write("export const " + serviceName + "ClientProvider = ({");
                  writer.indent();
                  writer.write("client,");
                  writer.write("children,");
                  writer.dedent();
                  writer.write("}: " + serviceName + "ClientProviderProps) =>");
                  writer.indent();
                  writer.write(
                      "createElement("
                          + serviceName
                          + "ClientContext.Provider, { value: client }, children);");
                  writer.dedent();
                }
                writer.write("");
                writer.write("export const use" + serviceName + "Client = () => {");
                writer.indent();
                writer.write("const client = useContext(" + serviceName + "ClientContext);");
                writer.write("if (!client) {");
                writer.indent();
                writer.write(
                    "throw new Error(\"use"
                        + serviceName
                        + "Client must be used within a "
                        + serviceName
                        + "ClientProvider\");");
                writer.dedent();
                writer.write("}");
                writer.write("return client;");
                writer.dedent();
                writer.write("};");
              }
              writer.write("");
              writer.write(
                  "export const create"
                      + serviceName
                      + "Api = (client: "
                      + client.getName()
                      + ") => ({");
              writer.indent();
              for (OperationShape operation : readonlyOperations) {
                Symbol command = context.symbolProvider().toSymbol(operation);
                Symbol input = command.expectProperty("inputType", Symbol.class);
                String operationName = operation.getId().getName(service);
                String functionName = StringUtils.uncapitalize(operationName);
                writer.write(functionName + ": {");
                writer.indent();
                writer.write("queryKey: " + functionName + "QueryKey,");
                writer.write("queryOptions: (input: " + input.getName() + ") =>");
                writer.indent();
                writer.write(functionName + "QueryOptions(client, input),");
                writer.dedent();
                writer.dedent();
                writer.write("},");
              }
              for (OperationShape operation : mutationOperations) {
                String operationName = operation.getId().getName(service);
                String functionName = StringUtils.uncapitalize(operationName);
                writer.write(functionName + ": {");
                writer.indent();
                writer.write("mutationKey: " + functionName + "MutationKey,");
                writer.write("mutationOptions: () => " + functionName + "MutationOptions(client),");
                writer.dedent();
                writer.write("},");
              }
              writer.dedent();
              writer.write("});");
              writer.write("");
              writer.write(
                  "export type "
                      + serviceName
                      + "Api = ReturnType<typeof create"
                      + serviceName
                      + "Api>;");
              writer.write("");
              if (framework == Framework.ANGULAR) {
                writer.write("export const inject" + serviceName + "Api = () =>");
                writer.indent();
                writer.write("create" + serviceName + "Api(inject" + serviceName + "Client());");
                writer.dedent();
              } else {
                writer.write("export const use" + serviceName + "Api = () => {");
                writer.indent();
                writer.write("const client = use" + serviceName + "Client();");
                if (framework == Framework.SOLID || framework == Framework.VUE) {
                  writer.write("return create" + serviceName + "Api(client);");
                } else {
                  writer.write(
                      "return useMemo(() => create" + serviceName + "Api(client), [client]);");
                }
                writer.dedent();
                writer.write("};");
              }

              for (OperationShape operation : readonlyOperations) {
                Symbol command = context.symbolProvider().toSymbol(operation);
                Symbol input = command.expectProperty("inputType", Symbol.class);
                Symbol output = command.expectProperty("outputType", Symbol.class);
                String operationName = operation.getId().getName(service);
                String functionName = StringUtils.uncapitalize(operationName);

                writer.write("");
                writer.write(
                    "export type "
                        + operationName
                        + "QueryOptions<TData = "
                        + output.getName()
                        + "> = Omit<");
                writer.indent();
                writer.write(queryOptionsType + "<");
                writer.indent();
                writer.write(output.getName() + ",");
                writer.write("Error,");
                writer.write("TData,");
                if (framework == Framework.VUE) {
                  writer.write(output.getName() + ",");
                }
                writer.write("ReturnType<typeof " + functionName + "QueryKey>");
                writer.dedent();
                writer.write(">,");
                if (framework == Framework.SOLID || framework == Framework.ANGULAR) {
                  writer.write("\"queryKey\" | \"queryFn\" | \"initialData\"");
                } else {
                  writer.write("\"queryKey\" | \"queryFn\"");
                }
                writer.dedent();
                if (framework == Framework.SOLID || framework == Framework.ANGULAR) {
                  writer.write("> & { initialData?: undefined };");
                } else {
                  writer.write(">;");
                }
                writer.write("");
                writer.write(
                    "export const "
                        + (framework == Framework.ANGULAR ? "inject" : "use")
                        + operationName
                        + "Query = <TData = "
                        + output.getName()
                        + ">(");
                writer.indent();
                if (framework == Framework.SOLID || framework == Framework.ANGULAR) {
                  writer.write("input: MaybeAccessor<" + input.getName() + ">,");
                  writer.write("options?: " + operationName + "QueryOptions<TData>,");
                } else if (framework == Framework.VUE) {
                  writer.write("input: MaybeRefOrGetter<" + input.getName() + ">,");
                  writer.write("options?: " + operationName + "QueryOptions<TData>,");
                } else {
                  writer.write("input: " + input.getName() + ",");
                  writer.write("options?: " + operationName + "QueryOptions<TData>,");
                }
                writer.dedent();
                writer.write("): " + queryResultType + "<TData, Error> => {");
                writer.indent();
                writer.write(
                    "const client = "
                        + (framework == Framework.ANGULAR ? "inject" : "use")
                        + serviceName
                        + "Client();");
                if (framework != Framework.SOLID
                    && framework != Framework.VUE
                    && framework != Framework.ANGULAR) {
                  writer.write(
                      "const { queryKey, queryFn } = "
                          + functionName
                          + "QueryOptions(client, input);");
                }
                writer.write("return " + queryFunction + "<");
                writer.indent();
                writer.write(output.getName() + ",");
                writer.write("Error,");
                writer.write("TData,");
                writer.write("ReturnType<typeof " + functionName + "QueryKey>");
                writer.dedent();
                if (framework == Framework.SOLID
                    || framework == Framework.VUE
                    || framework == Framework.ANGULAR) {
                  writer.write(">(() => {");
                  writer.indent();
                  if (framework == Framework.SOLID || framework == Framework.ANGULAR) {
                    writer.write("const resolvedInput = resolveMaybeAccessor(input);");
                  } else {
                    writer.write("const resolvedInput = toValue(input);");
                  }
                  if (framework == Framework.VUE || framework == Framework.ANGULAR) {
                    writer.write("return {");
                    writer.indent();
                    writer.write("...options,");
                    writer.write("queryKey: " + functionName + "QueryKey(resolvedInput),");
                    writer.write(
                        "queryFn: ({ signal }) => client.send(new "
                            + command.getName()
                            + "(resolvedInput), { abortSignal: signal }),");
                    writer.dedent();
                    writer.write("};");
                  } else {
                    writer.write(
                        "const { queryKey, queryFn } = "
                            + functionName
                            + "QueryOptions(client, resolvedInput);");
                    writer.write("return { ...options, queryKey, queryFn };");
                  }
                  writer.dedent();
                  writer.write("});");
                } else {
                  writer.write(">({ ...options, queryKey, queryFn });");
                }
                writer.dedent();
                writer.write("};");
              }

              for (OperationShape operation : mutationOperations) {
                Symbol command = context.symbolProvider().toSymbol(operation);
                Symbol input = command.expectProperty("inputType", Symbol.class);
                Symbol output = command.expectProperty("outputType", Symbol.class);
                String operationName = operation.getId().getName(service);
                String functionName = StringUtils.uncapitalize(operationName);

                writer.write("");
                writer.write(
                    "export type "
                        + operationName
                        + "MutationOptions<TOnMutateResult = unknown> = Omit<");
                writer.indent();
                writer.write(mutationOptionsType + "<");
                writer.indent();
                writer.write(output.getName() + ",");
                writer.write("Error,");
                writer.write(input.getName() + ",");
                writer.write("TOnMutateResult");
                writer.dedent();
                writer.write(" >,");
                writer.write("\"mutationKey\" | \"mutationFn\"");
                writer.dedent();
                writer.write(">;");
                writer.write("");
                writer.write(
                    "export const "
                        + (framework == Framework.ANGULAR ? "inject" : "use")
                        + operationName
                        + "Mutation = <TOnMutateResult = unknown>(");
                writer.indent();
                if (framework == Framework.SOLID) {
                  writer.write("options?: " + operationName + "MutationOptions<TOnMutateResult>,");
                } else {
                  writer.write("options?: " + operationName + "MutationOptions<TOnMutateResult>,");
                }
                writer.dedent();
                writer.write("): " + mutationResultType + "<");
                writer.indent();
                writer.write(output.getName() + ",");
                writer.write("Error,");
                writer.write(input.getName() + ",");
                writer.write("TOnMutateResult");
                writer.dedent();
                writer.write("> => {");
                writer.indent();
                writer.write(
                    "const client = "
                        + (framework == Framework.ANGULAR ? "inject" : "use")
                        + serviceName
                        + "Client();");
                if (framework == Framework.SOLID
                    || framework == Framework.VUE
                    || framework == Framework.ANGULAR) {
                  writer.write("return " + mutationFunction + "<");
                  writer.indent();
                  writer.write(output.getName() + ",");
                  writer.write("Error,");
                  writer.write(input.getName() + ",");
                  writer.write("TOnMutateResult");
                  writer.dedent();
                  writer.write(">(() => {");
                  writer.indent();
                  writer.write(
                      "const { mutationKey, mutationFn } = "
                          + functionName
                          + "MutationOptions(client);");
                  writer.write("return { ...options, mutationKey, mutationFn };");
                  writer.dedent();
                  writer.write("});");
                } else {
                  writer.write(
                      "const { mutationKey, mutationFn } = "
                          + functionName
                          + "MutationOptions(client);");
                  writer.write("return " + mutationFunction + "<");
                  writer.indent();
                  writer.write(output.getName() + ",");
                  writer.write("Error,");
                  writer.write(input.getName() + ",");
                  writer.write("TOnMutateResult");
                  writer.dedent();
                  writer.write(">({ ...options, mutationKey, mutationFn });");
                }
                writer.dedent();
                writer.write("};");
              }
            });

    context
        .writerDelegator()
        .useFileWriter(
            "src/index.ts", "", writer -> writer.write("export * from \"./tanstack-query\";"));
  }
}
