import CodecRegistryBuilder from "../../src/builders/CodecRegistryBuilder.js";
import CodecRegistry from "../../src/codecs/CodecRegistry.js";
import Configuration from "../../src/environment/Configuration.js";
import TransferSyntax from "../../src/dicom/TransferSyntax.js";
import EASI from "../../src/EASI.js";

class FakeDecoder {
    constructor(dicomObject) {
        this.dicomObject = dicomObject;
    }
}

class FakeEncoder {
    encode() {
        return {
            bytes: new Uint8Array(0),
            mimeType: "application/octet-stream",
            format: "fake"
        };
    }
}

test("Test: CodecRegistryBuilder builds independent default codec registry and asserts valid", () => {
    const registry = new CodecRegistryBuilder()
        .withDefaultCodecs()
        .build();

    expect(registry instanceof CodecRegistry).toBe(true);
    expect(registry.hasDecoderForTransferSyntax(TransferSyntax.NONE)).toBe(true);
    expect(registry.hasEncoder("png")).toBe(true);
    expect(registry.assertValid().ok).toBe(true);
});

test("Test: CodecRegistryBuilder supports overriding and extending defaults", () => {
    const registry = new CodecRegistryBuilder()
        .withDefaultCodecs()
        .withDecoderForTransferSyntax(TransferSyntax.NONE, FakeDecoder)
        .withEncoder("custom", new FakeEncoder())
        .build();

    const decoder = registry.getDecoderForTransferSyntax(TransferSyntax.NONE, { id: "x" });
    expect(decoder instanceof FakeDecoder).toBe(true);
    expect(registry.hasEncoder("custom")).toBe(true);
});

test("Test: CodecRegistryBuilder throws on invalid encoder registration by default", () => {
    expect(() => {
        new CodecRegistryBuilder()
            .withDecoderForTransferSyntax(TransferSyntax.NONE, FakeDecoder)
            .withEncoder("bad", {})
            .build();
    }).toThrow("CodecRegistry validation failed");
});

test("Test: CodecRegistryBuilder clones base codec registry by default", () => {
    const baseRegistry = Configuration.createDefaultCodecRegistry();

    const derivedRegistry = new CodecRegistryBuilder()
        .withBaseCodecRegistry(baseRegistry)
        .withEncoder("custom", new FakeEncoder())
        .build();

    expect(derivedRegistry.hasEncoder("custom")).toBe(true);
    expect(baseRegistry.hasEncoder("custom")).toBe(false);
});

test("Test: EASI codec-registry builder entry points are available", () => {
    expect(EASI.codecRegistryBuilder() instanceof CodecRegistryBuilder).toBe(true);
});
