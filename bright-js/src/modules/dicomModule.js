//
// DicomMetaSet.js - 1.0.0
//
// DICOM Module Class 
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

import DicomAttributeSet from '../dicomAttributeSet.js';
import { Tag } from '../dicomTag.js'

export default class DicomModule {
    
    /**
     * Parses the value of an integer string value attribute taking into account the value multiplicity.
     * @param {*} value The value of the integer string.
     * @param {*} vm The value multiplicity of the integer string.
     * @returns A single integer value for multiplicity of 1, an array of integer values for multiplicity of N, null if the value is empty.
     */
    accessIntegerString(value, vm) {
        
        // Defaul the VM
        if (vm == null) {
            vm = { Exact: 1 };
        }

        // Populate the result array
        var result = [];
        if (value != null) {
            var parts = value.split('\\');
            for (var i = 0; i < parts.length; i++) {
                result.push(parseInt(parts[i]));
            }
        }

        // Return (based on state)
        return (vm.Exact == 1) 
            ? ((result.length == 0) ? null : result.pop())
            : result;

    }

    /**
     * Parses the value of an decimal string value attribute taking into account the value multiplicity.
     * @param {*} value The value of the decimal string.
     * @param {*} vm The value multiplicity of the decimal string.
     * @returns A single decimal value for multiplicity of 1, an array of decimal values for multiplicity of N, null if the value is empty.
     */
    accessDecimalString(value, vm) {
        
        // Defaul the VM
        if (vm == null) {
            vm = { Exact: 1 };
        }

        // Populate the result array
        var result = [];
        if (value != null) {
            var parts = value.split('\\');
            for (var i = 0; i < parts.length; i++) {
                result.push(parseFloat(parts[i]));
            }
        }

        // Return (based on state)
        return (vm.Exact == 1) 
            ? ((result.length == 0) ? null : result.pop())
            : result;

    }

    /**
     * Construct an "empty" new DICOM meta-set
     */
    constructor(attributeSet) {

        // Set the attributes
        this.attributeSet = attributeSet;

    }

};