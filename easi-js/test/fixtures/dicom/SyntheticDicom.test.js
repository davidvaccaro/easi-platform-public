import fs from "node:fs";
import path from "node:path";
import EASI from "../../../src/EASI.js";
import Tag from "../../../src/dicom/Tag.js";
import Image from "../../../src/dicom/entities/Image.js";
import DicomDataParser from "../../../src/parsers/DicomDataParser.js";
import DicomInstanceHandler from "../../../src/handlers/terminals/DicomInstanceHandler.js";
import { Status } from "../../../src/parsers/Status.js";
import JpegDecoder from "../../../src/codecs/decoders/JpegDecoder.js";
import JpegLosslessDecoder from "../../../src/codecs/decoders/JpegLosslessDecoder.js";
import { Decoder as LosslessCoreDecoder } from "../../../src/codecs/decoders/internal/JpegLosslessCore.js";
import Jpeg2000Decoder from "../../../src/codecs/decoders/Jpeg2000Decoder.js";
import RleDecoder from "../../../src/codecs/decoders/RleDecoder.js";
import {
    createDicomFixture, getFixtureBytes, SYNTHETIC_DICOM_PROFILES,
    encodeBaselineJpegFrame, encodeLosslessJpegFrame, encodeJpeg2000Frame
} from "./SyntheticDicom.js";

test("Synthetic fixture encoder remains independent of production readers, writers and codecs", () => {
    const source = fs.readFileSync(path.resolve(process.cwd(), "test/fixtures/dicom/SyntheticDicom.js"), "utf8");
    expect(source).not.toMatch(/\bimport\s|\brequire\(/);
    const first = createDicomFixture();
    const second = createDicomFixture();
    expect(first.bytes).toEqual(second.bytes);
    expect(first.expected.patientName).toBe("SYNTHETIC^EASI^FIXTURE");
    expect(first.expected.metaCount).toBe(7);
    expect(first.expected.dataCount).toBe(39);
    expect(first.expected.pixelBytes.length).toBe(3072);
    first.bytes.fill(0);
    expect(second.bytes).toEqual(getFixtureBytes());
});

test.each(SYNTHETIC_DICOM_PROFILES.filter(profile => profile !== "encapsulated-odd-fragment"))(
    "Independent %s fixture parses across tiny odd byte boundaries", async profile => {
        const { bytes, expected } = createDicomFixture(profile);
        const parser = new DicomDataParser({ includePart10Header: true });
        parser.handler = new DicomInstanceHandler();
        for (let offset = 0; offset < bytes.length; offset += 13) {
            expect(await parser.parse(bytes.subarray(offset, offset + 13))).toBe(Status.CONTINUE);
        }
        expect(await parser.parse(null, true)).toBe(Status.SUCCESS);
        const instance = parser.result;
        expect(instance.metaSet?.attributes.length ?? null).toBe(expected.metaCount);
        expect(instance.dataSet.attributes.map(attribute => attribute.tag.ID)).toEqual(expected.tagIds);
        expect(instance.dataSet.find(Tag.PatientName).value).toBe(expected.patientName);
        expect(instance.dataSet.find(Tag.Rows).value).toBe(expected.rows);
        expect(instance.dataSet.find(Tag.Columns).value).toBe(expected.columns);
        expect(instance.dataSet.find(Tag.PixelData).isComplete).toBe(true);
        expect(instance.dataSet.isComplete).toBe(true);
        if (expected.encodedFrames === null) {
            expect(instance.dataSet.find(Tag.PixelData).access()).toEqual(expected.pixelBytes);
        }
    }
);

test("Nested fixtures exercise defined and undefined item/sequence boundaries", async () => {
    for (const profile of ["nested-sequences", "defined-sequences"]) {
        const instance = await EASI.pipelineBuilder().fromPartStream().ofDicomData().toInstances().build().process({ source: getFixtureBytes(profile) });
        const sourceImages = instance.dataSet.find(Tag.SourceImageSequence);
        expect(sourceImages.items.length).toBe(2);
        const nested = sourceImages.items[0].find(Tag.RequestAttributesSequence);
        expect(nested.items[0].find(Tag.PatientName).value).toBe("SYNTHETIC^NESTED");
        expect(instance.dataSet.find(Tag.PixelData)).toBeDefined();
    }
});

test.each([3, 5])("Independent malformed fixture declares an odd %i-byte fragment", async oddFragmentLength => {
    const { bytes } = createDicomFixture("encapsulated-odd-fragment", { oddFragmentLength });
    const parser = new DicomDataParser({ includePart10Header: true });
    parser.handler = new DicomInstanceHandler();
    expect(await parser.parse(bytes, true)).toBe(Status.FAIL);
    expect(parser.dataElement.tag).toBe(Tag.PixelData);
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    expect(view.getUint32(parser.totalBytesConsumed + 4, true)).toBe(oddFragmentLength);
    expect(parser.error.message).toContain("Expected an item with an explicit, valid length");
});

test.each(["rle", "rle-palette", "rle-rgb", "rle-unsigned-16"])("Independent %s encoded samples decode to the known RGBA pixels", async profile => {
    const { bytes, expected } = createDicomFixture(profile);
    const instance = await EASI.pipelineBuilder().fromPartStream().ofDicomData().toInstances().build().process({ source: bytes });
    const decoder = new RleDecoder(new Image(instance.dataSet));
    const rgba = new Uint8Array(expected.rows * expected.columns * 4);
    const frame = expected.encodedFrames[0];
    const view = new DataView(frame.buffer, frame.byteOffset, frame.byteLength);
    const segmentCount = view.getUint32(0, true);
    for (let index = 0; index < segmentCount; index++) {
        const start = view.getUint32(4 + index * 4, true);
        const stop = index + 1 < segmentCount ? view.getUint32(8 + index * 4, true) : frame.length;
        expect((stop - start) % 2).toBe(0);
    }
    expect(decoder.decode(frame, 0, frame.length, rgba, 0)).toBe(true);
    expect(rgba).toEqual(expected.firstFrameRgba);
});

test("Independent JPEG baseline vector decodes its two known grayscale blocks", () => {
    const frame = encodeBaselineJpegFrame();
    const rgba = new Uint8Array(8 * 16 * 4);
    expect(new JpegDecoder().decode(frame, 0, frame.length, rgba, 0)).toBe(true);
    expect(rgba).toEqual(createDicomFixture("jpeg-baseline").expected.firstFrameRgba);
    expect(Array.from(rgba.slice(0, 4))).toEqual([64, 64, 64, 255]);
    expect(Array.from(rgba.slice(8 * 4, 9 * 4))).toEqual([192, 192, 192, 255]);
});

test("Independent JPEG lossless vector reconstructs its original 12-bit samples", () => {
    const frame = encodeLosslessJpegFrame();
    const decoder = new LosslessCoreDecoder();
    const samples = decoder.decode(frame.buffer, frame.byteOffset, frame.byteLength);
    expect(Array.from(samples)).toEqual([0, 1024, 2048, 4095]);
    expect(decoder.precision).toBe(12);
    const rgba = new Uint8Array(16);
    expect(new JpegLosslessDecoder({ imagePixelModule: { bitsStored: 12, pixelRepresentation: 0, photometricInterpretation: "MONOCHROME2" } }).decode(frame, 0, frame.length, rgba, 0)).toBe(true);
    expect(rgba).toEqual(createDicomFixture("jpeg-lossless").expected.firstFrameRgba);
});

test("Independent JPEG 2000 vector reconstructs its invented samples through OpenJPEG", async () => {
    const factory = require("@voxelmed/openjpegjs/dist/openjpegwasm.js");
    const wasmBinary = fs.readFileSync(require.resolve("@voxelmed/openjpegjs/dist/openjpegwasm.wasm"));
    const module = await factory({ wasmBinary, print() {}, printErr() {} });
    const frame = encodeJpeg2000Frame();
    const core = new module.J2KDecoder();
    try {
        core.getEncodedBuffer(frame.length).set(frame);
        core.decode();
        expect(core.getFrameInfo()).toEqual({ width: 2, height: 2, bitsPerSample: 8, componentCount: 1, isSigned: false });
        expect(Array.from(core.getDecodedBuffer())).toEqual([0, 64, 128, 255]);
    }
    finally { core.delete(); }
    const decoder = new Jpeg2000Decoder();
    decoder.openjpegModule = module;
    const rgba = new Uint8Array(16);
    expect(decoder.decode(frame, 0, frame.length, rgba, 0)).toBe(true);
    expect(rgba).toEqual(createDicomFixture("jpeg2000").expected.firstFrameRgba);
});
