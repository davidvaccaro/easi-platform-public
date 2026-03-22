import JpegLsRuntime from '../../../src/codecs/runtimes/JpegLsRuntime.js';

afterEach(() => {
    JpegLsRuntime.clear();
    delete globalThis.EASIJpegLsModule;
    delete globalThis.EASIJPEGLSModule;
    delete globalThis.EASIJpegLsFactory;
    delete globalThis.EASIJPEGLSFactory;
});

test('Test: JpegLsRuntime resolves explicit module synchronously', () => {

    var module = { decode: () => true };
    var resolved = JpegLsRuntime.resolveSync({
        jpeglsModule: module
    });

    expect(resolved).toBe(module);

});

test('Test: JpegLsRuntime resolves configured synchronous factory', () => {

    var module = { decode: () => true };
    JpegLsRuntime.setFactory(() => module);

    var resolved = JpegLsRuntime.resolveSync();
    expect(resolved).toBe(module);

});

test('Test: JpegLsRuntime resolves asynchronous factory via resolve', async () => {

    var module = { decode: () => true };
    JpegLsRuntime.setFactory(async () => module);

    var resolved = await JpegLsRuntime.resolve();
    expect(resolved).toBe(module);

});

test('Test: JpegLsRuntime resolves global module aliases', () => {

    var module = { decode: () => true };
    globalThis.EASIJPEGLSModule = module;

    var resolved = JpegLsRuntime.resolveSync();
    expect(resolved).toBe(module);

});

test('Test: JpegLsRuntime resolves global factory aliases', async () => {

    var module = { decode: () => true };
    globalThis.EASIJPEGLSFactory = async () => module;

    var resolved = await JpegLsRuntime.resolve();
    expect(resolved).toBe(module);

});
