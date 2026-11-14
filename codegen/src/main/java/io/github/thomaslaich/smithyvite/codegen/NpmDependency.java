package io.github.thomaslaich.smithyvite.codegen;

import java.util.List;
import software.amazon.smithy.codegen.core.SymbolDependency;
import software.amazon.smithy.typescript.codegen.Dependency;

/** An npm package that generated code imports from, with the package.json entries it needs. */
record NpmDependency(String packageName, List<SymbolDependency> dependencies)
    implements Dependency {

  static NpmDependency dependency(String packageName, String version) {
    return of(packageName, entry("dependencies", packageName, version));
  }

  static NpmDependency peerDependency(String packageName, String version) {
    return of(packageName, entry("peerDependencies", packageName, version));
  }

  static NpmDependency of(String packageName, SymbolDependency... dependencies) {
    return new NpmDependency(packageName, List.of(dependencies));
  }

  /** The same package.json entries, imported through a subpath such as {@code preact/hooks}. */
  NpmDependency subpath(String subpath) {
    return new NpmDependency(packageName + "/" + subpath, dependencies);
  }

  static SymbolDependency entry(String type, String packageName, String version) {
    return SymbolDependency.builder()
        .dependencyType(type)
        .packageName(packageName)
        .version(version)
        .build();
  }

  @Override
  public String getPackageName() {
    return packageName;
  }

  @Override
  public List<SymbolDependency> getDependencies() {
    return dependencies;
  }
}
