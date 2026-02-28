import FileStreamWriter from '../../src/writers/FileStreamWriter.js';

const path = require('path');
const os = require('os');
const fs = require('fs');

test('Test: FileStreamWriter writes bytes to Node file path', async () => {

    const destinationPath = path.join(os.tmpdir(), 'easi-file-writer-' + Date.now() + '.dcm');

    try {

        const writer = new FileStreamWriter();
        const result = await writer.write(destinationPath, new Uint8Array([4, 5, 6]));

        expect(result.path).toBe(destinationPath);
        expect(result.bytesWritten).toBe(3);
        expect(fs.existsSync(destinationPath)).toBe(true);

        const bytes = new Uint8Array(fs.readFileSync(destinationPath));
        expect(Array.from(bytes)).toEqual([4, 5, 6]);

    }
    finally {
        if (fs.existsSync(destinationPath)) {
            fs.unlinkSync(destinationPath);
        }
    }

});

