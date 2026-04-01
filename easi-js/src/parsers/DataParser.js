//
// DataParser.js
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

import Data from '../data/Data.js';
import { Status } from './Status.js';

export default class DataParser {

    /**
     * Determine whether the supplied value is Promise-like.
     * @param {*} value The value to test.
     * @returns {boolean} TRUE when the value is thenable.
     */
    isThenable(value) {
        return ((value != null) && (typeof value.then === 'function'));
    }
  
    /**
     * Fires a stream event or skips the event if the stream-handler does NOT support the event.
     * @param {string} name The name of the event.
     * @param {*} param The parameter to pass to the event.
     * @returns The status based on the standard processing.
     */
    fireStreamEvent(name, param, currentStatus) {

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

            if (this.isThenable(result) == true) {
                return result.then((resolved) => ((resolved == null) ? Status.CONTINUE : resolved));
            }

            status = (result == null) ? Status.CONTINUE : result;

        }

        return status;

    }

    /**
     * Fires a throttled progress event. Parsers should call this explicitly (typically once per parse chunk).
     * @param {*} currentStatus The current parser status.
     * @returns {*} The resulting status.
     */
    fireProgressEvent(currentStatus = Status.CONTINUE) {

        // If there is NO handler, NOOP
        if (this._handler == null)
            return Status.CONTINUE;

        // Only pulse progress while continuing.
        if (currentStatus != Status.CONTINUE)
            return currentStatus;

        // If the stream-handler does not support progress, NOOP.
        if (this._handler.onProgress == undefined)
            return Status.CONTINUE;

        // Call the event function
        const result = this._handler.onProgress(
            this.context, {
                bytesRead: this.bytesRead,
                bytesProcessed: this.totalBytesConsumed,
                bytesTotal: this.bytesTotal
            }
        );

        if (this.isThenable(result) == true) {
            return result.then((resolved) => ((resolved == null) ? Status.CONTINUE : resolved));
        }

        return (result == null) ? Status.CONTINUE : result;

    }

    /**
     * Reset the current state of the parser.
     */
    reset() {

        // Init the part consumed
        this.totalBytesConsumed = 0;

        // Create the new DICOM data buffer
        this.data = new Data();

        // Init the current status
        this.status = Status.CONTINUE;

        // Reset the handler
        this.fireStreamEvent("onReset");            

        // Clear the current bytes-processed
        this.bytesRead = 0;
        this.bytesProcessed = 0;
        this.bytesTotal = 0;

        // Clear the last parser error.
        this.error = null;

    }

    /**
     * Reset process-session state before a new top-level reader transaction.
     * This isolates one `pipeline.process(...)` call from the next while allowing
     * parser-level part resets within a single transaction.
     */
    resetSession() {

        // Clear prior transaction context.
        this.context = null;

        // Clear prior transaction parser outcome/error state.
        this.result = null;
        this.error = null;

    }
        
    /**
     * Parse the specified chunk of data.
     * @param {Uint8Array} chunk The specified chunk of data.
     * @returns The Status for the reader to use to correctly process the next check.
     */
    async parse(chunk, isDone = false, totalRead = null, totalLength = null) {
    }

    /**
     * Sets the the status indicating that this parser is perfomring "strict" parsing.
     * @description Strict indicates that the parser will strictly enforce general structural aspects of the parsed format.
     */
    set isStrict (isStrict) {
        this._isStrict = isStrict;
    }

    /**
     * Gets the status indicating that this parser is performing "strict" parsing.
     * @description Strict indicates that the parser will strictly enforce general structural aspects of the parsed format.
     */
    get isStrict() {
        return this._isStrict;
    }

    /**
     * Sets the current handler for this parser.
     * @param {object} handler The handler used to handle parsed elements of the data.
     */
    set handler (handler) {
        this._handler = handler;
    }

    /**
     * Gets the current handler for this parser.
     * @returns The handler used to handle parsed elements of the data.
     */
    get handler () {
        return this._handler;
    }

    /**
     * Constructos a new Data Parser.
     */
    constructor() {
        
        // Default the "strict" status
        this._isStrict = false;
        
        // Init the session context
        this.context = null;

        // Init the last parser error
        this.error = null;

    }
    
};
