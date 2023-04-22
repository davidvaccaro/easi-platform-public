//
// ImagingSeries.js - 1.0.0
//
// FHIR ImagingSeries (implied) Class 
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

import BackboneElement from "./BackboneElement.js"

export default class ImagingSeries extends BackboneElement {
  
    /**
     * Gets the uid value.
     */
    get uid() {
        return this._uid;
    }

    /**
     * Sets the uid value.
     */
    set uid(uid) {
        this._uid = uid;
    }

    /**
     * Gets the number value.
     */
    get number() {
        return this._number;
    }

    /**
     * Sets the number value.
     */
    set number(number) {
        this._number = number;
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
     * Gets the instances value.
     */
    get instances() {
        return this._instances;
    }

    /**
     * Sets the instances value.
     */
    set instances(instances) {
        this._instances = instances;
    }    

    /**
     * Convert to JSON data
     * @returns 
     */
    toJSON() {
        return {
            uid: this.uid,
            number: this.number,
            modality: this.modality,
            description: this.description,
            numberOfInstances: this.numberOfInstances,
            endpoint: this.endpoint,
            started: this.started,
            instances: this.instances
        }
    }

    constructor() {

        // Call the super
        super();        

        // Init the defaults
        this._instances = [];

    }

};