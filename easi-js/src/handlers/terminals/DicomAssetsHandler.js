//
// DicomAssetsHandler.js
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

import Exception from "../../environment/Exception.js";
import { GeneralErrorCodes } from "../../environment/Exception.js";
import DicomInstanceHandler from "./DicomInstanceHandler.js";
import DicomMapping from "../mappings/DicomMapping.js";
import Configuration from "../../environment/Configuration.js";
import Tag from "../../dicom/Tag.js";
import Image from "../../dicom/entities/Image.js";
import PixelData from "../../dicom/PixelData.js";
import Constants from "../../dicom/Constants.js";
import TransferSyntax from "../../dicom/TransferSyntax.js";
import { TransferSyntaxApplicationType } from "../../dicom/TransferSyntax.js";

export default class DicomAssetsHandler {

    /**
     * Normalize payload extraction mode.
     * @param {'auto' | 'stream' | 'materialize' | string | null | undefined} mode Requested mode.
     * @returns {'auto' | 'stream' | 'materialize'} The normalized mode.
     */
    normalizePayloadMode(mode) {

        if (typeof mode !== 'string')
            return 'auto';

        var normalized = mode.trim().toLowerCase();
        if (normalized == 'stream')
            return 'stream';
        if (normalized == 'materialize')
            return 'materialize';

        return 'auto';

    }

    /**
     * Determine whether payload extraction mode is explicit stream.
     * @returns {boolean} TRUE when payload extraction mode is stream.
     */
    isPayloadStreamMode() {
        return (this.payloadMode == 'stream');
    }

    /**
     * Determine whether payload extraction mode is explicit materialize.
     * @returns {boolean} TRUE when payload extraction mode is materialize.
     */
    isPayloadMaterializeMode() {
        return (this.payloadMode == 'materialize');
    }

    /**
     * Determine whether frame materialized output is requested.
     * @returns {boolean} TRUE when a materialized frame consumer is configured.
     */
    hasFrameMaterializedConsumer() {
        return ((typeof this.payloadOptions?.onFrame === 'function')
            || (this.payloadOptions?.collect === true));
    }

    /**
     * Determine whether content materialized output is requested.
     * @returns {boolean} TRUE when a materialized content consumer is configured.
     */
    hasContentMaterializedConsumer() {
        return ((typeof this.payloadOptions?.onContent === 'function')
            || (this.payloadOptions?.collect === true));
    }

    /**
     * Determine whether materialized frame emission is enabled.
     * Materialized frame emission includes `onFrame` callback and/or collected `result.frames`.
     * @returns {boolean} TRUE when materialized frame emission is enabled.
     */
    isMaterializedFramePayloadEnabled() {
        if (this.payloadOptions?.frame == null)
            return false;
        if (this.isPayloadStreamMode() == true)
            return false;
        return (this.hasFrameMaterializedConsumer() == true);
    }

    /**
     * Determine whether materialized content emission is enabled.
     * Materialized content emission includes `onContent` callback and/or collected `result.content`.
     * @returns {boolean} TRUE when materialized content emission is enabled.
     */
    isMaterializedContentPayloadEnabled() {
        if (this.isPayloadStreamMode() == true)
            return false;
        return (this.hasContentMaterializedConsumer() == true);
    }

    /**
     * Determine whether chunk-native frame emission is enabled.
     * @returns {boolean} TRUE when chunk-native frame emission is enabled.
     */
    isFrameChunkPayloadEnabled() {
        if (this.payloadOptions?.frame == null)
            return false;
        if (typeof this.payloadOptions?.onFrameChunk !== 'function')
            return false;
        if (this.isPayloadMaterializeMode() == true)
            return false;
        if (this.isPayloadStreamMode() == true)
            return true;
        return (this.isMaterializedFramePayloadEnabled() == false);
    }

    /**
     * Determine whether chunk-native content emission is enabled.
     * @returns {boolean} TRUE when chunk-native content emission is enabled.
     */
    isContentChunkPayloadEnabled() {
        if (typeof this.payloadOptions?.onContentChunk !== 'function')
            return false;
        if (this.isPayloadMaterializeMode() == true)
            return false;
        if (this.isPayloadStreamMode() == true)
            return true;
        return (this.isMaterializedContentPayloadEnabled() == false);
    }

    /**
     * Resolve payload frame indices from a frame selector value.
     * @param {number} frameCount The number of available frames.
     * @param {'first' | 'all' | Array<number> | { start?: number, end?: number, step?: number } | null} selector The selector.
     * @returns {Array<number>} The selected 0-based frame indices.
     */
    resolveFrameIndices(frameCount, selector) {

        if (frameCount <= 0)
            return [];

        if ((selector == null) || (selector === 'first')) {
            return [0];
        }

        if (selector === 'all') {
            var all = [];
            for (var i = 0; i < frameCount; i++) {
                all.push(i);
            }
            return all;
        }

        if (Array.isArray(selector)) {
            var selected = [];
            for (var s = 0; s < selector.length; s++) {
                var index = Number(selector[s]);
                if ((Number.isInteger(index) == true) && (index >= 0) && (index < frameCount)) {
                    selected.push(index);
                }
            }
            return selected;
        }

        if (typeof selector === 'object') {
            var start = Number(selector.start ?? 0);
            var end = Number(selector.end ?? (frameCount - 1));
            var step = Number(selector.step ?? 1);

            start = Math.max(0, Math.min(frameCount - 1, Math.floor(start)));
            end = Math.max(0, Math.min(frameCount - 1, Math.floor(end)));
            step = Math.max(1, Math.floor(step));

            var range = [];
            for (var r = start; r <= end; r += step) {
                range.push(r);
            }
            return range;
        }

        return [0];

    }

    /**
     * Resolve effective frame count for payload emission.
     * Uses NumberOfFrames as primary source and clamps to available encapsulated
     * frame offsets when PixelData is undefined-length and offsets are available.
     * @param {object} pixelDataAttribute PixelData attribute.
     * @param {Image} image Image entity.
     * @returns {number} Effective frame count.
     */
    resolveEffectiveFrameCount(pixelDataAttribute, image) {

        var frameCount = Math.max(1, Number(image?.multiFrameModule?.numberOfFrames ?? 1));

        if ((pixelDataAttribute?.valueLength == Constants.UndefinedLength)) {
            try {
                var pixelData = new PixelData(pixelDataAttribute);
                var offsetCount = Math.max(0, Number(pixelData?.offsets?.length ?? 0));
                if (offsetCount > 0) {
                    frameCount = Math.min(frameCount, offsetCount);
                }
            }
            catch (_error) {
                // Keep primary frame-count when offset parsing fails.
            }
        }

        return Math.max(1, frameCount);

    }

    /**
     * Determine if the transfer syntax likely contains frame-based image payload.
     * @param {TransferSyntax | null} transferSyntax The transfer syntax.
     * @returns {boolean} TRUE when frame processing should be attempted.
     */
    isFrameApplicationType(transferSyntax) {

        var appType = transferSyntax?.ApplicationType;
        return (
            (appType == null)
            || (appType == TransferSyntaxApplicationType.SingleFrame)
            || (appType == TransferSyntaxApplicationType.MultiFrame)
            || (appType == TransferSyntaxApplicationType.SingleAndMultiFrame)
            || (appType == TransferSyntaxApplicationType.All)
        );

    }

    /**
     * Determine if the transfer syntax is non-frame media/bulk content.
     * @param {TransferSyntax | null} transferSyntax The transfer syntax.
     * @returns {boolean} TRUE when non-frame content should be emitted.
     */
    isBulkContentApplicationType(transferSyntax) {

        var appType = transferSyntax?.ApplicationType;
        return (
            (appType == TransferSyntaxApplicationType.Video)
            || (appType == TransferSyntaxApplicationType.Audio)
            || (appType == TransferSyntaxApplicationType.Text)
            || (appType == TransferSyntaxApplicationType.Other)
            || (appType == TransferSyntaxApplicationType.XML)
        );

    }

    /**
     * Apply a DICOM mapping across an attribute-set recursively.
     * @param {DicomMapping} mapping The mapping to apply.
     * @param {object} context The mapping context.
     * @param {object} attributeSet The current attribute-set.
     */
    mapAttributeSet(mapping, context, attributeSet) {

        if (attributeSet == null)
            return;

        var attributes = attributeSet.attributes ?? [];

        for (var i = 0; i < attributes.length; i++) {

            var attribute = attributes[i];
            mapping.mapAttribute(context, attribute);

            if (Array.isArray(attribute.items) == true) {
                for (var j = 0; j < attribute.items.length; j++) {
                    this.mapAttributeSet(mapping, context, attribute.items[j]);
                }
            }

        }

    }

    /**
     * Map one parsed instance to metadata output.
     * @param {object} instance The parsed DICOM instance.
     * @returns {unknown | null} The mapped metadata output.
     */
    mapMetadata(instance) {

        if (this.metadataOptions == null)
            return null;

        var mapping = this.metadataOptions.mapping;
        if (mapping == null) {
            throw new Exception(
                "toAssets metadata configuration requires a mapping instance.",
                GeneralErrorCodes.InvalidParameter
            );
        }

        if ((mapping instanceof DicomMapping) == false) {
            throw new Exception(
                "toAssets metadata.mapping must extend DicomMapping.",
                GeneralErrorCodes.InvalidParameter
            );
        }

        var mappingContext = {};
        var startedContext = mapping.start(mappingContext);
        if (startedContext != null) {
            mappingContext = startedContext;
        }

        this.mapAttributeSet(mapping, mappingContext, instance.metaSet);
        this.mapAttributeSet(mapping, mappingContext, instance.dataSet);

        return mapping.end(mappingContext);

    }

    /**
     * Determine if the current payload option requests native frame chunking.
     * @returns {boolean} TRUE when configured for native frame chunking.
     */
    isNativeFrameChunkMode() {

        var frameOptions = this.payloadOptions?.frame;
        if (frameOptions == null)
            return false;

        var decodeMode = String(frameOptions.decode ?? 'rgba').toLowerCase();
        var outputFormat = String(frameOptions.encode ?? 'none').toLowerCase();

        return ((decodeMode == 'native') && ((outputFormat == 'none') || (outputFormat == 'native')));

    }

    /**
     * Determine if an attribute should be treated as content payload.
     * @param {object} attribute The current attribute.
     * @returns {boolean} TRUE when the attribute represents content payload.
     */
    isContentPayloadAttribute(attribute) {

        if (attribute?.tag == null)
            return false;

        var tagID = attribute.tag?.ID;

        if ((tagID == Tag.EncapsulatedDocument?.ID)
            || (tagID == Tag.WaveformData?.ID)
            || (tagID == Tag.AudioSampleData?.ID)) {
            return true;
        }

        if (tagID == Tag.PixelData?.ID) {
            return this.isBulkContentApplicationType(attribute.transferSyntax ?? null);
        }

        return false;

    }

    /**
     * Resolve a content payload kind for one attribute.
     * @param {object} attribute The content attribute.
     * @returns {string} The resolved content kind.
     */
    resolveContentPayloadKind(attribute) {

        if (attribute?.tag?.ID == Tag.PixelData?.ID) {
            var appType = attribute?.transferSyntax?.ApplicationType;
            return String(appType ?? 'Content');
        }

        return 'Content';

    }

    /**
     * Build frame chunk streaming state for PixelData when configured for native chunk emission.
     * @param {object} context Handler context.
     * @param {object} attribute Current PixelData attribute.
     * @returns {object | null} Frame chunk state or null when not applicable.
     */
    createFrameChunkState(context, attribute) {

        if (this.isFrameChunkPayloadEnabled() == false)
            return null;

        if (this.isNativeFrameChunkMode() == false)
            return null;

        if (attribute?.tag?.ID != Tag.PixelData?.ID)
            return null;

        var transferSyntax = attribute.transferSyntax ?? TransferSyntax.NONE;
        if (this.isFrameApplicationType(transferSyntax) == false)
            return null;

        var buildUnsplitState = () => {
            var frameIndices = this.resolveFrameIndices(1, this.payloadOptions?.frame?.frames);
            if (frameIndices.length == 0)
                return null;

            return {
                type: 'frame',
                bytesSeen: 0,
                valueLength: attribute.valueLength,
                frameCount: 1,
                frameSize: 0,
                unsplitMode: true,
                selectedFrameSet: new Set(frameIndices),
                width: null,
                height: null,
                transferSyntaxID: transferSyntax?.ID ?? null
            };
        };

        if (attribute.valueLength == Constants.UndefinedLength) {
            return buildUnsplitState();
        }

        try {

            var frameOptions = this.payloadOptions?.frame;
            var image = new Image(context?.instance?.dataSet);
            var frameCount = Math.max(1, Number(image.multiFrameModule?.numberOfFrames ?? 1));
            var frameSize = Math.max(0, Number(image.imagePixelModule?.imageSize ?? 0));
            var useUnsplitMode = (attribute.valueLength == Constants.UndefinedLength);

            // For compressed transfer syntaxes with known length, frame boundaries are
            // not generally derivable without encapsulated item offsets. Support only
            // single-frame compressed payload by treating the whole value as one frame.
            if (transferSyntax?.IsCompressed == true) {
                if ((frameCount > 1) && (useUnsplitMode == false))
                    return buildUnsplitState();
                if (useUnsplitMode == false) {
                    frameSize = attribute.valueLength;
                }
            }

            if (useUnsplitMode == true) {
                frameCount = 1;
            }

            var frameIndices = this.resolveFrameIndices(frameCount, frameOptions?.frames);

            if ((useUnsplitMode == false) && (frameSize <= 0))
                return buildUnsplitState();

            if (frameIndices.length == 0)
                return null;

            return {
                type: 'frame',
                bytesSeen: 0,
                valueLength: attribute.valueLength,
                frameCount: frameCount,
                frameSize: frameSize,
                unsplitMode: useUnsplitMode,
                selectedFrameSet: new Set(frameIndices),
                width: image.imagePixelModule?.columns ?? null,
                height: image.imagePixelModule?.rows ?? null,
                transferSyntaxID: transferSyntax?.ID ?? null
            };

        }
        catch (_error) {
            // Fall back to unsplit chunk-native mode when frame metadata is unavailable.
            return buildUnsplitState();
        }

    }

    /**
     * Build content chunk streaming state for non-frame payload attributes.
     * @param {object} attribute Current content attribute.
     * @returns {object | null} Content chunk state or null when not applicable.
     */
    createContentChunkState(attribute) {

        if (this.isContentChunkPayloadEnabled() == false)
            return null;

        if (this.isContentPayloadAttribute(attribute) == false)
            return null;

        return {
            type: 'content',
            bytesSeen: 0,
            kind: this.resolveContentPayloadKind(attribute),
            transferSyntaxID: attribute?.transferSyntax?.ID ?? null
        };

    }

    /**
     * Register per-attribute payload streaming state for chunk-native emission.
     * @param {object} context Handler context.
     * @param {object} attribute Current attribute.
     */
    registerAttributePayloadState(context, attribute) {

        var payloadStates = context?.assetsRuntime?.payloadStates;
        if (payloadStates == null)
            return;

        var state = this.createFrameChunkState(context, attribute);
        if (state == null) {
            state = this.createContentChunkState(attribute);
        }

        if (state != null) {
            payloadStates.set(attribute, state);
        }

    }

    /**
     * Emit native frame chunks for one streamed PixelData chunk.
     * @param {object} context Handler context.
     * @param {object} attribute PixelData attribute.
     * @param {Uint8Array} chunk Current value chunk.
     * @param {boolean} isFinalChunk TRUE when this is the final attribute chunk.
     * @param {object} state Frame chunk state.
     */
    async emitFrameChunkPayload(context, attribute, chunk, isFinalChunk, state) {

        if (chunk == null)
            chunk = new Uint8Array(0);

        // Encapsulated values can finish with a separate, empty completion chunk.
        if ((chunk.length == 0) && ((isFinalChunk != true) || (state.unsplitMode != true))) {
            return;
        }

        if (state.unsplitMode == true) {

            if (state.selectedFrameSet.has(0) == true) {
                await this.payloadOptions.onFrameChunk({
                    index: 0,
                    encoding: 'native',
                    bytes: chunk,
                    mimeType: 'application/octet-stream',
                    transferSyntax: state.transferSyntaxID,
                    width: state.width,
                    height: state.height,
                    absoluteOffset: state.bytesSeen,
                    frameOffset: state.bytesSeen,
                    isFirstChunk: (state.bytesSeen == 0),
                    isFinalChunk: (isFinalChunk == true)
                }, {
                    instance: context?.instance,
                    context
                });

                context.assets.frameChunksEmitted += 1;
            }

            state.bytesSeen += chunk.length;
            return;

        }

        var chunkStart = state.bytesSeen;
        var chunkEnd = (chunkStart + chunk.length);
        var firstFrame = Math.floor(chunkStart / state.frameSize);
        var lastFrame = Math.floor(Math.max(chunkStart, (chunkEnd - 1)) / state.frameSize);

        for (var frameIndex = firstFrame; frameIndex <= lastFrame; frameIndex++) {

            if ((frameIndex < 0) || (frameIndex >= state.frameCount))
                continue;

            if (state.selectedFrameSet.has(frameIndex) == false)
                continue;

            var frameStart = (frameIndex * state.frameSize);
            var frameEnd = Math.min(state.valueLength, (frameStart + state.frameSize));
            var overlapStart = Math.max(chunkStart, frameStart);
            var overlapEnd = Math.min(chunkEnd, frameEnd);

            if (overlapEnd <= overlapStart)
                continue;

            var localStart = (overlapStart - chunkStart);
            var localEnd = (overlapEnd - chunkStart);
            var frameChunk = chunk.subarray(localStart, localEnd);

            await this.payloadOptions.onFrameChunk({
                index: frameIndex,
                encoding: 'native',
                bytes: frameChunk,
                mimeType: 'application/octet-stream',
                transferSyntax: state.transferSyntaxID,
                width: state.width,
                height: state.height,
                absoluteOffset: overlapStart,
                frameOffset: (overlapStart - frameStart),
                isFirstChunk: (overlapStart == frameStart),
                isFinalChunk: ((overlapEnd >= frameEnd) || ((isFinalChunk == true) && (overlapEnd >= chunkEnd)))
            }, {
                instance: context?.instance,
                context
            });

            context.assets.frameChunksEmitted += 1;

        }

        state.bytesSeen = chunkEnd;

    }

    /**
     * Emit content chunks for one streamed content payload attribute chunk.
     * @param {object} context Handler context.
     * @param {object} attribute Content attribute.
     * @param {Uint8Array} chunk Current value chunk.
     * @param {boolean} isFinalChunk TRUE when this is the final attribute chunk.
     * @param {object} state Content chunk state.
     */
    async emitContentChunkPayload(context, attribute, chunk, isFinalChunk, state) {

        if (chunk == null)
            chunk = new Uint8Array(0);

        if ((chunk.length == 0) && (isFinalChunk != true))
            return;

        await this.payloadOptions.onContentChunk({
            kind: state.kind,
            tag: attribute?.tag,
            bytes: chunk,
            transferSyntax: state.transferSyntaxID,
            offset: state.bytesSeen,
            isFirstChunk: (state.bytesSeen == 0),
            isFinalChunk: (isFinalChunk == true)
        }, {
            instance: context?.instance,
            context
        });

        state.bytesSeen += chunk.length;
        context.assets.contentChunksEmitted += 1;

    }

    /**
     * Determine whether one streamed chunk should be materialized on the attribute.
     * @param {object} attribute The streamed attribute.
     * @param {object | null} state Active payload state for the attribute.
     * @returns {boolean} TRUE when materialization is required.
     */
    shouldMaterializeChunk(attribute, state = null) {

        if (attribute == null)
            return false;

        if (this.payloadOptions == null)
            return false;

        // In explicit materialize mode, preserve all streamed attributes when any
        // materialized payload consumer is configured. This ensures dependent
        // context attributes (e.g. Rows/Columns) remain available at end-of-instance.
        if (this.isPayloadMaterializeMode() == true) {
            return ((this.isMaterializedFramePayloadEnabled() == true)
                || (this.isMaterializedContentPayloadEnabled() == true));
        }

        // When chunk-native callbacks are active, keep the attribute chunk-native.
        if ((state?.type == 'frame') || (state?.type == 'content'))
            return false;

        // Preserve materialized frame behavior (decode/encode and collected frame output).
        if ((attribute?.tag?.ID == Tag.PixelData?.ID) && (this.isMaterializedFramePayloadEnabled() == true))
            return true;

        // Preserve materialized content behavior (onContent / collected content output).
        if ((this.isMaterializedContentPayloadEnabled() == true) && (this.isContentPayloadAttribute(attribute) == true))
            return true;

        return false;

    }

    /**
     * Decode one frame to RGBA bytes.
     * @param {object} instance The parsed DICOM instance.
     * @param {number} frameIndex 0-based frame index.
     * @returns {{ bytes: Uint8Array, width: number, height: number }} RGBA output.
     */
    decodeFrameRgba(instance, frameIndex) {

        var image = new Image(instance.dataSet);
        var width = image.imagePixelModule.columns;
        var height = image.imagePixelModule.rows;
        var rgba = new Uint8Array(width * height * 4);

        var pixelData = instance.dataSet.find(Tag.PixelData);
        var decoder = this.codecRegistry.getDecoderForTransferSyntax(pixelData.transferSyntax, image);
        var decodeResult = image.decodeFrame(rgba, decoder, frameIndex);
        if (decodeResult !== true) {
            throw new Exception(
                "Failed decoding frame to RGBA.",
                GeneralErrorCodes.GeneralError
            );
        }

        return {
            bytes: rgba,
            width,
            height
        };

    }

    /**
     * Resolve one native frame payload for uncompressed and encapsulated image pixel data.
     * @param {object} instance The parsed DICOM instance.
     * @param {number} frameIndex 0-based frame index.
     * @returns {Uint8Array} Native frame bytes.
     */
    resolveNativeFrameBytes(instance, frameIndex) {

        var attribute = instance.dataSet?.find(Tag.PixelData);
        if (attribute == null)
            return new Uint8Array(0);

        var sourceBytes = attribute.access();

        if (attribute.valueLength != Constants.UndefinedLength) {
            var image = new Image(instance.dataSet);
            var frameSize = image.imagePixelModule.imageSize;
            var start = (frameIndex * frameSize);
            var stop = Math.min(sourceBytes.length, (start + frameSize));
            return sourceBytes.subarray(start, stop);
        }

        var pixelData = new PixelData(attribute);
        if ((pixelData.offsets == null) || (pixelData.offsets.length == 0)) {
            return sourceBytes;
        }

        var startOffset = pixelData.offsets[Math.min(frameIndex, (pixelData.offsets.length - 1))].start;
        var stopOffset = (frameIndex + 1 < pixelData.offsets.length)
            ? pixelData.offsets[frameIndex + 1].start
            : sourceBytes.length;

        return sourceBytes.subarray(startOffset, stopOffset);

    }

    /**
     * Emit metadata payload for one parsed instance.
     * @param {object} context Handler context.
     * @param {object} instance Parsed DICOM instance.
     * @param {object} result Current instance result object.
     */
    async emitMetadata(context, instance, result) {

        if (this.metadataOptions == null)
            return;

        var mapped = this.mapMetadata(instance);

        if (this.metadataOptions.collect !== false) {
            result.metadata = mapped;
            context.assets.metadata.push(mapped);
        }

        context.assets.metadataCount += 1;

        if (typeof this.metadataOptions.onMetadata === 'function') {
            await this.metadataOptions.onMetadata(mapped, {
                instance,
                context
            });
        }

    }

    /**
     * Encode RGBA bytes to a target payload format.
     * @param {Uint8Array} rgba RGBA bytes.
     * @param {number} width Frame width.
     * @param {number} height Frame height.
     * @param {string} format Target format.
     * @param {object} options Encoder options.
     * @returns {Promise<{ bytes: Uint8Array, mimeType: string, format: string }>} Encoded payload.
     */
    async encodeFrame(rgba, width, height, format, options = null) {

        var encoder = this.codecRegistry.getEncoder(format);
        if (encoder == null) {
            throw new Exception(
                `No encoder registered for format '${format}'.`,
                GeneralErrorCodes.NotImplemented
            );
        }

        var encoded = encoder.encode(rgba, width, height, options);

        if ((encoded != null) && (typeof encoded.then === 'function')) {
            encoded = await encoded;
        }

        return encoded;

    }

    /**
     * Emit frame payloads for one parsed instance.
     * @param {object} context Handler context.
     * @param {object} instance Parsed DICOM instance.
     * @param {object} result Current instance result object.
     */
    async emitFramePayload(context, instance, result) {

        var frameOptions = this.payloadOptions?.frame;
        if (frameOptions == null)
            return;

        if (this.isMaterializedFramePayloadEnabled() == false)
            return;

        var pixelDataAttribute = instance.dataSet?.find(Tag.PixelData);
        if (pixelDataAttribute == null)
            return;

        var transferSyntax = pixelDataAttribute.transferSyntax ?? TransferSyntax.NONE;
        if (this.isFrameApplicationType(transferSyntax) == false) {
            return;
        }

        var image = new Image(instance.dataSet);
        var frameCount = this.resolveEffectiveFrameCount(pixelDataAttribute, image);

        var frameIndices = this.resolveFrameIndices(frameCount, frameOptions.frames);
        var outputFormat = String(frameOptions.encode ?? 'none').toLowerCase();
        var decodeMode = String(frameOptions.decode ?? 'rgba').toLowerCase();

        if ((decodeMode == 'native') && (outputFormat != 'none')) {
            decodeMode = 'rgba';
        }

        if ((frameIndices.length > 0) && (this.payloadOptions.collect === true) && (result.frames == null)) {
            result.frames = [];
        }

        for (var i = 0; i < frameIndices.length; i++) {

            var frameIndex = frameIndices[i];
            var framePayload = null;

            if (decodeMode == 'native') {

                var nativeBytes = this.resolveNativeFrameBytes(instance, frameIndex);
                framePayload = {
                    index: frameIndex,
                    encoding: 'native',
                    bytes: nativeBytes,
                    mimeType: 'application/octet-stream',
                    transferSyntax: transferSyntax.ID,
                    width: image.imagePixelModule.columns,
                    height: image.imagePixelModule.rows
                };

            }
            else {

                var decoded = this.decodeFrameRgba(instance, frameIndex);

                if ((outputFormat == 'none') || (outputFormat == 'rgba')) {
                    framePayload = {
                        index: frameIndex,
                        encoding: 'rgba',
                        bytes: decoded.bytes,
                        mimeType: 'application/octet-stream',
                        transferSyntax: transferSyntax.ID,
                        width: decoded.width,
                        height: decoded.height
                    };
                }
                else {
                    var encoded = await this.encodeFrame(decoded.bytes, decoded.width, decoded.height, outputFormat, frameOptions);
                    framePayload = {
                        index: frameIndex,
                        encoding: encoded?.format ?? outputFormat,
                        bytes: encoded?.bytes ?? new Uint8Array(0),
                        mimeType: encoded?.mimeType ?? 'application/octet-stream',
                        transferSyntax: transferSyntax.ID,
                        width: decoded.width,
                        height: decoded.height
                    };
                }

            }

            if (typeof this.payloadOptions.onFrame === 'function') {
                await this.payloadOptions.onFrame(framePayload, {
                    instance,
                    context
                });
            }

            if (this.payloadOptions.collect === true) {
                result.frames.push(framePayload);
                context.assets.frames.push(framePayload);
            }

            context.assets.framesEmitted += 1;

        }

    }

    /**
     * Emit non-frame content payloads for one parsed instance.
     * @param {object} context Handler context.
     * @param {object} instance Parsed DICOM instance.
     * @param {object} result Current instance result object.
     */
    async emitContentPayload(context, instance, result) {

        if (this.isMaterializedContentPayloadEnabled() == false)
            return;

        if ((typeof this.payloadOptions?.onContent !== 'function')
            && (this.payloadOptions?.collect !== true)) {
            return;
        }

        var emitted = [];

        var pixelDataAttribute = instance.dataSet?.find(Tag.PixelData);
        var transferSyntax = pixelDataAttribute?.transferSyntax ?? null;

        if ((pixelDataAttribute != null) && (this.isBulkContentApplicationType(transferSyntax) == true)) {
            emitted.push({
                kind: String(transferSyntax?.ApplicationType ?? 'Other'),
                tag: pixelDataAttribute.tag,
                bytes: pixelDataAttribute.access(),
                transferSyntax: transferSyntax?.ID ?? null
            });
        }

        var contentTags = [Tag.EncapsulatedDocument, Tag.WaveformData, Tag.AudioSampleData];
        for (var i = 0; i < contentTags.length; i++) {
            var tag = contentTags[i];
            if (tag == null)
                continue;
            var attribute = instance.dataSet?.find(tag);
            if (attribute != null) {
                emitted.push({
                    kind: 'Content',
                    tag: attribute.tag,
                    bytes: attribute.access(),
                    transferSyntax: attribute.transferSyntax?.ID ?? null
                });
            }
        }

        if ((emitted.length > 0) && (this.payloadOptions.collect === true)) {
            result.content = [];
        }

        for (var j = 0; j < emitted.length; j++) {
            if (typeof this.payloadOptions.onContent === 'function') {
                await this.payloadOptions.onContent(emitted[j], { instance, context });
            }
            if (this.payloadOptions.collect === true) {
                result.content.push(emitted[j]);
                context.assets.content.push(emitted[j]);
            }
            context.assets.contentEmitted += 1;
        }

    }

    /**
     * Resolve SOP Instance UID from one parsed instance.
     * @param {object} instance Parsed DICOM instance.
     * @returns {string | null} The SOP Instance UID when available.
     */
    resolveInstanceUID(instance) {

        var dataSet = instance?.dataSet;
        if (dataSet == null)
            return instance?.sopInstanceUid ?? null;

        var attribute = dataSet.find(Tag.SOPInstanceUID);
        if (attribute == null)
            return instance?.sopInstanceUid ?? null;

        return attribute.value ?? null;

    }

    /**
     * Process one parsed instance for metadata/payload extraction.
     * @param {object} context Handler context.
     * @param {object} instance Parsed DICOM instance.
     * @returns {Promise<object>} The instance assets result.
     */
    async processInstance(context, instance) {

        var result = {
            instanceUID: this.resolveInstanceUID(instance)
        };

        await this.emitMetadata(context, instance, result);
        await this.emitFramePayload(context, instance, result);
        await this.emitContentPayload(context, instance, result);

        return result;

    }

    onReset() {
        this.instanceHandler.onReset();
    }

    onStartInstance(context) {

        context = this.instanceHandler.onStartInstance(context);

        if (context.assets == null) {
            context.assets = {
                metadata: [],
                frames: [],
                content: [],
                metadataCount: 0,
                framesEmitted: 0,
                contentEmitted: 0,
                frameChunksEmitted: 0,
                contentChunksEmitted: 0,
                instances: []
            };
        }

        if (context.assetsRuntime == null) {
            context.assetsRuntime = {
                payloadStates: new Map()
            };
        }

        return context;

    }

    onStartPreamble(context, preamble) {
        return this.instanceHandler.onStartPreamble(context, preamble);
    }

    onStartPrefix(context, prefix) {
        return this.instanceHandler.onStartPrefix(context, prefix);
    }

    onStartAttribute(context, attribute) {
        var status = this.instanceHandler.onStartAttribute(context, attribute);
        this.registerAttributePayloadState(context, attribute);
        return status;
    }

    onStartSequence(context, sequence) {
        return this.instanceHandler.onStartSequence(context, sequence);
    }

    onStartItem(context) {
        return this.instanceHandler.onStartItem(context);
    }

    onAppendAttribute(context, attribute) {
        return this.instanceHandler.onAppendAttribute(context, attribute);
    }

    /**
     * Handle streamed attribute value chunks.
     * Applies chunk-native frame/content payload emission and conditionally re-materializes
     * chunks only when materialized end-of-instance payload extraction requires full bytes.
     * @param {object} context Handler context.
     * @param {{ attribute: object, chunk: Uint8Array }} payload Chunk payload.
     */
    async onAttributeChunk(context, payload) {

        var attribute = payload?.attribute;
        var chunk = payload?.chunk;
        var isFinalChunk = (payload?.isFinalChunk == true);
        var state = context?.assetsRuntime?.payloadStates?.get(attribute) ?? null;

        if (state?.type == 'frame') {
            await this.emitFrameChunkPayload(context, attribute, chunk, isFinalChunk, state);
        }
        else if (state?.type == 'content') {
            await this.emitContentChunkPayload(context, attribute, chunk, isFinalChunk, state);
        }

        if ((attribute?.isBulkStreamed == true)
            && (chunk != null)
            && (chunk.length > 0)
            && (this.shouldMaterializeChunk(attribute, state) == true)) {
            attribute.append(chunk);
        }

        return this.instanceHandler.onAttributeChunk(context, payload);

    }

    onStartMetaSet(context) {
        return this.instanceHandler.onStartMetaSet(context);
    }

    onStartDataSet(context) {
        return this.instanceHandler.onStartDataSet(context);
    }

    onEndPreamble(context, preamble) {
        return this.instanceHandler.onEndPreamble(context, preamble);
    }

    onEndPrefix(context, prefix) {
        return this.instanceHandler.onEndPrefix(context, prefix);
    }

    onEndAttribute(context, attribute) {
        context?.assetsRuntime?.payloadStates?.delete(attribute);
        return this.instanceHandler.onEndAttribute(context, attribute);
    }

    onEndSequence(context, sequence) {
        return this.instanceHandler.onEndSequence(context, sequence);
    }

    onEndItem(context) {
        return this.instanceHandler.onEndItem(context);
    }

    onEndMetaSet(context) {
        return this.instanceHandler.onEndMetaSet(context);
    }

    onEndDataSet(context) {
        return this.instanceHandler.onEndDataSet(context);
    }

    /**
     * Returns the current assets output for this parse session.
     * @param {object} context Handler context.
     * @returns {Promise<object | Array<object>>} The assets result.
     */
    async onEndInstance(context) {

        var instance = context.instance;
        var instanceAssets = await this.processInstance(context, instance);

        // Keep DicomInstanceHandler's internal aggregation behavior intact.
        this.instanceHandler.onEndInstance(context);

        context.assets.instances.push(instanceAssets);

        return (context.assets.instances.length == 1)
            ? context.assets.instances[0]
            : context.assets.instances;

    }

    onError(context, error) {
        return this.instanceHandler.onError(context, error);
    }

    onProgress(context, progress) {
        return this.instanceHandler.onProgress(context, progress);
    }

    /**
     * Construct a DICOM assets extraction handler.
     * @param {{
     *   metadata?: { mapping: DicomMapping, onMetadata?: Function, collect?: boolean },
     *   payload?: {
     *     mode?: 'auto' | 'stream' | 'materialize',
     *     frame?: { frames?: 'first' | 'all' | Array<number> | { start?: number, end?: number, step?: number }, decode?: 'native' | 'rgba', encode?: 'none' | 'jpeg' | 'png' | 'tiff', quality?: number },
     *     onFrame?: Function,
     *     onFrameChunk?: Function,
     *     onContent?: Function,
     *     onContentChunk?: Function,
     *     collect?: boolean
     *   }
     * } | null} options Assets extraction options.
     * @param {object | null} codecRegistry Optional codec registry.
     */
    constructor(options = null, codecRegistry = null) {

        this.options = options ?? {};
        this.metadataOptions = this.options.metadata ?? null;
        this.payloadOptions = this.options.payload ?? null;
        this.payloadMode = this.normalizePayloadMode(this.payloadOptions?.mode);
        this.instanceHandler = new DicomInstanceHandler();
        this.codecRegistry = codecRegistry ?? Configuration.global.codecRegistry;

    }

};
