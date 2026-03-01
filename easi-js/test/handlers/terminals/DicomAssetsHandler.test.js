import DicomAssetsHandler from '../../../src/handlers/terminals/DicomAssetsHandler.js';
import Tag from '../../../src/dicom/Tag.js';

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
