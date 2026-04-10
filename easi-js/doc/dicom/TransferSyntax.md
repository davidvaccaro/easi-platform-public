# `TransferSyntax` Class

Transfer Syntaxes are central to decoding and interpreting DICOM&reg; streams, determining how pixel data and elements are encoded.

The EASI DICOM&reg; `TransferSyntax` class is a static accessor class that defines all known DICOM&reg; Transfer Syntaxes.

It represents the full set of Transfer Syntax values as a static map of `TransferSyntax` instances and provides static access via well-known UIDs through dynamic lookup as well as exposing a full complement of static Transfer Syntax accessor properties.

For further details on Transfer Syntaxes in the DICOM&reg; Standard, see:  
[Official DICOM&reg; Standard — Transfer Syntaxes](https://dicom.nema.org/medical/dicom/current/output/chtml/part05/sect_A.4.html)

---

## Properties

Each `TransferSyntax` instance provides:

| Property          | Type      | Description                                      |
|-------------------|-----------|--------------------------------------------------|
| `ID`              | `string`  | The Transfer Syntax UID.                         |
| `Name`            | `string`  | The human-readable name of the Transfer Syntax.  |
| `IsLittleEndian`  | `bool`    | Whether this syntax is little endian.            |
| `IsExplicit`      | `bool`    | Whether this syntax uses explicit VR encoding.   |
| `IsCompressed`    | `bool`    | Whether this syntax represents compressed data.  |
| `IsLossy`         | `bool`    | Whether compression is lossy.                    |
| `ApplicationType` | `string`  | The `TransferSyntaxApplicationType` — e.g. `SingleFrame`, `Video`, etc. |
| `IsRetired`       | `bool`    | Whether the syntax is retired in the DICOM&reg; standard. |

---

## TransferSyntaxApplicationType Enumeration

The `TransferSyntaxApplicationType` enumeration defines the categories of data that a DICOM&reg; Transfer Syntax can apply to. These values indicate the type of media or structure the Transfer Syntax is designed to encode.

| Value                                                   | Description                                     |
|--------------------------------------------------------|-------------------------------------------------|
| `TransferSyntaxApplicationType.SingleFrame`             | Transfer Syntax is intended for single-frame images. |
| `TransferSyntaxApplicationType.MultiFrame`              | Transfer Syntax is intended for multi-frame images. |
| `TransferSyntaxApplicationType.SingleAndMultiFrame`     | Transfer Syntax can be used for both single and multi-frame images. |
| `TransferSyntaxApplicationType.Video`                   | Transfer Syntax applies to video streams. |
| `TransferSyntaxApplicationType.Audio`                   | Transfer Syntax applies to audio data. |
| `TransferSyntaxApplicationType.Text`                    | Transfer Syntax applies to text content. |
| `TransferSyntaxApplicationType.Other`                   | Transfer Syntax applies to other unspecified types. |
| `TransferSyntaxApplicationType.XML`                     | Transfer Syntax applies to XML content. |
| `TransferSyntaxApplicationType.All`                     | Transfer Syntax applies to all data types. |

## Static Methods

### `find(id)`

Finds a transfer syntax by its UID.

#### Parameters

| Parameter | Type    | Description                              |
|-----------|---------|------------------------------------------|
| `id`      | `string`| The UID of the transfer syntax to look up. |

#### Returns

| Type                     | Description                               |
|--------------------------|-------------------------------------------|
| `TransferSyntax` or `undefined` | The matching transfer syntax instance, or `undefined` if not found. |

## Static Properties (Common Transfer Syntaxes)

| Property                                | UID                                    | Description |
|-----------------------------------------|----------------------------------------|-------------|
| `NONE`                                  | `'0'`                                  | None |
| `ImplicitVRLittleEndian`                | `'1.2.840.10008.1.2'`                  | Implicit VR Little Endian |
| `ExplicitVRLittleEndian`                | `'1.2.840.10008.1.2.1'`                | Explicit VR Little Endian |
| `ExplicitVRBigEndian`                   | `'1.2.840.10008.1.2.2'`                | Explicit VR Big Endian |
| `EncapsulatedUncompressedExplicitVRLittleEndian` | `'1.2.840.10008.1.2.1.98'`      | Encapsulated Uncompressed Explicit VR Little Endian |
| `DeflatedExplicitVRLittleEndian`        | `'1.2.840.10008.1.2.1.99'`             | Deflated Explicit VR Little Endian |
| `JPEGBaseline8Bit`                      | `'1.2.840.10008.1.2.4.50'`             | JPEG Baseline (Lossy) |
| `JPEGLossless`                          | `'1.2.840.10008.1.2.4.57'`             | JPEG Lossless |
| `JPEGLosslessSV1`                       | `'1.2.840.10008.1.2.4.70'`             | JPEG Lossless SV1 |
| `JPEGLSLossless`                        | `'1.2.840.10008.1.2.4.80'`             | JPEG-LS Lossless |
| `JPEGLSNearLossless`                    | `'1.2.840.10008.1.2.4.81'`             | JPEG-LS Near Lossless |
| `JPEG2000Lossless`                      | `'1.2.840.10008.1.2.4.90'`             | JPEG 2000 Lossless |
| `JPEG2000`                              | `'1.2.840.10008.1.2.4.91'`             | JPEG 2000 |
| `RLELossless`                           | `'1.2.840.10008.1.2.5'`                | RLE Lossless |
| `MPEG2MPML`                             | `'1.2.840.10008.1.2.4.100'`            | MPEG2 Main Profile Main Level |
| `MPEG4HP41`                             | `'1.2.840.10008.1.2.4.102'`            | MPEG-4 AVC H.264 HP 4.1 |
| `HEVCMP51`                              | `'1.2.840.10008.1.2.4.107'`            | HEVC H.265 Main Profile 5.1 |
| `HEVCM10P51`                            | `'1.2.840.10008.1.2.4.108'`            | HEVC Main 10 Profile 5.1 |
| `GEImplicitVRLittleEndianExceptBigEndianPixels` | `'1.2.840.113619.5.2'`      | GE Private |
| `Papyrus3ImplicitVRLittleEndian`        | `'1.2.840.10008.1.20'`                 | Papyrus Private |
| ... many more ...

## Usage Example

```js
import TransferSyntax from 'easi-dicom/dicom/TransferSyntax.js';

// Lookup "JPEG 2000 Lossless" by UID 
const ts = TransferSyntax.find('1.2.840.10008.1.2.4.90');

if (ts) {
    console.log(`Transfer Syntax: ${ts.Name}`);
    console.log(`Compressed: ${ts.IsCompressed}, Lossy: ${ts.IsLossy}`);
    console.log(`Endian: ${ts.IsLittleEndian ? 'Little' : 'Big'}`);
}

// Access static Transfer Syntax directly
const implicit = TransferSyntax.ImplicitVRLittleEndian;
console.log(`UID: ${implicit.ID}, Name: ${implicit.Name}`);
```