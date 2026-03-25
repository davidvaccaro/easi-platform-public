import DimseAssociationReader from "../../../src/readers/DimseAssociationReader.js";
import DimseAssociationWriter from "../../../src/writers/DimseAssociationWriter.js";
import StubDimseSourceTransport from "../../../src/transports/dimse/StubDimseSourceTransport.js";
import StubDimseDestinationTransport from "../../../src/transports/dimse/StubDimseDestinationTransport.js";
import Exception, { GeneralErrorCodes } from "../../../src/environment/Exception.js";

test("Test: StubDimseSourceTransport.read throws NotImplemented", async () => {
    var transport = new StubDimseSourceTransport();
    await expect(transport.read({})).rejects.toMatchObject({
        name: "Exception",
        code: GeneralErrorCodes.NotImplemented
    });
});

test("Test: StubDimseDestinationTransport.write throws NotImplemented", async () => {
    var transport = new StubDimseDestinationTransport();
    await expect(transport.write({}, new Uint8Array([1]))).rejects.toMatchObject({
        name: "Exception",
        code: GeneralErrorCodes.NotImplemented
    });
});

test("Test: DimseAssociationReader default transport throws NotImplemented", async () => {
    var reader = new DimseAssociationReader({
        host: "127.0.0.1",
        port: 104,
        callingAeTitle: "EASI",
        calledAeTitle: "PACS"
    });

    await expect(reader.read()).rejects.toMatchObject({
        name: "Exception",
        code: GeneralErrorCodes.NotImplemented
    });
});

test("Test: DimseAssociationWriter default transport throws NotImplemented", async () => {
    var writer = new DimseAssociationWriter();

    await expect(writer.write({
        host: "127.0.0.1",
        port: 104,
        callingAeTitle: "EASI",
        calledAeTitle: "PACS"
    }, new Uint8Array([1, 2, 3]))).rejects.toMatchObject({
        name: "Exception",
        code: GeneralErrorCodes.NotImplemented
    });
});

test("Test: DimseAssociationReader validates transport shape", async () => {
    var reader = new DimseAssociationReader({}, {
        // intentionally invalid transport surface.
    });

    try {
        await reader.read();
    }
    catch (error) {
        expect(error instanceof Exception).toBe(true);
        expect(error.code).toBe(GeneralErrorCodes.InvalidParameter);
        return;
    }

    throw new Error("Expected reader to throw.");
});
