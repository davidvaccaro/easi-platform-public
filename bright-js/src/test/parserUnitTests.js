const DicomConstants = require('../dicomConstants.js').DicomConstants;
const DicomConfiguration = require('../dicomConfiguration.js').DicomConfiguration;
const DicomUtilities = require('../dicomUtilities.js').DicomUtilities;
const DicomException = require('../dicomException.js').DicomException;
const DicomErrorCodes = require('../dicomException.js').DicomErrorCodes;

console.log(DicomConstants.PreambleLength);
console.log(DicomConfiguration.isStrict);
console.log(DicomUtilities.runtimeIsLittleEndian);
console.log(DicomErrorCodes.GeneralError);
console.log(new DicomException("Outch!", DicomErrorCodes.GeneralError));

console.log("Hello World!");