import DicomInstanceEmitter from '../dicomInstanceEmitter.js';
import DicomDumper from '../tools/dicomDumper.js';
import DicomDumpParser from '../tools/dicomDumpParser.js';

const path = require('path');
const fs = require('fs');

test('Test: DicomDumper Dump', () => {

    // Establish the root path to BrightDicom
    var brightDicomRoot = process.cwd().split('bright-js')[0];

    // Determine if the dicom file is a complete path or simply a filename
    const dicomFullPath = path.join(brightDicomRoot, '/data/dicoms/0002.DCM');

    // Create the DICOM Dumper
    var dumper = new DicomDumper(new DicomDumpParser(new DicomInstanceEmitter()));

    // Dump the file
    dumper
        .dump(dicomFullPath)
        .then(dumpResult => {

            // Validate the basic "parse" against the "dump" number of attributes
            var isValid = ((dumpResult.metaSet.attributes.length == 6) && (dumpResult.dataSet.attributes.length == 69)) ? true : false;
    
            // Validate
            expect(isValid).toBe(true);
            
        });
        
});