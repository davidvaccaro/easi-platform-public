import PipelineBuilder from "../../src/builders/PipelineBuilder.js";
import DicomDataParser from "../../src/parsers/DicomDataParser.js";
import ByteDataParser from "../../src/parsers/ByteDataParser.js";
import JsonDataParser from "../../src/parsers/JsonDataParser.js";
import XmlDataParser from "../../src/parsers/XmlDataParser.js";
import HttpStreamReader from "../../src/readers/HttpStreamReader.js";
import DicomwebStreamReader from "../../src/readers/DicomwebStreamReader.js";
import ByteStreamReader from "../../src/readers/ByteStreamReader.js";
import FileStreamReader from "../../src/readers/FileStreamReader.js";
import FolderStreamReader from "../../src/readers/FolderStreamReader.js";
import FolderWatchReader from "../../src/readers/FolderWatchReader.js";
import WebSocketStreamReader from "../../src/readers/WebSocketStreamReader.js";
import NodeStreamAdapterReader from "../../src/readers/NodeStreamAdapterReader.js";
import DimseAssociationReader from "../../src/readers/DimseAssociationReader.js";
import Pipeline from "../../src/pipelines/Pipeline.js";
import ImageDataParser from "../../src/parsers/ImageDataParser.js";
import MixedImagingDataParser from "../../src/parsers/MixedImagingDataParser.js";
import DicomInstanceHandler from "../../src/handlers/terminals/DicomInstanceHandler.js";
import DicomEntityHandler from "../../src/handlers/terminals/DicomEntityHandler.js";
import DicomDocumentHandler from "../../src/handlers/terminals/DicomDocumentHandler.js";
import DicomDocumentWrappingHandler from "../../src/handlers/terminals/DicomDocumentWrappingHandler.js";
import ImageDataHandler from "../../src/handlers/terminals/ImageDataHandler.js";
import MixedImagingDataHandler from "../../src/handlers/terminals/MixedImagingDataHandler.js";
import DicomDeIdentificationFilter from "../../src/handlers/filters/DicomDeIdentificationFilter.js";
import DicomValidationFilter, { ValidationGoals } from "../../src/handlers/filters/DicomValidationFilter.js";
import DicomTranscodingFilter from "../../src/handlers/filters/DicomTranscodingFilter.js";
import DicomBurnedInRedactionFilter from "../../src/handlers/filters/DicomBurnedInRedactionFilter.js";
import ImageBurnedInRedactionFilter from "../../src/handlers/filters/ImageBurnedInRedactionFilter.js";
import MixedImagingNormalizationFilter from "../../src/handlers/filters/MixedImagingNormalizationFilter.js";
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
import CodecRegistry from "../../src/codecs/CodecRegistry.js";
import Configuration from "../../src/environment/Configuration.js";
import Exception from "../../src/environment/Exception.js";
import { BuilderErrorCodes } from "../../src/environment/Exception.js";

function captureBuildError(builderOrAction) {
  try {
    if (typeof builderOrAction === "function") {
      builderOrAction();
    } else
    {
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
  expect(typeof source.fromFolderStream).toBe("function");
  expect(typeof source.fromFolderWatchStream).toBe("function");
  expect(typeof source.fromDicomweb).toBe("function");
  expect(typeof source.fromDimseAssociation).toBe("function");
  expect(typeof source.ofDicomData).toBe("undefined");
  expect(typeof source.toInstances).toBe("undefined");
  expect(typeof source.withDeIdentification).toBe("undefined");
  expect(typeof source.build).toBe("undefined");
  expect(source._operations).toBeUndefined();
  expect(Object.isFrozen(source)).toBe(true);

  const format = source.fromPartStream();
  expect(typeof format.ofDicomData).toBe("function");
  expect(typeof format.ofByteData).toBe("function");
  expect(typeof format.ofImageData).toBe("function");
  expect(typeof format.ofMixedImagingData).toBe("function");
  expect(typeof format.toInstances).toBe("undefined");
  expect(typeof format.withDeIdentification).toBe("undefined");

  const target = format.ofDicomData();
  expect(typeof target.toInstances).toBe("function");
  expect(typeof target.toImageData).toBe("function");
  expect(typeof target.toImagingData).toBe("function");
  expect(typeof target.withDeIdentification).toBe("function");
  expect(typeof target.withTranscoding).toBe("function");
  expect(typeof target.withBurnedInRedaction).toBe("function");
  expect(typeof target.withNormalization).toBe("function");

  const ready = target.withDeIdentification(new Map()).toInstances();
  expect(typeof ready.withDeIdentification).toBe("undefined");
  expect(typeof ready.intoByteBuffer).toBe("function");
  expect(typeof ready.intoPartBuffer).toBe("function");
  expect(typeof ready.intoWritableStream).toBe("function");
  expect(typeof ready.intoDimseAssociation).toBe("function");
  expect(typeof ready.intoBrowserFileStream).toBe("function");
  expect(typeof ready.build).toBe("function");
  expect(ready._operations).toBeUndefined();
  expect(Object.isFrozen(ready)).toBe(true);
});

test("Test: fromFolderStream + ofImageData + toImageData wires folder/image pipeline", () => {
  const pipeline = new PipelineBuilder().
  fromFolderStream().
  ofImageData().
  toImageData().
  build();

  expect(pipeline.reader instanceof FolderStreamReader).toBe(true);
  expect(pipeline.parser instanceof ImageDataParser).toBe(true);
  expect(pipeline.handler instanceof ImageDataHandler).toBe(true);
});

test("Test: fromFolderWatchStream wires source-bound folder watcher reader", () => {
  const pipeline = new PipelineBuilder().
  fromFolderWatchStream("/tmp/inbox").
  ofMixedImagingData().
  toImagingData().
  build();

  expect(pipeline.reader instanceof FolderWatchReader).toBe(true);
  expect(pipeline.reader.isSourceBound).toBe(true);
});

test("Test: ofMixedImagingData + toImagingData wires mixed imaging parser/handler", () => {
  const pipeline = new PipelineBuilder().
  fromByteStream().
  ofMixedImagingData().
  toImagingData().
  build();

  expect(pipeline.parser instanceof MixedImagingDataParser).toBe(true);
  expect(pipeline.handler instanceof MixedImagingDataHandler).toBe(true);
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

  const pipeline = new PipelineBuilder().
  withReader(customReader).
  ofDicomData().
  toInstances().
  withWriter(writer, "sink-target", { custom: true }).
  build();

  const result = await pipeline.process({ source: new Uint8Array([9]) });

  expect(writer.write).toHaveBeenCalledTimes(1);
  expect(writer.write).toHaveBeenCalledWith(
  "sink-target",
  expect.any(Uint8Array),
  { custom: true });

  expect(result.count).toBe(1);
  expect(result.first()).toEqual({ ok: true });
});

test("Test: process() uses early-bound source configured by from* stage", async () => {
  const customReader = {
    read: jest.fn().mockResolvedValue({ ok: true }),
    parser: null,
    onPart: null
  };

  const pipeline = new PipelineBuilder().
  withReader(customReader, "bound-source", { contentType: "application/dicom" }).
  ofDicomData().
  toInstances().
  build();

  const result = await pipeline.process();

  expect(customReader.read).toHaveBeenCalledWith(
  "bound-source",
  { contentType: "application/dicom" });

  expect(result.ok).toBe(true);
});

test("Test: process(source, destination, options) supports late-bound destination and split option scopes", async () => {
  const customReader = {
    read: jest.fn().mockResolvedValue(new Uint8Array([1, 2, 3])),
    parser: null,
    onPart: null
  };

  const writer = {
    write: jest.fn().mockResolvedValue({ ok: true })
  };

  const pipeline = new PipelineBuilder().
  withReader(customReader, "bound-source", { defaultRead: true }).
  ofDicomData().
  toInstances().
  withWriter(writer, null, { defaultWrite: true }).
  build();

  const result = await pipeline.process(
  "runtime-source",
  "runtime-destination",
  {
    sourceOptions: { runtimeRead: true },
    destinationOptions: { runtimeWrite: true }
  });


  expect(customReader.read).toHaveBeenCalledWith(
  "runtime-source",
  { defaultRead: true, runtimeRead: true });

  expect(writer.write).toHaveBeenCalledWith(
  "runtime-destination",
  expect.any(Uint8Array),
  { defaultWrite: true, runtimeWrite: true });

  expect(result.ok).toBe(true);
});

test("Test: build throws MissingParser", () => {
  const error = captureBuildError(
  new PipelineBuilder().
  fromPartStream().
  withParser(null).
  toInstances());


  expect(error instanceof Exception).toBe(true);
  expect(error.code).toBe(BuilderErrorCodes.MissingParser);
});

test("Test: build throws MissingHandler", () => {
  const error = captureBuildError(
  new PipelineBuilder().
  fromPartStream().
  withParser(new DicomDataParser()).
  withHandler(null));


  expect(error instanceof Exception).toBe(true);
  expect(error.code).toBe(BuilderErrorCodes.MissingHandler);
});

test("Test: build throws InvalidParser", () => {
  const error = captureBuildError(
  new PipelineBuilder().
  fromPartStream().
  withParser({ reset() {} }).
  toInstances());


  expect(error instanceof Exception).toBe(true);
  expect(error.code).toBe(BuilderErrorCodes.InvalidParser);
});

test("Test: build throws InvalidHandler", () => {
  const error = captureBuildError(
  new PipelineBuilder().
  fromPartStream().
  ofDicomData().
  withHandler(123));


  expect(error instanceof Exception).toBe(true);
  expect(error.code).toBe(BuilderErrorCodes.InvalidHandler);
});

test("Test: build throws InvalidReader", () => {
  const error = captureBuildError(
  new PipelineBuilder().
  withReader({}).
  ofDicomData().
  toInstances());


  expect(error instanceof Exception).toBe(true);
  expect(error.code).toBe(BuilderErrorCodes.InvalidReader);
});

test("Test: build throws InvalidCodecRegistry when withCodecRegistry receives non-CodecRegistry object", () => {
  const error = captureBuildError(
  new PipelineBuilder().
  fromPartStream().
  ofDicomData().
  withCodecRegistry({}).
  toInstances());


  expect(error instanceof Exception).toBe(true);
  expect(error.code).toBe(BuilderErrorCodes.InvalidCodecRegistry);
});

test("Test: build throws InvalidCodecRegistry when codec registry validation fails", () => {
  const codecRegistry = new CodecRegistry();

  const error = captureBuildError(
  new PipelineBuilder().
  fromPartStream().
  ofDicomData().
  withCodecRegistry(codecRegistry).
  toInstances());


  expect(error instanceof Exception).toBe(true);
  expect(error.code).toBe(BuilderErrorCodes.InvalidCodecRegistry);
});

test("Test: build accepts independent default codec registry from Configuration.createDefaultCodecRegistry", () => {
  const codecRegistry = Configuration.createDefaultCodecRegistry();

  const pipeline = new PipelineBuilder().
  fromPartStream().
  ofDicomData().
  withCodecRegistry(codecRegistry).
  toAssetArchive().
  build();

  expect(pipeline instanceof Pipeline).toBe(true);
  expect(pipeline.parser.handler instanceof DicomAssetArchiveHandler).toBe(true);
  expect(pipeline.parser.handler.codecRegistry).toBe(codecRegistry);
});

test("Test: build throws InvalidOnEmit", () => {
  const error = captureBuildError(
  new PipelineBuilder().
  fromPartStream().
  ofDicomData().
  withOnEmit(123).
  toInstances());


  expect(error instanceof Exception).toBe(true);
  expect(error.code).toBe(BuilderErrorCodes.InvalidOnEmit);
});

test("Test: build throws IncompatibleOnEmitAndReader", () => {
  const error = captureBuildError(
  new PipelineBuilder().
  withReader({
    read() {
      return Promise.resolve(null);
    }
  }).
  ofDicomData().
  withOnEmit(() => {}).
  toInstances());


  expect(error instanceof Exception).toBe(true);
  expect(error.code).toBe(BuilderErrorCodes.IncompatibleOnEmitAndReader);
});

test("Test: build throws IncompatibleParserAndHandler", () => {
  const error = captureBuildError(
  new PipelineBuilder().
  fromPartStream().
  withParser(new JsonDataParser()).
  withHandler(new DicomDataWriterHandler()));


  expect(error instanceof Exception).toBe(true);
  expect(error.code).toBe(BuilderErrorCodes.IncompatibleParserAndHandler);
});

test("Test: build throws IncompatibleParserAndHandler for toStructuredValue with DICOM parser", () => {
  const error = captureBuildError(
  new PipelineBuilder().
  fromPartStream().ofDicomData().
  toStructuredValue());


  expect(error instanceof Exception).toBe(true);
  expect(error.code).toBe(BuilderErrorCodes.IncompatibleParserAndHandler);
});

test("Test: build throws IncompatibleParserAndHandler for toAssets with DICOM metadata parser", () => {
  const error = captureBuildError(
  new PipelineBuilder().
  fromPartStream().ofDicomMetadata().
  toAssets({
    metadata: {
      mapping: {}
    }
  }));


  expect(error instanceof Exception).toBe(true);
  expect(error.code).toBe(BuilderErrorCodes.IncompatibleParserAndHandler);
});

test("Test: build throws IncompatibleParserAndHandler for toAssetArchive with DICOM metadata parser", () => {
  const error = captureBuildError(
  new PipelineBuilder().
  fromPartStream().ofDicomMetadata().
  toAssetArchive());


  expect(error instanceof Exception).toBe(true);
  expect(error.code).toBe(BuilderErrorCodes.IncompatibleParserAndHandler);
});

test("Test: build throws IncompatibleDeIdentificationAndParser", () => {
  const error = captureBuildError(
  new PipelineBuilder().
  fromPartStream().
  withParser(new JsonDataParser()).
  withDeIdentification(new Map()).
  withHandler({}));


  expect(error instanceof Exception).toBe(true);
  expect(error.code).toBe(BuilderErrorCodes.IncompatibleDeIdentificationAndParser);
});

test("Test: build throws IncompatibleValidationAndParser", () => {
  const error = captureBuildError(
  new PipelineBuilder().
  fromPartStream().
  withParser(new JsonDataParser()).
  withValidation().
  withHandler({}));


  expect(error instanceof Exception).toBe(true);
  expect(error.code).toBe(BuilderErrorCodes.IncompatibleValidationAndParser);
});

test("Test: build throws IncompatibleTranscodingAndParser", () => {
  const error = captureBuildError(
  new PipelineBuilder().
  fromPartStream().
  withParser(new JsonDataParser()).
  withTranscoding(TransferSyntax.ImplicitVRLittleEndian.ID).
  withHandler({}));


  expect(error instanceof Exception).toBe(true);
  expect(error.code).toBe(BuilderErrorCodes.IncompatibleTranscodingAndParser);
});

test("Test: build throws IncompatibleBurnedInRedactionAndParser", () => {
  const error = captureBuildError(
  new PipelineBuilder().
  fromPartStream().
  withParser(new JsonDataParser()).
  withBurnedInRedaction({
    regions: []
  }).
  withHandler({}));


  expect(error instanceof Exception).toBe(true);
  expect(error.code).toBe(BuilderErrorCodes.IncompatibleBurnedInRedactionAndParser);
});

test("Test: build throws IncompatibleNormalizationAndParser", () => {
  const error = captureBuildError(
  new PipelineBuilder().
  fromPartStream().
  withParser(new JsonDataParser()).
  withNormalization((normalize) => normalize.toFrames()).
  withHandler({}));


  expect(error instanceof Exception).toBe(true);
  expect(error.code).toBe(BuilderErrorCodes.IncompatibleNormalizationAndParser);
});

test("Test: repeated build with masking preserves canonical semantic handler chain", () => {
  const ready = new PipelineBuilder().
  fromPartStream().ofDicomData().
  withDeIdentification(new Map()).
  toInstances();

  const first = ready.build();
  const second = ready.build();

  expect(first.parser.handler instanceof DicomDeIdentificationFilter).toBe(true);
  expect(first.parser.handler.nextHandler instanceof DicomInstanceHandler).toBe(true);
  expect(second.parser.handler instanceof DicomDeIdentificationFilter).toBe(true);
  expect(second.parser.handler.nextHandler instanceof DicomInstanceHandler).toBe(true);
  expect(second.parser.handler.nextHandler.nextHandler).toBeUndefined();
});

test("Test: build composes metadata adapter with shared handler", () => {
  const pipeline = new PipelineBuilder().
  fromPartStream().ofDicomMetadata().
  toSelection({}).
  build();

  expect(pipeline instanceof Pipeline).toBe(true);
  expect(pipeline.parser instanceof JsonDataParser).toBe(true);
  expect(pipeline.parser.handler instanceof DicomJsonMetadataAdapter).toBe(true);
});

test("Test: toEntities builds with DicomEntityHandler for native DICOM parser", () => {
  const pipeline = new PipelineBuilder().
  fromPartStream().ofDicomData().
  toEntities().
  build();

  expect(pipeline.parser instanceof DicomDataParser).toBe(true);
  expect(pipeline.parser.handler instanceof DicomEntityHandler).toBe(true);
});

test("Test: toEntities composes JSON metadata adapter for metadata parser", () => {
  const pipeline = new PipelineBuilder().
  fromPartStream().ofDicomMetadata().
  toEntities().
  build();

  expect(pipeline.parser instanceof JsonDataParser).toBe(true);
  expect(pipeline.parser.handler instanceof DicomJsonMetadataAdapter).toBe(true);
  expect(pipeline.parser.handler.nextHandler instanceof DicomEntityHandler).toBe(true);
});

test("Test: toUnwrappedDocuments builds with DicomDocumentHandler for native DICOM parser", () => {
  const pipeline = new PipelineBuilder().
  fromPartStream().ofDicomData().
  toUnwrappedDocuments().
  build();

  expect(pipeline.parser instanceof DicomDataParser).toBe(true);
  expect(pipeline.parser.handler instanceof DicomDocumentHandler).toBe(true);
});

test("Test: build throws IncompatibleParserAndHandler for toUnwrappedDocuments with metadata parser", () => {
  const error = captureBuildError(
  new PipelineBuilder().
  fromPartStream().
  ofDicomMetadata().
  toUnwrappedDocuments());


  expect(error instanceof Exception).toBe(true);
  expect(error.code).toBe(BuilderErrorCodes.IncompatibleParserAndHandler);
});

test("Test: toWrappedDocuments builds with DicomDocumentWrappingHandler for JSON parser", () => {
  const pipeline = new PipelineBuilder().
  fromPartStream().ofJsonData().
  toWrappedDocuments().
  build();

  expect(pipeline.parser instanceof JsonDataParser).toBe(true);
  expect(pipeline.parser.handler instanceof DicomDocumentWrappingHandler).toBe(true);
});

test("Test: build throws IncompatibleParserAndHandler for toWrappedDocuments with native DICOM parser", () => {
  const error = captureBuildError(
  new PipelineBuilder().
  fromPartStream().
  ofDicomData().
  toWrappedDocuments());


  expect(error instanceof Exception).toBe(true);
  expect(error.code).toBe(BuilderErrorCodes.IncompatibleParserAndHandler);
});

test("Test: toWrappedDocuments builds with DicomDocumentWrappingHandler for byte parser", () => {
  const pipeline = new PipelineBuilder().
  fromByteStream().ofByteData().
  toWrappedDocuments({ mimeType: "application/pdf" }).
  build();

  expect(pipeline.parser instanceof ByteDataParser).toBe(true);
  expect(pipeline.parser.handler instanceof DicomDocumentWrappingHandler).toBe(true);
});

test("Test: build throws IncompatibleParserAndHandler for byte parser with toInstances", () => {
  const error = captureBuildError(
  new PipelineBuilder().
  fromByteStream().
  ofByteData().
  toInstances());


  expect(error instanceof Exception).toBe(true);
  expect(error.code).toBe(BuilderErrorCodes.IncompatibleParserAndHandler);
});

test("Test: toMapping builds with DicomMappingHandler", () => {
  const mapping = new DicomToFHIRImagingStudyMapping();
  const pipeline = new PipelineBuilder().
  fromPartStream().ofDicomData().
  toMapping(mapping).
  build();

  expect(pipeline.parser.handler instanceof DicomMappingHandler).toBe(true);
  expect(pipeline.parser.handler.mapping).toBe(mapping);
});

test("Test: toFHIRImagingStudy builds with DicomToFHIRImagingStudyMapping", () => {
  const pipeline = new PipelineBuilder().
  fromPartStream().ofDicomData().
  toFHIRImagingStudy().
  build();

  expect(pipeline.parser.handler instanceof DicomMappingHandler).toBe(true);
  expect(pipeline.parser.handler.mapping instanceof DicomToFHIRImagingStudyMapping).toBe(true);
  expect(pipeline.parser.handler.mapping.profile).toBe("full");
});

test("Test: toFHIRImagingStudy supports study-summary profile", () => {
  const pipeline = new PipelineBuilder().
  fromPartStream().ofDicomData().
  toFHIRImagingStudy("study-summary").
  build();

  expect(pipeline.parser.handler instanceof DicomMappingHandler).toBe(true);
  expect(pipeline.parser.handler.mapping instanceof DicomToFHIRImagingStudyMapping).toBe(true);
  expect(pipeline.parser.handler.mapping.profile).toBe("study-summary");
});

test("Test: toFHIRImagingStudy forwards FHIR mapping options through the metadata adapter", () => {
  const pipeline = new PipelineBuilder().
  fromPartStream().ofDicomMetadata().
  toFHIRImagingStudy({
    profile: "study-summary",
    subjectMode: "reference",
    subject: "Patient/example",
    status: "registered",
    identifierSystems: { patient: "https://example.org/patients" }
  }).build();

  expect(pipeline.parser.handler instanceof DicomJsonMetadataAdapter).toBe(true);
  const mapping = pipeline.parser.handler.nextHandler.mapping;
  expect(mapping.profile).toBe("study-summary");
  expect(mapping.subjectMode).toBe("reference");
  expect(mapping.identifierSystems.patient).toBe("https://example.org/patients");
});

test.each([null, [], 5, true])("Test: toFHIRImagingStudy rejects invalid options %p", (options) => {
  expect(() => new PipelineBuilder().fromPartStream().ofDicomMetadata().toFHIRImagingStudy(options)).
  toThrow("profile name or mapping options object");
});

test("Test: build composes metadata adapter -> deid -> writer when masking JSON metadata", () => {
  const pipeline = new PipelineBuilder().
  fromPartStream().ofDicomMetadata().
  withDeIdentification(new Map()).
  toDicomData().
  build();

  expect(pipeline.parser.handler instanceof DicomJsonMetadataAdapter).toBe(true);
  expect(pipeline.parser.handler.nextHandler instanceof DicomDeIdentificationFilter).toBe(true);
  expect(pipeline.parser.handler.nextHandler.nextHandler instanceof DicomDataWriterHandler).toBe(true);
});

test("Test: withDeIdentification() composes default de-identification filter", () => {
  const pipeline = new PipelineBuilder().
  fromPartStream().ofDicomData().
  withDeIdentification().
  toInstances().
  build();

  expect(pipeline.parser.handler instanceof DicomDeIdentificationFilter).toBe(true);
  expect(pipeline.parser.handler.deIdentificationMask instanceof Map).toBe(true);
  expect(pipeline.parser.handler.deIdentificationMask.size).toBeGreaterThan(0);
  expect(pipeline.parser.handler.deIdentificationMask.has(Tag.PatientName.ID)).toBe(true);
});

test("Test: withDeIdentification(mask) uses supplied mask", () => {
  const customMask = new Map([
  ["00100010", { ID: "00100010", Action: "Z" }]]);


  const pipeline = new PipelineBuilder().
  fromPartStream().ofDicomData().
  withDeIdentification(customMask).
  toInstances().
  build();

  expect(pipeline.parser.handler instanceof DicomDeIdentificationFilter).toBe(true);
  expect(pipeline.parser.handler.deIdentificationMask instanceof Map).toBe(true);
  expect(pipeline.parser.handler.deIdentificationMask.size).toBe(1);
  expect(pipeline.parser.handler.deIdentificationMask.has("00100010")).toBe(true);
});

test("Test: build composes validation filter for native DICOM semantic chain", () => {
  const onConcern = () => {};
  const pipeline = new PipelineBuilder().
  fromPartStream().ofDicomData().
  withValidation({ goal: ValidationGoals.STRICT, onConcern }).
  toInstances().
  build();

  expect(pipeline.parser.handler instanceof DicomValidationFilter).toBe(true);
  expect(pipeline.parser.handler.goal).toBe(ValidationGoals.STRICT);
  expect(pipeline.parser.handler.onConcern).toBe(onConcern);
  expect(pipeline.parser.handler.nextHandler instanceof DicomInstanceHandler).toBe(true);
});

test("Test: build composes metadata adapter -> validation -> deid -> writer when validation and masking JSON metadata", () => {
  const pipeline = new PipelineBuilder().
  fromPartStream().ofDicomMetadata().
  withValidation({ goal: "permissive" }).
  withDeIdentification(new Map()).
  toDicomData().
  build();

  expect(pipeline.parser.handler instanceof DicomJsonMetadataAdapter).toBe(true);
  expect(pipeline.parser.handler.nextHandler instanceof DicomValidationFilter).toBe(true);
  expect(pipeline.parser.handler.nextHandler.nextHandler instanceof DicomDeIdentificationFilter).toBe(true);
  expect(pipeline.parser.handler.nextHandler.nextHandler.nextHandler instanceof DicomDataWriterHandler).toBe(true);
});

test("Test: build composes transcoding filter for native DICOM semantic chain", () => {
  const pipeline = new PipelineBuilder().
  fromPartStream().ofDicomData().
  withTranscoding({
    targetTransferSyntax: TransferSyntax.ImplicitVRLittleEndian.ID
  }).
  toDicomData().
  build();

  expect(pipeline.parser.handler instanceof DicomTranscodingFilter).toBe(true);
  expect(pipeline.parser.handler.nextHandler instanceof DicomDataWriterHandler).toBe(true);
  expect(pipeline.parser.handler.targetTransferSyntax.ID).toBe(TransferSyntax.ImplicitVRLittleEndian.ID);
});

test("Test: build composes burned-in redaction filter for native DICOM semantic chain", () => {
  const pipeline = new PipelineBuilder().
  fromPartStream().ofDicomData().
  withBurnedInRedaction({
    regions: [{ x: 0, y: 0, width: 1, height: 1 }]
  }).
  toDicomData().
  build();

  expect(pipeline.parser.handler instanceof DicomBurnedInRedactionFilter).toBe(true);
  expect(pipeline.parser.handler.nextHandler instanceof DicomDataWriterHandler).toBe(true);
});

test("Test: build composes burned-in redaction filter for standard image parser chain", () => {
  const pipeline = new PipelineBuilder().
  fromByteStream().ofImageData().
  withBurnedInRedaction({
    regions: [{ x: 0, y: 0, width: 1, height: 1 }]
  }).
  toImageData().
  build();

  expect(pipeline.parser.handler instanceof ImageBurnedInRedactionFilter).toBe(true);
  expect(pipeline.parser.handler.nextHandler instanceof ImageDataHandler).toBe(true);
});

test("Test: build composes mixed imaging normalization filter for mixed parser chain", () => {
  const pipeline = new PipelineBuilder().
  fromByteStream().ofMixedImagingData().
  withNormalization((normalize) => normalize.toDicom()).
  toImagingData().
  build();

  expect(pipeline.parser.handler instanceof MixedImagingNormalizationFilter).toBe(true);
  expect(pipeline.parser.handler.nextHandler instanceof MixedImagingDataHandler).toBe(true);
});

test("Test: build composes a single burned-in redaction filter when redaction and transcoding are both configured", () => {
  const pipeline = new PipelineBuilder().
  fromPartStream().ofDicomData().
  withBurnedInRedaction({
    regions: [{ x: 0, y: 0, width: 1, height: 1 }]
  }).
  withTranscoding({
    targetTransferSyntax: TransferSyntax.JPEG2000.ID
  }).
  toDicomData().
  build();

  expect(pipeline.parser.handler instanceof DicomBurnedInRedactionFilter).toBe(true);
  expect(pipeline.parser.handler.nextHandler instanceof DicomDataWriterHandler).toBe(true);
  expect(pipeline.parser.handler instanceof DicomTranscodingFilter).toBe(true);
  expect(pipeline.parser.handler.targetTransferSyntax.ID).toBe(TransferSyntax.JPEG2000.ID);
});

test("Test: build composes validation -> deid -> transcoding -> writer in canonical order", () => {
  const pipeline = new PipelineBuilder().
  fromPartStream().ofDicomData().
  withValidation({ goal: "permissive" }).
  withDeIdentification(new Map()).
  withTranscoding({
    targetTransferSyntax: TransferSyntax.ImplicitVRLittleEndian.ID
  }).
  toDicomData().
  build();

  expect(pipeline.parser.handler instanceof DicomValidationFilter).toBe(true);
  expect(pipeline.parser.handler.nextHandler instanceof DicomDeIdentificationFilter).toBe(true);
  expect(pipeline.parser.handler.nextHandler.nextHandler instanceof DicomTranscodingFilter).toBe(true);
  expect(pipeline.parser.handler.nextHandler.nextHandler.nextHandler instanceof DicomDataWriterHandler).toBe(true);
});

test("Test: build composes XML metadata adapter with shared handler", () => {
  const pipeline = new PipelineBuilder().
  fromPartStream().ofDicomXmlMetadata().
  toSelection({}).
  build();

  expect(pipeline.parser instanceof XmlDataParser).toBe(true);
  expect(pipeline.parser.handler instanceof DicomXmlMetadataAdapter).toBe(true);
});

test("Test: build composes XML metadata adapter -> deid -> writer when masking XML metadata", () => {
  const pipeline = new PipelineBuilder().
  fromPartStream().ofDicomXmlMetadata().
  withDeIdentification(new Map()).
  toDicomData().
  build();

  expect(pipeline.parser.handler instanceof DicomXmlMetadataAdapter).toBe(true);
  expect(pipeline.parser.handler.nextHandler instanceof DicomDeIdentificationFilter).toBe(true);
  expect(pipeline.parser.handler.nextHandler.nextHandler instanceof DicomDataWriterHandler).toBe(true);
});

test("Test: withValidation(false) disables validation composition", () => {
  const pipeline = new PipelineBuilder().
  fromPartStream().ofDicomData().
  withValidation(false).
  toInstances().
  build();

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

  const pipeline = new PipelineBuilder().
  withReader(customReader).
  ofDicomData().
  toInstances().
  build();

  expect(pipeline instanceof Pipeline).toBe(true);
  expect(pipeline.reader).toBe(customReader);
  expect(pipeline.parser instanceof DicomDataParser).toBe(true);
  expect(pipeline.parser.handler instanceof DicomInstanceHandler).toBe(true);
});

test("Test: toAssetArchive builds with DicomAssetArchiveHandler", () => {
  const pipeline = new PipelineBuilder().
  fromPartStream().
  ofDicomData().
  toAssetArchive().
  build();

  expect(pipeline.parser.handler instanceof DicomAssetArchiveHandler).toBe(true);
});

test("Test: toStructuredValue builds with JsonDataHandler for JSON parser", () => {
  const pipeline = new PipelineBuilder().
  fromPartStream().
  ofJsonData().
  toStructuredValue().
  build();

  expect(pipeline.parser instanceof JsonDataParser).toBe(true);
  expect(pipeline.parser.handler instanceof JsonDataHandler).toBe(true);
});

test("Test: toStructuredValue builds with XmlDataHandler for XML parser", () => {
  const pipeline = new PipelineBuilder().
  fromPartStream().
  ofXmlData().
  toStructuredValue().
  build();

  expect(pipeline.parser instanceof XmlDataParser).toBe(true);
  expect(pipeline.parser.handler instanceof XmlDataHandler).toBe(true);
});

test("Test: fromHttpStream builds with HttpStreamReader transport", () => {
  const pipeline = new PipelineBuilder().
  fromHttpStream().
  ofDicomData().
  toInstances().
  build();

  expect(pipeline.reader instanceof HttpStreamReader).toBe(true);
  expect(pipeline.parser instanceof DicomDataParser).toBe(true);
  expect(pipeline.parser.handler instanceof DicomInstanceHandler).toBe(true);
});

test("Test: fromDicomweb builds with DicomwebStreamReader transport", () => {
  const pipeline = new PipelineBuilder().
  fromDicomweb().
  ofDicomData().
  toInstances().
  build();

  expect(pipeline.reader instanceof DicomwebStreamReader).toBe(true);
  expect(pipeline.parser instanceof DicomDataParser).toBe(true);
  expect(pipeline.parser.handler instanceof DicomInstanceHandler).toBe(true);
});

test("Test: fromByteStream builds with ByteStreamReader transport", () => {
  const pipeline = new PipelineBuilder().
  fromByteStream().
  ofDicomData().
  toInstances().
  build();

  expect(pipeline.reader instanceof ByteStreamReader).toBe(true);
  expect(pipeline.parser instanceof DicomDataParser).toBe(true);
  expect(pipeline.parser.handler instanceof DicomInstanceHandler).toBe(true);
});

test("Test: fromFileStream builds with FileStreamReader transport", () => {
  const pipeline = new PipelineBuilder().
  fromFileStream().
  ofDicomData().
  toInstances().
  build();

  expect(pipeline.reader instanceof FileStreamReader).toBe(true);
  expect(pipeline.parser instanceof DicomDataParser).toBe(true);
  expect(pipeline.parser.handler instanceof DicomInstanceHandler).toBe(true);
});

test("Test: fromWebSocketStream builds with WebSocketStreamReader transport", () => {
  const pipeline = new PipelineBuilder().
  fromWebSocketStream().
  ofDicomData().
  toInstances().
  build();

  expect(pipeline.reader instanceof WebSocketStreamReader).toBe(true);
  expect(pipeline.parser instanceof DicomDataParser).toBe(true);
  expect(pipeline.parser.handler instanceof DicomInstanceHandler).toBe(true);
});

test("Test: fromNodeStreamAdapter builds with NodeStreamAdapterReader transport", () => {
  const pipeline = new PipelineBuilder().
  fromNodeStreamAdapter().
  ofDicomData().
  toInstances().
  build();

  expect(pipeline.reader instanceof NodeStreamAdapterReader).toBe(true);
  expect(pipeline.parser instanceof DicomDataParser).toBe(true);
  expect(pipeline.parser.handler instanceof DicomInstanceHandler).toBe(true);
});

test("Test: fromDimseAssociation builds with DimseAssociationReader transport", () => {
  const sourceTransport = {
    read() {
      return Promise.resolve({
        data: new Uint8Array([0x00])
      });
    }
  };

  const pipeline = new PipelineBuilder().
  fromDimseAssociation({
    host: "127.0.0.1",
    port: 104,
    callingAeTitle: "EASI",
    calledAeTitle: "PACS"
  }, sourceTransport).
  ofDicomData().
  toInstances().
  build();

  expect(pipeline.reader instanceof DimseAssociationReader).toBe(true);
  expect(pipeline.parser instanceof DicomDataParser).toBe(true);
  expect(pipeline.parser.handler instanceof DicomInstanceHandler).toBe(true);
});

test("Test: build throws IncompatibleReaderAndParser for DIMSE reader with JSON parser", () => {
  const sourceTransport = {
    read() {
      return Promise.resolve({
        data: new Uint8Array([0x00])
      });
    }
  };

  const error = captureBuildError(
  new PipelineBuilder().
  fromDimseAssociation({
    host: "127.0.0.1",
    port: 104,
    callingAeTitle: "EASI",
    calledAeTitle: "PACS"
  }, sourceTransport).
  ofJsonData().
  toStructuredValue());


  expect(error instanceof Exception).toBe(true);
  expect(error.code).toBe(BuilderErrorCodes.IncompatibleReaderAndParser);
});

test("Test: build throws IncompatibleWriterAndHandler for DIMSE writer without DICOM data terminal", () => {
  const destinationTransport = {
    write() {
      return Promise.resolve({
        ok: true,
        dimseStatus: 0x0000,
        bytesWritten: 0
      });
    }
  };

  const error = captureBuildError(
  new PipelineBuilder().
  fromPartStream().
  ofDicomData().
  toInstances().
  intoDimseAssociation({
    host: "127.0.0.1",
    port: 104,
    callingAeTitle: "EASI",
    calledAeTitle: "PACS"
  }, {
    transport: destinationTransport
  }));


  expect(error instanceof Exception).toBe(true);
  expect(error.code).toBe(BuilderErrorCodes.IncompatibleWriterAndHandler);
});

test("Test: intoDimseAssociation builds with DimseAssociationWriter when terminal emits DICOM bytes", () => {
  const destinationTransport = {
    write() {
      return Promise.resolve({
        ok: true,
        dimseStatus: 0x0000,
        bytesWritten: 0
      });
    }
  };

  const pipeline = new PipelineBuilder().
  fromPartStream().
  ofDicomData().
  toDicomData().
  intoDimseAssociation({
    host: "127.0.0.1",
    port: 104,
    callingAeTitle: "EASI",
    calledAeTitle: "PACS"
  }, {
    transport: destinationTransport
  }).
  build();

  expect(pipeline instanceof Pipeline).toBe(true);
  expect(pipeline.parser instanceof DicomDataParser).toBe(true);
  expect(pipeline.parser.handler instanceof DicomDataWriterHandler).toBe(true);
});

test("Test: fromDimseAssociation supports late-bound source transport at process-time", () => {
  const pipeline = new PipelineBuilder().
  fromDimseAssociation({
    host: "127.0.0.1",
    port: 104,
    callingAeTitle: "EASI",
    calledAeTitle: "PACS"
  }).
  ofDicomData().
  toInstances().
  build();

  expect(pipeline instanceof Pipeline).toBe(true);
  expect(pipeline.reader instanceof DimseAssociationReader).toBe(true);
});

test("Test: intoDimseAssociation supports late-bound destination transport at process-time", () => {
  const pipeline = new PipelineBuilder().
  fromPartStream().
  ofDicomData().
  toDicomData().
  intoDimseAssociation({
    host: "127.0.0.1",
    port: 104,
    callingAeTitle: "EASI",
    calledAeTitle: "PACS"
  }).
  build();

  expect(pipeline instanceof Pipeline).toBe(true);
  expect(pipeline.parser.handler instanceof DicomDataWriterHandler).toBe(true);
});

test("Test: withBulkDataPolicy applies parser bulk-data policy when parser supports it", () => {
  const pipeline = new PipelineBuilder().
  fromPartStream().
  ofDicomData().
  withBulkDataPolicy({
    mode: "auto",
    knownLengthThreshold: 4096,
    hardSafetyCap: 8388608
  }).
  toInstances().
  build();

  expect(pipeline.parser instanceof DicomDataParser).toBe(true);
  expect(pipeline.parser.bulkDataPolicy.mode).toBe("auto");
  expect(pipeline.parser.bulkDataPolicy.knownLengthThreshold).toBe(4096);
  expect(pipeline.parser.bulkDataPolicy.hardSafetyCap).toBe(8388608);
});

test("Test: withBulkDataPolicy applies internal DICOM normalization parser policy for mixed imaging pipelines", () => {
  const pipeline = new PipelineBuilder().
  fromByteStream().
  ofMixedImagingData().
  withBulkDataPolicy({
    mode: "materialize",
    knownLengthThreshold: 2048,
    hardSafetyCap: 65536
  }).
  withNormalization((normalize) => normalize.toFrames()).
  toImageData().
  build();

  expect(pipeline.parser instanceof MixedImagingDataParser).toBe(true);
  expect(pipeline.parser.handler instanceof MixedImagingNormalizationFilter).toBe(true);

  const normalizationFilter = pipeline.parser.handler;
  expect(normalizationFilter.dicomParserBulkDataPolicy).toBeDefined();
  expect(normalizationFilter.dicomParserBulkDataPolicy.mode).toBe("materialize");
  expect(normalizationFilter.dicomParserBulkDataPolicy.knownLengthThreshold).toBe(2048);
  expect(normalizationFilter.dicomParserBulkDataPolicy.hardSafetyCap).toBe(65536);
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

  const pipeline = new PipelineBuilder().
  withReader(customReader).
  ofDicomData().
  withOnEmit(onEmit).
  toInstances().
  build();

  expect(pipeline.reader).toBe(customReader);
  expect(pipeline.reader.onPart).toBe(onEmit);
});
