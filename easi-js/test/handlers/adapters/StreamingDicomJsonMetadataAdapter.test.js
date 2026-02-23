import StreamingJsonDataParser from '../../../src/parsers/StreamingJsonDataParser.js';
import StreamingDicomJsonMetadataAdapter from '../../../src/handlers/adapters/StreamingDicomJsonMetadataAdapter.js';
import { Status } from '../../../src/parsers/Status.js';
import StreamingDicomInstanceHandler from '../../../src/handlers/terminals/StreamingDicomInstanceHandler.js';
import Tag from '../../../src/dicom/Tag.js';

class TraceDicomHandler {

    onStartInstance(context) {

        if (context == null) {
            context = { events: [] };
        }

        context.events.push('onStartInstance');
        return context;

    }

    onStartMetaSet(context) {
        context.events.push('onStartMetaSet');
    }

    onEndMetaSet(context) {
        context.events.push('onEndMetaSet');
    }

    onStartDataSet(context) {
        context.events.push('onStartDataSet');
    }

    onEndDataSet(context) {
        context.events.push('onEndDataSet');
    }

    onStartAttribute(context, attribute) {
        context.events.push(`onStartAttribute:${attribute.tag.ID}`);
    }

    onStartSequence(context, sequence) {
        context.events.push(`onStartSequence:${sequence.tag.ID}`);
    }

    onEndSequence(context, sequence) {
        context.events.push(`onEndSequence:${sequence.tag.ID}`);
    }

    onStartItem(context) {
        context.events.push('onStartItem');
    }

    onEndItem(context) {
        context.events.push('onEndItem');
    }

    onAppendAttribute(context, attribute) {
        context.events.push(`onAppendAttribute:${attribute.tag.ID}`);
    }

    onEndAttribute(context, attribute) {
        context.events.push(`onEndAttribute:${attribute.tag.ID}`);
    }

    onEndInstance(context) {
        context.events.push('onEndInstance');
        return context.events;
    }

}

test('Test: Metadata adapter emits canonical DICOM attribute events incrementally across chunks', async () => {

    const json = '{"00020010":{"vr":"UI","Value":["1.2.840.10008.1.2.1"]},"00080018":{"vr":"UI","Value":["1.2.3"]}}';
    const splitAt = json.indexOf(',"00080018"');

    const encoder = new TextEncoder();
    const bytes = encoder.encode(json);
    const chunk1 = bytes.slice(0, splitAt);
    const chunk2 = bytes.slice(splitAt);

    const parser = new StreamingJsonDataParser();
    parser.reset();
    parser.handler = new StreamingDicomJsonMetadataAdapter(new TraceDicomHandler());

    const status1 = await parser.parse(chunk1, false, chunk1.length, bytes.length);
    expect(status1).toBe(Status.CONTINUE);

    // First attribute should already be emitted before the full metadata instance closes.
    expect(Array.isArray(parser.context.nextContext.events)).toBe(true);
    expect(parser.context.nextContext.events).toEqual([
        'onStartInstance',
        'onStartMetaSet',
        'onStartAttribute:00020010',
        'onAppendAttribute:00020010',
        'onEndAttribute:00020010'
    ]);

    const status2 = await parser.parse(chunk2, true, bytes.length, bytes.length);
    expect(status2).toBe(Status.SUCCESS);

    expect(parser.result).toEqual([
        'onStartInstance',
        'onStartMetaSet',
        'onStartAttribute:00020010',
        'onAppendAttribute:00020010',
        'onEndAttribute:00020010',
        'onEndMetaSet',
        'onStartDataSet',
        'onStartAttribute:00080018',
        'onAppendAttribute:00080018',
        'onEndAttribute:00080018',
        'onEndDataSet',
        'onEndInstance'
    ]);

});

test('Test: Metadata adapter emits canonical DICOM sequence and item events incrementally across chunks', async () => {

    const json =
        '{"00081110":{"vr":"SQ","Value":[{"00081150":{"vr":"UI","Value":["1.2.840.10008.5.1.4.1.1.2"]},"00081155":{"vr":"UI","Value":["1.2.3.4"]}}]},"00080018":{"vr":"UI","Value":["1.2.3.5"]}}';
    const splitAt = json.indexOf(',"00081155"');

    const encoder = new TextEncoder();
    const bytes = encoder.encode(json);
    const chunk1 = bytes.slice(0, splitAt);
    const chunk2 = bytes.slice(splitAt);

    const parser = new StreamingJsonDataParser();
    parser.reset();
    parser.handler = new StreamingDicomJsonMetadataAdapter(new TraceDicomHandler());

    const status1 = await parser.parse(chunk1, false, chunk1.length, bytes.length);
    expect(status1).toBe(Status.CONTINUE);

    // Sequence/item/nested attribute events should stream before the sequence closes.
    expect(parser.context.nextContext.events).toEqual([
        'onStartInstance',
        'onStartDataSet',
        'onStartSequence:00081110',
        'onStartItem',
        'onStartAttribute:00081150',
        'onAppendAttribute:00081150',
        'onEndAttribute:00081150'
    ]);

    const status2 = await parser.parse(chunk2, true, bytes.length, bytes.length);
    expect(status2).toBe(Status.SUCCESS);

    expect(parser.result).toEqual([
        'onStartInstance',
        'onStartDataSet',
        'onStartSequence:00081110',
        'onStartItem',
        'onStartAttribute:00081150',
        'onAppendAttribute:00081150',
        'onEndAttribute:00081150',
        'onStartAttribute:00081155',
        'onAppendAttribute:00081155',
        'onEndAttribute:00081155',
        'onEndItem',
        'onEndSequence:00081110',
        'onStartAttribute:00080018',
        'onAppendAttribute:00080018',
        'onEndAttribute:00080018',
        'onEndDataSet',
        'onEndInstance'
    ]);

});

test('Test: Metadata adapter parses chunk-split string values without duplication or corruption', async () => {

    const json = '{"00080018":{"vr":"UI","Value":["1.2.840.10008.5.1.4.1.1.2.12345"]}}';

    // Split inside the UID string value so onAppendString() is exercised.
    const splitAt = json.indexOf('10008.5');

    const encoder = new TextEncoder();
    const bytes = encoder.encode(json);
    const chunk1 = bytes.slice(0, splitAt);
    const chunk2 = bytes.slice(splitAt);

    const parser = new StreamingJsonDataParser();
    parser.reset();
    parser.handler = new StreamingDicomJsonMetadataAdapter(new StreamingDicomInstanceHandler());

    const status1 = await parser.parse(chunk1, false, chunk1.length, bytes.length);
    expect(status1).toBe(Status.CONTINUE);

    const status2 = await parser.parse(chunk2, true, bytes.length, bytes.length);
    expect(status2).toBe(Status.SUCCESS);

    const instance = parser.result;
    expect(instance.dataSet).toBeDefined();
    expect(instance.dataSet.find(Tag.SOPInstanceUID).value).toBe('1.2.840.10008.5.1.4.1.1.2.12345');

});

test('Test: Metadata adapter parses chunk-split PN object string values without failure', async () => {

    const json = '{"00100010":{"vr":"PN","Value":[{"Alphabetic":"DOE^JOHN"}]}}';

    // Split inside the PN object string value to exercise object-backed onAppendString().
    const splitAt = json.indexOf('^JOHN');

    const encoder = new TextEncoder();
    const bytes = encoder.encode(json);
    const chunk1 = bytes.slice(0, splitAt);
    const chunk2 = bytes.slice(splitAt);

    const parser = new StreamingJsonDataParser();
    parser.reset();
    parser.handler = new StreamingDicomJsonMetadataAdapter(new StreamingDicomInstanceHandler());

    const status1 = await parser.parse(chunk1, false, chunk1.length, bytes.length);
    expect(status1).toBe(Status.CONTINUE);

    const status2 = await parser.parse(chunk2, true, bytes.length, bytes.length);
    expect(status2).toBe(Status.SUCCESS);

    const instance = parser.result;
    expect(instance.dataSet).toBeDefined();
    expect(instance.dataSet.find(Tag.PatientName)).toBeDefined();

});

test('Test: Metadata adapter parses chunk-split escaped string values without failure', async () => {

    const json = '{"00400310":{"vr":"ST","Value":["TotalDLP=1\\\\r\\\\nEvent=1"]}}';

    // Split exactly after the escaped backslash to exercise JSON parser string continuation escape state.
    const splitAt = json.indexOf('\\\\r') + 1;

    const encoder = new TextEncoder();
    const bytes = encoder.encode(json);
    const chunk1 = bytes.slice(0, splitAt);
    const chunk2 = bytes.slice(splitAt);

    const parser = new StreamingJsonDataParser();
    parser.reset();
    parser.handler = new StreamingDicomJsonMetadataAdapter(new StreamingDicomInstanceHandler());

    const status1 = await parser.parse(chunk1, false, chunk1.length, bytes.length);
    expect(status1).toBe(Status.CONTINUE);

    const status2 = await parser.parse(chunk2, true, bytes.length, bytes.length);
    expect(status2).toBe(Status.SUCCESS);

    const instance = parser.result;
    expect(instance.dataSet).toBeDefined();
    expect(instance.dataSet.find(Tag.CommentsOnRadiationDose)).toBeDefined();

});

test('Test: Metadata adapter parses realistic metadata subset with nested sequences and BulkDataURI', async () => {

    const metadata = JSON.stringify([{
        "00080005": { "Value": ["ISO_IR 100"], "vr": "CS" },
        "00080090": { "Value": [{ "Alphabetic": "Whooley^Peter^D" }], "vr": "PN" },
        "00081050": { "vr": "PN" },
        "00400275": {
            "Value": [{
                "00080050": { "Value": ["1021455945"], "vr": "SH" },
                "00081110": {
                    "Value": [{
                        "00081150": { "Value": ["1.2.840.10008.3.1.2.3.1"], "vr": "UI" },
                        "00081155": { "Value": ["1.2.3.4.5"], "vr": "UI" }
                    }],
                    "vr": "SQ"
                }
            }],
            "vr": "SQ"
        },
        "00400310": { "Value": ["TotalDLP=497.69\r\nEvent=1 DLP=9.09"], "vr": "ST" },
        "37110010": { "Value": ["A.L.I. Technologies, Inc."], "vr": "LO" },
        "7FE00010": {
            "BulkDataURI": "http://localhost/dicom-web/studies/x/series/y/instances/z/bulk/7fe00010",
            "vr": "OB"
        }
    }], null, 3);

    // Split across nested sequence and escaped string regions to exercise incremental semantic emission.
    const split1 = metadata.indexOf('"00081155"');
    const split2 = metadata.indexOf('\\r\\n') + 1;

    const encoder = new TextEncoder();
    const bytes = encoder.encode(metadata);
    const chunk1 = bytes.slice(0, split1);
    const chunk2 = bytes.slice(split1, split2);
    const chunk3 = bytes.slice(split2);

    const parser = new StreamingJsonDataParser();
    parser.reset();
    parser.handler = new StreamingDicomJsonMetadataAdapter(new StreamingDicomInstanceHandler());

    expect(await parser.parse(chunk1, false, chunk1.length, bytes.length)).toBe(Status.CONTINUE);
    expect(await parser.parse(chunk2, false, (chunk1.length + chunk2.length), bytes.length)).toBe(Status.CONTINUE);
    expect(await parser.parse(chunk3, true, bytes.length, bytes.length)).toBe(Status.SUCCESS);

    const instance = parser.result;
    expect(instance.dataSet).toBeDefined();
    expect(instance.dataSet.find(Tag.RequestAttributesSequence)).toBeDefined();
    expect(instance.dataSet.find(Tag.PixelData)).toBeDefined();

});
