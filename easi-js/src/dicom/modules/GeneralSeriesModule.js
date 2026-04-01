//
// GeneralSeriesModule.js
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

import Module from './Module.js';
import Tag from '../Tag.js'
import Modality from '../Modality.js'

export default class GeneralSeriesModule extends Module {

    /**
     * Gets the Study Instance UID value.
     * @returns The Study Instance UID value.
     */
    get studyInstanceUid() {
        return this.attributeSet.value(Tag.StudyInstanceUID);
    }

    /**
     * Gets the Series Instance UID value.
     * @returns The Series Instance UID value.
     */
    get seriesInstanceUid() {
        return this.attributeSet.value(Tag.SeriesInstanceUID);
    }

    /**
     * Gets the Series Number value.
     * @returns The Series Number value.
     */
    get seriesNumber() {
        return this.accessIntegerString(Tag.SeriesNumber, Tag.SeriesNumber.VM);
    }

    /**
     * Gets the Series Description value.
     * @returns The Series Description value.
     */
    get seriesDescription() {
        return this.attributeSet.value(Tag.SeriesDescription);
    }

    /**
     * Gets the Series Date value.
     * @returns The Series Date value.
     */
    get seriesDate() {
        return this.attributeSet.value(Tag.SeriesDate);
    }

    /**
     * Gets the Series Time value.
     * @returns The Series Time value.
     */
    get seriesTime() {
        return this.attributeSet.value(Tag.SeriesTime);
    }

    /**
     * Gets the Body Part Examined value.
     * @returns The Body Part Examined value.
     */
    get bodyPartExamined() {
        return this.attributeSet.value(Tag.BodyPartExamined);
    }

    /**
     * Gets the Laterality value.
     * @returns The Laterality value.
     */
    get laterality() {
        return this.attributeSet.value(Tag.Laterality);
    }

    /**
     * Gets the Protocol Name value.
     * @returns The Protocol Name value.
     */
    get protocolName() {
        return this.attributeSet.value(Tag.ProtocolName);
    }

    /**
     * Gets the Operators Name value.
     * @returns The Operators Name value.
     */
    get operatorsName() {
        return this.attributeSet.value(Tag.OperatorsName);
    }

    /**
     * Gets the Modality value.
     * @returns The value of Modality.
     */
    get modality() {
        
        // Get the value
        var value = this.attributeSet.value(Tag.Modality, null);
        
        // Validate the value
        if (value == null)
            return Modality.NONE;

        // Determine the value
        value = Modality.find(value);

        // Validate the value
        if (value == null)
            return Modality.NONE;

        return value;

    }

    /**
     * Construct an Pixel Module Accessor instance.
     */
    constructor(attributeSet) {

        // Call the super constructor
        super(attributeSet);

    }

};
