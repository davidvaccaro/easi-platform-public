export class BlockedRunError extends Error {
    constructor(message) {
        super(message);
        this.name = 'BlockedRunError';
    }
}

export function summarizeResult(value) {
    if (value == null)
        return 'Completed. See the console and action output for details.';
    if (Array.isArray(value))
        return 'Returned ' + value.length + ' result' + (value.length === 1 ? '.' : 's.');
    if (ArrayBuffer.isView(value))
        return 'Returned ' + value.byteLength.toLocaleString() + ' bytes.';
    if (typeof value === 'object') {
        if (value.resourceType)
            return 'Returned FHIR ' + value.resourceType + '.';
        if (Number.isFinite(value.resultCount))
            return 'Returned ' + value.resultCount + ' result' + (value.resultCount === 1 ? '.' : 's.');
        if (Number.isFinite(value.bytesWritten))
            return 'Wrote ' + value.bytesWritten.toLocaleString() + ' bytes.';
        if (value.constructor?.name && value.constructor.name !== 'Object')
            return 'Returned ' + value.constructor.name + '. Inspect the full object in the console.';
    }
    return 'Completed. Inspect the full result in the console.';
}

// Keep the on-page preview small; full results remain available in the console.
export function previewResult(value) {
    const seen = new WeakSet();
    function preview(item, depth, maxDepth = 4) {
        if (typeof item === 'bigint')
            return String(item);
        if (typeof item === 'function')
            return '[Function]';
        if (typeof item === 'string')
            return item.length > 1200 ? item.slice(0, 1200) + '…' : item;
        if (item == null || typeof item !== 'object')
            return item;
        if (seen.has(item))
            return '[Circular reference]';
        if (ArrayBuffer.isView(item))
            return { type: item.constructor.name, byteLength: item.byteLength, preview: Array.from(new Uint8Array(item.buffer, item.byteOffset, Math.min(item.byteLength, 24))) };
        if (item instanceof ArrayBuffer)
            return { type: 'ArrayBuffer', byteLength: item.byteLength };
        if (depth >= maxDepth)
            return '[' + (item.constructor?.name ?? 'Object') + ']';
        seen.add(item);
        if (item.resourceType && typeof item.toJSON === 'function') {
            const resource = item.toJSON();
            if (resource !== item)
                return preview(resource, depth, 6);
        }
        if (Array.isArray(item)) {
            const result = item.slice(0, 8).map(entry => preview(entry, depth + 1, maxDepth));
            if (item.length > 8)
                result.push('… ' + (item.length - 8) + ' more items');
            return result;
        }
        const result = {};
        const keys = Object.keys(item);
        for (const key of keys.slice(0, 18)) {
            try { result[key] = preview(item[key], depth + 1, maxDepth); }
            catch { result[key] = '[Unavailable]'; }
        }
        if (keys.length > 18)
            result['…'] = (keys.length - 18) + ' more properties';
        return result;
    }
    try { return JSON.stringify(preview(value, 0), null, 2) ?? ''; }
    catch { return String(value); }
}

export function dicomwebUrl(settings, level = 'base') {
    const base = String(settings.baseUrl ?? '').trim().replace(/\/+$/, '');
    if (base.length === 0)
        throw new BlockedRunError('Enter the DICOMweb base URL in Connection settings.');
    let parsed;
    try { parsed = new URL(base); }
    catch { throw new BlockedRunError('Enter a valid http:// or https:// DICOMweb base URL.'); }
    if (!['http:', 'https:'].includes(parsed.protocol) || parsed.search || parsed.hash)
        throw new BlockedRunError('The DICOMweb base URL must use HTTP or HTTPS and have no query or fragment.');
    const names = { study: 'Study', series: 'Series', instance: 'Instance' };
    const parts = { study: 'studies', series: 'series', instance: 'instances' };
    let result = base;
    if (level === 'base')
        return result;
    for (const name of ['study', 'series', 'instance']) {
        const uid = String(settings[name + 'Uid'] ?? '').trim();
        if (!uid)
            throw new BlockedRunError('Enter the ' + names[name] + ' UID in Connection settings.');
        if (uid.length > 64 || !/^[0-9]+(?:\.[0-9]+)*$/.test(uid))
            throw new BlockedRunError(names[name] + ' UID must contain digits separated by dots (up to 64 characters).');
        result += '/' + parts[name] + '/' + encodeURIComponent(uid);
        if (name === level)
            return result;
    }
    throw new Error('Unknown DICOMweb request level: ' + level);
}

export class RunFeedback {
    constructor(options = {}) {
        this.document = options.document ?? globalThis.document;
        this.console = options.console ?? globalThis.console;
        this.now = options.now ?? (() => performance.now());
        this.maxRuns = options.maxRuns ?? 30;
        this.onChange = options.onChange ?? (() => {});
        this.runs = [];
        this.counts = { total: 0, passed: 0, failed: 0, blocked: 0 };
        this.active = null;
        this.selected = null;
        this.actions = new Map();
        this.nextId = 1;
        this.bindControls();
        this.render();
    }

    element(id) {
        return this.document?.getElementById(id) ?? null;
    }

    bindControls() {
        this.element('clearRuns')?.addEventListener('click', () => this.clear());
        this.element('clearConsole')?.addEventListener('click', () => this.console.clear());
        this.element('copyLastResult')?.addEventListener('click', async () => {
            if (!this.selected)
                return;
            const text = this.selected.label + ' · ' + this.selected.state + '\n' + this.selected.summary + '\n\n' + this.selected.details;
            try {
                await globalThis.navigator.clipboard.writeText(text);
                const summary = this.element('resultSummary');
                if (summary) summary.textContent = 'Copied run details to the clipboard.';
            }
            catch {
                const summary = this.element('resultSummary');
                if (summary) summary.textContent = 'Clipboard unavailable. Select and copy the details below.';
            }
        });
    }

    bindAction(id, eventName, handler) {
        const element = this.element(id);
        if (!element)
            return;
        const label = element.dataset.actionLabel ?? element.getAttribute('aria-label') ?? element.textContent?.trim() ?? id;
        this.actions.set(id, element);
        element.addEventListener(eventName, event => {
            if (eventName === 'change' && element.files?.length === 0)
                return;
            void this.run({ id, label: label || id }, () => handler.call(element, event));
        });
    }

    capture(result) {
        if (!this.active)
            return;
        this.active.summary = summarizeResult(result);
        this.active.details = previewResult(result);
    }

    async run(action, handler) {
        if (this.active)
            return null;
        if (this.element('consoleAutoClear')?.checked === true)
            this.console.clear();
        const run = { id: this.nextId++, actionId: action.id, label: action.label, state: 'running', startedAt: this.now(), durationMs: 0, summary: 'Running…', details: '' };
        this.active = run;
        this.selected = run;
        this.runs.unshift(run);
        this.runs.length = Math.min(this.runs.length, this.maxRuns);
        this.counts.total++;
        const controls = Array.from(this.actions.values()).map(element => ({ element, disabled: element.disabled }));
        for (const control of controls) control.element.disabled = true;
        this.console.groupCollapsed('[EASI #' + run.id + '] ' + run.label);
        this.console.log('Running ' + run.label + '…');
        this.render();
        try {
            const result = await handler();
            if (result !== undefined)
                this.capture(result);
            run.state = 'passed';
            this.counts.passed++;
            if (run.summary === 'Running…')
                run.summary = summarizeResult(result);
            if (result !== undefined)
                this.console.log('Result:', result);
        }
        catch (error) {
            const blocked = error instanceof BlockedRunError || error?.name === 'AbortError';
            run.state = blocked ? 'blocked' : 'failed';
            this.counts[run.state]++;
            run.summary = error?.message ?? String(error);
            run.details = blocked ? run.summary : (error?.stack ?? run.summary);
            if (blocked) this.console.warn(run.summary);
            else this.console.error(error);
        }
        finally {
            run.durationMs = Math.max(0, this.now() - run.startedAt);
            this.console.log(run.state.toUpperCase() + ' · ' + Math.round(run.durationMs) + ' ms · ' + run.summary);
            this.console.groupEnd();
            this.active = null;
            for (const control of controls) control.element.disabled = control.disabled;
            this.render();
        }
        return run;
    }

    clear() {
        if (this.active)
            return;
        this.runs = [];
        this.selected = null;
        this.counts = { total: 0, passed: 0, failed: 0, blocked: 0 };
        for (const id of this.actions.keys()) {
            const status = this.element(id + 'Status');
            if (status) { status.textContent = 'Ready'; status.dataset.state = 'ready'; }
        }
        this.render();
    }

    reportUnexpectedError(error) {
        const run = {
            id: this.nextId++, actionId: null, label: 'Unexpected page error', state: 'failed',
            startedAt: this.now(), durationMs: 0,
            summary: error?.message ?? String(error), details: error?.stack ?? String(error)
        };
        this.runs.unshift(run);
        this.runs.length = Math.min(this.runs.length, this.maxRuns);
        this.selected = run;
        this.counts.total++;
        this.counts.failed++;
        this.console.error('[Kitchen Sink unexpected error]', error);
        this.render();
    }

    render() {
        for (const [id, value] of [['runCount', this.counts.total], ['passCount', this.counts.passed], ['failCount', this.counts.failed]]) {
            const element = this.element(id);
            if (element) element.textContent = String(value);
        }
        const harnessStatus = this.element('harnessStatus');
        if (harnessStatus) harnessStatus.textContent = this.active ? 'Running…' : 'Ready · ' + this.actions.size + ' actions';
        const lastLabel = this.element('lastRunLabel');
        if (lastLabel) lastLabel.textContent = this.selected ? this.selected.label + ' · ' + this.selected.state : 'No actions run yet';
        const clear = this.element('clearRuns');
        if (clear) clear.disabled = this.active != null;
        const copy = this.element('copyLastResult');
        if (copy) copy.disabled = this.selected == null || this.active != null;
        const list = this.element('runList');
        if (list) {
            list.replaceChildren();
            if (this.runs.length === 0) {
                const empty = this.document.createElement('li');
                empty.className = 'empty-history';
                empty.textContent = 'No actions run yet. Start with a quick JSON check.';
                list.append(empty);
            }
            for (const run of this.runs) {
                const item = this.document.createElement('li');
                item.className = 'run-list-item';
                const button = this.document.createElement('button');
                button.type = 'button';
                button.className = 'run-entry';
                button.dataset.state = run.state;
                button.setAttribute('aria-pressed', String(this.selected === run));
                const label = this.document.createElement('span');
                label.className = 'run-entry-label';
                label.textContent = run.label;
                const status = this.document.createElement('span');
                status.className = 'run-entry-state';
                status.textContent = run.state.charAt(0).toUpperCase() + run.state.slice(1) + (run.state === 'running' ? '' : ' · ' + Math.round(run.durationMs) + ' ms');
                button.append(label, status);
                button.addEventListener('click', () => { this.selected = run; this.render(); });
                item.append(button);
                list.append(item);
            }
        }
        for (const [id, element] of this.actions) {
            const run = this.runs.find(item => item.actionId === id);
            const status = this.element(id + 'Status');
            if (status && run) {
                status.dataset.state = run.state;
                status.textContent = run.state.charAt(0).toUpperCase() + run.state.slice(1) + (run.state === 'running' ? '…' : ' · ' + Math.round(run.durationMs) + ' ms');
            }
            const message = this.element(id + 'Message');
            if (message) {
                const showProblem = run?.state === 'failed' || run?.state === 'blocked';
                message.textContent = showProblem ? run.summary : '';
                message.hidden = !showProblem;
                message.dataset.state = showProblem ? run.state : 'ready';
            }
            element.setAttribute('aria-busy', String(this.active?.actionId === id));
        }
        const summary = this.element('resultSummary');
        if (summary) {
            summary.textContent = this.selected?.summary ?? 'Choose an action. Full objects and timing are logged in the browser console.';
            summary.dataset.state = this.selected?.state ?? 'ready';
        }
        const details = this.element('resultDetails');
        if (details) details.textContent = this.selected?.details ?? '';
        this.onChange(this);
    }
}
