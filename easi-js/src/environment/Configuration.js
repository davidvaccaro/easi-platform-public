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
import CodecRegistry from '../codecs/CodecRegistry.js';
import PngRgbaEncoder from '../codecs/encoders/PngRgbaEncoder.js';
import TiffRgbaEncoder from '../codecs/encoders/TiffRgbaEncoder.js';
import JpegRgbaEncoder from '../codecs/encoders/JpegRgbaEncoder.js';

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
     * @param {TransferSyntax} transferSyntax The specified transfer-syntax.
     * @returns A newly created/initialized decoder instance. 
     */
    getDecoderFor(transferSyntax, dicomObject) {
        return this.codecRegistry.getDecoderForTransferSyntax(transferSyntax, dicomObject);

    }

    /**
     * Sets the decoder for a given transfer-syntax.
     * @param {TransferSyntax} transferSyntax The specified transfer-syntax.
     * @param {object} decoderPrototype The prototype instance of the decoder to associated to the specified transfer-syntax.
     */
    setDecoderFor(transferSyntax, decoderPrototype) {
        this.codecRegistry.setDecoderForTransferSyntax(transferSyntax, decoderPrototype);
        this.decoderPrototypes[transferSyntax.ID] = decoderPrototype;
    }

    /**
     * Gets an encoder for a named output format.
     * @param {string} format The output format.
     * @returns {object | null} The encoder instance.
     */
    getEncoderFor(format) {
        return this.codecRegistry.getEncoder(format);
    }

    /**
     * Sets an encoder for a named output format.
     * @param {string} format The output format.
     * @param {object} encoder The encoder.
     */
    setEncoderFor(format, encoder) {
        this.codecRegistry.setEncoder(format, encoder);
        this.encoderPrototypes[format] = encoder;
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

        // Initialize the codec registry
        this.codecRegistry = new CodecRegistry();

        // Populate the TransferSyntax-specific decoders
        this.setDecoderFor(TransferSyntax.JPEGBaseline8Bit, new jpegDecoder());
        this.setDecoderFor(TransferSyntax.JPEGLossless, new jpegLosslessDecoder());
        this.setDecoderFor(TransferSyntax.JPEGLosslessSV1, new jpegLosslessDecoder());
        this.setDecoderFor(TransferSyntax.NONE, new DicomNativePixelDataToRGBADecoder());

        // Populate the default output encoders
        this.setEncoderFor('jpeg', new JpegRgbaEncoder());
        this.setEncoderFor('jpg', new JpegRgbaEncoder());
        this.setEncoderFor('png', new PngRgbaEncoder());
        this.setEncoderFor('tiff', new TiffRgbaEncoder());
        this.setEncoderFor('tif', new TiffRgbaEncoder());

    }

};
