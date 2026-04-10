//
// UnwrappedDocument.js
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

export default class UnwrappedDocument {

    /**
     * Normalize one byte-like input to Uint8Array.
     * @param {*} value The source value.
     * @returns {Uint8Array} The normalized bytes.
     */
    static toBytes(value) {

        if (value instanceof Uint8Array) {
            return value;
        }

        if (ArrayBuffer.isView(value) == true) {
            return new Uint8Array(value.buffer, value.byteOffset, value.byteLength);
        }

        if (value instanceof ArrayBuffer) {
            return new Uint8Array(value);
        }

        if (Array.isArray(value) == true) {
            return Uint8Array.from(value);
        }

        return new Uint8Array(0);

    }

    /**
     * Normalize a declared byte-length value.
     * @param {*} value The declared length candidate.
     * @returns {number | null} The normalized value.
     */
    static toDeclaredByteLength(value) {

        if (value == null) {
            return null;
        }

        var numeric = Number(value);
        if (Number.isFinite(numeric) == false) {
            return null;
        }

        numeric = Math.floor(numeric);
        return (numeric >= 0) ? numeric : null;

    }

    /**
     * Build a normalized unwrapped-document result.
     * @param {object | null} value The source value.
     */
    constructor(value = null) {

        value = ((value != null) && (typeof value == 'object')) ? value : {};

        this.sopClassUid = value.sopClassUid ?? null;
        this.sopInstanceUid = value.sopInstanceUid ?? null;
        this.title = value.title ?? null;
        this.mimeType = value.mimeType ?? 'application/octet-stream';
        this.extension = value.extension ?? 'bin';
        this.fileName = value.fileName ?? null;
        this.bytes = UnwrappedDocument.toBytes(value.bytes);
        this.byteLength = this.bytes.length;
        this.declaredByteLength = UnwrappedDocument.toDeclaredByteLength(value.declaredByteLength);
        this.text = (typeof value.text == 'string') ? value.text : null;
        this.entity = value.entity ?? null;

    }

}
