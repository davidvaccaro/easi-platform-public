import InMemoryDimseSourceTransport from "../../../src/transports/dimse/InMemoryDimseSourceTransport.js";
import InMemoryDimseDestinationTransport from "../../../src/transports/dimse/InMemoryDimseDestinationTransport.js";
import DimseTransportContract from "../../../src/transports/dimse/DimseTransportContract.js";
import Exception, { GeneralErrorCodes } from "../../../src/environment/Exception.js";

test("Test: DimseTransportContract createReadEnvelope infers content-length for byte-like payload", () => {
    const envelope = DimseTransportContract.createReadEnvelope(new Uint8Array([1, 2, 3]));
    expect(envelope.contentType).toBe("application/dicom");
    expect(envelope.contentLength).toBe(3);
});

test("Test: InMemoryDimseSourceTransport read returns queued envelope", async () => {
    const transport = new InMemoryDimseSourceTransport();
    transport.enqueueSource(new Uint8Array([1, 2, 3, 4]), {
        metadata: {
            id: "demo"
        }
    });

    const envelope = await transport.read({
        host: "127.0.0.1",
        port: 104
    });

    expect(envelope.source).toBeInstanceOf(Uint8Array);
    expect(envelope.source.length).toBe(4);
    expect(envelope.contentType).toBe("application/dicom");
    expect(envelope.contentLength).toBe(4);
    expect(envelope.metadata.id).toBe("demo");
    expect(envelope.metadata.sourceAssociation.host).toBe("127.0.0.1");
});

test("Test: InMemoryDimseSourceTransport throws when queue is empty", async () => {
    const transport = new InMemoryDimseSourceTransport();

    try {
        await transport.read({});
    }
    catch (error) {
        expect(error instanceof Exception).toBe(true);
        expect(error.code).toBe(GeneralErrorCodes.GeneralError);
        return;
    }

    throw new Error("Expected queue-empty read to throw.");
});

test("Test: InMemoryDimseDestinationTransport captures writes and returns normalized result", async () => {
    const transport = new InMemoryDimseDestinationTransport();
    const association = {
        host: "127.0.0.1",
        port: 104
    };
    const source = new Uint8Array([9, 8, 7]);

    const result = await transport.write(association, source, {
        operation: "c-store"
    });

    expect(result.ok).toBe(true);
    expect(result.dimseStatus).toBe(0x0000);
    expect(result.bytesWritten).toBe(3);
    expect(transport.writes.length).toBe(1);
    expect(transport.writes[0].association).toEqual(association);
    expect(transport.writes[0].sourceBytes).toBeInstanceOf(Uint8Array);
    expect(Array.from(transport.writes[0].sourceBytes)).toEqual([9, 8, 7]);
});
