//
// DocumentUnwrapper.js
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

import EncapsulatedDocument from "../entities/EncapsulatedDocument.js";
import SOPClass from "../SOPClass.js";

export default class DocumentUnwrapper {

    /**
     * Convert a scalar value to normalized string text.
     * @param {*} value The source value.
     * @returns {string | null} The normalized string.
     */
    toScalarString(value) {

        if (value == null) {
            return null;
        }

        if (typeof value == 'string') {
            return value.replace(/\0/g, '').trim();
        }

        if (value instanceof Uint8Array) {
            return (new TextDecoder()).decode(value).replace(/\0/g, '').trim();
        }

        if (ArrayBuffer.isView(value) == true) {
            return (new TextDecoder()).decode(new Uint8Array(value.buffer, value.byteOffset, value.byteLength)).replace(/\0/g, '').trim();
        }

        if (value instanceof ArrayBuffer) {
            return (new TextDecoder()).decode(new Uint8Array(value)).replace(/\0/g, '').trim();
        }

        return String(value).trim();

    }

    /**
     * Normalize a MIME type value.
     * @param {string | null} mimeType The source MIME type.
     * @returns {string} The normalized MIME type.
     */
    normalizeMimeType(mimeType) {

        mimeType = this.toScalarString(mimeType);

        if (mimeType == null) {
            return 'application/octet-stream';
        }

        var value = String(mimeType).trim().toLowerCase();
        if (value == '') {
            return 'application/octet-stream';
        }

        var parameterIndex = value.indexOf(';');
        if (parameterIndex >= 0) {
            value = value.substring(0, parameterIndex).trim();
        }

        if (value == '') {
            return 'application/octet-stream';
        }

        return value;

    }

    /**
     * Determine whether a MIME type should also expose decoded text content.
     * @param {string} mimeType The normalized MIME type.
     * @returns {boolean} TRUE when payload should be decoded as text.
     */
    isTextMimeType(mimeType) {

        if (mimeType.startsWith('text/')) {
            return true;
        }

        return DocumentUnwrapper.TextMimeTypes.has(mimeType);

    }

    /**
     * Resolve a file extension for MIME type/SOP class.
     * @param {string} mimeType The normalized MIME type.
     * @param {string | null} sopClassUid The SOP Class UID.
     * @returns {string} The resolved extension without dot.
     */
    resolveExtension(mimeType, sopClassUid) {

        if ((mimeType != 'application/octet-stream')
            && (DocumentUnwrapper.MimeTypeToExtension[mimeType] != null)) {
            return DocumentUnwrapper.MimeTypeToExtension[mimeType];
        }

        if ((sopClassUid != null) && (DocumentUnwrapper.SopClassToExtension[sopClassUid] != null)) {
            return DocumentUnwrapper.SopClassToExtension[sopClassUid];
        }

        if (DocumentUnwrapper.MimeTypeToExtension[mimeType] != null) {
            return DocumentUnwrapper.MimeTypeToExtension[mimeType];
        }

        if (mimeType.startsWith('text/')) {
            return 'txt';
        }

        return 'bin';

    }

    /**
     * Convert a payload value to Uint8Array.
     * @param {*} payload The payload value.
     * @returns {Uint8Array} Payload bytes.
     */
    toUint8Array(payload) {

        if (payload == null) {
            return new Uint8Array(0);
        }

        if (payload instanceof Uint8Array) {
            return payload;
        }

        if (ArrayBuffer.isView(payload) == true) {
            return new Uint8Array(payload.buffer, payload.byteOffset, payload.byteLength);
        }

        if (payload instanceof ArrayBuffer) {
            return new Uint8Array(payload);
        }

        if (Array.isArray(payload) == true) {
            return Uint8Array.from(payload);
        }

        return new Uint8Array(0);

    }

    /**
     * Resolve a declared payload length.
     * @param {number | string | null} declaredLength The declared length value.
     * @returns {number | null} The validated declared length.
     */
    resolveDeclaredLength(declaredLength) {

        if (declaredLength instanceof Uint8Array) {
            if (declaredLength.length >= 4) {
                declaredLength = (new DataView(
                    declaredLength.buffer,
                    declaredLength.byteOffset,
                    declaredLength.byteLength
                )).getUint32(0, true);
            }
            else if (declaredLength.length >= 2) {
                declaredLength = (new DataView(
                    declaredLength.buffer,
                    declaredLength.byteOffset,
                    declaredLength.byteLength
                )).getUint16(0, true);
            }
            else {
                declaredLength = null;
            }
        }

        if (declaredLength == null) {
            return null;
        }

        var numeric = Number(declaredLength);
        if (Number.isFinite(numeric) == false) {
            return null;
        }

        numeric = Math.floor(numeric);
        if (numeric < 0) {
            return null;
        }

        return numeric;

    }

    /**
     * Truncate payload bytes to the declared document length when needed.
     * @param {Uint8Array} payload The source payload bytes.
     * @param {number | null} declaredLength The declared payload length.
     * @returns {Uint8Array} The effective payload bytes.
     */
    truncateToDeclaredLength(payload, declaredLength) {

        if ((declaredLength == null) || (declaredLength >= payload.length)) {
            return payload;
        }

        return payload.subarray(0, declaredLength);

    }

    /**
     * Sanitize file-name text.
     * @param {string | null} value The source value.
     * @returns {string} Sanitized file-name text.
     */
    sanitizeFileName(value) {

        if (value == null) {
            return '';
        }

        return String(value)
            .replace(/[<>:"/\\|?*\u0000-\u001F]/g, '_')
            .trim();

    }

    /**
     * Ensure file name ends with the resolved extension.
     * @param {string} fileName The base file name.
     * @param {string} extension The extension without dot.
     * @returns {string} The file name with extension.
     */
    ensureFileNameExtension(fileName, extension) {

        if ((extension == null) || (extension == '')) {
            return fileName;
        }

        var suffix = ('.' + extension).toLowerCase();
        if (fileName.toLowerCase().endsWith(suffix)) {
            return fileName;
        }

        return (fileName + '.' + extension);

    }

    /**
     * Build the output file name.
     * @param {object} output The current output payload.
     * @param {object} options Unwrapper options.
     * @returns {string} The output file name.
     */
    buildFileName(output, options) {

        if (typeof options.fileNameFactory == 'function') {
            var fileName = options.fileNameFactory(output);
            if ((fileName != null) && (String(fileName).trim() != '')) {
                return this.ensureFileNameExtension(
                    this.sanitizeFileName(String(fileName)),
                    output.extension
                );
            }
        }

        var base = options.fileName
            ?? output.title
            ?? output.sopInstanceUid
            ?? 'document';
        base = this.sanitizeFileName(base);

        if (base == '') {
            base = 'document';
        }

        return this.ensureFileNameExtension(base, output.extension);

    }

    /**
     * Decode text payload when MIME type indicates text content.
     * @param {Uint8Array} bytes The payload bytes.
     * @param {string} mimeType The normalized MIME type.
     * @param {object} options Unwrapper options.
     * @returns {string | null} The decoded text when available.
     */
    decodeText(bytes, mimeType, options) {

        if (this.isTextMimeType(mimeType) == false) {
            return null;
        }

        var decoder = options.textDecoder;
        if ((decoder == null) || (typeof decoder.decode != 'function')) {
            decoder = new TextDecoder(options.textEncoding ?? 'utf-8');
        }

        return decoder.decode(bytes);

    }

    /**
     * Unwrap one encapsulated document entity.
     * @param {EncapsulatedDocument} entity The source encapsulated document entity.
     * @param {object | null} options Unwrapper options.
     * @returns {object | null} The unwrapped document payload.
     */
    unwrap(entity, options = null) {

        if ((entity instanceof EncapsulatedDocument) == false) {
            return null;
        }

        options = ((options != null) && (typeof options == 'object')) ? options : {};

        var module = entity.documentModule;

        var mimeType = this.normalizeMimeType(module?.mimeType);
        var declaredByteLength = this.resolveDeclaredLength(module?.declaredDocumentLength);
        var bytes = this.toUint8Array(module?.document);
        bytes = this.truncateToDeclaredLength(bytes, declaredByteLength);
        var sopClassUid = this.toScalarString(entity.sopClassUid);
        var sopInstanceUid = this.toScalarString(entity.sopInstanceUid);
        var title = this.toScalarString(module?.documentTitle);

        var output = {
            sopClassUid: sopClassUid,
            sopInstanceUid: sopInstanceUid,
            title: title,
            mimeType: mimeType,
            extension: this.resolveExtension(mimeType, sopClassUid),
            fileName: null,
            bytes: bytes,
            byteLength: bytes.length,
            declaredByteLength: declaredByteLength,
            text: null,
            entity: entity
        };

        output.fileName = this.buildFileName(output, options);
        output.text = this.decodeText(bytes, mimeType, options);

        return output;

    }

    constructor() {
    }

}

DocumentUnwrapper.MimeTypeToExtension = {
    'application/pdf': 'pdf',
    'application/xml': 'xml',
    'application/xhtml+xml': 'xhtml',
    'application/json': 'json',
    'application/rtf': 'rtf',
    'application/msword': 'doc',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
    'application/vnd.ms-excel': 'xls',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'xlsx',
    'application/vnd.ms-powerpoint': 'ppt',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation': 'pptx',
    'text/plain': 'txt',
    'text/html': 'html',
    'text/xml': 'xml',
    'model/stl': 'stl',
    'model/obj': 'obj',
    'model/mtl': 'mtl',
    'application/octet-stream': 'bin'
};

DocumentUnwrapper.SopClassToExtension = {
    [SOPClass.EncapsulatedPDFStorage.ID]: 'pdf',
    [SOPClass.EncapsulatedCDAStorage.ID]: 'xml',
    [SOPClass.EncapsulatedSTLStorage.ID]: 'stl',
    [SOPClass.EncapsulatedOBJStorage.ID]: 'obj',
    [SOPClass.EncapsulatedMTLStorage.ID]: 'mtl'
};

DocumentUnwrapper.TextMimeTypes = new Set([
    'application/xml',
    'application/xhtml+xml',
    'application/json',
    'application/rtf'
]);
