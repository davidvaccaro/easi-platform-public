# EASI API Contract

This folder contains the machine-readable master contract for the EASI JavaScript public interface.

- `easi-api.contract.json`: generated interface contract.
- `easi-api.contract.schema.json`: JSON Schema describing the contract format.

## Why this exists

The contract is the single source of truth for public coder-facing API shape across EASI modules:

- classes
- methods and constructor signatures
- parameters and return metadata (from source signatures + JSDoc)
- exported constants
- static constant surfaces exposed as class getters/methods
- class properties documented via JSDoc and constructor assignment patterns

This contract can be used to generate docs, assist AI/tooling, and enforce drift detection in CI.

## Generate

From `easi-js`:

```bash
npm run docs:api-contract
```

## Generate EASI-Spec API Reference

From `easi-js`:

```bash
npm run docs:api-reference
```

This generates contract-driven API reference pages under:

- `easi-spec/site/api/index.html`
- `easi-spec/site/api/module-*.html`
- `easi-spec/site/api/class-*.html`

To generate both the contract and the site API reference in one step:

```bash
npm run docs:api-reference:all
```

## Check Sync

From `easi-js`:

```bash
npm run docs:api-contract:check
```

This command exits non-zero when `doc/contracts/easi-api.contract.json` is out of sync with `src`.

## Notes

- The contract is generated from source using static parsing plus JSDoc extraction.
- JSDoc type richness varies by module; missing JSDoc type details are left as `null`.
- Large exported dictionaries are represented in the constant summary with key counts and key lists.
