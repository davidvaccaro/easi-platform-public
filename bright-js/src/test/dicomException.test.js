import DicomException from '../dicomException.js';
import DicomErrorCodes from '../dicomException.js';

test("Test: GeneralError", () => {
    const t = () => {
      throw new DicomException("GeneralError", DicomErrorCodes.GeneralError);
    };
    expect(t).toThrow(DicomException);
});

test("Test: InvalidParameter", () => {
    const t = () => {
      throw new DicomException("InvalidParameter", DicomErrorCodes.InvalidParameter);
    };
    expect(t).toThrow(DicomException);
});

test("Test: NotImplemented", () => {
    const t = () => {
      throw new DicomException("NotImplemented", DicomErrorCodes.NotImplemented);
    };
    expect(t).toThrow(DicomException);
});

test("Test: InvalidPart", () => {
    const t = () => {
      throw new DicomException("InvalidPart", DicomErrorCodes.InvalidPart);
    };
    expect(t).toThrow(DicomException);
});

test("Test: InvalidValueRepresentation", () => {
    const t = () => {
      throw new DicomException("InvalidValueRepresentation", DicomErrorCodes.InvalidValueRepresentation);
    };
    expect(t).toThrow(DicomException);
});

test("Test: InvalidTag", () => {
    const t = () => {
      throw new DicomException("InvalidTag", DicomErrorCodes.InvalidTag);
    };
    expect(t).toThrow(DicomException);
});

test("Test: InvalidDataElement", () => {
    const t = () => {
      throw new DicomException("InvalidDataElement", DicomErrorCodes.InvalidDataElement);
    };
    expect(t).toThrow(DicomException);
});

test("Test: InvalidSequence", () => {
    const t = () => {
      throw new DicomException("InvalidSequence", DicomErrorCodes.InvalidSequence);
    };
    expect(t).toThrow(DicomException);
});

test("Test: DuplicateAttribute", () => {
    const t = () => {
      throw new DicomException("DuplicateAttribute", DicomErrorCodes.DuplicateAttribute);
    };
    expect(t).toThrow(DicomException);
});

test("Test: InvalidMetaSet", () => {
    const t = () => {
      throw new DicomException("InvalidMetaSet", DicomErrorCodes.InvalidMetaSet);
    };
    expect(t).toThrow(DicomException);
});