import fs from 'node:fs';
import path from 'node:path';

const sampleDirectory = path.join(__dirname, '../../samples/kitchen-sink');
const markup = fs.readFileSync(path.join(sampleDirectory, 'index.htm'), 'utf8');
const actions = fs.readFileSync(path.join(sampleDirectory, 'actions.js'), 'utf8');

function readId(attributes) {
    return attributes.match(/(?:^|\s)id\s*=\s*(["'])(.*?)\1/i)?.[2] ?? null;
}

const elements = Array.from(markup.matchAll(/<([a-z][\w-]*)\b([^<>]*)>/gi), match => ({
    tag: match[1].toLowerCase(), attributes: match[2], id: readId(match[2])
})).filter(element => element.id != null);
const byId = new Map(elements.map(element => [element.id, element]));
const actionIds = Array.from(actions.matchAll(/registerAction\(\s*(["'])([\w-]+)\1\s*,/g), match => match[2]);

describe('Kitchen Sink markup wiring', () => {
    test('has unique element IDs so each action writes to the intended output', () => {
        const duplicates = elements.map(element => element.id).filter((id, index, ids) => ids.indexOf(id) !== index);
        expect(duplicates).toEqual([]);
    });

    test('provides a button, status, and inline message control for every registered action', () => {
        expect(actionIds).toHaveLength(39);
        expect(new Set(actionIds).size).toBe(actionIds.length);
        const missing = actionIds.flatMap(id => [id, id + 'Status', id + 'Message']).filter(id => !byId.has(id));
        expect(missing).toEqual([]);
        for (const id of actionIds) {
            expect(byId.get(id).tag).toBe('button');
            expect(byId.get(id).attributes).toMatch(/\bdata-action(?:\s|=|$)/);
            expect(byId.get(id + 'Status').attributes).toMatch(/\brole\s*=\s*["']status["']/);
        }
    });

    test('provides the directly referenced input, output, and canvas elements', () => {
        const selectors = Array.from(actions.matchAll(/(?:\$|getTrimmedInput|getIntegerInput|querySelector(?:All)?)\(\s*(["'])#([\w-]+)\1\s*(?=[,)])/g), match => match[2]);
        const literalLookups = Array.from(actions.matchAll(/getElementById\(\s*(["'])([\w-]+)\1\s*\)/g), match => match[2]);
        // Codec scripts are created on demand rather than supplied by the page.
        const createdAtRuntime = new Set(Array.from(actions.matchAll(/\.id\s*=\s*(["'])([\w-]+)\1/g), match => match[2]));
        const missing = [...new Set([...selectors, ...literalLookups])]
            .filter(id => !createdAtRuntime.has(id) && !byId.has(id));
        expect(missing).toEqual([]);
    });

    test('keeps sample editors editable and populated while reports remain read-only', () => {
        const textareas = Array.from(markup.matchAll(/<textarea\b([^>]*)>([\s\S]*?)<\/textarea>/gi), match => ({
            id: readId(match[1]), attributes: match[1], content: match[2]
        }));
        for (const id of ['jsonBox', 'dicomDump']) {
            const editor = textareas.find(element => element.id === id);
            expect(editor).toBeDefined();
            expect(editor.attributes).not.toMatch(/\breadonly(?:\s|=|$)/);
            expect(editor.content.trim().length).toBeGreaterThan(0);
        }
        expect(textareas.find(element => element.id === 'dicomDump').content).toContain('(0x0008,0x0016)');
        for (const report of textareas.filter(element => !['jsonBox', 'dicomDump'].includes(element.id))) {
            expect(report.attributes).toMatch(/\breadonly(?:\s|=|$)/);
        }
    });
});
