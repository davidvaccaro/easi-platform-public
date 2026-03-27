import DimseAssociationReader from "../../../src/readers/DimseAssociationReader.js";
import DimseAssociationWriter from "../../../src/writers/DimseAssociationWriter.js";
import Exception, { GeneralErrorCodes } from "../../../src/environment/Exception.js";

test("Test: DimseAssociationReader without transport throws InvalidParameter", async () => {
    var reader = new DimseAssociationReader({
        host: "127.0.0.1",
        port: 104,
        callingAeTitle: "EASI",
        calledAeTitle: "PACS"
    });

    await expect(reader.read()).rejects.toMatchObject({
        name: "Exception",
        code: GeneralErrorCodes.InvalidParameter
    });
});

test("Test: DimseAssociationWriter without transport throws InvalidParameter", async () => {
    var writer = new DimseAssociationWriter();

    await expect(writer.write({
        host: "127.0.0.1",
        port: 104,
        callingAeTitle: "EASI",
        calledAeTitle: "PACS"
    }, new Uint8Array([1, 2, 3]))).rejects.toMatchObject({
        name: "Exception",
        code: GeneralErrorCodes.InvalidParameter
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
