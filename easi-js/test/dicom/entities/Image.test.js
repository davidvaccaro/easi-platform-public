import Image from '../../../src/dicom/entities/Image.js';
import Entity from '../../../src/dicom/entities/Entity.js';
import Tag from '../../../src/dicom/Tag.js';
import TransferSyntax from '../../../src/dicom/TransferSyntax.js';
import Constants from '../../../src/dicom/Constants.js';
import ImagePixelModule from '../../../src/dicom/modules/ImagePixelModule.js';
import MultiFrameModule from '../../../src/dicom/modules/MultiFrameModule.js';
import VisualizationFunctionModule from '../../../src/dicom/modules/VisualizationFunctionModule.js';
import ModalityLookUpTableModule from '../../../src/dicom/modules/ModalityLookUpTableModule.js';
import Configuration from '../../../src/environment/Configuration.js';

function toUint32LE(value) {
    return new Uint8Array([
        (value & 0xFF),
        ((value >> 8) & 0xFF),
        ((value >> 16) & 0xFF),
        ((value >> 24) & 0xFF)
    ]);
}

function createEncapsulatedPixelDataAttribute(frameOffsets) {
    var tableLength = frameOffsets.length * 4;
    return {
        tag: Tag.PixelData,
        transferSyntax: TransferSyntax.NONE,
        valueLength: Constants.UndefinedLength,
        length() {
            return 256;
        },
        indexOf(index, pattern) {
            return 0;
        },
        peek(start, length) {
            if ((start == 4) && (length == 4)) {
                return toUint32LE(tableLength);
            }

            if ((start >= 8) && (start < (8 + tableLength)) && (length == 4)) {
                var index = ((start - 8) / 4);
                return toUint32LE(frameOffsets[index]);
            }

            return null;
        }
    };
}

function createAttributeSet(valueByTagId = {}, pixelDataAttribute = null) {
    return {
        value(tag, defaultValue = null) {
            if (Object.prototype.hasOwnProperty.call(valueByTagId, tag.ID)) {
                return valueByTagId[tag.ID];
            }
            return defaultValue;
        },
        find(tag) {
            if (tag.ID != Tag.PixelData.ID) {
                return null;
            }
            return pixelDataAttribute;
        }
    };
}

beforeEach(() => {
    Configuration.instance = null;
});

afterEach(() => {
    Configuration.instance = null;
});

test("Test: Image Constructor Inheritance And AttributeSet", () => {
    var attributeSet = createAttributeSet();
    var image = new Image(attributeSet);

    expect(image).toBeInstanceOf(Entity);
    expect(image.attributeSet).toBe(attributeSet);
});

test("Test: Image ImagePixelModule Getter", () => {
    var attributeSet = createAttributeSet();
    var image = new Image(attributeSet);
    var module = image.imagePixelModule;

    expect(module).toBeInstanceOf(ImagePixelModule);
    expect(module.attributeSet).toBe(attributeSet);
});

test("Test: Image MultiFrameModule Getter", () => {
    var attributeSet = createAttributeSet();
    var image = new Image(attributeSet);
    var module = image.multiFrameModule;

    expect(module).toBeInstanceOf(MultiFrameModule);
    expect(module.attributeSet).toBe(attributeSet);
});

test("Test: Image VisualizationFunctionModule Getter", () => {
    var attributeSet = createAttributeSet();
    var image = new Image(attributeSet);
    var module = image.visualizationFunctionModule;

    expect(module).toBeInstanceOf(VisualizationFunctionModule);
    expect(module.attributeSet).toBe(attributeSet);
});

test("Test: Image ModalityLookUpTableModule Getter", () => {
    var attributeSet = createAttributeSet();
    var image = new Image(attributeSet);
    var module = image.modalityLookUpTableModule;

    expect(module).toBeInstanceOf(ModalityLookUpTableModule);
    expect(module.attributeSet).toBe(attributeSet);
});

test("Test: Image Module Getters Are Not Cached", () => {
    var image = new Image(createAttributeSet());

    expect(image.imagePixelModule).not.toBe(image.imagePixelModule);
    expect(image.multiFrameModule).not.toBe(image.multiFrameModule);
    expect(image.visualizationFunctionModule).not.toBe(image.visualizationFunctionModule);
    expect(image.modalityLookUpTableModule).not.toBe(image.modalityLookUpTableModule);
});

test("Test: Image IsMultiFrame TRUE When Modality Supports And NumberOfFrames Greater Than One", () => {
    var image = new Image(createAttributeSet({
        [Tag.Modality.ID]: 'CT',
        [Tag.NumberOfFrames.ID]: '2'
    }));

    expect(image.isMultiFrame).toBe(true);
});

test("Test: Image IsMultiFrame FALSE When Modality Supports But NumberOfFrames Equals One", () => {
    var image = new Image(createAttributeSet({
        [Tag.Modality.ID]: 'CT',
        [Tag.NumberOfFrames.ID]: '1'
    }));

    expect(image.isMultiFrame).toBe(false);
});

test("Test: Image IsMultiFrame FALSE When Modality Does Not Support MultiFrame", () => {
    var image = new Image(createAttributeSet({
        [Tag.Modality.ID]: 'CR',
        [Tag.NumberOfFrames.ID]: '3'
    }));

    expect(image.isMultiFrame).toBe(false);
});

test("Test: Image IsMultiFrame Throws When Modality Is Missing", () => {
    var image = new Image(createAttributeSet({
        [Tag.NumberOfFrames.ID]: '3'
    }));

    expect(() => image.isMultiFrame).toThrow();
});

test("Test: Image IsMultiFrame Throws When Modality Is Invalid", () => {
    var image = new Image(createAttributeSet({
        [Tag.Modality.ID]: 'INVALID_MODALITY',
        [Tag.NumberOfFrames.ID]: '3'
    }));

    expect(() => image.isMultiFrame).toThrow();
});

test("Test: Image DecodeFrame NonMultiFrame Uses Provided Decoder", () => {
    var pixelData = new Uint8Array([1, 2, 3, 4, 5, 6]);
    var pixelDataAttribute = {
        tag: Tag.PixelData,
        transferSyntax: TransferSyntax.NONE,
        valueLength: pixelData.length
    };
    var image = new Image(createAttributeSet({
        [Tag.Modality.ID]: 'CR',
        [Tag.NumberOfFrames.ID]: '1',
        [Tag.Rows.ID]: 2,
        [Tag.Columns.ID]: 3,
        [Tag.SamplesPerPixel.ID]: 1,
        [Tag.BitsAllocated.ID]: 8,
        [Tag.PixelData.ID]: pixelData
    }, pixelDataAttribute));
    var destination = new Uint8Array(64);
    var decodeArgs = null;
    var decoder = {
        decode() {
            decodeArgs = Array.from(arguments);
            return 'decoded';
        }
    };

    var result = image.decodeFrame(destination, decoder, 0, 10, 20);

    expect(result).toBe('decoded');
    expect(decodeArgs).not.toBeNull();
    expect(decodeArgs[0]).toBe(pixelData);
    expect(decodeArgs[1]).toBe(0);
    expect(decodeArgs[2]).toBe(6);
    expect(decodeArgs[3]).toBe(destination);
    expect(decodeArgs[4]).toBe(0);
    expect(decodeArgs[5]).toBe(10);
    expect(decodeArgs[6]).toBe(20);
});

test("Test: Image DecodeFrame Uses Configuration Decoder When Decoder Is Null", () => {
    var pixelData = new Uint8Array([1, 2, 3, 4, 5, 6]);
    var pixelDataAttribute = {
        tag: Tag.PixelData,
        transferSyntax: TransferSyntax.NONE,
        valueLength: pixelData.length
    };
    var image = new Image(createAttributeSet({
        [Tag.Modality.ID]: 'CR',
        [Tag.NumberOfFrames.ID]: '1',
        [Tag.Rows.ID]: 2,
        [Tag.Columns.ID]: 3,
        [Tag.SamplesPerPixel.ID]: 1,
        [Tag.BitsAllocated.ID]: 8,
        [Tag.PixelData.ID]: pixelData
    }, pixelDataAttribute));
    var destination = new Uint8Array(64);
    var decodeArgs = null;
    var configCall = null;
    var configuredDecoder = {
        decode() {
            decodeArgs = Array.from(arguments);
            return true;
        }
    };

    Configuration.instance = {
        getDecoderFor(transferSyntax, dicomObject) {
            configCall = {
                transferSyntax: transferSyntax,
                dicomObject: dicomObject
            };
            return configuredDecoder;
        }
    };

    var result = image.decodeFrame(destination, null, 0, 11, 22);

    expect(result).toBe(true);
    expect(configCall).not.toBeNull();
    expect(configCall.transferSyntax).toBe(TransferSyntax.NONE);
    expect(configCall.dicomObject).toBe(image);
    expect(decodeArgs[0]).toBe(pixelData);
    expect(decodeArgs[1]).toBe(0);
    expect(decodeArgs[2]).toBe(6);
    expect(decodeArgs[3]).toBe(destination);
    expect(decodeArgs[4]).toBe(0);
    expect(decodeArgs[5]).toBe(11);
    expect(decodeArgs[6]).toBe(22);
});

test("Test: Image DecodeFrame Provided Decoder Does Not Use Configuration", () => {
    var pixelData = new Uint8Array([1, 2, 3, 4, 5, 6]);
    var pixelDataAttribute = {
        tag: Tag.PixelData,
        transferSyntax: TransferSyntax.NONE,
        valueLength: pixelData.length
    };
    var image = new Image(createAttributeSet({
        [Tag.Modality.ID]: 'CR',
        [Tag.NumberOfFrames.ID]: '1',
        [Tag.Rows.ID]: 2,
        [Tag.Columns.ID]: 3,
        [Tag.SamplesPerPixel.ID]: 1,
        [Tag.BitsAllocated.ID]: 8,
        [Tag.PixelData.ID]: pixelData
    }, pixelDataAttribute));
    var destination = new Uint8Array(64);
    var decoderCalled = false;
    var decoder = {
        decode() {
            decoderCalled = true;
            return true;
        }
    };

    Configuration.instance = {
        getDecoderFor() {
            throw new Error('Configuration decoder should not be used when explicit decoder is provided.');
        }
    };

    var result = image.decodeFrame(destination, decoder, 0, 10, 20);

    expect(result).toBe(true);
    expect(decoderCalled).toBe(true);
});

test("Test: Image DecodeFrame Uses Default WindowCenter And WindowWidth When Both Are Null", () => {
    var pixelData = new Uint8Array([1, 2, 3, 4, 5, 6]);
    var pixelDataAttribute = {
        tag: Tag.PixelData,
        transferSyntax: TransferSyntax.NONE,
        valueLength: pixelData.length
    };
    var image = new Image(createAttributeSet({
        [Tag.Modality.ID]: 'CR',
        [Tag.NumberOfFrames.ID]: '1',
        [Tag.Rows.ID]: 2,
        [Tag.Columns.ID]: 3,
        [Tag.SamplesPerPixel.ID]: 1,
        [Tag.BitsAllocated.ID]: 8,
        [Tag.PixelData.ID]: pixelData,
        [Tag.WindowCenter.ID]: '100\\200',
        [Tag.WindowWidth.ID]: '300\\400'
    }, pixelDataAttribute));
    var destination = new Uint8Array(64);
    var decodeArgs = null;
    var decoder = {
        decode() {
            decodeArgs = Array.from(arguments);
            return true;
        }
    };

    image.decodeFrame(destination, decoder, 0, null, null);

    expect(decodeArgs[5]).toBe(200);
    expect(decodeArgs[6]).toBe(400);
});

test("Test: Image DecodeFrame Replaces Both Window Values When Either Is Null", () => {
    var pixelData = new Uint8Array([1, 2, 3, 4, 5, 6]);
    var pixelDataAttribute = {
        tag: Tag.PixelData,
        transferSyntax: TransferSyntax.NONE,
        valueLength: pixelData.length
    };
    var image = new Image(createAttributeSet({
        [Tag.Modality.ID]: 'CR',
        [Tag.NumberOfFrames.ID]: '1',
        [Tag.Rows.ID]: 2,
        [Tag.Columns.ID]: 3,
        [Tag.SamplesPerPixel.ID]: 1,
        [Tag.BitsAllocated.ID]: 8,
        [Tag.PixelData.ID]: pixelData,
        [Tag.WindowCenter.ID]: '100\\200',
        [Tag.WindowWidth.ID]: '300\\400'
    }, pixelDataAttribute));
    var destination = new Uint8Array(64);
    var decodeArgs = null;
    var decoder = {
        decode() {
            decodeArgs = Array.from(arguments);
            return true;
        }
    };

    image.decodeFrame(destination, decoder, 0, 999, null);

    expect(decodeArgs[5]).toBe(200);
    expect(decodeArgs[6]).toBe(400);
});

test("Test: Image DecodeFrame MultiFrame Uses PixelData Offsets And Null FrameLength", () => {
    var frameOffsets = [0, 50];
    var pixelData = new Uint8Array([7, 8, 9, 10, 11, 12]);
    var pixelDataAttribute = createEncapsulatedPixelDataAttribute(frameOffsets);
    var image = new Image(createAttributeSet({
        [Tag.Modality.ID]: 'CT',
        [Tag.NumberOfFrames.ID]: '2',
        [Tag.Rows.ID]: 1,
        [Tag.Columns.ID]: 1,
        [Tag.SamplesPerPixel.ID]: 1,
        [Tag.BitsAllocated.ID]: 8,
        [Tag.PixelData.ID]: pixelData
    }, pixelDataAttribute));
    var destination = new Uint8Array(64);
    var decodeArgs = null;
    var decoder = {
        decode() {
            decodeArgs = Array.from(arguments);
            return true;
        }
    };

    image.decodeFrame(destination, decoder, 1, 10, 20);

    // BOT offsets point to fragment item starts; decoder start uses fragment value start (+8).
    // valueOffset=8, tableLength=8, offset[1]=50 => itemStart=66 => valueStart=74
    expect(decodeArgs[0]).toBe(pixelData);
    expect(decodeArgs[1]).toBe(74);
    expect(decodeArgs[2]).toBeNull();
    expect(decodeArgs[3]).toBe(destination);
    expect(decodeArgs[4]).toBe(0);
    expect(decodeArgs[5]).toBe(10);
    expect(decodeArgs[6]).toBe(20);
});

test("Test: Image DecodeFrame Throws For Missing PixelData Attribute", () => {
    var image = new Image(createAttributeSet({
        [Tag.Modality.ID]: 'CR',
        [Tag.NumberOfFrames.ID]: '1',
        [Tag.Rows.ID]: 2,
        [Tag.Columns.ID]: 3,
        [Tag.SamplesPerPixel.ID]: 1,
        [Tag.BitsAllocated.ID]: 8
    }, null));
    var destination = new Uint8Array(64);

    expect(() => image.decodeFrame(destination, null, 0, 10, 20)).toThrow();
});

test("Test: Image DecodeFrame Throws For OutOfRange MultiFrame Index", () => {
    var frameOffsets = [0, 50];
    var pixelData = new Uint8Array([7, 8, 9, 10, 11, 12]);
    var pixelDataAttribute = createEncapsulatedPixelDataAttribute(frameOffsets);
    var image = new Image(createAttributeSet({
        [Tag.Modality.ID]: 'CT',
        [Tag.NumberOfFrames.ID]: '2',
        [Tag.Rows.ID]: 1,
        [Tag.Columns.ID]: 1,
        [Tag.SamplesPerPixel.ID]: 1,
        [Tag.BitsAllocated.ID]: 8,
        [Tag.PixelData.ID]: pixelData
    }, pixelDataAttribute));
    var destination = new Uint8Array(64);
    var decoder = {
        decode() {
            return true;
        }
    };

    expect(() => image.decodeFrame(destination, decoder, 10, 10, 20)).toThrow();
});
