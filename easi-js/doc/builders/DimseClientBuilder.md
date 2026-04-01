# `DimseClientBuilder` Class

`DimseClientBuilder` provides a fluent API for creating a DIMSE client that can execute association-level operations such as C-ECHO.

It is exposed from `EASI`:

- `EASI.dimseClientBuilder()`

## Core Flow

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

const echo = await client.echo();
```

## Methods

- `withAssociation(association = null)`
- `withAssociationBuilder(associationBuilder)`
- `withTransport(transport = null)`
- `build()`

## Notes

- Default transport is `NodeDimseQueryRetrieveSourceTransport`.
- Transport must implement `echo(association, options)`.
