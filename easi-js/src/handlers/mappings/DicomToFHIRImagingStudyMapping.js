//
// DicomToFHIRImagingStudyMapping.js - 1.0.0
//
// DicomToFHIRImagingStudyMapping Class 
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
import Tag from "../../dicom/Tag.js"

import Reference from "../../fhir/Reference.js";
import ImagingStudy from "../../fhir/ImagingStudy.js";
import ImagingSeries from "../../fhir/ImagingSeries.js";
import ImagingInstance from "../../fhir/ImagingInstance.js";
import Patient from "../../fhir/Patient.js";

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

            if ((value.system != null) && (value.value != null))
                return `system-value:${String(value.system)}:${String(value.value)}`;

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
        targetInstance.sopClass = this.mergePreferredScalar(targetInstance.sopClass, sourceInstance.sopClass);
        targetInstance.number = this.mergePreferredScalar(targetInstance.number, sourceInstance.number);
        targetInstance.title = this.mergePreferredScalar(targetInstance.title, sourceInstance.title);
        targetInstance.endpoint = this.mergePreferredScalar(targetInstance.endpoint, sourceInstance.endpoint);

        return targetInstance;

    }

    mergeSeries(targetSeries, sourceSeries) {

        if ((targetSeries == null) || (sourceSeries == null))
            return targetSeries;

        targetSeries.uid = this.mergePreferredScalar(targetSeries.uid, sourceSeries.uid);
        targetSeries.number = this.mergePreferredScalar(targetSeries.number, sourceSeries.number);
        targetSeries.modality = this.mergePreferredScalar(targetSeries.modality, sourceSeries.modality);
        targetSeries.description = this.mergePreferredScalar(targetSeries.description, sourceSeries.description);
        targetSeries.endpoint = this.mergePreferredScalar(targetSeries.endpoint, sourceSeries.endpoint);
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
        targetPatient.identifier = this.mergeUniqueValues(targetPatient.identifier, sourcePatient.identifier);
        targetPatient.active = this.mergePreferredScalar(targetPatient.active, sourcePatient.active);
        targetPatient.name = this.mergeUniqueValues(targetPatient.name, sourcePatient.name);
        targetPatient.telcom = this.mergeUniqueValues(targetPatient.telcom, sourcePatient.telcom);
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
        targetStudy.endpoint = this.mergePreferredScalar(targetStudy.endpoint, sourceStudy.endpoint);
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

        var incomingStudy = context.study;
        if (incomingStudy == null)
            return null;

        if (context.final == null) {
            context.final = incomingStudy;
            return incomingStudy;
        }

        var studies = Array.isArray(context.final) ? context.final : [context.final];
        var incomingIdentifiers = this.extractStudyIdentifierValues(incomingStudy);

        var currentStudy = null;
        for (var i = 0; i < studies.length; i++) {

            var candidateStudy = studies[i];
            var candidateIdentifiers = this.extractStudyIdentifierValues(candidateStudy);
            if ((incomingIdentifiers.length == 0) || (candidateIdentifiers.length == 0))
                continue;

            var hasIntersection = candidateIdentifiers.some((identifier) => incomingIdentifiers.includes(identifier));
            if (hasIntersection != true)
                continue;

            currentStudy = candidateStudy;
            break;

        }

        if (currentStudy == null) {
            studies.push(incomingStudy);
            currentStudy = incomingStudy;
        }
        else {
            this.mergeStudy(currentStudy, incomingStudy);
        }

        context.final = (studies.length == 1) ? studies[0] : studies;
        return currentStudy;

    }

    start(context) {

        // Call the super
        super.start(context);

        // Handle setting up a new context
        context.study = new ImagingStudy();
        context.series = new ImagingSeries();
        context.instance = new ImagingInstance();
        context.patient = new Patient();
        context.study.status = 'available';
        context.currentStudy = null;
        context.currentSeries = null;
        context.currentInstance = null;

        // Return the modified context
        return context;

    }

    end(context) {        

        // Resolve the current study merge target.
        var study = this.resolveCurrentStudy(context);

        if (this.profile === 'study-summary') {

            // Resolve subject output (contained patient / reference / none).
            this.applySubject(study, context);

            // Normalize top-level FHIR values for study-summary output.
            this.normalizeStudy(study);
            study.series = [];

            context.currentStudy = study;
            context.currentSeries = null;
            context.currentInstance = null;

            // Apply computed mappings (for example reference templates).
            super.end(context);

            // Clear temporary references from context.
            context.currentStudy = null;
            context.currentSeries = null;
            context.currentInstance = null;

            return context.final;

        }

        if (study == null)
            return context.final;

        // Find the series within the study series
        var series = study.series.find(element => element.uid == context.series.uid);

        // If the series was NOT found,
        if (series == null) {

            // Establish the current series
            series = context.series;

            // Add the series to the study
            study.series.push(series);

            // Set the number of series
            study.numberOfSeries = study.series.length;

        }
        else {

            this.mergeSeries(series, context.series);

        }

        // Find the instance
        var instance = series.instances.find(element => element.uid == context.instance.uid);

        // If the instance was NOT found,
        if (instance == null) {

            // Establish the current instance
            instance = context.instance;

            // Add the instance to the series
            series.instances.push(instance);

            // Set the number of instances
            series.numberOfInstances = series.instances.length; 

        }
        else {

            this.mergeInstance(instance, context.instance);

        }

        // Resolve subject output (contained patient / reference / none).
        this.applySubject(study, context);
        this.normalizeStudy(study);

        // Refresh aggregate counts
        study.numberOfSeries = study.series.length;
        study.numberOfInstances = this.calculateStudyInstanceCount(study);

        // Expose normalized current merge targets for computed mappings.
        context.currentStudy = study;
        context.currentSeries = series;
        context.currentInstance = instance;

        // Apply computed mappings (for example reference templates).
        super.end(context);

        // Clear temporary references from context.
        context.currentStudy = null;
        context.currentSeries = null;
        context.currentInstance = null;

        // Return the current final value
        return context.final;

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
                var normalizedValue = this.normalizeStudyIdentifierValue(currentValue);
                if (normalizedValue == null)
                    continue;

                if (seen.has(normalizedValue) == true)
                    continue;

                seen.add(normalizedValue);
                normalized.push({
                    system: current.system ?? 'urn:dicom:uid',
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

        for (var i = 0; i < values.length; i++) {

            if (values[i] == null)
                continue;

            var parts = String(values[i]).split('\\');
            for (var p = 0; p < parts.length; p++) {

                var code = String(parts[p]).trim();
                if (code.length == 0)
                    continue;

                if (seen.has(code) == true)
                    continue;
                seen.add(code);

                modalities.push({
                    system: 'http://dicom.nema.org/resources/ontology/DCM',
                    code: code
                });

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
     * Configure one reference template.
     * @param {'study' | 'series' | 'instance' | 'subject'} level The hierarchy level.
     * @param {string | null} template The template string.
     * @returns {DicomToFHIRImagingStudyMapping} The current mapping.
     */
    setReferenceTemplate(level, template) {

        var key = this.normalizeReferenceLevel(level);
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
    resolveEndpointTemplate(context, level) {

        var template = this.referenceTemplates[this.normalizeReferenceLevel(level)];
        if ((template == null) || (template.length == 0))
            return this.omitValue;

        return this.applyTemplate(
            template,
            { context: context },
            this.endpointTemplatePolicy
        );

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

        if (this.subjectMode === 'contained') {

            // Find the patient
            var patient = study.contained.find(element => element.resourceType == "Patient");

            if (patient == null) {

                // Establish the current patient
                patient = context.patient;

                // Ensure stable contained resource ID/reference format.
                if ((patient.id == null) || (String(patient.id).length == 0))
                    patient.id = 'Patient';

                // Add the patient to contained resources
                study.contained.push(patient);

            }
            else {

                this.mergePatient(patient, context.patient);

            }

            // Set the subject reference to the contained patient.
            study.subject = new Reference('#' + patient.id.replace(/^#/, ''));
            return;

        }

        // Remove embedded patient when not in contained mode.
        study.contained = study.contained.filter(element => element.resourceType !== 'Patient');

        if (this.subjectMode === 'reference') {

            var subjectReference = this.resolveSubjectTemplate(context);
            study.subject = (subjectReference === this.omitValue)
                ? null
                : new Reference(subjectReference);
            return;

        }

        // subjectMode === 'none'
        study.subject = null;

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
        this.addComputed("currentInstance.endpoint", {
            id: "fhir.reference.instance",
            when: "end",
            resolve: ({ context }) => this.resolveEndpointTemplate(context, 'instance')
        });

        // Setup the Study-level Mappings
        this.addTag(Tag.StudyInstanceUID, "study.identifier");
        this.addTag(Tag.StudyDescription, "study.description");
        this.addTag(Tag.ModalitiesInStudy, "study.modality");
        this.addTag(Tag.NumberOfStudyRelatedSeries, "study.numberOfSeries");
        this.addTag(Tag.NumberOfStudyRelatedInstances, "study.numberOfInstances");

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
        this.addTag(Tag.PatientName, "patient.name");
        this.addTag(Tag.PatientTelecomInformation, "patient.addTelcom");
        this.addTag(Tag.PatientTelephoneNumbers, "patient.addTelcom");
        this.addTag(Tag.PatientSex, "patient.gender");
        this.addTag(Tag.PatientBirthDate, "patient.birthDate");

        // Apply optional constructor configuration.
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
