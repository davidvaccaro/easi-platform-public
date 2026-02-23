//
// StreamingJsonDataHandler.js - 1.0.0
//
// Stream JSON Handler Class 
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

import { Status } from "../parsers/Status.js";

export default class StreamingJsonDataHandler {

    onReset() {
    }

    onStart(context) {

        // Setup the context based on the previous context
        if (context == null) {

            // Create the initial context
            context = {
                current: null,
                stack: [],
                results: []
            };

        }

        return context;

    }

    onStartObject(context) {        
        
        // Save the previous
        var previous = context.current;

        // Create the new object
        var object = {};

        // Push onto the stack
        context.stack.push(object);

        // Set the current
        context.current = object;

        if (previous != null) {
            // Set the object
            if (context.attribute != null) {
                previous[context.attribute] = object;
            }
            else {
                previous.push(object);
            }
        }

    }

    onStartArray(context) {       
        
        // Save the previous
        var previous = context.current;

        // Create the new array
        var array = [];

        // Push onto the stack
        context.stack.push(array);

        // Set the current
        context.current = array;

        if (previous != null) {
            // Set the array
            if (context.attribute != null) {
                previous[context.attribute] = array;
            }
            else {
                previous.push(array);
            }
        }

    }

    onStartAttribute(context, name) {
        context.attribute = name;
    }

    onStartNumber(context, value) {
    }

    onStartBoolean(context, value) {
    }

    onStartNull(context) {
    }

    onStartString(context, value) {
        if (context.current == null) {
            context.current = value;
        }
        else if (Array.isArray(context.current) == false) {
            context.current[context.attribute] = value;
        }
        else if (Array.isArray(context.current) == true) {
            context.current.push(value);
        }
    }

    onAppendString(context, value) {
        if (context.current == null) {
            context.current += value;
        }
        else if (Array.isArray(context.current) == false) {
            context.current[context.attribute] += value;
        }
        else if (Array.isArray(context.current) == true) {
            context.current[context.current.length - 1] += value;
        }
    }
    
    onEndObject(context) {

        // Save the previous
        var previous = context.current;

        // Pop the stack
        context.stack.pop();

        // Set the current 
        context.current = (context.stack.length == 0) ? previous : context.stack[context.stack.length - 1];

    }

    onEndArray(context) {

        // Save the previous
        var previous = context.current;

        // Pop the stack
        context.stack.pop();

        // Set the current 
        context.current = (context.stack.length == 0) ? previous : context.stack[context.stack.length - 1];

    }

    onEndAttribute(context, name) {
        context.attribute = null;
    }

    onEndNumber(context, value) {
        if (context.current == null) {
            context.current = value;
        }
        else if (Array.isArray(context.current) == false) {
            context.current[context.attribute] = value;
        }
        else if (Array.isArray(context.current) == true) {
            context.current.push(value);
        }
    }

    onEndBoolean(context, value) {
        if (context.current == null) {
            context.current = value;
        }
        else if (Array.isArray(context.current) == false) {
            context.current[context.attribute] = value;
        }
        else if (Array.isArray(context.current) == true) {
            context.current.push(value);
        }
    }

    onEndNull(context) {
        if (context.current == null) {
            context.current = null;
        }
        else if (Array.isArray(context.current) == false) {
            context.current[context.attribute] = null;
        }
        else if (Array.isArray(context.current) == true) {
            context.current.push(null);
        }
    }
    
    onEndString(context) {
    }

    onEnd(context) {       
        
        // Add the prior json to the collection
        if (context.current != null) {
            context.results.push(context.current);
        }

        // If there is only 1 instance, return it otherwise return the collection
        return (context.results.length == 1) ? context.current : context.results;
        
    }

    onError(context, error) {        
    }

    onProgress(context, progress) {
    }

    /**
     * Create a new JSON handler.
     */
    constructor() {
    }

};
