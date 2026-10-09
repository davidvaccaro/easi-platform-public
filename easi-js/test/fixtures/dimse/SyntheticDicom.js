import { randomUUID } from "node:crypto";

export const SECONDARY_CAPTURE_SOP_CLASS_UID = "1.2.840.10008.5.1.4.1.1.7";
export const IMPLICIT_VR_LITTLE_ENDIAN = "1.2.840.10008.1.2";
export const EXPLICIT_VR_LITTLE_ENDIAN = "1.2.840.10008.1.2.1";

function concatenate(chunks) {
    return Buffer.concat(chunks.map((chunk) => Buffer.from(chunk)));
}

function uint16(value) {
    var bytes = Buffer.alloc(2);
    bytes.writeUInt16LE(value);
    return bytes;
}

function uint32(value) {
    var bytes = Buffer.alloc(4);
    bytes.writeUInt32LE(value);
    return bytes;
}

function element(group, tag, vr, value, explicit = true) {
    var bytes = Buffer.isBuffer(value) ? value : Buffer.from(String(value), "ascii");
    if (bytes.length % 2 != 0) {
        bytes = concatenate([bytes, Buffer.from([vr == "UI" || vr == "OB" ? 0 : 32])]);
    }
    var header = [uint16(group), uint16(tag)];
    if (explicit == false) {
        header.push(uint32(bytes.length));
    }
    else if (["OB", "OW", "SQ", "UN", "UT"].includes(vr)) {
        header.push(Buffer.from(vr, "ascii"), uint16(0), uint32(bytes.length));
    }
    else {
        header.push(Buffer.from(vr, "ascii"), uint16(bytes.length));
    }
    return concatenate([...header, bytes]);
}

/** Build a test-only one-pixel Secondary Capture object without patient/sample data. */
export function createSyntheticDicom(identifiers, transferSyntaxUid = EXPLICIT_VR_LITTLE_ENDIAN) {
    var explicit = transferSyntaxUid == EXPLICIT_VR_LITTLE_ENDIAN;
    if (explicit == false && transferSyntaxUid != IMPLICIT_VR_LITTLE_ENDIAN) {
        throw new Error("Synthetic DIMSE fixtures support only explicit/implicit VR little endian.");
    }
    var metaBody = concatenate([
        element(0x0002, 0x0001, "OB", Buffer.from([0, 1])),
        element(0x0002, 0x0002, "UI", SECONDARY_CAPTURE_SOP_CLASS_UID),
        element(0x0002, 0x0003, "UI", identifiers.sopInstanceUid),
        element(0x0002, 0x0010, "UI", transferSyntaxUid),
        element(0x0002, 0x0012, "UI", "2.25.123456789012345678901234567890"),
        element(0x0002, 0x0013, "SH", "EASI_TEST_1")
    ]);
    var dataSet = concatenate([
        element(0x0008, 0x0016, "UI", SECONDARY_CAPTURE_SOP_CLASS_UID, explicit),
        element(0x0008, 0x0018, "UI", identifiers.sopInstanceUid, explicit),
        element(0x0008, 0x0020, "DA", "20260101", explicit),
        element(0x0008, 0x0030, "TM", "120000", explicit),
        element(0x0008, 0x0050, "SH", "EASI-SYNTHETIC", explicit),
        element(0x0008, 0x0060, "CS", "OT", explicit),
        element(0x0008, 0x0064, "CS", "WSD", explicit),
        element(0x0008, 0x1030, "LO", "EASI synthetic interoperability test", explicit),
        element(0x0010, 0x0010, "PN", "SYNTHETIC^DIMSE", explicit),
        element(0x0010, 0x0020, "LO", identifiers.patientId, explicit),
        element(0x0020, 0x000D, "UI", identifiers.studyInstanceUid, explicit),
        element(0x0020, 0x000E, "UI", identifiers.seriesInstanceUid, explicit),
        element(0x0020, 0x0010, "SH", "EASI-TEST", explicit),
        element(0x0020, 0x0011, "IS", identifiers.seriesNumber, explicit),
        element(0x0020, 0x0013, "IS", "1", explicit),
        element(0x0028, 0x0002, "US", uint16(1), explicit),
        element(0x0028, 0x0004, "CS", "MONOCHROME2", explicit),
        element(0x0028, 0x0010, "US", uint16(1), explicit),
        element(0x0028, 0x0011, "US", uint16(1), explicit),
        element(0x0028, 0x0100, "US", uint16(8), explicit),
        element(0x0028, 0x0101, "US", uint16(8), explicit),
        element(0x0028, 0x0102, "US", uint16(7), explicit),
        element(0x0028, 0x0103, "US", uint16(0), explicit),
        element(0x7FE0, 0x0010, "OB", Buffer.from([identifiers.seriesNumber, 0]), explicit)
    ]);
    return new Uint8Array(concatenate([
        Buffer.alloc(128), Buffer.from("DICM", "ascii"),
        element(0x0002, 0x0000, "UL", uint32(metaBody.length)), metaBody, dataSet
    ]));
}

/** Give each test run its own study so cleanup can never remove pre-existing data. */
export function createSyntheticStudy() {
    var rootUid = `2.25.${BigInt(`0x${randomUUID().replace(/-/g, "")}`).toString()}`;
    return [1, 2].map((seriesNumber) => ({
        studyInstanceUid: rootUid,
        seriesInstanceUid: `${rootUid}.${seriesNumber}`,
        sopInstanceUid: `${rootUid}.${seriesNumber}.1`,
        seriesNumber,
        patientId: `EASI-TEST-${rootUid.slice(-16)}`
    }));
}
