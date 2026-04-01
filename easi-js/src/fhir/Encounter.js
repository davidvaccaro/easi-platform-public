//
// Encounter.js
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

export default class Encounter extends DomainResource {
  
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
     * Gets the class value.
     */
    get class() {
        return this._class;
    }

    /**
     * Sets the class value.
     */
    set class(clss) {
        this._class = clss;
    }    

    /**
     * Gets the priority value.
     */
    get priority() {
        return this._priority;
    }

    /**
     * Sets the priority value.
     */
    set priority(priority) {
        this._priority = priority;
    }    

    /**
     * Gets the type value.
     */
    get type() {
        return this._type;
    }

    /**
     * Sets the type value.
     */
    set type(type) {
        this._type = type;
    }    

    /**
     * Gets the serviceType value.
     */
    get serviceType() {
        return this._serviceType;
    }

    /**
     * Sets the serviceType value.
     */
    set serviceType(serviceType) {
        this._serviceType = serviceType;
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

    constructor() {

        // Set the defaults
        this._status = ImagingStudyStatus.Unknown;

        // Call the super
        super();

    }

};