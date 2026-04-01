//
// DumpParser.js
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

import Constants from '../../dicom/Constants.js';
import TransferSyntax from '../../dicom/TransferSyntax.js';
import ValueRepresentation from '../../dicom/ValueRepresentation.js';
import { ValueRepresentations } from '../../dicom/ValueRepresentation.js';

import Tag from '../../dicom/Tag.js';

import Attribute from '../../dicom/Attribute.js';
import Item from '../../dicom/Item.js';
import AttributeSequence from '../../dicom/AttributeSequence.js';
import Exception, { DicomErrorCodes } from '../../environment/Exception.js';

export default class DumpParser {

    /**
     * Reset the current state of the parser.
     */
    reset() {

        // Init the state
        this.startedMetaSet = false;
        this.startedDataSet = false;

        // Init the data-element stack
        this.dataElements = [];

        // Reset the emitter
        if (this.emitter.onReset != null) {
            this.emitter.onReset();
        }

        // Clear the current context
        this.context = null;

    }

    /**
     * Parse one numeric literal from dump text.
     * @param {string} token The numeric token.
     * @returns {number | null} The parsed value.
     */
    parseNumericToken(token) {

        if (token == null)
            return null;

        var text = String(token).trim();
        if (text.length == 0)
            return null;

        if (/^[-+]?0x[0-9a-f]+$/i.test(text) == true)
            return Number.parseInt(text, 16);

        var value = Number(text);
        if (Number.isFinite(value) != true)
            return null;

        return value;

    }

    /**
     * Extract one dump value literal from a line.
     * @param {string} line The source line.
     * @returns {string | null} The extracted literal.
     */
    extractValueLiteral(line) {

        var delimiters = [
            { start: '<', end: '>' },
            { start: '[', end: ']' },
            { start: '{', end: '}' }
        ];

        for (var i = 0; i < delimiters.length; i++) {

            var startToken = delimiters[i].start;
            var endToken = delimiters[i].end;

            var start = line.lastIndexOf(startToken);
            if (start < 0)
                continue;

            var end = line.indexOf(endToken, start + 1);
            if (end < 0)
                continue;

            return line.substring(start + 1, end);

        }

        return null;

    }

    /**
     * Parse one value from a dump line based on VR.
     * @param {ValueRepresentation} vr The value representation.
     * @param {string | null} literal The extracted literal text.
     * @returns {*} The parsed value.
     */
    parseValue(vr, literal) {

        if (literal == null)
            return null;

        var text = String(literal).trim();
        if (text.length == 0)
            return null;

        var parts = text.split('\\').map((part) => String(part).trim()).filter((part) => part.length > 0);
        var values = (parts.length > 0) ? parts : [text];

        if (vr == ValueRepresentations.SQ)
            return null;

        if ((vr == ValueRepresentations.US) || (vr == ValueRepresentations.SS) || (vr == ValueRepresentations.UL) || (vr == ValueRepresentations.SL) || (vr == ValueRepresentations.IS)) {

            var numericValues = values
                .map((value) => this.parseNumericToken(value))
                .filter((value) => value != null)
                .map((value) => Math.trunc(value));

            if (numericValues.length == 0)
                return null;

            return (numericValues.length == 1) ? numericValues[0] : numericValues;

        }

        if ((vr == ValueRepresentations.FL) || (vr == ValueRepresentations.FD) || (vr == ValueRepresentations.DS)) {

            var decimalValues = values
                .map((value) => this.parseNumericToken(value))
                .filter((value) => value != null);

            if (decimalValues.length == 0)
                return null;

            return (decimalValues.length == 1) ? decimalValues[0] : decimalValues;

        }

        if (vr == ValueRepresentations.OB) {

            var byteValues = text.split(',')
                .map((value) => this.parseNumericToken(value))
                .filter((value) => value != null)
                .map((value) => (value & 0xFF));

            if (byteValues.length == 0)
                return null;

            return new Uint8Array(byteValues);

        }

        return (values.length == 1) ? values[0] : values;

    }

    /**
     * Peek the next, transfer-syntax independent, base tag details.
     * @returns The peeked local tag details.
     */
    parseTagDetails(line) {

        var result = null;

        try {

            // Establish the (0x0002,0x0000) group and element part
            var groupAndElement = line.trim().substring(0, 14).replaceAll('(', '').replaceAll(')', '').trim().split(',');

            // SKIP: invalid tag parts
            if (groupAndElement.length != 2)
                return null;

            // Parse the group 
            var group = parseInt(groupAndElement[0]);

            // Parse the element
            var element = parseInt(groupAndElement[1]);

            // Establish the DICOM data-element tag identifier
            var identifier = Tag.identifier(group, element);

            // Establish the DICOM Tag
            var tag = Tag.find(identifier);

            // Parse the VR=<UL>
            var start = line.indexOf('VR=<');

            // SKIP: data-elements WITHOUT VR
            if (start == -1)
                return null;

            // Parse the VR
            var vr = ValueRepresentation.find(line.substring(start + 4, start + 6));

            // Use the tag preset VR (if needed)
            if (vr == null)
                vr = tag.VR;

            // Parse the VL=<
            start = line.indexOf('VL=<', start);

            // SKIP: data-elements WITHOUT VL
            if (start == -1)
                return null;

            // Find the end of the length
            var end = line.indexOf('>', start);

            // Parse the length value
            var valueLength = parseInt(line.substring(start + 4, end), 16);

            // Parse the line value (when available).
            var literal = this.extractValueLiteral(line);
            var value = this.parseValue(vr, literal);

            // Construct the "sequence control" tag details 
            result = {
                group: group,
                element: element,
                tag: tag,
                valueRepresentation: vr,
                valueLength: valueLength,
                value: value
            };

        }
        catch (error) {

            // Throw the parsing error
            throw new Exception("Invalid Data Element parsing Tag details.", DicomErrorCodes.InvalidDataElement, error);

        }

        // Return the result
        return result;

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
            if (this.dataElements[i] instanceof AttributeSequence) {
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

        // Look for the "top" sequence
        for (var i = this.dataElements.length - 1; i >= 0; i--) {
            if (this.dataElements[i] instanceof Item) {
                return this.dataElements[i];
            }
        }

        return null;

    }

    /**
     * Parse the specified dump data to a dump instance.
     * @param {string} data 
     */
    parse(data) {

        // Split the data down to lines
        var lines = data.split('\n');

        // Start the "instance"
        if (this.emitter.onStartInstance != null) {
            this.context = this.emitter.onStartInstance();
        }

        // Classes of dump lines
        // WARNING ROW:         (0x0009,0x10b2) SS IR Num Iterations  - Warning - Explicit value representation doesn't match data dictionary; Explicit <SL> Dictionary <SS>
        // TAG WITHOUT <VALUE>: (0x0002,0x0000) UL File Meta Information Group Length 	 VR=<UL>   VL=<0x0004>  [0x000000c4] 
        // TAG WITH <VALUE>:    (0x0008,0x0014) UI Instance Creator UID 	 VR=<UI>   VL=<0x0040>  <1.3.6.1.4.1.14519.5.2.1.7009.2403.121957164877324988509673901373> 
        // TAG UNKNOWN:         (0x0013,0x1015)  ? 	 VR=<LO>   VL=<0x0002>  <1 > 
        // SEQUENCE ITEM:         ----:
        // ITEM TAG:                > (0x0018,0x0031) LO Radiopharmaceutical 	 VR=<LO>   VL=<0x001a>  <FDG -- fluorodeoxyglucose > 
        // END SEQUENCE:        BLANK LINE

        // Loop over the lines processing
        for (var i = 0; i < lines.length; i++) {

            // Access the line
            var line = lines[i];

            // SKIP: WARNING lines
            if (line.includes('Warning -') == true)
                continue;

            // If the line is a sequence item line, trim it up
            if (line.trim().startsWith('> (') == true) {

                // Parse the line starting with the (0x0000,0x0000)
                var startPos = line.indexOf('(0x');

                // Parse the line
                line = line.substring(startPos);

            }

            // Handle the various types of data lines
            if (line.trim().startsWith('(') == true) {

                // Parse the next item details
                var details = this.parseTagDetails(line);

                // SKIP: If the parse FAILED
                if (details == null)
                    continue;

                // Start (and end) the MetaSet (if needed) and the DataSet
                if (details.group == 2) {

                    // If the MetaSet is yet to be started
                    if ((this.startedMetaSet == false) && (this.startedDataSet == false)) {

                        // Indicate that we started the MetaSet
                        this.startedMetaSet = true;

                        // Start the meta-set
                        if (this.emitter.onStartMetaSet != null) {
                            this.emitter.onStartMetaSet(this.context);
                        }

                    }

                }
                else {

                    // End the MetaSet (if needed)
                    if (this.startedMetaSet == true) {

                        // Indicate that we ended the MetaSet
                        this.startedMetaSet = false;

                        // End the meta-set
                        if (this.emitter.onEndMetaSet != null) {
                            this.emitter.onEndMetaSet(this.context);
                        }

                    }

                    // Indicate that we are DONE with any MetaSet
                    this.startedMetaSet = null;

                    // If the DataSet is yet to be started
                    if ((this.startedMetaSet == null) && (this.startedDataSet == false)) {

                        // Indicate that we started the MetaSet
                        this.startedDataSet = true;

                        // Start the data-set
                        if (this.emitter.onStartDataSet != null) {
                            this.emitter.onStartDataSet(this.context);
                        }

                    }

                }

                // Create the attribute
                var dataElement = (details.valueRepresentation == ValueRepresentations.SQ) 
                    ? new AttributeSequence(details.tag, details.valueLength, null, TransferSyntax.NONE) 
                    : new Attribute(details.tag, details.valueLength, null, TransferSyntax.NONE);

                // Start the attribute or sequence
                if (dataElement instanceof AttributeSequence) {

                    // Start the sequence
                    if (this.emitter.onStartSequence != null) {
                        this.emitter.onStartSequence(this.context, dataElement);
                    }

                    // Push the sequence element
                    this.dataElements.push(dataElement);

                }
                else {

                    // Start the typical attribute
                    if (this.emitter.onStartAttribute != null) {
                        this.emitter.onStartAttribute(this.context, dataElement);
                    }

                    if (details.value != null) {
                        dataElement.value = details.value;
                    }

                    // Indicate that the data-element is complete
                    dataElement.isComplete = true;

                    // End the attribute
                    if (this.emitter.onEndAttribute != null) {
                        this.emitter.onEndAttribute(this.context, dataElement);
                    }

                }

            }
            else if (line.trim().startsWith('----:') == true) {

                // Peek the sequence stack
                var sequence = this.peekSequence();

                // Peek the item from the sequence stack
                var item = this.peekItem();

                // If there is a current sequence, end it
                if (item != null) {

                    // End the item
                    if (this.emitter.onEndItem != null) {
                        this.emitter.onEndItem(this.context);
                    }

                    // Pop the current item
                    this.dataElements.pop();

                }

                // Create the item
                item = new Item(Constants.UndefinedLength);

                // Push the item
                this.dataElements.push(item);

                // Start the item
                if (this.emitter.onStartItem != null) {
                    this.emitter.onStartItem(this.context);
                }

            }
            else if (line.trim() == '') {

                // Peek the sequence stack
                var sequence = this.peekSequence();

                // Peek the item from the sequence stack
                var item = this.peekItem();

                // End the item
                if (this.emitter.onEndItem != null) {
                    this.emitter.onEndItem(this.context);
                }

                // Pop the current item
                this.dataElements.pop();

                // End the current sequence
                if (this.emitter.onEndSequence != null) {
                    this.emitter.onEndSequence(this.context, sequence);
                }

                // Pop the current sequence
                this.dataElements.pop();

            }

        }

        // Emnd the data-set
        if (this.emitter.onEndDataSet != null) {
            this.emitter.onEndDataSet(this.context);
        }

        // End the "instance"
        if (this.emitter.onEndInstance != null) {
            this.result = this.emitter.onEndInstance(this.context);
        }

        // Reset the state
        this.reset();

        // Return success
        return true;

    }

    /**
     * Constructos a new DICOM Dumper with the associated DICOM Emitter.
     * @param {object} dicomEmitter The emitter used to emit dumped elements of the DICOM data.
     */
    constructor(dicomEmitter) {

        // Set the emitter
        this.emitter = dicomEmitter;
        
        // Reset the current state
        this.reset();

    }

};
