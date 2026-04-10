//
// EncapsulatedDocument.js
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

import Entity from './Entity.js';
import EncapsulatedDocumentModule from '../modules/EncapsulatedDocumentModule.js';
import DocumentWrapper from '../utilities/DocumentWrapper.js';
import DocumentUnwrapper from '../utilities/DocumentUnwrapper.js';

export default class EncapsulatedDocument extends Entity {

    /**
     * Resolve one effective document wrapper implementation.
     * @param {object | null} options The wrap options.
     * @returns {DocumentWrapper | object} The resolved wrapper.
     */
    static resolveWrapper(options = null) {

        var wrapper = options?.wrapper ?? null;
        if ((wrapper != null) && (typeof wrapper.wrap == 'function')) {
            return wrapper;
        }

        if (EncapsulatedDocument.DefaultWrapper == null) {
            EncapsulatedDocument.DefaultWrapper = new DocumentWrapper();
        }

        return EncapsulatedDocument.DefaultWrapper;

    }

    /**
     * Resolve one effective document unwrapper implementation.
     * @param {object | null} options The unwrap options.
     * @returns {DocumentUnwrapper | object} The resolved unwrapper.
     */
    static resolveUnwrapper(options = null) {

        var unwrapper = options?.unwrapper ?? null;
        if ((unwrapper != null) && (typeof unwrapper.unwrap == 'function')) {
            return unwrapper;
        }

        if (EncapsulatedDocument.DefaultUnwrapper == null) {
            EncapsulatedDocument.DefaultUnwrapper = new DocumentUnwrapper();
        }

        return EncapsulatedDocument.DefaultUnwrapper;

    }

    /**
     * Normalize one source value to EncapsulatedDocument.
     * @param {*} value The source entity/instance/attribute set.
     * @returns {EncapsulatedDocument | null} The normalized entity.
     */
    static toEntity(value) {

        if (value == null) {
            return null;
        }

        if (value instanceof EncapsulatedDocument) {
            return value;
        }

        return new EncapsulatedDocument(value);

    }

    /**
     * Wrap descriptor payload(s) to EncapsulatedDocument entity output.
     * @param {*} input The wrapped-document descriptor payload.
     * @param {object | null} options The wrapper options.
     * @returns {EncapsulatedDocument | Array<EncapsulatedDocument> | null} Wrapped entity output.
     */
    static wrap(input, options = null) {

        var wrapper = EncapsulatedDocument.resolveWrapper(options);
        var output = wrapper.wrap(input, options);

        if (output == null) {
            return null;
        }

        if (Array.isArray(output) == true) {
            return output.map((instance) => EncapsulatedDocument.toEntity(instance));
        }

        return EncapsulatedDocument.toEntity(output);

    }

    /**
     * Unwrap one encapsulated document entity/instance to document payload.
     * @param {*} entity The source entity/instance/attribute set.
     * @param {object | null} options The unwrap options.
     * @returns {import("../utilities/UnwrappedDocument.js").default | null} The unwrapped output payload.
     */
    static unwrap(entity, options = null) {

        var normalized = EncapsulatedDocument.toEntity(entity);
        if (normalized == null) {
            return null;
        }

        var unwrapper = EncapsulatedDocument.resolveUnwrapper(options);
        return unwrapper.unwrap(normalized, options);

    }

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
     * Unwrap this encapsulated document entity to one normalized payload.
     * @param {object | null} options The unwrap options.
     * @returns {import("../utilities/UnwrappedDocument.js").default | null} The unwrapped payload.
     */
    unwrap(options = null) {
        return EncapsulatedDocument.unwrap(this, options);
    }

    /**
     * Construct a DICOM Encapsulated Document entity.
     * @param {Instance | AttributeSet} instance The source instance or attribute set.
     */
    constructor(instance) {
        super(instance);
    }

};

EncapsulatedDocument.DefaultWrapper = null;
EncapsulatedDocument.DefaultUnwrapper = null;
