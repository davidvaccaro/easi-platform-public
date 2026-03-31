import EASI from '../src/EASI.js';
import PipelineBuilder from '../src/builders/PipelineBuilder.js';
import CodecRegistryBuilder from '../src/builders/CodecRegistryBuilder.js';

test('Test: pipelineBuilder', () => {
    expect(EASI.pipelineBuilder() instanceof PipelineBuilder).toBe(true);
});

test('Test: codecRegistryBuilder', () => {
    expect(EASI.codecRegistryBuilder() instanceof CodecRegistryBuilder).toBe(true);
    expect(EASI.CodecRegistry.builder() instanceof CodecRegistryBuilder).toBe(true);
});
