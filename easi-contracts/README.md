# EASI Contracts

This directory contains machine-readable contracts used across the EASI ecosystem.

## Structure

- `schemas/neutral/`
  - Language-neutral, cross-implementation contract schemas.
  - Initial catalog includes manifest, execution request/result, operation result, stream trace, codegen request, testgen request, and capability statement schemas.
- `schemas/implementation/javascript/`
  - JavaScript implementation contract artifacts generated from `easi-js/src`.
  - `easi-api.contract.json`
  - `easi-api.contract.schema.json`

## JavaScript Contract Generation

From `easi-js`:

```bash
npm run docs:api-contract
```

## Generate EASI-Spec API Reference

From `easi-js`:

```bash
npm run docs:api-reference
```

This generates API reference pages under:

- `easi-spec/site/api/index.html`
- `easi-spec/site/api/class-*.html`

To generate both the JavaScript implementation contract and API reference:

```bash
npm run docs:api-reference:all
```

## Check Sync

From `easi-js`:

```bash
npm run docs:api-contract:check
```

This command exits non-zero when the generated contract is out of sync with `easi-js/src`.

## Validate Neutral Schemas

From `easi-contracts`:

```bash
npm run validate:neutral
```

This runs schema validation against sample valid and invalid fixtures under:

- `fixtures/neutral/valid/*`
- `fixtures/neutral/invalid/*`

## Notes

- The JavaScript contract is generated from source using static parsing plus JSDoc extraction.
- JSDoc type richness varies by module; missing type details are emitted as `null`.
