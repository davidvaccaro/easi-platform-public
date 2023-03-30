//
// DicomPixelDataToRGBACodec.js - 1.0.0
//
// DICOM Dicom Pixel Data To RGB Codec Class 
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

import DicomImagePixelModule from '../modules/dicomImagePixelModule.js';
import { Tag } from '../dicomTag.js'
import { PhotometricInterpretationType } from '../dicomTag.js'

export default class DicomPixelDataToRGBACodec {

    /**
     * Decode the specificed data to the output buffer.
     * @param {*} source The Uint8Array that serves as the source of the decode operation.
     * @param {*} sourceStart The index into the input array to start reading decode input.
     * @param {*} destination  The Uint8Array that serves as the destination of the decode operation.
     * @param {*} destinationStart The index into the output array to start writing decoded output.
     */
    decode(source, sourceStart, destination, destinationStart) {

        // Switch the Photometric Interpretation
        switch (this.imagePixelModule.photometricInterpretation) {

            // Handle Monochrome Interpretation
            case PhotometricInterpretationType.MONOCHROME1:
            case PhotometricInterpretationType.MONOCHROME2:

                // Establish the "1" versus "2"
                let isOne = (this.imagePixelModule.photometricInterpretation.ID == PhotometricInterpretationType.MONOCHROME1) ? true : false;

                // Loop over the source image bytes
                for (var i = sourceStart; i < source.length; i++) {

                    // Determine the source pixel
                    var pixel = Math.floor(source[i]);

                    // Decode the Monochrome Pixel Data to thge RGBA destination
                    destination[((destinationStart + (i - sourceStart)) * 4) + 0] = pixel;
                    destination[((destinationStart + (i - sourceStart)) * 4) + 1] = pixel;
                    destination[((destinationStart + (i - sourceStart)) * 4) + 2] = pixel;
                    destination[((destinationStart + (i - sourceStart)) * 4) + 3] = (isOne == true) ? 0 : 255;

                }

                return true;

        }

        // Return 
        return false;

    }

    /**
     * Construct an Dicom Pixel Data To RGB Codec instance.
     */
    constructor(imagePixelModule) {

        // Set the image-pixel module
        this.imagePixelModule = imagePixelModule;

    }

};