import EASI from '../../src/EASI.js';
import DimseAssociationReader from '../../src/readers/DimseAssociationReader.js';

const emptyEnvelope = () => ({
    source: new Uint8Array(0), empty: true, contentLength: 0,
    metadata: { count: 0, dimse: { operation: 'c-find', finalResponse: { status: 0 } } }
});

test('successful empty DIMSE queries produce no phantom DICOM/FHIR result', async () => {
    const transport = { read: async () => emptyEnvelope() };
    const pipeline = EASI.pipelineBuilder().fromDimseAssociation({}, transport).
    ofDicomData().toFHIRImagingStudy().build();
    const emitted = jest.fn();
    const result = await pipeline.process({ sourceOptions: { onEmit: emitted } });
    expect(result.count).toBe(0);
    expect(emitted).not.toHaveBeenCalled();
    expect(pipeline.reader.lastMetadata).toEqual(emptyEnvelope().metadata);
});

test.each([
    { source: new Uint8Array(0) },
    { empty: true, metadata: { count: 0 } },
    { ...emptyEnvelope(), source: new Uint8Array([1]) },
    { ...emptyEnvelope(), metadata: { count: 1 } },
    { ...emptyEnvelope(), contentLength: 1 }
])('missing data and inconsistent empty envelopes fail clearly', async (payload) => {
    const reader = new DimseAssociationReader({}, { read: async () => payload });
    await expect(reader.read()).rejects.toThrow(/Invalid.*DIMSE source/);
});

test('transport default onEmit does not suppress the configured callback', async () => {
    const emit = jest.fn();
    const read = jest.fn(async () => ({ instance: true }));
    const reader = new DimseAssociationReader({}, {
        read: async () => ({ source: new Uint8Array([1]), onEmit: undefined, metadata: { count: 1 } })
    }, { read });
    await reader.read(null, { onEmit: emit });
    expect(read.mock.calls[0][1].onEmit).toBe(emit);
    expect(reader.lastMetadata.count).toBe(1);
});

test('transport can explicitly disable emission with null', async () => {
    const reader = new DimseAssociationReader();
    expect(reader.normalizePayload({ source: new Uint8Array([1]), onEmit: null }, { onEmit: jest.fn() }).readOptions.onEmit).
    toBe(null);
});

test('a failed read clears the previous operation metadata', async () => {
    const transport = { read: jest.fn().mockResolvedValueOnce(emptyEnvelope()).mockRejectedValueOnce(new Error('peer failed')) };
    const reader = new DimseAssociationReader({}, transport);
    await reader.read();
    expect(reader.lastMetadata.count).toBe(0);
    await expect(reader.read()).rejects.toThrow('peer failed');
    expect(reader.lastMetadata).toBe(null);
});

function pendingTransport(started) {
    return {
        read: (_, options) => new Promise((resolve, reject) => {
            options.signal.addEventListener('abort', () => reject(options.signal.reason), { once: true });
            started();
        })
    };
}

test('stop cancels an in-flight transport read even without a transport close method', async () => {
    let began;
    const started = new Promise(resolve => { began = resolve; });
    const reader = new DimseAssociationReader({}, pendingTransport(began));
    const read = reader.read();
    const rejected = expect(read).rejects.toMatchObject({ name: 'AbortError' });
    await started;
    await reader.stop();
    await rejected;
});

test('caller AbortSignal cancels an active DIMSE read', async () => {
    let began;
    const started = new Promise(resolve => { began = resolve; });
    const reader = new DimseAssociationReader({}, pendingTransport(began));
    const controller = new AbortController();
    const read = reader.read(null, { signal: controller.signal });
    const rejected = expect(read).rejects.toThrow('caller cancelled');
    await started;
    controller.abort(new Error('caller cancelled'));
    await rejected;
});

test('already-aborted calls do not invoke the transport', async () => {
    const read = jest.fn();
    const reader = new DimseAssociationReader({}, { read });
    const controller = new AbortController();
    controller.abort();
    await expect(reader.read(null, { signal: controller.signal })).rejects.toMatchObject({ name: 'AbortError' });
    expect(read).not.toHaveBeenCalled();
});

test('stopping a source-bound pipeline settles a pending query', async () => {
    let began;
    const started = new Promise(resolve => { began = resolve; });
    const pipeline = EASI.pipelineBuilder().fromDimseAssociation({}, pendingTransport(began)).
    ofDicomData().toInstances().build();
    const run = pipeline.start();
    await started;
    await run.stop();
    await run.done;
    expect(run.iterations).toBe(0);
});
