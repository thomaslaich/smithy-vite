{ pkgs, ... }:

{
  languages.javascript = {
    enable = true;
    package = pkgs.nodejs_22;
    npm.enable = true;
  };

  languages.java = {
    enable = true;
    jdk.package = pkgs.jdk17;
    gradle.enable = true;
  };
}
