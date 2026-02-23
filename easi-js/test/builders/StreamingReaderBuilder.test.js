import StreamingReaderBuilder from "../../src/builders/StreamingReaderBuilder.js";
import StreamingDicomDataParser from "../../src/parsers/StreamingDicomDataParser.js";
import StreamingJsonDataParser from "../../src/parsers/StreamingJsonDataParser.js";
import StreamingDicomInstanceHandler from "../../src/handlers/StreamingDicomInstanceHandler.js";
import StreamingDicomDeIdentificationHandler from "../../src/handlers/StreamingDicomDeIdentificationHandler.js";
import StreamingDicomMetadataAdapterHandler from "../../src/handlers/StreamingDicomMetadataAdapterHandler.js";
import StreamingDicomDataWriterHandler from "../../src/handlers/StreamingDicomDataWriterHandler.js";
import Exception from "../../src/environment/Exception.js";
import { BuilderErrorCodes } from "../../src/environment/Exception.js";

function captureBuildError(builder) {
    try {
        builder.build();
        return null;
    }
    catch (err) {
        return err;
    }
}

test("Test: build throws MissingParser", () => {
    const error = captureBuildError(
        new StreamingReaderBuilder()
            .toInstances()
    );

    expect(error instanceof Exception).toBe(true);
    expect(error.code).toBe(BuilderErrorCodes.MissingParser);
});

test("Test: build throws MissingHandler", () => {
    const error = captureBuildError(
        new StreamingReaderBuilder()
            .fromDicomData()
    );

    expect(error instanceof Exception).toBe(true);
    expect(error.code).toBe(BuilderErrorCodes.MissingHandler);
});

test("Test: build throws InvalidParser", () => {
    const error = captureBuildError(
        new StreamingReaderBuilder()
            .withParser({ reset() {} })
            .withHandler(new StreamingDicomInstanceHandler())
    );

    expect(error instanceof Exception).toBe(true);
    expect(error.code).toBe(BuilderErrorCodes.InvalidParser);
});

test("Test: build throws InvalidHandler", () => {
    const error = captureBuildError(
        new StreamingReaderBuilder()
            .withParser(new StreamingDicomDataParser())
            .withHandler(123)
    );

    expect(error instanceof Exception).toBe(true);
    expect(error.code).toBe(BuilderErrorCodes.InvalidHandler);
});

test("Test: build throws InvalidOnPart", () => {
    const error = captureBuildError(
        new StreamingReaderBuilder()
            .withOnPart(123)
            .withParser(new StreamingDicomDataParser())
            .withHandler(new StreamingDicomInstanceHandler())
    );

    expect(error instanceof Exception).toBe(true);
    expect(error.code).toBe(BuilderErrorCodes.InvalidOnPart);
});

test("Test: build throws IncompatibleParserAndHandler", () => {
    const error = captureBuildError(
        new StreamingReaderBuilder()
            .withParser(new StreamingJsonDataParser())
            .withHandler(new StreamingDicomDataWriterHandler())
    );

    expect(error instanceof Exception).toBe(true);
    expect(error.code).toBe(BuilderErrorCodes.IncompatibleParserAndHandler);
});

test("Test: build throws IncompatibleMaskAndParser", () => {
    const error = captureBuildError(
        new StreamingReaderBuilder()
            .withParser(new StreamingJsonDataParser())
            .withHandler({})
            .withMask(new Map())
    );

    expect(error instanceof Exception).toBe(true);
    expect(error.code).toBe(BuilderErrorCodes.IncompatibleMaskAndParser);
});

test("Test: build does not mutate builder handler when masking", () => {
    const builder = new StreamingReaderBuilder()
        .fromDicomData()
        .toInstances()
        .withMask(new Map());

    const originalHandler = builder.handler;
    builder.build();

    expect(builder.handler).toBe(originalHandler);
    expect(builder.handler instanceof StreamingDicomInstanceHandler).toBe(true);
});

test("Test: build composes metadata adapter with shared handler", () => {
    const reader = new StreamingReaderBuilder()
        .fromDicomMetadata()
        .toSelection({})
        .build();

    expect(reader.parser instanceof StreamingJsonDataParser).toBe(true);
    expect(reader.parser.handler instanceof StreamingDicomMetadataAdapterHandler).toBe(true);
});

test("Test: build composes metadata adapter -> deid -> writer when masking JSON metadata", () => {
    const reader = new StreamingReaderBuilder()
        .fromDicomMetadata()
        .toDicomData()
        .withMask(new Map())
        .build();

    expect(reader.parser.handler instanceof StreamingDicomMetadataAdapterHandler).toBe(true);
    expect(reader.parser.handler.nextHandler instanceof StreamingDicomDeIdentificationHandler).toBe(true);
    expect(reader.parser.handler.nextHandler.nextHandler instanceof StreamingDicomDataWriterHandler).toBe(true);
});
