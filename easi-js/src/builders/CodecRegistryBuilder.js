//
// CodecRegistryBuilder.js
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

import CodecRegistry from "../codecs/CodecRegistry.js";
import Configuration from "../environment/Configuration.js";

export default class CodecRegistryBuilder {

    /**
     * Create a new codec-registry builder instance.
     * @returns {CodecRegistryBuilder} A new codec-registry builder instance.
     */
    static builder() {
        return new CodecRegistryBuilder();
    }

    /**
     * Configure a base codec registry to build from.
     * @param {CodecRegistry | null} codecRegistry Base codec registry.
     * @param {boolean} clone Indicates if base registry should be cloned before modification.
     * @returns {CodecRegistryBuilder} The current builder.
     */
    withBaseCodecRegistry(codecRegistry, clone = true) {
        this.baseCodecRegistry = codecRegistry;
        this.cloneBaseCodecRegistry = (clone !== false);
        return this;
    }

    /**
     * Configure whether default codecs are applied during build.
     * @param {boolean} enabled Indicates if defaults should be applied.
     * @returns {CodecRegistryBuilder} The current builder.
     */
    withDefaultCodecs(enabled = true) {
        this.includeDefaultCodecs = (enabled == true);
        return this;
    }

    /**
     * Register a transfer-syntax decoder to apply during build.
     * @param {import("../dicom/TransferSyntax.js").default | string} transferSyntax Transfer syntax.
     * @param {object | Function} decoderPrototypeOrConstructor Decoder prototype or constructor.
     * @returns {CodecRegistryBuilder} The current builder.
     */
    withDecoderForTransferSyntax(transferSyntax, decoderPrototypeOrConstructor) {
        this.decoderRegistrations.push({
            transferSyntax,
            decoderPrototypeOrConstructor
        });
        return this;
    }

    /**
     * Register an image decoder to apply during build.
     * @param {string} formatOrMediaType Image format/media-type identifier.
     * @param {object | Function} decoderPrototypeOrConstructor Decoder prototype or constructor.
     * @returns {CodecRegistryBuilder} The current builder.
     */
    withDecoderForImageFormat(formatOrMediaType, decoderPrototypeOrConstructor) {
        this.imageDecoderRegistrations.push({
            formatOrMediaType,
            decoderPrototypeOrConstructor
        });
        return this;
    }

    /**
     * Register an image decoder by media-type identifier to apply during build.
     * @param {string} mediaType Media-type identifier.
     * @param {object | Function} decoderPrototypeOrConstructor Decoder prototype or constructor.
     * @returns {CodecRegistryBuilder} The current builder.
     */
    withDecoderForMediaType(mediaType, decoderPrototypeOrConstructor) {
        return this.withDecoderForImageFormat(mediaType, decoderPrototypeOrConstructor);
    }

    /**
     * Register a named encoder to apply during build.
     * @param {string} format Encoder format identifier.
     * @param {object} encoder Encoder instance.
     * @returns {CodecRegistryBuilder} The current builder.
     */
    withEncoder(format, encoder) {
        this.encoderRegistrations.push({
            format,
            encoder
        });
        return this;
    }

    /**
     * Configure codec-registry assert-valid behavior for build.
     * @param {boolean} enabled Indicates if validation should be enforced.
     * @returns {CodecRegistryBuilder} The current builder.
     */
    withAssertValid(enabled = true) {
        this.assertOnBuild = (enabled !== false);
        return this;
    }

    /**
     * Configure codec-registry validation options for build.
     * @param {object | null} validationOptions Codec-registry validation options.
     * @returns {CodecRegistryBuilder} The current builder.
     */
    withValidation(validationOptions = null) {
        if ((validationOptions == null) || (typeof validationOptions !== "object")) {
            this.validationOptions = null;
        }
        else {
            this.validationOptions = Object.assign({}, validationOptions);
        }
        return this;
    }

    /**
     * Build a codec registry from configured builder state.
     * Automatically performs assert-valid unless disabled.
     * @returns {CodecRegistry} Built codec registry.
     */
    build() {

        var codecRegistry = null;

        if (this.baseCodecRegistry != null) {

            if ((this.baseCodecRegistry instanceof CodecRegistry) == false) {
                throw new Error("CodecRegistryBuilder.withBaseCodecRegistry(...) requires a CodecRegistry instance.");
            }

            codecRegistry = (this.cloneBaseCodecRegistry == true)
                ? this.baseCodecRegistry.clone()
                : this.baseCodecRegistry;

        }
        else {
            codecRegistry = new CodecRegistry();
        }

        if (this.includeDefaultCodecs == true) {
            Configuration.applyDefaultCodecs(codecRegistry);
        }

        for (var i = 0; i < this.decoderRegistrations.length; i++) {
            var decoderRegistration = this.decoderRegistrations[i];
            codecRegistry.setDecoderForTransferSyntax(
                decoderRegistration.transferSyntax,
                decoderRegistration.decoderPrototypeOrConstructor
            );
        }

        for (var j = 0; j < this.imageDecoderRegistrations.length; j++) {
            var imageDecoderRegistration = this.imageDecoderRegistrations[j];
            codecRegistry.setDecoderForImageFormat(
                imageDecoderRegistration.formatOrMediaType,
                imageDecoderRegistration.decoderPrototypeOrConstructor
            );
        }

        for (var k = 0; k < this.encoderRegistrations.length; k++) {
            var encoderRegistration = this.encoderRegistrations[k];
            codecRegistry.setEncoder(
                encoderRegistration.format,
                encoderRegistration.encoder
            );
        }

        if (this.assertOnBuild == true) {
            codecRegistry.assertValid(this.validationOptions);
        }

        return codecRegistry;

    }

    /**
     * Construct a codec-registry builder.
     */
    constructor() {
        this.baseCodecRegistry = null;
        this.cloneBaseCodecRegistry = true;
        this.includeDefaultCodecs = false;
        this.decoderRegistrations = [];
        this.imageDecoderRegistrations = [];
        this.encoderRegistrations = [];
        this.assertOnBuild = true;
        this.validationOptions = null;
    }

}
