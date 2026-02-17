//
// StreamingDicomMetadataInstanceHandler.js - 1.0.0
//
// Streaming DICOM JSON Metadata Handler Class 
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

import Instance from "../dicom/Instance.js";
import Attribute from "../dicom/Attribute.js";
import AttributeSequence from "../dicom/AttributeSequence.js";
import Item from "../dicom/Item.js";
import MetaSet from "../dicom/MetaSet.js";
import DataSet from "../dicom/DataSet.js";
import ValueRepresentation from "../dicom/ValueRepresentation.js";
import Tag from "../dicom/Tag.js"
import TransferSyntax from "../dicom/TransferSyntax.js";

export default class StreamingDicomMetadataInstanceHandler {

    onReset() {
    }

    onStart(context) {

        // Setup the context based on the previous context
        if (context == null) {

            // Create the initial context
            context = {
                instance: null,
                attribute: null,
                tag: null,
                item: null,
                value: null,
                stack: [],
                results: []
            };

        }

        return context;

    }

    onStartObject(context) {
        
        // If there is NO current instance, then this MUST be a new instance object, otherwise an attribute
        if (context.instance == null) {

            // Create the new instance
            context.instance = new Instance();

        }
        else {
            
            // Handle starting a new "attribute" versus an "item"
            if (context.tag != null) {

                // Create the attribute if needed
                context.attribute = { tag: context.tag };

                // Push the attribute onto the stack
                context.stack.push(context.attribute);

                // Null out the tag
                context.tag = null;

            }
            else {

                // Peek the current top of the stack
                var top = (context.stack.length > 0) ? context.stack[context.stack.length - 1] : null;

                // If the "top" is a sequence, add the sequence item, otherwise this is an object value
                if ((top != null) && (top.tag != null) && (top.tag.VR == ValueRepresentation.SQ)) {

                    // Create the item
                    context.item = new Item();

                    // Push the item onto the stack
                    context.stack.push(context.item);

                }
                else {

                    // This condition happens when the value is an object
                    // EXAMPLE: "Value": [{ "Alphabetic": "ACRIN-NSCLC-FDG-PET-042" }]

                    // Crreat the object value
                    context.value = {};

                    // Push the value onto the stack
                    context.stack.push(context.value);

                }

            }

        }

    }

    onStartArray(context) {
        
        // If there is NO current instance, then this MUST be the inial array, otherwise a Value
        if (context.instance == null) {

            // Nothing to do here since the "result" array is setup within onStart

        }
        else {

            // Initialize the current value
            context.attribute.value = [];

            // Null the current parsed value
            context.value = null;

        }

    }

    onEndArray(context) {
    }

    onStartAttribute(context, name) {

        // Handle the attribute type
        switch (name.toLowerCase()) {

            // Handle the value-representation of the current DICOM attribute
            case 'vr':
                // Initiate the start of the VR
                context.attribute.vr = null;
            break;

            // Handle the value of the current DICOM attribute
            case 'value':
                // Initiate the start of the value
                context.attribute.value = null;
            break;

            // Handle the Bulk Data URI value
            case 'bulkdatauri':
                context.attribute.isBulkDataURI = true;
                context.attribute.value = null;
            break;

            // Handle skipped/ignored key types
            case 'alphabetic':
                context.value.type = name.toLowerCase();
                break;

            // Handle the tag-identifier of the current DICOM attribute
            default:
                // Set the tag
                context.tag = Tag.find(name);
            break;

        }

    }

    onStartNumber(context, value) {
    }

    onStartString(context, value) {

        // Capture the current value
        if (context.value == null) {
            context.value = value;
        }
        else {
            context.value.value = value;
        }

    }

    onAppendString(context, value) {

        // Append the current value
        context.value += value;

        // Capture the current value
        if (typeof context.value === 'string') {
            context.value += value;
        }
        else {
            context.value.value += value;
        }

    }

    onEndString(context) {

        // Process the current string value based on the "type" of string
        if (context.attribute.vr == null) {
            context.attribute.vr = ValueRepresentation.find(context.value);
        }
        else {
            
            // Create the attribute value array (if needed)
            if (context.attribute.value == null) {
                context.attribute.value = [];
            }

            // Add the current value to the attribute value array
            context.attribute.value.push(context.value);

        }

        // Clear the current value
        context.value = null;        

    }
    
    onEndObject(context) {

        // Objects in the stack are either an attribute (object) or an Item or empty inplying the instance
        
        // Establish the current object (if any)
        var current = (context.stack.length > 0) ? context.stack[context.stack.length - 1] : null;

        // Pop the stack
        context.stack.pop();

        // Peek the current top of the stack
        var top = (context.stack.length > 0) ? context.stack[context.stack.length - 1] : null;

        // If there is a current 
        if (current != null) {

            // If the current element is an Item
            if (current instanceof Item) {

                // If there is NOT yet a collection of elements
                if (top.elements == null) {
                    top.elements = [];
                }

                // Push the item
                top.elements.push(current);

            }
            else if (current.tag == null) {

                // Nothing to do here as the attribute value array should already be populated the object value
                var xxx = 100;

            }
            else {

                var dataElement = null;

                // Create the attribute from the details collected previously
                if (current.vr == ValueRepresentation.SQ) {
                    
                    // Create the data element
                    dataElement = new AttributeSequence(current.tag, 0, null, TransferSyntax.NONE)
    
                    // Populate any data-elements
                    if ((current.elements != null) && (current.elements.length > 0)) {
                        dataElement.addAll(current.elements);
                    }
    
                }
                else {
    
                    // Create the value attribute
                    dataElement = new Attribute(current.tag, 0, null, TransferSyntax.NONE);
    
                    // TODO - decode the value
    
                    // Set the value
                    dataElement.value = current.value;                
    
                    // Indicate that the data-element is complete
                    dataElement.isComplete = true;
    
                }
    
                // If there is a top item on the stack, add the element to the list of elements, otherwise add to the instance
                if (top != null) {
    
                    // If there is NOT yet a collection of elements
                    if (top.elements == null) {
                        top.elements = [];
                    }
    
                    // Push the data-element
                    top.elements.push(dataElement);
    
                }
                else {
    
                    var elementSet = null;
    
                    // Determine the attribute-set to add this data-element to
                    if (dataElement.tag.Group == 2) {
    
                        // Create the meta-set if needed
                        if (context.instance.metaSet == null) {
                            context.instance.metaSet = new MetaSet();
                        }
    
                        // Set the current element-set
                        elementSet = context.instance.metaSet;
    
                    }
                    else {
    
                        // Create the data-set if needed
                        if (context.instance.dataSet == null) {
                            context.instance.dataSet = new DataSet();
                        }
    
                        // Set the current element-set
                        elementSet = context.instance.dataSet;
    
                    }
    
                    // Add to the instance
                    elementSet.add(dataElement);
                    
                }

            }

        }
        else {

            // Add the instance to the results array
            context.results.push(context.instance);

            // Init the instance
            context.instance = null;       

        }

    }

    onEndAttribute(context, name) {
    }

    onEndNumber(context, value) {

        // Create the attribute value array (if needed)
        if (context.attribute.value == null) {
            context.attribute.value = [];
        }

        // Add the current value to the attribute value array
        context.attribute.value.push(value);

        // Clear the current value
        context.value = null;            

    }
    
    onEnd(context) {
        
        // Return the results
        return context.results;
        
    }

    onError(context, error) {        
    }

    onProgress(context, progress) {
    }

    /**
     * Create a new DICOM JSON Metadata handler.
     */
    constructor() {
    }

};