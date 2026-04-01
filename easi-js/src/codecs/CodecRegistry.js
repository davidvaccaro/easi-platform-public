//
// CodecRegistry.js
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

import TransferSyntax from "../dicom/TransferSyntax.js";

export default class CodecRegistry {

    /**
     * Normalize codec-registry validation options.
     * @param {{
     *   requireDefaultDecoder?: boolean,
     *   requiredTransferSyntaxes?: Array<TransferSyntax | string | null>,
     *   requiredEncoders?: Array<string | null>
     * } | null} options Validation options.
     * @returns {{
     *   requireDefaultDecoder: boolean,
     *   requiredTransferSyntaxes: Array<TransferSyntax | string | null>,
     *   requiredEncoders: Array<string | null>
     * }} Normalized options.
     */
    normalizeValidationOptions(options = null) {

        if ((options == null) || (typeof options !== "object")) {
            return {
                requireDefaultDecoder: true,
                requiredTransferSyntaxes: [],
                requiredEncoders: []
            };
        }

        return {
            requireDefaultDecoder: (options.requireDefaultDecoder !== false),
            requiredTransferSyntaxes: Array.isArray(options.requiredTransferSyntaxes)
                ? options.requiredTransferSyntaxes
                : [],
            requiredEncoders: Array.isArray(options.requiredEncoders)
                ? options.requiredEncoders
                : []
        };

    }

    /**
     * Build one codec-registry validation issue model.
     * @param {string} code The issue code.
     * @param {string} message The issue message.
     * @param {object | null} details Optional issue details.
     * @returns {object} The validation issue.
     */
    createValidationIssue(code, message, details = null) {
        return Object.assign({
            code,
            message
        }, details ?? {});
    }

    /**
     * Validate the current codec-registry state.
     * @param {{
     *   requireDefaultDecoder?: boolean,
     *   requiredTransferSyntaxes?: Array<TransferSyntax | string | null>,
     *   requiredEncoders?: Array<string | null>
     * } | null} options Validation options.
     * @returns {{
     *   ok: boolean,
     *   errors: Array<object>,
     *   warnings: Array<object>
     * }} Validation report.
     */
    validate(options = null) {

        var normalizedOptions = this.normalizeValidationOptions(options);
        var report = {
            ok: true,
            errors: [],
            warnings: []
        };

        if ((this.decoderConstructors == null) || (typeof this.decoderConstructors !== "object")) {
            report.errors.push(this.createValidationIssue(
                "InvalidDecoderMap",
                "CodecRegistry decoder map is missing or invalid."
            ));
        }
        else {

            var decoderTransferSyntaxes = Object.keys(this.decoderConstructors);
            for (var i = 0; i < decoderTransferSyntaxes.length; i++) {
                var transferSyntaxID = decoderTransferSyntaxes[i];
                var decoderConstructor = this.decoderConstructors[transferSyntaxID];

                if (typeof decoderConstructor !== "function") {
                    report.errors.push(this.createValidationIssue(
                        "InvalidDecoderConstructor",
                        `Decoder registration for transfer syntax '${transferSyntaxID}' is invalid.`,
                        { transferSyntaxID }
                    ));
                }
            }

            if (normalizedOptions.requireDefaultDecoder == true) {
                var defaultDecoderConstructor = this.decoderConstructors[TransferSyntax.NONE.ID];
                if (typeof defaultDecoderConstructor !== "function") {
                    report.errors.push(this.createValidationIssue(
                        "MissingDefaultDecoder",
                        `CodecRegistry requires a default decoder for transfer syntax '${TransferSyntax.NONE.ID}'.`,
                        { transferSyntaxID: TransferSyntax.NONE.ID }
                    ));
                }
            }

            for (var r = 0; r < normalizedOptions.requiredTransferSyntaxes.length; r++) {
                var requiredTransferSyntax = normalizedOptions.requiredTransferSyntaxes[r];
                var requiredTransferSyntaxID = this.resolveTransferSyntaxID(requiredTransferSyntax);
                if (typeof this.decoderConstructors[requiredTransferSyntaxID] !== "function") {
                    report.errors.push(this.createValidationIssue(
                        "MissingRequiredDecoder",
                        `CodecRegistry is missing decoder for transfer syntax '${requiredTransferSyntaxID}'.`,
                        { transferSyntaxID: requiredTransferSyntaxID }
                    ));
                }
            }

        }

        if ((this.encoders == null) || (typeof this.encoders !== "object")) {
            report.errors.push(this.createValidationIssue(
                "InvalidEncoderMap",
                "CodecRegistry encoder map is missing or invalid."
            ));
        }
        else {

            var encoderFormats = Object.keys(this.encoders);
            for (var j = 0; j < encoderFormats.length; j++) {
                var format = encoderFormats[j];
                var encoder = this.encoders[format];

                if ((encoder == null) || (typeof encoder.encode !== "function")) {
                    report.errors.push(this.createValidationIssue(
                        "InvalidEncoder",
                        `Encoder registration for format '${format}' is invalid.`,
                        { format }
                    ));
                }
            }

            for (var e = 0; e < normalizedOptions.requiredEncoders.length; e++) {
                var requiredFormat = this.normalizeFormat(normalizedOptions.requiredEncoders[e]);
                if (requiredFormat == null)
                    continue;
                var requiredEncoder = this.encoders[requiredFormat];
                if ((requiredEncoder == null) || (typeof requiredEncoder.encode !== "function")) {
                    report.errors.push(this.createValidationIssue(
                        "MissingRequiredEncoder",
                        `CodecRegistry is missing encoder for format '${requiredFormat}'.`,
                        { format: requiredFormat }
                    ));
                }
            }

        }

        report.ok = (report.errors.length == 0);
        return report;

    }

    /**
     * Validate and throw when current registry state is invalid.
     * @param {{
     *   requireDefaultDecoder?: boolean,
     *   requiredTransferSyntaxes?: Array<TransferSyntax | string | null>,
     *   requiredEncoders?: Array<string | null>
     * } | null} options Validation options.
     * @returns {{
     *   ok: boolean,
     *   errors: Array<object>,
     *   warnings: Array<object>
     * }} Validation report.
     */
    assertValid(options = null) {

        var report = this.validate(options);
        if (report.ok == true)
            return report;

        var messages = report.errors.map((error) => error.message);
        throw new Error("CodecRegistry validation failed: " + messages.join(" | "));

    }

    /**
     * Clone this codec registry into a new independent registry.
     * @returns {CodecRegistry} A shallow-cloned codec registry.
     */
    clone() {

        var registry = new CodecRegistry();
        registry.decoderConstructors = Object.assign({}, this.decoderConstructors ?? {});
        registry.encoders = Object.assign({}, this.encoders ?? {});
        return registry;

    }

    /**
     * Normalize an encoder format identifier.
     * @param {string | null} format The format identifier.
     * @returns {string | null} The normalized format identifier.
     */
    normalizeFormat(format) {
        if (format == null)
            return null;
        return String(format).trim().toLowerCase();
    }

    /**
     * Resolve a transfer-syntax identifier from a transfer-syntax-like value.
     * @param {TransferSyntax | string | null} transferSyntax The transfer syntax value.
     * @returns {string} The transfer syntax identifier.
     */
    resolveTransferSyntaxID(transferSyntax) {
        if (transferSyntax == null)
            return TransferSyntax.NONE.ID;
        if (typeof transferSyntax === 'string')
            return transferSyntax;
        if (transferSyntax.ID != null)
            return transferSyntax.ID;
        return TransferSyntax.NONE.ID;
    }

    /**
     * Register a decoder constructor for a transfer-syntax.
     * @param {TransferSyntax | string} transferSyntax The transfer-syntax.
     * @param {object | Function} decoderPrototypeOrConstructor Decoder instance prototype or constructor.
     */
    setDecoderForTransferSyntax(transferSyntax, decoderPrototypeOrConstructor) {

        var transferSyntaxID = this.resolveTransferSyntaxID(transferSyntax);
        var constructor = (typeof decoderPrototypeOrConstructor === 'function')
            ? decoderPrototypeOrConstructor
            : decoderPrototypeOrConstructor?.constructor;

        if (constructor == null)
            return;

        this.decoderConstructors[transferSyntaxID] = constructor;

    }

    /**
     * Resolve a decoder for a transfer-syntax.
     * @param {TransferSyntax | string | null} transferSyntax The transfer-syntax.
     * @param {object | null} dicomObject Optional DICOM object context.
     * @returns {object} A new decoder instance.
     */
    getDecoderForTransferSyntax(transferSyntax, dicomObject = null) {

        var transferSyntaxID = this.resolveTransferSyntaxID(transferSyntax);
        var decoderConstructor = this.decoderConstructors[transferSyntaxID];

        if (decoderConstructor == null) {
            decoderConstructor = this.decoderConstructors[TransferSyntax.NONE.ID];
        }

        if (decoderConstructor == null) {
            throw new Error("CodecRegistry has no default decoder configured.");
        }

        return new decoderConstructor(dicomObject);

    }

    /**
     * Determine if a decoder is explicitly registered for a transfer-syntax.
     * @param {TransferSyntax | string | null} transferSyntax The transfer-syntax.
     * @returns {boolean} TRUE when a specific decoder is registered.
     */
    hasDecoderForTransferSyntax(transferSyntax) {
        var transferSyntaxID = this.resolveTransferSyntaxID(transferSyntax);
        return (this.decoderConstructors[transferSyntaxID] != null);
    }

    /**
     * Register an encoder for a named output format.
     * @param {string} format The output format identifier.
     * @param {object} encoder The encoder instance.
     */
    setEncoder(format, encoder) {

        var key = this.normalizeFormat(format);
        if (key == null)
            return;

        this.encoders[key] = encoder;

    }

    /**
     * Resolve an encoder by format identifier.
     * @param {string} format The output format identifier.
     * @returns {object | null} The encoder, when available.
     */
    getEncoder(format) {
        var key = this.normalizeFormat(format);
        if (key == null)
            return null;
        return this.encoders[key] ?? null;
    }

    /**
     * Determine if an encoder exists for the specified format.
     * @param {string} format The output format identifier.
     * @returns {boolean} TRUE when an encoder exists.
     */
    hasEncoder(format) {
        return (this.getEncoder(format) != null);
    }

    /**
     * Construct a codec registry instance.
     */
    constructor() {
        this.decoderConstructors = {};
        this.encoders = {};
    }

};
