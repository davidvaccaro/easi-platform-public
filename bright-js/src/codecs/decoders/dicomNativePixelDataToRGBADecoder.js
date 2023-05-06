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

import { PhotometricInterpretationType } from '../../dicom/Tag.js'
import Modality from '../../dicom/Modality.js';

export default class DicomNativePixelDataToRGBADecoder {

    /**
     * Generate a mask suitable for masking out unsued bits.
     * @param {*} bitsPerPixel The bits per pixel that this mask will be applied to.
     * @param {*} numUnmaskedBits The number of bits that should remain unmasked.
     * @returns The pixel bit mask.
     */    
    generatePixelMask(bitsPerPixel, numUnmaskedBits) {
        return Math.pow(2, numUnmaskedBits) - 1;
    }

    /**
     * Decode the specified source 8-bit DICOM MONOCHROME pixel-data into the destination buffer as standard RGBA pixel-data.
     * @param {*} source The source DICOM MONOCHROME pixel-data.
     * @param {*} sourceStart The index into the source pixel-data buffer to START processing.
     * @param {*} sourceStop The index into the source pixel-data buffer to STOP processin.
     * @param {*} destination The destination buffer to store the decoded RGBA pixel-data. 
     * @param {*} destinationStart The index into the destination pixel-data buffer to start processing.
     * @returns TRUE if the conversion succeeded, FALSE otherwise.
     */
    decode8BitDICOMMonochromeToRGB(source, sourceStart, sourceStop, destination, destinationStart, bitsPerPixel, windowCenter, windowWidth) {

        // Establish the apply window level status
        let applyWindowLevel = ((windowWidth != null) && (windowCenter != null)) ? true : false;

        // Detrmine the low and high values per the specified window level parameters
        const lowValue = (applyWindowLevel == true) ? (windowCenter - (windowWidth / 2)) : 0;
        const highValue = (applyWindowLevel == true) ? (windowCenter + (windowWidth / 2)) : 0;

        // Generate any pixel mask for BPP < 8
        var pixelMask = (bitsPerPixel <= 8) ? this.generatePixelMask(8, bitsPerPixel) : 255;

        // Establish MONOCHROME "1" versus "2" which influences the alpha-channel
        let isOne = (this.dicomObject.imagePixelModule.photometricInterpretation.ID == PhotometricInterpretationType.MONOCHROME1) ? true : false;

        // Loop over the source image bytes
        for (let i = sourceStart; i < sourceStop; i++) {

            // Determine the source pixel
            var pixel = (Math.floor(source[i]) & pixelMask);

            // Apply the window level (if needed)
            if (applyWindowLevel == true) {
                if (pixel <= lowValue) {
                    pixel = 0;
                } else if (pixel >= highValue) {
                    pixel = 255;
                } else {
                    pixel = Math.floor(((pixel - lowValue) / windowWidth) * 255);
                }
            }

            // Decode the Monochrome Pixel Data to thge RGBA destination
            destination[((destinationStart + (i - sourceStart)) * 4) + 0] = pixel;
            destination[((destinationStart + (i - sourceStart)) * 4) + 1] = pixel;
            destination[((destinationStart + (i - sourceStart)) * 4) + 2] = pixel;

            // Set the alpha channel to the value indicated by MONOCHROME1 versus MONOCHROME2
            destination[((destinationStart + (i - sourceStart)) * 4) + 3] = (isOne == true) ? 0 : 255;

        }

        // Return success
        return true;

    }

    /**
     * Decode the specified source 8-bit DICOM MONOCHROME pixel-data into the destination buffer as standard RGBA pixel-data.
     * @param {*} source The source DICOM MONOCHROME pixel-data.
     * @param {*} sourceStart The index into the source pixel-data buffer to START processing.
     * @param {*} sourceStop The index into the source pixel-data buffer to STOP processin.
     * @param {*} destination The destination buffer to store the decoded RGBA pixel-data. 
     * @param {*} destinationStart The index into the destination pixel-data buffer to start processing.
     * @returns TRUE if the conversion succeeded, FALSE otherwise.
     */
    decode16BitDICOMMonochromeToRGB(source, sourceStart, sourceStop, destination, destinationStart, bitsPerPixel, windowCenter, windowWidth) {
      
        // Determine the modality
        var modality = this.dicomObject.generalSeriesModule.modality;

        // Establish the apply window level status
        let applyWindowLevel = ((windowWidth != null) && (windowCenter != null)) ? true : false;

        // Detemine the "Rescale Intercept" and "Rescale Intercept"
        var rescaleIntercept = this.dicomObject.modalityLookUpTableModule.rescaleIntercept;

        // Detemine the "Rescale Slope" and "Rescale Intercept"
        var rescaleSlope = this.dicomObject.modalityLookUpTableModule.rescaleSlope;

        // Establish the apply rescale status
        let applyRescale = ((rescaleSlope != null) && (rescaleIntercept != null)) ? true : false;

        // Generate any pixel mask for BPP < 8
        var pixelMask = (bitsPerPixel <= 16) ? this.generatePixelMask(8, bitsPerPixel) : 65535;

        // Establish MONOCHROME "1" versus "2" which influences the alpha-channel
        let isOne = (this.dicomObject.imagePixelModule.photometricInterpretation.ID == PhotometricInterpretationType.MONOCHROME1) ? true : false;

        // Determine the "Max Pixel Value" from the object
        let maxPixelValue = this.dicomObject.imagePixelModule.largestImagePixelValue;
        
        // Deterime the max pixel value (if needed)
        if (maxPixelValue == null) {
            maxPixelValue = 0;
            for (let s = sourceStart; s < sourceStop; s += 2) {
                maxPixelValue = Math.max(maxPixelValue, ((source[s] | source[s + 1] << 8)) & pixelMask);
            }
        }

        // Determine the "Max Pixel Value" from the object
        let minPixelValue = this.dicomObject.imagePixelModule.smallestImagePixelValue;
        
        // Deterime the max pixel value (if needed)
        if (minPixelValue == null) {
            minPixelValue = 9999999;
            for (let s = sourceStart; s < sourceStop; s += 2) {
                minPixelValue = Math.min(minPixelValue, ((source[s] | source[s + 1] << 8)) & pixelMask);
            }
        }

        // DEFAULT the window width and center (if needed)
        if (applyWindowLevel == false) {
            windowCenter = ((maxPixelValue - minPixelValue) / 2);
            windowWidth = (maxPixelValue - minPixelValue);            
            applyWindowLevel = true;
        }

        // For PT modality, we need to actuall apply the rescale to the Window Level value itself. (Crude departure from the actual DICOM standard)
        if (modality == Modality.PT) {
            windowCenter = (windowCenter * rescaleSlope) + rescaleIntercept;
            windowWidth = (windowWidth * rescaleSlope) + rescaleIntercept;
        }

        // Detrmine the low and high values per the specified window level parameters
        const lowValue = (applyWindowLevel == true) ? (windowCenter - (windowWidth / 2)) : 0;
        const highValue = (applyWindowLevel == true) ? (windowCenter + (windowWidth / 2)) : 0;
                
        // Establish the destination index
        var destinationIndex = destinationStart;

        // Loop over the source image bytes
        for (let i = sourceStart; i < sourceStop; i += 2) {

            // Convert the 8 byte array values to the raw 16-bit pixel value
            var rawPixel = ((source[i] | source[i + 1] << 8) & pixelMask);

            // APPLY: Rescale Slope and Rescal Intercept (BEFORE Window Level for all modalities BUT PT)
            if (applyRescale == true) {
                rawPixel = (rawPixel * rescaleSlope) + rescaleIntercept;
            }

            var pixel;

            if (applyWindowLevel == true) {

                // Apply window-center and window-width range min and max
                if (rawPixel < lowValue) {
                    rawPixel = lowValue;
                } else if (rawPixel > highValue) {
                    rawPixel = highValue;
                }

                // Determine the source pixel using window-center and window width
                pixel = Math.floor(((rawPixel - lowValue) / windowWidth) * 255);

            }
            else {

                // Determine the source pixel using default range 
                pixel = Math.floor((rawPixel / maxPixelValue) * 255);

            }

            // Decode the Monochrome Pixel Data to thge RGBA destination
            destination[(destinationIndex * 4) + 0] = pixel;
            destination[(destinationIndex * 4) + 1] = pixel;
            destination[(destinationIndex * 4) + 2] = pixel;

            // Set the alpha channel to the value indicated by MONOCHROME1 versus MONOCHROME2
            destination[(destinationIndex * 4) + 3] = (isOne == true) ? 0 : 255;

            // Increment the destination index
            destinationIndex++;

        }
      
        // Return success
        return true;

    }

    /**
     * Decode the specificed data to the output buffer.
     * @param {*} source The Uint8Array that serves as the source of the decode operation.
     * @param {*} sourceStart The index into the input array to START reading decode input.
     * @param {*} sourceStop The index into the input array to STOP reading decode input.
     * @param {*} destination  The Uint8Array that serves as the destination of the decode operation.
     * @param {*} destinationStart The index into the output array to START writing decoded output.
     */
    decode(source, sourceStart, sourceStop, destination, destinationStart, windowCenter, windowWidth) {

        // Switch the Photometric Interpretation
        switch (this.dicomObject.imagePixelModule.photometricInterpretation) {

            // Handle Monochrome Interpretation
            case PhotometricInterpretationType.MONOCHROME1:
            case PhotometricInterpretationType.MONOCHROME2:

                // Determine the bits-per-pixel (used)
                let bitsPerPixel = this.dicomObject.imagePixelModule.bitsStored;

                // Handle based on the bits-per-pixel
                if ((bitsPerPixel > 0) && (bitsPerPixel <= 8)) {
                    return this.decode8BitDICOMMonochromeToRGB(
                        source, sourceStart, sourceStop, 
                        destination, destinationStart, 
                        bitsPerPixel,
                        windowCenter, windowWidth);
                }
                else if ((bitsPerPixel > 8) && (bitsPerPixel <= 16)) {
                    return this.decode16BitDICOMMonochromeToRGB(
                        source, sourceStart, sourceStop, 
                        destination, destinationStart, 
                        bitsPerPixel,
                        windowCenter, windowWidth);
                }

        }

        // Return fail
        return false;

    }

    /**
     * Construct an Dicom Pixel Data To RGB Codec instance.
     */
    constructor(dicomObject) {

        // Set the image-pixel module
        this.dicomObject = dicomObject;

    }

};