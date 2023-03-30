//
// DicomImageObject.js - 1.0.0
//
// DICOM Dicom Image Object Class 
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

import DicomObject from './dicomObject.js';
import DicomAttributeSet from '../dicomAttributeSet.js';
import DicomImagePixelModule from '../modules/dicomImagePixelModule.js';
import DicomMultiFrameModule from '../modules/dicomMultiFrameModule.js';
import DicomPixelDataToRGBACodec from '../codecs/dicomPixelDataToRGBACodec.js';

export default class DicomImageObject extends DicomObject {

    /**
     * Get the Image Pixel Module.
     * @returns The Image Pixel Module.
     */
    get imagePixelModule() {
        return new DicomImagePixelModule(this.attributeSet);
    }

    /**
     * Get the Multi Frame Module.
     * @returns The Multi Frame Module.
     */
    get multiFrameModule() {
        return new DicomMultiFrameModule(this.attributeSet);
    }

    /**
     * Decode the pixel data to the destination Uint8Array.
     * @param {*} destination The destination Uint8Array that serves as the destination of the decode operation.
     * @param {*} decoder (Optional) The desired decoder. Defaults to RGBA. 
     * @param {*} frame (Optional) The frame index (for multi-frame images) to decode. Defaults to 0.
     */
    decodeFrame(destination, decoder = null, frame = 0) {

        var res = false;

        // Create the default decoder (if needed)
        if (decoder == null) {
            decoder = new DicomPixelDataToRGBACodec(this.imagePixelModule);
        }

        // Establish the multi-frame status
        var isMultiFrame = (
            (this.generalSeriesModule.modality.IsMultiFrame == true) 
            && 
            (this.multiFrameModule.numberOfFrames > 1)) 
            ? true : false;

        // Decode the whole frame
        if (isMultiFrame == false) {

            // Decode the whole frame
            res = decoder.decode(this.imagePixelModule.pixelData, 0, destination, 0)

        }
        else {

            // TODO - Implement this

        }

        return res;
        
    }
        
    /**
     * Construct a DICOM Image Object instance.
     */
    constructor(attributeSet) {

        // Call the super constructor
        super(attributeSet);

    }

};