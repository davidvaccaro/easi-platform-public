//
// DicomEntityHandler.js - 1.0.0
//
// Stream DICOM Entity Handler Class
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

import DicomInstanceHandler from './DicomInstanceHandler.js';
import Entity from '../../dicom/entities/Entity.js';
import Image from '../../dicom/entities/Image.js';
import CT from '../../dicom/entities/CT.js';
import XA from '../../dicom/entities/XA.js';
import Modality from '../../dicom/Modality.js';
import Tag from '../../dicom/Tag.js';

export default class DicomEntityHandler extends DicomInstanceHandler {

    /**
     * Convert one instance to its matching entity.
     * @param {object | null} instance The source instance.
     * @returns {object | null} The resolved entity.
     */
    toEntity(instance) {

        if (instance == null)
            return null;

        if (instance.dataSet == null)
            return new Entity(instance);

        var modality = instance.dataSet.value(Tag.Modality, null);
        if (modality == Modality.CT.ID)
            return new CT(instance);
        if (modality == Modality.XA.ID)
            return new XA(instance);

        return new Image(instance);

    }

    /**
     * Returns the current data product constructed by this handler.
     * @returns The current data product.
     */
    onEndInstance(context) {

        // Build instances exactly as the canonical instance handler
        var result = super.onEndInstance(context);

        // Convert the emitted instance payload to entities
        if (Array.isArray(result)) {
            return result.map((instance) => this.toEntity(instance));
        }

        return this.toEntity(result);

    }

    constructor() {
        super();
    }

};
