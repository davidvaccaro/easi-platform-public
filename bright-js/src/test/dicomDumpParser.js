//
// DicomDumpParser.js - 1.0.0
//
// DICOM Dump Parser Class
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

import DicomConstants from '../dicomConstants.js';
import DicomConfiguration from '../dicomConfiguration.js';
import DicomUtilities from '../dicomUtilities.js';
import DicomException from '../dicomException.js';

import DicomTransferSyntax from '../dicomTransferSyntax.js';
import { TransferSyntax } from '../dicomTransferSyntax.js';

import DicomValueRepresentation from '../dicomValueRepresentation.js';
import { ValueRepresentations } from '../dicomValueRepresentation.js';

import DicomTag from '../dicomTag.js';
import { Tag } from '../dicomTag.js';

import DicomData from '../dicomData.js';
import DicomAttribute from '../dicomAttribute.js';
import DicomItem from '../dicomItem.js';
import DicomAttributeSequence from '../dicomAttributeSequence.js';

export default class DicomDumpParser {

    /**
     * Reset the current state of the parser.
     */
    reset() {

        // Init the state
        this.startedMetaSet = false;
        this.startedDataSet = false;

        // Reset the emitter
        if (this.emitter.reset != null) {
            this.emitter.reset();
        }

    }

    /**
     * Parse the specified dump data to a dump instance.
     * @param {*} data 
     */
    parse(data) {

        // Split the data down to lines
        var lines = data.split('\n');

        // Start the "instance"
        if (this.emitter.startInstance != null) {
            this.emitter.startInstance();
        }

        // Classes of dump lines
        // WARNING ROW:         (0x0009,0x10b2) SS IR Num Iterations  - Warning - Explicit value representation doesn't match data dictionary; Explicit <SL> Dictionary <SS>
        // TAG WITHOUT <VALUE>: (0x0002,0x0000) UL File Meta Information Group Length 	 VR=<UL>   VL=<0x0004>  [0x000000c4] 
        // TAG WITH <VALUE>:    (0x0008,0x0014) UI Instance Creator UID 	 VR=<UI>   VL=<0x0040>  <1.3.6.1.4.1.14519.5.2.1.7009.2403.121957164877324988509673901373> 
        // TAG UNKNOWN:         (0x0013,0x1015)  ? 	 VR=<LO>   VL=<0x0002>  <1 > 
        // SEQUENCE ITEM:         ----:
        // END SEQUENCE:        BLANK LINE

        // Loop over the lines processing
        for (var i = 0; i < lines.length; i++) {

            // Access the line
            var line = lines[i];

            // SKIP: WARNING lines
            if (line.includes('Warning -') == true)
                continue;

            // Handle the various types of data lines
            if (line.trim().startsWith('(') == true) {

                // Establish the (0x0002,0x0000) group and element part
                var groupAndElement = line.trim().substring(0, 14).replaceAll('(', '').replaceAll(')', '').trim().split(',');

                // SKIP: invalid tag parts
                if (groupAndElement.length != 2)
                    continue;

                // Parse the group 
                var group = parseInt(groupAndElement[0]);

                // Parse the element
                var element = parseInt(groupAndElement[1]);

                // Establish the DICOM data-element tag identifier
                var identifier = DicomTag.identifier(group, element);

                // Establish the DICOM Tag
                var tag = DicomTag.find(identifier);

                // Start (and end) the MetaSet (if needed) and the DataSet
                if (group == 2) {

                    // If the MetaSet is yet to be started
                    if ((this.startedMetaSet == false) && (this.startedDataSet == false)) {

                        // Indicate that we started the MetaSet
                        this.startedMetaSet = true;

                        // Start the meta-set
                        if (this.emitter.startMetaSet != null) {
                            this.emitter.startMetaSet();
                        }

                    }

                }
                else {

                    // End the MetaSet (if needed)
                    if (this.startedMetaSet == true) {

                        // Indicate that we ended the MetaSet
                        this.startedMetaSet = false;

                        // End the meta-set
                        if (this.emitter.endMetaSet != null) {
                            this.emitter.endMetaSet();
                        }

                    }

                    // Indicate that we are DONE with any MetaSet
                    this.startedMetaSet = null;

                    // If the DataSet is yet to be started
                    if ((this.startedMetaSet == null) && (this.startedDataSet == false)) {

                        // Indicate that we started the MetaSet
                        this.startedDataSet = true;

                        // Start the data-set
                        if (this.emitter.startDataSet != null) {
                            this.emitter.startDataSet();
                        }

                    }

                }

                // Parse the VR=<UL>
                var start = line.indexOf('VR=<');

                // SKIP: data-elements WITHOUT VR
                if (start == -1)
                    continue;

                // Parse the VR
                var vr = DicomValueRepresentation.find(line.substring(start + 4, start + 6));

                // Use the tag preset VR (if needed)
                if (vr == null)
                    vr = tag.VR;

                // Parse the VL=<
                start = line.indexOf('VL=<', start);

                // SKIP: data-elements WITHOUT VL
                if (start == -1)
                    continue;

                // Find the end of the length
                var end = line.indexOf('>', start);

                // Parse the length value
                var valueLength = parseInt(line.substring(start + 4, end), 16);

                // Create the attribute
                var dataElement = (vr == ValueRepresentations.SQ) 
                    ? new DicomAttributeSequence(tag, valueLength, null, TransferSyntax.NONE) 
                    : new DicomAttribute(tag, valueLength, null, TransferSyntax.NONE);

                // Start the attribute or sequence
                if (dataElement instanceof DicomAttributeSequence) {
                    if (this.emitter.startSequence != null) {
                        this.emitter.startSequence(dataElement);
                    }
                }
                else {
                    if (this.emitter.startAttribute != null) {
                        this.emitter.startAttribute(dataElement);
                    }
                }

                // TODO - Populate the data

                // End the 
                if (dataElement instanceof DicomAttribute) {

                    // Indicate that the data-element is complete
                    dataElement.isComplete = true;

                    if (this.emitter.endAttribute != null) {
                        this.emitter.endAttribute(dataElement);
                    }
                }

            }
            else if (line.trim().startsWith('----:') == true) {

            }
            else if (line.trim() == '') {

            }



        }

        // End the "instance"
        if (this.emitter.endInstance != null) {
            this.result = this.emitter.endInstance();
        }

        // Reset the state
        this.reset();

    }

    /**
     * Constructos a new DICOM Dumper with the associated DICOM Emitter.
     * @param {*} dicomEmitter The emitter used to emit dumped elements of the DICOM data.
     */
    constructor(dicomEmitter) {

        // Set the emitter
        this.emitter = dicomEmitter;
        
        // Reset the current state
        this.reset();

    }

};