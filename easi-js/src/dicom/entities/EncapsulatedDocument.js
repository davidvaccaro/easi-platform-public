//
// EncapsulatedDocument.js
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

import Entity from './Entity.js';
import EncapsulatedDocumentModule from '../modules/EncapsulatedDocumentModule.js';

export default class EncapsulatedDocument extends Entity {

    /**
     * Get the Encapsulated Document Module.
     * @returns {EncapsulatedDocumentModule} The encapsulated document module accessor.
     */
    get encapsulatedDocumentModule() {
        return new EncapsulatedDocumentModule(this.attributeSet);
    }

    /**
     * Get the Encapsulated Document accessor.
     * @returns {EncapsulatedDocumentModule} The encapsulated document module accessor.
     */
    get documentModule() {
        return this.encapsulatedDocumentModule;
    }

    /**
     * Construct a DICOM Encapsulated Document entity.
     * @param {Instance | AttributeSet} instance The source instance or attribute set.
     */
    constructor(instance) {
        super(instance);
    }

};
