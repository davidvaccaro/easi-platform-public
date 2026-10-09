import fs from "node:fs";
import path from "node:path";
import CodecRegistry from "../../src/codecs/CodecRegistry.js";
import TransferSyntax from "../../src/dicom/TransferSyntax.js";
import { resolveContractsRoot } from "../../tools/contracts/resolveContractsRoot.js";

function loadCodecPluginContract() {
    const contractsRoot = resolveContractsRoot(path.resolve(process.cwd()));
    const fixture = path.join(contractsRoot, "fixtures", "neutral", "valid", "codec-plugin-contract", "basic.json");
    return JSON.parse(fs.readFileSync(fixture, "utf8"));
}

function getRequiredMethodName(contract, interfaceKey) {
    const requiredMethods = contract?.interfaces?.[interfaceKey]?.requiredMethods;
    if (Array.isArray(requiredMethods) != true || requiredMethods.length == 0) {
        throw new Error(`Codec contract is missing required methods for ${interfaceKey}.`);
    }

    const methodName = String(requiredMethods[0]?.name ?? "").trim();
    if (methodName.length == 0) {
        throw new Error(`Codec contract is missing a required method name for ${interfaceKey}.`);
    }
    return methodName;
}

function createCodecInstance(interfaceKind, marker, context = null) {
    if (interfaceKind == "decoder") {
        return {
            marker,
            context,
            decode(source, sourceStart, sourceStop, destination, destinationStart) {
                return true;
            }
        };
    }

    if (interfaceKind == "image-decoder") {
        return {
            marker,
            context,
            decodeImage(payload, options = null) {
                return {
                    marker,
                    width: 1,
                    height: 1,
                    bytes: new Uint8Array([0, 0, 0, 255])
                };
            }
        };
    }

    return {
        marker,
        encode(imageData, options = null) {
            return {
                bytes: new Uint8Array([1]),
                mimeType: "application/octet-stream",
                format: marker
            };
        }
    };
}

function createRegistration(interfaceKind, form, marker) {
    if (form == "constructor") {
        if (interfaceKind == "decoder") {
            return class DecoderPlugin {
                constructor(context) {
                    this.context = context;
                    this.marker = marker;
                }
                decode(source, sourceStart, sourceStop, destination, destinationStart) {
                    return true;
                }
            };
        }

        if (interfaceKind == "image-decoder") {
            return class ImageDecoderPlugin {
                constructor(context) {
                    this.context = context;
                    this.marker = marker;
                }
                decodeImage(payload, options = null) {
                    return {
                        marker,
                        width: 1,
                        height: 1,
                        bytes: new Uint8Array([0, 0, 0, 255])
                    };
                }
            };
        }

        return class EncoderPlugin {
            constructor(context) {
                this.context = context;
                this.marker = marker;
            }
            encode(imageData, options = null) {
                return {
                    bytes: new Uint8Array([1]),
                    mimeType: "application/octet-stream",
                    format: marker
                };
            }
        };
    }

    if (form == "instance") {
        return createCodecInstance(interfaceKind, marker, null);
    }

    if (form == "provider") {
        return {
            create(context = null) {
                return createCodecInstance(interfaceKind, marker, context);
            }
        };
    }

    return (context = null) => createCodecInstance(interfaceKind, marker, context);
}

test("Codec plugin contract fixture exposes expected interface declarations", () => {
    const contract = loadCodecPluginContract();

    expect(contract.kind).toBe("EASI.CodecPluginContract");
    expect(contract.pluginFamily).toBe("codec");
    expect(Array.isArray(contract.registrationForms)).toBe(true);
    expect(contract.registrationForms.length).toBeGreaterThan(0);
    expect(contract.conformance).toEqual({
        providersMustBeSynchronous: true,
        promiseProvidersRejected: true,
        requiredMethodsValidated: true
    });
    expect(getRequiredMethodName(contract, "decoder")).toBe("decode");
    expect(getRequiredMethodName(contract, "imageDecoder")).toBe("decodeImage");
    expect(getRequiredMethodName(contract, "encoder")).toBe("encode");
});

test("Codec plugin registration forms declared by contract are runtime-compatible with CodecRegistry", () => {
    const contract = loadCodecPluginContract();
    const forms = Array.isArray(contract.registrationForms) ? contract.registrationForms : [];
    const registry = new CodecRegistry();

    const requiredTransferSyntaxes = [];
    const requiredImageDecoders = [];
    const requiredEncoders = [];

    const decoderMethodName = getRequiredMethodName(contract, "decoder");
    const imageDecoderMethodName = getRequiredMethodName(contract, "imageDecoder");
    const encoderMethodName = getRequiredMethodName(contract, "encoder");

    for (let i = 0; i < forms.length; i++) {
        const form = String(forms[i] ?? "").trim().toLowerCase();
        const marker = `form-${form}-${i}`;
        if (form.length == 0) {
            continue;
        }

        const transferSyntaxID = `1.2.840.10008.1.2.999.${i + 1}`;
        const imageFormat = `x-easi-image-${form}-${i}`;
        const encoderFormat = `x-easi-encoder-${form}-${i}`;

        registry.setDecoderForTransferSyntax(
            transferSyntaxID,
            createRegistration("decoder", form, marker)
        );
        registry.setDecoderForImageFormat(
            imageFormat,
            createRegistration("image-decoder", form, marker)
        );
        registry.setEncoder(
            encoderFormat,
            createRegistration("encoder", form, marker)
        );

        requiredTransferSyntaxes.push(transferSyntaxID);
        requiredImageDecoders.push(imageFormat);
        requiredEncoders.push(encoderFormat);

        const decoder = registry.getDecoderForTransferSyntax(transferSyntaxID, { marker });
        const imageDecoder = registry.getDecoderForImageFormat(imageFormat, { marker });
        const encoder = registry.getEncoder(encoderFormat);

        expect(typeof decoder?.[decoderMethodName]).toBe("function");
        expect(typeof imageDecoder?.[imageDecoderMethodName]).toBe("function");
        expect(typeof encoder?.[encoderMethodName]).toBe("function");
    }

    registry.setDecoderForTransferSyntax(
        TransferSyntax.NONE,
        createRegistration("decoder", "factory", "default-decoder")
    );

    const report = registry.assertValid({
        requireDefaultDecoder: true,
        requiredTransferSyntaxes,
        requiredImageDecoders,
        requiredEncoders,
        validateProviderFactories: true
    });

    expect(report.ok).toBe(true);
});

test("Codec plugin conformance flags are enforced by runtime validation", () => {
    const contract = loadCodecPluginContract();
    const conformance = contract?.conformance ?? {};

    if ((conformance.providersMustBeSynchronous == true) || (conformance.promiseProvidersRejected == true)) {
        const registry = new CodecRegistry();
        registry.setDecoderForTransferSyntax(TransferSyntax.NONE, () => Promise.resolve(createCodecInstance("decoder", "promise-default")));

        const report = registry.validate({
            requireDefaultDecoder: true,
            validateProviderFactories: true
        });

        expect(report.ok).toBe(false);
        expect(report.errors.find((error) => error.code == "InvalidDecoderProviderOutput")).toBeDefined();
        expect(report.errors.find((error) => (error.message ?? "").includes("must resolve synchronously"))).toBeDefined();
    }

    if (conformance.requiredMethodsValidated == true) {
        const registry = new CodecRegistry();
        registry.setDecoderForTransferSyntax(TransferSyntax.NONE, createRegistration("decoder", "factory", "valid-default"));
        registry.setEncoder("broken", () => ({ notEncode: true }));

        const report = registry.validate({
            requireDefaultDecoder: true,
            validateProviderFactories: true,
            requiredEncoders: ["broken"]
        });

        expect(report.ok).toBe(false);
        expect(report.errors.find((error) => error.code == "InvalidEncoderProviderOutput")).toBeDefined();
        expect(report.errors.find((error) => (error.message ?? "").includes("missing required method(s): encode"))).toBeDefined();
    }
});
