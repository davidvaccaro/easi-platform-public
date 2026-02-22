//
// Attribute.js - 1.0.0
//
// DICOM Attribute Class 
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

import Runtime from '../environment/Runtime.js';
import ValueRepresentations from './ValueRepresentation.js';
import DataElement from '../dicom/DataElement.js';
import Utilities from './Utilities.js';

export default class Attribute extends DataElement {

    /**
     * Gets the value of the attribute.
     */
    get value() {
        
        // If there is a value override, return it
        if (this._value != null)
            return this._value;

        // Access the "raw" data
        var data = this.access();

        // Switch the VR type
        switch (this.tag.VR) {
            
            // UL: Handle converting the RAW data to a "unsigned long" value
            case ValueRepresentations.UL:
                return (new DataView(data.buffer)).getUint32(data.byteOffset, Runtime.isLittleEndian);

            // SL: Handle converting the RAW data to a "signed long" value
            case ValueRepresentations.SL:
                return (new DataView(data.buffer)).getInt32(data.byteOffset, Runtime.isLittleEndian);

            // US: Handle converting the RAW data to a "unsigned short" value
            case ValueRepresentations.US:
                return (new DataView(data.buffer)).getUint16(data.byteOffset, Runtime.isLittleEndian);

            // SS: Handle converting the RAW data to a "signed short" value
            case ValueRepresentations.SS:
                return (new DataView(data.buffer)).getInt16(data.byteOffset, Runtime.isLittleEndian);

            // AE, SH, UI, IS, DS, CS, PN, LT: Handle converting the RAW data to a generic string value
            case ValueRepresentations.AE:
            case ValueRepresentations.SH:
            case ValueRepresentations.UI:
            case ValueRepresentations.LO:
            case ValueRepresentations.IS:
            case ValueRepresentations.DS:
            case ValueRepresentations.CS:
            case ValueRepresentations.PN:
            case ValueRepresentations.LT:
                    // Decode the string value, remove NULL chars and TRIM 
                return (new TextDecoder().decode(data)).replace(/\0/g, '').trim();                

            // DA: Handle converting the RAW data to a short "Date" value
            case ValueRepresentations.DA:
                return Utilities.parseDA((new TextDecoder().decode(data)).replace(/\0/g, '').trim());

            // DT: Handle converting the RAW data to a long "DateTime" value
            case ValueRepresentations.DT:
                return Utilities.parseDT((new TextDecoder().decode(data)).replace(/\0/g, '').trim());

            // TM: Handle converting the RAW data to a short "Time" value
            case ValueRepresentations.TM:
                return Utilities.parseTM((new TextDecoder().decode(data)).replace(/\0/g, '').trim());

            // OB: Handle converting the RAW data to a "other byte" value
            case ValueRepresentations.OB:
                // Return the raw data
                return data;

            default:
                // Return the raw data
                return data;

        }

    }

    /**
     * Sets the value of the attribute.
     * @description This feature is primaerily used as an preference overried to the value that can be decoded from the attribute data.
     */
    set value(value) {
        this._value = value;
    }

    /**
     * Construct a new DICOM attribute instance from a tag and data
     */
    constructor(tag, valueLength, data, transferSyntax) {

        // Call the super constructor
        super(data, transferSyntax, valueLength);

        // Set the properties
        this.tag = tag;

        // Init the value overried
        this._value = null;

    }

};
