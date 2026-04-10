# `Tag` Class

A DICOM&reg; `Tag` represents a unique identifier for a specific attribute or element in a DICOM&reg; dataset.

Each tag is composed of a Group Number and an Element Number (written as (gggg,eeee)), and it defines a single piece of information — for example: Patient Name (0010,0010), Study Date (0008,0020), or Pixel Data (7FE0,0010).

The EASI DICOM&reg; `Tag` class is a static accessor class that defines all known DICOM&reg; Tags.

It represents the full set of DICOM&reg; Tags as a static map of `Tag` instances and provides static access via tag identifier lookup, utilities for working with DICOM&reg; data element tags, tag identifier generation, and detection of private tags.

For further details on DICOM&reg; Tags in the DICOM&reg; Standard, see:

[Official DICOM&reg; Standard - Data Element Tags](https://dicom.nema.org/medical/dicom/current/output/html/part06.html#table_6-1)

---

## Properties

Each `Tag` instance provides:

| Property    | Type     | Description                                 |
|-------------|----------|---------------------------------------------|
| `ID`        | string   | Tag identifier (e.g., `'00020000'`).         |
| `Tag`       | string   | Tag in format `(gggg, eeee)`                 |
| `Group`     | number   | DICOM&reg; Group Number.                         |
| `Element`   | number   | DICOM&reg; Element Number.                       |
| `VR`        | string   | Value Representation.                       |
| `VM`        | object   | Value Multiplicity, e.g., `{ Exact: 1 }`.    |
| `Name`      | string   | Tag name.                                   |
| `IsRetired` | boolean  | Indicates if the tag is retired.            |
| `IsPrivate` | boolean  | Indicates if the tag is private.            |

---

## Static Methods

### `Tag.identifier(group, element)`

Constructs a DICOM&reg; tag identifier from a specified group and element.

| Parameter | Type                  | Description                        |
|-----------|-----------------------|------------------------------------|
| group     | `number` or `byte[]`   | The DICOM&reg; Group Number              |
| element   | `number` or `byte[]`   | The DICOM&reg; Element Number            |

#### Returns

| Type     | Description                                  |
|----------|----------------------------------------------|
| `string` | DICOM&reg; tag identifier in the form 'ggggeeee'   |

---

### `Tag.find(id)`

Finds and returns the corresponding `Tag` instance for the given tag identifier.

| Parameter | Type     | Description                               |
|-----------|----------|-------------------------------------------|
| id        | `string` | The DICOM&reg; tag identifier (e.g., '00020000') |

| Returns   | Type   | Description                               |
|-----------|--------|-------------------------------------------|
|           | `Tag` or `null` | The Tag instance if found, otherwise `null` |

---

### `Tag.isPrivateGroup(group)`

Determines whether the specified DICOM&reg; group number represents a **private group**.

| Parameter | Type     | Description                |
|-----------|----------|----------------------------|
| group     | `number` | The DICOM&reg; Group Number.     |

#### Returns

| Type      | Description                          |
|-----------|--------------------------------------|
| `boolean` | `true` if the group is private, otherwise `false`. |

---

### `Tag.isPrivateCreatorIDTag(group, element)`

Determines whether the specified DICOM&reg; group and element identify a **Private Creator ID Tag**.

| Parameter | Type     | Description                      |
|-----------|----------|----------------------------------|
| group     | `number` | The DICOM&reg; Group Number.           |
| element   | `number` | The DICOM&reg; Element Number.         |

#### Returns

| Type      | Description                                         |
|-----------|-----------------------------------------------------|
| `boolean` | `true` if the group/element is a Private Creator ID Tag, otherwise `false`. |

**Reference:** [DICOM&reg; Part 5 §7.8](https://dicom.nema.org/medical/dicom/current/output/chtml/part05/sect_7.8.html)

---

### `Tag.isPrivateTag(group, element)`

Determines whether the specified DICOM&reg; group and element identify a **Private Tag**.

| Parameter | Type     | Description                      |
|-----------|----------|----------------------------------|
| group     | `number` | The DICOM&reg; Group Number.           |
| element   | `number` | The DICOM&reg; Element Number.         |

#### Returns

| Type      | Description                                      |
|-----------|--------------------------------------------------|
| `boolean` | `true` if the group/element is a Private Tag, otherwise `false`. |

**Reference:** [DICOM&reg; Part 5 §7.8](https://dicom.nema.org/medical/dicom/current/output/chtml/part05/sect_7.8.html)

---

## Static Properties (Common DICOM&reg; Tags)

| Property Name                                 | Tag Identifier  | Description (Name)                           |
|-----------------------------------------------|-----------------|----------------------------------------------|
| `FileMetaInformationGroupLength`              | `00020000`      | File Meta Information Group Length           |
| `FileMetaInformationVersion`                  | `00020001`      | File Meta Information Version                |
| `MediaStorageSOPClassUID`                     | `00020002`      | Media Storage SOP Class UID                  |
| `MediaStorageSOPInstanceUID`                  | `00020003`      | Media Storage SOP Instance UID               |
| `TransferSyntaxUID`                           | `00020010`      | Transfer Syntax UID                          |
| `ImplementationClassUID`                      | `00020012`      | Implementation Class UID                     |
| `ImplementationVersionName`                   | `00020013`      | Implementation Version Name                  |
| `SourceApplicationEntityTitle`                | `00020016`      | Source Application Entity Title              |
| `SendingApplicationEntityTitle`               | `00020017`      | Sending Application Entity Title             |
| `ReceivingApplicationEntityTitle`             | `00020018`      | Receiving Application Entity Title           |
| `SourcePresentationAddress`                   | `00020026`      | Source Presentation Address                  |
| `SendingPresentationAddress`                  | `00020027`      | Sending Presentation Address                 |
| `ReceivingPresentationAddress`                | `00020028`      | Receiving Presentation Address               |
| `RTVMetaInformationVersion`                   | `00020031`      | RTV Meta Information Version                 |
| `RTVCommunicationSOPClassUID`                 | `00020032`      | RTV Communication SOP Class UID              |
| `RTVCommunicationSOPInstanceUID`              | `00020033`      | RTV Communication SOP Instance UID           |
| `RTVSourceIdentifier`                         | `00020035`      | RTV Source Identifier                        |
| `RTVFlowIdentifier`                           | `00020036`      | RTV Flow Identifier                          |
| `RTVFlowRTPSamplingRate`                      | `00020037`      | RTV Flow RTP Sampling Rate                   |


## PhotometricInterpretationType Enumeration

The `PhotometricInterpretationType` enumeration defines constants representing various DICOM&reg; photometric interpretation values. These values describe the intended interpretation of pixel data in an image (e.g., grayscale, color).

| Value                          | Description                                 |
|-------------------------------|---------------------------------------------|
| `PhotometricInterpretationType.MONOCHROME1`   | Monochrome image where pixel values of lower value are displayed as bright. |
| `PhotometricInterpretationType.MONOCHROME2`   | Monochrome image where pixel values of higher value are displayed as bright. |
| `PhotometricInterpretationType.PALETTECOLOR`  | Color image mapped through a palette lookup table. |
| `PhotometricInterpretationType.RGB`           | Color image using RGB color model. |
| `PhotometricInterpretationType.HSV`           | Color image using HSV (Hue, Saturation, Value) color model. |
| `PhotometricInterpretationType.ARGB`          | Color image using ARGB (Alpha, Red, Green, Blue) color model. |
| `PhotometricInterpretationType.CMYK`          | Color image using CMYK (Cyan, Magenta, Yellow, Black) color model. |
| `PhotometricInterpretationType.YBR_FULL`      | YBR (Luma + Blue-difference + Red-difference) full range. |
| `PhotometricInterpretationType.YBR_FULL_422`  | YBR full range with chroma sub-sampling 4:2:2. |
| `PhotometricInterpretationType.YBR_PARTIAL_422`| YBR partial range with chroma sub-sampling 4:2:2. |
| `PhotometricInterpretationType.YBR_PARTIAL_420`| YBR partial range with chroma sub-sampling 4:2:0. |
| `PhotometricInterpretationType.YBR_ICT`       | YBR using irreversible color transform (JPEG 2000). |
| `PhotometricInterpretationType.YBR_RCT`       | YBR using reversible color transform (JPEG 2000). |
| `PhotometricInterpretationType.INVALID`       | Invalid or unknown photometric interpretation. |

## Example Usage

```js
import Tag from 'easi-dicom/dicom/Tag';

// Create a DICOM&reg; tag identifier for group 0x0002 and element 0x0000
const tagId = Tag.identifier(0x0002, 0x0000);
console.log(tagId); // Output: "00020000"

// Retrieve a Tag instance using the tag identifier
const tag = Tag.find('00020000');

if (tag) {
    console.log(`Tag: ${tag.Tag}`);
    console.log(`Name: ${tag.Name}`);
    console.log(`Group: ${tag.Group}`);
    console.log(`Element: ${tag.Element}`);
    console.log(`VR: ${tag.VR}`);
    console.log(`IsRetired: ${tag.IsRetired}`);
    console.log(`IsPrivate: ${tag.IsPrivate}`);
}
```