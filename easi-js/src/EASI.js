//
// EASI.js
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

import PipelineBuilder from "./builders/PipelineBuilder.js";
import CodecRegistryBuilder from "./builders/CodecRegistryBuilder.js";
import DimseAssociationBuilder from "./builders/DimseAssociationBuilder.js";
import DimseClientBuilder from "./builders/DimseClientBuilder.js";
import DicomMappingBuilder from "./builders/DicomMappingBuilder.js";
import DicomSelectionBuilder from "./builders/DicomSelectionBuilder.js";
import DicomDeIdentificationMaskBuilder from "./builders/DicomDeIdentificationMaskBuilder.js";

export default class EASI {

    /**
     * Create a new instance of the EASI PipelineBuilder class.
     * @returns A new, initialized PipelineBuilder class instance.
     */
    static pipelineBuilder() {
        return new PipelineBuilder();
    }

    /**
     * Create a new instance of the EASI CodecRegistryBuilder class.
     * @returns {CodecRegistryBuilder} A new codec-registry builder instance.
     */
    static codecRegistryBuilder() {
        return new CodecRegistryBuilder();
    }

    /**
     * Create a new instance of the EASI DIMSE association builder class.
     * @returns {DimseAssociationBuilder} A new DIMSE association builder instance.
     */
    static dimseAssociationBuilder() {
        return new DimseAssociationBuilder();
    }

    /**
     * Create a new instance of the EASI DIMSE client builder class.
     * @returns {DimseClientBuilder} A new DIMSE client builder instance.
     */
    static dimseClientBuilder() {
        return new DimseClientBuilder();
    }

    /**
     * Create a new instance of the EASI DICOM mapping builder class.
     * @returns {DicomMappingBuilder} A new DICOM mapping builder instance.
     */
    static mappingBuilder() {
        return new DicomMappingBuilder();
    }

    /**
     * Create a new instance of the EASI DICOM selection builder class.
     * @returns {DicomSelectionBuilder} A new DICOM selection builder instance.
     */
    static selectionBuilder() {
        return new DicomSelectionBuilder();
    }

    /**
     * Create a new instance of the EASI de-identification mask builder class.
     * @returns {DicomDeIdentificationMaskBuilder} A new de-identification mask builder instance.
     */
    static deIdentificationMaskBuilder() {
        return new DicomDeIdentificationMaskBuilder();
    }
};
