import EASI from '../src/EASI.js';
import PipelineBuilder from '../src/builders/PipelineBuilder.js';

test('Test: pipelineBuilder', () => {
    expect(EASI.pipelineBuilder() instanceof PipelineBuilder).toBe(true);
});
