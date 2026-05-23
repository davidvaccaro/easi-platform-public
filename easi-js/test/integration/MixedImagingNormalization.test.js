import PipelineBuilder from "../../src/builders/PipelineBuilder.js";
import Configuration from "../../src/environment/Configuration.js";
import Tag from "../../src/dicom/Tag.js";

function createPngBytes() {

  const encoder = Configuration.global.getEncoderFor("png");
  const rgba = new Uint8Array([
    255, 0, 0, 255
  ]);

  const encoded = encoder.encode(rgba, 1, 1);
  return encoded.bytes;

}

test("Test: withNormalization(toDicom) converts standard image payloads into DICOM instance output", async () => {

  const pngBytes = createPngBytes();

  const pipeline = new PipelineBuilder().
  fromByteStream().
  ofMixedImagingData().
  withNormalization((normalize) => normalize.toDicom()).
  toImagingData().
  build();

  const result = await pipeline.process(pngBytes, null, {
    sourceOptions: {
      contentType: "image/png"
    }
  });

  expect(result.count).toBe(1);

  const normalized = result.first();
  expect(normalized.kind).toBe("dicom");
  expect(normalized.mediaType).toBe("application/dicom");
  expect(normalized.bytes instanceof Uint8Array).toBe(true);

  const dicomPipeline = new PipelineBuilder().
  fromByteStream().
  ofDicomData().
  toInstances().
  build();

  const dicomResult = await dicomPipeline.process(normalized.bytes, null, {
    sourceOptions: {
      contentType: "application/dicom"
    }
  });

  const instance = dicomResult.first();
  expect(instance).toBeDefined();
  expect(instance.dataSet.find(Tag.PixelData)).toBeDefined();
  expect(instance.dataSet.find(Tag.SOPClassUID)).toBeDefined();

});

test("Test: withNormalization(toFrames) normalizes mixed payloads to frame output with optional RGBA", async () => {

  const pngBytes = createPngBytes();

  const pipeline = new PipelineBuilder().
  fromByteStream().
  ofMixedImagingData().
  withNormalization((normalize) => normalize.toFrames({
    format: "rgba",
    includeRgba: true
  })).
  toImagingData().
  build();

  const result = await pipeline.process(pngBytes, null, {
    sourceOptions: {
      contentType: "image/png"
    }
  });

  const output = result.first();
  expect(output.kind).toBe("image");
  expect(output.imageFormat).toBe("rgba");
  expect(output.normalizedMode).toBe("frames");
  expect(output.width).toBe(1);
  expect(output.height).toBe(1);
  expect(output.rgba instanceof Uint8Array).toBe(true);
  expect(output.rgba.length).toBe(4);
  expect(output.bytes instanceof Uint8Array).toBe(true);
  expect(output.bytes.length).toBe(4);

});
