//
// DicomDocumentHandler.js
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

import DicomInstanceHandler from "./DicomInstanceHandler.js";
import DicomEntityHandler from "./DicomEntityHandler.js";
import EncapsulatedDocument from "../../dicom/entities/EncapsulatedDocument.js";
import DocumentUnwrapper from "../../dicom/documents/DocumentUnwrapper.js";

export default class DicomDocumentHandler extends DicomEntityHandler {

    /**
     * Resolve the effective document unwrapper.
     * @param {object | null} options Handler options.
     * @returns {DocumentUnwrapper | object} The unwrapper.
     */
    resolveUnwrapper(options = null) {

        var unwrapper = options?.unwrapper ?? null;
        if ((unwrapper != null) && (typeof unwrapper.unwrap == 'function')) {
            return unwrapper;
        }

        return new DocumentUnwrapper();

    }

    /**
     * Convert one entity to one unwrapped document output.
     * @param {object | null} entity The source entity.
     * @returns {object | null} The unwrapped document payload.
     */
    unwrapEntity(entity) {

        if ((entity instanceof EncapsulatedDocument) == false) {
            return null;
        }

        return this.unwrapper.unwrap(entity, this.options);

    }

    onStartInstance(context) {

        context = super.onStartInstance(context);
        if (context.unwrappedDocuments == null) {
            context.unwrappedDocuments = [];
        }

        return context;

    }

    /**
     * Returns the current unwrapped document output for this parse session.
     * @returns {object | Array<object> | null} The unwrapped document payload.
     */
    onEndInstance(context) {

        // Keep the canonical instance accumulation side effects.
        DicomInstanceHandler.prototype.onEndInstance.call(this, context);

        var entity = this.toEntity(context.instance);
        var document = this.unwrapEntity(entity);
        if (document != null) {
            context.unwrappedDocuments.push(document);
        }

        if (context.unwrappedDocuments.length == 0) {
            return null;
        }

        return (context.unwrappedDocuments.length == 1)
            ? context.unwrappedDocuments[0]
            : context.unwrappedDocuments;

    }

    /**
     * Construct a new DICOM document handler.
     * @param {object | null} options Handler options.
     */
    constructor(options = null) {
        super();
        this.options = ((options != null) && (typeof options == 'object')) ? options : {};
        this.unwrapper = this.resolveUnwrapper(this.options);
    }

}
