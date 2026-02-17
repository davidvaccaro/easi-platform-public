//
// StreamingDicomMetadataMappingHandler.js - 1.0.0
//
// Streaming DICOM JSON Metadata Mapping Handler Class 
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

import AttributeSequence from "../dicom/AttributeSequence.js";
import StreamingDicomMetadataInstanceHandler from "./StreamingDicomMetadataInstanceHandler.js";

export default class StreamingDicomMetadataMappingHandler extends StreamingDicomMetadataInstanceHandler {

    /**
     * Normalize the supplied attribute to a mapping-friendly tag/value pair.
     * @param {Attribute | AttributeSequence} attribute The current attribute.
     * @returns {object} A mapping-friendly tag/value payload.
     */
    normalizeAttribute(attribute) {

        // Sequences and non-value attributes are passed through unchanged
        if ((attribute == null) || (attribute instanceof AttributeSequence)) {
            return attribute;
        }

        // Normalize JSON metadata single-valued arrays to scalar values
        if ((Array.isArray(attribute.value) == true) && (attribute.value.length == 1)) {
            return { tag: attribute.tag, value: attribute.value[0] };
        }

        // Keep multi-valued arrays as-is
        return { tag: attribute.tag, value: attribute.value };

    }

    /**
     * Traverse the supplied attribute and any nested sequence item attributes.
     * @param {Attribute | AttributeSequence} attribute The current attribute.
     * @param {Function} callback The callback invoked for each traversed attribute.
     */
    traverseAttribute(attribute, callback) {

        // Invoke callback for the current attribute
        callback(attribute);

        // Traverse nested sequence item attributes (if needed)
        if (attribute instanceof AttributeSequence) {

            // Loop over all items
            for (var i = 0; i < attribute.items.length; i++) {

                // Access the current item
                var item = attribute.items[i];

                // Loop over all item attributes
                for (var x = 0; x < item.attributes.length; x++) {
                    this.traverseAttribute(item.attributes[x], callback);
                }

            }

        }

    }

    /**
     * Apply the current mapping to the specified instance.
     * @param {object} mappingContext The mapping context.
     * @param {Instance} instance The source DICOM instance.
     */
    applyMapping(mappingContext, instance) {

        // Start the mapping
        mappingContext = this.mapping.start(mappingContext);

        // Apply to all meta-set attributes
        if ((instance.metaSet != null) && (instance.metaSet.attributes != null)) {
            for (var i = 0; i < instance.metaSet.attributes.length; i++) {
                this.traverseAttribute(instance.metaSet.attributes[i], attribute => this.mapping.mapAttribute(mappingContext, this.normalizeAttribute(attribute)));
            }
        }

        // Apply to all data-set attributes
        if ((instance.dataSet != null) && (instance.dataSet.attributes != null)) {
            for (var i = 0; i < instance.dataSet.attributes.length; i++) {
                this.traverseAttribute(instance.dataSet.attributes[i], attribute => this.mapping.mapAttribute(mappingContext, this.normalizeAttribute(attribute)));
            }
        }

        // End the mapping for this instance
        this.mapping.end(mappingContext);

    }

    /**
     * Returns the mapped output value from the parsed DICOM JSON metadata stream.
     * @returns The mapped output value.
     */
    onEnd(context) {

        // Build DICOM instances from the parsed DICOM JSON metadata
        var instances = super.onEnd(context);

        // Build the mapping context
        var mappingContext = { final: null };

        // Apply mapping per instance
        for (var i = 0; i < instances.length; i++) {
            this.applyMapping(mappingContext, instances[i]);
        }

        // Return the final mapped output
        return mappingContext.final;

    }

    /**
     * Create a new DICOM JSON Metadata mapping handler.
     * @param {DicomMapping} mapping The specified mapping to apply.
     */
    constructor(mapping) {

        // Call the base
        super();

        // Set the mapping
        this.mapping = mapping;

    }

};
