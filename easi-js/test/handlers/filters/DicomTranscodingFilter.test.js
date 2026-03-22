import DicomTranscodingFilter from "../../../src/handlers/filters/DicomTranscodingFilter.js";
import Tag from "../../../src/dicom/Tag.js";
import TransferSyntax from "../../../src/dicom/TransferSyntax.js";
import { Status } from "../../../src/parsers/Status.js";
import CodecRegistry from "../../../src/codecs/CodecRegistry.js";

function makeAttribute(tag, value = null, transferSyntax = TransferSyntax.ExplicitVRLittleEndian) {
    return {
        tag,
        value,
        transferSyntax
    };
}

test("Test: DicomTranscodingFilter supports target transfer syntax shorthand string", () => {
    const filter = new DicomTranscodingFilter(null, TransferSyntax.ImplicitVRLittleEndian.ID);
    expect(filter.targetTransferSyntax.ID).toBe(TransferSyntax.ImplicitVRLittleEndian.ID);
});

test("Test: DicomTranscodingFilter supports explicit-vr-big-endian to JPEG 2000 syntax pair", () => {
    const filter = new DicomTranscodingFilter(null, {
        targetTransferSyntax: TransferSyntax.JPEG2000Lossless.ID
    });

    const supported = filter.isSupportedSyntaxPair(
        TransferSyntax.ExplicitVRBigEndian,
        TransferSyntax.JPEG2000Lossless
    );

    expect(supported).toBe(true);
});

test("Test: DicomTranscodingFilter supports explicit-vr-big-endian to explicit-vr-little-endian syntax pair", () => {
    const filter = new DicomTranscodingFilter(null, {
        targetTransferSyntax: TransferSyntax.ExplicitVRLittleEndian.ID
    });

    const supported = filter.isSupportedSyntaxPair(
        TransferSyntax.ExplicitVRBigEndian,
        TransferSyntax.ExplicitVRLittleEndian
    );

    expect(supported).toBe(true);
});

test("Test: DicomTranscodingFilter supports deflated-explicit-vr-little-endian source to explicit-vr-little-endian target", () => {
    const filter = new DicomTranscodingFilter(null, {
        targetTransferSyntax: TransferSyntax.ExplicitVRLittleEndian.ID
    });

    const supported = filter.isSupportedSyntaxPair(
        TransferSyntax.DeflatedExplicitVRLittleEndian,
        TransferSyntax.ExplicitVRLittleEndian
    );

    expect(supported).toBe(true);
    expect(
        filter.requiresPixelPayloadTranscode(
            TransferSyntax.DeflatedExplicitVRLittleEndian,
            TransferSyntax.ExplicitVRLittleEndian
        )
    ).toBe(false);
});

test("Test: DicomTranscodingFilter rejects deflated-explicit-vr-little-endian target", () => {
    const filter = new DicomTranscodingFilter(null, {
        targetTransferSyntax: TransferSyntax.DeflatedExplicitVRLittleEndian.ID
    });

    const supported = filter.isSupportedSyntaxPair(
        TransferSyntax.ExplicitVRLittleEndian,
        TransferSyntax.DeflatedExplicitVRLittleEndian
    );

    expect(supported).toBe(false);
});

test("Test: DicomTranscodingFilter supports JPEG lossless source to JPEG 2000 target when decoder is registered", () => {
    const filter = new DicomTranscodingFilter(null, {
        targetTransferSyntax: TransferSyntax.JPEG2000.ID
    });

    const supported = filter.isSupportedSyntaxPair(
        TransferSyntax.JPEGLosslessSV1,
        TransferSyntax.JPEG2000
    );

    expect(supported).toBe(true);
});

test("Test: DicomTranscodingFilter supports JPEG-LS source to JPEG 2000 target when decoder is registered", () => {
    const filter = new DicomTranscodingFilter(null, {
        targetTransferSyntax: TransferSyntax.JPEG2000.ID
    });

    const supported = filter.isSupportedSyntaxPair(
        TransferSyntax.JPEGLSLossless,
        TransferSyntax.JPEG2000
    );

    expect(supported).toBe(true);
});

test("Test: DicomTranscodingFilter supports RLE lossless source to JPEG 2000 lossless target when decoder is registered", () => {
    const filter = new DicomTranscodingFilter(null, {
        targetTransferSyntax: TransferSyntax.JPEG2000Lossless.ID
    });

    const supported = filter.isSupportedSyntaxPair(
        TransferSyntax.RLELossless,
        TransferSyntax.JPEG2000Lossless
    );

    expect(supported).toBe(true);
});

test("Test: DicomTranscodingFilter supports explicit-vr-little-endian source to RLE lossless target when encoder is registered", () => {
    const filter = new DicomTranscodingFilter(null, {
        targetTransferSyntax: TransferSyntax.RLELossless.ID
    });

    const supported = filter.isSupportedSyntaxPair(
        TransferSyntax.ExplicitVRLittleEndian,
        TransferSyntax.RLELossless
    );

    expect(supported).toBe(true);
});

test("Test: DicomTranscodingFilter rejects RLE lossless target when RLE encoder is not registered", () => {
    const codecRegistry = new CodecRegistry();
    codecRegistry.setDecoderForTransferSyntax(TransferSyntax.NONE, function() {});
    codecRegistry.setDecoderForTransferSyntax(TransferSyntax.RLELossless, function() {});

    const filter = new DicomTranscodingFilter(null, {
        targetTransferSyntax: TransferSyntax.RLELossless.ID,
        codecRegistry
    });

    const supported = filter.isSupportedSyntaxPair(
        TransferSyntax.ExplicitVRLittleEndian,
        TransferSyntax.RLELossless
    );

    expect(supported).toBe(false);
});

test("Test: DicomTranscodingFilter supports explicit-vr-little-endian source to HTJ2K target", () => {
    const filter = new DicomTranscodingFilter(null, {
        targetTransferSyntax: TransferSyntax.HTJ2K.ID
    });

    const supported = filter.isSupportedSyntaxPair(
        TransferSyntax.ExplicitVRLittleEndian,
        TransferSyntax.HTJ2K
    );

    expect(supported).toBe(true);
});

test("Test: DicomTranscodingFilter supports HTJ2K source to JPEG 2000 lossless target", () => {
    const filter = new DicomTranscodingFilter(null, {
        targetTransferSyntax: TransferSyntax.JPEG2000Lossless.ID
    });

    const supported = filter.isSupportedSyntaxPair(
        TransferSyntax.HTJ2K,
        TransferSyntax.JPEG2000Lossless
    );

    expect(supported).toBe(true);
});

test("Test: DicomTranscodingFilter supports explicit-vr-little-endian source to JPEG Baseline target", () => {
    const filter = new DicomTranscodingFilter(null, {
        targetTransferSyntax: TransferSyntax.JPEGBaseline8Bit.ID
    });

    const supported = filter.isSupportedSyntaxPair(
        TransferSyntax.ExplicitVRLittleEndian,
        TransferSyntax.JPEGBaseline8Bit
    );

    expect(supported).toBe(true);
});

test("Test: DicomTranscodingFilter rejects JPEG Baseline target when JPEG encoder is not registered", () => {
    const codecRegistry = new CodecRegistry();

    const filter = new DicomTranscodingFilter(null, {
        targetTransferSyntax: TransferSyntax.JPEGBaseline8Bit.ID,
        codecRegistry
    });

    const supported = filter.isSupportedSyntaxPair(
        TransferSyntax.ExplicitVRLittleEndian,
        TransferSyntax.JPEGBaseline8Bit
    );

    expect(supported).toBe(false);
});

test("Test: DicomTranscodingFilter rejects compressed source when decoder is not registered", () => {
    const codecRegistry = new CodecRegistry();
    codecRegistry.setEncoder("jpeg2000", {});

    const filter = new DicomTranscodingFilter(null, {
        targetTransferSyntax: TransferSyntax.JPEG2000.ID,
        codecRegistry
    });

    const supported = filter.isSupportedSyntaxPair(
        TransferSyntax.JPEGLosslessSV1,
        TransferSyntax.JPEG2000
    );

    expect(supported).toBe(false);
});

test("Test: DicomTranscodingFilter unsupported syntax pair fails in fallback fail mode", async () => {
    const concerns = [];
    const filter = new DicomTranscodingFilter(null, {
        targetTransferSyntax: TransferSyntax.ExplicitVRBigEndian.ID,
        fallback: "fail",
        onConcern: concern => concerns.push(concern)
    });

    const context = await filter.onStartInstance(null);
    await filter.onStartMetaSet(context);
    await filter.onEndAttribute(
        context,
        makeAttribute(Tag.TransferSyntaxUID, TransferSyntax.ExplicitVRLittleEndian.ID, TransferSyntax.ExplicitVRLittleEndian)
    );

    const status = await filter.onStartDataSet(context);

    expect(status).toBe(Status.FAIL);
    expect(concerns.length).toBe(1);
    expect(concerns[0].code).toBe("UnsupportedTransferSyntaxPair");
    expect(concerns[0].actionTaken).toBe("failed");
});

test("Test: DicomTranscodingFilter unsupported syntax pair can passthrough", async () => {
    const concerns = [];
    const transferSyntaxAttribute = makeAttribute(
        Tag.TransferSyntaxUID,
        TransferSyntax.ExplicitVRLittleEndian.ID,
        TransferSyntax.ExplicitVRLittleEndian
    );

    const filter = new DicomTranscodingFilter(null, {
        targetTransferSyntax: TransferSyntax.ExplicitVRBigEndian.ID,
        fallback: "passthrough",
        onConcern: concern => concerns.push(concern)
    });

    const context = await filter.onStartInstance(null);
    await filter.onStartMetaSet(context);

    const metaStatus = await filter.onEndAttribute(context, transferSyntaxAttribute);
    const dataSetStatus = await filter.onStartDataSet(context);

    expect(metaStatus === null || metaStatus === Status.CONTINUE).toBe(true);
    expect(dataSetStatus === null || dataSetStatus === Status.CONTINUE).toBe(true);
    expect(transferSyntaxAttribute.value).toBe(TransferSyntax.ExplicitVRLittleEndian.ID);
    expect(concerns.length).toBe(1);
    expect(concerns[0].actionTaken).toBe("passthrough");
});

test("Test: DicomTranscodingFilter transcodes explicit-vr-little-endian to implicit-vr-little-endian by syntax rewrite", async () => {
    const forwardedTransferSyntaxValues = [];
    const nextHandler = {
        onEndAttribute: (context, attribute) => {
            if (attribute?.tag?.ID == Tag.TransferSyntaxUID.ID) {
                forwardedTransferSyntaxValues.push(attribute.value);
            }
            return null;
        }
    };

    const transferSyntaxAttribute = makeAttribute(
        Tag.TransferSyntaxUID,
        TransferSyntax.ExplicitVRLittleEndian.ID,
        TransferSyntax.ExplicitVRLittleEndian
    );
    const patientNameAttribute = makeAttribute(
        Tag.PatientName,
        "DOE^JOHN",
        TransferSyntax.ExplicitVRLittleEndian
    );

    const filter = new DicomTranscodingFilter(nextHandler, {
        targetTransferSyntax: TransferSyntax.ImplicitVRLittleEndian.ID
    });

    const context = await filter.onStartInstance(null);
    await filter.onStartMetaSet(context);
    await filter.onEndAttribute(context, transferSyntaxAttribute);
    await filter.onEndMetaSet(context);
    await filter.onStartDataSet(context);
    await filter.onStartAttribute(context, patientNameAttribute);

    expect(transferSyntaxAttribute.value).toBe(TransferSyntax.ExplicitVRLittleEndian.ID);
    expect(patientNameAttribute.transferSyntax.ID).toBe(TransferSyntax.ImplicitVRLittleEndian.ID);
    expect(forwardedTransferSyntaxValues.length).toBe(1);

    const forwardedValue = forwardedTransferSyntaxValues[0];
    const forwardedText = ((forwardedValue instanceof Uint8Array)
        ? (new TextDecoder()).decode(forwardedValue)
        : String(forwardedValue))
        .replace(/\0/g, '')
        .trim();
    expect(forwardedText).toBe(TransferSyntax.ImplicitVRLittleEndian.ID);
});

test("Test: DicomTranscodingFilter supports implicit-vr-little-endian to explicit-vr-little-endian by syntax rewrite", () => {
    const filter = new DicomTranscodingFilter(null, {
        targetTransferSyntax: TransferSyntax.ExplicitVRLittleEndian.ID
    });

    const supported = filter.isSupportedSyntaxPair(
        TransferSyntax.ImplicitVRLittleEndian,
        TransferSyntax.ExplicitVRLittleEndian
    );

    expect(supported).toBe(true);
});

test("Test: DicomTranscodingFilter emits onFrame for streamed PixelData when frame boundaries are derivable", async () => {
    const frames = [];
    const filter = new DicomTranscodingFilter(null, {
        targetTransferSyntax: TransferSyntax.ImplicitVRLittleEndian.ID,
        onFrame: frame => frames.push(frame)
    });

    const context = await filter.onStartInstance(null);
    await filter.onStartMetaSet(context);
    await filter.onEndAttribute(
        context,
        makeAttribute(Tag.TransferSyntaxUID, TransferSyntax.ExplicitVRLittleEndian.ID, TransferSyntax.ExplicitVRLittleEndian)
    );
    await filter.onStartDataSet(context);

    await filter.onEndAttribute(context, makeAttribute(Tag.Rows, 2));
    await filter.onEndAttribute(context, makeAttribute(Tag.Columns, 2));
    await filter.onEndAttribute(context, makeAttribute(Tag.SamplesPerPixel, 1));
    await filter.onEndAttribute(context, makeAttribute(Tag.BitsAllocated, 8));
    await filter.onEndAttribute(context, makeAttribute(Tag.NumberOfFrames, 2));

    const pixelDataAttribute = makeAttribute(Tag.PixelData, null, TransferSyntax.ExplicitVRLittleEndian);
    await filter.onStartAttribute(context, pixelDataAttribute);

    const status = await filter.onAttributeChunk(context, {
        attribute: pixelDataAttribute,
        chunk: new Uint8Array(8),
        isFinalChunk: true
    });

    expect(status === null || status === Status.CONTINUE).toBe(true);
    expect(frames.length).toBe(2);
    expect(frames[0].frameIndex).toBe(0);
    expect(frames[1].frameIndex).toBe(1);
    expect(frames[0].sourceTransferSyntax).toBe(TransferSyntax.ExplicitVRLittleEndian.ID);
    expect(frames[0].targetTransferSyntax).toBe(TransferSyntax.ImplicitVRLittleEndian.ID);
});

test("Test: DicomTranscodingFilter reassembles single-frame encapsulated payload from multiple fragments", () => {
    const filter = new DicomTranscodingFilter(null, {
        targetTransferSyntax: TransferSyntax.JPEG2000Lossless.ID
    });

    const bot = new Uint8Array(0);
    const fragmentA = new Uint8Array([1, 2, 3, 4]);
    const fragmentB = new Uint8Array([5, 6, 7, 8]);

    const payload = filter.joinChunks([
        filter.encodeItem(bot),
        filter.encodeItem(fragmentA),
        filter.encodeItem(fragmentB)
    ]);

    const frames = filter.extractEncapsulatedFrames(payload, 1);

    expect(frames.length).toBe(1);
    expect(Array.from(frames[0])).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
});

test("Test: DicomTranscodingFilter uses BOT offsets to split multi-frame encapsulated payload", () => {
    const filter = new DicomTranscodingFilter(null, {
        targetTransferSyntax: TransferSyntax.JPEG2000Lossless.ID
    });

    const fragmentA = new Uint8Array([10, 11]);
    const fragmentB = new Uint8Array([20, 21]);

    const bot = new Uint8Array(8);
    const botView = new DataView(bot.buffer);
    botView.setUint32(0, 0, true);
    botView.setUint32(4, (8 + fragmentA.length), true);

    const payload = filter.joinChunks([
        filter.encodeItem(bot),
        filter.encodeItem(fragmentA),
        filter.encodeItem(fragmentB)
    ]);

    const frames = filter.extractEncapsulatedFrames(payload, 2);

    expect(frames.length).toBe(2);
    expect(Array.from(frames[0])).toEqual([10, 11]);
    expect(Array.from(frames[1])).toEqual([20, 21]);
});

test("Test: DicomTranscodingFilter rescales window metadata when pixel data is transcoded to 8-bit output", async () => {
    const forwarded = {};
    const nextHandler = {
        onEndAttribute: (context, attribute) => {
            var tagID = attribute?.tag?.ID;
            if (tagID == Tag.WindowCenter?.ID)
                forwarded.windowCenter = attribute.value;
            else if (tagID == Tag.WindowWidth?.ID)
                forwarded.windowWidth = attribute.value;
            else if (tagID == Tag.BitsStored?.ID)
                forwarded.bitsStored = attribute.value;
            return null;
        }
    };

    const filter = new DicomTranscodingFilter(nextHandler, {
        targetTransferSyntax: TransferSyntax.JPEG2000.ID
    });

    const context = await filter.onStartInstance(null);
    await filter.onStartMetaSet(context);
    await filter.onEndAttribute(
        context,
        makeAttribute(Tag.TransferSyntaxUID, TransferSyntax.JPEGLosslessSV1.ID, TransferSyntax.ExplicitVRLittleEndian)
    );
    await filter.onEndMetaSet(context);
    await filter.onStartDataSet(context);

    await filter.onEndAttribute(context, makeAttribute(Tag.BitsAllocated, 12));
    await filter.onEndAttribute(context, makeAttribute(Tag.BitsStored, 12));
    await filter.onEndAttribute(context, makeAttribute(Tag.WindowCenter, "1000"));
    await filter.onEndAttribute(context, makeAttribute(Tag.WindowWidth, "2000"));

    // 12-bit source => scale by 255/4095.
    expect(forwarded.bitsStored).toBe(8);
    expect(Number(forwarded.windowCenter)).toBeCloseTo(62.271, 3);
    expect(Number(forwarded.windowWidth)).toBeCloseTo(124.542, 3);
});

test("Test: DicomTranscodingFilter endian-swap path preserves 16-bit metadata and swaps pixel bytes", async () => {
    const forwarded = {
        bitsAllocated: null,
        bitsStored: null,
        photometricInterpretation: null,
        pixelDataTransferSyntax: null,
        pixelDataBytes: null
    };

    const nextHandler = {
        onEndAttribute: (context, attribute) => {
            var tagID = attribute?.tag?.ID;

            if (tagID == Tag.BitsAllocated?.ID)
                forwarded.bitsAllocated = attribute.value;
            else if (tagID == Tag.BitsStored?.ID)
                forwarded.bitsStored = attribute.value;
            else if (tagID == Tag.PhotometricInterpretation?.ID)
                forwarded.photometricInterpretation = attribute.value;
            else if (tagID == Tag.PixelData?.ID) {
                forwarded.pixelDataTransferSyntax = attribute?.transferSyntax?.ID ?? null;
                forwarded.pixelDataBytes = (typeof attribute?.access == "function")
                    ? attribute.access()
                    : (attribute?.value ?? null);
            }

            return null;
        }
    };

    const filter = new DicomTranscodingFilter(nextHandler, {
        targetTransferSyntax: TransferSyntax.ExplicitVRLittleEndian.ID
    });

    const sourceTransferSyntax = TransferSyntax.ExplicitVRBigEndian;
    const context = await filter.onStartInstance(null);

    await filter.onStartMetaSet(context);
    await filter.onEndAttribute(
        context,
        makeAttribute(
            Tag.TransferSyntaxUID,
            sourceTransferSyntax.ID,
            TransferSyntax.ExplicitVRLittleEndian
        )
    );
    await filter.onEndMetaSet(context);
    await filter.onStartDataSet(context);

    await filter.onEndAttribute(context, makeAttribute(Tag.Rows, 1, sourceTransferSyntax));
    await filter.onEndAttribute(context, makeAttribute(Tag.Columns, 2, sourceTransferSyntax));
    await filter.onEndAttribute(context, makeAttribute(Tag.SamplesPerPixel, 1, sourceTransferSyntax));
    await filter.onEndAttribute(context, makeAttribute(Tag.PhotometricInterpretation, "MONOCHROME2", sourceTransferSyntax));
    await filter.onEndAttribute(context, makeAttribute(Tag.BitsAllocated, 16, sourceTransferSyntax));
    await filter.onEndAttribute(context, makeAttribute(Tag.BitsStored, 16, sourceTransferSyntax));
    await filter.onEndAttribute(context, makeAttribute(Tag.PixelRepresentation, 0, sourceTransferSyntax));

    const pixelDataAttribute = makeAttribute(Tag.PixelData, null, sourceTransferSyntax);
    await filter.onStartAttribute(context, pixelDataAttribute);
    await filter.onAttributeChunk(context, {
        attribute: pixelDataAttribute,
        chunk: new Uint8Array([0x01, 0x02, 0x0A, 0x0B]),
        isFinalChunk: true
    });
    await filter.onEndAttribute(context, pixelDataAttribute);

    expect(forwarded.bitsAllocated).toBe(16);
    expect(forwarded.bitsStored).toBe(16);
    expect(forwarded.photometricInterpretation).toBe("MONOCHROME2");
    expect(forwarded.pixelDataTransferSyntax).toBe(TransferSyntax.ExplicitVRLittleEndian.ID);
    expect(Array.from(forwarded.pixelDataBytes ?? [])).toEqual([0x02, 0x01, 0x0B, 0x0A]);
});
