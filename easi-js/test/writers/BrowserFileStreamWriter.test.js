import BrowserFileStreamWriter from '../../src/writers/BrowserFileStreamWriter.js';
import Exception from '../../src/environment/Exception.js';

test('Test: BrowserFileStreamWriter writes bytes to writable stream target', async () => {

    var chunks = [];
    var writable = {
        write: jest.fn(async (chunk) => {
            chunks.push(new Uint8Array(chunk));
        }),
        close: jest.fn(async () => {})
    };

    var writer = new BrowserFileStreamWriter();
    var result = await writer.write(
        writable,
        new Uint8Array([1, 2, 3, 4]),
        { chunkSize: 2 }
    );

    expect(result.bytesWritten).toBe(4);
    expect(writable.write).toHaveBeenCalledTimes(2);
    expect(writable.close).toHaveBeenCalledTimes(0);
    expect(Array.from(chunks[0])).toEqual([1, 2]);
    expect(Array.from(chunks[1])).toEqual([3, 4]);

});

test('Test: BrowserFileStreamWriter resolves file handle targets and closes owned writable by default', async () => {

    var chunks = [];
    var writable = {
        write: jest.fn(async (chunk) => {
            chunks.push(new Uint8Array(chunk));
        }),
        close: jest.fn(async () => {})
    };

    var fileHandle = {
        createWritable: jest.fn(async () => writable)
    };

    var writer = new BrowserFileStreamWriter();
    var result = await writer.write(
        fileHandle,
        new Uint8Array([9, 8, 7])
    );

    expect(result.bytesWritten).toBe(3);
    expect(fileHandle.createWritable).toHaveBeenCalledTimes(1);
    expect(writable.write).toHaveBeenCalledTimes(1);
    expect(writable.close).toHaveBeenCalledTimes(1);
    expect(Array.from(chunks[0])).toEqual([9, 8, 7]);

});

test('Test: BrowserFileStreamWriter throws on invalid target', async () => {

    var writer = new BrowserFileStreamWriter();

    await expect(
        writer.write(null, new Uint8Array([1]))
    ).rejects.toBeInstanceOf(Exception);

});

