import EASI from '../../src/EASI.js';
import StreamingDicomDataParser from '../../src/parsers/StreamingDicomDataParser.js';
import StreamingDicomInstanceHandler from '../../src/handlers/StreamingDicomInstanceHandler.js';
import Dumper from '../../src/tools/dicom/Dumper.js';
import DumpParser from '../../src/tools/dicom/DumpParser.js';

const { exec } = require("child_process");
const path = require('path');
const fs = require('fs');
const { Blob } = require("buffer");

// Establish the list of DICOM paths
var dicomPaths = fs.readdirSync(path.join(process.cwd().split('easi-js')[0], '/data/dicoms'))
    .filter(element => 
        element != '.DS_Store' 
        && 
        element != 'local'
    );

function attributeSetMatches(as1, as2) {

    // First validate the number of attributes
    if (as1.attribtues.length != as2.attribtues.length)
        return false;

    // Loop over the attributes, comparing
    for (var i = 0; i < as1.attribtues.length; i++) {

        // Establish the AS1 attribute
        var as1Attribute = as1.attribtues[i];

        // Establish the AS2 attribute
        var as2Attribute = as2.attribtues[i];

        // Compare the tag identifier
        if (as1Attribute.tag.ID != as2Attribute.tag.ID)
            return false;

    }

    // Success
    return true;

}
function validateDicomSchema(dicomPath) {

    // Return the promise
    return new Promise(function(resolve, reject) {

        try {

            // Establish the root path to BrightDicom
            var brightDicomRoot = process.cwd().split('easi-js')[0];

            // Determine if the dicom file is a complete path or simply a filename
            const dicomFullPath = dicomPath.includes('/') ? dicomPath : path.join(brightDicomRoot, '/data/dicoms/' + dicomPath);

            // Build the DICOM streaming reader
            const reader = EASI.newStreamingReaderBuilder()
                .withParser(new StreamingDicomDataParser())
                .withHandler(new StreamingDicomInstanceHandler())
                .build();

            // Read and parse the DICOM file
            reader
                .read(fs.readFileSync(dicomFullPath))
                .then(parseResult => {

                    // Create the DICOM Dumper
                    var dumper = new Dumper(new DumpParser(new StreamingDicomInstanceHandler()));

                    // Dump the file
                    dumper
                        .dump(dicomPath)
                        .then(dumpResult => {

                            // Validate the basic "parse" against the "dump" number of attributes
                            var isValid = ((parseResult.metaSet.attribtues.length == dumpResult.metaSet.attribtues.length)
                                &&
                                (parseResult.dataSet.attribtues.length == dumpResult.dataSet.attribtues.length)) ? true : false;
                            
                            // Validate that the MetaSet matches
                            if (isValid == true) {
                                isValid = attributeSetMatches(parseResult.metaSet, dumpResult.metaSet);
                            }

                            // Validate that the DataSet matches
                            if (isValid == true) {
                                isValid = attributeSetMatches(parseResult.dataSet, dumpResult.dataSet);
                            }

                            // Resolve the comparison
                            resolve(isValid);

                        });

                });

        } 
        catch (err) {
            reject(err);
        }  
    
    });
    
}

test.each(dicomPaths)(
    'Validate DICOM via DUMP',
    (dicomPath) => {
        validateDicomSchema(dicomPath)
        .then(result => expect(result).toBe(true));
    });