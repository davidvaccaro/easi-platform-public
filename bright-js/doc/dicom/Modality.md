# `Modality` Class

`Modality` identifies the type of equipment or imaging procedure used to acquire the data (e.g., CT for Computed Tomography, MR for Magnetic Resonance Imaging, US for Ultrasound).

The EASI DICOM `Modality` class is a static accessor class that defines all known DICOM Modalities.

It represents the full set of Modality values as a static map of `Modality` instances and provides static access via well-known IDs through dynamic lookup as well as exposing a full complement of static Modality accessor properties.

For further details on Modality in the DICOM Standard, see: 

[Official DICOM Standard — Modality](https://dicom.nema.org/medical/dicom/current/output/chtml/part03/sect_C.7.3.1.html#table_C.7-3)


---

## Properties

Each `Modality` instance provides:

A `Modality` instance has the following properties:

| Property        | Type      | Description |
|-----------------|-----------|-------------|
| `ID`            | `string`  | The DICOM modality code (e.g. `'CT'`, `'MR'`, `'XA'`) |
| `Name`          | `string`  | Human-readable name for the modality |
| `IsMultiFrame`  | `boolean` | Indicates if this modality typically produces multi-frame images |
| `IsRetired`     | `boolean` | Indicates if this modality is retired in the DICOM standard |

## Static Methods

### `find(id)`

Finds a Modality by its UID.

#### Parameters

| Parameter | Type    | Description                              |
|-----------|---------|------------------------------------------|
| `id`      | `string`| The UID of the modality to look up. |

#### Returns

| Type                     | Description                               |
|--------------------------|-------------------------------------------|
| `Modality` or `undefined` | The matching modality instance, or `undefined` if not found. |

## Common DICOM Modalities

| Code  | Name                           |
|-------|--------------------------------|
| CR    | Computed Radiography           |
| CT    | Computed Tomography            |
| MR    | Magnetic Resonance             |
| MG    | Mammography                    |
| NM    | Nuclear Medicine               |
| US    | Ultrasound                     |
| XA    | X-Ray Angiography              |
| RF    | Radiofluoroscopy               |
| DX    | Digital Radiography            |
| PT    | Positron Emission Tomography   |
| ECG   | Electrocardiography            |
| EEG   | Electroencephalography         |
| EMG   | Electromyography               |
| ES    | Endoscopy                      |
| SM    | Slide Microscopy               |
| OP    | Ophthalmic Photography         |
| OPT   | Ophthalmic Tomography          |
| OCT   | Optical Coherence Tomography   |
| IO    | Intra-oral Radiography         |
| LEN   | Lensometry                     |
| RESP  | Respiratory Waveform           |
| HD    | Hemodynamic Waveform           |
| SRF   | Subjective Refraction          |
| BMD   | Bone Mineral Densitometry      |
| BDUS  | Ultrasound Bone Densitometry   |
| KER   | Keratometry                    |
| VA    | Visual Acuity                  |
| NONE  | No Modality (Placeholder)      |

### Usage Example

```js
const modality = Modality.find('MR');

console.log(modality.ID);           // "MR"
console.log(modality.Name);         // "Magnetic Resonance"
console.log(modality.IsMultiFrame); // true
console.log(modality.IsRetired);    // false
```