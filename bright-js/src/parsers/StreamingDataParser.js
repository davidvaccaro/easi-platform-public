//
// StreamingDataParser.js - 1.0.0
//
// Streaming Data Parser Base Class 
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

export default class StreamingDataParser {
  
    /**
     * Fires a stream event or skips the event if the stream-handler does NOT support the event.
     * @param {*} name The name of the event.
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

    }
        
    /**
     * Parse the specified chunk of data.
     * @param {*} chunk The specified chunk of data.
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
     * @param {*} handler The handler used to handle parsed elements of the data.
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
     * Constructos a new Streaming Data Parser.
     */
    constructor() {
        
        // Default the "strict" status
        this._isStrict = false;
        
        // Init the session context
        this.context = null;

    }
    
};