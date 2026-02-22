import DumpParser from '../../../src/tools/dicom/DumpParser.js';
import StreamingDicomInstanceHandler from '../../../src/handlers/StreamingDicomInstanceHandler.js';

const path = require('path');
const fs = require('fs');

test('Test: DumpParser Parse', () => {

    // Build the full path to the target dump file
    var dumpFullPath = path.join(process.cwd().split('easi-js')[0], '/data/dumps/dump1.txt');
   
    // Read the entire dump file as text
    var dump = fs.readFileSync(dumpFullPath, 'utf8');

    // Create the DICOM Dump Parer
    var parser = new DumpParser(new StreamingDicomInstanceHandler());

    // Parse the dump
    var succeeded = parser.parse(dump);

    // Validate
    expect(
        (succeeded == true) 
        && 
        (parser.result.metaSet.attributes.length == 7) 
        && 
        (parser.result.dataSet.attributes.length == 252)
    ).toBe(true);
    
});
