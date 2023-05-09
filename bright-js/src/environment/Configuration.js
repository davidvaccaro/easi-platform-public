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
import TransferSyntax from '../dicom/TransferSyntax.js';
import jpegDecoder from '../codecs/decoders/jpegDecoder.js';
import jpegLosslessDecoder from '../codecs/decoders/jpegLosslessDecoder.js';

export default class Configuration {

    // The static global singleton instance
    static instance = null;

    /**
     * Gets the Global Configuration instance.
     * @returns The reference to the Global Configuration instance. 
     */
    static get global() {

        // If the Global instance has yet to be created/initialize, do so
        if (!Configuration.instance) {
            Configuration.instance = new Configuration();
        }

        // Return the Global Configuration instance
        return Configuration.instance;

    }

    /**
     * Gets the decoder for a given transfer-syntax.
     * @param {*} transferSyntax The specified transfer-syntax.
     * @returns A newly created/initialized decoder instance. 
     */
    getDecoderFor(transferSyntax, dicomObject) {

        // Set the default constructor
        var decoderConstructor = this.decoderPrototypes[TransferSyntax.NONE.ID].constructor;

        // If there is a specific prototype associated to the given transfer-syntax, construct a new decoder instance.
        if (this.decoderPrototypes[transferSyntax.ID] != null) {

            // Access the prototype constructor
            decoderConstructor = this.decoderPrototypes[transferSyntax.ID].constructor;

        }

        // Return the new instance
        return new decoderConstructor(dicomObject);            

    }

    /**
     * Sets the decoder for a given transfer-syntax.
     * @param {*} transferSyntax The specified transfer-syntax.
     * @param {*} decoderPrototype The prototype instance of the decoder to associated to the specified transfer-syntax.
     */
    setDecoderFor(transferSyntax, decoderPrototype) {
        this.decoderPrototypes[transferSyntax.ID] = decoderPrototype;
    }

    /**
     * Construct a new instance of the general configuration class.
     */
    constructor() {

        // Initialize the DEFAULT encoders
        this.encoderPrototypes = {
        };

        // Initialize the DEFAULT decoders
        this.decoderPrototypes = {
        };

        // Populate the TransferSyntax-specific decoders
        this.setDecoderFor(TransferSyntax.JPEGBaseline8Bit, new jpegDecoder());
        this.setDecoderFor(TransferSyntax.JPEGLossless, new jpegLosslessDecoder());
        this.setDecoderFor(TransferSyntax.JPEGLosslessSV1, new jpegLosslessDecoder());
        this.setDecoderFor(TransferSyntax.NONE, new DicomNativePixelDataToRGBADecoder());

    }

};