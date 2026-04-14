//
// MixedImagingNormalizationFilter.js
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

import Exception, { GeneralErrorCodes } from "../../environment/Exception.js";
import Configuration from "../../environment/Configuration.js";
import ImagingDataUtils from "../../utils/ImagingDataUtils.js";
import JpegDecoder from "../../codecs/decoders/JpegDecoder.js";
import PngDecoder from "../../codecs/decoders/PngDecoder.js";
import TiffDecoder from "../../codecs/decoders/TiffDecoder.js";
import DicomDataParser from "../../parsers/DicomDataParser.js";
import { Status } from "../../parsers/Status.js";
import DicomInstanceHandler from "../terminals/DicomInstanceHandler.js";
import DicomDataWriterHandler from "../terminals/DicomDataWriterHandler.js";
import Image from "../../dicom/entities/Image.js";
import Instance from "../../dicom/Instance.js";
import MetaSet from "../../dicom/MetaSet.js";
import DataSet from "../../dicom/DataSet.js";
import Preamble from "../../dicom/Preamble.js";
import Prefix from "../../dicom/Prefix.js";
import Attribute from "../../dicom/Attribute.js";
import Tag from "../../dicom/Tag.js";
import SOPClass from "../../dicom/SOPClass.js";
import TransferSyntax from "../../dicom/TransferSyntax.js";
import Utilities from "../../dicom/Utilities.js";

export default class MixedImagingNormalizationFilter {

    /**
     * Forward one handler event to the next handler.
     * @param {string} name Event name.
     * @param {object | null} context Current context.
     * @param {*} param Event payload.
     * @returns {Promise<*>} Forwarded result.
     */
    async forward(name, context, param = null) {

        if ((this.nextHandler == null) || (this.nextHandler[name] == null))
            return param;

        var result = this.nextHandler[name](context, param);
        if ((result != null) && (typeof result.then == "function")) {
            return await result;
        }

        return result;

    }

    /**
     * Normalize one scalar number.
     * @param {*} value Candidate scalar.
     * @param {number} fallback Fallback value.
     * @returns {number} Number value.
     */
    toNumber(value, fallback = 0) {
        var numeric = Number(value);
        return Number.isFinite(numeric) ? numeric : fallback;
    }

    /**
     * Clamp one number into bounds.
     * @param {number} value Source value.
     * @param {number} minimum Minimum bound.
     * @param {number} maximum Maximum bound.
     * @returns {number} Clamped value.
     */
    clamp(value, minimum, maximum) {
        if (value < minimum)
            return minimum;
        if (value > maximum)
            return maximum;
        return value;
    }

    /**
     * Normalize frame output format alias.
     * @param {string | null} format Source format.
     * @returns {string} Normalized format.
     */
    normalizeFrameOutputFormat(format = null) {

        var normalized = String(format ?? "png").trim().toLowerCase();
        if ((normalized == "raw")
            || (normalized == "rgba")
            || (normalized == "none")) {
            return "rgba";
        }

        if (normalized == "jpg")
            return "jpeg";

        return normalized;

    }

    /**
     * Normalize one scalar text.
     * @param {*} value Source scalar.
     * @param {string | null} fallback Fallback value.
     * @returns {string | null} Normalized text.
     */
    toText(value, fallback = null) {

        if (value == null)
            return fallback;

        var text = String(value).trim();
        if (text.length == 0)
            return fallback;

        return text;

    }

    /**
     * Resolve source file name from payload content-type metadata.
     * @param {object} payload Source payload.
     * @returns {string | null} Source file name.
     */
    resolveSourceFileName(payload) {
        return payload?.contentType?.fileName ?? null;
    }

    /**
     * Resolve source path metadata from payload.
     * @param {object} payload Source payload.
     * @returns {string | null} Source path.
     */
    resolveSourcePath(payload) {
        return payload?.sourcePath ?? ImagingDataUtils.resolveSourcePath(payload?.contentType ?? null);
    }

    /**
     * Resolve high-level source kind for one payload.
     * @param {object} payload Source payload.
     * @returns {"dicom" | "image" | "unknown"} Source kind.
     */
    resolveSourceKind(payload) {
        return payload?.kind ?? ImagingDataUtils.detectImagingKind(payload?.bytes ?? null, payload?.contentType ?? null);
    }

    /**
     * Resolve bulk-data policy used by the internal DICOM parser.
     * Normalization requires full PixelData materialization to decode frames.
     * @returns {{ mode: string, knownLengthThreshold: number, hardSafetyCap: number }} Bulk-data policy.
     */
    resolveDicomParserBulkDataPolicy() {

        var defaultPolicy = {
            mode: "materialize",
            knownLengthThreshold: Number.MAX_SAFE_INTEGER,
            hardSafetyCap: Number.MAX_SAFE_INTEGER
        };

        var candidate = this.options?.dicomBulkDataPolicy;
        if ((candidate == null) || (typeof candidate != "object")) {
            return defaultPolicy;
        }

        var knownLengthThreshold = Number(candidate.knownLengthThreshold);
        if ((Number.isFinite(knownLengthThreshold) == false) || (knownLengthThreshold < 0)) {
            knownLengthThreshold = defaultPolicy.knownLengthThreshold;
        }
        else {
            knownLengthThreshold = Math.floor(knownLengthThreshold);
        }

        var hardSafetyCap = Number(candidate.hardSafetyCap);
        if ((Number.isFinite(hardSafetyCap) == false) || (hardSafetyCap < 0)) {
            hardSafetyCap = defaultPolicy.hardSafetyCap;
        }
        else {
            hardSafetyCap = Math.floor(hardSafetyCap);
        }

        return {
            mode: "materialize",
            knownLengthThreshold: knownLengthThreshold,
            hardSafetyCap: hardSafetyCap
        };

    }

    /**
     * Format one Date to DICOM DA value.
     * @param {Date} date Source date.
     * @returns {string} DA value.
     */
    toDA(date) {
        var year = String(date.getUTCFullYear()).padStart(4, "0");
        var month = String(date.getUTCMonth() + 1).padStart(2, "0");
        var day = String(date.getUTCDate()).padStart(2, "0");
        return `${year}${month}${day}`;
    }

    /**
     * Format one Date to DICOM TM value.
     * @param {Date} date Source date.
     * @returns {string} TM value.
     */
    toTM(date) {
        var hour = String(date.getUTCHours()).padStart(2, "0");
        var minute = String(date.getUTCMinutes()).padStart(2, "0");
        var second = String(date.getUTCSeconds()).padStart(2, "0");
        return `${hour}${minute}${second}`;
    }

    /**
     * Convert RGBA bytes to packed RGB bytes.
     * @param {Uint8Array} rgba Source RGBA bytes.
     * @returns {Uint8Array} Packed RGB bytes.
     */
    rgbaToRgb(rgba) {

        var length = Math.floor((rgba?.length ?? 0) / 4);
        var rgb = new Uint8Array(length * 3);
        var rgbOffset = 0;

        for (var rgbaOffset = 0; rgbaOffset < (length * 4); rgbaOffset += 4) {
            rgb[rgbOffset++] = rgba[rgbaOffset];
            rgb[rgbOffset++] = rgba[rgbaOffset + 1];
            rgb[rgbOffset++] = rgba[rgbaOffset + 2];
        }

        return rgb;

    }

    /**
     * Stretch one decoded monochrome frame when dynamic range is too narrow.
     * @param {Uint8Array} rgba Decoded RGBA bytes.
     * @returns {Uint8Array} Contrast-adjusted RGBA bytes.
     */
    stretchMonochromeRgba(rgba) {

        if ((rgba instanceof Uint8Array) == false)
            return rgba;

        var min = 255;
        var max = 0;

        for (var offset = 0; offset < rgba.length; offset += 4) {
            var value = rgba[offset];
            if (value < min)
                min = value;
            if (value > max)
                max = value;
        }

        var range = (max - min);
        if (range <= 0)
            return rgba;

        // Keep already well-spread grayscale frames unchanged.
        if (range >= 192)
            return rgba;

        var scaled = new Uint8Array(rgba.length);
        for (var index = 0; index < rgba.length; index += 4) {

            var source = rgba[index];
            var mapped = Math.floor(((source - min) / range) * 255);
            if (mapped < 0)
                mapped = 0;
            if (mapped > 255)
                mapped = 255;

            scaled[index] = mapped;
            scaled[index + 1] = mapped;
            scaled[index + 2] = mapped;
            scaled[index + 3] = rgba[index + 3];

        }

        return scaled;

    }

    /**
     * Build one attribute with explicit value override.
     * @param {Tag} tag DICOM tag.
     * @param {*} value Attribute value.
     * @param {TransferSyntax} transferSyntax Transfer syntax.
     * @returns {Attribute} The attribute.
     */
    createAttribute(tag, value, transferSyntax) {
        var attribute = new Attribute(tag, 0, new Uint8Array(0), transferSyntax);
        attribute.value = value;
        return attribute;
    }

    /**
     * Build one meta-set attribute.
     * @param {Tag} tag DICOM tag.
     * @param {*} value Attribute value.
     * @returns {Attribute} Meta attribute.
     */
    createMetaAttribute(tag, value) {
        return this.createAttribute(tag, value, TransferSyntax.ExplicitVRLittleEndian);
    }

    /**
     * Build one data-set attribute.
     * @param {Tag} tag DICOM tag.
     * @param {*} value Attribute value.
     * @param {TransferSyntax} transferSyntax Transfer syntax.
     * @returns {Attribute} Data attribute.
     */
    createDataAttribute(tag, value, transferSyntax) {
        return this.createAttribute(tag, value, transferSyntax);
    }

    /**
     * Sort attributes by group/element.
     * @param {Array<Attribute>} attributes Source attributes.
     * @returns {Array<Attribute>} Sorted attributes.
     */
    sortAttributes(attributes) {
        return [...(attributes ?? [])].sort((left, right) => {
            var leftGroup = Number(left?.tag?.Group ?? 0);
            var rightGroup = Number(right?.tag?.Group ?? 0);
            if (leftGroup != rightGroup)
                return (leftGroup - rightGroup);
            var leftElement = Number(left?.tag?.Element ?? 0);
            var rightElement = Number(right?.tag?.Element ?? 0);
            return (leftElement - rightElement);
        });
    }

    /**
     * Compute File Meta Information Group Length.
     * @param {Array<Attribute>} attributes Meta attributes excluding group-length.
     * @returns {number} Group length value.
     */
    computeMetaGroupLength(attributes) {

        var writer = new DicomDataWriterHandler({ collectOutput: false });
        var total = 0;

        for (var i = 0; i < attributes.length; i++) {
            var attribute = attributes[i];
            var valueBytes = writer.resolveAttributeValueBytes(attribute);
            var headerBytes = writer.serializeHeader(
                attribute.tag,
                writer.resolveValueRepresentation(attribute),
                valueBytes.length,
                TransferSyntax.ExplicitVRLittleEndian
            );
            total += (headerBytes.length + valueBytes.length);
        }

        return total;

    }

    /**
     * Serialize one DICOM instance to byte output.
     * @param {Instance} instance Source instance.
     * @returns {Promise<Uint8Array>} DICOM byte output.
     */
    async serializeInstance(instance) {

        var writer = new DicomDataWriterHandler({ collectOutput: true });
        var context = writer.onStartInstance(null);

        if (instance?.preamble != null) {
            await writer.onEndPreamble(context, instance.preamble);
        }

        if (instance?.prefix != null) {
            await writer.onEndPrefix(context, instance.prefix);
        }

        if (instance?.metaSet != null) {
            writer.onStartMetaSet(context);
            var metaAttributes = this.sortAttributes(instance.metaSet.attributes);
            for (var metaIndex = 0; metaIndex < metaAttributes.length; metaIndex++) {
                await writer.onEndAttribute(context, metaAttributes[metaIndex]);
            }
            writer.onEndMetaSet(context);
        }

        if (instance?.dataSet != null) {
            writer.onStartDataSet(context);
            var dataAttributes = this.sortAttributes(instance.dataSet.attributes);
            for (var dataIndex = 0; dataIndex < dataAttributes.length; dataIndex++) {
                await writer.onEndAttribute(context, dataAttributes[dataIndex]);
            }
            writer.onEndDataSet(context);
        }

        return writer.onEndInstance(context);

    }

    /**
     * Parse one DICOM byte payload to an Instance model.
     * @param {object} payload Source payload.
     * @returns {Promise<Instance>} Parsed instance.
     */
    async parseDicomInstance(payload) {

        var bytes = payload?.bytes ?? null;
        if ((bytes instanceof Uint8Array) == false) {
            throw new Exception(
                "Failed normalizing mixed imaging payload. DICOM source bytes are missing.",
                GeneralErrorCodes.InvalidData
            );
        }

        this.dicomParser.resetSession();
        this.dicomParser.bulkDataPolicy = this.dicomParserBulkDataPolicy;
        this.dicomParser.parseOptions = null;

        var status = await this.dicomParser.parse(
            bytes,
            true,
            bytes.length,
            bytes.length,
            payload?.contentType ?? "application/dicom"
        );

        if (status == Status.FAIL) {
            throw (this.dicomParser.error
                ?? new Exception(
                    "Failed normalizing mixed imaging payload. DICOM parse failed.",
                    GeneralErrorCodes.InvalidData
                ));
        }

        var instance = this.dicomParser.result;
        if (Array.isArray(instance) == true) {
            instance = instance[0] ?? null;
        }

        if ((instance == null) || (instance.dataSet == null)) {
            throw new Exception(
                "Failed normalizing mixed imaging payload. Parsed DICOM instance is invalid.",
                GeneralErrorCodes.InvalidData
            );
        }

        return instance;

    }

    /**
     * Decode one source image payload to RGBA.
     * @param {object} payload Source payload.
     * @returns {Promise<{ width: number, height: number, rgba: Uint8Array, imageFormat: string }>} Decoded frame payload.
     */
    async decodeImagePayload(payload) {

        var bytes = payload?.bytes ?? null;
        if ((bytes instanceof Uint8Array) == false) {
            throw new Exception(
                "Failed normalizing mixed imaging payload. Image source bytes are missing.",
                GeneralErrorCodes.InvalidData
            );
        }

        var imageFormat = String(
            payload?.imageFormat
            ?? ImagingDataUtils.detectImageFormat(bytes, payload?.contentType ?? null)
            ?? ""
        ).trim().toLowerCase();
        if (imageFormat == "jpg")
            imageFormat = "jpeg";

        if ((imageFormat != "jpeg")
            && (imageFormat != "png")
            && (imageFormat != "tiff")) {
            throw new Exception(
                `Failed normalizing mixed imaging payload. Unsupported image format '${imageFormat || "unknown"}'.`,
                GeneralErrorCodes.InvalidData
            );
        }

        var decoded = null;
        if (imageFormat == "jpeg") {
            decoded = this.jpegDecoder.decodeImage(bytes, 0, bytes.length);
        }
        else if (imageFormat == "png") {
            decoded = await this.pngDecoder.decodeImage(bytes, 0, bytes.length);
        }
        else {
            decoded = this.tiffDecoder.decodeImage(bytes, 0, bytes.length);
        }

        return {
            width: decoded.width,
            height: decoded.height,
            rgba: decoded.bytes,
            imageFormat: imageFormat
        };

    }

    /**
     * Decode one DICOM payload to RGBA frame output.
     * @param {object} payload Source payload.
     * @returns {Promise<{ width: number, height: number, rgba: Uint8Array, frameIndex: number, frameCount: number }>} Decoded frame payload.
     */
    async decodeDicomPayload(payload) {

        var instance = await this.parseDicomInstance(payload);
        var image = new Image(instance.dataSet);

        var width = this.toNumber(image.imagePixelModule?.columns, 0);
        var height = this.toNumber(image.imagePixelModule?.rows, 0);
        if ((width <= 0) || (height <= 0)) {
            throw new Exception(
                "Failed normalizing mixed imaging payload. DICOM image dimensions are missing.",
                GeneralErrorCodes.InvalidData
            );
        }

        var frameCount = Math.max(1, this.toNumber(image.multiFrameModule?.numberOfFrames, 1));
        var frameIndex = Math.floor(this.toNumber(this.options.frameIndex, 0));
        frameIndex = this.clamp(frameIndex, 0, frameCount - 1);

        var pixelData = image.attributeSet.find(Tag.PixelData);
        if (pixelData == null) {
            throw new Exception(
                "Failed normalizing mixed imaging payload. DICOM PixelData is missing.",
                GeneralErrorCodes.InvalidData
            );
        }

        var decoder = this.codecRegistry.getDecoderForTransferSyntax(pixelData.transferSyntax, image);
        var rgba = new Uint8Array(width * height * 4);
        image.decodeFrame(rgba, decoder, frameIndex);

        var photometricInterpretation = String(image.imagePixelModule?.photometricInterpretation ?? "").trim().toUpperCase();
        var allowMonochromeStretch = (this.options?.disableDicomMonochromeStretch == true) ? false : true;
        if ((allowMonochromeStretch == true) && (photometricInterpretation.includes("MONOCHROME") == true)) {
            rgba = this.stretchMonochromeRgba(rgba);
        }

        return {
            width: width,
            height: height,
            rgba: rgba,
            frameIndex: frameIndex,
            frameCount: frameCount
        };

    }

    /**
     * Encode normalized frame bytes using configured output format.
     * @param {Uint8Array} rgba RGBA bytes.
     * @param {number} width Frame width.
     * @param {number} height Frame height.
     * @returns {Promise<{ bytes: Uint8Array, imageFormat: string, mediaType: string }>} Encoded output.
     */
    async encodeNormalizedFrame(rgba, width, height) {

        if (this.frameOutputFormat == "rgba") {
            return {
                bytes: rgba,
                imageFormat: "rgba",
                mediaType: "application/octet-stream"
            };
        }

        var encoder = this.codecRegistry.getEncoder(this.frameOutputFormat);
        if ((encoder == null) || (typeof encoder.encode != "function")) {
            throw new Exception(
                `No encoder is registered for normalized frame format '${this.frameOutputFormat}'.`,
                GeneralErrorCodes.NotImplemented
            );
        }

        var encoded = encoder.encode(rgba, width, height, this.options.encoderOptions ?? null);
        if ((encoded != null) && (typeof encoded.then == "function")) {
            encoded = await encoded;
        }

        if ((encoded?.bytes instanceof Uint8Array) == false) {
            throw new Exception(
                `Invalid normalized frame encoding output for format '${this.frameOutputFormat}'.`,
                GeneralErrorCodes.InvalidData
            );
        }

        var imageFormat = String(encoded?.format ?? this.frameOutputFormat).trim().toLowerCase();
        if (imageFormat == "jpg")
            imageFormat = "jpeg";

        return {
            bytes: encoded.bytes,
            imageFormat: imageFormat,
            mediaType: encoded?.mimeType ?? ImagingDataUtils.resolveImageMediaType(imageFormat) ?? "application/octet-stream"
        };

    }

    /**
     * Build one normalized secondary-capture DICOM instance from RGBA frame payload.
     * @param {{ width: number, height: number, rgba: Uint8Array }} frame Frame payload.
     * @returns {Instance} DICOM secondary-capture instance.
     */
    buildDicomInstanceFromFrame(frame) {

        var transferSyntax = TransferSyntax.find(this.options.transferSyntaxUID ?? TransferSyntax.ExplicitVRLittleEndian.ID)
            ?? TransferSyntax.ExplicitVRLittleEndian;
        var sopClassUID = this.toText(this.options.sopClassUID, SOPClass.SecondaryCaptureImageStorage.ID);
        var sopInstanceUID = this.toText(this.options.sopInstanceUID, null) ?? Utilities.newUID();
        var studyInstanceUID = this.toText(this.options.studyInstanceUID, null) ?? Utilities.newUID();
        var seriesInstanceUID = this.toText(this.options.seriesInstanceUID, null) ?? Utilities.newUID();
        var modality = this.toText(this.options.modality, "OT");

        var now = new Date();
        var studyDate = this.toText(this.options.studyDate, this.toDA(now));
        var studyTime = this.toText(this.options.studyTime, this.toTM(now));
        var seriesDate = this.toText(this.options.seriesDate, studyDate);
        var seriesTime = this.toText(this.options.seriesTime, studyTime);
        var contentDate = this.toText(this.options.contentDate, studyDate);
        var contentTime = this.toText(this.options.contentTime, studyTime);

        var implementationClassUID = this.toText(
            this.options.implementationClassUID,
            "1.2.826.0.1.3680043.10.5432.1"
        );
        var implementationVersionName = this.toText(
            this.options.implementationVersionName,
            "EASIJS_1_0"
        );
        var sourceApplicationEntityTitle = this.toText(
            this.options.sourceApplicationEntityTitle,
            "EASIJS"
        );

        var instance = new Instance();
        instance.preamble = new Preamble(new Uint8Array(128));
        instance.prefix = new Prefix(new TextEncoder().encode("DICM"));
        instance.metaSet = new MetaSet();
        instance.dataSet = new DataSet();

        var metaAttributes = [
            this.createMetaAttribute(Tag.FileMetaInformationVersion, new Uint8Array([0x00, 0x01])),
            this.createMetaAttribute(Tag.MediaStorageSOPClassUID, sopClassUID),
            this.createMetaAttribute(Tag.MediaStorageSOPInstanceUID, sopInstanceUID),
            this.createMetaAttribute(Tag.TransferSyntaxUID, transferSyntax.ID),
            this.createMetaAttribute(Tag.ImplementationClassUID, implementationClassUID),
            this.createMetaAttribute(Tag.ImplementationVersionName, implementationVersionName),
            this.createMetaAttribute(Tag.SourceApplicationEntityTitle, sourceApplicationEntityTitle)
        ];

        instance.metaSet.add(this.createMetaAttribute(
            Tag.FileMetaInformationGroupLength,
            this.computeMetaGroupLength(metaAttributes)
        ));
        instance.metaSet.addAll(metaAttributes);

        var rgb = this.rgbaToRgb(frame.rgba);
        instance.dataSet.add(this.createDataAttribute(Tag.SOPClassUID, sopClassUID, transferSyntax));
        instance.dataSet.add(this.createDataAttribute(Tag.SOPInstanceUID, sopInstanceUID, transferSyntax));
        instance.dataSet.add(this.createDataAttribute(Tag.StudyInstanceUID, studyInstanceUID, transferSyntax));
        instance.dataSet.add(this.createDataAttribute(Tag.SeriesInstanceUID, seriesInstanceUID, transferSyntax));
        instance.dataSet.add(this.createDataAttribute(Tag.Modality, modality, transferSyntax));
        instance.dataSet.add(this.createDataAttribute(Tag.PatientName, this.toText(this.options.patientName, ""), transferSyntax));
        instance.dataSet.add(this.createDataAttribute(Tag.PatientID, this.toText(this.options.patientID, ""), transferSyntax));
        instance.dataSet.add(this.createDataAttribute(Tag.StudyDate, studyDate, transferSyntax));
        instance.dataSet.add(this.createDataAttribute(Tag.StudyTime, studyTime, transferSyntax));
        instance.dataSet.add(this.createDataAttribute(Tag.SeriesDate, seriesDate, transferSyntax));
        instance.dataSet.add(this.createDataAttribute(Tag.SeriesTime, seriesTime, transferSyntax));
        instance.dataSet.add(this.createDataAttribute(Tag.ContentDate, contentDate, transferSyntax));
        instance.dataSet.add(this.createDataAttribute(Tag.ContentTime, contentTime, transferSyntax));
        instance.dataSet.add(this.createDataAttribute(Tag.InstanceNumber, this.toNumber(this.options.instanceNumber, 1), transferSyntax));
        instance.dataSet.add(this.createDataAttribute(Tag.NumberOfFrames, 1, transferSyntax));
        instance.dataSet.add(this.createDataAttribute(Tag.SamplesPerPixel, 3, transferSyntax));
        instance.dataSet.add(this.createDataAttribute(Tag.PhotometricInterpretation, "RGB", transferSyntax));
        instance.dataSet.add(this.createDataAttribute(Tag.PlanarConfiguration, 0, transferSyntax));
        instance.dataSet.add(this.createDataAttribute(Tag.Rows, frame.height, transferSyntax));
        instance.dataSet.add(this.createDataAttribute(Tag.Columns, frame.width, transferSyntax));
        instance.dataSet.add(this.createDataAttribute(Tag.BitsAllocated, 8, transferSyntax));
        instance.dataSet.add(this.createDataAttribute(Tag.BitsStored, 8, transferSyntax));
        instance.dataSet.add(this.createDataAttribute(Tag.HighBit, 7, transferSyntax));
        instance.dataSet.add(this.createDataAttribute(Tag.PixelRepresentation, 0, transferSyntax));
        instance.dataSet.add(this.createDataAttribute(Tag.PixelData, rgb, transferSyntax));

        return instance;

    }

    /**
     * Normalize one mixed payload to DICOM bytes when needed.
     * @param {object} payload Source payload.
     * @returns {Promise<object>} Normalized payload.
     */
    async normalizeToDicom(payload) {

        var sourceKind = this.resolveSourceKind(payload);
        if (sourceKind == "dicom") {
            return payload;
        }

        if (sourceKind != "image") {
            if (this.unknownMode == "fail") {
                throw new Exception(
                    "Failed normalizing mixed imaging payload. Could not determine source payload kind.",
                    GeneralErrorCodes.InvalidData
                );
            }
            return payload;
        }

        var decoded = await this.decodeImagePayload(payload);
        var instance = this.buildDicomInstanceFromFrame(decoded);
        var bytes = await this.serializeInstance(instance);

        var sourcePath = this.resolveSourcePath(payload);
        var sourceFileName = this.resolveSourceFileName(payload);
        var contentType = ImagingDataUtils.buildContentType("application/dicom", sourcePath, sourceFileName);

        return Object.assign({}, payload, {
            kind: "dicom",
            imageFormat: null,
            bytes: bytes,
            mediaType: "application/dicom",
            contentType: contentType,
            sourcePath: sourcePath,
            normalizedFrom: "image",
            normalizedMode: "dicom"
        });

    }

    /**
     * Normalize one mixed payload to one frame representation.
     * @param {object} payload Source payload.
     * @returns {Promise<object>} Normalized payload.
     */
    async normalizeToFrames(payload) {

        var sourceKind = this.resolveSourceKind(payload);
        var decoded = null;

        if (sourceKind == "image") {
            decoded = await this.decodeImagePayload(payload);
        }
        else if (sourceKind == "dicom") {
            decoded = await this.decodeDicomPayload(payload);
        }
        else {
            if (this.unknownMode == "fail") {
                throw new Exception(
                    "Failed normalizing mixed imaging payload. Could not determine source payload kind.",
                    GeneralErrorCodes.InvalidData
                );
            }
            return payload;
        }

        var encoded = await this.encodeNormalizedFrame(decoded.rgba, decoded.width, decoded.height);
        var sourcePath = this.resolveSourcePath(payload);
        var sourceFileName = this.resolveSourceFileName(payload);
        var contentType = ImagingDataUtils.buildContentType(encoded.mediaType, sourcePath, sourceFileName);

        var normalized = Object.assign({}, payload, {
            kind: "image",
            imageFormat: encoded.imageFormat,
            bytes: encoded.bytes,
            mediaType: encoded.mediaType,
            contentType: contentType,
            sourcePath: sourcePath,
            normalizedFrom: sourceKind,
            normalizedMode: "frames",
            width: decoded.width,
            height: decoded.height,
            frameIndex: decoded.frameIndex ?? 0,
            frameCount: decoded.frameCount ?? 1
        });

        if (this.includeRgba == true) {
            normalized.rgba = decoded.rgba;
            normalized.frame = {
                width: decoded.width,
                height: decoded.height,
                rgba: decoded.rgba
            };
        }

        return normalized;

    }

    /**
     * Normalize one payload according to configured mode.
     * @param {object} payload Source payload.
     * @returns {Promise<object>} Normalized payload.
     */
    async normalizePayload(payload) {

        if ((payload == null) || (typeof payload != "object")) {
            return payload;
        }

        if (this.mode == "dicom") {
            return await this.normalizeToDicom(payload);
        }

        return await this.normalizeToFrames(payload);

    }

    onReset(context, payload = null) {
        return this.forward("onReset", context, payload);
    }

    onStart(context, payload = null) {
        return this.forward("onStart", context, payload);
    }

    onData(context, payload = null) {
        return this.forward("onData", context, payload);
    }

    /**
     * Normalize one mixed payload before forwarding to the next handler.
     * @param {object | null} context Handler context.
     * @param {object} payload Source payload.
     * @returns {Promise<*>} Forwarded result.
     */
    async onEnd(context, payload) {
        var normalized = await this.normalizePayload(payload);
        return await this.forward("onEnd", context, normalized);
    }

    onError(context, payload = null) {
        return this.forward("onError", context, payload);
    }

    onProgress(context, payload = null) {
        return this.forward("onProgress", context, payload);
    }

    /**
     * Normalize incoming options.
     * @param {object | null} options Raw options.
     * @returns {object} Normalized options.
     */
    normalizeOptions(options = null) {

        var normalized = Object.assign({}, options ?? {});
        var mode = String(normalized.mode ?? "").trim().toLowerCase();
        if ((mode != "frames") && (mode != "dicom")) {
            throw new Exception(
                "Invalid normalization mode. Expected 'frames' or 'dicom'.",
                GeneralErrorCodes.InvalidParameter
            );
        }

        normalized.mode = mode;
        return normalized;

    }

    /**
     * Construct one mixed imaging normalization filter.
     * @param {object | null} nextHandler The next handler in chain.
     * @param {object | null} options Normalization options.
     */
    constructor(nextHandler = null, options = null) {

        this.nextHandler = nextHandler;
        this.options = this.normalizeOptions(options);
        this.mode = this.options.mode;
        this.unknownMode = (String(this.options.unknownMode ?? "passthrough").trim().toLowerCase() == "fail")
            ? "fail"
            : "passthrough";
        this.includeRgba = (this.options.includeRgba !== false);
        this.frameOutputFormat = this.normalizeFrameOutputFormat(this.options.format ?? this.options.outputFormat ?? "png");
        this.codecRegistry = this.options.codecRegistry ?? Configuration.global.codecRegistry;

        this.jpegDecoder = new JpegDecoder();
        this.pngDecoder = new PngDecoder();
        this.tiffDecoder = new TiffDecoder();

        this.dicomParser = new DicomDataParser();
        this.dicomParserBulkDataPolicy = this.resolveDicomParserBulkDataPolicy();
        this.dicomParser.bulkDataPolicy = this.dicomParserBulkDataPolicy;
        this.dicomParser.handler = new DicomInstanceHandler();

    }

}
