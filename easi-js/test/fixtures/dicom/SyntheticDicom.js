/**
 * Independent, invented DICOM test inputs. This encoder deliberately imports no
 * EASI parser, writer, model, or codec so paired implementation bugs cannot make
 * reader/writer regressions pass. No clinical file or pixel was used as input.
 */
export const SYNTHETIC_IDENTIFIERS = Object.freeze({
    studyInstanceUid: "2.25.101",
    seriesInstanceUid: "2.25.102",
    sopInstanceUid: "2.25.103",
    sopClassUid: "1.2.840.10008.5.1.4.1.1.7",
    patientName: "SYNTHETIC^EASI^FIXTURE",
    patientId: "EASI-SYNTHETIC-001",
    studyDate: "20260102",
    studyTime: "123456",
    referringPhysicianName: "SYNTHETIC^REFERRER",
    performingPhysicianName: "SYNTHETIC^PERFORMER"
});

export const SYNTHETIC_TRANSFER_SYNTAXES = Object.freeze({
    implicitLE: "1.2.840.10008.1.2",
    explicitLE: "1.2.840.10008.1.2.1",
    explicitBE: "1.2.840.10008.1.2.2",
    rle: "1.2.840.10008.1.2.5",
    jpegBaseline: "1.2.840.10008.1.2.4.50",
    jpegLossless: "1.2.840.10008.1.2.4.70",
    jpeg2000: "1.2.840.10008.1.2.4.90"
});

const LONG_VRS = new Set(["OB", "OD", "OF", "OL", "OV", "OW", "SQ", "SV", "UC", "UN", "UR", "UT", "UV"]);
const TEXT = new TextEncoder();

export function concatenateBytes(chunks) {
    const bytes = new Uint8Array(chunks.reduce((length, chunk) => length + chunk.length, 0));
    let offset = 0;
    for (const chunk of chunks) {
        bytes.set(chunk, offset);
        offset += chunk.length;
    }
    return bytes;
}

function numberBytes(value, size, littleEndian = true, signed = false) {
    const bytes = new Uint8Array(size);
    const view = new DataView(bytes.buffer);
    if (size === 2) {
        if (signed) view.setInt16(0, value, littleEndian);
        else view.setUint16(0, value, littleEndian);
    }
    else view.setUint32(0, value, littleEndian);
    return bytes;
}

function valueBytes(vr, value, littleEndian) {
    if (value instanceof Uint8Array) return value;
    if (vr === "US" || vr === "SS" || vr === "UL") {
        return concatenateBytes((Array.isArray(value) ? value : [value]).map(number =>
            numberBytes(number, vr === "UL" ? 4 : 2, littleEndian, vr === "SS")));
    }
    return TEXT.encode(Array.isArray(value) ? value.join("\\") : String(value));
}

/** Plain tag/VR/value encoding, also useful for focused malformed-input tests. */
export function encodeElement(tag, vr, value, { explicit = true, littleEndian = true, undefinedLength = false, pad = true } = {}) {
    let bytes = valueBytes(vr, value, littleEndian);
    if (pad && !undefinedLength && (bytes.length % 2 !== 0)) {
        bytes = concatenateBytes([bytes, new Uint8Array([vr === "UI" || LONG_VRS.has(vr) ? 0 : 32])]);
    }
    const group = Number.parseInt(tag.slice(0, 4), 16);
    const element = Number.parseInt(tag.slice(4), 16);
    const header = [numberBytes(group, 2, littleEndian), numberBytes(element, 2, littleEndian)];
    const length = undefinedLength ? 0xFFFFFFFF : bytes.length;
    if (!explicit) header.push(numberBytes(length, 4, littleEndian));
    else if (LONG_VRS.has(vr)) header.push(TEXT.encode(vr), new Uint8Array(2), numberBytes(length, 4, littleEndian));
    else header.push(TEXT.encode(vr), numberBytes(length, 2, littleEndian));
    return concatenateBytes([...header, bytes]);
}

function structuralItem(element, length, littleEndian = true) {
    return concatenateBytes([numberBytes(0xFFFE, 2, littleEndian), numberBytes(element, 2, littleEndian), numberBytes(length, 4, littleEndian)]);
}

function sequence(tag, items, syntax, undefinedLength) {
    const encodedItems = items.map(attributes => {
        const itemBytes = concatenateBytes(attributes);
        return concatenateBytes([
            structuralItem(0xE000, undefinedLength ? 0xFFFFFFFF : itemBytes.length, syntax.littleEndian), itemBytes,
            ...(undefinedLength ? [structuralItem(0xE00D, 0, syntax.littleEndian)] : [])
        ]);
    });
    if (undefinedLength) encodedItems.push(structuralItem(0xE0DD, 0, syntax.littleEndian));
    return encodeElement(tag, "SQ", concatenateBytes(encodedItems), { ...syntax, undefinedLength });
}

/** Literal PackBits segments implement the DICOM RLE format independently. */
export function encodeRleFrame(pixels, { samplesPerPixel = 1, bitsAllocated = 8, planarConfiguration = 0 } = {}) {
    const bytesPerSample = bitsAllocated / 8;
    const pixelCount = pixels.length / samplesPerPixel;
    const segments = [];
    for (let component = 0; component < samplesPerPixel; component++) {
        for (let bytePlane = bytesPerSample - 1; bytePlane >= 0; bytePlane--) {
            const values = new Uint8Array(pixelCount);
            for (let index = 0; index < pixelCount; index++) {
                const sample = pixels[planarConfiguration === 1 ? component * pixelCount + index : index * samplesPerPixel + component];
                values[index] = (sample >>> (8 * bytePlane)) & 0xFF;
            }
            const parts = [];
            for (let offset = 0; offset < values.length; offset += 128) {
                const chunk = values.subarray(offset, offset + 128);
                parts.push(new Uint8Array([chunk.length - 1]), chunk);
            }
            let segment = concatenateBytes(parts);
            // DICOM RLE segments are even-sized; -128 is a PackBits no-op.
            if (segment.length % 2 !== 0) segment = concatenateBytes([segment, new Uint8Array([0x80])]);
            segments.push(segment);
        }
    }
    const header = new Uint8Array(64);
    const view = new DataView(header.buffer);
    view.setUint32(0, segments.length, true);
    let offset = 64;
    segments.forEach((segment, index) => {
        view.setUint32(4 + index * 4, offset, true);
        offset += segment.length;
    });
    return concatenateBytes([header, ...segments]);
}

function jpegMarker(marker, payload = null) {
    return payload === null ? new Uint8Array([0xFF, marker]) : concatenateBytes([
        new Uint8Array([0xFF, marker]), numberBytes(payload.length + 2, 2, false), payload
    ]);
}

function entropyBytes(bits) {
    const padding = (8 - bits.length % 8) % 8;
    const padded = bits + "1".repeat(padding);
    const bytes = [];
    for (let offset = 0; offset < padded.length; offset += 8) {
        const byte = Number.parseInt(padded.slice(offset, offset + 8), 2);
        bytes.push(byte);
        if (byte === 255) bytes.push(0); // JPEG entropy byte stuffing.
    }
    return new Uint8Array(bytes);
}

function huffmanTable(tableClass, symbols) {
    const counts = new Uint8Array(16);
    counts[0] = 1;
    if (symbols.length > 1) counts[1] = 1;
    return concatenateBytes([new Uint8Array([tableClass << 4]), counts, new Uint8Array(symbols)]);
}

/** T.81 baseline: two 8x8 blocks, DC-only, known values 64 and 192. */
export function encodeBaselineJpegFrame() {
    const dcBits = "0" + (511).toString(2).padStart(10, "0") + "0" +
        "10" + (1024).toString(2).padStart(11, "0") + "0";
    return concatenateBytes([
        jpegMarker(0xD8),
        jpegMarker(0xDB, concatenateBytes([new Uint8Array([0]), new Uint8Array(64).fill(1)])),
        jpegMarker(0xC0, new Uint8Array([8, 0, 8, 0, 16, 1, 1, 0x11, 0])),
        jpegMarker(0xC4, concatenateBytes([huffmanTable(0, [10, 11]), huffmanTable(1, [0])])),
        jpegMarker(0xDA, new Uint8Array([1, 1, 0, 0, 63, 0])),
        entropyBytes(dcBits), jpegMarker(0xD9)
    ]);
}

/** T.81 process14, predictor1: a 2x2 unsigned12-bit ramp [0,1024,2048,4095]. */
export function encodeLosslessJpegFrame() {
    const differences = [-2048, 1024, 2048, 2047];
    let bits = "";
    for (const difference of differences) {
        const category = Math.floor(Math.log2(Math.abs(difference))) + 1;
        const amplitude = difference < 0 ? difference + (2 ** category - 1) : difference;
        bits += (category === 11 ? "0" : "10") + amplitude.toString(2).padStart(category, "0");
    }
    return concatenateBytes([
        jpegMarker(0xD8),
        jpegMarker(0xC3, new Uint8Array([12, 0, 2, 0, 2, 1, 1, 0x11, 0])),
        jpegMarker(0xC4, huffmanTable(0, [11, 12])),
        jpegMarker(0xDA, new Uint8Array([1, 1, 0, 1, 0, 0])),
        entropyBytes(bits), jpegMarker(0xD9)
    ]);
}

/**
 * Lossless 2x2 JPEG 2000 codestream for [0,64,128,255], independently encoded
 * from an invented grayscale TIFF by macOS ImageIO (public.jpeg-2000, best).
 * COD selects the reversible 5/3 transform. OpenJPEG independently decodes the
 * exact four samples. This pinned 137-byte vector needs no encoder at test time.
 */
export function encodeJpeg2000Frame() {
    const hex = "ff4fff510029000000000002000000020000000000000000000000020000000200000000000000000001070101ff52000c00000001000504040001ff5c00132048505058505058505058505050484850ff64001100014b616b6164752d76352e322e31ff90000a0000000000240001ff93c3e7020780808080cfb40afc00a1f50080020802d400ffd9";
    return new Uint8Array(hex.match(/../g).map(byte => Number.parseInt(byte, 16)));
}

const PROFILES = Object.freeze({
    default: {},
    "explicit-le": { rows: 2, columns: 2, frames: 1 },
    "implicit-le": { rows: 2, columns: 2, frames: 1, transferSyntaxUid: SYNTHETIC_TRANSFER_SYNTAXES.implicitLE },
    "explicit-be": { rows: 2, columns: 2, frames: 1, transferSyntaxUid: SYNTHETIC_TRANSFER_SYNTAXES.explicitBE, bitsAllocated: 16, bitsStored: 12 },
    "signed-16": { rows: 2, columns: 2, frames: 1, bitsAllocated: 16, bitsStored: 12, pixelRepresentation: 1, modality: "CT", pixels: [-2048, -1, 0, 2047], windowCenter: 0, windowWidth: 4096 },
    "unsigned-16": { rows: 2, columns: 2, frames: 1, bitsAllocated: 16, bitsStored: 12, modality: "MR", pixels: [0, 1024, 2048, 4095], windowCenter: 2048, windowWidth: 4096 },
    "monochrome1": { rows: 2, columns: 2, frames: 1, photometricInterpretation: "MONOCHROME1" },
    "rgb": { rows: 2, columns: 2, frames: 1, samplesPerPixel: 3, photometricInterpretation: "RGB", pixels: [0, 0, 0, 255, 0, 0, 0, 255, 0, 0, 0, 255] },
    "rgb-planar": { rows: 2, columns: 2, frames: 1, samplesPerPixel: 3, planarConfiguration: 1, photometricInterpretation: "RGB", pixels: [0, 255, 0, 0, 0, 0, 255, 0, 0, 0, 0, 255] },
    "rgb-big-endian": { rows: 2, columns: 2, frames: 1, samplesPerPixel: 3, photometricInterpretation: "RGB", transferSyntaxUid: SYNTHETIC_TRANSFER_SYNTAXES.explicitBE },
    "palette": { rows: 2, columns: 2, frames: 1, photometricInterpretation: "PALETTE COLOR", pixels: [0, 1, 2, 3] },
    "multiframe": { rows: 2, columns: 2, frames: 3 },
    "multiframe-implicit": { rows: 2, columns: 2, frames: 3, transferSyntaxUid: SYNTHETIC_TRANSFER_SYNTAXES.implicitLE },
    "raw-implicit": { rows: 2, columns: 2, frames: 1, transferSyntaxUid: SYNTHETIC_TRANSFER_SYNTAXES.implicitLE, includePart10Header: false },
    "raw-implicit-monochrome1": { rows: 2, columns: 2, frames: 1, bitsAllocated: 16, bitsStored: 10, photometricInterpretation: "MONOCHROME1", transferSyntaxUid: SYNTHETIC_TRANSFER_SYNTAXES.implicitLE, includePart10Header: false, pixels: [0, 256, 512, 1023] },
    "nested-sequences": { rows: 2, columns: 2, frames: 1, nestedSequences: true },
    "defined-sequences": { rows: 2, columns: 2, frames: 1, nestedSequences: true, undefinedSequenceLengths: false },
    "rle": { rows: 2, columns: 2, frames: 1, transferSyntaxUid: SYNTHETIC_TRANSFER_SYNTAXES.rle, pixels: [0, 64, 128, 255] },
    "rle-palette": { rows: 32, columns: 32, frames: 3, photometricInterpretation: "PALETTE COLOR", transferSyntaxUid: SYNTHETIC_TRANSFER_SYNTAXES.rle },
    "rle-rgb": { rows: 2, columns: 2, frames: 1, samplesPerPixel: 3, planarConfiguration: 1, photometricInterpretation: "RGB", transferSyntaxUid: SYNTHETIC_TRANSFER_SYNTAXES.rle },
    "rle-unsigned-16": { rows: 2, columns: 2, frames: 1, bitsAllocated: 16, bitsStored: 12, transferSyntaxUid: SYNTHETIC_TRANSFER_SYNTAXES.rle, pixels: [0, 1024, 2048, 4095] },
    "jpeg-baseline": { rows: 8, columns: 16, frames: 1, transferSyntaxUid: SYNTHETIC_TRANSFER_SYNTAXES.jpegBaseline },
    "jpeg-lossless": { rows: 2, columns: 2, frames: 1, bitsAllocated: 16, bitsStored: 12, modality: "CT", transferSyntaxUid: SYNTHETIC_TRANSFER_SYNTAXES.jpegLossless, pixels: [0, 1024, 2048, 4095] },
    "jpeg2000": { rows: 2, columns: 2, frames: 1, transferSyntaxUid: SYNTHETIC_TRANSFER_SYNTAXES.jpeg2000, pixels: [0, 64, 128, 255] },
    "encapsulated": { rows: 8, columns: 16, frames: 2, transferSyntaxUid: SYNTHETIC_TRANSFER_SYNTAXES.jpegBaseline },
    "encapsulated-odd-fragment": { rows: 8, columns: 16, frames: 1, transferSyntaxUid: SYNTHETIC_TRANSFER_SYNTAXES.jpegBaseline, oddFragmentLength: 3 }
});

export const SYNTHETIC_DICOM_PROFILES = Object.freeze(Object.keys(PROFILES));

function buildPixelValues(settings) {
    const count = settings.rows * settings.columns * settings.frames * settings.samplesPerPixel;
    if (settings.pixels != null) {
        if (settings.pixels.length !== count) throw new Error(`Expected ${count} synthetic pixel samples; received ${settings.pixels.length}.`);
        return settings.bitsAllocated === 8 ? new Uint8Array(settings.pixels) :
            settings.pixelRepresentation === 1 ? new Int16Array(settings.pixels) : new Uint16Array(settings.pixels);
    }
    const pixels = settings.bitsAllocated === 8 ? new Uint8Array(count) :
        settings.pixelRepresentation === 1 ? new Int16Array(count) : new Uint16Array(count);
    for (let index = 0; index < count; index++) {
        pixels[index] = settings.photometricInterpretation === "PALETTE COLOR" ? index % 4 : index % (2 ** settings.bitsStored);
    }
    if (settings.transferSyntaxUid === SYNTHETIC_TRANSFER_SYNTAXES.jpegBaseline) {
        for (let index = 0; index < count; index++) pixels[index] = (index % 16 < 8) ? 64 : 192;
    }
    return pixels;
}

function expectedFirstFrameRgba(settings, pixels) {
    const pixelCount = settings.rows * settings.columns;
    const rgba = new Uint8Array(pixelCount * 4);
    const palette = [[0, 0, 0], [255, 0, 0], [0, 255, 0], [0, 0, 255]];
    const isColor = settings.photometricInterpretation === "RGB" || settings.photometricInterpretation === "PALETTE COLOR";
    const isBaseline = settings.transferSyntaxUid === SYNTHETIC_TRANSFER_SYNTAXES.jpegBaseline;
    const isLossless = settings.transferSyntaxUid === SYNTHETIC_TRANSFER_SYNTAXES.jpegLossless;
    const isRle16 = settings.transferSyntaxUid === SYNTHETIC_TRANSFER_SYNTAXES.rle && settings.bitsAllocated === 16 && settings.pixelRepresentation === 0;
    if (!isColor && !isBaseline && !isLossless && !isRle16 && settings.bitsAllocated !== 8) return null;
    if (!isColor && !isBaseline && !isLossless && (settings.windowCenter != null || settings.windowWidth != null)) return null;
    for (let index = 0; index < pixelCount; index++) {
        let rgb;
        if (settings.photometricInterpretation === "PALETTE COLOR") rgb = palette[pixels[index]];
        else if (settings.photometricInterpretation === "RGB") rgb = [0, 1, 2].map(component => pixels[settings.planarConfiguration === 1 ? component * pixelCount + index : index * 3 + component]);
        else {
            let value = isLossless ? [0, 63, 127, 255][index] : isRle16 ? Math.round(pixels[index] / (2 ** settings.bitsStored - 1) * 255) : pixels[index];
            if (settings.photometricInterpretation === "MONOCHROME1") value = 255 - value;
            rgb = [value, value, value];
        }
        rgba.set([...rgb, 255], index * 4);
    }
    return rgba;
}

function nativePixelBytes(pixels, settings, littleEndian) {
    if (settings.bitsAllocated === 8) return new Uint8Array(pixels);
    const bytes = new Uint8Array(pixels.length * 2);
    const view = new DataView(bytes.buffer);
    pixels.forEach((pixel, index) => view.setUint16(index * 2, pixel & 0xFFFF, littleEndian));
    return bytes;
}

function encapsulatedPixelData(frames, oddFragmentLength) {
    const offsets = [];
    let offset = 0;
    const fragments = frames.map(frame => {
        let bytes = frame;
        offsets.push(offset);
        if (oddFragmentLength != null) bytes = bytes.slice(0, oddFragmentLength);
        else if (bytes.length % 2 !== 0) bytes = concatenateBytes([bytes, new Uint8Array([0])]);
        offset += 8 + bytes.length;
        return concatenateBytes([structuralItem(0xE000, bytes.length), bytes]);
    });
    const table = concatenateBytes(offsets.map(value => numberBytes(value, 4)));
    return concatenateBytes([structuralItem(0xE000, table.length), table, ...fragments, structuralItem(0xE0DD, 0)]);
}

/**
 * Build fresh deterministic bytes and independent expectations. Options include
 * rows/columns/frames, includePart10Header, pixels, native syntax, identifying
 * fields, bitsAllocated/bitsStored/highBit, display window/rescale and sequences.
 */
export function createDicomFixture(profile = "default", overrides = {}) {
    if (typeof profile === "object") { overrides = profile; profile = "default"; }
    if (!Object.hasOwn(PROFILES, profile)) throw new Error(`Unknown synthetic DICOM profile: ${profile}`);
    const settings = {
        ...SYNTHETIC_IDENTIFIERS,
        rows: 32, columns: 32, frames: 3, bitsAllocated: 8, bitsStored: 8, pixelRepresentation: 0,
        samplesPerPixel: 1, planarConfiguration: 0, photometricInterpretation: "MONOCHROME2", modality: "XA",
        transferSyntaxUid: SYNTHETIC_TRANSFER_SYNTAXES.explicitLE, includePart10Header: true,
        undefinedSequenceLengths: true, ...PROFILES[profile], ...overrides
    };
    settings.highBit ??= settings.bitsStored - 1;
    const syntax = { explicit: settings.transferSyntaxUid !== SYNTHETIC_TRANSFER_SYNTAXES.implicitLE, littleEndian: settings.transferSyntaxUid !== SYNTHETIC_TRANSFER_SYNTAXES.explicitBE };
    const pixels = buildPixelValues(settings);
    const pixelBytes = nativePixelBytes(pixels, settings, syntax.littleEndian);
    const records = [
        ["00080005", "CS", "ISO_IR 192"],
        ["00080008", "CS", ["DERIVED", "SECONDARY"]],
        ["00080016", "UI", settings.sopClassUid], ["00080018", "UI", settings.sopInstanceUid],
        ["00080020", "DA", settings.studyDate], ["00080021", "DA", settings.studyDate], ["00080023", "DA", settings.studyDate],
        ["00080030", "TM", settings.studyTime], ["00080031", "TM", settings.studyTime], ["00080033", "TM", settings.studyTime],
        ["00080050", "SH", "SYNTHETIC-ACC"], ["00080060", "CS", settings.modality],
        ["00080090", "PN", settings.referringPhysicianName], ["00081030", "LO", "Invented EASI fixture study"],
        ["0008103E", "LO", "Invented deterministic pixels"], ["00081050", "PN", settings.performingPhysicianName],
        ["00081060", "PN", "SYNTHETIC^READER"],
        ["00100010", "PN", settings.patientName], ["00100020", "LO", settings.patientId],
        ["00100021", "LO", "EASI SYNTHETIC TEST ISSUER"], ["00100030", "DA", "20000101"], ["00100040", "CS", "O"],
        ["0020000D", "UI", settings.studyInstanceUid], ["0020000E", "UI", settings.seriesInstanceUid],
        ["00200010", "SH", "SYNTHETIC-STUDY"], ["00200011", "IS", "1"], ["00200013", "IS", "1"],
        ["00280002", "US", settings.samplesPerPixel], ["00280004", "CS", settings.photometricInterpretation],
        ["00280008", "IS", settings.frames], ["00280010", "US", settings.rows], ["00280011", "US", settings.columns],
        ["00280030", "DS", ["0.5", "0.5"]], ["00280100", "US", settings.bitsAllocated],
        ["00280101", "US", settings.bitsStored], ["00280102", "US", settings.highBit], ["00280103", "US", settings.pixelRepresentation],
        ["00280301", "CS", "NO"]
    ];
    if (settings.samplesPerPixel > 1) records.push(["00280006", "US", settings.planarConfiguration]);
    for (const [field, tag] of [["windowCenter", "00281050"], ["windowWidth", "00281051"], ["rescaleIntercept", "00281052"], ["rescaleSlope", "00281053"]]) {
        if (settings[field] != null) records.push([tag, "DS", settings[field]]);
    }
    if (settings.photometricInterpretation === "PALETTE COLOR") {
        for (const tag of ["00281101", "00281102", "00281103"]) records.push([tag, "US", [4, 0, 16]]);
        records.push(["00281201", "OW", valueBytes("US", [0, 65535, 0, 0], syntax.littleEndian)]);
        records.push(["00281202", "OW", valueBytes("US", [0, 0, 65535, 0], syntax.littleEndian)]);
        records.push(["00281203", "OW", valueBytes("US", [0, 0, 0, 65535], syntax.littleEndian)]);
    }
    const specialElements = [];
    if (settings.nestedSequences) {
        const nested = sequence("00400275", [[
            encodeElement("00080050", "SH", "SYNTHETIC-NESTED", syntax),
            encodeElement("00100010", "PN", "SYNTHETIC^NESTED", syntax)
        ]], syntax, settings.undefinedSequenceLengths);
        specialElements.push(["00082112", sequence("00082112", [[
            encodeElement("00081150", "UI", settings.sopClassUid, syntax),
            encodeElement("00081155", "UI", "2.25.104", syntax), nested
        ], [encodeElement("00081150", "UI", settings.sopClassUid, syntax), encodeElement("00081155", "UI", "2.25.105", syntax)]], syntax, settings.undefinedSequenceLengths)]);
    }
    for (const record of settings.extraElements ?? []) records.push(record);
    let encodedFrames = null;
    const frameSize = settings.rows * settings.columns * settings.samplesPerPixel;
    if (settings.transferSyntaxUid === SYNTHETIC_TRANSFER_SYNTAXES.rle) {
        encodedFrames = Array.from({ length: settings.frames }, (_, index) => encodeRleFrame(pixels.slice(index * frameSize, (index + 1) * frameSize), settings));
    }
    else if (settings.transferSyntaxUid === SYNTHETIC_TRANSFER_SYNTAXES.jpegBaseline) {
        if (settings.rows !== 8 || settings.columns !== 16 || settings.samplesPerPixel !== 1) throw new Error("The independent baseline vector is 8x16 monochrome.");
        encodedFrames = Array.from({ length: settings.frames }, () => encodeBaselineJpegFrame());
    }
    else if (settings.transferSyntaxUid === SYNTHETIC_TRANSFER_SYNTAXES.jpegLossless) {
        if (settings.rows !== 2 || settings.columns !== 2 || settings.samplesPerPixel !== 1) throw new Error("The independent lossless vector is 2x2 monochrome.");
        encodedFrames = Array.from({ length: settings.frames }, () => encodeLosslessJpegFrame());
    }
    else if (settings.transferSyntaxUid === SYNTHETIC_TRANSFER_SYNTAXES.jpeg2000) {
        if (settings.rows !== 2 || settings.columns !== 2 || settings.samplesPerPixel !== 1) throw new Error("The independent JPEG 2000 vector is 2x2 monochrome.");
        encodedFrames = Array.from({ length: settings.frames }, () => encodeJpeg2000Frame());
    }
    if (settings.encodedFrames != null) encodedFrames = settings.encodedFrames.map(bytes => new Uint8Array(bytes));
    const pixelElement = encodedFrames === null ? encodeElement("7FE00010", settings.bitsAllocated > 8 ? "OW" : "OB", pixelBytes, syntax) :
        encodeElement("7FE00010", "OB", encapsulatedPixelData(encodedFrames, settings.oddFragmentLength), { ...syntax, undefinedLength: true });
    specialElements.push(["7FE00010", pixelElement]);
    const encoded = records.map(([tag, vr, value]) => [tag, encodeElement(tag, vr, value, syntax)]).concat(specialElements);
    encoded.sort(([left], [right]) => left.localeCompare(right));
    const dataset = concatenateBytes(encoded.map(([, bytes]) => bytes));
    const metaRecords = [
        ["00020001", "OB", new Uint8Array([0, 1])], ["00020002", "UI", settings.sopClassUid],
        ["00020003", "UI", settings.sopInstanceUid], ["00020010", "UI", settings.transferSyntaxUid],
        ["00020012", "UI", "2.25.106"], ["00020013", "SH", "EASI_SYNTHETIC"]
    ];
    const meta = concatenateBytes(metaRecords.map(([tag, vr, value]) => encodeElement(tag, vr, value)));
    const bytes = settings.includePart10Header ? concatenateBytes([
        new Uint8Array(128), TEXT.encode("DICM"), encodeElement("00020000", "UL", meta.length), meta, dataset
    ]) : dataset;
    return { bytes, expected: {
        ...settings, pixels, pixelBytes, encodedFrames,
        firstFrameRgba: expectedFirstFrameRgba(settings, pixels),
        metaCount: settings.includePart10Header ? 7 : null,
        dataCount: encoded.length,
        tagIds: encoded.map(([tag]) => tag),
        metaTagIds: settings.includePart10Header ? ["00020000", ...metaRecords.map(([tag]) => tag)] : [],
        oddFragmentLength: settings.oddFragmentLength ?? null
    } };
}

export function getFixtureBytes(profile = "default", overrides = {}) {
    return createDicomFixture(profile, overrides).bytes;
}
