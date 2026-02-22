import MetaSet from '../../src/dicom/MetaSet.js';
import Attribute from '../../src/dicom/Attribute.js';
import TransferSyntax from '../../src/dicom/TransferSyntax.js';
import Tag from '../../src/dicom/Tag.js'
import SOPClass from '../../src/dicom/SOPClass.js';

var metaset = null;

beforeAll(() => {

    let data = null;

    // Create the squence
    metaset = new MetaSet();

    metaset.add(new Attribute(Tag.FileMetaInformationGroupLength, 4, [255, 1, 0, 0], TransferSyntax.NONE));
    metaset.add(new Attribute(Tag.FileMetaInformationVersion, 2, [1, 0], TransferSyntax.NONE));

    data = (new TextEncoder()).encode("1.2.840.10008.5.1.4.1.1.128");
    metaset.add(new Attribute(Tag.MediaStorageSOPClassUID, data.length, data, TransferSyntax.NONE));

    data = (new TextEncoder()).encode("1.3.6.1.4.1.14519.5.2.1.7009.2403.178093459220118793111194022094");
    metaset.add(new Attribute(Tag.MediaStorageSOPInstanceUID, data.length, data, TransferSyntax.NONE));

    data = (new TextEncoder()).encode("1.2.840.10008.1.2.1");
    metaset.add(new Attribute(Tag.TransferSyntaxUID, data.length, data, TransferSyntax.NONE));

    data = (new TextEncoder()).encode("1.2.40.0.13.1.3");
    metaset.add(new Attribute(Tag.ImplementationClassUID, data.length, data, TransferSyntax.NONE));

    data = (new TextEncoder()).encode("whatever");
    metaset.add(new Attribute(Tag.ImplementationVersionName, data.length, data, TransferSyntax.NONE));

    data = (new TextEncoder()).encode("Source Application Title");
    metaset.add(new Attribute(Tag.SourceApplicationEntityTitle, data.length, data, TransferSyntax.NONE));

    data = (new TextEncoder()).encode("Sending Application Title");
    metaset.add(new Attribute(Tag.SendingApplicationEntityTitle, data.length, data, TransferSyntax.NONE));

    data = (new TextEncoder()).encode("Receiving Application Title");
    metaset.add(new Attribute(Tag.ReceivingApplicationEntityTitle, data.length, data, TransferSyntax.NONE));

    data = (new TextEncoder()).encode("Private Information Creator UID");
    metaset.add(new Attribute(Tag.PrivateInformationCreatorUID, data.length, data, TransferSyntax.NONE));

    data = (new TextEncoder()).encode("Private Information");
    metaset.add(new Attribute(Tag.PrivateInformation, 4, [255, 100, 50, 25], TransferSyntax.NONE));

});

test("Test: MetaSet Find", () => {
    expect(metaset.find(Tag.FileMetaInformationGroupLength).value).toBe(511);
});

test("Test: MetaSet Group Length", () => {
    expect(metaset.groupLength).toBe(511);
});

test("Test: MetaSet Version", () => {
    expect(metaset.version.toString()).toBe('1,0');
});

test("Test: MetaSet Media Storage SOP Class UID", () => {
    expect(metaset.mediaStorageSOPClassUID).toStrictEqual(SOPClass.PositronEmissionTomographyImageStorage);
});

test("Test: MetaSet Media Storage SOP Instance UID", () => {
    expect(metaset.mediaStorageSOPInstanceUID).toBe('1.3.6.1.4.1.14519.5.2.1.7009.2403.178093459220118793111194022094');
});

test("Test: MetaSet Transfer Syntax UID", () => {
    expect(metaset.transferSyntaxUID).toStrictEqual(TransferSyntax.ExplicitVRLittleEndian);
});

test("Test: MetaSet Implementation Class UID", () => {
    expect(metaset.implementationClassUID).toBe('1.2.40.0.13.1.3');
});

test("Test: MetaSet Implementation Version Name", () => {
    expect(metaset.implementationVersionName).toBe('whatever');
});

test("Test: MetaSet Source Appllication Entity Title", () => {
    expect(metaset.sourceApplicationEntityTitle).toBe('Source Application Title');
});

test("Test: MetaSet Sending Appllication Entity Title", () => {
    expect(metaset.sendingApplicationEntityTitle).toBe('Sending Application Title');
});

test("Test: MetaSet Receiving Appllication Entity Title", () => {
    expect(metaset.receivingApplicationEntityTitle).toBe('Receiving Application Title');
});

test("Test: MetaSet Private Information Creator UID", () => {
    expect(metaset.privateInformationCreatorUid).toBe('Private Information Creator UID');
});

test("Test: MetaSet Private Information", () => {
    expect(metaset.privateInformation.toString()).toBe('255,100,50,25');
});