import FolderStreamReader from '../../src/readers/FolderStreamReader.js';
import { Status } from '../../src/parsers/Status.js';

const path = require('path');
const os = require('os');
const fs = require('fs');

function createTempFolder() {
    return fs.mkdtempSync(path.join(os.tmpdir(), 'easi-folder-reader-'));
}

function removeFolder(folderPath) {
    if (fs.existsSync(folderPath)) {
        fs.rmSync(folderPath, { recursive: true, force: true });
    }
}

test('Test: FolderStreamReader reads matching files from folder source', async () => {

    const root = createTempFolder();

    fs.mkdirSync(path.join(root, 'nested'));
    fs.writeFileSync(path.join(root, 'a.dcm'), Buffer.from([1, 2, 3, 4]));
    fs.writeFileSync(path.join(root, 'b.jpg'), Buffer.from([0xFF, 0xD8, 0xFF, 0xE0]));
    fs.writeFileSync(path.join(root, 'c.txt'), Buffer.from([7, 8, 9]));
    fs.writeFileSync(path.join(root, 'nested', 'd.png'), Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]));

    try {

        const reader = new FolderStreamReader();

        const parser = {
            result: null,
            error: null,
            reset: jest.fn(),
            parse: jest.fn(async (_value, done, _totalRead, _totalLength, contentType) => {

                if (done === true) {
                    parser.result = {
                        sourcePath: contentType?.sourcePath ?? null,
                        mediaType: contentType?.mediaType ?? null
                    };
                    return Status.SUCCESS;
                }

                return Status.CONTINUE;

            })
        };

        reader.parser = parser;

        const result = await reader.read(root, {
            recursive: true,
            extensions: ['.dcm', '.jpg', '.png'],
            sort: 'name'
        });

        expect(Array.isArray(result)).toBe(true);
        expect(result.length).toBe(3);

        const resultPaths = result.map((item) => path.basename(item.sourcePath));
        expect(resultPaths).toEqual(['a.dcm', 'b.jpg', 'd.png']);

    }
    finally {
        removeFolder(root);
    }

});

test('Test: FolderStreamReader honors onPart STOP signal', async () => {

    const root = createTempFolder();

    fs.writeFileSync(path.join(root, 'a.dcm'), Buffer.from([1, 2, 3, 4]));
    fs.writeFileSync(path.join(root, 'b.dcm'), Buffer.from([5, 6, 7, 8]));

    try {

        const reader = new FolderStreamReader();
        reader.onPart = jest.fn(async () => Status.STOP);

        const parser = {
            result: null,
            error: null,
            reset: jest.fn(),
            parse: jest.fn(async (_value, done, _totalRead, _totalLength, contentType) => {

                if (done === true) {
                    parser.result = {
                        sourcePath: contentType?.sourcePath ?? null
                    };
                    return Status.SUCCESS;
                }

                return Status.CONTINUE;

            })
        };

        reader.parser = parser;

        const result = await reader.read(root, {
            extensions: ['.dcm'],
            sort: 'name'
        });

        expect(result.length).toBe(1);
        expect(path.basename(result[0].sourcePath)).toBe('a.dcm');
        expect(reader.onPart).toHaveBeenCalledTimes(1);

    }
    finally {
        removeFolder(root);
    }

});
