//
// DicomParser.js - 1.0.0
//
// DICOM Parser Class 
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

var DicomDefaultAppendFrequency = 1000;

var DicomPartType = {
    Preamble: 'Preamble',
    Prefix: 'Prefix',
    MetaSet: 'MetaSet',
    DataSet: 'DataSet'
};

// Populate the part specification (Part-10)
var DicomPart10Specification = [ 
    DicomPartType.DataSet,
    DicomPartType.MetaSet, 
    DicomPartType.Prefix, 
    DicomPartType.Preamble 
];

// Populate the part specification (Part-5)
var DicomDataSetSpecification = [ 
    DicomPartType.DataSet
];

class DicomParser {

    /**
     * Reset the current state of the parser.
     */
    reset() {

        // Indicate if the prefix was processed
        this.processedPrefix = false;
        this.detectedPrefix = false;

        // Reset the part sequence
        this.partSequence = DicomUtilities.deepCopyArray(this.partSpecification);

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
        this.data = new DicomData();

        // Reset the emitter
        if (this.emitter.reset != null) {
            this.emitter.reset();
        }

    }

    /**
     * Peek the next, transfer-syntax independent, base tag details.
     * @returns The peeked local tag details.
     */
    peekTagDetails(bytesPeeked = 0) {

        var result = null;

        try {

            // Peek the next data-element "group"
            var group = this.data.peek(bytesPeeked, DicomConstants.GroupLength);

            if ((group == null) || (group.length != DicomConstants.GroupLength))
                return false;

            // Increment the bytes peeked
            bytesPeeked += DicomConstants.GroupLength;

            // Peek the next data-element "element"
            var element = this.data.peek(bytesPeeked, DicomConstants.ElementLength);

            if ((element == null) || (element.length != DicomConstants.ElementLength))
                return false;

            // Increment the bytes peeked
            bytesPeeked += DicomConstants.ElementLength;

            // Establish the DICOM data-element tag identifier
            var identifier = DicomTag.identifier(group, element);

            // Establish the DICOM Tag
            var tag = DicomTag.find(identifier);

            // If the tag is a sequence control tag, 
            if ((tag == Tags.Item) || (tag == Tags.ItemDelimitationItem) || (tag == Tags.SequenceDelimitationItem)) {

                // Initialize the value-length
                var valueLength = null;

                // Peek the next 4-byte value length
                var length = this.data.peek(bytesPeeked, DicomConstants.ValueLength32);

                if ((length == null) || (length.length != DicomConstants.ValueLength32))
                    return false;

                // Increment the bytes peeked
                bytesPeeked += DicomConstants.ValueLength32;

                // Convert the bytes to a the value-length
                valueLength = DicomUtilities.bytesToUnsignedInteger(length);

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
                var valueLength = null;

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
                    var vr = this.data.peek(bytesPeeked, DicomConstants.ValueRepresentationLength);

                    if ((vr == null) || (vr.length != DicomConstants.ValueRepresentationLength))
                        return false;

                    // Increment the bytes peeked
                    bytesPeeked += DicomConstants.ValueRepresentationLength;

                    // Establish the VR reference from the "vr" data read
                    var valueRepresentation = DicomValueRepresentation.find(DicomUtilities.bytesToString(vr));

                    // If BOTH the tag and the value-representation are unknown, process exception
                    if ((tag == null) && (valueRepresentation == null))
                        throw new DicomException("Unknown Tag and Value Representation!", DicomErrorCodes.UnknownTagAndValueRepresentation);

                    // If the tag is found but the VR does NOT agree, process exception
                    if ((tag != null) && (valueRepresentation != null) && (tag.VR != valueRepresentation) && (Configuration.Strict == true))
                        throw new DicomException("Value Representation Read and Runtime Tag do NOT Agree!", DicomErrorCodes.InvalidDataElement);

                    // Establish the value representation to use to parse the value
                    if (valueRepresentation == null)
                        valueRepresentation = tag.VR;

                    // Establish the tag value representation (for Private Tags)
                    if ((tag.VR == null) && (tag.IsPrivate == true))
                        tag.VR = valueRepresentation;

                    // If there is NO value-representation, process exception
                    if (valueRepresentation == null)
                        throw new DicomException("Invalid Value Representation!", DicomErrorCodes.InvalidValueRepresentation);

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
                        var reserved = this.data.peek(bytesPeeked, DicomConstants.ReservedLength);

                        if ((reserved == null) || (reserved.length != DicomConstants.ReservedLength))
                            return false;

                        // Increment the bytes peeked
                        bytesPeeked += DicomConstants.ReservedLength;

                        // Peek the next 4-byte value length
                        var length = this.data.peek(bytesPeeked, DicomConstants.ValueLength32);

                        if ((length == null) || (length.length != DicomConstants.ValueLength32))
                            return false;

                        // Increment the bytes peeked
                        bytesPeeked += DicomConstants.ValueLength32;

                        // Convert the bytes to a the value-length
                        valueLength = DicomUtilities.bytesToUnsignedInteger(length);

                    }
                    else {

                        // Peek the next 2-byte value length
                        var length = this.data.peek(bytesPeeked, DicomConstants.ValueLength16);

                        if ((length == null) || (length.length != DicomConstants.ValueLength16))
                            return false;

                        // Increment the bytes peeked
                        bytesPeeked += DicomConstants.ValueLength16;

                        // Convert the bytes to a the value-length
                        valueLength = DicomUtilities.bytesToUnsignedInteger(length);

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
                    var length = this.data.peek(bytesPeeked, DicomConstants.ValueLength32);

                    if ((length == null) || (length.length != DicomConstants.ValueLength32))
                        return false;

                    // Increment the bytes peeked
                    bytesPeeked += DicomConstants.ValueLength32;

                    // Convert the bytes to a the value-length
                    valueLength = DicomUtilities.bytesToUnsignedInteger(length);

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
                    throw new DicomException("Invalid Value Length!", DicomErrorCodes.InvalidDataElement);

                // Validate the value length based on value-representation
                if ((result.valueRepresentation.IsFixed == true) && (result.valueRepresentation.Length != valueLength) && (Configuration.Strict == true))
                    throw new DicomException("Invalid Value Length! Value does NOT match VR fixed length.", DicomErrorCodes.InvalidDataElement);

                // Validate the use of undefined-length value length
                // VRs of SV, UC, UR, UV and UT may not have an Undefined Length, i.e., a Value Length of FFFFFFFFH.
                if ((valueLength == DicomConstants.UndefinedLength) && (result.valueRepresentation.IsExplicit == true)
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
                    && (Configuration.Strict == true)
                ) {
                    throw new DicomException("Invalid Value Length! UC, UR or UT MUST be Explicit! See: 7.1.2 Data Element Structure with Explicit VR", DicomErrorCodes.InvalidDataElement);
                }

                // Set the result length
                result.valueLength = valueLength;

            }

        }
        catch (error) {

            // TODO - Handle exception properly
            console.log(error);

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
            if (this.dataElements[i].element instanceof DicomAttributeSequence) {
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
     * Parse the specified chunk of DICOM data.
     * @param {*} chunk The specified chunk of DICOM data.
     * @returns TRUE if a DICOM is fully parsed, FALSE otherwise.
     */
    parse(chunk, isDone = false) {

        // Init the complete state
        var complete = false;

        // Append the new chunk of data
        if ((chunk != null) && (chunk.length > 0)) {

            // Append the new chunck
            this.data.append(chunk);

        }

        // Parse the current data based on the current part

        // First, attempt to detech the prefix
        if ((this.processedPrefix == false) && (this.partType == null)) {

            // If there is data to process
            if (this.data.length() >= (DicomConstants.PreambleLength + DicomConstants.PrefixLength)) {

                // Peek the first chunk of data that encompasses the preamble and prefix

                // Peek the prefix
                var prefix = DicomUtilities.bytesToString(this.data.peek(DicomConstants.PreambleLength, DicomConstants.PrefixLength));

                // If the standard DICOM prefix was detcted
                this.detectedPrefix = (prefix == DicomConstants.PrefixValue);

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
                this.partSequence = DicomUtilities.deepCopyArray(this.partSpecification);

            }

        }

        // Parse the start of the instance
        if ((this.processedPrefix == true) && (this.partType == null)) {

            // Start the "instance"
            if (this.emitter.startInstance != null) {
                this.emitter.startInstance();
            }

            // Pop the first part
            this.partType = this.partSequence.pop();

        }

        // Parse the "preamble" Table 7.1-1. DICOM File Meta Information / File Preamble
        if (this.partType == DicomPartType.Preamble) {

            // Parse the next DICOM Preamble
            this.parseNextPreamble();

        }

        // Parse the "prefix" Table 7.1-1. DICOM File Meta Information / DICOM Prefix
        if (this.partType == DicomPartType.Prefix) {

            // Parse the next DICOM Prefix
            this.parseNextPrefix();

        }

        // Parse the Table 7.1-1. DICOM File Meta Information / File Meta Information Group Length (0002,0000) to the end of this section
        if (this.partType == DicomPartType.MetaSet) {
            
            // Parse more meta-set
            this.parseNextMetaSet(isDone);

        }

        // Parse the remaining DICOM data elements
        if (this.partType == DicomPartType.DataSet) {

            // Parse more data-set
            complete = this.parseNextDataSet(isDone);
            
        }

        // If the instance is complete, end the instance
        if (complete == true) {

            // End the "instance"
            if (this.emitter.endInstance != null) {
                this.result = this.emitter.endInstance();
            }

            // Reset the state
            this.reset();

        }

        // Indicate that the current DICOM is NOT fully parsed
        return complete;

    }

    /**
     * Parse the next DICOM Preamble from the next chunk of data.
     * @returns TRUE if a preamble is fully parsed, FALSE otherwise.
     */
    parseNextPreamble() {

        /*
            *  NOTE: DICOM Parser implementations should make NO assumption about the preamble content, 
            *  syntax or encoding.  Simply read the first 128 bytes without regard for endian-ness 
            *  or other considerations. 
            *
            *  The DicomData buffer will currently have a Transfer Syntax of "NONE"
        */

        // If there is data to process
        if (this.data.length() > 0) {

            // Determine the next chunk (either remaining for this element OR all remining bytes in the buffer)
            var remaining = Math.min((this.part == null) ? DicomConstants.PreambleLength : this.part.bytesRemaining, this.data.length());

            // If the part has yet to be created
            if ((this.partStarted == false) && (this.part == null)) {

                // Indicate that the current part is "started"
                this.partStarted = true;

                // Set the part start
                this.partStart = this.totalBytesConsumed;

                // Create the part
                this.part = new DicomPreamble(this.data.consume(remaining));

                // Start the "preamble"
                if (this.emitter.startPreamble != null) {
                    this.emitter.startPreamble(this.part);
                }

            }
            else {

                // Append to the part
                this.part.append(this.data.consume(remaining));

            }

            // Increment the total-bytes-consumed
            this.totalBytesConsumed += remaining;

            // If the part is complete
            if (this.part.isComplete == true) {

                // End the "preamble"
                if (this.emitter.endPreamble != null) {
                    this.emitter.endPreamble(this.part);
                }

                // Clear the part "started"
                this.partStarted = false;
                
                // Init the current part
                this.part = null;

                // Set the next part
                this.partType = this.partSequence.pop();

                // Indicate complete
                return true;

            }
            
        }
        
        // Indicate still reading preamble
        return false;

    }

    /**
     * Parse the next DICOM Prefix from the next chunk of data.
     * @returns TRUE if a prefix is fully parsed, FALSE otherwise.
     */
    parseNextPrefix() {

        /*
            *  NOTE: DICOM Parser implementations should make NO assumption about the preamble content, 
            *  syntax or encoding.  Simply read the first 128 bytes without regard for endian-ness 
            *  or other considerations. 
            *
            *  The DicomData buffer will currently have a Transfer Syntax of "NONE"
        */

        // If there is data to process
        if (this.data.length() > 0) {

            // Determine the next chunk (either remaining for this element OR all remining bytes in the buffer)
            var remaining = Math.min((this.part == null) ? DicomConstants.PrefixLength : this.part.bytesRemaining, this.data.length());

            // If the part has yet to be created
            if ((this.partStarted == false) && (this.part == null)) {

                // Indicate that the current part is "started"
                this.partStarted = true;

                // Set the part start
                this.partStart = this.totalBytesConsumed;

                // Create the part
                this.part = new DicomPrefix(this.data.consume(remaining));

                // Start the "prefix"
                if (this.emitter.startPrefix != null) {
                    this.emitter.startPrefix(this.part);
                }

            }
            else {

                // Append to the part
                this.part.append(this.data.consume(remaining));

            }

            // Increment the total-bytes-consumed
            this.totalBytesConsumed += remaining;

            // If the part is complete
            if (this.part.isComplete == true) {

                // End the "prefix"
                if (this.emitter.endPrefix != null) {
                    this.emitter.endPrefix(this.part);
                }

                // Clear the part "started"
                this.partStarted = false;

                // Init the current part
                this.part = null;

                // Set the next part
                this.partType = this.partSequence.pop();

                // Indicate complete
                return true;

            }
            
        }

        // Indicate still reading prefix
        return false;

    }

    /**
     * Parse the next DICOM MetaSet from the next chunk of data.
     * @returns TRUE if a meta-set is fully parsed, FALSE otherwise.
     */
    parseNextMetaSet(isDone) {

        /*
        *  NOTE: DICOM Parser implementations shall assum that all Data Elements of the remaining File
        *  Meta Information "shall be encoded using the Explicit VR Little Endian Transfer Syntax 
        *  (UID=1.2.840.10008.1.2.1) as defined in DICOM PS3.5."
        *  https://dicom.nema.org/medical/dicom/current/output/html/part10.html#chapter_7
        * 
        *  The DicomData buffer will currently have a Transfer Syntax of "Explicit VR Little Endian"
        */

        // If the meta-set has yet to be created, create it
        if (this.partStarted == false) {

            // Indicate that the current part is "started"
            this.partStarted = true;

            // Set the part start
            this.partStart = this.totalBytesConsumed;

            // Set the current DicomData buffer transfer syntax
            this.data.convert(TransferSyntax.ExplicitVRLittleEndian);

            // Start the meta-set
            if (this.emitter.startMetaSet != null) {
                this.emitter.startMetaSet();
            }

        }

        // Read the next data-element elements until the part is complete
        while (this.parseNextDataElement(isDone) == true) {

            // If the current data element is "complete"
            if ((this.dataElement != null) && (this.dataElement.isComplete == true)) {

                // The first data-element of this section MUST be the Group-Length
                if (this.dataElement.tag == Tags.FileMetaInformationGroupLength) {

                    // Skip the Group-Length for the part-start
                    this.partStart = this.totalBytesConsumed;

                    // Save the meta-set part length
                    this.metaSetGroupLength = this.dataElement.value;

                }

                // If this is the transfer syntax of the dataset
                if (this.dataElement.tag == Tags.TransferSyntaxUID) {

                    // Capture the current data-set transfer syntax
                    this.dataSetTransferSyntax = DicomTransferSyntax.find(this.dataElement.value);

                }

                // Clear the current data-elemen
                this.dataElement = null;

                // If the meta-set is complete, emit it
                if ((this.totalBytesConsumed - this.partStart) == this.metaSetGroupLength) {

                    // End the meta-set
                    if (this.emitter.endMetaSet != null) {
                        this.emitter.endMetaSet();
                    }
    
                    // Clear the part "started"
                    this.partStarted = false;

                    // Init the current part
                    this.part = null;

                    // Set the next part
                    this.partType = this.partSequence.pop();

                    // Indicate successful compleation of meta-set
                    return true;

                }

            }

        }

        // Indicate still reading meta-set
        return false;

    }

    /**
     * Parse the next DICOM DataSet from the next chunk of data.
     * @returns TRUE if a data-set is fully parsed, FALSE otherwise.
     */
    parseNextDataSet(isDone) {

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

            // Set the current DicomData buffer transfer syntax
            this.data.convert(this.dataSetTransferSyntax);

            // Start the data-set
            if (this.emitter.startDataSet != null) {
                this.emitter.startDataSet();
            }

        }

        // Read the next data-element elements until the part is complete
        while (this.parseNextDataElement(isDone) == true) {

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
                        if (item.element.valueLength == DicomConstants.UndefinedLength) {

                            // Peak the next tag details
                            var details = this.peekTagDetails();

                            // If MORE data is needed, return false
                            if (details == false)
                                return false;

                            // If the current sequence item is ended
                            if (details.tag == Tags.ItemDelimitationItem) {

                                // Validate that current item MUST be a DicomItem
                                if (!(item.element instanceof DicomItem)) {
                                    throw new DicomException("Invalid Sequence. Current element MUST be a sequence item!", DicomErrorCodes.InvalidSequence);
                                }

                                // Peak the next tag details
                                var nextDetails = this.peekTagDetails(details.bytesPeeked);

                                // If MORE data is needed, return false
                                if (nextDetails == false)
                                    return false;

                                // Consume the data-element element data
                                this.data.consume(nextDetails.bytesPeeked);

                                // Record bytes consumed
                                this.totalBytesConsumed += nextDetails.bytesPeeked;

                                // End the item
                                if (this.emitter.endItem != null) {
                                    this.emitter.endItem(item.element);
                                }

                                // Pop the current item
                                this.dataElements.pop();

                                // The next tag can start a new "item" or end the current "sequence"
                                if (nextDetails.tag == Tags.Item)
                                {

                                    // Create a new item
                                    var nextItem = new DicomItem(nextDetails.valueLength);

                                    // Push the next item
                                    this.dataElements.push({ 
                                        start: nextDetails.bytesPeeked, 
                                        element: nextItem
                                    });

                                    // Start the item
                                    if (this.emitter.startItem != null) {
                                        this.emitter.startItem(nextItem);
                                    }

                                    // Break out of the sequence loop
                                    break;

                                }                        
                                else if (nextDetails.tag == Tags.SequenceDelimitationItem) {

                                    // Pop the current sequence
                                    this.dataElements.pop();

                                    // End the current sequence
                                    if (this.emitter.endSequence != null) {
                                        this.emitter.endSequence(sequence.element);
                                    }

                                }
                                else {

                                    // The prior element MUST be a sequence control item
                                    throw new DicomException("Invalid Sequence. Current tag MUST be either Item Tag (FFFE, E000) OR Seq. Delim. Tag (FFFE, E0DD)!", DicomErrorCodes.InvalidSequence);

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
                                if (item.element instanceof DicomItem) {
                                    
                                    // Set the complete flag
                                    item.element.isComplete = true;

                                    // End the item
                                    if (this.emitter.endItem != null) {
                                        this.emitter.endItem(item.element);                                
                                    }

                                    // Pop the current item
                                    this.dataElements.pop();

                                    // If the sequence is a fixed length, see if the end has been reached
                                    if (sequence.element.valueLength != DicomConstants.UndefinedLength) {

                                        // If all sequence data has been processed, mark it as complete
                                        if ((this.totalBytesConsumed - sequence.start) == sequence.element.valueLength) {

                                            // Set the complete flag
                                            sequence.element.isComplete = true;

                                            // End the item
                                            if (this.emitter.endSequence != null) {
                                                this.emitter.endSequence(sequence.element);                                
                                            }

                                            // Pop the current sequnce
                                            this.dataElements.pop();

                                        }

                                    }

                                }
                                else {

                                    // End the item
                                    if (this.emitter.endSequence != null) {
                                        this.emitter.endSequence(item.element);                                
                                    }

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
                        if (this.emitter.endDataSet != null) {
                            this.emitter.endDataSet();
                        }

                        // Indicate that the part is NOT started
                        this.partStarted = false;

                        // Indicate that the current DICOM is fully parsed
                        return true;

                    }

                }

            }

        }

        // Auto-complete the last data-element (if needed)
        if ((isDone == true) && (this.data.length() == 0) && (this.dataElement != null)) {

            // Complete the data element
            this.dataElement.isComplete = true;

            // End the attribute 
            if (this.emitter.endAttribute != null) {
                this.emitter.endAttribute(this.dataElement);
            }

            // Clear the current data-elemen
            this.dataElement = null;

            // If there was a sequence in process, end it
            if (this.isParsingSequence == true) {

                // Peek the sequence stack
                var sequence = this.peekSequence();

                // Peek the item from the sequence stack
                var item = this.peekItem();

                if (item.element instanceof DicomItem) {
                                
                    // Set the complete flag
                    item.element.isComplete = true;

                    // End the item
                    if (this.emitter.endItem != null) {
                        this.emitter.endItem(item.element);                                
                    }

                    // Pop the current item
                    this.dataElements.pop();

                    // Set the complete flag
                    sequence.element.isComplete = true;

                    // End the item
                    if (this.emitter.endSequence != null) {
                        this.emitter.endSequence(sequence.element);                                
                    }

                    // Pop the current sequnce
                    this.dataElements.pop();

                }
                else {

                    // End the item
                    if (this.emitter.endSequence != null) {
                        this.emitter.endSequence(item.element);                                
                    }

                    // Pop the current item
                    this.dataElements.pop();

                }

            }

            // End the data-set
            if (this.emitter.endDataSet != null) {
                this.emitter.endDataSet();
            }

            // Indicate that the current DICOM is fully parsed
            return true;

        }

        // Indicate still reading data-set
        return false;

    }

    /**
     * Parse the next DICOM Data Element from the next chunk of data.
     * @returns The TRUE if there is more data to process and FALSE otherwise
     */
    parseNextDataElement(isDone) {

        var bytesConsumed = 0;

        // If there is NOT a current data-element in process
        if (this.dataElement == null) {

            // Peak the next tag details
            var details = this.peekTagDetails();

            // If MORE data is needed, return false
            if (details == false)
                return false;

            // Consume the data-element element data
            this.data.consume(details.bytesPeeked);

            // Record bytes consumed
            bytesConsumed += details.bytesPeeked;

            // Create the attribute
            this.dataElement = (details.valueRepresentation == ValueRepresentations.SQ) 
                ? new DicomAttributeSequence(details.tag, details.valueLength, null, this.data.transferSyntax) 
                : new DicomAttribute(details.tag, details.valueLength, null, this.data.transferSyntax);

            // Start the attribute or sequence
            if (this.dataElement instanceof DicomAttributeSequence) {
                if (this.emitter.startSequence != null) {
                    this.emitter.startSequence(this.dataElement);
                }
            }
            else {
                if (this.emitter.startAttribute != null) {
                    this.emitter.startAttribute(this.dataElement);
                }
            }

        }

        // Handle DICOM sequence data-element versus normal data-element
        if (this.dataElement instanceof DicomAttributeSequence) {

            // Capture the sequence start
            var sequenceStart = this.totalBytesConsumed;

            // Peak the next tag details
            var details = this.peekTagDetails();

            // If MORE data is needed, return false
            if (details == false)
                return false;

            // Consume the data-element element data
            this.data.consume(details.bytesPeeked);

            // Record bytes consumed
            bytesConsumed += details.bytesPeeked;

            // The tag MUST be Item Tag (FFFE, E000)
            // https://dicom.nema.org/medical/dicom/current/output/chtml/part05/sect_7.5.2.html
            if (details.tag != Tags.Item) {
                throw new DicomException("Invalid Tag! MUST BE Item Tag (FFFE, E000)", DicomErrorCodes.InvalidTag);
            }            

            // Push the sequence
            this.dataElements.push({ 
                start: sequenceStart, 
                element: this.dataElement 
            });
            
            // Create the item
            var item = new DicomItem(details.valueLength);

            // Push the item
            this.dataElements.push({ 
                start: (sequenceStart + details.bytesPeeked), 
                element: item
            });

            // Start the item
            if (this.emitter.startItem != null) {
                this.emitter.startItem(item);
            }

            // Clear the current element
            this.dataElement = null;

        }
        else {

            // Handle "undefined-length" versus "explicit length"
            if (this.dataElement.valueLength == DicomConstants.UndefinedLength) {

                // Determine the lenght of the buffer
                var bufferLength = (DicomConstants.GroupLength + DicomConstants.ElementLength);

                // Loop reading the buffer
                while (this.data.length() > 0) {

                    // Peek the next buffer
                    var buf = this.data.peek(0, bufferLength);

                    // If the whole buffer could NOT be read, indicate MORE data is needed
                    if ((buf == null) || (buf.length < bufferLength)) {

                        // If there is NO MORE data, complete the tag
                        if (isDone == true) {

                            // If there is a buffer
                            if ((buf != null) && (buf.length > 0)) {

                                // Append the remaining bytes to the data-element
                                this.dataElement.append(buf);

                                // Consume the final bytes
                                this.data.consume(buf.length);

                                // Record bytes consumed
                                bytesConsumed += buf.length;
                            
                            }

                        }

                        // Increment the total bytes consumed
                        this.totalBytesConsumed += bytesConsumed;
                        
                        // Indicate MORE data is needed
                        return false;

                    }

                    // Consume the buffer
                    this.data.consume(bufferLength);

                    // Record bytes consumed
                    bytesConsumed += bufferLength;

                    // Increment the total bytes consumed
                    this.totalBytesConsumed += bytesConsumed;

                    // If we have reached the end of the data-element value
                    if (DicomUtilities.isEndSequence(buf) == true) {

                        // Mark the element as complete
                        this.dataElement.isComplete = true;

                        // Break
                        break;

                    }

                    // Append the buffer
                    this.dataElement.append(buf);

                    // Append the attribute or sequence
                    if ((this.dataElement.length() % this.appendFrequency) == 0) {
                        if (this.emitter.appendAttribute != null) {
                            this.emitter.appendAttribute(this.dataElement);
                        }
                    }

                }

            }
            else {

                // Determine if there are more bytes to process
                if (this.data.length() > 0) {

                    // Determine the next chunk (either remaining for this element OR all remining bytes in the buffer)
                    var bytesRemaining = Math.min(this.dataElement.bytesRemaining, this.data.length());

                    // Append the data-element data 
                    this.dataElement.append(this.data.consume(bytesRemaining));

                    // Record bytes consumed
                    bytesConsumed += bytesRemaining;

                    // If the current data-element is complete,
                    if (this.dataElement.isComplete == true) {

                        // End the attribute or sequence
                        if (this.emitter.endAttribute != null) {
                            this.emitter.endAttribute(this.dataElement);
                        }

                    }
                    else {

                        // Append the attribute or sequence
                        if (this.emitter.appendAttribute != null) {
                            this.emitter.appendAttribute(this.dataElement);
                        }

                    }

                }

            }

        }

        // Increment the total bytes consumed
        this.totalBytesConsumed += bytesConsumed;

        // Return TRUE if there are more bytes to process
        return (this.data.isEmpty == false);

    }

    /**
     * Constructos a new DICOM Parser with the associated DICOM Emitter.
     * @param {*} dicomEmitter The emitter used to emit parsed elements of the DICOM data.
     */
    constructor(dicomEmitter, appendFrequency) {

        // Set the emitter
        this.emitter = dicomEmitter;

        // Set the default part specification (Part-10)
        this.partSpecification = DicomPart10Specification;

        // Set the append frequency
        this.appendFrequency = appendFrequency;

        // Set the default append frequency if needed
        if (this.appendFrequency == null) {

            // Set the default append frequency
            this.appendFrequency = DicomDefaultAppendFrequency;

        }
        
        // Reset the current state
        this.reset();

    }

}
