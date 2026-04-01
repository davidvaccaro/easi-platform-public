//
// DicomMapping.js
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

import Mapping from "./Mapping.js";
import Tag from "../../dicom/Tag.js";

export default class DicomMapping extends Mapping {
    
    /**
     * Add a mapping for the specified DICOM Tag.
     * @param {Tag} tag The specified DICOM Tag.
     * @param {string} property The property The property name or path to a property within an object hierarchy.
     */
    addTag(tag, property, options = null) {

        // Add the tag mapping
        this.add(tag.ID, property, options);

    }

    /**
     * Determine if the mapping has the current DICOM Tag.
     * @param {Tag} tag The specified DICOM Tag.
     * @returns TRUE if the mapping maps the DICOM Tag, FALSE otherwise.
     */
    hasTag(tag) {
        return this.has(tag.ID);
    }

    /**
     * Determine if this mapping must capture the supplied DICOM Tag.
     * @param {Tag} tag The DICOM tag.
     * @returns {boolean} TRUE when the tag should be captured.
     */
    shouldCaptureTag(tag) {

        if ((tag == null) || (tag.ID == null))
            return false;

        if (this.hasTag(tag) == true)
            return true;

        if (this._templateDicomTagIDs.has(tag.ID))
            return true;

        var keyword = tag.Keyword;
        if ((keyword != null) && (typeof keyword === 'string')) {
            if (this._templateDicomTagKeywords.has(keyword))
                return true;
            if (this._templateDicomTagKeywords.has(keyword.toLowerCase()))
                return true;
            if (this._templateDicomTagKeywords.has(keyword.toUpperCase()))
                return true;
        }

        var name = tag.Name;
        if ((name != null) && (typeof name === 'string')) {
            if (this._templateDicomTagKeywords.has(name))
                return true;
            if (this._templateDicomTagKeywords.has(name.toLowerCase()))
                return true;
            if (this._templateDicomTagKeywords.has(name.toUpperCase()))
                return true;
        }

        return false;

    }

    /**
     * Capture one DICOM value for later token resolution.
     * @param {object} context The mapping context.
     * @param {Attribute} attribute The current attribute.
     */
    captureAttribute(context, attribute) {

        if ((context == null) || (attribute == null) || (attribute.tag == null))
            return;

        if (context.dicom == null)
            context.dicom = {};

        context.dicom[attribute.tag.ID] = attribute.value;

        if ((attribute.tag.Keyword != null) && (attribute.tag.Keyword.length > 0)) {
            context.dicom[attribute.tag.Keyword] = attribute.value;
            context.dicom[attribute.tag.Keyword.toLowerCase()] = attribute.value;
            context.dicom[attribute.tag.Keyword.toUpperCase()] = attribute.value;
        }

        if ((attribute.tag.Tag != null) && (attribute.tag.Tag.length > 0)) {
            context.dicom[attribute.tag.Tag] = attribute.value;
        }

        if ((attribute.tag.Name != null) && (attribute.tag.Name.length > 0)) {
            context.dicom[attribute.tag.Name] = attribute.value;
            context.dicom[attribute.tag.Name.toLowerCase()] = attribute.value;
            context.dicom[attribute.tag.Name.toUpperCase()] = attribute.value;
        }

    }

    /**
     * Map the attribute to the destination property.
     * @param {object} context 
     * @param {Attribute} attribute 
     */
    mapAttribute(context, attribute) {

        if ((attribute == null) || (attribute.tag == null))
            return;

        // If the current attribute is neither mapped nor required by template tokens, skip.
        if (this.shouldCaptureTag(attribute.tag) == false)
            return;

        // Capture the attribute for token lookup, regardless of direct mapping.
        this.captureAttribute(context, attribute);

        // First, if the attribite is NOT mapped, return
        if (this.hasTag(attribute.tag) == false)
            return;

        // Map the attribute
        this.map(context, attribute.tag.ID, attribute.value);

    }

    /**
     * Start the mapping session.
     * @param {object} context The session context.
     * @returns {object} The current context.
     */
    start(context) {

        if (context != null)
            context.dicom = {};

        return super.start(context);

    }

    /**
     * Resolve a custom template token.
     * @param {string} tokenName The token name.
     * @param {object | null} scope The token scope.
     * @returns {*} The token value.
     */
    resolveTemplateTokenExtension(tokenName, scope = null) {

        if ((typeof tokenName !== 'string') || (tokenName.startsWith('dicom.') == false))
            return null;

        var context = scope?.context;
        if ((context == null) || (context.dicom == null))
            return null;

        var dicomKey = tokenName.substring('dicom.'.length).trim();
        if (dicomKey.length == 0)
            return null;

        if (Object.prototype.hasOwnProperty.call(context.dicom, dicomKey))
            return context.dicom[dicomKey];

        var normalizedTagID = this.normalizeDicomTokenToTagID(dicomKey);
        if (
            (normalizedTagID != null)
            &&
            (Object.prototype.hasOwnProperty.call(context.dicom, normalizedTagID))
        ) {
            return context.dicom[normalizedTagID];
        }

        var lowered = dicomKey.toLowerCase();
        if (Object.prototype.hasOwnProperty.call(context.dicom, lowered))
            return context.dicom[lowered];

        var uppered = dicomKey.toUpperCase();
        if (Object.prototype.hasOwnProperty.call(context.dicom, uppered))
            return context.dicom[uppered];

        return null;

    }

    /**
     * Called when mapping definitions change.
     * Builds a lookup of DICOM token dependencies so the handler can avoid parsing unneeded attributes.
     */
    onDefinitionChanged() {

        this._templateDicomTagIDs = new Set();
        this._templateDicomTagKeywords = new Set();

        var definitions = this.getDefinitions();
        for (var i = 0; i < definitions.length; i++) {
            this.captureTemplateTokenDependencies(definitions[i].template);
        }

        var computed = this.getComputedDefinitions();
        for (var j = 0; j < computed.length; j++) {
            this.captureTemplateTokenDependencies(computed[j].template);
        }

    }

    /**
     * Capture dicom.* template dependencies from one template.
     * @param {string | null} template The template string.
     */
    captureTemplateTokenDependencies(template) {

        if ((template == null) || (typeof template !== 'string') || (template.length == 0))
            return;

        var tokens = this.extractTemplateTokens(template);
        for (var i = 0; i < tokens.length; i++) {

            var token = tokens[i];
            if (token.startsWith('dicom.') == false)
                continue;

            var dicomToken = token.substring('dicom.'.length).trim();
            if (dicomToken.length == 0)
                continue;

            var normalizedID = this.normalizeDicomTokenToTagID(dicomToken);
            if (normalizedID != null) {
                this._templateDicomTagIDs.add(normalizedID);
                continue;
            }

            this._templateDicomTagKeywords.add(dicomToken);
            this._templateDicomTagKeywords.add(dicomToken.toLowerCase());
            this._templateDicomTagKeywords.add(dicomToken.toUpperCase());

        }

    }

    /**
     * Normalize one dicom token to an 8-char tag ID where possible.
     * @param {string} token The token value.
     * @returns {string | null} The normalized tag ID.
     */
    normalizeDicomTokenToTagID(token) {

        if ((token == null) || (typeof token !== 'string'))
            return null;

        var normalized = token.toUpperCase().replace(/[^0-9A-F]/g, '');
        if (normalized.length == 8)
            return normalized;

        var staticTag = Tag[token];
        if ((staticTag != null) && (staticTag.ID != null))
            return staticTag.ID;

        return null;

    }

    constructor() {

        // Call the base
        super();

        this._templateDicomTagIDs = new Set();
        this._templateDicomTagKeywords = new Set();

    }

};
