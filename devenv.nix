{ pkgs, lib, ... }:

{
  packages = [ pkgs.just ];

  languages.javascript = {
    enable = true;
    package = pkgs.nodejs_24;
    npm.enable = true;
  };

  languages.java = {
    enable = true;
    jdk.package = pkgs.jdk17;
    gradle.enable = true;
  };

  treefmt = {
    enable = true;

    config = {
      programs = {
        google-java-format.enable = true;
        nixfmt.enable = true;
        prettier.enable = true;
      };

      settings.excludes = [
        ".devenv/**"
        ".direnv/**"
        ".git/**"
        ".smithy-vite/**"
        "**/.smithy-vite/**"
        "**/dist/**"
        "**/src/generated/**"
        "codegen/.gradle/**"
        "codegen/build/**"
        "packages/smithy-cli-*/vendor/**"
      ];
    };
  };

  tasks."devenv:treefmt:run".exec = lib.mkForce null;
}
