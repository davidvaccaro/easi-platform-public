//
// ImagingStudy.js - 1.0.0
//
// FHIR Imaging Study Class 
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

import DomainResource from "./DomainResource.js"
import Reference from "./Reference.js";

export var ImagingStudyStatus = {
    Registered: Symbol('registered'),
    Available: Symbol('available'),
    Cancelled: Symbol('cancelled'),
    EnteredInError: Symbol('entered-in-rrror'),
    Unknown: Symbol('unknown')
};

export default class ImagingStudy extends DomainResource {
  
    /**
     * Gets the identifier value.
     */
    get identifier() {
        return this._identifier;
    }

    /**
     * Sets the identifier value.
     */
    set identifier(identifier) {
        this._identifier = identifier;
    }

    /**
     * Gets the status value.
     */
    get status() {
        return this._status;
    }

    /**
     * Sets the status value.
     */
    set status(status) {
        this._status = status;
    }    

    /**
     * Gets the modality value.
     */
    get modality() {
        return this._modality;
    }

    /**
     * Sets the modality value.
     */
    set modality(modality) {
        this._modality = modality;
    }    

    /**
     * Gets the subject value.
     */
    get subject() {
        return this._subject;
    }

    /**
     * Sets the subject value.
     */
    set subject(subject) {
        this._subject = subject;
    }    

    /**
     * Gets the endpoint value.
     */
    get endpoint() {
        return this._endpoint;
    }

    /**
     * Sets the endpoint value.
     */
    set endpoint(endpoint) {
        this._endpoint = endpoint;
    }

    /**
     * Gets the encounter value.
     */
    get encounter() {
        return this._encounter;
    }

    /**
     * Sets the encounter value.
     */
    set encounter(encounter) {
        this._encounter = encounter;
    }    

    /**
     * Gets the started value.
     */
    get started() {
        return this._started;
    }

    /**
     * Sets the started value.
     */
    set started(started) {
        this._started = started;
    }    

    /**
     * Gets the numberOfSeries value.
     */
    get numberOfSeries() {
        return this._numberOfSeries;
    }

    /**
     * Sets the numberOfSeries value.
     */
    set numberOfSeries(numberOfSeries) {
        this._numberOfSeries = numberOfSeries;
    }    

    /**
     * Gets the numberOfInstances value.
     */
    get numberOfInstances() {
        return this._numberOfInstances;
    }

    /**
     * Sets the numberOfseries value.
     */
    set numberOfInstances(numberOfInstances) {
        this._numberOfInstances = numberOfInstances;
    }    

    /**
     * Gets the description value.
     */
    get description() {
        return this._description;
    }

    /**
     * Sets the description value.
     */
    set description(description) {
        this._description = description;
    }    

    /**
     * Gets the series value.
     */
    get series() {
        return this._series;
    }

    /**
     * Sets the series value.
     */
    set series(series) {
        this._series = series;
    }    

    /**
     * Convert to JSON data
     * @returns 
     */
    toJSON() {
        return {
            resourceType: this.resourceType,
            identifier: this.identifier,
            status: this.status,
            modality: this.modality,
            subject: this.subject,
            endpoint: this.endpoint,
            encounter: this.encounter,
            started: this.started,
            numberOfSeries: this.numberOfSeries,
            numberOfInstances: this.numberOfInstances,
            description: this.description,
            series: this.series,
            contained: this.contained
        }
    }

    constructor() {

        // Call the super
        super();

        // Set the defaults
        this._status = ImagingStudyStatus.Unknown;
        this._subject = new Reference();
        this._series = [];

    }

};
