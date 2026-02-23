//
// StreamingDicomJsonMetadataAdapterHandler.js - 1.0.0
//
// Streaming DICOM Metadata Adapter Handler Class
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

import Instance from "../dicom/Instance.js";
import Attribute from "../dicom/Attribute.js";
import AttributeSequence from "../dicom/AttributeSequence.js";
import Item from "../dicom/Item.js";
import MetaSet from "../dicom/MetaSet.js";
import DataSet from "../dicom/DataSet.js";
import ValueRepresentation from "../dicom/ValueRepresentation.js";
import Tag from "../dicom/Tag.js"
import TransferSyntax from "../dicom/TransferSyntax.js";
import { Status } from "../parsers/Status.js";

export default class StreamingDicomJsonMetadataAdapterHandler {

    /**
     * Defer downstream terminal control-flow statuses until the current metadata instance closes.
     * JSON parser control-flow should not be driven directly by downstream DICOM semantic handlers.
     * @param {object} context The adapter context.
     * @param {*} status The downstream status.
     * @returns {*} CONTINUE unless the status is FAIL/unsupported terminal.
     */
    deferInstanceStatus(context, status) {

        if ((status == null) || (status == Status.CONTINUE) || (status == Status.SKIP))
            return Status.CONTINUE;

        if (status == Status.JUMP) {
            context.skipRemainingInstanceAttributes = true;
            return Status.CONTINUE;
        }

        if (status == Status.STOP) {
            context.skipRemainingInstanceAttributes = true;
            context.stopAfterInstance = true;
            return Status.CONTINUE;
        }

        return status;

    }

    /**
     * Forward an event to the next handler when supported.
     * @param {string} name The event name.
     * @param {object} context The downstream handler context.
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
     * Normalize a handler status return to CONTINUE when omitted.
     * @param {*} status The handler-returned status.
     * @returns {*} The normalized status.
     */
    normalizeStatus(status) {
        return (status == null) ? Status.CONTINUE : status;
    }

    /**
     * Emit a canonical DICOM lifecycle event to the downstream handler.
     * @param {object} context The adapter context.
     * @param {string} name The canonical DICOM event name.
     * @param {*} param The event payload.
     * @returns {*} The normalized status.
     */
    async emitStatusEvent(context, name, param = null) {
        return this.normalizeStatus(
            await this.forward(name, context.nextContext, param)
        );
    }

    /**
     * Emit a DICOM attribute (or sequence) through the canonical downstream handler interface.
     * @param {object} context The adapter context.
     * @param {Attribute | AttributeSequence} attribute The attribute to emit.
     * @returns {*} The status returned by the downstream handler.
     */
    async emitAttribute(context, attribute) {

        if (attribute == null)
            return Status.CONTINUE;

        if (attribute instanceof AttributeSequence) {

            var sequenceStatus = await this.emitStatusEvent(context, "onStartSequence", attribute);
            if (sequenceStatus == Status.SKIP)
                return Status.CONTINUE;
            if (sequenceStatus != Status.CONTINUE)
                return sequenceStatus;

            // Iterate a snapshot because some downstream handlers (e.g. StreamingDicomInstanceHandler)
            // append items to the same sequence object while handling onStartItem/onStartSequence.
            // Iterating the live array can cause unbounded growth and infinite loops.
            var sequenceItems = (Array.isArray(attribute.items) == true) ? attribute.items.slice() : [];

            for (var i = 0; i < sequenceItems.length; i++) {

                var itemStatus = await this.emitStatusEvent(context, "onStartItem");
                if (itemStatus == Status.SKIP)
                    itemStatus = Status.CONTINUE;
                if (itemStatus != Status.CONTINUE)
                    return itemStatus;

                var item = sequenceItems[i];
                if ((item != null) && (item.attributes != null)) {
                    for (var x = 0; x < item.attributes.length; x++) {
                        itemStatus = await this.emitAttribute(context, item.attributes[x]);
                        if (itemStatus != Status.CONTINUE)
                            return itemStatus;
                    }
                }

                itemStatus = await this.emitStatusEvent(context, "onEndItem");
                if (itemStatus == Status.SKIP)
                    itemStatus = Status.CONTINUE;
                if (itemStatus != Status.CONTINUE)
                    return itemStatus;

            }

            sequenceStatus = await this.emitStatusEvent(context, "onEndSequence", attribute);
            return (sequenceStatus == Status.SKIP) ? Status.CONTINUE : sequenceStatus;

        }

        var status = await this.emitStatusEvent(context, "onStartAttribute", attribute);
        if (status == Status.SKIP)
            return Status.CONTINUE;
        if (status != Status.CONTINUE)
            return status;

        status = await this.emitStatusEvent(context, "onAppendAttribute", attribute);
        if (status == Status.SKIP)
            status = Status.CONTINUE;
        if (status != Status.CONTINUE)
            return status;

        status = await this.emitStatusEvent(context, "onEndAttribute", attribute);
        return (status == Status.SKIP) ? Status.CONTINUE : status;

    }

    /**
     * Emit all attributes from the given attribute-set.
     * @param {object} context The adapter context.
     * @param {MetaSet | DataSet} attributeSet The attribute set to emit.
     * @returns {*} The status returned by the downstream handler.
     */
    async emitAttributeSet(context, attributeSet) {

        if ((attributeSet == null) || (attributeSet.attributes == null))
            return Status.CONTINUE;

        for (var i = 0; i < attributeSet.attributes.length; i++) {
            var status = await this.emitAttribute(context, attributeSet.attributes[i]);
            if (status != Status.CONTINUE)
                return status;
        }

        return Status.CONTINUE;

    }

    /**
     * Emit the supplied instance through the canonical DICOM downstream handler interface.
     * @param {object} context The adapter context.
     * @param {Instance} instance The DICOM instance to emit.
     * @returns {*} The status returned by the downstream handler.
     */
    async emitInstance(context, instance) {

        var nextContext = await this.forward("onStartInstance", context.nextContext);
        if (nextContext != null) {
            context.nextContext = nextContext;
        }

        var status = Status.CONTINUE;
        var jumpRequested = false;
        var stopRequested = false;

        if (instance.preamble != null) {
            status = await this.emitStatusEvent(context, "onStartPreamble", instance.preamble);
            if (status == Status.JUMP)
                jumpRequested = true;
            else if (status == Status.STOP)
                stopRequested = true;
            else if (status != Status.CONTINUE)
                return status;
            if ((jumpRequested == false) && (stopRequested == false)) {
                status = await this.emitStatusEvent(context, "onEndPreamble", instance.preamble);
                if (status == Status.JUMP)
                    jumpRequested = true;
                else if (status == Status.STOP)
                    stopRequested = true;
                else if (status != Status.CONTINUE)
                    return status;
            }
        }

        if (instance.prefix != null) {
            status = await this.emitStatusEvent(context, "onStartPrefix", instance.prefix);
            if (status == Status.JUMP)
                jumpRequested = true;
            else if (status == Status.STOP)
                stopRequested = true;
            else if (status != Status.CONTINUE)
                return status;
            if ((jumpRequested == false) && (stopRequested == false)) {
                status = await this.emitStatusEvent(context, "onEndPrefix", instance.prefix);
                if (status == Status.JUMP)
                    jumpRequested = true;
                else if (status == Status.STOP)
                    stopRequested = true;
                else if (status != Status.CONTINUE)
                    return status;
            }
        }

        if (instance.metaSet != null) {
            status = await this.emitStatusEvent(context, "onStartMetaSet");
            if (status == Status.JUMP)
                jumpRequested = true;
            else if (status == Status.STOP)
                stopRequested = true;
            else if (status != Status.CONTINUE)
                return status;
            if ((jumpRequested == false) && (stopRequested == false)) {
                status = await this.emitAttributeSet(context, instance.metaSet);
                if (status == Status.JUMP)
                    jumpRequested = true;
                else if (status == Status.STOP)
                    stopRequested = true;
                else if (status != Status.CONTINUE)
                    return status;
            }
            status = await this.emitStatusEvent(context, "onEndMetaSet");
            if (status == Status.JUMP)
                jumpRequested = true;
            else if (status == Status.STOP)
                stopRequested = true;
            else if (status != Status.CONTINUE)
                return status;
        }

        if (instance.dataSet != null) {
            status = await this.emitStatusEvent(context, "onStartDataSet");
            if (status == Status.JUMP)
                jumpRequested = true;
            else if (status == Status.STOP)
                stopRequested = true;
            else if (status != Status.CONTINUE)
                return status;
            if ((jumpRequested == false) && (stopRequested == false)) {
                status = await this.emitAttributeSet(context, instance.dataSet);
                if (status == Status.JUMP)
                    jumpRequested = true;
                else if (status == Status.STOP)
                    stopRequested = true;
                else if (status != Status.CONTINUE)
                    return status;
            }
            status = await this.emitStatusEvent(context, "onEndDataSet");
            if (status == Status.JUMP)
                jumpRequested = true;
            else if (status == Status.STOP)
                stopRequested = true;
            else if (status != Status.CONTINUE)
                return status;
        }

        var result = await this.forward("onEndInstance", context.nextContext);
        if (result != null) {
            context.result = result;
        }

        if (stopRequested == true) {
            return Status.STOP;
        }

        return Status.CONTINUE;

    }

    /**
     * Begin incremental canonical DICOM semantic emission for a metadata instance.
     * @param {object} context The adapter context.
     */
    async startIncrementalInstance(context) {

        // Reset incremental instance emission state.
        context.isMetaSetOpen = false;
        context.isDataSetOpen = false;
        context.skipRemainingInstanceAttributes = false;
        context.stopAfterInstance = false;

        // Start the downstream instance context.
        var nextContext = await this.forward("onStartInstance", context.nextContext);
        if (nextContext != null) {
            context.nextContext = nextContext;
        }

    }

    /**
     * Ensure the appropriate top-level attribute-set lifecycle has been started for the current attribute.
     * @param {object} context The adapter context.
     * @param {Tag} tag The current top-level tag.
     * @returns {*} The resulting status.
     */
    async ensureTopLevelAttributeSet(context, tag) {

        if (tag == null)
            return Status.CONTINUE;

        // Group 0002 attributes are part of the File Meta Information set.
        if (tag.Group == 2) {

            // If the data-set is already open, preserve tolerant behavior and emit the attribute into the
            // current open set rather than attempting to reopen the meta-set out-of-order.
            if (context.isDataSetOpen == true)
                return Status.CONTINUE;

            if (context.isMetaSetOpen == false) {
                var metaStartStatus = await this.emitStatusEvent(context, "onStartMetaSet");
                if (metaStartStatus == Status.CONTINUE) {
                    context.isMetaSetOpen = true;
                }

                return this.deferInstanceStatus(context, metaStartStatus);
            }

            return Status.CONTINUE;

        }

        // Non-group-0002 attributes belong to the data-set.
        if (context.isMetaSetOpen == true) {
            var metaEndStatus = await this.emitStatusEvent(context, "onEndMetaSet");
            context.isMetaSetOpen = false;

            metaEndStatus = this.deferInstanceStatus(context, metaEndStatus);
            if (metaEndStatus != Status.CONTINUE)
                return metaEndStatus;
        }

        if (context.isDataSetOpen == false) {
            var dataStartStatus = await this.emitStatusEvent(context, "onStartDataSet");
            if (dataStartStatus == Status.CONTINUE) {
                context.isDataSetOpen = true;
            }

            return this.deferInstanceStatus(context, dataStartStatus);
        }

        return Status.CONTINUE;

    }

    /**
     * Emit a completed top-level metadata attribute incrementally through the canonical DICOM handler chain.
     * @param {object} context The adapter context.
     * @param {Attribute | AttributeSequence} attribute The completed attribute.
     * @returns {*} The resulting status.
     */
    async emitTopLevelAttribute(context, attribute) {

        if (context.skipRemainingInstanceAttributes == true)
            return Status.CONTINUE;

        var status = await this.ensureTopLevelAttributeSet(context, attribute.tag);
        if (status != Status.CONTINUE)
            return status;

        if (context.skipRemainingInstanceAttributes == true)
            return Status.CONTINUE;

        status = await this.emitAttribute(context, attribute);
        return this.deferInstanceStatus(context, status);

    }

    /**
     * Finalize incremental canonical DICOM semantic emission for the current metadata instance.
     * @param {object} context The adapter context.
     * @returns {*} CONTINUE or STOP for the parser.
     */
    async endIncrementalInstance(context) {

        var status = Status.CONTINUE;

        if (context.isMetaSetOpen == true) {
            status = this.deferInstanceStatus(
                context,
                await this.emitStatusEvent(context, "onEndMetaSet")
            );
            context.isMetaSetOpen = false;
            if (status != Status.CONTINUE)
                return status;
        }

        if (context.isDataSetOpen == true) {
            status = this.deferInstanceStatus(
                context,
                await this.emitStatusEvent(context, "onEndDataSet")
            );
            context.isDataSetOpen = false;
            if (status != Status.CONTINUE)
                return status;
        }

        var result = await this.forward("onEndInstance", context.nextContext);
        if (result != null) {
            context.result = result;
        }

        return (context.stopAfterInstance == true) ? Status.STOP : Status.CONTINUE;

    }

    /**
     * Get the parent metadata parse node for the current attribute/object stack frame.
     * @param {object} context The adapter context.
     * @returns {*} The parent stack frame or null when at the metadata-instance root.
     */
    getStackParent(context) {
        return (context.stack.length > 1) ? context.stack[context.stack.length - 2] : null;
    }

    /**
     * Get the current metadata attribute parse state from the adapter stack.
     * This is safer than using context.attribute directly because nested attribute parsing
     * can overwrite the pointer while parent attribute objects are still open.
     * @param {object} context The adapter context.
     * @returns {object | null} The current attribute parse state or null.
     */
    getCurrentAttributeState(context) {

        if ((context == null) || (context.stack == null) || (context.stack.length == 0))
            return null;

        for (var i = (context.stack.length - 1); i >= 0; i--) {
            var node = context.stack[i];
            if ((node != null) && (node instanceof Item == false) && Object.prototype.hasOwnProperty.call(node, 'tag')) {
                return node;
            }
        }

        return null;

    }

    /**
     * Begin canonical DICOM semantic emission for a sequence attribute in streaming mode.
     * @param {object} context The adapter context.
     * @param {object} attributeState The current metadata attribute parse state.
     * @returns {*} The resulting status.
     */
    async beginSequenceSemantic(context, attributeState) {

        if ((this.nextHandler == null) || (attributeState == null))
            return Status.CONTINUE;

        if (attributeState.vr != ValueRepresentation.SQ)
            return Status.CONTINUE;

        if ((attributeState._adapterSequenceStarted == true) || (attributeState._adapterSequenceSuppressed == true))
            return Status.CONTINUE;

        if (attributeState._adapterSequence == null) {
            attributeState._adapterSequence = new AttributeSequence(
                attributeState.tag,
                0,
                null,
                TransferSyntax.NONE
            );
        }

        // If the instance is already being skipped due to deferred JUMP/STOP, suppress this sequence.
        if (context.skipRemainingInstanceAttributes == true) {
            attributeState._adapterSequenceSuppressed = true;
            return Status.CONTINUE;
        }

        // Top-level sequence attributes require meta-set/data-set lifecycle management.
        var parent = this.getStackParent(context);
        if (parent == null) {
            var setStatus = await this.ensureTopLevelAttributeSet(context, attributeState._adapterSequence.tag);
            if (setStatus != Status.CONTINUE)
                return setStatus;

            if (context.skipRemainingInstanceAttributes == true) {
                attributeState._adapterSequenceSuppressed = true;
                return Status.CONTINUE;
            }
        }

        var status = await this.emitStatusEvent(context, "onStartSequence", attributeState._adapterSequence);

        if (status == Status.SKIP) {
            attributeState._adapterSequenceSuppressed = true;
            return Status.CONTINUE;
        }

        if ((status == Status.JUMP) || (status == Status.STOP)) {
            attributeState._adapterSequenceSuppressed = true;
            return this.deferInstanceStatus(context, status);
        }

        if (status != Status.CONTINUE)
            return status;

        attributeState._adapterSequenceStarted = true;
        return Status.CONTINUE;

    }

    /**
     * End canonical DICOM semantic emission for a sequence attribute in streaming mode.
     * @param {object} context The adapter context.
     * @param {object} attributeState The current metadata attribute parse state.
     * @returns {*} The resulting status.
     */
    async endSequenceSemantic(context, attributeState) {

        if ((this.nextHandler == null) || (attributeState == null))
            return Status.CONTINUE;

        // If sequence start was never emitted yet, attempt to emit it now (handles empty sequences).
        if ((attributeState._adapterSequenceStarted != true) && (attributeState._adapterSequenceSuppressed != true)) {
            var startStatus = await this.beginSequenceSemantic(context, attributeState);
            if (startStatus != Status.CONTINUE)
                return startStatus;
        }

        // If the sequence was skipped/suppressed, no semantic end event is required.
        if (attributeState._adapterSequenceStarted != true)
            return Status.CONTINUE;

        if (attributeState._adapterSequence != null) {
            attributeState._adapterSequence.isComplete = true;
        }

        var status = await this.emitStatusEvent(context, "onEndSequence", attributeState._adapterSequence);
        return this.deferInstanceStatus(context, status);

    }

    /**
     * Begin canonical DICOM semantic emission for a sequence item.
     * @param {object} context The adapter context.
     * @param {Item} item The current item parse state.
     * @param {object} sequenceState The parent sequence attribute parse state.
     * @returns {*} The resulting status.
     */
    async beginItemSemantic(context, item, sequenceState) {

        if ((this.nextHandler == null) || (item == null))
            return Status.CONTINUE;

        item._adapterItemStarted = false;
        item._adapterSkipSemantic = true;

        if ((sequenceState == null) || (sequenceState._adapterSequenceStarted != true))
            return Status.CONTINUE;

        if (context.skipRemainingInstanceAttributes == true)
            return Status.CONTINUE;

        var status = await this.emitStatusEvent(context, "onStartItem");

        if (status == Status.SKIP)
            return Status.CONTINUE;

        if ((status == Status.JUMP) || (status == Status.STOP))
            return this.deferInstanceStatus(context, status);

        if (status != Status.CONTINUE)
            return status;

        item._adapterItemStarted = true;
        item._adapterSkipSemantic = false;

        return Status.CONTINUE;

    }

    /**
     * End canonical DICOM semantic emission for a sequence item.
     * @param {object} context The adapter context.
     * @param {Item} item The current item parse state.
     * @returns {*} The resulting status.
     */
    async endItemSemantic(context, item) {

        if ((this.nextHandler == null) || (item == null))
            return Status.CONTINUE;

        if (item._adapterItemStarted != true)
            return Status.CONTINUE;

        var status = await this.emitStatusEvent(context, "onEndItem");
        return this.deferInstanceStatus(context, status);

    }

    /**
     * Emit a completed non-top-level DICOM attribute through the canonical semantic handler chain.
     * @param {object} context The adapter context.
     * @param {Attribute} attribute The completed attribute.
     * @param {*} parent The parent metadata parse stack frame.
     * @returns {*} The resulting status.
     */
    async emitNestedAttributeSemantic(context, attribute, parent) {

        if ((this.nextHandler == null) || (attribute == null))
            return Status.CONTINUE;

        if (context.skipRemainingInstanceAttributes == true)
            return Status.CONTINUE;

        if ((parent instanceof Item) && (parent._adapterSkipSemantic == true))
            return Status.CONTINUE;

        var status = await this.emitAttribute(context, attribute);
        return this.deferInstanceStatus(context, status);

    }

    onReset() {

        if ((this.nextHandler != null) && (this.nextHandler.onReset != null)) {
            this.nextHandler.onReset();
        }

    }

    onStart(context) {

        // Setup the context based on the previous context
        if (context == null) {

            // Create the initial context
            context = {
                instance: null,
                attribute: null,
                tag: null,
                item: null,
                value: null,
                stack: [],
                results: [],
                nextContext: null,
                result: null,
                isMetaSetOpen: false,
                isDataSetOpen: false,
                skipRemainingInstanceAttributes: false,
                stopAfterInstance: false
            };

        }

        return context;

    }

    async onStartObject(context) {
        
        // If there is NO current instance, then this MUST be a new instance object, otherwise an attribute
        if (context.instance == null) {

            // Create the new instance
            context.instance = new Instance();

            // When a downstream DICOM semantic handler is present, begin incremental instance emission now.
            if (this.nextHandler != null) {
                await this.startIncrementalInstance(context);
            }

        }
        else {
            
            // Handle starting a new "attribute" versus an "item"
            if (context.tag != null) {

                // Create the attribute if needed
                context.attribute = { tag: context.tag };

                // Push the attribute onto the stack
                context.stack.push(context.attribute);

                // Null out the tag
                context.tag = null;

            }
            else {

                // Peek the current top of the stack
                var top = (context.stack.length > 0) ? context.stack[context.stack.length - 1] : null;

                // If the "top" is a sequence, add the sequence item, otherwise this is an object value
                if ((top != null) && (top.tag != null) && ((top.vr == ValueRepresentation.SQ) || (top.tag.VR == ValueRepresentation.SQ))) {

                    // Create the item
                    context.item = new Item();

                    // Push the item onto the stack
                    context.stack.push(context.item);

                    // Emit the semantic item start incrementally (streaming mode only).
                    if (this.nextHandler != null) {
                        var itemStatus = await this.beginItemSemantic(context, context.item, top);
                        if (itemStatus != Status.CONTINUE)
                            return itemStatus;
                    }

                }
                else {

                    // This condition happens when the value is an object
                    // EXAMPLE: "Value": [{ "Alphabetic": "ACRIN-NSCLC-FDG-PET-042" }]

                    // Crreat the object value
                    context.value = {};

                    // Push the value onto the stack
                    context.stack.push(context.value);

                }

            }

        }

    }

    onStartArray(context) {
        
        // If there is NO current instance, then this MUST be the inial array, otherwise a Value
        if (context.instance == null) {

            // Nothing to do here since the "result" array is setup within onStart

        }
        else {

            var attribute = this.getCurrentAttributeState(context);

            // Initialize the current value
            if (attribute != null)
                attribute.value = [];

            // Null the current parsed value
            context.value = null;

        }

    }

    onEndArray(context) {
    }

    onStartAttribute(context, name) {

        var attribute = this.getCurrentAttributeState(context);

        // Handle the attribute type
        switch (name.toLowerCase()) {

            // Handle the value-representation of the current DICOM attribute
            case 'vr':
                // Initiate the start of the VR
                if (attribute != null)
                    attribute.vr = null;
            break;

            // Handle the value of the current DICOM attribute
            case 'value':
                // Initiate the start of the value
                if (attribute != null)
                    attribute.value = null;
            break;

            // Handle the Bulk Data URI value
            case 'bulkdatauri':
                if (attribute != null) {
                    attribute.isBulkDataURI = true;
                    attribute.value = null;
                }
            break;

            // Handle inline binary value (base64-encoded)
            case 'inlinebinary':
                if (attribute != null) {
                    attribute.isBulkDataURI = false;
                    attribute.value = null;
                }
            break;

            // Handle skipped/ignored key types
            case 'alphabetic':
            case 'ideographic':
            case 'phonetic':
                if (context.value == null) {
                    context.value = {};
                }
                context.value.type = name.toLowerCase();
                break;

            // Handle the tag-identifier of the current DICOM attribute
            default:
                // Set the tag
                context.tag = Tag.find(name);
            break;

        }

    }

    onStartNumber(context, value) {
    }

    onStartBoolean(context, value) {
    }

    onStartNull(context) {
    }

    onStartString(context, value) {

        // Capture the current value
        if (context.value == null) {
            context.value = value;
        }
        else {
            context.value.value = value;
        }

    }

    onAppendString(context, value) {

        // Append to the current scalar string or object-string field.
        if (typeof context.value === 'string') {
            context.value += value;
        }
        else {
            context.value.value += value;
        }

    }

    async onEndString(context) {

        var attribute = this.getCurrentAttributeState(context);
        if (attribute == null) {
            context.value = null;
            return Status.CONTINUE;
        }

        // Process the current string value based on the "type" of string
        if (attribute.vr == null) {
            attribute.vr = ValueRepresentation.find(context.value);

            // Start sequence semantic streaming as soon as VR=SQ is known so items can stream incrementally.
            if ((this.nextHandler != null) && (attribute.vr == ValueRepresentation.SQ)) {
                var status = await this.beginSequenceSemantic(context, attribute);
                if (status != Status.CONTINUE)
                    return status;
            }
        }
        else {
            
            // Create the attribute value array (if needed)
            if (attribute.value == null) {
                attribute.value = [];
            }

            // Add the current value to the attribute value array
            attribute.value.push(context.value);

        }

        // Clear the current value
        context.value = null;        

    }
    
    async onEndObject(context) {

        // Objects in the stack are either an attribute (object) or an Item or empty inplying the instance
        
        // Establish the current object (if any)
        var current = (context.stack.length > 0) ? context.stack[context.stack.length - 1] : null;

        // Pop the stack
        context.stack.pop();

        // Peek the current top of the stack
        var top = (context.stack.length > 0) ? context.stack[context.stack.length - 1] : null;

        // Refresh the current attribute pointer to avoid stale nested references.
        context.attribute = this.getCurrentAttributeState(context);

        // If there is a current 
        if (current != null) {

            // If the current element is an Item
            if (current instanceof Item) {
                if (this.nextHandler == null) {

                    // If there is NOT yet a collection of elements
                    if (top.elements == null) {
                        top.elements = [];
                    }

                    // Push the item
                    top.elements.push(current);

                }
                else {

                    var itemEndStatus = await this.endItemSemantic(context, current);
                    if (itemEndStatus != Status.CONTINUE)
                        return itemEndStatus;

                }

            }
            else if (current.tag == null) {

                // Nothing to do here as the attribute value array should already be populated the object value
                var xxx = 100;

            }
            else {

                var dataElement = null;

                // Create the attribute from the details collected previously
                if (current.vr == ValueRepresentation.SQ) {

                    // Reuse the streaming sequence object when semantic streaming is enabled, otherwise materialize.
                    if ((this.nextHandler != null) && (current._adapterSequence != null)) {
                        dataElement = current._adapterSequence;
                    }
                    else {

                        // Create the data element
                        dataElement = new AttributeSequence(current.tag, 0, null, TransferSyntax.NONE);
        
                        // Populate any data-elements
                        if ((current.elements != null) && (current.elements.length > 0)) {
                            dataElement.addAll(current.elements);
                        }

                    }
    
                }
                else {
    
                    // Create the value attribute
                    dataElement = new Attribute(current.tag, 0, null, TransferSyntax.NONE);
    
                    // TODO - decode the value
    
                    // Normalize DICOMweb metadata single-valued arrays to the native DICOM semantic shape.
                    if ((Array.isArray(current.value) == true) && (current.value.length == 1)) {
                        dataElement.value = current.value[0];
                    }
                    else {
                        dataElement.value = current.value;
                    }
    
                    // Indicate that the data-element is complete
                    dataElement.isComplete = true;
    
                }
    
                // If there is a top item on the stack, add the element to the list of elements, otherwise add to the instance
                if (top != null) {

                    if (this.nextHandler == null) {

                        // If there is NOT yet a collection of elements
                        if (top.elements == null) {
                            top.elements = [];
                        }
        
                        // Push the data-element
                        top.elements.push(dataElement);

                    }
                    else if (dataElement instanceof AttributeSequence) {

                        // Sequence start/items stream incrementally; close it now.
                        var sequenceEndStatus = await this.endSequenceSemantic(context, current);
                        if (sequenceEndStatus != Status.CONTINUE)
                            return sequenceEndStatus;

                    }
                    else {

                        // Nested non-sequence attributes within items can stream immediately on close.
                        var nestedStatus = await this.emitNestedAttributeSemantic(context, dataElement, top);
                        if (nestedStatus != Status.CONTINUE)
                            return nestedStatus;

                    }
    
                }
                else {

                    if (this.nextHandler == null) {

                        var elementSet = null;
        
                        // Determine the attribute-set to add this data-element to
                        if (dataElement.tag.Group == 2) {
        
                            // Create the meta-set if needed
                            if (context.instance.metaSet == null) {
                                context.instance.metaSet = new MetaSet();
                            }
        
                            // Set the current element-set
                            elementSet = context.instance.metaSet;
        
                        }
                        else {
        
                            // Create the data-set if needed
                            if (context.instance.dataSet == null) {
                                context.instance.dataSet = new DataSet();
                            }
        
                            // Set the current element-set
                            elementSet = context.instance.dataSet;
        
                        }

                        // Add to the instance for adapter-only materialization mode.
                        elementSet.add(dataElement);

                    }
                    else if (dataElement instanceof AttributeSequence) {

                        // Top-level sequence start/items stream incrementally; close it now.
                        var topSequenceEndStatus = await this.endSequenceSemantic(context, current);
                        if (topSequenceEndStatus != Status.CONTINUE)
                            return topSequenceEndStatus;

                    }
                    else {

                        // Emit top-level attributes incrementally into the canonical DICOM semantic handler chain.
                        var emittedStatus = await this.emitTopLevelAttribute(context, dataElement);
                        if (emittedStatus != Status.CONTINUE)
                            return emittedStatus;

                    }
                    
                }

            }

        }
        else {

            if (this.nextHandler == null) {
                // Without a downstream handler, preserve parsed instances as adapter results.
                context.results.push(context.instance);
            }
            else {
                var status = await this.endIncrementalInstance(context);
                if (status != Status.CONTINUE) {
                    context.instance = null;
                    return status;
                }
            }

            // Init the instance
            context.instance = null;       

        }

    }

    onEndAttribute(context, name) {
    }

    onEndNumber(context, value) {

        var attribute = this.getCurrentAttributeState(context);
        if (attribute == null) {
            context.value = null;
            return;
        }

        // Create the attribute value array (if needed)
        if (attribute.value == null) {
            attribute.value = [];
        }

        // Add the current value to the attribute value array
        attribute.value.push(value);

        // Clear the current value
        context.value = null;            

    }

    onEndBoolean(context, value) {

        var attribute = this.getCurrentAttributeState(context);
        if (attribute == null) {
            context.value = null;
            return;
        }

        // Create the attribute value array (if needed)
        if (attribute.value == null) {
            attribute.value = [];
        }

        // Add the current value to the attribute value array
        attribute.value.push(value);

        // Clear the current value
        context.value = null;

    }

    onEndNull(context) {

        var attribute = this.getCurrentAttributeState(context);
        if (attribute == null) {
            context.value = null;
            return;
        }

        // Create the attribute value array (if needed)
        if (attribute.value == null) {
            attribute.value = [];
        }

        // Add the current value to the attribute value array
        attribute.value.push(null);

        // Clear the current value
        context.value = null;

    }
    
    onEnd(context) {
        
        // Return the downstream result when available, otherwise return parsed instances.
        if (context.result != null) {
            return context.result;
        }

        return context.results;
        
    }

    async onError(context, error) {
        return await this.forward("onError", (context != null) ? context.nextContext : null, error);
    }

    async onProgress(context, progress) {
        return await this.forward("onProgress", (context != null) ? context.nextContext : null, progress);
    }

    /**
     * Create a new DICOM JSON metadata adapter handler.
     * @param {object | null} nextHandler The downstream DICOM semantic handler.
     */
    constructor(nextHandler = null) {
        this.nextHandler = nextHandler;
    }

};
