//
// EncapsulatedDocumentModule.js - 1.0.0
//
// DICOM Encapsulated Document Module Class
//

import Module from './Module.js';
import Tag from '../Tag.js';

export default class EncapsulatedDocumentModule extends Module {

    /**
     * Get the Document Title.
     * @returns The Document Title value.
     */
    get documentTitle() {
        return this.attributeSet.value(Tag.DocumentTitle);
    }

    /**
     * Get the MIME Type Of Encapsulated Document.
     * @returns The MIME Type value.
     */
    get mimeType() {
        return this.attributeSet.value(Tag.MIMETypeOfEncapsulatedDocument);
    }

    /**
     * Get the Encapsulated Document value.
     * @returns {Uint8Array | null} The encapsulated payload bytes.
     */
    get document() {
        return this.attributeSet.value(Tag.EncapsulatedDocument);
    }

    /**
     * Get the Encapsulated Document Length value.
     * @returns {number | null} The declared document length.
     */
    get declaredDocumentLength() {
        return this.attributeSet.value(Tag.EncapsulatedDocumentLength);
    }

    /**
     * Get the Encapsulated Document payload length.
     * @returns {number} The payload length.
     */
    get documentLength() {
        var payload = this.document;
        if (payload == null)
            return 0;
        return payload.length ?? 0;
    }

    /**
     * Construct an Encapsulated Document Module accessor instance.
     * @param {AttributeSet} attributeSet The source attribute set.
     */
    constructor(attributeSet) {
        super(attributeSet);
    }

};
