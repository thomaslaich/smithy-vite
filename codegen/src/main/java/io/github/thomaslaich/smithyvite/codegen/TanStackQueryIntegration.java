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
    private static final Dependency TANSTACK_REACT_QUERY = new Dependency() {
        private final SymbolDependency dependency = SymbolDependency.builder()
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

    private static final Dependency TANSTACK_PREACT_QUERY = new Dependency() {
        private final SymbolDependency dependency = SymbolDependency.builder()
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

    private static final Dependency TANSTACK_SOLID_QUERY = new Dependency() {
        private final SymbolDependency dependency = SymbolDependency.builder()
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

    private static final Dependency REACT = new Dependency() {
        private final List<SymbolDependency> dependencies = List.of(
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

    private static final Dependency PREACT = new Dependency() {
        private final SymbolDependency dependency = SymbolDependency.builder()
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

    private static final Dependency PREACT_HOOKS = new Dependency() {
        @Override
        public String getPackageName() {
            return "preact/hooks";
        }

        @Override
        public List<SymbolDependency> getDependencies() {
            return PREACT.getDependencies();
        }
    };

    private static final Dependency SOLID = new Dependency() {
        private final SymbolDependency dependency = SymbolDependency.builder()
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

    private enum Framework {
        REACT,
        PREACT,
        SOLID;

        private static Framework fromEnvironment() {
            String value = System.getenv().getOrDefault("SMITHY_VITE_TANSTACK_FRAMEWORK", "react");
            return switch (value) {
                case "react" -> REACT;
                case "preact" -> PREACT;
                case "solid" -> SOLID;
                default -> throw new IllegalArgumentException("Unsupported TanStack Query framework: " + value);
            };
        }
    }

    @Override
    public boolean matchesSettings(TypeScriptSettings settings) {
        return settings.generateClient() && settings.getOptionalService().isPresent();
    }

    @Override
    public void customize(TypeScriptCodegenContext context) {
        ServiceShape service = context.settings().getService(context.model());
        Symbol client = context.symbolProvider().toSymbol(service);
        List<OperationShape> readonlyOperations = TopDownIndex.of(context.model())
                .getContainedOperations(service)
                .stream()
                .filter(operation -> operation.hasTrait(ReadonlyTrait.class))
                .sorted(Comparator.comparing(operation -> operation.getId().toString()))
                .toList();

        if (readonlyOperations.isEmpty()) {
            return;
        }

        Framework framework = Framework.fromEnvironment();
        Dependency tanstackQuery = switch (framework) {
            case REACT -> TANSTACK_REACT_QUERY;
            case PREACT -> TANSTACK_PREACT_QUERY;
            case SOLID -> TANSTACK_SOLID_QUERY;
        };
        String childrenType = switch (framework) {
            case REACT -> "ReactNode";
            case PREACT -> "ComponentChildren";
            case SOLID -> "JSX.Element";
        };

        context.writerDelegator().useFileWriter("src/tanstack-query.ts", "", writer -> {
            writer.addImport("queryOptions", null, tanstackQuery);
            writer.addImport("useQuery", null, tanstackQuery);
            writer.addTypeImport("UseQueryOptions", null, tanstackQuery);
            writer.addTypeImport("UseQueryResult", null, tanstackQuery);
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
                writer.addTypeImport("Accessor", null, SOLID);
                writer.addTypeImport("JSX", null, SOLID);
            } else {
                writer.addImport("createContext", null, REACT);
                writer.addImport("createElement", null, REACT);
                writer.addImport("useContext", null, REACT);
                writer.addImport("useMemo", null, REACT);
                writer.addTypeImport("ReactNode", null, REACT);
            }
            writer.addRelativeTypeImport(client.getName(), null, Paths.get(".", client.getNamespace()));

            if (framework == Framework.SOLID) {
                writer.write("");
                writer.write("type MaybeAccessor<T> = T | Accessor<T>;");
                writer.write("");
                writer.write("const resolveMaybeAccessor = <T>(value: MaybeAccessor<T>): T =>");
                writer.indent();
                writer.write("typeof value === \"function\" ? (value as Accessor<T>)() : value;");
                writer.dedent();
            }

            for (OperationShape operation : readonlyOperations) {
                Symbol command = context.symbolProvider().toSymbol(operation);
                Symbol input = command.expectProperty("inputType", Symbol.class);
                Symbol output = command.expectProperty("outputType", Symbol.class);
                String operationName = operation.getId().getName(service);
                String functionName = StringUtils.uncapitalize(operationName);

                writer.addRelativeImport(command.getName(), null, Paths.get(".", command.getNamespace()));
                writer.addRelativeTypeImport(input.getName(), null, Paths.get(".", input.getNamespace()));
                writer.addRelativeTypeImport(output.getName(), null, Paths.get(".", output.getNamespace()));
                writer.write("");
                writer.write("export const " + functionName + "QueryKey = (input: " + input.getName() + ") =>");
                writer.indent();
                writer.write("[\"" + service.getId() + "\", \"" + operation.getId() + "\", input] as const;");
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
                writer.write("queryFn: ({ signal }) => client.send(new " + command.getName()
                        + "(input), { abortSignal: signal }),");
                writer.dedent();
                writer.write("});");
                writer.dedent();
            }

            String serviceName = service.getId().getName();
            writer.write("");
            writer.write("const " + serviceName + "ClientContext = createContext<"
                    + client.getName() + " | undefined>(undefined);");
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
                writer.write("createElement(" + serviceName + "ClientContext.Provider, { value: client }, children);");
                writer.dedent();
            }
            writer.write("");
            writer.write("export const use" + serviceName + "Client = () => {");
            writer.indent();
            writer.write("const client = useContext(" + serviceName + "ClientContext);");
            writer.write("if (!client) {");
            writer.indent();
            writer.write("throw new Error(\"use" + serviceName + "Client must be used within a "
                    + serviceName + "ClientProvider\");");
            writer.dedent();
            writer.write("}");
            writer.write("return client;");
            writer.dedent();
            writer.write("};");
            writer.write("");
            writer.write("export const create" + serviceName + "Api = (client: " + client.getName() + ") => ({");
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
            writer.dedent();
            writer.write("});");
            writer.write("");
            writer.write("export type " + serviceName + "Api = ReturnType<typeof create" + serviceName + "Api>;");
            writer.write("");
            writer.write("export const use" + serviceName + "Api = () => {");
            writer.indent();
            writer.write("const client = use" + serviceName + "Client();");
            if (framework == Framework.SOLID) {
                writer.write("return create" + serviceName + "Api(client);");
            } else {
                writer.write("return useMemo(() => create" + serviceName + "Api(client), [client]);");
            }
            writer.dedent();
            writer.write("};");

            for (OperationShape operation : readonlyOperations) {
                Symbol command = context.symbolProvider().toSymbol(operation);
                Symbol input = command.expectProperty("inputType", Symbol.class);
                Symbol output = command.expectProperty("outputType", Symbol.class);
                String operationName = operation.getId().getName(service);
                String functionName = StringUtils.uncapitalize(operationName);

                writer.write("");
                writer.write("export type " + operationName + "QueryOptions<TData = " + output.getName() + "> = Omit<");
                writer.indent();
                writer.write("UseQueryOptions<");
                writer.indent();
                writer.write(output.getName() + ",");
                writer.write("Error,");
                writer.write("TData,");
                writer.write("ReturnType<typeof " + functionName + "QueryKey>");
                writer.dedent();
                writer.write(">,");
                writer.write("\"queryKey\" | \"queryFn\"");
                writer.dedent();
                writer.write(">;");
                writer.write("");
                writer.write("export const use" + operationName + "Query = <TData = " + output.getName() + ">(");
                writer.indent();
                if (framework == Framework.SOLID) {
                    writer.write("input: MaybeAccessor<" + input.getName() + ">,");
                    writer.write("options?: MaybeAccessor<" + operationName + "QueryOptions<TData>>,");
                } else {
                    writer.write("input: " + input.getName() + ",");
                    writer.write("options?: " + operationName + "QueryOptions<TData>,");
                }
                writer.dedent();
                writer.write("): UseQueryResult<TData, Error> => {");
                writer.indent();
                writer.write("const client = use" + serviceName + "Client();");
                if (framework != Framework.SOLID) {
                    writer.write("const { queryKey, queryFn } = " + functionName + "QueryOptions(client, input);");
                }
                writer.write("return useQuery<");
                writer.indent();
                writer.write(output.getName() + ",");
                writer.write("Error,");
                writer.write("TData,");
                writer.write("ReturnType<typeof " + functionName + "QueryKey>");
                writer.dedent();
                if (framework == Framework.SOLID) {
                    writer.write(">(() => {");
                    writer.indent();
                    writer.write("const resolvedInput = resolveMaybeAccessor(input);");
                    writer.write("const resolvedOptions = options && resolveMaybeAccessor(options);");
                    writer.write("const { queryKey, queryFn } = " + functionName
                            + "QueryOptions(client, resolvedInput);");
                    writer.write("return { ...resolvedOptions, queryKey, queryFn };");
                    writer.dedent();
                    writer.write("});");
                } else {
                    writer.write(">({ ...options, queryKey, queryFn });");
                }
                writer.dedent();
                writer.write("};");
            }
        });

        context.writerDelegator().useFileWriter("src/index.ts", "", writer ->
                writer.write("export * from \"./tanstack-query\";"));
    }
}
