//
// DicomTranscodingFilter.js - 1.0.0
//
// Stream DICOM Transcoding Filter Class
//

import Exception, { GeneralErrorCodes } from "../../environment/Exception.js";
import Tag from "../../dicom/Tag.js";
import TransferSyntax from "../../dicom/TransferSyntax.js";
import Configuration from "../../environment/Configuration.js";
import Attribute from "../../dicom/Attribute.js";
import Preamble from "../../dicom/Preamble.js";
import Prefix from "../../dicom/Prefix.js";
import Constants from "../../dicom/Constants.js";
import { Status } from "../../parsers/Status.js";

const TranscodingContextSymbol = Symbol("TranscodingContext");

export const TranscodingGoals = {
    COMPATIBILITY: "compatibility",
    SIZE: "size",
    SPEED: "speed",
    FIDELITY: "fidelity"
};

export const TranscodingStreamingModes = {
    AUTO: "auto",
    REQUIRED: "required",
    ALLOW_BUFFER: "allow-buffer"
};

export const TranscodingFallbackModes = {
    FAIL: "fail",
    SKIP_FRAME: "skip-frame",
    PASSTHROUGH: "passthrough"
};

export const TranscodingConcernSeverity = {
    INFO: "info",
    WARNING: "warning",
    ERROR: "error"
};

export const TranscodingConcernCategory = {
    DECODE: "Decode",
    ENCODE: "Encode",
    POLICY: "Policy",
    COMPATIBILITY: "Compatibility",
    DATA_QUALITY: "DataQuality",
    STREAMING: "Streaming",
    IO: "I/O"
};

export default class DicomTranscodingFilter {

    /**
     * Forward an event call to the next handler when supported.
     * @param {string} name The event name.
     * @param {object} context The current context.
     * @param {*} param The event parameter.
     * @returns {*} The forwarded result.
     */
    async forward(name, context, param = null) {

        if ((this.nextHandler == null) || (this.nextHandler[name] == null))
            return null;

        const result = this.nextHandler[name](context, param);

        if ((result != null) && (typeof result.then == "function"))
            return await result;

        return result;

    }

    /**
     * Ensure transcoding runtime state exists in the parse context.
     * @param {object} context The parse context.
     * @returns {object} The ensured context.
     */
    ensureState(context) {

        if (context == null) {
            context = {};
        }

        if (context[TranscodingContextSymbol] == null) {
            context[TranscodingContextSymbol] = this.createInitialState();
        }

        return context;

    }

    /**
     * Create a fresh per-instance transcoding runtime state object.
     * @returns {object} The runtime state.
     */
    createInitialState() {
        return {
            isInMetaSet: false,
            isInDataSet: false,
            sourceTransferSyntax: this.sourceTransferSyntax ?? TransferSyntax.NONE,
            mode: "pending",
            requiresPixelTransform: false,
            rows: null,
            columns: null,
            samplesPerPixel: 1,
            bitsAllocated: null,
            bitsStored: null,
            highBit: null,
            pixelRepresentation: 0,
            planarConfiguration: 0,
            photometricInterpretation: null,
            redPaletteColorLookupTableData: null,
            greenPaletteColorLookupTableData: null,
            bluePaletteColorLookupTableData: null,
            numberOfFrames: 1,
            pixelData: {
                bytesSeen: 0,
                framesEmitted: 0,
                transcodeActive: false,
                sourceAttribute: null,
                chunks: []
            },
            deferredSamplesPerPixelAttribute: null,
            hasForwardedPlanarConfiguration: false,
            metaAttributes: [],
            metaTransferSyntaxLengthDelta: 0,
            hasReportedAssumedSourceTransferSyntax: false,
            hasSourceMetaSet: false,
            hasEmittedSyntheticPart10Header: false
        };
    }

    /**
     * Reset instance runtime state while preserving shared filter configuration.
     * @param {object} state The current runtime state.
     */
    resetInstanceState(state) {

        state.isInMetaSet = false;
        state.isInDataSet = false;
        state.sourceTransferSyntax = this.sourceTransferSyntax ?? TransferSyntax.NONE;
        state.mode = "pending";
        state.requiresPixelTransform = false;
        state.rows = null;
        state.columns = null;
        state.samplesPerPixel = 1;
        state.bitsAllocated = null;
        state.bitsStored = null;
        state.highBit = null;
        state.pixelRepresentation = 0;
        state.planarConfiguration = 0;
        state.photometricInterpretation = null;
        state.redPaletteColorLookupTableData = null;
        state.greenPaletteColorLookupTableData = null;
        state.bluePaletteColorLookupTableData = null;
        state.numberOfFrames = 1;
        state.pixelData = {
            bytesSeen: 0,
            framesEmitted: 0,
            transcodeActive: false,
            sourceAttribute: null,
            chunks: []
        };
        state.deferredSamplesPerPixelAttribute = null;
        state.hasForwardedPlanarConfiguration = false;
        state.metaAttributes = [];
        state.metaTransferSyntaxLengthDelta = 0;
        state.hasReportedAssumedSourceTransferSyntax = false;
        state.hasSourceMetaSet = false;
        state.hasEmittedSyntheticPart10Header = false;

    }

    /**
     * Get runtime state from context.
     * @param {object} context The parse context.
     * @returns {object | null} The runtime state.
     */
    getState(context) {
        return (context == null) ? null : context[TranscodingContextSymbol];
    }

    /**
     * Normalize a transfer-syntax input to a registered TransferSyntax.
     * @param {TransferSyntax | string | null} transferSyntax The transfer syntax value.
     * @returns {TransferSyntax | null} The resolved transfer syntax.
     */
    resolveTransferSyntax(transferSyntax) {

        if (transferSyntax == null)
            return null;

        if (typeof transferSyntax == "string")
            return TransferSyntax.find(transferSyntax) ?? null;

        if ((transferSyntax?.ID != null) && (typeof transferSyntax.ID == "string"))
            return TransferSyntax.find(transferSyntax.ID) ?? transferSyntax;

        return null;

    }

    /**
     * Normalize transcoding goal.
     * @param {string | null} goal The candidate goal.
     * @returns {string} The normalized goal.
     */
    normalizeGoal(goal) {

        var normalized = String(goal ?? "").trim().toLowerCase();

        if (normalized == TranscodingGoals.SIZE)
            return TranscodingGoals.SIZE;

        if (normalized == TranscodingGoals.SPEED)
            return TranscodingGoals.SPEED;

        if (normalized == TranscodingGoals.FIDELITY)
            return TranscodingGoals.FIDELITY;

        return TranscodingGoals.COMPATIBILITY;

    }

    /**
     * Normalize streaming mode.
     * @param {string | null} mode The candidate mode.
     * @returns {string} The normalized mode.
     */
    normalizeStreaming(mode) {

        var normalized = String(mode ?? "").trim().toLowerCase();

        if (normalized == TranscodingStreamingModes.REQUIRED)
            return TranscodingStreamingModes.REQUIRED;

        if (normalized == TranscodingStreamingModes.ALLOW_BUFFER)
            return TranscodingStreamingModes.ALLOW_BUFFER;

        return TranscodingStreamingModes.AUTO;

    }

    /**
     * Normalize fallback mode.
     * @param {string | null} fallback The candidate fallback mode.
     * @returns {string} The normalized fallback mode.
     */
    normalizeFallback(fallback) {

        var normalized = String(fallback ?? "").trim().toLowerCase();

        if (normalized == TranscodingFallbackModes.PASSTHROUGH)
            return TranscodingFallbackModes.PASSTHROUGH;

        if (normalized == TranscodingFallbackModes.SKIP_FRAME)
            return TranscodingFallbackModes.SKIP_FRAME;

        return TranscodingFallbackModes.FAIL;

    }

    /**
     * Normalize raw transcoding options.
     * @param {string | object | null | false} options Raw options.
     * @returns {object} Normalized options.
     */
    normalizeOptions(options) {

        var normalizedOptions = null;

        if ((options == null) || (options === false)) {
            throw new Exception(
                "Invalid transcoding options. Expected transfer syntax identifier or options object.",
                GeneralErrorCodes.InvalidParameter
            );
        }

        if (typeof options == "string") {
            normalizedOptions = {
                targetTransferSyntax: options
            };
        }
        else if (typeof options == "object") {
            normalizedOptions = Object.assign({}, options);
        }
        else {
            throw new Exception(
                "Invalid transcoding options. Expected transfer syntax identifier or options object.",
                GeneralErrorCodes.InvalidParameter
            );
        }

        var targetTransferSyntax = this.resolveTransferSyntax(normalizedOptions.targetTransferSyntax);
        if (targetTransferSyntax == null) {
            throw new Exception(
                "Invalid transcoding target transfer syntax.",
                GeneralErrorCodes.InvalidParameter
            );
        }

        var sourceTransferSyntax = null;
        if (normalizedOptions.sourceTransferSyntax != null) {
            sourceTransferSyntax = this.resolveTransferSyntax(normalizedOptions.sourceTransferSyntax);
            if (sourceTransferSyntax == null) {
                throw new Exception(
                    "Invalid transcoding source transfer syntax.",
                    GeneralErrorCodes.InvalidParameter
                );
            }
        }

        var onFrame = normalizedOptions.onFrame ?? null;
        if ((onFrame != null) && (typeof onFrame != "function")) {
            throw new Exception(
                'Invalid transcoding "onFrame". Expected function or null.',
                GeneralErrorCodes.InvalidParameter
            );
        }

        var onConcern = normalizedOptions.onConcern ?? null;
        if ((onConcern != null) && (typeof onConcern != "function")) {
            throw new Exception(
                'Invalid transcoding "onConcern". Expected function or null.',
                GeneralErrorCodes.InvalidParameter
            );
        }

        return {
            targetTransferSyntax: targetTransferSyntax,
            sourceTransferSyntax: sourceTransferSyntax,
            goal: this.normalizeGoal(normalizedOptions.goal),
            streaming: this.normalizeStreaming(normalizedOptions.streaming),
            fallback: this.normalizeFallback(normalizedOptions.fallback),
            frames: normalizedOptions.frames ?? "all",
            codec: normalizedOptions.codec ?? null,
            metadata: normalizedOptions.metadata ?? null,
            codecRegistry: normalizedOptions.codecRegistry ?? Configuration.global.codecRegistry,
            onFrame: onFrame,
            onConcern: onConcern
        };

    }

    /**
     * Determine whether the source/target pair is currently supported.
     * v1 support intentionally covers syntax-only transcodes where pixel payload can remain byte-identical:
     * - same transfer syntax ID
     * - uncompressed transfer syntaxes with matching endian-ness
     * @param {TransferSyntax} sourceTransferSyntax Source transfer syntax.
     * @param {TransferSyntax} targetTransferSyntax Target transfer syntax.
     * @returns {boolean} TRUE when supported.
     */
    isSupportedSyntaxPair(sourceTransferSyntax, targetTransferSyntax) {

        if ((sourceTransferSyntax == null) || (targetTransferSyntax == null))
            return false;

        if (sourceTransferSyntax.ID == targetTransferSyntax.ID) {
            if (this.requiresPixelPayloadTranscode(sourceTransferSyntax, targetTransferSyntax) == true)
                return this.isSupportedPixelPayloadPair(sourceTransferSyntax, targetTransferSyntax);
            return true;
        }

        if (this.requiresPixelPayloadTranscode(sourceTransferSyntax, targetTransferSyntax) == true)
            return this.isSupportedPixelPayloadPair(sourceTransferSyntax, targetTransferSyntax);

        if (sourceTransferSyntax.IsLittleEndian != targetTransferSyntax.IsLittleEndian)
            return false;

        // Keep metadata streaming-safe by only allowing transfer-syntax UID rewrites
        // that fit in the original encoded UI byte-length.
        var sourceUIDLength = this.resolveUIEncodedLength(sourceTransferSyntax.ID);
        var targetUIDLength = this.resolveUIEncodedLength(targetTransferSyntax.ID);
        if (targetUIDLength > sourceUIDLength)
            return false;

        return true;

    }

    /**
     * Determine if one transfer syntax is a JPEG 2000 variant currently supported by configured codecs.
     * @param {TransferSyntax | null} transferSyntax The candidate transfer syntax.
     * @returns {boolean} TRUE when JPEG 2000 syntax.
     */
    isJpeg2000TransferSyntax(transferSyntax) {

        var id = transferSyntax?.ID ?? null;
        if (id == null)
            return false;

        return (
            (id == TransferSyntax.JPEG2000Lossless.ID)
            || (id == TransferSyntax.JPEG2000.ID)
            || (id == TransferSyntax.JPEG2000MCLossless.ID)
            || (id == TransferSyntax.JPEG2000MC.ID)
            || (id == TransferSyntax.HTJ2KLossless.ID)
            || (id == TransferSyntax.HTJ2KLosslessRPCL.ID)
            || (id == TransferSyntax.HTJ2K.ID)
        );

    }

    /**
     * Determine if one transfer syntax is JPEG Baseline 8-bit.
     * @param {TransferSyntax | null} transferSyntax The candidate transfer syntax.
     * @returns {boolean} TRUE when JPEG Baseline 8-bit syntax.
     */
    isJpegBaselineTransferSyntax(transferSyntax) {

        var id = transferSyntax?.ID ?? null;
        if (id == null)
            return false;

        return (id == TransferSyntax.JPEGBaseline8Bit.ID);

    }

    /**
     * Determine if one transfer syntax is JPEG 2000 lossless.
     * @param {TransferSyntax | null} transferSyntax The candidate transfer syntax.
     * @returns {boolean} TRUE when JPEG 2000 lossless syntax.
     */
    isJpeg2000LosslessTransferSyntax(transferSyntax) {

        var id = transferSyntax?.ID ?? null;
        if (id == null)
            return false;

        return (
            (id == TransferSyntax.JPEG2000Lossless.ID)
            || (id == TransferSyntax.JPEG2000MCLossless.ID)
            || (id == TransferSyntax.HTJ2KLossless.ID)
            || (id == TransferSyntax.HTJ2KLosslessRPCL.ID)
        );

    }

    /**
     * Determine if the configured codec registry has an explicit decoder for the transfer syntax.
     * @param {TransferSyntax | null} transferSyntax The candidate transfer syntax.
     * @returns {boolean} TRUE when a decoder is explicitly registered.
     */
    hasRegisteredDecoderForTransferSyntax(transferSyntax) {

        if (transferSyntax == null)
            return false;

        var registry = this.codecRegistry;
        if ((registry == null) || (typeof registry != "object"))
            return false;

        if (typeof registry.hasDecoderForTransferSyntax == "function")
            return (registry.hasDecoderForTransferSyntax(transferSyntax) == true);

        var transferSyntaxID = transferSyntax?.ID ?? null;
        if (transferSyntaxID == null)
            return false;

        return (registry.decoderConstructors?.[transferSyntaxID] != null);

    }

    /**
     * Determine if one transfer syntax is an HTJ2K variant.
     * @param {TransferSyntax | null} transferSyntax The candidate transfer syntax.
     * @returns {boolean} TRUE when HTJ2K syntax.
     */
    isHtj2kTransferSyntax(transferSyntax) {

        var id = transferSyntax?.ID ?? null;
        if (id == null)
            return false;

        return (
            (id == TransferSyntax.HTJ2KLossless.ID)
            || (id == TransferSyntax.HTJ2KLosslessRPCL.ID)
            || (id == TransferSyntax.HTJ2K.ID)
        );

    }

    /**
     * Determine if one transfer syntax is DICOM RLE Lossless.
     * @param {TransferSyntax | null} transferSyntax The candidate transfer syntax.
     * @returns {boolean} TRUE when RLE Lossless syntax.
     */
    isRleTransferSyntax(transferSyntax) {
        return ((transferSyntax?.ID ?? null) == TransferSyntax.RLELossless.ID);
    }

    /**
     * Resolve compressed-output codec name based on target transfer syntax.
     * @returns {string} Codec name.
     */
    resolveCompressedOutputCodecName() {
        if (this.isRleTransferSyntax(this.targetTransferSyntax) == true)
            return "rle";

        if (this.isJpegBaselineTransferSyntax(this.targetTransferSyntax) == true)
            return "jpeg";

        return (this.isHtj2kTransferSyntax(this.targetTransferSyntax) == true)
            ? "htj2k"
            : "jpeg2000";
    }

    /**
     * Determine whether this source/target pair requires real pixel payload transform.
     * @param {TransferSyntax | null} sourceTransferSyntax Source transfer syntax.
     * @param {TransferSyntax | null} targetTransferSyntax Target transfer syntax.
     * @returns {boolean} TRUE when payload transform is required.
     */
    requiresPixelPayloadTranscode(sourceTransferSyntax, targetTransferSyntax) {

        if ((sourceTransferSyntax == null) || (targetTransferSyntax == null))
            return false;

        if (sourceTransferSyntax.ID == targetTransferSyntax.ID)
            return false;

        return ((sourceTransferSyntax.IsCompressed == true) || (targetTransferSyntax.IsCompressed == true));

    }

    /**
     * Determine whether this compressed/uncompressed pair is supported by v2 pixel payload transcoding.
     * @param {TransferSyntax} sourceTransferSyntax Source transfer syntax.
     * @param {TransferSyntax} targetTransferSyntax Target transfer syntax.
     * @returns {boolean} TRUE when supported.
     */
    isSupportedPixelPayloadPair(sourceTransferSyntax, targetTransferSyntax) {

        if ((sourceTransferSyntax == null) || (targetTransferSyntax == null))
            return false;

        if ((sourceTransferSyntax.ID == targetTransferSyntax.ID)
            && (sourceTransferSyntax.IsCompressed != true))
            return true;

        // Source compressed requires a registered decoder.
        if ((sourceTransferSyntax.IsCompressed == true)
            && (this.hasRegisteredDecoderForTransferSyntax(sourceTransferSyntax) == false))
            return false;

        // v2 target scope for compressed output includes JPEG baseline, JPEG 2000 and RLE.
        if ((targetTransferSyntax.IsCompressed == true)
            && (this.isRleTransferSyntax(targetTransferSyntax) == false)
            && (this.isJpeg2000TransferSyntax(targetTransferSyntax) == false)
            && (this.isJpegBaselineTransferSyntax(targetTransferSyntax) == false))
            return false;

        // If compressed output is requested, require a registered encoder for this family.
        if (targetTransferSyntax.IsCompressed == true) {
            var outputCodec = this.isRleTransferSyntax(targetTransferSyntax)
                ? "rle"
                : (
                    (this.isHtj2kTransferSyntax(targetTransferSyntax) == true)
                        ? "htj2k"
                        : (this.isJpegBaselineTransferSyntax(targetTransferSyntax) == true ? "jpeg" : "jpeg2000")
                );

            if (outputCodec == "jpeg") {
                if ((this.codecRegistry?.hasEncoder?.("jpeg") != true)
                    && (this.codecRegistry?.hasEncoder?.("jpg") != true)) {
                    return false;
                }
            }
            else if (outputCodec == "rle") {
                if ((this.codecRegistry?.hasEncoder?.("rle") != true)
                    && (this.codecRegistry?.hasEncoder?.("rle-lossless") != true)
                    && (this.codecRegistry?.hasEncoder?.("dicom-rle") != true)) {
                    return false;
                }
            }
            else if ((this.codecRegistry?.hasEncoder?.(outputCodec) != true)
                && (this.codecRegistry?.hasEncoder?.("jpeg2000") != true)) {
                return false;
            }
        }

        // Source uncompressed may be little-endian or big-endian.
        // decodeFrameToRGBA already honors source endianness.

        if ((targetTransferSyntax.IsCompressed == false) && (targetTransferSyntax.IsLittleEndian != true))
            return false;

        return true;

    }

    /**
     * Resolve an integer-like attribute value.
     * @param {*} value Attribute value.
     * @param {number | null} defaultValue Default value.
     * @returns {number | null} Integer value.
     */
    toInteger(value, defaultValue = null) {

        var numericValue = Number(value);
        if (Number.isFinite(numericValue) == false)
            return defaultValue;

        return Math.floor(numericValue);

    }

    /**
     * Resolve one numeric-like value, including first item from multi-valued strings/arrays.
     * @param {*} value Source value.
     * @param {number | null} defaultValue Default numeric value.
     * @returns {number | null} Numeric value.
     */
    toNumber(value, defaultValue = null) {

        var candidate = value;
        if (Array.isArray(candidate) == true) {
            candidate = (candidate.length > 0) ? candidate[0] : null;
        }

        if (typeof candidate == "string") {
            var first = candidate.split("\\")[0]?.trim?.() ?? "";
            candidate = (first.length > 0) ? first : null;
        }

        var numericValue = Number(candidate);
        if (Number.isFinite(numericValue) == false)
            return defaultValue;

        return numericValue;

    }

    /**
     * Resolve frame size from current image metadata.
     * @param {object} state Runtime state.
     * @returns {number | null} Frame size in bytes.
     */
    resolveFrameSize(state) {

        if ((state.rows == null) || (state.columns == null) || (state.bitsAllocated == null))
            return null;

        var rows = this.toInteger(state.rows, null);
        var columns = this.toInteger(state.columns, null);
        var bitsAllocated = this.toInteger(state.bitsAllocated, null);
        var samplesPerPixel = this.toInteger(state.samplesPerPixel ?? 1, 1);

        if ((rows == null) || (columns == null) || (bitsAllocated == null))
            return null;

        if ((rows <= 0) || (columns <= 0) || (bitsAllocated <= 0) || (samplesPerPixel <= 0))
            return null;

        if ((bitsAllocated % 8) != 0)
            return null;

        var bytesPerSample = (bitsAllocated / 8);
        return (rows * columns * samplesPerPixel * bytesPerSample);

    }

    /**
     * Determine whether a status is terminal for parser flow.
     * @param {*} status The status value.
     * @returns {boolean} TRUE for terminal status.
     */
    isTerminalStatus(status) {
        return ((status == Status.FAIL) || (status == Status.STOP) || (status == Status.JUMP));
    }

    /**
     * Resolve action label for concern payload based on current mode.
     * @param {object} state Runtime state.
     * @returns {string} Action label.
     */
    resolveActionTaken(state) {

        if (state.mode == "failed")
            return "failed";

        if (state.mode == "passthrough")
            return "passthrough";

        return "continued";

    }

    /**
     * Resolve encoded value length for a UI value in DICOM byte representation.
     * @param {string | null} value The UI value.
     * @returns {number} The encoded length (including even-length padding).
     */
    resolveUIEncodedLength(value) {

        var bytes = (new TextEncoder()).encode(String(value ?? ""));
        var length = bytes.length;
        if ((length % 2) != 0) {
            length += 1;
        }

        return length;

    }

    /**
     * Build UI bytes for a transfer-syntax UID override.
     * @param {string} transferSyntaxID The transfer-syntax UID.
     * @param {number | null} targetLength Optional fixed byte-length.
     * @returns {Uint8Array} The encoded UI bytes.
     */
    buildTransferSyntaxUIDValueBytes(transferSyntaxID, targetLength = null) {

        var bytes = (new TextEncoder()).encode(String(transferSyntaxID ?? ""));
        var length = bytes.length;

        if ((length % 2) != 0) {
            var padded = new Uint8Array(length + 1);
            padded.set(bytes, 0);
            bytes = padded;
            length = bytes.length;
        }

        if ((typeof targetLength == "number")
            && Number.isFinite(targetLength)
            && (targetLength > 0)
            && (targetLength >= length)) {

            var fixed = new Uint8Array(targetLength);
            fixed.set(bytes, 0);
            return fixed;

        }

        return bytes;

    }

    /**
     * Emit one concern and honor callback-returned status values.
     * @param {object} context Parse context.
     * @param {object} state Runtime state.
     * @param {object} concern Concern payload.
     * @returns {*} Status.
     */
    async reportConcern(context, state, concern = {}) {

        var payload = {
            severity: concern.severity ?? TranscodingConcernSeverity.WARNING,
            category: concern.category ?? TranscodingConcernCategory.POLICY,
            code: concern.code ?? "TranscodingConcern",
            message: concern.message ?? "Transcoding concern.",
            scope: concern.scope ?? "Pipeline",
            path: concern.path ?? null,
            frameIndex: concern.frameIndex ?? null,
            sourceTransferSyntax: state?.sourceTransferSyntax?.ID ?? null,
            targetTransferSyntax: this.targetTransferSyntax?.ID ?? null,
            actionTaken: concern.actionTaken ?? this.resolveActionTaken(state),
            error: concern.error ?? null
        };

        this._concerns.push(payload);

        if (this._onConcern != null) {

            var callbackStatus = this._onConcern(payload);
            if ((callbackStatus != null) && (typeof callbackStatus.then == "function")) {
                callbackStatus = await callbackStatus;
            }

            if (this.isTerminalStatus(callbackStatus) == true) {
                return callbackStatus;
            }

        }

        return Status.CONTINUE;

    }

    /**
     * Emit one frame callback and honor callback-returned status values.
     * @param {object} context Parse context.
     * @param {object} state Runtime state.
     * @param {object} frameInfo Frame callback payload.
     * @returns {*} Status.
     */
    async emitFrame(context, state, frameInfo = {}) {

        if (this._onFrame == null)
            return Status.CONTINUE;

        var payload = Object.assign({
            instanceUid: null,
            frameIndex: 0,
            frameCount: null,
            sourceTransferSyntax: state?.sourceTransferSyntax?.ID ?? null,
            targetTransferSyntax: this.targetTransferSyntax?.ID ?? null,
            decodeCodec: null,
            encodeCodec: null,
            sourceBytes: null,
            targetBytes: null,
            elapsedMs: null,
            rows: state?.rows ?? null,
            columns: state?.columns ?? null,
            samplesPerPixel: state?.samplesPerPixel ?? null,
            bitsAllocated: state?.bitsAllocated ?? null,
            isLossy: this.targetTransferSyntax?.IsLossy ?? null,
            isFinalFrame: null,
            warnings: []
        }, frameInfo);

        var callbackStatus = this._onFrame(payload);
        if ((callbackStatus != null) && (typeof callbackStatus.then == "function")) {
            callbackStatus = await callbackStatus;
        }

        if (this.isTerminalStatus(callbackStatus) == true) {
            return callbackStatus;
        }

        return Status.CONTINUE;

    }

    /**
     * Update image metadata cache from one completed attribute.
     * @param {object} state Runtime state.
     * @param {object} attribute Completed attribute.
     */
    updateImageMetadata(state, attribute) {

        if ((state == null) || (attribute?.tag == null))
            return;

        var tagID = attribute.tag.ID;

        if (tagID == Tag.Rows.ID) {
            state.rows = this.toInteger(attribute.value, state.rows);
            return;
        }

        if (tagID == Tag.Columns.ID) {
            state.columns = this.toInteger(attribute.value, state.columns);
            return;
        }

        if (tagID == Tag.SamplesPerPixel.ID) {
            state.samplesPerPixel = this.toInteger(attribute.value, state.samplesPerPixel);
            return;
        }

        if (tagID == Tag.BitsAllocated.ID) {
            state.bitsAllocated = this.toInteger(attribute.value, state.bitsAllocated);
            return;
        }

        if (tagID == Tag.BitsStored.ID) {
            state.bitsStored = this.toInteger(attribute.value, state.bitsStored);
            return;
        }

        if (tagID == Tag.HighBit.ID) {
            state.highBit = this.toInteger(attribute.value, state.highBit);
            return;
        }

        if (tagID == Tag.PixelRepresentation.ID) {
            state.pixelRepresentation = this.toInteger(attribute.value, state.pixelRepresentation);
            return;
        }

        if (tagID == Tag.PlanarConfiguration.ID) {
            state.planarConfiguration = this.toInteger(attribute.value, state.planarConfiguration);
            return;
        }

        if (tagID == Tag.PhotometricInterpretation.ID) {
            state.photometricInterpretation = String(attribute.value ?? "").trim().toUpperCase();
            return;
        }

        if (tagID == Tag.RedPaletteColorLookupTableData.ID) {
            state.redPaletteColorLookupTableData = attribute.access?.()?.slice?.(0) ?? attribute.value ?? null;
            return;
        }

        if (tagID == Tag.GreenPaletteColorLookupTableData.ID) {
            state.greenPaletteColorLookupTableData = attribute.access?.()?.slice?.(0) ?? attribute.value ?? null;
            return;
        }

        if (tagID == Tag.BluePaletteColorLookupTableData.ID) {
            state.bluePaletteColorLookupTableData = attribute.access?.()?.slice?.(0) ?? attribute.value ?? null;
            return;
        }

        if (tagID == Tag.NumberOfFrames.ID) {
            state.numberOfFrames = Math.max(1, this.toInteger(attribute.value, state.numberOfFrames));
            return;
        }

        if (tagID == Tag.WindowCenter.ID) {
            state.windowCenter = this.toNumber(attribute.value, state.windowCenter ?? null);
            return;
        }

        if (tagID == Tag.WindowWidth.ID) {
            state.windowWidth = this.toNumber(attribute.value, state.windowWidth ?? null);
            return;
        }

    }

    /**
     * Resolve target samples-per-pixel after pixel payload transcoding.
     * @param {object} state Runtime state.
     * @returns {number} Target samples-per-pixel.
     */
    resolveTargetSamplesPerPixel(state) {
        if (this.isJpegBaselineTransferSyntax(this.targetTransferSyntax) == true)
            return 3;

        var sourceSamples = this.toInteger(state?.samplesPerPixel, 1);
        if (String(state?.photometricInterpretation ?? "").toUpperCase() == "PALETTE COLOR")
            return 3;
        return (sourceSamples <= 1) ? 1 : 3;
    }

    /**
     * Determine whether this instance can use the native monochrome-to-JPEG 2000 transcode path.
     * @param {object} state Runtime state.
     * @returns {boolean} TRUE when native monochrome path is available.
     */
    canUseNativeMonochromePath(state) {

        if (this.isJpeg2000TransferSyntax(this.targetTransferSyntax) != true)
            return false;

        if (state?.sourceTransferSyntax?.IsCompressed == true)
            return false;

        var samplesPerPixel = Math.max(1, this.toInteger(state?.samplesPerPixel, 1));
        if (samplesPerPixel != 1)
            return false;

        var bitsAllocated = Math.max(0, this.toInteger(state?.bitsAllocated, 0));
        if (bitsAllocated != 16)
            return false;

        return true;

    }

    /**
     * Determine whether source pixel metadata should be preserved for native JPEG 2000 transcode path.
     * @param {object} state Runtime state.
     * @returns {boolean} TRUE when metadata should be preserved.
     */
    shouldPreserveLosslessPixelMetadata(state) {
        if (this.isJpeg2000TransferSyntax(this.targetTransferSyntax) != true)
            return false;

        if (state?.sourceTransferSyntax == null)
            return false;

        if (state.sourceTransferSyntax.IsCompressed == true)
            return false;

        var samplesPerPixel = Math.max(1, this.toInteger(state?.samplesPerPixel, 1));
        return (samplesPerPixel == 1);
    }

    /**
     * Determine if the specified tag should be metadata-overridden for compressed payload transcoding.
     * @param {string | null} tagID The tag identifier.
     * @returns {boolean} TRUE when metadata override applies.
     */
    isPixelMetadataTag(tagID) {
        return (
            (tagID == Tag.SamplesPerPixel.ID)
            || (tagID == Tag.PhotometricInterpretation.ID)
            || (tagID == Tag.PlanarConfiguration.ID)
            || (tagID == Tag.BitsAllocated.ID)
            || (tagID == Tag.BitsStored.ID)
            || (tagID == Tag.HighBit.ID)
            || (tagID == Tag.PixelRepresentation.ID)
            || (tagID == Tag.WindowCenter.ID)
            || (tagID == Tag.WindowWidth.ID)
            || (tagID == Tag.SmallestImagePixelValue.ID)
            || (tagID == Tag.LargestImagePixelValue.ID)
        );
    }

    /**
     * Determine if the specified tag is one of the palette lookup-table metadata attributes.
     * @param {string | null} tagID The tag identifier.
     * @returns {boolean} TRUE when palette lookup-table metadata tag.
     */
    isPaletteLookupTableTag(tagID) {
        return (
            (tagID == Tag.RedPaletteColorLookupTableDescriptor.ID)
            || (tagID == Tag.GreenPaletteColorLookupTableDescriptor.ID)
            || (tagID == Tag.BluePaletteColorLookupTableDescriptor.ID)
            || (tagID == Tag.LargeRedPaletteColorLookupTableDescriptor.ID)
            || (tagID == Tag.LargeGreenPaletteColorLookupTableDescriptor.ID)
            || (tagID == Tag.LargeBluePaletteColorLookupTableDescriptor.ID)
            || (tagID == Tag.PaletteColorLookupTableUID.ID)
            || (tagID == Tag.RedPaletteColorLookupTableData.ID)
            || (tagID == Tag.GreenPaletteColorLookupTableData.ID)
            || (tagID == Tag.BluePaletteColorLookupTableData.ID)
            || (tagID == Tag.LargeRedPaletteColorLookupTableData.ID)
            || (tagID == Tag.LargeGreenPaletteColorLookupTableData.ID)
            || (tagID == Tag.LargeBluePaletteColorLookupTableData.ID)
            || (tagID == Tag.LargePaletteColorLookupTableUID.ID)
            || (tagID == Tag.SegmentedRedPaletteColorLookupTableData.ID)
            || (tagID == Tag.SegmentedGreenPaletteColorLookupTableData.ID)
            || (tagID == Tag.SegmentedBluePaletteColorLookupTableData.ID)
        );
    }

    /**
     * Determine if palette lookup-table metadata should be suppressed in output.
     * This applies when RGBA-based transcode materializes RGB output.
     * @param {object} state Runtime state.
     * @param {object} attribute Current attribute.
     * @returns {boolean} TRUE when attribute should be suppressed from output.
     */
    shouldSuppressPaletteLookupTableAttribute(state, attribute) {

        if ((state?.mode != "transcode") || (state?.requiresPixelTransform != true))
            return false;

        var tagID = attribute?.tag?.ID ?? null;
        if (this.isPaletteLookupTableTag(tagID) != true)
            return false;

        var targetSamplesPerPixel = this.resolveTargetSamplesPerPixel(state);
        return (targetSamplesPerPixel > 1);

    }

    /**
     * Determine whether PlanarConfiguration must be synthesized before PixelData output.
     * @param {object} state Runtime state.
     * @param {object} attribute Current attribute.
     * @returns {boolean} TRUE when synthetic planar configuration should be emitted.
     */
    shouldEmitSyntheticPlanarConfigurationBeforePixelData(state, attribute) {

        if ((state?.mode != "transcode") || (state?.requiresPixelTransform != true))
            return false;

        if (this.isPixelDataAttribute(attribute) != true)
            return false;

        if (this.targetTransferSyntax?.IsCompressed == true)
            return false;

        if (state?.hasForwardedPlanarConfiguration == true)
            return false;

        return (this.resolveTargetSamplesPerPixel(state) > 1);

    }

    /**
     * Emit one synthetic PlanarConfiguration attribute for RGB uncompressed outputs.
     * @param {object} context Parse context.
     * @param {object} state Runtime state.
     * @returns {*} Status.
     */
    async emitSyntheticPlanarConfiguration(context, state) {

        var syntheticPlanar = new Attribute(
            Tag.PlanarConfiguration,
            0,
            new Uint8Array(0),
            this.targetTransferSyntax
        );

        syntheticPlanar.value = 0;
        syntheticPlanar.isBulkStreamed = false;
        syntheticPlanar.isMaterialized = true;
        syntheticPlanar.isComplete = true;

        var startStatus = await this.forward("onStartAttribute", context, syntheticPlanar);
        if (this.isTerminalStatus(startStatus) == true)
            return startStatus;

        var endStatus = await this.forward("onEndAttribute", context, syntheticPlanar);
        if (this.isTerminalStatus(endStatus) == true)
            return endStatus;

        state.planarConfiguration = 0;
        state.hasForwardedPlanarConfiguration = true;

        return Status.CONTINUE;

    }

    /**
     * Determine whether SamplesPerPixel override should be deferred until source photometric context is known.
     * This avoids order-sensitive output when SamplesPerPixel is encoded before PhotometricInterpretation.
     * @param {object} state Runtime state.
     * @returns {boolean} TRUE when deferral is needed.
     */
    shouldDeferSamplesPerPixelOverride(state) {

        var sourceSamples = this.toInteger(state?.samplesPerPixel, 1);
        if (sourceSamples > 1)
            return false;

        var sourcePhotometric = String(state?.photometricInterpretation ?? "").trim().toUpperCase();
        return (sourcePhotometric.length == 0);

    }

    /**
     * Determine whether a deferred SamplesPerPixel attribute can be safely emitted now.
     * @param {object} state Runtime state.
     * @param {object} currentAttribute Current attribute being completed.
     * @returns {boolean} TRUE when deferred SamplesPerPixel should be flushed.
     */
    canFlushDeferredSamplesPerPixel(state, currentAttribute) {

        var sourcePhotometric = String(state?.photometricInterpretation ?? "").trim().toUpperCase();
        if (sourcePhotometric.length > 0)
            return true;

        return (this.isPixelDataAttribute(currentAttribute) == true);

    }

    /**
     * Apply metadata overrides required by RGBA-based pixel transcoding path.
     * @param {object} state Runtime state.
     * @param {object} attribute Current attribute.
     */
    applyPixelMetadataOverride(state, attribute) {

        if (attribute?.tag?.ID == null)
            return;

        // Keep source pixel metadata intact for native-lossless monochrome JPEG 2000 transcodes.
        if (this.shouldPreserveLosslessPixelMetadata(state) == true)
            return;

        var targetSamplesPerPixel = this.resolveTargetSamplesPerPixel(state);
        var tagID = attribute.tag.ID;

        if (tagID == Tag.SamplesPerPixel.ID) {
            attribute.value = targetSamplesPerPixel;
            return;
        }

        if (tagID == Tag.PhotometricInterpretation.ID) {
            if (this.isJpegBaselineTransferSyntax(this.targetTransferSyntax) == true) {
                attribute.value = "YBR_FULL";
            }
            else {
                attribute.value = (targetSamplesPerPixel == 1) ? "MONOCHROME2" : "RGB";
            }
            return;
        }

        if (tagID == Tag.PlanarConfiguration.ID) {
            attribute.value = 0;
            return;
        }

        if (tagID == Tag.BitsAllocated.ID) {
            attribute.value = 8;
            return;
        }

        if (tagID == Tag.BitsStored.ID) {
            attribute.value = 8;
            return;
        }

        if (tagID == Tag.HighBit.ID) {
            attribute.value = 7;
            return;
        }

        if (tagID == Tag.PixelRepresentation.ID) {
            attribute.value = 0;
            return;
        }

        var sourceBitsStored = Math.max(1, this.toInteger(state?.bitsStored ?? state?.bitsAllocated, 8));
        var sourceMax = (sourceBitsStored >= 31)
            ? Number.MAX_SAFE_INTEGER
            : ((1 << sourceBitsStored) - 1);
        var scale = (sourceMax > 0) ? (255 / sourceMax) : 1;

        if (tagID == Tag.WindowCenter.ID) {
            var sourceWindowCenter = this.toNumber(attribute.value, state?.windowCenter ?? null);
            if (sourceWindowCenter == null)
                sourceWindowCenter = ((sourceMax + 1) / 2);
            var scaledCenter = (sourceWindowCenter * scale);
            attribute.value = String(Math.round(scaledCenter * 1000) / 1000);
            return;
        }

        if (tagID == Tag.WindowWidth.ID) {
            var sourceWindowWidth = this.toNumber(attribute.value, state?.windowWidth ?? null);
            if (sourceWindowWidth == null)
                sourceWindowWidth = Math.max(1, sourceMax);
            var scaledWidth = Math.max(1, (sourceWindowWidth * scale));
            attribute.value = String(Math.round(scaledWidth * 1000) / 1000);
            return;
        }

        if (tagID == Tag.SmallestImagePixelValue.ID) {
            attribute.value = 0;
            return;
        }

        if (tagID == Tag.LargestImagePixelValue.ID) {
            attribute.value = 255;
            return;
        }

    }

    /**
     * Update source transfer syntax from one attribute when available.
     * @param {object} state Runtime state.
     * @param {object} attribute Current attribute.
     */
    updateSourceTransferSyntaxFromAttribute(state, attribute) {

        if (state == null)
            return;

        var transferSyntax = this.resolveTransferSyntax(attribute?.transferSyntax);
        if (transferSyntax == null)
            return;

        if ((state.sourceTransferSyntax == null) || (state.sourceTransferSyntax.ID == TransferSyntax.NONE.ID)) {
            state.sourceTransferSyntax = transferSyntax;
        }

    }

    /**
     * Evaluate instance transcoding mode when source syntax becomes available.
     * @param {object} context Parse context.
     * @param {object} state Runtime state.
     * @returns {*} Status.
     */
    async evaluateMode(context, state) {

        if (state.mode == "failed")
            return Status.FAIL;

        if ((state.mode == "transcode") || (state.mode == "passthrough"))
            return Status.CONTINUE;

        var sourceTransferSyntax = this.resolveTransferSyntax(state.sourceTransferSyntax) ?? TransferSyntax.NONE;
        state.sourceTransferSyntax = sourceTransferSyntax;

        if (sourceTransferSyntax.ID == TransferSyntax.NONE.ID) {

            // Raw data-set inputs may not include Part-10 File Meta Information.
            // For transcoding, assume the DICOM default transfer syntax.
            if (state.isInDataSet == true) {

                sourceTransferSyntax = TransferSyntax.ImplicitVRLittleEndian;
                state.sourceTransferSyntax = sourceTransferSyntax;

                if (state.hasReportedAssumedSourceTransferSyntax != true) {
                    state.hasReportedAssumedSourceTransferSyntax = true;

                    var assumptionStatus = await this.reportConcern(context, state, {
                        severity: TranscodingConcernSeverity.WARNING,
                        category: TranscodingConcernCategory.COMPATIBILITY,
                        code: "AssumedSourceTransferSyntax",
                        message: `Source transfer syntax was not declared. Assuming '${sourceTransferSyntax.ID}' for data-set transcoding.`,
                        scope: "Instance"
                    });

                    if (this.isTerminalStatus(assumptionStatus) == true)
                        return assumptionStatus;
                }

            }
            else {
                return Status.CONTINUE;
            }

        }

        if (this.isSupportedSyntaxPair(sourceTransferSyntax, this.targetTransferSyntax) == true) {
            state.mode = "transcode";
            state.requiresPixelTransform = this.requiresPixelPayloadTranscode(sourceTransferSyntax, this.targetTransferSyntax);
            return Status.CONTINUE;
        }

        if ((this.fallback == TranscodingFallbackModes.PASSTHROUGH)
            || (this.fallback == TranscodingFallbackModes.SKIP_FRAME)) {
            state.mode = "passthrough";
        }
        else {
            state.mode = "failed";
        }

        var concernStatus = await this.reportConcern(context, state, {
            severity: TranscodingConcernSeverity.ERROR,
            category: TranscodingConcernCategory.COMPATIBILITY,
            code: "UnsupportedTransferSyntaxPair",
            message: `Transfer syntax transcoding from '${sourceTransferSyntax.ID}' to '${this.targetTransferSyntax.ID}' is not currently supported.`,
            scope: "Instance"
        });

        if (this.isTerminalStatus(concernStatus) == true) {
            state.mode = "failed";
            return concernStatus;
        }

        if (state.mode == "passthrough") {
            return Status.CONTINUE;
        }

        return Status.FAIL;

    }

    /**
     * Apply transfer syntax override to dataset elements in transcode mode.
     * @param {object} state Runtime state.
     * @param {object} attribute Current attribute/sequence.
     */
    applyTransferSyntaxOverride(state, attribute) {

        if (attribute == null)
            return;

        if (state.mode != "transcode")
            return;

        if (state.isInDataSet != true)
            return;

        attribute.transferSyntax = this.targetTransferSyntax;

    }

    /**
     * Build synthetic Part-10 file-meta attributes for transcode output when source meta is absent.
     * @returns {Array<Attribute>} Meta attributes in emit order.
     */
    buildSyntheticPart10MetaAttributes() {

        var transferSyntaxValue = this.targetTransferSyntax.ID;
        var transferSyntaxValueLength = this.resolveUIEncodedLength(transferSyntaxValue);

        // (0002,0010) TransferSyntaxUID: tag(4) + VR(2) + VL(2) + value(n)
        var transferSyntaxElementLength = (8 + transferSyntaxValueLength);

        var fileMetaGroupLengthAttribute = new Attribute(
            Tag.FileMetaInformationGroupLength,
            4,
            new Uint8Array(0),
            TransferSyntax.ExplicitVRLittleEndian
        );
        fileMetaGroupLengthAttribute.value = transferSyntaxElementLength;

        var transferSyntaxAttribute = new Attribute(
            Tag.TransferSyntaxUID,
            transferSyntaxValueLength,
            new Uint8Array(0),
            TransferSyntax.ExplicitVRLittleEndian
        );
        transferSyntaxAttribute.value = transferSyntaxValue;

        return [
            fileMetaGroupLengthAttribute,
            transferSyntaxAttribute
        ];

    }

    /**
     * Emit one synthetic attribute through the standard lifecycle for downstream handlers.
     * @param {object} context Parse context.
     * @param {Attribute} attribute Synthetic attribute.
     * @returns {*} Status.
     */
    async emitSyntheticAttribute(context, attribute) {

        var startStatus = await this.forward("onStartAttribute", context, attribute);
        if (this.isTerminalStatus(startStatus) == true)
            return startStatus;

        var appendStatus = await this.forward("onAppendAttribute", context, attribute);
        if (this.isTerminalStatus(appendStatus) == true)
            return appendStatus;

        var endStatus = await this.forward("onEndAttribute", context, attribute);
        if (this.isTerminalStatus(endStatus) == true)
            return endStatus;

        return Status.CONTINUE;

    }

    /**
     * Emit a synthetic Part-10 preamble/prefix/meta-set for outputs that otherwise have no source meta-set.
     * @param {object} context Parse context.
     * @param {object} state Runtime state.
     * @returns {*} Status.
     */
    async emitSyntheticPart10Header(context, state) {

        if (state.hasEmittedSyntheticPart10Header == true)
            return Status.CONTINUE;

        var preamble = new Preamble(new Uint8Array(Constants.PreambleLength));
        var prefix = new Prefix((new TextEncoder()).encode(Constants.PrefixValue));

        var preambleStartStatus = await this.forward("onStartPreamble", context, preamble);
        if (this.isTerminalStatus(preambleStartStatus) == true)
            return preambleStartStatus;

        var preambleEndStatus = await this.forward("onEndPreamble", context, preamble);
        if (this.isTerminalStatus(preambleEndStatus) == true)
            return preambleEndStatus;

        var prefixStartStatus = await this.forward("onStartPrefix", context, prefix);
        if (this.isTerminalStatus(prefixStartStatus) == true)
            return prefixStartStatus;

        var prefixEndStatus = await this.forward("onEndPrefix", context, prefix);
        if (this.isTerminalStatus(prefixEndStatus) == true)
            return prefixEndStatus;

        var metaStartStatus = await this.forward("onStartMetaSet", context);
        if (this.isTerminalStatus(metaStartStatus) == true)
            return metaStartStatus;

        var metaAttributes = this.buildSyntheticPart10MetaAttributes();
        for (var i = 0; i < metaAttributes.length; i++) {
            var attributeStatus = await this.emitSyntheticAttribute(context, metaAttributes[i]);
            if (this.isTerminalStatus(attributeStatus) == true)
                return attributeStatus;
        }

        var metaEndStatus = await this.forward("onEndMetaSet", context);
        if (this.isTerminalStatus(metaEndStatus) == true)
            return metaEndStatus;

        state.hasSourceMetaSet = true;
        state.hasEmittedSyntheticPart10Header = true;

        return Status.CONTINUE;

    }

    /**
     * Emit frame events from streamed PixelData chunks when frame boundaries are derivable.
     * @param {object} context Parse context.
     * @param {object} state Runtime state.
     * @param {object} attribute PixelData attribute.
     * @param {Uint8Array} chunk Value chunk.
     * @param {boolean} isFinalChunk Final-chunk flag.
     * @returns {*} Status.
     */
    async emitChunkFrameEvents(context, state, attribute, chunk, isFinalChunk) {

        if (this._onFrame == null)
            return Status.CONTINUE;

        if ((chunk == null) || (chunk.length == 0))
            return Status.CONTINUE;

        var frameSize = this.resolveFrameSize(state);
        var frameCount = Math.max(1, this.toInteger(state.numberOfFrames, 1));
        var bytesBefore = state.pixelData.bytesSeen;
        var bytesAfter = (bytesBefore + chunk.length);

        if ((frameSize == null) || (frameSize <= 0)) {

            state.pixelData.bytesSeen = bytesAfter;

            if ((isFinalChunk == true) && (state.pixelData.framesEmitted == 0)) {

                var unknownStatus = await this.emitFrame(context, state, {
                    frameIndex: 0,
                    frameCount: null,
                    sourceBytes: bytesAfter,
                    targetBytes: bytesAfter,
                    isFinalFrame: true
                });

                if (this.isTerminalStatus(unknownStatus) == true)
                    return unknownStatus;

                state.pixelData.framesEmitted = 1;

            }

            return Status.CONTINUE;

        }

        while (state.pixelData.framesEmitted < frameCount) {

            var nextFrameBoundary = ((state.pixelData.framesEmitted + 1) * frameSize);
            if (bytesAfter < nextFrameBoundary)
                break;

            var frameStatus = await this.emitFrame(context, state, {
                frameIndex: state.pixelData.framesEmitted,
                frameCount: frameCount,
                sourceBytes: frameSize,
                targetBytes: frameSize,
                isFinalFrame: ((state.pixelData.framesEmitted + 1) >= frameCount)
            });

            if (this.isTerminalStatus(frameStatus) == true)
                return frameStatus;

            state.pixelData.framesEmitted += 1;

        }

        state.pixelData.bytesSeen = bytesAfter;

        return Status.CONTINUE;

    }

    /**
     * Emit frame events for materialized PixelData when chunk events were unavailable.
     * @param {object} context Parse context.
     * @param {object} state Runtime state.
     * @param {object} attribute PixelData attribute.
     * @returns {*} Status.
     */
    async emitMaterializedFrameEvents(context, state, attribute) {

        if (this._onFrame == null)
            return Status.CONTINUE;

        var frameSize = this.resolveFrameSize(state);
        var totalBytes = (typeof attribute?.length == "function") ? attribute.length() : 0;
        var frameCount = Math.max(1, this.toInteger(state.numberOfFrames, 1));

        if ((frameSize == null) || (frameSize <= 0)) {

            if (state.pixelData.framesEmitted == 0) {
                var unknownStatus = await this.emitFrame(context, state, {
                    frameIndex: 0,
                    frameCount: null,
                    sourceBytes: totalBytes,
                    targetBytes: totalBytes,
                    isFinalFrame: true
                });

                if (this.isTerminalStatus(unknownStatus) == true)
                    return unknownStatus;

                state.pixelData.framesEmitted = 1;
            }

            return Status.CONTINUE;

        }

        var expectedFrames = Math.min(frameCount, Math.floor(totalBytes / frameSize));

        while (state.pixelData.framesEmitted < expectedFrames) {

            var frameIndex = state.pixelData.framesEmitted;
            var frameStatus = await this.emitFrame(context, state, {
                frameIndex: frameIndex,
                frameCount: frameCount,
                sourceBytes: frameSize,
                targetBytes: frameSize,
                isFinalFrame: ((frameIndex + 1) >= expectedFrames)
            });

            if (this.isTerminalStatus(frameStatus) == true)
                return frameStatus;

            state.pixelData.framesEmitted += 1;

        }

        return Status.CONTINUE;

    }

    /**
     * Determine if the current attribute is PixelData.
     * @param {object | null} attribute The current attribute.
     * @returns {boolean} TRUE when PixelData attribute.
     */
    isPixelDataAttribute(attribute) {
        return (attribute?.tag?.ID == Tag.PixelData?.ID);
    }

    /**
     * Determine if pixel transcoding capture is active for this attribute.
     * @param {object} state Runtime state.
     * @param {object} attribute Current attribute.
     * @returns {boolean} TRUE when active.
     */
    isActivePixelCapture(state, attribute) {
        return (
            (state?.pixelData?.transcodeActive == true)
            && (state?.pixelData?.sourceAttribute === attribute)
            && (this.isPixelDataAttribute(attribute) == true)
        );
    }

    /**
     * Build one contiguous byte array from chunks.
     * @param {Array<Uint8Array>} chunks The chunks.
     * @returns {Uint8Array} The contiguous bytes.
     */
    joinChunks(chunks) {

        if ((Array.isArray(chunks) == false) || (chunks.length == 0))
            return new Uint8Array(0);

        if (chunks.length == 1)
            return chunks[0];

        var totalLength = 0;
        for (var i = 0; i < chunks.length; i++) {
            totalLength += chunks[i].length;
        }

        var data = new Uint8Array(totalLength);
        var offset = 0;
        for (var c = 0; c < chunks.length; c++) {
            data.set(chunks[c], offset);
            offset += chunks[c].length;
        }

        return data;

    }

    /**
     * Encode one uint32 LE value.
     * @param {number} value The value.
     * @returns {Uint8Array} The encoded bytes.
     */
    encodeUInt32LE(value) {
        var bytes = new Uint8Array(4);
        (new DataView(bytes.buffer)).setUint32(0, (value >>> 0), true);
        return bytes;
    }

    /**
     * Encode one encapsulated item (FFFE,E000 + value length + payload).
     * @param {Uint8Array} payload The payload bytes.
     * @returns {Uint8Array} Encoded item bytes.
     */
    encodeItem(payload) {

        var valueBytes = payload ?? new Uint8Array(0);
        if ((valueBytes.length % 2) != 0) {
            var padded = new Uint8Array(valueBytes.length + 1);
            padded.set(valueBytes, 0);
            valueBytes = padded;
        }

        var item = new Uint8Array(8 + valueBytes.length);
        var view = new DataView(item.buffer);
        view.setUint16(0, 0xFFFE, true);
        view.setUint16(2, 0xE000, true);
        view.setUint32(4, valueBytes.length, true);
        item.set(valueBytes, 8);

        return item;

    }

    /**
     * Build encapsulated PixelData bytes (without sequence delimitation item).
     * @param {Array<Uint8Array>} frames Encoded frame payload bytes.
     * @returns {Uint8Array} Encapsulated PixelData bytes.
     */
    buildEncapsulatedPixelData(frames) {

        var frameList = (Array.isArray(frames) == true) ? frames : [];

        // Basic Offset Table (BOT): include explicit frame offsets to improve decoder compatibility.
        var offsets = new Uint8Array(frameList.length * 4);
        var runningOffset = 0;
        for (var i = 0; i < frameList.length; i++) {
            (new DataView(offsets.buffer)).setUint32((i * 4), runningOffset >>> 0, true);

            var frameLength = frameList[i]?.length ?? 0;
            if ((frameLength % 2) != 0)
                frameLength += 1;
            runningOffset += (8 + frameLength);
        }

        var chunks = [this.encodeItem(offsets)];
        for (var f = 0; f < frameList.length; f++) {
            chunks.push(this.encodeItem(frameList[f]));
        }

        return this.joinChunks(chunks);

    }

    /**
     * Parse encapsulated PixelData bytes to frame payloads.
     * @param {Uint8Array} bytes Encapsulated bytes.
     * @returns {Array<Uint8Array>} Frame payload bytes.
     */
    extractEncapsulatedFrames(bytes, expectedFrameCount = null) {

        var frames = [];
        if ((bytes instanceof Uint8Array) == false)
            return frames;

        var index = 0;
        var itemPayloads = [];
        var itemOffsets = [];
        var basicOffsetTable = [];
        var runningOffset = 0;

        while ((index + 8) <= bytes.length) {

            var view = new DataView(bytes.buffer, bytes.byteOffset + index, 8);
            var group = view.getUint16(0, true);
            var element = view.getUint16(2, true);
            var length = view.getUint32(4, true);

            // Sequence delimitation item (FFFE,E0DD)
            if ((group == 0xFFFE) && (element == 0xE0DD))
                break;

            if (!((group == 0xFFFE) && (element == 0xE000)))
                break;

            var start = (index + 8);
            var stop = (start + length);
            if (stop > bytes.length)
                break;

            itemPayloads.push(bytes.slice(start, stop));
            itemOffsets.push(runningOffset);
            runningOffset += (8 + length);
            index = stop;

        }

        if (itemPayloads.length <= 1)
            return frames;

        // Parse BOT offsets.
        var botPayload = itemPayloads[0];
        if ((botPayload.length >= 4) && ((botPayload.length % 4) == 0)) {
            for (var b = 0; b < botPayload.length; b += 4) {
                basicOffsetTable.push((new DataView(botPayload.buffer, botPayload.byteOffset + b, 4)).getUint32(0, true));
            }
        }

        // Item payloads after BOT are compressed fragments.
        var fragmentPayloads = itemPayloads.slice(1);
        var fragmentOffsets = itemOffsets.slice(1);
        if (fragmentPayloads.length == 0)
            return frames;

        var expectedFrames = this.toInteger(expectedFrameCount, null);
        if ((expectedFrames != null) && (expectedFrames <= 0))
            expectedFrames = null;

        // Single-frame encapsulated payloads may be split across many fragments.
        // Reassemble all fragments into one codestream in this case.
        if (expectedFrames == 1) {
            frames.push(this.joinChunks(fragmentPayloads));
            return frames;
        }

        // If BOT provides frame starts, map offsets to fragment boundaries and join.
        if (basicOffsetTable.length > 0) {

            var frameStartIndices = [];
            for (var o = 0; o < basicOffsetTable.length; o++) {
                var offset = basicOffsetTable[o];
                var startIndex = -1;
                for (var f = 0; f < fragmentOffsets.length; f++) {
                    if (fragmentOffsets[f] == offset) {
                        startIndex = f;
                        break;
                    }
                }

                if (startIndex == -1)
                    continue;

                if ((frameStartIndices.length == 0) || (frameStartIndices[frameStartIndices.length - 1] != startIndex)) {
                    frameStartIndices.push(startIndex);
                }
            }

            if (frameStartIndices.length > 0) {
                if (frameStartIndices[0] != 0)
                    frameStartIndices.unshift(0);

                for (var s = 0; s < frameStartIndices.length; s++) {
                    var fragmentStartIndex = frameStartIndices[s];
                    var fragmentStopIndex = (s < (frameStartIndices.length - 1))
                        ? frameStartIndices[s + 1]
                        : fragmentPayloads.length;

                    if (fragmentStopIndex <= fragmentStartIndex)
                        continue;

                    frames.push(this.joinChunks(fragmentPayloads.slice(fragmentStartIndex, fragmentStopIndex)));
                }

                if (frames.length > 0)
                    return frames;
            }
        }

        // Fallback: one fragment per frame.
        for (var i = 0; i < fragmentPayloads.length; i++) {
            frames.push(fragmentPayloads[i]);
        }

        return frames;

    }

    /**
     * Resolve source frames from raw PixelData bytes.
     * @param {object} state Runtime state.
     * @param {Uint8Array} sourceBytes Source PixelData bytes.
     * @returns {Array<Uint8Array>} Source frame bytes.
     */
    resolveSourceFrames(state, sourceBytes) {

        if (state?.sourceTransferSyntax?.IsCompressed == true) {
            var expectedFrameCount = Math.max(1, this.toInteger(state.numberOfFrames, 1));
            return this.extractEncapsulatedFrames(sourceBytes, expectedFrameCount);
        }

        var frameSize = this.resolveFrameSize(state);
        if ((frameSize == null) || (frameSize <= 0))
            return [];

        var frameCountFromMetadata = Math.max(1, this.toInteger(state.numberOfFrames, 1));
        var frameCountFromBytes = Math.max(1, Math.floor(sourceBytes.length / frameSize));
        var frameCount = Math.min(frameCountFromMetadata, frameCountFromBytes);
        if (frameCount <= 0)
            frameCount = frameCountFromBytes;
        if (frameCount <= 0)
            frameCount = 1;

        var frames = [];
        for (var i = 0; i < frameCount; i++) {
            var start = (i * frameSize);
            var stop = Math.min(sourceBytes.length, (start + frameSize));
            if (stop <= start)
                break;
            frames.push(sourceBytes.slice(start, stop));
        }

        return frames;

    }

    /**
     * Configure OpenJPEG-related options on one codec instance when supported.
     * @param {object | null} codecInstance The codec instance.
     * @param {object | null} codecOptions Codec options.
     */
    configureCodecInstance(codecInstance, codecOptions = null) {

        if ((codecInstance == null) || (codecOptions == null))
            return;

        var optionKeys = Object.keys(codecOptions);
        for (var optionIndex = 0; optionIndex < optionKeys.length; optionIndex++) {
            var optionKey = optionKeys[optionIndex];
            codecInstance[optionKey] = codecOptions[optionKey];
        }

        if ((codecOptions.openjpegFactory != null) && ("openjpegFactory" in codecInstance))
            codecInstance.openjpegFactory = codecOptions.openjpegFactory;

        if ((codecOptions.openjpegModule != null) && ("openjpegModule" in codecInstance))
            codecInstance.openjpegModule = codecOptions.openjpegModule;

    }

    /**
     * Resolve codec options branch from transcoding options.
     * @param {string} branch Branch name.
     * @returns {object | null} Branch options.
     */
    resolveCodecOptions(branch) {

        var codec = this.codec;
        if ((codec == null) || (typeof codec != "object"))
            return null;

        if ((codec[branch] != null) && (typeof codec[branch] == "object"))
            return codec[branch];

        return codec;

    }

    /**
     * Resolve compressed-output encode options with sane defaults for lossless target syntaxes.
     * @returns {object} Encode options.
     */
    resolveCompressedEncodeOptions() {

        var encodeOptions = Object.assign({}, this.resolveCodecOptions("encode") ?? {});

        if (this.isHtj2kTransferSyntax(this.targetTransferSyntax) == true) {
            encodeOptions.htj2k = true;
        }

        if (this.targetTransferSyntax?.ID == TransferSyntax.HTJ2KLosslessRPCL.ID) {
            if (encodeOptions.progressionOrder == null)
                encodeOptions.progressionOrder = "RPCL";
        }

        if (this.isJpeg2000LosslessTransferSyntax(this.targetTransferSyntax) == true) {
            if (Number.isFinite(Number(encodeOptions.compressionRatio)) == false)
                encodeOptions.compressionRatio = 1;
            if (Number.isFinite(Number(encodeOptions.quality)) == false)
                encodeOptions.quality = 100;
        }

        return encodeOptions;

    }

    /**
     * Decode one source frame bytes to RGBA.
     * @param {object} state Runtime state.
     * @param {Uint8Array} frameBytes Source frame bytes.
     * @returns {Promise<Uint8Array>} RGBA bytes.
     */
    async decodeFrameToRGBA(state, frameBytes) {

        var rows = Math.max(1, this.toInteger(state.rows, 1));
        var columns = Math.max(1, this.toInteger(state.columns, 1));
        var rgba = new Uint8Array(rows * columns * 4);

        if (state?.sourceTransferSyntax?.IsCompressed == true) {

            var decoder = this.codecRegistry.getDecoderForTransferSyntax(state.sourceTransferSyntax, null);
            var decodeOptions = Object.assign({}, this.resolveCodecOptions("decode") ?? {});
            decodeOptions.rows = rows;
            decodeOptions.columns = columns;
            decodeOptions.samplesPerPixel = this.toInteger(state.samplesPerPixel, 1);
            decodeOptions.bitsAllocated = this.toInteger(state.bitsAllocated, 8);
            decodeOptions.bitsStored = this.toInteger(state.bitsStored ?? state.bitsAllocated, decodeOptions.bitsAllocated);
            decodeOptions.pixelRepresentation = this.toInteger(state.pixelRepresentation, 0);
            decodeOptions.planarConfiguration = this.toInteger(state.planarConfiguration, 0);
            decodeOptions.photometricInterpretation = String(state.photometricInterpretation ?? "").trim().toUpperCase();
            decodeOptions.redPaletteColorLookupTableData = state.redPaletteColorLookupTableData ?? null;
            decodeOptions.greenPaletteColorLookupTableData = state.greenPaletteColorLookupTableData ?? null;
            decodeOptions.bluePaletteColorLookupTableData = state.bluePaletteColorLookupTableData ?? null;
            this.configureCodecInstance(decoder, decodeOptions);
            decoder.decode(frameBytes, 0, frameBytes.length, rgba, 0);
            return rgba;

        }

        // Uncompressed decode (v2 scope): 8/16-bit mono and 8-bit RGB.
        var samplesPerPixel = Math.max(1, this.toInteger(state.samplesPerPixel, 1));
        var bitsAllocated = Math.max(1, this.toInteger(state.bitsAllocated, 8));
        var pixelRepresentation = Math.max(0, this.toInteger(state.pixelRepresentation, 0));
        var bitsStored = Math.max(1, this.toInteger(state.bitsStored ?? bitsAllocated, bitsAllocated));
        var planarConfiguration = Math.max(0, this.toInteger(state.planarConfiguration, 0));
        var littleEndian = (state?.sourceTransferSyntax?.IsLittleEndian != false);
        var pixelCount = (rows * columns);

        if ((samplesPerPixel == 1) && (bitsAllocated == 8)) {
            for (var i = 0; i < pixelCount; i++) {
                var gray = frameBytes[i] ?? 0;
                var destinationOffset = (i * 4);
                rgba[destinationOffset + 0] = gray;
                rgba[destinationOffset + 1] = gray;
                rgba[destinationOffset + 2] = gray;
                rgba[destinationOffset + 3] = 255;
            }
            return rgba;
        }

        if ((samplesPerPixel == 1) && (bitsAllocated == 16)) {

            var minValue = (pixelRepresentation == 1) ? (-(1 << (Math.min(bitsStored, 31) - 1))) : 0;
            var maxValue = (pixelRepresentation == 1)
                ? ((1 << (Math.min(bitsStored, 31) - 1)) - 1)
                : ((bitsStored >= 16) ? 65535 : ((1 << bitsStored) - 1));

            for (var p = 0; p < pixelCount; p++) {
                var sourceOffset = (p * 2);
                if ((sourceOffset + 1) >= frameBytes.length)
                    break;

                var sample = littleEndian
                    ? (frameBytes[sourceOffset] | (frameBytes[sourceOffset + 1] << 8))
                    : ((frameBytes[sourceOffset] << 8) | frameBytes[sourceOffset + 1]);

                if (pixelRepresentation == 1) {
                    if ((sample & 0x8000) != 0)
                        sample = (sample - 0x10000);
                }

                if (sample < minValue)
                    sample = minValue;
                if (sample > maxValue)
                    sample = maxValue;

                var normalized = Math.round(((sample - minValue) / Math.max(1, (maxValue - minValue))) * 255);
                if (normalized < 0)
                    normalized = 0;
                if (normalized > 255)
                    normalized = 255;

                var destinationOffset = (p * 4);
                rgba[destinationOffset + 0] = normalized;
                rgba[destinationOffset + 1] = normalized;
                rgba[destinationOffset + 2] = normalized;
                rgba[destinationOffset + 3] = 255;
            }

            return rgba;

        }

        if ((samplesPerPixel >= 3) && (bitsAllocated == 8)) {

            if (planarConfiguration == 0) {
                for (var x = 0; x < pixelCount; x++) {
                    var sourceOffset = (x * samplesPerPixel);
                    var destinationOffset = (x * 4);
                    rgba[destinationOffset + 0] = frameBytes[sourceOffset + 0] ?? 0;
                    rgba[destinationOffset + 1] = frameBytes[sourceOffset + 1] ?? 0;
                    rgba[destinationOffset + 2] = frameBytes[sourceOffset + 2] ?? 0;
                    rgba[destinationOffset + 3] = 255;
                }
                return rgba;
            }

            var planeLength = pixelCount;
            for (var y = 0; y < pixelCount; y++) {
                var destinationOffset = (y * 4);
                rgba[destinationOffset + 0] = frameBytes[y] ?? 0;
                rgba[destinationOffset + 1] = frameBytes[y + planeLength] ?? 0;
                rgba[destinationOffset + 2] = frameBytes[y + (planeLength * 2)] ?? 0;
                rgba[destinationOffset + 3] = 255;
            }
            return rgba;

        }

        throw new Exception(
            "Unsupported uncompressed source pixel layout for transcoding.",
            GeneralErrorCodes.NotImplemented
        );

    }

    /**
     * Transform one decoded RGBA frame before encode.
     * Subclasses can override to apply in-flight pixel operations.
     * @param {object} context Parse context.
     * @param {object} state Runtime state.
     * @param {Uint8Array} rgba RGBA bytes.
     * @param {number} frameIndex Zero-based frame index.
     * @param {number | null} frameCount Optional frame count.
     * @returns {Promise<Uint8Array>} Transformed RGBA bytes.
     */
    async transformFrameRGBA(context, state, rgba, frameIndex = 0, frameCount = null) {
        return rgba;
    }

    /**
     * Encode RGBA frame bytes to the target transfer syntax representation.
     * @param {object} state Runtime state.
     * @param {Uint8Array} rgba RGBA bytes.
     * @returns {Promise<Uint8Array>} Encoded frame bytes.
     */
    async encodeFrameFromRGBA(state, rgba) {

        var rows = Math.max(1, this.toInteger(state.rows, 1));
        var columns = Math.max(1, this.toInteger(state.columns, 1));
        var targetSamplesPerPixel = this.resolveTargetSamplesPerPixel(state);

        if (this.targetTransferSyntax?.IsCompressed == true) {

            var codecName = this.resolveCompressedOutputCodecName();
            var encoder = this.codecRegistry?.getEncoder?.(codecName)
                ?? Configuration.global.getEncoderFor(codecName);
            if ((encoder == null) && (codecName == "jpeg")) {
                encoder = this.codecRegistry?.getEncoder?.("jpg")
                    ?? Configuration.global.getEncoderFor("jpg");
            }
            else if ((encoder == null) && (codecName == "rle")) {
                encoder = this.codecRegistry?.getEncoder?.("rle-lossless")
                    ?? this.codecRegistry?.getEncoder?.("dicom-rle")
                    ?? Configuration.global.getEncoderFor("rle-lossless")
                    ?? Configuration.global.getEncoderFor("dicom-rle");
            }

            if (encoder == null) {
                throw new Exception(
                    "No compressed target encoder is configured.",
                    GeneralErrorCodes.NotImplemented
                );
            }

            var encoderInstance = (typeof encoder?.constructor == "function")
                ? new encoder.constructor()
                : encoder;

            var encodeCodecOptions = this.resolveCompressedEncodeOptions();
            encodeCodecOptions.componentCount = targetSamplesPerPixel;
            this.configureCodecInstance(encoderInstance, encodeCodecOptions);

            var encoded = await encoderInstance.encode(rgba, columns, rows, encodeCodecOptions);
            var encodedBytes = encoded?.bytes;
            if ((encodedBytes instanceof Uint8Array) == false) {
                throw new Exception(
                    "Compressed target encoder returned invalid payload bytes.",
                    GeneralErrorCodes.GeneralError
                );
            }

            return encodedBytes;

        }

        // Target uncompressed frame in 8-bit samples (derived from RGBA).
        var pixelCount = (rows * columns);

        if (targetSamplesPerPixel == 1) {
            var grayBytes = new Uint8Array(pixelCount);
            for (var i = 0; i < pixelCount; i++) {
                var sourceOffset = (i * 4);
                var red = rgba[sourceOffset + 0] ?? 0;
                var green = rgba[sourceOffset + 1] ?? 0;
                var blue = rgba[sourceOffset + 2] ?? 0;
                grayBytes[i] = (((77 * red) + (150 * green) + (29 * blue) + 128) >> 8);
            }
            return grayBytes;
        }

        var rgbBytes = new Uint8Array(pixelCount * 3);
        for (var p = 0; p < pixelCount; p++) {
            var rgbaOffset = (p * 4);
            var rgbOffset = (p * 3);
            rgbBytes[rgbOffset + 0] = rgba[rgbaOffset + 0] ?? 0;
            rgbBytes[rgbOffset + 1] = rgba[rgbaOffset + 1] ?? 0;
            rgbBytes[rgbOffset + 2] = rgba[rgbaOffset + 2] ?? 0;
        }

        return rgbBytes;

    }

    /**
     * Encode one native monochrome source frame directly to JPEG 2000 without RGBA normalization.
     * @param {object} state Runtime state.
     * @param {Uint8Array} frameBytes Source frame bytes.
     * @returns {Promise<Uint8Array>} Encoded frame bytes.
     */
    async encodeNativeMonochromeFrame(state, frameBytes) {

        var rows = Math.max(1, this.toInteger(state.rows, 1));
        var columns = Math.max(1, this.toInteger(state.columns, 1));

        var encoder = this.codecRegistry?.getEncoder?.("jpeg2000")
            ?? Configuration.global.getEncoderFor("jpeg2000");
        if (this.isHtj2kTransferSyntax(this.targetTransferSyntax) == true) {
            encoder = this.codecRegistry?.getEncoder?.("htj2k")
                ?? Configuration.global.getEncoderFor("htj2k")
                ?? encoder;
        }

        if (encoder == null) {
            throw new Exception(
                "No JPEG 2000 encoder is configured.",
                GeneralErrorCodes.NotImplemented
            );
        }

        var encoderInstance = (typeof encoder?.constructor == "function")
            ? new encoder.constructor()
            : encoder;

        if (typeof encoderInstance?.encodeMonochromeSamples != "function") {
            throw new Exception(
                "Configured JPEG 2000 encoder does not support native monochrome encoding.",
                GeneralErrorCodes.NotImplemented
            );
        }

        var encodeCodecOptions = this.resolveCompressedEncodeOptions();
        encodeCodecOptions.bitsAllocated = Math.max(8, this.toInteger(state?.bitsAllocated, 8));
        encodeCodecOptions.bitsPerSample = Math.max(1, this.toInteger(state?.bitsStored ?? state?.bitsAllocated, encodeCodecOptions.bitsAllocated));
        if (encodeCodecOptions.bitsPerSample > encodeCodecOptions.bitsAllocated)
            encodeCodecOptions.bitsPerSample = encodeCodecOptions.bitsAllocated;
        encodeCodecOptions.isSigned = (this.toInteger(state?.pixelRepresentation, 0) == 1);
        encodeCodecOptions.littleEndian = (state?.sourceTransferSyntax?.IsLittleEndian != false);

        this.configureCodecInstance(encoderInstance, encodeCodecOptions);

        var encoded = await encoderInstance.encodeMonochromeSamples(frameBytes, columns, rows, encodeCodecOptions);
        var encodedBytes = encoded?.bytes;
        if ((encodedBytes instanceof Uint8Array) == false) {
            throw new Exception(
                "JPEG 2000 encoder returned invalid payload bytes.",
                GeneralErrorCodes.GeneralError
            );
        }

        return encodedBytes;

    }

    /**
     * Replay original PixelData events to next handler for passthrough recovery.
     * @param {object} context Parse context.
     * @param {object} state Runtime state.
     * @param {object} attribute Source PixelData attribute.
     * @returns {*} Status.
     */
    async forwardPixelDataPassthrough(context, state, attribute) {

        var startStatus = await this.forward("onStartAttribute", context, attribute);
        if (this.isTerminalStatus(startStatus) == true)
            return startStatus;

        var chunks = state?.pixelData?.chunks ?? [];
        for (var i = 0; i < chunks.length; i++) {
            var chunkStatus = await this.forward("onAttributeChunk", context, {
                attribute: attribute,
                chunk: chunks[i],
                isFinalChunk: (i == (chunks.length - 1))
            });

            if (this.isTerminalStatus(chunkStatus) == true)
                return chunkStatus;
        }

        return await this.forward("onEndAttribute", context, attribute);

    }

    /**
     * Perform payload-level PixelData transcode and emit transformed attribute events downstream.
     * @param {object} context Parse context.
     * @param {object} state Runtime state.
     * @param {object} attribute Source PixelData attribute.
     * @returns {*} Status.
     */
    async transcodePixelDataAttribute(context, state, attribute) {

        var sourceBytes = null;
        if ((state?.pixelData?.chunks?.length ?? 0) > 0) {
            sourceBytes = this.joinChunks(state.pixelData.chunks);
        }
        else if (typeof attribute?.access == "function") {
            sourceBytes = attribute.access()?.slice?.(0) ?? new Uint8Array(0);
        }
        else {
            sourceBytes = new Uint8Array(0);
        }

        var sourceFrames = this.resolveSourceFrames(state, sourceBytes);
        if (sourceFrames.length == 0) {
            var emptyStatus = await this.reportConcern(context, state, {
                severity: TranscodingConcernSeverity.ERROR,
                category: TranscodingConcernCategory.DATA_QUALITY,
                code: "NoSourceFrames",
                message: "No PixelData frames were resolved for payload transcoding.",
                scope: "Attribute",
                path: "/DataSet/(7FE0,0010)"
            });

            if (this.isTerminalStatus(emptyStatus) == true)
                return emptyStatus;

            if ((this.fallback == TranscodingFallbackModes.PASSTHROUGH)
                || (this.fallback == TranscodingFallbackModes.SKIP_FRAME)) {
                return await this.forwardPixelDataPassthrough(context, state, attribute);
            }

            return Status.FAIL;
        }

        var targetFrames = [];
        var totalFrameCount = sourceFrames.length;
        var useNativeMonochromePath = this.canUseNativeMonochromePath(state);

        for (var frameIndex = 0; frameIndex < sourceFrames.length; frameIndex++) {

            var sourceFrame = sourceFrames[frameIndex];
            var startedAt = Date.now();

            try {

                var targetFrame = null;
                var decodeCodec = null;

                if (useNativeMonochromePath == true) {
                    try {
                        targetFrame = await this.encodeNativeMonochromeFrame(state, sourceFrame);
                        decodeCodec = "native";
                    }
                    catch (nativeEncodeError) {
                        var nativeFallbackStatus = await this.reportConcern(context, state, {
                            severity: TranscodingConcernSeverity.WARNING,
                            category: TranscodingConcernCategory.ENCODE,
                            code: "NativeMonochromePathUnavailable",
                            message: nativeEncodeError?.message ?? "Native monochrome path is unavailable. Falling back to RGBA conversion.",
                            scope: "Frame",
                            path: "/DataSet/(7FE0,0010)",
                            frameIndex: frameIndex,
                            error: {
                                name: nativeEncodeError?.name ?? null,
                                message: nativeEncodeError?.message ?? null
                            }
                        });

                        if (this.isTerminalStatus(nativeFallbackStatus) == true)
                            return nativeFallbackStatus;

                        var rgbaFallback = await this.decodeFrameToRGBA(state, sourceFrame);
                        rgbaFallback = (await this.transformFrameRGBA(context, state, rgbaFallback, frameIndex, totalFrameCount)) ?? rgbaFallback;
                        targetFrame = await this.encodeFrameFromRGBA(state, rgbaFallback);
                        decodeCodec = state?.sourceTransferSyntax?.IsCompressed
                            ? (
                                (this.isHtj2kTransferSyntax(state?.sourceTransferSyntax) == true)
                                    ? "htj2k"
                                    : "jpeg2000"
                            )
                            : "native";
                    }
                }
                else {
                    var rgba = await this.decodeFrameToRGBA(state, sourceFrame);
                    rgba = (await this.transformFrameRGBA(context, state, rgba, frameIndex, totalFrameCount)) ?? rgba;
                    targetFrame = await this.encodeFrameFromRGBA(state, rgba);
                    decodeCodec = state?.sourceTransferSyntax?.IsCompressed
                        ? (
                            (this.isHtj2kTransferSyntax(state?.sourceTransferSyntax) == true)
                                ? "htj2k"
                                : "jpeg2000"
                        )
                        : "native";
                }

                targetFrames.push(targetFrame);

                var frameStatus = await this.emitFrame(context, state, {
                    frameIndex: frameIndex,
                    frameCount: totalFrameCount,
                    sourceBytes: sourceFrame.length,
                    targetBytes: targetFrame.length,
                    decodeCodec: decodeCodec,
                    encodeCodec: this.targetTransferSyntax?.IsCompressed
                        ? this.resolveCompressedOutputCodecName()
                        : "native",
                    elapsedMs: Math.max(0, (Date.now() - startedAt)),
                    isFinalFrame: (frameIndex == (sourceFrames.length - 1))
                });

                if (this.isTerminalStatus(frameStatus) == true)
                    return frameStatus;

            }
            catch (error) {

                var frameConcernStatus = await this.reportConcern(context, state, {
                    severity: TranscodingConcernSeverity.ERROR,
                    category: (state?.sourceTransferSyntax?.IsCompressed == true)
                        ? TranscodingConcernCategory.DECODE
                        : TranscodingConcernCategory.ENCODE,
                    code: "FrameTranscodeFailed",
                    message: error?.message ?? "Frame transcoding failed.",
                    scope: "Frame",
                    path: "/DataSet/(7FE0,0010)",
                    frameIndex: frameIndex,
                    error: {
                        name: error?.name ?? null,
                        message: error?.message ?? null
                    }
                });

                if (this.isTerminalStatus(frameConcernStatus) == true)
                    return frameConcernStatus;

                if (this.fallback == TranscodingFallbackModes.SKIP_FRAME)
                    continue;

                if (this.fallback == TranscodingFallbackModes.PASSTHROUGH)
                    return await this.forwardPixelDataPassthrough(context, state, attribute);

                return Status.FAIL;

            }

        }

        if (targetFrames.length == 0) {
            if (this.fallback == TranscodingFallbackModes.PASSTHROUGH)
                return await this.forwardPixelDataPassthrough(context, state, attribute);
            return Status.FAIL;
        }

        var targetPixelDataBytes = null;
        var targetPixelDataLength = null;

        if (this.targetTransferSyntax?.IsCompressed == true) {
            targetPixelDataBytes = this.buildEncapsulatedPixelData(targetFrames);
            targetPixelDataLength = Constants.UndefinedLength;
        }
        else {
            targetPixelDataBytes = this.joinChunks(targetFrames);
            targetPixelDataLength = targetPixelDataBytes.length;
        }

        var transformedAttribute = new Attribute(
            Tag.PixelData,
            targetPixelDataLength,
            targetPixelDataBytes,
            this.targetTransferSyntax
        );
        transformedAttribute.isBulkStreamed = false;
        transformedAttribute.isMaterialized = true;
        transformedAttribute.isComplete = true;

        var startStatus = await this.forward("onStartAttribute", context, transformedAttribute);
        if (this.isTerminalStatus(startStatus) == true)
            return startStatus;

        return await this.forward("onEndAttribute", context, transformedAttribute);

    }

    async onReset(context) {
        return await this.forward("onReset", context);
    }

    async onStartInstance(context) {

        var forwardedContext = await this.forward("onStartInstance", context);
        context = this.ensureState((forwardedContext == null) ? context : forwardedContext);
        this.resetInstanceState(this.getState(context));

        return context;

    }

    async onStartPreamble(context, preamble) {
        context = this.ensureState(context);
        return await this.forward("onStartPreamble", context, preamble);
    }

    async onStartPrefix(context, prefix) {
        context = this.ensureState(context);
        return await this.forward("onStartPrefix", context, prefix);
    }

    async onStartMetaSet(context) {

        context = this.ensureState(context);
        var state = this.getState(context);
        state.isInMetaSet = true;
        state.isInDataSet = false;
        state.hasSourceMetaSet = true;
        state.metaAttributes = [];
        state.metaTransferSyntaxLengthDelta = 0;

        return await this.forward("onStartMetaSet", context);

    }

    async onStartDataSet(context) {

        context = this.ensureState(context);
        var state = this.getState(context);
        state.isInMetaSet = false;
        state.isInDataSet = true;

        var modeStatus = await this.evaluateMode(context, state);
        if (this.isTerminalStatus(modeStatus) == true)
            return modeStatus;

        if ((state.mode == "transcode")
            && (state.hasSourceMetaSet != true)
            && (state.hasEmittedSyntheticPart10Header != true)) {

            var syntheticMetaStatus = await this.emitSyntheticPart10Header(context, state);
            if (this.isTerminalStatus(syntheticMetaStatus) == true)
                return syntheticMetaStatus;

        }

        return await this.forward("onStartDataSet", context);

    }

    async onStartAttribute(context, attribute) {

        context = this.ensureState(context);
        var state = this.getState(context);

        if (state.isInDataSet == true) {
            this.updateSourceTransferSyntaxFromAttribute(state, attribute);
        }

        var modeStatus = await this.evaluateMode(context, state);
        if (this.isTerminalStatus(modeStatus) == true)
            return modeStatus;

        if ((state.mode == "transcode")
            && (state.requiresPixelTransform == true)
            && (state.isInDataSet == true)
            && (this.shouldSuppressPaletteLookupTableAttribute(state, attribute) == true)) {

            attribute._transcodingSuppressOutput = true;
            return Status.CONTINUE;

        }

        if ((state.mode == "transcode")
            && (state.requiresPixelTransform == true)
            && (state.isInDataSet == true)
            && (this.isPixelDataAttribute(attribute) == true)) {

            state.pixelData.transcodeActive = true;
            state.pixelData.sourceAttribute = attribute;
            state.pixelData.chunks = [];
            state.pixelData.bytesSeen = 0;
            state.pixelData.framesEmitted = 0;
            return Status.CONTINUE;

        }

        this.applyTransferSyntaxOverride(state, attribute);

        return await this.forward("onStartAttribute", context, attribute);

    }

    async onStartSequence(context, sequence) {

        context = this.ensureState(context);
        var state = this.getState(context);

        if (state.isInDataSet == true) {
            this.updateSourceTransferSyntaxFromAttribute(state, sequence);
        }

        var modeStatus = await this.evaluateMode(context, state);
        if (this.isTerminalStatus(modeStatus) == true)
            return modeStatus;

        this.applyTransferSyntaxOverride(state, sequence);

        return await this.forward("onStartSequence", context, sequence);

    }

    async onStartItem(context) {
        context = this.ensureState(context);
        return await this.forward("onStartItem", context);
    }

    async onAppendAttribute(context, attribute) {
        context = this.ensureState(context);

        if (attribute?._transcodingSuppressOutput == true)
            return Status.CONTINUE;

        var state = this.getState(context);
        if (this.isActivePixelCapture(state, attribute) == true)
            return Status.CONTINUE;

        return await this.forward("onAppendAttribute", context, attribute);
    }

    async onAttributeChunk(context, payload) {

        context = this.ensureState(context);
        var state = this.getState(context);

        var attribute = payload?.attribute;
        if (attribute?._transcodingSuppressOutput == true)
            return Status.CONTINUE;

        if (attribute?.tag?.ID == Tag.PixelData?.ID) {

            if (state.isInDataSet == true) {
                this.updateSourceTransferSyntaxFromAttribute(state, attribute);
            }

            var modeStatus = await this.evaluateMode(context, state);
            if (this.isTerminalStatus(modeStatus) == true)
                return modeStatus;

            this.applyTransferSyntaxOverride(state, attribute);

            if (this.isActivePixelCapture(state, attribute) == true) {

                var payloadChunk = payload?.chunk;
                if ((payloadChunk instanceof Uint8Array) && (payloadChunk.length > 0)) {
                    var copiedChunk = new Uint8Array(payloadChunk.length);
                    copiedChunk.set(payloadChunk, 0);
                    state.pixelData.chunks.push(copiedChunk);
                    state.pixelData.bytesSeen += copiedChunk.length;
                }

                return Status.CONTINUE;

            }

            if (state.mode == "transcode") {

                var frameStatus = await this.emitChunkFrameEvents(
                    context,
                    state,
                    attribute,
                    payload?.chunk ?? null,
                    (payload?.isFinalChunk == true)
                );

                if (this.isTerminalStatus(frameStatus) == true)
                    return frameStatus;

            }

        }

        return await this.forward("onAttributeChunk", context, payload);

    }

    async onEndPreamble(context, preamble) {
        context = this.ensureState(context);
        return await this.forward("onEndPreamble", context, preamble);
    }

    async onEndPrefix(context, prefix) {
        context = this.ensureState(context);
        return await this.forward("onEndPrefix", context, prefix);
    }

    async onEndAttribute(context, attribute) {

        context = this.ensureState(context);
        var state = this.getState(context);
        var hasForwardValueOverride = false;
        var forwardValueOverride = null;

        if (state.isInMetaSet == true) {

            if (attribute?.tag?.ID == Tag.TransferSyntaxUID?.ID) {

                var sourceTransferSyntax = this.resolveTransferSyntax(attribute.value);
                if (sourceTransferSyntax != null) {
                    state.sourceTransferSyntax = sourceTransferSyntax;
                }

                var modeStatus = await this.evaluateMode(context, state);
                if (this.isTerminalStatus(modeStatus) == true)
                    return modeStatus;

                if (state.mode == "transcode") {
                    var priorValueLength = (typeof attribute?.length == "function")
                        ? attribute.length()
                        : this.resolveUIEncodedLength(attribute?.value);

                    hasForwardValueOverride = true;
                    forwardValueOverride = this.buildTransferSyntaxUIDValueBytes(
                        this.targetTransferSyntax.ID,
                        priorValueLength
                    );
                    state.metaTransferSyntaxLengthDelta = (forwardValueOverride.length - priorValueLength);
                }

            }

            if (hasForwardValueOverride == true) {
                attribute._transcodingValueOverride = forwardValueOverride;
            }

            state.metaAttributes.push(attribute);
            return Status.CONTINUE;

        }
        else if (state.isInDataSet == true) {

            this.updateImageMetadata(state, attribute);

            if (attribute?._transcodingSuppressOutput == true)
                return Status.CONTINUE;

            if ((state.mode == "transcode")
                && (state.requiresPixelTransform == true)
                && (attribute?.tag?.ID == Tag.SamplesPerPixel.ID)
                && (this.shouldDeferSamplesPerPixelOverride(state) == true)) {

                state.deferredSamplesPerPixelAttribute = attribute;
                return Status.CONTINUE;

            }

            if ((state.mode == "transcode")
                && (state.requiresPixelTransform == true)
                && (state.deferredSamplesPerPixelAttribute != null)
                && (attribute?.tag?.ID != Tag.SamplesPerPixel.ID)
                && (this.canFlushDeferredSamplesPerPixel(state, attribute) == true)) {

                this.applyPixelMetadataOverride(state, state.deferredSamplesPerPixelAttribute);
                var deferredSamplesStatus = await this.forward("onEndAttribute", context, state.deferredSamplesPerPixelAttribute);
                if (this.isTerminalStatus(deferredSamplesStatus) == true)
                    return deferredSamplesStatus;

                state.deferredSamplesPerPixelAttribute = null;

            }

            if (attribute?.tag?.ID == Tag.PixelData?.ID) {

                if (this.shouldEmitSyntheticPlanarConfigurationBeforePixelData(state, attribute) == true) {
                    var syntheticPlanarStatus = await this.emitSyntheticPlanarConfiguration(context, state);
                    if (this.isTerminalStatus(syntheticPlanarStatus) == true)
                        return syntheticPlanarStatus;
                }

                this.updateSourceTransferSyntaxFromAttribute(state, attribute);

                var pixelModeStatus = await this.evaluateMode(context, state);
                if (this.isTerminalStatus(pixelModeStatus) == true)
                    return pixelModeStatus;

                if (this.isActivePixelCapture(state, attribute) == true) {
                    var transcodeStatus = await this.transcodePixelDataAttribute(context, state, attribute);

                    state.pixelData.transcodeActive = false;
                    state.pixelData.sourceAttribute = null;
                    state.pixelData.chunks = [];

                    return transcodeStatus;
                }

                this.applyTransferSyntaxOverride(state, attribute);

                if (state.mode == "transcode") {
                    var frameStatus = await this.emitMaterializedFrameEvents(context, state, attribute);
                    if (this.isTerminalStatus(frameStatus) == true)
                        return frameStatus;
                }

            }

            if ((state.mode == "transcode")
                && (state.requiresPixelTransform == true)
                && (this.isPixelMetadataTag(attribute?.tag?.ID) == true)) {
                this.applyPixelMetadataOverride(state, attribute);
            }

            if (attribute?.tag?.ID == Tag.PlanarConfiguration.ID) {
                state.hasForwardedPlanarConfiguration = true;
            }

        }

        return await this.forward("onEndAttribute", context, attribute);

    }

    async onEndSequence(context, sequence) {
        context = this.ensureState(context);
        return await this.forward("onEndSequence", context, sequence);
    }

    async onEndItem(context) {
        context = this.ensureState(context);
        return await this.forward("onEndItem", context);
    }

    async onEndMetaSet(context) {

        context = this.ensureState(context);
        var state = this.getState(context);
        state.isInMetaSet = false;

        if ((state.metaAttributes?.length ?? 0) > 0) {

            if (state.metaTransferSyntaxLengthDelta != 0) {
                for (var i = 0; i < state.metaAttributes.length; i++) {
                    var metaAttribute = state.metaAttributes[i];
                    if (metaAttribute?.tag?.ID == Tag.FileMetaInformationGroupLength?.ID) {
                        var originalLength = Number(metaAttribute.value);
                        if (Number.isFinite(originalLength) == true) {
                            metaAttribute.value = Math.max(0, (originalLength + state.metaTransferSyntaxLengthDelta));
                        }
                        break;
                    }
                }
            }

            for (var m = 0; m < state.metaAttributes.length; m++) {
                var metaAttribute = state.metaAttributes[m];
                var hadOverride = (metaAttribute?._transcodingValueOverride != null);
                var originalValue = null;

                if (hadOverride == true) {
                    originalValue = metaAttribute.value;
                    metaAttribute.value = metaAttribute._transcodingValueOverride;
                }

                var attributeStatus = await this.forward("onEndAttribute", context, metaAttribute);
                if (this.isTerminalStatus(attributeStatus) == true)
                    return attributeStatus;

                if (hadOverride == true) {
                    metaAttribute.value = originalValue;
                    metaAttribute._transcodingValueOverride = null;
                }
            }

            state.metaAttributes = [];
            state.metaTransferSyntaxLengthDelta = 0;

        }

        return await this.forward("onEndMetaSet", context);

    }

    async onEndDataSet(context) {

        context = this.ensureState(context);
        var state = this.getState(context);
        state.isInDataSet = false;

        if ((state.mode == "transcode")
            && (state.requiresPixelTransform == true)
            && (state.deferredSamplesPerPixelAttribute != null)) {

            this.applyPixelMetadataOverride(state, state.deferredSamplesPerPixelAttribute);
            var deferredSamplesStatus = await this.forward("onEndAttribute", context, state.deferredSamplesPerPixelAttribute);
            if (this.isTerminalStatus(deferredSamplesStatus) == true)
                return deferredSamplesStatus;

            state.deferredSamplesPerPixelAttribute = null;

        }

        return await this.forward("onEndDataSet", context);

    }

    async onEndInstance(context) {
        context = this.ensureState(context);
        return await this.forward("onEndInstance", context);
    }

    async onError(context, error) {

        context = this.ensureState(context);
        var state = this.getState(context);

        await this.reportConcern(context, state, {
            severity: TranscodingConcernSeverity.ERROR,
            category: TranscodingConcernCategory.IO,
            code: "ParserError",
            message: error?.message ?? "Parser error.",
            scope: "Pipeline",
            error: {
                name: error?.name ?? null,
                message: error?.message ?? null
            }
        });

        return await this.forward("onError", context, error);

    }

    async onProgress(context, progress) {
        context = this.ensureState(context);
        return await this.forward("onProgress", context, progress);
    }

    /**
     * Get emitted transcoding concerns.
     * @returns {Array<object>} Concerns.
     */
    get concerns() {
        return this._concerns;
    }

    /**
     * Get normalized transcoding options.
     * @returns {object} Options.
     */
    get options() {
        return this._options;
    }

    /**
     * Construct a new DICOM transcoding filter.
     * @param {object | null} nextHandler Next handler in the chain.
     * @param {string | object} options Transcoding options.
     */
    constructor(nextHandler = null, options = null) {

        this.nextHandler = nextHandler;
        this._concerns = [];
        this._options = this.normalizeOptions(options);

        this.targetTransferSyntax = this._options.targetTransferSyntax;
        this.sourceTransferSyntax = this._options.sourceTransferSyntax;
        this.goal = this._options.goal;
        this.streaming = this._options.streaming;
        this.fallback = this._options.fallback;
        this.frames = this._options.frames;
        this.codec = this._options.codec;
        this.metadata = this._options.metadata;
        this.codecRegistry = this._options.codecRegistry;
        this._onFrame = this._options.onFrame;
        this._onConcern = this._options.onConcern;

    }

}
