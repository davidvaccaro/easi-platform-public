//
// DicomAssetArchiveHandler.js - 1.0.0
//
// Stream DICOM Asset Archive Handler Class
//

import DicomAssetsHandler from './DicomAssetsHandler.js';
import ZipArchiveWriter from '../../writers/ZipArchiveWriter.js';
import DicomToFHIRImagingStudyMapping from '../mappings/DicomToFHIRImagingStudyMapping.js';

export default class DicomAssetArchiveHandler {

    /**
     * Ensure one path segment does not contain path separator characters.
     * @param {string | null | undefined} value Source value.
     * @param {string} fallback Fallback value.
     * @returns {string} Safe segment.
     */
    safePathSegment(value, fallback = 'instance') {
        var segment = String(value ?? fallback).replace(/[\\/]/g, '_').trim();
        return (segment.length > 0) ? segment : fallback;
    }

    /**
     * Normalize an archive path.
     * @param {string | null | undefined} value Source value.
     * @param {string} fallback Fallback value.
     * @returns {string} Normalized path.
     */
    normalizeArchivePath(value, fallback) {
        var path = String(value ?? fallback).replace(/\\/g, '/').replace(/^\/+/, '').replace(/\/+/g, '/').trim();
        return (path.length > 0) ? path : fallback;
    }

    /**
     * Pad one number for deterministic archive file ordering.
     * @param {number} value Numeric value.
     * @param {number} width Pad width.
     * @returns {string} Padded value.
     */
    padNumber(value, width = 6) {
        return String(value).padStart(width, '0');
    }

    /**
     * Determine file extension for frame payload.
     * @param {object} frame Frame payload.
     * @returns {string} File extension.
     */
    resolveFrameExtension(frame) {

        var mimeType = String(frame?.mimeType ?? '').toLowerCase();
        if (mimeType.indexOf('png') >= 0)
            return 'png';
        if ((mimeType.indexOf('jpeg') >= 0) || (mimeType.indexOf('jpg') >= 0))
            return 'jpg';
        if (mimeType.indexOf('tiff') >= 0)
            return 'tiff';

        var encoding = String(frame?.encoding ?? '').toLowerCase();
        if (encoding == 'png')
            return 'png';
        if ((encoding == 'jpeg') || (encoding == 'jpg'))
            return 'jpg';
        if ((encoding == 'tiff') || (encoding == 'tif'))
            return 'tiff';

        return 'bin';

    }

    /**
     * Determine file extension for content payload.
     * @param {object} content Content payload.
     * @returns {string} File extension.
     */
    resolveContentExtension(content) {

        var kind = String(content?.kind ?? '').toLowerCase();

        if (kind == 'video')
            return 'video';
        if (kind == 'audio')
            return 'audio';
        if (kind == 'xml')
            return 'xml';
        if (kind == 'text')
            return 'txt';

        return 'bin';

    }

    /**
     * Build one default assets option object from archive options.
     * @returns {object} Default assets options.
     */
    buildDefaultAssetsOptions() {
        return {
            metadata: {
                mapping: new DicomToFHIRImagingStudyMapping()
            },
            payload: {
                frame: {
                    frames: 'all',
                    decode: 'rgba',
                    encode: 'png'
                }
            }
        };
    }

    /**
     * Build one manifest model.
     * @param {object} state Current archive state.
     * @returns {object} Manifest model.
     */
    buildManifest(state) {

        return {
            version: 'easi-assets-zip-1.0',
            createdAt: (new Date()).toISOString(),
            instanceUID: state.instanceUID,
            metadataFile: this.metadataFilePath,
            frameCount: state.frameCount,
            contentCount: state.contentCount,
            files: state.files
        };

    }

    /**
     * Add one metadata payload to the current archive state.
     * @param {object} metadata Metadata payload.
     * @param {object} context Handler context.
     */
    async onMetadata(metadata, context) {

        if (this.currentArchiveState == null)
            return;

        this.currentArchiveState.metadata.push({
            instanceUID: context?.instance?.sopInstanceUid ?? null,
            value: metadata
        });

        if (typeof this.userOnMetadata == 'function') {
            var result = this.userOnMetadata(metadata, context);
            if ((result != null) && (typeof result.then == 'function')) {
                await result;
            }
        }

    }

    /**
     * Add one frame payload to the current archive state.
     * @param {object} frame Frame payload.
     * @param {object} context Handler context.
     */
    async onFrame(frame, context) {

        if (this.currentArchiveState == null)
            return;

        var state = this.currentArchiveState;
        state.frameCount += 1;

        var extension = this.resolveFrameExtension(frame);
        var frameFileName = this.framePath + '/frame-' + this.padNumber(state.frameCount) + '.' + extension;

        await state.zipWriter.addFile(frameFileName, frame?.bytes ?? new Uint8Array(0));

        state.files.push({
            path: frameFileName,
            kind: 'frame',
            index: frame?.index ?? null,
            mimeType: frame?.mimeType ?? null,
            size: frame?.bytes?.length ?? 0,
            width: frame?.width ?? null,
            height: frame?.height ?? null
        });

        if (typeof this.userOnFrame == 'function') {
            var result = this.userOnFrame(frame, context);
            if ((result != null) && (typeof result.then == 'function')) {
                await result;
            }
        }

    }

    /**
     * Add one content payload to the current archive state.
     * @param {object} content Content payload.
     * @param {object} context Handler context.
     */
    async onContent(content, context) {

        if (this.includeContent == false)
            return;

        if (this.currentArchiveState == null)
            return;

        var state = this.currentArchiveState;
        state.contentCount += 1;

        var extension = this.resolveContentExtension(content);
        var contentFileName = this.contentPath + '/content-' + this.padNumber(state.contentCount) + '.' + extension;

        await state.zipWriter.addFile(contentFileName, content?.bytes ?? new Uint8Array(0));

        state.files.push({
            path: contentFileName,
            kind: 'content',
            category: content?.kind ?? null,
            size: content?.bytes?.length ?? 0
        });

        if (typeof this.userOnContent == 'function') {
            var result = this.userOnContent(content, context);
            if ((result != null) && (typeof result.then == 'function')) {
                await result;
            }
        }

    }

    /**
     * Reset one parse session.
     */
    onReset() {
        this.currentArchiveState = null;
        this.assetsHandler.onReset();
    }

    /**
     * Start an instance parse session.
     * @param {object} context Handler context.
     * @returns {object} Handler context.
     */
    onStartInstance(context) {

        context = this.assetsHandler.onStartInstance(context);

        var instanceUID = this.safePathSegment(context?.instance?.sopInstanceUid, 'instance');

        this.currentArchiveState = {
            instanceUID: instanceUID,
            metadata: [],
            frameCount: 0,
            contentCount: 0,
            files: [],
            zipWriter: new ZipArchiveWriter({
                onChunk: this.onChunk,
                collectOutput: this.collectOutput
            })
        };

        return context;

    }

    onStartPreamble(context, preamble) {
        return this.assetsHandler.onStartPreamble(context, preamble);
    }

    onStartPrefix(context, prefix) {
        return this.assetsHandler.onStartPrefix(context, prefix);
    }

    onStartAttribute(context, attribute) {
        return this.assetsHandler.onStartAttribute(context, attribute);
    }

    onStartSequence(context, sequence) {
        return this.assetsHandler.onStartSequence(context, sequence);
    }

    onStartItem(context) {
        return this.assetsHandler.onStartItem(context);
    }

    onAppendAttribute(context, attribute) {
        return this.assetsHandler.onAppendAttribute(context, attribute);
    }

    onStartMetaSet(context) {
        return this.assetsHandler.onStartMetaSet(context);
    }

    onStartDataSet(context) {
        return this.assetsHandler.onStartDataSet(context);
    }

    onEndPreamble(context, preamble) {
        return this.assetsHandler.onEndPreamble(context, preamble);
    }

    onEndPrefix(context, prefix) {
        return this.assetsHandler.onEndPrefix(context, prefix);
    }

    onEndAttribute(context, attribute) {
        return this.assetsHandler.onEndAttribute(context, attribute);
    }

    onEndSequence(context, sequence) {
        return this.assetsHandler.onEndSequence(context, sequence);
    }

    onEndItem(context) {
        return this.assetsHandler.onEndItem(context);
    }

    onEndMetaSet(context) {
        return this.assetsHandler.onEndMetaSet(context);
    }

    onEndDataSet(context) {
        return this.assetsHandler.onEndDataSet(context);
    }

    /**
     * Complete one instance parse and emit the final ZIP archive output.
     * @param {object} context Handler context.
     * @returns {Promise<Uint8Array | number>} Final archive output.
     */
    async onEndInstance(context) {

        await this.assetsHandler.onEndInstance(context);

        var state = this.currentArchiveState;
        if (state == null)
            return this.collectOutput ? new Uint8Array(0) : 0;

        if (this.includeMetadata == true) {

            var metadataValue = null;
            if (state.metadata.length == 1) {
                metadataValue = state.metadata[0].value;
            }
            else if (state.metadata.length > 1) {
                metadataValue = state.metadata.map((element) => element.value);
            }

            var metadataBytes = this.textEncoder.encode(JSON.stringify(metadataValue, null, 2));
            await state.zipWriter.addFile(this.metadataFilePath, metadataBytes);

            state.files.push({
                path: this.metadataFilePath,
                kind: 'metadata',
                size: metadataBytes.length
            });

        }

        if (this.includeManifest == true) {

            var manifest = this.buildManifest(state);
            var manifestBytes = this.textEncoder.encode(JSON.stringify(manifest, null, 2));
            await state.zipWriter.addFile(this.manifestFilePath, manifestBytes);

            state.files.push({
                path: this.manifestFilePath,
                kind: 'manifest',
                size: manifestBytes.length
            });

        }

        var archiveResult = await state.zipWriter.finalize();

        this.currentArchiveState = null;

        return archiveResult;

    }

    onError(context, error) {
        return this.assetsHandler.onError(context, error);
    }

    onProgress(context, progress) {
        return this.assetsHandler.onProgress(context, progress);
    }

    /**
     * Sets the codec registry for archive frame encoding.
     * @param {object | null} codecRegistry The codec registry.
     */
    set codecRegistry(codecRegistry) {
        this._codecRegistry = codecRegistry;
        if (this.assetsHandler != null) {
            this.assetsHandler.codecRegistry = codecRegistry;
        }
    }

    /**
     * Gets the codec registry for archive frame encoding.
     * @returns {object | null} The codec registry.
     */
    get codecRegistry() {
        return this._codecRegistry;
    }

    /**
     * Construct a DICOM asset archive handler.
     * @param {{
     *   metadata?: { mapping?: object, onMetadata?: Function },
     *   payload?: {
     *     frame?: { frames?: 'first' | 'all' | Array<number> | { start?: number, end?: number, step?: number }, decode?: 'native' | 'rgba', encode?: 'none' | 'jpeg' | 'png' | 'tiff', quality?: number },
     *     onFrame?: Function,
     *     onContent?: Function
     *   },
     *   includeMetadata?: boolean,
     *   includeManifest?: boolean,
     *   metadataFilePath?: string,
     *   manifestFilePath?: string,
     *   framePath?: string,
     *   contentPath?: string,
     *   includeContent?: boolean,
     *   onChunk?: Function,
     *   collectOutput?: boolean
     * } | null} options Archive options.
     * @param {object | null} codecRegistry Optional codec registry.
     */
    constructor(options = null, codecRegistry = null) {

        options = options ?? {};

        var defaults = this.buildDefaultAssetsOptions();

        var metadataOptions = options.metadata;
        if (metadataOptions === undefined) {
            metadataOptions = defaults.metadata;
        }

        if ((metadataOptions != null) && (metadataOptions.mapping == null)) {
            metadataOptions = Object.assign({}, metadataOptions, {
                mapping: new DicomToFHIRImagingStudyMapping()
            });
        }

        var payloadOptions = options.payload;
        if (payloadOptions === undefined) {
            payloadOptions = defaults.payload;
        }

        if ((payloadOptions != null) && (payloadOptions.frame != null)) {
            payloadOptions = Object.assign({}, payloadOptions, {
                frame: Object.assign({}, defaults.payload.frame, payloadOptions.frame)
            });
        }

        this.userOnMetadata = metadataOptions?.onMetadata ?? null;
        this.userOnFrame = payloadOptions?.onFrame ?? null;
        this.userOnContent = payloadOptions?.onContent ?? null;
        this.includeContent = ((options.includeContent == true) || (this.userOnContent != null));

        if ((payloadOptions == null) && (this.includeContent == true)) {
            payloadOptions = {};
        }

        if (metadataOptions != null) {
            metadataOptions = Object.assign({}, metadataOptions, {
                onMetadata: (metadata, context) => this.onMetadata(metadata, context),
                collect: false
            });
        }

        if (payloadOptions != null) {
            var wrappedPayloadOptions = Object.assign({}, payloadOptions, {
                onFrame: (frame, context) => this.onFrame(frame, context),
                collect: false
            });

            if ((this.includeContent == true) || (this.userOnContent != null)) {
                wrappedPayloadOptions.onContent = (content, context) => this.onContent(content, context);
            }

            payloadOptions = wrappedPayloadOptions;
        }

        this.onChunk = options.onChunk ?? null;
        this.collectOutput = (options.collectOutput != null)
            ? (options.collectOutput == true)
            : (this.onChunk == null);

        this.includeMetadata = (options.includeMetadata != null)
            ? (options.includeMetadata == true)
            : (metadataOptions != null);

        this.includeManifest = (options.includeManifest != null)
            ? (options.includeManifest == true)
            : true;

        this.metadataFilePath = this.normalizeArchivePath(options.metadataFilePath ?? 'metadata.json', 'metadata.json');
        this.manifestFilePath = this.normalizeArchivePath(options.manifestFilePath ?? 'manifest.json', 'manifest.json');
        this.framePath = this.normalizeArchivePath(options.framePath ?? 'frames', 'frames');
        this.contentPath = this.normalizeArchivePath(options.contentPath ?? 'content', 'content');

        this.currentArchiveState = null;
        this.textEncoder = new TextEncoder();
        this._codecRegistry = codecRegistry;

        this.assetsHandler = new DicomAssetsHandler({
            metadata: metadataOptions,
            payload: payloadOptions
        }, codecRegistry);

    }

}
