import PipelineResultCollection from '../../src/pipelines/PipelineResultCollection.js';

class TestType {
    constructor(value) {
        this.value = value;
    }
}

test('Test: PipelineResultCollection.from wraps scalar values', () => {

    const result = PipelineResultCollection.from('value');

    expect(PipelineResultCollection.isCollection(result)).toBe(true);
    expect(result.count).toBe(1);
    expect(result.length).toBe(5);
    expect(result.isEmpty).toBe(false);
    expect(result.first()).toBe('value');
    expect(result[0]).toBe('v');
    expect(result.at(0)).toBe('value');

});

test('Test: PipelineResultCollection.from wraps arrays without changing item order', () => {

    const result = PipelineResultCollection.from(['A', 'B', 'C']);

    expect(result.count).toBe(3);
    expect(result.first()).toBe('A');
    expect(result.last()).toBe('C');
    expect(result.at(1)).toBe('B');
    expect(result.at(-1)).toBe('C');
    expect(result.at(9)).toBeNull();
    expect([...result]).toEqual(['A', 'B', 'C']);

});

test('Test: PipelineResultCollection forwards object property access to first item', () => {

    const result = PipelineResultCollection.from({ ok: true, status: 200 });

    expect(result.ok).toBe(true);
    expect(result.status).toBe(200);
    expect(result.toJSON()).toEqual([{ ok: true, status: 200 }]);

});

test('Test: PipelineResultCollection forwards instanceof to first item prototype for single item results', () => {

    const instance = new TestType('x');
    const result = PipelineResultCollection.from(instance);

    expect(result instanceof TestType).toBe(true);
    expect(result.value).toBe('x');

});

test('Test: PipelineResultCollection supports numeric comparison through first primitive item', () => {

    const one = PipelineResultCollection.from(1);
    const three = PipelineResultCollection.from(3);

    expect(one < three).toBe(true);
    expect(String(three)).toBe('3');

});
