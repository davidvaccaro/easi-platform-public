import DimseClient from "../../src/clients/DimseClient.js";

class CapturingEchoTransport {
    constructor() {
        this.calls = [];
    }

    async echo(association, options = null) {
        this.calls.push({ association, options });
        return {
            ok: true,
            status: 0x0000,
            association,
            options
        };
    }
}

test("Test: DimseClient echo forwards association and options to transport", async () => {
    var transport = new CapturingEchoTransport();
    var client = new DimseClient({
        host: "127.0.0.1",
        port: 4242,
        callingAeTitle: "EASI_JS",
        calledAeTitle: "ORTHANC",
        query: {
            operation: "c-find",
            level: "STUDY"
        }
    }, transport);

    await client.echo({
        association: {
            port: 11112,
            query: {
                operation: "c-get"
            }
        },
        timeoutMs: 5000
    });

    expect(transport.calls.length).toBe(1);
    expect(transport.calls[0].association.host).toBe("127.0.0.1");
    expect(transport.calls[0].association.port).toBe(11112);
    expect(transport.calls[0].association.query.operation).toBe("c-get");
    expect(transport.calls[0].association.query.level).toBe("STUDY");
    expect(transport.calls[0].options.association).toBeUndefined();
    expect(transport.calls[0].options.timeoutMs).toBe(5000);
});

test("Test: DimseClient echo throws when association is missing", async () => {
    var transport = new CapturingEchoTransport();
    var client = new DimseClient(null, transport);

    await expect(client.echo()).rejects.toThrow("requires an association");
});

test("Test: DimseClient echo throws when transport lacks echo", async () => {
    var client = new DimseClient({
        host: "127.0.0.1",
        port: 4242,
        callingAeTitle: "EASI_JS",
        calledAeTitle: "ORTHANC"
    }, {});

    await expect(client.echo()).rejects.toThrow("does not support echo");
});
