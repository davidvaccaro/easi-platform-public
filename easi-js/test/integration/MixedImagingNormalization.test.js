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

test("Test: withNormalization(toDicom) converts standard image payloads into DICOM-routable payloads", async () => {

  const pngBytes = createPngBytes();

  const pipeline = new PipelineBuilder().
  fromByteStream().
  ofMixedImagingData().
  withNormalization((normalize) => normalize.toDicom()).
  withRouting((route) => route.
  whenDicom((branch) => branch.ofDicomData().toInstances())).
  build();

  const result = await pipeline.process(pngBytes, null, {
    sourceOptions: {
      contentType: "image/png"
    }
  });

  expect(result.count).toBe(1);

  const routed = result.first();
  expect(routed.route).toBe("dicom");
  expect(routed.output).toBeDefined();
  expect(routed.output.dataSet.find(Tag.PixelData)).toBeDefined();
  expect(routed.output.dataSet.find(Tag.SOPClassUID)).toBeDefined();

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
