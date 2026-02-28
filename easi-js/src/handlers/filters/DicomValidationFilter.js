//
// DicomValidationFilter.js - 1.0.0
//
// Stream DICOM Validation Filter Class
//

import Tag from "../../dicom/Tag.js";
import { Status } from "../../parsers/Status.js";

const ValidationContextSymbol = Symbol('ValidationContext');

export const ValidationConcernSeverity = {
    INFO: 'info',
    WARNING: 'warning',
    ERROR: 'error'
};

export const ValidationConcernCodes = {
    MissingScope: 'MissingScope',
    InvalidAttribute: 'InvalidAttribute',
    DuplicateAttribute: 'DuplicateAttribute',
    InvalidMetaTagPlacement: 'InvalidMetaTagPlacement',
    MissingRequiredMetaAttribute: 'MissingRequiredMetaAttribute',
    SequenceItemMismatch: 'SequenceItemMismatch',
    SequenceMismatch: 'SequenceMismatch',
    IncompleteAttribute: 'IncompleteAttribute',
    ParserError: 'ParserError'
};

export const ValidationGoals = {
    PERMISSIVE: 'permissive',
    STRICT: 'strict'
};

export default class DicomValidationFilter {

    async forward(name, context, param = null) {

        if ((this.nextHandler == null) || (this.nextHandler[name] == null))
            return null;

        const result = this.nextHandler[name](context, param);
        if (result instanceof Promise)
            return await result;

        return result;

    }

    ensureState(context) {

        if (context == null) {
            context = {};
        }

        if (context[ValidationContextSymbol] == null) {
            context[ValidationContextSymbol] = {
                isInMetaSet: false,
                isInDataSet: false,
                instanceIndex: 0,
                sequenceStack: [],
                scopeStack: [],
                pathStack: [],
                concerns: this._concerns
            };
        }

        return context;

    }

    resetState(state) {

        state.isInMetaSet = false;
        state.isInDataSet = false;
        state.sequenceStack = [];
        state.scopeStack = [];
        state.pathStack = [];

    }

    isTerminalStatus(status) {
        return ((status === Status.FAIL) || (status === Status.STOP) || (status === Status.JUMP));
    }

    normalizeGoal(goal) {

        if (typeof goal !== 'string')
            return ValidationGoals.PERMISSIVE;

        const normalized = goal.trim().toLowerCase();
        if (normalized === ValidationGoals.STRICT)
            return ValidationGoals.STRICT;

        return ValidationGoals.PERMISSIVE;

    }

    formatTagID(tagOrID) {

        var id = null;

        if (typeof tagOrID === 'string')
            id = tagOrID;
        else if ((tagOrID != null) && (typeof tagOrID === 'object') && (typeof tagOrID.ID === 'string'))
            id = tagOrID.ID;

        if ((id == null) || (id.length != 8))
            return null;

        return `(${id.slice(0, 4)},${id.slice(4)})`;

    }

    getState(context) {
        return (context == null) ? null : context[ValidationContextSymbol];
    }

    currentScope(state) {

        if ((state == null) || (state.scopeStack == null) || (state.scopeStack.length == 0))
            return null;

        return state.scopeStack[state.scopeStack.length - 1];

    }

    currentPath(state, tag = null) {

        if (state == null)
            return '/';

        var path = '/';
        if ((state.pathStack != null) && (state.pathStack.length > 0))
            path += state.pathStack.join('/');

        if (tag != null) {
            var segment = this.formatTagID(tag);
            if (segment != null)
                path += ((path.length > 1) ? '/' : '') + segment;
        }

        return path;

    }

    isSequenceControlTag(tag) {

        var id = tag?.ID || null;
        return ((id === Tag.Item?.ID)
            || (id === Tag.ItemDelimitationItem?.ID)
            || (id === Tag.SequenceDelimitationItem?.ID));

    }

    async reportConcern(context, {
        severity = ValidationConcernSeverity.WARNING,
        code = 'ValidationConcern',
        message = 'Validation concern.',
        event = null,
        tag = null,
        details = null
    } = {}) {

        context = this.ensureState(context);
        const state = this.getState(context);

        const concern = {
            severity,
            code,
            message,
            event,
            instanceIndex: state.instanceIndex,
            path: this.currentPath(state, tag),
            tagID: (tag?.ID || null),
            tagName: (tag?.Name || null),
            vr: (tag?.VR?.ID || null),
            isInMetaSet: state.isInMetaSet,
            isInDataSet: state.isInDataSet,
            details
        };

        this._concerns.push(concern);

        if (typeof this._onConcern === 'function') {
            const callbackResult = this._onConcern(concern);
            if (callbackResult instanceof Promise)
                await callbackResult;
        }

        if ((this.goal === ValidationGoals.STRICT)
            && ((severity === ValidationConcernSeverity.ERROR) || (severity === ValidationConcernSeverity.WARNING))) {
            return Status.FAIL;
        }

        return Status.CONTINUE;

    }

    pushScope(state, kind, pathLabel = null) {

        if (state == null)
            return;

        state.scopeStack.push({
            kind,
            tagIDs: new Set()
        });

        state.pathStack.push((pathLabel == null) ? kind : pathLabel);

    }

    popScope(state, expectedKind = null) {

        if ((state == null) || (state.scopeStack.length == 0))
            return null;

        const scope = state.scopeStack.pop();
        if (state.pathStack.length > 0)
            state.pathStack.pop();

        if ((expectedKind != null) && (scope.kind !== expectedKind))
            return scope;

        return scope;

    }

    recordAttributeInScope(state, attribute) {

        const scope = this.currentScope(state);
        if ((scope == null) || (attribute?.tag?.ID == null))
            return false;

        if (scope.tagIDs.has(attribute.tag.ID))
            return true;

        scope.tagIDs.add(attribute.tag.ID);
        return false;

    }

    async validateAttributeStart(context, attribute, eventName) {

        context = this.ensureState(context);
        const state = this.getState(context);

        if ((attribute == null) || (attribute.tag == null) || (attribute.tag.ID == null)) {
            return await this.reportConcern(context, {
                severity: ValidationConcernSeverity.ERROR,
                code: ValidationConcernCodes.InvalidAttribute,
                message: 'Encountered an attribute/sequence without a valid DICOM tag.',
                event: eventName
            });
        }

        const scope = this.currentScope(state);
        if (scope == null) {
            return await this.reportConcern(context, {
                severity: ValidationConcernSeverity.ERROR,
                code: ValidationConcernCodes.MissingScope,
                message: `Encountered ${eventName} outside of MetaSet/DataSet/Item scope.`,
                event: eventName,
                tag: attribute.tag
            });
        }

        if ((scope.kind !== 'MetaSet') && (scope.kind !== 'DataSet') && (scope.kind !== 'Item')) {
            return await this.reportConcern(context, {
                severity: ValidationConcernSeverity.ERROR,
                code: ValidationConcernCodes.MissingScope,
                message: `Encountered ${eventName} in invalid scope '${scope.kind}'.`,
                event: eventName,
                tag: attribute.tag
            });
        }

        // Sequence control tags (FFFE,E000 / E00D / E0DD) are parser control markers, not normal DICOM attributes.
        // They may repeat by design and should not participate in duplicate/meta-placement/VR checks.
        if (this.isSequenceControlTag(attribute.tag) == true) {
            return Status.CONTINUE;
        }

        const isMetaTag = attribute.tag.ID.startsWith('0002');
        if (state.isInDataSet && isMetaTag) {
            const status = await this.reportConcern(context, {
                severity: ValidationConcernSeverity.ERROR,
                code: ValidationConcernCodes.InvalidMetaTagPlacement,
                message: 'File Meta Information attribute encountered while parsing the main data set.',
                event: eventName,
                tag: attribute.tag
            });
            if (this.isTerminalStatus(status))
                return status;
        }
        else if (state.isInMetaSet && !state.isInDataSet && (isMetaTag == false)) {
            const status = await this.reportConcern(context, {
                severity: ValidationConcernSeverity.ERROR,
                code: ValidationConcernCodes.InvalidMetaTagPlacement,
                message: 'Non-File-Meta attribute encountered while parsing the file meta information set.',
                event: eventName,
                tag: attribute.tag
            });
            if (this.isTerminalStatus(status))
                return status;
        }

        if (attribute.tag.VR == null) {
            const status = await this.reportConcern(context, {
                severity: ValidationConcernSeverity.WARNING,
                code: ValidationConcernCodes.InvalidAttribute,
                message: 'Attribute tag does not provide a VR definition.',
                event: eventName,
                tag: attribute.tag
            });
            if (this.isTerminalStatus(status))
                return status;
        }

        if (this.recordAttributeInScope(state, attribute) == true) {
            const status = await this.reportConcern(context, {
                severity: ValidationConcernSeverity.ERROR,
                code: ValidationConcernCodes.DuplicateAttribute,
                message: 'Duplicate attribute encountered within the same DICOM attribute scope.',
                event: eventName,
                tag: attribute.tag
            });
            if (this.isTerminalStatus(status))
                return status;
        }

        return Status.CONTINUE;

    }

    async validateAttributeEnd(context, attribute, eventName) {

        if ((attribute == null) || (attribute.tag == null))
            return Status.CONTINUE;

        // Undefined-length elements complete via delimiters/items, not via byte-count equality.
        if (attribute.valueLength === 0xFFFFFFFF)
            return Status.CONTINUE;

        if (attribute.isComplete === false) {
            return await this.reportConcern(context, {
                severity: ValidationConcernSeverity.WARNING,
                code: ValidationConcernCodes.IncompleteAttribute,
                message: 'Attribute ended before all value bytes were received.',
                event: eventName,
                tag: attribute.tag,
                details: {
                    bytesRemaining: (attribute.bytesRemaining ?? null)
                }
            });
        }

        return Status.CONTINUE;

    }

    async validateRequiredMetaAttributes(context) {

        const state = this.getState(context);
        const metaScope = (state?.scopeStack || []).find(scope => scope.kind === 'MetaSet');
        if (metaScope == null)
            return Status.CONTINUE;

        const requiredTags = [
            Tag.FileMetaInformationVersion,
            Tag.MediaStorageSOPClassUID,
            Tag.MediaStorageSOPInstanceUID,
            Tag.TransferSyntaxUID
        ];

        for (var i = 0; i < requiredTags.length; i++) {

            const requiredTag = requiredTags[i];
            if ((requiredTag == null) || (requiredTag.ID == null))
                continue;

            if (metaScope.tagIDs.has(requiredTag.ID))
                continue;

            const status = await this.reportConcern(context, {
                severity: ValidationConcernSeverity.ERROR,
                code: ValidationConcernCodes.MissingRequiredMetaAttribute,
                message: `Required file meta attribute ${requiredTag.Name || requiredTag.ID} is missing.`,
                event: 'onEndMetaSet',
                tag: requiredTag
            });

            if (this.isTerminalStatus(status))
                return status;

        }

        return Status.CONTINUE;

    }

    set goal(goal) {
        this._goal = this.normalizeGoal(goal);
    }

    get goal() {
        return this._goal;
    }

    set mode(mode) {
        this.goal = mode;
    }

    get mode() {
        return this.goal;
    }

    set isStrict(isStrict) {
        this.goal = (isStrict == true) ? ValidationGoals.STRICT : ValidationGoals.PERMISSIVE;
    }

    get isStrict() {
        return (this.goal === ValidationGoals.STRICT);
    }

    set onConcern(onConcern) {
        this._onConcern = onConcern;
    }

    get onConcern() {
        return this._onConcern;
    }

    get concerns() {
        return this._concerns;
    }

    clearConcerns() {
        this._concerns = [];
    }

    async onReset(context) {
        this._isSessionActive = false;
        return await this.forward("onReset", context);
    }

    async onStartInstance(context) {

        var forwarded = await this.forward("onStartInstance", context);
        context = this.ensureState((forwarded == null) ? context : forwarded);

        if ((this._autoClearConcerns == true) && (this._isSessionActive == false)) {
            this.clearConcerns();
        }
        this._isSessionActive = true;

        const state = this.getState(context);
        state.instanceIndex++;
        this.resetState(state);

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
        const state = this.getState(context);
        state.isInMetaSet = true;
        this.pushScope(state, 'MetaSet');

        return await this.forward("onStartMetaSet", context);

    }

    async onStartDataSet(context) {

        context = this.ensureState(context);
        const state = this.getState(context);
        state.isInDataSet = true;
        this.pushScope(state, 'DataSet');

        return await this.forward("onStartDataSet", context);

    }

    async onStartAttribute(context, attribute) {

        context = this.ensureState(context);
        const status = await this.validateAttributeStart(context, attribute, 'onStartAttribute');
        if (this.isTerminalStatus(status))
            return status;

        return await this.forward("onStartAttribute", context, attribute);

    }

    async onStartSequence(context, sequence) {

        context = this.ensureState(context);
        const status = await this.validateAttributeStart(context, sequence, 'onStartSequence');
        if (this.isTerminalStatus(status))
            return status;

        const state = this.getState(context);
        state.sequenceStack.push({
            tagID: sequence?.tag?.ID || null,
            itemCount: 0
        });
        state.pathStack.push(this.formatTagID(sequence?.tag) || 'Sequence');

        return await this.forward("onStartSequence", context, sequence);

    }

    async onStartItem(context) {

        context = this.ensureState(context);
        const state = this.getState(context);

        if (state.sequenceStack.length == 0) {
            const status = await this.reportConcern(context, {
                severity: ValidationConcernSeverity.ERROR,
                code: ValidationConcernCodes.SequenceItemMismatch,
                message: 'Sequence item started while no sequence is currently open.',
                event: 'onStartItem'
            });
            if (this.isTerminalStatus(status))
                return status;
        }
        else {
            const sequence = state.sequenceStack[state.sequenceStack.length - 1];
            sequence.itemCount++;
            this.pushScope(state, 'Item', `Item[${sequence.itemCount}]`);
        }
        
        if (state.sequenceStack.length == 0)
            this.pushScope(state, 'Item');
        return await this.forward("onStartItem", context);

    }

    async onAppendAttribute(context, attribute) {
        context = this.ensureState(context);
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
        const status = await this.validateAttributeEnd(context, attribute, 'onEndAttribute');
        if (this.isTerminalStatus(status))
            return status;

        return await this.forward("onEndAttribute", context, attribute);

    }

    async onEndSequence(context, sequence) {

        context = this.ensureState(context);
        const state = this.getState(context);

        if (state.sequenceStack.length == 0) {
            const status = await this.reportConcern(context, {
                severity: ValidationConcernSeverity.ERROR,
                code: ValidationConcernCodes.SequenceMismatch,
                message: 'Sequence ended while no sequence is currently open.',
                event: 'onEndSequence',
                tag: sequence?.tag || null
            });
            if (this.isTerminalStatus(status))
                return status;
        }
        else {
            const current = state.sequenceStack[state.sequenceStack.length - 1];
            if ((sequence?.tag?.ID != null) && (current.tagID != null) && (sequence.tag.ID !== current.tagID)) {
                const status = await this.reportConcern(context, {
                    severity: ValidationConcernSeverity.ERROR,
                    code: ValidationConcernCodes.SequenceMismatch,
                    message: 'Sequence end tag did not match the current open sequence.',
                    event: 'onEndSequence',
                    tag: sequence.tag,
                    details: { expectedTagID: current.tagID }
                });
                if (this.isTerminalStatus(status))
                    return status;
            }

            state.sequenceStack.pop();
            if (state.pathStack.length > 0)
                state.pathStack.pop();
        }

        const attributeStatus = await this.validateAttributeEnd(context, sequence, 'onEndSequence');
        if (this.isTerminalStatus(attributeStatus))
            return attributeStatus;

        return await this.forward("onEndSequence", context, sequence);

    }

    async onEndItem(context) {

        context = this.ensureState(context);
        const state = this.getState(context);

        if ((this.currentScope(state) == null) || (this.currentScope(state).kind !== 'Item')) {
            const status = await this.reportConcern(context, {
                severity: ValidationConcernSeverity.ERROR,
                code: ValidationConcernCodes.SequenceItemMismatch,
                message: 'Sequence item ended while no item scope is currently open.',
                event: 'onEndItem'
            });
            if (this.isTerminalStatus(status))
                return status;
        }
        else {
            this.popScope(state, 'Item');
        }

        if (state.sequenceStack.length == 0) {
            const status = await this.reportConcern(context, {
                severity: ValidationConcernSeverity.ERROR,
                code: ValidationConcernCodes.SequenceItemMismatch,
                message: 'Sequence item ended while no parent sequence is currently open.',
                event: 'onEndItem'
            });
            if (this.isTerminalStatus(status))
                return status;
        }
        return await this.forward("onEndItem", context);

    }

    async onEndMetaSet(context) {

        context = this.ensureState(context);
        var status = await this.validateRequiredMetaAttributes(context);
        if (this.isTerminalStatus(status))
            return status;

        status = await this.forward("onEndMetaSet", context);

        const state = this.getState(context);
        state.isInMetaSet = false;
        if ((this.currentScope(state) != null) && (this.currentScope(state).kind === 'MetaSet'))
            this.popScope(state, 'MetaSet');

        return status;

    }

    async onEndDataSet(context) {

        context = this.ensureState(context);
        const state = this.getState(context);

        while ((state.scopeStack.length > 0) && (this.currentScope(state)?.kind === 'Item')) {
            const status = await this.reportConcern(context, {
                severity: ValidationConcernSeverity.ERROR,
                code: ValidationConcernCodes.SequenceItemMismatch,
                message: 'DataSet ended while a sequence item scope was still open.',
                event: 'onEndDataSet'
            });
            if (this.isTerminalStatus(status))
                return status;
            this.popScope(state, 'Item');
        }

        while (state.sequenceStack.length > 0) {
            const current = state.sequenceStack[state.sequenceStack.length - 1];
            const status = await this.reportConcern(context, {
                severity: ValidationConcernSeverity.ERROR,
                code: ValidationConcernCodes.SequenceMismatch,
                message: 'DataSet ended while a sequence was still open.',
                event: 'onEndDataSet',
                details: { openSequenceTagID: current.tagID }
            });
            if (this.isTerminalStatus(status))
                return status;
            state.sequenceStack.pop();
            if (state.pathStack.length > 0)
                state.pathStack.pop();
        }

        const forwardedStatus = await this.forward("onEndDataSet", context);

        state.isInDataSet = false;
        if ((this.currentScope(state) != null) && (this.currentScope(state).kind === 'DataSet'))
            this.popScope(state, 'DataSet');

        return forwardedStatus;

    }

    async onEndInstance(context) {

        context = this.ensureState(context);
        const state = this.getState(context);

        if (state.sequenceStack.length > 0) {
            const status = await this.reportConcern(context, {
                severity: ValidationConcernSeverity.ERROR,
                code: ValidationConcernCodes.SequenceMismatch,
                message: 'Instance ended while sequence scopes were still open.',
                event: 'onEndInstance'
            });
            if (this.isTerminalStatus(status))
                return status;
        }

        this.resetState(state);
        return await this.forward("onEndInstance", context);

    }

    async onError(context, error) {

        context = this.ensureState(context);
        const status = await this.reportConcern(context, {
            severity: ValidationConcernSeverity.ERROR,
            code: ValidationConcernCodes.ParserError,
            message: (error?.message || 'Parser/handler error encountered.'),
            event: 'onError',
            details: {
                name: (error?.name || null)
            }
        });

        if (this.isTerminalStatus(status))
            return status;

        return await this.forward("onError", context, error);

    }

    async onProgress(context, progress) {
        context = this.ensureState(context);
        return await this.forward("onProgress", context, progress);
    }

    constructor(nextHandler = null, options = null) {

        this.nextHandler = nextHandler;
        this._concerns = [];
        this._onConcern = null;
        this._goal = ValidationGoals.PERMISSIVE;
        this._isSessionActive = false;
        this._autoClearConcerns = true;

        if (typeof options === 'string') {
            this.goal = options;
        }
        else if (typeof options === 'boolean') {
            this.goal = options ? ValidationGoals.STRICT : ValidationGoals.PERMISSIVE;
        }
        else if (options != null) {
            if (options.goal != null)
                this.goal = options.goal;
            else if (options.mode != null)
                this.goal = options.mode;
            else if (options.isStrict === true)
                this.goal = ValidationGoals.STRICT;

            if (typeof options.onConcern === 'function')
                this.onConcern = options.onConcern;

            if (typeof options.autoClearConcerns === 'boolean')
                this._autoClearConcerns = options.autoClearConcerns;
        }

    }

};
