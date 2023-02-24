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

class DicomParser {

    /**
     * Reset the current state of the parser.
     */
    reset() {

        // Init the part consumed
        this.totalBytesConsumed = 0;

        // Set the current part to "preamble"
        this.partType = DicomPartType.Preamble;

        // Set the current part bytes start
        this.partStart = 0;

        // Set the current part
        this.part = null;

        // Init the current data-element
        this.dataElement = null;

        // Create the new DICOM data buffer
        this.data = new DicomData();

    }

    /**
     * Parse the specified chunk of DICOM data.
     * @param {*} chunk The specified chunk of DICOM data.
     * @returns null if the chunk has been completely parsed.
     */
    parse(chunk) {

        // Check the params
        if ((chunk == null) || (chunk.length <= 0))
            return null;

        // Append the new chunck
        this.data.append(chunk);

        // Parse the current data based on the current part

        // Parse the "preamble" Table 7.1-1. DICOM File Meta Information / File Preamble
        if (this.partType == DicomPartType.Preamble) {

            /*
             *  NOTE: DICOM Parser implementations should make NO assumption about the preamble content, 
             *  syntax or encoding.  Simply read the first 128 bytes without regard for endian-ness 
             *  or other considerations. 
             *
             *  The DicomData buffer will currently have a Transfer Syntax of "NONE"
            */

            // If there is enough data to fully read the "preamble"
            if (this.data.length() >= DicomConstants.PreambleLength) {

                // Set the part start
                this.partStart = this.totalBytesConsumed;

                // Create and emit the "preamble" part
                this.emitter.emit(new DicomPreamble(this.data.consume(DicomConstants.PreambleLength)));

                // Increment the total-bytes-consumed
                this.totalBytesConsumed += DicomConstants.PreambleLength;

                // Init the current part
                this.part = null;

                // Set the next part
                this.partType = DicomPartType.Prefix;

            }

        }

        // Parse the "prefix" Table 7.1-1. DICOM File Meta Information / DICOM Prefix
        if (this.partType == DicomPartType.Prefix) {

            /*
             *  NOTE: DICOM Parser implementations should make NO assumption about the preamble content, 
             *  syntax or encoding.  Simply read the first 128 bytes without regard for endian-ness 
             *  or other considerations. 
             *
             *  The DicomData buffer will currently have a Transfer Syntax of "NONE"
            */

            // If there is enough data to fully read the "prefix"
            if (this.data.length() >= DicomConstants.PrefixLength) {

                // Set the part start
                this.partStart = this.totalBytesConsumed;

                // Create and emit the "prefix" part
                this.emitter.emit(new DicomPrefix(this.data.consume(DicomConstants.PrefixLength)));

                // Increment the total-bytes-consumed
                this.totalBytesConsumed += DicomConstants.PrefixLength;

                // Init the current part
                this.part = null;

                // Set the next part
                this.partType = DicomPartType.MetaSet;

            }

        }

        // Parse the Table 7.1-1. DICOM File Meta Information / File Meta Information Group Length (0002,0000) to the end of this section
        if (this.partType == DicomPartType.MetaSet) {
            
            // Parse more meta-set
            var isComplete = this.parseNextMetaSet();

            // Set the "complete" state
            this.part.isComplete = isComplete;
            
            // Emit the current part (with the current state)
            this.emitter.emit(this.part);

            // If the next meta-set part is completely read, setup the next part
            if (isComplete == true) {

                // Init the current part
                this.part = null;

                // Set the next part
                this.partType = DicomPartType.DataSet;

            }

        }

        // Parse the remaining DICOM data elements
        if (this.partType == DicomPartType.DataSet) {

            // TODO
            var xxxxx = 100;

        }

    }

    /**
     * Parse the next DICOM MetaSet from the next chunk of data.
     * @returns TRUE if a meta-set is fully parsed, FALSE otherwise.
     */
    parseNextMetaSet() {

        /*
        *  NOTE: DICOM Parser implementations shall assum that all Data Elements of the remaining File
        *  Meta Information "shall be encoded using the Explicit VR Little Endian Transfer Syntax 
        *  (UID=1.2.840.10008.1.2.1) as defined in DICOM PS3.5."
        *  https://dicom.nema.org/medical/dicom/current/output/html/part10.html#chapter_7
        * 
        *  The DicomData buffer will currently have a Transfer Syntax of "Explicit VR Little Endian"
        */

        // If the meta-set has yet to be created, create it
        if (this.part == null) {

            // Set the part start
            this.partStart = this.totalBytesConsumed;

            // Set the current DicomData buffer transfer syntax
            this.data.convert(TransferSyntax.ExplicitVRLittleEndian);

            // If the meta-set has yet to be created, create it
            this.part = new DicomMetaSet();

        }

        // Read the next data-element elements until the part is complete
        while (this.parseNextDataElement() > 0) {

            // If the current data-element is complete
            if (this.dataElement.isComplete == true) {

                // The first data-element of this section MUST be the Group-Length
                if (this.dataElement.tag.ID == Tags.FileMetaInformationGroupLength.ID) {

                    // Validate that the Group-Length attribute is the FIRST data-element in the meta-set
                    if (this.part.attributes.length > 0)
                        throw new DicomException("Group-Length is NOT the First Data-Element in the Meta-Set!", DicomErrorCodes.InvalidMetaSet);

                    // Skip the Group-Length for the part-start
                    this.partStart = this.totalBytesConsumed;

                }

                // Add the data element to the meta-set
                this.part.add(this.dataElement);

                // Clear the current data-elemen
                this.dataElement = null;

                // If the meta-set is complete, emit it
                if ((this.totalBytesConsumed - this.partStart) == this.part.groupLength) {

                    // Indicate successful compleation of meta-set
                    return true;

                }

            }

        }

        // Indicate still reading meta-set
        return false;

    }

    /**
     * Parse the next DICOM Data Element from the next chunk of data.
     * @returns The number of bytes consumed if a data-element is fully parsed, 0 otherwise.
     */
    parseNextDataElement() {

        var bytesConsumed = 0;

        // If there is NOT a current data-element in process
        if (this.dataElement == null) {

            // Establish the number of bytes read
            var bytesPeeked = 0;

            // Peek the next data-element "group"
            var group = this.data.peek(bytesPeeked, DicomConstants.GroupLength);

            if ((group == null) || (group.length != DicomConstants.GroupLength))
                return bytesConsumed;

            // Increment the bytes peeked
            bytesPeeked += DicomConstants.GroupLength;

            // Peek the next data-element "element"
            var element = this.data.peek(bytesPeeked, DicomConstants.ElementLength);

            if ((element == null) || (element.length != DicomConstants.ElementLength))
                return bytesConsumed;

            // Increment the bytes peeked
            bytesPeeked += DicomConstants.ElementLength;

            // Establish the DICOM data-element tag identifier
            var identifier = DicomTag.identifier(group, element);

            // Establish the DICOM Tag
            var tag = DicomTag.find(identifier);

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
                    return bytesConsumed;

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
                        return bytesConsumed;

                    // Increment the bytes peeked
                    bytesPeeked += DicomConstants.ReservedLength;

                    // Peek the next 4-byte value length
                    var length = this.data.peek(bytesPeeked, DicomConstants.ValueLength32);

                    if ((length == null) || (length.length != DicomConstants.ValueLength32))
                        return bytesConsumed;

                    // Increment the bytes peeked
                    bytesPeeked += DicomConstants.ValueLength32;

                    // Convert the bytes to a the value-length
                    valueLength = DicomUtilities.bytesToUnsignedInteger(length);

                }
                else {

                    // Peek the next 2-byte value length
                    var length = this.data.peek(bytesPeeked, DicomConstants.ValueLength16);

                    if ((length == null) || (length.length != DicomConstants.ValueLength16))
                        return bytesConsumed;

                    // Increment the bytes peeked
                    bytesPeeked += DicomConstants.ValueLength16;

                    // Convert the bytes to a the value-length
                    valueLength = DicomUtilities.bytesToUnsignedInteger(length);

                }

            }
            else {

                // Peek the next 4-byte value length
                var length = this.data.peek(bytesPeeked, DicomConstants.ValueLength32);

                if ((length == null) || (length.length != DicomConstants.ValueLength32))
                    return bytesConsumed;

                // Increment the bytes peeked
                bytesPeeked += DicomConstants.ValueLength32;

                // Convert the bytes to a the value-length
                valueLength = DicomUtilities.bytesToUnsignedInteger(length);

            }

            // There MUST be a valid value-length at this point so validate the value-length
            if (valueLength == null)
                throw new DicomException("Invalid Value Length!", DicomErrorCodes.InvalidDataElement);

            // Validate the value length based on value-representation
            if ((valueRepresentation.IsFixed == true) && (valueRepresentation.Length != valueLength) && (Configuration.Strict == true))
                throw new DicomException("Invalid Value Length! Value does NOT match VR fixed length.", DicomErrorCodes.InvalidDataElement);

            // Validate the use of undefined-length value length
            // VRs of SV, UC, UR, UV and UT may not have an Undefined Length, i.e., a Value Length of FFFFFFFFH.
            if ((valueLength == DicomConstants.UndefinedLength) && (valueRepresentation.IsExplicit == true)
                &&
                (
                    (valueRepresentation == ValueRepresentations.SV)
                    ||
                    (valueRepresentation == ValueRepresentations.UC)
                    ||
                    (valueRepresentation == ValueRepresentations.UR)
                    ||
                    (valueRepresentation == ValueRepresentations.UV)
                    ||
                    (valueRepresentation == ValueRepresentations.UT)
                )
                && (Configuration.Strict == true)
            ) {
                throw new DicomException("Invalid Value Length! UC, UR or UT MUST be Explicit! See: 7.1.2 Data Element Structure with Explicit VR", DicomErrorCodes.InvalidDataElement);
            }

            // Create the attribute
            this.dataElement = new DicomAttribute(tag, valueLength, null, this.data.transferSyntax);

            // Consume the data-element element data
            this.data.consume(bytesPeeked);

            // Increment the bytes consumed
            bytesConsumed += bytesPeeked;

        }

        // Handle "undefined-length" versus "explicit length"
        if (this.dataElement.valueLength == DicomConstants.UndefinedLength) {

            // TODO - Let's implement this

        }
        else {

            // Determine if the whole value is currently present in the buffer
            if (this.data.length() >= this.dataElement.valueLength) {

                // Append the data-element data 
                this.dataElement.append(this.data.consume(this.dataElement.valueLength));

                // Increment the bytes consumed
                bytesConsumed += this.dataElement.valueLength;

            }

        }

        // Increment the total bytes consumed
        this.totalBytesConsumed += bytesConsumed;

        // Return the number of bytes consumed
        return bytesConsumed;

    }

    /**
     * Constructos a new DICOM Parser with the associated DICOM Emitter.
     * @param {*} dicomEmitter The emitter used to emit parsed elements of the DICOM data.
     */
    constructor(dicomEmitter) {

        // Set the emitter
        this.emitter = dicomEmitter;

        // Reset the current state
        this.reset();

    }

}
