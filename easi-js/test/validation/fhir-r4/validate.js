import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import Ajv from 'ajv';

const MAX_UNSIGNED_INT = 2147483647;
const STUDY_STATUSES = ['registered', 'available', 'cancelled', 'entered-in-error', 'unknown'];

/**
 * Compiles the unchanged official R4 definitions for the two resources EASI emits.
 * This is test tooling, not a complete FHIR terminology/profile validator.
 */
export function createFhirR4Validator(schemaPath) {
    const sourcePath = path.resolve(schemaPath);
    const schema = JSON.parse(fs.readFileSync(sourcePath, 'utf8'));
    const requireFromSchema = createRequire(sourcePath);
    const ajv = new Ajv({ strict: false, allErrors: true, inlineRefs: false });
    ajv.addMetaSchema(requireFromSchema('ajv/dist/refs/json-schema-draft-06.json'));

    // The official file uses the obsolete "id" keyword. Only the wrapper is
    // replaced; every official resource and datatype definition stays intact.
    const validators = {};
    for (const resourceType of ['ImagingStudy', 'Patient']) {
        validators[resourceType] = ajv.compile({
            $schema: schema.$schema,
            $ref: '#/definitions/' + resourceType,
            definitions: schema.definitions
        });
    }

    return (resource) => {
        const validator = validators[resource?.resourceType];
        const schemaErrors = validator == null
            ? [{ instancePath: '/resourceType', message: 'Expected ImagingStudy or Patient.' }]
            : (validator(resource) ? [] : validator.errors.map(error => ({ ...error })));
        const semanticErrors = validateEasiFhirSemantics(resource);
        return { valid: schemaErrors.length == 0 && semanticErrors.length == 0, schemaErrors, semanticErrors };
    };
}

/**
 * Checks the bounded EASI mapping contract where the official JSON schema cannot:
 * required primitive values, counts, containment, and calendar dates. Primitive
 * extensions and other resource types are outside this mapping's output scope.
 */
export function validateEasiFhirSemantics(resource) {
    const errors = [];
    const issue = (instancePath, message) => errors.push({ instancePath, message });
    const nonempty = value => typeof value == 'string' && value.length > 0;

    function object(value, location) {
        if (value != null && (typeof value != 'object' || Array.isArray(value)))
            issue(location, 'Expected a JSON object.');
    }

    function objects(values, location) {
        if (Array.isArray(values))
            values.forEach((value, index) => object(value, location + '/' + index));
    }

    function references(values, location) {
        objects(values, location);
        if (Array.isArray(values))
            values.forEach((value, index) => object(value?.identifier, location + '/' + index + '/identifier'));
    }

    function visit(value, location, callback) {
        callback(value, location);
        if (Array.isArray(value)) {
            value.forEach((child, index) => visit(child, location + '/' + index, callback));
        } else if (value != null && typeof value == 'object') {
            Object.entries(value).forEach(([key, child]) => visit(child, location + '/' + key, callback));
        }
    }

    visit(resource, '', (value, location) => {
        if (value == null || value === ''
            || (Array.isArray(value) && value.length == 0)
            || (value != null && typeof value == 'object' && !Array.isArray(value) && Object.keys(value).length == 0))
            issue(location, 'EASI JSON must omit null and empty values.');
    });

    function unsigned(value, location, minimum = 0) {
        if (value != null && (!Number.isInteger(value) || value < minimum || value > MAX_UNSIGNED_INT))
            issue(location, 'Expected an integer from ' + minimum + ' through ' + MAX_UNSIGNED_INT + '.');
    }

    function calendarDate(value, location) {
        if (value == null || typeof value != 'string')
            return;
        const match = /^(\d{4})(?:-(\d{2})(?:-(\d{2}))?)?(?:T|$)/.exec(value);
        if (match == null)
            return; // Syntax, time precision, and timezone are checked by the schema.
        const year = Number(match[1]);
        const month = Number(match[2]);
        const day = Number(match[3]);
        if (year == 0) {
            issue(location, 'FHIR dates require a nonzero year.');
        } else if (match[3] != null) {
            const leap = year % 4 == 0 && (year % 100 != 0 || year % 400 == 0);
            const days = [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
            if (month < 1 || month > 12 || day < 1 || day > days[month - 1])
                issue(location, 'Invalid calendar date.');
        }
    }

    function patient(value, location) {
        objects(value.identifier, location + '/identifier');
        objects(value.name, location + '/name');
        objects(value.telecom, location + '/telecom');
        if (value.gender != null && !['male', 'female', 'other', 'unknown'].includes(value.gender))
            issue(location + '/gender', 'Invalid administrative gender code.');
        calendarDate(value.birthDate, location + '/birthDate');
        if (Array.isArray(value.telecom))
            value.telecom.forEach((contact, index) => unsigned(contact?.rank, location + '/telecom/' + index + '/rank', 1));
    }

    if (resource?.resourceType == 'Patient') {
        patient(resource, '');
        return errors;
    }
    if (resource?.resourceType != 'ImagingStudy') {
        issue('/resourceType', 'Expected ImagingStudy or Patient.');
        return errors;
    }

    if (!STUDY_STATUSES.includes(resource.status))
        issue('/status', 'ImagingStudy.status is required and must use a defined R4 status.');
    object(resource.subject, '/subject');
    object(resource.subject?.identifier, '/subject/identifier');
    objects(resource.identifier, '/identifier');
    objects(resource.modality, '/modality');
    references(resource.endpoint, '/endpoint');
    if (!nonempty(resource.subject?.reference) && !nonempty(resource.subject?.identifier?.value))
        issue('/subject', 'EASI subjects require a reference or logical identifier value.');
    if (resource.subject?.type != null
        && !['Patient', 'Device', 'Group'].includes(String(resource.subject.type).split('/').pop()))
        issue('/subject/type', 'ImagingStudy subjects reference Patient, Device, or Group.');

    unsigned(resource.numberOfSeries, '/numberOfSeries');
    unsigned(resource.numberOfInstances, '/numberOfInstances');
    calendarDate(resource.started, '/started');

    const series = Array.isArray(resource.series) ? resource.series : [];
    const seriesUids = new Set();
    const instanceUids = new Set();
    let representedInstances = 0;
    if (series.length > 0) {
        const studyIdentifiers = Array.isArray(resource.identifier) ? resource.identifier.filter(identifier =>
            identifier?.system == 'urn:dicom:uid' && nonempty(identifier.value) && identifier.value.startsWith('urn:oid:')
        ) : [];
        if (studyIdentifiers.length != 1)
            issue('/identifier', 'A represented DICOM study requires one urn:dicom:uid identifier.');
    }

    series.forEach((item, index) => {
        const location = '/series/' + index;
        object(item, location);
        object(item?.modality, location + '/modality');
        references(item?.endpoint, location + '/endpoint');
        if (!nonempty(item?.uid))
            issue(location + '/uid', 'Series UID is required.');
        else if (seriesUids.has(item.uid))
            issue(location + '/uid', 'Duplicate represented Series UID.');
        seriesUids.add(item?.uid);
        if (!nonempty(item?.modality?.code))
            issue(location + '/modality/code', 'EASI series modalities require a Coding.code.');
        unsigned(item?.number, location + '/number');
        unsigned(item?.numberOfInstances, location + '/numberOfInstances');
        calendarDate(item?.started, location + '/started');

        const instances = Array.isArray(item?.instance) ? item.instance : [];
        representedInstances += instances.length;
        if (item?.numberOfInstances != null && item.numberOfInstances < instances.length)
            issue(location + '/numberOfInstances', 'Count is smaller than the represented instances.');
        instances.forEach((instance, instanceIndex) => {
            const instanceLocation = location + '/instance/' + instanceIndex;
            object(instance, instanceLocation);
            object(instance?.sopClass, instanceLocation + '/sopClass');
            if (!nonempty(instance?.uid))
                issue(instanceLocation + '/uid', 'SOP Instance UID is required.');
            else if (instanceUids.has(instance.uid))
                issue(instanceLocation + '/uid', 'Duplicate represented SOP Instance UID.');
            instanceUids.add(instance?.uid);
            if (!nonempty(instance?.sopClass?.code))
                issue(instanceLocation + '/sopClass/code', 'EASI SOP classes require a Coding.code.');
            unsigned(instance?.number, instanceLocation + '/number');
        });
    });
    if (resource.numberOfSeries != null && resource.numberOfSeries < series.length)
        issue('/numberOfSeries', 'Count is smaller than the represented series.');
    if (resource.numberOfInstances != null && resource.numberOfInstances < representedInstances)
        issue('/numberOfInstances', 'Count is smaller than the represented instances.');

    const contained = Array.isArray(resource.contained) ? resource.contained : [];
    const containedIds = new Set();
    const referencedIds = new Set();
    contained.forEach((value, index) => {
        const location = '/contained/' + index;
        object(value, location);
        if (!nonempty(value?.id) || containedIds.has(value.id))
            issue(location + '/id', 'Contained resources require unique ids.');
        containedIds.add(value?.id);
        if (value?.contained != null)
            issue(location + '/contained', 'Contained resources cannot contain other resources.');
        if (value?.meta?.versionId != null || value?.meta?.lastUpdated != null || value?.meta?.security != null)
            issue(location + '/meta', 'Contained resources cannot carry version, update, or security metadata.');
        if (value?.resourceType == 'Patient')
            patient(value, location);
    });
    visit(resource, '', (value, location) => {
        if (value != null && typeof value == 'object' && typeof value.reference == 'string' && value.reference.startsWith('#')) {
            const id = value.reference.substring(1);
            referencedIds.add(id);
            if (!containedIds.has(id))
                issue(location + '/reference', 'Contained reference does not resolve.');
        }
    });
    contained.forEach((value, index) => {
        if (!referencedIds.has(value?.id))
            issue('/contained/' + index, 'Contained resource is not referenced.');
    });
    return errors;
}
