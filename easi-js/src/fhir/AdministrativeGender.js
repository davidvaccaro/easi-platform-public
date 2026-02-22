//
// AdministrativeGender.js - 1.0.0
//
// FHIR AdministrativeGender Class
// https://www.hl7.org/fhir/valueset-name-use.html
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

import SymbolUtils from "../utils/SymbolUtils.js";

export var AdministrativeGender = {
    MALE: Symbol('MALE'),
    FEMALE: Symbol('FEMALE'),
    OTHER: Symbol('OTHER'),
    UNKNOWN: Symbol('UNKNOWN'),

    coerce: function (value) {

        // Handle NOOP NULL or Symbol
        if ((value == null) || (typeof value === 'symbol')) {
            return value;
        }

        // Default to UNKNOWN
        var result = AdministrativeGender.UNKNOWN;

        // If the value is a string, 
        if (typeof value === 'string') {

            // Switch the value
            switch (value.trim().toUpperCase()) {
                case 'M': result = AdministrativeGender.MALE; break; 
                case 'F': result = AdministrativeGender.FEMALE; break; 
                case 'O': result = AdministrativeGender.OTHER; break; 
                case 'U': result = AdministrativeGender.UNKNOWN; break; 
                case 'MALE': result = AdministrativeGender.MALE; break; 
                case 'FEMALE': result = AdministrativeGender.FEMALE; break; 
                case 'OTHER': result = AdministrativeGender.OTHER; break; 
                case 'UNKNOWN': result = AdministrativeGender.UNKNOWN; break; 
            }

        }

        return result;

    },

    toJSON: function (value) {
        return SymbolUtils.toJSON(value);
    }
};