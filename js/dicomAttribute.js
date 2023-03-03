//
// DicomAttribute.js - 1.0.0
//
// DICOM Tag Set Class 
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

class DicomAttribute extends DicomDataElement {

    /**
     * Gets the value of the attribute.
     */
    get value() {
        
        // Access the "raw" data
        var data = this.access();

        // Switch the VR type
        switch (this.tag.VR) {
            
            // UL: Handle converting the RAW data to a "unsigned long" value
            case ValueRepresentations.UL:
                return (new DataView(data.buffer)).getUint32(data.byteOffset, runtimeIsLittleEndian);
                break;

            // AE, SH, UI: Handle converting the RAW data to a "unique identifier" value
            case ValueRepresentations.AE:
            case ValueRepresentations.SH:
            case ValueRepresentations.UI:

                // Decode the string value, remove NULL chars and TRIM 
                return (new TextDecoder().decode(data)).replace(/\0/g, '').trim();
                
                break;                

            // OB: Handle converting the RAW data to a "other byte" value
            case ValueRepresentations.OB:
                // Return the raw data
                return data;
                break;

            default:
                // Return the raw data
                return data;
                break;
        }

        // Return the raw data
        return data;

    }

    /**
     * Construct a new DICOM attribute instance from a tag and data
     */
    constructor(tag, valueLength, data, transferSyntax) {

        // Call the super constructor
        super(data, transferSyntax, valueLength);

        // Set the properties
        this.tag = tag;

    }

};