package dev.smithyreact.codegen;

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

/** Emits the smallest useful TanStack Query surface for the feasibility spike. */
public final class ReactQueryIntegration implements TypeScriptIntegration {
    private static final Dependency TANSTACK_QUERY = new Dependency() {
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

        context.writerDelegator().useFileWriter("src/react-query.ts", "", writer -> {
            writer.addImport("queryOptions", null, TANSTACK_QUERY);
            writer.addRelativeTypeImport(client.getName(), null, Paths.get(".", client.getNamespace()));

            for (OperationShape operation : readonlyOperations) {
                Symbol command = context.symbolProvider().toSymbol(operation);
                Symbol input = command.expectProperty("inputType", Symbol.class);
                String operationName = operation.getId().getName(service);
                String functionName = StringUtils.uncapitalize(operationName);

                writer.addRelativeImport(command.getName(), null, Paths.get(".", command.getNamespace()));
                writer.addRelativeTypeImport(input.getName(), null, Paths.get(".", input.getNamespace()));
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
        });

        context.writerDelegator().useFileWriter("src/index.ts", "", writer ->
                writer.write("export * from \"./react-query\";"));
    }
}
