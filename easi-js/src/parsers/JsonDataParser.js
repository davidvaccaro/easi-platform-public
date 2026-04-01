//
// JsonDataParser.js
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

import DataParser from "./DataParser.js";
import CharacterUtils from "../utils/CharacterUtils.js";
import Exception from "../environment/Exception.js";
import Runtime from "../environment/Runtime.js"
import { ParseErrorCodes } from "../environment/Exception.js";
import { Status } from "./Status.js";

export default class JsonDataParser extends DataParser {
  
    /**
     * Determines if the supplied character is a digit (0-9).
     * @param {number} ch The character to test.
     * @returns TRUE if the character is a digit, FALSE otherwise.
     */
    isDigit(ch) {
        return ((ch >= 48) && (ch <= 57));
    }

    /**
     * Determines if the supplied character is a hexadecimal digit.
     * @param {number} ch The character to test.
     * @returns TRUE if the character is a hexadecimal digit, FALSE otherwise.
     */
    isHexDigit(ch) {
        return (
            ((ch >= 48) && (ch <= 57))
            ||
            ((ch >= 65) && (ch <= 70))
            ||
            ((ch >= 97) && (ch <= 102))
        );
    }

    /**
     * Determines if the supplied character can delimit a JSON primitive value.
     * @param {number} ch The character to test.
     * @returns TRUE if the character is a JSON primitive delimiter, FALSE otherwise.
     */
    isValueDelimiter(ch) {
        return (
            (ch == null)
            ||
            (CharacterUtils.isWhitespace(ch) == true)
            ||
            (ch === 44) /* , */
            ||
            (ch === 93) /* ] */
            ||
            (ch === 125) /* } */
        );
    }

    /**
     * Parse a JSON number token from the current data.
     * @param {number} start The number start offset.
     * @param {number} length The current available data length.
     * @param {boolean} isDone Indicates that no more input data is expected.
     * @returns {object | boolean} The parsed token details or FALSE if more data is needed.
     */
    parseNumberToken(start, length, isDone = false) {

        var i = start;

        // Parse optional minus sign.
        if (this.data.peekOne(i) === 45 /* - */) {
            i++;
            if (i >= length) {
                if (isDone == true)
                    throw new Exception("Invalid JSON: Incomplete number token.", ParseErrorCodes.InvalidElement);
                return false;
            }
        }

        // Parse integer part.
        var ch = this.data.peekOne(i);
        if (ch === 48 /* 0 */) {
            i++;
        }
        else if ((ch >= 49) && (ch <= 57)) {
            i++;
            while ((i < length) && this.isDigit(this.data.peekOne(i))) {
                i++;
            }
        }
        else {
            throw new Exception("Invalid JSON: Invalid number token.", ParseErrorCodes.InvalidElement);
        }

        // Parse optional fraction.
        if ((i < length) && (this.data.peekOne(i) === 46 /* . */)) {
            i++;
            if (i >= length) {
                if (isDone == true)
                    throw new Exception("Invalid JSON: Incomplete number fraction.", ParseErrorCodes.InvalidElement);
                return false;
            }
            if (this.isDigit(this.data.peekOne(i)) == false)
                throw new Exception("Invalid JSON: Invalid number fraction.", ParseErrorCodes.InvalidElement);
            while ((i < length) && this.isDigit(this.data.peekOne(i))) {
                i++;
            }
        }

        // Parse optional exponent.
        if ((i < length) && ((this.data.peekOne(i) === 69 /* E */) || (this.data.peekOne(i) === 101 /* e */))) {
            i++;
            if (i >= length) {
                if (isDone == true)
                    throw new Exception("Invalid JSON: Incomplete number exponent.", ParseErrorCodes.InvalidElement);
                return false;
            }
            if ((this.data.peekOne(i) === 43 /* + */) || (this.data.peekOne(i) === 45 /* - */)) {
                i++;
                if (i >= length) {
                    if (isDone == true)
                        throw new Exception("Invalid JSON: Incomplete number exponent.", ParseErrorCodes.InvalidElement);
                    return false;
                }
            }
            if (this.isDigit(this.data.peekOne(i)) == false)
                throw new Exception("Invalid JSON: Invalid number exponent.", ParseErrorCodes.InvalidElement);
            while ((i < length) && this.isDigit(this.data.peekOne(i))) {
                i++;
            }
        }

        // Validate delimiter (or end-of-input).
        var next = (i < length) ? this.data.peekOne(i) : null;
        if (this.isValueDelimiter(next) == false)
            throw new Exception("Invalid JSON: Invalid number delimiter.", ParseErrorCodes.InvalidElement);
        if ((next == null) && (isDone == false))
            return false;

        // Decode the raw number text.
        var strValue = this.decoder.decode(this.data.peek(start, (i - start)));

        // Parse to Number (RFC 8259 number domain).
        var value = Number(strValue);
        if (Number.isFinite(value) == false)
            throw new Exception("Invalid JSON: Non-finite number value.", ParseErrorCodes.InvalidElement);

        return {
            bytesPeeked: i,
            type: 'number',
            value: value,
            isComplete: true
        };

    }

    /**
     * Parse a JSON literal token from the current data.
     * @param {number} start The token start offset.
     * @param {number} length The current available data length.
     * @param {Array<number>} literalBytes The literal bytes (ASCII).
     * @param {string} type The token type.
     * @param {unknown} value The token value.
     * @param {boolean} isDone Indicates that no more input data is expected.
     * @returns {object | boolean} The parsed token details or FALSE if more data is needed.
     */
    parseLiteralToken(start, length, literalBytes, type, value, isDone = false) {

        // Ensure the full literal is available.
        if ((start + literalBytes.length) > length) {
            if (isDone == true)
                throw new Exception("Invalid JSON: Incomplete literal token.", ParseErrorCodes.InvalidElement);
            return false;
        }

        // Validate bytes.
        for (var i = 0; i < literalBytes.length; i++) {
            if (this.data.peekOne(start + i) !== literalBytes[i])
                throw new Exception("Invalid JSON: Invalid literal token.", ParseErrorCodes.InvalidElement);
        }

        // Validate delimiter (or end-of-input).
        var end = (start + literalBytes.length);
        var next = (end < length) ? this.data.peekOne(end) : null;
        if (this.isValueDelimiter(next) == false)
            throw new Exception("Invalid JSON: Invalid literal delimiter.", ParseErrorCodes.InvalidElement);
        if ((next == null) && (isDone == false))
            return false;

        return {
            bytesPeeked: end,
            type: type,
            value: value,
            isComplete: true
        };

    }

    /**
     * Determines if the supplied character is a component of a number sequence.
     * @param {number} ch The character to test.
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
     * Fire a JSON stream event and update parser status when the event requests terminal control flow.
     * @param {string} name The stream event name.
     * @param {unknown} param The stream event parameter.
     * @returns The status returned from the stream handler.
     */
    fireJsonEvent(name, param = null) {

        // Fire the underlying stream event.
        var status = super.fireStreamEvent(name, param);

        if (this.isThenable(status) == true) {
            return status.then((resolved) => {

                // Update parser status when terminal flow is requested.
                if ((resolved == Status.JUMP) || (resolved == Status.STOP) || (resolved == Status.FAIL)) {
                    this.status = resolved;
                }

                return resolved;

            });
        }

        // Update parser status when terminal flow is requested.
        if ((status == Status.JUMP) || (status == Status.STOP) || (status == Status.FAIL)) {
            this.status = status;
        }

        return status;

    }

    /**
     * Peek the next JSON data-element.
     * @returns The peeked data-element details if fully present, else FALSE indicating more data is needed.
     */
    peekNextDataElement(isDone = false) {

        var bytesPeeked = 0;        

        var result = null;

        try {

            // Establish the data length
            var length = this.data.length();

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
                    (dataElement.type == 'string') 
                ) 
                ? true 
                : false
            );

            // If there was a previous token, continue processing
            if (isContinue == false) {

                // Loop over the data skipping whitespace
                while (bytesPeeked < length) {

                    // Peek the next data-element "group"
                    ch = this.data.peekOne(bytesPeeked);

                    // If we hit a non-whitespace character, break
                    if (CharacterUtils.isWhitespace(ch) == false)
                        break;

                    // Increment the bytes peeked
                    bytesPeeked ++;

                    ch = null;

                }

                // If more data is needed, indicate FALSE
                if ((ch == null) || (bytesPeeked == length)) {
                    return false;
                }

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
            else if ((isContinue == false) && ((ch === 123) || (ch === 125))) { 
                
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
            else if ((isContinue == false) && ((ch === 45 /* - */) || this.isDigit(ch))) {
                result = this.parseNumberToken(bytesPeeked, length, isDone);
            }
            else if ((isContinue == false) && (ch === 116 /* t */)) {
                result = this.parseLiteralToken(bytesPeeked, length, [116, 114, 117, 101], 'boolean', true, isDone);
            }
            else if ((isContinue == false) && (ch === 102 /* f */)) {
                result = this.parseLiteralToken(bytesPeeked, length, [102, 97, 108, 115, 101], 'boolean', false, isDone);
            }
            else if ((isContinue == false) && (ch === 110 /* n */)) {
                result = this.parseLiteralToken(bytesPeeked, length, [110, 117, 108, 108], 'null', null, isDone);
            }
            else if (((isContinue == true) && (dataElement.type == 'string')) || ((isContinue == false) && (ch === 34))) {
               
                // HANDLE: String

                // Determine if we are appending to an existing string token.
                var isAppending = ((dataElement != null) && (dataElement.type == 'string')) ? true : false;

                // Determine if this string token is a key.
                var type = ((dataElement == null) || (dataElement.type != 'object') || (dataElement.isOpen == false)) ? 'string' : 'key';

                // Track the string scan position.
                var start = bytesPeeked + ((isContinue == true) ? 0 : 1);
                var index = start;
                var escaped = ((isContinue == true) && (dataElement.isEscaped == true)) ? true : false;
                var unicodeRemaining = ((isContinue == true) && (dataElement.unicodeRemaining != null)) ? dataElement.unicodeRemaining : 0;
                var isComplete = false;

                // Scan the string token with RFC 8259 escape rules.
                while (index < length) {

                    // Access the current character.
                    ch = this.data.peekOne(index);

                    // Continue processing unicode escape hex bytes.
                    if (unicodeRemaining > 0) {
                        if (this.isHexDigit(ch) == false)
                            throw new Exception("Invalid JSON: Invalid unicode escape sequence.", ParseErrorCodes.InvalidElement);
                        unicodeRemaining--;
                        index++;
                        continue;
                    }

                    // Continue processing escaped characters.
                    if (escaped == true) {
                        if (
                            (ch === 34)   /* " */
                            ||
                            (ch === 92)   /* \ */
                            ||
                            (ch === 47)   /* / */
                            ||
                            (ch === 98)   /* b */
                            ||
                            (ch === 102)  /* f */
                            ||
                            (ch === 110)  /* n */
                            ||
                            (ch === 114)  /* r */
                            ||
                            (ch === 116)  /* t */
                        ) {
                            escaped = false;
                            index++;
                            continue;
                        }
                        else if (ch === 117 /* u */) {
                            escaped = false;
                            unicodeRemaining = 4;
                            index++;
                            continue;
                        }
                        else {
                            throw new Exception("Invalid JSON: Invalid escape sequence.", ParseErrorCodes.InvalidElement);
                        }
                    }

                    // Start escape mode.
                    if (ch === 92 /* \ */) {
                        escaped = true;
                        index++;
                        continue;
                    }

                    // Detect closing quote.
                    if (ch === 34 /* " */) {
                        isComplete = true;
                        break;
                    }

                    // JSON strings may not contain unescaped control characters.
                    if (ch < 32)
                        throw new Exception("Invalid JSON: Control character in string.", ParseErrorCodes.InvalidElement);

                    // Continue scanning.
                    index++;

                }

                // Keys must be complete before emitting.
                if ((isComplete == false) && (type == 'key')) {
                    if (isDone == true)
                        throw new Exception("Invalid JSON: Unterminated key string.", ParseErrorCodes.InvalidElement);
                    return false;
                }

                // If a non-key string is incomplete at end-of-input, this is invalid JSON.
                if ((isComplete == false) && (isDone == true))
                    throw new Exception("Invalid JSON: Unterminated string token.", ParseErrorCodes.InvalidElement);

                // Determine token content bounds.
                var end = (isComplete == true) ? index : length;
                var valueData = this.data.peek(start, (end - start));
                var value = this.decoder.decode(valueData);

                // Include the closing quote in bytesPeeked when complete.
                bytesPeeked = (isComplete == true) ? (index + 1) : length;

                // Construct the string token details.
                result = {
                    bytesPeeked: bytesPeeked,
                    type: type,
                    value: value,
                    isComplete: isComplete,
                    isEscaped: escaped,
                    unicodeRemaining: unicodeRemaining
                };

            }
            else if (isContinue == false) {
                throw new Exception("Invalid JSON: Unexpected token.", ParseErrorCodes.InvalidElement);
            }
    
        }
        catch (error) {

            // Mark parser failure.
            this.status = Status.FAIL;

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
            var nextElement = this.peekNextDataElement(isDone);

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
                currentElement.status = await this.fireJsonEvent("onStartObject");

            }
            else if (currentElement.type == 'array') {

                // Start the array
                currentElement.status = await this.fireJsonEvent("onStartArray");

            }
            else if (currentElement.type == 'number') {

                // Start the number
                currentElement.status = await this.fireJsonEvent("onStartNumber", currentElement.value);

            }
            else if (currentElement.type == 'string') {

                // Start the string
                currentElement.status = await this.fireJsonEvent("onStartString", currentElement.value);

            }
            else if (currentElement.type == 'boolean') {

                // Start the boolean
                currentElement.status = await this.fireJsonEvent("onStartBoolean", currentElement.value);

            }
            else if (currentElement.type == 'null') {

                // Start null
                currentElement.status = await this.fireJsonEvent("onStartNull");

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
                    var nextElement = this.peekNextDataElement(isDone);

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
                        await this.fireJsonEvent("onEndObject");

                        // Pop the current element
                        this.popCurrent();

                        // Peek the current element
                        currentElement = this.peekCurrent();

                        // Handle completing an attribute
                        if ((currentElement != null) && (currentElement.type == 'key')) {

                            // End the attribute
                            await this.fireJsonEvent("onEndAttribute", currentElement.value);

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
                                nextElement.status = await this.fireJsonEvent("onStartAttribute", nextElement.value);

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
                    var nextElement = this.peekNextDataElement(isDone);

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
                        await this.fireJsonEvent("onEndArray");

                        // Pop the current element
                        this.popCurrent();

                        // Peek the current element
                        currentElement = this.peekCurrent();

                        // Handle completing an attribute
                        if ((currentElement != null) && (currentElement.type == 'key')) {

                            // End the attribute
                            await this.fireJsonEvent("onEndAttribute", currentElement.value);

                            // Pop the element
                            this.popCurrent();

                        }

                    }
                    else {

                        // Validate that this next element MUST be an object, an array, a string, a number, a boolean, null OR separate
                        if ((nextElement.type != 'object') && (nextElement.type != 'array') && (nextElement.type != 'string') && (nextElement.type != 'number') && (nextElement.type != 'boolean') && (nextElement.type != 'null') && (nextElement.type != 'separate')) {
                            throw new Exception("Invalid JSON: Next element MUST be an object, array, string, number, boolean, null or comma!", ParseErrorCodes.InvalidElement);
                        }
                        else {

                            // Handle based on the type of element
                            if (nextElement.type == 'object') {

                                // Start the object
                                nextElement.status = await this.fireJsonEvent("onStartObject");

                                // Push the key onto the stack
                                this.pushCurrent(nextElement);

                            }
                            else if (nextElement.type == 'array') {

                                // Start the array
                                nextElement.status = await this.fireJsonEvent("onStartArray");

                                // Push the key onto the stack
                                this.pushCurrent(nextElement);

                            }
                            else if (nextElement.type == 'number') {

                                // Start the number
                                nextElement.status = await this.fireJsonEvent("onStartNumber", nextElement.value);

                                // Push the key onto the stack
                                this.pushCurrent(nextElement);

                            }
                            else if (nextElement.type == 'string') {

                                // Start the string
                                nextElement.status = await this.fireJsonEvent("onStartString", nextElement.value);

                                // Push the key onto the stack
                                this.pushCurrent(nextElement);

                            }
                            else if (nextElement.type == 'boolean') {

                                // Start the boolean
                                nextElement.status = await this.fireJsonEvent("onStartBoolean", nextElement.value);

                                // Push the key onto the stack
                                this.pushCurrent(nextElement);

                            }
                            else if (nextElement.type == 'null') {

                                // Start null
                                nextElement.status = await this.fireJsonEvent("onStartNull");

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
                        var nextElement = this.peekNextDataElement(isDone);

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
                            await this.fireJsonEvent("onEndNumber", nextElement.value);

                            // Pop the current element
                            this.popCurrent();

                            // Peek the current element
                            currentElement = this.peekCurrent();

                            // Handle completing an attribute
                            if ((currentElement != null) && (currentElement.type == 'key')) {

                                // End the attribute
                                await this.fireJsonEvent("onEndAttribute", currentElement.value);

                                // Pop the element
                                this.popCurrent();

                            }

                        }

                    }
                    else {

                        // End the number
                        await this.fireJsonEvent("onEndNumber", currentElement.value);

                        // Pop the current element
                        this.popCurrent();

                        // Peek the current element
                        currentElement = this.peekCurrent();

                        // Handle completing an attribute
                        if ((currentElement != null) && (currentElement.type == 'key')) {

                            // End the attribute
                            await this.fireJsonEvent("onEndAttribute", currentElement.value);

                            // Pop the element
                            this.popCurrent();

                        }

                    }

                }
                else if (currentElement.type == 'boolean') {

                    // End the boolean
                    await this.fireJsonEvent("onEndBoolean", currentElement.value);

                    // Pop the current element
                    this.popCurrent();

                    // Peek the current element
                    currentElement = this.peekCurrent();

                    // Handle completing an attribute
                    if ((currentElement != null) && (currentElement.type == 'key')) {

                        // End the attribute
                        await this.fireJsonEvent("onEndAttribute", currentElement.value);

                        // Pop the element
                        this.popCurrent();

                    }

                }
                else if (currentElement.type == 'null') {

                    // End null
                    await this.fireJsonEvent("onEndNull");

                    // Pop the current element
                    this.popCurrent();

                    // Peek the current element
                    currentElement = this.peekCurrent();

                    // Handle completing an attribute
                    if ((currentElement != null) && (currentElement.type == 'key')) {

                        // End the attribute
                        await this.fireJsonEvent("onEndAttribute", currentElement.value);

                        // Pop the element
                        this.popCurrent();

                    }

                }
                else if (currentElement.type == 'string') {

                    // If the string is NOT yet complete, attempt to continue reading
                    if (currentElement.isComplete == false) {

                        // Peak the next data-element
                        var nextElement = this.peekNextDataElement(isDone);

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
                            await this.fireJsonEvent("onAppendString", nextElement.value);

                            // End the string
                            await this.fireJsonEvent("onEndString");

                            // Pop the current element
                            this.popCurrent();

                            // Peek the current element
                            currentElement = this.peekCurrent();

                            // Handle completing an attribute
                            if ((currentElement != null) && (currentElement.type == 'key')) {

                                // End the attribute
                                await this.fireJsonEvent("onEndAttribute", currentElement.value);

                                // Pop the element
                                this.popCurrent();

                            }

                        }
                        else {

                            // Append the stirng
                            await this.fireJsonEvent("onAppendString", nextElement.value);

                        }

                    }
                    else {

                        // End the number
                        await this.fireJsonEvent("onEndString");

                        // Pop the current element
                        this.popCurrent();

                        // Peek the current element
                        currentElement = this.peekCurrent();

                        // Handle completing an attribute
                        if ((currentElement != null) && (currentElement.type == 'key')) {

                            // End the attribute
                            await this.fireJsonEvent("onEndAttribute", currentElement.value);

                            // Pop the element
                            this.popCurrent();

                        }

                    }

                }
                else if (currentElement.type == 'key') {

                    // Peak the next element
                    var nextElement = this.peekNextDataElement(isDone);

                    // If MORE data is needed, return FALSE
                    if (nextElement == false) {
                        return false;
                    }

                    // Consume the data-element element data
                    this.data.consume(nextElement.bytesPeeked);

                    // Record bytes consumed
                    bytesConsumed += nextElement.bytesPeeked;

                    // Validate that this next element MUST be an object, an array, a string, a number, a boolean, null OR assign
                    if ((nextElement.type != 'object') && (nextElement.type != 'array') && (nextElement.type != 'string') && (nextElement.type != 'number') && (nextElement.type != 'boolean') && (nextElement.type != 'null') && (nextElement.type != 'assign')) {
                        throw new Exception("Invalid JSON: Next element MUST be an object, array, string, number, boolean, null or assign!", ParseErrorCodes.InvalidElement);
                    }
                    else {

                        // Handle based on the type of element
                        if (nextElement.type == 'object') {

                            // Start the object
                            nextElement.status = await this.fireJsonEvent("onStartObject");

                            // Push the key onto the stack
                            this.pushCurrent(nextElement);

                        }
                        else if (nextElement.type == 'array') {

                            // Start the array
                            nextElement.status = await this.fireJsonEvent("onStartArray");

                            // Push the key onto the stack
                            this.pushCurrent(nextElement);

                        }
                        else if (nextElement.type == 'number') {

                            // Start the number
                            nextElement.status = await this.fireJsonEvent("onStartNumber", nextElement.value);

                            // Push the key onto the stack
                            this.pushCurrent(nextElement);

                        }
                        else if (nextElement.type == 'string') {

                            // Start the string
                            nextElement.status = await this.fireJsonEvent("onStartString", nextElement.value);

                            // Push the key onto the stack
                            this.pushCurrent(nextElement);

                        }
                        else if (nextElement.type == 'boolean') {

                            // Start the boolean
                            nextElement.status = await this.fireJsonEvent("onStartBoolean", nextElement.value);

                            // Push the key onto the stack
                            this.pushCurrent(nextElement);

                        }
                        else if (nextElement.type == 'null') {

                            // Start null
                            nextElement.status = await this.fireJsonEvent("onStartNull");

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
            if ((isDone == true) && (this.data.isEmpty == true) && (currentElement != null)) {

                // End the current element, based on the type
                if (currentElement.type == 'object') {

                    // End the object
                    await this.fireJsonEvent("onEndObject");

                    // Pop the current element
                    this.popCurrent();

                }
                else if (currentElement.type == 'array') {

                    // End the array
                    await this.fireJsonEvent("onEndArray");

                    // Pop the current element
                    this.popCurrent();

                }
                else if (currentElement.type == 'number') {

                    // End the number
                    await this.fireJsonEvent("onEndNumber", currentElement.value);

                    // Pop the current element
                    this.popCurrent();

                }
                else if (currentElement.type == 'string') {

                    // End the string
                    await this.fireJsonEvent("onEndString", currentElement.value);

                    // Pop the current element
                    this.popCurrent();

                }
                else if (currentElement.type == 'boolean') {

                    // End the boolean
                    await this.fireJsonEvent("onEndBoolean", currentElement.value);

                    // Pop the current element
                    this.popCurrent();

                }
                else if (currentElement.type == 'null') {

                    // End null
                    await this.fireJsonEvent("onEndNull");

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
                    await this.fireJsonEvent("onEndAttribute", currentElement.value);

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
                (this.status != Status.FAIL)) 
            )
        );

    }

    /**
     * Parse the specified chunk of JSON data.
     * @param {Uint8Array} chunk The specified chunk of DICOM data.
     * @returns TRUE if a DICOM is fully parsed, FALSE otherwise.
     */
    async parse(chunk, isDone = false, totalRead = null, totalLength = null) {
        
        try {

            // Ensure that the parser has performed the initial reset.
            if (this.data == null) {
                this.reset();
            }

            // Append the new chunk of data
            if ((chunk != null) && (chunk.length > 0)) {

                // Append the new chunck
                this.data.append(chunk);

            }

            // Init the parse
            if (this.isStarted == false) {

                // Start the parse
                this.context = await this.fireJsonEvent("onStart", this.context);

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

            // Pulse progress once per parse invocation (chunk-level) instead of after every onEnd* event.
            if (this.status == Status.CONTINUE) {
                var progressStatus = await super.fireProgressEvent(this.status);
                if ((progressStatus == Status.JUMP) || (progressStatus == Status.STOP) || (progressStatus == Status.FAIL)) {
                    this.status = progressStatus;
                }
            }

            // Handle terminal statuses requested by the stream handler.
            if ((this.status == Status.STOP) || (this.status == Status.JUMP)) {

                var terminalStatus = this.status;

                // End the parse and preserve any partial result.
                this.result = await this.fireJsonEvent("onEnd", this.context);

                // Reset state for the next parse.
                this.reset();

                return terminalStatus;

            }

            // If parser status is FAIL, reset and return fail.
            if (this.status == Status.FAIL) {

                var failedStatus = this.status;

                // Reset state for the next parse.
                this.reset();

                // Preserve the parser error captured by onError (if any) for the caller.
                // When FAIL is returned directly by a handler without an exception, this remains null.

                return failedStatus;

            }

            // If the caller marked input complete, consume trailing whitespace.
            if (isDone == true) {
                while ((this.data.length() > 0) && (CharacterUtils.isWhitespace(this.data.peekOne(0)) == true)) {
                    this.data.consume(1);
                    this.totalBytesConsumed += 1;
                }
            }

            // If parsing is complete with no remaining buffered data and no open tokens, finalize.
            if ((isDone == true) && (this.data.length() == 0) && (this.peekCurrent() == null)) {

                // End the parse
                this.result = await this.fireJsonEvent("onEnd", this.context);

                // Reset the state
                this.reset();

                // Indicate that the current JSON payload is fully parsed.
                return Status.SUCCESS;

            }

            // If input is done but parser still has buffered data or open tokens, this is invalid JSON.
            if (isDone == true) {

                var invalidJsonError = new Exception("Invalid JSON: Unexpected end of input.", ParseErrorCodes.InvalidElement);

                // Set failure status.
                this.status = Status.FAIL;

                // Notify the handler.
                await super.fireStreamEvent("onError", invalidJsonError);

                // Reset state for the next parse.
                this.reset();

                // Preserve the underlying parser error for the caller.
                this.error = invalidJsonError;

                return Status.FAIL;

            }

            // Continue reading until terminal status or parse completion.
            return Status.CONTINUE;

        }
        catch (error) {

            // Set failure status.
            this.status = Status.FAIL;

            // Notify the handler.
            await super.fireStreamEvent("onError", error);

            // Reset state for the next parse.
            this.reset();

            // Preserve the underlying parser error for the caller.
            this.error = error;

            return Status.FAIL;

        }

    }

    /**
     * Constructos a new JSON Parser with the associated DICOM Stream Handler.
     */
    constructor() {

        // Call the super 
        super();

        // Create a text decoder
        this.decoder = new TextDecoder();

    }
    
};
