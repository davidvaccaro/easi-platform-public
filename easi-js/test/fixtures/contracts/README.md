# Public contract snapshot

These four JSON files are the JavaScript test and API synchronization snapshot from the canonical EASI contracts repository (`davidvaccaro/easi`), commit `e96f18c`. The API graph records the stable EASI JS `1.0.0` version; the remaining contracts and invented codec/plugin examples are unchanged. They contain no imaging files or personal data.

Copyright (c) 2026 Xinonix Interactive Development, Inc. These Licensor-owned generated contracts and test examples are expressly distributed as EASI JS test material under the EASI JS Community License in [LICENSE](../../../LICENSE). No other specification material is included or relicensed by this snapshot.

The snapshot preserves the canonical directory layout for exactly these files:

- `schemas/implementation/javascript/easi-api.contract.json`
- `schemas/implementation/javascript/easi-api.contract.schema.json`
- `fixtures/neutral/valid/codec-plugin-contract/basic.json`
- `fixtures/neutral/valid/plugin-contract/basic.json`

Default `npm test` and `npm run docs:api-contract:check` use this local snapshot. Missing snapshots or invalid explicit `EASI_CONTRACTS_ROOT` values fail; there is no inline contract fallback or skipped synchronization check.

`npm run docs:api-contract` writes to the canonical companion when it exists in the usual sibling workspace and automatically refreshes all four snapshot files. Without a companion, it updates this snapshot directly. To select a different canonical directory explicitly, run `EASI_CONTRACTS_ROOT=/path/to/easi-contracts npm run docs:api-contract`; the directory must contain the required schema and both plugin examples. `--check` validates that explicit directory when supplied.

These files stay in the source checkout and are excluded from the npm runtime package. API-reference site generation remains a separate maintainer operation in the optional documentation companion.
