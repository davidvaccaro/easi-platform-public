import fs from 'node:fs/promises';
import path from 'node:path';
import EASI from '../../src/EASI.js';
import Tag from '../../src/dicom/Tag.js';
import DumpParser from '../../src/tools/dicom/DumpParser.js';
import DicomInstanceHandler from '../../src/handlers/terminals/DicomInstanceHandler.js';
import { getFixtureBytes, SYNTHETIC_IDENTIFIERS } from '../fixtures/dicom/SyntheticDicom.js';

test('the Kitchen Sink XML example parses from its shipped synthetic file without a local corpus', async () => {
    const bytes = await fs.readFile(path.join(__dirname, '../../samples/kitchen-sink/fixtures/synthetic-metadata.xml'));
    const result = await EASI.pipelineBuilder().fromPartStream().ofDicomXmlMetadata().toInstances().build().process({ source: bytes });
    const instance = result.first();
    expect(instance.dataSet.value(Tag.PatientID)).toBe(SYNTHETIC_IDENTIFIERS.patientId);
    expect(instance.dataSet.value(Tag.StudyInstanceUID)).toBe(SYNTHETIC_IDENTIFIERS.studyInstanceUid);
    expect(instance.dataSet.value(Tag.SeriesInstanceUID)).toBe(SYNTHETIC_IDENTIFIERS.seriesInstanceUid);
    expect(instance.dataSet.value(Tag.SOPInstanceUID)).toBe(SYNTHETIC_IDENTIFIERS.sopInstanceUid);
    expect(instance.dataSet.value(Tag.PatientName)).toEqual({ Alphabetic: 'SYNTHETIC^EASI' });
});

test('the browser sample native file produces invented identities and three real pixel frames', async () => {
    const result = await EASI.pipelineBuilder().fromPartStream().ofDicomData().toInstances().build().process({ source: getFixtureBytes() });
    const instance = result.first();
    expect(instance.dataSet.value(Tag.PatientID)).toBe(SYNTHETIC_IDENTIFIERS.patientId);
    expect(Number(instance.dataSet.value(Tag.NumberOfFrames))).toBe(3);
    expect(instance.dataSet.find(Tag.PixelData).access()).toHaveLength(32 * 32 * 3);
});

test('the editable Kitchen Sink dump contains only a small invented example and parses successfully', async () => {
    const html = await fs.readFile(path.join(__dirname, '../../samples/kitchen-sink/index.htm'), 'utf8');
    const dump = html.match(/<textarea\b[^>]*\bid="dicomDump"[^>]*>([\s\S]*?)<\/textarea>/)?.[1];
    expect(dump).toBeDefined();
    expect(dump.length).toBeLessThan(2000);
    const parser = new DumpParser(new DicomInstanceHandler());
    expect(parser.parse(dump)).toBe(true);
    expect(parser.result.dataSet.value(Tag.PatientName)).toBe('SYNTHETIC^EASI^DUMP');
    expect(parser.result.dataSet.value(Tag.PatientID)).toBe(SYNTHETIC_IDENTIFIERS.patientId);
    expect(parser.result.dataSet.value(Tag.SOPInstanceUID)).toBe('2.25.503');
    expect(parser.result.dataSet.value(Tag.Rows)).toBe(2);
});
