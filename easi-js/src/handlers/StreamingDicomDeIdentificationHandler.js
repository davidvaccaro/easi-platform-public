//
// StreamingDicomDeIdentificationHandler.js - 1.0.0
//
// Stream DICOM De-identification Handler Class
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
import Utilities from '../dicom/Utilities.js';
import { Status } from "../parsers/Status.js";

const DeIdentificationContextSymbol = Symbol('DeIdentificationContext');
const AttributeMaskResolvedSymbol = Symbol('AttributeMaskResolved');
const AttributeMaskValueSymbol = Symbol('AttributeMaskValue');
const RemoveAttributeSymbol = Symbol('RemoveAttribute');

export default class StreamingDicomDeIdentificationHandler {

    /**
     * Forward an event call to the next handler when supported.
     * @param {string} name The event name.
     * @param {object} context The current context.
     * @param {*} param The event parameter.
     * @returns {*} The forwarded result.
     */
    async forward(name, context, param = null) {

        if ((this.nextHandler == null) || (this.nextHandler[name] == null))
            return null;

        const result = this.nextHandler[name](context, param);

        if (result instanceof Promise)
            return await result;

        return result;

    }

    /**
     * Ensure the de-identification context state exists.
     * @param {object} context The current context.
     * @returns {object} The ensured context.
     */
    ensureState(context) {

        if (context == null) {
            context = {};
        }

        if (context[DeIdentificationContextSymbol] == null) {
            context[DeIdentificationContextSymbol] = {
                isInDataSet: false
            };
        }

        return context;

    }

    /**
     * Normalize a Tag-like key to an 8-char uppercase DICOM identifier.
     * @param {Tag | string | object} tagOrIdentifier The Tag-like key.
     * @returns {string | null} The normalized identifier or NULL if invalid.
     */
    normalizeTagMaskKey(tagOrIdentifier) {

        if (tagOrIdentifier == null)
            return null;

        if (typeof tagOrIdentifier === 'string') {
            var normalized = tagOrIdentifier.replace(/[^0-9a-fA-F]/g, '').toUpperCase();
            if (normalized.length != 8)
                return null;
            return normalized;
        }

        if ((tagOrIdentifier.ID != null) && (typeof tagOrIdentifier.ID === 'string')) {
            return tagOrIdentifier.ID.toUpperCase();
        }

        if ((tagOrIdentifier.Group != null) && (tagOrIdentifier.Element != null)) {
            return Tag.identifier(tagOrIdentifier.Group, tagOrIdentifier.Element);
        }

        return null;

    }

    /**
     * Normalize one mask action input to a normalized mask item.
     * @param {string} id The normalized DICOM tag identifier.
     * @param {unknown} maskActionOrItem The input mask action or mask item.
     * @returns {{ID: string, Action: unknown}} The normalized mask item.
     */
    normalizeTagMaskItem(id, maskActionOrItem) {

        var action = maskActionOrItem;
        if (
            (maskActionOrItem != null)
            && (typeof maskActionOrItem === 'object')
            && (Array.isArray(maskActionOrItem) == false)
            && (maskActionOrItem.Action !== undefined)
        ) {
            action = maskActionOrItem.Action;
        }

        return { ID: id, Action: action };

    }

    /**
     * Normalize the caller-provided mask into a map keyed by DICOM tag identifiers.
     * @param {Map<Tag | string, unknown> | Array<Tag | string | object> | object | null} tagMask The mask to normalize.
     * @returns {Map<string, {ID: string, Action: unknown}>} The normalized mask map.
     */
    normalizeTagMask(tagMask) {

        var normalizedTagMask = new Map();

        if (tagMask == null)
            return normalizedTagMask;

        if (tagMask instanceof Map) {

            for (const [key, value] of tagMask.entries()) {
                var id = this.normalizeTagMaskKey(key);
                if (id == null)
                    continue;
                normalizedTagMask.set(id, this.normalizeTagMaskItem(id, value));
            }

            return normalizedTagMask;

        }

        if (Array.isArray(tagMask)) {

            for (var i = 0; i < tagMask.length; i++) {

                var item = tagMask[i];
                var id = this.normalizeTagMaskKey(item);
                if (id == null)
                    continue;

                var itemAction = ((item != null) && (typeof item === 'object') && (item.Action !== undefined))
                    ? item.Action
                    : "[MASKED]";

                normalizedTagMask.set(id, this.normalizeTagMaskItem(id, itemAction));

            }

            return normalizedTagMask;

        }

        if (typeof tagMask === 'object') {

            var keys = Object.keys(tagMask);
            for (var i = 0; i < keys.length; i++) {

                var key = keys[i];
                var id = this.normalizeTagMaskKey(key);
                if (id == null)
                    continue;

                normalizedTagMask.set(id, this.normalizeTagMaskItem(id, tagMask[key]));

            }

        }

        return normalizedTagMask;

    }

    /**
     * Resolve the configured mask item for the current attribute.
     * @param {Attribute} attribute The current attribute.
     * @returns {{ID: string, Action: unknown} | null} The configured mask item or null.
     */
    resolveAttributeMaskItem(attribute) {

        if ((attribute == null) || (attribute.tag == null))
            return null;

        if ((this._tagMask == null) || (this._tagMask instanceof Map == false))
            return null;

        var key = this.normalizeTagMaskKey(attribute.tag);
        if (key == null)
            return null;

        return this._tagMask.get(key) || null;

    }

    /**
     * Normalize a value to a standard DICOM de-identification action code.
     * @param {unknown} maskAction The action candidate.
     * @returns {string | null} The normalized action code, or null when it is not a standard action code.
     */
    normalizeMaskActionCode(maskAction) {

        if (typeof maskAction !== 'string')
            return null;

        var code = maskAction.trim().toUpperCase().replace(/\s+/g, '');
        while (code.endsWith('*')) {
            code = code.slice(0, -1);
        }

        switch (code) {
            case 'D':
            case 'Z':
            case 'X':
            case 'K':
            case 'C':
            case 'U':
            case 'Z/D':
            case 'X/Z':
            case 'X/D':
            case 'X/Z/D':
            case 'X/Z/U':
                return code;
            default:
                return null;
        }

    }

    /**
     * Resolve a DICOM-compatible "zero-length" replacement value based on VR.
     * @param {Attribute} attribute The current attribute.
     * @returns {unknown} The replacement value.
     */
    resolveZeroLengthMaskValue(attribute) {

        var vr = (attribute?.tag?.VR?.ID || '').toUpperCase();

        switch (vr) {
            case 'OB':
            case 'OD':
            case 'OF':
            case 'OL':
            case 'OV':
            case 'OW':
            case 'UN':
                return new Uint8Array();
            case 'SQ':
                return [];
            case 'AT':
                return new Uint8Array();
            default:
                return '';
        }

    }

    /**
     * Resolve a DICOM-compatible "dummy" replacement value based on VR.
     * @param {Attribute} attribute The current attribute.
     * @returns {unknown} The replacement value.
     */
    resolveDummyMaskValue(attribute) {

        var vr = (attribute?.tag?.VR?.ID || '').toUpperCase();

        switch (vr) {
            case 'DA':
                return new Date(1900, 0, 1);
            case 'DT':
                return new Date(1900, 0, 1, 0, 0, 0, 0);
            case 'TM':
                return new Date(1970, 0, 1, 0, 0, 0, 0);
            case 'FL':
            case 'FD':
            case 'SL':
            case 'SS':
            case 'SV':
            case 'UL':
            case 'US':
            case 'UV':
            case 'IS':
            case 'DS':
                return 0;
            case 'UI':
                return this.resolveUIDMaskValue(attribute);
            case 'SQ':
                return [];
            case 'OB':
            case 'OD':
            case 'OF':
            case 'OL':
            case 'OV':
            case 'OW':
            case 'UN':
            case 'AT':
                return new Uint8Array([0]);
            case 'PN':
                return 'ANON^ANON';
            default:
                return '[MASKED]';
        }

    }

    /**
     * Resolve a DICOM-compatible "cleaned" replacement value based on VR.
     * @param {Attribute} attribute The current attribute.
     * @returns {unknown} The replacement value.
     */
    resolveCleanMaskValue(attribute) {

        var vr = (attribute?.tag?.VR?.ID || '').toUpperCase();

        switch (vr) {
            case 'PN':
                return 'ANON^CLEAN';
            case 'LO':
            case 'LT':
            case 'SH':
            case 'ST':
            case 'UC':
            case 'UT':
            case 'UR':
            case 'AE':
            case 'CS':
                return '[CLEANED]';
            default:
                return this.resolveDummyMaskValue(attribute);
        }

    }

    /**
     * Resolve a deterministic replacement UID for a masked UID attribute.
     * @param {Attribute} attribute The current attribute.
     * @returns {string} The replacement UID value.
     */
    resolveUIDMaskValue(attribute) {

        var originalValue = '';
        if (attribute != null) {
            var currentValue = attribute.value;
            originalValue = ((currentValue == null) ? '' : String(currentValue));
        }

        var seed = ((attribute?.tag?.ID != null) ? attribute.tag.ID : '') + '|' + originalValue;
        return Utilities.createDeterministicUID(seed);

    }

    /**
     * Resolve a configured mask action to a replacement value.
     * @param {Attribute} attribute The current attribute.
     * @param {unknown} maskAction The configured mask action.
     * @returns {unknown} The resolved replacement value.
     */
    resolveMaskActionValue(attribute, maskAction) {

        if (typeof maskAction === 'function') {
            return maskAction(attribute);
        }

        var actionCode = this.normalizeMaskActionCode(maskAction);
        if (actionCode == null) {
            return maskAction;
        }

        switch (actionCode) {
            case 'D':
                return this.resolveDummyMaskValue(attribute);
            case 'Z':
                return this.resolveZeroLengthMaskValue(attribute);
            case 'X':
                return RemoveAttributeSymbol;
            case 'K':
                return attribute.value;
            case 'C':
                return this.resolveCleanMaskValue(attribute);
            case 'U':
                return this.resolveUIDMaskValue(attribute);
            case 'Z/D':
                return this.resolveDummyMaskValue(attribute);
            case 'X/Z':
                return this.resolveZeroLengthMaskValue(attribute);
            case 'X/D':
                return this.resolveDummyMaskValue(attribute);
            case 'X/Z/D':
                return this.resolveDummyMaskValue(attribute);
            case 'X/Z/U':
                return this.resolveUIDMaskValue(attribute);
            default:
                return maskAction;
        }

    }

    /**
     * Determine whether a mask action should be deferred until the full attribute value is available.
     * @param {unknown} maskAction The configured mask action.
     * @returns {boolean} TRUE when resolution should be deferred for incomplete attributes.
     */
    shouldDeferMaskAction(maskAction) {

        if (typeof maskAction === 'function')
            return true;

        var actionCode = this.normalizeMaskActionCode(maskAction);
        return ((actionCode == 'K') || (actionCode == 'U') || (actionCode == 'X/Z/U'));

    }

    /**
     * Determine whether the mask action should suppress forwarding the current attribute/sequence.
     * @param {Attribute} attribute The current attribute or sequence element.
     * @returns {boolean} TRUE if the current element should be suppressed.
     */
    shouldSuppressMaskedAttribute(attribute) {

        var maskItem = this.resolveAttributeMaskItem(attribute);
        if (maskItem == null)
            return false;

        var actionCode = this.normalizeMaskActionCode(maskItem.Action);
        return (actionCode == 'X');

    }

    /**
     * Resolve the configured mask value for the current attribute potentially following 
     * the "Basic Application Level Confidentiality Profile" defined in:
     * https://dicom.nema.org/medical/dicom/current/output/chtml/part15/chapter_E.html#table_E.1-1a
     * @param {Attribute} attribute The current attribute.
     * @returns {unknown} The resolved mask value.
     */
    resolveAttributeMaskValue(attribute) {

        if (attribute[AttributeMaskResolvedSymbol] == true)
            return attribute[AttributeMaskValueSymbol];

        var maskItem = this.resolveAttributeMaskItem(attribute);
        var maskValue = null;
        if (maskItem != null) {
            maskValue = this.resolveMaskActionValue(attribute, maskItem.Action);
        }

        attribute[AttributeMaskResolvedSymbol] = true;
        attribute[AttributeMaskValueSymbol] = maskValue;

        return maskValue;

    }

    /**
     * Determine if the current attribute should be masked.
     * @param {object} context The current parse context.
     * @param {Attribute} attribute The current attribute.
     * @returns {boolean} TRUE if the current attribute should be masked, FALSE otherwise.
     */
    shouldMaskAttribute(context, attribute) {

        if ((attribute == null) || (attribute.tag == null))
            return false;

        if ((this._tagMask == null) || (this._tagMask.size == 0))
            return false;

        if ((context == null) || (context[DeIdentificationContextSymbol] == null))
            return false;

        if (context[DeIdentificationContextSymbol].isInDataSet != true)
            return false;

        var key = this.normalizeTagMaskKey(attribute.tag);
        if (key == null)
            return false;

        return this._tagMask.has(key);

    }

    /**
     * Apply masking to the current attribute when required.
     * @param {object} context The current parse context.
     * @param {Attribute} attribute The current attribute.
     */
    applyMask(context, attribute) {

        if (this.shouldMaskAttribute(context, attribute) == false)
            return;

        var maskItem = this.resolveAttributeMaskItem(attribute);
        if (maskItem == null)
            return;

        if ((attribute?.isComplete != true) && this.shouldDeferMaskAction(maskItem.Action))
            return;

        var maskValue = this.resolveAttributeMaskValue(attribute);
        if (maskValue === RemoveAttributeSymbol)
            return;

        attribute.value = maskValue;

    }

    async onReset(context) {
        return await this.forward("onReset", context);
    }

    async onStartInstance(context) {

        var forwarded = await this.forward("onStartInstance", context);
        context = this.ensureState((forwarded == null) ? context : forwarded);
        context[DeIdentificationContextSymbol].isInDataSet = false;

        return context;

    }

    async onStartPreamble(context, preamble) {
        context = this.ensureState(context);
        return await this.forward("onStartPreamble", context, preamble);
    }

    async onStartPrefix(context, prefix) {
        context = this.ensureState(context);
        return await this.forward("onStartPrefix", context, prefix);
    }

    async onStartMetaSet(context) {
        context = this.ensureState(context);
        context[DeIdentificationContextSymbol].isInDataSet = false;
        return await this.forward("onStartMetaSet", context);
    }

    async onStartDataSet(context) {
        context = this.ensureState(context);
        context[DeIdentificationContextSymbol].isInDataSet = true;
        return await this.forward("onStartDataSet", context);
    }

    async onStartAttribute(context, attribute) {
        context = this.ensureState(context);
        if (this.shouldMaskAttribute(context, attribute) && this.shouldSuppressMaskedAttribute(attribute))
            return Status.SKIP;
        return await this.forward("onStartAttribute", context, attribute);
    }

    async onStartSequence(context, sequence) {
        context = this.ensureState(context);
        if (this.shouldMaskAttribute(context, sequence) && this.shouldSuppressMaskedAttribute(sequence))
            return Status.SKIP;
        return await this.forward("onStartSequence", context, sequence);
    }

    async onStartItem(context) {
        context = this.ensureState(context);
        return await this.forward("onStartItem", context);
    }

    async onAppendAttribute(context, attribute) {
        context = this.ensureState(context);
        this.applyMask(context, attribute);
        return await this.forward("onAppendAttribute", context, attribute);
    }

    async onEndPreamble(context, preamble) {
        context = this.ensureState(context);
        return await this.forward("onEndPreamble", context, preamble);
    }

    async onEndPrefix(context, prefix) {
        context = this.ensureState(context);
        return await this.forward("onEndPrefix", context, prefix);
    }

    async onEndAttribute(context, attribute) {
        context = this.ensureState(context);
        this.applyMask(context, attribute);
        return await this.forward("onEndAttribute", context, attribute);
    }

    async onEndSequence(context, sequence) {
        context = this.ensureState(context);
        return await this.forward("onEndSequence", context, sequence);
    }

    async onEndItem(context) {
        context = this.ensureState(context);
        return await this.forward("onEndItem", context);
    }

    async onEndMetaSet(context) {
        context = this.ensureState(context);
        return await this.forward("onEndMetaSet", context);
    }

    async onEndDataSet(context) {
        context = this.ensureState(context);
        var status = await this.forward("onEndDataSet", context);
        context[DeIdentificationContextSymbol].isInDataSet = false;
        return status;
    }

    async onEndInstance(context) {
        context = this.ensureState(context);
        context[DeIdentificationContextSymbol].isInDataSet = false;
        return await this.forward("onEndInstance", context);
    }

    async onError(context, error) {
        context = this.ensureState(context);
        return await this.forward("onError", context, error);
    }

    async onProgress(context, progress) {
        context = this.ensureState(context);
        return await this.forward("onProgress", context, progress);
    }

    /**
     * Sets the current attribute tag mask map.
     * @param {Map<MaskItem> | null} tagMask The tag mask map.
     */
    set tagMask(tagMask) {
        this._tagMask = this.normalizeTagMask(tagMask);
    }

    /**
     * Gets the current attribute tag mask map.
     * @returns {Map<MaskItem> | null} The tag mask map.
     */
    get tagMask() {
        return this._tagMask;
    }

    /**
     * Alias for tagMask.
     * @param {Map<MaskItem> | null} mask The tag mask map.
     */
    set mask(mask) {
        this.tagMask = mask;
    }

    /**
     * Alias for tagMask.
     * @returns {Map<MaskItem> | null} The tag mask map.
     */
    get mask() {
        return this.tagMask;
    }

    /**
     * Set or replace a mask for a single tag.
     * @param {Tag | string | object} tagOrIdentifier The tag to mask.
     * @param {unknown} maskValue The mask value or resolver function.
     */
    setTagMask(tagOrIdentifier, maskValue = "[MASKED]") {

        var id = this.normalizeTagMaskKey(tagOrIdentifier);
        if (id == null)
            return;

        if (this._tagMask instanceof Map == false) {
            this._tagMask = new Map();
        }

        this._tagMask.set(id, this.normalizeTagMaskItem(id, maskValue));

    }

    /**
     * Remove a mask for a single tag.
     * @param {Tag | string | object} tagOrIdentifier The tag to clear from the mask map.
     */
    clearTagMask(tagOrIdentifier) {

        var id = this.normalizeTagMaskKey(tagOrIdentifier);
        if (id == null)
            return;

        if (this._tagMask instanceof Map == false) {
            this._tagMask = new Map();
            return;
        }

        this._tagMask.delete(id);

    }

    /**
     * Create a new DICOM de-identification handler with an optional "next" handler.
     * @param {object} nextHandler The next handler in the chain.
     * @param {Map<Tag | string, unknown> | Array<Tag | string> | object | null} mask The tag mask map.
     */
    constructor(nextHandler = null, mask = Tag.DefaultDeIdentificationMask) {

        this.nextHandler = nextHandler;
        this._tagMask = new Map();
        this.mask = mask;

    }

};
