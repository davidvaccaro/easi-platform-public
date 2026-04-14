import MixedImagingNormalizationFilter from "../../../src/handlers/filters/MixedImagingNormalizationFilter.js";

test("Test: MixedImagingNormalizationFilter configures internal DICOM parser for materialized bulk-data", () => {

    var filter = new MixedImagingNormalizationFilter({
        onEnd(_context, payload) {
            return payload;
        }
    }, {
        mode: "frames"
    });

    expect(filter.dicomParser).toBeDefined();
    expect(filter.dicomParserBulkDataPolicy).toBeDefined();
    expect(filter.dicomParserBulkDataPolicy.mode).toBe("materialize");
    expect(filter.dicomParserBulkDataPolicy.hardSafetyCap).toBe(Number.MAX_SAFE_INTEGER);
    expect(filter.dicomParserBulkDataPolicy.knownLengthThreshold).toBe(Number.MAX_SAFE_INTEGER);

    var parserPolicy = filter.dicomParser.bulkDataPolicy;
    expect(parserPolicy.mode).toBe("materialize");
    expect(parserPolicy.hardSafetyCap).toBe(Number.MAX_SAFE_INTEGER);
    expect(parserPolicy.knownLengthThreshold).toBe(Number.MAX_SAFE_INTEGER);

});

test("Test: MixedImagingNormalizationFilter honors custom parser bulk-data caps while forcing materialize mode", () => {

    var filter = new MixedImagingNormalizationFilter({
        onEnd(_context, payload) {
            return payload;
        }
    }, {
        mode: "frames",
        dicomBulkDataPolicy: {
            mode: "stream",
            knownLengthThreshold: 123456,
            hardSafetyCap: 987654
        }
    });

    expect(filter.dicomParserBulkDataPolicy.mode).toBe("materialize");
    expect(filter.dicomParserBulkDataPolicy.knownLengthThreshold).toBe(123456);
    expect(filter.dicomParserBulkDataPolicy.hardSafetyCap).toBe(987654);

    var parserPolicy = filter.dicomParser.bulkDataPolicy;
    expect(parserPolicy.mode).toBe("materialize");
    expect(parserPolicy.knownLengthThreshold).toBe(123456);
    expect(parserPolicy.hardSafetyCap).toBe(987654);

});

