//
// Configuration.js
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

import DicomNativePixelDataToRGBADecoder from '../codecs/decoders/DicomNativePixelDataToRGBADecoder.js';
import TransferSyntax from '../dicom/TransferSyntax.js';
import JpegDecoder from '../codecs/decoders/JpegDecoder.js';
import JpegLosslessDecoder from '../codecs/decoders/JpegLosslessDecoder.js';
import JpegLsDecoder from '../codecs/decoders/JpegLsDecoder.js';
import Jpeg2000Decoder from '../codecs/decoders/Jpeg2000Decoder.js';
import Htj2kDecoder from '../codecs/decoders/Htj2kDecoder.js';
import RleDecoder from '../codecs/decoders/RleDecoder.js';
import CodecRegistry from '../codecs/CodecRegistry.js';
import PngRgbaEncoder from '../codecs/encoders/PngRgbaEncoder.js';
import TiffRgbaEncoder from '../codecs/encoders/TiffRgbaEncoder.js';
import JpegRgbaEncoder from '../codecs/encoders/JpegRgbaEncoder.js';
import Jpeg2000RgbaEncoder from '../codecs/encoders/Jpeg2000RgbaEncoder.js';
import Htj2kRgbaEncoder from '../codecs/encoders/Htj2kRgbaEncoder.js';
import RleRgbaEncoder from '../codecs/encoders/RleRgbaEncoder.js';

export default class Configuration {

    // The static global singleton instance
    static instance = null;

    /**
     * Get default transfer-syntax decoder registrations.
     * @returns {Array<{ transferSyntax: TransferSyntax, decoderType: Function }>} Decoder registrations.
     */
    static getDefaultDecoderRegistrations() {
        return [
            { transferSyntax: TransferSyntax.JPEGBaseline8Bit, decoderType: JpegDecoder },
            { transferSyntax: TransferSyntax.JPEGLossless, decoderType: JpegLosslessDecoder },
            { transferSyntax: TransferSyntax.JPEGLosslessSV1, decoderType: JpegLosslessDecoder },
            { transferSyntax: TransferSyntax.JPEGLSLossless, decoderType: JpegLsDecoder },
            { transferSyntax: TransferSyntax.JPEGLSNearLossless, decoderType: JpegLsDecoder },
            { transferSyntax: TransferSyntax.JPEG2000Lossless, decoderType: Jpeg2000Decoder },
            { transferSyntax: TransferSyntax.JPEG2000, decoderType: Jpeg2000Decoder },
            { transferSyntax: TransferSyntax.JPEG2000MCLossless, decoderType: Jpeg2000Decoder },
            { transferSyntax: TransferSyntax.JPEG2000MC, decoderType: Jpeg2000Decoder },
            { transferSyntax: TransferSyntax.HTJ2KLossless, decoderType: Htj2kDecoder },
            { transferSyntax: TransferSyntax.HTJ2KLosslessRPCL, decoderType: Htj2kDecoder },
            { transferSyntax: TransferSyntax.HTJ2K, decoderType: Htj2kDecoder },
            { transferSyntax: TransferSyntax.RLELossless, decoderType: RleDecoder },
            { transferSyntax: TransferSyntax.NONE, decoderType: DicomNativePixelDataToRGBADecoder }
        ];
    }

    /**
     * Get default named encoder registrations.
     * @returns {Array<{ format: string, encoderType: Function }>} Encoder registrations.
     */
    static getDefaultEncoderRegistrations() {
        return [
            { format: 'jpeg', encoderType: JpegRgbaEncoder },
            { format: 'jpg', encoderType: JpegRgbaEncoder },
            { format: 'jpeg2000', encoderType: Jpeg2000RgbaEncoder },
            { format: 'jpeg-2000', encoderType: Jpeg2000RgbaEncoder },
            { format: 'jpeg 2000', encoderType: Jpeg2000RgbaEncoder },
            { format: 'jp2', encoderType: Jpeg2000RgbaEncoder },
            { format: 'j2k', encoderType: Jpeg2000RgbaEncoder },
            { format: 'htj2k', encoderType: Htj2kRgbaEncoder },
            { format: 'ht-j2k', encoderType: Htj2kRgbaEncoder },
            { format: 'ht jpeg 2000', encoderType: Htj2kRgbaEncoder },
            { format: 'ht-jpeg-2000', encoderType: Htj2kRgbaEncoder },
            { format: 'jph', encoderType: Htj2kRgbaEncoder },
            { format: 'rle', encoderType: RleRgbaEncoder },
            { format: 'rle-lossless', encoderType: RleRgbaEncoder },
            { format: 'dicom-rle', encoderType: RleRgbaEncoder },
            { format: 'png', encoderType: PngRgbaEncoder },
            { format: 'tiff', encoderType: TiffRgbaEncoder },
            { format: 'tif', encoderType: TiffRgbaEncoder }
        ];
    }

    /**
     * Apply default decoder and encoder registrations to one codec registry.
     * @param {CodecRegistry} codecRegistry The target codec registry.
     * @returns {CodecRegistry} The populated codec registry.
     */
    static applyDefaultCodecs(codecRegistry) {

        if ((codecRegistry == null)
            || (typeof codecRegistry.setDecoderForTransferSyntax !== 'function')
            || (typeof codecRegistry.setEncoder !== 'function')) {
            throw new Error("Configuration.applyDefaultCodecs requires a valid CodecRegistry instance.");
        }

        var decoderRegistrations = Configuration.getDefaultDecoderRegistrations();
        for (var i = 0; i < decoderRegistrations.length; i++) {
            var decoderRegistration = decoderRegistrations[i];
            codecRegistry.setDecoderForTransferSyntax(
                decoderRegistration.transferSyntax,
                new decoderRegistration.decoderType()
            );
        }

        var encoderRegistrations = Configuration.getDefaultEncoderRegistrations();
        for (var j = 0; j < encoderRegistrations.length; j++) {
            var encoderRegistration = encoderRegistrations[j];
            codecRegistry.setEncoder(
                encoderRegistration.format,
                new encoderRegistration.encoderType()
            );
        }

        return codecRegistry;

    }

    /**
     * Create a new, independent codec registry pre-populated with default codecs.
     * @returns {CodecRegistry} The initialized codec registry.
     */
    static createDefaultCodecRegistry() {
        return Configuration.applyDefaultCodecs(new CodecRegistry());
    }

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

        // Populate default transfer-syntax decoders.
        var decoderRegistrations = Configuration.getDefaultDecoderRegistrations();
        for (var i = 0; i < decoderRegistrations.length; i++) {
            var decoderRegistration = decoderRegistrations[i];
            this.setDecoderFor(
                decoderRegistration.transferSyntax,
                new decoderRegistration.decoderType()
            );
        }

        // Populate default output encoders.
        var encoderRegistrations = Configuration.getDefaultEncoderRegistrations();
        for (var j = 0; j < encoderRegistrations.length; j++) {
            var encoderRegistration = encoderRegistrations[j];
            this.setEncoderFor(
                encoderRegistration.format,
                new encoderRegistration.encoderType()
            );
        }

    }

};
