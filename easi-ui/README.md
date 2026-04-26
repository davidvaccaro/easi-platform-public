# EASI UI

Source-available UI component toolkit for EASI.

`easi-ui` hosts framework-agnostic web UI components (core + imaging-specific components) and optional framework adapters.

## Scope

- Pure, reusable UI primitives and domain components.
- Optional adapters for common frameworks.
- A local showcase app for rapid testing and demos.

## Workspace Layout

- `packages/core` Base UI primitives and design tokens.
- `packages/dicom` DICOM-focused components (metadata/tag visualization, etc.).
- `packages/fhir` FHIR-focused components.
- `packages/pipeline` Pipeline composition and execution UI widgets.
- `packages/react-adapter` React wrappers for core/domain components.
- `packages/angular-adapter` Angular wrappers for core/domain components.
- `packages/vue-adapter` Vue wrappers for core/domain components.
- `apps/showcase` Local showcase app for component demos.
- `docs` Architecture and contribution notes.

## Quick Start

```bash
cd easi-ui
npm install
npm run dev
```
