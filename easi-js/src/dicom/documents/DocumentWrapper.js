//
// DocumentWrapper.js
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

import Constants from "../Constants.js";
import Utilities from "../Utilities.js";
import SOPClass from "../SOPClass.js";
import TransferSyntax from "../TransferSyntax.js";
import Tag from "../Tag.js";
import Modality from "../Modality.js";

import Instance from "../Instance.js";
import MetaSet from "../MetaSet.js";
import DataSet from "../DataSet.js";
import Preamble from "../Preamble.js";
import Prefix from "../Prefix.js";
import Attribute from "../Attribute.js";

import DicomDataWriterHandler from "../../handlers/terminals/DicomDataWriterHandler.js";

export default class DocumentWrapper {

    /**
     * Normalize scalar text values.
     * @param {*} value The source value.
     * @returns {string | null} The normalized text.
     */
    toScalarString(value) {

        if (value == null)
            return null;

        if (typeof value == "string") {
            var text = value.trim();
            return (text.length > 0) ? text : null;
        }

        return String(value).trim();

    }

    /**
     * Convert an arbitrary byte-like value to Uint8Array.
     * @param {*} value The source value.
     * @returns {Uint8Array | null} The normalized bytes.
     */
    toUint8Array(value) {

        if (value == null)
            return null;

        if (value instanceof Uint8Array)
            return value;

        if (ArrayBuffer.isView(value) == true)
            return new Uint8Array(value.buffer, value.byteOffset, value.byteLength);

        if (value instanceof ArrayBuffer)
            return new Uint8Array(value);

        if (Array.isArray(value) == true)
            return Uint8Array.from(value);

        return null;

    }

    /**
     * Decode one base64 text payload to bytes.
     * @param {string} base64Text The base64 text.
     * @returns {Uint8Array} The decoded bytes.
     */
    decodeBase64(base64Text) {

        var text = String(base64Text ?? "").trim();
        if (text.length == 0)
            return new Uint8Array(0);

        var marker = "base64,";
        var markerIndex = text.indexOf(marker);
        if (markerIndex >= 0) {
            text = text.substring(markerIndex + marker.length);
        }

        if ((globalThis != null) && (typeof globalThis.atob == "function")) {
            var decoded = globalThis.atob(text);
            var bytes = new Uint8Array(decoded.length);
            for (var i = 0; i < decoded.length; i++) {
                bytes[i] = decoded.charCodeAt(i);
            }
            return bytes;
        }

        if (typeof Buffer != "undefined") {
            return new Uint8Array(Buffer.from(text, "base64"));
        }

        throw new Exception(
            "Unable to decode base64 document payload in the current runtime.",
            GeneralErrorCodes.GeneralError
        );

    }

    /**
     * Resolve MIME type from descriptor.
     * @param {object} descriptor The source descriptor.
     * @returns {string} The normalized MIME type.
     */
    resolveMimeType(descriptor) {

        var mimeType = this.toScalarString(
            descriptor?.mimeType
            ?? descriptor?.contentType
            ?? descriptor?.type
            ?? null
        );

        if (mimeType == null)
            return "application/octet-stream";

        var normalized = mimeType.toLowerCase();
        var parameterIndex = normalized.indexOf(";");
        if (parameterIndex >= 0) {
            normalized = normalized.substring(0, parameterIndex).trim();
        }

        return (normalized.length > 0) ? normalized : "application/octet-stream";

    }

    /**
     * Resolve SOP Class UID for one descriptor.
     * @param {object} descriptor The source descriptor.
     * @param {string} mimeType The normalized MIME type.
     * @returns {string} The SOP Class UID.
     */
    resolveSopClassUid(descriptor, mimeType) {

        var explicit = this.toScalarString(descriptor?.sopClassUid ?? descriptor?.sopClassUID ?? null);
        if (explicit != null)
            return explicit;

        if (DocumentWrapper.MimeTypeToSopClassUid[mimeType] != null)
            return DocumentWrapper.MimeTypeToSopClassUid[mimeType];

        throw new Exception(
            "Unable to resolve SOP Class UID for wrapped document. Provide descriptor.sopClassUid or a supported mimeType.",
            GeneralErrorCodes.InvalidParameter
        );

    }

    /**
     * Resolve modality for one descriptor.
     * @param {object} descriptor The source descriptor.
     * @param {string} sopClassUid The SOP Class UID.
     * @returns {string} The modality code.
     */
    resolveModality(descriptor, sopClassUid) {

        var explicit = this.toScalarString(descriptor?.modality ?? null);
        if (explicit != null)
            return explicit;

        if (DocumentWrapper.M3dSopClassUids.has(sopClassUid) == true)
            return Modality.M3D.ID;

        return Modality.DOC.ID;

    }

    /**
     * Resolve one document payload.
     * @param {object} descriptor The source descriptor.
     * @returns {Uint8Array} The payload bytes.
     */
    resolvePayloadBytes(descriptor) {

        var payload = this.toUint8Array(
            descriptor?.bytes
            ?? descriptor?.payload
            ?? descriptor?.document
            ?? null
        );
        if (payload != null)
            return payload;

        if (typeof descriptor?.base64 == "string")
            return this.decodeBase64(descriptor.base64);

        if (typeof descriptor?.text == "string")
            return (new TextEncoder()).encode(descriptor.text);

        throw new Exception(
            "Invalid wrapped document descriptor. Provide bytes, payload, document, base64, or text.",
            GeneralErrorCodes.InvalidParameter
        );

    }

    /**
     * Resolve one transfer syntax from descriptor/options.
     * @param {object} descriptor The source descriptor.
     * @param {object | null} options Wrapper options.
     * @returns {TransferSyntax} The resolved transfer syntax.
     */
    resolveTransferSyntax(descriptor, options = null) {

        var transferSyntaxUid = this.toScalarString(
            descriptor?.transferSyntaxUid
            ?? descriptor?.transferSyntaxUID
            ?? options?.transferSyntaxUid
            ?? options?.transferSyntaxUID
            ?? null
        );

        if (transferSyntaxUid == null)
            return TransferSyntax.ExplicitVRLittleEndian;

        return TransferSyntax.find(transferSyntaxUid) ?? TransferSyntax.ExplicitVRLittleEndian;

    }

    /**
     * Resolve one descriptor array from arbitrary JSON root payload.
     * @param {*} input The source JSON root payload.
     * @returns {Array<object>} The normalized descriptor list.
     */
    resolveDescriptors(input) {

        if (Array.isArray(input) == true)
            return input;

        if ((input != null) && (typeof input == "object") && (Array.isArray(input.documents) == true))
            return input.documents;

        if ((input != null) && (typeof input == "object"))
            return [input];

        throw new Exception(
            "Invalid wrapped document source. Expected a descriptor object, documents array, or array of descriptors.",
            GeneralErrorCodes.InvalidParameter
        );

    }

    /**
     * Create one attribute with a value override.
     * @param {Tag} tag The DICOM tag.
     * @param {*} value The source value.
     * @param {TransferSyntax} transferSyntax The active transfer syntax.
     * @returns {Attribute} The attribute.
     */
    createAttribute(tag, value, transferSyntax) {

        var attribute = new Attribute(tag, 0, new Uint8Array(0), transferSyntax);
        attribute.value = value;
        return attribute;

    }

    /**
     * Create one meta-set attribute with explicit-little-endian transfer syntax.
     * @param {Tag} tag The DICOM tag.
     * @param {*} value The source value.
     * @returns {Attribute} The attribute.
     */
    createMetaAttribute(tag, value) {
        return this.createAttribute(tag, value, TransferSyntax.ExplicitVRLittleEndian);
    }

    /**
     * Create one data-set attribute with the selected transfer syntax.
     * @param {Tag} tag The DICOM tag.
     * @param {*} value The source value.
     * @param {TransferSyntax} transferSyntax The transfer syntax.
     * @returns {Attribute} The attribute.
     */
    createDataAttribute(tag, value, transferSyntax) {
        return this.createAttribute(tag, value, transferSyntax);
    }

    /**
     * Compute File Meta Information Group Length for the supplied meta attributes.
     * @param {Array<Attribute>} attributes Meta attributes excluding group-length.
     * @returns {number} The computed group-length value.
     */
    computeMetaGroupLength(attributes) {

        var writer = new DicomDataWriterHandler({ collectOutput: false });
        var total = 0;

        for (var i = 0; i < attributes.length; i++) {

            var attribute = attributes[i];
            var valueBytes = writer.resolveAttributeValueBytes(attribute);
            var header = writer.serializeHeader(
                attribute.tag,
                writer.resolveValueRepresentation(attribute),
                valueBytes.length,
                TransferSyntax.ExplicitVRLittleEndian
            );

            total += (header.length + valueBytes.length);

        }

        return total;

    }

    /**
     * Build one DICOM instance for one encapsulated document descriptor.
     * @param {object} descriptor The document descriptor.
     * @param {number} index The descriptor index.
     * @param {object | null} options Wrapper options.
     * @returns {Instance} The wrapped DICOM instance.
     */
    wrapDescriptor(descriptor, index = 0, options = null) {

        if ((descriptor == null) || (typeof descriptor != "object")) {
            throw new Exception(
                "Invalid wrapped document descriptor at index " + String(index) + ".",
                GeneralErrorCodes.InvalidParameter
            );
        }

        if (options == null)
            options = {};

        var payloadBytes = this.resolvePayloadBytes(descriptor);
        var mimeType = this.resolveMimeType(descriptor);
        var sopClassUid = this.resolveSopClassUid(descriptor, mimeType);
        var transferSyntax = this.resolveTransferSyntax(descriptor, options);
        var modality = this.resolveModality(descriptor, sopClassUid);

        var sopInstanceUid = this.toScalarString(descriptor?.sopInstanceUid ?? descriptor?.sopInstanceUID ?? null) ?? Utilities.newUID();
        var studyInstanceUid = this.toScalarString(descriptor?.studyInstanceUid ?? descriptor?.studyInstanceUID ?? null) ?? Utilities.newUID();
        var seriesInstanceUid = this.toScalarString(descriptor?.seriesInstanceUid ?? descriptor?.seriesInstanceUID ?? null) ?? Utilities.newUID();

        var now = new Date();

        var title = this.toScalarString(
            descriptor?.title
            ?? descriptor?.documentTitle
            ?? descriptor?.fileName
            ?? null
        );

        var implementationClassUid = this.toScalarString(
            descriptor?.implementationClassUid
            ?? descriptor?.implementationClassUID
            ?? options?.implementationClassUid
            ?? options?.implementationClassUID
            ?? DocumentWrapper.DefaultImplementationClassUID
        );

        var implementationVersionName = this.toScalarString(
            descriptor?.implementationVersionName
            ?? options?.implementationVersionName
            ?? DocumentWrapper.DefaultImplementationVersionName
        );

        var sourceApplicationEntityTitle = this.toScalarString(
            descriptor?.sourceApplicationEntityTitle
            ?? options?.sourceApplicationEntityTitle
            ?? DocumentWrapper.DefaultSourceApplicationEntityTitle
        );

        var instance = new Instance();
        instance.preamble = new Preamble(new Uint8Array(Constants.PreambleLength));
        instance.prefix = new Prefix((new TextEncoder()).encode(Constants.PrefixValue));

        var metaAttributes = [
            this.createMetaAttribute(Tag.FileMetaInformationVersion, new Uint8Array([0, 1])),
            this.createMetaAttribute(Tag.MediaStorageSOPClassUID, sopClassUid),
            this.createMetaAttribute(Tag.MediaStorageSOPInstanceUID, sopInstanceUid),
            this.createMetaAttribute(Tag.TransferSyntaxUID, transferSyntax.ID),
            this.createMetaAttribute(Tag.ImplementationClassUID, implementationClassUid),
            this.createMetaAttribute(Tag.ImplementationVersionName, implementationVersionName),
            this.createMetaAttribute(Tag.SourceApplicationEntityTitle, sourceApplicationEntityTitle)
        ];

        var metaSet = new MetaSet();
        metaSet.add(this.createMetaAttribute(
            Tag.FileMetaInformationGroupLength,
            this.computeMetaGroupLength(metaAttributes)
        ));
        metaSet.addAll(metaAttributes);
        metaSet.isComplete = true;
        instance.metaSet = metaSet;

        var dataSet = new DataSet();
        dataSet.add(this.createDataAttribute(Tag.SOPClassUID, sopClassUid, transferSyntax));
        dataSet.add(this.createDataAttribute(Tag.SOPInstanceUID, sopInstanceUid, transferSyntax));
        dataSet.add(this.createDataAttribute(Tag.Modality, modality, transferSyntax));
        dataSet.add(this.createDataAttribute(Tag.StudyInstanceUID, studyInstanceUid, transferSyntax));
        dataSet.add(this.createDataAttribute(Tag.SeriesInstanceUID, seriesInstanceUid, transferSyntax));
        dataSet.add(this.createDataAttribute(Tag.SeriesNumber, Number(descriptor?.seriesNumber ?? 1), transferSyntax));
        dataSet.add(this.createDataAttribute(Tag.InstanceNumber, Number(descriptor?.instanceNumber ?? (index + 1)), transferSyntax));
        dataSet.add(this.createDataAttribute(Tag.ContentDate, new Date(now), transferSyntax));
        dataSet.add(this.createDataAttribute(Tag.ContentTime, new Date(now), transferSyntax));
        dataSet.add(this.createDataAttribute(Tag.MIMETypeOfEncapsulatedDocument, mimeType, transferSyntax));
        if (title != null) {
            dataSet.add(this.createDataAttribute(Tag.DocumentTitle, title, transferSyntax));
        }
        dataSet.add(this.createDataAttribute(Tag.EncapsulatedDocumentLength, payloadBytes.length, transferSyntax));
        dataSet.add(this.createDataAttribute(Tag.EncapsulatedDocument, payloadBytes, transferSyntax));
        dataSet.isComplete = true;
        instance.dataSet = dataSet;

        return instance;

    }

    /**
     * Wrap one descriptor payload (object/array/documents list) to DICOM instance(s).
     * @param {*} input The source descriptor payload.
     * @param {object | null} options Wrapper options.
     * @returns {Instance | Array<Instance>} The wrapped instance(s).
     */
    wrap(input, options = null) {

        var descriptors = this.resolveDescriptors(input);
        var instances = [];

        for (var i = 0; i < descriptors.length; i++) {
            instances.push(this.wrapDescriptor(descriptors[i], i, options));
        }

        return (instances.length == 1) ? instances[0] : instances;

    }

    constructor() {
    }

}

DocumentWrapper.MimeTypeToSopClassUid = {
    "application/pdf": SOPClass.EncapsulatedPDFStorage.ID,
    "application/xml": SOPClass.EncapsulatedCDAStorage.ID,
    "text/xml": SOPClass.EncapsulatedCDAStorage.ID,
    "model/stl": SOPClass.EncapsulatedSTLStorage.ID,
    "model/obj": SOPClass.EncapsulatedOBJStorage.ID,
    "model/mtl": SOPClass.EncapsulatedMTLStorage.ID
};

DocumentWrapper.M3dSopClassUids = new Set([
    SOPClass.EncapsulatedSTLStorage.ID,
    SOPClass.EncapsulatedOBJStorage.ID,
    SOPClass.EncapsulatedMTLStorage.ID
]);

DocumentWrapper.DefaultImplementationClassUID = "1.2.826.0.1.3680043.10.5432.1";
DocumentWrapper.DefaultImplementationVersionName = "EASIJS_1_0";
DocumentWrapper.DefaultSourceApplicationEntityTitle = "EASIJS";
