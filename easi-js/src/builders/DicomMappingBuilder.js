//
// DicomMappingBuilder.js
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

import DicomMapping from "../handlers/mappings/DicomMapping.js";
import Tag from "../dicom/Tag.js";

export default class DicomMappingBuilder {

    /**
     * Create a new DICOM mapping builder.
     * @returns {DicomMappingBuilder} A new DICOM mapping builder.
     */
    static builder() {
        return new DicomMappingBuilder();
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
            throw new Error("Mapping tag must be a Tag instance or DICOM tag string.");
        }

        var normalized = String(tag).trim();
        if (normalized.length == 0) {
            throw new Error("Mapping tag must be a non-empty Tag instance or DICOM tag string.");
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
     * Set one base mapping instance.
     * @param {DicomMapping} mapping Base mapping instance.
     * @returns {DicomMappingBuilder} Current builder instance.
     */
    withMapping(mapping) {

        if ((mapping instanceof DicomMapping) == false) {
            throw new Error("withMapping(...) requires DicomMapping instance.");
        }

        this.mapping = mapping;
        return this;

    }

    /**
     * Set mapping template policy.
     * @param {'omit' | 'blank' | 'error'} policy The template policy.
     * @returns {DicomMappingBuilder} Current builder instance.
     */
    withTemplatePolicy(policy) {
        this.mapping.setTemplatePolicy(policy);
        return this;
    }

    /**
     * Set one scalar mapping property for template resolution.
     * @param {string} name Property name.
     * @param {string | number | boolean | bigint | Date | null} value Property value.
     * @returns {DicomMappingBuilder} Current builder instance.
     */
    withProperty(name, value) {
        this.mapping.setProperty(name, value);
        return this;
    }

    /**
     * Set multiple scalar mapping properties for template resolution.
     * @param {object} properties Property bag.
     * @returns {DicomMappingBuilder} Current builder instance.
     */
    withProperties(properties) {
        this.mapping.setProperties(properties);
        return this;
    }

    /**
     * Add one direct DICOM tag mapping rule.
     * @param {import("../dicom/Tag.js").default | string} tag DICOM tag object or identifier.
     * @param {string} property Destination property path.
     * @param {object | null} options Mapping options.
     * @returns {DicomMappingBuilder} Current builder instance.
     */
    mapTag(tag, property, options = null) {
        this.mapping.addTag(this.resolveTag(tag), property, options);
        return this;
    }

    /**
     * Add one direct DICOM tag mapping rule.
     * Overload 1: map(tag, property, options)
     * Overload 2: map(tag).to(property, options)
     *
     * @param {import("../dicom/Tag.js").default | string} tag DICOM tag object or identifier.
     * @param {string | undefined} property Destination property path.
     * @param {object | null} options Mapping options.
     * @returns {DicomMappingBuilder | { to: Function }} Builder or mapping entry stage.
     */
    map(tag, property = undefined, options = null) {

        if (property !== undefined) {
            return this.mapTag(tag, property, options);
        }

        var builder = this;
        return {
            to(destinationProperty, toOptions = null) {
                return builder.mapTag(tag, destinationProperty, toOptions);
            }
        };

    }

    /**
     * Add one computed mapping rule.
     * @param {string} property Destination property path.
     * @param {object | string | Function | null} options Computed mapping options.
     * @returns {DicomMappingBuilder} Current builder instance.
     */
    withComputed(property, options = null) {
        this.mapping.addComputed(property, options);
        return this;
    }

    /**
     * Build one DICOM mapping instance.
     * @returns {DicomMapping} The built mapping.
     */
    build() {
        return this.mapping;
    }

    /**
     * Construct one DICOM mapping builder.
     * @param {DicomMapping | null} mapping Optional base mapping.
     */
    constructor(mapping = null) {
        this.mapping = (mapping != null) ? mapping : new DicomMapping();
    }

}
