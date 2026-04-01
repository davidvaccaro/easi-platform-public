# `DimseClient` Class

`DimseClient` is a lightweight DIMSE operations client for association-level actions.

## Core Operation

- `echo(options?)` executes DIMSE C-ECHO using the configured association.

## Construction

Prefer constructing via `EASI.dimseClientBuilder()`:

```js
import EASI from "../../src/EASI.js";

const client = EASI
  .dimseClientBuilder()
  .withAssociation(
    EASI
      .dimseAssociationBuilder()
      .withHost("127.0.0.1")
      .withPort(4242)
      .withCallingAeTitle("EASI_JS")
      .withCalledAeTitle("ORTHANC")
      .build()
  )
  .build();

const response = await client.echo();
```

## Notes

- `echo(options)` accepts `options.association` for per-call association overrides.
- The configured transport must implement `echo(association, options)`.
