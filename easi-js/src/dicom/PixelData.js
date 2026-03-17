//
// PixelData.js - 1.0.0
//
// DICOM Pixel Data Class
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
import Utilities from './Utilities.js';

export default class PixelData {

    refresh() {

        // Init the array of offsets into the raw data
        this.offsets = [];

        // Handle Undefined Length versus fixed length
        if (this.attribute.valueLength == Constants.UndefinedLength) {

            var isLittleEndian = (this.attribute?.transferSyntax?.IsLittleEndian != false);
            var itemMarker = Utilities.getItem(isLittleEndian);
            var endSequenceMarker = Utilities.getEndSequence(isLittleEndian);

            var index = 0;

            // Loop over the data buffer
            while (index < this.attribute.length()) {

                // Determine the START of the next item
                var start = this.attribute.indexOf(index, itemMarker);
                
                // Validate the start
                if (start == -1) {

                    // Determine the END of the sequence
                    var end = this.attribute.indexOf(index, endSequenceMarker);

                    // Break
                    break;

                }

                // Read the length value
                var lengthBytes = this.attribute.peek(start + 4, 4);

                if ((lengthBytes == null) || (lengthBytes.length != 4))
                    break;

                // Convert the bytes to length
                var length = Utilities.bytesToUnsignedInteger(lengthBytes, isLittleEndian);

                // Determine the initial offset
                var valueOffset = (start + 8);

                // Handle Basic Offset Table
                if (this.offsets.length == 0) {

                    // If there is a populated Basic Offset Table offsets, the the offsets are stored in the table to process and exit
                    if (length != 0) {

                        // Determine the number of offsets
                        var count = (length / 4);

                        // Parse the offset table
                        for (var i = 0; i < count; i++) {

                            // Read the length value
                            var offsetBytes = this.attribute.peek(start + 8 + (i * 4), 4);

                            if ((offsetBytes == null) || (offsetBytes.length != 4))
                                break;

                            // Convert the bytes to length
                            var offset = Utilities.bytesToUnsignedInteger(offsetBytes, isLittleEndian);

                            // Append the offset
                            this.offsets.push({ 
                                // BOT offsets are relative to the first fragment ITEM start.
                                // Decoders expect the fragment VALUE start (after 8-byte item header).
                                start: (valueOffset + length + offset + 8)
                            });

                        }

                        // Break since the offset table is now fully determined
                        break;

                    }
                    else {
                        // Empty BOT: continue scanning fragment items.
                        index = (valueOffset + length);
                        continue;
                    }

                }

                // Append the offset
                this.offsets.push({ 
                    start: valueOffset
                });

                // Increment the index
                index = (valueOffset + length);

            }

        }
        else {

            // Populate the single offset
            this.offsets.push({ 
                start: 0
            });

        }

        // Return the offsets
        return this.offsets;

    }

    /**
     * Constructs a DICOM Pixel Data reader.
     * @param {Attribute} attribute The specified raw Pixel Data attribute.
     */
    constructor(attribute) {

        // Set the attribute
        this.attribute = attribute;

        // Refresh the state
        this.refresh();

    }

};
