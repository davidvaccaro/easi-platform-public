import DicomDumpParser from '../tools/dicomDumpParser.js';
import DicomInstanceEmitter from '../dicomInstanceEmitter.js';

const path = require('path');
const fs = require('fs');

test('Test: DicomDumpParser Parse', () => {

    // Build the full path to the target dump file
    var dumpFullPath = path.join(process.cwd().split('bright-js')[0], '/data/dumps/dump1.txt');
   
    // Read the entire dump file as text
    var dump = fs.readFileSync(dumpFullPath, 'utf8');

    // Create the DICOM Dump Parer
    var parser = new DicomDumpParser(new DicomInstanceEmitter());

    // Parse the dump
    var succeeded = parser.parse(dump);

    // Validate
    expect(
        (succeeded == true) 
        && 
        (parser.result.metaSet.attributes.length == 7) 
        && 
        (parser.result.dataSet.attributes.length == 259)
    ).toBe(true);
    
});