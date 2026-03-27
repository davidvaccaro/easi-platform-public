//
// EncapsulatedDocument.js - 1.0.0
//
// DICOM Encapsulated Document Entity Class
//

import Entity from './Entity.js';
import EncapsulatedDocumentModule from '../modules/EncapsulatedDocumentModule.js';

export default class EncapsulatedDocument extends Entity {

    /**
     * Get the Encapsulated Document Module.
     * @returns {EncapsulatedDocumentModule} The encapsulated document module accessor.
     */
    get encapsulatedDocumentModule() {
        return new EncapsulatedDocumentModule(this.attributeSet);
    }

    /**
     * Get the Encapsulated Document accessor.
     * @returns {EncapsulatedDocumentModule} The encapsulated document module accessor.
     */
    get documentModule() {
        return this.encapsulatedDocumentModule;
    }

    /**
     * Construct a DICOM Encapsulated Document entity.
     * @param {Instance | AttributeSet} instance The source instance or attribute set.
     */
    constructor(instance) {
        super(instance);
    }

};
