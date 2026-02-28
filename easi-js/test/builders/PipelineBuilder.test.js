import PipelineBuilder from "../../src/builders/PipelineBuilder.js";
import DicomDataParser from "../../src/parsers/DicomDataParser.js";
import JsonDataParser from "../../src/parsers/JsonDataParser.js";
import XmlDataParser from "../../src/parsers/XmlDataParser.js";
import DicomInstanceHandler from "../../src/handlers/terminals/DicomInstanceHandler.js";
import DicomDeIdentificationFilter from "../../src/handlers/filters/DicomDeIdentificationFilter.js";
import DicomValidationFilter, { ValidationGoals } from "../../src/handlers/filters/DicomValidationFilter.js";
import DicomJsonMetadataAdapter from "../../src/handlers/adapters/DicomJsonMetadataAdapter.js";
import DicomXmlMetadataAdapter from "../../src/handlers/adapters/DicomXmlMetadataAdapter.js";
import DicomDataWriterHandler from "../../src/handlers/terminals/DicomDataWriterHandler.js";
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
        new PipelineBuilder()
            .toInstances()
    );

    expect(error instanceof Exception).toBe(true);
    expect(error.code).toBe(BuilderErrorCodes.MissingParser);
});

test("Test: build throws MissingHandler", () => {
    const error = captureBuildError(
        new PipelineBuilder()
            .fromPartStream().ofDicomData()
    );

    expect(error instanceof Exception).toBe(true);
    expect(error.code).toBe(BuilderErrorCodes.MissingHandler);
});

test("Test: build throws InvalidParser", () => {
    const error = captureBuildError(
        new PipelineBuilder()
            .withParser({ reset() {} })
            .withHandler(new DicomInstanceHandler())
    );

    expect(error instanceof Exception).toBe(true);
    expect(error.code).toBe(BuilderErrorCodes.InvalidParser);
});

test("Test: build throws InvalidHandler", () => {
    const error = captureBuildError(
        new PipelineBuilder()
            .withParser(new DicomDataParser())
            .withHandler(123)
    );

    expect(error instanceof Exception).toBe(true);
    expect(error.code).toBe(BuilderErrorCodes.InvalidHandler);
});

test("Test: build throws InvalidReader", () => {
    const error = captureBuildError(
        new PipelineBuilder()
            .withReader({})
            .withParser(new DicomDataParser())
            .withHandler(new DicomInstanceHandler())
    );

    expect(error instanceof Exception).toBe(true);
    expect(error.code).toBe(BuilderErrorCodes.InvalidReader);
});

test("Test: build throws InvalidOnPart", () => {
    const error = captureBuildError(
        new PipelineBuilder()
            .withOnPart(123)
            .withParser(new DicomDataParser())
            .withHandler(new DicomInstanceHandler())
    );

    expect(error instanceof Exception).toBe(true);
    expect(error.code).toBe(BuilderErrorCodes.InvalidOnPart);
});

test("Test: build throws IncompatibleOnPartAndReader", () => {
    const error = captureBuildError(
        new PipelineBuilder()
            .withReader({
                read() {
                    return Promise.resolve(null);
                }
            })
            .withOnPart(() => {})
            .withParser(new DicomDataParser())
            .withHandler(new DicomInstanceHandler())
    );

    expect(error instanceof Exception).toBe(true);
    expect(error.code).toBe(BuilderErrorCodes.IncompatibleOnPartAndReader);
});

test("Test: build throws IncompatibleParserAndHandler", () => {
    const error = captureBuildError(
        new PipelineBuilder()
            .withParser(new JsonDataParser())
            .withHandler(new DicomDataWriterHandler())
    );

    expect(error instanceof Exception).toBe(true);
    expect(error.code).toBe(BuilderErrorCodes.IncompatibleParserAndHandler);
});

test("Test: build throws IncompatibleMaskAndParser", () => {
    const error = captureBuildError(
        new PipelineBuilder()
            .withParser(new JsonDataParser())
            .withHandler({})
            .withMask(new Map())
    );

    expect(error instanceof Exception).toBe(true);
    expect(error.code).toBe(BuilderErrorCodes.IncompatibleMaskAndParser);
});

test("Test: build throws IncompatibleValidationAndParser", () => {
    const error = captureBuildError(
        new PipelineBuilder()
            .withParser(new JsonDataParser())
            .withHandler({})
            .withValidation()
    );

    expect(error instanceof Exception).toBe(true);
    expect(error.code).toBe(BuilderErrorCodes.IncompatibleValidationAndParser);
});

test("Test: build does not mutate builder handler when masking", () => {
    const builder = new PipelineBuilder()
        .fromPartStream().ofDicomData()
        .toInstances()
        .withMask(new Map());

    const originalHandler = builder.handler;
    builder.build();

    expect(builder.handler).toBe(originalHandler);
    expect(builder.handler instanceof DicomInstanceHandler).toBe(true);
});

test("Test: build composes metadata adapter with shared handler", () => {
    const reader = new PipelineBuilder()
        .fromPartStream().ofDicomMetadata()
        .toSelection({})
        .build();

    expect(reader.parser instanceof JsonDataParser).toBe(true);
    expect(reader.parser.handler instanceof DicomJsonMetadataAdapter).toBe(true);
});

test("Test: build composes metadata adapter -> deid -> writer when masking JSON metadata", () => {
    const reader = new PipelineBuilder()
        .fromPartStream().ofDicomMetadata()
        .toDicomData()
        .withMask(new Map())
        .build();

    expect(reader.parser.handler instanceof DicomJsonMetadataAdapter).toBe(true);
    expect(reader.parser.handler.nextHandler instanceof DicomDeIdentificationFilter).toBe(true);
    expect(reader.parser.handler.nextHandler.nextHandler instanceof DicomDataWriterHandler).toBe(true);
});

test("Test: build composes validation filter for native DICOM semantic chain", () => {
    const onConcern = () => {};
    const reader = new PipelineBuilder()
        .fromPartStream().ofDicomData()
        .toInstances()
        .withValidation({ goal: ValidationGoals.STRICT, onConcern })
        .build();

    expect(reader.parser.handler instanceof DicomValidationFilter).toBe(true);
    expect(reader.parser.handler.goal).toBe(ValidationGoals.STRICT);
    expect(reader.parser.handler.onConcern).toBe(onConcern);
    expect(reader.parser.handler.nextHandler instanceof DicomInstanceHandler).toBe(true);
});

test("Test: build composes metadata adapter -> validation -> deid -> writer when validation and masking JSON metadata", () => {
    const reader = new PipelineBuilder()
        .fromPartStream().ofDicomMetadata()
        .toDicomData()
        .withValidation({ goal: 'permissive' })
        .withMask(new Map())
        .build();

    expect(reader.parser.handler instanceof DicomJsonMetadataAdapter).toBe(true);
    expect(reader.parser.handler.nextHandler instanceof DicomValidationFilter).toBe(true);
    expect(reader.parser.handler.nextHandler.nextHandler instanceof DicomDeIdentificationFilter).toBe(true);
    expect(reader.parser.handler.nextHandler.nextHandler.nextHandler instanceof DicomDataWriterHandler).toBe(true);
});

test("Test: build composes XML metadata adapter with shared handler", () => {
    const reader = new PipelineBuilder()
        .fromPartStream().ofDicomXmlMetadata()
        .toSelection({})
        .build();

    expect(reader.parser instanceof XmlDataParser).toBe(true);
    expect(reader.parser.handler instanceof DicomXmlMetadataAdapter).toBe(true);
});

test("Test: build composes XML metadata adapter -> deid -> writer when masking XML metadata", () => {
    const reader = new PipelineBuilder()
        .fromPartStream().ofDicomXmlMetadata()
        .toDicomData()
        .withMask(new Map())
        .build();

    expect(reader.parser.handler instanceof DicomXmlMetadataAdapter).toBe(true);
    expect(reader.parser.handler.nextHandler instanceof DicomDeIdentificationFilter).toBe(true);
    expect(reader.parser.handler.nextHandler.nextHandler instanceof DicomDataWriterHandler).toBe(true);
});

test("Test: withValidation(false) disables validation composition", () => {
    const reader = new PipelineBuilder()
        .fromPartStream().ofDicomData()
        .toInstances()
        .withValidation(false)
        .build();

    expect(reader.parser.handler instanceof DicomValidationFilter).toBe(false);
    expect(reader.parser.handler instanceof DicomInstanceHandler).toBe(true);
});

test("Test: build uses configured custom reader", () => {
    const customReader = {
        read() {
            return Promise.resolve(null);
        },
        parser: null
    };

    const reader = new PipelineBuilder()
        .fromPartStream()
        .withReader(customReader)
        .ofDicomData()
        .toInstances()
        .build();

    expect(reader).toBe(customReader);
    expect(reader.parser instanceof DicomDataParser).toBe(true);
    expect(reader.parser.handler instanceof DicomInstanceHandler).toBe(true);
});

test("Test: build sets onPart on configured custom reader when supported", () => {
    const onPart = () => {};
    const customReader = {
        read() {
            return Promise.resolve(null);
        },
        parser: null,
        onPart: null
    };

    const reader = new PipelineBuilder()
        .fromPartStream()
        .withReader(customReader)
        .withOnPart(onPart)
        .ofDicomData()
        .toInstances()
        .build();

    expect(reader).toBe(customReader);
    expect(reader.onPart).toBe(onPart);
});
