import { BlockedRunError, RunFeedback, dicomwebUrl, previewResult } from '../../samples/kitchen-sink/run-feedback.js';
import ImagingStudy from '../../src/fhir/ImagingStudy.js';
import ImagingSeries from '../../src/fhir/ImagingSeries.js';
import ImagingInstance from '../../src/fhir/ImagingInstance.js';
import Patient from '../../src/fhir/Patient.js';

function createConsole() {
    return Object.fromEntries(['clear', 'groupCollapsed', 'groupEnd', 'log', 'warn', 'error'].map(name => [name, jest.fn()]));
}

function createElement(label = '') {
    const attributes = new Map();
    const listeners = new Map();
    return {
        textContent: label,
        dataset: {},
        children: [],
        disabled: false,
        checked: false,
        addEventListener: (name, listener) => listeners.set(name, listener),
        getAttribute: name => attributes.get(name),
        setAttribute: (name, value) => attributes.set(name, value),
        fire: name => listeners.get(name)?.({ type: name }),
        append(...children) { this.children.push(...children); },
        replaceChildren(...children) { this.children = children; }
    };
}

describe('Kitchen Sink run feedback', () => {
    test('shows Running until asynchronous work completes, restores buttons, and records the result and duration', async () => {
        const elements = new Map(['read', 'readStatus', 'resultSummary', 'resultDetails', 'runCount', 'passCount', 'failCount', 'harnessStatus'].map(id => [id, createElement(id)]));
        const logger = createConsole();
        let now = 100;
        const feedback = new RunFeedback({ document: { getElementById: id => elements.get(id) }, console: logger, now: () => now });
        feedback.bindAction('read', 'click', () => {});
        let resolve;
        const pending = feedback.run({ id: 'read', label: 'Read instance' }, () => new Promise(done => { resolve = done; }));
        expect(elements.get('readStatus').textContent).toBe('Running…');
        expect(elements.get('read').disabled).toBe(true);
        expect(elements.get('harnessStatus').textContent).toBe('Running…');
        expect(feedback.counts.passed).toBe(0);
        now = 157;
        resolve([{ resourceType: 'ImagingStudy' }]);
        const run = await pending;
        expect(run.state).toBe('passed');
        expect(run.durationMs).toBe(57);
        expect(elements.get('read').disabled).toBe(false);
        expect(elements.get('readStatus').textContent).toBe('Passed · 57 ms');
        expect(elements.get('harnessStatus').textContent).toBe('Ready · 1 actions');
        expect(elements.get('resultDetails').textContent).toContain('ImagingStudy');
        expect(feedback.counts).toEqual({ total: 1, passed: 1, failed: 0, blocked: 0 });
        expect(logger.clear).not.toHaveBeenCalled();
    });

    test('reports asynchronous and synchronous errors as failures instead of successes', async () => {
        const logger = createConsole();
        const feedback = new RunFeedback({ console: logger, now: () => 0 });
        const failure = new Error('Peer returned HTTP 503');
        const first = await feedback.run({ id: 'peer', label: 'Retrieve' }, () => Promise.reject(failure));
        const second = await feedback.run({ id: 'parse', label: 'Parse' }, () => { throw new Error('Invalid DICOM bytes'); });
        expect(first).toMatchObject({ state: 'failed', summary: 'Peer returned HTTP 503' });
        expect(second.state).toBe('failed');
        expect(first.details).toContain('Error: Peer returned HTTP 503');
        expect(feedback.counts).toEqual({ total: 2, passed: 0, failed: 2, blocked: 0 });
        expect(logger.error).toHaveBeenCalledWith(failure);
        expect(feedback.active).toBeNull();
    });

    test('distinguishes missing prerequisites and picker cancellation from failed operations', async () => {
        const feedback = new RunFeedback({ console: createConsole() });
        const missing = await feedback.run({ id: 'file', label: 'Read file' }, () => { throw new BlockedRunError('Choose a DICOM file first.'); });
        const cancel = new Error('The user cancelled the picker.');
        cancel.name = 'AbortError';
        const cancelled = await feedback.run({ id: 'save', label: 'Save file' }, () => Promise.reject(cancel));
        expect(missing.state).toBe('blocked');
        expect(cancelled.state).toBe('blocked');
        expect(feedback.counts).toEqual({ total: 2, passed: 0, failed: 0, blocked: 2 });
    });

    test('prevents overlapping actions, bounds stored previews, and keeps complete session counts', async () => {
        const feedback = new RunFeedback({ console: createConsole(), maxRuns: 2 });
        let finish;
        const first = feedback.run({ id: 'one', label: 'One' }, () => new Promise(resolve => { finish = resolve; }));
        const overlap = jest.fn();
        expect(await feedback.run({ id: 'two', label: 'Two' }, overlap)).toBeNull();
        expect(overlap).not.toHaveBeenCalled();
        finish();
        await first;
        await feedback.run({ id: 'two', label: 'Two' }, () => 2);
        await feedback.run({ id: 'three', label: 'Three' }, () => 3);
        expect(feedback.runs.map(run => run.label)).toEqual(['Three', 'Two']);
        expect(feedback.counts.total).toBe(3);
        feedback.clear();
        expect(feedback.runs).toEqual([]);
        expect(feedback.counts.total).toBe(0);
    });

    test('preserves the original file input as the handler context and clears the console only when opted in', async () => {
        const input = createElement('Local file');
        input.files = [{ name: 'sample.dcm' }];
        const autoClear = createElement();
        autoClear.checked = true;
        const logger = createConsole();
        const feedback = new RunFeedback({ document: { getElementById: id => id === 'file' ? input : (id === 'consoleAutoClear' ? autoClear : null) }, console: logger });
        let context;
        feedback.bindAction('file', 'change', function () { context = this; });
        input.fire('change');
        await Promise.resolve();
        expect(context).toBe(input);
        expect(logger.clear).toHaveBeenCalledTimes(1);
        expect(feedback.runs[0].state).toBe('passed');
    });

    test('previews large pixel buffers and cyclic objects without retaining or expanding the whole result', () => {
        const result = { pixels: new Uint8Array(1024 * 1024), instances: Array.from({ length: 100 }, (_, index) => ({ index })) };
        result.self = result;
        const preview = previewResult(result);
        expect(preview.length).toBeLessThan(2000);
        expect(preview).toContain('1048576');
        expect(preview).toContain('92 more items');
        expect(preview).toContain('[Circular reference]');
    });

    test('previews FHIR resources using their canonical JSON including series instances and contained patients', () => {
        const study = new ImagingStudy();
        const series = new ImagingSeries();
        const instance = new ImagingInstance();
        const patient = new Patient();
        patient.id = 'patient-1';
        instance.uid = '1.2.3.4';
        series.uid = '1.2.3';
        series.instance = [instance];
        study.series = [series];
        study.contained = [patient];
        const preview = JSON.parse(previewResult(study));
        expect(preview.resourceType).toBe('ImagingStudy');
        expect(preview.series[0].instance[0].uid).toBe('1.2.3.4');
        expect(preview.contained[0]).toMatchObject({ resourceType: 'Patient', id: 'patient-1' });
        expect(preview).not.toHaveProperty('_series');
    });

    test('keeps the inspector label and details aligned when selecting a previous history entry', async () => {
        const elements = new Map(['runList', 'lastRunLabel', 'resultSummary', 'resultDetails'].map(id => [id, createElement()]));
        const document = {
            getElementById: id => elements.get(id),
            createElement: tagName => Object.assign(createElement(), { tagName })
        };
        const feedback = new RunFeedback({ document, console: createConsole() });
        expect(elements.get('runList').children[0]).toMatchObject({ tagName: 'li', className: 'empty-history' });
        await feedback.run({ id: 'first', label: 'First action' }, () => ({ marker: 'first-result' }));
        await feedback.run({ id: 'second', label: 'Second action' }, () => ({ marker: 'second-result' }));
        const previousItem = elements.get('runList').children[1];
        expect(previousItem.tagName).toBe('li');
        previousItem.children[0].fire('click');
        expect(elements.get('lastRunLabel').textContent).toBe('First action · passed');
        expect(elements.get('resultDetails').textContent).toContain('first-result');
        expect(elements.get('resultDetails').textContent).not.toContain('second-result');
        feedback.clear();
        expect(elements.get('runList').children[0].className).toBe('empty-history');
    });

    test('shows unexpected page errors as safe text while preserving their console diagnostics', () => {
        const elements = new Map(['lastRunLabel', 'resultSummary', 'resultDetails'].map(id => [id, createElement()]));
        const logger = createConsole();
        const feedback = new RunFeedback({ document: { getElementById: id => elements.get(id) }, console: logger });
        const error = new Error('<script>Unexpected failure</script>');
        feedback.reportUnexpectedError(error);
        expect(elements.get('lastRunLabel').textContent).toBe('Unexpected page error · failed');
        expect(elements.get('resultSummary').textContent).toBe('<script>Unexpected failure</script>');
        expect(elements.get('resultDetails').textContent).toContain('Error: <script>Unexpected failure</script>');
        expect(feedback.counts.failed).toBe(1);
        expect(logger.error).toHaveBeenCalledWith('[Kitchen Sink unexpected error]', error);
    });

    test('shows inline problem summaries and clears them while retrying, after success, and when clearing runs', async () => {
        const elements = new Map(['read', 'readStatus', 'readMessage'].map(id => [id, createElement(id)]));
        const feedback = new RunFeedback({ document: { getElementById: id => elements.get(id) }, console: createConsole() });
        feedback.bindAction('read', 'click', () => {});
        const action = { id: 'read', label: 'Read' };
        await feedback.run(action, () => { throw new Error('The peer rejected the request.'); });
        const message = elements.get('readMessage');
        expect(message.hidden).toBe(false);
        expect(message.textContent).toBe('The peer rejected the request.');
        expect(message.dataset.state).toBe('failed');
        let finish;
        const retry = feedback.run(action, () => new Promise(resolve => { finish = resolve; }));
        expect(message.hidden).toBe(true);
        expect(message.textContent).toBe('');
        finish();
        await retry;
        expect(message.hidden).toBe(true);
        await feedback.run(action, () => { throw new BlockedRunError('Start the backend first.'); });
        expect(message.hidden).toBe(false);
        expect(message.dataset.state).toBe('blocked');
        feedback.clear();
        expect(message.hidden).toBe(true);
        expect(message.textContent).toBe('');
    });
});

describe('Kitchen Sink DICOMweb connection settings', () => {
    const settings = { baseUrl: 'http://localhost:8042/dicom-web/', studyUid: '1.2.3', seriesUid: '1.2.4', instanceUid: '1.2.5' };

    test('builds each scope from the editable endpoint and UIDs', () => {
        expect(dicomwebUrl(settings, 'base')).toBe('http://localhost:8042/dicom-web');
        expect(dicomwebUrl(settings, 'study')).toBe('http://localhost:8042/dicom-web/studies/1.2.3');
        expect(dicomwebUrl({ ...settings, baseUrl: 'https://example.test/imaging', instanceUid: '9.8.7' }, 'instance')).toBe('https://example.test/imaging/studies/1.2.3/series/1.2.4/instances/9.8.7');
    });

    test('blocks missing or invalid required UIDs before making a request', () => {
        expect(() => dicomwebUrl({ ...settings, seriesUid: '' }, 'instance')).toThrow('Enter the Series UID');
        expect(() => dicomwebUrl({ ...settings, instanceUid: '../../patient' }, 'instance')).toThrow(BlockedRunError);
        expect(dicomwebUrl({ ...settings, seriesUid: '' }, 'study')).toContain('/studies/1.2.3');
    });

    test.each(['', 'file:///tmp', 'javascript:alert(1)', 'http://localhost:8042/dicom-web?x=1'])('blocks invalid endpoints: %s', baseUrl => {
        expect(() => dicomwebUrl({ ...settings, baseUrl })).toThrow(BlockedRunError);
    });
});
