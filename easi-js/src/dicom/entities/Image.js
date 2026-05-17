//
// Image.js
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

import Configuration from '../../environment/Configuration.js';
import ImagePixelModule from '../modules/ImagePixelModule.js';
import MultiFrameModule from '../modules/MultiFrameModule.js';
import VisualizationFunctionModule from '../modules/VisualizationFunctionModule.js'
import ModalityLookUpTableModule from '../modules/ModalityLookUpTableModule.js'
import ImagePlaneModule from '../modules/ImagePlaneModule.js';
import PixelData from '../PixelData.js';
import Tag from '../Tag.js'
import Entity from './Entity.js';
import Constants from '../Constants.js';

export default class Image extends Entity {

    /**
     * Extract one contiguous encapsulated frame codestream from ITEM-fragment bytes.
     * @param {Uint8Array} sourceBytes PixelData source bytes.
     * @param {number} frameStart Start offset to first frame fragment value byte.
     * @param {number} frameStop Stop offset (exclusive) for the frame range.
     * @param {boolean} isLittleEndian Transfer-syntax endianness.
     * @returns {Uint8Array} Contiguous frame codestream bytes.
     */
    extractEncapsulatedFrameBytes(sourceBytes, frameStart, frameStop, isLittleEndian = true) {

        var start = Math.max(0, Number(frameStart) || 0);
        var stop = Math.min(sourceBytes.length, Number(frameStop) || sourceBytes.length);
        if (stop <= start)
            return new Uint8Array(0);

        // ITEM tag bytes for FEFF00E0 (little-endian) / FFFE E000 (big-endian).
        var itemTagBytes = (isLittleEndian == true)
            ? [0xFE, 0xFF, 0x00, 0xE0]
            : [0xFF, 0xFE, 0xE0, 0x00];

        var isItemTagAt = (offset) => {
            if ((offset < 0) || ((offset + 8) > sourceBytes.length))
                return false;
            return (
                sourceBytes[offset + 0] == itemTagBytes[0]
                && sourceBytes[offset + 1] == itemTagBytes[1]
                && sourceBytes[offset + 2] == itemTagBytes[2]
                && sourceBytes[offset + 3] == itemTagBytes[3]
            );
        };

        // PixelData offsets point at ITEM value starts, so first header is expected at start-8.
        var cursor = (start - 8);
        if (isItemTagAt(cursor) == false)
            return sourceBytes.subarray(start, stop);

        var chunks = [];
        while ((cursor + 8) <= sourceBytes.length) {

            if (isItemTagAt(cursor) == false)
                break;

            var lengthView = new DataView(sourceBytes.buffer, sourceBytes.byteOffset + cursor + 4, 4);
            var itemLength = lengthView.getUint32(0, isLittleEndian);
            var valueStart = (cursor + 8);
            var valueStop = (valueStart + itemLength);

            if (valueStart >= stop)
                break;

            var chunkStart = Math.max(valueStart, start);
            var chunkStop = Math.min(valueStop, stop);
            if (chunkStop > chunkStart)
                chunks.push(sourceBytes.subarray(chunkStart, chunkStop));

            cursor = valueStop;
            if (cursor >= stop)
                break;

        }

        if (chunks.length == 0)
            return sourceBytes.subarray(start, stop);

        if (chunks.length == 1)
            return chunks[0];

        var totalLength = 0;
        for (var i = 0; i < chunks.length; i++) {
            totalLength += chunks[i].length;
        }

        var output = new Uint8Array(totalLength);
        var writeOffset = 0;
        for (var j = 0; j < chunks.length; j++) {
            output.set(chunks[j], writeOffset);
            writeOffset += chunks[j].length;
        }

        return output;

    }

    /**
     * Get the Image Pixel Module.
     * @returns The Image Pixel Module.
     */
    get imagePixelModule() {
        return new ImagePixelModule(this.attributeSet);
    }

    get pixels() {
        return this.imagePixelModule;
    }

    /**
     * Get the Image Plane Module.
     * @returns The Image Plane Module.
     */
    get imagePlaneModule() {
        return new ImagePlaneModule(this.attributeSet);
    }

    /**
     * Get the Multi Frame Module.
     * @returns The Multi Frame Module.
     */
    get multiFrameModule() {
        return new MultiFrameModule(this.attributeSet);
    }

    /**
     * Get the Visualization Function Module.
     * @returns The Visualization Function Module.
     */
    get visualizationFunctionModule() {
        return new VisualizationFunctionModule(this.attributeSet);
    }

    /**
     * Get the Visualization Function Module.
     * @returns The Visualization Function Module.
     */
    get modalityLookUpTableModule() {
        return new ModalityLookUpTableModule(this.attributeSet);
    }

    /**
     * Is the current image-object multi-frame?
     * @returns TRUE if the current image-object is multi-frame, FALSE otherwise.
     */
    get isMultiFrame() {

        // Determine based on the option for the modality and the current instance state.
        return (
            ((this.generalSeriesModule.modality.IsMultiFrame == true) 
            && 
            (this.multiFrameModule.numberOfFrames > 1)) 
            ? true : false
        );

    }

    /**
     * Decode the pixel data to the destination Uint8Array.
     * @param {Uint8Array} destination The destination Uint8Array that serves as the destination of the decode operation.
     * @param {object} decoder (Optional) The desired decoder. Defaults to RGBA. 
     * @param {number} frame (Optional) The frame index (for multi-frame images) to decode. Defaults to 0.
     */
    decodeFrame(destination, decoder = null, frame = 0, windowCenter = null, windowWidth = null) {

        var res = false;

        // Access the PixelData attribute
        var attribute = this.attributeSet.find(Tag.PixelData);

        // Establish any window-center and window-width
        if ((windowCenter == null) || (windowWidth == null)) {

            // Establish any DEFAULT window-center
            windowCenter = this.visualizationFunctionModule.windowCenter.pop();

            // Establish any DEFAULT window-width
            windowWidth = this.visualizationFunctionModule.windowWidth.pop();

        }

        // Establish an instance of the decoder configured for the given transfer-syntax
        decoder = (decoder != null) ? decoder : Configuration.global.getDecoderFor(attribute.transferSyntax, this);

        // Handle encapsulated pixel data (undefined-length) using parsed frame offsets.
        if (attribute.valueLength == Constants.UndefinedLength) {

            var sourceBytes = attribute.access();
            var pixelData = new PixelData(attribute);
            var offset = pixelData.offsets[frame];

            if ((offset == null) || (typeof offset.start != 'number')) {
                throw new Error(
                    `Missing PixelData frame offset for frame ${frame}. Available offsets: ${pixelData.offsets.length}.`
                );
            }

            var stop = ((frame + 1) < pixelData.offsets.length)
                ? pixelData.offsets[frame + 1].start
                : sourceBytes.length;

            // Decode the specified encapsulated frame bytes.
            if (attribute?.transferSyntax?.IsCompressed == true) {
                var frameBytes = this.extractEncapsulatedFrameBytes(
                    sourceBytes,
                    offset.start,
                    stop,
                    (attribute?.transferSyntax?.IsLittleEndian != false)
                );
                res = decoder.decode(frameBytes, 0, frameBytes.length, destination, 0, windowCenter, windowWidth);
            }
            else {
                res = decoder.decode(sourceBytes, offset.start, stop, destination, 0, windowCenter, windowWidth);
            }

        }
        // Decode uncompressed single-frame pixel data.
        else if (this.isMultiFrame == false) {

            // Establish the SIZE of a given frame
            var frameSize = this.imagePixelModule.imageSize;
            
            // Decode the whole frame
            res = decoder.decode(this.imagePixelModule.pixelData, 0, frameSize, destination, 0, windowCenter, windowWidth)

        }
        else {

            var frameSize = this.imagePixelModule.imageSize;
            var frameStart = Math.max(0, frame * frameSize);
            var frameStop = (frameStart + frameSize);

            if ((frameStart < 0) || (frameStart >= this.imagePixelModule.pixelData.length)) {
                throw new Error(
                    `Missing PixelData frame offset for frame ${frame}. Available offsets: 1.`
                );
            }

            // Decode the specified fixed-length frame.
            res = decoder.decode(this.imagePixelModule.pixelData, frameStart, frameStop, destination, 0, windowCenter, windowWidth);

        }

        return res;

    }
        
    /**
     * Construct a DICOM Image Object instance.
     */
    constructor(attributeSet) {

        // Call the super constructor
        super(attributeSet);

    }

};
