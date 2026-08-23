export interface GenerateOptions {
  root?: string;
  sources: string[];
  service: string;
  output: string;
  packageName?: string;
  tanstackQuery?: {
    framework?: "react" | "preact" | "solid" | "vue" | "angular";
  };
}

export interface GenerateResult {
  output: string;
  generatedPackageJson: Record<string, unknown>;
}

export function generate(options: GenerateOptions): Promise<GenerateResult>;
