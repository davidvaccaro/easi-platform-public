// Serialization helpers for the FHIR R4 models used by ImagingStudy mapping.

export function asArray(value) {
    return (value == null) ? [] : (Array.isArray(value) ? value : [value]);
}

export function toUnsignedInteger(value) {

    if ((typeof value === 'string') && (/^\d+$/.test(value.trim()) === false))
        return undefined;

    if ((typeof value !== 'string') && (typeof value !== 'number'))
        return undefined;

    var number = Number(value);
    return (Number.isInteger(number) && (number >= 0) && (number <= 2147483647)) ? number : undefined;

}

/**
 * Omit absent values and empty structures in the mapped FHIR JSON tree.
 * Preserve meaningful false/zero values and repeating-element order.
 */
export function toFhirJSON(value) {

    if (value == null)
        return undefined;

    if ((typeof value === 'string') && (value.trim().length === 0))
        return undefined;

    if ((typeof value === 'number') && (Number.isFinite(value) === false))
        return undefined;

    if (typeof value.toJSON === 'function')
        return toFhirJSON(value.toJSON());

    if (Array.isArray(value)) {
        var items = value.map(toFhirJSON).filter((item) => item !== undefined);
        return (items.length > 0) ? items : undefined;
    }

    if (typeof value === 'object') {
        var result = {};
        for (var key of Object.keys(value)) {
            var item = toFhirJSON(value[key]);
            if (item !== undefined)
                result[key] = item;
        }
        return (Object.keys(result).length > 0) ? result : undefined;
    }

    return value;

}
