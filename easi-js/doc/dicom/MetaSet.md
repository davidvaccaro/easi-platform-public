# `MetaSet` Class

The `MetaSet` class represents the DICOM&reg; File Meta Information group, containing key metadata that describes how the rest of the DICOM&reg; file should be interpreted. It extends the `AttributeSet` class.

---

## Inheritance

```text
MetaSet → AttributeSet
```

## Constructor

### `constructor()`

Creates an empty new DICOM&reg; meta-set.

```javascript
const meta = new MetaSet();
```

## Properties

| Property                          | Type             | Description                                                           |
|----------------------------------|------------------|-----------------------------------------------------------------------|
| `groupLength`                    | `number`         | Gets the File Meta Information Group Length.                          |
| `version`                        | `any`            | Gets the File Meta Information Version.                               |
| `mediaStorageSOPClassUID`        | `SOPClass`       | Gets the Media Storage SOP Class UID as a resolved `SOPClass` object. |
| `mediaStorageSOPInstanceUID`     | `string`         | Gets the Media Storage SOP Instance UID.                              |
| `transferSyntaxUID`              | `TransferSyntax` | Gets the Transfer Syntax UID as a resolved `TransferSyntax` object.   |
| `implementationClassUID`        | `string`         | Gets the Implementation Class UID.                                    |
| `implementationVersionName`     | `string`         | Gets the Implementation Version Name.                                 |
| `sourceApplicationEntityTitle`  | `string`         | Gets the Source Application Entity Title.                             |
| `sendingApplicationEntityTitle` | `string`         | Gets the Sending Application Entity Title.                            |
| `receivingApplicationEntityTitle`| `string`        | Gets the Receiving Application Entity Title.                          |
| `privateInformationCreatorUid`  | `string`         | Gets the Private Information Creator UID.                             |
| `privateInformation`            | `any`            | Gets the Private Information.                                         |

## Usage Example

```javascript
import MetaSet from './MetaSet.js';
import Tag from './Tag.js';

// Create a new MetaSet instance
const meta = new MetaSet();

// Optionally add attributes (normally populated during DICOM&reg; file parsing)
meta.add({
  tag: Tag.TransferSyntaxUID,
  value: '1.2.840.10008.1.2.1' // Explicit VR Little Endian
});

// Access properties
console.log('Transfer Syntax:', meta.transferSyntaxUID.name);
console.log('Implementation Class UID:', meta.implementationClassUID);
```