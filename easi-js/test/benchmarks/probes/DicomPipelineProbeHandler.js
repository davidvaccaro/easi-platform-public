import Tag from '../../../src/dicom/Tag.js';
import DicomInstanceHandler from '../../../src/handlers/terminals/DicomInstanceHandler.js';

/**
 * Probe handler for measuring parser/handler behavior while preserving
 * the normal terminal Instance output from DicomInstanceHandler.
 */
export default class DicomPipelineProbeHandler extends DicomInstanceHandler {

    resetProbeMetrics() {

        this.attributeCount = 0;
        this.appendAttributeEventCount = 0;
        this.endAttributeEventCount = 0;
        this.progressEventCount = 0;
        this.pixelDataChunkCount = 0;
        this.pixelDataChunkBytes = 0;
        this.maxReadLagBytes = 0;

        this.peakAttributeMaterializedBytes = 0;
        this.peakPixelDataMaterializedBytes = 0;
        this.peakHeapUsedBytes = 0;
        this.peakArrayBuffersBytes = 0;
        this.peakExternalBytes = 0;
        this.peakRssBytes = 0;

    }

    sampleMemory() {

        var memory = process.memoryUsage();

        if (memory.heapUsed > this.peakHeapUsedBytes)
            this.peakHeapUsedBytes = memory.heapUsed;

        if (memory.arrayBuffers > this.peakArrayBuffersBytes)
            this.peakArrayBuffersBytes = memory.arrayBuffers;

        if (memory.external > this.peakExternalBytes)
            this.peakExternalBytes = memory.external;

        if (memory.rss > this.peakRssBytes)
            this.peakRssBytes = memory.rss;

    }

    trackAttribute(attribute) {

        if ((attribute == null) || (typeof attribute.length !== 'function'))
            return;

        var materializedBytes = attribute.length();

        if (materializedBytes > this.peakAttributeMaterializedBytes)
            this.peakAttributeMaterializedBytes = materializedBytes;

        if ((attribute.tag === Tag.PixelData) && (materializedBytes > this.peakPixelDataMaterializedBytes))
            this.peakPixelDataMaterializedBytes = materializedBytes;

        this.sampleMemory();

    }

    onStartInstance(context) {
        this.resetProbeMetrics();
        this.sampleMemory();
        return super.onStartInstance(context);
    }

    onStartAttribute(context, attribute) {
        this.attributeCount++;
        this.trackAttribute(attribute);
        return super.onStartAttribute(context, attribute);
    }

    onAppendAttribute(context, attribute) {
        this.appendAttributeEventCount++;
        this.trackAttribute(attribute);
    }

    onEndAttribute(context, attribute) {
        this.endAttributeEventCount++;
        this.trackAttribute(attribute);
    }

    onAttributeChunk(context, payload) {

        if (payload?.attribute?.tag !== Tag.PixelData)
            return;

        var length = payload?.chunk?.length || 0;
        if (length <= 0)
            return;

        this.pixelDataChunkCount++;
        this.pixelDataChunkBytes += length;
        this.sampleMemory();

    }

    onProgress(context, progress) {

        this.progressEventCount++;

        if (progress != null) {

            var bytesRead = (progress.bytesRead != null) ? progress.bytesRead : 0;
            var bytesProcessed = (progress.bytesProcessed != null) ? progress.bytesProcessed : 0;
            var readLagBytes = Math.max(0, (bytesRead - bytesProcessed));

            if (readLagBytes > this.maxReadLagBytes)
                this.maxReadLagBytes = readLagBytes;

        }

        this.sampleMemory();

    }

    onEndInstance(context) {
        this.sampleMemory();
        return super.onEndInstance(context);
    }

    get snapshot() {
        return {
            attributeCount: this.attributeCount,
            appendAttributeEventCount: this.appendAttributeEventCount,
            endAttributeEventCount: this.endAttributeEventCount,
            progressEventCount: this.progressEventCount,
            pixelDataChunkCount: this.pixelDataChunkCount,
            pixelDataChunkBytes: this.pixelDataChunkBytes,
            maxReadLagBytes: this.maxReadLagBytes,
            peakAttributeMaterializedBytes: this.peakAttributeMaterializedBytes,
            peakPixelDataMaterializedBytes: this.peakPixelDataMaterializedBytes,
            peakHeapUsedBytes: this.peakHeapUsedBytes,
            peakArrayBuffersBytes: this.peakArrayBuffersBytes,
            peakExternalBytes: this.peakExternalBytes,
            peakRssBytes: this.peakRssBytes
        };
    }

    constructor() {
        super();
        this.resetProbeMetrics();
    }

}

/**
 * Create a chunked reader compatible with PartStreamReader.process(...).
 * @param {Uint8Array} bytes Source bytes.
 * @param {number} chunkBytes Chunk size.
 * @returns {{read: Function, releaseLock: Function}} Reader contract.
 */
export function createChunkReader(bytes, chunkBytes = (64 * 1024)) {

    var offset = 0;

    return {

        async read() {

            if (offset >= bytes.length) {
                return {
                    done: true,
                    value: null
                };
            }

            var next = Math.min(offset + chunkBytes, bytes.length);
            var value = bytes.subarray(offset, next);
            offset = next;

            return {
                done: false,
                value: value
            };

        },

        releaseLock() {
        }

    };

}
