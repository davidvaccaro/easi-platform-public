import Mapping from '../../../src/handlers/mappings/Mapping.js';

test('Test: Mapping map applies template using mapped value and property bag tokens', () => {

    var mapping = new Mapping();
    mapping.setProperties({ prefix: 'urn:test' });
    mapping.add('A', 'result', {
        template: '{prop.prefix}:{value}'
    });

    var context = {};
    mapping.map(context, 'A', '123');

    expect(context.result).toBe('urn:test:123');

});

test('Test: Mapping map supports omit and blank token resolution policies', () => {

    var omitMapping = new Mapping();
    omitMapping.add('A', 'result', {
        template: 'x-{prop.missing}-y',
        policy: 'omit'
    });

    var omitContext = {};
    omitMapping.map(omitContext, 'A', 'ignored');
    expect(omitContext.result).toBeUndefined();

    var blankMapping = new Mapping();
    blankMapping.add('A', 'result', {
        template: 'x-{prop.missing}-y',
        policy: 'blank'
    });

    var blankContext = {};
    blankMapping.map(blankContext, 'A', 'ignored');
    expect(blankContext.result).toBe('x--y');

});

test('Test: Mapping map throws when policy is error and token is missing', () => {

    var mapping = new Mapping();
    mapping.add('A', 'result', {
        template: 'x-{prop.missing}-y',
        policy: 'error'
    });

    expect(() => mapping.map({}, 'A', 'ignored')).toThrow('Failed resolving template token');

});

test('Test: Mapping computed mappings can set non-key-triggered values on end', () => {

    var mapping = new Mapping();
    mapping.setProperties({
        base: 'https://example.test',
        id: '42'
    });
    mapping.addComputed('computed.url', {
        when: 'end',
        template: '{prop.base}/resource/{prop.id}'
    });

    var context = {
        computed: {}
    };

    mapping.end(context);
    expect(context.computed.url).toBe('https://example.test/resource/42');

});
