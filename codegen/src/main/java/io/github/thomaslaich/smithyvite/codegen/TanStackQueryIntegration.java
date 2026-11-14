package io.github.thomaslaich.smithyvite.codegen;

import java.util.Comparator;
import java.util.List;
import software.amazon.smithy.model.knowledge.TopDownIndex;
import software.amazon.smithy.model.shapes.OperationShape;
import software.amazon.smithy.model.shapes.ServiceShape;
import software.amazon.smithy.model.traits.ReadonlyTrait;
import software.amazon.smithy.typescript.codegen.TypeScriptCodegenContext;
import software.amazon.smithy.typescript.codegen.TypeScriptSettings;
import software.amazon.smithy.typescript.codegen.integration.TypeScriptIntegration;

/**
 * Emits typed TanStack Query adapters for the supported component frameworks.
 *
 * <p>Operations marked {@code @readonly} become queries; every other operation becomes a mutation.
 */
public final class TanStackQueryIntegration implements TypeScriptIntegration {

  private static final String FRAMEWORK_VARIABLE = "SMITHY_VITE_TANSTACK_FRAMEWORK";

  private static String configuredFramework() {
    return System.getenv().getOrDefault(FRAMEWORK_VARIABLE, "none");
  }

  @Override
  public boolean matchesSettings(TypeScriptSettings settings) {
    return settings.generateClient()
        && settings.getOptionalService().isPresent()
        && !configuredFramework().equals("none");
  }

  @Override
  public void customize(TypeScriptCodegenContext context) {
    ServiceShape service = context.settings().getService(context.model());
    List<OperationShape> operations =
        TopDownIndex.of(context.model()).getContainedOperations(service).stream()
            .sorted(Comparator.comparing(operation -> operation.getId().toString()))
            .toList();
    if (operations.isEmpty()) {
      return;
    }

    TanStackQueryWriter adapter =
        new TanStackQueryWriter(
            FrameworkAdapter.forName(configuredFramework()),
            service,
            context.symbolProvider(),
            operations.stream()
                .filter(operation -> operation.hasTrait(ReadonlyTrait.class))
                .toList(),
            operations.stream()
                .filter(operation -> !operation.hasTrait(ReadonlyTrait.class))
                .toList());

    context.writerDelegator().useFileWriter("src/tanstack-query.ts", "", adapter::write);
    context
        .writerDelegator()
        .useFileWriter(
            "src/index.ts", "", writer -> writer.write("export * from \"./tanstack-query\";"));
  }
}
