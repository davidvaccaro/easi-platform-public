import Exception from '../../src/environment/Exception.js';
import { GeneralErrorCodes } from '../../src/environment/Exception.js';
import { DicomErrorCodes } from '../../src/environment/Exception.js';
import { BuilderErrorCodes } from '../../src/environment/Exception.js';

test("Test: GeneralError", () => {
    const t = () => {
      throw new Exception("GeneralError", GeneralErrorCodes.GeneralError);
    };
    expect(t).toThrow(Exception);
});

test("Test: InvalidParameter", () => {
    const t = () => {
      throw new Exception("InvalidParameter", GeneralErrorCodes.InvalidParameter);
    };
    expect(t).toThrow(Exception);
});

test("Test: NotImplemented", () => {
    const t = () => {
      throw new Exception("NotImplemented", GeneralErrorCodes.NotImplemented);
    };
    expect(t).toThrow(Exception);
});

test("Test: InvalidPart", () => {
    const t = () => {
      throw new Exception("InvalidPart", DicomErrorCodes.InvalidPart);
    };
    expect(t).toThrow(Exception);
});

test("Test: InvalidValueRepresentation", () => {
    const t = () => {
      throw new Exception("InvalidValueRepresentation", DicomErrorCodes.InvalidValueRepresentation);
    };
    expect(t).toThrow(Exception);
});

test("Test: InvalidTag", () => {
    const t = () => {
      throw new Exception("InvalidTag", DicomErrorCodes.InvalidTag);
    };
    expect(t).toThrow(Exception);
});

test("Test: InvalidDataElement", () => {
    const t = () => {
      throw new Exception("InvalidDataElement", DicomErrorCodes.InvalidDataElement);
    };
    expect(t).toThrow(Exception);
});

test("Test: InvalidSequence", () => {
    const t = () => {
      throw new Exception("InvalidSequence", DicomErrorCodes.InvalidSequence);
    };
    expect(t).toThrow(Exception);
});

test("Test: DuplicateAttribute", () => {
    const t = () => {
      throw new Exception("DuplicateAttribute", DicomErrorCodes.DuplicateAttribute);
    };
    expect(t).toThrow(Exception);
});

test("Test: InvalidMetaSet", () => {
    const t = () => {
      throw new Exception("InvalidMetaSet", DicomErrorCodes.InvalidMetaSet);
    };
    expect(t).toThrow(Exception);
});

test("Test: Exception extends Error", () => {
    const error = new Exception("MissingParser", BuilderErrorCodes.MissingParser);
    expect(error instanceof Error).toBe(true);
    expect(error instanceof Exception).toBe(true);
    expect(error.message).toBe("MissingParser");
    expect(error.code).toBe(BuilderErrorCodes.MissingParser);
});
