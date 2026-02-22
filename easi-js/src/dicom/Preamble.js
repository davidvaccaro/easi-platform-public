//
// Preamble.js - 1.0.0
//
// DICOM Preamble Class
// https://dicom.nema.org/medical/dicom/current/output/html/part05.html#chapter_7
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

import Constants from './Constants.js';
import DataElement from './DataElement.js';
import TransferSyntax from './TransferSyntax.js'

export default class Preamble extends DataElement {

    /**
     * Constructs a DICOM Part-10 File Meta Information "Preamble" from a specified raw data buffer.
     * @param {Uint8Array} data The specified raw data buffer.
     */
    constructor(data) {

        // Call the super constructor
        super(data, TransferSyntax.NONE, Constants.PreambleLength);

    }

};