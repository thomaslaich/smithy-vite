set shell := ["bash", "-eu", "-o", "pipefail", "-c"]

default:
    just --list

fmt:
    treefmt

check-format:
    treefmt --ci

prepare:
    npm ci
    npm run prepare:cli
    npm run build:integration
    npm run prepare:maven

validate:
    gradle -p codegen check
    npm run check:toolchains
    npm run generate
    npm run typecheck
    npm run build
    npm run smoke
    npm run check:packages

ci: prepare check-format validate

# Release preparation is intentionally reversible. The workflow publishes only
# after this recipe has built, tested, and packed every artifact successfully.
release-ci VERSION:
    npm ci
    node scripts/set-release-version.mjs "{{ VERSION }}"
    npm run prepare:cli -- --platform all
    gradle -p codegen -Pversion="{{ VERSION }}" publishMavenPublicationToSpikeRepository
    npm run prepare:maven
    treefmt --ci
    gradle -p codegen check
    npm run check:toolchains
    npm run generate
    npm run typecheck
    npm run build
    npm run smoke
    npm run check:packages -- --all
    node scripts/pack-release.mjs artifacts/npm
