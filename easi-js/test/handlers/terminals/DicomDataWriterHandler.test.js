import Attribute from "../../../src/dicom/Attribute.js";
import Tag from "../../../src/dicom/Tag.js";
import TransferSyntax from "../../../src/dicom/TransferSyntax.js";
import DicomDataWriterHandler from "../../../src/handlers/terminals/DicomDataWriterHandler.js";

test("Test: DicomDataWriterHandler writes explicit VR UN for private attributes with unresolved VR", async () => {

    var privateTag = Tag.find("00111010");

    expect(privateTag.IsPrivate).toBe(true);
    expect(privateTag.VR).toBe(null);

    var attribute = new Attribute(
        privateTag,
        0,
        new Uint8Array(0),
        TransferSyntax.ExplicitVRLittleEndian
    );
    attribute.value = "PRIVATE-DATA";

    var writer = new DicomDataWriterHandler();
    var context = writer.onStartInstance(null);

    await writer.onEndAttribute(context, attribute);

    var bytes = writer.toOutputBytes();

    expect(bytes.length).toBeGreaterThan(12);
    expect(bytes[4]).toBe("U".charCodeAt(0));
    expect(bytes[5]).toBe("N".charCodeAt(0));

});

