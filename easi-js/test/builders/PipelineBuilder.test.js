import PipelineBuilder from "../../src/builders/PipelineBuilder.js";
import DicomDataParser from "../../src/parsers/DicomDataParser.js";
import JsonDataParser from "../../src/parsers/JsonDataParser.js";
import XmlDataParser from "../../src/parsers/XmlDataParser.js";
import HttpStreamReader from "../../src/readers/HttpStreamReader.js";
import ByteStreamReader from "../../src/readers/ByteStreamReader.js";
import FileStreamReader from "../../src/readers/FileStreamReader.js";
import WebSocketStreamReader from "../../src/readers/WebSocketStreamReader.js";
import NodeStreamAdapterReader from "../../src/readers/NodeStreamAdapterReader.js";
import Pipeline from "../../src/pipelines/Pipeline.js";
import DicomInstanceHandler from "../../src/handlers/terminals/DicomInstanceHandler.js";
import DicomEntityHandler from "../../src/handlers/terminals/DicomEntityHandler.js";
import DicomDeIdentificationFilter from "../../src/handlers/filters/DicomDeIdentificationFilter.js";
import DicomValidationFilter, { ValidationGoals } from "../../src/handlers/filters/DicomValidationFilter.js";
import DicomTranscodingFilter from "../../src/handlers/filters/DicomTranscodingFilter.js";
import DicomBurnedInRedactionFilter from "../../src/handlers/filters/DicomBurnedInRedactionFilter.js";
import DicomJsonMetadataAdapter from "../../src/handlers/adapters/DicomJsonMetadataAdapter.js";
import DicomXmlMetadataAdapter from "../../src/handlers/adapters/DicomXmlMetadataAdapter.js";
import DicomDataWriterHandler from "../../src/handlers/terminals/DicomDataWriterHandler.js";
import DicomAssetArchiveHandler from "../../src/handlers/terminals/DicomAssetArchiveHandler.js";
import DicomMappingHandler from "../../src/handlers/terminals/DicomMappingHandler.js";
import DicomToFHIRImagingStudyMapping from "../../src/handlers/mappings/DicomToFHIRImagingStudyMapping.js";
import JsonDataHandler from "../../src/handlers/terminals/syntax/JsonDataHandler.js";
import XmlDataHandler from "../../src/handlers/terminals/syntax/XmlDataHandler.js";
import Tag from "../../src/dicom/Tag.js";
import TransferSyntax from "../../src/dicom/TransferSyntax.js";
import Exception from "../../src/environment/Exception.js";
import { BuilderErrorCodes } from "../../src/environment/Exception.js";

function captureBuildError(builderOrAction) {
    try {
        if (typeof builderOrAction === "function") {
            builderOrAction();
        }
        else {
            builderOrAction.build();
        }
        return null;
    }
    catch (err) {
        return err;
    }
}

test("Test: staged interfaces expose only legal methods per stage", () => {
    const source = new PipelineBuilder();
    expect(typeof source.fromPartStream).toBe("function");
    expect(typeof source.ofDicomData).toBe("undefined");
    expect(typeof source.toInstances).toBe("undefined");
    expect(typeof source.withMask).toBe("undefined");
    expect(typeof source.build).toBe("undefined");
    expect(source._operations).toBeUndefined();
    expect(Object.isFrozen(source)).toBe(true);

    const format = source.fromPartStream();
    expect(typeof format.ofDicomData).toBe("function");
    expect(typeof format.toInstances).toBe("undefined");
    expect(typeof format.withMask).toBe("undefined");

    const target = format.ofDicomData();
    expect(typeof target.toInstances).toBe("function");
    expect(typeof target.withMask).toBe("function");
    expect(typeof target.withTranscoding).toBe("function");
    expect(typeof target.withBurnedInRedaction).toBe("function");

    const ready = target.withMask(new Map()).toInstances();
    expect(typeof ready.withMask).toBe("undefined");
    expect(typeof ready.intoByteStream).toBe("function");
    expect(typeof ready.intoBrowserFileStream).toBe("function");
    expect(typeof ready.build).toBe("function");
    expect(ready._operations).toBeUndefined();
    expect(Object.isFrozen(ready)).toBe(true);
});

test("Test: output writer sink is invoked when into* is configured", async () => {
    const customReader = {
        read() {
            return Promise.resolve(new Uint8Array([1, 2, 3]));
        },
        parser: null,
        onPart: null
    };

    const writer = {
        write: jest.fn().mockResolvedValue({ ok: true })
    };

    const pipeline = new PipelineBuilder()
        .withReader(customReader)
        .ofDicomData()
        .toInstances()
        .withWriter(writer, "sink-target", { custom: true })
        .build();

    const result = await pipeline.process(new Uint8Array([9]));

    expect(writer.write).toHaveBeenCalledTimes(1);
    expect(writer.write).toHaveBeenCalledWith(
        "sink-target",
        expect.any(Uint8Array),
        { custom: true }
    );
    expect(result).toEqual({ ok: true });
});

test("Test: build throws MissingParser", () => {
    const error = captureBuildError(
        new PipelineBuilder()
            .fromPartStream()
            .withParser(null)
            .toInstances()
    );

    expect(error instanceof Exception).toBe(true);
    expect(error.code).toBe(BuilderErrorCodes.MissingParser);
});

test("Test: build throws MissingHandler", () => {
    const error = captureBuildError(
        new PipelineBuilder()
            .fromPartStream()
            .withParser(new DicomDataParser())
            .withHandler(null)
    );

    expect(error instanceof Exception).toBe(true);
    expect(error.code).toBe(BuilderErrorCodes.MissingHandler);
});

test("Test: build throws InvalidParser", () => {
    const error = captureBuildError(
        new PipelineBuilder()
            .fromPartStream()
            .withParser({ reset() {} })
            .toInstances()
    );

    expect(error instanceof Exception).toBe(true);
    expect(error.code).toBe(BuilderErrorCodes.InvalidParser);
});

test("Test: build throws InvalidHandler", () => {
    const error = captureBuildError(
        new PipelineBuilder()
            .fromPartStream()
            .ofDicomData()
            .withHandler(123)
    );

    expect(error instanceof Exception).toBe(true);
    expect(error.code).toBe(BuilderErrorCodes.InvalidHandler);
});

test("Test: build throws InvalidReader", () => {
    const error = captureBuildError(
        new PipelineBuilder()
            .withReader({})
            .ofDicomData()
            .toInstances()
    );

    expect(error instanceof Exception).toBe(true);
    expect(error.code).toBe(BuilderErrorCodes.InvalidReader);
});

test("Test: build throws InvalidOnEmit", () => {
    const error = captureBuildError(
        new PipelineBuilder()
            .fromPartStream()
            .ofDicomData()
            .withOnEmit(123)
            .toInstances()
    );

    expect(error instanceof Exception).toBe(true);
    expect(error.code).toBe(BuilderErrorCodes.InvalidOnEmit);
});

test("Test: build throws IncompatibleOnEmitAndReader", () => {
    const error = captureBuildError(
        new PipelineBuilder()
            .withReader({
                read() {
                    return Promise.resolve(null);
                }
            })
            .ofDicomData()
            .withOnEmit(() => {})
            .toInstances()
    );

    expect(error instanceof Exception).toBe(true);
    expect(error.code).toBe(BuilderErrorCodes.IncompatibleOnEmitAndReader);
});

test("Test: build throws IncompatibleParserAndHandler", () => {
    const error = captureBuildError(
        new PipelineBuilder()
            .fromPartStream()
            .withParser(new JsonDataParser())
            .withHandler(new DicomDataWriterHandler())
    );

    expect(error instanceof Exception).toBe(true);
    expect(error.code).toBe(BuilderErrorCodes.IncompatibleParserAndHandler);
});

test("Test: build throws IncompatibleParserAndHandler for toJsonValue with DICOM parser", () => {
    const error = captureBuildError(
        new PipelineBuilder()
            .fromPartStream().ofDicomData()
            .toJsonValue()
    );

    expect(error instanceof Exception).toBe(true);
    expect(error.code).toBe(BuilderErrorCodes.IncompatibleParserAndHandler);
});

test("Test: build throws IncompatibleParserAndHandler for toAssets with DICOM metadata parser", () => {
    const error = captureBuildError(
        new PipelineBuilder()
            .fromPartStream().ofDicomMetadata()
            .toAssets({
                metadata: {
                    mapping: {}
                }
            })
    );

    expect(error instanceof Exception).toBe(true);
    expect(error.code).toBe(BuilderErrorCodes.IncompatibleParserAndHandler);
});

test("Test: build throws IncompatibleParserAndHandler for toAssetArchive with DICOM metadata parser", () => {
    const error = captureBuildError(
        new PipelineBuilder()
            .fromPartStream().ofDicomMetadata()
            .toAssetArchive()
    );

    expect(error instanceof Exception).toBe(true);
    expect(error.code).toBe(BuilderErrorCodes.IncompatibleParserAndHandler);
});

test("Test: build throws IncompatibleMaskAndParser", () => {
    const error = captureBuildError(
        new PipelineBuilder()
            .fromPartStream()
            .withParser(new JsonDataParser())
            .withMask(new Map())
            .withHandler({})
    );

    expect(error instanceof Exception).toBe(true);
    expect(error.code).toBe(BuilderErrorCodes.IncompatibleMaskAndParser);
});

test("Test: build throws IncompatibleValidationAndParser", () => {
    const error = captureBuildError(
        new PipelineBuilder()
            .fromPartStream()
            .withParser(new JsonDataParser())
            .withValidation()
            .withHandler({})
    );

    expect(error instanceof Exception).toBe(true);
    expect(error.code).toBe(BuilderErrorCodes.IncompatibleValidationAndParser);
});

test("Test: build throws IncompatibleTranscodingAndParser", () => {
    const error = captureBuildError(
        new PipelineBuilder()
            .fromPartStream()
            .withParser(new JsonDataParser())
            .withTranscoding(TransferSyntax.ImplicitVRLittleEndian.ID)
            .withHandler({})
    );

    expect(error instanceof Exception).toBe(true);
    expect(error.code).toBe(BuilderErrorCodes.IncompatibleTranscodingAndParser);
});

test("Test: build throws IncompatibleBurnedInRedactionAndParser", () => {
    const error = captureBuildError(
        new PipelineBuilder()
            .fromPartStream()
            .withParser(new JsonDataParser())
            .withBurnedInRedaction({
                regions: []
            })
            .withHandler({})
    );

    expect(error instanceof Exception).toBe(true);
    expect(error.code).toBe(BuilderErrorCodes.IncompatibleBurnedInRedactionAndParser);
});

test("Test: repeated build with masking preserves canonical semantic handler chain", () => {
    const ready = new PipelineBuilder()
        .fromPartStream().ofDicomData()
        .withMask(new Map())
        .toInstances();

    const first = ready.build();
    const second = ready.build();

    expect(first.parser.handler instanceof DicomDeIdentificationFilter).toBe(true);
    expect(first.parser.handler.nextHandler instanceof DicomInstanceHandler).toBe(true);
    expect(second.parser.handler instanceof DicomDeIdentificationFilter).toBe(true);
    expect(second.parser.handler.nextHandler instanceof DicomInstanceHandler).toBe(true);
    expect(second.parser.handler.nextHandler.nextHandler).toBeUndefined();
});

test("Test: build composes metadata adapter with shared handler", () => {
    const pipeline = new PipelineBuilder()
        .fromPartStream().ofDicomMetadata()
        .toSelection({})
        .build();

    expect(pipeline instanceof Pipeline).toBe(true);
    expect(pipeline.parser instanceof JsonDataParser).toBe(true);
    expect(pipeline.parser.handler instanceof DicomJsonMetadataAdapter).toBe(true);
});

test("Test: toEntities builds with DicomEntityHandler for native DICOM parser", () => {
    const pipeline = new PipelineBuilder()
        .fromPartStream().ofDicomData()
        .toEntities()
        .build();

    expect(pipeline.parser instanceof DicomDataParser).toBe(true);
    expect(pipeline.parser.handler instanceof DicomEntityHandler).toBe(true);
});

test("Test: toEntities composes JSON metadata adapter for metadata parser", () => {
    const pipeline = new PipelineBuilder()
        .fromPartStream().ofDicomMetadata()
        .toEntities()
        .build();

    expect(pipeline.parser instanceof JsonDataParser).toBe(true);
    expect(pipeline.parser.handler instanceof DicomJsonMetadataAdapter).toBe(true);
    expect(pipeline.parser.handler.nextHandler instanceof DicomEntityHandler).toBe(true);
});

test("Test: toMapping builds with DicomMappingHandler", () => {
    const mapping = new DicomToFHIRImagingStudyMapping();
    const pipeline = new PipelineBuilder()
        .fromPartStream().ofDicomData()
        .toMapping(mapping)
        .build();

    expect(pipeline.parser.handler instanceof DicomMappingHandler).toBe(true);
    expect(pipeline.parser.handler.mapping).toBe(mapping);
});

test("Test: toFHIRImagingStudy builds with DicomToFHIRImagingStudyMapping", () => {
    const pipeline = new PipelineBuilder()
        .fromPartStream().ofDicomData()
        .toFHIRImagingStudy()
        .build();

    expect(pipeline.parser.handler instanceof DicomMappingHandler).toBe(true);
    expect(pipeline.parser.handler.mapping instanceof DicomToFHIRImagingStudyMapping).toBe(true);
});

test("Test: build composes metadata adapter -> deid -> writer when masking JSON metadata", () => {
    const pipeline = new PipelineBuilder()
        .fromPartStream().ofDicomMetadata()
        .withMask(new Map())
        .toDicomData()
        .build();

    expect(pipeline.parser.handler instanceof DicomJsonMetadataAdapter).toBe(true);
    expect(pipeline.parser.handler.nextHandler instanceof DicomDeIdentificationFilter).toBe(true);
    expect(pipeline.parser.handler.nextHandler.nextHandler instanceof DicomDataWriterHandler).toBe(true);
});

test("Test: withDeIdentification() composes default de-identification filter", () => {
    const pipeline = new PipelineBuilder()
        .fromPartStream().ofDicomData()
        .withDeIdentification()
        .toInstances()
        .build();

    expect(pipeline.parser.handler instanceof DicomDeIdentificationFilter).toBe(true);
    expect(pipeline.parser.handler.mask instanceof Map).toBe(true);
    expect(pipeline.parser.handler.mask.size).toBeGreaterThan(0);
    expect(pipeline.parser.handler.mask.has(Tag.PatientName.ID)).toBe(true);
});

test("Test: withDeIdentification(mask) uses supplied mask", () => {
    const customMask = new Map([
        ["00100010", { ID: "00100010", Action: "Z" }]
    ]);

    const pipeline = new PipelineBuilder()
        .fromPartStream().ofDicomData()
        .withDeIdentification(customMask)
        .toInstances()
        .build();

    expect(pipeline.parser.handler instanceof DicomDeIdentificationFilter).toBe(true);
    expect(pipeline.parser.handler.mask instanceof Map).toBe(true);
    expect(pipeline.parser.handler.mask.size).toBe(1);
    expect(pipeline.parser.handler.mask.has("00100010")).toBe(true);
});

test("Test: build composes validation filter for native DICOM semantic chain", () => {
    const onConcern = () => {};
    const pipeline = new PipelineBuilder()
        .fromPartStream().ofDicomData()
        .withValidation({ goal: ValidationGoals.STRICT, onConcern })
        .toInstances()
        .build();

    expect(pipeline.parser.handler instanceof DicomValidationFilter).toBe(true);
    expect(pipeline.parser.handler.goal).toBe(ValidationGoals.STRICT);
    expect(pipeline.parser.handler.onConcern).toBe(onConcern);
    expect(pipeline.parser.handler.nextHandler instanceof DicomInstanceHandler).toBe(true);
});

test("Test: build composes metadata adapter -> validation -> deid -> writer when validation and masking JSON metadata", () => {
    const pipeline = new PipelineBuilder()
        .fromPartStream().ofDicomMetadata()
        .withValidation({ goal: "permissive" })
        .withMask(new Map())
        .toDicomData()
        .build();

    expect(pipeline.parser.handler instanceof DicomJsonMetadataAdapter).toBe(true);
    expect(pipeline.parser.handler.nextHandler instanceof DicomValidationFilter).toBe(true);
    expect(pipeline.parser.handler.nextHandler.nextHandler instanceof DicomDeIdentificationFilter).toBe(true);
    expect(pipeline.parser.handler.nextHandler.nextHandler.nextHandler instanceof DicomDataWriterHandler).toBe(true);
});

test("Test: build composes transcoding filter for native DICOM semantic chain", () => {
    const pipeline = new PipelineBuilder()
        .fromPartStream().ofDicomData()
        .withTranscoding({
            targetTransferSyntax: TransferSyntax.ImplicitVRLittleEndian.ID
        })
        .toDicomData()
        .build();

    expect(pipeline.parser.handler instanceof DicomTranscodingFilter).toBe(true);
    expect(pipeline.parser.handler.nextHandler instanceof DicomDataWriterHandler).toBe(true);
    expect(pipeline.parser.handler.targetTransferSyntax.ID).toBe(TransferSyntax.ImplicitVRLittleEndian.ID);
});

test("Test: build composes burned-in redaction filter for native DICOM semantic chain", () => {
    const pipeline = new PipelineBuilder()
        .fromPartStream().ofDicomData()
        .withBurnedInRedaction({
            regions: [{ x: 0, y: 0, width: 1, height: 1 }]
        })
        .toDicomData()
        .build();

    expect(pipeline.parser.handler instanceof DicomBurnedInRedactionFilter).toBe(true);
    expect(pipeline.parser.handler.nextHandler instanceof DicomDataWriterHandler).toBe(true);
});

test("Test: build composes a single burned-in redaction filter when redaction and transcoding are both configured", () => {
    const pipeline = new PipelineBuilder()
        .fromPartStream().ofDicomData()
        .withBurnedInRedaction({
            regions: [{ x: 0, y: 0, width: 1, height: 1 }]
        })
        .withTranscoding({
            targetTransferSyntax: TransferSyntax.JPEG2000.ID
        })
        .toDicomData()
        .build();

    expect(pipeline.parser.handler instanceof DicomBurnedInRedactionFilter).toBe(true);
    expect(pipeline.parser.handler.nextHandler instanceof DicomDataWriterHandler).toBe(true);
    expect(pipeline.parser.handler instanceof DicomTranscodingFilter).toBe(true);
    expect(pipeline.parser.handler.targetTransferSyntax.ID).toBe(TransferSyntax.JPEG2000.ID);
});

test("Test: build composes validation -> deid -> transcoding -> writer in canonical order", () => {
    const pipeline = new PipelineBuilder()
        .fromPartStream().ofDicomData()
        .withValidation({ goal: "permissive" })
        .withMask(new Map())
        .withTranscoding({
            targetTransferSyntax: TransferSyntax.ImplicitVRLittleEndian.ID
        })
        .toDicomData()
        .build();

    expect(pipeline.parser.handler instanceof DicomValidationFilter).toBe(true);
    expect(pipeline.parser.handler.nextHandler instanceof DicomDeIdentificationFilter).toBe(true);
    expect(pipeline.parser.handler.nextHandler.nextHandler instanceof DicomTranscodingFilter).toBe(true);
    expect(pipeline.parser.handler.nextHandler.nextHandler.nextHandler instanceof DicomDataWriterHandler).toBe(true);
});

test("Test: build composes XML metadata adapter with shared handler", () => {
    const pipeline = new PipelineBuilder()
        .fromPartStream().ofDicomXmlMetadata()
        .toSelection({})
        .build();

    expect(pipeline.parser instanceof XmlDataParser).toBe(true);
    expect(pipeline.parser.handler instanceof DicomXmlMetadataAdapter).toBe(true);
});

test("Test: build composes XML metadata adapter -> deid -> writer when masking XML metadata", () => {
    const pipeline = new PipelineBuilder()
        .fromPartStream().ofDicomXmlMetadata()
        .withMask(new Map())
        .toDicomData()
        .build();

    expect(pipeline.parser.handler instanceof DicomXmlMetadataAdapter).toBe(true);
    expect(pipeline.parser.handler.nextHandler instanceof DicomDeIdentificationFilter).toBe(true);
    expect(pipeline.parser.handler.nextHandler.nextHandler instanceof DicomDataWriterHandler).toBe(true);
});

test("Test: withValidation(false) disables validation composition", () => {
    const pipeline = new PipelineBuilder()
        .fromPartStream().ofDicomData()
        .withValidation(false)
        .toInstances()
        .build();

    expect(pipeline.parser.handler instanceof DicomValidationFilter).toBe(false);
    expect(pipeline.parser.handler instanceof DicomInstanceHandler).toBe(true);
});

test("Test: build uses configured custom reader", () => {
    const customReader = {
        read() {
            return Promise.resolve(null);
        },
        parser: null,
        onPart: null
    };

    const pipeline = new PipelineBuilder()
        .withReader(customReader)
        .ofDicomData()
        .toInstances()
        .build();

    expect(pipeline instanceof Pipeline).toBe(true);
    expect(pipeline.reader).toBe(customReader);
    expect(pipeline.parser instanceof DicomDataParser).toBe(true);
    expect(pipeline.parser.handler instanceof DicomInstanceHandler).toBe(true);
});

test("Test: toAssetArchive builds with DicomAssetArchiveHandler", () => {
    const pipeline = new PipelineBuilder()
        .fromPartStream()
        .ofDicomData()
        .toAssetArchive()
        .build();

    expect(pipeline.parser.handler instanceof DicomAssetArchiveHandler).toBe(true);
});

test("Test: toJsonValue builds with JsonDataHandler for JSON parser", () => {
    const pipeline = new PipelineBuilder()
        .fromPartStream()
        .ofJsonData()
        .toJsonValue()
        .build();

    expect(pipeline.parser instanceof JsonDataParser).toBe(true);
    expect(pipeline.parser.handler instanceof JsonDataHandler).toBe(true);
});

test("Test: toJsonValue builds with XmlDataHandler for XML parser", () => {
    const pipeline = new PipelineBuilder()
        .fromPartStream()
        .ofXmlData()
        .toJsonValue()
        .build();

    expect(pipeline.parser instanceof XmlDataParser).toBe(true);
    expect(pipeline.parser.handler instanceof XmlDataHandler).toBe(true);
});

test("Test: fromHttpStream builds with HttpStreamReader transport", () => {
    const pipeline = new PipelineBuilder()
        .fromHttpStream()
        .ofDicomData()
        .toInstances()
        .build();

    expect(pipeline.reader instanceof HttpStreamReader).toBe(true);
    expect(pipeline.parser instanceof DicomDataParser).toBe(true);
    expect(pipeline.parser.handler instanceof DicomInstanceHandler).toBe(true);
});

test("Test: fromByteStream builds with ByteStreamReader transport", () => {
    const pipeline = new PipelineBuilder()
        .fromByteStream()
        .ofDicomData()
        .toInstances()
        .build();

    expect(pipeline.reader instanceof ByteStreamReader).toBe(true);
    expect(pipeline.parser instanceof DicomDataParser).toBe(true);
    expect(pipeline.parser.handler instanceof DicomInstanceHandler).toBe(true);
});

test("Test: fromFileStream builds with FileStreamReader transport", () => {
    const pipeline = new PipelineBuilder()
        .fromFileStream()
        .ofDicomData()
        .toInstances()
        .build();

    expect(pipeline.reader instanceof FileStreamReader).toBe(true);
    expect(pipeline.parser instanceof DicomDataParser).toBe(true);
    expect(pipeline.parser.handler instanceof DicomInstanceHandler).toBe(true);
});

test("Test: fromWebSocketStream builds with WebSocketStreamReader transport", () => {
    const pipeline = new PipelineBuilder()
        .fromWebSocketStream()
        .ofDicomData()
        .toInstances()
        .build();

    expect(pipeline.reader instanceof WebSocketStreamReader).toBe(true);
    expect(pipeline.parser instanceof DicomDataParser).toBe(true);
    expect(pipeline.parser.handler instanceof DicomInstanceHandler).toBe(true);
});

test("Test: fromNodeStreamAdapter builds with NodeStreamAdapterReader transport", () => {
    const pipeline = new PipelineBuilder()
        .fromNodeStreamAdapter()
        .ofDicomData()
        .toInstances()
        .build();

    expect(pipeline.reader instanceof NodeStreamAdapterReader).toBe(true);
    expect(pipeline.parser instanceof DicomDataParser).toBe(true);
    expect(pipeline.parser.handler instanceof DicomInstanceHandler).toBe(true);
});

test("Test: withBulkDataPolicy applies parser bulk-data policy when parser supports it", () => {
    const pipeline = new PipelineBuilder()
        .fromPartStream()
        .ofDicomData()
        .withBulkDataPolicy({
            mode: "auto",
            knownLengthThreshold: 4096,
            hardSafetyCap: 8388608
        })
        .toInstances()
        .build();

    expect(pipeline.parser instanceof DicomDataParser).toBe(true);
    expect(pipeline.parser.bulkDataPolicy.mode).toBe("auto");
    expect(pipeline.parser.bulkDataPolicy.knownLengthThreshold).toBe(4096);
    expect(pipeline.parser.bulkDataPolicy.hardSafetyCap).toBe(8388608);
});

test("Test: build sets internal reader onPart from onEmit on configured custom reader when supported", () => {
    const onEmit = () => {};
    const customReader = {
        read() {
            return Promise.resolve(null);
        },
        parser: null,
        onPart: null
    };

    const pipeline = new PipelineBuilder()
        .withReader(customReader)
        .ofDicomData()
        .withOnEmit(onEmit)
        .toInstances()
        .build();

    expect(pipeline.reader).toBe(customReader);
    expect(pipeline.reader.onPart).toBe(onEmit);
});
