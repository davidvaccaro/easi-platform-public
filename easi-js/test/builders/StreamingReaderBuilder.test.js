import StreamingReaderBuilder from "../../src/builders/StreamingReaderBuilder.js";
import StreamingDicomDataParser from "../../src/parsers/StreamingDicomDataParser.js";
import StreamingJsonDataParser from "../../src/parsers/StreamingJsonDataParser.js";
import StreamingXmlDataParser from "../../src/parsers/StreamingXmlDataParser.js";
import StreamingDicomInstanceHandler from "../../src/handlers/terminals/StreamingDicomInstanceHandler.js";
import StreamingDicomDeIdentificationFilter from "../../src/handlers/filters/StreamingDicomDeIdentificationFilter.js";
import StreamingDicomValidationFilter, { ValidationGoals } from "../../src/handlers/filters/StreamingDicomValidationFilter.js";
import StreamingDicomJsonMetadataAdapter from "../../src/handlers/adapters/StreamingDicomJsonMetadataAdapter.js";
import StreamingDicomXmlMetadataAdapter from "../../src/handlers/adapters/StreamingDicomXmlMetadataAdapter.js";
import StreamingDicomDataWriterHandler from "../../src/handlers/terminals/StreamingDicomDataWriterHandler.js";
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

test("Test: build throws IncompatibleValidationAndParser", () => {
    const error = captureBuildError(
        new StreamingReaderBuilder()
            .withParser(new StreamingJsonDataParser())
            .withHandler({})
            .withValidation()
    );

    expect(error instanceof Exception).toBe(true);
    expect(error.code).toBe(BuilderErrorCodes.IncompatibleValidationAndParser);
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
    expect(reader.parser.handler instanceof StreamingDicomJsonMetadataAdapter).toBe(true);
});

test("Test: build composes metadata adapter -> deid -> writer when masking JSON metadata", () => {
    const reader = new StreamingReaderBuilder()
        .fromDicomMetadata()
        .toDicomData()
        .withMask(new Map())
        .build();

    expect(reader.parser.handler instanceof StreamingDicomJsonMetadataAdapter).toBe(true);
    expect(reader.parser.handler.nextHandler instanceof StreamingDicomDeIdentificationFilter).toBe(true);
    expect(reader.parser.handler.nextHandler.nextHandler instanceof StreamingDicomDataWriterHandler).toBe(true);
});

test("Test: build composes validation filter for native DICOM semantic chain", () => {
    const onConcern = () => {};
    const reader = new StreamingReaderBuilder()
        .fromDicomData()
        .toInstances()
        .withValidation({ goal: ValidationGoals.STRICT, onConcern })
        .build();

    expect(reader.parser.handler instanceof StreamingDicomValidationFilter).toBe(true);
    expect(reader.parser.handler.goal).toBe(ValidationGoals.STRICT);
    expect(reader.parser.handler.onConcern).toBe(onConcern);
    expect(reader.parser.handler.nextHandler instanceof StreamingDicomInstanceHandler).toBe(true);
});

test("Test: build composes metadata adapter -> validation -> deid -> writer when validation and masking JSON metadata", () => {
    const reader = new StreamingReaderBuilder()
        .fromDicomMetadata()
        .toDicomData()
        .withValidation({ goal: 'permissive' })
        .withMask(new Map())
        .build();

    expect(reader.parser.handler instanceof StreamingDicomJsonMetadataAdapter).toBe(true);
    expect(reader.parser.handler.nextHandler instanceof StreamingDicomValidationFilter).toBe(true);
    expect(reader.parser.handler.nextHandler.nextHandler instanceof StreamingDicomDeIdentificationFilter).toBe(true);
    expect(reader.parser.handler.nextHandler.nextHandler.nextHandler instanceof StreamingDicomDataWriterHandler).toBe(true);
});

test("Test: build composes XML metadata adapter with shared handler", () => {
    const reader = new StreamingReaderBuilder()
        .fromDicomXmlMetadata()
        .toSelection({})
        .build();

    expect(reader.parser instanceof StreamingXmlDataParser).toBe(true);
    expect(reader.parser.handler instanceof StreamingDicomXmlMetadataAdapter).toBe(true);
});

test("Test: build composes XML metadata adapter -> deid -> writer when masking XML metadata", () => {
    const reader = new StreamingReaderBuilder()
        .fromDicomXmlMetadata()
        .toDicomData()
        .withMask(new Map())
        .build();

    expect(reader.parser.handler instanceof StreamingDicomXmlMetadataAdapter).toBe(true);
    expect(reader.parser.handler.nextHandler instanceof StreamingDicomDeIdentificationFilter).toBe(true);
    expect(reader.parser.handler.nextHandler.nextHandler instanceof StreamingDicomDataWriterHandler).toBe(true);
});

test("Test: withValidation(false) disables validation composition", () => {
    const reader = new StreamingReaderBuilder()
        .fromDicomData()
        .toInstances()
        .withValidation(false)
        .build();

    expect(reader.parser.handler instanceof StreamingDicomValidationFilter).toBe(false);
    expect(reader.parser.handler instanceof StreamingDicomInstanceHandler).toBe(true);
});
