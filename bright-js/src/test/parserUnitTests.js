import DicomConstants from '../dicomConstants.js';
import DicomConfiguration from '../dicomConfiguration.js';
import DicomUtilities from '../dicomUtilities.js';

import DicomException from '../dicomException.js';
import { DicomErrorCodes } from '../dicomException.js';

import DicomTransferSyntax from '../dicomTransferSyntax.js';
import { TransferSyntax } from '../dicomTransferSyntax.js';

import DicomValueRepresentation from '../dicomValueRepresentation.js';
import { ValueRepresentations, ValueRepresentation } from '../dicomValueRepresentation.js';

import DicomTag from '../dicomTag.js';
import { Tags, Tag } from '../dicomTag.js';

import DicomSOPClass from '../dicomSOPClass.js';
import { SOPClasses, SOPClass } from '../dicomSOPClass.js';

console.clear();
console.log(DicomConstants.PreambleLength);
console.log(DicomConfiguration.isStrict);
console.log(DicomErrorCodes.GeneralError);
console.log(new DicomException("Outch!", DicomErrorCodes.GeneralError));

console.log(ValueRepresentation.AE);
console.log(Tag.PatientAge);
console.log(TransferSyntax.ExplicitVRLittleEndian);
console.log(SOPClass.MRImageStorage);

console.log("Hello World!");