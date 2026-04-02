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

test("Test: DimseAssociationReader is source-bound and delegates start/stop lifecycle", async () => {

    var startCalls = [];
    var closeCalls = 0;

    var transport = {
        read: async () => ({
            source: new Uint8Array([0])
        }),
        start: async (association, options) => {
            startCalls.push({ association, options });
            return {
                host: "127.0.0.1",
                port: 11112,
                calledAeTitle: "EASI_JS"
            };
        },
        close: async () => {
            closeCalls += 1;
        }
    };

    var reader = new DimseAssociationReader({
        host: "127.0.0.1",
        port: 11112,
        calledAeTitle: "EASI_JS"
    }, transport);

    expect(reader.isSourceBound).toBe(true);

    var listener = await reader.start(null, { waitForFirstInstanceMs: 1000 });
    expect(listener).toBeDefined();
    expect(startCalls.length).toBe(1);
    expect(startCalls[0].association.calledAeTitle).toBe("EASI_JS");

    await reader.stop();
    expect(closeCalls).toBe(1);

});
