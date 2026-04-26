import PipelineBuilder from "../../src/builders/PipelineBuilder.js";
import Tag from "../../src/dicom/Tag.js";
import Exception from "../../src/environment/Exception.js";
import { GeneralErrorCodes } from "../../src/environment/Exception.js";

const path = require("path");
const fs = require("fs");

function resolveRepoRoot() {
  const cwd = process.cwd();
  if (path.basename(cwd) === "easi-js") {
    return path.resolve(cwd, "..");
  }
  if (fs.existsSync(path.join(cwd, "easi-js"))) {
    return cwd;
  }
  return path.resolve(cwd, "..");
}

function createPngSignatureBytes() {
  return Uint8Array.from([
    0x89, 0x50, 0x4E, 0x47,
    0x0D, 0x0A, 0x1A, 0x0A
  ]);
}

function createUnknownBytes() {
  return Uint8Array.from([
    0x01, 0x02, 0x03, 0x04
  ]);
}

test("Test: staged onOf/onTo/onInto routing applies labels and drops through when no branch pipeline is selected", async () => {

  const bytes = createPngSignatureBytes();

  const pipeline = new PipelineBuilder().
  fromByteStream().
  ofMixedImagingData().
  withRouting((route) => route.
  onOf((of) => of.onImagingKind((stage) => stage.when("image", "image-kind"))).
  onTo((to) => to.when("image-kind", "image-target")).
  onInto((into) => into.when("image-target", "image-destination"))).
  build();

  const result = await pipeline.process(bytes, null, {
    sourceOptions: {
      contentType: "image/png"
    }
  });

  expect(result.count).toBe(1);
  const routed = result.first();

  expect(routed.kind).toBe("image");
  expect(routed.target).toBe("image-target");
  expect(routed.into).toBe("image-destination");
  expect(routed.skipped).toBe(false);
  expect(routed.labels.includes("image-kind")).toBe(true);
  expect(routed.labels.includes("image-target")).toBe(true);
  expect(routed.labels.includes("image-destination")).toBe(true);
  expect(routed.output).toBeDefined();
  expect(routed.output.kind).toBe("image");

});

test("Test: withRouting supports DICOM parser routing via whenTransferSyntax sugar", async () => {

  const repoRoot = resolveRepoRoot();
  const fixturePath = path.join(repoRoot, "data", "dicoms", "CT-MONO2-16-chest.dcm");

  const pipeline = new PipelineBuilder().
  fromFileStream().
  ofDicomData({ includePart10Header: true }).
  withRouting((route) => route.
  whenTransferSyntax([
    "1.2.840.10008.1.2.4.70"
  ], "known-transfer-syntax")).
  build();

  const result = await pipeline.process(fixturePath);
  expect(result.count).toBe(1);

  const routed = result.first();
  expect(routed.kind).toBe("dicom");
  expect(routed.skipped).toBe(false);
  expect(routed.labels.includes("known-transfer-syntax")).toBe(true);
  expect(routed.output).toBeDefined();
  expect(routed.output.metaSet).toBeDefined();
  expect(routed.output.dataSet).toBeDefined();

});

test("Test: whenFrom/whenTo/whenInto sugar works end-to-end for mixed image payloads", async () => {

  const bytes = createPngSignatureBytes();

  const pipeline = new PipelineBuilder().
  fromByteStream().
  ofMixedImagingData().
  withRouting((route) => route.
  whenFrom("image/png", "from-image").
  whenTo("from-image", "target-image").
  whenInto("target-image", "into-image")).
  build();

  const result = await pipeline.process(bytes, null, {
    sourceOptions: {
      contentType: "image/png"
    }
  });

  expect(result.count).toBe(1);
  const routed = result.first();

  expect(routed.route).toBe("image");
  expect(routed.target).toBe("target-image");
  expect(routed.into).toBe("into-image");
  expect(routed.labels).toEqual(expect.arrayContaining([
    "from-image",
    "target-image",
    "into-image"
  ]));
  expect(routed.output).toBeDefined();
  expect(routed.output.kind).toBe("image");

});

test("Test: onOf imaging-kind pipeline branch routes to image branch output", async () => {

  const bytes = createPngSignatureBytes();

  const pipeline = new PipelineBuilder().
  fromByteStream().
  ofMixedImagingData().
  withRouting((route) => route.
  onOf((of) => of.onImagingKind((stage) => stage.
  when("image", (branch) => branch.ofImageData().toImageData())))).
  build();

  const result = await pipeline.process(bytes, null, {
    sourceOptions: {
      contentType: "image/png"
    }
  });

  expect(result.count).toBe(1);

  const routed = result.first();
  expect(routed.kind).toBe("image");
  expect(routed.skipped).toBe(false);
  expect(routed.output).toBeDefined();
  expect(routed.output.kind).toBe("image");
  expect(routed.output.format).toBe("png");

});

test("Test: DICOM tag routing can combine transfer-syntax and modality labels with to/into destinations", async () => {

  const repoRoot = resolveRepoRoot();
  const fixturePath = path.join(repoRoot, "data", "dicoms", "CT-MONO2-16-chest.dcm");

  const pipeline = new PipelineBuilder().
  fromFileStream().
  ofDicomData({ includePart10Header: true }).
  withRouting((route) => route.
  whenTransferSyntax("1.2.840.10008.1.2.4.70", "ts-jpeg-lossless").
  whenModality("CT", "modality-ct").
  onTo((to) => to.when("modality-ct", "target-ct")).
  onInto((into) => into.when("target-ct", "into-archive"))).
  build();

  const result = await pipeline.process(fixturePath);
  expect(result.count).toBe(1);

  const routed = result.first();
  expect(routed.kind).toBe("dicom");
  expect(routed.labels).toEqual(expect.arrayContaining([
    "ts-jpeg-lossless",
    "modality-ct",
    "target-ct",
    "into-archive"
  ]));
  expect(routed.target).toBe("target-ct");
  expect(routed.into).toBe("into-archive");
  expect(routed.output).toBeDefined();
  expect(routed.output.dataSet.value(Tag.Modality)).toBe("CT");

});

test("Test: when(Tag, value) behaves as predicate-only and otherwise can label non-matching DICOM data", async () => {

  const repoRoot = resolveRepoRoot();
  const fixturePath = path.join(repoRoot, "data", "dicoms", "CT-MONO2-16-chest.dcm");

  const pipeline = new PipelineBuilder().
  fromFileStream().
  ofDicomData({ includePart10Header: true }).
  withRouting((route) => route.
  onOf((of) => of.onDicomData((data) => data.
  when(Tag.Modality, "MR").
  otherwise("not-mr"))).
  onTo((to) => to.when("not-mr", "target-non-mr"))).
  build();

  const result = await pipeline.process(fixturePath);
  expect(result.count).toBe(1);

  const routed = result.first();
  expect(routed.labels.includes("not-mr")).toBe(true);
  expect(routed.target).toBe("target-non-mr");
  expect(routed.output).toBeDefined();
  expect(routed.output.dataSet.value(Tag.Modality)).toBe("CT");

});

test("Test: legacy unknown-mode fail throws for unknown mixed-imaging payloads", async () => {

  const pipeline = new PipelineBuilder().
  fromByteStream().
  ofMixedImagingData().
  withRouting((route) => route.
  whenDicom((branch) => branch.ofDicomData().toInstances()).
  whenImage((branch) => branch.ofImageData().toImageData()).
  withUnknownMode("fail")).
  build();

  let error = null;
  try {
    await pipeline.process(createUnknownBytes(), null, {
      sourceOptions: {
        contentType: "application/octet-stream"
      }
    });
  }
  catch (caught) {
    error = caught;
  }

  expect(error instanceof Exception).toBe(true);
  expect(error.code).toBe(GeneralErrorCodes.GeneralError);

});
