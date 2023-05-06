//
// Configuration.js - 1.0.0
//
// DICOM Configuration Class 
//
// Proprietary Notices:
// The Products, Documentation and Materials are proprietary to Xinonix Interactive Development Inc. and its licensors 
// and protected by applicable U.S. and international patent, copyright, trademark and trade secret laws. Xinonix 
// Interactive Development Inc and its licensors shall retain ownership in the Products, Documentation and Materials; 
// all derivatives thereof (in whole or part); and any intellectual property or other rights embodied therein. 
// 
// All proprietary notices incorporated in or affixed to any Products, Documentation or Materials shall be duplicated 
// by you on all copies of the Products, Documentation, or Material, as applicable, and shall not be altered, removed 
// or obliterated. Lease Equipment is, and shall at all times be and remain Our sole and exclusive property; you have 
// no right, title or interest therein or thereto except as expressly set forth in this Agreement. You shall keep the 
// Lease Equipment free and clear of all levies, liens and encumbrances and shall immediately notify us in writing of 
// any circumstances with respect to the location of the Equipment which will adversely affect it or our security 
// interests therein. You shall not install, attach, mount or otherwise house the Lease Equipment in a manner that 
// would render it a fixture under applicable law within the jurisdiction in which the Lease Equipment is located.
//

import DicomNativePixelDataToRGBADecoder from '../codecs/decoders/dicomNativePixelDataToRGBADecoder.js';
import TransferSyntax from './TransferSyntax.js';
import jpegDecoder from '../codecs/decoders/jpegDecoder.js';
import jpegLosslessDecoder from '../codecs/decoders/jpegLosslessDecoder.js';

export default class Configuration {

    /**
     * Is the current environment configured for "strict" validation.
     */
    static get isStrict() { return false; }

    /**
     * Gets the decoder for a given transfer-syntax.
     * @param {*} transferSyntax The transfer-syntax.
     * @returns The decoder.
     */
    static decoderFor(transferSyntax, dicomObject) {

        // Switch the transferSyntax
        switch (transferSyntax) {
            
            case TransferSyntax.JPEGBaseline8Bit:
                return new jpegDecoder(dicomObject);

            case TransferSyntax.JPEGLossless:
            case TransferSyntax.JPEGLosslessSV1:
                return new jpegLosslessDecoder(dicomObject);
                            
        }

        return new DicomNativePixelDataToRGBADecoder(dicomObject);

    }

    constructor() {
    }

};