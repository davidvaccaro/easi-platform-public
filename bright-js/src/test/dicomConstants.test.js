import DicomConstants from '../dicomConstants.js';

test('Test: PreambleLength', () => {
    expect(DicomConstants.PreambleLength).toBe(128);
});

test('Test: PrefixLength', () => {
    expect(DicomConstants.PrefixLength).toBe(4);
});

test('Test: PrefixValue', () => {
    expect(DicomConstants.PrefixValue).toBe('DICM');
});

test('Test: GroupLength', () => {
    expect(DicomConstants.GroupLength).toBe(2);
});

test('Test: ElementLength', () => {
    expect(DicomConstants.ElementLength).toBe(2);
});

test('Test: ValueRepresentationLength', () => {
    expect(DicomConstants.ValueRepresentationLength).toBe(2);
});

test('Test: ReservedLength', () => {
    expect(DicomConstants.ReservedLength).toBe(2);
});

test('Test: ValueLength32', () => {
    expect(DicomConstants.ValueLength32).toBe(4);
});

test('Test: ValueLength16', () => {
    expect(DicomConstants.ValueLength16).toBe(2);
});

test('Test: UndefinedLength', () => {
    expect(DicomConstants.UndefinedLength).toBe(4294967295);
});