//
// DicomDeIdentificationMaskBuilder.js
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

import Tag from "../dicom/Tag.js";

export default class DicomDeIdentificationMaskBuilder {

    /**
     * Create a new de-identification mask builder.
     * @returns {DicomDeIdentificationMaskBuilder} A new de-identification mask builder.
     */
    static builder() {
        return new DicomDeIdentificationMaskBuilder();
    }

    /**
     * Normalize one tag reference to a DICOM tag identifier.
     * @param {Tag | string | object} tagOrIdentifier The tag reference to normalize.
     * @returns {string | null} The normalized DICOM tag identifier.
     */
    normalizeTagIdentifier(tagOrIdentifier) {

        if (tagOrIdentifier == null)
            return null;

        if (typeof tagOrIdentifier === "string") {

            var normalizedInput = String(tagOrIdentifier).trim();
            if (normalizedInput.length == 0)
                return null;

            var staticTag = Tag[normalizedInput];
            if ((staticTag != null) && (typeof staticTag.ID === "string")) {
                return staticTag.ID.toUpperCase();
            }

            var normalized = normalizedInput.replace(/[^0-9a-fA-FxX]/g, "").toUpperCase();
            if (normalized.length != 8)
                return null;

            if (/^[0-9A-FX]{8}$/.test(normalized) == false)
                return null;

            return normalized;

        }

        if ((tagOrIdentifier.ID != null) && (typeof tagOrIdentifier.ID === "string")) {
            return tagOrIdentifier.ID.toUpperCase();
        }

        if ((tagOrIdentifier.Group != null) && (tagOrIdentifier.Element != null)) {
            return Tag.identifier(tagOrIdentifier.Group, tagOrIdentifier.Element);
        }

        return null;

    }

    /**
     * Resolve one tag reference to a DICOM tag identifier.
     * @param {Tag | string | object} tagOrIdentifier The tag reference to resolve.
     * @returns {string} The normalized DICOM tag identifier.
     */
    resolveTagIdentifier(tagOrIdentifier) {

        var id = this.normalizeTagIdentifier(tagOrIdentifier);
        if (id == null) {
            throw new Error(`Unable to resolve DICOM tag '${tagOrIdentifier}'.`);
        }

        return id;

    }

    /**
     * Normalize one mask item to `{ ID, Action }`.
     * @param {string} id The DICOM tag identifier.
     * @param {unknown} actionOrItem The action or item.
     * @returns {{ ID: string, Action: unknown }} The normalized item.
     */
    normalizeMaskItem(id, actionOrItem) {

        var action = actionOrItem;
        if (
            (actionOrItem != null)
            &&
            (typeof actionOrItem === "object")
            &&
            (Array.isArray(actionOrItem) == false)
            &&
            (actionOrItem.Action !== undefined)
        ) {
            action = actionOrItem.Action;
        }

        return {
            ID: id,
            Action: action
        };

    }

    /**
     * Normalize a caller-provided mask to a map.
     * @param {Map<Tag | string, unknown> | Array<Tag | string | object> | object | null} mask
     * The mask to normalize.
     * @returns {Map<string, { ID: string, Action: unknown }>} The normalized map.
     */
    normalizeMask(mask) {

        var normalizedMask = new Map();

        if (mask == null)
            return normalizedMask;

        if (mask instanceof Map) {

            for (var entry of mask.entries()) {
                var id = this.resolveTagIdentifier(entry[0]);
                normalizedMask.set(id, this.normalizeMaskItem(id, entry[1]));
            }

            return normalizedMask;

        }

        if (Array.isArray(mask)) {

            for (var i = 0; i < mask.length; i++) {

                var item = mask[i];
                var id = this.resolveTagIdentifier(item);
                var action = (
                    (item != null)
                    &&
                    (typeof item === "object")
                    &&
                    (item.Action !== undefined)
                ) ? item.Action : "[MASKED]";

                normalizedMask.set(id, this.normalizeMaskItem(id, action));

            }

            return normalizedMask;

        }

        if (typeof mask === "object") {

            var keys = Object.keys(mask);
            for (var i = 0; i < keys.length; i++) {
                var key = keys[i];
                var id = this.resolveTagIdentifier(key);
                normalizedMask.set(id, this.normalizeMaskItem(id, mask[key]));
            }

        }

        return normalizedMask;

    }

    /**
     * Clone one mask map into a detached map.
     * @param {Map<string, { ID: string, Action: unknown }>} mask The mask to clone.
     * @returns {Map<string, { ID: string, Action: unknown }>} The cloned map.
     */
    cloneMask(mask) {

        var clone = new Map();
        for (var entry of mask.entries()) {
            var id = entry[0];
            var item = entry[1];
            clone.set(id, this.normalizeMaskItem(id, item));
        }

        return clone;

    }

    /**
     * Replace the builder de-identification mask.
     * @param {Map<Tag | string, unknown> | Array<Tag | string | object> | object | null} deIdentificationMask
     * The de-identification mask.
     * @returns {DicomDeIdentificationMaskBuilder} Current builder instance.
     */
    withDeIdentificationMask(deIdentificationMask) {
        this._mask = this.normalizeMask(deIdentificationMask);
        return this;
    }

    /**
     * Merge additional entries into the current de-identification mask.
     * @param {Map<Tag | string, unknown> | Array<Tag | string | object> | object | null} deIdentificationMask
     * The additional de-identification mask.
     * @returns {DicomDeIdentificationMaskBuilder} Current builder instance.
     */
    mergeDeIdentificationMask(deIdentificationMask) {

        var normalizedMask = this.normalizeMask(deIdentificationMask);
        for (var entry of normalizedMask.entries()) {
            this._mask.set(entry[0], entry[1]);
        }

        return this;

    }

    /**
     * Replace the builder mask with the default de-identification profile.
     * @returns {DicomDeIdentificationMaskBuilder} Current builder instance.
     */
    withDefaultProfile() {
        return this.withDeIdentificationMask(Tag.DefaultDeIdentificationMask);
    }

    /**
     * Merge the default de-identification profile into the current mask.
     * @returns {DicomDeIdentificationMaskBuilder} Current builder instance.
     */
    mergeDefaultProfile() {
        return this.mergeDeIdentificationMask(Tag.DefaultDeIdentificationMask);
    }

    /**
     * Set or replace one mask action.
     * @param {Tag | string | object} tagOrIdentifier The DICOM tag reference.
     * @param {unknown} action The action or replacement value.
     * @returns {DicomDeIdentificationMaskBuilder} Current builder instance.
     */
    set(tagOrIdentifier, action = "[MASKED]") {

        var id = this.resolveTagIdentifier(tagOrIdentifier);
        this._mask.set(id, this.normalizeMaskItem(id, action));
        return this;

    }

    /**
     * Remove one tag from the mask.
     * @param {Tag | string | object} tagOrIdentifier The DICOM tag reference.
     * @returns {DicomDeIdentificationMaskBuilder} Current builder instance.
     */
    remove(tagOrIdentifier) {

        var id = this.resolveTagIdentifier(tagOrIdentifier);
        this._mask.delete(id);
        return this;

    }

    /**
     * Clear the current mask.
     * @returns {DicomDeIdentificationMaskBuilder} Current builder instance.
     */
    clear() {
        this._mask = new Map();
        return this;
    }

    /**
     * Determine whether one tag has a configured mask.
     * @param {Tag | string | object} tagOrIdentifier The DICOM tag reference.
     * @returns {boolean} TRUE if the mask exists.
     */
    has(tagOrIdentifier) {

        var id = this.resolveTagIdentifier(tagOrIdentifier);
        return this._mask.has(id);

    }

    /**
     * Get one configured mask item.
     * @param {Tag | string | object} tagOrIdentifier The DICOM tag reference.
     * @returns {{ ID: string, Action: unknown } | null} The mask item.
     */
    get(tagOrIdentifier) {

        var id = this.resolveTagIdentifier(tagOrIdentifier);
        return this._mask.get(id) || null;

    }

    /**
     * Build one de-identification mask map.
     * @returns {Map<string, { ID: string, Action: unknown }>} The mask map.
     */
    build() {
        return this.cloneMask(this._mask);
    }

    /**
     * Construct one mask builder.
     * @param {Map<Tag | string, unknown> | Array<Tag | string | object> | object | null}
     * deIdentificationMask Optional initial de-identification mask.
     */
    constructor(deIdentificationMask = null) {

        this._mask = new Map();
        if (deIdentificationMask != null) {
            this.withDeIdentificationMask(deIdentificationMask);
        }

    }

}
