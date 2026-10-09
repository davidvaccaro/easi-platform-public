import EASI from '../../src/EASI.js';
import { BlockedRunError } from '../../samples/kitchen-sink/run-feedback.js';

const mockBindings = new Map();
const mockControls = new Map();

jest.mock('../../src/EASI.js', () => ({
    __esModule: true,
    default: { pipelineBuilder: jest.fn() }
}));

jest.mock('../../samples/kitchen-sink/run-feedback.js', () => {
    const actual = jest.requireActual('../../samples/kitchen-sink/run-feedback.js');
    return {
        ...actual,
        RunFeedback: class {
            bindAction(id, event, handler) { mockBindings.set(id, handler); }
            capture() {}
            render() {}
            reportUnexpectedError() {}
        }
    };
});

describe('Kitchen Sink action recipes', () => {
    let originalDocument;
    let originalWindow;
    let originalJquery;
    let originalFetch;
    let objectUrl;
    let revokeUrl;
    let log;
    let warn;
    let errorLog;
    let pipeline;
    let builder;

    beforeAll(() => {
        originalDocument = global.document;
        originalWindow = global.window;
        originalJquery = global.$;
        originalFetch = global.fetch;
        global.fetch = jest.fn();
        global.document = { getElementById: id => id === 'dicomFileFHIR' ? { files: [new Blob(['synthetic DICOM'])] } : null };
        global.window = { addEventListener: jest.fn() };
        global.$ = selector => {
            if (typeof selector === 'function') {
                selector();
                return;
            }
            return {
                val(value) {
                    if (arguments.length) { mockControls.set(selector, value); return this; }
                    return mockControls.get(selector);
                },
                is() { return mockControls.get(selector) === true; }
            };
        };
        objectUrl = jest.spyOn(URL, 'createObjectURL').mockReturnValue('blob:synthetic-input');
        revokeUrl = jest.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
        log = jest.spyOn(console, 'log').mockImplementation(() => {});
        warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
        errorLog = jest.spyOn(console, 'error').mockImplementation(() => {});
        require('../../samples/kitchen-sink/actions.js');
    });

    beforeEach(() => {
        mockControls.clear();
        mockControls.set('#ksDicomwebBaseUrl', 'http://localhost:8042/dicom-web');
        mockControls.set('#fhirSubjectReferenceTemplate', 'Patient/{dicom.PatientID}');
        pipeline = { process: jest.fn().mockResolvedValue(null) };
        builder = {
            fromHttpStream: jest.fn().mockReturnThis(),
            ofDicomData: jest.fn().mockReturnThis(),
            ofJsonData: jest.fn().mockReturnThis(),
            toStructuredValue: jest.fn().mockReturnThis(),
            toMapping: jest.fn().mockReturnThis(),
            build: jest.fn(() => pipeline)
        };
        EASI.pipelineBuilder.mockReset().mockReturnValue(builder);
        objectUrl.mockClear();
        revokeUrl.mockClear();
        global.fetch.mockReset();
        warn.mockClear();
        errorLog.mockClear();
    });

    afterAll(() => {
        global.document = originalDocument;
        global.window = originalWindow;
        global.$ = originalJquery;
        global.fetch = originalFetch;
        objectUrl.mockRestore();
        revokeUrl.mockRestore();
        log.mockRestore();
        warn.mockRestore();
        errorLog.mockRestore();
    });

    test('rejects malformed editor JSON before starting an EASI pipeline', () => {
        mockControls.set('#jsonBox', '{');
        expect(() => mockBindings.get('jsonFromBox')()).toThrow(SyntaxError);
        expect(EASI.pipelineBuilder).not.toHaveBeenCalled();
        expect(objectUrl).not.toHaveBeenCalled();
    });

    test('still exercises the EASI JSON parser for valid editor JSON and releases its input URL', async () => {
        mockControls.set('#jsonBox', '{"hello":"EASI"}');
        await mockBindings.get('jsonFromBox')();
        expect(builder.ofJsonData).toHaveBeenCalledTimes(1);
        expect(pipeline.process).toHaveBeenCalledWith({ source: 'blob:synthetic-input' });
        expect(revokeUrl).toHaveBeenCalledWith('blob:synthetic-input');
    });

    test.each(['contained', 'reference'])('constructs an accepted FHIR R4 mapping for %s subjects', async mode => {
        mockControls.set('input[name="fhirSubjectMode"]:checked', mode);
        await mockBindings.get('mapLocalFileFHIR')();
        const mapping = builder.toMapping.mock.calls[0][0];
        expect(mapping.subjectMode).toBe(mode);
        expect(mapping.referenceTemplates.instance).toBeNull();
        expect(pipeline.process).toHaveBeenCalledTimes(1);
        expect(revokeUrl).toHaveBeenCalledWith('blob:synthetic-input');
    });

    test('uses the selected patient reference template for local FHIR mapping without a DICOMweb connection', async () => {
        mockControls.set('input[name="fhirSubjectMode"]:checked', 'reference');
        mockControls.set('#ksDicomwebBaseUrl', '');
        mockControls.set('#fhirSubjectReferenceTemplate', 'https://ehr.example.test/Patient/{dicom.PatientID}');
        await mockBindings.get('mapLocalFileFHIR')();
        const mapping = builder.toMapping.mock.calls[0][0];
        expect(mapping.referenceTemplates.subject).toBe('https://ehr.example.test/Patient/{dicom.PatientID}');
        expect(pipeline.process).toHaveBeenCalledTimes(1);
    });

    test('blocks a missing patient reference template before creating a local input URL', () => {
        mockControls.set('input[name="fhirSubjectMode"]:checked', 'reference');
        mockControls.set('#fhirSubjectReferenceTemplate', ' ');
        expect(() => mockBindings.get('mapLocalFileFHIR')()).toThrow('Enter a FHIR subject reference template or choose Contained Patient.');
        expect(EASI.pipelineBuilder).not.toHaveBeenCalled();
        expect(objectUrl).not.toHaveBeenCalled();
    });

    const dimseActions = [
        ['dimseCFindStudies', 'cfind-studies', '#dimseFindOutput'],
        ['dimseCGetInstance', 'cget-instance', '#dimseOutput'],
        ['dimseCMoveRelayDeidentify', 'cmove-deidentify-relay', '#dimseRelayOutput']
    ];

    test.each(dimseActions)('%s posts its existing payload to the same-origin %s route and returns the API body', async (action, route) => {
        mockControls.set('#dimseHost', 'pacs.example.test');
        mockControls.set('#dimsePort', '104');
        mockControls.set('#dimseCalledAeTitle', 'PACS');
        mockControls.set('#dimseCallingAeTitle', 'TEST_CLIENT');
        mockControls.set('#dimseStudyInstanceUid', '1.2.3');
        mockControls.set('#dimseFindModality', 'MR');
        mockControls.set('#dimseRelayReassignUids', true);
        const body = { success: true, resultCount: 2, concernCount: 0 };
        global.fetch.mockResolvedValue({ status: 200, ok: true, json: async () => body });
        expect(await mockBindings.get(action)()).toBe(body);
        const [url, options] = global.fetch.mock.calls[0];
        expect(url).toBe('/easi-js/samples/kitchen-sink/api/dimse/' + route);
        expect(options.method).toBe('POST');
        expect(options.headers).toEqual({ 'Content-Type': 'application/json' });
        const payload = JSON.parse(options.body);
        expect(payload.dimseAssociation ?? payload.sourceAssociation).toEqual({ host: 'pacs.example.test', port: 104, calledAeTitle: 'PACS', callingAeTitle: 'TEST_CLIENT' });
        if (action === 'dimseCFindStudies')
            expect(payload.modality).toBe('MR');
        else
            expect(payload.studyInstanceUid).toBe('1.2.3');
        if (action === 'dimseCMoveRelayDeidentify')
            expect(payload.reassignUids).toBe(true);
    });

    test.each(dimseActions)('%s reports a static-host response as blocked without a stack or error log', async (action, route, output) => {
        global.fetch.mockResolvedValue({ status: 405, ok: false, json: async () => { throw new SyntaxError('HTML response'); } });
        await expect(mockBindings.get(action)()).rejects.toBeInstanceOf(BlockedRunError);
        expect(mockControls.get(output)).toContain(' blocked.');
        expect(mockControls.get(output)).toContain('npm run kitchen-sink');
        expect(mockControls.get(output)).not.toContain('BlockedRunError:');
        expect(warn).toHaveBeenCalledTimes(1);
        expect(errorLog).not.toHaveBeenCalled();
    });

    test.each(dimseActions)('%s sends one request to the configured backend for %s', async (action, route) => {
        mockControls.set('#dimseBackendUrl', 'http://127.0.0.1:8080/');
        const body = { success: true, resultCount: 2, concernCount: 0 };
        global.fetch.mockResolvedValue({ status: 200, ok: true, json: async () => body });
        expect(await mockBindings.get(action)()).toBe(body);
        expect(global.fetch).toHaveBeenCalledTimes(1);
        expect(global.fetch.mock.calls[0][0]).toBe('http://127.0.0.1:8080/easi-js/samples/kitchen-sink/api/dimse/' + route);
        expect(global.fetch.mock.calls[0][1].method).toBe('POST');
    });

    test('blocks invalid backend settings before sending a DIMSE request', async () => {
        mockControls.set('#dimseBackendUrl', 'not a URL');
        await expect(mockBindings.get('dimseCFindStudies')()).rejects.toBeInstanceOf(BlockedRunError);
        expect(global.fetch).not.toHaveBeenCalled();
        expect(mockControls.get('#dimseFindOutput')).toContain('Kitchen Sink server URL');
    });

    test('retains a genuine DIMSE API failure message and stack in its report', async () => {
        global.fetch.mockResolvedValue({ status: 405, ok: false, json: async () => ({ success: false, message: 'Association rejected by PACS.' }) });
        await expect(mockBindings.get('dimseCFindStudies')()).rejects.toThrow('Association rejected by PACS.');
        expect(mockControls.get('#dimseFindOutput')).toContain('DIMSE C-FIND failed.');
        expect(mockControls.get('#dimseFindOutput')).toContain('Error: Association rejected by PACS.');
        expect(errorLog).toHaveBeenCalledTimes(1);
        expect(warn).not.toHaveBeenCalled();
    });
});
