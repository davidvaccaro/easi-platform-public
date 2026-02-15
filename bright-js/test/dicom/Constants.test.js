import Constants from '../../src/dicom/Constants.js'

test('Test: PreambleLength', () => {
    expect(Constants.PreambleLength).toBe(128);
});

test('Test: PrefixLength', () => {
    expect(Constants.PrefixLength).toBe(4);
});

test('Test: PrefixValue', () => {
    expect(Constants.PrefixValue).toBe('DICM');
});

test('Test: GroupLength', () => {
    expect(Constants.GroupLength).toBe(2);
});

test('Test: ElementLength', () => {
    expect(Constants.ElementLength).toBe(2);
});

test('Test: ValueRepresentationLength', () => {
    expect(Constants.ValueRepresentationLength).toBe(2);
});

test('Test: ReservedLength', () => {
    expect(Constants.ReservedLength).toBe(2);
});

test('Test: ValueLength32', () => {
    expect(Constants.ValueLength32).toBe(4);
});

test('Test: ValueLength16', () => {
    expect(Constants.ValueLength16).toBe(2);
});

test('Test: UndefinedLength', () => {
    expect(Constants.UndefinedLength).toBe(4294967295);
});