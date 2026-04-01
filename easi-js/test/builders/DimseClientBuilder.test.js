import DimseClientBuilder from "../../src/builders/DimseClientBuilder.js";
import DimseAssociationBuilder from "../../src/builders/DimseAssociationBuilder.js";
import DimseClient from "../../src/clients/DimseClient.js";
import EASI from "../../src/EASI.js";

class FakeEchoTransport {
    async echo(association, options = null) {
        return {
            ok: true,
            status: 0x0000,
            association,
            options
        };
    }
}

test("Test: DimseClientBuilder entry points are available", () => {
    expect(DimseClientBuilder.builder() instanceof DimseClientBuilder).toBe(true);
    expect(EASI.dimseClientBuilder() instanceof DimseClientBuilder).toBe(true);
});

test("Test: DimseClientBuilder builds client from association object", async () => {
    var association = {
        host: "127.0.0.1",
        port: 4242,
        callingAeTitle: "EASI_JS",
        calledAeTitle: "ORTHANC"
    };

    var client = new DimseClientBuilder()
        .withAssociation(association)
        .withTransport(new FakeEchoTransport())
        .build();

    expect(client instanceof DimseClient).toBe(true);

    var result = await client.echo();
    expect(result.ok).toBe(true);
    expect(result.association.host).toBe("127.0.0.1");
    expect(result.association.port).toBe(4242);
});

test("Test: DimseClientBuilder supports withAssociationBuilder", async () => {
    var associationBuilder = new DimseAssociationBuilder()
        .withHost("127.0.0.1")
        .withPort(4242)
        .withCallingAeTitle("EASI_JS")
        .withCalledAeTitle("ORTHANC");

    var client = new DimseClientBuilder()
        .withAssociationBuilder(associationBuilder)
        .withTransport(new FakeEchoTransport())
        .build();

    var result = await client.echo();
    expect(result.association.callingAeTitle).toBe("EASI_JS");
    expect(result.association.calledAeTitle).toBe("ORTHANC");
});

test("Test: DimseClientBuilder default transport supports echo", () => {
    var client = new DimseClientBuilder()
        .withAssociation({ host: "127.0.0.1", port: 4242, callingAeTitle: "EASI", calledAeTitle: "ORTHANC" })
        .build();

    expect(typeof client._transport.echo).toBe("function");
});

test("Test: DimseClientBuilder throws when transport does not support echo", () => {
    expect(() => {
        new DimseClientBuilder()
            .withAssociation({ host: "127.0.0.1", port: 4242, callingAeTitle: "EASI", calledAeTitle: "ORTHANC" })
            .withTransport({})
            .build();
    }).toThrow("echo");
});
