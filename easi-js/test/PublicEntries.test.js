import EASI, {
    EASI as NamedEASI, Attribute, DicomSelection, DicomToFHIRImagingStudyMapping,
    PipelineBuilder, Tag, TransferSyntax
} from "../src/index.js";
import * as PublicApi from "../src/index.js";
import * as Dicom from "../src/dicom/index.js";
import * as Fhir from "../src/fhir/index.js";
import * as Mappings from "../src/handlers/mappings/index.js";
import * as Selections from "../src/handlers/selections/index.js";
import * as Codecs from "../src/codecs/index.js";
import * as Dimse from "../src/dimse/node.js";

const metadata = {
    "00080016": { vr: "UI", Value: ["1.2.840.10008.5.1.4.1.1.2"] },
    "00080018": { vr: "UI", Value: ["2.25.123.1.1"] },
    "00080060": { vr: "CS", Value: ["CT"] },
    "00100020": { vr: "LO", Value: ["SYNTHETIC-PACKAGE-PATIENT"] },
    "0020000D": { vr: "UI", Value: ["2.25.123"] },
    "0020000E": { vr: "UI", Value: ["2.25.123.1"] }
};

function source() {
    return new TextEncoder().encode(JSON.stringify(metadata));
}

test("public entries preserve one class identity across imports", () => {
    expect(NamedEASI).toBe(EASI);
    expect(EASI.pipelineBuilder()).toBeInstanceOf(PipelineBuilder);
    expect(Tag).toBe(Dicom.Tag);
    expect(Attribute).toBe(Dicom.Attribute);
    expect(TransferSyntax).toBe(Dicom.TransferSyntax);
    expect(DicomSelection).toBe(Selections.DicomSelection);
    expect(DicomToFHIRImagingStudyMapping).toBe(Mappings.DicomToFHIRImagingStudyMapping);
    expect(DicomToFHIRImagingStudyMapping).toBe(Fhir.DicomToFHIRImagingStudyMapping);
    expect(EASI.codecRegistryBuilder()).toBeInstanceOf(Codecs.CodecRegistryBuilder);
});

test("public root and DICOM entries parse metadata to the exported model", async () => {
    const result = await EASI.pipelineBuilder().fromPartStream().ofDicomMetadata().
        toInstances().build().process({ source: source() });
    const instance = result.first();
    expect(instance).toBeInstanceOf(Dicom.Instance);
    expect(instance.dataSet.find(Tag.StudyInstanceUID).value).toBe("2.25.123");
});

test("public selection extension integrates with the pipeline", async () => {
    const selection = EASI.selectionBuilder().include(Tag.StudyInstanceUID).build();
    expect(selection).toBeInstanceOf(DicomSelection);
    const result = await EASI.pipelineBuilder().fromPartStream().ofDicomMetadata().
        toSelection(selection).build().process({ source: source() });
    const selected = result.first();
    expect(selected.find(Tag.StudyInstanceUID).value).toBe("2.25.123");
    expect(selected.find(Tag.PatientID)).toBeUndefined();
});

test("public FHIR entry yields serializable R4 imaging models", async () => {
    const result = await EASI.pipelineBuilder().fromPartStream().ofDicomMetadata().
        toMapping(new DicomToFHIRImagingStudyMapping()).build().process({ source: source() });
    const study = result.first();
    expect(study).toBeInstanceOf(Fhir.ImagingStudy);
    const json = JSON.parse(JSON.stringify(study));
    expect(json.resourceType).toBe("ImagingStudy");
    expect(json.subject).toEqual({ reference: "#patient" });
    expect(json.series[0].instance[0].uid).toBe("2.25.123.1.1");
    expect(json.contained[0].resourceType).toBe("Patient");
});

test("Node DIMSE entry exposes socket transports without adding them to the root", async () => {
    expect(new Dimse.NodeDimseQueryRetrieveSourceTransport()).toBeInstanceOf(Dimse.DimseSourceTransport);
    expect(new Dimse.NodeDimseCStoreScpSourceTransport()).toBeInstanceOf(Dimse.DimseSourceTransport);
    expect(new Dimse.NodeDimseCStoreScuTransport()).toBeInstanceOf(Dimse.DimseDestinationTransport);
    expect(PublicApi).not.toHaveProperty("NodeDimseCStoreScuTransport");
    const transport = { echo: jest.fn(async () => ({ status: 0 })) };
    const association = { host: "127.0.0.1", port: 4242, callingAETitle: "EASI", calledAETitle: "ORTHANC" };
    const client = new Dimse.DimseClientBuilder().withAssociation(association).withTransport(transport).build();
    expect(client).toBeInstanceOf(Dimse.DimseClient);
    expect(await client.echo()).toEqual({ status: 0 });
    expect(transport.echo).toHaveBeenCalledWith(association, {});
});
