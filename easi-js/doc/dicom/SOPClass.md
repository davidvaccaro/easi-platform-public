# SOPClass Class

A DICOM&reg; SOP Class (Service-Object Pair Class) represents a specific combination of a service (an operation or set of operations that can be performed) and an object (a type of medical data, such as an image, report, or waveform).

In simple terms: it defines what kind of data is being exchanged and what can be done with it — for example, storing CT images or querying patient information.

The EASI DICOM&reg; `SOPClass` class is a static accessor class that defines all known DICOM&reg; SOP Classes. 

It represents the full set of SOP Class values as a static map of `SOPClass` instances and provides static access via well-known Names through dynamic lookup as well as exposing a full complement of static SOP Class accessor properties.

For further details on SOP Classes in the DICOM&reg; Standard, see:  
[Official DICOM&reg; Standard - Service-Object Pair (SOP) Classes](https://dicom.nema.org/medical/dicom/current/output/html/part04.html#chapter_A)

---

## Properties

Each `SOPClass` instance provides:

| Property          | Type      | Description                                      |
|-------------------|-----------|--------------------------------------------------|
| `ID`              | `string`  | The SOP Class UID.                         |
| `Name`            | `string`  | The human-readable name of the SOP Class.  |
| `IsRetired`  | `bool`    | Whether this SOP Class has been retired.            |

---

## Static Methods

### `find(id)`

Finds a SOP Class by its UID.

#### Parameters

| Parameter | Type    | Description                              |
|-----------|---------|------------------------------------------|
| `id`      | `string`| The UID of the SOP Class to look up. |

#### Returns

| Type                     | Description                               |
|--------------------------|-------------------------------------------|
| `SOPClass` or `undefined` | The matching SOP Class instance, or `undefined` if not found. |

## Static Properties (Common SOP Classes)

## Common SOP Classes

| SOP Class Name | UID |
| --- | --- |
| Verification | 1.2.840.10008.1.1 |
| Media Storage Directory Storage | 1.2.840.10008.1.3.10 |
| Basic Study Content Notification | 1.2.840.10008.1.9 |
| Storage Commitment Push Model | 1.2.840.10008.1.20.1 |
| Storage Commitment Pull Model | 1.2.840.10008.1.20.2 |
| Computed Radiography Image Storage | 1.2.840.10008.5.1.4.1.1.1 |
| CT Image Storage | 1.2.840.10008.5.1.4.1.1.2 |
| Enhanced CT Image Storage | 1.2.840.10008.5.1.4.1.1.2.1 |
| MR Image Storage | 1.2.840.10008.5.1.4.1.1.4 |
| Enhanced MR Image Storage | 1.2.840.10008.5.1.4.1.1.4.1 |
| Ultrasound Image Storage | 1.2.840.10008.5.1.4.1.1.6.1 |
| Enhanced US Volume Storage | 1.2.840.10008.5.1.4.1.1.6.2 |
| Secondary Capture Image Storage | 1.2.840.10008.5.1.4.1.1.7 |
| X-Ray Angiographic Image Storage | 1.2.840.10008.5.1.4.1.1.12.1 |
| Enhanced XA Image Storage | 1.2.840.10008.5.1.4.1.1.12.1.1 |
| Nuclear Medicine Image Storage | 1.2.840.10008.5.1.4.1.1.20 |
| Parametric Map Storage | 1.2.840.10008.5.1.4.1.1.30 |
| Segmentation Storage | 1.2.840.10008.5.1.4.1.1.66.4 |
| VL Whole Slide Microscopy Image Storage | 1.2.840.10008.5.1.4.1.1.77.1.6 |
| Basic Text SR Storage | 1.2.840.10008.5.1.4.1.1.88.11 |
| Enhanced SR Storage | 1.2.840.10008.5.1.4.1.1.88.22 |
| Comprehensive SR Storage | 1.2.840.10008.5.1.4.1.1.88.33 |
| Key Object Selection Document Storage | 1.2.840.10008.5.1.4.1.1.88.59 |
| X-Ray Radiation Dose SR Storage | 1.2.840.10008.5.1.4.1.1.88.67 |
| ... many more ...

## Usage Example

```js
import SOPClass from './SOPClass.js';

// Lookup by UID
const sop = SOPClass.find('1.2.840.10008.5.1.4.1.1.2');
console.log(sop); // CT Image Storage

// Access by name
const sop2 = SOPClass.CTImageStorage;
console.log(sop2); // same as above
```