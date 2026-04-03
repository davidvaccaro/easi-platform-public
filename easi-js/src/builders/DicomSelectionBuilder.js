//
// DicomSelectionBuilder.js
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

import DicomSelection from "../handlers/selections/DicomSelection.js";
import Tag from "../dicom/Tag.js";

export default class DicomSelectionBuilder {

    /**
     * Create a new DICOM selection builder.
     * @returns {DicomSelectionBuilder} A new DICOM selection builder.
     */
    static builder() {
        return new DicomSelectionBuilder();
    }

    /**
     * Resolve one DICOM tag reference.
     * @param {import("../dicom/Tag.js").default | string} tag The DICOM tag object or identifier.
     * @returns {import("../dicom/Tag.js").default} Resolved DICOM tag.
     */
    resolveTag(tag) {

        if ((tag != null) && (typeof tag === "object") && (tag.ID != null)) {
            return tag;
        }

        if (typeof tag !== "string") {
            throw new Error("Selection tag must be a Tag instance or DICOM tag string.");
        }

        var normalized = String(tag).trim();
        if (normalized.length == 0) {
            throw new Error("Selection tag must be a non-empty Tag instance or DICOM tag string.");
        }

        var staticTag = Tag[normalized];
        if ((staticTag != null) && (staticTag.ID != null)) {
            return staticTag;
        }

        var normalizedId = normalized.toUpperCase().replace(/[^0-9A-F]/g, "");
        if (normalizedId.length == 8) {
            return Tag.find(normalizedId);
        }

        throw new Error(`Unable to resolve DICOM tag '${tag}'.`);

    }

    /**
     * Set one base selection instance.
     * @param {DicomSelection} selection Base selection instance.
     * @returns {DicomSelectionBuilder} Current builder instance.
     */
    withSelection(selection) {

        if ((selection instanceof DicomSelection) == false) {
            throw new Error("withSelection(...) requires DicomSelection instance.");
        }

        this.selection = selection;
        return this;

    }

    /**
     * Include one DICOM tag in the selection.
     * @param {import("../dicom/Tag.js").default | string} tag The DICOM tag object or identifier.
     * @returns {DicomSelectionBuilder} Current builder instance.
     */
    includeTag(tag) {

        var resolvedTag = this.resolveTag(tag);
        if (this.selection.hasTag(resolvedTag) == false) {
            this.selection.addTag(resolvedTag);
        }

        return this;

    }

    /**
     * Include one or more tags in the selection.
     * @param {import("../dicom/Tag.js").default | string | Array<import("../dicom/Tag.js").default | string>} tags
     * The DICOM tag object(s) or identifier string(s).
     * @returns {DicomSelectionBuilder} Current builder instance.
     */
    include(tags) {

        if (Array.isArray(tags)) {
            for (var i = 0; i < tags.length; i++) {
                this.includeTag(tags[i]);
            }

            return this;
        }

        return this.includeTag(tags);

    }

    /**
     * Include one or more tags in the selection.
     * @param {Array<import("../dicom/Tag.js").default | string>} tags
     * The DICOM tag object list or identifier string list.
     * @returns {DicomSelectionBuilder} Current builder instance.
     */
    includeTags(tags) {
        return this.include(tags);
    }

    /**
     * Build one DICOM selection instance.
     * @returns {DicomSelection} The built selection.
     */
    build() {
        return this.selection;
    }

    /**
     * Construct one DICOM selection builder.
     * @param {DicomSelection | null} selection Optional base selection.
     */
    constructor(selection = null) {
        this.selection = (selection != null) ? selection : new DicomSelection();
    }

}
