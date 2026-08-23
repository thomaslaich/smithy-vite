export interface MavenRepository {
  id: string;
  url: string;
}

export type ToolchainOptions =
  | {
      mode?: "bundled";
    }
  | {
      mode: "external";
      smithy?: string;
      smithyArguments?: string[];
      maven: {
        repositories: MavenRepository[];
        dependencies?: string[];
      };
    };

interface BaseGenerateOptions {
  root?: string;
  sources: string[];
  output: string;
  packageName?: string;
  toolchain?: ToolchainOptions;
}

export interface TanStackQueryOptions {
  framework?: "react" | "preact" | "solid" | "vue" | "angular";
}

export interface ClientGenerateOptions extends BaseGenerateOptions {
  mode?: "client";
  service: string;
  tanstackQuery?: TanStackQueryOptions;
}

export interface ServerGenerateOptions extends BaseGenerateOptions {
  mode: "server";
  service: string;
  disableDefaultValidation?: boolean;
  tanstackQuery?: never;
}

export interface TypesGenerateOptions extends BaseGenerateOptions {
  mode: "types";
  closure: string;
  service?: never;
  tanstackQuery?: never;
}

export type GenerateOptions =
  | ClientGenerateOptions
  | ServerGenerateOptions
  | TypesGenerateOptions;

export interface GenerateResult {
  output: string;
  generatedPackageJson: Record<string, unknown>;
}

export function generate(options: GenerateOptions): Promise<GenerateResult>;
