import DicomDumper from './dicomDumper.js';

// const { exec } = require("child_process");
// const path = require('path');

test('Test: XXX undefined', () => {
    
    // "../ext/tools/dcdump ../data/dicoms/XA-MONO2-8-12x-catheter"

    /*
    var pathParts = process.cwd().split('bright-js');

    const toolPathPath = path.join(pathParts[0], '/ext/tools/dcdump');
    const dicmPathPath = path.join(pathParts[0], '/data/dicoms/XA-MONO2-8-12x-catheter');
    
    exec(toolPathPath + " " + dicmPathPath, (error, stdout, stderr) => {
        expect(stderr).toBe('XXXX');
        //expect('XXXX').toBe('XXXX');
    });
    */

    var dumper = new DicomDumper();

    dumper
        .dump('XA-MONO2-8-12x-catheter')
        .then(result => expect(result).toBe(true));

});