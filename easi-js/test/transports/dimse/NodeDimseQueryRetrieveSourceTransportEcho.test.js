import NodeDimseQueryRetrieveSourceTransport from "../../../src/transports/dimse/NodeDimseQueryRetrieveSourceTransport.js";

class MockEchoTransport extends NodeDimseQueryRetrieveSourceTransport {
    constructor() {
        super();
        this.sent = [];
        this.releaseCalled = false;
        this.cleanupCalled = false;
    }

    async connectSocket() {
        return {
            destroy() { },
            setNoDelay() { },
            setTimeout() { },
            once() { },
            on() { },
            off() { }
        };
    }

    createPduReader() {
        return {
            queue: {
                async shift() {
                    return {
                        type: 0x02,
                        payload: new Uint8Array(0)
                    };
                }
            },
            cleanup: () => {
                this.cleanupCalled = true;
            }
        };
    }

    parseAssociateAc(payload, contexts) {
        return {
            maxPduLength: 16384,
            contexts: new Map([
                [contexts[0].id, {
                    accepted: true,
                    reason: 0x00,
                    transferSyntaxUid: "1.2.840.10008.1.2",
                    context: contexts[0]
                }]
            ])
        };
    }

    async writePdu() {
        // no-op for test
    }

    async sendDimseRequest(socket, contextId, maxPduLength, commandBytes, dataSetBytes) {
        this.sent.push({
            contextId,
            maxPduLength,
            commandBytes,
            dataSetBytes
        });
    }

    async receiveEchoResponse() {
        return {
            status: 0x0000,
            messageIdBeingRespondedTo: 7
        };
    }

    async releaseAssociation() {
        this.releaseCalled = true;
    }
}

test("Test: NodeDimseQueryRetrieveSourceTransport supports DIMSE C-ECHO", async () => {
    var transport = new MockEchoTransport();

    var response = await transport.echo({
        host: "127.0.0.1",
        port: 4242,
        callingAeTitle: "EASI_JS",
        calledAeTitle: "ORTHANC"
    }, {
        messageId: 7
    });

    expect(response.ok).toBe(true);
    expect(response.status).toBe(0x0000);
    expect(response.dimse.operation).toBe("c-echo");
    expect(response.dimse.messageId).toBe(7);
    expect(response.dimse.messageIdBeingRespondedTo).toBe(7);
    expect(transport.sent.length).toBe(1);
    expect(transport.sent[0].dataSetBytes).toBe(null);
    expect(transport.releaseCalled).toBe(true);
    expect(transport.cleanupCalled).toBe(true);
});

test("Test: NodeDimseQueryRetrieveSourceTransport rejects invalid C-ECHO messageId", async () => {
    var transport = new MockEchoTransport();

    await expect(transport.echo({
        host: "127.0.0.1",
        port: 4242,
        callingAeTitle: "EASI_JS",
        calledAeTitle: "ORTHANC"
    }, {
        messageId: 0
    })).rejects.toThrow("messageId");
});
