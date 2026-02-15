//
// DicomDumper.js - 1.0.0
//
// DICOM Dumper Class
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

const { exec } = require("child_process");
const path = require('path');

export default class Dumper {

    /**
     * Dump a specified DICOM file.
     * @param {string} dicomPath The file name OR full path to a specified DICOM file.
     * @returns The dump of the DICOM file.
     */
    dump(dicomPath) {

        // Establish that
        var that = this;

        // Return the promise
        return new Promise(function(resolve, reject) {

            try {

                // Establish the root path to BrightDicom
                var brightDicomRoot = process.cwd().split('bright-js')[0];

                // Build the path to the tool
                const toolPathPath = path.join(brightDicomRoot, '/ext/tools/dcdump');

                // Determine if the dicom file is a complete path or simply a filename
                const dicmPathPath = dicomPath.includes('/') ? dicomPath : path.join(brightDicomRoot, '/data/dicoms/' + dicomPath);

                // Execute the tools
                exec(toolPathPath + " " + dicmPathPath, (error, stdout, data) => {

                    try {

                        // If there is dump data
                        if (typeof data != 'undefined') {

                            // Parse the DICOM
                            this.parser.parse(data);

                            // If the instance is value, resolve else reject
                            if (this.parser.result != null)
                                resolve(this.parser.result);
                            else
                                reject();

                        }

                    }
                    catch (err) {
                    }

                });

            } 
            catch (err) {
            }

        });

    };

    /**
     * Constructos a new DICOM Dumper with the associated parser.
     * @param {DumpParser} parser The parser used to parse dumped DICOM data.
     */
    constructor(parser) {
        this.parser = parser;
    }

};