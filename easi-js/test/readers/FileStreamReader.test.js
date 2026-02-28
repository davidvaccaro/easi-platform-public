import FileStreamReader from '../../src/readers/FileStreamReader.js';
import { Status } from '../../src/parsers/Status.js';

const path = require('path');
const os = require('os');
const fs = require('fs');

test('Test: FileStreamReader reads Node file path stream source', async () => {

    const tempPath = path.join(os.tmpdir(), 'easi-file-reader-' + Date.now() + '.dcm');
    fs.writeFileSync(tempPath, Buffer.from([1, 2, 3, 4]));

    try {

        const reader = new FileStreamReader();
        const parser = {
            result: { ok: true },
            error: null,
            reset: jest.fn(),
            parse: jest.fn(async (value, done) => done ? Status.SUCCESS : Status.CONTINUE)
        };

        reader.parser = parser;
        const result = await reader.read(tempPath, { contentType: 'application/dicom' });

        expect(result).toEqual({ ok: true });
        expect(parser.reset).toHaveBeenCalledTimes(1);
        expect(parser.parse).toHaveBeenCalled();

    }
    finally {
        if (fs.existsSync(tempPath)) {
            fs.unlinkSync(tempPath);
        }
    }

});

