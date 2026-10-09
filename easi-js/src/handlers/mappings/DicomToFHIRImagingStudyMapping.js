//
// DicomToFHIRImagingStudyMapping.js
//
// Proprietary Notices:
// The Products, Documentation and Materials are proprietary to Xinonix Interactive Development Inc. and its licensors 
// and protected by applicable U.S. and international patent, copyright, trademark and trade secret laws. Xinonix 
// Interactive Development Inc and its licensors shall retain ownership in the Products, Documentation and Materials; 
// all derivatives thereof (in whole or part); and any intellectual property or other rights embodied therein. 
// 
// All proprietary notices incorporated in or affixed to any Products, Documentation or Materials shall be duplicated 
// by you on all copies of the Products, Documentation, or Material, as applicable, and shall not be altered, removed 
// or obliterated. Lease Equipment is, and shall at all times be and remain Our sole and exclusive property; you have 
// no right, title or interest therein or thereto except as expressly set forth in this Agreement. You shall keep the 
// Lease Equipment free and clear of all levies, liens and encumbrances and shall immediately notify us in writing of 
// any circumstances with respect to the location of the Equipment which will adversely affect it or our security 
// interests therein. You shall not install, attach, mount or otherwise house the Lease Equipment in a manner that 
// would render it a fixture under applicable law within the jurisdiction in which the Lease Equipment is located.
//

import DicomMapping from "./DicomMapping.js";
import Tag from "../../dicom/Tag.js";
import TransferSyntax from "../../dicom/TransferSyntax.js";

import Reference from "../../fhir/Reference.js";
import ImagingStudy from "../../fhir/ImagingStudy.js";
import ImagingSeries from "../../fhir/ImagingSeries.js";
import ImagingInstance from "../../fhir/ImagingInstance.js";
import Patient from "../../fhir/Patient.js";

const RawToJsonSymbol = Symbol('easi.fhir.rawToJSON');
const PrunedToJsonInstalledSymbol = Symbol('easi.fhir.prunedToJSON');

export default class DicomToFHIRImagingStudyMapping extends DicomMapping {

    /**
     * Sets how ImagingStudy.subject should be emitted.
     * @param {'none' | 'contained' | 'reference'} mode The subject output mode.
     * @returns {DicomToFHIRImagingStudyMapping} The current mapping.
     */
    setSubjectMode(mode) {
        this.subjectMode = this.normalizeSubjectMode(mode);
        return this;
    }

    /**
     * Sets the ImagingStudy mapping profile.
     * @param {'full' | 'study-summary'} profile The mapping profile.
     * @returns {DicomToFHIRImagingStudyMapping} The current mapping.
     */
    setProfile(profile) {
        this.profile = this.normalizeProfile(profile);
        return this;
    }

    isNullOrBlankValue(value) {

        if (value == null)
            return true;

        if (typeof value === 'string')
            return value.trim().length == 0;

        if (Array.isArray(value))
            return value.length == 0;

        return false;

    }

    toStableMergeKey(value) {

        if (value == null)
            return 'null';

        if ((typeof value === 'string') || (typeof value === 'number') || (typeof value === 'boolean') || (typeof value === 'bigint'))
            return `${typeof value}:${String(value)}`;

        if (value instanceof Date)
            return `date:${value.toISOString()}`;

        if (Array.isArray(value) == true) {
            var itemKeys = value.map((item) => this.toStableMergeKey(item));
            return `array:[${itemKeys.join(',')}]`;
        }

        if (typeof value === 'object') {

            if ((value.resourceType != null) && (value.id != null))
                return `resource:${String(value.resourceType)}:${String(value.id)}`;

            if (value.uid != null)
                return `uid:${String(value.uid)}`;

            if ((value.system != null) && (value.code != null))
                return `system-code:${String(value.system)}:${String(value.code)}`;

            if (value.value != null)
                return `system-value:${String(value.system ?? '')}:${String(value.value)}`;

            var keys = Object.keys(value).sort();
            var fragments = [];
            for (var i = 0; i < keys.length; i++) {
                var key = keys[i];
                fragments.push(`${key}=${this.toStableMergeKey(value[key])}`);
            }
            return `object:{${fragments.join(',')}}`;

        }

        return `other:${String(value)}`;

    }

    mergeUniqueValues(existingValue, incomingValue) {

        if (this.isNullOrBlankValue(incomingValue) == true)
            return existingValue;

        if (this.isNullOrBlankValue(existingValue) == true)
            return incomingValue;

        var values = [];
        var seen = new Set();

        function appendUnique(list, value, getKey) {
            if (value == null)
                return;

            if (Array.isArray(value) == true) {
                for (var index = 0; index < value.length; index++) {
                    appendUnique(list, value[index], getKey);
                }
                return;
            }

            var key = getKey(value);
            if (seen.has(key) == true)
                return;

            seen.add(key);
            list.push(value);
        }

        appendUnique(values, existingValue, (value) => this.toStableMergeKey(value));
        appendUnique(values, incomingValue, (value) => this.toStableMergeKey(value));

        if ((Array.isArray(existingValue) == false) && (Array.isArray(incomingValue) == false) && (values.length == 1))
            return values[0];

        return values;

    }

    mergePreferredScalar(existingValue, incomingValue) {

        if (this.isNullOrBlankValue(existingValue) == true)
            return incomingValue;

        return existingValue;

    }

    mergeInstance(targetInstance, sourceInstance) {

        if ((targetInstance == null) || (sourceInstance == null))
            return targetInstance;

        targetInstance.uid = this.mergePreferredScalar(targetInstance.uid, sourceInstance.uid);
        if (this.isNullOrBlankValue(targetInstance.sopClass) == true)
            targetInstance.sopClass = sourceInstance.sopClass;
        targetInstance.number = this.mergePreferredScalar(targetInstance.number, sourceInstance.number);
        targetInstance.title = this.mergePreferredScalar(targetInstance.title, sourceInstance.title);

        return targetInstance;

    }

    mergeSeries(targetSeries, sourceSeries) {

        if ((targetSeries == null) || (sourceSeries == null))
            return targetSeries;

        targetSeries.uid = this.mergePreferredScalar(targetSeries.uid, sourceSeries.uid);
        targetSeries.number = this.mergePreferredScalar(targetSeries.number, sourceSeries.number);
        if (this.isNullOrBlankValue(targetSeries.modality) == true)
            targetSeries.modality = sourceSeries.modality;
        targetSeries.description = this.mergePreferredScalar(targetSeries.description, sourceSeries.description);
        targetSeries.endpoint = this.mergeUniqueValues(targetSeries.endpoint, sourceSeries.endpoint);
        targetSeries.started = this.mergePreferredScalar(targetSeries.started, sourceSeries.started);

        if (Array.isArray(targetSeries.instances) == false)
            targetSeries.instances = [];

        var sourceInstances = Array.isArray(sourceSeries.instances) ? sourceSeries.instances : [];
        for (var i = 0; i < sourceInstances.length; i++) {
            var candidate = sourceInstances[i];
            if (candidate == null)
                continue;

            var existing = targetSeries.instances.find((instance) => instance?.uid == candidate?.uid);
            if (existing == null) {
                targetSeries.instances.push(candidate);
                continue;
            }

            this.mergeInstance(existing, candidate);
        }

        targetSeries.numberOfInstances = targetSeries.instances.length;
        return targetSeries;

    }

    mergePatient(targetPatient, sourcePatient) {

        if ((targetPatient == null) || (sourcePatient == null))
            return targetPatient;

        targetPatient.id = this.mergePreferredScalar(targetPatient.id, sourcePatient.id);
        for (var incoming of sourcePatient.identifier) {
            var existing = targetPatient.identifier.find(identifier =>
                (identifier.value == incoming.value) && ((identifier.system ?? '') == (incoming.system ?? '')));
            if ((existing != null) && (existing.assigner == null) && (incoming.assigner != null))
                existing.assigner = incoming.assigner;
        }
        targetPatient.identifier = this.mergeUniqueValues(targetPatient.identifier, sourcePatient.identifier);
        targetPatient.active = this.mergePreferredScalar(targetPatient.active, sourcePatient.active);
        targetPatient.name = this.mergeUniqueValues(targetPatient.name, sourcePatient.name);
        targetPatient.telecom = this.mergeUniqueValues(targetPatient.telecom, sourcePatient.telecom);
        targetPatient.gender = this.mergePreferredScalar(targetPatient.gender, sourcePatient.gender);
        targetPatient.birthDate = this.mergePreferredScalar(targetPatient.birthDate, sourcePatient.birthDate);

        return targetPatient;

    }

    mergeStudy(targetStudy, sourceStudy) {

        if ((targetStudy == null) || (sourceStudy == null))
            return targetStudy;

        targetStudy.identifier = this.mergeUniqueValues(targetStudy.identifier, sourceStudy.identifier);
        targetStudy.status = this.mergePreferredScalar(targetStudy.status, sourceStudy.status);
        targetStudy.modality = this.mergeUniqueValues(targetStudy.modality, sourceStudy.modality);
        targetStudy.subject = this.mergePreferredScalar(targetStudy.subject, sourceStudy.subject);
        targetStudy.endpoint = this.mergeUniqueValues(targetStudy.endpoint, sourceStudy.endpoint);
        targetStudy.encounter = this.mergePreferredScalar(targetStudy.encounter, sourceStudy.encounter);
        targetStudy.started = this.mergePreferredScalar(targetStudy.started, sourceStudy.started);
        targetStudy.description = this.mergePreferredScalar(targetStudy.description, sourceStudy.description);

        if (Array.isArray(targetStudy.contained) == false)
            targetStudy.contained = [];
        if (Array.isArray(sourceStudy.contained) == true) {
            for (var c = 0; c < sourceStudy.contained.length; c++) {
                var candidateResource = sourceStudy.contained[c];
                if (candidateResource == null)
                    continue;

                var existingResource = targetStudy.contained.find((resource) =>
                    (resource?.resourceType == candidateResource?.resourceType)
                    && (resource?.id == candidateResource?.id)
                );

                if (existingResource == null) {
                    targetStudy.contained.push(candidateResource);
                    continue;
                }

                if (candidateResource.resourceType == 'Patient') {
                    this.mergePatient(existingResource, candidateResource);
                }
            }
        }

        if (Array.isArray(targetStudy.series) == false)
            targetStudy.series = [];

        var sourceSeries = Array.isArray(sourceStudy.series) ? sourceStudy.series : [];
        for (var i = 0; i < sourceSeries.length; i++) {
            var seriesCandidate = sourceSeries[i];
            if (seriesCandidate == null)
                continue;

            var existingSeries = targetStudy.series.find((series) => series?.uid == seriesCandidate?.uid);
            if (existingSeries == null) {
                targetStudy.series.push(seriesCandidate);
                continue;
            }

            this.mergeSeries(existingSeries, seriesCandidate);
        }

        return targetStudy;

    }

    extractStudyIdentifierValues(study) {

        if (study == null)
            return [];

        var values = [];
        var source = study.identifier;
        var items = Array.isArray(source) ? source : [source];

        for (var i = 0; i < items.length; i++) {
            var item = items[i];
            if (item == null)
                continue;

            var rawValue = (typeof item === 'object')
                ? (item.value ?? item.identifier ?? null)
                : item;

            var normalized = this.normalizeStudyIdentifierValue(rawValue);
            if (normalized != null) {
                values.push(normalized);
            }
        }

        return values;

    }

    resolveCurrentStudy(context) {

        var uid = context.studyUID;
        var study = context.studiesByUID.get(uid);
        if (study == null) {
            study = context.study;
            context.studiesByUID.set(uid, study);
        }
        else {
            this.mergeStudy(study, context.study);
        }

        var studies = Array.from(context.studiesByUID.values());
        context.final = (studies.length == 1) ? studies[0] : studies;
        return study;

    }

    start(context) {

        context.study = new ImagingStudy();
        context.series = new ImagingSeries();
        context.instance = new ImagingInstance();
        context.patient = new Patient();
        context.study.status = this.status;
        context.currentStudy = null;
        context.currentSeries = null;
        context.currentInstance = null;
        context.rawDicom = {};
        context.nativeTextAttributes = new Map();
        context.isNativeDicom = false;
        context.studiesByUID ??= new Map();
        context.patientIdentityByStudy ??= new Map();
        context.seriesStudyUIDs ??= new Map();
        context.instanceSeriesUIDs ??= new Map();
        return super.start(context);

    }

    /**
     * Defer native text decoding until the record's character-set declaration is
     * known. Metadata adapters already supply decoded Unicode values.
     */
    mapAttribute(context, attribute) {
        if ((attribute?.tag == null) || (this.shouldCaptureTag(attribute.tag) != true))
            return;
        var isNative = (attribute.transferSyntax != TransferSyntax.NONE) && (attribute._value == null);
        var vr = attribute.vr?.ID ?? attribute.tag.VR?.ID;
        if (isNative) {
            context.isNativeDicom = true;
            if (['AE', 'SH', 'UI', 'LO', 'IS', 'DS', 'CS', 'PN', 'LT', 'ST', 'UC', 'UT', 'UR', 'DA', 'TM', 'DT'].includes(vr)) {
                context.nativeTextAttributes.set(attribute.tag.ID, { attribute: attribute, vr: vr, bytes: attribute.access() });
                return;
            }
        }
        context.rawDicom[attribute.tag.ID] = attribute.value;
        super.mapAttribute(context, attribute);
    }

    decodeNativeText(bytes, characterSet, tag) {
        var text;
        try {
            if (characterSet == 'ISO_IR 192') {
                text = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
            }
            else {
                // The Encoding Standard aliases TextDecoder's Latin-1 label to
                // Windows-1252. Decode exact ISO-8859-1 code points instead.
                var parts = [];
                for (var offset = 0; offset < bytes.length; offset += 8192) {
                    var chunk = bytes.subarray(offset, offset + 8192);
                    if ((characterSet == 'ISO_IR 6') && chunk.some(byte => byte > 127))
                        throw new Error('non-ASCII byte');
                    parts.push(String.fromCharCode(...chunk));
                }
                text = parts.join('');
            }
        }
        catch {
            throw new Error(`Cannot map FHIR R4: invalid ${characterSet} text in DICOM ${tag.Keyword ?? tag.ID}.`);
        }
        if (text.includes('\u001b'))
            throw new Error('Cannot map FHIR R4: ISO 2022 escape sequences are not supported in native DICOM text.');
        return text.replace(/\0/g, '').trim();
    }

    decodeNativeAttributes(context) {
        if (context.isNativeDicom != true)
            return;
        var declaration = context.nativeTextAttributes.get(Tag.SpecificCharacterSet.ID);
        var characterSet = declaration == null ? this.scalarText(context.rawDicom[Tag.SpecificCharacterSet.ID])
            : this.decodeNativeText(declaration.bytes, 'ISO_IR 6', declaration.attribute.tag);
        characterSet = characterSet || 'ISO_IR 6';
        if (!['ISO_IR 6', 'ISO_IR 100', 'ISO_IR 192'].includes(characterSet))
            throw new Error(`Cannot map FHIR R4: unsupported native DICOM SpecificCharacterSet "${characterSet}"; use ASCII, ISO_IR 100 or ISO_IR 192.`);
        for (var { attribute, vr, bytes } of context.nativeTextAttributes.values()) {
            var encoding = ['SH', 'LO', 'PN', 'LT', 'ST', 'UC', 'UT'].includes(vr) ? characterSet : 'ISO_IR 6';
            var value = this.decodeNativeText(bytes, encoding, attribute.tag);
            attribute.value = value;
            context.rawDicom[attribute.tag.ID] = value;
            super.mapAttribute(context, attribute);
        }
    }

    end(context) {

        this.prepareRecord(context);
        this.validateRecord(context);
        this.validateMerge(context);
        var study = this.resolveCurrentStudy(context);
        var series = null;
        var instance = null;

        if (this.profile == 'full') {
            series = study.series.find(candidate => candidate.uid == context.series.uid);
            if (series == null) {
                series = context.series;
                study.series.push(series);
            }
            else {
                this.mergeSeries(series, context.series);
            }

            instance = series.instances.find(candidate => candidate.uid == context.instance.uid);
            if (instance == null) {
                instance = context.instance;
                series.instances.push(instance);
            }
            else {
                this.mergeInstance(instance, context.instance);
            }

            series.numberOfInstances = series.instances.length;
            study.numberOfSeries = study.series.length;
            study.numberOfInstances = this.calculateStudyInstanceCount(study);
            // A full result represents the mapped subset, including its modalities.
            study.modality = this.normalizeStudyModalities(study.series.map(candidate => candidate.modality));
        }
        else {
            study.series = [];
            study.numberOfSeries = this.mergePreferredScalar(study.numberOfSeries, context.study.numberOfSeries);
            study.numberOfInstances = this.mergePreferredScalar(study.numberOfInstances, context.study.numberOfInstances);
        }

        this.applySubject(study, context);
        this.normalizeStudy(study);
        context.currentStudy = study;
        context.currentSeries = series;
        context.currentInstance = instance;
        super.end(context);
        context.currentStudy = null;
        context.currentSeries = null;
        context.currentInstance = null;
        this.installPrunedSerializationForFinalResult(context.final);
        return context.final;

    }

    scalarText(value) {
        if (Array.isArray(value)) {
            if (value.length > 1)
                throw new Error('FHIR mapping expected a single DICOM value.');
            value = value[0];
        }
        if (value == null)
            return null;
        if ((typeof value != 'string') && (typeof value != 'number'))
            throw new Error('FHIR mapping expected a textual DICOM value.');
        var text = String(value).replace(/\0/g, '').trim();
        return text.length > 0 ? text : null;
    }

    requireUID(value, label) {
        var text = this.scalarText(value);
        if ((text == null) || (text.length > 64) || !/^[0-2](?:\.[0-9]+)+$/.test(text)
            || text.split('.').some(component => (component.length > 1) && component.startsWith('0')))
            throw new Error(`Cannot map FHIR R4 ImagingStudy: missing or invalid ${label}.`);
        return text;
    }

    prepareRecord(context) {
        this.decodeNativeAttributes(context);
        var raw = context.rawDicom;
        context.studyUID = this.requireUID(raw[Tag.StudyInstanceUID.ID], 'StudyInstanceUID');
        context.study.identifier = [{ system: 'urn:dicom:uid', value: `urn:oid:${context.studyUID}` }];
        for (var entry of [[Tag.StudyID, 'study'], [Tag.AccessionNumber, 'accession']]) {
            var text = this.scalarText(raw[entry[0].ID]);
            if (text != null) {
                var identifier = { value: text };
                if (this.identifierSystems[entry[1]] != null)
                    identifier.system = this.identifierSystems[entry[1]];
                context.study.identifier.push(identifier);
            }
        }

        var patientID = this.scalarText(raw[Tag.PatientID.ID]);
        var issuer = this.scalarText(raw[Tag.IssuerOfPatientID.ID]);
        context.patient.identifier = [];
        if (patientID != null) {
            var patientIdentifier = { value: patientID };
            if (this.identifierSystems.patient != null)
                patientIdentifier.system = this.identifierSystems.patient;
            if (issuer != null)
                patientIdentifier.assigner = { display: issuer };
            context.patient.identifier = [patientIdentifier];
        }
        context.patientIdentity = { value: patientID, issuer: issuer };
        context.patient.name = this.normalizePatientNames(raw[Tag.PatientName.ID]);
        context.patient.telecom = [Tag.PatientTelephoneNumbers, Tag.PatientTelecomInformation]
            .flatMap(tag => this.multipleTextValues(raw[tag.ID]));
        context.patient.birthDate = this.normalizeDate(raw[Tag.PatientBirthDate.ID]);
        context.study.started = this.normalizeStarted(raw[Tag.StudyDate.ID], raw[Tag.StudyTime.ID], raw[Tag.TimezoneOffsetFromUTC.ID]);
        context.series.started = this.normalizeStarted(raw[Tag.SeriesDate.ID], raw[Tag.SeriesTime.ID], raw[Tag.TimezoneOffsetFromUTC.ID]);
        context.study.modality = this.normalizeStudyModalities(context.study.modality);
        for (var count of ['numberOfSeries', 'numberOfInstances']) {
            var value = context.study[count];
            context.study[count] = this.isNullOrBlankValue(value) ? null : this.parseUnsignedInteger(value, count);
        }

        if (this.profile == 'full') {
            context.series.uid = this.requireUID(raw[Tag.SeriesInstanceUID.ID], 'SeriesInstanceUID');
            context.instance.uid = this.requireUID(raw[Tag.SOPInstanceUID.ID], 'SOPInstanceUID');
            var sopClass = this.requireUID(raw[Tag.SOPClassUID.ID], 'SOPClassUID');
            context.instance.sopClass = sopClass;
            var modalities = this.normalizeStudyModalities(raw[Tag.Modality.ID]);
            if (modalities.length != 1)
                throw new Error('Cannot map FHIR R4 ImagingStudy: missing or invalid Modality.');
            context.series.modality = modalities[0];
            context.series.number = this.isNullOrBlankValue(context.series.number) ? null : this.parseUnsignedInteger(context.series.number, 'SeriesNumber');
            context.instance.number = this.isNullOrBlankValue(context.instance.number) ? null : this.parseUnsignedInteger(context.instance.number, 'InstanceNumber');
        }
    }

    validateRecord(context) {
        context.preparedEndpoints = { study: this.prepareEndpoints(context, 'study'),
            series: this.profile == 'full' ? this.prepareEndpoints(context, 'series') : [] };
        if (this.subjectMode == 'none')
            throw new Error('FHIR R4 ImagingStudy.subject is required; subjectMode "none" cannot produce a valid resource.');
        if (this.subjectMode == 'reference') {
            var subject = this.subject ?? this.resolveSubjectTemplate(context);
            if ((subject == null) || (subject === this.omitValue))
                throw new Error('FHIR R4 ImagingStudy.subject is required; configure a subject Reference or resolvable subject template.');
            context.preparedSubject = this.normalizeReference(subject, 'subject');
        }
    }

    validateMerge(context) {
        var previousIdentity = context.patientIdentityByStudy.get(context.studyUID);
        var identity = context.patientIdentity;
        if ((previousIdentity?.value != null) && (identity.value != null)
            && ((previousIdentity.value != identity.value)
                || ((previousIdentity.issuer != null) && (identity.issuer != null) && (previousIdentity.issuer != identity.issuer))))
            throw new Error('Conflicting Patient identity for one StudyInstanceUID.');
        if (this.profile == 'full') {
            var seriesStudyUID = context.seriesStudyUIDs.get(context.series.uid);
            if ((seriesStudyUID != null) && (seriesStudyUID != context.studyUID))
                throw new Error('One SeriesInstanceUID cannot belong to different studies.');
            var instanceSeriesUID = context.instanceSeriesUIDs.get(context.instance.uid);
            if ((instanceSeriesUID != null) && (instanceSeriesUID != context.series.uid))
                throw new Error('One SOPInstanceUID cannot belong to different series or studies.');
        }
        var study = context.studiesByUID.get(context.studyUID);
        if (study != null) {
            if ((this.subjectMode == 'reference') && (study.subject != null)
                && (this.subjectIdentityKey(study.subject) != this.subjectIdentityKey(context.preparedSubject)))
                throw new Error('Conflicting subject Reference for one StudyInstanceUID.');
            if (this.profile == 'study-summary') {
                for (var count of ['numberOfSeries', 'numberOfInstances']) {
                    if ((study[count] != null) && (context.study[count] != null) && (study[count] != context.study[count]))
                        throw new Error(`Conflicting study-summary ${count} for one StudyInstanceUID.`);
                }
            }
            else {
                for (var series of study.series) {
                    if ((series.uid == context.series.uid) && (series.modality?.code != context.series.modality?.code))
                        throw new Error('Conflicting Modality for one SeriesInstanceUID.');
                    var instance = series.instances.find(candidate => candidate.uid == context.instance.uid);
                    if (instance == null)
                        continue;
                    if (series.uid != context.series.uid)
                        throw new Error('One SOPInstanceUID cannot belong to different series in a study.');
                    if (instance.sopClass?.code != context.instance.sopClass?.code)
                        throw new Error('Conflicting SOPClassUID for one SOPInstanceUID.');
                }
            }
        }
        if (this.profile == 'full') {
            context.seriesStudyUIDs.set(context.series.uid, context.studyUID);
            context.instanceSeriesUIDs.set(context.instance.uid, context.series.uid);
        }
        if (identity.value != null)
            context.patientIdentityByStudy.set(context.studyUID, {
                value: identity.value, issuer: identity.issuer ?? previousIdentity?.issuer ?? null
            });
    }

    subjectIdentityKey(subject) {
        // Display text is descriptive. Literal and logical references determine
        // identity, including the namespace of a logical identifier.
        return JSON.stringify([subject?.reference ?? null, subject?.identifier?.system ?? null,
            subject?.identifier?.value ?? null]);
    }

    parseUnsignedInteger(value, label) {
        var text = this.scalarText(value);
        if ((text == null) || !/^\+?\d+$/.test(text) || !Number.isSafeInteger(Number(text)) || (Number(text) > 2147483647))
            throw new Error(`Cannot map FHIR R4 ImagingStudy: invalid unsigned ${label}.`);
        return Number(text);
    }

    multipleTextValues(value) {
        var values = Array.isArray(value) ? value : [value];
        return values.filter(item => item != null).flatMap(item => String(item).split('\\'))
            .map(item => item.trim()).filter(item => item.length > 0);
    }

    normalizePatientNames(value) {
        var values = Array.isArray(value) ? value : [value];
        var names = [];
        for (var item of values) {
            if (item == null)
                continue;
            if (typeof item == 'object') {
                // The metadata adapter may expose legacy PN objects as { value }.
                // Prefer the first nonblank DICOM script representation.
                item = [item.Alphabetic, item.Ideographic, item.Phonetic, item.value]
                    .find(part => (typeof part == 'string') && (part.trim().length > 0));
            }
            if (typeof item != 'string')
                continue;
            // Each PN representation is separate; do not mix script groups into
            // one set of human-name components.
            var representation = item.split('=').find(part => part.trim().length > 0);
            if (representation?.trim().length > 0)
                names.push(representation.trim());
        }
        return names;
    }

    normalizeDate(value) {
        var text = this.scalarText(value);
        if (text == null)
            return null;
        if (!/^\d{4}(?:\d{2})?(?:\d{2})?$/.test(text) || (Number(text.substring(0, 4)) == 0))
            throw new Error('Cannot map FHIR R4: invalid DICOM date.');
        var year = Number(text.substring(0, 4));
        var month = text.length >= 6 ? Number(text.substring(4, 6)) : null;
        var day = text.length == 8 ? Number(text.substring(6, 8)) : null;
        if ((month != null) && ((month < 1) || (month > 12)))
            throw new Error('Cannot map FHIR R4: invalid DICOM date month.');
        var leap = ((year % 4 == 0) && ((year % 100 != 0) || (year % 400 == 0)));
        var days = [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
        if ((day != null) && ((day < 1) || (day > days[month - 1])))
            throw new Error('Cannot map FHIR R4: invalid DICOM date day.');
        return text.substring(0, 4) + (month == null ? '' : '-' + text.substring(4, 6))
            + (day == null ? '' : '-' + text.substring(6, 8));
    }

    normalizeStarted(dateValue, timeValue, offsetValue) {
        var date = this.normalizeDate(dateValue);
        var time = this.scalarText(timeValue);
        var offset = this.scalarText(offsetValue);
        var match = time == null ? null : /^(\d{2})(?:(\d{2})(?:(\d{2})(\.\d{1,6})?)?)?$/.exec(time);
        if (((time != null) && ((match == null) || (Number(match[1]) > 23)
            || (Number(match[2] ?? 0) > 59) || (Number(match[3] ?? 0) > 60)))
            || ((offset != null) && (!/^(?:\+(?:0\d|1[0-4])|-(?:0\d|1[0-2]))[0-5]\d$/.test(offset)
                || (/^(?:\+14|-12)/.test(offset) && !offset.endsWith('00')) || (offset == '-0000'))))
            throw new Error('Cannot map FHIR R4: invalid DICOM time or timezone offset.');
        // Missing timezone or partial time cannot be expanded into an instant.
        if ((date == null) || (date.length != 10) || (match?.[3] == null) || (offset == null))
            return date;
        return date + 'T' + match[1] + ':' + match[2] + ':' + match[3] + (match[4] ?? '')
            + offset.substring(0, 3) + ':' + offset.substring(3);
    }

    /**
     * Calculate the total number of instances across all series.
     * @param {ImagingStudy} study The imaging study.
     * @returns {number} The total instance count.
     */
    calculateStudyInstanceCount(study) {

        if ((study == null) || (Array.isArray(study.series) == false))
            return 0;

        var total = 0;
        for (var i = 0; i < study.series.length; i++) {
            var instances = study.series[i]?.instances;
            total += Array.isArray(instances) ? instances.length : 0;
        }

        return total;

    }

    /**
     * Normalizes one study identifier string to the FHIR UID identifier representation.
     * @param {*} value The identifier source value.
     * @returns {string | null} The normalized value.
     */
    normalizeStudyIdentifierValue(value) {

        var text = (value == null) ? null : String(value).trim();
        if ((text == null) || (text.length == 0))
            return null;

        if (text.toLowerCase().startsWith('urn:oid:') == true)
            return text;

        if (text.toLowerCase().startsWith('urn:') == true)
            return text;

        return `urn:oid:${text}`;

    }

    /**
     * Normalizes one identifier collection to FHIR identifier object array.
     * @param {*} identifier The source identifier value.
     * @returns {Array<object>} The normalized identifier array.
     */
    normalizeStudyIdentifierCollection(identifier) {

        var values = Array.isArray(identifier) ? identifier : [identifier];
        var normalized = [];
        var seen = new Set();

        for (var i = 0; i < values.length; i++) {

            var current = values[i];
            if (current == null)
                continue;

            if (typeof current === 'object') {

                var currentValue = (current.value != null)
                    ? current.value
                    : current.identifier;
                var normalizedValue = (current.system == 'urn:dicom:uid')
                    ? this.normalizeStudyIdentifierValue(currentValue) : this.scalarText(currentValue);
                if (normalizedValue == null)
                    continue;

                var identifierKey = `${current.system ?? ''}:${normalizedValue}`;
                if (seen.has(identifierKey) == true)
                    continue;

                seen.add(identifierKey);
                normalized.push({
                    ...(current.system == null ? {} : { system: current.system }),
                    value: normalizedValue
                });
                continue;

            }

            var value = this.normalizeStudyIdentifierValue(current);
            if (value == null)
                continue;
            if (seen.has(value) == true)
                continue;
            seen.add(value);

            normalized.push({
                system: 'urn:dicom:uid',
                value: value
            });

        }

        return normalized;

    }

    /**
     * Converts one scalar/array modality value to FHIR modality coding array.
     * @param {*} modality The source modality value.
     * @returns {Array<object>} The modality coding array.
     */
    normalizeStudyModalities(modality) {
        var values = Array.isArray(modality) ? modality : [modality];
        var modalities = [];
        var seen = new Set();
        for (var value of values) {
            if (value == null)
                continue;
            if (typeof value == 'object') {
                var coding = value.code != null ? value : value.coding?.[0];
                if (coding?.code == null)
                    throw new Error('Invalid FHIR modality Coding.');
                value = coding.code;
            }
            for (var code of String(value).split('\\').map(part => part.trim()).filter(Boolean)) {
                if (seen.has(code))
                    continue;
                seen.add(code);
                modalities.push({ system: 'http://dicom.nema.org/resources/ontology/DCM', code: code });
            }
        }
        return modalities;
    }

    /**
     * Parses one DICOM integer-like value.
     * @param {*} value The source value.
     * @returns {number | null} The parsed value.
     */
    parseDicomInteger(value) {

        if (value == null)
            return null;

        var number = Number(value);
        if (Number.isFinite(number) == false)
            return null;

        return Math.trunc(number);

    }

    /**
     * Normalizes the study-level FHIR representation.
     * @param {ImagingStudy} study The current study.
     */
    normalizeStudy(study) {

        if (study == null)
            return;

        study.identifier = this.normalizeStudyIdentifierCollection(study.identifier);

        if (study.modality != null) {
            study.modality = this.normalizeStudyModalities(study.modality);
        }
        else {
            study.modality = [];
        }

        var numberOfSeries = this.parseDicomInteger(study.numberOfSeries);
        if (numberOfSeries != null)
            study.numberOfSeries = numberOfSeries;

        var numberOfInstances = this.parseDicomInteger(study.numberOfInstances);
        if (numberOfInstances != null)
            study.numberOfInstances = numberOfInstances;

    }

    /**
     * Resolve one serializer snapshot from a value.
     * @param {*} value The value.
     * @returns {*} The serializer snapshot.
     */
    resolveSerializationSnapshot(value) {

        if (value == null)
            return value;

        if (typeof value !== 'object')
            return value;

        var rawToJson = value[RawToJsonSymbol];
        if (typeof rawToJson === 'function')
            return rawToJson.call(value);

        if (typeof value.toJSON === 'function')
            return value.toJSON();

        return value;

    }

    /**
     * Remove null/undefined values and empty objects from one serializable value.
     * @param {*} value The value to prune.
     * @param {WeakSet<object>} [seen] Optional cycle guard.
     * @returns {*} The pruned value.
     */
    pruneSerializationValue(value, seen = null) {

        if (value == null)
            return undefined;

        if (typeof value !== 'object')
            return ((typeof value == 'string') && (value.trim().length == 0)) ? undefined : value;

        var snapshot = this.resolveSerializationSnapshot(value);
        if (snapshot == null)
            return undefined;

        if (typeof snapshot !== 'object')
            return snapshot;

        if (Array.isArray(snapshot) == true) {
            var arrayResult = [];
            for (var i = 0; i < snapshot.length; i++) {
                var arrayValue = this.pruneSerializationValue(snapshot[i], seen);
                if (arrayValue !== undefined)
                    arrayResult.push(arrayValue);
            }
            return arrayResult.length == 0 ? undefined : arrayResult;
        }

        if (seen == null)
            seen = new WeakSet();

        if (seen.has(snapshot) == true)
            return undefined;

        seen.add(snapshot);

        var objectResult = {};
        var keys = Object.keys(snapshot);
        for (var j = 0; j < keys.length; j++) {
            var key = keys[j];
            var propertyValue = this.pruneSerializationValue(snapshot[key], seen);
            if (propertyValue !== undefined)
                objectResult[key] = propertyValue;
        }

        seen.delete(snapshot);

        if (Object.keys(objectResult).length == 0)
            return undefined;

        return objectResult;

    }

    /**
     * Install pruned JSON serialization on one ImagingStudy result object.
     * @param {*} study The current study.
     */
    installPrunedSerialization(study) {

        if ((study == null) || (typeof study !== 'object'))
            return;

        if (study[PrunedToJsonInstalledSymbol] === true)
            return;

        if (typeof study.toJSON !== 'function')
            return;

        Object.defineProperty(study, RawToJsonSymbol, {
            value: study.toJSON.bind(study),
            configurable: true,
            enumerable: false,
            writable: false
        });

        Object.defineProperty(study, 'toJSON', {
            configurable: true,
            enumerable: false,
            writable: true,
            value: () => {
                var raw = study[RawToJsonSymbol]();
                var pruned = this.pruneSerializationValue(raw, new WeakSet());
                return (pruned == null) ? {} : pruned;
            }
        });

        Object.defineProperty(study, PrunedToJsonInstalledSymbol, {
            value: true,
            configurable: true,
            enumerable: false,
            writable: false
        });

    }

    /**
     * Install pruned serialization for final mapping output.
     * @param {*} finalResult The current final mapping result.
     */
    installPrunedSerializationForFinalResult(finalResult) {

        if (Array.isArray(finalResult) == true) {
            for (var i = 0; i < finalResult.length; i++) {
                this.installPrunedSerialization(finalResult[i]);
            }
            return;
        }

        this.installPrunedSerialization(finalResult);

    }

    /**
     * Configure identifier namespaces for PatientID, AccessionNumber and StudyID.
     * The canonical DICOM StudyInstanceUID identifier always uses urn:dicom:uid.
     */
    setIdentifierSystems(systems = {}) {
        if ((systems == null) || (typeof systems != 'object') || Array.isArray(systems))
            throw new Error('identifierSystems must be an object.');
        for (var key of Object.keys(systems)) {
            if (!['study', 'patient', 'accession'].includes(key))
                throw new Error(`Unknown identifier system "${key}".`);
            var value = systems[key];
            if ((value != null) && ((typeof value != 'string') || !/^[a-z][a-z0-9+.-]*:\S+$/i.test(value)))
                throw new Error(`Identifier system "${key}" must be an absolute URI or null.`);
            this.identifierSystems[key] = value;
        }
        return this;
    }

    setStatus(status) {
        if (!['registered', 'available', 'cancelled', 'entered-in-error', 'unknown'].includes(status))
            throw new Error('Invalid FHIR R4 ImagingStudy status.');
        this.status = status;
        return this;
    }

    setSubject(subject) {
        this.subject = subject == null ? null : this.normalizeReference(subject, 'subject');
        if (subject != null)
            this.subjectMode = 'reference';
        return this;
    }

    normalizeReference(value, target) {
        var data = (typeof value == 'string') ? { reference: value.trim() } : value;
        if ((data == null) || (typeof data != 'object') || Array.isArray(data)
            || ((this.isNullOrBlankValue(data.reference) == true) && (this.isNullOrBlankValue(data.identifier?.value) == true)))
            throw new Error(`Invalid FHIR ${target} Reference; provide reference or identifier.value.`);
        if ((data.reference != null) && ((typeof data.reference != 'string') || /\s/.test(data.reference)))
            throw new Error(`Invalid FHIR ${target} Reference string.`);
        if ((data.type != null) && ((typeof data.type != 'string') || data.type.trim().length == 0))
            throw new Error(`Invalid FHIR ${target} Reference type.`);
        if ((data.display != null) && (typeof data.display != 'string'))
            throw new Error(`Invalid FHIR ${target} Reference display.`);
        if (data.identifier != null) {
            if ((typeof data.identifier != 'object') || Array.isArray(data.identifier)
                || (typeof data.identifier.value != 'string') || data.identifier.value.trim().length == 0
                || ((data.identifier.system != null) && ((typeof data.identifier.system != 'string')
                    || !/^[a-z][a-z0-9+.-]*:\S+$/i.test(data.identifier.system))))
                throw new Error(`Invalid FHIR ${target} Reference identifier value or system.`);
        }
        var allowedTypes = target == 'Endpoint' ? ['Endpoint'] : ['Patient', 'Device', 'Group'];
        if ((data.type != null) && !allowedTypes.includes(data.type.split('/').pop()))
            throw new Error(`Invalid FHIR ${target} Reference type.`);
        var reference = data.reference ?? '';
        if (reference.startsWith('#'))
            throw new Error(`Contained ${target} References require a matching resource and are not supported in reference mode.`);
        // Resource names in ordinary relative/absolute FHIR paths identify known
        // wrong targets. URN references remain available for logical identities.
        var pathTarget = /(?:^|\/)([A-Z][A-Za-z]+)\/[^/]+(?:\/_history\/[^/]+)?$/.exec(reference);
        if ((pathTarget != null) && !allowedTypes.includes(pathTarget[1]))
            throw new Error(`Invalid FHIR ${target} Reference target ${pathTarget[1]}.`);
        return new Reference({
            reference: data.reference,
            identifier: data.identifier,
            display: data.display,
            type: data.type
        });
    }

    setEndpoints(endpoints = {}) {
        if ((endpoints == null) || (typeof endpoints != 'object') || Array.isArray(endpoints))
            throw new Error('endpoints must be an object.');
        for (var level of Object.keys(endpoints)) {
            if (!['study', 'series'].includes(level))
                throw new Error('FHIR R4 supports study and series endpoints only.');
            var values = endpoints[level] == null ? [] : (Array.isArray(endpoints[level]) ? endpoints[level] : [endpoints[level]]);
            this.endpoints[level] = values.map(value => this.normalizeReference(value, 'Endpoint'));
        }
        return this;
    }

    /**
     * Configure one reference template.
     * @param {'study' | 'series' | 'instance' | 'subject'} level The hierarchy level.
     * @param {string | null} template The template string.
     * @returns {DicomToFHIRImagingStudyMapping} The current mapping.
     */
    setReferenceTemplate(level, template) {

        var key = this.normalizeReferenceLevel(level);
        if ((key == 'instance') && (template != null))
            throw new Error('FHIR R4 ImagingStudy has no instance endpoint; configure study or series Endpoint references.');
        if ((template != null) && (typeof template !== 'string'))
            throw new Error(`Invalid reference template for "${key}". Expected string or null.`);

        this.referenceTemplates[key] = template;
        this.onDefinitionChanged();
        return this;

    }

    /**
     * Configure all reference templates.
     * @param {{ study?: string | null, series?: string | null, instance?: string | null, subject?: string | null } | null} templates The template object.
     * @returns {DicomToFHIRImagingStudyMapping} The current mapping.
     */
    setReferenceTemplates(templates = null) {

        if ((templates == null) || (typeof templates !== 'object'))
            return this;

        if (Object.prototype.hasOwnProperty.call(templates, 'study'))
            this.setReferenceTemplate('study', templates.study);
        if (Object.prototype.hasOwnProperty.call(templates, 'series'))
            this.setReferenceTemplate('series', templates.series);
        if (Object.prototype.hasOwnProperty.call(templates, 'instance'))
            this.setReferenceTemplate('instance', templates.instance);
        if (Object.prototype.hasOwnProperty.call(templates, 'subject'))
            this.setReferenceTemplate('subject', templates.subject);

        return this;

    }

    /**
     * Sets the missing-token policy used for endpoint templates.
     * @param {'omit' | 'blank' | 'error'} policy The template policy.
     * @returns {DicomToFHIRImagingStudyMapping} The current mapping.
     */
    setEndpointTemplatePolicy(policy) {
        this.endpointTemplatePolicy = this.normalizeTemplatePolicy(policy, this.endpointTemplatePolicy);
        return this;
    }

    /**
     * Resolve one hierarchy endpoint template.
     * @param {object} context The mapping context.
     * @param {'study' | 'series' | 'instance'} level The hierarchy level.
     * @returns {*} The resolved value or omit sentinel.
     */
    prepareEndpoints(context, level) {
        var values = this.endpoints[level] ?? [];
        var template = this.referenceTemplates[level];
        if ((template != null) && (template.length > 0)) {
            var reference = this.applyTemplate(template, { context: context }, this.endpointTemplatePolicy);
            if (reference !== this.omitValue)
                values = this.mergeUniqueValues(values, [this.normalizeReference(reference, 'Endpoint')]);
        }
        return values;
    }

    resolveEndpointTemplate(context, level) {
        var key = this.normalizeReferenceLevel(level);
        var target = key == 'study' ? context.currentStudy : context.currentSeries;
        if (target == null)
            return this.omitValue;
        var values = this.mergeUniqueValues(target.endpoint ?? [], context.preparedEndpoints[key]);
        return values.length > 0 ? values : this.omitValue;
    }

    /**
     * Resolve the configured ImagingStudy.subject reference template.
     * @param {object} context The mapping context.
     * @returns {*} The resolved reference or omit sentinel.
     */
    resolveSubjectTemplate(context) {

        var template = this.referenceTemplates.subject;
        if ((template == null) || (template.length == 0))
            return this.omitValue;

        return this.applyTemplate(
            template,
            { context: context },
            'omit'
        );

    }

    /**
     * Applies configured subject output mode to the current study.
     * @param {ImagingStudy} study The current study.
     * @param {object} context The mapping context.
     */
    applySubject(study, context) {
        if (this.subjectMode == 'contained') {
            var patient = study.contained.find(resource => resource.resourceType == 'Patient');
            if (patient == null) {
                patient = context.patient;
                patient.id = 'patient';
                study.contained.push(patient);
            }
            else {
                this.mergePatient(patient, context.patient);
            }
            study.subject = new Reference('#' + patient.id);
            return;
        }

        study.contained = study.contained.filter(resource => resource.resourceType != 'Patient');
        study.subject = context.preparedSubject;
    }

    /**
     * Normalize one hierarchy reference level.
     * @param {string} level The input level.
     * @returns {'study' | 'series' | 'instance' | 'subject'} The normalized level.
     */
    normalizeReferenceLevel(level) {

        var normalized = (typeof level === 'string') ? level.trim().toLowerCase() : null;
        if ((normalized !== 'study') && (normalized !== 'series') && (normalized !== 'instance') && (normalized !== 'subject'))
            throw new Error(`Invalid reference level "${level}". Expected "study", "series", "instance", or "subject".`);

        return normalized;

    }

    /**
     * Normalize one subject emission mode.
     * @param {string} mode The requested subject mode.
     * @returns {'none' | 'contained' | 'reference'} The normalized mode.
     */
    normalizeSubjectMode(mode) {

        var normalized = (typeof mode === 'string') ? mode.trim().toLowerCase() : null;
        if ((normalized !== 'none') && (normalized !== 'contained') && (normalized !== 'reference'))
            throw new Error(`Invalid subject mode "${mode}". Expected "none", "contained", or "reference".`);

        return normalized;

    }

    /**
     * Normalize one ImagingStudy mapping profile.
     * @param {string} profile The requested profile.
     * @returns {'full' | 'study-summary'} The normalized profile.
     */
    normalizeProfile(profile) {

        var normalized = (typeof profile === 'string') ? profile.trim().toLowerCase() : null;
        if ((normalized !== 'full') && (normalized !== 'study-summary'))
            throw new Error(`Invalid ImagingStudy mapping profile "${profile}". Expected "full" or "study-summary".`);

        return normalized;

    }

    /**
     * Called when mapping definitions change.
     * Captures additional DICOM template token dependencies introduced by hierarchy reference templates.
     */
    onDefinitionChanged() {

        super.onDefinitionChanged();

        if (this.referenceTemplates == null)
            return;

        this.captureTemplateTokenDependencies(this.referenceTemplates.study);
        this.captureTemplateTokenDependencies(this.referenceTemplates.series);
        this.captureTemplateTokenDependencies(this.referenceTemplates.instance);
        this.captureTemplateTokenDependencies(this.referenceTemplates.subject);

    }
    
    constructor(options = null) {

        // Call the base
        super();

        // Set defaults for hierarchy references.
        this.referenceTemplates = {
            study: null,
            series: null,
            instance: null,
            subject: null
        };
        this.endpointTemplatePolicy = 'omit';
        this.subjectMode = 'contained';
        this.profile = 'full';
        this.status = 'available';
        this.subject = null;
        this.identifierSystems = { study: null, patient: null, accession: null };
        this.endpoints = { study: [], series: [] };

        // Add computed hierarchy references.
        this.addComputed("currentStudy.endpoint", {
            id: "fhir.reference.study",
            when: "end",
            resolve: ({ context }) => this.resolveEndpointTemplate(context, 'study')
        });
        this.addComputed("currentSeries.endpoint", {
            id: "fhir.reference.series",
            when: "end",
            resolve: ({ context }) => this.resolveEndpointTemplate(context, 'series')
        });
        // Setup the Study-level Mappings
        this.addTag(Tag.SpecificCharacterSet, "specificCharacterSet");
        this.addTag(Tag.StudyInstanceUID, "study.identifier");
        this.addTag(Tag.StudyDescription, "study.description");
        this.addTag(Tag.ModalitiesInStudy, "study.modality");
        this.addTag(Tag.NumberOfStudyRelatedSeries, "study.numberOfSeries");
        this.addTag(Tag.NumberOfStudyRelatedInstances, "study.numberOfInstances");
        this.addTag(Tag.StudyID, "studyLocalID");
        this.addTag(Tag.AccessionNumber, "accessionNumber");
        this.addTag(Tag.IssuerOfPatientID, "patientIssuer");
        this.addTag(Tag.StudyDate, "study.started");
        this.addTag(Tag.StudyTime, "studyTime");
        this.addTag(Tag.SeriesDate, "series.started");
        this.addTag(Tag.SeriesTime, "seriesTime");
        this.addTag(Tag.TimezoneOffsetFromUTC, "timezoneOffset");

        // Setup the Series-level Mappings
        this.addTag(Tag.SeriesInstanceUID, "series.uid");
        this.addTag(Tag.SeriesNumber, "series.number");
        this.addTag(Tag.Modality, "series.modality");
        this.addTag(Tag.SeriesDescription, "series.description");

        // Setup the Instance-level Mappings
        this.addTag(Tag.SOPInstanceUID, "instance.uid");
        this.addTag(Tag.SOPClassUID, "instance.sopClass");
        this.addTag(Tag.InstanceNumber, "instance.number");
       
        // Setup the Patient-level Mappings
        this.addTag(Tag.PatientID, "patient.identifier");
        this.addTag(Tag.PatientName, "patient.name", { transform: value => this.normalizePatientNames(value) });
        this.addTag(Tag.PatientTelecomInformation, "patient.addTelcom");
        this.addTag(Tag.PatientTelephoneNumbers, "patient.addTelcom");
        this.addTag(Tag.PatientSex, "patient.gender");
        this.addTag(Tag.PatientBirthDate, "patient.birthDate");

        // Apply optional constructor configuration.
        if (options?.identifierSystems != null)
            this.setIdentifierSystems(options.identifierSystems);
        if (options?.endpoints != null)
            this.setEndpoints(options.endpoints);
        if (options?.status != null)
            this.setStatus(options.status);
        if (options?.subject != null) {
            this.setSubject(options.subject);
            this.subjectMode = 'reference';
        }
        if (options?.properties != null)
            this.setProperties(options.properties);
        if (options?.endpointTemplatePolicy != null)
            this.setEndpointTemplatePolicy(options.endpointTemplatePolicy);
        if (options?.subjectMode != null)
            this.setSubjectMode(options.subjectMode);
        if (options?.profile != null)
            this.setProfile(options.profile);
        if (options?.referenceTemplates != null)
            this.setReferenceTemplates(options.referenceTemplates);

    }

};
