import PipelineOperationResult from '../../src/pipelines/PipelineOperationResult.js';

test('Test: PipelineOperationResult.fromTerminal returns stable non-materialized envelope', () => {

    var result = PipelineOperationResult.fromTerminal('toDicomData', 128, null, null);

    expect(result.resultType).toBe('PipelineOperationResult');
    expect(result.version).toBe('1.0');
    expect(result.operation).toBe('toDicomData');
    expect(result.category).toBe('terminal');
    expect(result.materialized).toBe(false);
    expect(result.bytesWritten).toBe(128);
    expect(result.payload).toBeNull();
    expect(result.output).toBeNull();

});

test('Test: PipelineOperationResult.fromWriter preserves writer output fields and adds stable envelope keys', () => {

    var writerOutput = {
        ok: true,
        bytesWritten: 3,
        body: new Uint8Array([7, 8, 9])
    };

    var result = PipelineOperationResult.fromWriter('PartStreamWriter', writerOutput);

    expect(result.ok).toBe(true);
    expect(result.resultType).toBe('PipelineOperationResult');
    expect(result.operation).toBe('into');
    expect(result.category).toBe('writer');
    expect(result.writer).toBe('PartStreamWriter');
    expect(result.materialized).toBe(true);
    expect(result.bytesWritten).toBe(3);
    expect(result.payload instanceof Uint8Array).toBe(true);
    expect(result.payload.length).toBe(3);
    expect(result.output).toBe(writerOutput);

});

