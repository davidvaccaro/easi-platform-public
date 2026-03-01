//
// CodecRegistry.js - 1.0.0
//
// Codec Registry Class
//

import TransferSyntax from "../dicom/TransferSyntax.js";

export default class CodecRegistry {

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
