//
// Dumper.js
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

import { execFile } from 'child_process';
import { accessSync, constants } from 'fs';
import path from 'path';

export default class Dumper {

    /**
     * Dump a specified DICOM file.
     * @param {string} dicomPath The file name OR full path to a specified DICOM file.
     * @returns The dump of the DICOM file.
     */
    dump(dicomPath) {

        return new Promise((resolve, reject) => {

            const repositoryRoot = process.cwd().split('easi-js')[0];
            const localTool = path.join(repositoryRoot, 'ext/tools/dcdump');
            let executable = process.env.EASI_DCDUMP_PATH;
            if (!executable) {
                try {
                    accessSync(localTool, constants.R_OK | constants.X_OK);
                    executable = localTool;
                }
                catch (_error) {
                    executable = 'dcdump';
                }
            }

            const inputPath = dicomPath.includes('/') ? dicomPath : path.join(repositoryRoot, 'data/dicoms', dicomPath);
            execFile(executable, [inputPath], (error, stdout, stderr) => {
                if (error) {
                    reject(error);
                    return;
                }

                try {
                    // dcdump writes its dump to stderr; compatible tools may use stdout.
                    const data = typeof stderr == 'string' && stderr.trim().length > 0 ? stderr : stdout;
                    if (typeof data != 'string' || this.parser.parse(data) !== true || this.parser.result == null)
                        throw new Error('Unable to parse DICOM dump output.');
                    resolve(this.parser.result);
                }
                catch (parseError) {
                    reject(parseError);
                }
            });
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
