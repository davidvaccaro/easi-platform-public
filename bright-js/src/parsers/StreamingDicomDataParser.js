//
// StreamingDicomDataParser.js - 1.0.0
//
// Streaming DICOM Data Parser Class 
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

export default class StreamingDicomDataParser {

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

        // Init the current data-element
        this.dataElement = null;

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
            var identifier = Tag.identifier(group, element);

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
                valueLength = Utilities.bytesToUnsignedInteger(length);

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

                    // If BOTH the tag and the value-representation are unknown, process exception
                    if ((tag == null) && (valueRepresentation == null))
                        throw new Exception("Unknown Tag and Value Representation!", DicomErrorCodes.UnknownTagAndValueRepresentation);

                    // If the tag is found but the VR does NOT agree, process exception
                    if ((tag != null) && (valueRepresentation != null) && (tag.VR != valueRepresentation) && (this.isStrict == true))
                        throw new Exception("Value Representation Read and Runtime Tag do NOT Agree!", DicomErrorCodes.InvalidDataElement);

                    // Establish the value representation to use to parse the value
                    if (valueRepresentation == null)
                        valueRepresentation = tag.VR;

                    // If there is NO value-representation, process exception
                    if (valueRepresentation == null)
                        throw new Exception("Invalid Value Representation!", DicomErrorCodes.InvalidValueRepresentation);

                    // Establish the tag value representation (for Private Tags)
                    if ((tag.VR == null) && (tag.IsPrivate == true))
                        tag.VR = valueRepresentation;

                    // Handle the VRs with "reserved" bytes
                    if ((valueRepresentation == ValueRepresentations.OB)
                        ||
                        (valueRepresentation == ValueRepresentations.OD)
                        ||
                        (valueRepresentation == ValueRepresentations.OF)
                        ||
                        (valueRepresentation == ValueRepresentations.OL)
                        ||
                        (valueRepresentation == ValueRepresentations.OW)
                        ||
                        (valueRepresentation == ValueRepresentations.SQ)
                        ||
                        (valueRepresentation == ValueRepresentations.UC)
                        ||
                        (valueRepresentation == ValueRepresentations.UR)
                        ||
                        (valueRepresentation == ValueRepresentations.UT)
                        ||
                        (valueRepresentation == ValueRepresentations.UN)) {

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
                        valueLength = Utilities.bytesToUnsignedInteger(length);

                    }
                    else {

                        // Peek the next 2-byte value length
                        let length = this.data.peek(bytesPeeked, Constants.ValueLength16);

                        if ((length == null) || (length.length != Constants.ValueLength16))
                            return false;

                        // Increment the bytes peeked
                        bytesPeeked += Constants.ValueLength16;

                        // Convert the bytes to a the value-length
                        valueLength = Utilities.bytesToUnsignedInteger(length);

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
                    valueLength = Utilities.bytesToUnsignedInteger(length);

                    // Construct the "implicit" tag details 
                    result = {
                        bytesPeeked: bytesPeeked,
                        group: group,
                        element: element,
                        tag: tag,
                        valueRepresentation: tag.VR
                    };

                }

                // There MUST be a valid value-length at this point so validate the value-length
                if (valueLength == null)
                    throw new Exception("Invalid Value Length!", DicomErrorCodes.InvalidDataElement);

                // Validate the value length based on value-representation
                if ((result.valueRepresentation.IsFixed == true) && (result.valueRepresentation.Length != valueLength) && (this.isStrict == true))
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
                    && (this.isStrict == true)
                ) {
                    throw new Exception("Invalid Value Length! UC, UR or UT MUST be Explicit! See: 7.1.2 Data Element Structure with Explicit VR", DicomErrorCodes.InvalidDataElement);
                }

                // Set the result length
                result.valueLength = valueLength;

            }

        }
        catch (error) {

            // Process the error
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
     * Fires a stream event or skips the event if the stream-handler does NOT support the event.
     * @param {string} name The name of the event.
     * @param {*} param The parameter to pass to the event.
     * @returns The status based on the standard processing.
     */
    async fireStreamEvent(name, param, currentStatus) {

        // If there is NO handler, NOOP
        if (this._handler == null)
            return Status.CONTINUE;

        // If the current event should be SKIP-ed, do so
        if ((currentStatus != null) && (currentStatus == Status.SKIP))
            return Status.CONTINUE;

        // Init the complete state
        var status = Status.CONTINUE;

        // If the stream-handler supports the event,
        if (this._handler[name] != null) {

            // Call the event function
            const result = this._handler[name](this.context, param);

            if (result instanceof Promise)
                status = await result;
            else
                status = result;

            if (status == null) {
                status = Status.CONTINUE;
            }

        }

        // If the current status is to CONTINUE,
        if ((name.startsWith('onEnd') == true) && (status == Status.CONTINUE)) {

            // If the stream-handler supports "onProgress",
            if (this._handler.onProgress != undefined) {

                // Call the event function
                const result = this._handler.onProgress(
                    this.context, {
                        bytesRead: this.bytesRead, 
                        bytesProcessed: this.totalBytesConsumed, 
                        bytesTotal: this.bytesTotal                        
                    }
                );

                if (result instanceof Promise)
                    status = await result;
                else
                    status = result;

                if (status == null) {
                    status = Status.CONTINUE;
                }

            }

        }

        return status;

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

                // If the standard DICOM prefix was detcted
                this.detectedPrefix = (prefix == Constants.PrefixValue);

                // Set the flag indicating that the prefix was processed
                this.processedPrefix = true;

                // If the prefix is NOT detected, assume that the data is JUST a dataset
                if (this.detectedPrefix == true) {

                    // Set the "Part-10" specification
                    this.partSpecification = DicomPart10Specification;

                }
                else {

                    // Set the "data-set" ONLY specification
                    this.partSpecification = DicomDataSetSpecification;

                }

                // Update the sequence
                this.partSequence = Utilities.deepCopyArray(this.partSpecification);

            }

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

        /*
        *  NOTE: DICOM Parser implementations shall assum that all Data Elements of the remaining File
        *  Meta Information "shall be encoded using the Explicit VR Little Endian Transfer Syntax 
        *  (UID=1.2.840.10008.1.2.1) as defined in DICOM PS3.5."
        *  https://dicom.nema.org/medical/dicom/current/output/html/part10.html#chapter_7
        * 
        *  The Data buffer will currently have a Transfer Syntax of "Explicit VR Little Endian"
        */

        // If the meta-set has yet to be created, create it
        if (this.partStarted == false) {

            // Indicate that the current part is "started"
            this.partStarted = true;

            // Set the part start
            this.partStart = this.totalBytesConsumed;

            // Set the current Data buffer transfer syntax
            this.data.convert(TransferSyntax.ExplicitVRLittleEndian);

            // Start the meta-set
            this.status = await this.fireStreamEvent("onStartMetaSet");

        }

        // Handle SKIP of the meta-set versus full PARSE
        if (this.status == Status.SKIP) {

            // If the meta-set length and transfer-syntax has yet to be parsed, continue parsing
            if ((this.metaSetGroupLength == null) || (this.metaSetGroupLength == 0) || (this.dataSetTransferSyntax == null)) {

                // Read the next data-element elements until the part is complete
                while (await this.parseNextDataElement(isDone) == true) {

                    // If the current data element is "complete"
                    if ((this.dataElement != null) && (this.dataElement.isComplete == true)) {

                        // The first data-element of this section MUST be the Group-Length
                        if (this.dataElement.tag == Tag.FileMetaInformationGroupLength) {

                            // Skip the Group-Length for the part-start
                            this.partStart = this.totalBytesConsumed;

                            // Save the meta-set part length
                            this.metaSetGroupLength = this.dataElement.value;

                        }
                        else if (this.dataElement.tag == Tag.TransferSyntaxUID) {

                            // Capture the current data-set transfer syntax
                            this.dataSetTransferSyntax = TransferSyntax.find(this.dataElement.value);

                            // Clear the current data-elemen
                            this.dataElement = null;

                            // STOP parsing data-elements
                            break;

                        }

                        // Clear the current data-elemen
                        this.dataElement = null;

                    }

                }

            }

            // If there is a valid group-length and trnsfer-syntax, skip the reminaing meta-set bytes
            if ((this.metaSetGroupLength > 0) && (this.dataSetTransferSyntax != null)) {

                // Calculate the bytes remaining to the meta-set
                var bytesRemaining = ((this.partStart + this.metaSetGroupLength) - this.totalBytesConsumed);

                // If there is enough bytes to complete the part, SKIP consume it
                if (this.data.length() >= bytesRemaining) {

                    // Consume the bytes
                    this.data.consume(bytesRemaining);

                    // Increment the total-bytes-consumed
                    this.totalBytesConsumed += bytesRemaining;

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

        }
        else if (this.status == Status.CONTINUE) {

            // Read the next data-element elements until the part is complete
            while (await this.parseNextDataElement(isDone) == true) {

                // If the current data element is "complete"
                if ((this.dataElement != null) && (this.dataElement.isComplete == true)) {

                    // The first data-element of this section MUST be the Group-Length
                    if (this.dataElement.tag == Tag.FileMetaInformationGroupLength) {

                        // Skip the Group-Length for the part-start
                        this.partStart = this.totalBytesConsumed;

                        // Save the meta-set part length
                        this.metaSetGroupLength = this.dataElement.value;

                    }

                    // If this is the transfer syntax of the dataset
                    if (this.dataElement.tag == Tag.TransferSyntaxUID) {

                        // Capture the current data-set transfer syntax
                        this.dataSetTransferSyntax = TransferSyntax.find(this.dataElement.value);

                    }

                    // Clear the current data-elemen
                    this.dataElement = null;

                    // If the meta-set is complete, emit it
                    if ((this.totalBytesConsumed - this.partStart) == this.metaSetGroupLength) {

                        // End the meta-set
                        this.status = await this.fireStreamEvent("onEndMetaSet");

                        // Clear the part "started"
                        this.partStarted = false;

                        // Init the current part
                        this.part = null;

                        // Set the next part
                        this.partType = this.partSequence.pop();

                        // Break
                        break;

                    }

                }

            }

        }

        // Indicate the current status
        return ((this.status == Status.STOP) || (this.status == Status.FAIL)) ? this.status : Status.CONTINUE;

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

            // Indicate that the current part is "started"
            this.partStarted = true;

            // Set the part start
            this.partStart = this.totalBytesConsumed;

            // Set the current Data buffer transfer syntax
            this.data.convert(this.dataSetTransferSyntax);

            // Start the data-set
            this.status = await this.fireStreamEvent("onStartDataSet");

        }

        // Handle SKIP of the meta-set versus full PARSE
        if (this.status === Status.CONTINUE) {

            // Read the next data-element elements until the part is complete
            while (await this.parseNextDataElement(isDone) == true) {

                // If the current data element is "complete"
                if ((this.dataElement != null) && (this.dataElement.isComplete == true)) {

                    // If we are parsing a "sequence", 
                    if (this.isParsingSequence == true) {

                        // Process the sequence
                        while (this.dataElements.length > 0) {

                            // Peek the sequence stack
                            var sequence = this.peekSequence();

                            // Peek the item from the sequence stack
                            var item = this.peekItem();

                            // Clear the current data-elemen
                            this.dataElement = null;

                            // If the current sequence item has undefined length, 
                            if (item.element.valueLength == Constants.UndefinedLength) {

                                // Peak the next tag details
                                var details = this.peekTagDetails();

                                // Handle failure
                                if (details == null) {
                                    return Status.FAIL;
                                }

                                // If MORE data is needed, return false
                                if (details == false) {
                                    return Status.CONTINUE;
                                }

                                // If the current sequence item is ended
                                if (details.tag == Tag.ItemDelimitationItem) {

                                    // Validate that current item MUST be a Item
                                    if (!(item.element instanceof Item)) {
                                        throw new Exception("Invalid Sequence. Current element MUST be a sequence item!", DicomErrorCodes.InvalidSequence);
                                    }

                                    // Peak the next tag details
                                    var nextDetails = this.peekTagDetails(details.bytesPeeked);

                                    // Handle failure
                                    if (nextDetails == null) {
                                        return Status.FAIL;
                                    }

                                    // If MORE data is needed, return false
                                    if (nextDetails == false) {
                                        return Status.CONTINUE;
                                    }

                                    // Consume the data-element element data
                                    this.data.consume(nextDetails.bytesPeeked);

                                    // Record bytes consumed
                                    this.totalBytesConsumed += nextDetails.bytesPeeked;

                                    // End the item (possibly SKIP)
                                    await this.fireStreamEvent("onEndItem", null, item.status);

                                    // Pop the current item
                                    this.dataElements.pop();

                                    // The next tag can start a new "item" or end the current "sequence"
                                    if (nextDetails.tag == Tag.Item)
                                    {

                                        // Push the next item
                                        var count = this.dataElements.push({ 
                                            start: this.totalBytesConsumed, 
                                            element: new Item(nextDetails.valueLength),
                                            status: sequence.status 
                                        });

                                        // If the current sequence STATUS is CONTINUE
                                        if (sequence.status == Status.CONTINUE) {

                                            // Start the item
                                            this.dataElements[count - 1].status = await this.fireStreamEvent("onStartItem");

                                        }

                                        // Break out of the sequence loop
                                        break;

                                    }                        
                                    else if (nextDetails.tag == Tag.SequenceDelimitationItem) {

                                        // Pop the current sequence
                                        this.dataElements.pop();

                                        // End the current sequence (possibly SKIP)
                                        await this.fireStreamEvent("onEndSequence", sequence.element, sequence.status);

                                    }
                                    else {

                                        // The prior element MUST be a sequence control item
                                        throw new Exception("Invalid Sequence. Current tag MUST be either Item Tag (FFFE, E000) OR Seq. Delim. Tag (FFFE, E0DD)!", DicomErrorCodes.InvalidSequence);

                                    }

                                }
                                else {

                                    // Break out of the sequence loop
                                    break;

                                }

                            }
                            else {

                                // If all the item data has been processed, mark it as complete
                                if ((this.totalBytesConsumed - item.start) == item.element.valueLength) {

                                    // End the element
                                    if (item.element instanceof Item) {
                                        
                                        // Set the complete flag
                                        item.element.isComplete = true;

                                        // End the item (possibly SKIP)
                                        await this.fireStreamEvent("onEndItem", null, item.status);

                                        // Pop the current item
                                        this.dataElements.pop();

                                        // If the sequence is a fixed length, see if the end has been reached
                                        if (sequence.element.valueLength != Constants.UndefinedLength) {

                                            // If all sequence data has been processed, mark it as complete
                                            if ((this.totalBytesConsumed - sequence.start) == sequence.element.valueLength) {

                                                // Set the complete flag
                                                sequence.element.isComplete = true;

                                                // End the item (possibly SKIP)
                                                await this.fireStreamEvent("onEndSequence", sequence.element, sequence.status);

                                                // Pop the current sequnce
                                                this.dataElements.pop();

                                            }

                                        }

                                    }
                                    else {

                                        // End the item (possibly SKIP)
                                        await this.fireStreamEvent("onEndSequence", item.element, item.status);

                                        // Pop the current item
                                        this.dataElements.pop();

                                    }

                                }
                                else {

                                    // Break out of the sequence loop
                                    break;
                                    
                                }

                            }
                                    
                        }

                    }
                    else {

                        // Clear the current data-elemen
                        this.dataElement = null;

                        // If the part is complete
                        if (((this.data.isEmpty == true) && (isDone == true)) == true) {

                            // End the data-set
                            await this.fireStreamEvent("onEndDataSet");

                            // Indicate that the part is NOT started
                            this.partStarted = false;

                            // Indicate that the current DICOM is fully parsed
                            return Status.SUCCESS;

                        }

                    }

                }

            }

            // If the parsing is COMPLETE!
            if ((isDone == true) && (this.data.length() == 0)) {

                // Auto-complete the last data-element (if needed)
                if (this.dataElement != null) {

                    // Complete the data element
                    this.dataElement.isComplete = true;

                    // End the attribute 
                    await this.fireStreamEvent("onEndAttribute", this.dataElement, this.dataElementStatus);

                    // Clear the current data-elemen
                    this.dataElement = null;

                    // If there was a sequence in process, end it
                    if (this.isParsingSequence == true) {

                        // Peek the sequence stack
                        var sequence = this.peekSequence();

                        // Peek the item from the sequence stack
                        var item = this.peekItem();

                        if (item.element instanceof Item) {
                                        
                            // Set the complete flag
                            item.element.isComplete = true;

                            // End the item
                            await this.fireStreamEvent("onEndItem", null, item.status);

                            // Pop the current item
                            this.dataElements.pop();

                            // Set the complete flag
                            sequence.element.isComplete = true;

                            // End the item
                            await this.fireStreamEvent("onEndSequence", sequence.element, sequence.status);

                            // Pop the current sequnce
                            this.dataElements.pop();

                        }
                        else {

                            // End the sequence
                            await this.fireStreamEvent("onEndSequence", item.element, item.status);

                            // Pop the current item
                            this.dataElements.pop();

                        }

                    }

                }

                // End the data-set
                await this.fireStreamEvent("onEndDataSet");

                // Indicate that the current DICOM is fully parsed
                return Status.SUCCESS;

            }

        }

        // Indicate the current status
        return ((this.status == Status.STOP) || (this.status == Status.FAIL) || (this.status == Status.SKIP) || (this.status == Status.JUMP)) ? this.status : Status.CONTINUE;

    }

    /**
     * Parse the next DICOM Data Element from the next chunk of data.
     * @returns The TRUE if there is more data to process and FALSE otherwise
     */
    async parseNextDataElement(isDone) {

        var bytesConsumed = 0;

        // If there is NOT a current data-element in process
        if (this.dataElement == null) {

            // Peak the next tag details
            var details = this.peekTagDetails();

            // Handle failure
            if (details == null) {
                this.status = Status.FAIL;
                return false;
            }

            // If MORE data is needed, return false
            if (details == false) {
                return false;
            }

            // Consume the data-element element data
            this.data.consume(details.bytesPeeked);

            // Record bytes consumed
            bytesConsumed += details.bytesPeeked;

            // Create the attribute
            this.dataElement = (details.valueRepresentation == ValueRepresentations.SQ) 
                ? new AttributeSequence(details.tag, details.valueLength, null, this.data.transferSyntax) 
                : new Attribute(details.tag, details.valueLength, null, this.data.transferSyntax);

            // If the STATUS is CONTINUE
            if (this.status == Status.CONTINUE) {

                // Start the attribute or sequence
                if (this.dataElement instanceof AttributeSequence) {    
                    
                    // Start the sequence
                    this.dataElementStatus = await this.fireStreamEvent("onStartSequence", this.dataElement);
                    
                }
                else {

                    // Start the attribute
                    this.dataElementStatus = await this.fireStreamEvent("onStartAttribute", this.dataElement);
                    
                }

            }
            else if (this.status == Status.SKIP) {
                this.dataElementStatus = Status.SKIP;
            }

            // Set the primary status if we are JUMPING, STOPPING or FAILING
            if ((this.dataElementStatus == Status.JUMP) || (this.dataElementStatus == Status.STOP) || (this.dataElementStatus == Status.FAIL)) {
                this.status = this.dataElementStatus;
            }

        }

        // If the status is still to continue processing (including SKIPPING, continue)
        if ((this.status != Status.JUMP) && (this.status != Status.STOP) && (this.status != Status.FAIL)) {

            // Handle DICOM sequence data-element versus normal data-element
            if (this.dataElement instanceof AttributeSequence) {

                // Capture the sequence start
                var sequenceStart = this.totalBytesConsumed;

                // Peak the next tag details
                var details = this.peekTagDetails();

                // Handle failure
                if (details == null) {
                    this.status = Status.FAIL
                    return false;
                }

                // If MORE data is needed, return false
                if (details == false) {
                    return false;
                }

                // Default the element status
                if (this.status == Status.SKIP) {
                    this.dataElementStatus = Status.SKIP;
                }

                // If the current data-element is NOT an Item, assume the sequence is empty
                if (details.tag != Tag.Item) {

                    // End the current sequence (possibly SKIP)
                    await this.fireStreamEvent("onEndSequence", this.dataElement, this.dataElementStatus);

                }
                else {

                    // Consume the data-element element data
                    this.data.consume(details.bytesPeeked);

                    // Record bytes consumed
                    bytesConsumed += details.bytesPeeked;

                    // Push the sequence
                    this.dataElements.push({ 
                        start: sequenceStart, 
                        element: this.dataElement,
                        status: this.dataElementStatus 
                    });
                    
                    // Push the item
                    var count = this.dataElements.push({ 
                        start: (sequenceStart + details.bytesPeeked), 
                        element: new Item(details.valueLength),
                        status: this.dataElementStatus 
                    });

                    // If the current sequence STATUS is CONTINUE
                    if (this.dataElementStatus == Status.CONTINUE) {

                        // Start the item
                        this.dataElements[count - 1].status = await this.fireStreamEvent("onStartItem");

                    }

                }

                // Clear the current element
                this.dataElement = null;

                // Clear the element status
                this.dataElementStatus = Status.CONTINUE;

            }
            else {

                // If there is data to process
                if (this.data.length() > 0) {

                    // Handle "undefined-length" versus "explicit length"
                    if (this.dataElement.valueLength == Constants.UndefinedLength) {

                        // Determine if the current buffer contains the end sequence
                        var index = this.data.indexOf(0, Utilities.getEndSequence());

                        if (index == -1) {

                            // Detemrine the buffer length
                            var totalLength = this.data.length();

                            // Append the remaining bytes to the data-element
                            this.dataElement.append(this.data.consume(totalLength));

                            // Record bytes consumed
                            bytesConsumed += totalLength;
                            
                        }
                        else {

                            // Append the remaining bytes to the data-element
                            this.dataElement.append(this.data.consume(index));

                            // Record bytes consumed
                            bytesConsumed += index;

                            // Determine the End Squence length
                            var endSequenceLength = Utilities.getEndSequence().length;

                            // Consume the End Sequence
                            this.data.consume(endSequenceLength);

                            // Record bytes consumed
                            bytesConsumed += endSequenceLength;

                            // Mark the element as complete
                            this.dataElement.isComplete = true;

                        }

                        // Fire the "append" event (possibly SKIP)
                        await this.fireStreamEvent("onAppendAttribute", this.dataElement, this.dataElementStatus);

                    }
                    else {

                        // Determine the next chunk (either remaining for this element OR all remining bytes in the buffer)
                        var bytesRemaining = Math.min(this.dataElement.bytesRemaining, this.data.length());

                        // Append the data-element data 
                        this.dataElement.append(this.data.consume(bytesRemaining));

                        // Record bytes consumed
                        bytesConsumed += bytesRemaining;

                        // If the STATUS is CONTINUE
                        if (this.status == Status.CONTINUE) {

                            // If the current data-element is complete,
                            if (this.dataElement.isComplete == true) {

                                // End the attribute
                                await this.fireStreamEvent("onEndAttribute", this.dataElement, this.dataElementStatus);

                            }
                            else {

                                // Append the attribute
                                await this.fireStreamEvent("onAppendAttribute", this.dataElement, this.dataElementStatus);

                            }

                        }

                    }

                }

            }

        }

        // Increment the total bytes consumed
        this.totalBytesConsumed += bytesConsumed;

        // Return TRUE if there are more bytes to process
        return (((this.status != Status.JUMP) && (this.status != Status.STOP) && (this.status != Status.FAIL)) && (this.data.isEmpty == false));

    }

    /**
     * Sets the the status indicating that this parser is perfomring "strict" parsing.
     * @description Strict indicates that the parser will strictly enforce general structural aspects of the DICOM Standard.
     */
    set isStrict (isStrict) {
        this._isStrict = isStrict;
    }

    /**
     * Gets the status indicating that this parser is performing "strict" parsing.
     * @description Strict indicates that the parser will strictly enforce general structural aspects of the DICOM Standard.
     */
    get isStrict() {
        return this._isStrict;
    }

    /**
     * Sets the current handler for this parser.
     * @param {object} handler The handler used to handle parsed elements of the DICOM data.
     */
    set handler (handler) {
        this._handler = handler;
    }

    /**
     * Gets the current handler for this parser.
     * @returns The handler used to handle parsed elements of the DICOM data.
     */
    get handler () {
        return this._handler;
    }

    /**
     * Constructos a new DICOM Parser with the associated DICOM Stream Handler.
     */
    constructor() {

        // Default the "strict" status
        this._isStrict = false;

        // Set the default part specification (Part-10)
        this.partSpecification = DicomPart10Specification;
        
        // Init the session context
        this.context = null;

    }

};