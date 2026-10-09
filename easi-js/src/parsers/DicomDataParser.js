//
// DicomDataParser.js
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

import Constants from '../dicom/Constants.js';
import Utilities from '../dicom/Utilities.js';
import Exception from '../environment/Exception.js';
import { DicomErrorCodes } from '../environment/Exception.js';

import DataParser from './DataParser.js';
import { Status } from './Status.js';

import TransferSyntax from '../dicom/TransferSyntax.js';

import ValueRepresentation from '../dicom/ValueRepresentation.js';
import { ValueRepresentations } from '../dicom/ValueRepresentation.js';

import Tag from '../dicom/Tag.js';

import EncodedData from '../dicom/EncodedData.js';
import Attribute from '../dicom/Attribute.js';
import Item from '../dicom/Item.js';
import AttributeSequence from '../dicom/AttributeSequence.js';

import Preamble from '../dicom/Preamble.js';
import Prefix from '../dicom/Prefix.js';

//
// General Layout of DICOM files
//
// Preamble                   128 bytes 
// Prefix (DICM)                4 bytes
// File Meta Information Tags   N bytes
// General Data Tags            N bytes
// Payload Data Tags            N bytes
//   - PixelData
//

const DicomPartType = {
    Preamble: 'Preamble',
    Prefix: 'Prefix',
    MetaSet: 'MetaSet',
    DataSet: 'DataSet'
};

// Populate the part specification (Part-10)
const DicomPart10Specification = [ 
    DicomPartType.DataSet,
    DicomPartType.MetaSet, 
    DicomPartType.Prefix, 
    DicomPartType.Preamble 
];

// Populate the part specification (Part-5)
const DicomDataSetSpecification = [ 
    DicomPartType.DataSet
];

// Parse Part-10 file meta for transfer-syntax routing, then jump to dataset.
const DicomPart10MetaSetSkipSpecification = [
    DicomPartType.DataSet,
    DicomPartType.MetaSet
];

const DicomBulkDataPolicyMode = {
    Materialize: 'materialize',
    Auto: 'auto',
    Stream: 'stream'
};

const DefaultBulkPayloadCandidateVRs = new Set([
    'OB',
    'OD',
    'OF',
    'OL',
    'OV',
    'OW',
    'UN',
    'UT'
]);

const DefaultBulkPayloadCandidateTagIDs = new Set([
    '7FE00010', // PixelData
    '7FE00008', // FloatPixelData
    '7FE00009', // DoubleFloatPixelData
    '56000020', // SpectroscopyData
    '54001010', // WaveformData
    '00420011'  // EncapsulatedDocument
]);

const ExplicitVRLongLengthIDs = new Set([
    'OB',
    'OD',
    'OF',
    'OL',
    'OV',
    'OW',
    'SQ',
    'SV',
    'UC',
    'UR',
    'UT',
    'UV',
    'UN'
]);

export default class DicomDataParser extends DataParser {

    /**
     * Reset the current state of the parser.
     */
    reset() {

        // Indicate if the prefix was processed
        this.processedPrefix = false;
        this.detectedPrefix = false;

        // Reset the part sequence
        this.partSequence = Utilities.deepCopyArray(this.partSpecification);

        // The default meta-set part length
        this.metaSetGroupLength = 0;

        // The default data-set transfer-syntax
        this.dataSetTransferSyntax = TransferSyntax.NONE;
        this.endSequenceMarker = Utilities.getEndSequence(true);

        // Init the part consumed
        this.totalBytesConsumed = 0;

        // Set the part "start" flag
        this.partStarted = false;

        // Set the current part bytes start
        this.partStart = 0;

        // Set the current part to "preamble"
        this.partType = null;

        // Set the current part
        this.part = null;
        this.skipPart10MetaSet = false;

        // Init the current data-element
        this.dataElement = null;
        this.dataElementBytesConsumed = 0;
        this.dataElementStreamingDecision = null;
        this.undefinedItemBytesRemaining = 0;
        this.undefinedItemCount = 0;

        // Init the data-element stack
        this.dataElements = [];

        // Create the new DICOM data buffer
        this.data = new EncodedData();

        // Init the current status
        this.status = Status.CONTINUE;

        // Init the current data-element status
        this.dataElementStatus = Status.CONTINUE;

        // Reset the handler
        this.fireStreamEvent("onReset");            

        // Clear the current bytes-processed
        this.bytesRead = 0;
        this.bytesProcessed = 0;
        this.bytesTotal = 0;

    }

    /**
     * Resolve active parser endian-ness.
     * @returns {boolean} TRUE for little-endian, FALSE for big-endian.
     */
    get isLittleEndianTransferSyntax() {
        return (this.data?.transferSyntax?.IsLittleEndian != false);
    }

    /**
     * Convert byte-array to unsigned integer using current transfer-syntax endian-ness.
     * @param {Uint8Array} bytes Source bytes.
     * @returns {number | undefined} Parsed integer.
     */
    bytesToUnsignedInteger(bytes) {
        return Utilities.bytesToUnsignedInteger(bytes, this.isLittleEndianTransferSyntax);
    }

    /**
     * Resolve the DICOM Item/Sequence Delimitation marker for current transfer-syntax endian-ness.
     * @returns {number[]} Marker bytes.
     */
    getEndSequenceMarker() {
        return this.endSequenceMarker;
    }

    /**
     * Peek the next, transfer-syntax independent, base tag details.
     * @returns The peeked local tag details.
     */
    peekTagDetails(bytesPeeked = 0) {

        var result = null;

        try {

            // Peek the next data-element "group"
            var group = this.data.peek(bytesPeeked, Constants.GroupLength);

            if ((group == null) || (group.length != Constants.GroupLength))
                return false;

            // Increment the bytes peeked
            bytesPeeked += Constants.GroupLength;

            // Peek the next data-element "element"
            var element = this.data.peek(bytesPeeked, Constants.ElementLength);

            if ((element == null) || (element.length != Constants.ElementLength))
                return false;

            // Increment the bytes peeked
            bytesPeeked += Constants.ElementLength;

            // Establish the DICOM data-element tag identifier
            var identifier = Tag.identifier(
                this.bytesToUnsignedInteger(group),
                this.bytesToUnsignedInteger(element)
            );

            // Establish the DICOM Tag
            var tag = Tag.find(identifier);

            // If the tag is a sequence control tag, 
            if ((tag == Tag.Item) || (tag == Tag.ItemDelimitationItem) || (tag == Tag.SequenceDelimitationItem)) {

                // Initialize the value-length
                let valueLength = null;

                // Peek the next 4-byte value length
                let length = this.data.peek(bytesPeeked, Constants.ValueLength32);

                if ((length == null) || (length.length != Constants.ValueLength32))
                    return false;

                // Increment the bytes peeked
                bytesPeeked += Constants.ValueLength32;

                // Convert the bytes to a the value-length
                valueLength = this.bytesToUnsignedInteger(length);

                // Construct the "sequence control" tag details 
                result = {
                    bytesPeeked: bytesPeeked,
                    group: group,
                    element: element,
                    tag: tag,
                    valueRepresentation: tag.valueRepresentation,
                    valueLength: valueLength
                };
        
            }
            else {

                // Initialize the value-length
                let valueLength = null;

                // Handle "Explicit" versus "Implicit" data-element processing
                // Explicit: 
                //  - With VR of AE, AS, AT, CS, DA, DS, DT, FL, FD, IS, LO, LT, PN, SH, SL, SS, ST, TM, UI, UL and US:  
                //      https://dicom.nema.org/medical/dicom/current/output/chtml/part05/chapter_7.html#table_7.1-2
                //  - Otherwise: 
                //      https://dicom.nema.org/medical/dicom/current/output/chtml/part05/chapter_7.html#table_7.1-1
                // Implicit:
                //  - https://dicom.nema.org/medical/dicom/current/output/chtml/part05/chapter_7.html#table_7.1-3
                if (this.data.transferSyntax.IsExplicit == true) {

                    // Peek the next data-element "value-representation"
                    var vr = this.data.peek(bytesPeeked, Constants.ValueRepresentationLength);

                    if ((vr == null) || (vr.length != Constants.ValueRepresentationLength))
                        return false;

                    // Increment the bytes peeked
                    bytesPeeked += Constants.ValueRepresentationLength;

                    // Establish the VR reference from the "vr" data read
                    var valueRepresentation = ValueRepresentation.find(Utilities.bytesToString(vr));

                    // If BOTH the tag and the value-representation are unknown, only fail in strict mode.
                    if ((tag == null) && (valueRepresentation == null) && (this._strictParsing == true))
                        throw new Exception("Unknown Tag and Value Representation!", DicomErrorCodes.UnknownTagAndValueRepresentation);

                    // In permissive mode, unknown explicit VR falls back to UN.
                    if ((tag == null) && (valueRepresentation == null))
                        valueRepresentation = ValueRepresentations.UN;

                    // If the tag is found but the VR does NOT agree, process exception
                    if ((tag != null) && (valueRepresentation != null) && (tag.VR != valueRepresentation) && (this._strictParsing == true))
                        throw new Exception("Value Representation Read and Runtime Tag do NOT Agree!", DicomErrorCodes.InvalidDataElement);

                    // Establish the value representation to use to parse the value.
                    // In permissive mode, retain parsing continuity by falling back to UN.
                    if (valueRepresentation == null) {
                        if (tag?.VR != null) {
                            valueRepresentation = tag.VR;
                        }
                        else if (this._strictParsing != true) {
                            valueRepresentation = ValueRepresentations.UN;
                        }
                    }

                    // If there is NO value-representation, process exception
                    if (valueRepresentation == null)
                        throw new Exception("Invalid Value Representation!", DicomErrorCodes.InvalidValueRepresentation);

                    // Establish the tag value representation (for Private Tags)
                    if ((tag?.VR == null) && (tag?.IsPrivate == true))
                        tag.VR = valueRepresentation;

                    // Handle the VRs with "reserved" bytes
                    if (ExplicitVRLongLengthIDs.has(valueRepresentation.ID) == true) {

                        // Peek the next reserved 2-bytes
                        var reserved = this.data.peek(bytesPeeked, Constants.ReservedLength);

                        if ((reserved == null) || (reserved.length != Constants.ReservedLength))
                            return false;

                        // Increment the bytes peeked
                        bytesPeeked += Constants.ReservedLength;

                        // Peek the next 4-byte value length
                        let length = this.data.peek(bytesPeeked, Constants.ValueLength32);

                        if ((length == null) || (length.length != Constants.ValueLength32))
                            return false;

                        // Increment the bytes peeked
                        bytesPeeked += Constants.ValueLength32;

                        // Convert the bytes to a the value-length
                        valueLength = this.bytesToUnsignedInteger(length);

                    }
                    else {

                        // Peek the next 2-byte value length
                        let length = this.data.peek(bytesPeeked, Constants.ValueLength16);

                        if ((length == null) || (length.length != Constants.ValueLength16))
                            return false;

                        // Increment the bytes peeked
                        bytesPeeked += Constants.ValueLength16;

                        // Convert the bytes to a the value-length
                        valueLength = this.bytesToUnsignedInteger(length);

                    }

                    // Construct the "explicit" tag details 
                    result = {
                        bytesPeeked: bytesPeeked,
                        group: group,
                        element: element,
                        tag: tag,
                        valueRepresentation: valueRepresentation
                    };

                }
                else {

                    // Peek the next 4-byte value length
                    let length = this.data.peek(bytesPeeked, Constants.ValueLength32);

                    if ((length == null) || (length.length != Constants.ValueLength32))
                        return false;

                    // Increment the bytes peeked
                    bytesPeeked += Constants.ValueLength32;

                    // Convert the bytes to a the value-length
                    valueLength = this.bytesToUnsignedInteger(length);

                    // Construct the "implicit" tag details 
                    var implicitValueRepresentation = tag?.VR ?? ValueRepresentations.UN;

                    // Establish the tag value representation (for Private Tags)
                    if ((tag?.VR == null) && (tag?.IsPrivate == true))
                        tag.VR = implicitValueRepresentation;

                    result = {
                        bytesPeeked: bytesPeeked,
                        group: group,
                        element: element,
                        tag: tag,
                        valueRepresentation: implicitValueRepresentation
                    };

                }

                // There MUST be a valid value-length at this point so validate the value-length
                if (valueLength == null)
                    throw new Exception("Invalid Value Length!", DicomErrorCodes.InvalidDataElement);

                // Validate the value length based on value-representation
                if ((result.valueRepresentation.IsFixed == true) && (result.valueRepresentation.Length != valueLength) && (this._strictParsing == true))
                    throw new Exception("Invalid Value Length! Value does NOT match VR fixed length.", DicomErrorCodes.InvalidDataElement);

                // Validate the use of undefined-length value length
                // VRs of SV, UC, UR, UV and UT may not have an Undefined Length, i.e., a Value Length of FFFFFFFFH.
                if ((valueLength == Constants.UndefinedLength) && (this.data.transferSyntax.IsExplicit == true)
                    &&
                    (
                        (result.valueRepresentation == ValueRepresentations.SV)
                        ||
                        (result.valueRepresentation == ValueRepresentations.UC)
                        ||
                        (result.valueRepresentation == ValueRepresentations.UR)
                        ||
                        (result.valueRepresentation == ValueRepresentations.UV)
                        ||
                        (result.valueRepresentation == ValueRepresentations.UT)
                    )
                    && (this._strictParsing == true)
                ) {
                    throw new Exception("Invalid Value Length! UC, UR or UT MUST be Explicit! See: 7.1.2 Data Element Structure with Explicit VR", DicomErrorCodes.InvalidDataElement);
                }

                // Set the result length
                result.valueLength = valueLength;

            }

        }
        catch (error) {

            // Process the error
            this.status = Status.FAIL;
            this.error = error;
            this.fireStreamEvent("onError", error);            

        }

        // Return the result
        return result;

    }

    /**
     * Determine if the parser is currently parsing a sequence.
     */
    get isParsingSequence() {
        return ((this.dataElements != null) && (this.dataElements.length > 0));
    }

    /**
     * Peek the top sequence of the stack of sequence elements.
     * @returns The sequence at the top of the sequence element stack.
     */
    peekSequence() {
        
        // First, Check the state
        if ((this.dataElements == null) || (this.dataElements.length == 0))
            return null;

        // Look for the "top" sequence
        for (var i = this.dataElements.length - 1; i >= 0; i--) {
            if (this.dataElements[i].element instanceof AttributeSequence) {
                return this.dataElements[i];

            }
        }

        return null;

    }

    /**
     * Peek the top item of the stack of sequence elements.
     * @returns The item at the top of the sequence element stack.
     */
    peekItem() {
        
        // First, Check the state
        if ((this.dataElements == null) || (this.dataElements.length == 0))
            return null;

        return this.dataElements[this.dataElements.length - 1];

    }

    /**
     * Normalize one bulk-data policy mode value.
     * @param {string | null} mode The configured mode.
     * @returns {string} The normalized mode.
     */
    normalizeBulkDataPolicyMode(mode) {

        if (typeof mode !== 'string')
            return DicomBulkDataPolicyMode.Auto;

        var normalizedMode = mode.trim().toLowerCase();

        if (normalizedMode == DicomBulkDataPolicyMode.Materialize)
            return DicomBulkDataPolicyMode.Materialize;

        if (normalizedMode == DicomBulkDataPolicyMode.Stream)
            return DicomBulkDataPolicyMode.Stream;

        return DicomBulkDataPolicyMode.Auto;

    }

    /**
     * Determine if a tag is a structural tag that should never be bulk-streamed.
     * @param {Tag} tag The current tag.
     * @returns {boolean} TRUE when the tag is structural.
     */
    isStructuralTag(tag) {

        if (tag == null)
            return false;

        if ((tag == Tag.Item) || (tag == Tag.ItemDelimitationItem) || (tag == Tag.SequenceDelimitationItem))
            return true;

        // Keep parser-critical meta attributes materialized so parse flow decisions remain stable.
        if ((tag?.ID == Tag.FileMetaInformationGroupLength?.ID) || (tag?.ID == Tag.TransferSyntaxUID?.ID))
            return true;

        return false;

    }

    /**
     * Determine if the current attribute is a candidate for bulk streaming based on tag/VR.
     * @param {Attribute} attribute The current attribute.
     * @returns {boolean} TRUE when the attribute is a bulk payload candidate.
     */
    isPayloadCandidate(attribute) {

        if ((attribute == null) || (attribute.tag == null))
            return false;

        var tag = attribute.tag;
        var tagID = tag.ID;
        var vrID = tag?.VR?.ID;

        // Structural sequence elements are not payload candidates.
        if ((attribute instanceof AttributeSequence) || (vrID == 'SQ') || this.isStructuralTag(tag))
            return false;

        // Candidate by exact tag ID.
        if ((tagID != null) && (DefaultBulkPayloadCandidateTagIDs.has(tagID) == true))
            return true;

        // Candidate by known template groups:
        //  - Overlay Data: (60xx,3000)
        //  - Curve Data: (50xx,3000)
        //  - Audio Sample Data: (50xx,200C)
        //  - Variable Pixel Data: (7Fxx,0010)
        if ((tagID != null) && (
            /^60[0-9A-F]{2}3000$/.test(tagID)
            || /^50[0-9A-F]{2}3000$/.test(tagID)
            || /^50[0-9A-F]{2}200C$/.test(tagID)
            || /^7F[0-9A-F]{2}0010$/.test(tagID)
        ))
            return true;

        // Candidate by VR.
        if ((vrID != null) && (DefaultBulkPayloadCandidateVRs.has(vrID) == true))
            return true;

        return false;

    }

    /**
     * Determine whether one data element detail belongs to File Meta Information group (0002,eeee).
     * @param {object | boolean | null} details Peeked tag details.
     * @returns {boolean} TRUE when detail belongs to the meta-set group.
     */
    isMetaSetTagDetails(details) {

        if ((details == null) || (details == false))
            return false;

        var group = details?.tag?.Group;
        if (typeof group != "number")
            return false;

        return (group == Tag.FileMetaInformationGroupLength.Group);

    }

    /**
     * Determine whether the declared File Meta Information Group Length has been reached.
     * @returns {boolean} TRUE when declared meta-set length boundary is reached.
     */
    hasReachedDeclaredMetaSetLength() {

        if ((typeof this.metaSetGroupLength != "number") || (this.metaSetGroupLength <= 0))
            return false;

        return ((this.totalBytesConsumed - this.partStart) >= this.metaSetGroupLength);

    }

    /**
     * Score one explicit-VR transfer-syntax candidate for first data-set element routing.
     * @param {number} group Candidate tag group.
     * @param {number} element Candidate tag element.
     * @param {string} vrID Candidate VR identifier.
     * @returns {number} Relative confidence score (higher is better).
     */
    scoreExplicitTransferSyntaxCandidate(group, element, vrID) {

        var score = 0;
        var tag = Tag.find(Tag.identifier(group, element));
        var expectedVRID = tag?.VR?.ID ?? null;

        if ((tag != null) && (tag.Name != 'Unknown Tag')) {
            score += 1;
        }

        if ((expectedVRID != null) && (expectedVRID != 'NONE') && (expectedVRID != 'UN')) {

            if (expectedVRID == vrID) {
                score += 2;
            }
            else if (((expectedVRID == 'OB') || (expectedVRID == 'OW')) && ((vrID == 'OB') || (vrID == 'OW'))) {
                score += 1;
            }
            else {
                score -= 2;
            }

        }

        return score;

    }

    /**
     * Detect likely transfer-syntax for raw data-set-only input (no Part-10 file meta).
     * @returns {TransferSyntax | null} Resolved syntax, or null if additional bytes are required.
     */
    detectDataSetTransferSyntax() {

        if (this.data.length() < 8)
            return null;

        var byte0 = this.data.peekOne(0);
        var byte1 = this.data.peekOne(1);
        var byte2 = this.data.peekOne(2);
        var byte3 = this.data.peekOne(3);
        var byte4 = this.data.peekOne(4);
        var byte5 = this.data.peekOne(5);
        var byte6 = this.data.peekOne(6);
        var byte7 = this.data.peekOne(7);

        var vrID = String.fromCharCode(byte4, byte5);
        var valueRepresentation = ValueRepresentation.find(vrID);

        // If bytes 4-5 are not a valid VR token, route to implicit-little-endian.
        if ((valueRepresentation == null) || (valueRepresentation == ValueRepresentations.NONE))
            return TransferSyntax.ImplicitVRLittleEndian;

        // Explicit-VR long-header tags must reserve bytes 6-7 as 0x0000.
        if ((ExplicitVRLongLengthIDs.has(vrID) == true) && ((byte6 != 0x00) || (byte7 != 0x00)))
            return TransferSyntax.ImplicitVRLittleEndian;

        var groupLittle = (byte0 | (byte1 << 8));
        var elementLittle = (byte2 | (byte3 << 8));
        var littleScore = this.scoreExplicitTransferSyntaxCandidate(groupLittle, elementLittle, vrID);

        var groupBig = ((byte0 << 8) | byte1);
        var elementBig = ((byte2 << 8) | byte3);
        var bigScore = this.scoreExplicitTransferSyntaxCandidate(groupBig, elementBig, vrID);

        // Require a positive explicit confidence; otherwise prefer implicit-little-endian.
        if ((littleScore <= 0) && (bigScore <= 0))
            return TransferSyntax.ImplicitVRLittleEndian;

        return (bigScore > littleScore)
            ? TransferSyntax.ExplicitVRBigEndian
            : TransferSyntax.ExplicitVRLittleEndian;

    }

    /**
     * Complete current meta-set parsing and transition to data-set parsing.
     * @param {boolean} emitEndMetaSetEvent TRUE to emit onEndMetaSet.
     * @returns {Promise<void>}
     */
    async completeMetaSetPart(emitEndMetaSetEvent = false) {

        if ((emitEndMetaSetEvent == true) && (this.status == Status.CONTINUE)) {
            this.status = await this.fireStreamEvent("onEndMetaSet");
        }

        // Clear the part "started"
        this.partStarted = false;

        // Init the current part
        this.part = null;

        // Set the next part
        this.partType = this.partSequence.pop();

        // Normalize SKIP state to continue once meta-set transitions are complete.
        if (this.status == Status.SKIP) {
            this.status = Status.CONTINUE;
        }

    }

    /**
     * Resolve whether the current data element should be bulk-streamed or materialized.
     * Decision flow:
     *  1. Structural tags are never chunked.
     *  2. Policy mode is applied.
     *  3. Payload candidate check (VR/tag) is evaluated.
     *  4. Known-length decision is applied.
     *  5. Undefined-length decision is applied.
     *  6. Hard safety cap is enforced independently of VR/tag.
     * @param {Attribute} attribute The current attribute.
     * @returns {{streamData: boolean, reason: string, isCandidate: boolean, mode: string}} The resolved decision.
     */
    resolveBulkDataDecision(attribute) {

        var mode = this.normalizeBulkDataPolicyMode(this.bulkDataPolicyMode);
        var valueLength = attribute?.valueLength;
        var isUndefinedLength = (valueLength == Constants.UndefinedLength);
        var isStructural = this.isStructuralTag(attribute?.tag)
            || (attribute instanceof AttributeSequence)
            || (attribute?.tag?.VR == ValueRepresentations.SQ);
        var isCandidate = this.isPayloadCandidate(attribute);

        if (isStructural == true) {
            return {
                streamData: false,
                reason: 'structural',
                isCandidate: false,
                mode: mode
            };
        }

        // Hard safety cap always wins for known-length elements.
        if ((isUndefinedLength == false)
            && (typeof valueLength == 'number')
            && (valueLength >= this.bulkDataHardSafetyCap)) {
            return {
                streamData: true,
                reason: 'hard-safety-cap',
                isCandidate: isCandidate,
                mode: mode
            };
        }

        if (mode == DicomBulkDataPolicyMode.Stream) {
            return {
                streamData: true,
                reason: isUndefinedLength ? 'policy-stream-undefined' : 'policy-stream',
                isCandidate: isCandidate,
                mode: mode
            };
        }

        if (mode == DicomBulkDataPolicyMode.Materialize) {
            return {
                streamData: false,
                reason: 'policy-materialize',
                isCandidate: isCandidate,
                mode: mode
            };
        }

        // Auto mode:
        //  - Known length: stream only bulk-candidates above threshold.
        //  - Undefined length: stream only bulk-candidates.
        if (isUndefinedLength == true) {
            return {
                streamData: (isCandidate == true),
                reason: (isCandidate == true) ? 'auto-undefined-candidate' : 'auto-undefined-non-candidate',
                isCandidate: isCandidate,
                mode: mode
            };
        }

        if ((isCandidate == true) && (valueLength >= this.bulkDataKnownLengthThreshold)) {
            return {
                streamData: true,
                reason: 'auto-known-threshold',
                isCandidate: isCandidate,
                mode: mode
            };
        }

        return {
            streamData: false,
            reason: 'auto-materialize',
            isCandidate: isCandidate,
            mode: mode
        };

    }

    /**
     * Fire one attribute chunk event for streamed attributes.
     * @param {Attribute} attribute The current attribute.
     * @param {Uint8Array} chunk The raw value bytes chunk.
     * @param {boolean} isFinalChunk TRUE when this is the final value chunk.
     */
    async fireAttributeChunkEvent(attribute, chunk, isFinalChunk = false) {

        if ((attribute == null) || (chunk == null) || ((chunk.length == 0) && (isFinalChunk != true)))
            return;

        var status = await this.fireStreamEvent("onAttributeChunk", {
            attribute: attribute,
            chunk: chunk,
            isFinalChunk: (isFinalChunk == true),
            bytesStreamed: this.dataElementBytesConsumed,
            valueLength: attribute.valueLength
        }, this.dataElementStatus);

        if ((status == Status.JUMP) || (status == Status.STOP) || (status == Status.FAIL))
            this.status = status;

    }

    /**
     * Apply one consumed value chunk to the current attribute according to the active bulk-data decision.
     * @param {Uint8Array} chunk The consumed value chunk.
     * @param {boolean} isFinalChunk TRUE when the value is complete after this chunk.
     */
    async applyDataElementChunk(chunk, isFinalChunk = false) {

        if (chunk == null)
            chunk = new Uint8Array(0);

        this.dataElementBytesConsumed += chunk.length;

        if ((this.dataElementStreamingDecision != null) && (this.dataElementStreamingDecision.streamData == true)) {

            this.dataElement.isMaterialized = false;
            this.dataElement.isBulkStreamed = true;
            this.dataElement.bytesStreamed = this.dataElementBytesConsumed;

            await this.fireAttributeChunkEvent(this.dataElement, chunk, isFinalChunk);

            if (isFinalChunk == true) {
                this.dataElement.isComplete = true;
            }

            return;

        }

        var shouldMaterializeWhenSkipped = (this.dataElementStreamingDecision?.reason == 'structural');

        // When Part-10 header parsing is disabled, meta-set attributes are parsed in
        // SKIP mode for throughput, but their values are still needed to resolve
        // transfer-syntax and robust group-boundary transitions.
        if ((this.skipPart10MetaSet == true) && (this.partType == DicomPartType.MetaSet)) {
            shouldMaterializeWhenSkipped = true;
        }

        if ((this.dataElementStatus != Status.SKIP) || (shouldMaterializeWhenSkipped == true)) {
            this.dataElement.append(chunk);
        }

        if ((isFinalChunk == true) && (this.dataElementStatus == Status.SKIP)) {
            this.dataElement.isComplete = true;
        }

    }

    /**
     * Parse the specified chunk of DICOM data.
     * @param {Uint8Array} chunk The specified chunk of DICOM data.
     * @returns TRUE if a DICOM is fully parsed, FALSE otherwise.
     */
    async parse(chunk, isDone = false, totalRead = null, totalLength = null) {

        // Init the status
        var status = Status.CONTINUE;

        // Ensure that the parser has performed the initiel reset
        if (this.data == null) {
            this.reset();
        }

        // Append the new chunk of data
        if ((chunk != null) && (chunk.length > 0)) {

            // Append the new chunck
            this.data.append(chunk);

        }

        // Update the "progress" state
        this.bytesRead = totalRead;
        this.bytesTotal = totalLength;

        // Parse the current data based on the current part        

        // First, attempt to detech the prefix
        if ((this.processedPrefix == false) && (this.partType == null)) {

            // If there is data to process
            if (this.data.length() >= (Constants.PreambleLength + Constants.PrefixLength)) {

                // Peek the first chunk of data that encompasses the preamble and prefix

                // Peek the prefix
                var prefix = Utilities.bytesToString(this.data.peek(Constants.PreambleLength, Constants.PrefixLength));
                var detectedPrefix = (prefix == Constants.PrefixValue);

                // Guard against false-positive "DICM" signatures in raw dataset bytes by
                // verifying that the next group after the prefix begins with 0x0002.
                if (detectedPrefix == true) {
                    if (this.data.length() < (Constants.PreambleLength + Constants.PrefixLength + Constants.GroupLength)) {
                        detectedPrefix = (isDone == true) ? true : null;
                    }
                    else {
                        var firstGroup = this.data.peek((Constants.PreambleLength + Constants.PrefixLength), Constants.GroupLength);
                        detectedPrefix = ((firstGroup != null)
                            && (firstGroup.length == Constants.GroupLength)
                            && (firstGroup[0] == 0x02)
                            && (firstGroup[1] == 0x00));
                    }
                }

                // If prefix validation requires additional bytes, wait for more data.
                if (detectedPrefix == null) {
                    // NOOP
                }
                else {

                    // If the standard DICOM prefix was detected and validated
                    this.detectedPrefix = detectedPrefix;

                    // Set the flag indicating that the prefix was processed
                    this.processedPrefix = true;

                    if (this.detectedPrefix == true) {

                        if (this.includePart10Header == true) {

                            // Parse and emit full Part-10 preamble/prefix/meta-set lifecycle.
                            this.partSpecification = DicomPart10Specification;
                            this.skipPart10MetaSet = false;

                        }
                        else {

                            // Skip preamble/prefix bytes and only parse meta-set in SKIP mode
                            // to resolve transfer syntax before dataset parsing.
                            this.data.consume(Constants.PreambleLength + Constants.PrefixLength);
                            this.totalBytesConsumed += (Constants.PreambleLength + Constants.PrefixLength);
                            this.partSpecification = DicomPart10MetaSetSkipSpecification;
                            this.skipPart10MetaSet = true;

                        }

                    }
                    else {

                        // Set the "data-set" ONLY specification
                        this.partSpecification = DicomDataSetSpecification;
                        this.skipPart10MetaSet = false;

                    }

                    // Update the sequence
                    this.partSequence = Utilities.deepCopyArray(this.partSpecification);

                }

            }

        }

        // At EOF, a short payload without a complete Part-10 header is a raw dataset.
        // Do not require 132 bytes to parse a small, otherwise complete dataset.
        if ((this.processedPrefix == false) && (this.partType == null) && (isDone == true)) {
            this.processedPrefix = true;
            this.partSpecification = DicomDataSetSpecification;
            this.partSequence = Utilities.deepCopyArray(this.partSpecification);
            this.skipPart10MetaSet = false;
        }

        // Parse the start of the instance
        if ((this.processedPrefix == true) && (this.partType == null)) {

            // Start the "instance" and receive the handlers "context"
            this.context = await this.fireStreamEvent("onStartInstance", this.context);

            // Pop the first part
            this.partType = this.partSequence.pop();

        }

        // Parse the "preamble" Table 7.1-1. DICOM File Meta Information / File Preamble
        if (this.partType == DicomPartType.Preamble) {

            // Parse the next DICOM Preamble
            status = await this.parseNextPreamble();

        }

        // Parse the "prefix" Table 7.1-1. DICOM File Meta Information / DICOM Prefix
        if (this.partType == DicomPartType.Prefix) {

            // Parse the next DICOM Prefix
            status = await this.parseNextPrefix();

        }

        // Parse the Table 7.1-1. DICOM File Meta Information / File Meta Information Group Length (0002,0000) to the end of this section
        if (this.partType == DicomPartType.MetaSet) {
            
            // Parse more meta-set
            status = await this.parseNextMetaSet(isDone);

        }

        // Parse the remaining DICOM data elements
        if (this.partType == DicomPartType.DataSet) {

            // Parse more data-set
            status = await this.parseNextDataSet(isDone);
            
        }

        // EOF must close every structural part. Incomplete input must not leave the
        // reader waiting forever or manufacture a successful instance.
        if ((isDone == true) && (status == Status.CONTINUE)) {
            status = await this.failParsing('Unexpected end of DICOM input. Incomplete ' + (this.partType ?? 'header') + '.');
        }

        // Pulse progress once per parse invocation (chunk-level) instead of after every onEnd* event.
        if (status == Status.CONTINUE) {
            var progressStatus = await this.fireProgressEvent(status);
            if ((progressStatus == Status.JUMP) || (progressStatus == Status.STOP) || (progressStatus == Status.FAIL)) {
                status = progressStatus;
                this.status = progressStatus;
            }
        }

        // If the instance is complete, end the instance
        if ((status == Status.SUCCESS) || (status == Status.JUMP) || (status == Status.STOP)) {

            // End the "instance"
            this.result = await this.fireStreamEvent("onEndInstance", this.context);

            // Reset the state
            this.reset();

        }

        // Indicate that current status
        return status;

    }

    /**
     * Parse the next DICOM Preamble from the next chunk of data.
     * @returns TRUE if a preamble is fully parsed, FALSE otherwise.
     */
    async parseNextPreamble() {

        /*
            *  NOTE: DICOM Parser implementations should make NO assumption about the preamble content, 
            *  syntax or encoding.  Simply read the first 128 bytes without regard for endian-ness 
            *  or other considerations. 
            *
            *  The Data buffer will currently have a Transfer Syntax of "NONE"
        */

        // Establish the current data length
        var length = this.data.length();

        // If there is data to process
        if (length > 0) {

            // If the part has yet to be created
            if ((this.partStarted == false) && (this.part == null)) {

                // Indicate that the current part is "started"
                this.partStarted = true;

                // Set the part start
                this.partStart = this.totalBytesConsumed;

                // Create the part
                this.part = new Preamble(null);

                // Start the "preamble"
                this.status = await this.fireStreamEvent("onStartPreamble", this.part);

            }

            // If there are enough bytes in the buffer to contain the whole preamble
            if (length >= Constants.PreambleLength) {

                // Consume the bytes
                var partData = this.data.consume(Constants.PreambleLength);

                // Increment the total-bytes-consumed
                this.totalBytesConsumed += Constants.PreambleLength;

                // Handle completing the parsing of this part
                if (this.status == Status.CONTINUE) {

                    // Append to the part
                    this.part.append(partData);

                    // End the "preamble"
                    this.status = await this.fireStreamEvent("onEndPreamble", this.part);

                }

                // Clear the part "started"
                this.partStarted = false;
                
                // Init the current part
                this.part = null;

                // Set the next part
                this.partType = this.partSequence.pop();

                // Init the current status
                this.status = Status.CONTINUE;

            }

        }
        
        // Indicate the current status
        return ((this.status == Status.STOP) || (this.status == Status.FAIL)) ? this.status : Status.CONTINUE;

    }

    /**
     * Parse the next DICOM Prefix from the next chunk of data.
     * @returns TRUE if a prefix is fully parsed, FALSE otherwise.
     */
    async parseNextPrefix() {

        /*
            *  NOTE: DICOM Parser implementations should make NO assumption about the preamble content, 
            *  syntax or encoding.  Simply read the first 128 bytes without regard for endian-ness 
            *  or other considerations. 
            *
            *  The Data buffer will currently have a Transfer Syntax of "NONE"
        */

        // Establish the current data length
        var length = this.data.length();

        // If there is data to process
        if (length > 0) {

            // If the part has yet to be created
            if ((this.partStarted == false) && (this.part == null)) {

                // Indicate that the current part is "started"
                this.partStarted = true;

                // Set the part start
                this.partStart = this.totalBytesConsumed;

                // Create the part
                this.part = new Prefix(null);

                // Start the "prefix"
                this.status = await this.fireStreamEvent("onStartPrefix", this.part);

            }

            // If there are enough bytes in the buffer to contain the whole prefix
            if (length >= Constants.PrefixLength) {

                // Consume the bytes
                var partData = this.data.consume(Constants.PrefixLength);

                // Increment the total-bytes-consumed
                this.totalBytesConsumed += Constants.PrefixLength;

                // Handle completing the parsing of this part
                if (this.status == Status.CONTINUE) {

                    // Append to the part
                    this.part.append(partData);

                    // End the "preamble"
                    this.status = await this.fireStreamEvent("onEndPrefix", this.part);

                }

                // Clear the part "started"
                this.partStarted = false;
                
                // Init the current part
                this.part = null;

                // Set the next part
                this.partType = this.partSequence.pop();

                // Init the current status
                this.status = Status.CONTINUE;

            }
            
        }

        // Indicate the current status
        return ((this.status == Status.STOP) || (this.status == Status.FAIL)) ? this.status : Status.CONTINUE;

    }

    /**
     * Parse the next DICOM MetaSet from the next chunk of data.
     * @returns TRUE if a meta-set is fully parsed, FALSE otherwise.
     */
    async parseNextMetaSet(isDone) {

        // File Meta Information is always Explicit VR Little Endian.
        if (this.partStarted == false) {
            this.partStarted = true;
            this.partStart = this.totalBytesConsumed;
            this.data.transferSyntax = TransferSyntax.ExplicitVRLittleEndian;
            this.status = (this.skipPart10MetaSet == true)
                ? Status.SKIP
                : await this.fireStreamEvent("onStartMetaSet");
        }

        while ((this.status == Status.CONTINUE) || (this.status == Status.SKIP)) {

            // Read values already in progress before peeking another header. The
            // dataset boundary depends only on its group, not its transfer syntax.
            if (this.dataElement == null) {
                var group = this.data.peek(0, Constants.GroupLength);
                if ((group == null) || (group.length != Constants.GroupLength))
                    break;

                if (Utilities.bytesToUnsignedInteger(group, true) != Tag.FileMetaInformationGroupLength.Group) {
                    await this.completeMetaSetPart(this.skipPart10MetaSet != true);
                    break;
                }
            }

            var advanced = await this.parseNextDataElement(isDone);

            if ((this.dataElement != null) && (this.dataElement.isComplete == true)) {
                if (this.dataElement.tag == Tag.FileMetaInformationGroupLength) {
                    this.partStart = this.totalBytesConsumed;
                    this.metaSetGroupLength = this.dataElement.value;
                }
                else if (this.dataElement.tag == Tag.TransferSyntaxUID) {
                    this.dataSetTransferSyntax = TransferSyntax.find(this.dataElement.value) ?? TransferSyntax.NONE;
                }

                this.dataElement = null;
            }

            if (advanced != true)
                break;
        }

        return ((this.status == Status.STOP) || (this.status == Status.FAIL) || (this.status == Status.JUMP))
            ? this.status : Status.CONTINUE;

    }

    /**
     * Parse the next DICOM DataSet from the next chunk of data.
     * @returns TRUE if a data-set is fully parsed, FALSE otherwise.
     */
    async parseNextDataSet(isDone) {

        /*
        *  Each File shall contain a single Data Set representing a single SOP Instance related to a single SOP Class (and corresponding IOD).
        *  https://dicom.nema.org/medical/dicom/current/output/html/part10.html#chapter_7
        */

        // If the meta-set has yet to be created, create it
        if (this.partStarted == false) {

            // Resolve active transfer syntax with a defensive fallback.
            // DataSet-only DICOM may omit File Meta transfer-syntax and requires heuristics.
            var activeDataSetTransferSyntax = this.dataSetTransferSyntax;
            if ((activeDataSetTransferSyntax == null) || (activeDataSetTransferSyntax == TransferSyntax.NONE)) {

                activeDataSetTransferSyntax = this.detectDataSetTransferSyntax();

                // Wait for additional bytes to confidently detect explicit-vs-implicit.
                if (activeDataSetTransferSyntax == null)
                    return Status.CONTINUE;

                this.dataSetTransferSyntax = activeDataSetTransferSyntax;

            }

            // Indicate that the current part is "started"
            this.partStarted = true;

            // Set the part start
            this.partStart = this.totalBytesConsumed;

            // Resolve active transfer syntax with a defensive fallback.
            // Malformed File Meta may not provide a valid transfer-syntax UID.
            if ((activeDataSetTransferSyntax == null) || (activeDataSetTransferSyntax == TransferSyntax.NONE)) {
                activeDataSetTransferSyntax = TransferSyntax.ImplicitVRLittleEndian;
                this.dataSetTransferSyntax = activeDataSetTransferSyntax;
            }

            // Set the current Data buffer transfer syntax.
            // Explicit VR Big Endian is parsed in-place (no byte swapping) because
            // stream-wide pairwise swapping corrupts 32-bit fields and value bytes.
            if (activeDataSetTransferSyntax == TransferSyntax.ExplicitVRBigEndian) {
                this.data.transferSyntax = activeDataSetTransferSyntax;
            }
            else {
                this.data.convert(activeDataSetTransferSyntax);
            }
            this.endSequenceMarker = Utilities.getEndSequence(this.isLittleEndianTransferSyntax);

            // Start the data-set
            this.status = await this.fireStreamEvent("onStartDataSet");

        }

        if (this.status == Status.CONTINUE) {

            while (this.status == Status.CONTINUE) {
                if ((this.dataElement != null) && (this.dataElement.isComplete == true)) {
                    this.dataElement = null;
                }

                if (this.dataElement == null) {
                    if ((await this.parseSequenceContext()) != true)
                        break;
                }

                if ((await this.parseNextDataElement(isDone)) != true)
                    break;
            }

            if ((isDone == true) && (this.status == Status.CONTINUE)) {
                if ((this.data.length() > 0)
                    || ((this.dataElement != null) && (this.dataElement.isComplete != true))
                    || (this.dataElements.length > 0)) {
                    return await this.failParsing('Unexpected end of DICOM input. Incomplete data element, sequence, or item.');
                }

                if (this.dataElement != null) {
                    this.dataElement = null;
                }

                await this.fireParsingEvent("onEndDataSet");
                if (this.status != Status.CONTINUE)
                    return this.status;
                this.partStarted = false;
                return Status.SUCCESS;
            }
        }

        return ((this.status == Status.STOP) || (this.status == Status.FAIL) || (this.status == Status.SKIP) || (this.status == Status.JUMP))
            ? this.status : Status.CONTINUE;

    }

    /**
     * Preserve terminal flow control returned by lifecycle handlers. SKIP applies
     * to a particular attribute/container and must not escape into parser status.
     */
    async fireParsingEvent(name, param, currentStatus) {
        var status = await this.fireStreamEvent(name, param, currentStatus);
        if ((status == Status.STOP) || (status == Status.JUMP) || (status == Status.FAIL))
            this.status = status;
        return status;
    }

    /**
     * Report a structural parse error without emitting completion lifecycle events.
     */
    async failParsing(message, code = DicomErrorCodes.InvalidDataElement) {
        this.status = Status.FAIL;
        this.error = new Exception(message, code);
        await this.fireStreamEvent("onError", this.error);
        return Status.FAIL;
    }

    /**
     * Check a pending field against every defined-length enclosing container.
     */
    async fitsSequenceContext(length, bytesConsumed = 0) {
        for (var context of this.dataElements) {
            if ((context.element.valueLength != Constants.UndefinedLength)
                && ((this.totalBytesConsumed + bytesConsumed + length) > (context.start + context.element.valueLength))) {
                await this.failParsing('Invalid Sequence. Data exceeds the declared sequence or item length.', DicomErrorCodes.InvalidSequence);
                return false;
            }
        }
        return true;
    }

    /**
     * Close finished containers and consume item headers/delimiters before reading
     * the next attribute. This runs even when a chunk ends at a container boundary.
     */
    async parseSequenceContext() {

        while ((this.dataElements.length > 0) && (this.status == Status.CONTINUE)) {
            var context = this.peekItem();
            var element = context.element;
            var consumed = this.totalBytesConsumed - context.start;

            if ((element.valueLength != Constants.UndefinedLength) && (consumed >= element.valueLength)) {
                if (consumed > element.valueLength) {
                    await this.failParsing('Invalid Sequence. Declared length was exceeded.', DicomErrorCodes.InvalidSequence);
                    return false;
                }
                element.isComplete = true;
                await this.fireParsingEvent((element instanceof Item) ? "onEndItem" : "onEndSequence",
                    (element instanceof Item) ? null : element, context.status);
                this.dataElements.pop();
                continue;
            }

            // A defined-length item contains ordinary attributes. Undefined-length
            // items also contain attributes, until an item delimiter is encountered.
            if (element instanceof Item) {
                var nextTag = this.data.peek(0, Constants.GroupLength + Constants.ElementLength);
                if ((nextTag == null) || (nextTag.length < 4))
                    return false;
                var nextGroup = this.bytesToUnsignedInteger(nextTag.subarray(0, 2));
                if (nextGroup != Tag.Item.Group)
                    return (this.status == Status.CONTINUE);
            }

            var details = this.peekTagDetails();
            if ((details == null) || (details == false))
                return false;
            if ((await this.fitsSequenceContext(details.bytesPeeked)) != true)
                return false;

            if (element instanceof AttributeSequence) {
                if (details.tag == Tag.Item) {
                    if ((details.valueLength != Constants.UndefinedLength)
                        && ((await this.fitsSequenceContext(details.bytesPeeked + details.valueLength)) != true))
                        return false;
                    this.data.consume(details.bytesPeeked);
                    this.totalBytesConsumed += details.bytesPeeked;
                    var itemContext = {
                        start: this.totalBytesConsumed,
                        element: new Item(details.valueLength),
                        status: context.status
                    };
                    this.dataElements.push(itemContext);
                    if (context.status == Status.CONTINUE)
                        itemContext.status = await this.fireParsingEvent("onStartItem");
                    continue;
                }
                if ((details.tag == Tag.SequenceDelimitationItem)
                    && (element.valueLength == Constants.UndefinedLength)
                    && (details.valueLength == 0)) {
                    this.data.consume(details.bytesPeeked);
                    this.totalBytesConsumed += details.bytesPeeked;
                    element.isComplete = true;
                    this.dataElements.pop();
                    await this.fireParsingEvent("onEndSequence", element, context.status);
                    continue;
                }
            }
            else if ((element.valueLength == Constants.UndefinedLength) && (details.valueLength == 0)) {
                if (details.tag == Tag.ItemDelimitationItem) {
                    this.data.consume(details.bytesPeeked);
                    this.totalBytesConsumed += details.bytesPeeked;
                    element.isComplete = true;
                    this.dataElements.pop();
                    await this.fireParsingEvent("onEndItem", null, context.status);
                    continue;
                }

                // Preserve the existing permissive recovery for a sequence marker
                // that immediately replaces an omitted undefined-item delimiter.
                if ((details.tag == Tag.SequenceDelimitationItem) && (this._strictParsing != true)) {
                    element.isComplete = true;
                    this.dataElements.pop();
                    await this.fireParsingEvent("onEndItem", null, context.status);
                    continue;
                }
            }

            await this.failParsing('Invalid Sequence. Unexpected item or delimiter.', DicomErrorCodes.InvalidSequence);
            return false;
        }

        return (this.status == Status.CONTINUE);

    }

    /**
     * Consume an undefined-length binary value by its item lengths, retaining raw
     * item headers in the output. Opaque fragment bytes must never be scanned for
     * sequence delimiter signatures (DICOM PS3.5, 7.1.2 and A.4).
     */
    async parseUndefinedDataElement() {

        var consumed = 0;
        var isPixelData = (this.dataElement.tag == Tag.PixelData);

        while (this.data.length() > 0) {
            if (this.undefinedItemBytesRemaining > 0) {
                if ((await this.fitsSequenceContext(this.undefinedItemBytesRemaining, consumed)) != true)
                    break;
                var length = Math.min(this.undefinedItemBytesRemaining, this.data.length());
                await this.applyDataElementChunk(this.data.consume(length), false);
                consumed += length;
                this.undefinedItemBytesRemaining -= length;
                if ((this.status == Status.STOP) || (this.status == Status.JUMP) || (this.status == Status.FAIL))
                    break;
                continue;
            }

            var details = this.peekTagDetails();
            if ((details == false) || (details == null))
                break;

            if ((await this.fitsSequenceContext(details.bytesPeeked, consumed)) != true)
                break;

            if (details.tag == Tag.SequenceDelimitationItem) {
                if ((details.valueLength != 0) || (isPixelData && (this.undefinedItemCount < 2))) {
                    await this.failParsing('Invalid encapsulated value. Missing pixel fragment or nonzero delimiter length.');
                    break;
                }
                this.data.consume(details.bytesPeeked);
                consumed += details.bytesPeeked;
                await this.applyDataElementChunk(new Uint8Array(0), true);
                this.dataElement.isComplete = true;
                break;
            }

            if ((details.tag != Tag.Item)
                || (details.valueLength == Constants.UndefinedLength)
                || (isPixelData && ((this.undefinedItemCount == 0)
                    ? ((details.valueLength % 4) != 0)
                    : ((details.valueLength < 2) || ((details.valueLength % 2) != 0))))) {
                await this.failParsing('Invalid encapsulated value. Expected an item with an explicit, valid length.');
                break;
            }

            if ((await this.fitsSequenceContext(details.bytesPeeked + details.valueLength, consumed)) != true)
                break;
            await this.applyDataElementChunk(this.data.consume(details.bytesPeeked), false);
            consumed += details.bytesPeeked;
            this.undefinedItemBytesRemaining = details.valueLength;
            this.undefinedItemCount++;
            if ((this.status == Status.STOP) || (this.status == Status.JUMP) || (this.status == Status.FAIL))
                break;
        }

        return consumed;

    }

    /**
     * Parse the next DICOM Data Element from the next chunk of data.
     * @returns The TRUE if there is more data to process and FALSE otherwise
     */
    async parseNextDataElement(isDone) {

        var bytesConsumed = 0;

        if (this.dataElement == null) {
            var details = this.peekTagDetails();
            if ((details == null) || (details == false))
                return false;

            // Sequence controls belong to container handling, never the dataset's
            // ordinary attribute collection.
            if ((details.tag == Tag.Item) || (details.tag == Tag.ItemDelimitationItem)
                || (details.tag == Tag.SequenceDelimitationItem)) {
                await this.failParsing('Invalid Sequence. Unexpected sequence control in dataset.', DicomErrorCodes.InvalidSequence);
                return false;
            }

            // Undefined-length UN contains nested implicit-VR datasets, not opaque
            // binary fragments. Reject this unsupported form rather than scanning
            // its nested values or reporting an incorrectly delimited result.
            if ((details.valueRepresentation == ValueRepresentations.UN)
                && (details.valueLength == Constants.UndefinedLength)) {
                await this.failParsing('Unsupported undefined-length UN sequence value.', DicomErrorCodes.InvalidSequence);
                return false;
            }

            var requiredLength = details.bytesPeeked;
            if (details.valueLength != Constants.UndefinedLength)
                requiredLength += details.valueLength;
            if ((await this.fitsSequenceContext(requiredLength)) != true)
                return false;

            this.data.consume(details.bytesPeeked);
            bytesConsumed += details.bytesPeeked;
            this.dataElement = (details.valueRepresentation == ValueRepresentations.SQ)
                ? new AttributeSequence(details.tag, details.valueLength, null, this.data.transferSyntax)
                : new Attribute(details.tag, details.valueLength, null, this.data.transferSyntax);
            this.dataElement.vr = details.valueRepresentation;
            this.dataElementBytesConsumed = 0;
            this.undefinedItemBytesRemaining = 0;
            this.undefinedItemCount = 0;

            if ((this.status == Status.SKIP) || (this.peekItem()?.status == Status.SKIP)) {
                this.dataElementStatus = Status.SKIP;
            }
            else if (this.status == Status.CONTINUE) {
                this.dataElementStatus = await this.fireStreamEvent(
                    (this.dataElement instanceof AttributeSequence) ? "onStartSequence" : "onStartAttribute",
                    this.dataElement);
            }

            if ((this.dataElementStatus == Status.JUMP) || (this.dataElementStatus == Status.STOP)
                || (this.dataElementStatus == Status.FAIL))
                this.status = this.dataElementStatus;

            this.dataElementStreamingDecision = this.resolveBulkDataDecision(this.dataElement);
            this.dataElement.isBulkStreamed = (this.dataElementStreamingDecision.streamData == true);
            this.dataElement.isMaterialized = (this.dataElementStreamingDecision.streamData != true);
            this.dataElement.bulkDataDecision = this.dataElementStreamingDecision.reason;
            this.dataElement.bytesStreamed = 0;
        }

        if ((this.status != Status.JUMP) && (this.status != Status.STOP) && (this.status != Status.FAIL)) {
            if (this.dataElement instanceof AttributeSequence) {
                // Commit the sequence header immediately, even when its first item
                // header is split across chunks or the sequence has zero length.
                this.dataElements.push({
                    start: this.totalBytesConsumed + bytesConsumed,
                    element: this.dataElement,
                    status: this.dataElementStatus
                });
                this.dataElement = null;
                this.dataElementStatus = Status.CONTINUE;
            }
            else if (this.dataElement.valueLength == Constants.UndefinedLength) {
                // Account for the element header before parsing item lengths.
                this.totalBytesConsumed += bytesConsumed;
                bytesConsumed = await this.parseUndefinedDataElement();

                if ((this.status == Status.CONTINUE) && (this.dataElement.isComplete == true)) {
                    await this.fireParsingEvent("onEndAttribute", this.dataElement, this.dataElementStatus);
                }
                else if ((this.status != Status.FAIL) && (bytesConsumed > 0)) {
                    await this.fireParsingEvent("onAppendAttribute", this.dataElement, this.dataElementStatus);
                }
            }
            else {
                var bytesRemaining = Math.min(
                    Math.max(0, this.dataElement.valueLength - this.dataElementBytesConsumed), this.data.length());
                var isFinalChunk = ((this.dataElementBytesConsumed + bytesRemaining) == this.dataElement.valueLength);

                if ((bytesRemaining > 0) || (isFinalChunk == true)) {
                    await this.applyDataElementChunk(this.data.consume(bytesRemaining), isFinalChunk);
                    bytesConsumed += bytesRemaining;

                    if (this.status == Status.CONTINUE) {
                        await this.fireParsingEvent(isFinalChunk ? "onEndAttribute" : "onAppendAttribute",
                            this.dataElement, this.dataElementStatus);
                    }
                }
            }
        }

        this.totalBytesConsumed += bytesConsumed;
        return ((bytesConsumed > 0) && (this.status != Status.JUMP)
            && (this.status != Status.STOP) && (this.status != Status.FAIL));

    }

    /**
     * Configure bulk data behavior.
     * @param {{
     *  mode?: 'materialize' | 'auto' | 'stream',
     *  knownLengthThreshold?: number,
     *  hardSafetyCap?: number
     * } | string | null} policy The policy.
     */
    set bulkDataPolicy(policy) {

        if (typeof policy === 'string') {
            this.bulkDataPolicyMode = this.normalizeBulkDataPolicyMode(policy);
            return;
        }

        if ((policy == null) || (typeof policy !== 'object'))
            return;

        if (policy.mode != null)
            this.bulkDataPolicyMode = this.normalizeBulkDataPolicyMode(policy.mode);

        if ((typeof policy.knownLengthThreshold === 'number') && (policy.knownLengthThreshold >= 0))
            this.bulkDataKnownLengthThreshold = Math.floor(policy.knownLengthThreshold);

        if ((typeof policy.hardSafetyCap === 'number') && (policy.hardSafetyCap >= 0))
            this.bulkDataHardSafetyCap = Math.floor(policy.hardSafetyCap);

    }

    /**
     * Get the current bulk data policy configuration.
     * @returns {{mode: string, knownLengthThreshold: number, hardSafetyCap: number}} The policy.
     */
    get bulkDataPolicy() {
        return {
            mode: this.bulkDataPolicyMode,
            knownLengthThreshold: this.bulkDataKnownLengthThreshold,
            hardSafetyCap: this.bulkDataHardSafetyCap
        };
    }

    /**
     * Constructos a new DICOM Parser with the associated DICOM Stream Handler.
     */
    constructor(options = null) {

        // Call the base constructor
        super();

        // Set the default part specification (Part-10)
        this.partSpecification = DicomPart10Specification;
        this.includePart10Header = false;
        this.skipPart10MetaSet = false;
        this.endSequenceMarker = Utilities.getEndSequence(true);

        // Configure default bulk-data handling.
        this.bulkDataPolicyMode = DicomBulkDataPolicyMode.Auto;
        this.bulkDataKnownLengthThreshold = (1024 * 1024); // 1 MB
        this.bulkDataHardSafetyCap = (16 * 1024 * 1024);   // 16 MB

        // Initialize data-element runtime state.
        this.dataElementBytesConsumed = 0;
        this.dataElementStreamingDecision = null;

        if ((options != null) && (typeof options == 'object')) {
            this.includePart10Header = (options.includePart10Header == true);
        }

    }

};
