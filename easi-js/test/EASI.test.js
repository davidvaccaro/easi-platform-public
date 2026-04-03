import EASI from '../src/EASI.js';
import PipelineBuilder from '../src/builders/PipelineBuilder.js';
import CodecRegistryBuilder from '../src/builders/CodecRegistryBuilder.js';
import DimseAssociationBuilder from '../src/builders/DimseAssociationBuilder.js';
import DimseClientBuilder from '../src/builders/DimseClientBuilder.js';
import DicomMappingBuilder from '../src/builders/DicomMappingBuilder.js';
import DicomSelectionBuilder from '../src/builders/DicomSelectionBuilder.js';
import DicomDeIdentificationMaskBuilder from '../src/builders/DicomDeIdentificationMaskBuilder.js';

test('Test: pipelineBuilder', () => {
    expect(EASI.pipelineBuilder() instanceof PipelineBuilder).toBe(true);
});

test('Test: codecRegistryBuilder', () => {
    expect(EASI.codecRegistryBuilder() instanceof CodecRegistryBuilder).toBe(true);
});

test('Test: dimseAssociationBuilder', () => {
    expect(EASI.dimseAssociationBuilder() instanceof DimseAssociationBuilder).toBe(true);
});

test('Test: dimseClientBuilder', () => {
    expect(EASI.dimseClientBuilder() instanceof DimseClientBuilder).toBe(true);
});

test('Test: mappingBuilder', () => {
    expect(EASI.mappingBuilder() instanceof DicomMappingBuilder).toBe(true);
});

test('Test: selectionBuilder', () => {
    expect(EASI.selectionBuilder() instanceof DicomSelectionBuilder).toBe(true);
});

test('Test: deIdentificationMaskBuilder', () => {
    expect(EASI.deIdentificationMaskBuilder() instanceof DicomDeIdentificationMaskBuilder).toBe(true);
});
