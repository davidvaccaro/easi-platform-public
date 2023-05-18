//
// StreamingJsonDataParser.js - 1.0.0
//
// Streaming JSON Data Parser Class 
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

import StreamingDataParser from "./StreamingDataParser.js";
import CharacterUtils from "../utils/CharacterUtils.js";
import Exception from "../environment/Exception.js";
import Runtime from "../environment/Runtime.js"
import { ParseErrorCodes } from "../environment/Exception.js";
import { Status } from "./Status.js";

export default class StreamingJsonDataParser extends StreamingDataParser {
  
    /**
     * Determines if the supplied character is a component of a number sequence.
     * @param {*} ch The character to test.
     * @returns TRUE if the character is a start of a number, FALSE otherwise
     */
    isNumberCharacter(ch) {
        if ((ch === 43 /* + */) 
            || 
            (ch === 45 /* - */) 
            ||
            (ch === 46 /* . */) 
            || 
            (ch === 69 /* E */)
            || 
            (ch === 101 /* e */)
            ||
            (ch === 48 /* 0 */) 
            ||
            (ch === 49 /* 1 */) 
            || 
            (ch === 50 /* 2 */) 
            || 
            (ch === 51 /* 3 */) 
            || 
            (ch === 52 /* 4 */) 
            || 
            (ch === 53 /* 5 */) 
            || 
            (ch === 54 /* 6 */) 
            || 
            (ch === 55 /* 7 */) 
            || 
            (ch === 56 /* 8 */)
            || 
            (ch === 57 /* 9 */))
            return true;        
        return false;        
    }

    /**
     * Peek the "current" top item of the stack of data-elements.
     * @returns The item at the top of the data-element stack.
     */
    peekCurrent() {
        
        // First, Check the state
        if ((this.dataElements == null) || (this.dataElements.length == 0))
            return null;

        return this.dataElements[this.dataElements.length - 1];

    }

    /**
     * Push the "current" top item of the stack of data-elements.
     * @returns The item at the top of the data-element stack.
     */
    pushCurrent(element) {
        
        // Pop the stack
        this.dataElements.push(element);

        // Return
        return element;

    }

    /**
     * Replace the "current" top item of the stack of data-elements.
     * @returns The item at the top of the data-element stack.
     */
    replaceCurrent(element) {
        
        // Pop the stack
        this.dataElements.pop();
        this.dataElements.push(element);

        // Return
        return element;

    }

    /**
     * Pop the "current" top item of the stack of data-elements.
     * @returns The item at the top of the data-element stack.
     */
    popCurrent() {
        
        // First, Check the state
        if ((this.dataElements == null) || (this.dataElements.length == 0))
            return null;

        // Access the top of the stack
        var element = this.dataElements[this.dataElements.length - 1];

        // Pop the stack
        this.dataElements.pop();

        // Return
        return element;

    }

    /**
     * Reset the current state of the parser.
     */
    reset() {

        // Call the super
        super.reset();

        // Init the "started" flag
        this.isStarted = false;

        // Init the current data-element stack
        this.dataElements = [];

    }

    /**
     * Peek the next JSON data-element.
     * @returns The peeked data-element details if fully present, else FALSE indicating more data is needed.
     */
    peekNextDataElement() {

        var bytesPeeked = 0;        

        var result = null;

        try {

            var ch = null;            

            // Peek the current data-element
            var dataElement = this.peekCurrent();            

            // Determine is the current data element is a string value
            var isContinue = (
                (
                    (dataElement != null)
                    &&
                    (dataElement.isComplete == false)
                    &&
                    (
                        (dataElement.type == 'string') 
                        || 
                        (dataElement.type == 'key') 
                        || 
                        (dataElement.type == 'number')
                    )                         
                ) 
                ? true 
                : false
            );

            // If there was a previous token, continue processing
            if (isContinue == false) {

                // Loop over the data skipping whitespace
                while (bytesPeeked < this.data.length()) {

                    // Peek the next data-element "group"
                    ch = this.data.peekOne(bytesPeeked);

                    // If we hit a non-whitespace character, break
                    if (CharacterUtils.isWhitespace(ch) == false)
                        break;

                    // Increment the bytes peeked
                    bytesPeeked ++;

                    ch =  null;

                }

                // If more data is needed, indicate FALSE
                if (ch == null)
                    return false;

            }

            // Determine the next data-element
            if ((isContinue == false) && (ch === 58)) {

                // HANDLE: :

                // Move past the ":" char
                bytesPeeked ++;

                // Construct "assign" details 
                result = {
                    bytesPeeked: bytesPeeked,
                    type: 'assign',
                    isComplete: true
                };

            }
            else if ((isContinue == false) && (ch === 44)) {

                // HANDLE: ,

                // Move past the "," char
                bytesPeeked ++;

                // Construct "separate" details 
                result = {
                    bytesPeeked: bytesPeeked,
                    type: 'separate',
                    isComplete: true
                };

            }
            if ((isContinue == false) && ((ch === 123) || (ch === 125))) { 
                
                // HANDLE: {}

                // Move past the "object" char
                bytesPeeked ++;

                // Construct "object" details 
                result = {
                    bytesPeeked: bytesPeeked,
                    type: 'object',
                    isComplete: false,
                    isOpen: (ch === 123) ? true : false
                };

            }
            else if ((isContinue == false) && ((ch === 91) || (ch === 93))) {

                // HANDLE: [

                // Move past the "array" char
                bytesPeeked ++;

                // Construct "array" details 
                result = {
                    bytesPeeked: bytesPeeked,
                    type: 'array',
                    isComplete: false,
                    isOpen: (ch === 91) ? true : false
                };

            }
            else if (((isContinue == true) && (dataElement.type == 'number')) || ((isContinue == false) && this.isNumberCharacter(ch))) {

                // HANDLE: Number

                var previous = null;

                // Capture the "start"
                var start = bytesPeeked;

                // Increment past the current char
                if (isContinue == false) {
                    bytesPeeked ++;
                }

                // Null the current ch
                ch = null;

                // Read the whole string
                while (bytesPeeked < this.data.length()) {

                    // Peek the next data-element "group"
                    ch = this.data.peekOne(bytesPeeked);
        
                    // If the character is awithin the domain of valid number characters
                    if (this.isNumberCharacter(ch)) {

                        // Increment the bytes peeked
                        bytesPeeked ++;

                        // Save the previous character
                        previous = ch;

                        // Null the current character
                        ch =  null;

                    }
                    else {

                        // Reached the end of the number, stop reading
                        break;

                    }
    
                }
    
                // Capture the end of the sequence
                var end = bytesPeeked;

                // Access the data
                var valueData = this.data.peek(start, (end - start));

                var value = null;

                // Determine if the current value is complete
                var isComplete = ((ch == null) && (this.data.length() > valueData.length)) ? false : true;

                // Decode the value
                if (isComplete == true) {

                    // Convert the current value to 
                    var strValue = (new TextDecoder()).decode(valueData);

                    // Determine if the value is "float" versus "integer"
                    if (strValue.indexOf('.') != -1)
                        value = parseFloat(strValue);
                    else
                        value = parseInt(strValue);

                }

                // Construct the "number" details 
                result = {
                    bytesPeeked: bytesPeeked,
                    start: start,
                    end: end,
                    type: 'number',
                    value: value,
                    isComplete: isComplete
                };

            }
            else if (((isContinue == true) && ((dataElement.type == 'string') || (dataElement.type == 'key'))) || ((isContinue == false) && (ch === 34))) {
               
                // HANDLE: String

                // Establish the previous character
                var previous = ((isContinue == true) && (dataElement.value != null) && (dataElement.value.length > 0)) 
                    ? dataElement.value[dataElement.value.length - 1] 
                    : null;

                // Capture the "start"
                var start = bytesPeeked;

                // Increment past the current char
                if (isContinue == false) {
                    bytesPeeked ++;
                }

                // Null the current ch
                ch = null;

                // Read the whole string
                while (bytesPeeked < this.data.length()) {

                    // Peek the next data-element "group"
                    ch = this.data.peekOne(bytesPeeked);
        
                    // Increment the bytes peeked
                    bytesPeeked ++;

                    // If we hit another ", interpret
                    if (ch === 34) {

                        // Handle escaped \"
                        if (previous != 92) {
                            break;
                        }

                    }
    
                    // Save the previous character
                    previous = ch;

                    // Null the current character
                    ch =  null;
    
                }
    
                // Capture the end of the sequence
                var end = bytesPeeked;

                // Determine if we are "appending"
                var isAppending = ((dataElement != null) && (dataElement.type == 'string')) ? true : false;

                // Determine if this is a "key"
                var type = ((dataElement == null) || (dataElement.type != 'object') || (dataElement.isOpen == false)) ? 'string' : 'key';

                // Detemrine if this is complete
                var isComplete = (ch == null) ? false : true;

                // Adjust the start and end to strip the "
                if ((isAppending == false) && (isComplete == true)) {
                    start++;
                    end--;
                }
                else if ((isAppending == false) && (isComplete == false)) {
                    start++;
                }
                else if ((isAppending == true) && (isComplete == true)) {
                    end--;
                }
                else if ((isAppending == true) && (isComplete == false)) {
                    // DO NOTHING
                }

                // Access the data
                var valueData = this.data.peek(start, (end - start));

                // Decode the vallue
                var value = (new TextDecoder()).decode(valueData);

                // Construct the "string" details 
                result = {
                    bytesPeeked: bytesPeeked,
                    start: start,
                    end: end,
                    type: type,
                    value: value,
                    isComplete: isComplete
                };                

            }

            if (result == null) {
                console.log("Consumed: " + this.totalBytesConsumed);
                console.log("CH: " + ch);
                console.log("bytesPeeked: " + bytesPeeked);
                console.log("JSON: " + (new TextDecoder()).decode(this.data.access()));
                console.log(dataElement);
            }
    
        }
        catch (error) {

            // Process the error
            this.fireStreamEvent("onError", error);            

        }
        
        // Return the result
        return ((result == null) ? false : result);

    }

    /**
     * Parse the next JSON Data Element from the next chunk of data.
     * @returns The current Status indicating the status of the next operation for the parser or reader.
     */
    async parseNextDataElement(isDone) {

        var bytesConsumed = 0;

        // Peek the current data-element
        var currentElement = this.peekCurrent();            

        // If there is NOT a current data-element in process
        if (currentElement == null) {

            // Peak the next data-element
            var nextElement = this.peekNextDataElement();

            // If MORE data is needed, return FALSE
            if (nextElement == false) {
                return false;
            }

            // Set the current data-element
            this.dataElements.push(nextElement);

            // Consume the data-element element data
            this.data.consume(nextElement.bytesPeeked);

            // Record bytes consumed
            bytesConsumed += nextElement.bytesPeeked;

            // Set the current element
            currentElement = nextElement;

            // Handle based on the type of element
            if (currentElement.type == 'object') {

                // Start the object
                currentElement.status = await this.fireStreamEvent("onStartObject");

            }
            else if (currentElement.type == 'array') {

                // Start the array
                currentElement.status = await this.fireStreamEvent("onStartArray");

            }
            else if (currentElement.type == 'number') {

                // Start the number
                currentElement.status = await this.fireStreamEvent("onStartNumber", currentElement.value);

            }
            else if (currentElement.type == 'string') {

                // Start the string
                currentElement.status = await this.fireStreamEvent("onStartString", currentElement.value);

            }
            else {

                // Raise exception
                throw new Exception("Invalid JSON: Current element invalid!", ParseErrorCodes.InvalidElement);

            }

            // Set the primary status if we are JUMPING, STOPPING or FAILING
            if ((currentElement.status == Status.JUMP) || (currentElement.status == Status.STOP) || (currentElement.status == Status.FAIL)) {
                this.status = currentElement.status;
            }

        }

        // If the status is still to continue processing (including SKIPPING, continue)
        if ((this.status != Status.JUMP) && (this.status != Status.STOP) && (this.status != Status.FAIL)) {

            // If there is data to process
            if (this.data.length() > 0) {

                if (currentElement.type == 'object') {

                    // HANDLE "OBJECT": Continue processing the JSON "object"

                    // Peak the next element
                    var nextElement = this.peekNextDataElement();

                    // If MORE data is needed, return FALSE
                    if (nextElement == false) {
                        return false;
                    }

                    // Consume the data-element element data
                    this.data.consume(nextElement.bytesPeeked);

                    // Record bytes consumed
                    bytesConsumed += nextElement.bytesPeeked;

                    // Handle closing this current object
                    if ((nextElement.type == 'object') && (nextElement.isOpen == false)) {

                        // End the object
                        await this.fireStreamEvent("onEndObject");

                        // Pop the current element
                        this.popCurrent();

                        // Peek the current element
                        currentElement = this.peekCurrent();

                        // Handle completing an attribute
                        if ((currentElement != null) && (currentElement.type == 'key')) {

                            // End the attribute
                            await this.fireStreamEvent("onEndAttribute", currentElement.value);

                            // Pop the element
                            this.popCurrent();

                        }

                    }
                    else {

                        // Validate that this next element MUST be a key or separate
                        if ((nextElement.type != 'key') && (nextElement.type != 'separate')) {
                            throw new Exception("Invalid JSON: Next element MUST be a key or comma!", ParseErrorCodes.InvalidElement);
                        }
                        else {

                            if (nextElement.type == 'key') {

                                // Start the attribute
                                nextElement.status = await this.fireStreamEvent("onStartAttribute", nextElement.value);

                                // Push the key onto the stack
                                this.pushCurrent(nextElement);

                            }
                            else {

                                // NOTHING TO DO HERE

                            }

                        }

                    }

                }
                else if (currentElement.type == 'array') {

                    // HANDLE "ARRAY": Continue processing the JSON "array"

                    // Peak the next element
                    var nextElement = this.peekNextDataElement();

                    // If MORE data is needed, return FALSE
                    if (nextElement == false) {
                        return false;
                    }

                    // Consume the data-element element data
                    this.data.consume(nextElement.bytesPeeked);

                    // Record bytes consumed
                    bytesConsumed += nextElement.bytesPeeked;

                    // Handle closing this current array
                    if ((nextElement.type == 'array') && (nextElement.isOpen == false)) {

                        // End the object
                        await this.fireStreamEvent("onEndArray");

                        // Pop the current element
                        this.popCurrent();

                        // Peek the current element
                        currentElement = this.peekCurrent();

                        // Handle completing an attribute
                        if ((currentElement != null) && (currentElement.type == 'key')) {

                            // End the attribute
                            await this.fireStreamEvent("onEndAttribute", currentElement.value);

                            // Pop the element
                            this.popCurrent();

                        }

                    }
                    else {

                        // Validate that this next element MUST be an object, an array, a string or a number OR separate
                        if ((nextElement.type != 'object') && (nextElement.type != 'array') && (nextElement.type != 'string') && (nextElement.type != 'number') && (nextElement.type != 'separate')) {
                            throw new Exception("Invalid JSON: Next element MUST be an object, array, string, number or comma!", ParseErrorCodes.InvalidElement);
                        }
                        else {

                            // Handle based on the type of element
                            if (nextElement.type == 'object') {

                                // Start the object
                                nextElement.status = await this.fireStreamEvent("onStartObject");

                                // Push the key onto the stack
                                this.pushCurrent(nextElement);

                            }
                            else if (nextElement.type == 'array') {

                                // Start the array
                                nextElement.status = await this.fireStreamEvent("onStartArray");

                                // Push the key onto the stack
                                this.pushCurrent(nextElement);

                            }
                            else if (nextElement.type == 'number') {

                                // Start the number
                                nextElement.status = await this.fireStreamEvent("onStartNumber", nextElement.value);

                                // Push the key onto the stack
                                this.pushCurrent(nextElement);

                            }
                            else if (nextElement.type == 'string') {

                                // Start the string
                                nextElement.status = await this.fireStreamEvent("onStartString", nextElement.value);

                                // Push the key onto the stack
                                this.pushCurrent(nextElement);

                            }
                            else if (nextElement.type == 'separate') {

                                // NOTHING TO DO HERE 

                            }

                        }

                    }

                }
                else if (currentElement.type == 'number') {

                    // If the number is NOT yet complete, attempt to continue reading
                    if (currentElement.isComplete == false) {

                        // Peak the next data-element
                        var nextElement = this.peekNextDataElement();

                        // If MORE data is needed, return FALSE
                        if (nextElement == false) {
                            return false;
                        }

                        // Consume the data-element element data
                        this.data.consume(nextElement.bytesPeeked);

                        // Record bytes consumed
                        bytesConsumed += nextElement.bytesPeeked;

                        // Replace the current data-element
                        this.replaceCurrent(nextElement);

                        // Handle the current state of the data-element
                        if (nextElement.isComplete == true) {

                            // End the number
                            await this.fireStreamEvent("onEndNumber", nextElement.value);

                            // Pop the current element
                            this.popCurrent();

                            // Peek the current element
                            currentElement = this.peekCurrent();

                            // Handle completing an attribute
                            if ((currentElement != null) && (currentElement.type == 'key')) {

                                // End the attribute
                                await this.fireStreamEvent("onEndAttribute", currentElement.value);

                                // Pop the element
                                this.popCurrent();

                            }

                        }

                    }
                    else {

                        // End the number
                        await this.fireStreamEvent("onEndNumber", currentElement.value);

                        // Pop the current element
                        this.popCurrent();

                        // Peek the current element
                        currentElement = this.peekCurrent();

                        // Handle completing an attribute
                        if ((currentElement != null) && (currentElement.type == 'key')) {

                            // End the attribute
                            await this.fireStreamEvent("onEndAttribute", currentElement.value);

                            // Pop the element
                            this.popCurrent();

                        }

                    }

                }
                else if (currentElement.type == 'string') {

                    // If the string is NOT yet complete, attempt to continue reading
                    if (currentElement.isComplete == false) {

                        // Peak the next data-element
                        var nextElement = this.peekNextDataElement();

                        // If MORE data is needed, return FALSE
                        if (nextElement == false) {
                            return false;
                        }

                        // Consume the data-element element data
                        this.data.consume(nextElement.bytesPeeked);

                        // Record bytes consumed
                        bytesConsumed += nextElement.bytesPeeked;

                        // Replace the current data-element
                        this.replaceCurrent(nextElement);

                        // Handle the current state of the data-element
                        if (nextElement.isComplete == true) {

                            // Append the stirng
                            await this.fireStreamEvent("onAppendString", nextElement.value);

                            // End the string
                            await this.fireStreamEvent("onEndString");

                            // Pop the current element
                            this.popCurrent();

                            // Peek the current element
                            currentElement = this.peekCurrent();

                            // Handle completing an attribute
                            if ((currentElement != null) && (currentElement.type == 'key')) {

                                // End the attribute
                                await this.fireStreamEvent("onEndAttribute", currentElement.value);

                                // Pop the element
                                this.popCurrent();

                            }

                        }
                        else {

                            // Append the stirng
                            await this.fireStreamEvent("onAppendString", nextElement.value);

                        }

                    }
                    else {

                        // End the number
                        await this.fireStreamEvent("onEndString");

                        // Pop the current element
                        this.popCurrent();

                        // Peek the current element
                        currentElement = this.peekCurrent();

                        // Handle completing an attribute
                        if ((currentElement != null) && (currentElement.type == 'key')) {

                            // End the attribute
                            await this.fireStreamEvent("onEndAttribute", currentElement.value);

                            // Pop the element
                            this.popCurrent();

                        }

                    }

                }
                else if (currentElement.type == 'key') {

                    // Peak the next element
                    var nextElement = this.peekNextDataElement();

                    // If MORE data is needed, return FALSE
                    if (nextElement == false) {
                        return false;
                    }

                    // Consume the data-element element data
                    this.data.consume(nextElement.bytesPeeked);

                    // Record bytes consumed
                    bytesConsumed += nextElement.bytesPeeked;

                    // Validate that this next element MUST be an object, an array, a string or a number OR separate
                    if ((nextElement.type != 'object') && (nextElement.type != 'array') && (nextElement.type != 'string') && (nextElement.type != 'number') && (nextElement.type != 'assign')) {
                        throw new Exception("Invalid JSON: Next element MUST be an object, array, string, number or assign!", ParseErrorCodes.InvalidElement);
                    }
                    else {

                        // Handle based on the type of element
                        if (nextElement.type == 'object') {

                            // Start the object
                            nextElement.status = await this.fireStreamEvent("onStartObject");

                            // Push the key onto the stack
                            this.pushCurrent(nextElement);

                        }
                        else if (nextElement.type == 'array') {

                            // Start the array
                            nextElement.status = await this.fireStreamEvent("onStartArray");

                            // Push the key onto the stack
                            this.pushCurrent(nextElement);

                        }
                        else if (nextElement.type == 'number') {

                            // Start the number
                            nextElement.status = await this.fireStreamEvent("onStartNumber", nextElement.value);

                            // Push the key onto the stack
                            this.pushCurrent(nextElement);

                        }
                        else if (nextElement.type == 'string') {

                            // Start the string
                            nextElement.status = await this.fireStreamEvent("onStartString", nextElement.value);

                            // Push the key onto the stack
                            this.pushCurrent(nextElement);

                        }
                        else if (nextElement.type == 'assign') {

                            // NOTHING TO DO HERE 

                        }

                    }

                }
                else {

                    // Raise exception
                    throw new Exception("Invalid JSON: Current element invalid!", ParseErrorCodes.InvalidElement);

                }

            }

            // Peek the current data-element
            currentElement = this.peekCurrent();            

            // If there is NO MORE DATA but remaining data-element, complete it
            if ((this.data.isEmpty == true) && (currentElement != null)) {

                // End the current element, based on the type
                if (currentElement.type == 'object') {

                    // End the object
                    await this.fireStreamEvent("onEndObject");

                    // Pop the current element
                    this.popCurrent();

                }
                else if (currentElement.type == 'array') {

                    // End the array
                    await this.fireStreamEvent("onEndArray");

                    // Pop the current element
                    this.popCurrent();

                }
                else if (currentElement.type == 'number') {

                    // End the number
                    await this.fireStreamEvent("onEndNumber", currentElement.value);

                    // Pop the current element
                    this.popCurrent();

                }
                else if (currentElement.type == 'string') {

                    // End the string
                    await this.fireStreamEvent("onEndString", currentElement.value);

                    // Pop the current element
                    this.popCurrent();

                }
                else {

                    // Raise exception
                    throw new Exception("Invalid JSON: Current element invalid!", ParseErrorCodes.InvalidElement);

                }

                // Peek the current element
                currentElement = this.peekCurrent();

                // Handle completing an attribute
                if ((currentElement != null) && (currentElement.type == 'key')) {

                    // End the attribute
                    await this.fireStreamEvent("onEndAttribute", currentElement.value);

                    // Pop the element
                    this.popCurrent();

                }

            }

        }

        // Increment the total bytes consumed
        this.totalBytesConsumed += bytesConsumed;

        // Return TRUE if there are more bytes to process
        return (
            (this.data.isEmpty == false) 
            && 
            (
                ((this.status != Status.JUMP) 
                && 
                (this.status != Status.STOP) 
                && 
                (this.Status != Status.FAIL)) 
            )
        );

    }

    /**
     * Parse the specified chunk of DICOM data.
     * @param {*} chunk The specified chunk of DICOM data.
     * @returns TRUE if a DICOM is fully parsed, FALSE otherwise.
     */
    async parse(chunk, isDone = false, totalRead = null, totalLength = null) {

        // Init the status
        var status = Status.CONTINUE;

        // Ensure that the parser has performed the initiel reset
        if (this.data == null) {
            this.data.reset();
        }

        // Append the new chunk of data
        if ((chunk != null) && (chunk.length > 0)) {

            // Append the new chunck
            this.data.append(chunk);

        }

        // Init the parse
        if (this.isStarted == false) {

            // Start the parse
            this.context = await this.fireStreamEvent("onStart", this.context);

            // Set the flag
            this.isStarted = true;

        }

        // Update the "progress" state
        this.bytesRead = totalRead;
        this.bytesTotal = totalLength;

        // Read the next data-element elements until the part is complete
        while (await this.parseNextDataElement(isDone) == true) {
            // KEEP PARSING
        }

        // If the parsing is COMPLETE!
        if ((isDone == true) && (this.data.length() == 0)) {

            // End the parse
            this.result = await this.fireStreamEvent("onEnd", this.context);

            // Reset the state
            this.reset();

            // Indicate that the current DICOM is fully parsed
            return Status.SUCCESS;

        }

        // Indicate that current status
        return status;

    }

    /**
     * Constructos a new JSON Parser with the associated DICOM Stream Handler.
     */
    constructor() {

        // Call the super 
        super();

    }
    
};