# EASI: Efficient API for Streaming in Healthcare Imaging

## Mission Statement
EASI (Efficient API for Streaming in Healthcare Imaging) exists to provide a lightweight, high-performance, and developer-friendly foundation for stream reading and writing, parsing, and transforming medical imaging data — including DICOM and DICOMweb — using modern, portable, and scalable technologies.

Our mission is to simplify access to complex imaging data, enable real-time and memory-efficient workflows, and empower developers to build next-generation imaging applications, viewers, and services — without requiring deep expertise in the DICOM standard.

## Technical Overview

EASI provides a lightweight, extensible, and memory-efficient foundation for SAX-style parsing, stream reading and writing, and transformation of medical imaging data — including DICOM and DICOMweb metadata — entirely in modern JavaScript.

### Designed for real-world healthcare environments, EASI enables:

- Efficient parsing of large datasets (multi-gigabyte studies, streaming archives)
- Incremental, event-driven access to imaging metadata and pixel data
- Uniform APIs across diverse data sources (WADO-RS, WADO-URI, IHE XDS-I, local files)
- Low-memory, zero-copy operation suitable for browsers, mobile, and servers
- Pluggable handlers to generate high-level entities or application models

EASI empowers developers to build scalable, high-performance imaging workflows and applications — with full control over performance and data transformation — without requiring deep expertise in the DICOM standard.

# `EASI` Class

The `EASI` class is the root entry point for the EASI DICOM system.  

It provides access to the primary constructs and builders of the system.  

Currently, it grants access to the `StreamingReaderBuilder` for creating streaming readers.

---

## Static Methods

### `EASI.newStreamingReaderBuilder()`

Creates a new instance of the EASI Streaming Reader Builder.

#### Parameters

*(None.)*

#### Returns

| Type                    | Description                                         |
|-------------------------|-----------------------------------------------------|
| `StreamingReaderBuilder` | A new, initialized Streaming Reader Builder instance. |

---

## Usage Example

```js
import EASI from 'easi-dicom';

// Build the DICOM streaming reader
const reader = EASI.newStreamingReaderBuilder()
    .withParser(new StreamingDicomDataParser())
    .withHandler(new StreamingDicomInstanceHandler())
    .build();

// Read and parse a DICOM file from a URL
reader
    .read(url)
    .then(result => {

        // Establish the parsed instance
        if (typeof result === 'array') {

        }
        else {

        }

    })
    .catch(err => console.log(err));
```