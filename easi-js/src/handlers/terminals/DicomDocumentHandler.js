//
// DicomDocumentHandler.js - 1.0.0
//
// Stream DICOM Encapsulated Document Handler Class
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
