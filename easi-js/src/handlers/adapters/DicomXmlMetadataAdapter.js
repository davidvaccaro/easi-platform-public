//
// DicomXmlMetadataAdapter.js
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

import Instance from "../../dicom/Instance.js";
import Attribute from "../../dicom/Attribute.js";
import AttributeSequence from "../../dicom/AttributeSequence.js";
import Item from "../../dicom/Item.js";
import MetaSet from "../../dicom/MetaSet.js";
import DataSet from "../../dicom/DataSet.js";
import ValueRepresentation from "../../dicom/ValueRepresentation.js";
import Tag from "../../dicom/Tag.js";
import TransferSyntax from "../../dicom/TransferSyntax.js";
import DicomJsonMetadataAdapter from "./DicomJsonMetadataAdapter.js";
import Exception from "../../environment/Exception.js";
import { ParseErrorCodes } from "../../environment/Exception.js";
import { Status } from "../../parsers/Status.js";

const PersonNamePartOrder = ['FamilyName', 'GivenName', 'MiddleName', 'NamePrefix', 'NameSuffix'];

export default class DicomXmlMetadataAdapter extends DicomJsonMetadataAdapter {

    /**
     * Emit a DICOM attribute through the canonical downstream handler interface.
     * For sequences, emit a shell sequence and stream nested items/attributes from a snapshot
     * so downstream handlers do not mutate the source XML-materialized sequence object.
     * @param {object} context The adapter context.
     * @param {Attribute | AttributeSequence} attribute The attribute to emit.
     * @returns {*} The downstream status.
     */
    async emitAttribute(context, attribute) {

        if ((this.nextHandler == null) || (attribute instanceof AttributeSequence == false))
            return await super.emitAttribute(context, attribute);

        var sequenceShell = new AttributeSequence(
            attribute.tag,
            0,
            null,
            TransferSyntax.NONE
        );
        sequenceShell.isComplete = true;

        var sequenceStatus = await this.emitStatusEvent(context, "onStartSequence", sequenceShell);
        if (sequenceStatus == Status.SKIP) {
            return Status.CONTINUE;
        }
        if (sequenceStatus != undefined && sequenceStatus != null && sequenceStatus != Status.CONTINUE)
            return sequenceStatus;

        var items = (Array.isArray(attribute.items) == true) ? attribute.items.slice() : [];

        for (var i = 0; i < items.length; i++) {

            var itemStatus = await this.emitStatusEvent(context, "onStartItem");
            if (itemStatus == Status.SKIP)
                itemStatus = Status.CONTINUE;
            if (itemStatus != Status.CONTINUE)
                return itemStatus;

            var item = items[i];
            var itemAttributes = ((item != null) && Array.isArray(item.attributes) == true) ? item.attributes.slice() : [];
            for (var x = 0; x < itemAttributes.length; x++) {
                itemStatus = await this.emitAttribute(context, itemAttributes[x]);
                if (itemStatus != Status.CONTINUE)
                    return itemStatus;
            }

            itemStatus = await this.emitStatusEvent(context, "onEndItem");
            if (itemStatus == Status.SKIP)
                itemStatus = Status.CONTINUE;
            if (itemStatus != Status.CONTINUE)
                return itemStatus;

        }

        sequenceStatus = await this.emitStatusEvent(context, "onEndSequence", sequenceShell);
        return (sequenceStatus == Status.SKIP) ? Status.CONTINUE : sequenceStatus;

    }

    /**
     * Resolve an XML attribute value ignoring case.
     * @param {object} attributes The XML attributes object.
     * @param {string} name The attribute name.
     * @returns {string | null} The attribute value or null.
     */
    getXmlAttribute(attributes, name) {

        if (attributes == null)
            return null;

        if (attributes[name] != undefined)
            return attributes[name];

        const requested = name.toLowerCase();
        const keys = Object.keys(attributes);
        for (var i = 0; i < keys.length; i++) {
            if (keys[i].toLowerCase() == requested)
                return attributes[keys[i]];
        }

        return null;

    }

    /**
     * Resolve a DICOM tag for XML metadata, creating a tolerant fallback tag when the
     * local dictionary does not contain the specified standard tag identifier.
     * @param {string} tagID The normalized DICOM tag identifier (ggggeeee).
     * @param {ValueRepresentation | null} vr The parsed XML VR (if any).
     * @param {string | null} keyword The XML keyword attribute (if any).
     * @returns {Tag | null} The resolved or synthesized tag.
     */
    resolveXmlTag(tagID, vr, keyword = null) {

        if (tagID == null)
            return null;

        var tag = Tag.find(tagID);
        if (tag != null)
            return tag;

        const groupKey = tagID.substring(0, 4);
        const elementKey = tagID.substring(4, 8);
        const group = Number.parseInt(groupKey, 16);
        const element = Number.parseInt(elementKey, 16);

        return new Tag({
            ID: tagID,
            Tag: '(' + groupKey + ', ' + elementKey + ')',
            Group: group,
            Element: element,
            VR: vr,
            VM: { Exact: 1 },
            Name: ((keyword != null) && (String(keyword).trim().length > 0)) ? String(keyword).trim() : 'Unknown Tag',
            IsProtected: false,
            BasicProtectionAction: null,
            IsRetired: false,
            IsPrivate: Tag.isPrivateTag(group, element)
        });

    }

    /**
     * Normalize a DICOM tag identifier from XML (supports "(gggg,eeee)" and "ggggeeee").
     * @param {string} value The XML tag value.
     * @returns {string | null} The normalized DICOM tag identifier or null.
     */
    normalizeXmlTagID(value) {

        if (value == null)
            return null;

        const normalized = String(value)
            .replace(/[()\s,]/g, '')
            .toUpperCase();

        return (/^[0-9A-F]{8}$/).test(normalized) ? normalized : null;

    }

    /**
     * Find the nearest XML frame of the given kind.
     * @param {object} context The adapter context.
     * @param {string} kind The frame kind.
     * @returns {object | null} The matching frame.
     */
    findXmlFrame(context, kind) {

        if ((context == null) || (context.xmlStack == null))
            return null;

        for (var i = (context.xmlStack.length - 1); i >= 0; i--) {
            if ((context.xmlStack[i] != null) && (context.xmlStack[i].kind == kind))
                return context.xmlStack[i];
        }

        return null;

    }

    /**
     * Determine if text should be captured for the current XML frame.
     * @param {object | null} frame The XML frame.
     * @returns {boolean} TRUE when text should be accumulated.
     */
    shouldCaptureText(frame) {
        if (frame == null)
            return false;

        return (
            (frame.kind == 'Value')
            || (frame.kind == 'InlineBinary')
            || (frame.kind == 'PNRepresentation')
            || (frame.kind == 'PNPart')
        );
    }

    /**
     * Convert a textual XML value to a JavaScript primitive for selected DICOM VRs.
     * @param {ValueRepresentation | string | null} vr The DICOM VR.
     * @param {string} value The XML text value.
     * @returns {*} The converted value.
     */
    convertXmlValue(vr, value) {

        if (value == null)
            return null;

        var vrID = null;
        if (typeof vr == 'string')
            vrID = vr;
        else if ((vr != null) && (vr.ID != null))
            vrID = vr.ID;

        if (vrID == null)
            return value;

        const trimmed = value.trim();

        switch (vrID) {
            case 'US':
            case 'SS':
            case 'UL':
            case 'SL': {
                const number = Number.parseInt(trimmed, 10);
                return (Number.isFinite(number) == true) ? number : value;
            }
            case 'FL':
            case 'FD': {
                const number = Number.parseFloat(trimmed);
                return (Number.isFinite(number) == true) ? number : value;
            }
            case 'UV':
            case 'SV':
                try {
                    return BigInt(trimmed);
                }
                catch {
                    return value;
                }
            default:
                return value;
        }

    }

    /**
     * Build a DICOM person-name representation string from parsed XML parts.
     * @param {object} frame The PN representation frame.
     * @returns {string} The PN representation string.
     */
    buildPersonNameRepresentation(frame) {

        if ((frame == null) || (frame.parts == null))
            return (frame != null) ? frame.text.trim() : '';

        var values = [];

        for (var i = 0; i < PersonNamePartOrder.length; i++) {
            var part = frame.parts[PersonNamePartOrder[i]];
            values.push((part == null) ? '' : part);
        }

        // Remove trailing empty components.
        while ((values.length > 0) && (values[values.length - 1] === '')) {
            values.pop();
        }

        if (values.length == 0)
            return frame.text.trim();

        return values.join('^');

    }

    /**
     * Add a top-level attribute to the current instance meta-set or data-set.
     * @param {object} context The adapter context.
     * @param {Attribute | AttributeSequence} dataElement The DICOM data element.
     */
    addTopLevelAttribute(context, dataElement) {

        if ((context == null) || (context.instance == null) || (dataElement == null))
            return;

        var elementSet = null;

        if (dataElement.tag.Group == 2) {
            if (context.instance.metaSet == null)
                context.instance.metaSet = new MetaSet();
            elementSet = context.instance.metaSet;
        }
        else {
            if (context.instance.dataSet == null)
                context.instance.dataSet = new DataSet();
            elementSet = context.instance.dataSet;
        }

        elementSet.add(dataElement);

    }

    /**
     * Materialize a DICOM data element from an XML DicomAttribute frame.
     * @param {object} frame The XML DicomAttribute frame.
     * @returns {Attribute | AttributeSequence} The materialized data element.
     */
    buildDataElement(frame) {

        if ((frame == null) || (frame.tag == null))
            throw new Exception("Invalid DICOM XML metadata: Missing attribute tag.", ParseErrorCodes.InvalidElement);

        var vr = frame.vr;
        if (vr == null) {
            vr = (frame.tag != null) ? frame.tag.VR : null;
        }

        if ((vr == ValueRepresentation.SQ) || (frame.items.length > 0)) {

            var sequence = new AttributeSequence(frame.tag, 0, null, TransferSyntax.NONE);
            if ((frame.items != null) && (frame.items.length > 0)) {
                sequence.addAll(frame.items);
            }
            sequence.isComplete = true;
            return sequence;

        }

        var attribute = new Attribute(frame.tag, 0, null, TransferSyntax.NONE);

        if (frame.isBulkDataURI == true)
            attribute.isBulkDataURI = true;
        else if (frame.hasInlineBinary == true)
            attribute.isBulkDataURI = false;

        if ((frame.values == null) || (frame.values.length == 0)) {
            attribute.value = null;
        }
        else if (frame.values.length == 1) {
            attribute.value = frame.values[0];
        }
        else {
            attribute.value = frame.values;
        }

        attribute.isComplete = true;
        return attribute;

    }

    /**
     * Reset and prepare XML-specific adapter state.
     * @param {object | null} context The previous adapter context.
     * @returns {object} The new adapter context.
     */
    onStart(context) {

        context = super.onStart(context);

        context.xmlStack = [];
        context.instance = null;
        context.xmlNamespace = null;

        return context;

    }

    onStartDocument(context) {
        // XML document lifecycle start. NOOP.
    }

    /**
     * Consume XML start-element events and build Native DICOM Model parse state.
     * @param {object} context The adapter context.
     * @param {{localName:string,name:string,attributes:object,isSelfClosing:boolean}} element The XML element.
     */
    onStartElement(context, element) {

        const localName = (element != null) ? element.localName : null;
        const attributes = (element != null) ? element.attributes : null;

        switch (localName) {

            case 'NativeDicomModel': {
                context.instance = new Instance();
                context.xmlNamespace = this.getXmlAttribute(attributes, 'xmlns');
                context.xmlStack.push({ kind: 'NativeDicomModel' });
                return;
            }

            case 'DicomAttribute': {

                const tagID = this.normalizeXmlTagID(this.getXmlAttribute(attributes, 'tag'));
                if (tagID == null) {
                    throw new Exception("Invalid DICOM XML metadata: Missing or invalid DicomAttribute tag.", ParseErrorCodes.InvalidElement);
                }

                const keyword = this.getXmlAttribute(attributes, 'keyword');
                var vr = ValueRepresentation.find(this.getXmlAttribute(attributes, 'vr'));
                const tag = this.resolveXmlTag(tagID, vr, keyword);
                if (vr == null)
                    vr = (tag != null) ? tag.VR : null;

                context.xmlStack.push({
                    kind: 'DicomAttribute',
                    tag: tag,
                    vr: vr,
                    values: [],
                    items: [],
                    isBulkDataURI: false,
                    hasInlineBinary: false
                });
                return;

            }

            case 'Item':
                context.xmlStack.push({
                    kind: 'Item',
                    item: new Item()
                });
                return;

            case 'Value':
                context.xmlStack.push({
                    kind: 'Value',
                    text: ''
                });
                return;

            case 'InlineBinary':
                context.xmlStack.push({
                    kind: 'InlineBinary',
                    text: ''
                });
                return;

            case 'BulkData': {
                var bulkAttribute = this.findXmlFrame(context, 'DicomAttribute');
                if (bulkAttribute != null) {
                    bulkAttribute.isBulkDataURI = true;
                    bulkAttribute.values = [];
                    const bulkUri = this.getXmlAttribute(attributes, 'uri')
                        || this.getXmlAttribute(attributes, 'URI')
                        || this.getXmlAttribute(attributes, 'BulkDataURI');
                    bulkAttribute.values.push(bulkUri);
                }
                context.xmlStack.push({ kind: 'BulkData' });
                return;
            }

            case 'PersonName':
                context.xmlStack.push({
                    kind: 'PersonName',
                    value: {}
                });
                return;

            case 'Alphabetic':
            case 'Ideographic':
            case 'Phonetic':
                context.xmlStack.push({
                    kind: 'PNRepresentation',
                    key: localName,
                    parts: {},
                    text: ''
                });
                return;

            case 'FamilyName':
            case 'GivenName':
            case 'MiddleName':
            case 'NamePrefix':
            case 'NameSuffix':
                context.xmlStack.push({
                    kind: 'PNPart',
                    key: localName,
                    text: ''
                });
                return;

            default:
                context.xmlStack.push({
                    kind: 'Element',
                    name: localName,
                    text: ''
                });
                return;

        }

    }

    /**
     * Accumulate XML text for the active value-bearing parse frame.
     * @param {object} context The adapter context.
     * @param {{text:string}} text The XML text event payload.
     */
    onText(context, text) {

        if ((context == null) || (context.xmlStack == null) || (context.xmlStack.length == 0))
            return;

        var frame = context.xmlStack[context.xmlStack.length - 1];
        if (this.shouldCaptureText(frame) == false)
            return;

        frame.text += (text != null && text.text != null) ? text.text : '';

    }

    /**
     * Finalize XML elements and materialize DICOM values/attributes/instances.
     * @param {object} context The adapter context.
     * @param {{localName:string,name:string}} element The XML end-element payload.
     * @returns {* | void} Optional downstream status.
     */
    async onEndElement(context, element) {

        if ((context == null) || (context.xmlStack == null) || (context.xmlStack.length == 0))
            return;

        var frame = context.xmlStack.pop();

        if (frame == null)
            return;

        switch (frame.kind) {

            case 'Value': {
                var valueAttribute = this.findXmlFrame(context, 'DicomAttribute');
                if (valueAttribute != null) {
                    valueAttribute.values.push(
                        this.convertXmlValue(valueAttribute.vr, frame.text)
                    );
                }
                return;
            }

            case 'InlineBinary': {
                var inlineAttribute = this.findXmlFrame(context, 'DicomAttribute');
                if (inlineAttribute != null) {
                    inlineAttribute.hasInlineBinary = true;
                    inlineAttribute.isBulkDataURI = false;
                    inlineAttribute.values = [ frame.text ];
                }
                return;
            }

            case 'BulkData':
                return;

            case 'PNPart': {
                var pnRepresentation = this.findXmlFrame(context, 'PNRepresentation');
                if (pnRepresentation != null) {
                    pnRepresentation.parts[frame.key] = frame.text;
                }
                return;
            }

            case 'PNRepresentation': {
                var personNameFrame = this.findXmlFrame(context, 'PersonName');
                if (personNameFrame != null) {
                    personNameFrame.value[frame.key] = this.buildPersonNameRepresentation(frame);
                }
                return;
            }

            case 'PersonName': {
                var personNameAttribute = this.findXmlFrame(context, 'DicomAttribute');
                if (personNameAttribute != null) {
                    personNameAttribute.values.push(frame.value);
                }
                return;
            }

            case 'Item': {
                var sequenceAttribute = this.findXmlFrame(context, 'DicomAttribute');
                if (sequenceAttribute != null) {
                    sequenceAttribute.items.push(frame.item);
                }
                return;
            }

            case 'DicomAttribute': {

                var dataElement = this.buildDataElement(frame);
                var itemFrame = this.findXmlFrame(context, 'Item');

                if (itemFrame != null) {
                    itemFrame.item.add(dataElement);
                }
                else {
                    this.addTopLevelAttribute(context, dataElement);
                }

                return;
            }

            case 'NativeDicomModel': {

                if (context.instance == null)
                    return;

                if (this.nextHandler == null) {
                    context.results.push(context.instance);
                }
                else {
                    var status = await this.emitInstance(context, context.instance);
                    context.instance = null;
                    return status;
                }

                context.instance = null;
                return;
            }

            default:
                return;

        }

    }

    onEndDocument(context) {
        // XML document lifecycle end. NOOP.
    }

    /**
     * Create a new DICOM XML metadata adapter handler.
     * @param {object | null} nextHandler The downstream DICOM semantic handler.
     */
    constructor(nextHandler = null) {
        super(nextHandler);
    }

};
