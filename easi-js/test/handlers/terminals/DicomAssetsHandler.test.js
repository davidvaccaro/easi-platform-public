import DicomAssetsHandler from '../../../src/handlers/terminals/DicomAssetsHandler.js';
import Tag from '../../../src/dicom/Tag.js';
import Attribute from '../../../src/dicom/Attribute.js';
import TransferSyntax from '../../../src/dicom/TransferSyntax.js';

test('Test: DicomAssetsHandler emits onContent and collected content for encapsulated document payload', async () => {

    var contentEvents = [];
    var contentBytes = new Uint8Array([0x25, 0x50, 0x44, 0x46]); // "%PDF"

    var handler = new DicomAssetsHandler({
        payload: {
            onContent: (content) => contentEvents.push(content),
            collect: true
        }
    });

    var context = {
        assets: {
            metadata: [],
            frames: [],
            content: [],
            metadataCount: 0,
            framesEmitted: 0,
            contentEmitted: 0,
            instances: []
        }
    };

    var encapsulatedDocumentAttribute = {
        tag: Tag.EncapsulatedDocument,
        access: () => contentBytes,
        transferSyntax: null
    };

    var instance = {
        sopInstanceUid: '1.2.3',
        dataSet: {
            find: (tag) => ((tag.ID == Tag.EncapsulatedDocument.ID) ? encapsulatedDocumentAttribute : null)
        }
    };

    var result = await handler.processInstance(context, instance);

    expect(contentEvents.length).toBe(1);
    expect(contentEvents[0].tag.ID).toBe(Tag.EncapsulatedDocument.ID);
    expect(contentEvents[0].bytes).toBe(contentBytes);
    expect(result.content.length).toBe(1);
    expect(result.content[0].tag.ID).toBe(Tag.EncapsulatedDocument.ID);
    expect(context.assets.contentEmitted).toBe(1);

});

test('Test: DicomAssetsHandler emits onContentChunk without materializing encapsulated document bytes', async () => {

    var contentChunkEvents = [];
    var handler = new DicomAssetsHandler({
        payload: {
            onContentChunk: (contentChunk) => contentChunkEvents.push(contentChunk)
        }
    });

    var context = handler.onStartInstance(null);
    handler.onStartDataSet(context);

    var attribute = new Attribute(
        Tag.EncapsulatedDocument,
        6,
        null,
        TransferSyntax.ExplicitVRLittleEndian
    );

    handler.onStartAttribute(context, attribute);

    await handler.onAttributeChunk(context, {
        attribute,
        chunk: new Uint8Array([1, 2, 3]),
        isFinalChunk: false
    });

    await handler.onAttributeChunk(context, {
        attribute,
        chunk: new Uint8Array([4, 5, 6]),
        isFinalChunk: true
    });

    handler.onEndAttribute(context, attribute);

    expect(contentChunkEvents.length).toBe(2);
    expect(contentChunkEvents[0].offset).toBe(0);
    expect(contentChunkEvents[1].offset).toBe(3);
    expect(contentChunkEvents[0].isFirstChunk).toBe(true);
    expect(contentChunkEvents[1].isFinalChunk).toBe(true);
    expect(attribute.length()).toBe(0);

});
