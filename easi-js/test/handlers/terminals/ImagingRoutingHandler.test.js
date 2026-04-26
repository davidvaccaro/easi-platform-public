import ImagingRoutingBuilder from "../../../src/builders/ImagingRoutingBuilder.js";
import ImagingRoutingHandler from "../../../src/handlers/terminals/ImagingRoutingHandler.js";
import Tag from "../../../src/dicom/Tag.js";
import Exception from "../../../src/environment/Exception.js";
import { GeneralErrorCodes } from "../../../src/environment/Exception.js";

function createAttributeSet(values = {}) {
  return {
    value(tag, fallback = null) {
      const key = tag?.ID ?? tag;
      if (Object.prototype.hasOwnProperty.call(values, key) === true) {
        return values[key];
      }
      return fallback;
    },
    find(tag) {
      const key = tag?.ID ?? tag;
      if (Object.prototype.hasOwnProperty.call(values, key) === true) {
        return { value: values[key] };
      }
      return null;
    }
  };
}

function createImagePayload(overrides = {}) {
  return Object.assign({
    kind: "image",
    bytes: Uint8Array.from([0x89, 0x50, 0x4E, 0x47]),
    contentType: "image/png",
    sourcePath: "/tmp/frame.png"
  }, overrides);
}

function createDicomPayload(overrides = {}) {
  return Object.assign({
    kind: "dicom",
    bytes: Uint8Array.from([0x44, 0x49, 0x43, 0x4D]),
    contentType: "application/dicom",
    sourcePath: "/tmp/instance.dcm",
    metaSet: createAttributeSet({
      [Tag.TransferSyntaxUID.ID]: "1.2.840.10008.1.2.4.70"
    }),
    dataSet: createAttributeSet({
      [Tag.Modality.ID]: "CT"
    })
  }, overrides);
}

function captureAsyncError(action) {
  return action().then(() => null).catch((error) => error);
}

test("Test: general staged routing with no branch pipeline drops through with pass-through output", async () => {

  const routes = ImagingRoutingBuilder.resolve((route) => route.
  onOf((of) => of.onImagingKind((stage) => stage.when("image", "image-kind"))).
  onTo((to) => to.when("image-kind", "target-a")).
  onInto((into) => into.when("target-a", "into-a")));

  const handler = new ImagingRoutingHandler(routes);
  const payload = createImagePayload();

  const routed = await handler.onEnd(null, payload);

  expect(routed.kind).toBe("image");
  expect(routed.skipped).toBe(false);
  expect(routed.output).toBeDefined();
  expect(routed.output.kind).toBe("image");
  expect(routed.target).toBe("target-a");
  expect(routed.into).toBe("into-a");
  expect(routed.labels).toEqual(expect.arrayContaining(["image-kind", "target-a", "into-a"]));

});

test("Test: legacy unknown mode fail throws when no route pipeline is configured", async () => {

  const routes = ImagingRoutingBuilder.resolve({
    unknownMode: "fail"
  });
  const handler = new ImagingRoutingHandler(routes);

  const error = await captureAsyncError(() => handler.onEnd(null, createImagePayload()));

  expect(error instanceof Exception).toBe(true);
  expect(error.code).toBe(GeneralErrorCodes.GeneralError);

});

test("Test: legacy unknown mode skip returns skipped envelope when no route pipeline is configured", async () => {

  const routes = ImagingRoutingBuilder.resolve({
    unknownMode: "skip"
  });
  const handler = new ImagingRoutingHandler(routes);

  const routed = await handler.onEnd(null, createImagePayload());

  expect(routed.skipped).toBe(true);
  expect(routed.output).toBeNull();
  expect(routed.kind).toBe("image");

});

test("Test: staged label object actions can assign labels, route, target, and into values", async () => {

  const routes = ImagingRoutingBuilder.resolve((route) => route.
  onFrom((from) => from.when("image/png", {
    labels: ["from-image", "image-kind"],
    route: "ingress-image"
  })).
  onTo((to) => to.when("image-kind", {
    label: "target-labeled",
    target: "target-a"
  })).
  onInto((into) => into.when("target-labeled", {
    label: "into-labeled",
    into: "into-a"
  })));

  const handler = new ImagingRoutingHandler(routes);
  const routed = await handler.onEnd(null, createImagePayload());

  expect(routed.route).toBe("ingress-image");
  expect(routed.target).toBe("target-a");
  expect(routed.into).toBe("into-a");
  expect(routed.labels).toEqual(expect.arrayContaining([
    "from-image",
    "image-kind",
    "target-labeled",
    "into-labeled"
  ]));

});

test("Test: tag-based when(Tag, value) acts as predicate-only and falls through to otherwise when not matched", async () => {

  const routes = ImagingRoutingBuilder.resolve((route) => route.
  onOf((of) => of.onDicomData((data) => data.
  when(Tag.Modality, "MR").
  otherwise("not-mr"))).
  onTo((to) => to.when("not-mr", "target-non-mr")));

  const handler = new ImagingRoutingHandler(routes);

  const routedCt = await handler.onEnd(null, createDicomPayload({
    dataSet: createAttributeSet({
      [Tag.Modality.ID]: "CT"
    })
  }));

  expect(routedCt.labels).toEqual(expect.arrayContaining(["not-mr", "target-non-mr"]));
  expect(routedCt.target).toBe("target-non-mr");

  const routedMr = await handler.onEnd(null, createDicomPayload({
    dataSet: createAttributeSet({
      [Tag.Modality.ID]: "MR"
    })
  }));

  expect(routedMr.labels.includes("not-mr")).toBe(false);
  expect(routedMr.target).toBeNull();

});

test("Test: first matching pipeline action is retained when multiple matching pipeline rules are present", async () => {

  const firstPipeline = {
    process: jest.fn().mockResolvedValue({
      first() {
        return { branch: "first" };
      }
    })
  };
  const secondPipeline = {
    process: jest.fn().mockResolvedValue({
      first() {
        return { branch: "second" };
      }
    })
  };

  const routes = ImagingRoutingBuilder.resolve((route) => route.
  onOf((of) => of.onImagingKind((stage) => stage.
  when("image", firstPipeline).
  when("image", secondPipeline))));

  const handler = new ImagingRoutingHandler(routes);
  const payload = createImagePayload();

  const routed = await handler.onEnd(null, payload);

  expect(firstPipeline.process).toHaveBeenCalledTimes(1);
  expect(secondPipeline.process).toHaveBeenCalledTimes(0);
  expect(routed.output).toEqual({ branch: "first" });

});

test("Test: branch pipeline receives route labels/target/into through sourceOptions", async () => {

  const branchPipeline = {
    process: jest.fn().mockResolvedValue({
      first() {
        return { branch: "image-route" };
      }
    })
  };

  const routes = ImagingRoutingBuilder.resolve((route) => route.
  onOf((of) => of.onImagingKind((stage) => stage.
  when("image", "kind-image").
  when("image", branchPipeline))).
  onTo((to) => to.when("kind-image", "target-image")).
  onInto((into) => into.when("target-image", "into-image")));

  const handler = new ImagingRoutingHandler(routes);
  const payload = createImagePayload();

  const routed = await handler.onEnd(null, payload);

  expect(branchPipeline.process).toHaveBeenCalledTimes(1);
  const invocation = branchPipeline.process.mock.calls[0];

  expect(invocation[0]).toBe(payload.bytes);
  expect(invocation[2].sourceOptions.routeLabels).toEqual(expect.arrayContaining([
    "kind-image",
    "target-image",
    "into-image"
  ]));
  expect(invocation[2].sourceOptions.routeTarget).toBe("target-image");
  expect(invocation[2].sourceOptions.routeInto).toBe("into-image");

  expect(routed.output).toEqual({ branch: "image-route" });
  expect(routed.target).toBe("target-image");
  expect(routed.into).toBe("into-image");

});

test("Test: async predicate matchers are supported in routing rules", async () => {

  const routes = ImagingRoutingBuilder.resolve((route) => route.
  onFrom((from) => from.when(async (evaluation) => {
    return (evaluation.value?.mediaType ?? null) === "image/png";
  }, "async-from")).
  onTo((to) => to.when("async-from", "async-target")));

  const handler = new ImagingRoutingHandler(routes);
  const routed = await handler.onEnd(null, createImagePayload());

  expect(routed.labels).toEqual(expect.arrayContaining(["async-from", "async-target"]));
  expect(routed.target).toBe("async-target");

});

test("Test: field matchers can resolve values from payload paths", async () => {

  const routes = ImagingRoutingBuilder.resolve((route) => route.
  onFrom((from) => from.when("payload.custom.routeClass", "qa", "payload-route-hit")).
  onTo((to) => to.when("payload-route-hit", "payload-target")));

  const handler = new ImagingRoutingHandler(routes);
  const routed = await handler.onEnd(null, createImagePayload({
    custom: {
      routeClass: "qa"
    }
  }));

  expect(routed.labels).toEqual(expect.arrayContaining(["payload-route-hit", "payload-target"]));
  expect(routed.target).toBe("payload-target");

});

test("Test: onEndMetaSet/onEndDataSet pre-evaluation is not repeated during onEndInstance", async () => {

  let metaEvaluations = 0;
  let dataEvaluations = 0;

  const routes = ImagingRoutingBuilder.resolve((route) => route.
  onOf((of) => of.
  onDicomMeta((meta) => meta.when(() => {
    metaEvaluations += 1;
    return true;
  }, "meta-hit")).
  onDicomData((data) => data.when(() => {
    dataEvaluations += 1;
    return true;
  }, "data-hit"))));

  const handler = new ImagingRoutingHandler(routes);

  handler.instanceHandler = {
    onStartInstance(context) {
      return context;
    },
    onEndMetaSet() {
      return null;
    },
    onEndDataSet() {
      return null;
    },
    onEndInstance() {
      return null;
    }
  };

  const context = {
    bytes: Uint8Array.from([0x44, 0x49, 0x43, 0x4D]),
    contentType: "application/dicom",
    sourcePath: "/tmp/instance.dcm",
    instance: {
      metaSet: createAttributeSet({
        [Tag.TransferSyntaxUID.ID]: "1.2.840.10008.1.2.1"
      }),
      dataSet: createAttributeSet({
        [Tag.Modality.ID]: "CT"
      })
    }
  };

  await handler.onStartInstance(context);
  await handler.onEndMetaSet(context);
  await handler.onEndDataSet(context);
  const routed = await handler.onEndInstance(context);

  expect(metaEvaluations).toBe(1);
  expect(dataEvaluations).toBe(1);
  expect(routed.labels).toEqual(expect.arrayContaining(["meta-hit", "data-hit"]));
  expect(routed.output).toBe(context.instance);

});
