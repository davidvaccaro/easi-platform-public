//
// Mapping.js - 1.0.0
//
// Mapping Class 
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

export default class Mapping {

    /**
     * Add a maping from a key to an object property.
     * @param {string} key The specified key.
     * @param {string} property The property name or path to a property within an object hierarchy.
     */
    add(key, property) {
        this[key] = property;
    }

    /**
     * Determine if the mapping has the current key.
     * @param {string} key The specified key.
     * @returns TRUE if the mapping maps the key, FALSE otherwise.
     */
    has(key){
        return (this[key] != null);
    }
    
    /**
     * Start the mapping session.
     * @param {object} context The session context.
     */
    start(context) {
    }

    /**
     * End the mapping session.
     * @param {object} context The session context.
     */
    end(context) {
    }

    /**
     * Map the key and value to the destination property.
     * @param {object} context The session context.
     * @param {string} key The specified key. 
     * @param {unknown} value The value to set to the destination mapped attribute.
     */
    map(context, key, value) {

        // If the current key is NOT mapped, return
        if (this.has(key) == false)
            return;

        // Get the path to the destination from the map
        var path = this[key];

        // Split the path by "." 
        var parts = path.split('.');

        // The object reference
        var reference = context;

        // Establish the final object reference
        if (parts.length > 1) {

            // Loop binding to each part until we reach the next to last part
            for (var i = 0; i < (parts.length - 1); i++) {

                // Save the last reference
                var lastReference = reference;

                // Access the current part
                reference = reference[parts[i]];

                // If the reference is a function, de-reference it
                if (typeof reference === 'function') {
                    reference = reference.call(lastReference);
                }

            }

        }

        // Set the value
        if (typeof reference[parts[parts.length - 1]] === 'function') {
            reference[parts[parts.length - 1]].call(reference, value);
        }
        else {
            reference[parts[parts.length - 1]] = value;
        }        

    }

    constructor() {
    }

};