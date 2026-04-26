# EASI UI Architecture

## Design Goals

1. Keep core components framework-agnostic.
2. Keep adapters thin and optional.
3. Keep domain packages explicit (DICOM, FHIR, pipeline tooling).
4. Keep visual styling token-driven and overridable.

## Layering Model

1. `@easi-ui/core`
Core primitives (cards, panels, tables, tabs, badges, layout).

2. Domain packages (`@easi-ui/dicom`, `@easi-ui/fhir`, `@easi-ui/pipeline`)
Composable domain widgets built on top of `core`.

3. Adapter packages (`react`, `angular`, `vue`)
Thin wrappers around core/domain components for host frameworks.

4. Showcase app
A developer-facing sandbox for testing, demos, and documentation snippets.
