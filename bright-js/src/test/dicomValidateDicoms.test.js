import DicomReader from '../dicomReader.js';
import DicomParser from '../dicomParser.js';
import dicomInstanceStreamHandler from '../handlers/dicomInstanceStreamHandler.js';
import DicomDumper from '../tools/dicomDumper.js';
import DicomDumpParser from '../tools/dicomDumpParser.js';

const { exec } = require("child_process");
const path = require('path');
const fs = require('fs');
const { Blob } = require("buffer");

// Establish the list of DICOM paths
var dicomPaths = fs.readdirSync(path.join(process.cwd().split('bright-js')[0], '/data/dicoms'))
    .filter(element => 
        element != '.DS_Store' 
        && 
        element != 'DIRS'
        && 
        element != 'KOS'
        && 
        element != 'SR'
        && 
        element != 'SERIES 1'
        && 
        element != 'SERIES 2'
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
            var brightDicomRoot = process.cwd().split('bright-js')[0];

            // Determine if the dicom file is a complete path or simply a filename
            const dicomFullPath = dicomPath.includes('/') ? dicomPath : path.join(brightDicomRoot, '/data/dicoms/' + dicomPath);

            // Create the DICOM reader
            var reader = new DicomReader(new DicomParser(new dicomInstanceStreamHandler()));

            // Read and parse the DICOM file
            reader
                .read(fs.readFileSync(dicomFullPath))
                .then(parseResult => {

                    // Create the DICOM Dumper
                    var dumper = new DicomDumper(new DicomDumpParser(new dicomInstanceStreamHandler()));

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