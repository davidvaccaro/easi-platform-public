import EASI from "../../src/EASI.js";
import Tag from "../../src/dicom/Tag.js";
import InMemoryDimseSourceTransport from "../../src/transports/dimse/InMemoryDimseSourceTransport.js";
import InMemoryDimseDestinationTransport from "../../src/transports/dimse/InMemoryDimseDestinationTransport.js";
import { getFixtureBytes } from "../fixtures/dicom/SyntheticDicom.js";

async function parseDicomInstance(bytes) {
  return EASI.pipelineBuilder().
  fromByteStream().
  ofDicomData().
  toInstances().
  build().
  process({ source: bytes });
}

test("Test: in-memory DIMSE source to DIMSE destination pipeline supports de-identification and write capture", async () => {

  const sourceAssociation = {
    host: "pacs-source.local",
    port: 104,
    callingAeTitle: "EASI_ROUTER",
    calledAeTitle: "SRC_PACS"
  };

  const destinationAssociation = {
    host: "pacs-destination.local",
    port: 104,
    callingAeTitle: "EASI_ROUTER",
    calledAeTitle: "DST_PACS"
  };

  const sourceBytes = getFixtureBytes();
  const sourceTransport = new InMemoryDimseSourceTransport();
  sourceTransport.enqueueSource(sourceBytes, {
    contentType: "application/dicom",
    metadata: {
      sourceId: "demo-1"
    }
  });

  const destinationTransport = new InMemoryDimseDestinationTransport();
  const maskedSopInstanceUid = "9.9.9.9.9.9001";

  const pipeline = EASI.pipelineBuilder().
  fromDimseAssociation(sourceAssociation, sourceTransport).
  ofDicomData().
  withDeIdentification(new Map([
  [Tag.SOPInstanceUID.ID, maskedSopInstanceUid]])).

  toDicomData().
  intoDimseAssociation(destinationAssociation, {
    transport: destinationTransport
  }).
  build();

  const writeResult = await pipeline.process();

  expect(writeResult.ok).toBe(true);
  expect(writeResult.dimseStatus).toBe(0x0000);
  expect(writeResult.association).toEqual(destinationAssociation);
  expect(writeResult.bytesWritten).toBeGreaterThan(0);

  expect(destinationTransport.writes.length).toBe(1);
  expect(destinationTransport.writes[0].association).toEqual(destinationAssociation);
  expect(destinationTransport.writes[0].sourceBytes).toBeInstanceOf(Uint8Array);
  expect(destinationTransport.writes[0].bytesWritten).toBeGreaterThan(0);

  const sourceInstance = await parseDicomInstance(sourceBytes);
  const outputBytes = destinationTransport.writes[0].sourceBytes;
  const outputInstance = await parseDicomInstance(outputBytes);

  const sourceSopInstanceUid = sourceInstance.dataSet.value(Tag.SOPInstanceUID);
  const outputSopInstanceUid = outputInstance.dataSet.value(Tag.SOPInstanceUID);

  expect(sourceSopInstanceUid).not.toBe(maskedSopInstanceUid);
  expect(outputSopInstanceUid).toBe(maskedSopInstanceUid);

});

test("Test: source-bound DIMSE pipeline supports start/stop lifecycle", async () => {

  const sourceAssociation = {
    host: "pacs-source.local",
    port: 104,
    callingAeTitle: "EASI_ROUTER",
    calledAeTitle: "SRC_PACS"
  };

  const sourceBytes = getFixtureBytes();
  const sourceTransport = new InMemoryDimseSourceTransport();
  sourceTransport.enqueueSource(sourceBytes, {
    contentType: "application/dicom"
  });

  const pipeline = EASI.pipelineBuilder().
  fromDimseAssociation(sourceAssociation, sourceTransport).
  ofDicomData().
  toInstances().
  build();

  var emitted = null;
  const run = pipeline.start({
    maxIterations: 1,
    onResult: async (instance) => {
      emitted = instance;
      return false;
    }
  });

  await run.done;

  expect(run.iterations).toBe(1);
  expect(emitted).toBeDefined();
  expect(emitted?.dataSet?.attributes?.length > 0).toBe(true);

});
