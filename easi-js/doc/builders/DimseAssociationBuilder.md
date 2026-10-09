# `DimseAssociationBuilder` Class

`DimseAssociationBuilder` provides a fluent API for composing DIMSE association options, including identity, query, and TLS/security policy.

It is exposed from `EASI`:

- `EASI.dimseAssociationBuilder()`

## Core Flow

```js
import EASI from "../../src/EASI.js";

const sourceAssociation = EASI
  .dimseAssociationBuilder()
  .withHost("127.0.0.1")
  .withPort(4242)
  .withCallingAeTitle("EASI_JS")
  .withCalledAeTitle("ORTHANC")
  .withQueryOption("operation", "cfind")
  .withTransportTls({
    ca: sourceCaPem,
    servername: "pacs.local",
    rejectUnauthorized: true
  })
  .withAssociationTimeoutMs(30000)
  .withMaxPdu(16384)
  .build();
```

## Methods

- `withBaseAssociation(association, clone = true)`
- `withHost(host)`
- `withPort(port)`
- `withCallingAeTitle(aeTitle)`
- `withCalledAeTitle(aeTitle)`
- `withQuery(query = {})`
- `withQueryOption(name, value)`
- `withVerification(verification = {})`
- `withVerificationOption(name, value)`
- `withVerificationMessageId(messageId)`
- `withMoveDestinationAeTitle(aeTitle)`
- `withMoveStoreCalledAeTitle(aeTitle)`
- `withTransportTls(tlsConfig = true)`
- `withTransportTlsOption(name, value)`
- `withTransportMutualTls(tlsOptions)`
- `withAssociationTimeoutMs(timeoutMs)`
- `withMaxPdu(maxPduLength)`
- `withMaxPduLength(maxPduLength)`
- `withMoveStoreTls(tlsConfig = true)`
- `withMoveStoreTlsOption(name, value)`
- `withMoveStoreMutualTls(tlsOptions)`
- `withMoveStorePolicy(policy)`
- `withMoveStorePolicyOption(name, value)`
- `withMoveStoreAssociationTimeoutMs(timeoutMs)`
- `build()`

## Notes

- `build()` returns a full DIMSE association object.
- AE-title fields (`callingAeTitle`, `calledAeTitle`, `moveDestinationAeTitle`, `moveStoreCalledAeTitle`) are trimmed, limited to 16 chars, and must contain printable ASCII only (no backslash).
- Move-store settings are emitted under `query.moveStoreTls` and `query.moveStorePolicy` to match DIMSE transport contracts.
- mTLS helpers require both `cert` and `key`.
- Verification message IDs are integers 1–65535. Timeouts are positive integers within Node's timer range. `maxPduLength` is an unsigned 32-bit integer of at least 8 bytes; built-in receiving transports additionally apply their incoming PDU cap.
- See the [v1 DIMSE guide](../DIMSE_V1.md) for query options, supported roles, and limits.
