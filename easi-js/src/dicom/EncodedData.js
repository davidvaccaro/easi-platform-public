//
// EncodedData.js - 1.0.0
//
// DICOM Data Class 
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

import Data from '../data/Data.js'
import Runtime from '../environment/Runtime.js';
import Utilities from './Utilities.js';
import Exception from '../environment/Exception.js';
import { GeneralErrorCodes } from '../environment/Exception.js';
import TransferSyntax from './TransferSyntax.js'

export default class EncodedData extends Data {

    /**
     * Convert the current DICOM data buffer to the specified transfer-syntax.
     * @param {TransferSyntax} newTransferSyntax The new transfer-syntax to convert to.
     */
    convert(newTransferSyntax) {

        // Check for NOOP
        if (this.transferSyntax == newTransferSyntax)
            return;

        // If there currently is data in the buffer and the new transfer-syntax endian-ness does NOT agree, flip the bytes
        if ((this.length() > 0)
            && (newTransferSyntax != TransferSyntax.NONE)
            && (this.transferSyntax != TransferSyntax.NONE)
            && (this.transferSyntax.IsLittleEndian != newTransferSyntax.IsLittleEndian)) {
            this._setData(Utilities.swapBytes(this.access()));
        }

        // Set the transfer-syntax
        this.transferSyntax = newTransferSyntax;

    }

    /**
     * Append the specified raw bytes to the DICOM data buffer.
     * @param {Uint8Array} raw The raw byts to append.
     */
    append(raw) {

        // Validate the appended data
        if (raw == null)
            throw new Exception("Invalid raw DICOM data. Cannot append undefind or null data.", GeneralErrorCodes.InvalidParameter);

        // Establish the new data
        var newData = null;

        // Prepare the new data (with a endian-swap if needed)
        if ((this.transferSyntax != TransferSyntax.NONE) && (this.transferSyntax.IsLittleEndian != Runtime.isLittleEndian))
            newData = Utilities.swapBytes(raw);
        else
            newData = raw;

        // Append through the base Data implementation (capacity-managed).
        super.append(newData);

    }

    /**
     * Construct the new DICOM data buffer.
     */
    constructor(raw = null, transferSyntax = TransferSyntax.NONE) {

        // Call the super
        super();

        // Check the params
        if (raw == null)
            raw = new Uint8Array(0);

        // Set the transfer-syntax
        this.transferSyntax = transferSyntax;

        // Append the new buffer
        this.append(raw);

    }

};
