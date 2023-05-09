import Exception from '../../environment/Exception.js';
import { GeneralErrorCodes } from '../../environment/Exception.js';
import { DicomErrorCodes } from '../../environment/Exception.js';

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