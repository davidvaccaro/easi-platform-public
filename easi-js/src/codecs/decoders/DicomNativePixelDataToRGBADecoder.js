//
// DicomNativePixelDataToRGBADecoder.js
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

import Tag, { PhotometricInterpretationType } from '../../dicom/Tag.js'
import Modality from '../../dicom/Modality.js';

export default class DicomNativePixelDataToRGBADecoder {

    /**
     * Generate a mask suitable for masking out unsued bits.
     * @param {number} bitsPerPixel The bits per pixel that this mask will be applied to.
     * @param {number} numUnmaskedBits The number of bits that should remain unmasked.
     * @returns The pixel bit mask.
     */    
    generatePixelMask(bitsPerPixel, numUnmaskedBits) {
        return Math.pow(2, numUnmaskedBits) - 1;
    }

    /**
     * Resolve one integer pixel bit mask for the specified stored-bit count.
     * @param {number} bitsStored The number of stored bits in the sample.
     * @returns {number} The mask.
     */
    resolvePixelMask(bitsStored) {

        var bits = Number(bitsStored);
        if (Number.isFinite(bits) == false)
            bits = 16;
        bits = Math.max(1, Math.min(16, Math.floor(bits)));
        if (bits >= 16)
            return 0xFFFF;
        return ((1 << bits) - 1);

    }

    /**
     * Normalize one raw stored sample to signed/unsigned numeric form.
     * @param {number} rawSample The raw sample value.
     * @param {number} bitsStored The stored-bit count.
     * @param {number} pixelRepresentation 0=unsigned, 1=signed.
     * @returns {number} The normalized sample.
     */
    normalizeStoredSample(rawSample, bitsStored, pixelRepresentation = 0) {

        var mask = this.resolvePixelMask(bitsStored);
        var value = (Number(rawSample) || 0) & mask;
        var isSigned = (Number(pixelRepresentation) == 1);
        if (isSigned == false)
            return value;

        var bits = Math.max(1, Math.min(16, Math.floor(Number(bitsStored) || 16)));
        var signBit = (bits >= 16) ? 0x8000 : (1 << (bits - 1));
        if ((value & signBit) != 0)
            value = value - (1 << bits);
        return value;

    }

    /**
     * Read one packed little-endian sample from source bytes.
     * @param {Uint8Array} source Source bytes.
     * @param {number} sourceStart Source start index.
     * @param {number} sampleIndex 0-based sample index.
     * @param {number} bitsAllocated Bits per packed sample.
     * @returns {number} One unpacked sample value.
     */
    readPackedSample(source, sourceStart, sampleIndex, bitsAllocated) {

        var bits = Math.max(1, Math.min(16, Math.floor(Number(bitsAllocated) || 12)));
        var bitStart = (sampleIndex * bits);
        var byteIndex = (sourceStart + (bitStart >> 3));
        var bitOffsetInByte = (bitStart & 0x7);
        var bitsRead = 0;
        var shift = 0;
        var value = 0;

        while (bitsRead < bits) {

            var currentByte = Number(source[byteIndex] ?? 0);
            var availableBits = (8 - bitOffsetInByte);
            var bitsToTake = Math.min((bits - bitsRead), availableBits);
            var mask = ((1 << bitsToTake) - 1);
            var part = ((currentByte >> bitOffsetInByte) & mask);
            value = (value | (part << shift));

            bitsRead += bitsToTake;
            shift += bitsToTake;
            byteIndex += 1;
            bitOffsetInByte = 0;

        }

        return value;

    }

    /**
     * Decode the specified source 8-bit DICOM MONOCHROME pixel-data into the destination buffer as standard RGBA pixel-data.
     * @param {Uint8Array} source The source DICOM MONOCHROME pixel-data.
     * @param {number} sourceStart The index into the source pixel-data buffer to START processing.
     * @param {number} sourceStop The index into the source pixel-data buffer to STOP processin.
     * @param {Uint8Array} destination The destination buffer to store the decoded RGBA pixel-data. 
     * @param {number} destinationStart The index into the destination pixel-data buffer to start processing.
     * @returns TRUE if the conversion succeeded, FALSE otherwise.
     */
    decode8BitDICOMMonochromeToRGB(source, sourceStart, sourceStop, destination, destinationStart, bitsPerPixel, windowCenter, windowWidth) {

        // Establish the apply window level status
        let applyWindowLevel = ((windowWidth != null) && (windowCenter != null) && (Number(windowWidth) > 0)) ? true : false;

        // Detrmine the low and high values per the specified window level parameters
        const lowValue = (applyWindowLevel == true) ? (windowCenter - (windowWidth / 2)) : 0;
        const highValue = (applyWindowLevel == true) ? (windowCenter + (windowWidth / 2)) : 0;

        // Generate any pixel mask for BPP < 8
        var pixelMask = (bitsPerPixel <= 8) ? this.resolvePixelMask(bitsPerPixel) : 255;

        // Establish MONOCHROME "1" versus "2"
        let isOne = (this.dicomObject.imagePixelModule.photometricInterpretation == PhotometricInterpretationType.MONOCHROME1);

        // Loop over the source image bytes
        for (let i = sourceStart; i < sourceStop; i++) {

            // Determine the source pixel
            var pixel = (Math.floor(source[i]) & pixelMask);

            // Apply the window level (if needed)
            if (applyWindowLevel == true) {
                if (pixel <= lowValue) {
                    pixel = 0;
                } else if (pixel >= highValue) {
                    pixel = 255;
                } else {
                    pixel = Math.floor(((pixel - lowValue) / windowWidth) * 255);
                }
            }

            // Invert grayscale for MONOCHROME1.
            if (isOne == true)
                pixel = (255 - pixel);

            // Decode the Monochrome Pixel Data to thge RGBA destination
            destination[((destinationStart + (i - sourceStart)) * 4) + 0] = pixel;
            destination[((destinationStart + (i - sourceStart)) * 4) + 1] = pixel;
            destination[((destinationStart + (i - sourceStart)) * 4) + 2] = pixel;

            // Always emit fully-opaque RGBA output.
            destination[((destinationStart + (i - sourceStart)) * 4) + 3] = 255;

        }

        // Return success
        return true;

    }

    /**
     * Decode the specified source 8-bit DICOM MONOCHROME pixel-data into the destination buffer as standard RGBA pixel-data.
     * @param {Uint8Array} source The source DICOM MONOCHROME pixel-data.
     * @param {number} sourceStart The index into the source pixel-data buffer to START processing.
     * @param {number} sourceStop The index into the source pixel-data buffer to STOP processin.
     * @param {Uint8Array} destination The destination buffer to store the decoded RGBA pixel-data. 
     * @param {number} destinationStart The index into the destination pixel-data buffer to start processing.
     * @returns TRUE if the conversion succeeded, FALSE otherwise.
     */
    decode16BitDICOMMonochromeToRGB(source, sourceStart, sourceStop, destination, destinationStart, bitsPerPixel, windowCenter, windowWidth) {
      
        // Determine the modality
        var modality = this.dicomObject.generalSeriesModule.modality;

        // Establish the apply window level status
        let applyWindowLevel = ((windowWidth != null) && (windowCenter != null) && (Number(windowWidth) > 0)) ? true : false;

        // Detemine the "Rescale Intercept" and "Rescale Intercept"
        var rescaleIntercept = this.dicomObject.modalityLookUpTableModule.rescaleIntercept;

        // Detemine the "Rescale Slope" and "Rescale Intercept"
        var rescaleSlope = this.dicomObject.modalityLookUpTableModule.rescaleSlope;

        // Establish the apply rescale status
        let applyRescale = ((rescaleSlope != null) && (rescaleIntercept != null)) ? true : false;

        // Generate any pixel mask for BPP <= 16
        var pixelMask = this.resolvePixelMask(bitsPerPixel);

        // Determine source sample layout and signedness.
        var bitsAllocated = Math.max(1, Math.min(16, Number(this.dicomObject.imagePixelModule.bitsAllocated ?? bitsPerPixel) || bitsPerPixel));
        var usePackedSource = ((bitsAllocated > 8) && (bitsAllocated < 16));
        var pixelRepresentation = Number(this.dicomObject.imagePixelModule.pixelRepresentation ?? 0);
        var totalSourceBytes = Math.max(0, (sourceStop - sourceStart));
        var sampleCount = usePackedSource
            ? Math.floor((totalSourceBytes * 8) / bitsAllocated)
            : Math.floor(totalSourceBytes / 2);

        // Establish MONOCHROME "1" versus "2"
        let isOne = (this.dicomObject.imagePixelModule.photometricInterpretation == PhotometricInterpretationType.MONOCHROME1);

        // Determine source intensity range for default windowing and range fallback.
        let maxPixelValue = Number.NEGATIVE_INFINITY;
        let minPixelValue = Number.POSITIVE_INFINITY;
        for (let s = 0; s < sampleCount; s++) {
            var sample = usePackedSource
                ? this.readPackedSample(source, sourceStart, s, bitsAllocated)
                : (source[sourceStart + (s * 2)] | source[sourceStart + (s * 2) + 1] << 8);
            sample = (sample & pixelMask);
            var normalized = this.normalizeStoredSample(sample, bitsPerPixel, pixelRepresentation);
            if (applyRescale == true)
                normalized = (normalized * rescaleSlope) + rescaleIntercept;
            if (normalized > maxPixelValue)
                maxPixelValue = normalized;
            if (normalized < minPixelValue)
                minPixelValue = normalized;
        }
        if (Number.isFinite(maxPixelValue) == false)
            maxPixelValue = 0;
        if (Number.isFinite(minPixelValue) == false)
            minPixelValue = 0;

        // DEFAULT the window width and center (if needed)
        if (applyWindowLevel == false) {
            windowCenter = (minPixelValue + maxPixelValue) / 2;
            windowWidth = Math.max(1, (maxPixelValue - minPixelValue));
            applyWindowLevel = true;
        }

        // For PT modality, we need to actuall apply the rescale to the Window Level value itself. (Crude departure from the actual DICOM standard)
        if (modality == Modality.PT) {
            windowCenter = (windowCenter * rescaleSlope) + rescaleIntercept;
            windowWidth = (windowWidth * rescaleSlope) + rescaleIntercept;
        }

        // Detrmine the low and high values per the specified window level parameters
        const lowValue = (applyWindowLevel == true) ? (windowCenter - (windowWidth / 2)) : 0;
        const highValue = (applyWindowLevel == true) ? (windowCenter + (windowWidth / 2)) : 0;
        const rangeDenominator = Math.max(1, (maxPixelValue - minPixelValue));
                
        // Establish the destination index
        var destinationIndex = destinationStart;

        // Loop over the source image bytes
        for (let i = 0; i < sampleCount; i++) {

            // Convert the 8 byte array values to the raw 16-bit pixel value
            var rawPixel = usePackedSource
                ? this.readPackedSample(source, sourceStart, i, bitsAllocated)
                : (source[sourceStart + (i * 2)] | source[sourceStart + (i * 2) + 1] << 8);
            rawPixel = (rawPixel & pixelMask);
            rawPixel = this.normalizeStoredSample(rawPixel, bitsPerPixel, pixelRepresentation);

            // APPLY: Rescale Slope and Rescal Intercept (BEFORE Window Level for all modalities BUT PT)
            if (applyRescale == true) {
                rawPixel = (rawPixel * rescaleSlope) + rescaleIntercept;
            }

            var pixel;

            if (applyWindowLevel == true) {

                // Apply window-center and window-width range min and max
                if (rawPixel < lowValue) {
                    rawPixel = lowValue;
                } else if (rawPixel > highValue) {
                    rawPixel = highValue;
                }

                // Determine the source pixel using window-center and window width
                pixel = Math.floor(((rawPixel - lowValue) / windowWidth) * 255);

            }
            else {

                // Determine the source pixel using default range 
                pixel = Math.floor(((rawPixel - minPixelValue) / rangeDenominator) * 255);

            }

            pixel = this.toByte(pixel);

            // Invert grayscale for MONOCHROME1.
            if (isOne == true)
                pixel = (255 - pixel);

            // Decode the Monochrome Pixel Data to thge RGBA destination
            destination[(destinationIndex * 4) + 0] = pixel;
            destination[(destinationIndex * 4) + 1] = pixel;
            destination[(destinationIndex * 4) + 2] = pixel;

            // Always emit fully-opaque RGBA output.
            destination[(destinationIndex * 4) + 3] = 255;

            // Increment the destination index
            destinationIndex++;

        }
      
        // Return success
        return true;

    }

    /**
     * Decode the specified source 8-bit DICOM RGB pixel-data into destination RGBA bytes.
     * Supports both interleaved (PlanarConfiguration=0) and planar (PlanarConfiguration=1).
     * @param {Uint8Array} source The source DICOM RGB pixel-data.
     * @param {number} sourceStart The index into source buffer to start.
     * @param {number} sourceStop The index into source buffer to stop.
     * @param {Uint8Array} destination Destination RGBA buffer.
     * @param {number} destinationStart Destination pixel index offset.
     * @returns {boolean} TRUE when decode succeeds.
     */
    decode8BitDICOMRGBToRGBA(source, sourceStart, sourceStop, destination, destinationStart) {

        var start = Math.max(0, Number(sourceStart) || 0);
        var stop = Math.min(source.length, Number(sourceStop) || source.length);
        if (stop <= start)
            return false;

        var planarConfiguration = Number(this.dicomObject.imagePixelModule.planarConfiguration ?? 0);
        var destinationIndex = Math.max(0, Number(destinationStart) || 0);
        var samplesPerPixel = Math.max(1, Number(this.dicomObject.imagePixelModule.samplesPerPixel ?? 3));

        if (samplesPerPixel < 3)
            return false;

        if (planarConfiguration == 1) {

            var pixelCount = Math.floor((stop - start) / samplesPerPixel);
            var redStart = start;
            var greenStart = (start + pixelCount);
            var blueStart = (start + (pixelCount * 2));

            for (var pixel = 0; pixel < pixelCount; pixel++) {

                destination[(destinationIndex * 4) + 0] = source[redStart + pixel] ?? 0;
                destination[(destinationIndex * 4) + 1] = source[greenStart + pixel] ?? 0;
                destination[(destinationIndex * 4) + 2] = source[blueStart + pixel] ?? 0;
                destination[(destinationIndex * 4) + 3] = 255;
                destinationIndex++;

            }

            return true;

        }

        for (var i = start; i < stop; i += samplesPerPixel) {

            destination[(destinationIndex * 4) + 0] = source[i] ?? 0;
            destination[(destinationIndex * 4) + 1] = source[i + 1] ?? 0;
            destination[(destinationIndex * 4) + 2] = source[i + 2] ?? 0;
            destination[(destinationIndex * 4) + 3] = 255;
            destinationIndex++;

        }

        return true;

    }

    /**
     * Decode one 8-bit YBR_FULL source range to RGBA bytes.
     * Supports both interleaved (PlanarConfiguration=0) and planar (PlanarConfiguration=1).
     * @param {Uint8Array} source Source DICOM YBR_FULL bytes.
     * @param {number} sourceStart Source start index.
     * @param {number} sourceStop Source stop index.
     * @param {Uint8Array} destination Destination RGBA buffer.
     * @param {number} destinationStart Destination pixel index offset.
     * @returns {boolean} TRUE when decode succeeds.
     */
    decode8BitDICOMYBRFullToRGBA(source, sourceStart, sourceStop, destination, destinationStart) {

        var start = Math.max(0, Number(sourceStart) || 0);
        var stop = Math.min(source.length, Number(sourceStop) || source.length);
        if (stop <= start)
            return false;

        var planarConfiguration = Number(this.dicomObject.imagePixelModule.planarConfiguration ?? 0);
        var destinationIndex = Math.max(0, Number(destinationStart) || 0);
        var samplesPerPixel = Math.max(1, Number(this.dicomObject.imagePixelModule.samplesPerPixel ?? 3));
        if (samplesPerPixel < 3)
            return false;

        var writePixel = (y, cb, cr) => {
            var centeredCb = (Number(cb) || 0) - 128;
            var centeredCr = (Number(cr) || 0) - 128;

            var red = this.toByte((Number(y) || 0) + (1.402 * centeredCr));
            var green = this.toByte((Number(y) || 0) - (0.344136 * centeredCb) - (0.714136 * centeredCr));
            var blue = this.toByte((Number(y) || 0) + (1.772 * centeredCb));

            destination[(destinationIndex * 4) + 0] = red;
            destination[(destinationIndex * 4) + 1] = green;
            destination[(destinationIndex * 4) + 2] = blue;
            destination[(destinationIndex * 4) + 3] = 255;
            destinationIndex++;
        };

        if (planarConfiguration == 1) {

            var pixelCount = Math.floor((stop - start) / samplesPerPixel);
            var yStart = start;
            var cbStart = (start + pixelCount);
            var crStart = (start + (pixelCount * 2));

            for (var pixel = 0; pixel < pixelCount; pixel++) {
                writePixel(
                    source[yStart + pixel] ?? 0,
                    source[cbStart + pixel] ?? 0,
                    source[crStart + pixel] ?? 0
                );
            }

            return true;

        }

        for (var i = start; i < stop; i += samplesPerPixel) {
            writePixel(
                source[i + 0] ?? 0,
                source[i + 1] ?? 0,
                source[i + 2] ?? 0
            );
        }

        return true;

    }

    /**
     * Clamp to one 8-bit value.
     * @param {number} value The source value.
     * @returns {number} The clamped byte.
     */
    toByte(value) {

        var numeric = Number(value);
        if (Number.isFinite(numeric) == false)
            return 0;
        if (numeric < 0)
            return 0;
        if (numeric > 255)
            return 255;
        return Math.round(numeric);

    }

    /**
     * Scale one LUT sample to byte precision.
     * @param {number} sample Source sample value.
     * @param {number} bitsPerEntry Bits per LUT entry.
     * @returns {number} One 8-bit sample.
     */
    scaleLookupSample(sample, bitsPerEntry) {

        var bits = Math.max(1, Math.min(16, Number(bitsPerEntry) || 8));
        var value = Number(sample);
        if (Number.isFinite(value) == false)
            value = 0;

        if (bits <= 8) {
            return this.toByte(value);
        }

        var maxValue = ((1 << bits) - 1);
        if (maxValue <= 0)
            return 0;

        return this.toByte((value / maxValue) * 255);

    }

    /**
     * Read one palette descriptor triplet.
     * @param {object | null} attribute Descriptor attribute.
     * @returns {{ entries: number, firstMapped: number, bitsPerEntry: number } | null} Descriptor.
     */
    readPaletteDescriptor(attribute) {

        if (attribute == null)
            return null;

        var bytes = attribute.access();
        if ((bytes == null) || (bytes.length < 6))
            return null;

        var isLittleEndian = (attribute?.transferSyntax?.IsLittleEndian != false);
        var view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
        var entries = view.getUint16(0, isLittleEndian);
        var firstMapped = view.getInt16(2, isLittleEndian);
        var bitsPerEntry = view.getUint16(4, isLittleEndian);

        if (entries == 0)
            entries = 65536;
        if (bitsPerEntry == 0)
            bitsPerEntry = 16;

        return {
            entries: entries,
            firstMapped: firstMapped,
            bitsPerEntry: bitsPerEntry
        };

    }

    /**
     * Decode one direct (non-segmented) palette channel.
     * @param {Uint8Array} bytes The channel bytes.
     * @param {number} entries Expected entries.
     * @param {number} bitsPerEntry Bits per entry.
     * @param {boolean} isLittleEndian Byte-order flag.
     * @returns {Uint8Array | null} 8-bit channel.
     */
    decodeDirectPaletteChannel(bytes, entries, bitsPerEntry, isLittleEndian) {

        if ((bytes instanceof Uint8Array) == false)
            return null;

        if (entries <= 0)
            return null;

        var channel = new Uint8Array(entries);

        // 16-bit storage (common for LUT data with OW VR).
        if (bytes.length >= (entries * 2)) {

            var view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
            for (var i = 0; i < entries; i++) {

                var sample = view.getUint16((i * 2), isLittleEndian);

                if (bitsPerEntry <= 8) {
                    // Handle both low-byte and high-byte 8-bit packing forms.
                    sample = (sample > 255) ? (sample >> 8) : (sample & 0xFF);
                }

                channel[i] = this.scaleLookupSample(sample, bitsPerEntry);

            }

            return channel;

        }

        // 8-bit storage.
        var count = Math.min(entries, bytes.length);
        for (var j = 0; j < count; j++) {
            channel[j] = this.scaleLookupSample(bytes[j], bitsPerEntry);
        }

        // Pad any missing entries with the last available value.
        var pad = (count > 0) ? channel[count - 1] : 0;
        for (var k = count; k < entries; k++) {
            channel[k] = pad;
        }

        return channel;

    }

    /**
     * Decode one segmented palette channel.
     * Supports opcodes 0 (discrete) and 1 (linear).
     * @param {Uint8Array} bytes Segmented bytes.
     * @param {number} entries Expected entries.
     * @param {number} bitsPerEntry Bits per entry.
     * @param {boolean} isLittleEndian Byte-order flag.
     * @returns {Uint8Array | null} 8-bit channel.
     */
    decodeSegmentedPaletteChannel(bytes, entries, bitsPerEntry, isLittleEndian) {

        if ((bytes instanceof Uint8Array) == false)
            return null;

        if (entries <= 0)
            return null;

        var units = [];

        if (bitsPerEntry <= 8) {
            units = Array.from(bytes);
        }
        else {
            if ((bytes.length % 2) != 0)
                return null;
            var view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
            for (var i = 0; i < (bytes.length / 2); i++) {
                units.push(view.getUint16((i * 2), isLittleEndian));
            }
        }

        var expanded = [];
        var index = 0;

        while ((index < units.length) && (expanded.length < entries)) {

            var opcode = units[index++];

            if (opcode == 0) {
                var copyCount = Math.max(0, Number(units[index++] ?? 0));
                for (var copy = 0; (copy < copyCount) && (index < units.length) && (expanded.length < entries); copy++) {
                    expanded.push(units[index++]);
                }
                continue;
            }

            if (opcode == 1) {
                var runCount = Math.max(0, Number(units[index++] ?? 0));
                var endValue = Number(units[index++] ?? 0);
                var startValue = (expanded.length > 0) ? Number(expanded[expanded.length - 1]) : 0;

                for (var run = 1; (run <= runCount) && (expanded.length < entries); run++) {
                    var interpolated = startValue + (((endValue - startValue) * run) / Math.max(1, runCount));
                    expanded.push(interpolated);
                }
                continue;
            }

            // Opcode 2 (indirect) and unknown opcodes are not currently supported.
            break;

        }

        if (expanded.length == 0)
            return null;

        var channel = new Uint8Array(entries);
        var count = Math.min(entries, expanded.length);

        for (var mapped = 0; mapped < count; mapped++) {
            channel[mapped] = this.scaleLookupSample(expanded[mapped], bitsPerEntry);
        }

        var pad = channel[Math.max(0, count - 1)] ?? 0;
        for (var fill = count; fill < entries; fill++) {
            channel[fill] = pad;
        }

        return channel;

    }

    /**
     * Resolve 8-bit palette channels for PALETTE COLOR decode.
     * @returns {{ red: Uint8Array, green: Uint8Array, blue: Uint8Array, firstMapped: number } | null}
     */
    resolvePaletteChannels() {

        var attributeSet = this.dicomObject?.attributeSet ?? null;
        if (attributeSet == null)
            return null;

        var descriptorAttribute = (
            attributeSet.find(Tag.RedPaletteColorLookupTableDescriptor)
            ?? attributeSet.find(Tag.GreenPaletteColorLookupTableDescriptor)
            ?? attributeSet.find(Tag.BluePaletteColorLookupTableDescriptor)
        );
        var descriptor = this.readPaletteDescriptor(descriptorAttribute);
        if (descriptor == null)
            return null;

        var isLittleEndian = (descriptorAttribute?.transferSyntax?.IsLittleEndian != false);

        var redDirect = attributeSet.find(Tag.RedPaletteColorLookupTableData)?.access() ?? null;
        var greenDirect = attributeSet.find(Tag.GreenPaletteColorLookupTableData)?.access() ?? null;
        var blueDirect = attributeSet.find(Tag.BluePaletteColorLookupTableData)?.access() ?? null;

        var redSegmented = attributeSet.find(Tag.SegmentedRedPaletteColorLookupTableData)?.access() ?? null;
        var greenSegmented = attributeSet.find(Tag.SegmentedGreenPaletteColorLookupTableData)?.access() ?? null;
        var blueSegmented = attributeSet.find(Tag.SegmentedBluePaletteColorLookupTableData)?.access() ?? null;

        var red = this.decodeDirectPaletteChannel(redDirect, descriptor.entries, descriptor.bitsPerEntry, isLittleEndian)
            ?? this.decodeSegmentedPaletteChannel(redSegmented, descriptor.entries, descriptor.bitsPerEntry, isLittleEndian);
        var green = this.decodeDirectPaletteChannel(greenDirect, descriptor.entries, descriptor.bitsPerEntry, isLittleEndian)
            ?? this.decodeSegmentedPaletteChannel(greenSegmented, descriptor.entries, descriptor.bitsPerEntry, isLittleEndian);
        var blue = this.decodeDirectPaletteChannel(blueDirect, descriptor.entries, descriptor.bitsPerEntry, isLittleEndian)
            ?? this.decodeSegmentedPaletteChannel(blueSegmented, descriptor.entries, descriptor.bitsPerEntry, isLittleEndian);

        if (red == null)
            return null;
        if (green == null)
            green = red;
        if (blue == null)
            blue = red;

        return {
            red,
            green,
            blue,
            firstMapped: descriptor.firstMapped
        };

    }

    /**
     * Decode PALETTE COLOR source bytes into RGBA bytes.
     * @param {Uint8Array} source Source pixel bytes.
     * @param {number} sourceStart Source start index.
     * @param {number} sourceStop Source stop index.
     * @param {Uint8Array} destination Destination RGBA bytes.
     * @param {number} destinationStart Destination pixel index.
     * @returns {boolean} TRUE when decode succeeds.
     */
    decodeDICOMPaletteColorToRGBA(source, sourceStart, sourceStop, destination, destinationStart) {

        var channels = this.resolvePaletteChannels();
        if (channels == null)
            return false;

        var start = Math.max(0, Number(sourceStart) || 0);
        var stop = Math.min(source.length, Number(sourceStop) || source.length);
        if (stop <= start)
            return false;

        var bitsPerPixel = Math.max(1, Number(this.dicomObject.imagePixelModule.bitsStored ?? 8) || 8);
        var samplesPerPixel = Math.max(1, Number(this.dicomObject.imagePixelModule.samplesPerPixel ?? 1) || 1);
        if (samplesPerPixel != 1)
            return false;

        var destinationIndex = Math.max(0, Number(destinationStart) || 0);
        var pixelMask = (bitsPerPixel <= 16) ? this.generatePixelMask(16, bitsPerPixel) : 65535;
        var firstMapped = Number(channels.firstMapped ?? 0);

        if (bitsPerPixel <= 8) {

            for (var i = start; i < stop; i++) {

                var sample8 = (Math.floor(source[i]) & 0xFF);
                var paletteIndex8 = (sample8 - firstMapped);
                if (paletteIndex8 < 0)
                    paletteIndex8 = 0;
                if (paletteIndex8 >= channels.red.length)
                    paletteIndex8 = (channels.red.length - 1);

                destination[(destinationIndex * 4) + 0] = channels.red[paletteIndex8] ?? 0;
                destination[(destinationIndex * 4) + 1] = channels.green[paletteIndex8] ?? 0;
                destination[(destinationIndex * 4) + 2] = channels.blue[paletteIndex8] ?? 0;
                destination[(destinationIndex * 4) + 3] = 255;
                destinationIndex++;

            }

            return true;

        }

        for (var j = start; j < stop; j += 2) {

            var sample16 = ((source[j] | (source[j + 1] << 8)) & pixelMask);
            var paletteIndex16 = (sample16 - firstMapped);
            if (paletteIndex16 < 0)
                paletteIndex16 = 0;
            if (paletteIndex16 >= channels.red.length)
                paletteIndex16 = (channels.red.length - 1);

            destination[(destinationIndex * 4) + 0] = channels.red[paletteIndex16] ?? 0;
            destination[(destinationIndex * 4) + 1] = channels.green[paletteIndex16] ?? 0;
            destination[(destinationIndex * 4) + 2] = channels.blue[paletteIndex16] ?? 0;
            destination[(destinationIndex * 4) + 3] = 255;
            destinationIndex++;

        }

        return true;

    }

    /**
     * Decode the specificed data to the output buffer.
     * @param {Uint8Array} source The Uint8Array that serves as the source of the decode operation.
     * @param {number} sourceStart The index into the input array to START reading decode input.
     * @param {number} sourceStop The index into the input array to STOP reading decode input.
     * @param {Uint8Array} destination  The Uint8Array that serves as the destination of the decode operation.
     * @param {number} destinationStart The index into the output array to START writing decoded output.
     */
    decode(source, sourceStart, sourceStop, destination, destinationStart, windowCenter, windowWidth) {

        // Switch the Photometric Interpretation
        switch (this.dicomObject.imagePixelModule.photometricInterpretation) {

            // Handle Monochrome Interpretation
            case PhotometricInterpretationType.MONOCHROME1:
            case PhotometricInterpretationType.MONOCHROME2:

                // Determine the bits-per-pixel (used)
                let bitsPerPixel = this.dicomObject.imagePixelModule.bitsStored;

                // Handle based on the bits-per-pixel
                if ((bitsPerPixel > 0) && (bitsPerPixel <= 8)) {
                    return this.decode8BitDICOMMonochromeToRGB(
                        source, sourceStart, sourceStop, 
                        destination, destinationStart, 
                        bitsPerPixel,
                        windowCenter, windowWidth);
                }
                else if ((bitsPerPixel > 8) && (bitsPerPixel <= 16)) {
                    return this.decode16BitDICOMMonochromeToRGB(
                        source, sourceStart, sourceStop, 
                        destination, destinationStart, 
                        bitsPerPixel,
                        windowCenter, windowWidth);
                }

            case PhotometricInterpretationType.RGB:

                // Handle 8-bit RGB native pixel data.
                if (this.dicomObject.imagePixelModule.bitsStored <= 8) {
                    return this.decode8BitDICOMRGBToRGBA(
                        source, sourceStart, sourceStop,
                        destination, destinationStart
                    );
                }
                break;

            case PhotometricInterpretationType.YBR_FULL:

                // Handle 8-bit YBR_FULL native pixel data.
                if (this.dicomObject.imagePixelModule.bitsStored <= 8) {
                    return this.decode8BitDICOMYBRFullToRGBA(
                        source, sourceStart, sourceStop,
                        destination, destinationStart
                    );
                }
                break;

            case PhotometricInterpretationType.PALETTECOLOR:
                return this.decodeDICOMPaletteColorToRGBA(
                    source, sourceStart, sourceStop,
                    destination, destinationStart
                );

        }

        // Return fail
        return false;

    }

    /**
     * Construct an Dicom Pixel Data To RGB Codec instance.
     */
    constructor(dicomObject) {

        // Set the image-pixel module
        this.dicomObject = dicomObject;

    }

};
