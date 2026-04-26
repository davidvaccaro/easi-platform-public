import ImagingRoutingBuilder from "../../src/builders/ImagingRoutingBuilder.js";
import Tag from "../../src/dicom/Tag.js";
import Exception from "../../src/environment/Exception.js";
import { GeneralErrorCodes } from "../../src/environment/Exception.js";

function createMockPipeline() {
  return {
    process: jest.fn()
  };
}

function captureError(action) {
  try {
    action();
    return null;
  }
  catch (error) {
    return error;
  }
}

test("Test: whenTransferSyntax/whenModality sugar compiles into onOf tag-based rules", () => {

  const routes = ImagingRoutingBuilder.resolve((route) => route.
  whenTransferSyntax(["1.2.3", "1.2.4"], "known-transfer-syntax").
  whenModality("CT", "ct-modality"));

  expect(routes.usesGeneralRouting).toBe(true);

  const metaRules = routes.stages.of.dicomMeta.rules;
  expect(metaRules.length).toBe(1);
  expect(metaRules[0].matcher.kind).toBe("attribute");
  expect(metaRules[0].matcher.tagID).toBe(Tag.TransferSyntaxUID.ID);
  expect(metaRules[0].matcher.expectedValues).toEqual(["1.2.3", "1.2.4"]);
  expect(metaRules[0].action.kind).toBe("label");
  expect(metaRules[0].action.value).toBe("known-transfer-syntax");

  const dataRules = routes.stages.of.dicomData.rules;
  expect(dataRules.length).toBe(1);
  expect(dataRules[0].matcher.kind).toBe("attribute");
  expect(dataRules[0].matcher.tagID).toBe(Tag.Modality.ID);
  expect(dataRules[0].matcher.expectedValues).toEqual(["CT"]);
  expect(dataRules[0].action.kind).toBe("label");
  expect(dataRules[0].action.value).toBe("ct-modality");

});

test("Test: whenTransferSyntaxIn/whenModalityIn aliases compile to the same tag-based rules", () => {

  const routes = ImagingRoutingBuilder.resolve((route) => route.
  whenTransferSyntaxIn("1.2.840.10008.1.2.1", "explicit-vr").
  whenModalityIn(["CT", "MR"], "cross-sectional"));

  const metaRules = routes.stages.of.dicomMeta.rules;
  expect(metaRules.length).toBe(1);
  expect(metaRules[0].matcher.kind).toBe("attribute");
  expect(metaRules[0].matcher.tagID).toBe(Tag.TransferSyntaxUID.ID);
  expect(metaRules[0].matcher.expectedValues).toEqual(["1.2.840.10008.1.2.1"]);
  expect(metaRules[0].action.kind).toBe("label");
  expect(metaRules[0].action.value).toBe("explicit-vr");

  const dataRules = routes.stages.of.dicomData.rules;
  expect(dataRules.length).toBe(1);
  expect(dataRules[0].matcher.kind).toBe("attribute");
  expect(dataRules[0].matcher.tagID).toBe(Tag.Modality.ID);
  expect(dataRules[0].matcher.expectedValues).toEqual(["CT", "MR"]);
  expect(dataRules[0].action.kind).toBe("label");
  expect(dataRules[0].action.value).toBe("cross-sectional");

});

test("Test: when(Tag, value) compiles to attribute matcher with noop action", () => {

  const routes = ImagingRoutingBuilder.resolve((route) => route.
  onOf((of) => of.onDicomData((data) => data.when(Tag.Modality, "CT").otherwise("not-ct"))));

  const dataRules = routes.stages.of.dicomData.rules;
  expect(dataRules.length).toBe(1);
  expect(dataRules[0].matcher.kind).toBe("attribute");
  expect(dataRules[0].matcher.tagID).toBe(Tag.Modality.ID);
  expect(dataRules[0].matcher.expectedValues).toEqual(["CT"]);
  expect(dataRules[0].matcher.hasExpectedValues).toBe(true);
  expect(dataRules[0].action.kind).toBe("noop");

  expect(routes.stages.of.dicomData.otherwise.kind).toBe("label");
  expect(routes.stages.of.dicomData.otherwise.value).toBe("not-ct");

});

test("Test: when(Tag, pipeline) compiles to attribute matcher with pipeline action", () => {

  const modalityPipeline = createMockPipeline();

  const routes = ImagingRoutingBuilder.resolve((route) => route.
  onOf((of) => of.onDicomData((data) => data.when(Tag.Modality, modalityPipeline))));

  const dataRules = routes.stages.of.dicomData.rules;
  expect(dataRules.length).toBe(1);
  expect(dataRules[0].matcher.kind).toBe("attribute");
  expect(dataRules[0].matcher.tagID).toBe(Tag.Modality.ID);
  expect(dataRules[0].matcher.expectedValues).toBeNull();
  expect(dataRules[0].matcher.hasExpectedValues).toBe(false);
  expect(dataRules[0].action.kind).toBe("pipeline");
  expect(dataRules[0].action.pipeline).toBe(modalityPipeline);

});

test("Test: two-arg when for non-tag predicates remains matcher plus label action", () => {

  const routes = ImagingRoutingBuilder.resolve((route) => route.
  onTo((to) => to.when("image-kind", "image-target")));

  const toRules = routes.stages.to.rules;
  expect(toRules.length).toBe(1);
  expect(toRules[0].matcher.kind).toBe("value");
  expect(toRules[0].matcher.expectedValues).toEqual(["image-kind"]);
  expect(toRules[0].action.kind).toBe("label");
  expect(toRules[0].action.value).toBe("image-target");

});

test("Test: eight-character non-hex tokens remain value predicates instead of tag matchers", () => {

  const routes = ImagingRoutingBuilder.resolve((route) => route.
  onInto((into) => into.when("target-a", "into-a")));

  const intoRules = routes.stages.into.rules;
  expect(intoRules.length).toBe(1);
  expect(intoRules[0].matcher.kind).toBe("value");
  expect(intoRules[0].matcher.expectedValues).toEqual(["target-a"]);
  expect(intoRules[0].action.kind).toBe("label");
  expect(intoRules[0].action.value).toBe("into-a");

});

test("Test: whenFrom/whenTo/whenInto sugar compiles stage rules", () => {

  const routes = ImagingRoutingBuilder.resolve((route) => route.
  whenFrom("mediaType", "image/png", "source-image").
  whenTo("source-image", "dicom-target").
  whenInto("dicom-target", "cloud-destination"));

  const fromRules = routes.stages.from.rules;
  expect(fromRules.length).toBe(1);
  expect(fromRules[0].matcher.kind).toBe("field");
  expect(fromRules[0].matcher.field).toBe("mediaType");
  expect(fromRules[0].matcher.expectedValues).toEqual(["image/png"]);
  expect(fromRules[0].action.kind).toBe("label");
  expect(fromRules[0].action.value).toBe("source-image");

  const toRules = routes.stages.to.rules;
  expect(toRules.length).toBe(1);
  expect(toRules[0].matcher.kind).toBe("value");
  expect(toRules[0].matcher.expectedValues).toEqual(["source-image"]);
  expect(toRules[0].action.kind).toBe("label");
  expect(toRules[0].action.value).toBe("dicom-target");

  const intoRules = routes.stages.into.rules;
  expect(intoRules.length).toBe(1);
  expect(intoRules[0].matcher.kind).toBe("value");
  expect(intoRules[0].matcher.expectedValues).toEqual(["dicom-target"]);
  expect(intoRules[0].action.kind).toBe("label");
  expect(intoRules[0].action.value).toBe("cloud-destination");

});

test("Test: object-definition rules compile across from/of/to/into stages", () => {

  const routes = ImagingRoutingBuilder.resolve({
    stages: {
      from: {
        when: [
          ["mediaType", "image/png", "source-png"],
          {
            predicate: (evaluation) => (evaluation.value?.fileName ?? null) === "frame.png",
            action: "source-file-frame"
          }
        ],
        otherwise: "source-otherwise"
      },
      of: {
        imagingKind: {
          when: [
            ["image", "kind-image"]
          ]
        },
        dicomMeta: {
          rules: [
            [Tag.TransferSyntaxUID, "1.2.3", "meta-ts"]
          ],
          otherwise: "meta-otherwise"
        },
        dicomData: {
          rules: [
            [Tag.Modality, "CT", "data-ct"]
          ],
          otherwise: "data-otherwise"
        }
      },
      to: {
        when: [
          ["kind-image", "target-image"]
        ]
      },
      into: {
        when: [
          ["target-image", "into-image"]
        ],
        otherwise: "into-otherwise"
      }
    }
  });

  expect(routes.stages.from.rules.length).toBe(2);
  expect(routes.stages.from.rules[0].matcher.kind).toBe("field");
  expect(routes.stages.from.rules[0].matcher.field).toBe("mediaType");
  expect(routes.stages.from.rules[1].matcher.kind).toBe("predicate");
  expect(routes.stages.from.otherwise.kind).toBe("label");
  expect(routes.stages.from.otherwise.value).toBe("source-otherwise");

  expect(routes.stages.of.imagingKind.rules.length).toBe(1);
  expect(routes.stages.of.imagingKind.rules[0].matcher.kind).toBe("value");
  expect(routes.stages.of.imagingKind.rules[0].action.value).toBe("kind-image");

  expect(routes.stages.of.dicomMeta.rules.length).toBe(1);
  expect(routes.stages.of.dicomMeta.rules[0].matcher.kind).toBe("attribute");
  expect(routes.stages.of.dicomMeta.rules[0].matcher.tagID).toBe(Tag.TransferSyntaxUID.ID);
  expect(routes.stages.of.dicomMeta.otherwise.value).toBe("meta-otherwise");

  expect(routes.stages.of.dicomData.rules.length).toBe(1);
  expect(routes.stages.of.dicomData.rules[0].matcher.kind).toBe("attribute");
  expect(routes.stages.of.dicomData.rules[0].matcher.tagID).toBe(Tag.Modality.ID);
  expect(routes.stages.of.dicomData.otherwise.value).toBe("data-otherwise");

  expect(routes.stages.to.rules.length).toBe(1);
  expect(routes.stages.to.rules[0].matcher.kind).toBe("value");
  expect(routes.stages.into.rules.length).toBe(1);
  expect(routes.stages.into.rules[0].matcher.kind).toBe("value");
  expect(routes.stages.into.otherwise.value).toBe("into-otherwise");

});

test("Test: object-definition onOf compiles imagingKind/dicomMeta/dicomData branches", () => {

  const routes = ImagingRoutingBuilder.resolve((route) => route.
  onOf({
    imagingKind: {
      when: [
        ["dicom", "kind-dicom"]
      ]
    },
    dicomMeta: {
      when: [
        [Tag.TransferSyntaxUID, "1.2.840.10008.1.2.4.70", "jpeg-lossless"]
      ]
    },
    dicomData: {
      when: [
        [Tag.Modality, "MR", "modality-mr"]
      ]
    }
  }));

  expect(routes.stages.of.imagingKind.rules.length).toBe(1);
  expect(routes.stages.of.imagingKind.rules[0].matcher.kind).toBe("value");

  expect(routes.stages.of.dicomMeta.rules.length).toBe(1);
  expect(routes.stages.of.dicomMeta.rules[0].matcher.kind).toBe("attribute");
  expect(routes.stages.of.dicomMeta.rules[0].matcher.tagID).toBe(Tag.TransferSyntaxUID.ID);

  expect(routes.stages.of.dicomData.rules.length).toBe(1);
  expect(routes.stages.of.dicomData.rules[0].matcher.kind).toBe("attribute");
  expect(routes.stages.of.dicomData.rules[0].matcher.tagID).toBe(Tag.Modality.ID);

});

test("Test: resolve infers dicom/image legacy pipelines from onOf imaging-kind pipeline rules", () => {

  const dicomPipeline = createMockPipeline();
  const imagePipeline = createMockPipeline();
  const otherwisePipeline = createMockPipeline();

  const routes = ImagingRoutingBuilder.resolve((route) => route.
  onOf((of) => of.onImagingKind((stage) => stage.
  when("dicom", dicomPipeline).
  when("image", imagePipeline).
  otherwise(otherwisePipeline))));

  expect(routes.dicomPipeline).toBe(dicomPipeline);
  expect(routes.imagePipeline).toBe(imagePipeline);
  expect(routes.otherwisePipeline).toBe(otherwisePipeline);

});

test("Test: withUnknownMode accepts skip and fail", () => {

  const skipRoutes = ImagingRoutingBuilder.resolve((route) => route.withUnknownMode("skip"));
  const failRoutes = ImagingRoutingBuilder.resolve((route) => route.withUnknownMode("fail"));

  expect(skipRoutes.unknownMode).toBe("skip");
  expect(failRoutes.unknownMode).toBe("fail");

});

test("Test: withUnknownMode throws on invalid mode", () => {

  const error = captureError(() => new ImagingRoutingBuilder().withUnknownMode("unknown-mode"));

  expect(error instanceof Exception).toBe(true);
  expect(error.code).toBe(GeneralErrorCodes.InvalidParameter);

});

test("Test: onOf throws on invalid non-object/non-function definition", () => {

  const error = captureError(() => new ImagingRoutingBuilder().onOf(123));

  expect(error instanceof Exception).toBe(true);
  expect(error.code).toBe(GeneralErrorCodes.InvalidParameter);

});

test("Test: resolve throws on invalid definition", () => {

  const error = captureError(() => ImagingRoutingBuilder.resolve(null));

  expect(error instanceof Exception).toBe(true);
  expect(error.code).toBe(GeneralErrorCodes.InvalidParameter);

});

test("Test: legacy whenDicom/whenImage definitions remain supported", () => {

  const routes = ImagingRoutingBuilder.resolve({
    dicom: (pipeline) => pipeline.ofDicomData().toInstances(),
    image: (pipeline) => pipeline.ofImageData().toImageData(),
    unknownMode: "skip"
  });

  expect(routes.dicomPipeline).toBeDefined();
  expect(routes.imagePipeline).toBeDefined();
  expect(routes.unknownMode).toBe("skip");
  expect(routes.usesGeneralRouting).toBe(false);

});
