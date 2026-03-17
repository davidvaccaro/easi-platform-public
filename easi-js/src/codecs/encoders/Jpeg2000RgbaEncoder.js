//
// Jpeg2000RgbaEncoder.js - 1.0.0
//
// JPEG 2000 RGBA Encoder Class
//

import Exception, { GeneralErrorCodes } from "../../environment/Exception.js";
import OpenJpegRuntime from "../runtimes/OpenJpegRuntime.js";

export default class Jpeg2000RgbaEncoder {

    static CodestreamSignature = new Uint8Array([0xFF, 0x4F, 0xFF, 0x51]);
    static Jp2Signature = new Uint8Array([0x00, 0x00, 0x00, 0x0C, 0x6A, 0x50, 0x20, 0x20]);

    /**
     * Determine whether one value is promise-like.
     * @param {*} value The value to evaluate.
     * @returns {boolean} TRUE when thenable.
     */
    isThenable(value) {
        return ((value != null) && (typeof value.then == "function"));
    }

    /**
     * Resolve quality as a 1-100 integer.
     * @param {number | null | undefined} quality The requested quality.
     * @returns {number} The normalized quality.
     */
    resolveQuality(quality) {

        var resolved = Number(quality);

        if (Number.isFinite(resolved) == false)
            return 90;

        if (resolved <= 1)
            resolved = (resolved * 100);

        resolved = Math.round(resolved);
        if (resolved < 1)
            resolved = 1;
        if (resolved > 100)
            resolved = 100;

        return resolved;

    }

    /**
     * Resolve output component count.
     * @param {object | null} options Encode options.
     * @returns {number} 1, 3, or 4.
     */
    resolveComponentCount(options = null) {

        var componentCount = Math.trunc(Number(options?.componentCount));

        if ((componentCount != 1) && (componentCount != 3) && (componentCount != 4))
            componentCount = 3;

        return componentCount;

    }

    /**
     * Resolve decomposition level for encoder stability.
     * @param {number} width Frame width.
     * @param {number} height Frame height.
     * @param {object | null} options Encode options.
     * @returns {number} Decomposition level.
     */
    resolveDecompositions(width, height, options = null) {

        var configured = Number(options?.decompositions);
        if (Number.isFinite(configured) == true) {
            configured = Math.trunc(configured);
            if (configured < 1)
                configured = 1;
            return configured;
        }

        var smallestDimension = Math.max(2, Math.min(Math.trunc(width), Math.trunc(height)));
        return Math.max(1, Math.floor(Math.log2(smallestDimension)) - 1);

    }

    /**
     * Resolve progression-order value.
     * @param {string | number | null | undefined} progressionOrder Progression-order value.
     * @returns {number | null} OpenJPEG progression-order code.
     */
    resolveProgressionOrder(progressionOrder) {

        if (Number.isFinite(Number(progressionOrder)) == true) {
            var numeric = Math.trunc(Number(progressionOrder));
            if ((numeric >= 0) && (numeric <= 4))
                return numeric;
            return null;
        }

        var name = String(progressionOrder ?? "").trim().toUpperCase();
        if (name.length == 0)
            return null;

        var map = {
            LRCP: 0,
            RLCP: 1,
            RPCL: 2,
            PCRL: 3,
            CPRL: 4
        };

        return map[name] ?? null;

    }

    /**
     * Apply OpenJPEG encoder options when corresponding methods exist.
     * @param {object} encoder OpenJPEG encoder instance.
     * @param {number} width Frame width.
     * @param {number} height Frame height.
     * @param {object | null} options Encode options.
     */
    configureOpenJpegEncoder(encoder, width, height, options = null) {

        if (encoder == null)
            return;

        if (options?.htj2k === true) {
            if (typeof encoder.setHT == "function") {
                encoder.setHT(true);
            }
            else if (typeof encoder.setIsHT == "function") {
                encoder.setIsHT(true);
            }
            else if (typeof encoder.enableHT == "function") {
                encoder.enableHT(true);
            }
            else if (typeof encoder.setCodestreamMode == "function") {
                encoder.setCodestreamMode("HTJ2K");
            }
            else if (typeof encoder.setCodestreamType == "function") {
                encoder.setCodestreamType("HTJ2K");
            }
        }

        var progressionOrder = this.resolveProgressionOrder(options?.progressionOrder);
        if ((progressionOrder != null) && (typeof encoder.setProgressionOrder == "function")) {
            encoder.setProgressionOrder(progressionOrder);
        }

        if (Number.isFinite(Number(options?.quality)) == true) {
            var quality = this.resolveQuality(options?.quality);
            if (typeof encoder.setQuality == "function") {
                if (encoder.setQuality.length >= 2)
                    encoder.setQuality(0, quality);
                else
                    encoder.setQuality(quality);
            }
        }

        encoder.setDecompositions(this.resolveDecompositions(width, height, options));

        if (Number.isFinite(Number(options?.compressionRatio)) == true) {
            var compressionRatio = Number(options.compressionRatio);
            if (typeof encoder.setCompressionRatio == "function") {
                if (encoder.setCompressionRatio.length >= 2)
                    encoder.setCompressionRatio(0, compressionRatio);
                else
                    encoder.setCompressionRatio(compressionRatio);
            }
        }

    }

    /**
     * Copy RGBA bytes into the decoded OpenJPEG source buffer.
     * @param {Uint8Array} rgba Source RGBA bytes.
     * @param {Uint8Array} decoded Target decoded OpenJPEG bytes.
     * @param {number} width Frame width.
     * @param {number} height Frame height.
     * @param {number} componentCount Output component count.
     */
    copyRgbaToDecodedBuffer(rgba, decoded, width, height, componentCount) {

        var sourceOffset = 0;
        var targetOffset = 0;
        var totalPixels = (Math.trunc(width) * Math.trunc(height));

        for (var pixel = 0; pixel < totalPixels; pixel++) {

            var red = rgba[sourceOffset];
            var green = rgba[sourceOffset + 1];
            var blue = rgba[sourceOffset + 2];
            var alpha = rgba[sourceOffset + 3];

            if (componentCount == 1) {
                decoded[targetOffset] = (((77 * red) + (150 * green) + (29 * blue) + 128) >> 8);
                targetOffset += 1;
            }
            else if (componentCount == 4) {
                decoded[targetOffset] = red;
                decoded[targetOffset + 1] = green;
                decoded[targetOffset + 2] = blue;
                decoded[targetOffset + 3] = alpha;
                targetOffset += 4;
            }
            else {
                decoded[targetOffset] = red;
                decoded[targetOffset + 1] = green;
                decoded[targetOffset + 2] = blue;
                targetOffset += 3;
            }

            sourceOffset += 4;

        }

    }

    /**
     * Copy native monochrome samples into one OpenJPEG decoded sample buffer.
     * @param {ArrayBufferView} sourceBytes Source frame bytes.
     * @param {ArrayBufferView} decoded Target decoded buffer.
     * @param {number} width Frame width.
     * @param {number} height Frame height.
     * @param {object | null} options Encode options.
     */
    copyNativeMonochromeSamples(sourceBytes, decoded, width, height, options = null) {

        var pixelCount = (Math.trunc(width) * Math.trunc(height));
        var bitsAllocated = Math.trunc(Number(options?.bitsAllocated));
        if (Number.isFinite(bitsAllocated) == false)
            bitsAllocated = 16;

        var bitsPerSample = Math.trunc(Number(options?.bitsPerSample));
        if (Number.isFinite(bitsPerSample) == false)
            bitsPerSample = bitsAllocated;

        if (bitsPerSample <= 0)
            bitsPerSample = bitsAllocated;

        var sourceBytesPerSample = Math.max(1, Math.ceil(bitsAllocated / 8));
        var targetBytesPerSample = (bitsPerSample > 8) ? 2 : 1;
        var isSigned = (options?.isSigned === true);
        var littleEndian = (options?.littleEndian !== false);
        var decodedBytes = (decoded instanceof Uint8Array)
            ? decoded
            : (
                ArrayBuffer.isView(decoded)
                    ? new Uint8Array(decoded.buffer, decoded.byteOffset, decoded.byteLength)
                    : null
            );
        var canWriteByElement = (
            (ArrayBuffer.isView(decoded) == true)
            && (decoded instanceof Uint8Array == false)
            && (Number(decoded.BYTES_PER_ELEMENT) > 1)
            && (Number(decoded.length) >= pixelCount)
        );

        if ((decodedBytes == null) || (decodedBytes.byteLength < (pixelCount * targetBytesPerSample))) {
            throw new Exception(
                "OpenJPEG decoded source buffer is invalid for native monochrome sample copy.",
                GeneralErrorCodes.GeneralError
            );
        }

        var maxMask = null;
        if ((bitsPerSample > 0) && (bitsPerSample < 31)) {
            maxMask = ((1 << bitsPerSample) - 1);
        }

        var signBit = null;
        var signedRange = null;
        if ((isSigned == true) && (bitsPerSample > 0) && (bitsPerSample < 31)) {
            signBit = (1 << (bitsPerSample - 1));
            signedRange = (1 << bitsPerSample);
        }

        for (var index = 0; index < pixelCount; index++) {

            var byteOffset = (index * sourceBytesPerSample);
            var sample = 0;

            if (sourceBytesPerSample == 1) {
                sample = sourceBytes[byteOffset] ?? 0;
            }
            else {
                var lo = sourceBytes[byteOffset] ?? 0;
                var hi = sourceBytes[byteOffset + 1] ?? 0;
                sample = (littleEndian == true)
                    ? (lo | (hi << 8))
                    : ((lo << 8) | hi);
            }

            if (maxMask != null) {
                sample = (sample & maxMask);
            }

            if (isSigned == true) {
                if ((signBit != null) && (signedRange != null)) {
                    if ((sample & signBit) != 0)
                        sample = (sample - signedRange);
                }
                else if ((bitsPerSample == 32) && ((sample & 0x80000000) != 0)) {
                    sample = (sample - 0x100000000);
                }
            }

            if (targetBytesPerSample == 1) {
                decodedBytes[index] = (sample & 0xFF);
                continue;
            }

            if (canWriteByElement == true) {
                decoded[index] = sample;
                continue;
            }

            var writeOffset = (index * 2);
            var rawSample = (sample & 0xFFFF);
            decodedBytes[writeOffset] = (rawSample & 0xFF);
            decodedBytes[writeOffset + 1] = ((rawSample >> 8) & 0xFF);

        }

    }

    /**
     * Check whether bytes begin with one signature.
     * @param {Uint8Array} bytes Byte payload.
     * @param {Uint8Array} signature Expected signature.
     * @returns {boolean} TRUE when signature matches.
     */
    hasSignature(bytes, signature) {

        if ((bytes == null) || (signature == null))
            return false;

        if (bytes.length < signature.length)
            return false;

        for (var i = 0; i < signature.length; i++) {
            if (bytes[i] != signature[i])
                return false;
        }

        return true;

    }

    /**
     * Validate likely JPEG 2000 payload.
     * @param {Uint8Array} bytes Candidate bytes.
     * @returns {boolean} TRUE when payload has known JPEG 2000 signature.
     */
    isLikelyJpeg2000(bytes) {
        return (
            this.hasSignature(bytes, Jpeg2000RgbaEncoder.CodestreamSignature) ||
            this.hasSignature(bytes, Jpeg2000RgbaEncoder.Jp2Signature)
        );
    }

    /**
     * Normalize arbitrary byte-like value to Uint8Array.
     * @param {*} value The source value.
     * @returns {Uint8Array | null} The normalized bytes.
     */
    toBytes(value) {

        if (value == null)
            return null;

        if (value instanceof Uint8Array)
            return value;

        if (value instanceof ArrayBuffer)
            return new Uint8Array(value);

        if (ArrayBuffer.isView(value))
            return new Uint8Array(value.buffer, value.byteOffset, value.byteLength);

        return null;

    }

    /**
     * Resolve encoder backend from options/instance/global scope.
     * @param {object | null} options Per-call options.
     * @returns {Function | object | null} The encoder backend.
     */
    resolveBackend(options = null) {

        if (options?.backend != null)
            return options.backend;

        if (this.backend != null)
            return this.backend;

        if ((globalThis != null) && (globalThis.EASIJpeg2000Encoder != null))
            return globalThis.EASIJpeg2000Encoder;

        return null;

    }

    /**
     * Resolve OpenJPEG runtime module.
     * @param {object | null} options Encode options.
     * @returns {Promise<object | null>} OpenJPEG module.
     */
    async resolveOpenJpegModule(options = null) {

        return await OpenJpegRuntime.resolve({
            openjpegModule: options?.openjpegModule ?? this.openjpegModule ?? null,
            openjpegFactory: options?.openjpegFactory ?? this.openjpegFactory ?? null,
            openjpegModuleOptions: options?.openjpegModuleOptions ?? null
        });

    }

    /**
     * Execute custom backend encoding.
     * @param {Function | object} backend Backend function/object.
     * @param {Uint8Array} rgba RGBA bytes.
     * @param {number} width Frame width.
     * @param {number} height Frame height.
     * @param {object | null} options Encode options.
     * @returns {Promise<{ bytes: Uint8Array, mimeType: string, format: string }>} Encoded payload.
     */
    async encodeWithBackend(backend, rgba, width, height, options = null) {

        var output = null;

        if (typeof backend == "function")
            output = backend(rgba, width, height, options);
        else if (typeof backend?.encode == "function")
            output = backend.encode(rgba, width, height, options);
        else {
            throw new Exception(
                "Invalid JPEG 2000 encoder backend. Expected function or object with encode(...).",
                GeneralErrorCodes.InvalidParameter
            );
        }

        if (this.isThenable(output) == true)
            output = await output;

        var bytes = null;
        var mimeType = "image/jp2";
        var format = "jpeg2000";

        if ((output?.bytes != null) || (output?.mimeType != null) || (output?.format != null)) {
            bytes = this.toBytes(output?.bytes);
            mimeType = String(output?.mimeType ?? mimeType);
            format = String(output?.format ?? format);
        }
        else {
            bytes = this.toBytes(output);
        }

        if ((bytes == null) || (bytes.length == 0)) {
            throw new Exception(
                "JPEG 2000 encoder backend returned no output bytes.",
                GeneralErrorCodes.GeneralError
            );
        }

        return {
            bytes,
            mimeType,
            format
        };

    }

    /**
     * Encode using bundled OpenJPEG runtime.
     * @param {Uint8Array} rgba RGBA bytes.
     * @param {number} width Frame width.
     * @param {number} height Frame height.
     * @param {object | null} options Encode options.
     * @returns {Promise<{ bytes: Uint8Array, mimeType: string, format: string }>} Encoded output.
     */
    async encodeWithBundledOpenJpeg(rgba, width, height, options = null) {

        var openjpeg = await this.resolveOpenJpegModule(options);
        if ((openjpeg == null) || (typeof openjpeg.J2KEncoder != "function")) {
            throw new Exception(
                "JPEG 2000 encoding is unavailable. Provide an OpenJPEG module/factory via options, constructor, OpenJpegRuntime, or globalThis.EASIOpenJPEGModule.",
                GeneralErrorCodes.NotImplemented
            );
        }

        var componentCount = this.resolveComponentCount(options);
        var encoder = new openjpeg.J2KEncoder();
        var decoded = encoder.getDecodedBuffer({
            width: Math.trunc(width),
            height: Math.trunc(height),
            componentCount,
            bitsPerSample: 8,
            isSigned: false
        });

        if (ArrayBuffer.isView(decoded) == false) {
            throw new Exception(
                "OpenJPEG returned an invalid decoded source buffer.",
                GeneralErrorCodes.GeneralError
            );
        }

        if (decoded instanceof DataView) {
            decoded = new Uint8Array(decoded.buffer, decoded.byteOffset, decoded.byteLength);
        }

        var expectedDecodedLength = (Math.trunc(width) * Math.trunc(height) * componentCount);
        if (decoded.length < expectedDecodedLength) {
            throw new Exception(
                "OpenJPEG decoded source buffer length is smaller than expected.",
                GeneralErrorCodes.GeneralError
            );
        }

        this.copyRgbaToDecodedBuffer(rgba, decoded, width, height, componentCount);

        this.configureOpenJpegEncoder(encoder, width, height, options);

        try {
            encoder.encode();
        }
        catch (error) {
            throw new Exception(
                `OpenJPEG failed to encode JPEG 2000 payload. ${error?.message ?? ""}`.trim(),
                GeneralErrorCodes.GeneralError
            );
        }

        var bytes = this.toBytes(encoder.getEncodedBuffer());
        if ((bytes == null) || (bytes.length == 0) || (this.isLikelyJpeg2000(bytes) == false)) {
            throw new Exception(
                "OpenJPEG produced an invalid JPEG 2000 payload.",
                GeneralErrorCodes.GeneralError
            );
        }

        return {
            bytes,
            mimeType: "image/jp2",
            format: "jpeg2000"
        };

    }

    /**
     * Encode native monochrome source frame bytes to JPEG 2000.
     * @param {ArrayBufferView} sourceBytes Monochrome source frame bytes.
     * @param {number} width Frame width.
     * @param {number} height Frame height.
     * @param {object | null} options Encode options.
     * @returns {Promise<{ bytes: Uint8Array, mimeType: string, format: string }>} Encoded output.
     */
    async encodeMonochromeSamples(sourceBytes, width, height, options = null) {

        if ((ArrayBuffer.isView(sourceBytes) == false) || (sourceBytes == null)) {
            throw new Exception(
                "Invalid monochrome source bytes. Expected one typed-array view.",
                GeneralErrorCodes.InvalidParameter
            );
        }

        var openjpeg = await this.resolveOpenJpegModule(options);
        if ((openjpeg == null) || (typeof openjpeg.J2KEncoder != "function")) {
            throw new Exception(
                "JPEG 2000 encoding is unavailable. Provide an OpenJPEG module/factory via options, constructor, OpenJpegRuntime, or globalThis.EASIOpenJPEGModule.",
                GeneralErrorCodes.NotImplemented
            );
        }

        var bitsAllocated = Math.trunc(Number(options?.bitsAllocated));
        if (Number.isFinite(bitsAllocated) == false)
            bitsAllocated = 16;
        if ((bitsAllocated != 8) && (bitsAllocated != 16)) {
            throw new Exception(
                "Unsupported monochrome bit-depth for JPEG 2000 encoding. Expected 8 or 16 bits allocated.",
                GeneralErrorCodes.NotImplemented
            );
        }

        var bitsPerSample = Math.trunc(Number(options?.bitsPerSample));
        if (Number.isFinite(bitsPerSample) == false)
            bitsPerSample = bitsAllocated;

        if (bitsPerSample <= 0)
            bitsPerSample = bitsAllocated;
        if (bitsPerSample > bitsAllocated)
            bitsPerSample = bitsAllocated;

        var pixelCount = (Math.trunc(width) * Math.trunc(height));
        var bytesPerSample = Math.max(1, Math.ceil(bitsAllocated / 8));
        var expectedLength = (pixelCount * bytesPerSample);
        var sourceLength = sourceBytes?.byteLength ?? sourceBytes?.length ?? 0;
        if (sourceLength < expectedLength) {
            throw new Exception(
                "Invalid monochrome source bytes for JPEG 2000 encoding dimensions.",
                GeneralErrorCodes.InvalidParameter
            );
        }

        var encoder = new openjpeg.J2KEncoder();
        var decoded = encoder.getDecodedBuffer({
            width: Math.trunc(width),
            height: Math.trunc(height),
            componentCount: 1,
            bitsPerSample: bitsPerSample,
            isSigned: (options?.isSigned === true)
        });

        if (ArrayBuffer.isView(decoded) == false) {
            throw new Exception(
                "OpenJPEG returned an invalid decoded source buffer.",
                GeneralErrorCodes.GeneralError
            );
        }

        this.copyNativeMonochromeSamples(sourceBytes, decoded, width, height, {
            bitsAllocated: bitsAllocated,
            bitsPerSample: bitsPerSample,
            isSigned: (options?.isSigned === true),
            littleEndian: (options?.littleEndian !== false)
        });

        this.configureOpenJpegEncoder(encoder, width, height, options);

        try {
            encoder.encode();
        }
        catch (error) {
            throw new Exception(
                `OpenJPEG failed to encode JPEG 2000 payload. ${error?.message ?? ""}`.trim(),
                GeneralErrorCodes.GeneralError
            );
        }

        var bytes = this.toBytes(encoder.getEncodedBuffer());
        if ((bytes == null) || (bytes.length == 0) || (this.isLikelyJpeg2000(bytes) == false)) {
            throw new Exception(
                "OpenJPEG produced an invalid JPEG 2000 payload.",
                GeneralErrorCodes.GeneralError
            );
        }

        return {
            bytes,
            mimeType: "image/jp2",
            format: "jpeg2000"
        };

    }

    /**
     * Encode RGBA bytes to JPEG 2000 bytes.
     * @param {Uint8Array} rgba RGBA bytes.
     * @param {number} width Frame width.
     * @param {number} height Frame height.
     * @param {object | null} options Encode options.
     * @returns {Promise<{ bytes: Uint8Array, mimeType: string, format: string }>} Encoded payload.
     */
    async encode(rgba, width, height, options = null) {

        if ((rgba instanceof Uint8Array) == false) {
            throw new Exception(
                "Invalid RGBA pixel bytes. Expected Uint8Array.",
                GeneralErrorCodes.InvalidParameter
            );
        }

        var expectedLength = (Number(width) * Number(height) * 4);
        if ((Number.isFinite(expectedLength) == false) || (expectedLength <= 0) || (rgba.length < expectedLength)) {
            throw new Exception(
                "Invalid RGBA pixel dimensions for JPEG 2000 encoding.",
                GeneralErrorCodes.InvalidParameter
            );
        }

        var backend = this.resolveBackend(options);
        if (backend != null) {
            return await this.encodeWithBackend(backend, rgba, width, height, options);
        }

        return await this.encodeWithBundledOpenJpeg(rgba, width, height, options);

    }

    /**
     * Construct a JPEG 2000 encoder instance.
     * @param {{ backend?: Function | object | null, openjpegFactory?: Function | object | null, openjpegModule?: object | null } | null} options Encoder options.
     */
    constructor(options = null) {
        this.backend = options?.backend ?? null;
        this.openjpegFactory = options?.openjpegFactory ?? null;
        this.openjpegModule = options?.openjpegModule ?? null;
    }

};
