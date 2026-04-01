import DimseAssociationBuilder from "../../src/builders/DimseAssociationBuilder.js";
import EASI from "../../src/EASI.js";

test("Test: DimseAssociationBuilder build defaults to empty association", () => {
    var association = new DimseAssociationBuilder().build();
    expect(association).toEqual({});
});

test("Test: DimseAssociationBuilder entry points are available", () => {
    expect(DimseAssociationBuilder.builder() instanceof DimseAssociationBuilder).toBe(true);
    expect(EASI.dimseAssociationBuilder() instanceof DimseAssociationBuilder).toBe(true);
});

test("Test: DimseAssociationBuilder configures association identity and transport options", () => {
    var association = new DimseAssociationBuilder()
        .withHost("127.0.0.1")
        .withPort(4242)
        .withCallingAeTitle("  EASI_JS  ")
        .withCalledAeTitle("  ORTHANC  ")
        .withQueryOption("operation", "cfind")
        .withTransportTls({
            rejectUnauthorized: false,
            servername: "pacs.local"
        })
        .withAssociationTimeoutMs(20000)
        .build();

    expect(association.host).toBe("127.0.0.1");
    expect(association.port).toBe(4242);
    expect(association.callingAeTitle).toBe("EASI_JS");
    expect(association.calledAeTitle).toBe("ORTHANC");
    expect(association.query.operation).toBe("cfind");
    expect(association.tls.rejectUnauthorized).toBe(false);
    expect(association.tls.servername).toBe("pacs.local");
    expect(association.associationTimeoutMs).toBe(20000);
});

test("Test: DimseAssociationBuilder configures query AE-title options with dedicated methods", () => {
    var association = new DimseAssociationBuilder()
        .withMoveDestinationAeTitle("  EASI_MOVE_DEST  ")
        .withMoveStoreCalledAeTitle("  EASI_STORE_SCP  ")
        .build();

    expect(association.query).toBeDefined();
    expect(association.query.moveDestinationAeTitle).toBe("EASI_MOVE_DEST");
    expect(association.query.moveStoreCalledAeTitle).toBe("EASI_STORE_SCP");
});

test("Test: DimseAssociationBuilder configures transport mTLS with default rejectUnauthorized", () => {
    var association = new DimseAssociationBuilder()
        .withTransportMutualTls({
            cert: "CERT_DATA",
            key: "KEY_DATA"
        })
        .build();

    expect(association.tls.cert).toBe("CERT_DATA");
    expect(association.tls.key).toBe("KEY_DATA");
    expect(association.tls.rejectUnauthorized).toBe(true);
});

test("Test: DimseAssociationBuilder configures move-store TLS and policy", () => {
    var association = new DimseAssociationBuilder()
        .withMoveStoreTls({
            cert: "SCP_CERT",
            key: "SCP_KEY"
        })
        .withMoveStorePolicyOption("allowedCallingAeTitles", ["ORTHANC"])
        .withMoveStoreAssociationTimeoutMs(9000)
        .build();

    expect(association.query).toBeDefined();
    expect(association.query.moveStoreTls.cert).toBe("SCP_CERT");
    expect(association.query.moveStoreTls.key).toBe("SCP_KEY");
    expect(association.query.moveStorePolicy.allowedCallingAeTitles).toEqual(["ORTHANC"]);
    expect(association.query.moveStorePolicy.associationTimeoutMs).toBe(9000);
});

test("Test: DimseAssociationBuilder accepts empty move-store policy configuration", () => {
    var association = new DimseAssociationBuilder()
        .withMoveStorePolicy()
        .build();

    expect(association.query).toBeDefined();
    expect(association.query.moveStorePolicy).toEqual({});
});

test("Test: DimseAssociationBuilder merges over a base association", () => {
    var baseAssociation = {
        host: "10.1.2.3",
        port: 104,
        query: {
            operation: "c-find",
            level: "STUDY"
        }
    };

    var association = new DimseAssociationBuilder()
        .withBaseAssociation(baseAssociation)
        .withHost("127.0.0.1")
        .withPort(4242)
        .withCallingAeTitle("EASI")
        .withCalledAeTitle("ORTHANC")
        .withMoveStoreTls(false)
        .build();

    expect(association.host).toBe("127.0.0.1");
    expect(association.port).toBe(4242);
    expect(association.callingAeTitle).toBe("EASI");
    expect(association.calledAeTitle).toBe("ORTHANC");
    expect(association.query.operation).toBe("c-find");
    expect(association.query.level).toBe("STUDY");
    expect(association.query.moveStoreTls).toBe(false);
});

test("Test: DimseAssociationBuilder throws when mTLS cert/key pair is incomplete", () => {
    expect(() => {
        new DimseAssociationBuilder()
            .withTransportTls({
                cert: "ONLY_CERT"
            })
            .build();
    }).toThrow("requires both cert and key");
});

test("Test: DimseAssociationBuilder throws when timeout is invalid", () => {
    expect(() => {
        new DimseAssociationBuilder()
            .withAssociationTimeoutMs(0)
            .build();
    }).toThrow("associationTimeoutMs");
});

test("Test: DimseAssociationBuilder throws when port is invalid", () => {
    expect(() => {
        new DimseAssociationBuilder()
            .withPort(0)
            .build();
    }).toThrow("port");
});

test("Test: DimseAssociationBuilder throws when AE-title exceeds 16 chars", () => {
    expect(() => {
        new DimseAssociationBuilder()
            .withCallingAeTitle("ABCDEFGHIJKLMNOPQ")
            .build();
    }).toThrow("16 characters or fewer");
});

test("Test: DimseAssociationBuilder throws when AE-title includes backslash", () => {
    expect(() => {
        new DimseAssociationBuilder()
            .withCalledAeTitle("ORTH\\ANC")
            .build();
    }).toThrow("backslash");
});

test("Test: DimseAssociationBuilder throws when query AE-title includes non-ASCII chars", () => {
    expect(() => {
        new DimseAssociationBuilder()
            .withQueryOption("moveDestinationAeTitle", "MOVER_DEST_é")
            .build();
    }).toThrow("printable ASCII");
});
